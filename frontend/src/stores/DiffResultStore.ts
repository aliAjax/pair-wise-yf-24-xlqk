import { defineStore } from "pinia";
import { listDiffResult, recomputeDiff, saveDiffResult } from "../api/DiffResult";
import type { DiffResult } from "../types/DiffResult";

export const useDiffResultStore = defineStore("diffResult", {
  state: () => ({
    rows: [] as DiffResult[],
    loading: false
  }),
  getters: {
    forPair: (state) => (oldId: number, newId: number) =>
      state.rows.filter((row) => row.old_document_id === oldId && row.new_document_id === newId),
    forDocument: (state) => (newId: number) => state.rows.filter((row) => row.new_document_id === newId),
    staleDiffs: (state) => (sectionContents: Map<number, string>) =>
      // source_section_content 与当前段落正文不一致 = 尚未按新内容重算
      state.rows.filter((row) => sectionContents.has(row.section_id) && row.source_section_content !== sectionContents.get(row.section_id))
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listDiffResult();
      } finally {
        this.loading = false;
      }
    },
    async save(payload: DiffResult) {
      const saved = await saveDiffResult(payload);
      await this.load();
      return saved;
    },
    async recompute(newDocumentId: number, oldDocumentId?: number) {
      const impact = await recomputeDiff(newDocumentId, oldDocumentId);
      await this.load();
      return impact;
    }
  }
});
