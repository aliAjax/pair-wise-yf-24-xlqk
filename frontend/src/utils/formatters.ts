export const formatDate = (value: string) => (value ? new Date(value).toLocaleString("zh-CN") : "—");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) =>
  ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);
export const formatRevision = (value: number | undefined) => `v${value ?? 1}`;
export const formatDiffType = (value: string) =>
  ({ ADDED: "新增", REMOVED: "删除", MODIFIED: "修改", MOVED: "移动", UNCHANGED: "未变" }[value] ?? value);
export const formatReviewStatus = (value: string) =>
  ({ OPEN: "待处理", RECHECK: "待复核", CONFIRMED: "已确认", IGNORED: "已忽略", RESOLVED: "已解决" }[value] ?? value);
export const formatCategory = (value: string) =>
  (
    {
      DATA_COLLECTION: "信息收集",
      DATA_SHARING: "对外共享",
      DATA_RETENTION: "保存期限",
      USER_RIGHTS: "用户权利",
      CONTACT: "联系方式",
      OTHER: "其他"
    } as Record<string, string>
  )[value] ?? value;
export const truncate = (value: string, max = 60) =>
  value.length > max ? `${value.replace(/\s+/g, " ").slice(0, max)}…` : value;
