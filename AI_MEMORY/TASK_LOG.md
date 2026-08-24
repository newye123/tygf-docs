# TASK_LOG.md — 任务日志（每次任务一条，新记录置顶）

> 最后更新：2026-08-24
> 字段：任务目标 / 执行方案 / 修改文件 / 修改原因 / 测试结果 / 遗留问题。
> 历史条目为首次盘点时从既有记录（worklog/records/HANDOFF/备份命名）继承登记；日期来自证据推断的标"约"。

---

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