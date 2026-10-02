import { localRepository } from "../utils/localRepository";
import { AppError, ServiceError, VersionConflictError } from "../utils/errors";
import { saveConflictDraft } from "../utils/conflictDrafts";
import { createDefaultPolicyDocument } from "../constructors/PolicyDocumentConstructor";
import { createDefaultPolicySection } from "../constructors/PolicySectionConstructor";
import { recomputeDiffsForDocument } from "./diffRecomputeService";
import { parsePolicyText, toNormalizedSections, guessCategory } from "../utils/policyParser";
import { renderLog } from "../constants/logTemplates";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { BatchProgress, RecheckImpact } from "../types/service";
import { ERROR_CODES } from "../constants/errorCodes";

export type { RecheckImpact } from "../types/service";

/**
 * 段落内容保存的完整联动：
 * 1. 以文档版本号判断先后，晚到保存抛 VersionConflictError 且改动转草稿
 * 2. 段落自身 revision+1，文档 revision+1、updated_at 更新
 * 3. 立即按新内容重算该文档差异
 * 4. 受影响的旧审阅备注保留原文并标记 RECHECK
 */
export function updateSection(params: {
  section: PolicySection;
  baseRevision: number;
}): RecheckImpact {
  const { section, baseRevision } = params;
  const now = new Date().toISOString();
  try {
    const document = localRepository.find<PolicyDocument>("policyDocument", section.document_id);
    if (!document) throw new AppError(ERROR_CODES.VALIDATION_FAILED, `文档不存在：${section.document_id}`);

    // 版本判断以文档为粒度：另一标签页先保存会让文档 revision 变大
    const current = localRepository.documentRevision(section.document_id);
    if (current != null && current > baseRevision) {
      throw new VersionConflictError({
        collection: "policySection",
        recordId: section.id,
        documentId: section.document_id,
        baseRevision,
        currentRevision: current,
        payload: { ...section, updated_at: now }
      });
    }

    const previousSection = localRepository.find<PolicySection>("policySection", section.id);
    const fromRevision = previousSection?.revision ?? section.revision;
    const nextSection: PolicySection = {
      ...section,
      revision: fromRevision + 1,
      updated_at: now
    };
    localRepository.save("policySection", nextSection, { baseRevision, documentId: section.document_id });

    const nextDocument: PolicyDocument = {
      ...document,
      normalized_sections: toNormalizedSections(
        localRepository
          .list<PolicySection>("policySection")
          .filter((item) => item.document_id === document.id)
      ),
      updated_at: now,
      revision: document.revision + 1
    };
    localRepository.save("policyDocument", nextDocument);

    const impact = recomputeDiffsForDocument(document.id);
    console.info(
      renderLog("PolicySection", 1, {
        document_title: document.title,
        section_no: nextSection.section_no,
        from: fromRevision,
        to: nextSection.revision,
        diff_count: impact.diffs.length
      })
    );
    return {
      recheckNoteIds: impact.recheckNoteIds,
      changedStableKeys: impact.changedStableKeys,
      documentRevision: nextDocument.revision
    };
  } catch (error) {
    if (error instanceof VersionConflictError) {
      // 晚到的那次：提示冲突由 controller/页面完成，改动先入草稿，绝不覆盖、不丢失
      saveConflictDraft({
        collection: error.collection,
        record_id: error.recordId,
        document_id: error.documentId,
        payload: error.payload,
        base_revision: error.baseRevision,
        current_revision: error.currentRevision,
        reason: error.message
      });
      throw error;
    }
    if (error instanceof AppError) throw error;
    throw new ServiceError("BATCH_SAVE_FAILED", { batch: 1, total: 1, reason: String(error) }, error);
  }
}

/** 风险等级/分类等元数据编辑：同样递增段落与文档版本，保证后续对比按新数据重算 */
export function patchSectionMeta(
  sectionId: number,
  patch: Partial<Pick<PolicySection, "risk_level" | "category">>,
  baseRevision: number
): RecheckImpact {
  const section = localRepository.find<PolicySection>("policySection", sectionId);
  if (!section) throw new AppError(ERROR_CODES.VALIDATION_FAILED, `段落不存在：${sectionId}`);
  return updateSection({ section: { ...section, ...patch }, baseRevision });
}

/**
 * 文档导入：粘贴文本自动分段，超长时分批保存段落。
 * 返回新文档与保存进度信息。
 */
export async function importDocument(params: {
  title: string;
  version_label: string;
  raw_text: string;
  onProgress?: (progress: BatchProgress) => void;
}): Promise<{ document: PolicyDocument; sectionCount: number }> {
  const now = new Date().toISOString();
  const document = createDefaultPolicyDocument({
    id: localRepository.nextId("policyDocument"),
    title: params.title || "未命名隐私政策",
    version_label: params.version_label || now.slice(0, 10),
    raw_text: params.raw_text,
    imported_at: now,
    updated_at: now,
    revision: 1
  });

  const drafts = parsePolicyText(params.raw_text);
  let sectionId = localRepository.nextId("policySection");
  const sections: PolicySection[] = drafts.map((draft) =>
    createDefaultPolicySection({
      id: sectionId++,
      document_id: document.id,
      section_no: draft.section_no,
      heading: draft.heading,
      content: draft.content,
      category: guessCategory(draft.heading, draft.content),
      risk_level: "LOW",
      updated_at: now,
      revision: 1
    })
  );
  document.normalized_sections = toNormalizedSections(sections);

  try {
    localRepository.save("policyDocument", document, { documentId: document.id });
    // 段落可能很多/超长：走分批保存，每批重新读盘，避免与其他标签页互相盖掉
    const result = await localRepository.saveMany("policySection", sections, {
      documentId: document.id,
      baseRevision: document.revision,
      onProgress: params.onProgress
    });
    console.info(
      renderLog("PolicyDocument", 0, { title: document.title, revision: document.revision })
    );
    if (result.conflicts.length > 0) {
      result.conflicts.forEach((conflict) =>
        saveConflictDraft({
          collection: conflict.collection,
          record_id: conflict.recordId,
          document_id: conflict.documentId,
          payload: conflict.payload,
          base_revision: conflict.baseRevision,
          current_revision: conflict.currentRevision,
          reason: conflict.message
        })
      );
    }
    return { document, sectionCount: result.saved.length };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ServiceError("BATCH_SAVE_FAILED", { batch: 0, total: 1, reason: String(error) }, error);
  }
}
