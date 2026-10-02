import { defineStore } from "pinia";
import {
  getDocumentRevision,
  importPolicyDocument,
  listPolicyDocument,
  savePolicyDocument,
  type ImportPolicyDocumentPayload
} from "../api/PolicyDocument";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { BatchProgress } from "../types/Storage";

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({
    rows: [] as PolicyDocument[],
    loading: false,
    /** 最近一次导入的分批保存进度 */
    lastBatchProgress: null as BatchProgress | null
  }),
  getters: {
    byId: (state) => (id: number) => state.rows.find((row) => row.id === id),
    ordered: (state) => [...state.rows].sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1))
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listPolicyDocument();
      } finally {
        this.loading = false;
      }
    },
    async save(payload: PolicyDocument) {
      const saved = await savePolicyDocument(payload);
      await this.load();
      return saved;
    },
    async importDocument(payload: ImportPolicyDocumentPayload) {
      const onProgress = payload.onProgress;
      const result = await importPolicyDocument({
        ...payload,
        onProgress: (progress) => {
          this.lastBatchProgress = progress;
          onProgress?.(progress);
        }
      });
      await this.load();
      return result;
    },
    async revisionOf(documentId: number): Promise<number | undefined> {
      return getDocumentRevision(documentId);
    }
  }
});
