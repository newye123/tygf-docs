 
---

## T-0054 【2026-08-29】智能检测失效与组合绑定伪阻塞——按 Goal Contract 五阶段实施（未部署）

- **执行方式**：用户下达 Goal Contract（文件白名单/红绿证明/原始输出证据/stop conditions），本条为合同执行记录。方案根因见 T-0053 与 `docs/图译工坊_智能检测失效与组合绑定优化方案_20260829.md`。
- **CP1/CP2（P0-A，`3d5f137`）**：先在 smoke-binding-compiler 写用例 24/25/26 跑出 RED（binding-core.ts:769 抛 V15_COMBINED_AMBIGUOUS 最小复现），再实现等价裁决转 GREEN：`compositeMatchForLayer` 加 resolveEquivalent/avoidRowPositions（等价候选写入结果一致→自动绑定；等价副本避让已占用行防同抢第一副本）；:1082 不可写探测语义不变；既有 :479 GLOBAL 真歧义用例保持拦截。
- **CP3（P0-B，`f9ec1cd`）**：reviewRowsWithDeepSeek 拆出可注入 deps 的 reviewRowsWithDeps；40 行/批、单批 60s、重试 1 次；部分批次失败返回部分结果+中文提示，全失败保持抛错；safeErrorMessage 对 TimeoutError/abort 映射中文。smoke 注入 fake 模型验证超时注入/重试恢复/全失败三态。
- **CP4（P1-A，`5c10062`）**：半互换过滤器对"目标出现 ≥2 次"豁免原子性（唯一目标仍拦截、成对互换保留，双向断言）；提示词候选改 {text,count} 并加候选证据规则（旧 Set 去重抹掉重复证据）；新增 detectOrphanTargetSegments 孤儿译文锚定分段检测。**实测偏差**：长度方差分段判据在真实英日文案上不可靠（正确配对长度比波动大，fixture 曾误判 k=+3），弃用换孤儿锚定（孤儿空原文行=错位插入点签名），JP-5294 真实数据 fixture 精确命中 idx6-11/-1。
- **CP5（P1-B，`8c14bb8`）**：prepare-check-labels 加 case 'combined'（两种 V15_COMBINED_* 各有人话文案+处置指引+「返回智能检测」）；object-inspector gotoReview 纳入 combined；smoke 断言三种码非裸码/有说明/有出路。
- **CP6（P2，`0c569c7`）**：review-step 加 onAfterApply；workbench-view 接 runBatchCheck 应用后自动重查 + 检查台收敛进度横幅（已应用 N 条/剩余 M 项）。
- **验证**：每 commit 均 `npx tsc --noEmit` 0 错误、`npm run lint` 0 错误（2 既有警告）、`npm run test:trust-chain` 18 项 passed；P0-A 加跑 `test:batch-row-contract` passed；新 smoke `scripts/smoke-deepseek-review-filters.mjs` passed。diff 对账：`git show <hash> --stat` 与白名单一致（期间发现并行窗口提交 bc1e84b 把 csv-step/siteContent 改动入库，非本窗口提交内容）。
- **遗留**：① 新 smoke 未接入 package.json scripts（白名单外待批准）；② ~~未部署测试站~~ → **已于同日部署**（见 T-0055）；③ AiTokenUsage 超时记录与 deepseekModel 型号待确认；④ HANDOFF 偏差登记表已登记【合同变更】待追认。

---

## T-0055 【2026-08-29】T-0054 五阶段修复部署测试站（ff87acb）

- **流程**：codex/v1.5-trust-chain `25ba533` → 合并 develop（`ff87acb`，干净合并）→ develop worktree 跑 `scripts/package-release.cjs test`（preflight + release identity 通过：branch develop、树干净、assistant 3.6.16/Node 22）→ paramiko 上传归档+收据 → 服务器 `deploy-test-release.sh`（自带收据 SHA 校验/备份/健康检查/失败回滚）。
- **结果**：`[test-release-deploy] deployed commit ff87acb772fab602ccf03aac6525749f093cfdc2`；备份 `/var/www/tygf-test-backups/deploy-20260829_210843-ff87acb772fa`；归档 SHA-256 `A34D1A6B8F809E40048EC4775CA040DDE0047B2A1DC2A3EC80E8544190A6E77A` 与收据一致；`.deploy-commit` 回读一致。
- **验证**：PM2 tygf-test + tygf-test-auth-mail online；本地 3001=200；standalone sanitize（移除 env 文件）+ boundary + assistant contract + Prisma in sync 全过；AI usage backfill `updated aiUsage:95`（0 新事件）。公网无 key=403（nginx `?key=` 门，`$tygf_test_token` 定义于 sites-available/tygf-test:11，属设计行为），**带 key=200** ✅。支付 flag 未触碰。
- **记录与清理**：部署用临时 paramiko 脚本（含服务器凭据）已按密钥纪律删除；develop worktree 停留在部署 commit，记录类提交按既有实践留在 codex/v1.5-trust-chain。
- **遗留**：用户用 JP-5294 CSV 人工验收；~~新 smoke 接 package.json 待批~~ → **已接 `fa361f0`**（`npm run test:review-filters`，用户"继续"视为批准）。

---

## T-0053 【2026-08-29】智能检测超时零输出 + V15 组合阻塞死胡同——根因分析与方案文档（未改代码）

- **现场**：JP 日本-5294.csv（112 行，含两个重复产品区块，第二区块约 8 行局部错位）→ ① 智能检测报 "The operation was aborted due to timeout" 零建议；② 4 条 V15_COMBINED_AMBIGUOUS/V15_COMBINED_GLOBAL_AMBIGUOUS「必须处理」卡死，「知道了」「返回智能检测」均无出路；③ 用户体感"越改越出错"。
- **第一性原理结论**：正确判据是"写入结果唯一确定"，不是"数据无重复"。绑定层 `compositeMatchForLayer`（binding-core.ts:430 只数候选个数）与全局争夺判定（:816-826 只看 rowId 占用）把等价冗余当真歧义；单行层 `canonicalizeTranslations`（:488-514）原则正确，组合层未跟上。
- **智能检测五级失效根因**：⑴ 112 行单次调用 + max_tokens 32768 + 120s AbortSignal（deepseek-align.ts:285-300,662-664）必然超时，英文错误经 safeErrorMessage（http.ts:21-30）裸透传；⑵ detectColumnShift（:568）是整列恒定平移检测，8/112 局部错位必漏；⑶ 提示词 targetCandidates 用 Set 去重（:223-229），抹掉"译文重复出现"这一最强错位证据；⑷ 半互换过滤器（:705-745）按排他占用语义执行，重复表中每个译文有镜像持有行 → 有效错位修正建议几乎全被误杀（"越改越出错"机制）；⑸ 审查建议应用后组合关系变化 → 新阻塞，无收敛闭环。
- **对抗审查 8 条**：等价自动选择安全（比较含 sourceBoundaries 的完整拼接文本）；"冲突自动取第一区块"已否决（违反 MULTI_TARGET 同源多译事实）；过滤器放宽精确限定"目标出现 ≥2 次"才豁免原子性；其余见方案文档第四节。
- **产出**：`docs/图译工坊_智能检测失效与组合绑定优化方案_20260829.md`（P0-A 绑定等价裁决 / P0-B 分批+重试+报错中文化 / P1-A 审查链路适配重复表 / P1-B combined 人话文案+出路 / P2 审查-检查闭环，含验收标准与回滚）。
- **验证**：本轮纯分析+文档，无代码改动；未跑 tsc/lint（无变更）。
- **遗留**：实施待用户批准；后台 AiTokenUsage 超时记录与 deepseekModel 型号待确认；实施时 P0-A 属绑定语义变更，须跑 test:trust-chain 并在 HANDOFF 偏差登记表标注【合同变更】。

---

## T-0052 【2026-08-29】PS 超时双故障修复 + 悬挂批次防重入（已部署测试站）

- **现场**：测试站页面报“Photoshop 长时间未完成”；只读对账确认 6 个独立批次均悬挂 RUNNING，首语言 attempt 0/8、后续语言 PENDING。
- **对抗结论**：不是单一弹窗。JSX 保存阶段可能被模态提示阻塞；助手只有启动 heartbeat；浏览器连续吞掉状态 fetch/404 后误报 20 分钟超时；恢复流程没有阻止 active attempt 再次进入新批次。
- **修改**：执行器写入 OPEN/ASSIGNMENT/SAVE/PREVIEW/REOPEN 进度，wrapper 全周期 `DialogModes.NO`；助手按进度刷新 heartbeat；浏览器分类断联/attempt 丢失/ID 不一致；activeAttemptId 未对账时禁止 quote/confirm/attempt/Photoshop 重入。
- **发布物**：助手 3.6.16（`v15-ps-heartbeat-recovery-20260829`），unsigned beta SHA-256=`BC562BAE0EB5906BAD965DE06C07AF1E49A07C9476CC41E11A3FEFD05BCCA51C`；功能提交 `af5abb6`，测试候选 `9709686`，备份 `/var/www/tygf-test-backups/deploy-20260829_180609-9709686d4fcd`。
- **验证**：tsc ✅；lint ✅（0 error/2 既有 warning）；v3-batch-flow ✅；batch-row-contract ✅；trust-chain ✅；release identity/consistency ✅；引擎自检 ✅；完整 build ✅；测试站源站 200、PM2 双进程 online、latest/安装包版本/大小/SHA 一致 ✅。
- **只读对账**：6 个悬挂批次均为 ES RUNNING 0/8 + 4 语言 PENDING；6 笔 reservation 共 240 分仍 reserved；本地回执、输出指纹、settlement 和 commit/release/refund 流水均为 0。本轮未写积分。
- **遗留**：测试机安装 3.6.16 后新建真实批次验收；历史 6 批的幂等结算或释放须另行批准，不删除或回溯改账。

---

## T-0051 【2026-08-29】"同一位置反复炸"根因分析 + 三层避免机制落地

- **用户之问**：为什么总在批次链同一位置反复调整？
- **根因（四条）**：① 同一合同（可执行行集合）写在四层（浏览器投影/助手 evidence/服务端报价/结算闸），修一漏三；② 真 E2E 长期被阻断，修复叠在未验证地基上，smoke 无法发现前提性错误（T-0049 即例证）；③ 多窗口并行改同链，HANDOFF 传不了深层约定；④ 修复方式是加闸门而非收敛唯一权威。
- **三层避免机制落地**：
  1. **事故固化**（`caf790b`）：`smoke-batch-row-contract` 新增场景 5——未匹配行（有译文无绑定）跨层一致断言：evidence INCLUDED 集 = 服务端 units>0 集 = 浏览器冻结集（基准=真实绑定，非浏览器投影）；纳入 `test:batch-row-contract`（改用 ts-path-loader）。
  2. **协作铁律**（AGENTS.md 工作规则新增）：合同变更必须同提交同步全层 + 更新 contract fixture + 跑 `test:batch-row-contract`/`test:trust-chain` 后才可部署。
  3. **发布纪律**：计费改动以真实批次执行号证据为完成标准（坚持既有做法）。
- **验证**：扩展后 contract smoke 全绿（含新场景 5）。
- **遗留**：等待测试机复测闭环 #29；确认页预估为本地口径（已知偏差可接受）。

---

## T-0050 【2026-08-29】BREAKDOWN_MISMATCH 真根治（服务端权威口径）+ 赠送积分口径纠正（已部署）

- **现场**：上轮修复（T-0049）部署后测试机仍报 BREAKDOWN_MISMATCH；另发现注册/内测赠送积分倒置（+800/+88，应为 100/788）。
- **对抗式审查结论**：T-0049 修错对象——`kind:'unmatched'` item 全库无产出方（binding-core 只算计数，labels.ts:38 死分支），浏览器侧 `unmatchedTranslationRowIds` 恒空。赠送倒置为测试站 DB 覆盖（`ApiCredential.creditsSignupBonus='800'`）+ 补差逻辑（888−800=88）。
- **修复**（`5a44f7a`，合并 develop 部署测试站，备份 deploy-20260829_152832）：
  1. 服务端 quote breakdown 补行级字段 `standardUnitsByRowToken`/`standardUnitsByRowAndLanguage`（同源计算，幂等早退分支同步补）。
  2. `v3-batch-flow` 报价后采用服务端权威 breakdown（A4）；attempt 冻结 tokens/units 由权威口径推导（与回执/finish 闸一致）；原 mismatch 硬抛降级 console.warn（本地预估仅 UI 展示，误伤多余行场景）。
  3. 测试站 DB `creditsSignupBonus` 800→100（新用户恢复 100+788；存量 888 不动）。
- **验证**：tsc/lint(0 error)/v3-batch-flow/entry-modes/billing-evidence-rows smoke 全绿；部署健康 200；DB 改动前后值已核验。
- **遗留**：测试机复测闭环（#29）；技术债：prepare-check 缺行级 unmatched items（登记于 #29）；确认页预估仍为本地口径（偏高显示，有"以服务端为准"兜底）。

---

## T-0049 【2026-08-29】BREAKDOWN_MISMATCH 根治 + 内部错误码中文化（已部署）

- **现场**：测试机装 3.6.15 后批量执行报 `BATCH_BILLING_BREAKDOWN_MISMATCH`（用户反馈英文错误码不可读）。
- **根因**：浏览器计费投影未与 3.6.15 助手 evidence 对齐——浏览器硬编码每行 `requiredObjectCount:1` 全 INCLUDED（24 行），助手按真实绑定排除未匹配行（22 行），报价明细两侧分叉触发 v3-batch-flow 一致性护栏。
- **修复**（`77ecba4`，合并 develop `ee1c9a2` 部署测试站，备份 deploy-20260829_125910）：① workbench-view 新增 `unmatchedTranslationRowIds` memo（prepare-check unmatched 汇总）→ ExecuteStep 新 prop；② allRows 未绑定行标 EXCLUDED+0 对象（`computeRowLanguageStandardUnits` 对 EXCLUDED 计 0，两侧 breakdown 对齐；attempt 冻结 22 tokens 与回执一致，finish 闸通过）；③ v3-batch-flow 两个 throw 附中文说明（保留码）。
- **验证**：tsc/lint(0 error)/v3-batch-flow/entry-modes/billing-evidence-rows smoke 全绿；部署健康 200。
- **遗留**：测试机复测完整批次（含多余行）确认闭环；#29 待复测关闭。

---

## T-0048 【2026-08-29】批次收尾对抗式审查 + 云端兜底加固（已部署测试站）

- **任务目标**：对抗式审查另一窗口的 3.6.15 修复（unbound rows 排除），补齐缺口并部署。
- **审查结论**：修复方向正确（证据阶段排除而非失败回执，链路自洽，smoke 通过）；发现 3 缺口——云端无兜底、finish 文案误导、死键/术语残留。
- **修改**（`f388f01`，合并 develop `f416e1e` 部署测试站，备份 deploy-20260829_120301）：
  1. `billing-challenge.ts`：拒绝 `INCLUDED && requiredObjectCount===0`（`BATCH_EVIDENCE_ROW_UNBOUND`）；扩展错误码联合类型。
  2. `finish/route.ts`：`BATCH_RECEIPT_INCOMPLETE` 文案补真实原因（多余行/升级助手/重置重跑）。
  3. `siteContent.ts` 删 `execLocked*` 三死键；`batch-execution-mode.ts` enabled 消息中性化。
  4. `smoke-billing-challenge.mjs` T3b 断言 INCLUDED+0 被拒；`smoke-batch-entry-modes.mjs` doesNotMatch 术语断言。
- **验证**：tsc/lint(0 error)/billing-challenge/billing-evidence-rows/entry-modes/grey-release smoke 全绿；部署后健康 200、latest=3.6.15。
- **遗留**：测试机装 3.6.15 后重跑含多余行批次做真实验收（#29 复测）；存量卡住批次靠 72h 过期清扫释放冻结；#31 文案直改开源集成待改进（用户备忘，已登记）。

---

## T-0047 【2026-08-27】#26 扫描哈希后台化 + canary 批量解锁 + 灰度开放门控（已部署测试站）

- **任务目标**：修复测试机慢盘扫描 15 秒超时（ISSUES #26）；解锁测试站批量（用户"来吧"）；按用户决定：批量不加登记门槛，灰度门控改为加在登录/注册/积分包上。
- **方案/修改**：
  1. #26：助手 `/v1.5/preparation/scan` 拆为 202 立即响应 + 后台 `sha256FileAsync` 分块哈希（进度回调）+ PS 扫描；结果暂存 `preparationAsyncResult` 供 status 轮询取走；前端透传 `hashing` 态、超时文案按 URL 区分；版本 3.6.14/v15-scan-async-20260827，pkg+Inno Setup 重打安装包并更新 manifest（15f8970/5333e4b）。
  2. 批量门控：`canary` 模式实现（396f279），后按用户决定简化——白名单为空=放行所有已激活用户（088ba95）；测试站 .env 设 `TYGF_ENVIRONMENT=test`、`TYGF_BATCH_EXECUTION_MODE=canary`、白名单留空。
  3. 灰度开放门控 `grey-release.ts`：`TYGF_BETA_ALLOWLIST_EMAILS` 非空即激活——登录（密码校验后检查）、注册（占用邀请码前检查）、积分包下单（服务端权威）三入口只放行名单内邮箱；`scripts/smoke-grey-release.mjs` 固定合同；.env.example 文档化（e2bc0ab）。
- **验证**：tsc/lint(0 error)/entry-modes+grey-release+v15-runner smoke 全绿；check-release-identity passed 3.6.14；测试站部署 3160b01（备份 deploy-20260827_224018）；健康 200，latest=3.6.14，安装包 200/12630450。
- **遗留**：测试机安装 3.6.14 后真实验收扫描与批量（B3）；`batchBillingV3Enabled` 默认 true 无覆盖生效；测试站 DB 有 `alipayPaymentsEnabled=true` 覆盖但 `creditPacksEnabled=false`，积分包入口仍锁（支付红线待用户批准）；#26 需慢盘验收后才关闭。

---

## T-0046 【2026-08-27】测试机中文路径乱码与下载入口修复

- **现场**：测试机 3.6.11 选择含中文目录 PSD 后路径显示 `����` 并报不存在；直接访问 `/download` 出现 `ERR_INVALID_RESPONSE`。
- **根因**：Windows PowerShell 按本机代码页输出文件名，Node 固定按 UTF-8 解码；测试站页面门禁要求 `?key=`，下载入口写死 `/download` 导致站内跳转丢 key。安装包直链始终可用。
- **修复**：picker 设置 `[Console]::OutputEncoding` 为无 BOM UTF-8；下载入口和返回工作台链接使用 `useAccessKeyHref`；发布助手 3.6.13；发布归档只携带当前安装包，体积由 88 MB 降至 15.8 MB。
- **发布**：功能 `088729c`、归档 `bfb9f33`；develop `43202f1613f3f81fbae187e41318fd7f55aed872`；安装包 SHA-256 `B320E5AB974104F4E751907DE620165230424DC14886CE6983980D08B19B5BAF`，大小 12632170；回滚 `/var/www/tygf-test-backups/deploy-20260827_203359-43202f1613f3`。
- **验证**：定向 smoke、语法、v15 runner、tsc、lint、发布身份、真实安装、测试站 latest/download 均通过。本机 49152=`3.6.13/v15-picker-utf8-20260827`。无 key 的 `/download` 继续 403；公开说明页需用户明确批准。
- **边界**：未修改生产站、`main`、支付开关或 Photoshop 文件；无关 `_check-codes.sh` 未提交。

---

## T-0045 【2026-08-27】文件选择框按按钮点击位置弹出与助手 3.6.12

- **目标**：在保持 Windows 文件框置顶与单实例保护的基础上，让“准备素材 → 选择设计文件”在用户点击按钮所在显示器、靠近点击坐标的位置弹出。
- **实现**：Web 捕获点击事件的 `screenX/screenY` 并随 `/v1.5/select-file` 请求传给助手；助手在验票后校验坐标，以 `Screen.FromPoint` 选择屏幕、用 `WorkingArea` 约束 owner 位置，无坐标时回退到当前鼠标位置。未采用全局钩子或强行移动系统对话框。
- **发布**：功能提交 `d97fc4e` 已推送；`develop` 候选 `c6902d86534b26ac4220c6639c6025202c3d759d` 已部署测试站；助手 3.6.12 安装包大小 12630667，SHA-256 `1E24A16C1247756D25F726CD752225663612EE48E5E43A4F75C0FC51A66770AC`；回滚备份 `/var/www/tygf-test-backups/deploy-20260827_140745-c6902d86534b`。
- **验证**：anchor/TopMost smoke、server 语法、v15 runner、release consistency、tsc、lint（0 error/2 既有 warning）、构建和发布身份通过；本机 49152 `/ping`=3.6.12；服务器 3001 延迟复验 200；latest API 与安装包下载合同通过。Windows 实际弹出位置与层级待用户目视确认。
- **边界**：未修改另存目录 picker、生产站、`main` 或支付开关；无关 `_check-codes.sh` 未提交。

---

## T-0044 【2026-08-27】准备素材文件选择框强制置顶与助手 3.6.11

- **目标**：只修复工作台“准备素材 → 选择设计文件”的 PSD/PSB 文件选择框层级，不修改另存目录 picker。
- **实现**：`/v1.5/select-file` 的临时 owner 先 Show/Activate/BringToFront，再作为 OpenFileDialog owner；关闭后 finally 取消 TopMost、Close/Dispose；增加进程级单实例锁与 409 分类；新增置顶合同 smoke。
- **发布**：功能提交 `872756b`；助手 3.6.11 安装包 SHA-256 `8B48F31B8CEDF17E10D4E1C4A84DB23A79538972A5CB1023BB1AABC03D3CD081`；本机 49152 覆盖安装成功；测试站部署 `2e80b15a08cf554c6c653adaef0c898fc8040587`，回滚备份 `/var/www/tygf-test-backups/deploy-20260827_132355-2e80b15a08cf`。
- **验证**：server 语法、select-file-topmost、v15-runner、release-consistency、tsc、lint、构建、发布身份、源站 200、latest API、安装包下载通过。Windows 实际窗口层级待用户目视确认。

---

## T-0043 【2026-08-27】推送 GitHub 并部署测试候选 4b4aab6

- **目标**：将批次一致性、ISSUES #25 与助手 3.6.10 推送 GitHub，只更新 `test.tuyigf.com`。
- **发布**：功能分支推至 `45eb128`；正常合并到 `develop`，最终候选 `4b4aab6f8b03e839aa5f3bdf9ab5213291647d79`；不可变归档 SHA-256 为 `98A50DCE1D6906E5E1F8DB0154FD91D949F501A32B8180A928FF110D61F8AFFE`。
- **助手**：发布 3.6.10 受控 UnsignedBeta 安装包，大小 12629957，SHA-256 `BBAC1534D6E49FE62F4BA8293EA38EFC3D5FC9E3FB936F8121C519EA69E56EAB`。
- **验证**：local-assistant-errors、batch-row-contract、v3-batch-flow smoke 通过；Prisma generate 后 tsc 通过；lint 0 error/2 既有 warning；release preflight、服务器 build、Prisma db push/backfill、源站 HTTP 200、PM2 双进程、latest API 与安装包下载均通过。
- **回滚**：`/var/www/tygf-test-backups/deploy-20260827_113436-4b4aab6f8b03`。生产站、`main` 与支付开关未修改。

---

## T-0042 【2026-08-27】ISSUES #25 计费明细折叠与助手错误分级

- **目标**：降低执行确认页信息密度，并消除票务/授权失败被误报为“本地助手未运行”的排障误导。
- **修改**：`execute-step.tsx` 默认仅显示语言数、总单位和预计冻结积分，逐语言计费明细通过原生 `details/summary` 展开；`local-assistant-client.ts` 的 `fetchTicket` 保留 HTTP 状态、服务端 `message/code`，非 ping 网络失败使用 `ASSISTANT_UNREACHABLE`；扩展 `smoke-local-assistant-errors.mjs` 锁定合同；同步 `docs/HANDOFF.md`。
- **验证**：定向 smoke 通过；`npx tsc --noEmit` 通过；`npm run lint` 0 error、2 条既有 TanStack warning；`git diff --check` 通过。
- **提交**：`c3a09e5 fix(workbench): simplify billing details and preserve assistant errors`。无关 `_check-codes.sh` 未纳入提交。

## T-0040 【2026-08-26】批次完成率一致性方案 P0-P4 实施

- **任务目标**：解决批次完成率与 HTML 失败明细不一致的 6 层根因（P0-P5 方案），提交 P0-P4。
- **根因诊断**（6 层集合漂移）：①浏览器报价含空原文 24 行 vs 助手 evidence 只滤空译文；②server.js 执行入口额外 `source&&target` 过滤；③finish 路由按报价 147 单位算完成率；④finish 返回扁平结构但客户端读 `r.settlement.*`；⑤12 个幽灵单位（2 行×6 语言空原文）；⑥结算显示为 0。
- **方案与提交**：
  - P0（`e9560cb`）：新建 `batch-executable-rows.ts` 纯函数投影 + `smoke-batch-row-contract.mjs` 合同测试。
  - P1（`6f5fdfa`）：execute-step 全部改用单一投影，移除各层冗余 `.filter(entry=>entry.target!=='')`。
  - P2（`ca4708f` + `5be63a5`）：attempt 创建时冻结 `expectedRowTokensJson`；finish 时对冻结 attempt 缺口合成 `FAILED(RECEIPT_NOT_RECEIVED)` 终态；冻结语言仍有缺项时拒绝静默 SETTLED；整语言未执行/旧数据按原语义放行。修复 finish 扁平结构客户端映射。expectedRowTokens 浏览器→route→lib 完整接线。
  - P3（`50dc184`）：credit-ledger-query batchSummary 新增 `deliveryCompletionRate/plannedAssignmentCount/deliveredAssignmentCount`；credits-badge 展示「交付 X/Y · 核销率 Z%」双指标。
  - P4（`0ef454b`）：report-renderer 新增守恒摘要 section + 排除行 section + `RECEIPT_NOT_RECEIVED` ISSUE_LABEL + `REASON_LABELS` 中文映射。
- **验证**：tsc 通过；batch-billing-v3 / batch-settlement-idempotency / v3-batch-flow / batch-transparency / batch-row-contract / batch-billing-routes 全部 smoke 绿。
- **遗留**：待测试站真实批次验证 → 用户决定是否翻闸 BATCH_EXECUTION_READY=true。

---

## T-0039 【2026-08-26】本地助手 3.6.10 重打包与环境统一对抗式方案

- **任务目标**：审查“测试站切 49155 + 同时重打包 3.6.10”的 C 方案，形成可执行优化文档，不直接发布或部署。
- **事实核验**：本机 49152 安装版运行且 Photoshop 握手正常，但状态合同缺 build/schema/renderer；49155 源码助手包含最新合同；公开 3.6.9 包发布于 8/23，当前源码仍自报 3.6.9，构成同版本异构。
- **关键纠偏**：公共测试站浏览器连接的是用户电脑 localhost，不能把 49155 设为面向真实用户的默认端口；49155 仅为开发旁路，安装版 49152 E2E 才是发布硬门。
- **交付物**：`docs/plans/20260826_本地助手3.6.10重打包与环境统一_对抗式优化方案.md`。
- **结论**：采用 C'；P0-P4 完成候选包闭环，用户批准后才进入 P5 灰度，再批准后才进入 P6 公开 latest/生产准备。


## T-0041 【2026-08-26】按语言计费与真实报告链修复

- **目标**：完成用户反馈的批量执行、空译文、finish 失败和 HTML 失败明细修复。
- **修改**：空译文改为对应语言 0 单位并保持原文；attempt 预期 token 按语言单位生成；finish 异常 fail-closed；合成 `RECEIPT_NOT_RECEIVED` 不可解除门禁；助手 evidence 补齐全语言 0 值；runner 接入排除行/守恒摘要；补 Prisma migration。
- **验证**：`npx tsc --noEmit` 通过；`npm run lint` 0 error、2 个既有 warning；row-contract、v3-flow、v15-runner smoke 通过；助手 JS 语法检查通过。数据库集成 smoke 仍受既有隔离库 `prisma db push` 无输出问题阻塞，未改历史批次账务。

---

## T-0038 【2026-08-26】修复批次 HTML 仅保留最后语言，并重建 5 语言现场报告

- **任务目标**：修复 `改语言_ALL_5LANG__20260826_133834` 报告仅显示 SV 的问题，且不重新执行 Photoshop、不重复计费。
- **根因**：批次入口将独立 `languageJobId` 作为 runner 的报告缓存键，五种语言分别写入不同 JSON，却覆盖同一个 HTML，最终只剩最后完成语言。
- **修改**：新增 `reportGroupId=batchId` 贯穿批次执行、runner 报告缓存和本地回执重建；新增两个 language job 共享批次键的聚合 smoke。
- **提交**：`d50c7a8 fix(report): aggregate batch languages by batch id`，与按语言计费提交 `50d2981` 分离。
- **现场修复**：从五份 13:39-13:41 journal 数据重建 IT/JP/NL/PL/SV 聚合报告；原错误 HTML 备份为 `图译工坊执行报告_错误版备份_20260826_133834.html`。
- **验证**：`node scripts/smoke-v15-runner.mjs`、`npx tsc --noEmit`、`npm run lint`（0 error，2 条既有 warning）、三文件 `git diff --check` 通过；新报告语言数 5、10 个 PSD/JPG 链接均存在且内部英文状态码为 0。

---

## T-0037 【2026-08-26】批次 v3 改为按语言计费（B 方案）

- **任务目标**：将批次 v3 从按源对象一次计费改为按语言分别计费；统一服务端权威报价、attempt、回执与结算口径，并补确认页明细和 smoke。
- **实施内容**：`computeBatchLanguageBilling()` 成为唯一计费函数，返回整批、每语言、每行每语言单位；助手 evidence 增加按语言单位映射；`ExecutionBatchRow.languageUnitsJson` 固化新批次快照；新口径结算累加所有语言可信成功单位，旧 `pricingVersion` 批次继续按旧最佳语言口径；确认页显示每语言单位与合计。
- **提交**：`50d2981 feat(billing): charge batch v3 by language`。提交不含 ISSUES #23 聚合报告修复。
- **验证结果**：`npx tsc --noEmit`、`npm run lint`、`test:batch-billing-v3`、`test:billing-challenge`、`test:batch-billing-routes`、`test:v3-batch-flow`、`test:batch-settlement-idempotency`、助手语法与 diff check 全绿。真实 UI 小批次因应用内浏览器旧错误页被 URL 安全策略阻断，本轮未计为通过。
- **历史保护**：本地迁移只新增默认 `{}` 列；只读复核 runId `14ecf065…` 仍为 SETTLED，报价 25、核销 23、退回 2、待处理 0、总单位 25、可信单位 23，未回溯改账。

---

## T-0036 【2026-08-26】批量测试门控、提示分级与智能优化恢复对抗式方案

- **任务目标**：解决 `BATCH_EXECUTION_READY=false` 导致“必须先验收才能开放、不开又无法真实验收”的死锁；审查问题提示不明显和正式版智能优化体验退化，形成可直接实施的方案。本轮不改业务开关、不执行 Photoshop、不扣费、不部署。
- **事实结论**：`execute-step.tsx` 的代码级常量在所有环境关闭批量，而 `featureFlags.ts` 又写批量已开启，形成双事实源；正式版使用“AI 审查/应用 AI 建议”分离动作，当前“查看检测建议”按钮实际调用 `applyAiSuggestions` 全量写入译文，存在授权语义错误且无撤销；普通问题提示统一使用弱默认 Alert，缺少严重度合同。
- **方案决策**：删除前端权威总闸，建立服务端 `disabled/local_test/canary/production` 四态门控；本地测试仅允许 local + loopback + 合法激活实例，报价到 finish 的每个入口重复校验；生产预检禁止携带本地测试模式。提示分为阻断/复核/信息/成功；智能检测只读，智能优化展示建议，只有“应用选中建议”写入并支持撤销和建议过期保护。
- **交付文档**：`docs/plans/图译工坊_V1.5批量测试门控_提示分级与智能优化恢复_对抗式方案_20260826.md`，包含第一性原理、攻击面、文件级清单、真实多语言 E2E 矩阵、Done、回滚和批准后的实施顺序。
- **验证结果**：仅新增方案和任务记录；核对 main/当前 review-step、execute-step、featureFlags、execution-batch、AI route/deepseek helper、发布预检与历史提交；执行 `git diff --check`。未运行 tsc/lint/业务 smoke，因为业务代码零改动。
- **边界**：`BATCH_EXECUTION_READY=false`、支付 6 个 flag、测试站和生产站状态均未改变。待用户批准后按 P0→P1→P2→P3 执行，P3 通过也不会自动开放生产。

---

## T-0035 【2026-08-26】合并项目名称与输出文件名输入

- **任务目标**：解决第 4 步“输出文件名”和“确认项目名称”重复填写、含义不清的问题。
- **实施内容**：删除独立的绿色“确认项目名称”面板和必填拦截；原“输出文件名”改为“项目与文件名称”。用户填写一次，原始名称写入积分明细，安全规范化后的名称用于输出文件基础名；留空时自动使用 PSD 文件名，生成时继续追加语言缩写。
- **修改文件**：`src/components/workbench/execute-step.tsx`。
- **验证结果**：`npx tsc --noEmit` ✅；`npm run lint` ✅（0 error，2 条既有 warning）；限定 `git diff --check` ✅；源码检索确认旧面板/旧提示不存在。
- **边界**：保存位置、实际文件后缀、语言缩写、项目 ID、积分记录和 `BATCH_EXECUTION_READY=false` 均未改变。

---

## T-0034 【2026-08-26】工作台文案精简与执行报告用户层中文化

- **任务目标**：删除浏览器标题中的 V1.5/信任链/端口开发字样和第 4 步批次验收长提示；隐藏 HTML 内部执行器证据，把用户可见系统状态改成中文；解释批量按钮禁用原因，不绕过批次安全闸。
- **实施内容**：页面标题改为“图译工坊”；删除“全部语言一次执行正在完成批次安全验收……”正文；报告移除执行器证据区，语言码、执行状态、报告状态、验证级别、文件类型和问题码改为中文展示；原文、译文与实际文件名作为业务证据原样保留。报告结构校验和 runner smoke 同步更新。
- **现有报告处理**：备份并原地重建 `改语言__20260826_075510611/图译工坊执行报告.html`，只重建 HTML，未重新运行 Photoshop、未冻结或扣除积分；49155 已重启加载新渲染器。
- **批量结论**：不能批量不是按钮故障，`src/components/workbench/execute-step.tsx` 的 `BATCH_EXECUTION_READY=false` 仍主动关闭入口；真实页面到助手、回执与结算的 7 语言跨层 E2E 未完成前不得翻闸。
- **验证结果**：`npx tsc --noEmit` ✅；`npm run lint` ✅（0 error，2 条既有 warning）；`node scripts/smoke-v15-runner.mjs` ✅；renderer/runner `node --check` ✅；本地 Web 200 且旧标题不存在；实物报告不含执行器证据、英文内部状态码和 build/schema/renderer 值，中文状态与法语语言名存在，原文/译文保持完整。
- **修改文件**：`src/app/layout.tsx`、`src/components/workbench/execute-step.tsx`、`download/local-assistant/report-renderer.js`、`download/local-assistant/v15-runner.js`、`scripts/smoke-v15-runner.mjs`。

---

## T-0033 【2026-08-26】文件选择框与异常多语言表污染链路修复

- **任务目标**：修复 3422 工作台“Windows 文件选择框启动失败”以及异常 ES 表导入后污染全部语言、智能检测像无响应的问题；不修改原始 CSV/PSD，不翻批量闸门，不部署。
- **根因证据**：3422 实际连接 49155 开发助手，用户重启的是 49152 安装版；旧 49155 进程在受限环境下无法启动 PowerShell picker。`ES 西班牙语.csv` 含 24 行正常块和错位重复尾块，解析为 50 行；合并器以首表为基准并保留重复 occurrence，导致其他 24 行语言被扩成 50 行。智能检测已执行，但安全策略不凭空补译文，完成提示位于表格上方，反馈不明显。
- **实施内容**：合并器在 3 个以上文件存在严格多数原文结构时建立结构合同，异常成员直接 `CSV_MERGE_STRUCTURE_MISMATCH` 拒绝；保留双文件与无多数场景的兼容行为。智能检测增加检测中/检测完成状态，并在无建议但有空译文时明确提示返回导入步骤核对行数。picker 使用固定系统 PowerShell 路径并记录脱敏失败诊断。
- **运行态修复**：恢复旧 49155 会话中的本机授权并由 fallback key 一次性迁移回 MachineGuid 加密；重新启动真实 49155（PID 28824）。用有效一次性票据调用 `/v1.5/select-file`，窗口真实弹出并自动 Esc，返回 `ok=true,cancelled=true`。
- **修改文件**：`src/lib/workbench/merge-tables.ts`、`scripts/smoke-data-security-contracts.mjs`、`src/components/workbench/review-step.tsx`、`download/local-assistant/server.js`；运行态会话文件有迁移备份，原始译文表未改。
- **验证结果**：`npx tsc --noEmit` ✅；`npm run lint` ✅（0 error，2 条既有 TanStack warning）；`node scripts/smoke-data-security-contracts.mjs` ✅；`node --check download/local-assistant/server.js` ✅；限定文件 `git diff --check` ✅；真实 picker E2E ✅。
- **边界与遗留**：`BATCH_EXECUTION_READY=false` 保持关闭；未执行 Photoshop、报价、扣费、部署。49152 安装版仍可并存，但 3422 的测试对象明确是 49155。

---

## T-0032 【2026-08-25】按方案实施助手身份门与中文执行报告

- **任务目标**：执行 T-0031 对抗式方案，修复本地 V1.5 报告信息退化/译文为空/旧助手漂移问题；保留正式版第 4 步语义、`源文件名__语言缩写` 产物命名和 `BATCH_EXECUTION_READY=false`，不部署、不翻批量闸门、不触碰支付。
- **实施内容**：新增 `download/local-assistant/report-renderer.js` 作为活动报告渲染器；V1.5 新任务统一写 `图译工坊执行报告.html`，旧回执重建兼容 `replace_report.html`；报告显示真实原文、译文/保持原文、输出文件、验证状态、问题与下一步，缺失输入审计时隐藏章节；receipt/runtime/server/client 透传报告名与 build/schema/renderer 合同；单语言和多语言直连入口均在执行前重新检测助手合同；安装完成提示同步中文报告名；runner smoke 增加中文名、译文、保持原文、报告失败/重建断言。
- **关键文件**：`download/local-assistant/report-renderer.js`、`v15-runner.js`、`receipts.js`、`attempt-runtime.js`、`server.js`、`src/config/localAssistant.ts`、`src/lib/workbench/local-assistant-client.ts`、`src/lib/server/local-assistant.ts`、`src/components/workbench/execute-step.tsx`、`scripts/smoke-v15-runner.mjs`。
- **运行时证据**：当前 49155 `/ping` 返回 `assistantBuildId=v15-report-zh-20260825`、`reportSchemaVersion=local-report-v2`、`reportRendererVersion=renderer-v2`；版本契约通过，但当前助手 `activationStatus=required`，尚未在新合同下重跑 Photoshop。
- **验证结果**：`node scripts/smoke-v15-runner.mjs` ✅；`npm run test:trust-chain` ✅；`npm run test:v3-batch-flow` ✅；`npm run test:batch-billing-routes` ✅；`npx tsc --noEmit` ✅；`npm run lint` ✅（仅既有 2 条 TanStack Table warning）；`npm run build` ✅；助手相关文件 `node --check` ✅；`git diff --check` ✅。`test:batch-billing-v3` 与 `test:batch-settlement-idempotency` 在隔离库 `prisma db push` 阶段无输出挂起，本轮已中止并登记 ISSUES #22，未计为通过。
- **边界与遗留**：`BATCH_EXECUTION_READY=false` 继续保持；真实 IT 单语言回归、7 语言批次/故障恢复/积分守恒 E2E、用户批准翻闸未完成；需先激活当前 49155，再执行真实 Photoshop 回归。历史旧 HTML/旧 JSX 链路不批量改名。

---

## T-0031 【2026-08-25】单语言真实验收与中文报告/多语言解锁对抗审查

- **任务目标**：核验 `改语言__20260825_225936339` 单语言真实执行是否足以解锁多语言；对比 `test0822` 旧正式报告与本次 HTML，形成中文报告和多语言解锁执行方案；本轮不改业务代码、不翻闸、不部署。
- **现场证据**：生成 `改语言__IT.psd`、`改语言__IT.jpg` 和 HTML；本地回执 `attemptStatus=SUCCEEDED`，助手 3.6.9/执行器 1.0.0，22/22 对象通过重开回读。当前代码 `BATCH_EXECUTION_READY=false`，单语言成功不覆盖一个 batch/一次冻结/多语言 attempts/一次结算/一份总报告的批次不变量。
- **报告诊断**：本次 6.9KB HTML 只有单表且 22 个译文格为空；旧 9.9KB 参考报告有执行前确认、真实问题、输出文件、表格输入摘要、脚本健康和下一步。现场 HTML/回执字段与当前 `report-renderer.js`/`receipts.js` 不一致，高置信判断测试时助手进程加载了旧模块；测试后端口已退出，无法追溯具体进程启动时间。
- **方案决策**：新 V1.5 报告统一为 `图译工坊执行报告.html`；新任务只写中文名，历史报告不批量重命名，旧回执无报告名时回退旧名；增加 assistant build/report schema/renderer 三重身份门；删除双渲染实现；只展示真实证据，缺失输入审计时不伪造“无问题”；真实 7 语言 E2E 和用户批准后才翻闸。
- **修改文件**：新增 `docs/图译工坊_V1.5多语言解锁与中文执行报告_对抗式方案_20260825.md`；同步 `docs/HANDOFF.md`、`AI_MEMORY/TASK_LOG.md`、`CURRENT_STATUS.md`、`ISSUES.md`、`PROJECT_CONTEXT.md`。业务代码零改动。
- **验证结果**：核对产物文件、HTML 结构、本地 receipt/report-data 安全摘要与关键源码；执行文档包含架构/代码/测试/性能对抗审查、失败模式、回滚、DoD 和 GSTACK 报告。仅文档改动，未运行 tsc/lint/业务 smoke；`git diff --check` 作为收尾验证。
- **遗留问题**：按方案 P1-P5 实施运行时身份门、中文真实报告、单语言回归和真实 7 语言批次验收；`BATCH_EXECUTION_READY=false` 继续保持。

---

## T-0030 【2026-08-25】v1.5 第 4 步与正式 HTML 报告恢复执行

- **任务目标**：按已确认方案恢复本地 v1.5 第 4 步正式版信息结构和 `replace_report.html` 交付体验；保留 `源文件名__语言缩写` 命名、批次 v3 安全闸和 V1.5 证据，不部署测试站/正式站。
- **实施内容**：`execute-step.tsx` 恢复输出文件名、语言范围、行数、空译文和批次报价说明；`working-copy.js` 统一自定义源文件名与 PSD/JPG 后缀；新增 `report-renderer.js` 恢复正式报告信息结构并脱敏；`v15-runner.js` 增加报告存在/大小/章节校验、报告失败结构化状态和独立重建；助手 server/client 与 proxy route 透传 `reportStatus`、`outputBaseName` 和报告重建请求。
- **关键边界**：`BATCH_EXECUTION_READY=false` 继续关闭；全语言入口不恢复逐语言独立扣费降级；报告失败不回滚已生成设计文件、不重复执行 Photoshop、不重复冻结积分；未宣称真实 Photoshop P6 通过。
- **修改范围**：活动 worktree 的第 4 步组件、本地助手 runner/server/receipt/runtime、报告渲染器、v1.5 报告重建 API、定向 smoke、执行文档与 HANDOFF；未部署、未翻转支付 flag。
- **验证结果**：`npx tsc --noEmit`、`npm run lint`（0 error，2 条既有 warning）、`npm run build`、`npm run test:trust-chain`、`npm run test:v3-batch-flow`、`npm run test:batch-billing-v3`、`npm run test:batch-billing-routes`、`npm run test:batch-settlement-idempotency`、`node --check download/local-assistant/server.js`、`git diff --check` 通过；runner smoke 覆盖自定义命名、报告失败保留设计文件和无 Photoshop 重跑的报告重建。
- **未完成/风险**：真实浏览器控制因 Chrome 缺少 Playwright 扩展未启动；项目浏览器 smoke 因内置管理员凭据返回 401 停在登录前；P6 真实 PSD → Photoshop → receipt → finish 跨层验收仍是 ISSUES #19 blocker，必须在单一兼容助手和有效激活条件下完成后再由用户追认翻闸。

## T-0029 【2026-08-25】P6 清理 ES 表并通过批量数据质量门

- **任务目标**：解决 7 个语言表导致的批量校对阻断，不覆盖原始文件，继续完成本地工作台验证。
- **根因证据**：原始 `ES 西班牙语.csv` 前 24 行是完整语言表，后续包含两行空行及一段错位的重复翻译块（源文件共 52 个数据行、仅 22 个唯一原文）；其余 FR/IT/JP/NL/PL/SV 均为 24 个数据行、22 个唯一原文，且同一原文集合一致。
- **处理结果**：生成 `worktrees/v1.5-trust-chain/tmp/batch-candidate/ES 西班牙语.cleaned.csv`，只保留 ES 正常的 24 个数据行，并补齐与原表一致的 UTF-8 BOM；原始 ES 文件 SHA-256 `57793b023aec7220c3e6c082848d375a6049980faf60acba153d0e9d7da88e94` 未修改。
- **现场验证**：在独立本地工作台标签页用清理版 ES + 其他 6 份原语言表重新导入；页面显示“已对齐”、7 个语言、22 个对象可生成、`待确认 0`，从原先 16 个阻断清零到生成阶段。
- **批量边界**：页面仍显示“全部 7 个语言连跑” disabled，原因是代码级 `BATCH_EXECUTION_READY=false`；未点击“开始替换”，未修改 PSD，未调用 quote/execute/finish，未新增扣费。
- **并行现场保护**：原用户工作台标签页已处于 4 语言生成准备态（预计 24 积分），本轮未覆盖、未点击其开始替换按钮。
- **验证结果**：Node `xlsx` 解析确认候选表 24 行、首行表头和 UTF-8 BOM 正常；浏览器独立重导入和校对通过；本轮无业务代码修改，未重复运行 tsc/lint。
- **下一步**：使用候选 ES 表做单语言真实 Photoshop E2E（需用户在“开始替换”前确认），批量 7 语言仍须完成 P6 跨层证据验收并由用户批准翻转批量硬闸。

## T-0028 【2026-08-25】P6 多语言表批量导入与真实校对阻断复现

- **任务目标**：不让用户逐个操作，自动查找与真实 PSD 相关的全部译文表，一次性导入本地工作台并继续 P6 测试。
- **候选文件**：PSD 同项目目录递归发现 10 个受支持 CSV；选取 `多语言表` 目录下 7 个语言表（ES/FR/IT/JP/NL/PL/SV）导入；排除顶层重复 ES、`run_summary_master` 运行汇总和 `test0822` 历史测试 fixture，避免把结果记录或旧版本混入当前译文集合。
- **现场结果**：7 个文件一次性上传到 `localhost:3422` 并成功解析，工作台识别 A（英文）原文列、7 个目标语言，PSD 22 个文字对象已绑定；进入设计稿校对后出现 16 个必须处理项。
- **阻断明细**：13 组译文表重复原文；ES 缺 1 条目标译文；FR/JP/IT/NL/PL/SV 各缺 12 条目标译文。根因是 ES 表 52 行而其余语言表 24 行，语言表不是同一版原文集合。
- **安全边界**：未修改原始 CSV/PSD，未调用 quote/execute/finish，未扣积分，`BATCH_EXECUTION_READY=false` 保持关闭；当前工作台已保留在 16 项待处理现场。
- **验证结果**：真实浏览器工作台显示“7 个语言”、`16 项待处理`、`重复文案 13 组`及各语言缺译文明细；本轮无业务代码修改，未重复运行 tsc/lint。
- **下一步**：先整理同一版、同一原文集合的 7 份语言表，再继续 P6 设计稿校对和 Photoshop 跨层 E2E；不自动替用户合并重复行或补写缺失译文。

## T-0027 【2026-08-25】P6 真实验收前置核验

- **任务目标**：继续批次 v3 P6，不绕过鉴权和代码硬闸，核对本地 Web、助手和 Photoshop 真实运行条件。
- **现场结果**：活动 worktree 仍为 `codex/v1.5-trust-chain`，业务改动未提交；49155 已有助手 v3.6.9，替换组件 `2.12-beta` / 报告 schema `1.4` 兼容，Photoshop 22.0.0 handshake/automation ready；本地 Web 3422 已启动，首页和工作台入口可打开。
- **阻塞**：工作台激活与真实 PSD 预扫描已解除；当前仍缺译文表/替换决策，因此不得进入批量报价、实际替换或支付。
- **后续现场**：用户确认后，既有邀请码已成功激活本地工作台；用户最初给出的路径多了一层目录分隔，核对后使用实际存在的 `改语言.psd` 完成只读预扫描，识别 22 个文字图层、1 个隐藏对象、0 个不可处理对象。
- **复核证据**：PSD 元数据读取成功（约 61.6 MB，最后修改时间 2026-05-21 14:05:55）；49155 `/ping` 返回助手 3.6.9、组件 2.12-beta/报告 1.4、Photoshop 22.0.0 ready、queueLength=0；未进入 quote、execute、finish 或支付。
- **验证结果**：本地工作台扫描状态为“已扫描”，文件名 `改语言.psd`，识别 22 个文字图层、隐藏 1、不可处理 0；未执行翻译表导入、实际替换、报价或积分结算。
- **安全边界**：未翻转 `BATCH_EXECUTION_READY`，未提交或部署，未执行支付宝动作；无激活前对受保护 Photoshop 状态接口得到 403，证明鉴权门仍生效。

## T-0026 【2026-08-25】批次 v3 P0-P5 执行与对抗式收口

- **任务目标**：按批次 v3 行身份证据与结算闭环执行文档实施，直到代码验证完成；不在缺少真实 Photoshop E2E 时开放入口。
- **实施内容**：统一 `rt_` + 64 位小写 hex 稳定行令牌；新增助手 prepare-only 绑定摘要与 evidence 提交路由；服务端以助手 evidence 行作为权威计费事实并在 quote 事务内消费 challenge；为 ticket/receipt 增加 rowSet、binding、translation、document 摘要绑定；修正批次恢复、强制绑定透传、助手逐对象回执映射、Origin、ACK 后终态和结算幂等。
- **关键文件**：`src/components/workbench/execute-step.tsx`、`src/lib/workbench/local-assistant-client.ts`、`download/local-assistant/server.js`、`src/lib/server/billing-challenge.ts`、`src/lib/server/execution-batch.ts`、`src/lib/invite/execution-ticket.ts`、批次 attempt/receipt routes、`prisma/schema.prisma`。
- **验证结果**：`npx tsc --noEmit`、`npm run lint`（0 errors，2 条既有 warning）、`npm run test:trust-chain`、`npm run test:v3-batch-flow`、`npm run test:batch-billing-v3`、`npm run test:batch-billing-routes`、`npm run test:batch-settlement-idempotency`、`node --check download/local-assistant/server.js`、`git diff --check` 全通过；数据库 smoke 需 escalated 权限完成。`graphify` 不在 PATH，未依赖空壳图。
- **未完成与红线**：`BATCH_EXECUTION_READY=false` 保持关闭；未启动测试站/生产部署，未宣称真实 Photoshop 闭环完成。下一步只允许在单一兼容助手、有效激活和真实 PSD/CSV 上做 P6 E2E。

## T-0025 【2026-08-25】批次 v3 对抗式审查与完整执行文档

- **任务目标**：在 T-0024 行令牌源码追踪基础上，继续以第一性原理和对抗式审查覆盖并发、幂等、恢复、回执来源、组合绑定与积分结算，并生成可直接交给另一 AI 执行的文件级方案；本轮不改业务代码、不部署。
- **执行方案**：复核 quote/challenge/confirm/attempt/receipt/finish、页面 V3 draft/runId、助手 postJson/执行映射/本地回执；建立“用户意图唯一链、助手权威事实、任务内稳定行身份、回执 ACK 后结算、积分守恒”五项约束；整理 18 个攻击/故障场景和 P0-P6 分阶段实现路径。
- **修改文件**：新增 `worktrees/v1.5-trust-chain/docs/图译工坊_批次v3行身份证据与结算闭环_对抗式执行文档_20260825.md`；同步更新 `AI_MEMORY/TASK_LOG.md`、`CURRENT_STATUS.md`、`ISSUES.md`。
- **关键结论**：除既有 token/evidence/权威行/映射问题外，确认 challenge 消费在 batch 创建事务外，可并发留下孤儿 batch；quote 丢响应后 challenge replay 阻断幂等恢复；助手 receipt POST 不带 Origin 且失败被静默吞掉，本地成功仍可推动 finish；页面每次新建 runId 导致 V3 draft 无法恢复；用户排除/忽略/强绑决策在批次路径丢失；ticket 未绑定 rowSet/binding/translation digest。
- **测试结果**：文档存在性与结构检查通过（532 行，含基线、P0-P6、禁止方案、DoD）；本轮仅文档和记忆更新，未运行代码测试，也未实施或部署业务修复。
- **遗留问题**：按文档先关闭批次入口并建立真实跨层失败测试，再依次实施助手 prepare/evidence、原子 quote、V3 恢复、可靠 receipt/finish 和真实 Photoshop 灰度；重新开闸与测试站部署必须另获用户批准。

## T-0024 【2026-08-25】批次 v3 行令牌生成→传输→校验→结算源码追踪

- **任务目标**：核验外部诊断“行令牌格式非法”的准确性，并在不猜测、不改业务代码的前提下给出可交接实施方案。
- **执行方案**：从 `execute-step.tsx` 的逻辑行生成开始，逐段追踪 `batch-execution-client`、`runV3BatchFlow`、quote 路由、challenge/evidence、ExecutionBatchRow 持久化、助手 `/v1.5/batch/execute`、回执 API、逐行成功集合和最终结算；同时对抗式审查现有 smoke 的覆盖边界及 908bc0a 引入变更。
- **核心结论**：外部诊断只命中了首个报错点，R1/R2 概率猜测不准确。当前源码明确生成 `rt_src_<index>`，与两端 hex 正则必然冲突；后续还存在 evidence 未接线、evidence 标准单位被清零且持久化来源错误、真实 translation digest 丢失、attempt 单位口径错误、助手文本反查及非法 fallback、回执缺可信级别与对象证据摘要六类连续问题。不能用“改 token 生成函数 + 强刷浏览器”作为完整修复。
- **修改文件**：仅 `AI_MEMORY/TASK_LOG.md`、`AI_MEMORY/ISSUES.md`、`AI_MEMORY/CURRENT_STATUS.md`；业务代码零改动。
- **测试结果**：`npm run test:v3-batch-flow` 通过；`npm run test:batch-billing-routes` 27 项全绿。复核确认这两组测试分别 mock quote、仅测试手写合法回执，因此“通过”本身反向证明缺少真实跨层合同测试。源码静态不变量已闭合到 `ExecutionBatchRow(batchId,rowToken)` 与 `ExecutionAttemptRowResult(attemptId,rowToken)`。
- **遗留问题**：按 ISSUES #19 分阶段实施；完成真实页面 payload → 助手证据 → quote/confirm → 多语言执行/重试 → receipt → finish E2E 前，批次入口不应视为可发布。

## T-0023 【2026-08-25】本地文件选择链路优化方案细化

- **任务目标**：把 T-0022 的诊断结论整理为可直接开发、测试和回滚的分阶段优化方案。
- **执行方案**：P0 统一 3422+49155 单实例与版本/组件握手；P1 抽取异步 TopMost Windows picker、细分票据权限与错误码；P2 增加前端预检、可观测性、专项 smoke 和真实 Windows E2E；全程选择文件不启动 Photoshop、不创建计费任务。
- **修改文件**：仅 `AI_MEMORY/TASK_LOG.md`；业务代码零改动。
- **测试结果**：方案复用 T-0022 的端口、版本、组件握手、历史验票日志和 file/folder 实现差异证据；本轮未运行 tsc/lint/test（无业务代码改动）。
- **遗留问题**：方案待实施；真实 picker E2E 需要有效本地激活，并在单一 49155/3.6.9、组件 2.12-beta/1.4 环境执行。

## T-0022 【2026-08-25】本地“无法打开文件选择框”现场诊断与根治方案

- **任务目标**：定位活动 worktree 本地工作台无法打开 PSD/PSB 文件选择框的原因，并给出不触发 Photoshop、不扣积分的解决方案。
- **执行方案**：读取 CURRENT_STATUS/PROJECT_CONTEXT/ISSUES/HANDOFF；核对 `design-file-card.tsx → local-assistant-client.ts → /v1.5/select-file → PowerShell OpenFileDialog` 全链；检查 3422/49152/49155 端口、助手进程、版本/组件握手和历史事件日志；连接当前已运行的 3422 Web 仅做页面诊断。
- **现场结论**：① 安装版 49152=v3.6.8 与开发版 49155=v3.6.9 同时运行；② 49155 `/ping` 报替换组件 `2.9-beta/1.0`，低于要求 `2.12-beta/1.4`，运行单元不一致；③ 历史日志实锤 `/v1.5/select-file -> 403 VERIFY_UNREACHABLE: server request timeout (60s)`；④ 当前文件选择实现 `server.js:2429-2439` 使用无 owner 的 `OpenFileDialog + execFileSync`，而文件夹选择 `:2904-2913` 已使用 TopMost owner + 异步 `execFile`，文件框存在藏到后台和阻塞助手事件循环的风险；⑤ 本轮浏览器本地激活已过期，未持有效票据触发真实选择框。
- **修改文件**：仅 `AI_MEMORY/TASK_LOG.md`、`AI_MEMORY/ISSUES.md`、`AI_MEMORY/CURRENT_STATUS.md`；业务代码零改动。
- **测试结果**：活动树 HEAD=908bc0a、工作树诊断前干净；既有 3422 首页 200（重复启动按预期报 EADDRINUSE，未创建第二实例）；49152 `/ping` 约 579ms、版本 3.6.8；49155 `/ping` 约 95ms、版本 3.6.9；两个 queue/status 均可响应；代码与日志证据核对完成。未运行 tsc/lint（本轮无业务代码改动），未执行真实 picker E2E（本地激活过期）。
- **遗留问题**：先统一到单一 3.6.9 助手并确保组件握手 2.12-beta/1.4；随后把 select-file 改为 TopMost owner + 异步子进程 + 可观测错误日志，增加 picker 路由/超时/取消/双实例回归；最后用有效本地激活做真实 Windows 对话框 E2E。

## T-0021 【2026-08-25 00:45】批次闭环实施 + 测试站部署 + 学习系统升级（多日累积收拢）

- **任务目标**：按批次闭环方案 §0-§6 实施；A2-A4 资金线收口；C fixture 回火；测试站部署最新版本
- **执行方案**：六阶段推进——入口唯一化、逻辑行合同、真实摘要、共享目录、报告隔离、sequential 移除；A2 四攻击用例实弹/代码级验证；0810 五语言 bug fixture 化
- **修改文件**（关键）：
  - execute-step.tsx: 入口路由修正（全部语言→runV3BatchFlow）、逻辑行构造（rt_src_<idx> 语言无关 token）、逐语言 SHA256 真实摘要、sequential 从生产移除
  - v15-runner.js: 报告缓存按 jobId+masterBase 隔离（不再按 masterBase）、成功后清理 runtime 目录、回执时序修复（先落 journal 再清场）
  - server.js: batch/execute 路由、验票透传 batchId/languageJobId、MachineGuid 缓存+超时兜底（阻塞根治）、execute/prepare 日志
  - Thin_Executor.jsx: JPG 导出（quality 8，失败不阻断）
  - working-copy.js: preview 与工作副本同目录暂存+发布
  - typography route: L1 质量门（finalize 需 SUCCEEDED）
  - typography-contract.ts: 排版指纹 v2（preferenceProfileJson：组合偏好 Top5+行距分布+签名三元组）
  - binding-core.ts: looseKey 归一化排版等价符（弯引号/省略号/破折号）
  - schema.prisma: BetaSurvey 表 + LearningTypographyRun.preferenceProfileJson + 删重复 PaymentRefund
- **测试结果**：
  - tsc ✅ eslint ✅ build ✅（含 standalone-boundary/assistant-contract）
  - test:contracts(15) ✅ test:trust-chain(19) ✅ test:admin-security ✅ test:auth(70) ✅
  - test:survey-pricing(4) ✅ test:user-report-fixtures(4) ✅ test:batch-billing-v3 ✅ test:v3-batch-flow ✅ workbench-flow ✅
- **部署**：origin/develop = cadf656 → 测试站 cadf656 部署成功（.deploy-commit 已更新，全路由冒烟 200）
- **平台配置**：platformDailyCreditCap 本地+测试站均改 100000（原误设 174 导致熔断）
- **遗留问题**：
  - Phase 1 失败测试待补（batch-entry-routing/batch-output-contract/report-isolation/multi-instance-gate）
  - B3 真实 PS 五语言 E2E 待用户实测
  - B4 翻闸确认（BATCH_EXECUTION_READY=true 已由并行窗口翻转，需追认）
  - A5 协议定稿+支付宝资质（用户亲自）
# TASK_LOG.md — 任务日志（每次任务一条，新记录置顶）

> 最后更新：2026-08-25
> 字段：任务目标 / 执行方案 / 修改文件 / 修改原因 / 测试结果 / 遗留问题。
> 历史条目为首次盘点时从既有记录（worklog/records/HANDOFF/备份命名）继承登记；日期来自证据推断的标"约"。

---

## T-0022 【2026-08-25】生产 VPS 资源清理——旧测试失败发布物 + journal

- **任务目标**：按用户确认清理安全的磁盘占用，保持生产服务和回滚能力不受影响。
- **执行方案**：实时复核内存、Swap、进程、目录和公网状态；保留最新失败发布目录 `previous-20260825_001922` 与 `/var/www/tygf-test-previous` 回滚副本；清理更旧的 3 个失败发布目录；将 systemd journal 压到约 500M。
- **清理对象**：远程删除 `/var/www/tygf-test-failed/previous-20260823_113351`、`previous-20260823_181101`、`previous-20260823_223338`；执行 `journalctl --vacuum-size=500M`。未删除数据库、`.env`、当前构建、node_modules、下载物或回滚副本。
- **执行细节**：普通 `ubuntu` 用户首次删除遇到 root-owned 文件权限，复核确认三个目标仅剩空目录后，使用 sudo 对已核验的绝对路径完成删除；保留目录未被触碰。
- **测试结果**：旧失败目录从约 6.0G 降至约 1.5G；journal 从 892.4M 降至 457.6M；根分区从 75%（剩 9.8G）降至 62%（剩约 15G）；内存可用约 1.2G、Swap 剩约 1.6G；`tygf`/Nginx active，公网首页=200（约 0.05s）。
- **遗留问题**：`tygf-test-previous` 和最新失败发布仍各约 1.5G，作为回滚保护暂保留；后续测试站稳定并完成新发布验收后，再单独确认是否清理其中一个。当前未改业务代码。

## T-0020 【2026-08-24 22:45】tuyigf.com 生产站不可达应急恢复——缺失服务文件 + 孤儿 Next 进程

- **任务目标**：恢复 tuyigf.com 公网访问，并尽快确认是否需要用户登录 VPS/Cloudflare 面板。
- **执行方案**：通过既有 SSH 别名 `tygf-server` 做分层体检；确认 Nginx 实际承载 80 端口、`tuyigf.com` 反代到 3000；清理已确认的旧生产进程 PID 1603693 和旧测试 previous 进程 PID 2101647；在生产目录 `/var/www/tygf` 恢复并启用 `tygf.service`，使用现有 `.env`、Next standalone 构建和 Node 22。
- **根因（实测）**：磁盘仅 70%（40G 中已用 26G），已有约 1.9G swap，不是磁盘写满；机器此前可用内存约 147MB、CPU 100%。生产端没有 `caddy.service`，实际是 Nginx；`tuyigf.com` 指向无响应的 3000。3000 上的 v16.2.10 进程自 8 月 10 日遗留且请求超时；`/var/www/tygf-test-previous` 的 v16.3.0 孤儿进程占约 98% CPU。生产 `tygf.service` 缺失，PM2 只管理测试端 3001。
- **修改文件**：远程新增 `/etc/systemd/system/tygf.service`（`User=ubuntu`、`WorkingDirectory=/var/www/tygf`、`PORT=3000`、`Restart=on-failure`），并启用开机启动；未修改业务代码。根目录 `AI_MEMORY/*` 仅追加本条记录及状态登记。
- **修改原因**：恢复 Nginx→3000 的生产链路，并让生产进程重新受 systemd 监督，避免再次留下无监督孤儿进程。
- **测试结果**：`tygf.service` active/enabled；Nginx active/enabled；本机 `3000/`=200；Nginx Host 路由=200；公网 `https://tuyigf.com/`=200（复查约 0.84s）；旧 PID 均已消失；可用内存恢复约 1.4GB；活动 worktree `npx tsc --noEmit`=0，`npm run lint`=0 错误、2 个既有 TanStack Table 警告。
- **注意事项**：当前部署没有 `/api/healthz` 路由，实测为 404，活动版和 develop 源码搜索也未发现该路由；暂不要把 UptimeRobot 监控指向它。可先监控首页 `/`，健康接口需另走正常代码发布流程。
- **遗留问题**：需后续核对为什么生产 unit 被删除、部署脚本与实际 `ubuntu` 用户/服务监督不一致，并清理/审计测试部署遗留流程；这次未改业务代码、未删数据库备份、未创建 swap、未改 DNS/Cloudflare。

## T-0019 【2026-08-24 下午】tuyigf.com 生产站不可达排查（用户报"登录不上"）——三轮假设修正后定根因

- **任务目标**：查明 tuyigf.com 登录不上的原因
- **执行方案**：分层网络诊断（DNS/RDAP/L4 TCP/L5 TLS/SNI 对照/路径对照/长超时探测）+ 外部探针交叉验证（check-host 多国节点）+ 项目部署文档考古（deploy/部署三步走.md、Caddyfile.production、.env.example）
- **最终根因（实测闭环）**：**CF 回源超时 524**——边缘→生产源站的请求被接受但源站永不回 HTTP 响应，126s 后 CF 吐 `HTTP/1.1 524`（LAX 节点）。即：**生产 VPS 的 Caddy/pm2/Next.js 应用层挂死**（TCP 通所以非宕机/防火墙拒接；典型成因：OOM/内存耗尽、pm2 进程僵死、磁盘写满——注意部署脚本配了每日数据库备份、DB 锁死）
- **证据链与假设修正史（对抗式审查记录）**：
  1. ✅ 健康：域名（2027-07 到期无 hold）、DNS 三方一致（权威 NS=Cloudflare）、CF 边缘 TLS+证书（本机直连握手成功 GTS WE1 CN=tuyigf.com）、`/cdn-cgi/trace` 200 秒回、www 边缘 301
  2. ❌ 假设一"IP 被黑洞"：误读 check-host 标签（其 http 探测把任何失败都标 Connection timed out）；纯 TCP 测试三国全绿推翻之
  3. ❌ 假设二"边缘证书缺裸域 SAN"：.NET 直连对 SNI=裸域握手成功且返回有效证书，证伪
  4. ⚠️ 方法论教训：CF 对"源站收连接不回话"的 524 要 ~100s+ 才出现，短超时探针（8–90s）全部误判为"无限静默"，一度误导向 Tunnel 断连假说；130s 探测才捕获 524
  5. 关键对照：SNI=www+Host=裸域+path=/cdn-cgi/trace→200；同参数 path=/→挂死 ⇒ 故障在"真实路径的回源环节"，与 SNI/证书无关
  6. 架构背景：部署文档为灰云直连+Caddy 自动 HTTPS 设计，现 DNS 已是橙云代理（架构被改过）；www→apex 301 在 Caddyfile.production:33-35 也有配置；test.tuyigf.com 独立基建不受影响（其 ?key= 门禁秒回）
- **修改文件**：仅 `AI_MEMORY/TASK_LOG.md`
- **遗留问题 / 用户待办**：①SSH 登录生产 VPS 排查：`pm2 list`、`systemctl status caddy`、`df -h`（备份写满盘高嫌疑）、`free -h`、`journalctl -u caddy --since today`，先 `pm2 restart all` 止血；②恢复后浏览器验证 tuyigf.com 与登录；③若登录仍有问题再查 SES 配置（#14 是测试站问题，生产 SES 配置状态未验证）；④长期建议：给 524 类故障加 UptimeRobot 等外部监控 + pm2 内存阈值自动重启

## T-0018 【2026-08-24 下午】8.1.psd"译文列空"根因排查 + 只读核验四项

- **任务目标**：① 查明早间 8.1.psd 四语言连跑报告"写入成功但译文列为空"根因；② 密钥残留扫描；③ 助手版本核对；④ 清理调试脚本、恢复根目录指针
- **执行方案**：读取 6 个运行目录产物（replace_report.html/executor-result.json/progress.log）+ 助手回执（.tygf_v15_journals/receipts）+ 聚合数据（report-data/8_1.json）+ 代码链路（v15-runner.js/TYGF_V15_Thin_Executor.jsx/server.js wrapper 与 PS_TIMEOUT_MS）
- **修改文件**：根目录 `WORKSPACE-MAP.md`（三行导航指针，P0.4 补办）；删除 `worktrees/v1.5-trust-chain/_cap.sql`、`_remote-check.cjs`（确认无敏感内容）；`AI_MEMORY/*` 状态更新。**业务代码零改动**
- **修改原因**：用户批准的盘点后跟进项
- **测试结果**：
  1. **报告译文列空 = 纯渲染 bug，PSD 写入真实有效**——聚合数据所有对象 `target:""` 但 `verified:true`；回执 actualTextDigest 各不相同（写空则应全等 sha256("")=e3b0c442…）；v15-runner.js:74 回读不符会抛 REOPEN_READBACK_MISMATCH。根因：隐私化证据只带 digest 不带 actualText（:77-81），渲染 :295 取 `ev.actualText` 恒 undefined。**修复方案：:295 改 `sanitizeReportText(a.target_text)`，待批准**
  2. **两次隔离失败 = PS 弹窗/UI 干扰类**（登记 ISSUES #15）：ES "用户取消了操作"@jsx:79；TH 重跑 save() 挂起 2h27m，助手 PS_TIMEOUT_MS=3min（server.js:176,:1213）放弃并移走工作副本 → PS 恢复后报"尚未存储该文档"
  3. **密钥扫描干净**：跟踪文件无 sk- 类密钥、.env/.pem 未入库、历史文档第 7 行是 SHA256 非密钥（#7 文档层面闭环）
  4. **助手版本 = 3.6.9**（server.js VERSION + tygf-engine-setup-3.6.9.exe 2026-08-23）；WORKSPACE-MAP"唯一对外下载 3.3.4"过时（登记 #16）
- **遗留问题**：报告渲染 bug 待批准一行修复；#15 执行链弹窗防护待立项；#16 文档修订待批准；staging/test-site-access.txt 含访问 key（未入库，勿打包）

## T-0017 【2026-08-24】测试版「无法打开文件选择框/扫描失败」根因诊断 + 登录系统核查 + 本地引擎 3.6.9 修复全套

- **任务目标**：①诊断测试站用户报告的「无法打开文件选择框」「扫描失败，请重试。」；②核查登录系统是否打通；③以对抗式审查方式落地修复
- **执行方案**：
  - 根因链（全部实测证据）：引擎事件日志 `download/local-assistant/logs/assistant-events.log` 实锤 8-22 共 6 次 `VERIFY_UNREACHABLE: server request timeout`（含 `/v1.5/select-file`）→ **引擎回云验票间歇性阻塞是两个症状的共同根因**（`/config` 与预扫描都要验票）；安装版 3.6.8 的 `/v1.5/select-file`、`/v1.5/preparation/scan` 403 响应**不带 message 字段**（本机双实例 49152 安装版/49155 dev 版对照实测）→ 前端退回兜底文案「无法打开文件选择框」（design-file-card.tsx:230），真因被吞；**版本纪律断裂**：VERSION 冻结 3.6.8（安装包 8/16 构建后未再发版）而协议 8/18-23 演进，`assertAssistantCompatible` 版本比对永远相等 → 升级通道失效
  - 登录系统核查：test.tuyigf.com 实测 `/api/auth/login`（假凭据 401 AUTH_FAILED 秒回）、`/api/auth/me` 正常；`/api/auth/resend-verification` 返回 `mailConfigured:false`（TYGF_ENVIRONMENT=test 且服务器缺 SES 密钥）→ **新用户 注册→验证→登录 死循环**；当时无 admin 手动验证后门（同日稍后被并行窗口以 19db25b 补上 owner `verify_email` action + 双审计 + 冒烟脚本）
  - 修复实施：server.js v3.6.8→v3.6.9——`verifyTicket` 回云验票超时 60s→10s；select-file/select-folder 操作不匹配、preparation scan 鉴权失败（新增 `scanTicketFailureMessage`）、scan status/cancel NOT_FOUND 全部补中文 message；`local-assistant-client.ts` 新增 `fetchLocal` 分档直连超时（普通 API 15s / 文件对话框 330s——对抗自纠：原方案"select-file 加 15s AbortSignal"会误杀用户挑文件的正常停留，改为长档兜底）；pkg+csc+Inno Setup 全链重建 `tygf-engine-setup-3.6.9.exe`；同步发布标识五件套（release-identity/local-assistant-release.json/latest releaseNotes/env.example/server-setup.sh/installer.iss）
- **修改文件**：`download/local-assistant/server.js`、`src/lib/workbench/local-assistant-client.ts`、`download/local-assistant/build/installer.iss`、`config/release-identity.json`、`public/downloads/local-assistant-release.json`、`public/downloads/tygf-engine-setup-3.6.9.exe`（新产物）、`src/app/api/local-assistant/latest/route.ts`、`deploy/server-setup.sh`、`.env.example` —— 以上已由并行窗口以 **0c7862f 代提交入库**（commit 注明"本窗口代提交，改动内容来自并行窗口"）
- **测试结果**：`node --check` ✅　eslint(client) ✅　tsc 仅剩当时并行 WIP 存量错（后随 79d348a 入库消失）　`check-release-identity.cjs` ✅　新 exe `--self-test-assets`/`--self-test-errors` ✅　重启 49155 dev 引擎实测：`/ping`=3.6.9 ✅、select-file/scan 无票据均返回带 message 的 403 ✅、内嵌替换组件 2.12-beta sha 与现役安装版一致（80d2624f…）无回归 ✅
- **遗留问题**：① develop 落后 codex/v1.5-trust-chain 6 提交，测试站尚未部署 0c7862f——**用户侧修复未到达**；② `tygf-engine-setup-3.6.9.exe` 被 `.gitignore:75` 忽略且白名单仅含 3.5.4/3.6.8——部署时需带外上传 exe 或先补白名单提交，否则 latest 接口指向空文件；③ SES 密钥未配置，注册验证死循环待根治（登记为 ISSUES #14）

## T-0005 【2026-08-24】条款文档 v0.3.4→v0.3.8 多轮修订 + 积分 888 + 工作台措辞统一

- **任务目标**：①参照 LiblibAI/稿定设计完成《用户协议》《隐私政策》多轮精简与扩写；②对抗式审查条款与代码一致性；③内测赠送改 100+788=888；④工作台 UI"翻译"措辞统一为"替换/译文表"
- **执行方案**：
  - v0.3.4 对抗式审查：Cookie/激活存储修正（激活在 localStorage+本地文件非 Cookie）、保存期限补全（180/365/30/7/90 天对齐代码常量）、CDN 境内外调和、"不会收集"→"不会长期收集"、**字体名如实披露 TopN 计数**（typography-contract.ts 实际存 fontTopNJson，用户决策保留字体名+文档披露）
  - 展示页 terms/privacy 重写同步母本（terms 19 节、privacy 11 节）
  - 低优先项：2.4 链接 tuyigf.com/privacy、19.5 邮箱 tuyi@tuyigf.com、3.5 一人一号核验措辞
  - v0.3.5：智能学习删"组成部分/不同意无法使用"；第三方与 AI 删供应商名与功能举例；免责声明扩写 6 类场景（现状保证/结果准确性/第三方信息/不可抗力/设备操作含 PSD 备份/审核权非义务）+ 责任限制细化
  - v0.3.6：定义/服务内容精简、"可接受使用"更名"禁止行为"、隐私政策删第三方名单明细表
  - v0.3.7：移除全部"翻译服务"表述（产品定位=替换执行工具）
  - v0.3.8 对抗式审查措辞：1.4"生成的译文"→"您提交的译文表"；14.2 删内容过滤承诺句（代码无此功能）+"AI 生成内容"统一"AI 输出"；14.3 删"广告"；SEO keywords "CSV 翻译"→"CSV 替换"；survey 页"单语言翻译"→"单语言替换"
  - 积分：DEFAULT_BETA_EXCLUSIVE_BONUS 700→788、LEGACY_SIGNUP_GRAND_TOTAL 800→888（上限不改则 topUp 截断发不出 788）
  - 工作台：4 处用户可见文案（确认替换范围按钮/排除提示/绑定报错×2）+ 5 处注释；边界保留 csv.ts 表头识别词'deepseek-align.ts 防翻译提示词/英文标识符
- **修改文件**：`docs/用户协议_草案_20260818.md`(v0.3.8)、`docs/隐私政策_草案_20260818.md`(v0.3.6)、`src/app/terms/page.tsx`、`src/app/privacy/page.tsx`、`src/lib/server/credits.ts:36-38`、`src/config/featureFlags.ts`、`src/lib/server/onboarding-credits.ts`、`src/lib/workbench/credits-client.ts`、`src/lib/server/credit-ledger-query.ts`、`src/app/api/workbench/credits/route.ts`、`src/components/workbench/workbench-view.tsx`、`src/lib/workbench/prepare-check-labels.ts`、`src/lib/workbench/workbench-object.ts`、`src/lib/workbench/merge-tables.ts`、`src/lib/trust-chain/binding-core.ts`、`src/app/layout.tsx`、`src/app/survey/page.tsx`
- **修改原因**：条款与代码实际行为一致（审查要点①）；产品定位口径统一（不做翻译）；新用户入门积分调整为 888
- **测试结果**：tsc ✅ eslint ✅ /terms /privacy 均 200 且版本号正确；三核心文件中文"翻译"残留清零；无测试文件需同步
- **遗留问题**：工作台英文标识符 translation_* 有意保留（内部命名，改动破坏 schema 兼容）；13.1 注销"正在规划后续版本"为承诺性表述已知晓并接受

## T-0001 【2026-08-24】建立 AI 长期记忆系统（首次盘点）

- **任务目标**：创建 AI_MEMORY/ 五文件 + 更新 AGENTS.md，让新会话零上下文接手项目
- **执行方案**：全量扫描工作区（git log/status、worktrees、docs、worklog、归档），以实测为准填写
- **修改文件**：`AI_MEMORY/PROJECT_CONTEXT.md`、`AI_MEMORY/CURRENT_STATUS.md`、`AI_MEMORY/TASK_LOG.md`、`AI_MEMORY/CHANGELOG.md`、`AI_MEMORY/ISSUES.md`、`AGENTS.md`（根目录）
- **修改原因**：建立项目长期记忆系统（用户指令）
- **测试结果**：文档类变更，无代码验证；提交后 git 状态复核
- **遗留问题**：详见 ISSUES.md（graphify 空壳、8.1.psd 译文列空、待用户追认项等）

## T-0002 【2026-08-24 14:30】内测宣传版发布链路·阶段一（提交+推送）

- **任务目标**：按 plans/20260824_1415_内测宣传版发布链路.md 步骤 1-3：分主题提交 + 推送
- **执行方案**：对账修正后重组为 5 个提交，推送 origin/codex/v1.5-trust-chain
- **修改文件**：5 个提交 —— 2508989（退款关闭系统）、34dee7e（发布安全态 flags+拦截补漏）、80d29d8（协议文档）、19452fc（BATCH_EXECUTION_READY=true）、0c7862f（并行窗口 12 文件同步）
- **修改原因**：分支从未推送，单机风险；发布链路前置
- **测试结果**：tsc ✅ eslint ✅ smoke-refund-close 13/13 ✅ smoke-alipay-payment ✅；推送成功（19db25b..0c7862f → origin）
- **遗留问题**：BATCH_EXECUTION_READY 翻转与 Owner 退款 API 两项**待用户追认**；2 个调试脚本 `_cap.sql`/`_remote-check.cjs` 未提交
- 证据：`docs/records/20260824_1430_提交推送阶段一.md`

## T-0003 【2026-08-24 13:32】跨窗口 AI 协作协议落地

- **任务目标**：让多个 AI 窗口并行工作不冲突
- **执行方案**：建立 HANDOFF.md 接力入口 + plans/ 方案目录 + records/ 执行记录目录 + 协议文档
- **修改文件**：`docs/HANDOFF.md`、`docs/图译工坊_跨窗口AI协作协议_方案_20260824.md`、`docs/plans/20260824_1415_内测宣传版发布链路.md`、`docs/records/20260824_1430_提交推送阶段一.md`
- **修改原因**：多窗口并行导致工作树互相覆盖（0c7862f 即代提交的并行窗口改动）
- **测试结果**：文档落地，提交 80d29d8
- **遗留问题**：plans/_模板.md 待建

## T-0004 【2026-08-23 晚】收口方案 v2：支付上线主线交接文档

- **任务目标**：把主线从 C3（助手批量协议）切换为支付生产上线收口
- **执行方案**：v1 的已完成项冻结不再重复，P0 止血 + P1 支付上线 + P2 C3 数据驱动决策框架
- **修改文件**：`docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md`（取代 v1 排序）
- **修改原因**：c742afd 逐语言连续执行已诚实解锁多语言体验，C3 从"守恒必需"降级为"计费优化项"
- **测试结果**：文档（A4 计费权威性验证、退款 runbook v1.0 等随 cb0cf01 入库）
- **遗留问题**：P1.1-P1.6 全部待执行；4 个用户决策点悬置

## T-0005 【2026-08-23】支付/退款功能实现（并行窗口成果，部分入库）

- **任务目标**：订单关闭/全额退款/退款查询 + 发布安全态 flags
- **执行方案**：Owner-only 手动退款（审计+幂等撤销）+ 6 个支付 flag 代码默认 false + 服务端 409 拦截补漏
- **修改文件**：payments 路由/服务 + `src/config/featureFlags.ts` + 13 场景 smoke
- **修改原因**：支付上线前的资金安全与差错处理能力
- **测试结果**：smoke-refund-close 13/13 ✅；tsc/eslint ✅
- **遗留问题**：与 v2 红线"不做自动退款"存在口径偏差，**待用户追认**

## T-0006 【2026-08-18~23】内测积分 v3 / 整批计费 v3 / 积分包闭环

- **任务目标**：积分体系 v3 主链修复 + 整批计费 + 人工积分包
- **执行方案**：BillingQuote/ExecutionBatch/BatchSettlement 等模型与 v3 协议（docs/图译工坊_内测积分_*_20260818.md 三方案）
- **修改文件**：billing/credits/workbench 相关（commit e7f0fcb 等）
- **修改原因**：批量执行多语言任务的计费结算正确性
- **测试结果**：v3 batch smoke 全绿（e7f0fcb/c742afd 贯通证据）
- **遗留问题**：C3 立项与否留给用户（默认不立项，数据驱动）

## T-0007 【2026-08-17~18】学习系统与排版指纹 v2

- **任务目标**：PSD 扫描后学习系统（L1 质量门 + 用户排版指纹 v2）
- **执行方案**：隐形采集排版特征（本地零落盘、不含正文），LearningTypography* 模型，owner-only 管控
- **修改文件**：learning/ 模块、prisma schema、`src/app/admin` 管控端点
- **修改原因**：worklog Task 9 用户拍板的隐性学习决策
- **测试结果**：learning smoke phase0-4 + typography ✅
- **遗留问题**：平台上限调整后需观察（79d348a）

## T-0008 【2026-08-15~16】v1.5 信任链引擎

- **任务目标**：readiness → attempt → ticket → execute 全链 + 交付三件套
- **执行方案**：local-assistant v15-runner + 服务端 ExecutionTicket/Attempt 模型 + report-outbox
- **修改文件**：`download/local-assistant/*`、`src/lib/trust-chain/`、`src/components/workbench/`
- **修改原因**：执行过程可审计、可恢复、防篡改（统一信任链）
- **测试结果**：test:trust-chain 全链 smoke ✅；V1.5_统一信任链_开发验收记录.md
- **遗留问题**：0810 真 PSD E2E 未做（P1.4）

## T-0009 【2026-08-10】0810 五语言匹配 bug 闭环（逻辑级）

- **任务目标**：五种语言测试中组合绑定/匹配错误
- **执行方案**：V15_BOUND_COMBINED 断言 + 真实 CSV 入 fixture + 逐语言诚实连跑（c742afd）
- **修改文件**：assistant 核心生成物 + fixtures（a83cb2b）
- **修改原因**：真实用户素材回归发现匹配错误
- **测试结果**：逻辑级断言 ✅（真实素材 fixture 入库）
- **遗留问题**：真 PSD + 真 Photoshop E2E 归入 P1.4（素材在 `遇到的问题/脚本跑出来的问题/0810_五种语言测试__20260810_082418117/`）

## T-0010 【2026-08-13】billing/助手加固 batch（约）

- **任务目标**：计费管理与助手稳定性加固
- **执行方案**：admin-audit 审计日志、billing-admin 面板、assistant-hardening
- **修改文件**：admin/billing/assistant 相关
- **测试结果**：相关 smoke ✅
- **遗留问题**：无

## T-0011 【2026-07-26~27】本地助手 3.3.8→3.3.10 迭代（约）

- **任务目标**：多环境认证、版本升级、能力握手、COM 诊断
- **修改文件**：local-assistant（变更记录 3.3.8/3.3.9/3.3.10 三份文档）
- **修改原因**：本地助手与网站双环境授权一致性
- **测试结果**：各版本验收通过
- **遗留问题**：当前对外发布版本待确认（见 ISSUES #10）

## T-0012 【2026-07-28~29】计费/用户中心 v2/钱包迁移（约）

- **任务目标**：用户中心 v2 + 钱包迁移 + 计费报表
- **执行方案**：CreditAccount/CreditLedger 模型落地
- **测试结果**：billing smoke ✅

## T-0013 【2026-07-22】Illustrator 支持专项（约）

- **任务目标**：Illustrator 文件支持 + 2019 兼容性
- **执行方案**：tmp/illustrator-smoke-* 冒烟 + 助手 beta 打包
- **测试结果**：冒烟通过（待确认细节）

## T-0014 【2026-07-15~16】PS 执行修复 + 3.3.6（约）

- **任务目标**：Photoshop 执行链路修复
- **执行方案**：ps-execution-fix + 3.3.6 推送前备份
- **测试结果**：通过（待确认细节）

## T-0015 【2026-07-12~18】v0.2 上线 + 密钥泄露整改（约）

- **任务目标**：v0.2 部署上线（tygf-online-20260712.zip）
- **执行方案**：服务器覆盖部署（不覆盖 .env/DB）+ 验收清单
- **测试结果**：验收项通过；发现 DeepSeek/PaddleOCR 明文密钥泄露进文档 → 要求吊销重生成
- **遗留问题**：密钥整改完成度**待确认**（ISSUES #7）

## T-0016 【2026-07-06】项目启动 v0.1 三层架构奠基（约）

- **任务目标**：官网（Canvas A）/ 工作台（Canvas B）/ 运营台（Canvas C）三层 + 12 个 API 路由 + 8 个工作台组件
- **执行方案**：Prisma schema/lib 基建 + agent-browser 全链路端到端验证
- **测试结果**：端到端验证通过，"项目状态：可交付"（worklog Task 1-4）
- **遗留问题**：RG-001~008 红线后续逐步放开
