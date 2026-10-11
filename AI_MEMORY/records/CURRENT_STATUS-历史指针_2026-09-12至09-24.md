# CURRENT_STATUS 历史指针存档（只增不删）

> 建档：2026-09-26 19:2x，治理三令·令一乙-1（指针律）＋乙-2（现状类文件只减不增）＋执行件 3。
> 用途：承接 \`AI_MEMORY/CURRENT_STATUS.md\` 移出的日期指针节与过期基线节，**原文照录、不回改、不删除**。

> 本件由 `AI_MEMORY/CURRENT_STATUS.md` **原文整段移入**（治理三令·令一乙-1 指针律＋乙-2 现状类只减不增；Owner 2026-09-26 19:1x 令生效、总控长槽 19:2x 执行执行件 3）。
> 移入内容**一字未改、未删**；原文件中以指针行替代，指针位置见本件末"去向"。
> 移入时刻实测：2026-09-26 19:27:50；移入行数=163／字节=31219。

---
## 2026-09-24 23:0x 指针：测试站"部署窗口抖动"定案＝**502 归源站（一次计划内 158 s 停机），522/520/多数超时归 Cloudflare，且交包时（23:00:39）仍在复现**

- 一句话根因：源站侧全天只有 2 条 502（`pm2.log` 22:16:08 `Stopping` → 22:18:46 `online`，158 s，`restarts 0`、无 OOM、nginx 未被碰）；其余码在源站日志里**一行都不存在**（CF 专属码 520–530 全天 0 行），而同一分钟源站本机走公网域名 `200/0.0665 s` ⇒ 失败在 **CF 中国方向 PoP → 新加坡源站**这一跳，**应用层零责任**；总控"源站反复重启或负载抖"的候选**被推翻**，立案名 `TESTSITE-DEPLOY-WINDOW-FLAP` 建议改指"链路抖动"。
- **对明早 08:00 开测的直接影响**：开测前先分诊一条命令（源站本机 `curl http://127.0.0.1:3001/api/runtime-provenance` ⇒ `200/0.00x s` 即"源站好、锅在链路"）；**首页 403 与 `/downloads` 200 都不能当健康判据**（口令门 `return 403` 在 `proxy_pass` 之前；`/downloads` 是 nginx `alias` 直发，两者都不经 Node）；拉安装包必须断言 `size_download == manifest.size`（记 200 也可能只发出 1.1%＝`137,967 / 12,395,703`）。
- 交付件：`总控/回收_20260924/NGFLAP_拖动定案_20260924.md`（281 行：逐条配对表 17 行、三档定案、三态 4/6/5，另有 §⑩ 收窄追加）；新登记 **#119 🔴**（回源抖动＝开测前置风险）、**#120 🟠**（access.log 无 `$host`/无 `$request_time`、中断仍记 200、`pm2 restarts=0` 不代表没停）。
- 未核实（不写成结论）：生产站是否同链路（本单禁访问生产，零请求）；样本"22:32 整包 200"走的是源站还是 CF 边缘缓存；回源失败的物理层原因（云上安全组未查）。
- 现场：`worktrees/develop` 开工 `porcelain`=**2**、交包=**2**（同一组他手在制品），HEAD 仍 `f056a8d`；本件服务器全程只读、未 restart/reload、未 push。

## 2026-09-24 17:0x 指针：测试站"本机改成功、云端记失败"定案＝回执摘要在浮点度量值上抛（断在**生成**）；修已成形但**零提交且不在 3.7.2 里**，补丁草案已出待御史复验

- 批次 `cmueuk0e…`（09-24 09:22 本地，12 语／报价 240）：12 attempt 全 `ATTEMPT_ABANDONED_STALE`、每语本机 `20/20` 已做完、`verified=0`、`localReceiptDigest=NULL`、240 行合成 `RECEIPT_NOT_RECEIVED`、**积分未扣**（reservation released）。nginx 该批窗口 heartbeat/manifest/accept 全 200、`attempt/report` 0 条、零 409 ⇒ 载荷根本没建出来（不是投不出去）。
- 修的状态：`download/local-assistant/receipts.js +32/−5` 与 `scripts/smoke-receipt-privacy.mjs +46/−0` **只在共享 develop 工作树里以未提交形态存在**（HEAD blob 仍是改前 `b7f553f`、`git log --all --since=2026-09-20` 无输出）；本机安装包 exe 探针 `toCanonicalReceiptNumbers`/`RECEIPT_METRIC_NUMBER_NOT_CANONICAL` 各 **0 命中** ⇒ **3.7.2 不含此修**。⇒ 下一步是**合入＋bump 出包（3.7.2→3.7.3）**，不是再查代码。
- 本件交付：`总控/功能普查/FG-RECEIPT-STALE_回执断链定位_20260924.md` ＋ `总控/补丁草案_FG-RECEIPT-STALE_20260924.patch`（现 8 路径：接出的 `receipts.js`＋`smoke-receipt-privacy.mjs`，新写的 `smoke-v15-runner.mjs` 端到端小数跑、`smoke-receipt-honesty.mjs` 文案守卫、`package.json` 两入口、界面三处）。红→绿已实测（改前 rc=1 两条／改后 rc=0；`test:batch-row-contract` rc=0；`test:trust-chain` rc=0）。
- 纠一条前提：这批**不在本机跑**（本机 engine.log 与状态目录 0 命中；`executionHostDigest` 前 7 位 `2e117a8` vs 本机 09-22 批 `dcbf37f`）⇒ 本机侧一手证据未取。
- 新登记：**#114（🔴 浮点断链）**、#115（🟠 诊断归属错位一条）、#116（🟡 界面把回执生成失败显示成"未完成"）、#117（🟡 `collision_policy=FAIL_IF_EXISTS` 无消费者待核实）、**#118（🟠 台账工作树里有一条客户文件名＋人名明文，尚未提交＝可脱敏窗口）**。
- **Owner 拍板（17:5x）**：**这批的账不救**——不补投、不追补、停在失败态；积分已整笔退回、用户未被扣。补投评估卡按指示**已撤销**（四条技术结论并入报告 ①⑦⑩ 与 #114 备查）。
- **界面如实说已并入本补丁（Owner 第 3 项）**：新增分类 `RECEIPT_MISSING_ERROR_CODES`（`src/lib/workbench/batch-error-policy.ts`）＋三条码两句式中文（`local-assistant-client.ts`）＋`execute-step.tsx` 两个渲染点按分类出话（**结算与 `success` 真值不动**，积分句只认 `settlement.finalStatus==='released'`）＋新守卫 `scripts/smoke-receipt-honesty.mjs`（挂进 `test:trust-chain`，5 条负控全 rc=1）。补丁现 8 路径／353 行；门：row-contract、trust-chain（29 passed）、receipt-honesty、tsc、lint 全 **rc=0**。
- 验收靶子（可复跑，三向实测 坏批 rc=1／已知好批 rc=0／查无此批 rc=1）命令原式见报告 ⑩。

## 2026-09-23 23:1x 指针：门禁汇总器的假绿整类已修（W1＋W2，`GATE-ONLY-KEY`），补丁待合流手验

- **W1**：`release-gate.cjs` 的 `--only` 过去拿 `mount` 去匹配名为 `mount-audit` 的项 ⇒ **拼错键＝静默通过**（实测 `--only=nosuchkey` rc=0/items=0；`--only=repo-policy,mount-audit` rc=0/items=1）。现改为：可用键由 `GATES`＋报表项**推导**、**键名必须等于输出行标签**、未知键／空清单／匹配 0 项 ⇒ **跑之前就 rc=1** 并打印可用键，跑完再核 `requested` 与实出行数。self-test 6 格 → **19 格**（含两条真起进程的端到端负控）。
- **W2 定案**：`mount-audit` **改名 `mount-audit-report` 并归位报表页**；政策四个数（`scriptsNoChain=110` 等）**仍不拦**——阈值是 Owner 的数（#108 口径），我自造就会让门常红、逼出绕道。但加了**扫描健康度红**（挂载面输入缺失／smoke 或 scripts 扫到 0 ⇒ rc=1 并逐条点名；残缺盒实测 rc=1、补回实测 rc=0）。"名字像闸、行为是报表"的中间态已消除。
- **基线与工作面**：develop 已 `c0a5f17`（含 3 行别人在飞）⇒ 刑部**自建 detached 干净树** `worktrees/w1-w2-gate-20260924` 取数，未写 develop；该树无 `node_modules`，故 `tsc/lint/contracts/trust-chain` 记 **NOT RUN**（不拿环境红冒充门禁红），全量端到端 `requested=9` 未实测。
- 交付：`总控/回收_20260923/GATE-ONLY-KEY_回包.md` ＋ `总控/补丁草案_GATE-ONLY-KEY_20260923.patch`（基线 `c0a5f17`，`161/24`，唯一写入面 `scripts/release-gate.cjs`；24 行删除逐行核过＝未删断言）。登记 **#113**，#112 已追加处置更新。⚠ 破坏性：`--only=mount`／`--only=mount-audit` 从此必红（全仓 grep 无内部调用方；已在回包 ⑥ 通知合流手 `dddd104d`）。

## 2026-09-23 指针：**主干 7 笔到 `c0a5f17`（ZUO-MERGE）**，五门全绿；但 🔴 **含 2 笔「待重验」⇒ 开窗基线未成立**

> **22:2x 二次更新（本条为准，下面第一段里的"6 笔／`9ceb678`／出包差两件"是第一阶段值）**：
> - 第 7 笔 **`c0a5f17`＝ZUO-QUIET-R3（将作）** 已合（总控 22:0x 补令；锚点 `总控/回收_20260923/御史复验_第9轮_20260923.md:10` ⓪-2「件一＝通过」）。⇒ **`test:fold-no-report-loss` 由 `FAIL (13)` 转 rc=0**（`折叠点=16 R1=0 R2=0 R3=0 夹具=ok`）⇒ **`release:preflight` 第 6 门不再挡打包**，走的是刑部倾向的 (i) 补齐标注，**没有降档判据、没有摘门**。整链在干净树重跑五门仍全 **0**（见回包 ②b）。
> - 🔴 **Owner 定佤（值守 D-4 之后）**：`8daabcd`（FG-GATE-ONE，实为**部分通过**）与 `ae21bcc`（BASELINE-RED，实为**不封驳、B 案未落地**）两笔 commit 把"认证件的裁决"写成了"这两件自身的裁决"⇒ **保留两笔、不回退、不 amend**，但**定向补验通过前不计入 3.7.3 开窗依据**。⇒ 现在的准确说法是：**主干可用，开窗基线未成立，差一次定向补验。**
> - 合流手新规矩三条（已全量执行）：① 复验依据要带**文件名＋行号**全称锚点；② 待重验件不计入开窗依据并在台账四处标注；③ **合每一笔前先把要引的那句裁决 grep 出来看对象名**——我对七笔回溯执行的结果是**五笔本就正确、两笔错**（核对表在 `总控/回收_20260923/ZUO-MERGE_回包.md` ⑬）。
> - 一句仍成立的旧结论：**助手的成对窗不能省**（`8b01c1d` 改了助手源码、发布身份与安装包未动，`check-release-identity` 不读源码 ⇒ 它不会替你红）。
> - 未动候选：`FG-LEARN-WIRE`（户部，通过）／`W-OUT`（`官制.md:34` 通过未合）——本轮未点名；**兵部 FG-SNAP-FK（P1）未复验 ⇒ 不合**。
> - 一条撞面警告：刑部的 `…附B_package-json合并件…patch` 已被覆盖，打在 `c0a5f17` 上 `git apply --check` rc=**1** ⇒ **请勿再施加**。

- **合入**：`9e73e5b` FG-CLEANUP-TIMER ＋ `8b01c1d` D3-HOP-ASSISTANT ＋ `8daabcd` FG-GATE-ONE ＋ `ae21bcc` FG-GATE-BASELINE-RED ＋ `47bc868` FG-GATE-PHASE0-B ＋ `9ceb678` 补 `check-learning-safety` 扫空必红。累计 **20 files +1625/−57**，一笔一个来源，**未 push、未打包、未部署、未碰发布身份**。
- **`repo:check` 转绿（实测）**：基线 `f82b339` 上它 rc=**1**、三条红指向 `deploy-test-release.sh` 的陈旧字面断言，自 `8e5cb00`（09-09 波次台账泛化）起**假红 14 天**。合 GATE-ONE＋PHASE0-B 后 rc=**0**（`policyAssertions=29 legacyWaveRows=7/7 protectedTables=9/9`，且有 `smoke-repo-policy-fire` 15/15 正向对照）。**这格覆盖刑部上一条指针里"修法已交、待合"的状态——现在已交并已合。**
- **完整链**（干净分离树 @`9ceb678`，porcelain 0；负载＝并行有活）：tsc **0**／lint **0**／`test:batch-row-contract` **0**／`test:trust-chain` **0**／`repo:check` **0**；另补跑出包六门之一 `test:contracts` **0**。**弃置清单＝空**；`package.json` :144 撞面两行都保留（`test:*` 终态 **120**，与刑部独立算到同一数）。
- 🔴 **出包差两件**（结论，非猜测）：① `fold-no-report-loss` 已进 `release:preflight` 第 6 门且实测 rc=1 `FAIL (13)` ⇒ **当场挡打包**；解法有已复验通过件 **ZUO-QUIET-R3**（御史第 9 轮 ⓪-2 实测 13→0，2 文件/+2 行），但它不在合流授权清单 ⇒ 待点名。② 助手**成对窗未走**：`8b01c1d` 改了 `download/local-assistant/server.js`，发布身份/manifest/安装包一笔未动，而 `check-release-identity.cjs:15-36` 只互校 manifest↔identity↔安装包字节、**不读源码** ⇒ 这一门不会替你红（实测 rc=0、仍报 3.7.2）。
- **新增待拍**：**#112**（`release-gate` 的 `mount-audit` 红了也不拦＝假闸）；另有两处 `commit message` 把"ZUO-GATE-VERIFY 的裁决"写成"这两件自身的裁决"（两件自身：GATE-ONE＝**部分通过**、BASELINE-RED＝**不封驳**），禁 amend ⇒ 请定补复验还是 revert 重走。
- **下游警告**：`补丁草案_FG-GATE-FOUR-RED_附B_package-json合并件…patch` 已被 `ae21bcc`＋`47bc868` 覆盖，打在 `9ceb678` 上 `git apply --check` rc=**1** ⇒ **请勿再施加**（否则重复键或撞死）。
- **现场**：收工时 `worktrees/develop` `porcelain=3`，**全是他人件**（工部未跟踪探针 ＋ 在飞未提交 2；其中 `download/local-assistant/receipts.js` 属**回执语义**，已按合同面告警上报）。合流手在共享树未提交足迹＝0。台账与逐项退出码见 `总控/回收_20260923/ZUO-MERGE_回包.md`。

## 2026-09-23 指针：四条基线自带红修法已交（FG-GATE-FOUR-RED），开窗前还差 1 次拍板 + 1 次真出包

- **四条处置**：`repo:check` 修法已交（并实测它是**两处**红，需 GUARD2＋PHASE0-B 同批才转绿）；`test:learning-phase0` 定性（PHASE0-B 合上即绿，三态取码 0/绿/回净仍红）；`test:release-gate-selftest` 定性为"入口不存在"，且**入口在 BASELINE-RED 不在 GATE-ONE**（纠正了任务书一处）；`test:refund-single-winner` **半修＋保留红**（两臂已建，红点从 `:67` 推进到 `:143` 的契约分歧 → **#109 待 Owner 拍**）。
- **新登记**：**#109**（32 路并发退款返回值口径 vs smoke 期望；实测 `1～3 unknown / 其余 requested`，而库内不变量三次恒成立）、**#110**（台账"形似行"令守卫三项检查整体跳过，修在飞＝附A）。
- **合流次序已给到可执行**：`package.json:144` 撞**双向不可序化** ⇒ 用附B 合并件＋两份原件带 `--exclude=package.json`（实测三步全 rc=0）；GUARD2 与 GATE-ONE 产物 **sha1 相同** ⇒ 弃置 GUARD/GUARD2。
- **基线已移动**：交包时 `worktrees/develop` = **`9e73e5b`**（并行会话合入 FG-CLEANUP-TIMER，porcelain=2）。刑部槽本包**未写 develop**；新尖上复测净基线守卫仍报同样 3 条红，本包触及的 4 个文件与新尖 9 个变更文件零交集（但新尖改了本包守卫**所读**的 `cleanup-review-snapshots.mjs`，故另跑一遍：仍 rc=1）。**他人池内件对 `9e73e5b` 未复验，合流前要重跑 `--check`。**
- **任务书补单已并入同包**：新静态闸 `scripts/check-cleanup-defaults.mjs` 专管"缺省即删"。实测 **rc=1（候选 4／含删除点 3／未受闸 6 处）**，点名 `scripts/cleanup-review-snapshots.mjs:24,25`（今晚提前删除那根引信，**整文件无开关**）与 **第二根引信 `scripts/cleanup-user-profile.mjs:8-11`**（`$transaction` 四条无条件 `deleteMany`，测试站 timer 在跑）；`cleanup-learning-evidence.mjs` 判为已受闸。三态 1/0/1 ＋ 扫空负控 1 ＋ 夹具 12/12。**只挂 `package.json:23` 入口，未进门序**（等兵部拆完引信再入 `release-preflight.cjs:102` 之后）⇒ 登记 **#111 🔴**。
- **交包期间基线又推进到 `9ceb678`**（GATE-ONE／BASELINE-RED／PHASE0-B／D3-HOP-ASSISTANT 已入尖）⇒ **附B 作废**、**附A 与主件对新尖实测 `--check`/apply 全 rc=0**（主件合入后 `test:* = 121` 三条入口俱在），新守卫对已提交尖**仍 rc=1**（#111 未消）。整条 `repo:check` 在尖上的串联 rc **未实测**（只测 policy 段 rc=0）⇒ 待验；细节见回包 ⑧。
- **交付**：`总控/回收_20260923/FG-GATE-FOUR-RED_回包.md` ＋ 主件（3 段，纯新增）／附A／附B 三份补丁。支付 flag 默认值一字未改，并有新断言反向钉住它。

## 2026-09-23 指针：门禁入面全量基线盘点已交付（只跑不改，`f82b339` 净树）

- **底牌一句**：一档 27 行实跑 = **14 绿 13 红**；红里 **4 条本征**（`repo:check` 陈旧断言、`test:learning-phase0` 判据过宽、`test:refund-single-winner` 与安全态默认开关冲突、`test:release-gate-selftest` 基线死入口）、**8 条环境**（缺 `.env`／缺 `DATABASE_URL`／缺 2 个运行码密钥／SQLite 并发写锁）、**1 条复合**（qualification 继承本征红）；**真回归 0 条，且仅在本包覆盖范围内成立**（27 行只覆盖基线 118 条 `test:*` 里的 23 条 ⇒ 95 条未跑、真机面未跑 ⇒ 未核实）。
- **覆盖缺口量化**：118 条 `test:*` 里 **84 条零挂载**（口径 A）；smoke 文件口径 B `smokeZeroMount=27` + `smokeMountedButNoChain=68` ⇒ 95 个文件永不执行。两口径并列不换标（登记 **#108**，另 #106/#107 两条判据永不通过）。
- **开窗前唯一硬事实缺件**：`f82b339` 从未出包（`package-candidate missing=2`），与红无关但拦路。
- **现场**：刑部槽 `533c9856` 的工作树 `worktrees/fg-gate-one-20260923` 交包时 `porcelain=0`、detached `f82b339`；`worktrees/develop` 同时刻 `porcelain=0`（本包全程未写）。持久产物只有 `总控/补丁草案_FG-GATE-{ONE,PHASE0-B,BASELINE-RED,GUARD2}_20260923.patch` 与 `总控/回收_20260923/FG-GATE-INVENTORY_回包.md`。
- **详情**见 `AI_MEMORY/TASK_LOG.md` 顶部条目。

## 2026-09-20 指针：紧急修复"永久资格账号显过期"已部署测试站 a462fc4（生产待拍板）

- **现场**：生产两账号报异常。`<内测账号>`（永久资格）换电脑显"已过期"= **客户端短路 bug**（localStorage 旧快照过期后不再问服务端；nginx 实证生产域零 session 请求）；`yeivan_@outlook.com` 显"不可用"= **不是 bug**（资格 `accessExpiresAt=2026-09-18` 自然到期，恢复需后台延长——待 Owner 运营决定）。
- **修复**：`8c96845` 过期标记改服务端复核自愈 + 会话回退对 null 资格采纳历史激活锚点（防御纵深）；`a462fc4` 重建 lock（`9ecb5cc` 的 npm 11 lock 复发 `4bb6936` 同源问题，登记 **#81**）；`442a99e` 契约测试补 7/8 项（8/8 绿）。四道门禁全绿。
- **测试站实况**：`.deploy-commit=a462fc4`、3001=200、provenance BOUND、PM2 三 online、备份 `deploy-20260920_180527-a462fc4c3ab9`。
- **生产处置（Owner 拍板后执行）**：内测账号**全部转永久已实施**（备份+事务：54 有限资格置 null、33 激活行投影 2099 哨兵；两报障账号复核通过）。该变更让现网旧代码即可正常解析两账号 ⇒ **生产代码部署脱离紧急态**。hotfix B 线被 `branch==main` 预检硬门拦停（#82），候选 `fcdef8a` 保留。
- **下一步在 Owner**：① 8→0 真机验收窗口把整线（含激活修复 + #74/#75/#79）发生产；② 另一台电脑即刻验证口径：F12 删该浏览器 Local Storage 的 `tygf.activation` → 保持登录刷新（旧代码也能零输码恢复）。
- **详情**见 `AI_MEMORY/TASK_LOG.md` 顶部条目。

## 2026-09-20 指针：L2 排版预览页已交付（零合同变更，纯只读取证工具）

- **产物**：`tmp/typography-preview-20260920/typography-preview.html`（451 KB，自包含 HTML）+ 生成脚本 `typography-preview.mjs`（2026-09-20 部署日因预检堵脏树，工件从 develop 树挪至容器根 tmp/，未跟踪入库）
- **功能**：对每个"需要 +1 行"的文字对象，展示"若允许 +1 行会长这样"的实测渲染预览。左侧显示当前 N 行 DP 结果（不可行时显示"原稿 N 行放不下"），右侧显示 N+1 行 DP 结果（实际折行 + 每行宽度）。碰撞检测仅检测**文字层之间**的碰撞（与背景/图片层重叠是预期行为）。
- **统计**：39 文字层 × 11 语言 = 369 对象×语言；153 个 N 行可容纳、208 个需 +1 行、8 个 +1 行也不可行；24 个扩展后碰撞（11.5% 碰撞率）。
- **修复的 Bug**：①左右侧内容相同（统一用 DP 算法，只变行数上限）；②tierBadge 始终显示 `—`（直接从 wrapData.tier 读取）；③100% 碰撞率（只检测文字层之间的碰撞，不与背景/图片层碰撞）。
- **待 Owner**：审查预览页，确认碰撞检测逻辑是否符合预期；如通过则进入 L3（合同包，3.7.0）。
- **详情**见 `AI_MEMORY/TASK_LOG.md` 顶部条目。

## 2026-09-19 指针：操作演示片已交付（工作台第 1–2 步，真实组件 + 契约化后端）

- **产物**：`video/intro-20260919/renders/demo-app-16x9-v1.mp4`（17.3s / 1920×1080 / 60fps）与 `demo-app-9x16-v1.mp4`；`check_delivery.py` → `ok: true`。
- **做法**：产品真实组件树客户端挂载（`harness/`）+ Playwright 真鼠标逐帧采集 + 虚拟相机合成；**只替换网络与本机助手应答**，界面与状态机是产品源码。**产品仓库零改动、真助手进程零接触、不花积分。**
- **边界**：第 3/4 步需驱动 Photoshop，采集器对执行类端点显式回绝，未包含在本片内；措辞只能是"界面演示"，不是真机跑批实录。
- **详情**见 `AI_MEMORY/TASK_LOG.md` 顶部条目与 `video/intro-20260919/evidence/component-usage-demo.json`。
- **待 Owner**：试听两版成片配音效是否压过配乐；决定演示段与 45s 介绍片（`renders/intro-16x9-v1.mp4`）是合成一条还是各自投放。

## 2026-09-16 指针：生产人工支付凭证提交修复（PAYMENT_REFERENCE_SECRET 缺失）

- **详情**见 `worktrees/develop/AI_MEMORY/TASK_LOG.md` 顶部条目、`worktrees/develop/AI_MEMORY/ISSUES.md` #50、`worktrees/develop/docs/HANDOFF.md` 顶部块。
- **要点**：生产站提交交易号报「请求失败。」根因=两站 `.env` 均缺 `PAYMENT_REFERENCE_SECRET`（Phase 7 起 fail-closed，从未成功过）；Owner 明确授权后两站各配独立随机密钥并重启（生产 active/公网 200/env 已载入；测试站模块回环实测通过）；两站 DB 无历史加密凭证，订单/账本零变更。
- **遗留**：发布检查与初始化脚本未含该键（#50）；旧订单已取消，若已真实转账需人工核对；新订单 `cmu443y1h02xowjlz7eg0n032` 可重新提交。

## 2026-09-15 指针：3.6.52 已发布（测试站+生产）+ 生产智能检测 worker 安装

- **详情**见 `worktrees/develop/AI_MEMORY/TASK_LOG.md`（2026-09-14 晚–09-15 条目）、`worktrees/develop/AI_MEMORY/CURRENT_STATUS.md`、`worktrees/develop/docs/HANDOFF.md` 顶部块；ISSUES #44（已修）/ #45（代码已修待真机验证）。
- **要点**：生产智能检测自 ASYNC 化起无 worker（请求永久 QUEUED → 用户看到「超预算未调用」429）→ 已装 `tygf-smart-review.service` 并清两笔过期预留；助手/Web 发布 **3.6.52**（组合绑定护栏 `V15_FORCED_SOURCE_MISMATCH` + 工作台抽屉状态隔离 + 单语言报告补未覆盖/扫描覆盖缺口）；生产 `dailyTokenLimitPerUser` 2,000,000。
- **待办**：用户工作台复跑验证智能检测真实调用与报告新块；测试/生产测试机安装助手 3.6.52；develop/main 提交未 push（待授权）；后续部署需手动 restart 生产 worker 单元。

## 2026-09-13 深夜 P0 事故修复与可靠性强化（已部署测试站 09f7122）

- **事故**：09-12 23:45–00:00 批量执行第二语种起 409 `REVIEW_EVIDENCE_BINDING_INVALID`，整批停摆、预留悬挂（用户三轮仅完成日语）。根因=快照 `targetLanguage` 是主语言、`languages` 才是整批全集，云端路由按主语言等值放行。
- **修复**：R1 证据按 `languages` 成员放行（`474a565`）；R2 预执行业务拒绝→语言级失败 + abandon + 其余语言继续（`09f7122`）；R3 回收器覆盖「确认后未派发」的 RESERVED（15min→STALLED 全额释放，F10 回归）；R4 systemd 回收单元 `ReadWritePaths` 补 db（此前 readonly database 实证）并入库。
- **收口**：事故 5 批全终态——3×39 + 18 commit（各轮真实完成的日语产出），RESERVED 216 released。
- **部署**：`09f7122`（备份 deploy-20260913_002627-09f7122d566b）；健康 200、PM2 三 online、latest=3.6.43；前端 chunk 已核验。
- **验证**：tsc/lint 0；trust-chain 24 段（含 F10）；v3-batch-flow/row-contract/workbench-flow/review-filters/报告 smoke 全绿。
- **交付**：`docs/records/20260913_P0事故修复与可靠性强化_执行方案.md`（第一性原理 + GitHub/官方对照 + 100 轮对抗审查）。
- **同日追加**：F11 CSV 健壮性（GB18030 回退/引号首字符/分隔符投票/缺列警告）+ ISSUES #39/#40 清零，已部署 `cbcf36c`；验证全绿。
- **遗留**：F9–F14 未实施（F9/F10/F12/F14 需探针/Owner 决策/Photoshop 真机）。

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


---
**去向**：本件两条区间在 `AI_MEMORY/CURRENT_STATUS.md` 内各留一行指针（原区间 1＝09-24 23:0x 至 09-12 全部日期指针；原区间 2＝"最近验证基线（2026-08-30）"节）。
