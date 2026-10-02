import { defineStore } from "pinia";
import { createNote, editNote, listReviewNote, setNoteStatus } from "../api/ReviewNote";
import type { ReviewNote } from "../types/ReviewNote";

export const useReviewNoteStore = defineStore("reviewNote", {
  state: () => ({
    rows: [] as ReviewNote[],
    loading: false
  }),
  getters: {
    forDiff: (state) => (diffId: number) => state.rows.filter((row) => row.diff_result_id === diffId),
    recheckRows: (state) => state.rows.filter((row) => row.status === "RECHECK"),
    openCount: (state) => state.rows.filter((row) => row.status === "OPEN" || row.status === "RECHECK").length
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listReviewNote();
      } finally {
        this.loading = false;
      }
    },
    async add(payload: { diff_result_id: number; tag: string; comment: string; reviewer: string }) {
      const note = await createNote(payload);
      await this.load();
      return note;
    },
    async setStatus(id: number, status: ReviewNote["status"]) {
      const note = await setNoteStatus(id, status);
      await this.load();
      return note;
    },
    async edit(id: number, comment: string) {
      const note = await editNote(id, comment);
      await this.load();
      return note;
    }
  }
});
