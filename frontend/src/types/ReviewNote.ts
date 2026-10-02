export interface ReviewNote {
  id: number;
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
  status: string;
  /** 首次审阅时的备注原文，标记待复核也不覆盖，保留可追溯 */
  original_comment: string;
  /** 被标记为待复核的时间；空串表示无需复核 */
  recheck_at: string;
}
