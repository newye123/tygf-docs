# 执行报告：测试站「文件选择许可」报 ASSISTANT_DEVICE_INVALID —— 根因确证与修复落地

- 日期：2026-10-20
- 触发：Owner 两轮指令 —— ①「现在测试站无法验证本次文件选择许可（ASSISTANT_DEVICE_INVALID），请刷新工作台后重试」；②「使用对抗式审查后给个执行方案，然后按你的建议去执行」
- 范围：只读取证 + develop 代码修复 + 测试站部署；**未发助手安装包、未动生产站、未改计费/合同/结算语义、未写测试站 DB**
- 配套 HTML：同名 `.html`（同目录，本地查看）

## 0. 一句话结论

不是「许可过期」，是**旧令牌代次失配**；而且浏览器端「可自动修复码白名单」漏了这一项，导致它永远自愈不了。修复已入库并部署，Owner 点一次「选择文件」就会自动完成一次授权迁移。

## 1. 根因（三条实测证据，H1 唯一成立）

**证据 1 —— 助手按 origin 存授权，三个 origin 的令牌不是同一代**（本机 `Origin` 头打 `/ping`，只读到期时间，未读取 token）：

| Origin | 助手存的授权到期时间 | 相当于签发于 |
|---|---|---|
| `https://test.tuyigf.com` | `2026-10-22T01:34:30.780Z` | **10-08**（旧代次，无 jti） |
| `https://tuyigf.com` | `2026-10-27T09:57:03.588Z` | 10-13 |
| `http://localhost:3000` | `2026-10-31T17:16:44.353Z` | 10-18（最新，落在 legacy 槽位） |

**证据 2 —— 测试站 DB 只读盘点**（`sqlite3 -readonly`，15 条授权行）：最近两条 `redeemedAt` 分别为 2026-10-16 16:55、**2026-10-18 01:16（+08）**，两行 `tokenJti` **均非空** ⇒ 该机在测试站的授权行已经换过代次。

**证据 3 —— 助手日志时间线**：`10-18 01:16` 出现 `ASSISTANT_TOKEN_BAD_SIGNATURE`，同一秒数据库落下新代次授权行；此后 `10-18 17:28` 起恒定 `ASSISTANT_DEVICE_INVALID`，`cloudStatusCode=200`（业务拒绝，不是传输失败）。

**判定**：测试站 origin 槽位里躺着 10-08 签发的**无 jti 旧令牌**，而授权行在 10-16/10-18 已轮换出 jti。服务端判据是 `(assistantCodeId, machineId, tokenJti)` 精确匹配（`assistant-redemption-token.ts`），`tokenJti IS ?` 对 NULL 只匹配 NULL ⇒ 旧令牌必然落空 ⇒ `ASSISTANT_DEVICE_INVALID`。**刷新网页不会换令牌，所以「刷新工作台」永远无效。**

**附带结构问题（已定位，未改）**：10-18 那枚新令牌被 legacy 槽位挂到了 `http://localhost:3000` 名下——助手 `serverUrl` 后来改成本机地址，而 `authorizationForOrigin` 只在 `origin == serverBase` 时回落 legacy 字段。结果是「新令牌在手却用不上」。

## 2. 真正的 bug（比文案严重）

`src/lib/workbench/local-assistant-client.ts:556` 的 `REPAIRABLE_ASSISTANT_CODES` **漏了 `ASSISTANT_DEVICE_INVALID`**。其余旧授权码（`TOKEN_EXPIRED` / `TOKEN_BAD_SIGNATURE` / `INSTALL_BINDING_INVALID` / `DEVICE_RELEASED`）都会触发一次当前 origin 的 `/pair` 迁移再复验，唯独代次失配被直接抛出 ⇒ 用户只能反复看到同一个错。

## 3. 对抗式审查六路 → 各自落点

| 路 | 发现 | 本次落点 |
|---|---|---|
| A 鉴权/安全 | 拒绝本身正确（fail-closed）；风险在「放宽 jti 旁路」 | **不动判据**；只加解释性 `subReason`，对外码与 HTTP 语义一字不变 |
| B 协议/状态机 | 200+`valid:false` 让客户端 `cloudStatusCode=200` 误读为网络正常；服务端零日志 | 保留 200 兼容语义；补结构化 warn（码前缀 / machineId 哈希 / 是否带 jti，零 token） |
| C 运行时身份 | 安装版 `transport-hardening-20261011-r1`（10-12 构建）不含 `58a483c`（10-18）专属文案 ⇒ 用户只看到兜底「刷新工作台」 | **网页侧不依赖安装版**即可给出正确引导；安装包发版另案（须 bump buildId + 同步站点 expected） |
| D 运维/部署 | 「旧代次负控 + 重连正控」从未进发布检查单 | 写成 smoke 断言并已随 `test:trust-chain` 长期生效 |
| E 可恢复性 | UI 有「重新连接」入口，但错误文案把人引向无效动作 | 文案改为「点重新连接；刷新不会恢复」+ **自动迁移**（点一次就好） |
| F 测试 | 缺「代次失配必须可自动修复」的回归守卫 | 新增 3 条静态断言（可修复白名单 / 文案 / subReason 透出） |

## 4. 改动清单（develop `6a268fe`）

| 文件 | 改动 | 为什么 |
|---|---|---|
| `src/lib/workbench/local-assistant-client.ts` | `REPAIRABLE_ASSISTANT_CODES` 增加 `ASSISTANT_DEVICE_INVALID` | 让 `ensureAssistantBinding` 走一次 origin `/pair` 迁移后复验（旧代次可自愈） |
| 同上 | 新增 `ASSISTANT_DEVICE_INVALID_MESSAGE` + `assistantFailureCopy()`，select-file / select-folder 优先用本地中文口径 | 不再透传旧助手兜底文案；「刷新」不再出现 |
| `src/lib/server/assistant-redemption-token.ts` | 新增 `describeAssistantRedemption()`（返回 matched / rowExists / rowJti），`hasCurrentAssistantRedemption` 复用同一行读取 | 同一个码能区分「无授权行」与「代次已轮换」，且不产生第二套判据 |
| `src/lib/server/assistant-authorization.ts` | 失败时带 `subReason: 'TOKEN_GENERATION_STALE' \| 'DEVICE_UNBOUND'` | 可诊断；对外码不变 |
| `src/app/api/local-assistant/ticket/verify/route.ts` | 透出 `subReason` + 结构化 `console.warn` | 这次事故之所以只能靠客户端日志推断，就是服务端零日志 |
| `scripts/smoke-assistant-binding-migration.mjs`、`smoke-assistant-token-binding.mjs`、`smoke-local-assistant-errors.mjs` | 更新/新增静态断言 | 把本次事故钉成回归守卫 |

## 5. 验证（真实命令与返回码）

- `npx tsc --noEmit` → rc=0
- `npm run test:assistant-binding-migration` → rc=0（passed）
- `npm run test:assistant-token-binding` → rc=0
- `npm run test:assistant-auth-barrier` → rc=0（4 枚子脚本全过）
- `npm run test:batch-row-contract` → rc=0（all assertions passed）
- `npm run test:error-message-contract` → rc=0（all invariants passed）
- `npm run test:trust-chain` → rc=0（整链全绿）
- `npx eslint`（4 个改动文件定向）→ rc=0
- `npm run release:preflight:test` → **passed: develop 6a268fe04860479e182ba09867c7eaf9548de7c4**
- `npm run release:package:test` → `tygf-test-6a268fe04860.zip`（41,052,502 B），SHA-256 `7C2D73B4D3FE52071BDF0E5422179C4C38516E61A284A962653170A74206DC9C`
- **测试站部署（已完成）**：`scp` 上传 23s；`sudo bash /var/www/tygf-test/deploy/deploy-test-release.sh` → `[test-release-deploy] deployed commit 6a268fe04860479e182ba09867c7eaf9548de7c4`，备份目录 `/var/www/tygf-test-backups/deploy-20261020_095821-6a268fe04860`
- **上线核验**：服务器 `.deploy-commit` = `6a268fe04860479e182ba09867c7eaf9548de7c4`；pm2 三进程 **online / ↺0 重启 / uptime 25s**；`/api/runtime-provenance` = **BOUND**、`webCommitSha=6a268fe…`、expected 助手身份不变（3.7.15 / `transport-hardening-20261011-r1`）；服务器已部署源码实查 `local-assistant-client.ts:579` 含 `'ASSISTANT_DEVICE_INVALID'`（可修复白名单）、`:557/:562` 含新文案口径、`assistant-authorization.ts:40` 含 `subReason` 判定
- `git push origin develop` → `6ff5c3c..6a268fe`（origin/develop = 6a268fe）

## 6. Owner 需要做的一步

**修复已上线（测试站 = 6a268fe）。现在直接再点一次「选择文件」即可**：浏览器先跑 `ensureAssistantBinding()`，命中代次失配就自动做一次当前 origin 的 `/pair` 迁移（换新代次令牌写回助手）再复验，通过后弹出文件框。

- 若浏览器还缓存着旧 JS，按一次 `Ctrl+F5` 硬刷新再点。
- 想手动也行：工作台连接卡点「重新连接」。
- 验收信号：本机助手日志出现 `/pair` 成功、随后 `authorization/check` 不再返回 `ASSISTANT_DEVICE_INVALID`；`/ping` 的 `activationExpiresAt` 应从 `2026-10-22T01:34:30Z` 变为新的到期时间。

## 7. 边界与遗留（本次明确不做）

- **助手安装包未发版**：运行版仍用兜底文案；网页侧已覆盖引导，但装好新包前，老版本用户仍会看到旧文案。发版需 bump buildId 并同步站点 `expectedAssistantBuildId`，另案处理。
- **legacy 槽位漂移未修**：`serverUrl` 改动会让 legacy 令牌改挂 origin（本次即触发事故的机制）。建议后续把 legacy 令牌按签发 origin 归档，或在换 origin 时做一次显式迁移——属结构性改动，未在本次一并做。
- **未写测试站 DB**：只读盘点；未改生产站；计费、合同、结算语义未动。
- **他人线告警未代改**：非法状态枚举 5 条、飞书 held 2 行等属各条属主。

## 8. Product Convergence Review

- **MISSING**：旧代次场景的自助入口（本条已补）；服务端代次拒绝的可诊断性（本条已补）。
- **PARTIAL**：助手安装包仍缺 10-18 文案补丁（`58a483c`），发版前老版本仍显示旧文案。
- **CONTRADICTS**：无（助手兜底文案与 UI 提示原先互相矛盾；网页侧已统一为「重新连接」口径）。
- **UNREQUESTED**：无（未新增用户可见功能，只改错误路径与恢复路径）。

## 9. 证据索引

- 助手侧：`download/local-assistant/server.js:4942`（select-file）、`:4792-4830`（authorization/check 返回 reason）、`:3700-3765`（按 origin 取授权 / legacy 回落）；`E:\软件\图译工坊本地助手\logs\assistant-events.log`。
- 云端：`src/lib/server/assistant-authorization.ts`、`src/lib/server/assistant-redemption-token.ts`、`src/app/api/local-assistant/ticket/verify/route.ts:128-165`。
- 测试站：`/api/runtime-provenance`（BOUND）、只读 SQL 盘点（15 条授权行）、`/ping` 三 origin 到期时间。
- 提交：develop `6a268fe`（本次修复）；`6d9e169`（tokenJti 引入，10-10）、`58a483c`（助手文案补丁，10-18，未进安装包）。
- 关联：ISSUES `#184`；ledger `TESTSITE-DEVICE-INVALID`。
