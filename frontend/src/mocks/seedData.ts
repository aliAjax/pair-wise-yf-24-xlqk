/**
 * 本地种子数据：两版隐私政策（v1.0 / v2.0）及其段落、差异结果、审阅备注。
 * 文档故意不带 version 字段，用于演示"缺少版本号按兼容模式打开"。
 */
export const mockData = {
  policyDocument: [
    {
      id: 1,
      title: "隐私政策",
      version_label: "v1.0",
      raw_text: [
        "1. 总则",
        "本政策适用于本公司提供的全部产品与服务。",
        "",
        "2. 数据收集",
        "我们收集您在注册、登录、使用服务时主动提供的信息，包括姓名、手机号、邮箱。",
        "",
        "3. 信息共享",
        "我们不会向任何第三方出售您的个人信息。仅在以下情形下共享：获得您的明确同意；依据法律法规要求。",
        "",
        "4. 保存期限",
        "您的个人信息将在实现处理目的所必需的期限内保存，最长不超过 3 年。",
        "",
        "5. 用户权利",
        "您有权访问、更正、删除您的个人信息，有权撤回同意、注销账户。",
        "",
        "6. 联系方式",
        "如您对本政策有任何疑问，可通过 privacy@example.com 联系我们。"
      ].join("\n"),
      normalized_sections: JSON.stringify([
        { section_no: "1", heading: "总则" },
        { section_no: "2", heading: "数据收集" },
        { section_no: "3", heading: "信息共享" },
        { section_no: "4", heading: "保存期限" },
        { section_no: "5", heading: "用户权利" },
        { section_no: "6", heading: "联系方式" }
      ]),
      imported_at: "2026-01-15T09:00:00Z"
    },
    {
      id: 2,
      title: "隐私政策",
      version_label: "v2.0",
      raw_text: [
        "1. 总则",
        "本政策适用于本公司提供的全部产品与服务，包括网站、移动端应用及小程序。",
        "本政策的解释权归本公司所有。",
        "",
        "2. 数据收集",
        "我们收集您在注册、登录、使用服务时主动提供的信息，包括姓名、手机号、邮箱。",
        "我们还会收集设备信息与日志信息，用于保障服务安全与稳定运行。",
        "",
        "3. 信息共享",
        "我们不会向任何第三方出售您的个人信息。仅在以下情形下共享：获得您的明确同意；依据法律法规要求。",
        "我们会在本政策中公示受托处理者的名称、处理目的与保存期限。",
        "",
        "4. 保存期限",
        "您的个人信息将在实现处理目的所必需的期限内保存，最长不超过 3 年。",
        "",
        "5. 用户权利",
        "您有权访问、更正、删除您的个人信息，有权撤回同意、注销账户。",
        "您还有权将个人信息转移至其他服务提供者，即个人信息可携带权。",
        "",
        "7. 未成年人保护",
        "我们建议未成年人在监护人指导下使用服务。不满十四周岁的未成年人使用服务，应取得监护人同意。"
      ].join("\n"),
      normalized_sections: JSON.stringify([
        { section_no: "1", heading: "总则" },
        { section_no: "2", heading: "数据收集" },
        { section_no: "3", heading: "信息共享" },
        { section_no: "4", heading: "保存期限" },
        { section_no: "5", heading: "用户权利" },
        { section_no: "7", heading: "未成年人保护" }
      ]),
      imported_at: "2026-06-01T09:00:00Z"
    }
  ],
  policySection: [
    {
      id: 1,
      document_id: 1,
      section_no: "1",
      heading: "总则",
      content: "本政策适用于本公司提供的全部产品与服务。",
      category: "总则",
      risk_level: "LOW"
    },
    {
      id: 2,
      document_id: 1,
      section_no: "2",
      heading: "数据收集",
      content: "我们收集您在注册、登录、使用服务时主动提供的信息，包括姓名、手机号、邮箱。",
      category: "数据收集",
      risk_level: "HIGH"
    },
    {
      id: 3,
      document_id: 1,
      section_no: "3",
      heading: "信息共享",
      content:
        "我们不会向任何第三方出售您的个人信息。仅在以下情形下共享：获得您的明确同意；依据法律法规要求。",
      category: "信息共享",
      risk_level: "HIGH"
    },
    {
      id: 4,
      document_id: 1,
      section_no: "4",
      heading: "保存期限",
      content: "您的个人信息将在实现处理目的所必需的期限内保存，最长不超过 3 年。",
      category: "保存期限",
      risk_level: "MEDIUM"
    },
    {
      id: 5,
      document_id: 1,
      section_no: "5",
      heading: "用户权利",
      content: "您有权访问、更正、删除您的个人信息，有权撤回同意、注销账户。",
      category: "用户权利",
      risk_level: "MEDIUM"
    },
    {
      id: 6,
      document_id: 1,
      section_no: "6",
      heading: "联系方式",
      content: "如您对本政策有任何疑问，可通过 privacy@example.com 联系我们。",
      category: "联系方式",
      risk_level: "LOW"
    },
    {
      id: 7,
      document_id: 2,
      section_no: "1",
      heading: "总则",
      content:
        "本政策适用于本公司提供的全部产品与服务，包括网站、移动端应用及小程序。\n本政策的解释权归本公司所有。",
      category: "总则",
      risk_level: "LOW"
    },
    {
      id: 8,
      document_id: 2,
      section_no: "2",
      heading: "数据收集",
      content:
        "我们收集您在注册、登录、使用服务时主动提供的信息，包括姓名、手机号、邮箱。\n我们还会收集设备信息与日志信息，用于保障服务安全与稳定运行。",
      category: "数据收集",
      risk_level: "HIGH"
    },
    {
      id: 9,
      document_id: 2,
      section_no: "3",
      heading: "信息共享",
      content:
        "我们不会向任何第三方出售您的个人信息。仅在以下情形下共享：获得您的明确同意；依据法律法规要求。\n我们会在本政策中公示受托处理者的名称、处理目的与保存期限。",
      category: "信息共享",
      risk_level: "HIGH"
    },
    {
      id: 10,
      document_id: 2,
      section_no: "4",
      heading: "保存期限",
      content: "您的个人信息将在实现处理目的所必需的期限内保存，最长不超过 3 年。",
      category: "保存期限",
      risk_level: "MEDIUM"
    },
    {
      id: 11,
      document_id: 2,
      section_no: "5",
      heading: "用户权利",
      content:
        "您有权访问、更正、删除您的个人信息，有权撤回同意、注销账户。\n您还有权将个人信息转移至其他服务提供者，即个人信息可携带权。",
      category: "用户权利",
      risk_level: "MEDIUM"
    },
    {
      id: 12,
      document_id: 2,
      section_no: "7",
      heading: "未成年人保护",
      content:
        "我们建议未成年人在监护人指导下使用服务。不满十四周岁的未成年人使用服务，应取得监护人同意。",
      category: "未成年人保护",
      risk_level: "HIGH"
    }
  ],
  diffResult: [
    {
      id: 1,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 7,
      diff_type: "MODIFIED",
      summary: "条款内容变更：新增 2 行，删除 0 行",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 2,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 8,
      diff_type: "MODIFIED",
      summary: "条款内容变更：新增 2 行，删除 0 行",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 3,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 9,
      diff_type: "MODIFIED",
      summary: "条款内容变更：新增 2 行，删除 0 行",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 4,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 10,
      diff_type: "UNCHANGED",
      summary: "条款内容未发生变化",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 5,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 11,
      diff_type: "MODIFIED",
      summary: "条款内容变更：新增 2 行，删除 0 行",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 6,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 12,
      diff_type: "ADDED",
      summary: "新增条款，共 2 行",
      created_at: "2026-06-01T09:00:00Z"
    },
    {
      id: 7,
      old_document_id: 1,
      new_document_id: 2,
      section_id: 6,
      diff_type: "REMOVED",
      summary: "条款已删除，共 1 行",
      created_at: "2026-06-01T09:00:00Z"
    }
  ],
  reviewNote: [
    {
      id: 1,
      diff_result_id: 1,
      tag: "收集范围",
      comment: "总则修改后需重新评估适用范围是否覆盖小程序端",
      reviewer: "张三",
      status: "OPEN"
    },
    {
      id: 2,
      diff_result_id: 2,
      tag: "共享清单",
      comment: "新增受托处理者清单需法务复核",
      reviewer: "李四",
      status: "CONFIRMED"
    },
    {
      id: 3,
      diff_result_id: 3,
      tag: "保存期限",
      comment: "保存期限表述未变化，确认无影响",
      reviewer: "王五",
      status: "IGNORED"
    },
    {
      id: 4,
      diff_result_id: 5,
      tag: "权利响应",
      comment: "新增个人信息可携带权，需产品侧评估导出能力",
      reviewer: "张三",
      status: "OPEN"
    }
  ]
} as const;
