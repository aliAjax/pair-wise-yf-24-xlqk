import { defineStore } from "pinia";
import {
  listReviewNotes,
  markNotesPendingReview,
  markNotePendingReview,
  updateReviewNoteStatus,
  addReviewNote
} from "../api/ReviewNote";
import { bootstrapLocalDb } from "../api/localDb";
import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../constants/ReviewStatus";

export const useReviewNoteStore = defineStore("reviewNote", {
  state: () => ({
    rows: [] as ReviewNote[],
    loading: false
  }),
  getters: {
    byDiff: (state) => (diffResultId: number) =>
      state.rows.filter((note) => note.diff_result_id === diffResultId),
    pending: (state) => state.rows.filter((note) => note.status === "PENDING_REVIEW")
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        bootstrapLocalDb();
        this.rows = await listReviewNotes();
      } finally {
        this.loading = false;
      }
    },

    async markPending(diffResultIds: number[]) {
      await markNotesPendingReview(diffResultIds);
      await this.load();
    },

    async markOnePending(noteId: number) {
      await markNotePendingReview(noteId);
      await this.load();
    },

    async setStatus(noteId: number, status: ReviewStatus) {
      await updateReviewNoteStatus(noteId, status);
      await this.load();
    },

    async add(note: Omit<ReviewNote, "id">) {
      const created = await addReviewNote(note);
      await this.load();
      return created;
    }
  }
});
