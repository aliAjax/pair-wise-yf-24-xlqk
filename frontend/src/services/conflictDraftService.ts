import { localRepository } from "../utils/localRepository";
import {
  listAllConflictDrafts,
  listConflictDrafts,
  removeConflictDraft,
  resolveConflictDraft,
  saveConflictDraft
} from "../utils/conflictDrafts";
import { AppError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { recomputeDiffsForDocument } from "./diffRecomputeService";
import type { ConflictDraft } from "../types/Storage";
import type { CollectionName } from "../utils/storageKeys";

/** 冲突草稿列表（未解决） */
export function getConflictDrafts(): ConflictDraft[] {
  return listConflictDrafts();
}

/** 含已解决的全部草稿，供页面展示历史 */
export function getAllConflictDrafts(): ConflictDraft[] {
  return listAllConflictDrafts();
}

export interface ResolveDraftResult {
  action: "merged" | "discarded";
  record?: unknown;
}

/**
 * 处理一条冲突草稿：
 * - merge=true：人工确认采纳草稿，覆盖保存，并把版本抬到最新之后避免再次被判晚到
 * - merge=false：放弃草稿；两边数据都不会被自动删除
 */
export function resolveDraft(draftId: number, merge: boolean): ResolveDraftResult {
  const draft = listConflictDrafts().find((item) => item.id === draftId);
  if (!draft) throw new AppError(ERROR_CODES.VALIDATION_FAILED, `冲突草稿不存在：${draftId}`);

  if (merge) {
    const collection = draft.collection as CollectionName;
    const payload = draft.payload as { id: number; revision?: number };
    const currentDoc = localRepository.find<{ id: number; revision: number }>(
      "policyDocument",
      draft.document_id
    );
    const nextRevision = Math.max(
      Number(payload.revision ?? 1),
      currentDoc ? currentDoc.revision + 1 : draft.current_revision + 1
    );
    const nextPayload = { ...payload, revision: nextRevision };
    localRepository.save(collection, nextPayload, { documentId: draft.document_id });
    if (currentDoc && collection === "policySection") {
      localRepository.save("policyDocument", { ...currentDoc, revision: nextRevision });
      // 采纳的是段落草稿：按其内容重算差异，保持“段落改动→差异重算→备注待复核”一致
      recomputeDiffsForDocument(draft.document_id);
    }
    resolveConflictDraft(draftId);
    return { action: "merged", record: nextPayload };
  }

  removeConflictDraft(draftId);
  return { action: "discarded" };
}

/** 手动登记晚到改动为草稿（页面在 service catch 之外的兜底） */
export function registerDraft(params: {
  collection: CollectionName;
  record_id: number;
  document_id: number;
  payload: unknown;
  base_revision: number;
  current_revision: number;
  reason: string;
}): ConflictDraft {
  return saveConflictDraft(params);
}
