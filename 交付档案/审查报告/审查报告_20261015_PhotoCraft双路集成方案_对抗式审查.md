# 对抗式审查：PhotoCraft 双路集成方案（选项 C）× L2 分派策略

**审查对象**：`worktrees/v1.5-trust-chain/changes/active/20261014-photocraft-integration-plan.md`（382 行）＋ `20261014-dual-route-strategy.md`（75 行）
**审查时间**：2026-10-15 21:1x ｜ **方式**：全程只读（grep/Test-Path/Get-Content，未改任何业务文件，未跑 tsc/lint——未改代码，NOT RUN·不适用）
**抽验规模**：引证逐条对账 **31** 条 ｜ 必断流程 **8** 条 ｜ 两案互斥 **3** 处 ｜ 缺口 **4** 项

---

## 00 结论（一句话）

**不通过——打回重修。** 方向没有塌：无 PS 保底的既有实测支点（serve 扫描 4.3s、doc.open/inspect/batch 实跑、engine.execute 协议）全部复核为真。但这份 382 行的执行方案**照单实施必断**——无 PS 机上第一台任务会先后死在三处：扫描阶段先死（方案没覆盖）、成功之后无人认领结果（写错了合同文件）、第 3 分钟被心跳看门狗锁死（进度文件没人写）。31 条引证里 **18 条失实**，其中 6 条是不存在的文件或字段。

## 01 判定与分层

| 层 | 判定 | 一句话理由 |
|---|---|---|
| L2 双路策略（方向） | **有条件维持** | 12 问门禁框架、四同步纪律、双引擎 fixture 要求全部成立；但自身引证错 1 处、与方案互斥 3 处，须更正后生效 |
| 选项 C 执行方案（实施） | **不通过，打回重修** | 8 条必断流程 + 18 条失实引证 + 回执合同 4 处违规；按 §07 重修清单改完后复审 |
| 既有实测证据链 | **未被本轮推翻** | 原型脚本与协议文档交叉复核为真（见 §08） |

## 02 必断流程（照单实施必死的 8 处）

**FLOW-00 扫描/就绪两阶段根本没进方案——无 PS 机死在执行之前。**
执行前有两道 PS 扫描闸：预扫描 `TYGF_V15_Preparation_Scanner.jsx`（`server.js:2712`）与就绪扫描（`server.js:3211`）。方案只改 `launchExecutor`（执行阶段），扫描阶段在无 PS 机上先失败，执行通道写完也跑不到。策略案自己在 `dual-route-strategy.md:73` 把「助手 prepare 分支 CLI 等价实现」列为后续任务——两份文件一对，方案漏接了自家前置。

**FLOW-01 成功结果写进了一个不存在的合同——PC 全对也判死。**
v15-runner 只认 `taskRoot/executor-result.json`（`v15-runner.js:134/:144`），解析器硬校验 `schemaVersion:1 + ok:boolean + code:'SAVE_SUCCEEDED' + completedAssignmentCount === 预期数`（`v15-runner.js:56-66`）；PS 路由 `TYGF_V15_Thin_Executor.jsx:9` 负责写它。方案却让 `launchPhotoCraft` 写 `report/receipt.json`（`photocraft-integration-plan.md:70`）——**这个文件名在 `download/local-assistant/` 全目录 0 读者 0 写者**（Select-String `receipt\.json` 全目录扫描 0 命中）。真实回执链是 `createLocalGenerationReceipt` → `journalRoot/receipts/<attemptId>.json`（`server.js:4334`、`v15-runner.js:698`）。照方案写，`parseExecutorResult` 直接 ENOENT/`EXECUTOR_RESULT_INVALID`，成功任务按失败收场。

**FLOW-02 计数阈值算错 + 无人结算——promise 永挂，助手锁死。**
完成条件 `responseCount >= steps.length + 2`（方案 `:66`，注释「doc.open + N steps + doc.close」）——但 `buildPhotoCraftSteps` 自己已经压进了 doc.open、doc.save、doc.inspect、doc.close（`:139-169`），回复总数 = `steps.length`，**永远到不了 +2**。且全段没有 `child.on('exit'|'close')`、没有超时后的 reject：spawn `timeout: 10min` 杀掉子进程后无人调用 callback → `await options.launchExecutor`（`v15-runner.js:143`）永挂 → 任务卡 RUNNING。busy 看门狗（`server.js:1472-1489`）锁保留：「确认进程终止或任务完成前不会接收新任务」——**助手进程不重启就不再接活**。

**FLOW-03 stdout 分帧脆断——半行即异常。**
`chunk.toString().split('\n')` 不留残行缓冲 + `JSON.parse(line)` 无 try（方案 `:61-63`），且包在 `async` 监听器里——半行 JSON 抛出即成为 unhandled rejection（Node ≥15 默认**终止进程**），助手崩溃风险。对照原型的正确写法：`nops_scan.cjs:13-31` 用 readline + `pending` map 按 id 关联 + 单行 try/catch。

**FLOW-04 进度文件没人写——第 3 分钟必判死，10 分钟超时形同虚设。**
`readPhotoCraftProgress` 轮询 `taskRoot/report/progress.jsonl`，注释称「由 CLI 写入」（方案 `:50/:210`）——**`photocraft-cli` crate 的全部 `.rs` 源码 grep `progress\.jsonl` 0 命中，原型目录 0 命中**：CLI 根本没有这个功能。于是 `onProgress` 永不触发，心跳只有 `:3438` 的初次一条；`server.js:1480` 以 `BUSY_TIMEOUT_MS = 3min`（`server.js:188`）调 `markStalled`（`attempt-runtime.js:51-58`）→ 记 `PHOTOSHOP_HEARTBEAT_STALE`（还是 PS 错误码张冠李戴）→ 锁保留、`PHOTOSHOP_TIMEOUT` 文案（`server.js:1488-1489`）。PC 的 10 分钟硬超时根本活不到。

**FLOW-05 manifest 键全不存在——spawn 前就抛，且存盘绕过发布契约。**
- `manifest.masterPath`：**不存在**——`validateExecutionManifest` 是 exact-keys 白名单（`execution-manifest.js:28-34`，键为 assignments/attempt_id/…/output/source/translation，无 masterPath）→ `path.dirname(undefined)` 在 `spawn` 前抛 TypeError，被 `:86` catch 后 reject，执行秒死。
- `manifest.output.destination_path`：**不存在**——output 键实为 `collision_policy / destination_directory / destination_policy / format / policy / target_naming_policy`（`execution-manifest.js:66-69`）。`doc.save {path: undefined}` 序列化时键被丢弃 = **不带 path 的保存 = 回写文档本体**（fork `automation-security.md:30`），既绕过 `policy: 'WORKING_COPY_THEN_PUBLISH'`（`execution-manifest.js:70`），也绕过命名策略 `LOCALE_SUFFIX_V1`、碰撞策略与 `publishVerifiedWorkingCopy`（`working-copy.js:196`）。
- `manifest.digest`：**不存在**——摘要由 `computeExecutionManifestDigest(manifest)` 现算（`server.js:4029`）。回执取 `manifest.digest` 得 undefined → 结算 SHA256 校验必抛。

**FLOW-06 回执四连违规——过不了 `assertServerSettlementReceipt`。**
方案回执（`:183-202`）逐字段对合同：

| 方案值 | 合同要求 | 出处 |
|---|---|---|
| `attemptStatus: 'SUCCESS'` | 只收 `'SUCCEEDED'\|'FAILED'\|'CANCELLED'` | `settlement-receipt.ts:19/:73` |
| `artifactDisposition: 'COMMITTED'` | 枚举 `NONE/WORKING/QUARANTINED/PUBLISHED` | `attempt-state.ts:14` |
| `verificationLevel: 'INFO_READBACK'` | 枚举 `NONE/WRITE_CONFIRMED/TEXT_READBACK_VERIFIED/SAVE_SUCCEEDED/DISK_OUTPUT_VERIFIED/REOPEN_VERIFIED` | `attempt-state.ts:15-21` |
| `startedAt: openResp.timestamp` | 协议回复只有 `{id, ok, result}`，**无 timestamp 字段** | fork `control-protocol.md:31-36` |

四条任一触发即 `TypeError`，结算上传链当场断。且 `PUBLISHED` 还要求 verification ≥ `DISK_OUTPUT_VERIFIED`（`settlement-receipt.ts:83`、`attempt-state.ts:94`）——方案连读回验证都没消费（`outputFingerprint: null` 注释「从 inspectResp 计算」但从未算）。

**FLOW-07 无错误检查的假成功——直接违反「不得静默降级」铁律。**
`launchPhotoCraft` 不看回复的 `ok/error`（协议有错误回执形态 `control-protocol.md:35`），错误回复照样计入 `responseCount`；回执里 `attemptStatus` 硬编码成功、`completedAssignmentCount` 硬编码满额、`issueCodes` 恒 `[]`（方案 `:188-194`）——部分图层失败也报 100% 成功。这正是铁律点名的静默降级。

**FLOW-08 第二分派点没覆盖——云批次在无 PS 机仍死。**
`server.js` 有两处 `runV15Execution` + `launchExecutor`：本地单语言 `:3442/:3456`（方案改了）与**云批次** `:4045/:4061`（cloudAttemptId/languageJobId，`:4032` 独立 acquire——方案通篇未提）。批次任务无 PS 依旧原样失败，策略案「若 PS 检测失败自动降级」承诺落空一半。

## 03 引证对账表（31 条逐条实测）

统计：**属实 9 ｜ 部分 3 ｜ 失实 18 ｜ 冲突 1**。`✓`=与实测相符，`✗`=失实/不存在，`△`=部分相符/未验，`⚡`=与自家实测冲突。

| # | 方案声称 | 实测结果 | 判 |
|---|---|---|---|
| 1 | `server.js:187` PS_EXECUTION_HARD_TIMEOUT_MS 常量 | 命中，`:187`（`:186` PS_TIMEOUT、`:189` POLL 同在） | ✓ |
| 2 | 分派块 `server.js:3456-3464`、`runV15Execution :3442` | 两锚点均命中 | ✓ |
| 3 | 「launchPS 之后，约行 1296 后」插函数 | launchPS `:1207`–约 `:1298`（下一函数 `runDiagnostic:1299`），1296 属实其后 | ✓ |
| 4 | `receipts.js:39` 是 `executorVersion` | `:39` 实为 `assistantVersion`，executorVersion 在 `:40`（差 1 行） | △ |
| 5 | `working-copy.js:7` 有 `sha256File` 可 require | `:7` 定义、`:198` 导出 | ✓ |
| 6 | `v15-runner.js:143` 是 `executorVersion:'unknown'` 回执字面量 | `:143` 是 `await options.launchExecutor(...)`；executorVersion 实为 `:146` 从 executor-result.json 读出 | ✗ |
| 7 | 用 `options.executorVersion/scanMethod` 注入（`:290-299`） | 无此合同——现有机制是执行器写文件、runner 读文件（`:56-66/:146`），options 注入系编造 | ✗ |
| 8 | `src/lib/server/quotation.ts:30-31` | **文件不存在**（`src` 递归 `*quotation*` 0 命中） | ✗ |
| 9 | `src/lib/server/settlement-adapter.ts:30-31` 结算「executorVersion 唯一性检查」 | 实为 `src/lib/trust-chain/settlement-adapter.ts`；`:30-31` 是 `totalPSD/totalLanguages`；executorVersion 映射在 `:21`（→scriptVersion）；**无任何唯一性检查**（路径/内容/机制三错） | ✗ |
| 10 | `src/lib/server/evidence.ts` | 不存在（实为 `trust-chain/evidence-foundation.ts`、`local-assistant/billing-evidence-rows.js` 等 4 个别的文件） | ✗ |
| 11 | `src/app/(zh)/workbench/execute/page.tsx` | `Test-Path = False` | ✗ |
| 12 | 浏览器投影「展示 executorVersion、scanMethod」为既有同步 | `src` 全库 grep 仅命中 `trust-chain` 2 处——这是**净新增 UI**，不是同步既有；四层清单定性错 | ✗ |
| 13 | 策略案：`server.js:1050` 无 PS 即拒，改 warn+fallback | `:1047-1052` 是错误**消息映射区**（PHOTOSHOP_LAUNCH_FAILED 文案），不是拒绝闸——改点错位 | ✗ |
| 14 | 「attemptRuntime.acquire 已有闸」 | `:1381` 创建、`:3348/:4032` acquire | ✓ |
| 15 | `existingPsExe(cfg.psExePath) \|\| detectPsExe(false)` 调用姿势 | 两函数均同步返回字符串（`:220`、`:327-334`），姿势正确，无 Promise 恒真坑 | ✓ |
| 16 | `manifest.masterPath` | exact-keys 白名单无此键（`execution-manifest.js:28-34`） | ✗ |
| 17 | `manifest.output.destination_path` | output 六键无 destination_path（`:66-69`） | ✗ |
| 18 | `manifest.digest` | manifest 无 digest 键；现算函数在 `server.js:4029` | ✗ |
| 19 | `serve --automation-read-root/--automation-write-root` | 真实可用：原型 `nops_scan.cjs:11` 实跑（4.3s 扫描）＋ fork `apps/photocraft-cli/src/lib.rs:42` | ✓ |
| 20 | `doc.open` / `doc.inspect` / `batch(type.info)` | 协议/文档/原型三方为真（fork `architecture.md:468-470`、`ora.md:5`；原型实跑） | ✓ |
| 21 | `doc.save {path}`（带 path 发布）与 `doc.close` | `doc_save/doc_close` 有文档背书（`architecture.md:469`、`automation-security.md:30`），**但原型从未跑过这两步**（nops 流程只到 inspect），带 path 保存的根约束/发布语义未验 | △ |
| 22 | `type.edit` 的 layer 参数 = `ledgerEntryId` 纯树路径（方案风险 2、策略门禁 9） | **与自家实测冲突**：原型 `run_edit.cjs:5` 是 `{layer: parseInt(layer,10), text}` 整数；文档无参数形态说明——须引擎实测钉死后才能写进合同 | ⚡ |
| 23 | `progress.jsonl` 由 CLI 写入 | fork `photocraft-cli` crate 全部 `.rs` grep 0 命中；原型 0 命中——功能不存在 | ✗ |
| 24 | 回执落 `report/receipt.json` | 全目录 0 读 0 写；真链 = `journalRoot/receipts/<attemptId>.json`（`server.js:4334`） | ✗ |
| 25 | `attemptStatus: 'SUCCESS'` | 合同三值 `SUCCEEDED/FAILED/CANCELLED`（`settlement-receipt.ts:19`） | ✗ |
| 26 | `artifactDisposition: 'COMMITTED'` | 枚举无 COMMITTED（`attempt-state.ts:14`） | ✗ |
| 27 | `verificationLevel: 'INFO_READBACK'` | 枚举无 INFO_READBACK（`attempt-state.ts:15-21`） | ✗ |
| 28 | `startedAt: openResp.timestamp` | 协议回复无 timestamp 字段（`control-protocol.md:31-36`） | ✗ |
| 29 | `PC_SERVE_TIMEOUT_MS=5min` 超时杀进程报 PHOTOCRAFT_TIMEOUT（§四.2） | 常量 `:22` 声明后**全段无引用**（死常量）；代码实际用 10min timeoutMs，且无 exit/超时错误路径——§四.2 与 §一代码自相矛盾 | △ |
| 30 | 测试清单 `npm run test:seo-consistency` | 本 worktree `package.json` scripts 无此键（0 命中）——develop 独有 | ✗ |
| 31 | 回执取 `VERSION` | `server.js:87` `const VERSION = '3.6.18'` | ✓ |

## 04 回执与结算合同面（为什么四层同步写了也过不去）

方案 §二「同步四层」的思路（合同纪律本身）是对的，但四层清单的**坐标全部失实**（§03 #8-#12），且真正要同步的层它没写：

- **助手侧回执生成**：应走 `receipts.js` 的 `createLocalGenerationReceipt`（`:19`，带本地私有字段 masterPath/workingCopyPath + 隐私黑名单 `:7-17`）→ 方案完全绕过该函数自拼对象。
- **上行结算**：`ServerSettlementReceipt` 接口（`settlement-receipt.ts:14-31`）字段白名单与 §06 表四条硬校验 + 隐私字段禁令 `FORBIDDEN_KEY_PARTS`（`:35-38`）——方案新字段 `scanMethod/typeInfoVersion` 不在接口里，上行 pass-through 是否被接受**未核实（待确认，不判死）**。
- **结算适配**：`settlementReceiptToBillingReport` 把 executorVersion 当 scriptVersion（`settlement-adapter.ts:21`）、按 attemptStatus/verificationLevel 算 status/health（`:17-25`）——方案的假成功值会把失败算成成功、把成功算成失败（双向都会）。
- **报价层**：`quotation.ts` 不存在；真实的计价入口是 `src/lib/server/photoshop-billing.ts`（存在，被 settlement-adapter:1 导入）——四层清单须按真实文件重写。

## 05 两份方案的三处互斥

**M1 分派优先级相反。** 策略案：`dual-route-strategy.md:21`「分派优先级：CLI 兜底 ≥ PS 现役（出现 PS 异常时优先尝试 CLI 恢复）」+ 触发条件「用户明确选择无 PS 模式」（`:19`）+ 「检测到 PS 幽灵进程 → 记录 `executorStatus: phantom-killed`，不再中断任务」（`:18`）。方案案：`:107-129` 纯 `psAvailable` 二选一——**PS 永远优先**，无用户模式入口，无幽灵进程处置。两案同时生效则门禁无法自洽。

**M2 门禁 9 与自家实测冲突。** 策略案门禁 9（`:59`）要求「`layerId→ledgerEntryId` 映射表」、风险 2（方案 `:346`）要求 type.edit 的 layer 用 ledgerEntryId——但通过门禁 3/6 的原型脚本传的是整数 layer（`run_edit.cjs:5`）。**方案与自己批过的实测证据打架**（§03 #22）。

**M3 策略案引证错位 + 前置任务没进方案。** `server.js:1050` 误读（§03 #13）；`prepare` CLI 等价实现（策略 `:73`）没出现在方案改动清单里（FLOW-00）；幽灵进程与用户模式两条触发条件在方案里零落码。

## 06 缺口（方案没写、但上场前必须有的）

- **F-4 灰度旗标（承 10-15 灰度复审，仍开）**：两案 grep `灰度|featureFlag|flag|白名单|canary` 0 命中（上一轮已实测）——无默认 false 的旗标、无 SiteSetting 独立覆盖、无服务端分群。**按此上线即违反「生产开启必须 SiteSetting 覆盖、永不随部署生效」红线。**
- **F-7 交付/配置面整块缺失**：`photocraft-cli.exe` 入 `BUNDLED_DIR/bin/` 的打包与安装器改动不在清单；`pcExePath/pcExeSha256` 配置 schema 无出处（全 `local-assistant/*.js` grep `pcExe|photocraft` 0 命中——确认从零新增）；`PHOTOCRAFT_EXE_NOT_FOUND/HASH_MISMATCH/TIMEOUT` 错误码到用户文案的映射缺失——现有映射区只认 PS 族错误（`server.js:1040-1060`），PC 错误会漏到通用错误。
- **F-8 测试清单不构成门禁**：`test:seo-consistency` 本树不存在（#30）；PC 分支**零测试 harness**（无成功/半途错误回复/超时/缺 exe/哈希不符用例）；策略案 §2 要求的双引擎 fixture（有 PS/无 PS 两套结构）未落到任何可执行测试上；门禁 1-11 的复验动作也没进 §六清单。
- **F-9 上行兼容性未核实（待确认）**：`scanMethod/typeInfoVersion` 两个新字段进 ServerSettlementReceipt pass-through 的行为（接口无此二字段，`assertNoPrivateFields` 键名未被禁但 canonical digest 会变）——上行前须实测，不判死。

## 07 重修清单（改对了才复审）

1. **结果通道归位**：PC 执行完写 `executor-result.json`（`schemaVersion:1, ok, code:'SAVE_SUCCEEDED', completedAssignmentCount, executorVersion:'photocraft-cli f0e8d404'`）——v15-runner 既有链**零改动**（`executorVersion` 本来就是 `:146` 动态读）。方案 §4 整段 v15-runner 改动可删，§2 receipts.js 的 engine 三元也可简化（`:40` 已是 input 直通）。
2. **分帧与判错**：照 `nops_scan.cjs:13-31`——readline 按行、pending map 按 `id` 关联、每条判 `ok/error`、时间戳本地 `new Date().toISOString()`。
3. **完成判定与结算**：按 steps 的 id 集合判齐（不是 `length+2`）；`child.on('exit'|'error')` 必 settle promise；spawn 超时后 reject `PHOTOCRAFT_TIMEOUT`；清理 progress 轮询定时器。
4. **心跳自给**：PC 路径每收到一条回复/每轮轮询即 `attemptRuntime.heartbeat(id, {phase:'photocraft'})`，保持 <3min（`BUSY_TIMEOUT_MS:188`）；**进度改为本地驱动**（CLI 无 progress.jsonl——要么删轮询改用回复计数，要么由助手侧自写进度文件）；`PHOTOSHOP_HEARTBEAT_STALE/PHOTOSHOP_TIMEOUT` 等 PS 族错误码若要改名属合同变更，须按四层同步纪律评估（暂按现状兼容 + 登记）。
5. **路径源与发布链归位**：master/working copy 从 execution-envelope 取（`v15-runner.js:135-141` 已写入 `workingCopyPath`+manifest）；保存交给既有 `working copy → reopen verifier → publishVerifiedWorkingCopy` 链，PC 只当执行器内核，不自创 doc.save 直存目标目录；`manifest.digest` 一律 `computeExecutionManifestDigest(manifest)` 现算。
6. **回执合同四改**：`attemptStatus:'SUCCEEDED'`、`artifactDisposition:'PUBLISHED'`、`verificationLevel` 按真实验证深度取 ≥`DISK_OUTPUT_VERIFIED`（接 doc.inspect 读回或 Reopen_Verifier 等价）、时间戳本地生成 canonical ISO；落点走 `createLocalGenerationReceipt` → `journalRoot/receipts/<attemptId>.json`（`server.js:4334`）。
7. **覆盖补齐**：prepare `:2712` / readiness `:3211` 的 CLI 等价（或显式标为前置分册，先于执行通道交付）；第二分派点 `:4045-4067` 云批次同步改造；策略案三条触发条件（用户无 PS 模式、幽灵进程记录、CLI 优先级）落码或明文废止——**两案先对齐再动码**。
8. **灰度闸（F-4）**：`pcEnabled` 旗标默认 false + SiteSetting 独立覆盖 + 分群服务端判定，与 10-15 灰度复审 G1-G5 同闸——没这个，不进部署讨论。
9. **测试补实**：新增 `smoke-pc-executor`（成功/半途错误/超时/缺 exe/哈希不符 5 用例，可先用假 serve 头）；fixture 补双引擎两套结构（策略 §2 原文要求）；测试清单删 `test:seo-consistency` 或注明 develop-only。
10. **引证全面对账**：§03 全表逐条更正为实测坐标后，回本审查复验（G 轻量复审即可，不必五路）。

## 08 已核为实的支点（方向为什么还站得住）

- serve 会话 + 双 automation 根实跑通过：`nops_scan.cjs:11`（原型 4.3s 扫描、36/38 字段覆盖，fork `lib.rs:42` 命令行旗标在案）。
- `doc.open / doc.inspect / batch` 三方法文档与实测双证（`architecture.md:468-470`、`ora.md:5`、原型注释与输出）；`engine.execute` 协议在案（`control-protocol.md:44`）；`app.open/app.save` 根约束语义清楚（`:77`）。
- 单执行闸 `attemptRuntime.acquire` 真实存在且双调用点在案（`:3348/:4032`）；`detectPsExe` 同步语义 + 10min/30s 缓存（`:327-334`）与方案调用姿势相容。
- `sha256File` 可用（`working-copy.js:7/:198`）；`VERSION` 在案（`server.js:87`）；`test:batch-row-contract`、`test:trust-chain` 两合同测试真实存在（package.json）。
- 12 问门禁与四同步纪律本身（策略 §3、方案 §二骨架）方向正确——错的是坐标与实现，不是治理要求。

## 09 方法与出处

- 只读手段：`Select-String`（模式与命中文件见各条）、`Test-Path`（#11/#F-7）、`Get-Content -Encoding UTF8` 行窗读取（server.js/v15-runner/receipts/execution-manifest/settlement/attempt-state/attempt-runtime 关键段）、`ConvertFrom-Json` 读 package.json scripts、fork 侧同法读 `control-protocol.md/architecture.md/ora.md/automation-security.md` 与 `photocraft-cli` crate `.rs`。
- 关键否定式均有 0 命中证据：`receipt\.json` 全目录、`*quotation*`/`evidence.ts` under src、`execute/page.tsx` Test-Path、`progress\.jsonl` in crate `.rs`、`pcExe|photocraft` in local-assistant、`seo` in scripts、`灰度|featureFlag|flag`（上轮）。
- 未执行：tsc/lint/合同 smoke（本轮零代码改动，NOT RUN·不适用）。git 只读：两案文件 `??` 未跟踪状态未变，业务树未动，两站未碰。
- 判定词典：属实=引证坐标与内容双双命中；部分=坐标近似或声称的步骤未被原型验证；失实=文件/字段/机制不存在或内容错位；冲突=与本仓既有实测证据相反。

---

*对抗式审查 · 2026-10-15 · 只读无改动 · 复审入口：按 §07 重修后回本件*
