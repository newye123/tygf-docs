# TASK_LOG.md — 任务日志（每次任务一条，新记录置顶）

> 最后更新：2026-08-24
> 字段：任务目标 / 执行方案 / 修改文件 / 修改原因 / 测试结果 / 遗留问题。
> 历史条目为首次盘点时从既有记录（worklog/records/HANDOFF/备份命名）继承登记；日期来自证据推断的标"约"。

---

## T-0001 【2026-08-24】建立 AI 长期记忆系统（首次盘点）

- **任务目标**：创建 AI_MEMORY/ 五文件 + 更新 AGENTS.md，让新会话零上下文接手项目
- **执行方案**：全量扫描工作区（git log/status、worktrees、docs、worklog、归档），以实测为准填写
- **修改文件**：`AI_MEMORY/PROJECT_CONTEXT.md`、`AI_MEMORY/CURRENT_STATUS.md`、`AI_MEMORY/TASK_LOG.md`、`AI_MEMORY/CHANGELOG.md`、`AI_MEMORY/ISSUES.md`、`AGENTS.md`（根目录）
- **修改原因**：建立项目长期记忆系统（用户指令）
- **测试结果**：文档类变更，无代码验证；提交后 git 状态复核
- **遗留问题**：详见 ISSUES.md（graphify 空壳、8.1.psd 译文列空、待用户追认项等）

## T-0002 【2026-08-24 14:30】内测宣传版发布链路·阶段一（提交+推送）

- **任务目标**：按 plans/20260824_1415_内测宣传版发布链路.md 步骤 1-3：分主题提交 + 推送
- **执行方案**：对账修正后重组为 5 个提交，推送 origin/codex/v1.5-trust-chain
- **修改文件**：5 个提交 —— 2508989（退款关闭系统）、34dee7e（发布安全态 flags+拦截补漏）、80d29d8（协议文档）、19452fc（BATCH_EXECUTION_READY=true）、0c7862f（并行窗口 12 文件同步）
- **修改原因**：分支从未推送，单机风险；发布链路前置
- **测试结果**：tsc ✅ eslint ✅ smoke-refund-close 13/13 ✅ smoke-alipay-payment ✅；推送成功（19db25b..0c7862f → origin）
- **遗留问题**：BATCH_EXECUTION_READY 翻转与 Owner 退款 API 两项**待用户追认**；2 个调试脚本 `_cap.sql`/`_remote-check.cjs` 未提交
- 证据：`docs/records/20260824_1430_提交推送阶段一.md`

## T-0003 【2026-08-24 13:32】跨窗口 AI 协作协议落地

- **任务目标**：让多个 AI 窗口并行工作不冲突
- **执行方案**：建立 HANDOFF.md 接力入口 + plans/ 方案目录 + records/ 执行记录目录 + 协议文档
- **修改文件**：`docs/HANDOFF.md`、`docs/图译工坊_跨窗口AI协作协议_方案_20260824.md`、`docs/plans/20260824_1415_内测宣传版发布链路.md`、`docs/records/20260824_1430_提交推送阶段一.md`
- **修改原因**：多窗口并行导致工作树互相覆盖（0c7862f 即代提交的并行窗口改动）
- **测试结果**：文档落地，提交 80d29d8
- **遗留问题**：plans/_模板.md 待建

## T-0004 【2026-08-23 晚】收口方案 v2：支付上线主线交接文档

- **任务目标**：把主线从 C3（助手批量协议）切换为支付生产上线收口
- **执行方案**：v1 的已完成项冻结不再重复，P0 止血 + P1 支付上线 + P2 C3 数据驱动决策框架
- **修改文件**：`docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md`（取代 v1 排序）
- **修改原因**：c742afd 逐语言连续执行已诚实解锁多语言体验，C3 从"守恒必需"降级为"计费优化项"
- **测试结果**：文档（A4 计费权威性验证、退款 runbook v1.0 等随 cb0cf01 入库）
- **遗留问题**：P1.1-P1.6 全部待执行；4 个用户决策点悬置

## T-0005 【2026-08-23】支付/退款功能实现（并行窗口成果，部分入库）

- **任务目标**：订单关闭/全额退款/退款查询 + 发布安全态 flags
- **执行方案**：Owner-only 手动退款（审计+幂等撤销）+ 6 个支付 flag 代码默认 false + 服务端 409 拦截补漏
- **修改文件**：payments 路由/服务 + `src/config/featureFlags.ts` + 13 场景 smoke
- **修改原因**：支付上线前的资金安全与差错处理能力
- **测试结果**：smoke-refund-close 13/13 ✅；tsc/eslint ✅
- **遗留问题**：与 v2 红线"不做自动退款"存在口径偏差，**待用户追认**

## T-0006 【2026-08-18~23】内测积分 v3 / 整批计费 v3 / 积分包闭环

- **任务目标**：积分体系 v3 主链修复 + 整批计费 + 人工积分包
- **执行方案**：BillingQuote/ExecutionBatch/BatchSettlement 等模型与 v3 协议（docs/图译工坊_内测积分_*_20260818.md 三方案）
- **修改文件**：billing/credits/workbench 相关（commit e7f0fcb 等）
- **修改原因**：批量执行多语言任务的计费结算正确性
- **测试结果**：v3 batch smoke 全绿（e7f0fcb/c742afd 贯通证据）
- **遗留问题**：C3 立项与否留给用户（默认不立项，数据驱动）

## T-0007 【2026-08-17~18】学习系统与排版指纹 v2

- **任务目标**：PSD 扫描后学习系统（L1 质量门 + 用户排版指纹 v2）
- **执行方案**：隐形采集排版特征（本地零落盘、不含正文），LearningTypography* 模型，owner-only 管控
- **修改文件**：learning/ 模块、prisma schema、`src/app/admin` 管控端点
- **修改原因**：worklog Task 9 用户拍板的隐性学习决策
- **测试结果**：learning smoke phase0-4 + typography ✅
- **遗留问题**：平台上限调整后需观察（79d348a）

## T-0008 【2026-08-15~16】v1.5 信任链引擎

- **任务目标**：readiness → attempt → ticket → execute 全链 + 交付三件套
- **执行方案**：local-assistant v15-runner + 服务端 ExecutionTicket/Attempt 模型 + report-outbox
- **修改文件**：`download/local-assistant/*`、`src/lib/trust-chain/`、`src/components/workbench/`
- **修改原因**：执行过程可审计、可恢复、防篡改（统一信任链）
- **测试结果**：test:trust-chain 全链 smoke ✅；V1.5_统一信任链_开发验收记录.md
- **遗留问题**：0810 真 PSD E2E 未做（P1.4）

## T-0009 【2026-08-10】0810 五语言匹配 bug 闭环（逻辑级）

- **任务目标**：五种语言测试中组合绑定/匹配错误
- **执行方案**：V15_BOUND_COMBINED 断言 + 真实 CSV 入 fixture + 逐语言诚实连跑（c742afd）
- **修改文件**：assistant 核心生成物 + fixtures（a83cb2b）
- **修改原因**：真实用户素材回归发现匹配错误
- **测试结果**：逻辑级断言 ✅（真实素材 fixture 入库）
- **遗留问题**：真 PSD + 真 Photoshop E2E 归入 P1.4（素材在 `遇到的问题/脚本跑出来的问题/0810_五种语言测试__20260810_082418117/`）

## T-0010 【2026-08-13】billing/助手加固 batch（约）

- **任务目标**：计费管理与助手稳定性加固
- **执行方案**：admin-audit 审计日志、billing-admin 面板、assistant-hardening
- **修改文件**：admin/billing/assistant 相关
- **测试结果**：相关 smoke ✅
- **遗留问题**：无

## T-0011 【2026-07-26~27】本地助手 3.3.8→3.3.10 迭代（约）

- **任务目标**：多环境认证、版本升级、能力握手、COM 诊断
- **修改文件**：local-assistant（变更记录 3.3.8/3.3.9/3.3.10 三份文档）
- **修改原因**：本地助手与网站双环境授权一致性
- **测试结果**：各版本验收通过
- **遗留问题**：当前对外发布版本待确认（见 ISSUES #10）

## T-0012 【2026-07-28~29】计费/用户中心 v2/钱包迁移（约）

- **任务目标**：用户中心 v2 + 钱包迁移 + 计费报表
- **执行方案**：CreditAccount/CreditLedger 模型落地
- **测试结果**：billing smoke ✅

## T-0013 【2026-07-22】Illustrator 支持专项（约）

- **任务目标**：Illustrator 文件支持 + 2019 兼容性
- **执行方案**：tmp/illustrator-smoke-* 冒烟 + 助手 beta 打包
- **测试结果**：冒烟通过（待确认细节）

## T-0014 【2026-07-15~16】PS 执行修复 + 3.3.6（约）

- **任务目标**：Photoshop 执行链路修复
- **执行方案**：ps-execution-fix + 3.3.6 推送前备份
- **测试结果**：通过（待确认细节）

## T-0015 【2026-07-12~18】v0.2 上线 + 密钥泄露整改（约）

- **任务目标**：v0.2 部署上线（tygf-online-20260712.zip）
- **执行方案**：服务器覆盖部署（不覆盖 .env/DB）+ 验收清单
- **测试结果**：验收项通过；发现 DeepSeek/PaddleOCR 明文密钥泄露进文档 → 要求吊销重生成
- **遗留问题**：密钥整改完成度**待确认**（ISSUES #7）

## T-0016 【2026-07-06】项目启动 v0.1 三层架构奠基（约）

- **任务目标**：官网（Canvas A）/ 工作台（Canvas B）/ 运营台（Canvas C）三层 + 12 个 API 路由 + 8 个工作台组件
- **执行方案**：Prisma schema/lib 基建 + agent-browser 全链路端到端验证
- **测试结果**：端到端验证通过，"项目状态：可交付"（worklog Task 1-4）
- **遗留问题**：RG-001~008 红线后续逐步放开