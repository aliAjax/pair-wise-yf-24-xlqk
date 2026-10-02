import type { BatchProgress } from "./Storage";

/** 段落改动联动重算后回传给页面的影响面 */
export interface RecheckImpact {
  /** 被标记为待复核的备注 id */
  recheckNoteIds: number[];
  /** 差异真正变化的条款 stable_key */
  changedStableKeys: string[];
  /** 保存后文档最新版本号 */
  documentRevision: number;
}

export type { BatchProgress };
