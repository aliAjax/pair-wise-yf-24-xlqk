import { defineStore } from "pinia";
import { getAllConflictDrafts, getConflictDrafts, resolveDraft } from "../services/conflictDraftService";
import type { ConflictDraft } from "../types/Storage";

export const useConflictDraftStore = defineStore("conflictDraft", {
  state: () => ({
    rows: [] as ConflictDraft[],
    history: [] as ConflictDraft[]
  }),
  getters: {
    pending: (state) => state.rows,
    pendingCount: (state) => state.rows.length
  },
  actions: {
    // 跨标签页刷新由 useCrossTabSync 统一协调
    async load() {
      this.rows = getConflictDrafts();
      this.history = getAllConflictDrafts().filter((draft) => draft.resolved);
    },
    async merge(id: number) {
      const result = resolveDraft(id, true);
      await this.load();
      return result;
    },
    async discard(id: number) {
      const result = resolveDraft(id, false);
      await this.load();
      return result;
    }
  }
});
