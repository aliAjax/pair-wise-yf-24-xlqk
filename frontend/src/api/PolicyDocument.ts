import { STORAGE_KEYS, readCollection, writeCollection, nextId } from "../utils/storage";
import { delay } from "./localDb";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { ERROR_CODES } from "../constants/errorMessages";
import type { PolicyDocument } from "../types/PolicyDocument";
import { resolveDocumentVersion, LEGACY_DOCUMENT_VERSION } from "../types/PolicyDocument";

export interface SaveConflict {
  code: typeof ERROR_CODES.VERSION_CONFLICT;
  baseVersion: number;
  serverVersion: number;
  serverDoc: PolicyDocument;
  /** 用户尝试保存的内容，冲突时原样保留，不丢弃改动 */
  pendingDoc: PolicyDocument;
}

export interface SaveResult {
  ok: boolean;
  doc?: PolicyDocument;
  conflict?: SaveConflict;
  batches?: number;
}

function log(template: string, payload: unknown): void {
  console.info(`[PolicyDocument] ${template}`, payload);
}

export async function listPolicyDocuments(): Promise<PolicyDocument[]> {
  await delay();
  return readCollection<PolicyDocument>(STORAGE_KEYS.documents);
}

export async function getPolicyDocument(id: number): Promise<PolicyDocument | undefined> {
  await delay(60);
  return readCollection<PolicyDocument>(STORAGE_KEYS.documents).find((doc) => doc.id === id);
}

/**
 * 保存文档（带版本冲突检测）。
 * - baseVersion 是用户打开文档时的版本号；存储中的版本更新时返回冲突，不覆盖。
 * - 缺少版本号的历史数据按兼容模式打开（baseVersion 视为 0），首次保存升级为 v1。
 */
export async function savePolicyDocument(doc: PolicyDocument): Promise<SaveResult> {
  await delay();
  const rows = readCollection<PolicyDocument>(STORAGE_KEYS.documents);
  const baseVersion = resolveDocumentVersion(doc);
  const stored = rows.find((row) => row.id === doc.id);

  if (stored && resolveDocumentVersion(stored) > baseVersion) {
    const conflict: SaveConflict = {
      code: ERROR_CODES.VERSION_CONFLICT,
      baseVersion,
      serverVersion: resolveDocumentVersion(stored),
      serverDoc: stored,
      pendingDoc: { ...doc }
    };
    log(LOG_TEMPLATES.PolicyDocument[4], conflict);
    return { ok: false, conflict };
  }

  const isNew = !stored;
  const saved: PolicyDocument = {
    ...doc,
    id: isNew ? nextId(rows) : doc.id,
    version: isNew ? 1 : resolveDocumentVersion(stored) + 1
  };
  const next = isNew ? [...rows, saved] : rows.map((row) => (row.id === saved.id ? saved : row));
  const result = writeCollection(STORAGE_KEYS.documents, next);
  log(isNew ? LOG_TEMPLATES.PolicyDocument[0] : LOG_TEMPLATES.PolicyDocument[1], {
    id: saved.id,
    version: saved.version,
    batches: result.batches
  });
  if (!isNew && baseVersion === LEGACY_DOCUMENT_VERSION) log(LOG_TEMPLATES.PolicyDocument[7], { id: saved.id });
  return { ok: true, doc: saved, batches: result.batches };
}

/** 强制覆盖保存：无视存储中的新版本，版本号压过对方（serverVersion + 1） */
export async function forceSavePolicyDocument(doc: PolicyDocument): Promise<SaveResult> {
  await delay();
  const rows = readCollection<PolicyDocument>(STORAGE_KEYS.documents);
  const stored = rows.find((row) => row.id === doc.id);
  const serverVersion = stored ? resolveDocumentVersion(stored) : 0;
  const saved: PolicyDocument = { ...doc, version: serverVersion + 1 };
  const next = stored ? rows.map((row) => (row.id === saved.id ? saved : row)) : [...rows, saved];
  const result = writeCollection(STORAGE_KEYS.documents, next);
  log(LOG_TEMPLATES.PolicyDocument[5], { id: saved.id, version: saved.version, batches: result.batches });
  return { ok: true, doc: saved, batches: result.batches };
}

/** 另存为新文档：分配新 id，版本号从 1 开始 */
export async function savePolicyDocumentAsNew(doc: PolicyDocument): Promise<SaveResult> {
  await delay();
  const rows = readCollection<PolicyDocument>(STORAGE_KEYS.documents);
  const saved: PolicyDocument = {
    ...doc,
    id: nextId(rows),
    version: 1,
    title: doc.title ? `${doc.title}（副本）` : doc.title
  };
  rows.push(saved);
  const result = writeCollection(STORAGE_KEYS.documents, rows);
  log(LOG_TEMPLATES.PolicyDocument[0], { id: saved.id, version: saved.version, batches: result.batches });
  return { ok: true, doc: saved, batches: result.batches };
}

export async function deletePolicyDocument(id: number): Promise<void> {
  await delay(60);
  const rows = readCollection<PolicyDocument>(STORAGE_KEYS.documents).filter((doc) => doc.id !== id);
  writeCollection(STORAGE_KEYS.documents, rows);
  log(LOG_TEMPLATES.PolicyDocument[2], { id });
}
