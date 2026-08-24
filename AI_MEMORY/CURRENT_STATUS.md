# CURRENT_STATUS.md — 图译工坊当前状态

> 最后更新：2026-08-24　维护：AI 项目管理员
> 本文档回答"现在做到哪里"。更新前先读 PROJECT_CONTEXT.md。

## 一句话状态

> **内测宣传版发布链路进行中**：阶段一（分主题提交+推送远端）✅ 已完成；阶段二（测试站部署）与阶段三（正式发布）**待用户批准**。并行主线为**支付生产上线收口**（收口方案 v2），P0 止血已收尾，P1 多项待执行、多项需用户批准。

## 里程碑时间线（含证据）

| 日期 | 里程碑 | 证据 |
| --- | --- | --- |
| 2026-07-06 | 项目启动，v0.1 三层架构（官网/工作台/运营台）奠基，RG-001~008 红线 | worklog Task 1-4 |
| 2026-07-12~18 | v0.2 上线（tygf-online-20260712.zip）；API 密钥泄露事件并整改 | tygf-v0.2-source更新文档.txt |
| 2026-07-15~16 | PS 执行修复；助手 3.3.6 | backups/ps-execution-fix_20260715 |
| 2026-07-22 | Illustrator 支持专项 | backups/illustrator-* |
| 2026-07-26~27 | 本地助手 3.3.8→3.3.10（多环境认证/能力握手/COM 诊断） | docs/变更记录-本地助手3.3.*.md |
| 2026-07-28~29 | 计费报表/用户中心 v2/钱包迁移 | backups/billing-* |
| 2026-07-30~08-04 | 运营后台增强（邀请批次/积分调账/活跃投影）；worklog 建档 | worklog Task 7 |
| 2026-08-05~10 | 实测问题期：OCR 带#、表格两行对单图层、0810 五语言 bug；staging 退役 | 遇到的问题/ |
| 2026-08-11~16 | v1.5 信任链引擎（readiness→attempt→ticket→execute） | docs/V1.5_* |
| 2026-08-17~18 | 学习系统（L1 质量门+排版指纹 v2）；积分 v3 / 整批计费 v3 方案 | docs/图译工坊_*_20260818.md |
| 2026-08-23 | **收口方案 v1**；v2 取代 v1，主线改为支付生产上线 | docs/收口方案 v1/v2 |
| 2026-08-24 | **跨窗口协作协议落地**（HANDOFF/plans/records） | docs/跨窗口AI协作协议_20260824.md |
| 2026-08-24 14:30 | **发布链路阶段一**：分主题提交 5 个 + 推送 origin（分支首次上远端） | docs/records/20260824_1430_提交推送阶段一.md |

## 进行中事项

1. **内测宣传版发布链路**（plans/20260824_1415_内测宣传版发布链路.md）
   - ✅ 阶段一：提交+推送（HEAD=99e5a88，已推 origin/codex/v1.5-trust-chain）
   - ⏳ 阶段二：合并 develop → 部署 test.tuyigf.com → 五项验证 + 27 smoke —— **待用户批准**
   - ⏳ 阶段三：main 合并 → 正式发布内测宣传版 —— **待用户批准**
2. **支付上线收口（收口方案 v2）**：P0 止血已收尾；P1 待执行（见下一步）
3. **悬置的用户追认**（HANDOFF.md:14-18）：BATCH_EXECUTION_READY 翻转、Owner 退款 API 口径 —— **待用户追认**

## 下一步建议顺序

按收口方案 v2 执行追踪表（:198-212）：

1. P1.1 runbook 升级 v1.1（修 S1 消耗前置门 + S4 消耗口径两处洞）—— 可立即做
2. P1.2 沙箱演练（须经 v1.1 消耗前置门）—— 依赖 1
3. P1.3 合并 + 部署测试站 —— **需用户批准**
4. P1.4 测试站全链回归（27 smoke + A2 用例 3 实弹 + 0810 真 PSD E2E）—— 依赖 3
5. P1.5 助手版本纪律（发布新版助手时执行）
6. P1.6 生产三步放（网站→助手灰度→支付开关）—— **每步需用户批准**
7. P2 C3 观测（上线 2 周后取数，默认不立项）

## 最近验证基线（2026-08-24 14:30 记录时）

- `tsc --noEmit` ✅　`eslint` ✅
- smoke-refund-close 13/13 ✅　smoke-alipay-payment ✅
- 发布安全态：支付相关 6 flag（creditPacks/manualPayment/alipay/alipayClose/alipayRefund/manualQrFallback）代码默认 + DB 覆盖全 false ✅
- 工作树干净（仅 2 个未跟踪调试脚本 `_cap.sql`/`_remote-check.cjs`）

## 关键路径速查

- 代码库（唯一活动目录）：`F:\工具开发\图译工坊内测版\worktrees\v1.5-trust-chain`（分支 `codex/v1.5-trust-chain`）
- 当前主线方案：`worktrees/v1.5-trust-chain/docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md`
- 接力入口/最新记录：`worktrees/v1.5-trust-chain/docs/HANDOFF.md` 与 `docs/records/`
- 记忆系统：`AI_MEMORY/`（本目录）+ `AGENTS.md`（根目录）

## 快速重启检查单

- **我在哪**：工作区根目录启动会话 → 读 `AGENTS.md`（记忆纪律生效）→ 读本文件。
- **目标是什么**：当前主线 = 内测宣传版发布（阶段二/三）+ 支付生产上线收口（P1）。
- **先做什么**：读 HANDOFF.md 最近记录 → `git log --oneline -10 && git status --short` 与"记录时状态"比对（HEAD=99e5a88、干净）→ 一致才出方案。
- **有哪些坑**：只改 v1.5-trust-chain；graphify 根图是空壳（勿依赖）；6 支付 flag 必须保持 false；BATCH_EXECUTION_READY 已翻 true（未追认）；禁止 reset/checkout/clean/restore/force-push；密钥禁止明文入文档。
- **怎么验证**：`npx tsc --noEmit`、`npm run lint`、`npm run test:contracts` / 对应 smoke 入口；部署走既有脚本，不手工替换文件。
