/**
 * localStorage 底层读写工具。
 *
 * 内容超长时的分批保存约定：
 * - 集合整体序列化后若超过 CHUNK_CHAR_LIMIT，按字符切片写入 `key:batch:0..n`，
 *   并写一个 `key:manifest` 记录分片数；读取时按 manifest 顺序拼回。
 * - 未超长时直接写 `key` 单值，并清理可能残留的 manifest/分片。
 * - 写入触发 QuotaExceededError 时，自动把分片大小减半重试。
 */

export const STORAGE_KEYS = {
  documents: "policy-diff:v1:documents",
  sections: "policy-diff:v1:sections",
  diffs: "policy-diff:v1:diffs",
  notes: "policy-diff:v1:notes"
} as const;

/** 兼容旧版本数据的 key 前缀（早期版本不带 v1 命名空间） */
const LEGACY_PREFIX = "policy-diff:";

/** 单分片字符上限（约 40KB，远低于 localStorage 5MB 配额，预留充足余量） */
export const CHUNK_CHAR_LIMIT = 40_000;

const MANIFEST_SUFFIX = ":manifest";
const BATCH_SUFFIX = ":batch:";

interface BatchManifest {
  chunks: number;
  updated_at: string;
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function safeParse<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/** 读取集合：优先拼分批数据，其次读单值，最后回退到旧版本 key */
export function readCollection<T>(key: string): T[] {
  try {
    const manifestRaw = localStorage.getItem(key + MANIFEST_SUFFIX);
    if (manifestRaw) {
      const manifest = JSON.parse(manifestRaw) as BatchManifest;
      if (manifest.chunks > 0) {
        const parts: string[] = [];
        for (let i = 0; i < manifest.chunks; i++) {
          const part = localStorage.getItem(key + BATCH_SUFFIX + i);
          if (part === null) throw new Error(`batch chunk missing: ${i}`);
          parts.push(part);
        }
        const joined = parts.join("");
        const parsed = safeParse<T>(joined);
        if (parsed) return parsed;
      }
    }
    const single = safeParse<T>(localStorage.getItem(key));
    if (single) return single;
    // 兼容旧版本：v1 key 读不到时回退到无前缀的旧 key
    const legacyKey = key.replace("policy-diff:v1:", LEGACY_PREFIX);
    if (legacyKey !== key) {
      const legacy = safeParse<T>(localStorage.getItem(legacyKey));
      if (legacy) return legacy;
    }
  } catch (err) {
    console.warn(`[storage] readCollection failed: ${key}`, err);
  }
  return [];
}

function writeSingle(key: string, serialized: string): void {
  localStorage.setItem(key, serialized);
  // 清理旧分片
  const manifestRaw = localStorage.getItem(key + MANIFEST_SUFFIX);
  if (manifestRaw) {
    try {
      const manifest = JSON.parse(manifestRaw) as BatchManifest;
      for (let i = 0; i < manifest.chunks; i++) localStorage.removeItem(key + BATCH_SUFFIX + i);
    } catch {
      /* ignore */
    }
    localStorage.removeItem(key + MANIFEST_SUFFIX);
  }
}

function writeBatches(key: string, serialized: string, chunkLimit: number): number {
  const chunks = Math.ceil(serialized.length / chunkLimit);
  for (let i = 0; i < chunks; i++) {
    localStorage.setItem(key + BATCH_SUFFIX + i, serialized.slice(i * chunkLimit, (i + 1) * chunkLimit));
  }
  const manifest: BatchManifest = { chunks, updated_at: new Date().toISOString() };
  localStorage.setItem(key + MANIFEST_SUFFIX, JSON.stringify(manifest));
  // 清理可能残留的单值，避免读到旧数据
  localStorage.removeItem(key);
  return chunks;
}

export interface WriteResult {
  batches: number;
  chars: number;
}

/** 写入集合，内容超长时自动分批保存 */
export function writeCollection<T>(key: string, rows: T[]): WriteResult {
  const serialized = JSON.stringify(rows);
  if (serialized.length <= CHUNK_CHAR_LIMIT) {
    writeSingle(key, serialized);
    return { batches: 1, chars: serialized.length };
  }
  let chunkLimit = CHUNK_CHAR_LIMIT;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const batches = writeBatches(key, serialized, chunkLimit);
      return { batches, chars: serialized.length };
    } catch (err) {
      if (isQuotaError(err) && attempt < 3) {
        console.warn(`[storage] quota exceeded, retrying with smaller chunks (limit=${chunkLimit / 2})`);
        chunkLimit = Math.floor(chunkLimit / 2);
        continue;
      }
      throw err;
    }
  }
  throw new Error("batch save failed after retries");
}

/** 追加写入单条记录（读-改-写），返回写入后的集合 */
export function appendCollection<T extends { id: number }>(key: string, item: T): T[] {
  const rows = readCollection<T>(key);
  rows.push(item);
  writeCollection(key, rows);
  return rows;
}

/** 更新集合中的单条记录（按 id），返回更新后的集合 */
export function updateCollection<T extends { id: number }>(key: string, item: T): T[] {
  const rows = readCollection<T>(key);
  const idx = rows.findIndex((row) => row.id === item.id);
  if (idx >= 0) rows[idx] = item;
  else rows.push(item);
  writeCollection(key, rows);
  return rows;
}

/** 批量更新集合中的多条记录（按 id），返回更新后的集合 */
export function updateCollectionBatch<T extends { id: number }>(key: string, items: T[]): T[] {
  const rows = readCollection<T>(key);
  const map = new Map(rows.map((row) => [row.id, row]));
  for (const item of items) map.set(item.id, item);
  const merged = Array.from(map.values());
  writeCollection(key, merged);
  return merged;
}

export function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}
