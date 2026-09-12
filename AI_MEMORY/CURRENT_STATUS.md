# CURRENT_STATUS.md — 图译工坊当前状态

## 2026-09-13 深夜 P0 事故修复与可靠性强化（已部署测试站 09f7122）

- **事故**：09-12 23:45–00:00 批量执行第二语种起 409 `REVIEW_EVIDENCE_BINDING_INVALID`，整批停摆、预留悬挂（用户三轮仅完成日语）。根因=快照 `targetLanguage` 是主语言、`languages` 才是整批全集，云端路由按主语言等值放行。
- **修复**：R1 证据按 `languages` 成员放行（`474a565`）；R2 预执行业务拒绝→语言级失败 + abandon + 其余语言继续（`09f7122`）；R3 回收器覆盖「确认后未派发」的 RESERVED（15min→STALLED 全额释放，F10 回归）；R4 systemd 回收单元 `ReadWritePaths` 补 db（此前 readonly database 实证）并入库。
- **收口**：事故 5 批全终态——3×39 + 18 commit（各轮真实完成的日语产出），RESERVED 216 released。
- **部署**：`09f7122`（备份 deploy-20260913_002627-09f7122d566b）；健康 200、PM2 三 online、latest=3.6.43；前端 chunk 已核验。
- **验证**：tsc/lint 0；trust-chain 24 段（含 F10）；v3-batch-flow/row-contract/workbench-flow/review-filters/报告 smoke 全绿。
- **交付**：`docs/records/20260913_P0事故修复与可靠性强化_执行方案.md`（第一性原理 + GitHub/官方对照 + 100 轮对抗审查）。
- **遗留**：F9–F14 未实施；ISSUES #39/#40（HEAD 既有测试失败）。

## 2026-09-12 深夜 F1–F7 核心批次实施 + 3.6.42 已发布测试站（终态）

- 范围：F1 未覆盖可见性、F2 同文轴、F3 争夺归属（解卡死）、F4 回执逐对象判定、F5 批量证据链、F6 合并诚实+产物可用、F7 报告卡片与术语。
- 发布：develop `a2de7fb`（代码+版本面 3.6.42/v15-scope-visible-20260912-r1）、`7793e6b`（安装包入库，exe SHA `BC5071C1…FF19`）、`f9a9817`（latest 更新说明修正）、`48451d4`（部署记录）；远端 develop 回读 `48451d4`。
- 部署（测试站两轮）：终轮 `f9a981731d54`（备份 `deploy-20260912_231653-f9a981731d54`）；健康 200、PM2 三 online、latest=3.6.42、安装包公网 200/SHA 一致；DB 未变更。
- 验证全绿：`tsc`/`lint`（0 error）/`build-local-binding-core --check` fresh/`test:trust-chain` 24 段/`test:batch-row-contract`/`test:workbench-flow`/`test:review-filters`/报告与回执 smoke（含 F1/F2/F3/F4 新断言）；release identity + consistency(23) + exe CLEAN 通过。
- Owner 待办：测试机卸载旧助手 → 装 **3.6.42** → 1 语言（日语）真机验证「选择归属」与报告新块 → 12 语言。
- 已知非本轮回归：`smoke-prepare-check-closure` 正则在 HEAD 即误报（不在 trust-chain 链，见 ISSUES #39）。

## 2026-09-12 13:16 卡点诊断与核心最小集审查（仅方案，未修复）

- 新交付：`outputs/project-audit-20260912-1142/20260912_卡点诊断与核心最小集_对抗审查执行方案.html` / `.md`，与 develop HANDOFF 成对登记。
- HEAD仍7ee5cb8+T-0118 dirty；本机ping3.6.39/expired，本地合同3.6.40，真实函数报UPDATE_REQUIRED；线上版本未核验，不能称现场卡死已定位。
- 新实证：generated --check FAIL且×→x语义与源码不同；三处请求缺AbortSignal；C2原改法横幅仍false并漏助手聚合器；C4非连续成功漏认。详见12断言＋3观察的freeze-probe-evidence.json。
- 旧5294报告324记录中220规范化同文/169未记录；12个PSB链接当前缺失、12个JPG存在。未打开PS验证，不认定删除/丢失历史或收费错误。
- 等用户补发授权链接和两张截图；未改业务代码、个人文件、旧方案或部署。C1-C7需重写部分合同，详见完整新方案。

## 2026-09-12 午间只读审计指针（不改发布/活动目录授权）

- 报告：`outputs/project-audit-20260912-1142/report.html`，原始数据 `inventory.json` / `verification.json`。与 `worktrees/develop/docs/HANDOFF.md` 成对登记。
- 本地 develop `7ee5cb8`，远端 develop `2fad331`：原 12 个提交早间已推；随后新增 3 个本地提交未推，另有 T-0118 未提交修改。本轮未追加推送、未部署。
- 元数据遍历 1,129,746 文件、61.77 GB 逻辑大小，699 重解析点跳过、0 访问错误；9 套 Git common dirs、42 个有效 Git 工作目录。不等于可回收空间。
- 不应直接把 T-0118 当可部署候选：回执临时 409 误分类已隔离验证；STALLED/accept/reaper 并发边界待修；仓库策略检查真实 FAIL（三项迁移正则失配）。详见报告 H1–H8/M1/G1 与 ISSUES 的 AUDIT-20260912。
- 本轮未跑 tsc/lint/trust-chain/真机；未核验实时线上数据库。以下旧状态保留为历史记录，不可把旧 3.6.17/3.6.30、10 语言或“12 提交未推”当作当前事实。当前源码语言上限 12。
- 凭证原件、RAR 与密码文件继续按用户“先不要删除”保留。未统一活动目录规范，未覆盖并行窗口的业务修改。


> 最后更新：2026-09-09　维护：AI 项目管理员
> 本文档回答"现在做到哪里"。更新前先读 PROJECT_CONTEXT.md。

## 一句话状态

> **T-0112 官网首页 v5.6 已上线测试站（2026-09-09/10，两轮）**：Owner 指定 mock（`docs/官网定位调整/图译工坊_模拟首页_v5.6_无句末标点_思源黑体.html`）已完整落地并部署——`home-view.tsx` 重写为 v5.6 八区块、`home-v16.css`→`home-v17.css`（作用域化）、真实申请表保留。第一轮 `442526e`→`41e58ee`（9/9），第二轮 9 处截图评审修复 `58f5855`→`ee6add0`（9/10，含品牌「图」字标恢复、4 处 section-lead 换行、try 左栏联系方式块；合并时吞并了并行 T-0107 3.6.27 的 develop 推进）。验证全绿（tsc/lint/trust-chain/row-contract + 本地与公网多视口零溢出 + 公网 9 处断言）。**遗留**：①页面写「最多 12 语种」但代码上限 10（Owner 裁决按 mock，产品待追平）；②思源黑体走 jsdelivr CDN，上线前需自托管。详见 TASK_LOG T-0112 / HANDOFF。
> **T-0107 时序修复 3.6.30 候选已打包（2026-09-10，4a69ba9，本地未 push 未 deploy）**：对抗审查实锤启动预取误入 5 分钟定时器 + /ping 竞态 + kick 依据内存态 + manifest 非原子写，已全修并加 /ping phase 与浏览器有界等待一次；11 场景对抗测试全绿；安装包 SHA 3997086E...B39。待 Owner 测试机 P0 取证 + 部署授权。前序：3.6.29 诊断增强已部署（fc1884e）：Owner 装完 3.6.28 实机仍报「版本不兼容（unknown/unknown）」。服务器取证：**3.6.28 曾于 09:56:20 成功分发 5 脚本（exeSha=c3a137f6…，云端 200）**→ 云端链路健康，嫌疑排序=旧引擎进程占 49152 / 客户端缓存写坏（杀软）/ ping 竞态。3.6.29 加诊断：/ping 暴露 `scriptDistributionStatus`（lastRefreshAt/lastError/逐脚本 sha8|MISSING）+ 降级 kick 重试 + 浏览器报错文案附诊断摘要。**待 Owner：退托盘/结束引擎进程（或重启）后装 3.6.29；再报错直接截图（文案含诊断）**。
> **T-0107 全部上线 + 实机热修（2026-09-10）**：测试站 `0dca91c`→`fc1884e`，助手 **3.6.29**（v15-script-distribution-diag-20260910-r2，SHA 1461EDF4…F405）。**Owner 最新指引：重装 3.6.28**（3.6.26/3.6.27 的脚本分发在实机失败：installId 缺失 400 + 单 origin + 旧残留抢先——已三修：路由放宽 installId/多 origin 刷新/候选序缓存优先+unknown 跳过+自愈刷新）。exe 零明文（JSX 云端分发+pkg bytecode+MachineGuid 硬失败+完整性锚点/删除自证/会话 ACL/v3 AAD）+ 自攻脚本 CLEAN。未实施：法务条款（待产品审阅）、Phase 3（永久搁置）；残余：运行时内存提取不可防（方案 #100）。**T-0111 Golden 序列仍待 Owner 真机**（1/5/8/12 逐级 + 断网恢复 + WRITE_DONE 重启 + 多显示器 picker）。
> **闸已开（2026-09-09，Owner 指示「直接开放合量改语言」）**：测试站 TYGF_EXECUTION_ENABLED 0→1，实测探针穿过执行闸（receipt 探针 503→400 参数校验）。批量能力三件套齐：TYGF_ENVIRONMENT=test + BATCH_EXECUTION_MODE=canary + batchBillingV3Enabled 默认 true（canary 白名单空=全部已激活设备）。**旧助手 3.6.23 会被 P1 身份门 fail-closed 拒绝（提示升级 3.6.24）——属设计行为**。跳过原 Golden 逐级方案=Owner 授权覆盖；历史 15/17 批次裁决仍待 dry-run 审计（不阻塞新批次：legacy 键保持 NULL 不占位）。
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
