/**
 * 本地模拟数据（localStorage 首次写入时作为种子）。
 * 注意：种子中的旧字段样例同时用于“无版本号旧数据兼容打开”的单元验证，
 * 真实缺字段记录由 storageMigration 补默认值。
 */
export const mockData = {
  policyDocument: [
    {
      id: 1,
      title: "隐私政策（旧版）",
      version_label: "v2025.10",
      raw_text: "一、收集\n我们收集账号信息。\n二、共享\n不会向第三方共享。",
      normalized_sections: "一、收集|二、共享",
      imported_at: "2026-06-11T09:00:00Z",
      updated_at: "2026-06-11T09:00:00Z",
      revision: 1
    },
    {
      id: 2,
      title: "隐私政策（新版）",
      version_label: "v2026.09",
      raw_text: "一、收集\n我们收集账号信息与设备标识符。\n二、共享\n在获得同意后可向广告合作伙伴共享。\n三、保存期限\n日志保存 180 天。",
      normalized_sections: "一、收集|二、共享|三、保存期限",
      imported_at: "2026-09-20T09:00:00Z",
      updated_at: "2026-09-20T09:00:00Z",
      revision: 1
    }
  ],
  policySection: [
    {
      id: 1,
      document_id: 1,
      section_no: "一",
      heading: "收集",
      content: "我们收集账号信息。",
      category: "DATA_COLLECTION",
      risk_level: "LOW",
      updated_at: "2026-06-11T09:00:00Z",
      revision: 1
    },
    {
      id: 2,
      document_id: 1,
      section_no: "二",
      heading: "共享",
      content: "不会向第三方共享。",
      category: "DATA_SHARING",
      risk_level: "LOW",
      updated_at: "2026-06-11T09:00:00Z",
      revision: 1
    },
    {
      id: 3,
      document_id: 2,
      section_no: "一",
      heading: "收集",
      content: "我们收集账号信息与设备标识符。",
      category: "DATA_COLLECTION",
      risk_level: "HIGH",
      updated_at: "2026-09-20T09:00:00Z",
      revision: 1
    },
    {
      id: 4,
      document_id: 2,
      section_no: "二",
      heading: "共享",
      content: "在获得同意后可向广告合作伙伴共享。",
      category: "DATA_SHARING",
      risk_level: "CRITICAL",
      updated_at: "2026-09-20T09:00:00Z",
      revision: 1
    },
    {
      id: 5,
      document_id: 2,
      section_no: "三",
      heading: "保存期限",
      content: "日志保存 180 天。",
      category: "DATA_RETENTION",
      risk_level: "MEDIUM",
      updated_at: "2026-09-20T09:00:00Z",
      revision: 1
    }
  ],
  diffResult: [
    {
      id: 1,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 3,
      diff_type: "MODIFIED",
      summary: "收集范围新增“设备标识符”",
      created_at: "2026-09-20T09:05:00Z",
      stable_key: "doc:2:section:一:收集",
      source_section_content: "我们收集账号信息与设备标识符。",
      recomputed_at: "2026-09-20T09:05:00Z",
      revision: 1
    },
    {
      id: 2,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 4,
      diff_type: "MODIFIED",
      summary: "由“不共享”变为同意后向广告合作伙伴共享",
      created_at: "2026-09-20T09:05:00Z",
      stable_key: "doc:2:section:二:共享",
      source_section_content: "在获得同意后可向广告合作伙伴共享。",
      recomputed_at: "2026-09-20T09:05:00Z",
      revision: 1
    },
    {
      id: 3,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 5,
      diff_type: "ADDED",
      summary: "新增“保存期限”条款",
      created_at: "2026-09-20T09:05:00Z",
      stable_key: "doc:2:section:三:保存期限",
      source_section_content: "日志保存 180 天。",
      recomputed_at: "2026-09-20T09:05:00Z",
      revision: 1
    }
  ],
  reviewNote: [
    {
      id: 1,
      diff_result_id: 2,
      tag: "共享范围扩大",
      comment: "需补充广告合作伙伴清单与退出方式。",
      reviewer: "审阅人A",
      status: "OPEN",
      original_comment: "需补充广告合作伙伴清单与退出方式。",
      recheck_at: ""
    },
    {
      id: 2,
      diff_result_id: 1,
      tag: "设备信息",
      comment: "设备标识符属于个人信息，建议给出最小必要性说明。",
      reviewer: "审阅人B",
      status: "CONFIRMED",
      original_comment: "设备标识符属于个人信息，建议给出最小必要性说明。",
      recheck_at: ""
    }
  ]
} as const;
