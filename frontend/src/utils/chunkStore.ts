import { CHUNK_PREFIX, type CollectionName } from "./storageKeys";
import { STORAGE_CONFIG } from "../config/storage";
import { renderLog } from "../constants/logTemplates";

const encode = (value: string): string => {
  // 转为 base64 安全存储，同时规避极少数控制字符在 JSON 中的膨胀问题
  if (typeof btoa === "function") {
    try {
      return btoa(unescape(encodeURIComponent(value)));
    } catch {
      return value;
    }
  }
  return value;
};

const decode = (value: string): string => {
  if (typeof atob === "function") {
    try {
      return decodeURIComponent(escape(atob(value)));
    } catch {
      return value;
    }
  }
  return value;
};

const chunkKey = (collection: CollectionName, id: number, index: number) =>
  `${CHUNK_PREFIX}:${collection}:${id}:${index}`;

const chunkIndexKey = (collection: CollectionName, id: number) =>
  `${CHUNK_PREFIX}:${collection}:${id}`;

/** 读取某条被分块存储的记录，返回 null 表示没有分块数据 */
export function readChunked(collection: CollectionName, id: number): unknown | null {
  const indexRaw = localStorage.getItem(chunkIndexKey(collection, id));
  if (!indexRaw) return null;
  try {
    const { chunks } = JSON.parse(indexRaw) as { chunks: number; size: number };
    const parts: string[] = [];
    for (let i = 0; i < chunks; i += 1) {
      const part = localStorage.getItem(chunkKey(collection, id, i));
      if (part == null) throw new Error(`missing chunk ${i}/${chunks}`);
      parts.push(part);
    }
    return JSON.parse(decode(parts.join("")));
  } catch (error) {
    console.warn(`读取分块数据失败 ${collection}#${id}`, error);
    return null;
  }
}

/** 删除某条记录的全部分块 */
export function removeChunked(collection: CollectionName, id: number): void {
  const indexRaw = localStorage.getItem(chunkIndexKey(collection, id));
  if (!indexRaw) return;
  try {
    const { chunks } = JSON.parse(indexRaw) as { chunks: number };
    for (let i = 0; i < chunks; i += 1) localStorage.removeItem(chunkKey(collection, id, i));
  } catch {
    // 索引损坏时尽力清理
    let i = 0;
    while (localStorage.getItem(chunkKey(collection, id, i)) != null) {
      localStorage.removeItem(chunkKey(collection, id, i));
      i += 1;
    }
  }
  localStorage.removeItem(chunkIndexKey(collection, id));
}

/**
 * 内容超长写不下时：先按分块保存单条记录。
 * 写新块前先清旧块，避免“半截数据”；任一块写入失败向上抛出，由调用方保留冲突草稿。
 */
export function writeChunked(collection: CollectionName, id: number, record: unknown): void {
  const encoded = encode(JSON.stringify(record));
  if (encoded.length <= STORAGE_CONFIG.CHUNK_CHAR_THRESHOLD) {
    // 不再超长：若历史上是分块存储，清理旧块
    removeChunked(collection, id);
    return;
  }
  const size = STORAGE_CONFIG.CHUNK_SIZE;
  const chunks = Math.ceil(encoded.length / size);

  // 先清旧块，再逐块写新数据
  removeChunked(collection, id);
  for (let i = 0; i < chunks; i += 1) {
    localStorage.setItem(chunkKey(collection, id, i), encoded.slice(i * size, (i + 1) * size));
  }
  localStorage.setItem(chunkIndexKey(collection, id), JSON.stringify({ chunks, size: encoded.length }));
  console.info(renderLog("Storage", 2, { collection, record_id: id, size: encoded.length, chunks }));
}

export function isOversized(record: unknown): boolean {
  return encode(JSON.stringify(record)).length > STORAGE_CONFIG.CHUNK_CHAR_THRESHOLD;
}
