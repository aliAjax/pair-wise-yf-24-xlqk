export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  VERSION_CONFLICT: "检测到文档已在其他标签页保存为更新版本（当前 v{current}，你基于 v{base} 修改），你的改动已保留为冲突草稿，不会覆盖他人内容",
  LEGACY_DATA: "数据缺少版本号，已按兼容方式补全（revision=1）后打开",
  SAVE_TOO_LARGE: "内容超长（{size} 字符），已自动改为分块分批保存",
  BATCH_SAVE_FAILED: "第 {batch}/{total} 批保存失败：{reason}，前序批次未回滚，可在冲突草稿中继续处理"
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

export const renderErrorMessage = (key: ErrorMessageKey, params: Record<string, string | number> = {}): string =>
  ERROR_MESSAGES[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
