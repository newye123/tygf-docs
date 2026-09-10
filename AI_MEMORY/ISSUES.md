# ISSUES.md — 问题登记（Bug / 技术债 / 已知风险）

> 最后更新：2026-09-06
> 每条带编号、严重度（🔴 blocker / 🟠 major / 🟡 minor）、位置、影响、建议、状态。
> 修复后更新状态，不删除条目。

---

## #36　文档执行锁的"改稿绕过"残余（内容指纹身份）　🟡 minor
- **位置**：`src/lib/server/execution-batch.ts`（`activeDocumentLanguageKey` 计算，T-0113 改动后）。
- **影响**：锁键 = principal + `documentFingerprint`(内容) + language（已移除 installId，修复了跨 install 绕过）。但 `documentFingerprint` 是内容指纹，用户改稿后指纹变化 → 锁不再匹配同一文件路径的历史执行，理论上同一 PSD 可被并发执行（缺稳定"文档/路径身份"）。数据模型无稳定 document id 列。
- **建议**：后续引入稳定 `documentIdentity`（projectId + 工作副本/文件路径身份）后把锁键切过去，并把 `smoke-batch-document-lock-scope` 的 L2 从"已知残余"恢复为断言互斥。
- **状态**：🆕 登记（T-0113 已修 L1 跨 install 绕过；L2 明确不在本轮范围）。

## #37　回执 fencing（已用终态来源门覆盖）　🟠 major
- **位置**：`src/lib/server/execution-batch.ts` `recordLanguageAttemptReceipt`；`download/local-assistant/server.js` 回执构造。
- **影响**：若"放弃+释放+重试"后旧执行复活提交回执，需防止双写/重复计费。
- **处置（T-0113 P2）**：已实现「终态来源门」——被 reaper 终态化（`terminalReason` 前缀 `ATTEMPT_ABANDONED*` 或 `ATTEMPT_START_TO_CLOSE_EXCEEDED`）的 attempt，其迟到回执返回 `ATTEMPT_ALREADY_TERMINAL`，不改状态、不计费；由回执自身产生的 FAILED 仍走幂等重放（response-lost 重试不破）。未引入 `epoch` 字段（避免 schema 迁移），语义等价。
- **状态**：✅ 已修复（T-0113 P2，`smoke-batch-fencing-late-receipt` 覆盖）。

## #38　助手 REOPEN 阶段卡死无回执（根因待查）　🟠 major
- **位置**：`download/local-assistant/v15-runner.js`（reopen 调用 `launchExecutor`）+ `server.js`（`PS_EXECUTION_HARD_TIMEOUT_MS=30min`）。
- **影响**：实测跳台 11:54 attempt 卡在 `REOPEN_START`（26/27），7 小时无回执。助手已有 30min 硬超时，但无 outbox 记录 → 更可能进程在超时前被替换/关闭，未落盘失败回执。
- **建议**：独立任务——(a) 启动时扫描 execution journal 的孤立 in-flight attempt 并合成终态失败回执上报；(b) 复核 `launchExecutor` 超时路径是否覆盖 reopen 阶段；需助手改版（3.6.33）。服务端 reaper 已提供恢复，此条为根因治理。
- **状态**：🆕 登记。

---


## #34　测试站服务器生产野进程占用 0.0.0.0:3000　🟠 major
- **位置**：服务器 43.134.175.26；pid 2698199（8/25 10:23 启动，next-server v16.2.10），cwd 指向已删除的 `/var/www/tygf/.next/standalone`（build 仅存活于内存）；nginx `sites-available/tygf`（生产域名 tuyigf.com/www）proxy_pass → localhost:3000。
- **影响**：① 生产站由一个不属于任何进程管理器、加载已删文件系统的野进程服务（runtime 身份不可审计，违反"源码≠runtime 身份"铁律）；② 0.0.0.0 暴露 3000 端口（无 TLS、无 key 门）。2026-09-06 排查 P0-A 时发现。
- **建议**：以生产站正常发布流程重建 `/var/www/tygf` 部署 + PM2 托管后杀掉野进程（**涉生产站，需 Owner 明确授权，不得擅动**）；期间可临时将 3000 收敛为 127.0.0.1 监听。
- **状态**：🆕 登记，待 Owner 决策。

## #35　Test DB 隐私清理 cron 每 30 分钟 FK 失败刷屏　🟡 minor
- **位置**：`logs/error-0.log` / `out-0.log`（[privacy-retention] review_snapshot_cleanup，`prisma.reviewSnapshot.delete()` Foreign key constraint violated）；logs/out-0.log 864 行中大半为该噪音。
- **影响**：真实错误被淹没；清理任务从未成功（scanned 46/deleted 0/failed 10，oldestExpiredAt 2026-08-09）。
- **建议**：清理逻辑应先删子引用或改级联顺序；登记后与 Test DB 残留清理（T-0060 遗留）一并处理。
- **状态**：🆕 登记。

---

## #33　旧授权与助手发布身份漂移导致安装绑定失败　🔴 blocker
- **位置**：`src/app/api/local-assistant/redeem/route.ts`；`src/lib/server/assistant-authorization.ts`；`config/release-identity.json`；`download/local-assistant/server.js` / `report-renderer.js`
- **影响**：legacy redeem 曾可签发缺少 `inviteActivationId` 的 token，而真实执行授权门必然拒绝；同时 release identity、助手 server、报告 renderer 和安装包可能以同一版本号承载不同构建，表现为 `ASSISTANT_INSTALL_BINDING_INVALID` 或网页/HTML 只更新一部分。
- **修复**：`03df623` 收口 legacy redeem，保持 activation-bound 安全门，当前 origin 仅允许一次安全配对/读回/授权重试；`6e3e495` 固定不可变助手 3.6.17、build `v15-chooser-candidates-20260829`、schema `local-report-v2`、renderer `renderer-v2` 并增强身份门；`1b2b6fe`/`0623e62` 统一失败语言报告与真实输出文件；`c631ee5` 增加失败结算/未知状态冻结 smoke。
- **验证**：tsc、lint（0 error/2 既有 warning）、trust-chain、batch-row-contract、v3-batch-flow、batch-failure-settlement、v15 runner、release identity/consistency 全通过；3.6.17 安装包 SHA/大小已核对。graphify 因本机无命令未更新。
- **状态**：🔧 代码级完成；测试站 `26cc58b` 发布、安装包公网回读已完成，latest=3.6.17 且下载=200；仍待真人 Windows/Photoshop 覆盖安装验收。不得放宽授权、覆盖 3.6.16、直接改积分或处理历史悬挂批次。

---

## #28　安装包无向前兼容，旧版本一律阻断执行　🔴 blocker
- **位置**：`src/lib/workbench/local-assistant-client.ts:128-142` `assertAssistantCompatible`；`config/release-identity.json:2`（历史现场为 develop 3.6.15 / 工作区 3.6.14；当前活动发布目标为 3.6.17）；`download/local-assistant/server.js:86` `VERSION`
- **影响**：测试机实测（2026-08-28，见截图）——测试站已部署 develop 3.6.15，测试机安装的 3.6.14 被版本门槛直接阻断："当前本地助手版本为 3.6.14，必须升级到 3.6.15 后才能执行替换。" 全流程卡死，无法进入 Photoshop 验证、无法提交 evidence，连"已连接"状态也显示"Photoshop 自动化不可用"。灰度策略要求"已激活用户不强制登记"（canary 空白名单=放行），但版本门槛与之矛盾——已激活的 3.6.14 用户仍被一刀切。
- **建议**：① 区分"强制阻断"与"建议升级"：仅当助手协议真正不兼容（证据格式/票据字段变更）时阻断；仅修复版递增（文案/小逻辑）时提示"建议升级"但允许继续；② 版本比较改"主协议版本"比对，而非精确相等；③ 已知 3.6.14→3.6.15 变更为计费作用域（`unbound rows excluded`），需评估是否真需阻断旧批次。
- **状态**：🔧 历史现场已通过 3.6.15/3.6.16/3.6.17 升版逐步缓解；本轮 3.6.17 发布身份已统一，但“修复版允许继续、协议漂移才阻断”的两级兼容策略仍未单独实施，测试机需安装 3.6.17 后复测。
- **治本待办**：下版 `assertAssistantCompatible` 分两级（协议漂移才阻断，`VERSION` patch/minor 仅 warn）。
- **现场**：截图 1（410×287）显示黄/红双告警均提示需升级至 3.6.15。

## #29　测试机批量执行连续失败（执行准备 / evidence 提交 / BREAKDOWN_MISMATCH）　🔴 blocker
- **位置**：`worktrees/v1.5-trust-chain` 执行链；`src/components/workbench/execute-step.tsx`（浏览器计费投影）；`src/lib/workbench/v3-batch-flow.ts:192`（mismatch 护栏）
- **影响**：测试机批量执行链连续失败。2026-08-29 复测确认第三个症状：升级 3.6.15 后执行报 `BATCH_BILLING_BREAKDOWN_MISMATCH`——根因为浏览器计费投影未与 3.6.15 助手 evidence 对齐：浏览器硬编码每行 `requiredObjectCount:1` 全 INCLUDED（24 行），助手按真实绑定把未匹配行排除（22 行 INCLUDED），报价明细两侧分叉触发护栏。前两个症状（执行准备失败/evidence 提交失败）与版本契约漂移相关，随 3.6.15 对齐应一并消失。
- **建议**：浏览器 plan 构建时消费 prepare-check 的 unmatched 项（`translationRowId`），标 EXCLUDED+0 对象；内部错误码（BREAKDOWN/EVIDENCE_NOT_ACCEPTED）抛出时附中文说明。
- **状态**：🔧 2026-08-29 两轮修复：第一轮（`ee1c9a2`）建立在不存在的数据上——对抗式复审发现 `kind:'unmatched'` item 从未被任何代码创建（binding-core 只算计数，labels.ts:38 死分支），`unmatchedTranslationRowIds` 恒为空，护栏仍触发。**第二轮真根治（`5a44f7a`，已部署测试站，备份 deploy-20260829_152832）**：① 服务端 quote breakdown 补行级字段（`standardUnitsByRowToken`/`standardUnitsByRowAndLanguage`，同源计算纯增量）；② `v3-batch-flow` 报价后**采用服务端权威 breakdown**（A4 原则），attempt 冻结 tokens/units 由此推导（与回执、finish 闸天然一致）；原 mismatch 硬抛护栏降级 console.warn 不再阻断（本地预估仅 UI 展示用，确认页已有"以服务端权威报价为准"）。tsc/lint/全部 smoke 绿。**待测试机复测闭环。**
- **技术债（新登记）**：prepare-check 缺行级 unmatched items（设计有 `case 'unmatched'` 但无产出方）——后续版本让助手在 check 响应中补 `translationRowId` 级条目，浏览器即可在 UI 明确列出"哪几行未匹配"并预排除。
- **2026-08-29 后续现场**：计费/确认已越过，但 6 个批次悬挂 RUNNING，均停在首语言 0/8、后续语言 PENDING。T-0052 已部署测试站 `9709686`，助手提升 3.6.16，新增 Photoshop 阶段进度 heartbeat、轮询错误分类和 active attempt 防重入。只读对账确认每批冻结 40、合计 240，均无本地回执/输出指纹/settlement，commit/release/refund 流水为 0；未改积分。状态保持 blocker，测试站 3.6.17 已发布，需安装新包做新批次真实验收，并另行批准历史批次处置。
- **2026-08-30**：代码层已补齐明确失败结算、未知状态冻结和报告失败可见性；独立库 smoke 通过。3.6.17 测试站发布与公网身份回读通过；历史批次仍未触碰。

## #32　注册/内测赠送积分口径倒置（测试站 DB 覆盖 800/88）　🟡 minor
- **位置**：测试站 `ApiCredential.creditsSignupBonus='800'`（覆盖代码默认 100）；`src/lib/server/credits.ts` grantBetaExclusiveBonus 补差逻辑（`topUp = min(788, 888-lifetime)`）
- **影响**：新用户看到"注册 +800 / 内测 +88"，与设计口径（注册 100 / 内测 788）相反。
- **修复**：2026-08-29 已将测试站 `creditsSignupBonus` 改回 `'100'` → 新用户恢复 100+788。存量用户总额 888 不变（beta 幂等键 ALREADY_GRANTED，≥888 不补差），不回溯。

## #30　批量灰度锁定提示向用户暴露内部计费术语　🟡 minor（UX）
- **位置**：`src/components/workbench/execute-step.tsx` 灰度锁定 Alert（`batchCapability.message` 服务端运营文案）；`src/lib/server/batch-execution-mode.ts` 灰度门控提示
- **影响**：批量执行被灰度阻断时，用户看到"一次报价、一次冻结、一次结算"等内部计费术语（见用户反馈）。灰度是运营控制，用户无需理解计费实现细节，应显示面向用户的友好提示（如"批量功能内测中，暂未对当前账号开放"）。
- **建议**：① 灰度阻断文案改为用户侧友好描述，不暴露计费模型；② 内部术语仅在运营后台/日志中使用；③ 按用户要求，本项不再对用户解释计费流程。
- **状态**：✅ 2026-08-29 彻底完成（`f388f01`，已部署测试站 `f416e1e`）：① 服务端 enabled 消息中性化（"批量执行已开启，可一次生成全部语言。"）；② `execLocked*` 三个零引用死键已从 siteContent.ts 删除；③ smoke 增加 doesNotMatch 断言防止术语回归。另含对 #29 的云端兜底（见 #30 同批提交）：`billing-challenge.ts` 拒绝 `INCLUDED && requiredObjectCount===0` 证据行（`BATCH_EVIDENCE_ROW_UNBOUND`，防旧版/篡改助手重现卡结算；对抗式审查确认无误杀面）+ finish 路由 `BATCH_RECEIPT_INCOMPLETE` 文案补真实原因（升级助手重置重跑）。tsc/lint/全部 smoke 绿。

## #31　官网文案直改 GitHub 开源集成未完成　🟡 minor（技术债）
- **位置**：官网前端直改文字的 GitHub 开源项目集成（用户反馈）
- **影响**：运营无法直接在官网前端调整文字，仍需通过文案字典/后台编辑。功能未就绪但不阻断当前工作台/登录/积分包文案字典链路。
- **建议**：用户明确"先不理，优先做好现在的问题"；本项仅记录，待 #28/#29/#30 处理完毕后再评估是否继续集成。
- **状态**：📌 新登记；暂缓，按用户指示优先处理现有问题。

---

## #23　批次聚合报告互相覆盖，只含最后完成语言　🟠 major
- **位置**：报告生成链（助手端 per-language 写 `图译工坊执行报告.html`）；现场 `0409 EDM-RF系列 改语言\改语言_ALL_6LANG__20260826_104306\图译工坊执行报告.html`
- **影响**：2026-08-26 首次真实 6 语言批次（batchId 14ecf065）6 套 PSD/JPG 全部交付、回读通过、积分守恒（25=23+2）✅，但 HTML 报告卡片显示"语言数 1"、语言交付表/输出表/明细仅瑞典语（最后完成者），前 5 语言内容被覆盖。批次聚合层缺失，E2E 场景 1"一份中文聚合报告"不通过。
- **建议**：报告生成改为批次维度聚合一次写入（全部语言合并一张表），或每语言报告独立文件名；修复后走"报告重建"重新生成，禁止重新扣费/重新执行（v2 方案红线）。
- **状态**：✅ 2026-08-26 已修复并提交 `d50c7a8`：批次执行把共享 `batchId` 作为 `reportGroupId` 传入 runner，语言 job 不再各写各的报告缓存；回执保留该键供报告重建。runner smoke 新增两个 language job 聚合为一份 2 语言报告断言。现场 `改语言_ALL_5LANG__20260826_133834` 已从五份 journal 数据无扣费重建为 IT/JP/NL/PL/SV 聚合报告，错误版另存备份；PSD/JPG 与账单未改。
- **2026-08-30 补充**：`1b2b6fe`/`0623e62` 让 V1.5 失败语言也进入同一份中文聚合报告，红色显示真实失败原因；报告只列真实已发布文件，重建不重跑 Photoshop。测试站 3.6.17 部署后的真人报告验收待执行。

## #24　批次 v3 计费口径（按源对象一次、与语言数无关）未经用户追认　🟠 major（决策类）
- **位置**：`src/lib/billing/batch-v3.ts:35`（计费字符 = max(源, 最长译文)）；`execute-step.tsx` 逻辑行合同
- **影响**：6 语言批次与 1 语言同价（22 源对象 ≈25 分），收入约为旧逐语言链 1/6。机制守恒正确，但定价决策内嵌于 908bc0a 未被显式追认。
- **建议**：用户二选一：A 维持按源对象计费（对用户友好）；B 改回按语言计费（需改结算合同，红线级变更走方案流程）。
- **状态**：✅ 2026-08-26 已按 B 方案实施并提交 `50d2981`：新批次按语言计费，旧 pricingVersion 与历史 `14ecf065` 保持原账；静态和隔离 smoke 全绿，真实 UI 小批次待刷新工作台补验。

## #26　预扫描在响应路径内同步哈希整文件，慢盘/大 PSD 触发 15 秒前端超时　🟠 major
- **位置**：`download/local-assistant/server.js` `/v1.5/preparation/scan` 处理器（响应前 `await sha256File(masterPath)`）；前端超时 `src/lib/workbench/local-assistant-client.ts:86`（`LOCAL_API_TIMEOUT_MS = 15_000`）
- **影响**：2026-08-27 测试机实测复现：H: 盘（外接/慢盘）上的 PSD，扫描请求 15 秒无响应 → 前端报"本地助手响应超时（15 秒）/扫描失败"。同文件在开发机 SSD 上 1 秒内完成，故开发机不可复现。文件选择框正常（助手存活、票据链路正常），仅扫描启动超时。B3/B5 测试机验收被此阻断。
- **修复规格（已与用户对齐，按此执行）**：
  1. **哈希移出请求路径**：`/v1.5/preparation/scan` 立即完成参数校验 + `fs.stat` 后返回 `202 { ok:true, scanId, state:'hashing' }`；`sha256File` 放入后台任务，完成后进入现有 `scanning` 流程（复用 `preparationScanState`，新增 `hashing` 态与 `hashProgress` 字段）。
  2. **状态轮询兼容**：`getPreparationStatus` / `/v1.5/preparation/status` 对 `hashing` 态返回进度（已哈希字节/总字节）；前端 `preparationStateFrom` 透传 `hashing` 态，UI 显示"正在读取文件…X%"。
  3. **缓存判定**：命中 VALID 缓存的快路径（仅 size+mtime 判定，无需全文件哈希）保留在请求路径内；需重算指纹的后台完成后二次比对。
  4. **文案**：扫描启动超时（前端 AbortError）显示"扫描启动超时：文件较大或磁盘较慢，请重试或使用本地磁盘"；不得显示"请确认本地引擎已启动"。
  5. **smoke**：断言扫描请求在哈希完成前即返回 202+scanId；`hashing` 态可被 status 轮询观察到并最终到 `prepared`。
- **验收环境**：必须在测试机（慢盘/H: 盘）真实验收，开发机 SSD 不能作为通过依据。
- **版本纪律**：助手核心改动 → 版本递增（3.6.14+）→ 重新打包 → latest API 一致性检查 → 测试机安装验证（B5）。
- **状态**：✅ 2026-08-27 代码级修复完成（提交 `15f8970`，已推 origin）：① 助手端 `/v1.5/preparation/scan` 拆为立即响应（202+scanId+hashing）+ 后台任务（`sha256FileAsync` 分块哈希带进度回调 → PS 扫描），结果暂存 `preAsyncResult` 由 status 轮询一次性取走；② status 轮询透传 `hashing` 态与字节进度；③ 缓存快路径保留（size+mtime 快判）；④ 前端超时文案按 URL 区分——扫描类显示"扫描启动超时：文件较大或磁盘较慢"，不再误导检查引擎；⑤ UI 补 hashing 态徽标与提示；⑥ 版本合同同步 3.6.14/v15-scan-async-20260827。tsc/lint/runner smoke/entry-modes smoke 全绿。**遗留：安装包需在打包机重打（3.6.14 exe + manifest，check-release-identity 当前因缺 exe 阻塞，属预期）；测试机慢盘真实验收待装新包后执行。**

## #25　执行确认页信息密度与误导性错误文案　🟡 minor（UX）
- **位置**：`src/components/workbench/execute-step.tsx` 按语言计费明细区；`src/lib/workbench/local-assistant-client.ts:456`（"本地助手未运行"）
- **影响**（两项合并处理）：
  1. B 方案上线后执行确认页展示逐语言单位明细（如 5 语言×10 单位逐行列出）+ 下方又有合计句，信息重复；用户反馈无必要。但各语言单价不同（长译文语言多计费字符）时明细有解释价值，不能全删。
  2. 助手指票被云端拒绝（403 SERVER_ERROR 等）时前端显示"本地助手未运行"，误导排障方向（2026-08-26 实例：助手正常，病灶在测试站 ticket/verify DB 错误）。违反 v2 方案红线 R3（拒绝必须透出真实原因）。
- **建议**：
  1. 明细默认折叠为"查看计费明细"，默认只显示合计一行（语言数 + 总单位 + 预计冻结）。
  2. 票务/授权类失败按 code 分级显示（服务器端校验失败/助手离线/组件不兼容），"未运行"仅用于 ping 真正失败。
- **状态**：✅ 2026-08-27 已修复并提交 `c3a09e5`：执行确认页使用默认闭合的原生 `details/summary`，默认只显示语言数、总标准单位和预计冻结积分，逐语言单位按需展开；`fetchTicket` 改为保留服务端 HTTP 状态、真实 `message/code` 的 `LocalAssistantRequestError`，非 ping 网络失败使用 `ASSISTANT_UNREACHABLE`，只有 `/ping` 失败显示“本地助手未运行”。定向 `smoke-local-assistant-errors`、`npx tsc --noEmit`、`npm run lint` 均通过；lint 为 0 error、2 条既有 TanStack warning。

---

## #21　真实单语言成功但 HTML 仍由旧运行时合同产出　🟠 major
- **位置**：`download/local-assistant/v15-runner.js:299-449`；`download/local-assistant/report-renderer.js:82-193`；`download/local-assistant/receipts.js:40`；现场 `改语言__20260825_225936339/replace_report.html`
- **影响**：IT 单语言 Photoshop 执行和 22/22 重开回读成功，但现场 HTML 只有简化对象表、22 个译文格为空；现场回执缺当前代码应有的 `reportStatus`，报告也缺当前 renderer 应有的正式章节。助手虽自报 3.6.9，仍可能因进程未重启加载旧模块，造成“版本号正确、运行代码错误”的假绿。当前报告不能作为用户交付和批量解锁证据。
- **建议**：按 `docs/图译工坊_V1.5多语言解锁与中文执行报告_对抗式方案_20260825.md` 增加 assistant build/report schema/renderer 三重身份门；让旧渲染实现退出活动路径；新报告统一为 `图译工坊执行报告.html`；修复 target/保持原文语义；缺失输入审计时不伪造“无问题”；单语言回归和真实 7 语言 E2E 后再解锁。
- **状态**：✅ 2026-08-26 报告展示层已真实验收：单语言执行报告原地重建，内部执行器证据与英文状态码已移除，中文状态、语言名和真实原文/译文保留；49155 已重启加载新渲染器。该项不代表批次资金/恢复合同已通过，`BATCH_EXECUTION_READY=false` 继续关闭。
- **2026-08-30 补充**：V1.5 runner 已把失败语言、报告生成失败和缺失真实输出文件纳入中文报告合同；`smoke-v15-runner` 全绿。3.6.17 安装包部署后仍需真人打开报告验收。

## #22　数据库 smoke 在 Prisma `db push` 阶段挂起　🟡 minor
- **位置**：`scripts/test-db-harness.mjs:61`；`npm run test:batch-billing-v3`、`npm run test:batch-settlement-idempotency`
- **影响**：本轮两组隔离数据库 smoke 均停在 `prisma db push`，无业务断言输出；无法把这两组结果计为通过，也不能据此判断批次计费/结算实现失败。
- **建议**：释放占用 Prisma query engine 的进程或文件锁后，串行执行隔离库 smoke；若仍挂起，再单独修复测试 harness/Prisma 运行环境，不与报告改动混合。
- **状态**：🔧 2026-08-30 以提升权限串行复跑通过；`test:batch-failure-settlement` 与既有 recovery smoke 的独立 SQLite 初始化和业务断言均通过。普通沙箱仍可能因禁止 Prisma 子进程返回 EPERM，属执行环境限制，不是业务结算结论。
- **2026-09-04 关联定性（Batch-1 harness `migrate deploy` ETIMEDOUT 根因，见 #33）**：同一物理机制确认——SQLite 默认 DELETE journal 模式下 186 条 CREATE INDEX 的逐条 fsync 使 `v15_schema_baseline` 在本机真实耗时 ~58s；任何 45s 子进程边界（无论 db push 还是 migrate deploy）都会被 SIGTERM。#22 当时"挂起"极可能同为超时截断而非死锁。

## #33　Batch-1 harness 45s 边界无法容纳 baseline migration 真实耗时（ROOT_CAUSE_CONFIRMED）　🟠 major
- **位置**：`scripts/migrate-test-db-harness.mjs:44`（timeout: 45_000）；`prisma/migrations/20260825000000_v15_schema_baseline/migration.sql`（58 表 + 186 索引，59,416 bytes）
- **首失败**：`_verification-ca30524-20260904-evidence/batch1-kill-switch-first-failure-20260904.txt`（SHA256 `02429FD8…ACA41` 已重验吻合）——`smoke-execution-kill-switch` 在 disposable DB `migrate deploy` 阶段 ETIMEDOUT，SIGTERM，baseline row started 未 finished
- **ROOT_CAUSE_CONFIRMED（TEST_A/A1b 实验，2026-09-04）**：
  - A1 direct SQLite（node:sqlite，disposable DB）：baseline 244 语句全量 PASS，**58,142ms** > 45s——SQL 层本身就要这么久
  - A1b journal 变体（同一 disposable DB 重跑）：DELETE=57.9s / MEMORY=19.9s / **WAL=12.5s** / OFF=19.6s——耗时被 SQLite 默认 DELETE journal 的逐条 fsync 放大约 5 倍
  - A2 spawn+实时消费 stdout 复现 `migrate deploy`：45s 仍 SIGTERM，stdout 仅 376 bytes——**排除管道背压假说**；Prisma/schema-engine 层无过错
  - 进程锁排除：22 个存活 node 进程逐一核命令行，0 个持 disposable DB 句柄；db 目录无残留
  - F 盘排除：NTFS 顺序写 50MB=37ms
- **修复方向（按代价升序，待 Owner 批准，均不改 migration SQL）**：
  1. harness timeout 45s→90s（一行，覆盖 DELETE 模式 58s+引擎开销）
  2. harness 在 spawn env 里注入 SQLite journal 优化（如引擎支持）；或 disposable DB 预设 WAL——需验证 schema-engine 是否遵守
  3. baseline 拆分或索引延迟创建（改 migration 链，风险高，不推荐）
- **修复实施（Owner 批准 ①+旧harness一起，2026-09-04）**：
  - `migrate-test-db-harness.mjs` + `test-db-harness.mjs`：timeout 45s→90s + disposable DB WAL 预设双保险（A1b 实测 WAL 12.5s，engine 不保证遵守则 90s 兜底）
  - 连带发现并修复两个 Node22 strip-only 兼容缺口（smoke 链加载既有代码所必需，均等价改写）：
    - `src/lib/server/site-settings.ts:19` TS parameter property → 显式赋值（Node22 strip-only 不支持）
    - `src/config/localAssistant.ts:1` ESM JSON import → `createRequire`（与 `runtime-provenance.ts` 同模式，Node22 ESM 需 import attribute）
- **验证（BATCH1_EXECUTION_KILL_SWITCH_PASS，2026-09-04）**：
  - 20 个 API 边界 503 fail-closed ✅；DB 不变量 UNCHANGED（11 表零变化）✅；external fetch count=0 ✅
  - disposable DB migration 通过（WAL 生效）✅；Test DB preflight PASS+BLOCK fixture ✅
  - Node22 tsc EXIT=0 ✅；lint 0 error/2 既有 warning ✅；`git diff --check` PASS ✅；environment-isolation PASS ✅
  - staged=NONE；工作树 34 项（27 modified + 3 untracked + 4 个新修复文件）待 commit 审计
- **状态**：✅ 2026-09-04 commit `0e8eece` 已落 + **对抗式审查修复 `3cb32f7`**：①（中危）ticket/verify 对 execution 票据由 503 改 200 `valid:false, reason:EXECUTION_DISABLED`（查询语义，execution 票据绝不被判可用）；②（低危）harness WAL probe 失败 console.warn；smoke 断言同步更新并重跑 PASS（20 边界/DB 不变量/external=0/preflight 双 case），tsc/lint/diff 全绿。审查另确认：无 gate 的 3 个只读端点（batch 进度 GET/photoshop diagnostic/status）属 Batch-1 设计保留，非缺口。**BATCH_1_SOURCE_SHA=3cb32f7f6750b68dcaa24c74fd0fa16fcac4bdf3**（已推 origin 并验证），待 develop 集成 → C5/C8/Security → Browser Golden → TEST_BATCH_1_WEB_ONLY_LIVE。

## #20　多语言表原文集合与版本不一致，阻断真实 PSD 校对　🟠 major
- **位置**：`F:\\04_视觉设计与素材\\视觉\\设计\\2026\\0409 EDM-RF系列 改语言\\多语言表\\` 下 7 个语言 CSV；本地工作台 Step 3 设计稿校对
- **影响**：7 个表可解析并合并，但 ES 表为 52 行、其余语言表为 24 行；合并后真实页面出现 13 组重复原文、ES 缺 1 条目标译文、其余 6 个语言各缺 12 条目标译文，共 16 个必须处理项，不能安全进入 PSD 写入。
- **建议**：以同一版 PSD 扫描结果生成统一原文主表；每种语言保持同一 `recordId`/原文集合，重复原文必须在表内合并或补稳定行标识，缺译文明确标记后再导入；不得由工作台自动猜选重复行。
- **状态**：✅ 2026-08-26 防扩散修复完成：清理版 ES 仍可正常使用；原始异常 ES 与多数 24 行表共同导入时，工作台会在合并前明确拒绝并指出异常文件/行数，不再把 50 行结构传播给全部语言。原始 ES 文件保持不变，批量执行仍受 ISSUES #19 安全闸约束。

## #19　批次 v3 行令牌、计费证据与助手回执合同断裂　🔴 blocker
- **位置**：`src/components/workbench/execute-step.tsx:471-581,637-653`；`src/app/api/workbench/execution-batches/quote/route.ts:13,59-61`；`src/lib/workbench/v3-batch-flow.ts:127-165,187-194`；`src/lib/server/execution-batch.ts:85-103,128-205,418-579,905-926`；`download/local-assistant/server.js:3543-3552,3687-3715`
- **影响**：真实页面当前生成 `rt_src_<index>`，而报价和回执只接受 `^rt_[a-f0-9]{1,64}$`，因此 quote 必然 400。即使只修 token，编排器签发 challenge 后未向助手生成/取得 evidence，quote 会继续报 `BILLING_EVIDENCE_REQUIRED`；即使补 evidence，服务端把 evidence 行的字符数置 0、`computeRowStandardUnits` 又不读取 `standardUnits`，会继续报 `BATCH_ROWS_EMPTY`，并且 DB 仍错误持久化 `input.rows` 而非 `authoritativeRows`。助手又按 source+target 反查 token，重复文本、组合绑定和一行多对象可能错配，并在找不到时伪造含 locale/下划线的非法 token；其上报体还只有 `{rowResults}`，缺收费门要求的 reopen 证明。进一步对抗审查确认：challenge 在 batch 创建事务外消费，并发可留下孤儿 batch；丢响应后无法按同 challenge 幂等恢复；助手内部 receipt POST 不带 Origin 且失败被静默吞掉，本地成功仍可推动 finish，可能形成“文件已交付、云端零核销”；页面每次新建 runId 导致 draft 无法恢复，用户排除/忽略/强绑决策也在批次路径丢失。
- **测试缺口**：`test:v3-batch-flow` mock 了 quote/confirm；`test:batch-billing-routes` 只喂手写合法 token；多个领域 smoke 直接调用 service，绕过 HTTP 格式合同。现有“全绿”没有覆盖真实页面 payload → quote → evidence → assistant receipt → finish。
- **建议**：不要放宽正则、不要删除 challenge、不要随机重生成 token。按 `docs/图译工坊_批次v3行身份证据与结算闭环_对抗式执行文档_20260825.md` 执行 P0-P6：先关入口和补失败测试；由助手 prepare 并鉴权提交权威 evidence；原子消费 challenge/创建唯一 batch；manifest/ticket 绑定 rowSet/fragmentRows/digests；可靠 receipt outbox 获 ACK 后才 finish；真实跨层及 Photoshop E2E 后再翻闸。
- **状态**：🔧 2026-08-25 P0-P5 已在活动 worktree 实施并通过 tsc/lint/信任链、批次计费、路由、幂等 smoke；IT 单语言真实执行已 22/22 回读通过，但不覆盖批次资金/恢复合同，且报告仍受 #21 阻断。`BATCH_EXECUTION_READY=false` 继续关闭，真实 7 语言跨层 E2E 尚未完成。

## #18　本地文件选择框链路存在双实例、组件漂移与前台窗口缺陷　🟠 major
- **位置**：`.env:35-45`（3422 指向 49155）；`src/lib/workbench/local-assistant-client.ts:423-435`；`download/local-assistant/server.js:2417-2443`；对照文件夹选择实现 `server.js:2892-2925`
- **影响**：本机同时运行 49152 安装版 v3.6.8 与 49155 开发版 v3.6.9；49155 当前握手只检测到替换组件 2.9-beta/report 1.0，低于引擎要求 2.12-beta/1.4。文件选择框自身没有 TopMost owner 且用 `execFileSync` 阻塞 Node 事件循环，可能藏在浏览器后方或让助手其他接口长时间无响应。历史事件日志已有 select-file 验票超时 403 实证。
- **建议**：P0 运行时只保留一个与 Web 配对的助手，并将版本/脚本/report schema 全部握手通过后再启用“选择文件”；P1 抽取统一异步 Windows picker helper，文件和文件夹都绑定 TopMost owner、保证 dispose、区分取消/超时/启动失败且日志不记录路径；P1 增加双实例、组件不兼容、验票失败、取消、超时与对话框前台 E2E。
- **状态**：✅ 2026-08-26 本地开发链已修复并真实验收：3422 明确连接 49155；picker 为异步 TopMost owner，使用固定系统 PowerShell 路径并记录脱敏诊断；旧受限进程的 fallback 会话授权已迁移回 MachineGuid 加密。有效一次性票据调用 `/v1.5/select-file`，真实窗口弹出并自动取消返回 `ok=true,cancelled=true`。49152 安装版仍存在，但不是 3422 当前测试对象。

## #17　生产 `tygf.service` 缺失 + 孤儿 Next 进程导致 tuyigf.com 不可达　🟠 major（已止血，待根治）
- **位置**：生产 VPS `/etc/systemd/system/tygf.service` 原缺失；Nginx `tuyigf.com` 仍反代 `localhost:3000`；旧进程位于 `/var/www/tygf` 与 `/var/www/tygf-test-previous`
- **影响**：生产 3000 进程无响应，公网首页回源超时；测试 previous 进程占约 98% CPU，主机可用内存一度约 147MB。PM2 仅管理测试端 3001，生产无有效监督。
- **处理**：2026-08-24 应急新增并启用 systemd unit，清理 PID 1603693/2101647；`tygf.service`、Nginx active/enabled，本机应用、Nginx 路由、公网首页均返回 200。
- **建议**：核对 `deploy/deploy-release.sh` 与实际服务器用户/路径，确保生产 unit 不会在后续部署中丢失；为生产发布加入 `systemctl is-enabled/is-active tygf`、端口 3000 和公网 smoke；审计测试部署遗留 wrapper。
- **状态**：✅ 已止血（T-0020）；运维配置与部署流程一致性待修。

## #1　graphify 根图是空壳，AGENTS.md 规则暂不适用　🟠 major
- **位置**：`graphify-out/`（根目录，2026-07-06 生成）；`AGENTS.md` graphify 节
- **影响**：`graphify query` 对本代码库只会返回垃圾结果（图只索引了 graphify 工具自身 8 文件/749 词，未覆盖任何业务代码）；新会话按 AGENTS.md 规则先跑 graphify 会被误导
- **建议**：A) 在 `worktrees/v1.5-trust-chain` 里 `graphify update .` 重建真实图后恢复规则；B) 短期内按 PROJECT_CONTEXT 标注"暂不适用"
- **状态**：📌 已登记（PROJECT_CONTEXT 已加警示）

## #2　工作区根 git 仓库无提交，index 残留 WORKSPACE-MAP.md　🟡 minor
- **位置**：根目录 git 仓库（无任何提交；`WORKSPACE-MAP.md` 处于"暂存新增 + 工作树删除"的矛盾态）
- **影响**：首次提交若不清理，会把已删除的 WORKSPACE-MAP.md 一并入库；导航指针（收口方案 P0.4 曾要求根目录放三行指针文件）缺失
- **建议**：提交记忆系统时先 `git restore --staged WORKSPACE-MAP.md`；并向用户确认是否按 P0.4 恢复根目录三行指针
- **状态**：✅ 已解决（2026-08-24 提交 42152b4 仅含记忆系统+AGENTS.md，index 已清；根目录导航指针已恢复）

## #3　8.1.psd 四语言连跑报告"写入成功但译文列为空"　🟠 major（根因已定位，待批准修复）
- **位置**：`download/local-assistant/v15-runner.js:295`（渲染取值）；证据：`遇到的问题/8_1__20260824_*` 6 个运行目录 + 助手回执 `.tygf_v15_journals/receipts/` + 聚合数据 `report-data/8_1.json`
- **影响**：报告译文列全空——**已证实为纯渲染 bug，PSD 写入真实有效**（回执各对象 actualTextDigest 各不相同；若写空应全等 sha256("")；v15-runner.js:74 回读不符会抛 REOPEN_READBACK_MISMATCH 中止）。但报告是用户交付物，空译列引发误判与返工
- **根因**：隐私化后的回读证据只带 `actualTextDigest` 不带 `actualText`（v15-runner.js:77-81），渲染处 `ev ? ev.actualText : a.target_text` 中 `ev.actualText` 恒 undefined → 渲染空串
- **建议**：一行修复——v15-runner.js:295 改为 `sanitizeReportText(a.target_text)`（verified=true 时 actual===target 已由三重验证保证）；可加回归断言防复发
- **状态**：🔧 根因已定位（T-0018），**业务代码改动待用户批准**

## #4　BATCH_EXECUTION_READY 翻转 = 红线偏差，待用户追认　🟠 major
- **位置**：`src/components/workbench/execute-step.tsx:85`（19452fc）
- **影响**：收口方案 v2 红线要求该值保持 false；当前已 true，批量入口对真实用户开放（运营台开关可随时关闭）
- **建议**：用户追认；不批准则 `git revert 19452fc`（独立提交，可整体回退）
- **状态**：⏳ 待用户追认

## #5　Owner 退款 API 与 v2 红线"不做自动退款"口径偏差　🟡 minor
- **位置**：2508989（退款关闭系统）
- **影响**：红线字面冲突；实质为"Owner 后台手动 + 审计 + 幂等" ≠ "用户自助自动退款"，与 runbook S1/S4 互补
- **建议**：用户追认口径澄清（HANDOFF.md 已登记）
- **状态**：⏳ 待用户追认

## #6　生产支付开放被用户决策阻塞　🔴 blocker（对 P1.6）
- **位置**：收口方案 v2 第 4 节
- **影响**：P1.6 生产三步放无法进行：① 用户协议 v0.3.8 + 隐私政策未签发；② 支付宝收款主体/签约状态未确认；③ 三次发布批准未下达；④ C3 立项决策悬置（默认不立项）
- **建议**：向用户逐项确认（本报告"需确认信息"已列出）
- **状态**：⏳ 等待用户决策

## #7　历史密钥泄露事件，整改完成度待确认　🟠 major
- **位置**：`tygf-v0.2-source更新文档.txt`（曾将 DeepSeek/PaddleOCR 明文密钥写入文档）
- **影响**：若密钥未吊销重生成，存在生产凭证泄露风险
- **建议**：确认已吊销重生成，新密钥只放环境变量/后台 ApiCredential；扫描仓库是否有残留明文密钥（grep 敏感模式）
- **状态**：🟡 文档层面已确认整改（2026-08-24 扫描：活动树跟踪文件无密钥、.env/.pem 未入库、历史文档第 7 行为 SHA256 校验和非密钥）；provider 侧吊销无法本地验证，保持登记。注意 `staging-site-access.txt`/`test-site-access.txt` 含访问 key（本地文件未入库，勿打包勿提交）

## #8　退款 runbook 待升级 v1.1 + 沙箱演练未做　🟡 minor
- **位置**：`docs/退款与差错处理runbook_20260823.md`（P1.1 两处洞：S1 全额调减前不查消耗、S4 消耗口径含糊）；P1.2 演练表为空
- **影响**：runbook 未修两洞前，生产支付开关不得打开（红线第 8 条）；未演练则差错处理能力未经验证
- **建议**：按收口方案 v2 P1.1/P1.2 顺序执行（下一步建议第 1-2 项）
- **状态**：📌 待办

## #9　0810 五语言匹配 bug 仅逻辑级闭环，真 PSD E2E 未做　🟡 minor
- **位置**：a83cb2b（fixture 断言）；素材在 `遇到的问题/脚本跑出来的问题/0810_五种语言测试__20260810_082418117/`
- **影响**：真实 Photoshop + 本地助手下的最终闭环证据缺失（组合绑定/逐语言计费正确性未在真机验证）
- **建议**：P1.4 三项回归之一，用真实 PSD+CSV 真机连跑
- **状态**：🟡 部分闭环（2026-08-24 早间真机 4 语言 TH/VI/ID/MS 全部 REOPEN_VERIFIED 发布，组合绑定真实执行有效；但 ES/TH 两语言因 PS 弹窗/UI 干扰失败 → 转 #15；完整 5 语言一次通过仍未达成）

## #10　公开下载助手版本不一致嫌疑　🟠 major（2026-08-24 实锤并部分修复）
- **位置**：`download/local-assistant/server.js` VERSION、`public/downloads/`、`config/release-identity.json`、`/api/local-assistant/latest`
- **影响**：版本纪律断裂实锤——VERSION 冻结 3.6.8（安装包 8/16 构建后未再发版）而引擎协议 8/18-23 演进（select-file message 修复、批量 v3 等），前端 `assertAssistantCompatible` 比对永远相等 → **升级通道失效，用户永远停在旧引擎**；实测旧版 select-file/preparation 403 无 message 字段，用户只见兜底文案
- **建议**：已构建 v3.6.9 全套并入库（0c7862f）；待办：合并部署 develop + 处理 `.gitignore:75` 白名单未含 3.6.9 exe（带外上传或补提交）；今后每次助手协议变更必须 bump VERSION+重打包+刷新发布标识
- **状态**：🔧 修复已入库待部署

## #14　测试站 SES 邮件服务未配置 → 新用户注册验证死循环　🔴 major（对内测拉新）
- **位置**：`src/lib/server/mail/ses.ts:33 isMailConfigured()`；测试站服务器 env 缺 `TENCENT_SES_SECRET_ID/KEY`；关联 `login/route.ts:65 AUTH_EMAIL_NOT_VERIFIED` 挡人
- **影响**：test.tuyigf.com 实测 resend 接口返回 `mailConfigured:false`——注册成功但验证邮件发不出 → `emailVerifiedAt=null` → 登录被拒 → 重发也无用。内测拉新完全阻塞
- **建议**：①配腾讯云 SES（发信域名 mail.tuyigf.com DNS 验证 + CAM 最小权限密钥只授 SendEmail + MAIL_FROM 已在位）；②owner 手动验证兜底已实现（19db25b verify_email action，develop 已含，测试站部署确认后可用）；③禁止用改 TYGF_ENVIRONMENT=local 方式绕过
- **状态**：⏳ 待配置密钥

## #11　dependabot 11 个依赖 PR 未合并（origin/develop）　🟡 minor
- **位置**：origin/develop 远端分支（eslint 10.8.0、lucide-react 1.28.0、prisma 7.9.1、recharts 3.10.1、uuid 14 等）
- **影响**：依赖滞后；prisma 7 是 major 升级需评估
- **建议**：收口期不合并 major；minor/patch 待发布稳定后统一处理
- **状态**：📌 待办（低优先级）

## #12　工作区残留调试/临时物　🟡 minor
- **位置**：`worktrees/v1.5-trust-chain/` 的 `_cap.sql`、`_remote-check.cjs`（未跟踪）；`worktrees/dev-server.log`、`dev-server.err.log`
- **影响**：无功能影响；但可能含敏感数据（_cap.sql 可能是抓包），不宜入库/外发
- **建议**：确认后清理或加入 .gitignore；检查 _cap.sql 是否含敏感内容
- **状态**：🟡 脚本已清理（2026-08-24 确认无敏感内容后删除 _cap.sql/_remote-check.cjs，工作树全净）；剩 `worktrees/dev-server*.log` 两个日志文件待处理

## #15　V1.5 执行链对 Photoshop 弹窗/UI 干扰无防护　🟠 major
- **位置**：`download/local-assistant/server.js:600-608`（displayDialogs=NO 仅包住 app.open）、`:176 PS_TIMEOUT_MS=3min`、`:1213`（wscript kill）；脚本 `TYGF_V15_Thin_Executor.jsx:87 save()`
- **影响**：实测两类失败——① ES(084325) "用户取消了操作"@jsx:79（写文本被中断）；② TH 重跑(092750) save() 挂起 2h27m（疑 PSD 兼容性等模态弹窗），助手 3 分钟超时放弃并**移走工作副本**，PS 恢复后保存报"尚未存储该文档"→ 用户侧表现为偶发"扫描失败/执行失败"，且隔离动作与 PS 状态竞态
- **建议**：① wrapper 全程 displayDialogs=NO（脚本始末设置/恢复）；② 超时放弃后延迟隔离或先探测文档关闭；③ 错误码区分"助手超时"vs"PS 端错误"；④ UI 明示执行期间勿操作 Photoshop
- **状态**：🔧 2026-08-29 T-0052 已发布测试站 `9709686`：wrapper 全周期 `DialogModes.NO`；执行器/重开验证器输出阶段进度；助手按进度续约 heartbeat，正式执行硬上限 30 分钟、无进度 3 分钟 stalled；浏览器不再把断联/404 吞成 20 分钟通用超时。静态、合同、完整构建与线上发布探针全绿，待助手 3.6.16 测试机真实 Photoshop 验收后关闭。

## #16　WORKSPACE-MAP.md 助手版本段过时　🟡 minor
- **位置**：`worktrees/v1.5-trust-chain/docs/WORKSPACE-MAP.md`（发布物节仍写"当前唯一对外下载 tygf-engine-setup-3.3.4.exe"）
- **影响**：与实际不符——public/downloads 现有 3.5.4/3.6.4/3.6.8/3.6.9 四个包，当前版 3.6.9（server.js VERSION + 8-23 构建的安装包）；误导新会话与发布核对
- **建议**：更新 WORKSPACE-MAP 发布物段（属规范文档，按纪律需明确要求再动）
- **状态**：📌 待用户批准后修订

## #13　根目录 AGENTS.md graphify 规则指向空壳图（并入 #1）　🟡 minor
- **位置**：根 `AGENTS.md` graphify 节
- **影响**：同 #1；已在本轮 AGENTS.md 更新中加入警示说明
- **建议**：同 #1
- **状态**：📌 已登记（与 #1 合并处理）

---

---

## 修复记录（按时间）

- 2026-08-24：#3 报告"译文列空"根因定位 = v15-runner.js:295 渲染 bug（证据 digest 链），PSD 写入真实有效；待批准一行修复（T-0018）
- 2026-08-24：#2 根仓库 index 残留清理 + 根目录导航指针恢复（42152b4 + WORKSPACE-MAP.md）
- 2026-08-24：#7 密钥扫描完成——文档层面整改确认；本地访问 key 文件已登记防打包
- 2026-08-24：#12 调试脚本删除（_cap.sql/_remote-check.cjs 确认无敏感内容）
- 2026-08-24：#10 引擎版本纪律断裂实锤，v3.6.9 全套构建并入库（0c7862f）→ 状态改"修复已入库待部署"

- 2026-08-10：0810 五语言匹配 bug **逻辑级修复**（a83cb2b），真机 E2E 未做 → 转 #9
- 2026-07-18：DeepSeek/PaddleOCR 明文密钥泄露**发现并整改**（吊销重生成）→ 转 #7 待确认
