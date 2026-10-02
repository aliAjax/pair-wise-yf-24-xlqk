import { defineStore } from "pinia";
import {
  listPolicyDocuments,
  savePolicyDocument,
  forceSavePolicyDocument,
  savePolicyDocumentAsNew,
  deletePolicyDocument,
  type SaveResult,
  type SaveConflict
} from "../api/PolicyDocument";
import { bootstrapLocalDb } from "../api/localDb";
import type { PolicyDocument } from "../types/PolicyDocument";
import { resolveDocumentVersion, isLegacyDocument } from "../types/PolicyDocument";

interface ConflictState {
  pendingDoc: PolicyDocument;
  baseVersion: number;
  serverVersion: number;
  serverDoc: PolicyDocument;
}

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({
    rows: [] as PolicyDocument[],
    loading: false,
    conflict: null as ConflictState | null,
    lastSaved: null as SaveResult | null
  }),
  getters: {
    byId: (state) => (id: number) => state.rows.find((doc) => doc.id === id),
    /** 兼容模式打开的历史文档（缺少版本号） */
    legacyDocs: (state) => state.rows.filter((doc) => isLegacyDocument(doc))
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        bootstrapLocalDb();
        this.rows = await listPolicyDocuments();
      } finally {
        this.loading = false;
      }
    },

    /** 保存文档；版本落后时返回冲突状态，用户改动保留在 pendingDoc 中 */
    async save(doc: PolicyDocument): Promise<SaveResult> {
      const result = await savePolicyDocument(doc);
      if (result.conflict) {
        this.conflict = {
          pendingDoc: result.conflict.pendingDoc,
          baseVersion: result.conflict.baseVersion,
          serverVersion: result.conflict.serverVersion,
          serverDoc: result.conflict.serverDoc
        };
        return result;
      }
      this.lastSaved = result;
      await this.load();
      return result;
    },

    /** 冲突处理：强制覆盖（我的改动优先） */
    async resolveConflictForce(): Promise<SaveResult> {
      if (!this.conflict) return { ok: false };
      const result = await forceSavePolicyDocument(this.conflict.pendingDoc);
      this.conflict = null;
      this.lastSaved = result;
      await this.load();
      return result;
    },

    /** 冲突处理：另存为新文档，改动不丢 */
    async resolveConflictSaveAsNew(): Promise<SaveResult> {
      if (!this.conflict) return { ok: false };
      const result = await savePolicyDocumentAsNew(this.conflict.pendingDoc);
      this.conflict = null;
      this.lastSaved = result;
      await this.load();
      return result;
    },

    /** 冲突处理：取消编辑——关闭提示，表单中的改动原样保留 */
    dismissConflict() {
      this.conflict = null;
    },

    async remove(id: number) {
      await deletePolicyDocument(id);
      await this.load();
    },

    versionOf(doc: PolicyDocument): number {
      return resolveDocumentVersion(doc);
    }
  }
});
