# CURRENT_STATUS.md — 图译工坊当前状态

> 最后更新：2026-08-29　维护：AI 项目管理员
> 本文档回答"现在做到哪里"。更新前先读 PROJECT_CONTEXT.md。

## 一句话状态

> **智能检测失效修复已完成待部署**（T-0054，`3d5f137..0c569c7` 五 commit）：重复区块 CSV 的组合绑定伪阻塞与检测超时已根治（等价裁决+分批+孤儿锚定分段检测），每 commit tsc/lint/trust-chain 全绿；待用户用 JP-5294 CSV 人工验收后部署测试站。新 smoke 未接 package.json（待批准）。

> **当前阻断转移到 Photoshop 3.6.16 真实验收**：T-0052 已提交并部署测试站 `9709686`；latest=3.6.16。6 个历史 RUNNING 批次已只读核对，冻结共 240 分，暂无回执/结算/退回流水，本轮未改积分。

> **UX #25 已完成 `c3a09e5`**：执行确认页计费明细默认折叠；票据/授权错误保留真实 `message/code`，“本地助手未运行”仅用于 ping 离线。

> **测试站已更新至 `43202f1`（2026-08-27）**：助手 3.6.13 修复中文目录 picker 输出乱码，站内下载入口保留 access key；本机 49152 已覆盖安装，latest API 和安装包合同通过。无 key 的 `/download` 仍受保护，是否公开说明页待用户批准。生产站与 `main` 未动。

## 进行中事项

1. **批次完成率一致性方案已实施完成**（P0-P4）：投影模块 + 单一投影接线 + 冻结 token + 合成终态 + fail-closed 门禁 + expectedRowTokens 完整接线 + 双指标展示 + 报告增强。tsc + 全部 smoke 绿。待测试站真实批次验证后用户决定是否翻闸。
2. **支付上线收口（收口方案 v2）**：P1.3-P1.6 待执行（多项需用户批准）
3. **悬置的用户追认**：BATCH_EXECUTION_READY=true 翻转（19452fc）、Owner 退款 API（2508989）
4. **A5 用户亲自**：协议定稿 + 支付宝资质确认

## 下一步建议顺序

1. 在测试站重跑真实批次验证 P0-P4（expectedRowTokens 冻结 + 合成终态 + 双指标展示 + 报告守恒摘要）
2. 用户决定是否翻闸 BATCH_EXECUTION_READY=true
3. A5 协议定稿 + 支付宝资质确认 —— 用户亲自
4. P1.3-P1.6 生产上线流程 —— 每步需用户批准

## 最近验证基线（2026-08-26）

- 2026-08-29 T-0052 发布：功能提交 `af5abb6`，develop/测试候选 `9709686`；完整 build、发布预检、服务器构建、Prisma 同步、源站 200、PM2 双进程、latest=3.6.16、安装包 200/12634364/SHA 一致。六个悬挂批次只读审计为 6×40=240 reserved，终态积分流水 0。

- 2026-08-27 测试机中文路径/下载入口：picker UTF-8/TopMost smoke、server 语法、v15 runner、tsc、lint（0 error/2 既有 warning）、release consistency、发布身份与真实安装通过；测试站 `43202f1` 的 3001 延迟复验 200，latest API=3.6.13，安装包=200/12632170/SHA 一致。

- 2026-08-27 文件框坐标锚定：`test:select-file-topmost`、v15 runner、release consistency、server 语法、`npx tsc --noEmit`、`npm run lint`（0 error / 2 既有 warning）通过；测试站 `c6902d8` 的 3001 延迟复验 200，latest API=3.6.12，安装包下载=200/12630667。

- 2026-08-27 ISSUES #25：`smoke-local-assistant-errors` 通过；`npx tsc --noEmit` 通过；`npm run lint` 0 error / 2 既有 TanStack warning。

- 2026-08-26 P0-P4：`npx tsc --noEmit` 通过；`npm run lint` 0 error / 2 既有 warning；batch-billing-v3 / batch-settlement-idempotency / v3-batch-flow / batch-transparency / batch-row-contract / batch-billing-routes 全部 smoke 绿。report-renderer.js 语法验证通过。

- tsc ✅ eslint ✅ build ✅
- test:contracts(15) test:trust-chain(19) test:admin-security test:auth(70) test:batch-billing-v3 test:v3-batch-flow test:survey-pricing(4) test:user-report-fixtures(4) workbench-flow user-profile-lifecycle 全绿
- 测试站 cadf656 冒烟全 200；新 schema 列全部 EXISTS
- 2026-08-25 本轮：`npx tsc --noEmit` ✅；`npm run lint` ✅（仅既有 2 条 TanStack Table warning）；`test:trust-chain`、`test:v3-batch-flow`、`test:batch-billing-routes` ✅；`npm run build` ✅；`node --check`（助手相关文件）✅；`git diff --check` ✅。`test:batch-billing-v3` 与 `test:batch-settlement-idempotency` 本轮在隔离库 `prisma db push` 阶段无输出挂起，已中止，未得到业务断言结果；`graphify` 不在 PATH，按 AGENTS 警示未依赖空壳图。
- 2026-08-25 本轮补充：`npm run build` ✅（standalone boundary 与 assistant contract 均通过）；v1.5 runner smoke 覆盖自定义输出名、报告失败保留设计文件和报告重建；报告失败不重新执行 Photoshop 或重复冻结积分。
- P6 现场核验：既有 IT 单语言真实写入已完成，产物 `改语言__IT.psd/.jpg`，回执 `SUCCEEDED` 且 22/22 重开回读；本轮已修复报告合同，但尚未在当前激活实例重跑 Photoshop。新任务报告名为 `图译工坊执行报告.html`，7 语言数据已对齐，批量连跑仍 disabled，未做批量报价/执行/结算。

## 关键路径速查

- 唯一活动目录：worktrees/v1.5-trust-chain（分支 codex/v1.5-trust-chain）
- 主线方案：docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md
- 批次闭环方案：docs/图译工坊_本地多语言批次执行闭环解决方案_20260824.md
- 批次 v3 对抗式执行文档：docs/图译工坊_批次v3行身份证据与结算闭环_对抗式执行文档_20260825.md
- 第 4 步与 HTML 报告恢复文档：docs/图译工坊_V1.5第4步与HTML报告样式恢复_对抗式执行文档_20260825.md
- 中文报告与多语言解锁方案：docs/图译工坊_V1.5多语言解锁与中文执行报告_对抗式方案_20260825.md
- 接力入口：docs/HANDOFF.md 与 docs/records/
- 记忆系统：AI_MEMORY/

## 快速重启检查单

- 读 AGENTS.md → 本文件 → HANDOFF.md 最近记录 → git log/status 比对
- 坑：只改 v1.5-trust-chain；graphify 空壳勿依赖；6 支付 flag 保持 false；BATCH_EXECUTION_READY=true 待追认；禁止 reset/checkout/clean/restore/force-push；密钥禁明文；测试站需 ?key=
