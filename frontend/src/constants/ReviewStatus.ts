/**
 * 审阅状态。
 * RECHECK 为段落改动后自动落入的“待复核”状态：备注原文保留，等待人工重新确认。
 * 旧数据中没有 RECHECK，兼容打开时才按需写入。
 */
export const ReviewStatus = ["OPEN", "RECHECK", "CONFIRMED", "IGNORED", "RESOLVED"] as const;
export type ReviewStatus = (typeof ReviewStatus)[number];
export const ReviewStatusText: Record<ReviewStatus, string> = {
  OPEN: "待处理",
  RECHECK: "待复核",
  CONFIRMED: "已确认",
  IGNORED: "已忽略",
  RESOLVED: "已解决"
};
