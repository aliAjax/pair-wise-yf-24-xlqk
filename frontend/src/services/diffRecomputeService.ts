import { localRepository } from "../utils/localRepository";
import { createDefaultDiffResult } from "../constructors/DiffResultConstructor";
import { createRecheckReviewNote } from "../constructors/ReviewNoteConstructor";
import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";
import { summarizeDiff } from "../utils/diffEngine";
import { renderLog } from "../constants/logTemplates";

export interface RecomputeImpact {
  diffs: DiffResult[];
  recheckNoteIds: number[];
  changedStableKeys: string[];
}

export const sectionStableKey = (section: Pick<PolicySection, "document_id" | "section_no" | "heading">): string =>
  `doc:${section.document_id}:section:${section.section_no}:${section.heading}`;

const matchOldSection = (
  section: PolicySection,
  oldSections: PolicySection[],
  newSections: PolicySection[]
): PolicySection | undefined => {
  // 优先按编号+标题匹配，其次仅按编号（标题被改写），最后按相同位置的旧段落
  const byNoAndHeading = oldSections.find((old) => old.section_no === section.section_no && old.heading === section.heading);
  if (byNoAndHeading) return byNoAndHeading;
  const byNo = oldSections.find((old) => old.section_no === section.section_no);
  if (byNo) return byNo;
  const newIndex = newSections.findIndex((item) => item.id === section.id);
  return oldSections[newIndex];
};

/**
 * 按新版文档的当前段落内容重算全部差异。
 * 关键约定：
 * - 段落一改，差异按新内容当场重算，旧差异不会照旧显示
 * - 差异按 stable_key 原位更新，保留 id，历史备注仍能挂在同一条款上
 * - 仅当差异签名真的变化时，才把关联备注标成待复核，且保留备注原文
 */
export function recomputeDiffsForDocument(newDocumentId: number, oldDocumentId?: number): RecomputeImpact {
  const newSections = localRepository
    .list<PolicySection>("policySection")
    .filter((section) => section.document_id === newDocumentId)
    .sort((a, b) => a.section_no.localeCompare(b.section_no, "zh-CN"));

  let oldSections: PolicySection[] = [];
  let resolvedOldId = oldDocumentId;
  const existing = localRepository.list<DiffResult>("diffResult");
  if (resolvedOldId == null) {
    resolvedOldId =
      existing.find((diff) => diff.new_document_id === newDocumentId)?.old_document_id ??
      pickPreviousDocumentId(newDocumentId);
  }
  if (resolvedOldId != null) {
    oldSections = localRepository
      .list<PolicySection>("policySection")
      .filter((section) => section.document_id === resolvedOldId)
      .sort((a, b) => a.section_no.localeCompare(b.section_no, "zh-CN"));
  }

  const now = new Date().toISOString();
  let nextDiffId = localRepository.nextId("diffResult");

  // 重算结果只覆盖“同一旧版→同一新版”这一对；其他文档对的差异原样保留
  const samePair = (diff: DiffResult) =>
    diff.new_document_id === newDocumentId &&
    (resolvedOldId == null ? true : diff.old_document_id === resolvedOldId);

  const oldDiffsByKey = new Map(existing.filter(samePair).map((d) => [d.stable_key, d]));
  const nextDiffs: DiffResult[] = [];
  const changedStableKeys: string[] = [];

  newSections.forEach((section) => {
    const key = sectionStableKey(section);
    const matchedOld = matchOldSection(section, oldSections, newSections);
    const previous = oldDiffsByKey.get(key);

    let type: DiffResult["diff_type"];
    let summary: string;
    if (!matchedOld) {
      type = "ADDED";
      summary = `新增“${section.heading}”条款`;
    } else {
      const result = summarizeDiff(matchedOld.content, section.content);
      type = result.type === "UNCHANGED" ? "UNCHANGED" : "MODIFIED";
      summary = result.summaryText;
    }
    if (matchedOld && !oldSections.some((old) => old.id === matchedOld.id && old.section_no === section.section_no && old.heading === section.heading)) {
      // 编号或标题位置发生移动，保留 MOVED 语义并附带内容变化
      if (matchedOld.section_no !== section.section_no) type = "MOVED";
    }

    const reallyChanged =
      !previous || previous.source_section_content !== section.content || previous.diff_type !== type;

    if (previous) {
      const updated: DiffResult = {
        ...previous,
        section_id: section.id,
        diff_type: type,
        summary,
        source_section_content: section.content,
        recomputed_at: reallyChanged ? now : previous.recomputed_at,
        revision: reallyChanged ? previous.revision + 1 : previous.revision
      };
      nextDiffs.push(updated);
      if (reallyChanged) changedStableKeys.push(key);
    } else {
      nextDiffs.push(
        createDefaultDiffResult({
          id: nextDiffId,
          old_document_id: resolvedOldId ?? 0,
          new_document_id: newDocumentId,
          section_id: section.id,
          diff_type: type,
          summary,
          created_at: now,
          stable_key: key,
          source_section_content: section.content,
          recomputed_at: now,
          revision: 1
        })
      );
      nextDiffId += 1;
      if (type !== "UNCHANGED") changedStableKeys.push(key);
    }
  });

  // 新版中已不存在、旧版存在的段落 → REMOVED
  oldSections.forEach((oldSection) => {
    const stillExists = newSections.some(
      (section) => section.section_no === oldSection.section_no || section.heading === oldSection.heading
    );
    if (stillExists) return;
    const removedKey = sectionStableKey(oldSection);
    const previous = oldDiffsByKey.get(removedKey);
    if (previous) {
      nextDiffs.push({ ...previous, diff_type: "REMOVED", recomputed_at: now, revision: previous.revision + 1 });
      changedStableKeys.push(previous.stable_key);
    } else {
      nextDiffs.push(
        createDefaultDiffResult({
          id: nextDiffId,
          old_document_id: resolvedOldId ?? 0,
          new_document_id: newDocumentId,
          section_id: 0,
          diff_type: "REMOVED",
          summary: `删除“${oldSection.heading}”条款`,
          created_at: now,
          stable_key: sectionStableKey(oldSection),
          source_section_content: "",
          recomputed_at: now,
          revision: 1
        })
      );
      nextDiffId += 1;
      changedStableKeys.push(sectionStableKey(oldSection));
    }
  });

  // 仅替换同一“旧版→新版”文档对的差异，其他文档对的差异原样保留，避免互相盖掉
  const retained = existing.filter((diff) => !samePair(diff));
  localRepository.replaceAll("diffResult", [...retained, ...nextDiffs]);

  // 差异真正变化的条款：关联备注保留原文、标记待复核
  const notes = localRepository.list<ReviewNote>("reviewNote");
  const changedDiffIds = new Set(
    nextDiffs.filter((diff) => changedStableKeys.includes(diff.stable_key)).map((diff) => diff.id)
  );
  const recheckNoteIds: number[] = [];
  const updatedNotes = notes.map((note) => {
    if (!changedDiffIds.has(note.diff_result_id)) return note;
    if (note.status === "RESOLVED") return note; // 已解决的历史备注不回退
    recheckNoteIds.push(note.id);
    console.info(
      renderLog("ReviewNote", 2, {
        stable_key:
          nextDiffs.find((diff) => diff.id === note.diff_result_id)?.stable_key ?? note.diff_result_id,
        from: note.status
      })
    );
    return createRecheckReviewNote(note, now);
  });
  if (recheckNoteIds.length > 0) localRepository.replaceAll("reviewNote", updatedNotes);

  nextDiffs.forEach((diff) => {
    if (changedStableKeys.includes(diff.stable_key)) {
      console.info(renderLog("DiffResult", 1, { stable_key: diff.stable_key, from: diff.revision - 1, to: diff.revision }));
    }
  });

  return { diffs: nextDiffs, recheckNoteIds, changedStableKeys };
}

function pickPreviousDocumentId(newDocumentId: number): number | undefined {
  const docs = localRepository
    .list<{ id: number; imported_at: string }>("policyDocument")
    .filter((doc) => doc.id !== newDocumentId)
    .sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1));
  return docs[0]?.id;
}
