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
frontend/src/api, stores, types, constants, constructors, components/common, hooks, pages, router, utils, services, config, mocks
```

- `services/`：段落保存联动、差异重算（diffRecomputeService）、备注与冲突草稿业务规则。
- `utils/localRepository.ts`：localStorage 原子提交、乐观版本判断、分批/分块、跨标签页事件。

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
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors（含 createRecheckReviewNote）、logTemplates、errorMessages、筛选器（ReviewPage 状态 chips）、展示组件（StatusBadge/ReviewChecklist）均有引用。
  - `RECHECK`（待复核）：段落改动重算后由 `services/diffRecomputeService.ts` 自动写入；文案在 constants/ReviewStatus、utils/formatters 的 `formatReviewStatus`，样式在 styles.css 的 `status-recheck`。

## 版本与并发约定

- 数据版本号：PolicyDocument / PolicySection / DiffResult 均带 `revision`；ReviewNote 带 `original_comment`、`recheck_at`。
- 段落保存联动：段落一改即按新内容重算该文档差异（DiffResult 按 `stable_key` 原位更新并递增 revision），受影响的旧审阅备注保留原文、状态标为 `RECHECK` 待人工复核。
- 多标签页保存：编辑开始时锚定文档 `baseRevision`，保存时与磁盘最新版本比较；晚到保存收到 `VERSION_CONFLICT` 提示，改动自动存入“冲突草稿”（localStorage `policy-diff:conflictDrafts`），不覆盖先保存一方的数据；可在审阅页“采纳我的改动/放弃”。
- 超长内容：单条记录超过 `CHUNK_CHAR_THRESHOLD` 自动分块写入（主键只存占位标记）；多记录导入按 `BATCH_SIZE` 分批提交，每批重新读盘并让步事件循环，配置见 `frontend/src/config/storage.ts`。
- 旧数据兼容：缺少 schemaVersion/revision 的本地数据首次打开时由 `utils/storageMigration.ts` 补默认值（revision=1、备注原文兜底等），schemaVersion 升级到 2 后回写。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
