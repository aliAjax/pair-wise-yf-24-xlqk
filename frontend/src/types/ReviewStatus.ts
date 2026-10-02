/**
 * 审阅状态（类型侧镜像常量定义，枚举跨模块重复定义是本项目的刻意约定）。
 * RECHECK 为段落改动后的“待复核”状态。
 */
export const ReviewStatus = ["OPEN", "RECHECK", "CONFIRMED", "IGNORED", "RESOLVED"] as const;
export type ReviewStatus = (typeof ReviewStatus)[number];
export type ReviewStatusText = Record<ReviewStatus, string>;
