import type { CollectionName } from "../utils/storageKeys";

/** localStorage 持久化元信息 */
export interface PersistedMeta {
  schemaVersion: number;
  seededAt: string;
  legacyMigratedAt?: string;
}

/** 超长内容分块写入的提交清单 */
export interface ChunkManifest {
  chunks: number;
  size: number;
}

/** 分批保存进度回调载荷 */
export interface BatchProgress {
  batch: number;
  totalBatches: number;
  saved: number;
  total: number;
}

/** 一次保存动作的落盘统计 */
export interface BatchSaveStats {
  batches: number;
  commits: number;
  chunkedCommits: number;
  chunks: number;
}

/**
 * 版本冲突时被自动保留下来的本地改动草稿，
 * 保证“晚到的那次”提示冲突后改动不丢失。
 */
export interface ConflictDraft<T = unknown> {
  id: number;
  collection: CollectionName;
  record_id: number;
  document_id: number;
  payload: T;
  /** 改动开始时所基于的文档版本号 */
  base_revision: number;
  /** 保存被拒时磁盘上的最新文档版本号 */
  current_revision: number;
  reason: string;
  created_at: string;
  resolved: boolean;
}
