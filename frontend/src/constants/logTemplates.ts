export const LOG_TEMPLATES = {
  PolicyDocument: [
    "政策文档创建：{title}（v{revision}）",
    "政策文档更新：{title}（v{from} → v{to}）",
    "政策文档状态变更：{title} {field} {from} → {to}",
    "政策文档导出：{title}"
  ],
  PolicySection: [
    "条款段落创建：{document_title} {section_no} {heading}",
    "条款段落更新：{document_title} {section_no}（v{from} → v{to}），触发 {diff_count} 条差异重算",
    "条款段落状态变更：{section_no} {field} {from} → {to}",
    "条款段落导出：{document_title} {section_no}"
  ],
  DiffResult: [
    "差异结果创建：{old} ↔ {new} / {stable_key} {diff_type}",
    "差异结果更新：{stable_key} 按新段落内容重算（v{from} → v{to}）",
    "差异结果状态变更：{stable_key} {diff_type} {from} → {to}",
    "差异结果导出：{old} ↔ {new}（{count} 条）"
  ],
  ReviewNote: [
    "审阅备注创建：{stable_key} [{tag}] {reviewer}",
    "审阅备注更新：{stable_key} 状态 {from} → {to}",
    "审阅备注状态变更：段落 {stable_key} 改动，备注保留原文并标记待复核（{from} → RECHECK）",
    "审阅备注导出：审阅清单 {count} 条"
  ],
  Storage: [
    "本地数据迁移：schema v{from} → v{to}，兼容补全 {count} 条记录",
    "版本冲突：{collection}#{record_id} 基于 v{base} 的晚到保存被 v{current} 拒绝，改动已存入冲突草稿",
    "分块保存：{collection}#{record_id} 内容 {size} 字符，拆为 {chunks} 块写入",
    "分批保存：{collection} {total} 条记录拆为 {batches} 批提交，完成 {saved} 条"
  ]
} as const;

export type LogTemplateGroup = keyof typeof LOG_TEMPLATES;

export const renderLog = (group: LogTemplateGroup, index: number, params: Record<string, string | number> = {}): string => {
  const template = LOG_TEMPLATES[group][index] ?? "";
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
};
