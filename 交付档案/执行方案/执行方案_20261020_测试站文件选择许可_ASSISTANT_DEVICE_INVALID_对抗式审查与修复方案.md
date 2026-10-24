# 对抗式审查与执行方案：测试站「文件选择许可」报 ASSISTANT_DEVICE_INVALID

- 日期：2026-10-20
- 触发：Owner 实测 `test.tuyigf.com` 工作台点「选择文件」，报「无法验证本次文件选择许可（ASSISTANT_DEVICE_INVALID），请刷新工作台后重试。」
- 性质：故障诊断 + 对抗式审查 + 执行方案（**未部署、未改代码、未动生产**；测试站部署与助手发版均需 Owner 授权）
- 配套 HTML：同名 `.html`（同目录，本地查看）

## 0. 结论（先看这个）

1. **这不是「许可过期」，刷新也没用。** 云端返回的是 `200 + {valid:false, reason:'ASSISTANT_DEVICE_INVALID'}`（业务拒绝，不是网络/超时）；助手日志自 10-18 起、今天 08:17 仍复现，`cloudStatusCode=200`。
2. **当前证据指向：本机助手持有的运行码「代次」（tokenJti）与测试站当前授权行对不上。** 判据：`src/lib/server/assistant-authorization.ts:22-28` 是这条链上唯一产生该码的位置，只查 `hasCurrentAssistantRedemption`；后者按 `(assistantCodeId, machineId, tokenJti)` 精确匹配（`assistant-redemption-token.ts:13-20`；tokenJti 语义自 `6d9e169`／2026-10-10 起生效）。fail-closed 行为正确，问题在**可诊断性与文案**。
3. **已证实一个次生问题：你看到的是旧版助手的兜底文案。** 专属文案补丁 `58a483c`（2026-10-18 22:15）只在 develop 源码里；本机运行版是 `transport-hardening-20261011-r1`（引擎 exe 2026-10-12 16:25），**不含该补丁**（源码 `server.js:3396-3402` ↔ 兜底 `:3407`）。
4. **一条待确认分支**：「代次不同」还是「根本没有授权行」。两者同码但恢复动作不同；本方案第一步就是只读对账，不盲修。
5. **即时恢复（Owner，约 2 分钟）**：工作台「重新连接」→ 若仍失败则完全退出并重启助手再连 → 重试「选择文件」。验收判据见 §7。

## 1. 现场证据

时间线（北京时间；日志为 UTC）：

- 10-13 17:56 — `ASSISTANT_TOKEN_EXPIRED`（同类链上的另一码）
- 10-16 21:48 — `ACTIVATION_REVOKED`
- 10-18 01:16 — `ASSISTANT_TOKEN_BAD_SIGNATURE`（10-17T17:16Z）
- **10-18 17:28 — 首次 `ASSISTANT_DEVICE_INVALID`**（09:28:23Z）
- 10-18 21:43 — `.tygf_session` 被重写（含 `.bak`）
- 10-19 08:10–08:14 — 连续 5 次同码
- **10-20 08:17 — 3 次**（00:17:06Z／00:17:18Z／00:17:41Z），origin 均为 `https://test.tuyigf.com`

双端证据：

- 助手侧 `logs/assistant-events.log`：`[ticket] verify rejected reason=ASSISTANT_DEVICE_INVALID … cloudStatusCode=200`；同拍 `[authorization-check] reject code=…`；`POST /v1.5/authorization/check -> 403 … origin=https://test.tuyigf.com`。
- 站点侧：`GET https://test.tuyigf.com/api/runtime-provenance` → BOUND `6ff5c3c`，expectedAssistant `3.7.15 / transport-hardening-20261011-r1` —— **站点认为版本对得上**，所以不是「版本不匹配」型故障。
- 本机运行时：`release-identity.json` = 3.7.15 / transport-hardening-20261011-r1；`图译工坊引擎.exe` 2026-10-12 16:25（38,512,762 B）；进程 22720（引擎）/ 22684（外壳），08:07:55 启动。

链路一句话：浏览器给「选择文件」签一张短时许可 → 助手 `POST /v1.5/select-file`（`server.js:4942-4946`）→ 助手拿自己的运行码去云端 `/api/local-assistant/ticket/verify`（`ticket/verify/route.ts:128-146`）→ 云端在消费票据前先验助手授权代次（`assistant-authorization.ts:22-28`）→ 不匹配即 `200 + valid:false`。

## 2. 对抗式审查（六路）

### A 鉴权/安全面：判得对，但拒绝理由被压扁成一个码

- 事实：`hasCurrentAssistantRedemption` 只返回 true/false（`assistant-redemption-token.ts:13-20`）；「无行」「代次不同」「machineId 换了」在调用方全变成 `ASSISTANT_DEVICE_INVALID`（`assistant-authorization.ts:27`）。
- 判据：同一个码对应三种处置（重连 / 重新激活 / 查绑定），用户和我们只能猜。
- 结论：**不应放松 jti 校验**（旧代次永久有效会破坏吊销语义），应**细分码**。评级：安全正确、可用性缺失。

### B 协议/状态机面：200 语义 + 零服务端日志 = 事后不可查

- 事实：拒绝走 `200 + {valid:false}`（`ticket/verify/route.ts:144-146`）；客户端 `cloudStatusCode=200` 易被误读成网络正常（本次差点误判为传输故障）。
- 事实：该分支无服务端结构化日志（route 内直接 return），测试站日志无法回溯是哪一步失败。
- 结论：保留 200 兼容语义（旧助手只认 HTTP），补 `subReason` 字段 + 服务端 warn 日志（零 token 明文）。

### C 运行时身份面：源码 ≠ 运行版（同类问题第二次命中）

- 事实：文案补丁 `58a483c` 2026-10-18 22:15；运行版 buildId `transport-hardening-20261011-r1`（10-12 构建）。
- 事实：`scripts/smoke-local-assistant-errors.mjs:435-467` 是**静态断言**（只查源码有分支），不校验安装包。
- 结论：这条补丁「测过了」但「没上线」，用户的错误引导由此而来。发版必须 bump buildId 并同步站点 expected。

### D 运维/部署面：代次迁移没有发布检查项

- 事实：tokenJti 语义 10-10 上线（`6d9e169`）；10-18 起该机开始报此码；10-18/10-19 测试站连发部署（`b7a72f8` / `8da9d07` / `6ff5c3c`）。
- 结论：涉及「代次」的变更缺少「旧 token 负控 + 重连正控」，出问题只能在用户机上发现。加进部署检查单。

### E 用户可恢复性面：UI 有正确入口，但文案把用户引向「刷新」

- 事实：工作台连接卡有「重新连接」按钮（`assistant-setup-banner.tsx:241`），提示语也说「需要本机授权的操作已暂停，请重新连接」（`:164`）。
- 事实：助手兜底文案说「刷新工作台后重试」（`server.js:3407`），与 UI 矛盾。
- 结论：统一为「断开 → 重新连接当前电脑」，并提供「复制诊断信息」出口。

### F 测试面：缺「打包产物含补丁」的断言

- 事实：现有 smoke 只断言源码分支存在；无「运行版实际文案/行为」验证。
- 结论：补行为级用例（直接调 message 函数断言含「重新连接」、不含「刷新」），发布前用 runtime-provenance 对 expected/actual 做硬校验。

## 3. 根因判定与分支

| 分支 | 假设 | 支持证据 | 反证 | 判别 |
|---|---|---|---|---|
| H1（最可能） | 助手 token 的 jti 与 DB 行不一致（代次漂移） | 该码唯一判据；10-18 前该机授权链多次变动；`.tygf_session` 10-18 21:43 被改写 | 改写后仍失败 → 可能写回的是旧代次 | 测试站 DB 只读查该行 tokenJti/updatedAt + 助手 token 是否含 jti（只打印有/无） |
| H2 | 该 machineId 在测试站没有 redemption 行（换库/清理） | 测试站多次部署 | 部署含 DB 重置的证据：待确认 | 同查询返回 0 行 |
| H3 | 助手 token 来自别的环境/origin | `.tygf_session` 有 origin 列表 | 坏签名会先命中 BAD_SIGNATURE（10-18 01:16 出现过） | 助手状态看当前 origin；解析 token 的 aud/iss（不打印值） |
| H4 | 运行码停用/过期、激活超期 | 10-16 曾 ACTIVATION_REVOKED | 这些会落到 CODE_DISABLED/EXPIRED/INSTALL_BINDING_INVALID，与观测码不符 | DB 查 code.status/expiresAt、activation 状态 |

判定顺序：先跑 P0（人可恢复）→ 若仍失败，按 §5 只读 SQL 对账，再定 H1/H2。

## 4. 执行方案

### P0（立即；Owner 自操作；不改代码；约 2 分钟）

1. 回 `test.tuyigf.com` 工作台 → 连接卡点「重新连接」（`assistant-setup-banner.tsx:241`），按弹窗在助手侧确认；页面刷新一次。
2. 若仍报同码：托盘完全退出助手（结束 22684 / 22720）→ 重新启动助手 → 再点「重新连接」→ 刷新页面。
3. 再点一次「选择文件」。

- 验收：助手日志不再出现 `rejected reason=ASSISTANT_DEVICE_INVALID`；文件选择框弹出；工作台不再弹该提示。
- 回滚：无（纯重连；只新增一代授权行）。
- 失败处置：**停止反复点**，保留日志时间点，进 P1 只读对账；不做「再试一次」式恢复。

### P1（服务端可诊断性 + 细分码；测试站部署需 Owner 授权）

1. `assistant-redemption-token.ts`：布尔改为 `{ matched, rowExists, rowJtiNull, rowUpdatedAt }`（一次 raw SQL 取行，不返回 token）。
2. `assistant-authorization.ts`：细分 `ASSISTANT_DEVICE_GENERATION_STALE`（行在、jti 不同）/ `ASSISTANT_DEVICE_UNBOUND`（无行）；原码保留一版作兼容别名。
3. `ticket/verify/route.ts`：该分支加 `console.warn`（assistantCodeId 前 8 位、machineId 的 sha256 前 12 位、tokenHasJti、rowHasJti、rowUpdatedAt），**零 token 明文**。
4. 工作台：两码映射到同一个「重新连接」动作（接 banner），toast 文案分别说明。
5. 只读诊断端点（owner-only）：`GET /api/admin/assistant-device-status?machineId=…` → `{bound, generationStale, rowUpdatedAt, codeStatus, activationStatus}`。

- 验收（部署后）：负控①旧代次 token → STALE；负控②未绑定 machineId → UNBOUND；正控（重连后的新 token）→ `valid:true`；服务端出现对应 warn 行。
- 回滚：单文件回退；无 schema 变更；不动计费/合同。

### P2（助手发版：把文案补丁真正送到运行版；需 Owner 授权）

1. 用含 `58a483c` 的源码打引擎包；buildId 升到 `transport-hardening-20261020-r1`（或发版线约定值），同步 `release-identity.json`、安装包声明、测试站 `expectedAssistantBuildId`。
2. 文案：DEVICE/GENERATION 码统一为「请回工作台断开本地助手，再重新连接当前电脑」，删除「刷新工作台」。
3. 验收：安装后 `/api/runtime-provenance` expected==actual；负控一条旧 token 触发新文案；正控选择文件成功。
- 回滚：保留上一版 exe（目录内已有 `.bak`），provenance 回滚到旧 expected。

### P3（防复发）

1. 部署检查单（`scripts/release-preflight.cjs` / docs）：凡涉及 `tokenJti`/redemption 的变更，必须跑「旧代次负控 + 重连正控」。
2. `smoke-local-assistant-errors.mjs`：静态分支断言升级为行为断言（调 `ticketFailureMessage('ASSISTANT_DEVICE_INVALID')`，断言含「重新连接」、不含「刷新」），出包门校验产物含该字符串。
3. 发布门：`expectedAssistantBuildId` 与安装包 buildId 绑定校验（当前为人工对齐）。

## 5. 只读对账 SQL（P1 前置，不写库）

```sql
SELECT id, assistantCodeId, machineId, tokenJti IS NULL AS jti_null,
       tokenExpiresAt, createdAt, updatedAt
FROM AssistantCodeRedemption
WHERE assistantCodeId = '<码 id>'
ORDER BY updatedAt DESC LIMIT 5;
```

判读：① 有行且 `jti_null=0` 且 updatedAt 晚于 10-18 → H1（代次漂移），重连必解；② 0 行 → H2；③ `tokenExpiresAt < now` → 授权续期议题。
（本会话无法直连测试站 DB，以上为待执行步骤。）

## 6. 不做 / 红线

- 不放松 jti 校验、不加「任何旧 token 永久有效」的旁路（会破坏吊销语义）。
- 不自动重连、不自动重试（会掩盖真实代次问题）。
- 不改计费/合同/结算语义；不动生产站；测试站部署与助手发版均需 Owner 明确授权；DB 只读。
- 不复制/外传 `.tygf_session`（硬件绑定）。

## 7. 验收清单

1. 助手日志 24h 内无 `ASSISTANT_DEVICE_INVALID`。
2. 「选择文件」成功弹出（P0 第 3 步）。
3. `/api/runtime-provenance` expected==actual（P2 后）。
4. 负控：旧代次 token 得到明确码与新文案。
5. 失败快照：失败时 `.tygf_failures` 有对应快照（10-18/19/20 三次未落盘，待确认原因）。

## 8. Product Convergence Review

- **MISSING**：代次失效的细分码/自助入口；部署后负控。
- **PARTIAL**：文案补丁只在源码（`58a483c`），运行版缺失。
- **CONTRADICTS**：无（UI 提示与助手文案不一致，已在 P2 统一）。
- **UNREQUESTED**：无（本方案不新增用户可见功能，只改错误路径）。

## 9. 证据索引

- 助手：`download/local-assistant/server.js:4942`（select-file）、`:4945`（verifyTicket）、`:3396-3402`（新文案）、`:3407`（兜底）；日志 `E:\软件\图译工坊本地助手\logs\assistant-events.log`。
- 云端：`src/app/api/local-assistant/ticket/verify/route.ts:128-146`；`src/lib/server/assistant-authorization.ts:22-28`；`src/lib/server/assistant-redemption-token.ts:13-20`。
- 站点：`https://test.tuyigf.com/api/runtime-provenance`（BOUND `6ff5c3c`）。
- 版本：`E:\软件\图译工坊本地助手\release-identity.json`；引擎 exe mtime 2026-10-12 16:25。
- 提交：`6d9e169`（tokenJti 引入，10-10）、`58a483c`（文案补丁，10-18 22:15）。
- 运营侧相关：ledger `TESTSITE-4FIX-8DA9D07`（10-19：「10-08 签的令牌无 jti，只能重配」）。
