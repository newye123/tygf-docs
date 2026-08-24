# PROJECT_CONTEXT.md — 图译工坊项目背景

> 最后更新：2026-08-24　维护：AI 项目管理员
> 本文档回答"项目是什么"。所有结论均有文件证据，未证实的标 `待确认`。

## 1. 项目背景与定位

**图译工坊（tygf）** 是一个 **PSD 设计稿图片翻译工具（内测版）**：

- 用户提供含文字的 PSD 设计稿（多为多语言营销图），选择目标语言；
- 本地助手（`download/local-assistant/`）通过 Windows **Photoshop COM** 逐图层读取文字；
- 云端 **AI 翻译（DeepSeek）** 产出译文；
- 写回 PSD 文字图层 → 输出交付三件套 **`psd` + `jpg` + `report.html`**；
- 支持**逐语言连续执行**（诚实连跑，无静默降级），每个语言独立计费与结算。

产品形态是 **Web 网站（Next.js）+ 本地 Windows 助手（Node 引擎，打包 exe 安装包）+ 运营后台** 三端协同。

当前处于**内测宣传版发布收口阶段**，主线是**支付生产上线收口**（见 CURRENT_STATUS）。

## 2. 工作区目录结构（重要：多 worktree 架构）

本机工作区根目录 `F:\工具开发\图译工坊内测版` 是**容器 git 仓库（当前无任何提交）**，只用于放记忆系统与导航指针；真实代码在各 **git worktree** 中。

> 权威地图：`worktrees/v1.5-trust-chain/docs/WORKSPACE-MAP.md`（2026-08-23 更新，唯一权威）

| 目录 | 分支 | 用途 | 状态 |
| --- | --- | --- | --- |
| `worktrees/v1.5-trust-chain/` | `codex/v1.5-trust-chain` | **当前唯一活动目录**（日常改代码/测试/打包） | 🟢 活动 |
| `worktrees/develop/` | `develop` | 测试站候选（test.tuyigf.com 部署源） | 🟡 候选 |
| `worktrees/production/` | `main` | 生产站，收口前不动 | 🔒 冻结 |
| `worktrees/recovery-baseline/` | `chore/recovery-baseline` | 8/11 冻结恢复基线 | 🔒 只读 |
| `worktrees/psd-preflight-assistant/` | `codex/psd-preflight-assistant` | PSD 预检助手专项 | ⏸ 停用 |
| `tygf-v0.1-source/` | `feature/email-auth` | v0.1 历史工作目录（软著素材来源） | 🔒 历史 |
| `archives/ backups/ safety-snapshots/ releases/ release-staging/` | — | 历史归档/备份/发布物 | 🔒 不开发 |

**对抗性检查**（来自 WORKSPACE-MAP）：看到多个项目文件夹先看 `.git`；只有活动 worktree 才允许改动；版本以 Git 提交/标签/发布包名称为准，不凭文件夹名判断新旧。

## 3. 技术栈（以代码实测为准）

来源：`worktrees/develop/package.json`（v1.5-trust-chain 同源，0c7862f 仅同步 12 文件）

- **框架**：Next.js `^16.3.0`（⚠️ 与训练数据有 breaking changes，写码前先读 `node_modules/next/dist/docs/`，见 develop 内 AGENTS.md 提示）+ React `^19.0.0`
- **语言/样式**：TypeScript `^5`、Tailwind CSS `^4`（`@tailwindcss/postcss`）、shadcn/ui（Radix 系列组件）
- **数据层**：Prisma `^6.11.1` + SQLite（`db/custom.db`，本机隔离运行库，不入版本）
- **状态/表单**：zustand `^5`、react-hook-form、@tanstack/react-query + react-table、zod `^4`
- **图表/UI**：recharts、framer-motion、next-intl、vaul、sonner、dnd-kit
- **支付**：`alipay-sdk 4.14.0`（电脑网站支付）+ xlsx（SheetJS，套餐/表格）
- **本地助手**：Node 引擎（`download/local-assistant/` 下 `server.js`/`v15-runner.js`/`attempt-runtime.js` 等），打包为 `tygf-engine-setup-*.exe`
- **工具链脚本**：Node `--experimental-strip-types` 直跑 `.mjs` 冒烟测试；`bun.lock` + `package-lock.json` 并存

### 数据模型（Prisma，57 个 model）

`prisma/schema.prisma`，覆盖：认证（EmailCredential/LoginSession/RateLimitBucket 等）、邀请码（InviteCode/Batch/Delivery/Activation）、积分（CreditAccount/CreditLedger/CreditReservation/PlatformCreditCounter）、计费（BillingQuote/JobBillingResult/BillingChallenge/ExecutionTicketNonce）、支付（CreditPurchaseOrder/PaymentTransaction/**PaymentRefund**/PaymentEvent）、执行（ExecutionAttempt/ExecutionBatch/ExecutionLanguageJob/BatchSettlement 等）、学习（LearningTypographyLayer/Run/Consent/BrandScope 等）、运营（BetaUser/AdminUser/AdminAuditLog/UserActivityProjection）。

## 4. 核心架构（含关键 file:line）

路径前缀 = `worktrees/v1.5-trust-chain/`（当前活动目录），除非注明。

- **三层画布**：官网（`src/app/page.tsx` + 板块）+ 本地工作台（`src/components/workbench/`）+ 运营台（`src/app/admin/`）。
- **模块开关集中配置**：`src/config/featureFlags.ts:4-52` —— 支付/套餐/积分/公开注册/OCR/团队等**默认全关**；内测宣传版安全态要求 6 个支付 flag 全 `false`（:24-33）。
- **V1.5 信任链执行路径**：readiness → attempt → ticket → execute；`workbenchV15ExecutionEnabled` 默认开（featureFlags.ts:15）。
- **批量执行组合闸（纵深防御）**：运营台开关 `batchBillingV3Enabled` 与代码级硬闸 `BATCH_EXECUTION_READY` 同时满足才开（`src/components/workbench/execute-step.tsx:221-223`）。⚠️ 硬闸当前 = `true`（execute-step.tsx:85，19452fc 翻转，**待用户追认**，可整体 revert）。
- **本地助手 v1.5 引擎**：`download/local-assistant/` —— v15-runner.js（编排）、readiness.js（就绪）、attempt-runtime.js（单次执行）、execution-manifest.js / execution-journal.js / working-copy.js（清单与恢复）、report-outbox.js（交付报告）、receipts.js（回执隐私）、learning-evidence.js（排版特征采集）。
- **版本纪律**：助手版本比对在 `src/lib/local-assistant-version.ts`；发布标识校验 `scripts/check-release-identity.cjs`；发布身份需与 `/api/local-assistant/latest` 完全一致（版本/URL/大小/SHA-256）。

### 治理规则 / 铁律摘要（红线，违反即停）

权威来源：`docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md:15-20`，全程有效：

1. 不得引入任何静默降级；未完成能力必须明确报错；
2. 不得从 develop 直接构建生产站；不得静默替换下载 URL；
3. `BATCH_EXECUTION_READY` 保持 `false`（当前已翻 true，待追认）；
4. 助手行为变更的发布必须走版本纪律；
5. 生产支付开放必须满足开放 checklist，缺一不可。

历史红线（worklog Task 1-4）：RG-001~008 —— CSV 不上传、报告路径脱敏、无支付/积分/公开注册等（v0.1 时代，后续已部分放开）。

## 5. 关键文档索引

| 文档 | 位置 | 用途 |
| --- | --- | --- |
| 工作区地图 | `worktrees/v1.5-trust-chain/docs/WORKSPACE-MAP.md` | 目录/发布/归档权威 |
| 接力入口 | `worktrees/v1.5-trust-chain/docs/HANDOFF.md` | **接手 AI 第一步必读** |
| 收口方案 v2（当前主线） | `docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md` | 支付上线 P0/P1/P2 全部任务 |
| 收口方案 v1 | `docs/图译工坊_内测收口_资金与交付双线_完整调整方案_20260823.md` | 历史（被 v2 取代排序） |
| 跨窗口协作协议 | `docs/图译工坊_跨窗口AI协作协议_方案_20260824.md` | HANDOFF/方案/记录纪律 |
| 退款 runbook | `docs/退款与差错处理runbook_20260823.md` | S1-S4 退款流程（待升 v1.1） |
| 执行记录 | `docs/records/` | 每次任务证据 |
| 方案存档 | `docs/plans/` | 执行前方案 |
| 工作日志（历史） | `worktrees/develop/worklog.md` | Task 1-10 历史 |

## 6. 环境注意事项

- **启动会话位置**：一律从工作区根目录 `F:\工具开发\图译工坊内测版` 启动，保证 `AGENTS.md`（记忆系统入口）生效。
- **只允许改的活动目录**：`worktrees/v1.5-trust-chain/`；其余 worktree 改动需明确指示。
- **数据库**：`db/custom.db`（每棵 worktree 各自隔离）；`.env`/`db/`/报告/用户素材**不复制进发布包**。
- **密钥纪律**：DeepSeek / PaddleOCR 密钥只放环境变量或后台 `ApiCredential`，**禁止明文进文档**（历史曾泄露，见 ISSUES #7）。
- **Next.js 16 差异**：写码前读 `node_modules/next/dist/docs/`（AGENTS.md 提示）。
- **禁止命令**：`git reset --hard`、`git checkout -- .`、`git clean -fd`、`git restore .`、force push（收口方案 v2 第 0 节）。
- **graphify 注意**：根目录 `graphify-out/` 是 2026-07-06 的**空壳图**（只索引了 graphify 工具自身，未覆盖代码库），`AGENTS.md` 中 graphify 规则对本代码库**暂不适用**（见 ISSUES #1）。
- **当前存在未跟踪调试脚本**：`_cap.sql`、`_remote-check.cjs`（v1.5-trust-chain 工作树内，非交付物）。
