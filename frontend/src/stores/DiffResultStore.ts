import { defineStore } from "pinia";
import {
  listDiffResults,
  listDiffsForPair,
  recomputeDiffsForPair,
  recomputeDiffsForNewDocument,
  type RecomputeResult
} from "../api/DiffResult";
import { bootstrapLocalDb } from "../api/localDb";
import type { DiffResult } from "../types/DiffResult";

export const useDiffResultStore = defineStore("diffResult", {
  state: () => ({
    rows: [] as DiffResult[],
    loading: false,
    lastRecompute: null as RecomputeResult | null
  }),
  getters: {
    byPair: (state) => (oldDocId: number, newDocId: number) =>
      state.rows.filter(
        (diff) => diff.old_document_id === oldDocId && diff.new_document_id === newDocId
      ),
    byNewDocument: (state) => (newDocId: number) =>
      state.rows.filter((diff) => diff.new_document_id === newDocId)
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        bootstrapLocalDb();
        this.rows = await listDiffResults();
      } finally {
        this.loading = false;
      }
    },

    async loadPair(oldDocId: number, newDocId: number) {
      this.rows = await listDiffsForPair(oldDocId, newDocId);
    },

    /** 手动触发：按新内容重算指定文档对的差异 */
    async recomputePair(oldDocId: number, newDocId: number): Promise<RecomputeResult> {
      const result = await recomputeDiffsForPair(oldDocId, newDocId);
      this.lastRecompute = result;
      await this.load();
      return result;
    },

    async recomputeForNewDocument(newDocId: number): Promise<RecomputeResult | null> {
      const result = await recomputeDiffsForNewDocument(newDocId);
      if (result) {
        this.lastRecompute = result;
        await this.load();
      }
      return result;
    }
  }
});
