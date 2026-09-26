# ISSUES.md — 问题登记（Bug / 技术债 / 已知风险）

> **2026-09-26 18:2x 状态更新（ZCode 主线会话，详见 TASK_LOG 顶部）**：#111 引信**已拆一半**——`cleanup-review-snapshots.mjs` 已随 develop `9418cac` 改为缺省只数＋`--apply` 才删（拆前实测服务器零调度引用该脚本＝无停摆风险），同族 learning 脚本极性本就安全（其 develop 未提交改造属他人现场未验）；#118 账号标识已**向前脱敏**（develop 台账 5 处＋容器根 7 处占位替换，历史提交未改写；原登记的未提交人名串现检 0 命中）。两件均已 push 并部署测试站 `d24d2b0`，**待复验**（队列件名 `FUSE-111-DESENS-118`）。#114 状态跟进：修已随 3.7.3 出厂（`f056a8d`），装机验收四数仍未取。
>
> 最后更新：2026-09-24 23:0x（新增 #119–#120：**测试站中国方向经 Cloudflare 回源大面积失败、部署结束后 ≥33 分钟仍复现＝明早 08:00 开测靶的前置风险 🔴**、**可用性取证三处失明：access.log 无 `$host`/无 `$request_time`、客户端中断仍记 200、`pm2 restarts=0` 不代表没停机 🟠**；上一条 17:4x：#114–#118：**回执摘要在浮点度量值上抛＝本机做完云端零交付，修零提交且不在 3.7.2 里、补投四道门全拦 🔴**、诊断归属整体错位一条（第二批复现）🟠、**台账工作树里有一条客户文件名＋人名明文（未提交＝可脱敏窗口）🟠**、"回执生成失败"被界面显示成"语言未完成"🟡、`collision_policy=FAIL_IF_EXISTS` 无消费者待核实 🟡；上一条 09-23 深夜 23:1x：#109–#113 退款并发口径分歧、波次台账"形似行"失聪（修在飞）、**两个清理脚本仍缺省即删＝引信未拆 🔴**、**`release-gate` 的 `mount-audit` 红了也不拦＝假闸 🟠**、**`--only` 匹配 0 项静默 EXIT=0＝任何一道门都能被一个拼错的键名跳过 🟠**）
> 每条带编号、严重度（🔴 blocker / 🟠 major / 🟡 minor）、位置、影响、建议、状态。
> 修复后更新状态，不删除条目。

## #120　可用性取证三处结构性失明：access.log 无 `$host`/无 `$request_time`、客户端中断仍记 **200**、`pm2` 的 `restarts=0` 不代表没停机　🟠 major（判据面，直接决定"谁发的这个码"能不能定案）

- 实测（2026-09-24 22:36–23:00 只读取证，交付件 `总控/回收_20260924/NGFLAP_拖动定案_20260924.md`）：① `/etc/nginx/nginx.conf:40` 只有一行 `access_log …;`（**无自定义 `log_format`**），`grep -rn access_log /etc/nginx/sites-enabled/` **0 命中** ⇒ 五份 server 块共用一份日志且**无 `$host`** ⇒ 状态码不能按站归属（09-24 第 19 条坑仍在）；格式里也**没有 `$request_time`** ⇒ 逐请求耗时不可测。② 全天 `499` **0 行**，却存在两条 `/downloads/…exe 200 137967`（整包 `Content-Length` 是 `12395703`）⇒ **客户端在响应头之后放弃时 nginx 仍记 200**，"源站全 200"不是"客户端拿到了件"。③ `pm2 describe` 的 `restarts 0`／`unstable restarts 0` 在 `stop→start` 路径下会被重设（`created at` 同步改），而 `~/.pm2/pm2.log` 才是停机权威（本轮 22:16:08 Stopping→22:18:46 starting＝158 s）。④ 站点归属唯一可用的路是 `error.log`：它每行自带 `server:`＋`host:`（本轮全天 2 行，两条 502 均 `test.tuyigf.com`）。
- 另一条同族新坑（此前未记）：access.log 第 1 列是**最终用户地址**而非代理地址——本机走公网域名（curl 自报 TLS 对端 = CF 段）时 nginx 记的是本机前缀，源站本机重做同一请求则记源站出口；`set_real_ip_from` 在生效配置里 **0 命中**（只在 `sites-available/tygf.bak_20260728_121621`）⇒ **"peer 是不是 CF 段"不能判这一跳有没有过 CF**。
- 建议（属"改 nginx/改判据"，需 Owner 拍板，本会话未动）：① 加一条含 `$host $request_time $body_bytes_sent` 的 `log_format`（一次 reload，风险低但确是写操作）；② 把"下载健康"定义成 **`http==200 且 size_download==manifest.size`** 两条件（与 [[project-release-line-policy]] 第 18 条"合入≠出厂"同族，这条是"记 200≠拿到件"）；③ 值守脚本判停机只读 `pm2.log`＋`created at`，不读 `↺`；④ 多会话探针加唯一标记（`?c=<会话>-<序号>`）否则 ±15 s 内无法逐条配对。
- 状态：OPEN（刑部 `NGFLAP` 会话登记；未改任何配置）。

## #119　测试站**中国方向经 Cloudflare 回源大面积失败，且与部署窗口无关（交包时仍在发生）** ⇒ 明早 08:00 开测靶可能"站点看着坏了"　🔴 blocker（对外可用性 / 明早开测前置）

- 实测（本机＝客户侧同网络，只读 GET；同时用源站本机/直连 nginx/直连 3001 三路对照）：`22:51–22:56` 与 `23:00:39` 期间 `https://test.tuyigf.com/api/runtime-provenance` **连续 10/10 超时（rc=28，8 s 上限）**，`favicon.ico`、`/downloads/local-assistant-release.json`（446 B）同形；`/downloads/…-3.7.3.exe` 当场拿到 **`http=522`、body 16 B、`t_first=20.28 s`**。而**同一分钟源站侧**：`http://127.0.0.1:3001/…` ⇒ `200 t=0.0025 s`；`https://127.0.0.1/…` 带 Host ⇒ `200 t=0.0637 s`；**源站本机走公网域名** ⇒ `200 t=0.0665 s`（22:53:37，nginx 有该行）；`ping` 0% 丢包 RTT 489–530 ms；`iptables` 无限速规则、`ufw inactive`、内核无 conntrack/SYN 告警、`load 0.00`。⇒ **失败发生在"CF 中国方向 PoP → 新加坡源站"这一跳，应用层零责任**。
- 与既有立案的关系：`总控/日报_20260924.md` 22:3x 段的立案名 `TESTSITE-DEPLOY-WINDOW-FLAP` **名字要改**——部署窗口内源站只贡献了 2 条 502（一次计划内 `pm2 stop→start`，158 s，收敛 22:18:46），其余（522/520/多枚 000 与 1.1↔8.4 s 跳变）**源站全天零行**，且本条证明它在部署结束后 ≥33 分钟仍复现 ⇒ **"源站反复重启或负载抖"这个候选被推翻**。
- **23:0x 复验补一条（不改判，改"全天只有一次停机"的说法）**：`~/.pm2/pm2.log` 显示今天有**两轮** `stop→start`——第二轮 **`23:02:46 Stopping`（三进程同批）→ `23:03:40 starting`＝54 s**，而 `.deploy-commit`/`.deploy-receipt.json` mtime 仍是 22:16:36、`tygf-test-backups` 无新目录 ⇒ **那次不是部署，是有人直接重启了测试站三个进程**（`pm2` 不留操作者，归属**未核实**，需总控问一句哪一地在做）。该 54 s 窗口**零请求到达**（nginx 23:0x 段 8×200／1×403／1×**408**、`error.log` 23:00 后 0 行）⇒ 不产生 5xx、不改 (a)/(b) 归属；但**明早若再出现这种"无部署的重启"，客户侧看到的就是 502**，与链路抖动混在一个形状里。
- 为什么严重：Owner 明早 08:00 的真机开测与助手侧云端交互都走这一条链路；抖动会被读成"产品坏了"，且助手 `serverUrl` 走同一域名的 `/api/*` ⇒ 可能与 [[project-stalled-batch-side-attribution]] 的"灰区 10 批"同因（**待核，本轮未做历史批次的链路回溯**）。
- 建议（只读结论，处置需 Owner）：① 开测前先按 `NGFLAP` ⑨ 第 2 条分诊（源站本机 `curl 127.0.0.1:3001` 一命令定"源站 vs 链路"）；② 若 08:00 仍复现，**唯一不影响客户的止血**是给测试站换一条不依赖 CF 中国 PoP 的入口（或临时把开测机 `--resolve` 直连 80/443——注意本轮实测**443 从国内直连 `time_connect=0` 不通、80 直连 `200`**，直连方案要先解决证书/端口，属新决定）；③ 生产站是否同链路 **未核实**（本单禁访问生产，一次请求都没发）。
- 状态：OPEN（刑部 `NGFLAP` 会话登记；未 restart/reload 任何服务，服务器全程只读）。


## #118　`AI_MEMORY/TASK_LOG.md` 工作树里有一条**客户素材文件名＋真实人名**明文（未提交＝未推送，处置窗口还在）　🟠 major（外泄面，需一次性脱敏）

- 实测（只报计数与位置，本条不复述该串）：`AI_MEMORY/TASK_LOG.md:168`（属 09-20 那条"8 个对象没替换"取证记录，标题在 `:165`）含一个"表格文件名＋人名"组合串；`grep -c` 工作树 **1** / `git show HEAD:AI_MEMORY/TASK_LOG.md` **0** ⇒ **只在未提交工作树里，尚未进任何提交、未被推送**（同文件 worktree 1502 行 vs HEAD 1211 行，说明近几日大量台账本就未提交）。
- 为什么现在报：与既案 [[project-client-material-in-repo]] 同族但**方向相反**——那次的素材已在已推送历史里、只能记账；这次还在工作树，**下次任何人 `git add AI_MEMORY/` 就会把它固化进历史**。台账文件是多会话共写的，谁都可能顺手提交。
- 建议（属数据动作，需 Owner 给钟点；本会话不自行改）：① 由总控或值守会话把 `:168` 的文件名与人名替换为 `<客户稿表格>`／`<联系人>` 占位并保留行号与语义；② 顺手在同一次提交里给 `AI_MEMORY/` 的台账脱敏立一条最小规则（引用素材只用"行数/语种/尺寸/attempt 前 7 位"）；③ 若要长期防呆，可把脱敏探针（7 类＋阳性对照）挂进提交前检查——**注意探针脚本必须外置，命中只报计数**（R6 前科）。
- 状态：OPEN（兵部 `FG-RECEIPT-STALE` 会话登记；未动该行内容）。

## #117　清单声明 `output.collision_policy='FAIL_IF_EXISTS'` 在助手 JS 里**没有第二个消费者** ⇒ 重跑同名交付文件的实际行为未核实　🟡 minor（待核实，影响复发批的重跑验收）

- 实测：`grep -rn collision_policy download/local-assistant/` 只回 `execution-manifest.js`（`:131` 字段清单、`:147` 值必须等于 FAIL_IF_EXISTS、`:245` 常量写出），无任何存在性检查；`grep -rn "FAIL_IF_EXISTS\|exists.*finalPath" scripts/*.jsx download/local-assistant/scripts/` 本轮无命中（**不等于没有**——分发进 PS 的脚本以云端构建件为准，未逐一展开）。
- 为什么要登记：#114 的修装机后必然要"重跑那 12 语"，若已存在的交付文件按策略该失败，用户会看到一个新的错；若静默覆盖，则要确认不产生双份产物。两种都还没证据。
- 建议：出包验收单里补一条"同 attempt 语言重跑 → 观察最终文件名与数量"，或直接把落地检查写进 publish 前（属合同面，需总控批准）。

## #116　助手把"回执生成抛出"显示成"语言 X 未完成"并丢弃 finalPath＝对用户撒谎的那一面　🟡 minor（文案/归类）

- 事实链：`download/local-assistant/server.js:6032-6041` 的 catch 把异常消息磨成 errorCode、`success:false`、`finalPath:null`；前端 `src/components/workbench/execute-step.tsx:1188-1190` **只对 `RECEIPT_NOT_DELIVERED`** 使用双句式"已完成（本机已产出设计文件，云端回执同步中）"，其余码落到 `:1193` 显示"语言 X 未完成：原因码 <磨平滑串>，其余语言继续执行"。⇒ Owner 看到的"明明改成功了却显示失败"是这一格，不是结算层。
- 建议（另单，不进 FG-RECEIPT-STALE 补丁）：把"回执载荷未建／摘要不可复算"一族归入与 `RECEIPT_NOT_DELIVERED` 同等的如实呈现，并将可读码补进 `V15_ERROR_CODE_ZH`；**禁止**顺手做成"默认按成功计"——`server.js:6015-6016` 注释写明 `success` 仍要求 `receiptAccepted` 是防 finish 提前结算的安全闸。
- 状态：**已修（并入 FG-RECEIPT-STALE 补丁，待合入）**——分类见 `batch-error-policy.ts` 的 `RECEIPT_MISSING_ERROR_CODES`，逐码文案见 `local-assistant-client.ts` 的 `V15_ERROR_CODE_ZH`，两个渲染点见 `execute-step.tsx`（执行中与恢复后），守卫＝`scripts/smoke-receipt-honesty.mjs`。未动 `success` 真值与结算面。

## #115　`ExecutionAttemptDiagnostic` 的 attempt 归属整体错位一条 ⇒ "按 attempt 聚合的诊断计数"只能当上限　🟠 major（09-23 立案，09-24 第二批原样复现）

- 09-24 实测（测试站只读）：本批 12 条 `__OBJECTS_0__RENDEREDLEADING_CANONICAL_NUMBER_INVALID` 里，11 条挂在**后继** attempt 名下（每行 `languageCode` 串名一位），本批 ES 名下第一条的 `at=2026-09-23 10:46:42`＋`languageCode=VI` ＝**上一批 VI 的溢出**，本批 VI 自身的终态码继续溢出到下一批。全窗口 seq 无空洞。
- 后果：任何"某语种另有原因／某 attempt 没推"的推断都不成立（09-23 曾用"每人恰好 1 条"否证串名假设，那条否证本身是错的）。用它推归属＝假结论。
- 建议：诊断入库按 payload 内的 attemptId 归属（不是"下一次写入"），或补 `sourceAttemptId` 列并回填校验；在此之前，凡引诊断计数处必须写明"上限、非归属"。
- 状态：OPEN。

## #114　回执摘要在非整数度量值上抛 ⇒ 本机做完、云端零交付、5 分钟后判 STALE（修已成形但零提交且未出厂）　🔴 blocker

- 事实链（2026-09-24 09:22 测试站 12 语批 `cmueuk0e…`，报价 240）：12 attempt 全 `ATTEMPT_ABANDONED_STALE`、`completedAssignmentCount=20/20` 而 `verifiedAssignmentCount=0`、`localReceiptDigest=NULL`、240 行 `RECEIPT_NOT_RECEIVED`（服务端合成诊断行，非助手报的失败）、积分未扣（reservation `released`）。nginx 该批窗口 `heartbeat`39＋`manifest`12＋`accept`12 全 200、`attempt/report` **0 条**、零 409 ⇒ 断在**生成**环节，命中"载荷根本没建出来"的指纹。
- 位置与因果：`download/local-assistant/canonical-json.js:21` 只接受安全整数 ← `receipts.js:53` 对整个 receipt（`:37` 含 `objects`）求摘要 ← `v15-runner.js:104/:107` 的 `finiteOrNull` 只判 isFinite ← 小数源 `scripts/TYGF_V15_Reopen_Verifier.jsx:131`（行距两位定点）与 `:80`（分辨率未取整）。`buildReceipts` 三调用点（`v15-runner.js:231/290/350`）无 try/catch 且抛在 `attachCloudReceipt`（`:1023`）与落盘 `atomicJson`（`:958`）之前 ⇒ 本件 `.json` 与 `.cloud.json` 同时不写。判决侧本身无错：`src/lib/server/execution-batch.ts:941` 的 5 分钟阈值＋`reconcileStaleAttempts`（`:1552`）与观测三波终态吻合。
- 修的状态（重要）：`receipts.js +32/−5` 与 `scripts/smoke-receipt-privacy.mjs +46/−0` **只存在于共享 `worktrees/develop` 的未提交改动**；`git log --all --since=2026-09-20 -- download/local-assistant/receipts.js` 无输出（rc=0，最后触该文件＝`746569e`），HEAD blob 仍是改前 `b7f553f` ⇒ **零 ref 兜底**，一次 `git checkout --`／`git apply -R` 即不可恢复。本机安装包 exe 探针：`toCanonicalReceiptNumbers`、`RECEIPT_METRIC_NUMBER_NOT_CANONICAL` **各 0 命中**、`CANONICAL_NUMBER_INVALID` 1 命中 ⇒ **3.7.2 不含此修**，装了 3.7.2 的机器每次遇到小数行距都会继续零交付（无静默自动更新，须 bump 才有解）。
- 建议：合 `总控/补丁草案_FG-RECEIPT-STALE_20260924.patch`（现覆盖 7 个路径：助手 `receipts.js`、三条测试（`smoke-receipt-privacy` 双 fixture／**新增** `smoke-v15-runner` 端到端小数跑／**新增** `smoke-receipt-honesty` 文案守卫）、`package.json` 两个入口、界面三处 `batch-error-policy.ts`＋`local-assistant-client.ts`＋`execute-step.tsx`）→ 走助手 bump 与出包（3.7.2→3.7.3）→ 装机验收四数：`localReceiptDigest` 非空、`verifiedAssignmentCount>0`、`receipts/<attemptId>.json` **与** `.cloud.json` 同目录都在、该批 `RECEIPT_NOT_RECEIVED` 行数＝0。
- 复验证据：`总控/功能普查/FG-RECEIPT-STALE_回执断链定位_20260924.md` ③④⑤（改前 rc=1 两条／改后 rc=0／`test:batch-row-contract` rc=0／`test:trust-chain` rc=0／eslint rc=0）。
- 补投的技术原判（**评估卡已按 Owner 指示撤销、未落库；四条结论仍有效**，故留此备查）：四道独立 fail-closed 门全拦——① 源件从未生成（抛在 `atomicJson` 落盘前；本机 `receipts/`、`receipts-pending/`、`report-data/` 该批 0 命中）；② 批 `STALLED` → `execution-batch.ts:1285` `BATCH_TERMINATED`；③ attempt 终态 → `:1298-1302` `ATTEMPT_ALREADY_TERMINAL`；④ 即便投进也不结算（`finishExecutionBatch :1801` 把 STALLED 视为已结算）＋无票据重放路径绑宿主（`…/receipt/route.ts:148`）。**恢复只有"出厂＋新建批次重跑"**，而 `createLanguageAttempt :600` 只放行 `RESERVED/RUNNING` ⇒ 界面原地重试会是 `BATCH_NOT_RUNNABLE`（未真机点击）；重跑将**再冻结并在成功时真扣 240**（本笔未扣）＝账务决策，需 Owner 拍（含是否 grant/adjust 补偿）。验收判据已做成可复跑命令并三向实测（坏批 rc=1／已知好批 rc=0／查无此批 rc=1）。
- **Owner 拍板（09-24 17:5x）**：**这批的账不救**——不补投、不追补、让它停在失败态；积分已整笔退回、用户未被扣（代码依据＝`execution-batch.ts:2139-2150`，`actualCredits>0` 才 `commitReservation`，否则 `releaseReservation`）。补投评估卡按指示撤销、未落库。
- **界面这条已并入本补丁（Owner 第 3 项交付）**：新增分类 `RECEIPT_MISSING_ERROR_CODES`＋`isReceiptMissingErrorCode()`（`src/lib/workbench/batch-error-policy.ts`）、四条码的两句式文案（`src/lib/workbench/local-assistant-client.ts` 的 `V15_ERROR_CODE_ZH`）、`execute-step.tsx` 两个渲染点改为按分类出话（**`success` 真值与结算面一律不动**），并加守卫 `scripts/smoke-receipt-honesty.mjs`（挂进 `test:trust-chain`＋独立入口 `test:receipt-honesty`）。账务句只认助手回传的 `settlement.finalStatus==='released'`，不替云端承诺未发生的退款。
- 状态：READY FOR MERGE（补丁草案已交御史复验路径，未自行合入）。

## #113　`release-gate.cjs` 的 `--only` 过滤器：键名与行标签不同名时**匹配 0 项仍 `EXIT=0`** ⇒ 任何一道门都能被一个拼错的键名静默跳过（修在飞）　🟠 major（P0 类，修法已交）

- 事实链（刑部 `533c9856` 在 `worktrees/w1-w2-gate-20260924` @ `c0a5f17` 实测）：过滤分支用 `only.includes('mount')` 去匹配行标签 `mount-audit` ⇒ 键名不同名。改前真实码：`--only=mount-audit` **rc=0 / items=0**、`--only=nosuchkey` **rc=0 / items=0**、**`--only=repo-policy,mount-audit` rc=0 / items=1**（要 2 项只跑 1 项还报绿——最危险的一格）。
- 为什么这是"整类"而不是"一个键"：门禁汇总器的**唯一职责**就是"我确实跑了这 N 项"。一旦"请求数"与"实跑数"可以不相等而不报错，那么**改名、删项、拼错、键与标签漂移**四种事故都会伪装成通过；这与今天全天打的"守卫写了没挂链／扫空打 ok"同一族，只是发生在**汇总器**这一层，杀伤面更大。
- 修法（补丁 `总控/补丁草案_GATE-ONLY-KEY_20260923.patch`，基线 `c0a5f17`，`161/24`，唯一写入面 `scripts/release-gate.cjs`）：① 可用键一律由 `GATES` ＋ 报表项**推导**（`AVAILABLE_KEYS`），不手抄清单；② 键名**必须等于输出行标签**（只保留 `archive → package-candidate` 一个别名，因为它是入参名）；③ 未知键／空清单／匹配 0 项 ⇒ **跑之前**就 `EXIT=1` 并打印可用键；④ 跑完再核 `requested` 与实出行数，不等即 usage 红；⑤ self-test 从 6 格扩到 **19 格**，含两条**真起进程**的端到端负控（纯函数绿不等于 CLI 红得起来）。改后真实码：上述三条全 **rc=1**；真键 `--only=repo-policy` 仍 rc=0；`--only=identity,repo-policy,mount-audit-report` ⇒ `items=3;requested=3` rc=0。
- 破坏性影响（已核）：`--only=mount` 与 `--only=mount-audit` 现在都会红。全仓 grep 除该脚本自身外**无任何** `package.json`／workflow／`deploy/*.sh`／其它脚本引用这两个键或旧行标签 ⇒ 无内部调用方被打断，但人手敲过的口径要改。
- 关联：#112（同文件的"假闸"半边——本包一并定案：改名 `mount-audit-report` ＋ 报表页分区 ＋ **扫描健康度红**；政策四个数仍不拦，因阈值是 Owner 的数，见 #108 那条"等 Owner 给数"）。
- 状态：**修在飞、未进主干**（r1 补丁值守 22:52 实测未送达，今晚不在发布包 ⇒ **排 3.7.4**）。`_r2` 件已在自建干净树重验：主干仍 `c0a5f17`＝r1 基线**未漂移**，`git apply --check` rc=0、真 apply rc=0、`node --check` rc=0；`--only=nosuchkey` **rc=1**＋打印可用键、`--only=repo-policy,mount-audit` **rc=1**、`--self-test` **rc=0/19 格**（含两格真起进程的端到端负控）。全量端到端 `requested=9` 仍**未实测**（新 worktree 无 `node_modules`，跑满会混入环境红）⇒ 见回包 ⑦。

## #112　`release-gate` 的 `mount-audit` 项**红了也不会拦**：只 push 报表行，不计入 `gateRed` ⇒ "挂进门"与"能挡"是两件事　🟠 major（开放，Owner 拍是否升闸）

- 位置（`worktrees/develop` @ `9ceb678`，我实读）：`scripts/release-gate.cjs:352-354` —— `if (!only || only.includes('mount')) { const res = mountAudit(); rows.push(\`mount-audit | EXIT=${res.rc} | ... \`) }`。全文件 `gateRed` 只在 **`:337`**（npm 段）与 **`:349`**（package-candidate 段）增计，`:445` 用 `process.exit(gateRed ? 1 : 0)` 收口 ⇒ **`mount-audit` 的 rc 被丢弃**。
- 影响：这一项报"多少 smoke 没挂链"（将作实测 `smokeTotal=181; smokeZeroMount=27; smokeMountedButNoScript=…`），是**报表**。写进 `release:gate` 九项里会让人以为它是闸——这正是 #111／刑部"守卫零调用方＝等于没有"的同一个病根，只是这次发生在**治这个病的那件工具自己身上**。
- 出处不假：这不是我的推断。将作在 `ZUO-GATE-VERIFY_回包.md` §④ 自陈"该项 rc 恒 0：只报数不拦"；御史在 `御史复验_两件_20260923b.md` ⓪-1 据此把 FG-GATE-ONE 判为**部分通过**。我在 `9ceb678` 上第三次独立复核成立。
- 两个方向（**均未执行**）：**(A)** 让 `mount-audit` 计入 `gateRed`——这是**加判据**，会立刻改变九项门的红绿，必须先按"扫空必红"的口径定阈值（零挂载数 ≤ 多少算红），我不擅自定；**(B)** 明示它是报表（改名 `mount-report`，并从九项计数里剔除），避免下游把它当闸。
- 关联：#110（同族"台账形似行被跳过＝守卫失聪"）、#111（同族"缺省即删的引信没拆"）。
- 状态：开放，待拍板。登记：ZUO-MERGE（合流手，2026-09-23，随 FG-GATE-ONE 合入 `8daabcd` 后被此面暴露）。
- 处置更新（2026-09-23 23:1x，刑部 `533c9856`，W2 定案）：**不升政策闸、改名归位**。补丁 `总控/补丁草案_GATE-ONLY-KEY_20260923.patch` 把它变成 `mount-audit-report`——输出进"报表页"分区、政策四个数仍不计 `gateRed`（阈值归 Owner，见 #108），但**扫描健康度会计红**（挂载面输入缺失／smoke 或 scripts 扫到 0 ⇒ `EXIT=1` 并点名；残缺盒实测 rc=1、补回 rc=0）。⇒ 本条从"假闸"变成"明确的报表＋仪表健康度闸"，中间态消除；若将来 Owner 给阈值，改点已在代码里注明的唯一位置。

## #109　`test:refund-single-winner:143` 要求"32 路并发退款全回 `unknown`"，实测只有 1～3 次回 `unknown`（其余回 `requested`）⇒ 契约口径待拍板，该判据今日仍红　🟠 major（开放，Owner 拍）

- 现象：FOUR-RED 把建单闸打开后（只在隔离库注入 `alipayPaymentsEnabled: true`），红点从 `scripts/smoke-refund-single-winner.mjs:67`（连单都建不了）推进到 **`:143`** `assert.ok(results.every(r => r.ok && r.status === 'unknown'))`。
- 实测（只读探针跑 3 次，`Promise.allSettled` 32 路）：返回分布 `3 unknown / 29 requested`、`1 unknown / 31 requested`、`1 unknown / 31 requested`；**三次库内不变量都成立：paymentRefund 恰 1 行、`outRequestNo` 唯一数 1、状态 `unknown`**（探针件在 `tmp/`，未入库）。
- 判据边界：这条 smoke **从写下那天起从未被执行到**（它一直死在 #106 的建单闸上），所以 `:143` 是**未经实战的期望**，不是回归证据。真正要守的"单胜者"在 DB 层，而 DB 层三次全对。
- 两个方向（**均未执行**）：**(A)** 改 smoke——断"32 路全 `ok` ＋ 恰 1 行 1 号 ＋ `unknown` 计数与越界次数一致"，把竞态浮动写进注释；**(B)** 改实现——"看见在途请求"也回 `unknown`，属**用户可见语义**变化，需产品理由。我倾向 A，但按红线不代拍。
- 关联：#106（同一 smoke 的建单闸，修法已交）、#107（同族"并发判据撞上 SQLite 承载"）。
- 状态：开放，待拍板；今日开窗该条会红（本包如实保留红）。登记：FG-GATE-FOUR-RED（刑部 `533c9856`，2026-09-23）。

## #111　两个清理脚本仍是"缺省即删"（引信未拆完）：`cleanup-review-snapshots.mjs` 整文件无开关、`cleanup-user-profile.mjs` 事务里四条 `deleteMany` 无条件执行，且都由测试站 timer 驱动　🔴 blocker（守卫已交且必红；脚本面待兵部拆）

- 背景：今晚测试站发生过一次**提前删除**——第一版把"安全性"表达成给 `scripts/cleanup-review-snapshots.mjs` 传 `--dry-run`，而**该脚本不认这个旗，缺省即真删**（御史第 8 轮 §④，兵部自报未隐瞒）。现版把安全性改成 `ExecStart` 不带 `--apply` ＋ `cleanup-learning-evidence.mjs` 缺省 dry-run，但**引信本身没拆**。
- 实测（本包新守卫 `scripts/check-cleanup-defaults.mjs`，`npm run test:cleanup-defaults`）：`f82b339` **rc=1，候选文件=4 含删除点文件=3 未受闸删除点=6** ⇒ 点名 `scripts/cleanup-review-snapshots.mjs:24,25`（无任何开关，直接 `purgeExpiredReviewSnapshots()` / `purgeExpiredSmartReviewRequests()`）与 `scripts/cleanup-user-profile.mjs:8-11`（`$transaction` 四条 `deleteMany`，无条件）。`cleanup-learning-evidence.mjs` 判为**已受闸**（`--apply` 型缺省不删）。
- 新尖仍不合格：`9e73e5b` 给 `cleanup-review-snapshots.mjs` 加了 `dryRun`，但极性是 **`dryRun = argv.includes('--dry-run')`＝选择加入**（不给旗照删）⇒ 守卫对该 SHA 单独跑一次仍 rc=1，原因栏指名"安全性写在旗上而不是缺省上"。
- 影响：这两支都由 systemd timer 驱动（90 天／7 天那两条线）。**"要不要删"的决定权在缺省里，不在调用方** ⇒ 任何一次 unit 重写、`ExecStart` 漏写开关、或有人手动跑脚本，都会立刻真删；这正是今晚事故的重演路径。
- 挂载状态（按 Owner §3 口径）：**只挂 `package.json:23` 入口，不进门序**（`grep -c cleanup-defaults scripts/release-preflight.cjs` = 0）；将来插入点＝`scripts/release-preflight.cjs:102` 之后。⇒ 现状"有守卫但无人调"，属已知取舍，不是完成态。
- 建议（脚本面归兵部，本包不抢）：两支都改成**缺省不删**（`const apply = argv.includes('--apply')` ＋ 早退），拆完引信后复验 rc=0 再把 `gateFor('cleanup-defaults','test:cleanup-defaults')` 入门序。判据自身边界（跨函数的闸不识别、`deleteRaw`/级联删不在词表、其它命名的删除脚本不在扫描面）见回包 §⑥-10。
- 状态：开放（守卫已交且必红；引信待拆）。登记：FG-GATE-FOUR-RED（刑部 `533c9856`，2026-09-23）。

## #110　迁移波次台账里"形似但守卫解析不出"的行会被三项检查整体跳过 ⇒ 守卫打绿而部署闸已改；已改为逐行解析并对形似行报行号　🟠 major（修在飞，附A 待合）

- 事实链：`scripts/check-repo-policy.cjs` 的台账判据（FG-GUARD2 引入）用一次 `matchAll(/^(\d{14}_[a-z0-9_]+) ([0-9a-f]{64}) (\S+) (\d+)$/gm)` 取行 ⇒ **凡正则不咬的行，行数/钉入/算术三项检查一起跳过**。而部署脚本侧是 `while read -r migration_name expected_sha object_specs expected_total` 的**位置读取**，一行对象列表里带空格（`tbl_a, tbl_b 2`）守卫看不见、shell 照消费。
- 实测：同一条注入（波次行对象列表内带空格）在 GUARD2 原样下 **rc=0（静默失聪已复现）**；打本包附A 后 **rc=1** 并点名 `deploy/deploy-test-release.sh:283`。附A 的 11 类双向开火全符合，含"合法追加＋守卫同批钉入应仍绿"那一格（`legacyWaveRows=8/8`）。
- 连带自曝（同族第 10 格）：我第一版附A 把 `unparsableWaveLines` 存成数字又对它 `.join()` ⇒ **只在红路径抛 `TypeError`，退出码仍是 1、看起来"能红"，但 metrics 与实际发现全部丢失**；是 GUARD2 自带的配套件 `scripts/smoke-repo-policy-fire.mjs` 把它从 15/15 打成 8/15 才暴露。⇒ 结论入案：**新断言必须同时被"红路径仍能报数"这一格覆盖**，只测"能变红"不够。
- 位置：`scripts/check-repo-policy.cjs`（附A `补丁草案_FG-GATE-FOUR-RED_附A_ledger防空转_基座GUARD2_20260923.patch`，21/4，**基座必须是 GUARD2/GATE-ONE**，净基线上 `--check` 实测 rc=1）。
- 状态：修在飞（附A 未合）。登记：FG-GATE-FOUR-RED（刑部 `533c9856`，2026-09-23）。

## #106　`test:refund-single-winner` 与"发布安全态开关默认 false"冲突 ⇒ 该退款单赢家判据永不通过　🟠 major（修法已交，残留见 #109）

- 现象：`npm run test:refund-single-winner` 在 `f82b339` 净树 rc=1，断在 `scripts/smoke-refund-single-winner.mjs:67`（`assert.equal(created.ok, true)`，`false !== true`）。态A/态B 各跑 1 次，两次全红。
- 真实根因（只读探针复现前置序列取到返回码）：`createCreditOrder` 回 `PAYMENT_METHOD_UNAVAILABLE`/409。闸口 `src/lib/server/credit-orders.ts:252-261`——`alipayPaymentsEnabled` 为 false 时支付方式默认 `manual_qr`，而 `manualQrFallbackEnabled` 为 false 就拒绝。默认值：`src/config/featureFlags.ts:25`（`alipayPaymentsEnabled: false`）、`:31`（`manualQrFallbackEnabled: false`，注释明写"内测宣传版安全态要求 false"）。该 smoke 只覆盖两个 flag（`:101` 的 `{creditPacksEnabled, alipayRefundEnabled}`）。
- 影响：① 这条守卫"单订单只允许一个退款在场"的核心判据**实际从未被执行到**（第 116 行之后的断言一条都没跑）；② 该入口挂在 `ci2` 面上 ⇒ 第二份工作流若真触发就会红；③ `test:release-qualification` 串行第 2 段即断，其后面 7 段永不执行。
- 判据依据（为何不算产品回归）：同族 `scripts/smoke-refund-close.mjs:141,146` 已按正解写——补 `alipayPaymentsEnabled: true` 并显式传 `paymentMethod: 'alipay_page_pay'` ⇒ 是这条 smoke 落后于兄弟件。
- 建议（**不自行执行**，因涉安全态）：改 smoke（照兄弟件补两个 flag）为正解；**不得**为了让 smoke 绿而放开 `manualQrFallbackEnabled`——那撞发布安全态铁律与 PROJECT_CONTEXT 红线。
- 状态：**修法已交**（FG-GATE-FOUR-RED 主件：两臂——未开通必 409 ＋ 隔离库内注入假 flag 让主路径真跑；支付 flag 默认值一字未改，并加断言反向钉住）。**残留**：路径跑通后暴露的 `:143` 契约分歧 → 见 **#109**。登记：FG-GATE-INVENTORY（刑部 `533c9856`，2026-09-23）；修法：FG-GATE-FOUR-RED（同日）。

## #107　`test:active-attempt-db` 的十路并发在 SQLite 隔离库上必然 `P1008` 超时 ⇒ "活跃 attempt 单赢家"这条判据不可验证　🟠 major（开放）

- 现象：`npm run test:active-attempt-db` rc=1 **四次全红**（态B 3 次 + 态A 1 次 ⇒ 非 flaky）：`PrismaClientKnownRequestError: Socket timeout`，`code: 'P1008'`，抛出点 `src/lib/server/execution-batch.ts:753` 的 `$transaction`，调用形 `scripts/smoke-active-attempt-db.mjs:81` 的十路 `Promise.all`。
- 影响：与 #106 同型——**被测的正是"并发下只有一个赢家"，而承载体在并发下先崩**，所以这条判据当前既不能证真也不能证伪；它在 `ci2` 面上，CI 若真跑同样拿不到结论。
- 归因边界：本包只归到"环境（SQLite 单写者 + 十路并发）"，**是否同时含产品侧长事务问题：未核实**（未逐条复算持锁时长与事务边界）。
- 建议方向（择一，未执行）：把并发数降到 SQLite 可承载并显式测"降级为串行 ⇒ 判据失效"、或该判据改跑在真 Postgres/MySQL 承载上、或给 harness 配 `busy_timeout`＋重试并明确它测的是"锁语义"还是"单赢家语义"。
- 状态：开放。登记：FG-GATE-INVENTORY（刑部 `533c9856`，2026-09-23）。

## #108　测试入口大面积零挂载：`package.json` 118 条 `test:*` 里 84 条不在任何挂载面 ⇒ 门禁"全量绿"是 34/118 的绿　🟠 major（开放，需 Owner 给门槛数）

- 实测：口径 A（npm 入口）——118 条 `test:*` 中 **84 条**在四处挂载面（`RELEASE_GATES`、`security-ci.yml`、第二份工作流、qualification 串行段）里 0 次出现；分布 `ci2` 28 / `ci1` 1 / `preflight+ci2` 2 / `preflight+ci1` 1 / `ci1+ci2` 2 / 无链 84。
- 另一口径 B（smoke 文件）：`smokeTotal=181`（态A）/`182`（态B）、`smokeZeroMount=27`、`smokeMountedButNoChain=68` ⇒ **68+27=95 个 smoke 文件实际永不执行**。两口径分母不同，**并列不合并、不换标**。
- 交叉验证：本包一档实跑里 `test:assistant-script-distribution`、`test:batch-receipt-outbox-replay`、`test:learning-phase0..4` 等**全部属于那 84 条**——即"红着也没人知道"的那一批；反之已入链的 34 条本轮无一条新红。
- 关联事实：`scripts/release-gate.cjs` 的 `mount-audit` 项当前**只报数不拦**（rc 恒 0），因门槛值未定；本条要给的就是这个数。
- 建议：Owner 定一个可执行门槛（例："零挂载入口 84 → ≤40"或"95 个永不执行的 smoke → ≤30"）后把 `mount-audit` 改成 fail-closed；否则门禁绿只覆盖 34/118。
- 状态：开放，等门槛数。登记：FG-GATE-INVENTORY（刑部 `533c9856`，2026-09-23）。

## #102　过期审查快照因引用面漏查 `ReadinessEvidenceSnapshot` 而整事务回滚 ⇒ 同事务的脱敏一并失效，含正文的过期行永远删不到　🟠 major（修在飞）

- **事实链（2026-09-23 夜，`worktrees/develop` HEAD `f82b339`，逐行独立核实）**：`src/lib/server/review-snapshot-retention.ts:110` 起在**同一事务**里做三件事——数引用（`:117-122` 只查 `billingQuote` 与 `photoshopJob`）、删决策事件、再按 `:130-141` 决定"整行删除"或"仅脱敏 `tableJson`"。但 schema 里还有第三个引用方：`prisma/schema.prisma:980` 的 `ReadinessEvidenceSnapshot`（模型起于 `:959`）对 `reviewSnapshot` 是 **`onDelete: Restrict`** ⇒ 该分支选"整行删除"时外键直接拒，**整个事务回滚，连本可以成功的脱敏一起失败**。
- **放大机制（队头饥饿）**：候选查询 `:85-88` 用 `expiresAt asc` + `take: boundedLimit(limit)`，被拒的行走不掉 ⇒ 下一轮同一批仍在队头，游标不推进。测试站实测：179 行快照中 **144 行已到期**，其中 **74 已脱敏 / 70 仍含正文 / 83 被引用**（口径与计数来源 `总控/回收_20260923/FG-CLEANUP-TIMER_回包.md` §⓪）。
- **影响**：隐私政策承诺的"审查快照 7 天"在**含正文的那 70 行上未兑现**，且该清理任务已在每 10 分钟跑却**零进展**（每轮 failed 计数不降）。属**对外承诺与运行事实不一致**，LEGAL-1 F-3 的加重项。
- **建议（不在本轮自行改）**：引用面补齐为"三张引用表任一存在即不得整删，只能脱敏"，或把 `Restrict` 改成与业务一致的语义并在删除前先清子表——**属合同/数据语义变更，须与法务口径同批审**。
- **状态**：🔧 **修在飞**，执行人＝兵部，单 `FG-SNAP-FK`。登记人：吏部（本活由户部转交；户部会话 `waiting-user` 未醒，不留天窗）。

## #103　测试站 `tygf-test-user-profile-cleanup.service` 的 `WorkingDirectory` 指向已消失目录 ⇒ 常红，隐私政策"90 天"在测试站实际未在跑　🟠 major

- **现象（2026-09-23 实测，只读取 `systemctl show` 退出码与状态字段）**：`status=200/CHDIR`，工作目录不存在 ⇒ 单元每次触发都失败，长期常红。
- **为什么不是"无到期所以 0"**：`scripts/cleanup-user-profile.mjs:8-11` 覆盖的四类（漏斗事件 / 反馈 / AI 用量 / run 摘要）按 `retentionExpiresAt < now` 删除；测试站常红 ⇒ **根本没执行**。生产侧该单元 `Result=success` 但 `deleted` 全 0，属"确无到期"还是"没在删"**待查**（未核实）。
- **影响**：隐私政策承诺的"使用与事件指标 90 天"在测试站不成立 ⇒ 修正 LEGAL-1 F-3 的旧结论（原记"90 天与 30 天是兑现的"）。
- **建议**：改 `WorkingDirectory` 为当前发布目录并在部署脚本里加一条"timer 单元存在且能 chdir"的自检；顺带把 `EnvironmentFile` 后列不覆写前列这个坑记进部署检查（本项目踩过）。
- **状态**：⏸ 待执行，执行人＝兵部，单 `FG-TIMER-CHDIR`。

## #104　排版学习图层 365 天承诺**全仓无按保留期的删除路径**（缺执行体，非缺调度）　🟠 major（缺口，修在飞）

- **实测（`f82b339`）**：`LearningTypographyLayer` 486 行、**0 行到期**（最老到期日 2027-09-07），且两个清理脚本都不碰这张表——`scripts/cleanup-learning-evidence.mjs` 全文只操作 `learningEvidenceSignal`（`:25` 取、`:47` 删）与 `learningAuditLog`（`:48` 记账），typography 字样出现 **0** 次；`scripts/cleanup-user-profile.mjs:8-11` 也不含它。
- **影响**：隐私政策 365 天承诺属**结构性未实现**（与 #102、#103 不同：那两条是"有代码但跑不通/没人调"，这条是"根本没有删除语句"）。
- **建议**：**T1 先交三态表**——全仓每条 `retentionExpiresAt` 承诺 × 执行体 × 调度各一列，逐项标"有/缺"。可能再冒出 N 张同样裸奔的表（未核实，待 T1 出数）。补执行体时按"缺省安全"写（见 #105 规则）。
- **状态**：⏸ 缺口待建执行体，执行人＝兵部，单 `FG-TYPO-DELETE`。

## #105【事故登记 · 已发生】向未打补丁的部署副本传 `--dry-run`，该副本不认此开关 ⇒ 静默真删　🟠 major（已发生，规则已定）

- **事实（2026-09-23 夜，测试站）**：为验证"只数不删"，对一个**尚未包含该开关解析逻辑**的部署副本传了 `--dry-run`。旧副本把它当未知参数忽略 ⇒ **实际执行了删除**：提前删掉 1 条已过期审查请求 + 13 条往日预算锁。**无生产写入、无用户素材受影响**（计数与范围来源 `总控/回收_20260923/FG-CLEANUP-TIMER_回包.md`）。
- **结论入规则（后续所有清理/迁移类单的硬门槛）**：**安全性必须用"缺省行为"表达，不得依赖"传一个开关才安全"**——即：未带明确确认参数时**默认不写不删**，要真删须显式传 `--apply`（或等价确认）。本轮之前我们反过来（默认删、传 `--dry-run` 才不删），所以一个版本差就把事故概率放大成必然。
- **连带纪律**：对**部署副本**（不是候选树）跑任何数据面命令前，先核对该副本的 HEAD 是否含所依赖的参数解析；不确定就在候选树里跑，或先只读探一次。
- **状态**：📌 已登记并转规则；受影响范围已量化如上，是否补数据/是否告知内测用户属 Owner 决定（未处理）。

## #100　用户按界面提示完成"选择归属"反而把自己锁死：`V15_FRAGMENT_ROW_CONFLICT` 抛出后唯一出口是"重新扫描"　🟠 major（真机现场复现）

- **现场（2026-09-21，Owner 在测试站 `a2cc60e` + 助手 3.7.0，母版 `6877-亚马逊A+详情页.psb`，日语）**：第 3 步出现 10 项「必须处理·相邻译文行被多个对象争夺」，界面文案明确要求"选择译文确认后…其余对象按同一组译文自动完成"。Owner 对两条**同原文**的层各点一次「选择归属」后，界面抛：`译文行 "source:wb-d51beb0d:1" 被多个确认绑定同时消费（M-7@1|*Compatible…@1 与 M-7@1|*Compatible…@3）`，**唯一按钮是"重新扫描"**。
- **根因链（已核 file:line）**：`src/lib/trust-chain/binding-core.ts:1000-1006` 判争夺只比较 `globalCompositeOwners.get(rowId)` 的 owner 是否为**不同图层**，**不比较这些图层原文是否相同**；而 A+ 详情页天生有手机端与 PC 端两套画板、同一句文案各一个层（现场配对：`M-8/组211`↔`PC 8/组211` 的 `SmallRig CO-F1 Clip-On VND Filter for iPhone 18 Pro…`；`M-7`×2↔`PC-7` 的 `*Compatible with bumpers…`）⇒ 原文逐字相同、写入结果必然唯一，却被判"真歧义"要求人工。用户照提示点两次 ⇒ 两个 forced 绑定消费同一行 ⇒ `:830-836` 直接 `throw BindingCompileError`。
- **佐证"必须点"而非"已自动闭合"**：点之前"后台已替你闭合 2 个"，点击过程中变 5，**重新扫描后又掉回 2** ⇒ 那 3 项闭合依赖人工点击，与 `:1040-1042` 注释声明的"其余争夺图层自动闭合"不一致。
- **待确认（不得当已证实）**：① 该 throw 在**生产调用方有无 catch**——全仓仅 `scripts/smoke-binding-compiler.mjs`、`scripts/smoke-reconcile-gate-p2.mjs` 两处测试捕获点，未找到生产 catch ⇒ 实际是语言级失败/整批失败/500 未定；② `:1040-1042` 声明的 execute 自动闭合**未验证代码路径**（若真不闭合，则问题从"多余点击"升级为"execute 漏写争夺层"）。
- **建议**：与"同原文层不判争夺"豁免**合并为一个合同变更**（同一处代码链）：豁免生效后用户不再点第二次，死锁自然消失；同时给 forced 冲突加可撤销出口（取消某条确认），不能只给"重新扫描"。**先例依据**：`AI_MEMORY/CHANGELOG.md:333` 已做过镜像的一半（多候选拼接写入结果一致时自动绑定），那次没治"多个等价层面对同一个候选"。
- **状态**：🆕 登记，已派发给 S2 会话（任务书 `任务书_S2_闸门死锁与同原文豁免_20260921.md`）。

## #101　版式例外把"译文与原文逐字相同"的层报成需人工处理（现场 3 条，含 1486% 荒谬值）　🟡 minor（纯降噪）

- **现场（同上，2026-09-21 截图）**：32 条"译前版式例外·仍需人工处理"里，头两条与第七条的原文与译文**完全相同**却各带一个"保留原文（不替换）"按钮：`VS → VS` 报**最宽行约 1486% 原宽**、`VS → VS` 报 **975%**、`ID 6877 → ID 6877` 报 **190%**。
- **根因（已核）**：`src/lib/workbench/overflow-estimator.ts:155-156` 的 `widthRatio = widestLineEm(target) * fontSizePt / width` —— **分子是估算、分母是原稿实测墨迹宽，两者不同源不可比**；且**没有 `target === source` 的短路**（grep `target === source|targetText === sourceText` 零命中）。显示侧 `src/components/workbench/layout-exception-list.tsx:113` 直接把它乘 100 输出。
- **建议**：加一条守卫——归一化后 `normalizeText(target) === normalizeText(source)` 的层**不产出版式例外**。纯降噪，不改任何裁决与计费。
- **两条禁止顺手做**：① 不要重新引入朴素溢出公式——Owner 已于 2026-09-17 主动删除 `linesFitFrame`（`lineCount×leading×1.333` vs ink height 不可靠）；② 不要把 `FALLBACK_FONT_LANGUAGES`（`overflow-estimator.ts:83-84`，现 `Set(['KO','TH'])`）扩到日语——注释明写那是 Owner 决定"接受 PS 兜底，只做信息性提示"，扩语言属产品决定。
- **状态**：🆕 登记，已派发给 S3 会话（任务书 `任务书_S3_对外展示降噪与反抄重构_20260921.md` 第 2 块）。

## #98　生产服务器 SSH 口令以明文内嵌在 `~/.ssh` 下 101 个临时脚本里，其中 36 个会 dump 生产 `.env`、54 个疑似对生产做写操作　🔴 blocker

- **实测（2026-09-21，`tmp/ps-clinical-20260921/audit-ssh-creds.mjs`，只统计不打印明文）**：`~/.ssh` 共 110 个历史脚本，**101 个内嵌同一个明文口令**（sha256 前 8 位 `09e0b521`），目标主机 `43.134.175.26` / 用户 `ubuntu`。
  - **36 个**会把 `.env` 或环境变量读出来（`check_env.py` 第一条命令即 `cat /var/www/tygf/.env`）；另有 `decrypt_prod_token.py`（142 行）、`debug_password.py`、`fix_password*.py`、`restore_password.py`。
  - **54 个**含疑似生产写操作（`systemctl`、`pm2 restart/delete`、`sed -i`、`passwd/chpasswd`、`iptables/ufw`、`tee /etc`、`rm /var`），例：`deploy_prod.py`、`fix_nginx*.py`、`secure_admin_v1..v4.py`、`correct_fix.py`、`final_fix_v1..v3.py`。
- **违反本项目铁律**：AGENTS.md「密钥纪律——密钥只放环境变量或受控凭据存储，禁止明文进文档/提交」；且这 54 个脚本意味着**生产被一次性脚本改过 nginx/pm2/sshd/口令，无审计、无回滚、无发布身份**，与「生产处置必须取得明确授权」「助手变更走版本纪律」直接冲突。
- **已扩大的暴露**：本轮为定位问题 `head` 过 `check_env.py`，**该口令已进入本次会话记录** ⇒ 无论文件如何处理，**口令本身必须作废**。
- **建议顺序（先换钥匙再关门，避免 101 个脚本同时打断部署）**：① 生成密钥对并装公钥（`~/.ssh/setup_ssh_key.py`、`upload_key.py` 可复用其做法）；② 验证密钥登录可用、把仍在用的部署路径改走密钥；③ 才在 `sshd_config` 关 `PasswordAuthentication`；④ 届时 101 处明文自动失效。**切勿先改口令**——会让所有历史脚本当场失效且下次部署卡住。
- **另需处置**：生产 `.env` 里有 `ADMIN_PASSWORD`（长度 8，明文口令）⇒ 后台口令以明文存 env 且仅 8 位，建议改哈希存储 + 强口令。**本条原记有该口令的 sha256 前缀，已删除**：长度 8 的低熵秘密，48 位前缀就是一个离线验证器（猜一次中不中微秒可判），记前缀≈记口令本身。纪律：**低熵口令只记"已更换 + 日期"，不记任何哈希**；≥32 位随机秘密才可用 12 位前缀做等值核对。另：该值与另两把应用层秘密同存于一个本地归档，详见 `总控/外泄清点_20260921.md`（未入 git、本仓无远端）。
- **状态**：🟡 **部分处置（2026-09-21 本轮）**——① 已完成：生成 ed25519 部署密钥（私钥仅留本机 `~/.ssh/tygf-deploy-20260921`），公钥**追加**进服务器 `authorized_keys`（3 行 → 4 行，未改动既有条目，幂等检查过），并用**纯密钥（禁口令、禁 agent）重连验证通过**。⇒ **顺带查出：那 3 行里本就有历史公钥，密钥通道早就建好了，只是从没人关掉口令登录——缺的不是方案，是收尾。** ② 已完成（本轮全部远程取证均走新密钥）。③ **未做**：关 `PasswordAuthentication` 属生产 sshd 写操作，配错需控制台救，等 Owner 明确授权。④ 未做。**未删任何文件**：原计划归档 `~/.ssh` 下 110 个脚本已取消——并行会话今日仍要用它们做 8→0 验收，且 ③ 一旦完成这 101 处明文自动失效，无需删除。本轮在生产上的写操作**仅限 authorized_keys 追加一行**。

## #99　生产站 `EXECUTION_TICKET_SECRET` 与 `INVITE_CODE_SECRET` 是同一个值（测试站不同）⇒ 跨安全域密钥复用 + 环境配置漂移　🟠 major

- **实测（2026-09-21，服务器侧全量扫描 `sweep-secret-reuse.py`，只有 哈希+变量名 回传、值不出服务器）**：生产 `tygf` 14 个敏感变量中**恰有 1 组**同值复用——`EXECUTION_TICKET_SECRET == INVITE_CODE_SECRET`（sha256 前 12 位 `9237454222a7`）；测试 `tygf-test` 16 个敏感变量**零复用**。⇒ **不是系统性混乱，就是这一对被复制粘贴了**，修复面很小。
- **复发防护已落地**：新增 `worktrees/develop/scripts/check-env-secret-uniqueness.mjs`（只输出变量名与哈希分组，绝不输出值）。自测通过：三条同值正确归一组、干净样例零误报（端口 465 / region / DATABASE_URL 未被误判为密钥）；已验证门禁会红（dup 样例退出码 1）。**待接线**：尚未接入 `release:preflight`（本轮未碰发布前置四道门）。
- **为什么值钱**：这两把钥匙守的是不同安全域——执行票据门（Photoshop 执行 + 积分冻结的授权凭据）与邀请码/激活域。同一 HMAC 密钥跨域使用，意味着**任一域被泄露或存在可构造消息格式的碰撞时，另一域的签名也可被伪造**；且测试站配置与生产不同 ⇒ 现有测试**永远覆盖不到生产这个组合**。
- **待确认（不得当已证实利用）**：两处验签的输入格式是否允许跨域重放，需要读 `verifyTicket` 与邀请码签发/校验的实现后判定；本条只证明"密钥相同"这一事实。
- **建议**：① 生产单独重生 `INVITE_CODE_SECRET`（或 ticket，择一），走配置变更 + 重启，**先确认没有存量未过期票据依赖它**（有则需先让旧票据自然过期或做双钥过渡）；② 加一条部署前门禁：对 `.env` 内所有 `*_SECRET` 做**值去重检查**，重复即拒绝上线（成本极低，可复用本轮脚本逻辑）；③ 把测试站与生产的密钥集合差异纳入发布前 checklist。
- **状态**：🔴 未处置（改生产密钥属生产处置，需 Owner 明确授权）。

## #95　云端分发的 .jsx 引擎脚本在用户机明文落地（含中文注释与历史版本）　🟠 major

- **实测（2026-09-21，本机 `E:\软件\图译工坊本地助手\.tygf_script_cache`）**：助手成功跑过一次后，分发件以**明文**落盘，`head` 直读即见源码与中文注释（例：`TYGF_V15_Reopen_Verifier.jsx` 头部 "// T-0114：抑制打开期间的对话框（缺字体/链接/新版等），避免静默阻塞"）。
- **泄露范围 = 仓库源码全量**：逐文件比对（node 计算，缓存件 vs `worktrees/develop/download/local-assistant/scripts/`）——`MultiLangStudio_Replacer_v2.9-beta.jsx`、`TYGF_V15_Readiness_Scanner.jsx`、`TYGF_V15_Preparation_Scanner.jsx`、`TYGF_V15_Thin_Executor.jsx`、`Reopen_Verifier(b12fcdd4)` **共 5 个"换行不同、内容逐字相同"**；差异仅为 `distribute/route.ts:51` 按 LF 归一后算 sha。
- **还漏历史版本**：缓存目录内容寻址且不清理，同一脚本多版并存（实测 `TYGF_V15_Reopen_Verifier.jsx` 同时存在 `335984fa`(3.6.60 代) 与 `b12fcdd4`(今日 14:58)）⇒ 外流的是**带版本序列的实现演进**。
- **威胁模型**：分发接口本身有鉴权（`route.ts:93-96` 要 `assistantToken`=machineId+运行码，无效 403；另有按 installId 限流与脱敏审计），所以风险**不是**"路人可下载"，而是 **每一个持激活码的用户在自己机器上跑一次即得全部引擎源码**（客户即对手）；任何在用户机上运行的 agent 读这些文件零成本。
- **为何现有加固挡不住**：exe 侧的 pkg/bytecode + `generated/MANIFEST.json` 内容哈希 + 启动自校验，保护的是**打进 exe 的部分**；jsx 走"云端分发+落盘缓存"这条通道，**恰好绕过全部加固**。
- **jsxbin 的定位（已查证，修正初稿）**：Adobe 官方支持把 ExtendScript 编译成 `.jsxbin`（AE Scripting Guide 原文：可用 ExtendScript Toolkit 导出二进制版，扩展名 `.jsxbin`，同时警告"may not be usable with all of the scripting integration features"）。**有可直接进 CI 的无头编译器**：npm `jsxbin`（runegan，v2.3.0，MIT），自带从 Adobe VS Code ExtendScript Debugger 抽出的原生模块 `esdcorelibinterface.node`，不依赖已停更的 ESTK GUI，`npx jsxbin -i <file> -o dist/`，支持 glob 与 `#include`。⇒ **本条建议① 不必手写剥离器，jsxbin 顺带就剥注释**。但它**不是加密**：`AngeloD2022/jsxer`（C++，AGPL-3.0，324★，最后 push 2026-09-10，正重写为 Rust）一条命令即可 jsxbin→可读 JS，另有十余个反编译 fork/移植；Adobe 曾对原版仓库发 DMCA 而 fork 仍存活。⇒ **定性：成本抬高器（挡住直读与右键看源码），不是防线**。V8 字节码/bytenode 对 ExtendScript（ES3 引擎，无 V8）不适用；`javascript-obfuscator` 的 `--target` 只有 browser/node，无 ES3 目标，输出含 ES5+ 构造跑不动。
- **建议（成本由低到高，均可独立停手）**：① 分发前 **jsxbin 化 + 前置 ES3-safe 压缩**（Terser `ecma:5`、保留 `#target`/`#include` 行）——0.5~1 天，**性价比最高**，直接堵住"装了助手就读到中文注释与任务号"；② 分发内容按 `installId` 派生密钥静态加密 + 短 TTL（拿到也过期/换机解不开），**保留落盘**（见下条硬约束）；③ **裁决算法（`binding-core`）服务端化**，助手只提交扫描观测、接收裁决——唯一能真正改变"跑一次就读走核心逻辑"的路径；④ 价格表/行数上限/禁则集/字号映射等**可反推规则的常量**改服务端下发（业界共识里唯一真正保护商业机密的一档）。
- **硬约束（勿提"不落盘"）**：`server.js:976-977` 已明文记录"绝对不用 `DoJavaScript`（COM BSTR 传大脚本会卡死 PS）"，且 `server.js:945-962` 的 wrapper 本身就是 `File.open → read → eval(_code)` ⇒ **执行通道要求必须有磁盘文件**。真要不落盘只能改 RAM 盘或换通道，风险远大于收益。项目现有 `script-fetcher.js:132-137`、`server.js:1411-1416` 已是"落盘+用完删"形态，**只差内容不再是明文**。
- **范围修正（2026-09-21 跨会话复核并入，详见执行方案第 5 节 R1）**：明文里**不止业务规则，整条匹配/对齐求解器也在客户端**——`MultiLangStudio_Replacer_v2.9-beta.jsx:718 findTranslation`（strict/whitespace/format/linebreak/substring/ambiguous 全梯）、`:781-783 requiresPreflightDecision`、`:786-793 confusableSkeleton`、`:795 singleSubstitutionOnly`、`:807 findSuggestionCandidate`；全仓 grep `findTranslation`/`matchMode` 在 `src/` 与 `contracts/` **零命中**。⇒ 建议③"裁决服务端化"**若不连匹配梯一起搬，敞口基本不变**；"核心资产未下发"这一说法**不成立**，不得对 Owner 这样表述。
- **状态**：🟡 **部分处置（2026-09-21 本轮）**——可行性已真机实证（PS 22.0 执行 jsxbin 通过；同一构造测试明文版与 jsxbin 版**逐项一致**；五个可分发脚本全部编译通过、零注释残留）；构建步与门禁已落地为两个**新增未跟踪文件** `scripts/build-jsxbin-assets.mjs`（含 `--check` 门禁，已三次自攻验出真实退出码 1/1/0）与 `download/local-assistant/scripts-compiled/`（产物+清单），**发布线已跟踪文件零改动**。**未切换分发端**——因 `script-fetcher.js:108` 按下载字节算 sha 校验、`smoke-photoshop-script.mjs:14-22` 断言 `.jsx` 源文本字面量，不同步升发布身份与助手构建会导致批次 fail-closed（#74 同族）⇒ 切换须与发版同批。敞口本身**仍然存在**（分发的还是明文）。

## #96　"exe 零明文"这一说法未经实测，且实测能扫出可读 JS 片段　🟡 minor（待测后定级）

- **实测（2026-09-21，node 字节扫描 `图译工坊引擎.exe` 38,364,416 字节）**：`function normalizeText` 命中 **4 次**、`SCRIPT_DISTRIBUTE`/`tygf_script_cache`/`TYGF_PS_HANDSHAKE_V1`/`app.displayDialogs` 各 1 次、`MultiLangStudio_Replacer` 3 次、`createScript` 8 次、`Photoshop.Application` 17 次。对照组：`DoJavaScriptFile` 与 `LayerKind.TEXT` **0 命中** ⇒ 核心 jsx 内容确实不在包里（与 #95 的"走分发通道"一致）。
- **影响**：项目内多处把"exe 零明文"当已成立结论引用。实测表明**至少存在可读 JS 片段与字符串常量**（`normalizeText` 是 `binding-core` 的函数名，说明裁决算法在客户端侧有可读痕迹）。"能还原到什么程度"未测 ⇒ 不能继续当结论用，也不能当作已破。
- **踩坑留痕**：第一次探测用了 `strings`，本机**该工具不存在**（`command not found`），得到的"全 0"是假阴性、差点被写成"exe 干净"。⇒ 二进制取证一律用 node 显式读字节，或在方案里固化 `--check` 类可复核工具。
- **建议**：① 做一次真实还原尝试（pkg/bytecode 反编译成本评估），据结果定级；② 把"零明文"口径改写为可证伪的表述（"不分发 .jsx 明文进包"/"不含用户素材"）；③ 与 #95 建议③ 合并评估——若裁决算法本就服务端化，此条自动降级。
- **状态**：🆕 登记（未测、未处置）。

## #97　PS 会把文字层名同步成内容 ⇒ 交付件再当母版提交时台账身份漂移，零测试覆盖　🟠 major（待确认）

- **缘起**：对方（公司机手工改语言的 AI）档案记录——按图层名配对全部失配，因为 Photoshop 会把文字层名改成层内容。
- **我方对应机制**：`download/local-assistant/scripts/TYGF_V15_Preparation_Scanner.jsx:206-209` 的 `ledgerEntryId = 组路径 name@兄弟序号`（`server.js` 注释亦说明图层名可含中文/空格/任意符号，故只约束非空与长度，见 `binding-core.js:172-178` 的 `assertLedgerEntryId`）。
- **风险路径（推断，未实测）**：替换后交付件的层名即**译文** ⇒ 用户把交付件当新母版提交（二次换语言、返修、A→B→C 链式换语）时，全台账身份随内容漂移 ⇒ 历史排除/人工确认决定与 `templateFingerprint` 是否仍能接上，**我没有找到任何测试覆盖这个场景**。
- **建议**：先写复现测试（同一稿 A→B 交付件再作为母版扫描，比对 `ledgerEntryId` 集合与已确认/已排除项的承接率），据结果决定是否需要内容无关的稳定层身份（如持久化图层 ID + 首次扫描指纹双锚）。**不要在实测前改身份算法**——它是台账与账务的锚。
- **状态**：🆕 登记（待确认，不得据此改代码）。

## #82　生产发布线无 hotfix 通道：预检硬门 branch==main，但 main 与 develop 同点　🟡 minor

- **位置**：`scripts/release-preflight.cjs`（eeb994c 版）"expected branch main" 门 × D0 合流后 main==develop 同点。
- **影响**：2026-09-20 试走"从生产点 `eeb994c` 拉 hotfix 只带激活修复上生产"（分支 `hotfix/activation-permanent-20260920`，`fcdef8a`），打包被门拦停。main 已含未验收的 #74/#75/#79 ⇒ 生产只能整线发或回退 main（违铁律）。当晚靠数据侧转永久绕过了紧急性。
- **建议**：为 hotfix 定义合规通道——① `release-preflight` 支持 `--allow-branch <name>` 并要求 Owner 明示授权（带审计留痕），或 ② 约定 main 上打生产点 tag，hotfix 从 tag 拉分支且预检接受"tag 祖先 + cherry-pick 清单核对"。择一实现后补 smoke。
- **状态**：🆕 登记（候选 `fcdef8a` 保留在 `worktrees/hotfix-activation-perm`；生产部署并入 8→0 验收窗口整线发）。

## #81　package-lock 被本机 npm 11 再生成后裁掉服务器 npm 10 必需条目（第二次复发）　🟠 major → ✅（待防呆）

- **位置**：`package-lock.json`（本机 npm 11.6.2 再生成）× 服务器 `deploy-test-release.sh` 的 `npm ci`（npm 10.9.8）。
- **影响**：`9ecb5cc`（L0 普查，加 ag-psd/fontkit devDeps）把 `@emnapi/core|runtime@1.11.3`、`@swc/helpers@0.5.23` 等可选平台条目裁出 lock，候选 `8c96845` 部署在 npm ci 阶段被拦（pre-switch 止损，现网无损）。**同一坑 `4bb6936`（09-16）已修过一次**——凡本机跑过任何 `npm install` 类命令就可能复发。
- **修复**：2026-09-20 以 `npx npm@10.9.8 install --package-lock-only` 重建（`a462fc4`），测试站部署恢复。
- **建议（防呆，未实施）**：① 在 `release-preflight` 加静态门：lock 内必须含 `@emnapi/runtime`/`@swc/helpers` 嵌套条目（或比对 lock 生成器版本）；② `.npmrc` 固定 `lockfile-version`/团队 npm 版本；③ 提交含 `package-lock.json` 变更时，打包前跑一次 `npx npm@10.9.8 ci --dry-run`。
- **状态**：✅ 已修复（a462fc4）；防呆门待排期。

## #39　smoke-prepare-check-closure 正则误报（HEAD 已存在，非 trust-chain 链）　🟡 minor → ✅

- **位置**：`scripts/smoke-prepare-check-closure.mjs:53`（`/masterFileStat[\s\S]{0,200}?browserPreparationSummary/`）。
- **修复**：2026-09-13 改为函数体语义断言（`browserPreparationSummary` 不含 `masterFileStat|masterPath|masterFile`），实跑通过。
- **影响**：合法代码 `summary: browserPreparationSummary(...)` 紧跟在 `masterFileStat?.mtimeMs` 快路径判断之后，被正则误判为"文件 stat 进入浏览器摘要"→ 该 smoke 在 HEAD 即 FAIL；不在 `test:trust-chain` 链内，不阻塞标准门禁。
- **建议**：断言语义化——直接断言 `browserPreparationSummary` 返回对象不含 stat 字段（函数体或返回值检查），而非源码邻近正则。
- **状态**：✅ 已修复（2026-09-13，随 `cbcf36c` 部署；语义断言替代邻近正则并实跑通过）。

## #40　smoke-review-evidence-persistence 过时断言（HEAD 已存在）　🟡 minor → ✅

- **位置**：`scripts/smoke-review-evidence-persistence.mjs`（重复 decisionId 期望 P2002 拒绝）。
- **定位**：代码自 `d8070f0` 起按 decisionId 保序去重（对旧客户端 bundle 免疫），不再触发唯一约束；原断言是过时测试，非真实重绑定漏洞。
- **修复**：2026-09-13 更新为去重合同断言（新 requestId 新建快照、savedDecisions=1、单条事件）；projectId 重绑定冲突断言保留且通过。随 `cbcf36c` 部署。

---

## FREEZE-20260912 — 卡点与核心最小集新证据（待修）

- generated构建一致性FAIL：binding-core.ts:568–577含×→x，generated/binding-core.js:429–437不含；--check exit1，LF规范化也不匹配清单。待固定候选后重建、同提交/发版/真机验证。
- local-assistant-client.ts detectAssistant:362、fetchTicket:185、runPrepareCheckBatch:1348缺AbortSignal；受控挂起实测，不代表已复现用户现场。
- 原方案C2单独移除missing无法令scopeNeedsConfirmation=true（prepare-check-summary.ts:137固定false），且漏prepare-batch-core.ts:126–140的权威聚合合同；需重写范围确认而非仅改blocking列表。
- v15-runner.js:741–759非连续成功对象1/3、completed=2时仅认1，3漏认；缺证据禁止slice兜底，待合同修复。
- 本机3.6.39/expired vs本地3.6.40合同，明确UPDATE_REQUIRED；未核验当前线上合同。旧5294报告220/324同文和12个PSB链接缺失为现有文件事实，不证明删除、PS内容或实际收费。
- 交付及反例见根outputs/project-audit-20260912-1142/20260912_卡点诊断与核心最小集_对抗审查执行方案.html。未部署、未更改业务状态。

## AUDIT-20260912 — 全项目审计新风险（待修，未部署）

- 证据报告：`outputs/project-audit-20260912-1142/report.html`，配套 `inventory.json` 与 `verification.json`。源码基线 develop `7ee5cb8` + T-0118 未提交修改，远端 `2fad331`。
- H1（高，dirty）：助手所有 HTTP 409 被永久化并移除 pending/inputs，但 `BATCH_CAPABILITY_CHECK_FAILED` / `BATCH_FEATURE_FLAG_OFF` 可恢复。`server.js:2091–2097,2764–2765`；能力门 `batch-execution-mode.ts:184–191,241–254`。隔离函数探针已确认误分类，未做现场 HTTP 复现。
- H2（高，dirty）：STALLED 先查询后 finish，事务写入前未重新验证无在途/活动时钟；`execution-batch.ts:1678–1719,1915,1971–1982`。并发风险静态推导，未复现。
- H3/H4（高，HEAD 已有）：accept CAS 未检查 status，已 FAILED 的 DISPATCHING 可被迟到接受；reaper CAS 未绑定 heartbeat/租约版本，云端释锁不等于本地停执行。`execution-batch.ts:1004–1047,1564–1575`；`server.js:4716,4766–4771`。静态推导。
- H5（高，HEAD）：实际运行 `check-repo-policy.cjs` 退出 1，三项旧迁移正则与当前 deploy-test 脚本失配；不是 GitHub Actions 现场查询。
- H6/H7/H8/M1：远端批准 SHA/CI 未绑定发布收据；生产先改运行库后 build、数据库人工回滚；两套生产环境策略矛盾；测试 stop 忽略失败与非单步目录切换。均为源码级发现，未执行部署或触碰线上。
- G1：活动目录与记忆漂移；实测 9 套 common dirs、42 个 Git 工作目录。所有风险均待 Owner 决定后修复；本轮没有修改业务代码、删文件或开启开关。

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

## #38　助手 REOPEN 阶段卡死无回执（已修复：重启孤立上报）　🟠 major → ✅
- **位置**：`download/local-assistant/v15-runner.js`、`execution-journal.js`、`server.js`；`src/app/api/local-assistant/execution-attempts/[id]/abort/route.ts`（新）。
- **根因**：启动恢复链只把孤立 journal 标本地终态（`reconcileUnfinishedJournals` + `attemptRuntime.terminal`），**不向云端补发失败回执**；journal 也未持久化云端上下文 → 云端 attempt 永远 RUNNING。
- **处置（T-0113 #38，助手 3.6.33）**：journal 持久化 `cloudContext{installId,jobId}`；启动 `reportInterruptedAttempts` 逐已授权 origin 上报 `POST .../execution-attempts/[id]/abort`（assistantToken 鉴权、仅本机归属、`ATTEMPT_INTERRUPTED_ASSISTANT_RESTART`、幂等、fencing 覆盖）；失败仍由服务端 reaper 兜底。
- **验证**：`smoke-batch-interrupted-abort`（A1 终态化+锁释放 / A2 幂等 / A3 他机 403 / A4 坏令牌 403）GREEN；批次全量 24/24 + trust-chain；3.6.33 发布检查全过；Test 部署后 abort 路由存活（400）、reaper 幂等 0/0。
- **状态**：✅ 已修复并部署（T-0113 P2，2026-09-11）。

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
- **2026-09-12 凭证防护核查（午间审计更正证据边界）**：
  - **覆盖有限，不得推导“从未泄露”**：早间查询了主仓库指定路径的跟踪/历史、三个 ZIP 的成员列表与有限备份目录，未发现对应文件名。未扫描全部 Git 历史内容、所有归档或外传渠道，未核验 provider 吊销；此前“凭证从未进入 git 与任何归档”结论撤回。
  - **指定文件忽略检查通过**：6 份 `.env` 的 check-ignore 命中；根容器新增 `.gitignore` 后，key/ 下两个 CSV 与两个 site-access 文本均被忽略。普通误添加防护已补齐；ignore 不等于加密、不防强制添加或目录拷贝。根仓库没有 remote 不能证明无外泄。
  - **原件保留**：key/ 两个 CSV、两个 site-access 文本、六份 .env、两个 PEM 均未删。变量非空及长度不证明密钥有效；未比较 PEM 与 env 内容等价，有限文件名引用搜索不能证明无人使用，不据此建议安全删除。
  - **备份与用户决定**：已创建 `safety-snapshots/凭证归档_20260912.rar`，包含上述 12 份原件；密码文件仍同目录。用户明确“先不要删除”，不得擅自删除或移动原件、归档和密码。若两者一起被复制，归档密码没有独立保密隔离作用。
  - **午间全目录元数据审计**：命中 14 个凭证命名文件（含归档及密码），没有读取内容。报告 `outputs/project-audit-20260912-1142/report.html`；不把元数据扫描当作泄露审计。

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
