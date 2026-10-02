import {
  COLLECTION_NAMES,
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEYS,
  type CollectionName
} from "./storageKeys";
import { ensureSchema, writeMeta } from "./storageMigration";
import { isOversized, readChunked, removeChunked, writeChunked } from "./chunkStore";
import type { BatchProgress, BatchSaveStats, PersistedMeta } from "../types/Storage";
import { STORAGE_CONFIG } from "../config/storage";
import { AppError, VersionConflictError } from "./errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { renderLog } from "../constants/logTemplates";

/** 集合内某条记录指向分块存储的占位标记 */
interface ChunkMarker {
  __chunked__: true;
  id: number;
}

const isMarker = (value: unknown): value is ChunkMarker =>
  typeof value === "object" && value !== null && (value as { __chunked__?: boolean }).__chunked__ === true;

export interface SaveOptions {
  /** 保存所基于的文档版本号；提供时做乐观并发校验 */
  baseRevision?: number;
  /** 记录所属文档 id，用于冲突草稿归属 */
  documentId?: number;
  /** 超长内容是否允许分批保存（默认允许） */
  allowBatch?: boolean;
  onProgress?: (progress: BatchProgress) => void;
}

export interface SaveResult<T> {
  record: T;
  revision: number;
  conflict: boolean;
  batched: boolean;
  stats?: BatchSaveStats;
}

type Listener = (event: { collection: CollectionName | "*"; reason: string }) => void;

const yieldToEventLoop = () =>
  new Promise<void>((resolve) => {
    if (STORAGE_CONFIG.BATCH_YIELD_MS > 0) setTimeout(resolve, STORAGE_CONFIG.BATCH_YIELD_MS);
    else setTimeout(resolve, 0);
  });

class LocalRepository {
  private seeded = false;
  private listeners = new Set<Listener>();
  private crossTabBound = false;

  /** 唯一的跨标签页 storage 监听：按 key 解析出集合并通知订阅者 */
  private ensureCrossTab(): void {
    if (this.crossTabBound || typeof window === "undefined") return;
    this.crossTabBound = true;
    window.addEventListener("storage", (event) => {
      if (!event.key || !event.key.startsWith("policy-diff:")) return;
      const hit = COLLECTION_NAMES.find((name) => event.key === STORAGE_KEYS[name]);
      if (hit) this.emit(hit, "cross-tab-save");
      else if (event.key === "policy-diff:conflictDrafts") this.emit("*", "conflict-draft-updated");
    });
  }

  /** 首次访问时把种子数据与可能存在的无版本号旧数据统一迁移落盘 */
  init(seed: Record<CollectionName, unknown[]>): PersistedMeta {
    this.ensureCrossTab();
    if (this.seeded) {
      return this.getMeta();
    }
    const getRaw = (name: CollectionName): Array<Record<string, unknown>> | null => {
      const raw = localStorage.getItem(STORAGE_KEYS[name]);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Array<Record<string, unknown>>;
      } catch {
        return [];
      }
    };
    const { data, meta, migrated } = ensureSchema(getRaw);
    COLLECTION_NAMES.forEach((name) => {
      if (!localStorage.getItem(STORAGE_KEYS[name])) {
        const rows = (data[name].length > 0 ? data[name] : seed[name]) as Array<Record<string, unknown>>;
        localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(rows));
      } else if (migrated) {
        // 兼容打开后回写补全的记录，之后即为带版本号新数据
        localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(data[name]));
      }
    });
    writeMeta(meta);
    this.seeded = true;
    return meta;
  }

  getMeta(): PersistedMeta {
    const raw = localStorage.getItem("policy-diff:meta");
    if (raw) return JSON.parse(raw) as PersistedMeta;
    return { schemaVersion: CURRENT_SCHEMA_VERSION, seededAt: new Date().toISOString() };
  }

  /** 订阅本标签页内的数据变更（跨标签页 storage 事件见 bindCrossTab） */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 跨标签页事件也通过 subscribe 统一分发（ensureCrossTab 只注册一次） */
  bindCrossTab(onRemote: Listener): () => void {
    this.ensureCrossTab();
    return this.subscribe(onRemote);
  }

  private emit(collection: CollectionName | "*", reason: string): void {
    this.listeners.forEach((listener) => listener({ collection, reason }));
  }

  list<T>(collection: CollectionName): T[] {
    const raw = localStorage.getItem(STORAGE_KEYS[collection]);
    if (!raw) return [];
    let rows: unknown[];
    try {
      rows = JSON.parse(raw) as unknown[];
    } catch {
      return [];
    }
    return rows.map((row) => (isMarker(row) ? (readChunked(collection, row.id) as T) : (row as T)));
  }

  find<T extends { id: number }>(collection: CollectionName, id: number): T | undefined {
    return this.list<T>(collection).find((row) => row.id === id);
  }

  nextId(collection: CollectionName): number {
    const rows = this.list<{ id: number }>(collection);
    return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  }

  private readRawRows(name: CollectionName): unknown[] {
    const raw = localStorage.getItem(STORAGE_KEYS[name]);
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  }

  private commitRaw(name: CollectionName, rows: unknown[]): void {
    // 单次 localStorage.setItem 是原子的；多标签页下晚到者先读最新再写
    try {
      localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(rows));
    } catch (error) {
      // 容量超限时先保留已有数据，由上层转为冲突草稿
      throw new AppError(ERROR_CODES.SAVE_TOO_LARGE, "本地存储空间不足，改动已保留为冲突草稿", error);
    }
  }

  /** 取某文档当前版本号（版本判断以文档为粒度） */
  documentRevision(documentId: number): number | undefined {
    return this.find<{ id: number; revision: number }>("policyDocument", documentId)?.revision;
  }

  /**
   * 保存单条记录（upsert）。
   * - baseRevision 提供时按文档版本号判断先后，晚到保存抛 VersionConflictError（不写入、不丢改动）
   * - 内容超长时先按分块写入，主集合只放占位标记
   */
  save<T extends { id: number; revision?: number }>(
    collection: CollectionName,
    payload: T,
    options: SaveOptions = {}
  ): SaveResult<T> {
    const documentId = options.documentId ?? this.guessDocumentId(collection, payload);
    if (options.baseRevision != null && documentId != null) {
      const current = this.documentRevision(documentId);
      if (current != null && current > options.baseRevision) {
        throw new VersionConflictError({
          collection,
          recordId: payload.id,
          documentId,
          baseRevision: options.baseRevision,
          currentRevision: current,
          payload
        });
      }
    }

    const rows = this.readRawRows(collection);
    const index = rows.findIndex((row) => !isMarker(row) && (row as { id: number }).id === payload.id);

    let stored: unknown = payload;
    let chunked = false;
    if (isOversized(payload)) {
      writeChunked(collection, payload.id, payload);
      stored = { __chunked__: true, id: payload.id } as ChunkMarker;
      chunked = true;
    } else {
      removeChunked(collection, payload.id);
    }

    if (index >= 0) rows[index] = stored;
    else rows.push(stored);
    this.commitRaw(collection, rows);
    this.emit(collection, index >= 0 ? "update" : "create");

    return {
      record: payload,
      revision: payload.revision ?? 0,
      conflict: false,
      batched: chunked,
      stats: chunked ? { batches: 1, commits: 1, chunkedCommits: 1, chunks: 1 } : undefined
    };
  }

  private guessDocumentId(collection: CollectionName, payload: unknown): number | undefined {
    const row = payload as { document_id?: number; new_document_id?: number };
    if (collection === "policyDocument") return (payload as { id: number }).id;
    if (collection === "policySection" || collection === "diffResult") return row.document_id ?? row.new_document_id;
    return undefined;
  }

  /**
   * 分批保存多条记录（内容超长写不下时先分批保存）。
   * 逐批提交，批次间让步事件循环；每批保存前重新读取磁盘最新版本做并发判断。
   * 单条冲突：该条跳过并由上层转冲突草稿，其余批次继续提交（不让任何改动丢失）。
   */
  async saveMany<T extends { id: number; revision?: number }>(
    collection: CollectionName,
    payloads: T[],
    options: SaveOptions = {}
  ): Promise<{ saved: T[]; conflicts: VersionConflictError<T>[]; stats: BatchSaveStats }> {
    const batchSize = STORAGE_CONFIG.BATCH_SIZE;
    const totalBatches = Math.max(1, Math.ceil(payloads.length / batchSize));
    const saved: T[] = [];
    const conflicts: VersionConflictError<T>[] = [];
    const stats: BatchSaveStats = { batches: 0, commits: 0, chunkedCommits: 0, chunks: 0 };

    for (let batch = 0; batch < totalBatches; batch += 1) {
      const slice = payloads.slice(batch * batchSize, (batch + 1) * batchSize);
      // 每批重新读盘，拿到另一标签页可能已提交的最新行
      let rows = this.readRawRows(collection);
      let changed = false;

      for (const payload of slice) {
        const documentId = options.documentId ?? this.guessDocumentId(collection, payload);
        if (options.baseRevision != null && documentId != null) {
          const current = this.documentRevision(documentId);
          if (current != null && current > options.baseRevision) {
            conflicts.push(
              new VersionConflictError({
                collection,
                recordId: payload.id,
                documentId,
                baseRevision: options.baseRevision,
                currentRevision: current,
                payload
              })
            );
            continue;
          }
        }
        let stored: unknown = payload;
        if (isOversized(payload)) {
          writeChunked(collection, payload.id, payload);
          stored = { __chunked__: true, id: payload.id } as ChunkMarker;
          stats.chunkedCommits += 1;
        } else {
          removeChunked(collection, payload.id);
        }
        const index = rows.findIndex((row) => !isMarker(row) && (row as { id: number }).id === payload.id);
        if (index >= 0) rows[index] = stored;
        else rows.push(stored);
        saved.push(payload);
        changed = true;
      }

      if (changed) {
        this.commitRaw(collection, rows);
        stats.commits += 1;
      }
      stats.batches += 1;
      options.onProgress?.({
        batch: batch + 1,
        totalBatches,
        saved: saved.length,
        total: payloads.length
      });
      if (batch + 1 < totalBatches) await yieldToEventLoop();
    }

    if (saved.length > 0) this.emit(collection, "batch-update");
    console.info(
      renderLog("Storage", 3, {
        collection,
        total: payloads.length,
        batches: stats.batches,
        saved: saved.length
      })
    );
    return { saved, conflicts, stats };
  }

  remove(collection: CollectionName, id: number): void {
    const rows = this.readRawRows(collection).filter((row) => {
      if (isMarker(row)) return row.id !== id;
      return (row as { id: number }).id !== id;
    });
    removeChunked(collection, id);
    this.commitRaw(collection, rows);
    this.emit(collection, "remove");
  }

  /** 替换整个集合（仅供 service 内部联动重算使用，仍走原子提交） */
  replaceAll(collection: CollectionName, rows: unknown[]): void {
    this.commitRaw(collection, rows);
    this.emit(collection, "replace");
  }
}

export const localRepository = new LocalRepository();
