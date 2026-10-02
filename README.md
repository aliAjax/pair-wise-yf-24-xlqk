# 隐私政策差异对比器

纯前端隐私政策版本对比与风险标注工具，用户粘贴两版文本后查看条款差异、风险标签和审阅清单，数据存 localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20112>



## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`



## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + localStorage |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/
├── api/                  # 本地模拟 API，按模型分文件封装 async API
│   ├── localDb.ts        # 种子数据引导 + 模拟延迟
│   ├── PolicyDocument.ts # 文档保存（版本冲突检测、强制覆盖、另存新文档）
│   ├── PolicySection.ts  # 段落保存（分批写入）
│   ├── DiffResult.ts     # 差异重算（按 section_no 匹配、LCS 行级差异）
│   └── ReviewNote.ts     # 备注待复核翻转
├── stores/               # Pinia 独立 store
├── types/                # 数据模型类型定义
├── constants/            # 枚举、日志模板、错误信息、状态文案
├── constructors/         # 默认对象、表单对象、导入数据构造器
├── components/common/    # ImportPanel / DiffViewer / RiskTag / ReviewChecklist / SectionCard 等
├── hooks/                # useTextDiff / usePolicyParser / useLocalStorageState
├── pages/                # 文档导入 / 版本对比 / 风险标注 / 审阅清单
├── router/               # 路由配置
├── utils/                # storage（分批存储）、router（hash 路由）、formatters
└── mocks/                # 种子数据（两版隐私政策 + 差异 + 备注）
```

## 核心业务规则

### 段落改动联动重算

- 条款段落、差异结果、审阅备注三者连动：在「版本对比」页编辑段落内容后，按新内容重算该文档对的全部差异（`ADDED / REMOVED / MODIFIED / UNCHANGED`）。
- 差异行 id 尽量保持不变，审阅备注继续挂在原差异行上。
- 受影响差异（类型或摘要变化、或新建）上的备注，**保留原文（tag / comment / reviewer）并自动翻转为 `PENDING_REVIEW`（待复核）**，提示审阅人重新确认。

### 保存版本冲突检测（多标签页）

- 每个文档带 `version` 乐观锁版本号，首次保存为 v1，之后每次成功保存 +1。
- 保存时若存储中的版本高于打开时的版本，返回冲突：**弹出冲突提示，且用户改动原样保留不丢失**。
- 冲突处理三选一：**强制覆盖**（版本号压过对方）、**另存为新文档**（保留对方版本）、**取消**（回到编辑状态）。

### 内容超长分批保存

- 集合序列化后超过分片上限（`utils/storage.ts` 中 `CHUNK_CHAR_LIMIT`，约 4 万字符）时，自动切片写入 `key:batch:0..n` 并写 `key:manifest`，读取时按顺序拼回。
- 触发 localStorage 配额错误时自动减半分片重试；导入长文本时按批写入。

### 旧版数据兼容打开

- 缺少 `version` 字段的历史数据（如早期种子数据）打开时按兼容模式处理：版本号视为 0，文档列表展示「旧版数据（无版本号）」标记。
- 兼容模式文档首次保存时升级为 v1；存储读取也兼容旧版本 key 前缀。

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`


## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-policy-diff}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- DiffType: constants/DiffType、types/DiffType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PrivacyRiskLevel: constants/PrivacyRiskLevel、types/PrivacyRiskLevel、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。`PENDING_REVIEW`（待复核）为段落改动后自动翻转的状态，新增该枚举值时同步触达了常量、类型、日志模板、错误消息、格式化、列表筛选与详情展示。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
