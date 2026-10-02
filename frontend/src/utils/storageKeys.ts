export const COLLECTION_NAMES = ["policyDocument", "policySection", "diffResult", "reviewNote"] as const;
export type CollectionName = (typeof COLLECTION_NAMES)[number];

/** 各集合在 localStorage 中的主键名 */
export const STORAGE_KEYS: Record<CollectionName, string> = {
  policyDocument: "policy-diff:policyDocument",
  policySection: "policy-diff:policySection",
  diffResult: "policy-diff:diffResult",
  reviewNote: "policy-diff:reviewNote"
};

export const META_KEY = "policy-diff:meta";
export const DRAFT_KEY = "policy-diff:conflictDrafts";
/** 超长内容分块保存时的前缀，最终块清单挂在主键上 */
export const CHUNK_PREFIX = "policy-diff:chunk";

/** 当前本地数据结构版本；缺少版本号的旧数据按兼容方式迁移到该版本 */
export const CURRENT_SCHEMA_VERSION = 2;
/** 视为“无版本号旧数据”的初始版本 */
export const LEGACY_SCHEMA_VERSION = 0;
