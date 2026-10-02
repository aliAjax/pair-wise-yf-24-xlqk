import { DRAFT_KEY } from "./storageKeys";
import type { ConflictDraft } from "../types/Storage";
import { renderLog } from "../constants/logTemplates";
import type { CollectionName } from "./storageKeys";

const readAll = (): ConflictDraft[] => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ConflictDraft[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (drafts: ConflictDraft[]): void => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
};

/**
 * 晚到的保存遇到版本冲突时，把改动原样存为冲突草稿：
 * 不覆盖磁盘新数据，也不丢弃用户改动。
 */
export function saveConflictDraft<T>(params: {
  collection: CollectionName;
  record_id: number;
  document_id: number;
  payload: T;
  base_revision: number;
  current_revision: number;
  reason: string;
}): ConflictDraft<T> {
  const drafts = readAll();
  const draft: ConflictDraft<T> = {
    id: (drafts.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1,
    collection: params.collection,
    record_id: params.record_id,
    document_id: params.document_id,
    payload: params.payload,
    base_revision: params.base_revision,
    current_revision: params.current_revision,
    reason: params.reason,
    created_at: new Date().toISOString(),
    resolved: false
  };
  drafts.push(draft as ConflictDraft);
  writeAll(drafts);
  console.info(
    renderLog("Storage", 1, {
      collection: params.collection,
      record_id: params.record_id,
      base: params.base_revision,
      current: params.current_revision
    })
  );
  return draft;
}

export function listConflictDrafts(): ConflictDraft[] {
  return readAll().filter((draft) => !draft.resolved);
}

export function listAllConflictDrafts(): ConflictDraft[] {
  return readAll();
}

export function resolveConflictDraft(id: number): void {
  const drafts = readAll();
  const target = drafts.find((draft) => draft.id === id);
  if (target) {
    target.resolved = true;
    writeAll(drafts);
  }
}

export function removeConflictDraft(id: number): void {
  writeAll(readAll().filter((draft) => draft.id !== id));
}
