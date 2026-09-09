# CURRENT_STATUS.md — 图译工坊当前状态

> 最后更新：2026-09-06　维护：AI 项目管理员
> 本文档回答"现在做到哪里"。更新前先读 PROJECT_CONTEXT.md。

## 一句话状态

> **T-0069 执行中（2026-09-09，本窗口全权）**：Batch 执行与积分闭环修复。分支 `codex/batch-execution-closure-20260909`（P0 止血/P1 助手身份门/P2 跨批 single-winner/P3 两阶段本地接受 全部完成，契约测试全绿）。**已完成**：DISPATCHING→LOCAL_ACCEPTED→PHOTOSHOP_RUNNING 状态机（journal 落盘直报 acceptance、心跳单调 seq+checkpoint 推进、DISPATCHING 回执拒收、浏览器超时不再判失败）。Owner 决策：**P7 不批**。下一步：P4 收尾（STALLED 读取判定+状态展示）→P5 receipt outbox→P6→P8 裁决工具→P9→助手 3.6.24 合并发布→P10 部署（执行闸 OFF 到 Gate）。
> **待批**：官网文案直改 B 方案（`docs/records/20260908_官网文案直改_B方案_执行方案.md`，Content Studio V1 上加前端直改层，估 4 工作日）。
> **未破案**：12 语言批次卡死——云端分类已完成（卡死语言跨 ES/NL/SV/DE，非 DE 特有；根因=执行链机制：PS 挂起+助手内存态+回执断链），本方案 P3/P4/P5 即根因修复；等 Owner 测试机 `.execution` 取证补充现场细节。

> **T-0065 方案待批（2026-09-06 深夜）**：供应商双语 CSV 跑不通根因=修复算子单一+segmentSpan=6<实际段长+缺译/空原文无排除出路；解法=Gale-Church DP 对齐器+五算子 TypedRepairPlan+EXCLUDED 四层同步。文档 `docs/records/20260906_bilingual_align_qa_plan.md`（100 向量）。~~待 Owner 批准~~ → C1 已执行。

> **T-0064 C1 已落地（2026-09-06 晚二）**：Account-First 云端身份解析已部署测试站 `647184a`——换浏览器/清缓存不再要求重输邀请码（登录会话 fallback + 助手 token 权威化 + 客户端规范 ID 采纳）。验证全绿；无会话 403 fail-closed 实测。**待 Owner 验收**：换浏览器登录→工作台应零输码直达。排队：C2 助手自持持久 ID、C3 登录自动激活新机、P1 每日积分。develop ahead 29 未推送（push 需 Owner 授权）。

> **T-0063 收口（2026-09-06 晚）**：P0-A 修复已部署（云端缺 digest → `ATTEMPT_EVIDENCE_REQUIRED` + "请升级助手"文案，`348de03`/`314df9d`）；68 积分守恒 **PASS**（4 次 −68/+68 全配对 user_cancelled，余额 888，零残留）；P0-B 定位=服务端 60s 超时从未触发、499 为客户端断开，已加 abort 传播+耗时提示。待 Owner：新电脑重装 3.6.21 助手；ISSUES #34 生产野进程 / #35 清理 cron 处置授权。

> **TEST_AUTH_MAIL_GOLDEN_PASS 达成（2026-09-06 凌晨）**：邮件登录链路全闭环（T-0061）——注册验证邮件真实送达、点链接验证成功、登录成功、忘记密码+新密码重登成功（Owner 实测）。四层根因修复：HtmlBody 参数不存在（模板模式重写 b6f98e0）、区域 ap-singapore+intl 端点（7c3bd03）、模板被拒=变量携完整链接→固定域名版过审（71676/71677，Status=0）、双斜杠链接（8400b65）。key 门真身=源站 nginx，已豁免 /auth/verify+/auth/reset（其余 403 保留）。测试站现部署 8400b65。附带：Owner 走完 Batch-1 Web-only 人工验收（执行被 Kill Switch 正确拦截）。遗留：Yt 策略还原、废密钥禁用、BetaUser 窗口无 admin 端点（手改过一次 DB，旧值已备份）。
>
> **下一任务 T-0062（Owner 已指示）**：开放全量语言执行测试——走 Wave 1 Execution 开放前置链。


> **TEST_BATCH_1_WEB_ONLY_LIVE 达成（2026-09-05）**：Batch-1 Web-only Kill Switch 已部署测试站 `f962c64`（BATCH_1_SOURCE_SHA=`3cb32f7`，merge=`fee8391`，import 修复=`f962c64`）。`TYGF_EXECUTION_ENABLED=0` fail-closed：20 边界 503 EXECUTION_DISABLED（服务器实测）、capabilities executionEnabled=false、verify 查询语义 valid:false。ETIMEDOUT 根因 #33（journal fsync）修复=两 harness 90s+WAL。运行验证：BATCH1_EXECUTION_KILL_SWITCH_PASS、Test DB preflight 数据零丢失（BF=3/RDE=208）、公网带 key 200/无 key 403。Owner 裁决 Test DB 历史残留（1270 冻结/22 attempt）可容忍留待清理。

> **多窗口并行注意**：develop 在 9/01-9/05 间被多窗口推进（3.6.17-3.6.21、content studio、runtime provenance 等），本轮 batch1 基于 72267fd 干净分叉。`localAssistant.ts` 曾用 createRequire 被浏览器 chunk 打包炸 build（Turbopack panic），已改回 ESM `with { type: 'json' }`——**客户端组件禁用 node:module**，此教训记录在案。

> **UX #25 与本轮报告合同均已覆盖**：执行确认页计费明细默认折叠；票据/授权错误保留真实 `message/code`；“本地助手未运行”仅用于 ping 离线；失败报告使用红色中文原因，不伪造未生成文件。

> **发布安全态保持不变**：3.6.16 不覆盖；本轮未触碰 `main`、生产站、支付 flag、历史批次。无 key 的 `/download` 保护策略不变。

## 进行中事项

1. **助手安装绑定与 3.6.17 发布收口**：代码、离线 smoke、测试站预检、远端部署与公网回读已完成。
2. **测试机真人验收**：覆盖安装 3.6.17 后验证连接、扫描、智能检测、单语言、双语言、失败报告与失败结算；未知状态不得自动重跑。
3. **批次完成率与按语言计费**：代码 smoke 已绿，真实跨层/Photoshop E2E 仍是批量入口的证据门。
4. **支付上线收口与用户追认**：支付 flag、`BATCH_EXECUTION_READY`、Owner 退款 API、支付宝资质仍按既有红线处理。

## 下一步建议顺序

1. 测试机覆盖安装 3.6.17，完成人真人 Windows/Photoshop 验收；未完成前保持 `BATCH_EXECUTION_READY=false`。
2. 记录测试站 3.6.17 的版本、build、schema、renderer、安装包 SHA 和批次证据，确认网页与本地报告一致。
3. 对现有悬挂批次只读核对；未知账务状态不猜、不重跑、不直接改积分。
4. A5 协议/支付宝资质与生产上线流程继续由用户逐项批准。

## 最近验证基线（2026-08-30）

- 2026-08-30 本轮：`npx tsc --noEmit` ✅；`npm run lint` ✅（0 error，2 条既有 TanStack warning）；`test:trust-chain` ✅；`test:batch-row-contract` ✅；`test:v3-batch-flow` ✅；`test:batch-failure-settlement` ✅（独立 SQLite：失败释放/finish 幂等/未知态冻结/到期 sweep）；`smoke-v15-runner` ✅（失败语言中文报告/真实输出文件）；`check-release-identity` ✅；`smoke-release-consistency` 21 项 ✅。graphify 更新因本机无命令未执行。
- 2026-08-30 发布包与测试站：助手 3.6.17，build `v15-chooser-candidates-20260829`，schema `local-report-v2`，renderer `renderer-v2`；`tygf-engine-setup-3.6.17.exe` SHA-256=`469862102A364ABC2CFBBABC93B7E0F0553D4A3D2FF6D08FDAA91A2F8148D59E`，大小 12637266 bytes。develop 候选 `26cc58b` 已部署；归档 SHA-256=`2D9C79CABE1A333D05D112ED47D705BD6C8CD71CAAAEEDCAA479EACD84EDDF65`，备份 `/var/www/tygf-test-backups/deploy-20260830_012228-26cc58b489ac`，公网 latest/安装包回读通过。

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
