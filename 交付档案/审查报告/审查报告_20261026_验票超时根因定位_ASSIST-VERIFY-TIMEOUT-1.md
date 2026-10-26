# 验票超时根因定位（任务 ASSIST-VERIFY-TIMEOUT-1，只读）

签发：2026-10-26 20:2x｜执行会话：本地助手调整（`0e24ae40`）｜原任务书 `总控/任务书_ASSIST-LOG-DEAD-1_助手事件日志停写调查_20261026.md` 已按签发会话改题

## 先说结论（这对你下一步意味着什么）

**"扫描一直失败、扫到一半中断"不是云端慢，也不是耳朵聋，而是你这台机器到 Cloudflare 那一段网络在坏，加上助手把每一次只读轮询都做成"必须回云验票、单跳只等 10 秒"。** 两件事叠在一起，就成了：一次轮询 10 秒拿不到答复 → 再试一次 → 30 秒总预算烧完 → 助手回浏览器 403 → 扫描中断；中断期间那把"忙碌锁"一直握着（实测握了 12 分 51 秒），所以你重点扫描只会得到"助手正忙"。

所以：改代码阈值不是第一刀，**先把这台机器的链路修稳**是最便宜的一刀；真要产品侧动手，改的是"只读轮询不该每跳都回云验票"这一条。

## 一件：阈值在哪，最坏烧多少秒

- 单跳上限 10 秒：`worktrees/develop/download/local-assistant/ticket-verify-schedule.cjs` 里 `FIRST_ATTEMPT_TIMEOUT_MS = 10000`，重试跳 `RETRY_ATTEMPT_TIMEOUT_MS = 22000`，至多 2 跳 `MAX_ATTEMPTS = 2`，总预算 `TOTAL_BUDGET_MS = 30000`。
- 助手侧默认走这套分级：`server.js:2744`（`TICKET_VERIFY_ATTEMPT_TIMEOUT_MS = 10000`）、`server.js:2785-2794`（不传预算就用 30 秒总预算；显式钉死单跳上限的执行类路由退化为"只跳一次"）。
- 最坏总耗时＝**30 秒**（首跳 10 秒 + 重试跳 min(22000, 30000−已耗) ＝ 20 秒）。日志实测到边界值：今天 20:00:49 那条 `GET /v1.5/preparation/status/... -> 403 code=VERIFY_TIMEOUT elapsedMs=30010 attempts=2`。

## 二件：这个超时是对谁超时（慢还是断）

先复跑签发会话给的那批读数，逐字对上（方法＝node 按换行切非空行，窗口取 UTC 11:58:24–11:58:59.999）：14 行、VERIFY_TIMEOUT 8、slow hop 6、verify retry 4、verify rejected 4，elapsedMs 取值 3077/3576/10003/10004/10006/10009/10015/10017/12317/14329/15031/16357。**注意形状**：这 8 条首跳超时里有 4 条重试跳成功了（2.3–6.4 秒答上来），这一窗内没有一条真正判死。

再看链路（同一台机器、同一时刻，真退出码取不接管道的 `$?`；`curl -w` 里没有 exit_code 这个变量）：

- 对 `https://test.tuyigf.com/api/local-assistant/ticket/verify` 连测 10 次：7 次 0.74–1.17 秒返回 403（GET 探路，只做计时），3 次 **rc=35**（TLS 握手直接失败）。
- 对照 `https://test.tuyigf.com/api/runtime-provenance` 连测 10 次：6 次 0.75–1.46 秒 200，4 次 **rc=35**。
- 20:28 复测分协议族：**IPv4 连续 4 次全部 rc=35（TLS 起不来，0.19–0.38 秒即失败）**；**IPv6 连续 4 次全部成功，TLS 0.39–0.59 秒、首字节 0.79–1.37 秒**。
- 更坏的一形也抓到了：20:11:45 `[ticket] verify rejected reason=VERIFY_UNREACHABLE: read ECONNRESET elapsedMs=18227 attempts=2`，同一毫秒浏览器侧那条轮询拿到 403。

**定性：IPv4 到 Cloudflare 是"断"（TLS 握手 100% 起不来），IPv6 是"能通但会卡会被人复位"。** 助手（node）优先走 IPv6，所以它踩的是那条会卡、会被 RST 的路。

## 三件：谁在 19:58 触发（nginx 定案）

- 你这台机器的助手是唯一调用方：测试站 nginx 里 19:55–20:15 这 20 分钟 `ticket/verify` **158 条，全部 200**，来源 IP 只有一个 IPv6 `2408:8256:3884:17fd:...`，与本机 `netstat` 里那条已建立连接同一 /64 前缀（本机就是发起方）。
- 浏览器侧同窗口还在猛发取票请求：`POST /api/local-assistant/ticket` **139 条**。
- 全天 `ticket/verify` 330 条里 167 条集中在 19:00–20:15；非 200 只有 9 条 403。
- **源站不慢**：服务器上直连自家应用 `http://127.0.0.1:3000/api/runtime-provenance` 5 次全部 200、0.002–0.007 秒；服务器自己走公网 URL 回自己 5 次 0.24–0.84 秒；nginx `error.log` 里 `upstream timed out` **0 条**（`grep -c` 实测 0，正控＝同法数当天 verify 请求得 330）；`pm2` 三个进程 online、重启计数 0、load 0.04、CPU 1.5%。
- 助手自己也在这段干活：`engine.log` 20:12:08 之前那两条是 `2026-10-26T11:59:17.040Z [busy] acquire phase=* attempt=-` 与 `2026-10-26T12:12:08.366Z [busy] release`（＝本地 19:59:17 起、20:12:08 放，**握锁 12 分 51 秒**）。
- 一处口径要挑明：nginx 只记"答完"的时刻（`log_format` 里没有 request_time），所以"158 条全 200"能证明**请求到了源站且最终答了**，不能证明它们答得及时。我按秒看了 19:58:05–19:58:35 只有 3 条完成，而助手在这 35 秒里发了 8 次首跳＋4 次重试——**差的那几次在源站日志里没有对应完成记录，卡在哪一跳未核实**（要么停在 Cloudflare 边缘，要么就是本机这条 IPv6 连接被复位）。

## 四件：只读操作到底能不能不验票

- 助手侧**没有**"只读操作降级路径"这个词意义上的实现：`authorizePreparationScan`（`server.js:3107-3122`）只要请求头带 `x-tygf-ticket` 就必须回云 `verifyTicket`；只有"未打包 exe ＋ beta ＋ 本机 serverUrl"的本地一体化开发旁路才免票（`isDevelopmentBypass`，`server.js:3120-3121`），你现在用的是安装包＋公网测试站，**这条路天生走不到**。
- 轮询状态也一样要票：`authorizePreparationState`（`server.js:4091-4105`）——只要带 Origin 就先 `isAllowedOrigin` 再走 `authorizePreparationScan`，即每跳一次回云验票。它里面的 `internalTokenValid` 免票分支要求**没有 Origin 头**，只有助手内部调用才满足。
- 助手侧没有任何"刚验过的票短时间内复用"的缓存：按 `verifyCache|verifiedTicket|ticketGrace|recentlyVerified|verifyMemo` 在本机 `server.js` 里 `grep -n` 得 **0 命中**（正控＝同一工具在 `server.js:2744` 命中 `TICKET_VERIFY_ATTEMPT_TIMEOUT_MS`）。
- 你提到的 `src/lib/server/ticket-replay-window.ts:13-19` 把 `preparation_scan` 列进只读 30 秒幂等窗口——那是**云端收到票之后**怎么处理重复票，救不了"票根本没送到云端"。这次就是这么死的：链路卡住 ⇒ 云端看不见 ⇒ 窗口再宽也没用。
- 浏览器还放大了这件事：每一次状态轮询都先向云端取一张新票再让助手验（`src/lib/workbench/local-assistant-client.ts:1531` `fetchTicket(undefined, 'preparation_scan')`），于是一次扫描的轮询就产生"N 次取票＋N 次验票"。20 分钟里取票 139、验票 158 次是这么来的。
- 铁律守住的口径：**"超时就算通过"不属可选方案**——那是静默降级。本轮也没做任何降级动作，全程只读。

## 五件：可选修法与代价

- 方案 C（**先做这个，最便宜**）：修本机链路。动作＝换 4G 对照跑一次；把 IPv4 的 TLS 失败查出来（本机 7890 端口有代理在听，DNS 也被本机拦了一层：`node dns.resolve4/6/CNAME` 三个都 `ECONNREFUSED`）；需要公网入口时把隧道重连上（旧隧道 PID 12672 已不存在，`Get-Process` 实测 GONE）。**不用重出 exe、不改代码**；风险：链路是外部条件，可能自己好也可能自己坏，不能当永久修法，只当止血。
- 方案 A：抬单跳阈值（10 秒往上抬）。**必须重出安装包**（3.7.28→3.7.29，本项目没有静默自动更新，升级＝换安装包），要走三段轨。代价与坑：浏览器侧对这条轮询只等 15 秒——真值是常量 `LOCAL_API_TIMEOUT_MS = 15_000`（`src/lib/workbench/local-assistant-client.ts:187`），不是注释里的说法；助手单跳一旦抬过 15 秒，**浏览器先断，原因送不上来**（这条取舍 `server.js:2741-2743` 已写明，但它写的指针 `local-assistant-client.ts:100` 已经漂了——那一行现在是别的注释，正确落点是 `:187`）。风险：改了阈值不等于少一次回云，只是把失败推后。
- 方案 B：改"只读轮询不必每跳回云验票"。方向有两选一——① 助手侧给已通过验票一个很短的复用窗口（安全语义变更：票据一次性原则要重新界定，必须 Owner 明令，并按合同变更纪律核"归属/回执"两层是否受影响）；② 浏览器侧改成一次取票多次轮询、或让轮询走"不带 Origin 的内部通道"。②不动安全语义，**同样要重出 exe**（前端在助手包外，但验票逻辑在助手侧；纯前端改动可随测试站整线走，不必单独出包）。风险：①若做成"超时也算通过"即踩红线，直接不可选。
- 方案 D（节奏）：这三件都不该单独催一次发版。建议随下一条整线（多稿工作台／排版浮窗已在测试站待验）一起 bump 3.7.29；本轮**未出包、未部署、未碰生产、支付开关保持关闭**。

## 我这一路还顺手证伪/更正的东西

- 原任务书的前提不成立：事件日志**没停写**（我 20:00—20:11 三次采到 size 246,425 → 251,096 → 255,626 B、mtime 20:11:45，且行内时间戳一路推进到 20:11:45）。它本来就只在被拒/重试/慢跳时落盘（`server.js:3125` 上方注释原文「事件持久化日志：4xx/5xx 拒绝落盘」）⇒ 安静＝没失败。任务书里"21:35 之后不再写入"那个 21:35，实为 `.tygf_failures` 目录与其最新文件 `2026-10-25T13-35-44-744Z-scan-3a8e1fff.json.sent` 的时刻（本地 21:35:44）——把别的册子的时间当成了日志的时间。
- 那份失败包本身给了另一个独立原因：`code=PHOTOSHOP_COM_UNAVAILABLE`（错误 429：ActiveX 部件不能创建对象），engine 侧同刻 `durMs=759186`（12 分 39 秒）——也就是说 10-25 那次扫描是 PS 自动化不可用，跟今天这批验票超时不是同一件事。
- 另有两笔敞口记在案：助手当前配置的服务器地址仍是本机回环（`/ping` 回显 `pendingReceipts.count=4`、`lastErrorCode=ECONNREFUSED`、hint 点名 `http://localhost:3000`；`engine.log` 今天 17:44 也自己抱怨过一次），所以有 4 条回执送不出去；`assistant-events.log` 里没有轮转件（同目录只有 `engine.log.1`，2,097,255 B／10-22 起），即事件日志目前不轮转、只长（现 255 KB，磁盘无关紧要：E 盘剩 243.2 GB）。

## 证据与纪律

- 全程只读：没改助手代码/配置、没重启或结束任何进程、没删文件、没部署、没碰生产与支付开关；`node scripts/doctor-testsite-assistant.mjs` 按你的提醒只当健康读数（它给的 VERIFY_TIMEOUT=88／slow_hop=76 与我独立统计同向），未拿来当根因。
- 未核实清单：① 那几次"助手发了、源站没完成记录"的请求到底停在 Cloudflare 边缘还是本机；② 19:59:17 那次 `busy acquire` 的触发者是谁（浏览器还是助手内部），nginx 无 request_time、engine.log 只给时刻；③ IPv4 TLS 失败的具体成因（代理／驱动/中间盒／DNS 拦截哪一层）。
