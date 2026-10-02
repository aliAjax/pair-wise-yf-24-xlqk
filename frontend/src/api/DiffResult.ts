import { STORAGE_KEYS, readCollection, writeCollection, nextId } from "../utils/storage";
import { delay } from "./localDb";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { classifySectionDiff } from "../hooks/useTextDiff";
import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";

function log(template: string, payload: unknown): void {
  console.info(`[DiffResult] ${template}`, payload);
}

export async function listDiffResults(): Promise<DiffResult[]> {
  await delay();
  return readCollection<DiffResult>(STORAGE_KEYS.diffs);
}

export async function listDiffsForPair(oldDocId: number, newDocId: number): Promise<DiffResult[]> {
  await delay(60);
  return readCollection<DiffResult>(STORAGE_KEYS.diffs).filter(
    (diff) => diff.old_document_id === oldDocId && diff.new_document_id === newDocId
  );
}

export interface RecomputeResult {
  diffs: DiffResult[];
  /** 差异类型或摘要发生变化的差异 id（这些差异上的备注需要标待复核） */
  affectedDiffIds: number[];
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

/**
 * 按新文档内容重算指定文档对的差异。
 * - 以 section_no 匹配新旧段落，逐段重算 diff_type 与 summary。
 * - 差异行 id 尽量保持不变，审阅备注继续挂在原差异行上。
 * - 返回受影响（类型/摘要变化或新建）的差异 id，供调用方把备注标为待复核。
 */
export async function recomputeDiffsForPair(oldDocId: number, newDocId: number): Promise<RecomputeResult> {
  await delay();
  const allDiffs = readCollection<DiffResult>(STORAGE_KEYS.diffs);
  const sections = readCollection<PolicySection>(STORAGE_KEYS.sections);
  const oldSections = sections
    .filter((section) => section.document_id === oldDocId)
    .sort((a, b) => Number(a.section_no) - Number(b.section_no));
  const newSections = sections
    .filter((section) => section.document_id === newDocId)
    .sort((a, b) => Number(a.section_no) - Number(b.section_no));

  const oldByNo = new Map(oldSections.map((section) => [section.section_no, section]));
  const existingBySection = new Map(
    allDiffs
      .filter((diff) => diff.old_document_id === oldDocId && diff.new_document_id === newDocId)
      .map((diff) => [diff.section_id, diff])
  );

  const nextDiffs: DiffResult[] = [];
  const affectedDiffIds: number[] = [];
  let seq = nextId(allDiffs);
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  const touch = (diff: DiffResult, isNew: boolean, changed: boolean) => {
    nextDiffs.push(diff);
    if (isNew || changed) affectedDiffIds.push(diff.id);
    if (diff.diff_type === "ADDED") added += 1;
    else if (diff.diff_type === "REMOVED") removed += 1;
    else if (diff.diff_type === "MODIFIED") modified += 1;
    else unchanged += 1;
  };

  const now = new Date().toISOString();

  // 新文档段落：匹配旧段落重算，匹配不上的为新增
  for (const newSection of newSections) {
    const oldSection = oldByNo.get(newSection.section_no);
    const oldContent = oldSection?.content ?? "";
    const result = classifySectionDiff(oldContent, newSection.content);
    const existing = existingBySection.get(newSection.id);
    if (existing) {
      const changed = existing.diff_type !== result.diffType || existing.summary !== result.summary;
      touch(
        { ...existing, diff_type: result.diffType, summary: result.summary, created_at: changed ? now : existing.created_at },
        false,
        changed
      );
    } else {
      touch(
        {
          id: seq++,
          old_document_id: oldDocId,
          new_document_id: newDocId,
          section_id: newSection.id,
          diff_type: result.diffType,
          summary: result.summary,
          created_at: now
        },
        true,
        false
      );
    }
    oldByNo.delete(newSection.section_no);
  }

  // 旧文档中剩余未匹配的段落：已删除
  for (const oldSection of oldByNo.values()) {
    const result = classifySectionDiff(oldSection.content, "");
    const existing = existingBySection.get(oldSection.id);
    if (existing) {
      const changed = existing.diff_type !== result.diffType || existing.summary !== result.summary;
      touch(
        { ...existing, diff_type: "REMOVED", summary: result.summary, created_at: changed ? now : existing.created_at },
        false,
        changed
      );
    } else {
      touch(
        {
          id: seq++,
          old_document_id: oldDocId,
          new_document_id: newDocId,
          section_id: oldSection.id,
          diff_type: "REMOVED",
          summary: result.summary,
          created_at: now
        },
        true,
        false
      );
    }
  }

  // 替换该文档对的全部差异行，保留其他文档对的数据
  const otherPairs = allDiffs.filter(
    (diff) => !(diff.old_document_id === oldDocId && diff.new_document_id === newDocId)
  );
  const merged = [...otherPairs, ...nextDiffs];
  const writeResult = writeCollection(STORAGE_KEYS.diffs, merged);
  log(LOG_TEMPLATES.DiffResult[4], {
    oldDocId,
    newDocId,
    affected: affectedDiffIds.length,
    batches: writeResult.batches
  });
  log(LOG_TEMPLATES.DiffResult[1], { count: nextDiffs.length });

  return { diffs: nextDiffs, affectedDiffIds, added, removed, modified, unchanged };
}

/** 段落改动后：按新文档 id 找到关联文档对并重算 */
export async function recomputeDiffsForNewDocument(newDocId: number): Promise<RecomputeResult | null> {
  await delay();
  const allDiffs = readCollection<DiffResult>(STORAGE_KEYS.diffs);
  const pair = allDiffs.find((diff) => diff.new_document_id === newDocId);
  if (!pair) return null;
  return recomputeDiffsForPair(pair.old_document_id, newDocId);
}
