import { CURRENT_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION, META_KEY, type CollectionName, COLLECTION_NAMES } from "./storageKeys";
import { createDefaultDiffResult } from "../constructors/DiffResultConstructor";
import { createDefaultPolicyDocument } from "../constructors/PolicyDocumentConstructor";
import { createDefaultPolicySection } from "../constructors/PolicySectionConstructor";
import { createDefaultReviewNote } from "../constructors/ReviewNoteConstructor";
import type { PersistedMeta } from "../types/Storage";
import { renderLog } from "../constants/logTemplates";

const FACTORIES = {
  policyDocument: createDefaultPolicyDocument,
  policySection: createDefaultPolicySection,
  diffResult: createDefaultDiffResult,
  reviewNote: createDefaultReviewNote
} as const;

export type LegacyRecordMap = Record<CollectionName, Array<Record<string, unknown>>>;

const readMeta = (): PersistedMeta | null => {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as PersistedMeta) : null;
  } catch {
    return null;
  }
};

/**
 * 兼容打开：已有数据缺少版本号（schemaVersion=0/缺失）时，按各实体构造器补全新增字段。
 * 不修改业务字段，只补默认值，保证旧记录可以正常参与重算与版本判断。
 */
export function migrateRecord<T>(collection: CollectionName, raw: Record<string, unknown>): T {
  const base = FACTORIES[collection]() as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base, ...raw };
  // 旧数据没有版本号：revision 缺失时兼容补 1（视为最初版本）
  if (typeof merged.revision !== "number" || Number.isNaN(merged.revision)) {
    merged.revision = 1;
  }
  if (collection === "reviewNote") {
    const note = merged as unknown as { comment: string; original_comment: string; recheck_at: string; status: string };
    note.original_comment = note.original_comment || note.comment;
    note.recheck_at = note.recheck_at ?? "";
  }
  if (collection === "diffResult") {
    const diff = merged as Record<string, unknown>;
    diff.stable_key = diff.stable_key ?? "";
    diff.source_section_content = diff.source_section_content ?? "";
    diff.recomputed_at = diff.recomputed_at ?? "";
  }
  if (collection === "policyDocument") {
    (merged as { updated_at?: string }).updated_at =
      (merged.updated_at as string) || (merged.imported_at as string) || new Date().toISOString();
  }
  if (collection === "policySection") {
    (merged as { updated_at?: string }).updated_at = (merged.updated_at as string) || new Date().toISOString();
  }
  return merged as T;
}

export interface MigrationResult {
  meta: PersistedMeta;
  migrated: boolean;
  migratedCount: number;
}

/**
 * 读取并（必要时）迁移全量数据。
 * 返回迁移后的 map 与元信息；seed 由调用方决定，本函数只负责“兼容打开”。
 */
export function ensureSchema(getRaw: (name: CollectionName) => Array<Record<string, unknown>> | null): {
  data: LegacyRecordMap;
} & MigrationResult {
  const meta = readMeta();
  const legacy = !meta || !meta.schemaVersion || meta.schemaVersion === LEGACY_SCHEMA_VERSION;
  const data = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, [] as Array<Record<string, unknown>>])) as unknown as LegacyRecordMap;
  let migratedCount = 0;

  COLLECTION_NAMES.forEach((name) => {
    const rows = getRaw(name) ?? [];
    data[name] = rows.map((row) => {
      const migrated = migrateRecord<Record<string, unknown>>(name, row);
      if (legacy && typeof row.revision !== "number") migratedCount += 1;
      return migrated;
    });
  });

  if (!legacy) {
    return { data, meta: meta as PersistedMeta, migrated: false, migratedCount: 0 };
  }

  const now = new Date().toISOString();
  const nextMeta: PersistedMeta = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seededAt: meta?.seededAt ?? now,
    legacyMigratedAt: now
  };
  if (migratedCount > 0) {
    console.info(renderLog("Storage", 0, { from: LEGACY_SCHEMA_VERSION, to: CURRENT_SCHEMA_VERSION, count: migratedCount }));
  }
  return { data, meta: nextMeta, migrated: true, migratedCount };
}

export function writeMeta(meta: PersistedMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
