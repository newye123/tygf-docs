# ISSUES.md — 问题登记（Bug / 技术债 / 已知风险）

> 最后更新：2026-08-24
> 每条带编号、严重度（🔴 blocker / 🟠 major / 🟡 minor）、位置、影响、建议、状态。
> 修复后更新状态，不删除条目。

---

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
- **状态**：📌 已登记（T-0018 排查结论），修复待立项

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