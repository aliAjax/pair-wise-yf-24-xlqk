import { defineStore } from "pinia";
import {
  listPolicySections,
  listSectionsByDocument,
  savePolicySections,
  updatePolicySection,
  deleteSectionsByDocument
} from "../api/PolicySection";
import { recomputeDiffsForNewDocument } from "../api/DiffResult";
import { markNotesPendingReview } from "../api/ReviewNote";
import { bootstrapLocalDb } from "../api/localDb";
import type { PolicySection } from "../types/PolicySection";

export const usePolicySectionStore = defineStore("policySection", {
  state: () => ({
    rows: [] as PolicySection[],
    loading: false,
    /** 最近一次段落改动触发的待复核备注数 */
    lastPendingCount: 0
  }),
  getters: {
    byDocument: (state) => (documentId: number) =>
      state.rows
        .filter((section) => section.document_id === documentId)
        .sort((a, b) => Number(a.section_no) - Number(b.section_no))
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        bootstrapLocalDb();
        this.rows = await listPolicySections();
      } finally {
        this.loading = false;
      }
    },

    async loadByDocument(documentId: number) {
      this.rows = await listSectionsByDocument(documentId);
    },

    async bulkSave(sections: PolicySection[]) {
      const result = await savePolicySections(sections);
      await this.load();
      return result;
    },

    /**
     * 更新段落内容，并联动重算差异、把受影响备注标为待复核。
     * 段落、差异、备注三者始终连动，不允许只改段落而旧差异照旧显示。
     */
    async updateContent(section: PolicySection): Promise<{ pendingCount: number }> {
      const updated = await updatePolicySection(section);
      const recompute = await recomputeDiffsForNewDocument(updated.document_id);
      let pendingCount = 0;
      if (recompute && recompute.affectedDiffIds.length > 0) {
        const touched = await markNotesPendingReview(recompute.affectedDiffIds);
        pendingCount = touched.length;
      }
      this.lastPendingCount = pendingCount;
      await this.load();
      return { pendingCount };
    },

    /** 仅更新风险等级/分类（不影响差异，无需重算） */
    async updateRisk(section: PolicySection) {
      await updatePolicySection(section);
      await this.load();
    },

    async removeByDocument(documentId: number) {
      await deleteSectionsByDocument(documentId);
      await this.load();
    }
  }
});
