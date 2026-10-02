import { defineStore } from "pinia";
import { listPolicySection, patchPolicySectionMeta, updatePolicySection } from "../api/PolicySection";
import { useDiffResultStore } from "./DiffResultStore";
import { useReviewNoteStore } from "./ReviewNoteStore";
import { usePolicyDocumentStore } from "./PolicyDocumentStore";
import { ControllerError } from "../utils/errors";
import type { PolicySection } from "../types/PolicySection";
import type { RecheckImpact } from "../types/service";

export interface SaveSectionOutcome {
  ok: boolean;
  impact?: RecheckImpact;
  error?: ControllerError;
}

export const usePolicySectionStore = defineStore("policySection", {
  state: () => ({
    rows: [] as PolicySection[],
    loading: false,
    /** 最近一次段落保存的联动影响（重算差异数 / 待复核备注数） */
    lastImpact: null as RecheckImpact | null
  }),
  getters: {
    byDocument: (state) => (documentId: number) =>
      state.rows
        .filter((row) => row.document_id === documentId)
        .sort((a, b) => a.section_no.localeCompare(b.section_no, "zh-CN")),
    byId: (state) => (id: number) => state.rows.find((row) => row.id === id)
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listPolicySection();
      } finally {
        this.loading = false;
      }
    },
    /**
     * 段落改动保存。
     * 成功 → 按新内容重算差异，关联备注保留原文并标待复核，然后刷新相关 store。
     * 冲突 → 错误抛出给页面提示，service 侧已把晚到改动存入冲突草稿，改动不丢。
     */
    async saveSection(section: PolicySection, baseRevision: number): Promise<SaveSectionOutcome> {
      try {
        const impact = await updatePolicySection(section, baseRevision);
        this.lastImpact = impact;
        // 联动实体全部刷新，杜绝旧差异/旧备注照旧显示
        await Promise.all([this.load(), useDiffResultStore().load(), useReviewNoteStore().load(), usePolicyDocumentStore().load()]);
        return { ok: true, impact };
      } catch (error) {
        // 冲突时仍刷新为磁盘最新，页面表单保留用户改动草稿
        await Promise.all([this.load(), useDiffResultStore().load(), usePolicyDocumentStore().load()]);
        if (error instanceof ControllerError) return { ok: false, error };
        throw error;
      }
    },
    async saveMeta(
      sectionId: number,
      patch: Partial<Pick<PolicySection, "risk_level" | "category">>,
      baseRevision: number
    ): Promise<SaveSectionOutcome> {
      try {
        const impact = await patchPolicySectionMeta(sectionId, patch, baseRevision);
        this.lastImpact = impact;
        await Promise.all([this.load(), useDiffResultStore().load(), useReviewNoteStore().load()]);
        return { ok: true, impact };
      } catch (error) {
        if (error instanceof ControllerError) return { ok: false, error };
        throw error;
      }
    }
  }
});
