import { STATUS_TEXT } from "../constants/statusText";
import { LEGACY_DOCUMENT_VERSION } from "../types/PolicyDocument";

export const formatDate = (value: string) => new Date(value).toLocaleString("zh-CN");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);

export const formatRisk = (value: string) =>
  ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);

export const formatDiffType = (value: string) => STATUS_TEXT.DiffType[value as keyof typeof STATUS_TEXT.DiffType] ?? value;

export const formatReviewStatus = (value: string) =>
  STATUS_TEXT.ReviewStatus[value as keyof typeof STATUS_TEXT.ReviewStatus] ?? value;

/** 文档版本展示：缺少版本号的历史数据按兼容模式展示 */
export const formatVersion = (version: number | undefined | null) => {
  if (!version || version <= LEGACY_DOCUMENT_VERSION) return "旧版数据（无版本号）";
  return `v${version}`;
};
