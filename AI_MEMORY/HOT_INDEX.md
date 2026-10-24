# AI_MEMORY 热索引（HOT_INDEX · 自动生成，勿手改）

> 生成时刻：`2026-10-24 10:43 UTC` ｜ 生成器：`node scripts/build-hot-index.mjs`（只读提取，不改原账）
> 用途：解决 `TASK_LOG.md`（1.65MB）与 `CURRENT_STATUS.md`（单写者滞后）带来的开机慢与读旧账问题。需要细节时按下方行号/路径精确 `read`。

## 1. 当前活动代码树与核心入口指针

- **主开发树（活体）**：`worktrees/develop/`（接力总账：`worktrees/develop/docs/HANDOFF.md`）
- **当前多稿工作台工作树**：`worktrees/multidraft2/`
- **自研 Skills 单一真源**：`skills/`（同步脚本：`node scripts/sync-yt-skills.mjs --check`，含 `yt-adversarial-review` / `yt-zongkong-round` / `yt-sansheng-liubu` / `yt-uiux`）
- **测试站与本地助手 10 秒联调诊断**：`node scripts/doctor-testsite-assistant.mjs`
- **TASK_LOG 防吞标题唯一写入口**：`node scripts/tasklog-prepend.mjs`

## 2. 最近 15 次任务记录（源自 `AI_MEMORY/TASK_LOG.md`）

- `TASK_LOG.md:1` — 2026-10-24 15:2x A+B 双线落地：容器根知识资产异地备份基线（3 笔提交）＋ 可带走的通用 Agent 治理工具箱
- `TASK_LOG.md:16` — 2026-10-24 18:3x 并车部署完成：多稿第1步重排＋邻线资金修复随 develop 上测试站 5299cd64（生产零操作）
- `TASK_LOG.md:26` — 2026-10-24 18:19 — SEO/GEO 审查记账编号勘误
- `TASK_LOG.md:30` — 2026-10-24 18:17 — SEO、GEO 与宣传下一步五面对抗式审查
- `TASK_LOG.md:40` — 2026-10-24 15:0x 独立子会话完成 yt-adversarial-review 脱敏开源就绪包（7 文件 53.8KB，阳性对照+主审独立复扫 0 命中）
- `TASK_LOG.md:51` — 2026-10-24 14:5x 彻底打通全仓四大「数据不互通」死结：归并 31 树 42 条失散记忆＋四端 Skills 同步＋CLAUDE.md 接通＋台账坏日期清零
- `TASK_LOG.md:68` — 2026-10-24 16:1x 多稿第1步重排 P0–P2 执行完毕：三提交全绿，分支待命上站（Flash 执行 P1/P2）
- `TASK_LOG.md:76` — 2026-10-24 16:1x 收生产第1步四盲区对抗式深审：P-02 死线（10-26 23:40）＋ecd7e998 建议移出第1步＋悬空引用全绿
- `TASK_LOG.md:83` — 2026-10-24 16:0x 多稿第1步模拟补漏：「读取文件夹」入口（Owner 抓错，已修）
- `TASK_LOG.md:90` — 2026-10-24 15:0x 多稿工作台第1步：Owner 拍板照 2026-10-21 界面重排——对抗式审查＋执行方案＋可交互模拟三件套
- `TASK_LOG.md:103` — 2026-10-24 14:4x GitHub打通数据不互通对抗式审查 ＋ 内部四项优化工具落地（Skills三端打通/联调诊断器/热索引/防吞标题写入口）
- `TASK_LOG.md:118` — 2026-10-24 14:2x 收生产第一步前置：Flash 外派工单实测三笔提交冲突面＋preflight test 档＋迁移可逆性（主会话逐条验收）
- `TASK_LOG.md:128` — 2026-10-24 14:2x 三个月沉淀全景导航 HTML ＋ 内部资产对抗式审查（yt-adversarial-review 首轮实战）
- `TASK_LOG.md:141` — 2026-10-24 13:4x 新建 yt-adversarial-review skill：把 3 个月的审查沉淀从"散落痕迹"变成"可调用资产"
- `TASK_LOG.md:160` — 2026-10-24 13:2x 同步闸后手：代贴坏日期＋落地 C1 源头挡刀｜推翻我自己"补行即解锁"的结论

## 3. 台账进行中 / 待复验项（源自 `AI_MEMORY/ledger.jsonl` 最新态）

- **[待复验]** `MULTIDRAFT-STEP1-RELAYOUT-20261021`（2026-10-24 18:35）：多稿工作台第1步照20261021界面重排：已并车上测试站 5299cd64（含邻线资金修复两笔随 develop），17 门全过＋现读核验绿 → 下一步：Owner 测试站点验新界面（#batch：统计卡/左稿清单/来源矩阵点格抽屉/表清单）；邻线生产段另待 ecd7e998＋P-02 拍板
- **[待复验]** `MULTIDRAFT-LANGUAGE-MATRIX-CLICK`（2026-10-24 09:11）：新版批量语言矩阵格/列头点击修复——展开全部相关稿、来源表、读表状态；已上测试站 ffab3b2e → 下一步：请 Owner 刷新测试站点任意语言格或列头：应展开明细（不是无反应），明细列出该 SKU 下全部相关稿/来源表/读表状态，可换表/重试；再点收起。
- **[待复验]** `PC-KERNING-REWRITE`（2026-10-24 09:04）：免 PS 写回字距保真已修并推 GitHub（develop 0332f451，执行器仍冻结未接线） → 下一步：Owner 用 PS 2021 打开 tmp/pc-run-20261023/real-175/out/.output_tmp/work.psd 目检能否直接打开；11 层混合字体
- **[待复验]** `TYPO-PANEL-FLOAT-BD`（2026-10-24 08:00）：排版浮窗 B+D 已上测试站；本轮补做刀一：字体搜索与脸名读数上移到语言页签下方＋修浮层被 300px 面板裁掉 → 下一步：Owner 在测试站开排版面板看搜索口是否在语言页签下方、点开能不能选到字体（浮层右半边不该被裁）；点头后随整线进生产；刀二（S4 逐层配脸＋S5 撤体下拉）仍等你一句话
- **[进行中]** `FILM-V4-RESEARCH`（2026-10-24 07:52）：宣传暂停令 Owner 10-24 07:2x 当面「全部解除」；已投属主并入官制（我只追加不改正文） → 下一步：AGPL 六件与 #276 A/B/C 不在「解除」语义内，仍等 Owner 单独拍；投放仍受宣传方案.md:12-16 上线门约束
- **[待复验]** `FILM-ANIMATIC-CUT`（2026-10-24 07:52）：v4 分镜样片横竖两版已出片（38.000000s／1920x1080 与 1080x1920／带原创配乐）；三轮抽帧目检修掉字体假阴性·偏上·框错行·光标跑偏 → 下一步：Owner 看过样片后：按 plan-v4.json 用产品真实组件重渲染真片；渲染前必须补「画面像素文字进禁词闸」
- **[待复验]** `EN-WORKBENCH-I18N`（2026-10-23 23:56）：英文站第三轮收口：助手错误 120 条接 i18n、验证邮件按语种分流、设备与会话页上线；已上测试站 dda66a74 → 下一步：等 Owner 复验测试站：① 登录后 /en 头像菜单应有 Devices and sessions（英文页）② 英文注册/重置收到的邮件链接应带 /en ③ 工作台断网/超时等
- **[待复验]** `MULTIDRAFT-STEP1-NATIVE-PICKER`（2026-10-23 22:45）：批量恢复真正选文件夹（FolderBrowserDialog），撤回选文件取父目录；卡头统一保留；已上测试站 42aded27 → 下一步：请 Owner 验：① 批量「选择文件夹…」能直接选中文件夹本身；② 选完只显示“正在读取文件夹”，不再双状态；③ 卡头「排版定制」保留。图三现代文件夹外观需另批助手 3.7.25
- **[待复验]** `ASSISTANT-STATE-GUARD`（2026-10-23 22:42）：助手配置写盘闸/ACL 停损/只读降级/HTTP 卫生——已合入 develop 6bf9d7ae 并推 GitHub → 下一步：合流预演 rc=0（merge-tree 0 冲突，develop 侧 assistant 目录 0 笔改动），merge 后语法门＋smoke rc=0，别手 6 个在改文件原样
- **[待复验]** `WORKBENCH-ROWOPS-PLAN`（2026-10-23 22:24）：R1 编辑轨已放开＋R2-a 缺译行可一键不翻译（三笔提交进 origin/develop b2eb1e01）；R2-b 软删与 R3 未做 → 下一步：复验后开工 R2-b（软删需回流层先能表达「这行没了」，且删除会作废已确认范围）与 R3（拆四种类空＋Excel 原行号＋导入丢弃计数）
- **[进行中]** `TYPO-PANEL-3Q`（2026-10-23 20:52）：排版面板三问：撤 12 格＋自动字距接通已落地（558384c9），刀二 S4 逐层配脸待派 → 下一步：刀二＝S4 逐层配脸＋S5 撤体下拉捆绑（引擎文件已齐，方案已发）
- **[待复验]** `MULTIDRAFT-STEP1-FIRSTLAYER`（2026-10-23 16:52）：第 1 步去掉第一层：文件夹入口按单稿卡、每稿手动选表、单稿页内 PSD 选择器居中；已上测试站 a2187584 → 下一步：请 Owner 在测试站 #batch 点验七条：无第一层／入口卡居中／读完同页出数据／0202&5660 手动选表／单稿选文件居中可进文件夹／旧界面可回／375px。

## 4. 等 Owner 拍板项（最近 15 条 `等您定`）

- **[等您定]** `REL-BILLING-DEPLOY`（2026-10-24 15:35）：收生产第1步：资金修复上生产（四盲区深审后：推荐第1步瘦身＝仅 1316bf34+5b9d8738 两笔） ｜ 出处：`交付档案/审查报告/审查报告_20261024_收生产第1步_四盲区对抗式深审.md:1`
- **[等您定]** `FILM-SKILL-CAPTURE`（2026-10-24 13:12）：视频 Skill 调研：GitHub 有官网→视频能力（HyperFrames capture），但只抓公开页、非录屏；本机抓取与渲染均跑通 ｜ 出处：`交付档案/审查报告/审查报告_20261024_GitHub视频Skill官网录制_实机抓取与渲染验证.md:1`
- **[等您定]** `GEO-OFFSITE-QUEUE`（2026-10-24 13:10）：站外第二信源层：CSDN 首篇已由 Owner 手发上线（168246942，200）；AI 侧仍无登录态，后续加发/改稿仍需手点；少数派/搜狐/百家号需主体或登录＝未核实 ｜ 出处：`tmp/csdn-live-check2.html:1；交付档案/宣传与运营/改稿包_20261023_CSDN首篇接回官网链接_手点清单.md:1`
- **[等您定]** `GEO-ALGO-R8`（2026-10-24 13:10）：GEO 第九轮收口：#172 已合流（26de3ade 为 HEAD 祖先）、路由对等门 418ad75f 已落；只剩 B1/B3/B4/B5 与「对等门接不接发布门」 ｜ 出处：`worktrees/develop/package.json:169；git merge-base --is-ancestor 26de3ade HEAD ⇒ rc=0；git log -1 418ad75f`
- **[等您定]** `SEO-R14-OSS-SCAN`（2026-10-24 13:10）：第十四轮两笔增量已在树（llms 两份各列教程页、/en 两处 contactPoint），四文件均非脏；只剩测量通道与 S4–S6 三项待拍 ｜ 出处：`worktrees/develop/public/llms.txt:21；public/llms-full.txt:37；src/app/en/page.tsx:37；src/app/en/download/page.tsx:46；git status --porcelain 四文件为空`
- **[等您定]** `GUIDE-FORMS-R15`（2026-10-24 13:10）：承接面三形态：A 教程型已由 GUIDE-PAGE-A 承接并上线；B 对比型/C 场景型未做，待实机对照后再定 ｜ 出处：`worktrees/develop/src/app/(zh)/guide/ps-batch-replace-text/page.tsx:169；tmp/geo-prod-guide.html:1；AI_MEMORY/ledger.jsonl L179 原行`
- **[等您定]** `DIFF-CLAIM-FALSIFY`（2026-10-24 12:57）：差异化主张证伪：Prevoda4ka 已做「Excel 译文表→PSD/PSB 文字层含智能对象」⇒「只有我们能写回图层」必须撤；「写完逐层回读比对」暂站得住但禁升级为独家 ｜ 出处：`交付档案/审查报告/审查报告_20261024_差异化主张证伪_竞品首页与开源同类实测.md:1；AI_MEMORY/TASK_LOG.md:1`
- **[等您定]** `PLATFORM-LAUNCH-PLAYBOOK`（2026-10-24 10:28）：各平台软件新品怎么发（中文＋出海）：自打 HN API 量化品类天花板，翻译类中位 4 分；结论＝平台不是瓶颈、首跑读数缺失才是 ｜ 出处：`交付档案/执行方案/执行方案_20261024_各平台软件新品怎么发_中文与出海对照.md:1；AI_MEMORY/TASK_LOG.md:1`
- **[等您定]** `MULTIDRAFT-TABLE-INVENTORY-PLAN`（2026-10-23 23:13）：多稿工作台新方案：全表读取 + 译文来源矩阵（表册/绑定/矩阵；未改代码） ｜ 出处：`交付档案/执行方案/执行方案_20261024_多稿工作台_全表读取与译文来源矩阵.md:1；交付档案/执行方案/执行方案_20261024_多稿工作台_全表读取与译文来源矩阵.html:1；worktrees/multidraft2/AI_MEMORY/TASK_LOG.md:1`
- **[等您定]** `REVIEW-UNBLOCK-PLAN`（2026-10-23 18:57）：表格审查去阻塞＋就地裁决：四段方案（止谎／补译不打断／并步／一次批准）＋AI 代译放不放的要拍 ｜ 出处：`交付档案/执行方案/执行方案_20261023_表格审查去阻塞与建议就地裁决_对抗式审查.md:1`
- **[等您定]** `GEO-OUTFACE-ARTICLES`（2026-10-23 14:10）：站外文章清单（对抗式审查后）：只写 1 篇「怎么知道没改坏」，同题第二篇／长句词加发／英文出海稿三类砍掉；新稿机扫 0 命中、已填进知乎并存成草稿 ｜ 出处：`交付档案/宣传与运营/发布稿_20261023_知乎与CSDN_怎么知道没改坏_回读核对与三态报告.md:1；tmp/copy-scan.mjs:1；download/local-assistant/report-renderer.js:38；交付档案/杂项/飞书推送_20261017_编码撤回与词面改PS.md:33`
- **[等您定]** `LEDGER-SNAPSHOT-GATE`（2026-10-23 13:34）：技术方案 v1 已出稿（四改动 C1 源头挡刀／C2 按行提升／C3 held 行不污染基准／C4 恒失败点名 ＋ M1–M4 迁移顺序 ＋ 7 条验收含负控）；四文件一字未改 ｜ 出处：`交付档案/执行方案/执行方案_20261023_台账投影按行提升与防复发校验.md:1；AI_MEMORY/ISSUES.md:2043（#274）；scripts/sync-task-ledger.mjs:317；scripts/sync-task-ledger.sh:143`
- **[等您定]** `SITE-HTML-CACHE`（2026-10-23 13:04）：〔更正行·打回自己〕"用户与爬虫可能一年看旧版"在现网没成立——同页三次连取全是 cf-cache-status=DYNAMIC 且无 Age ⇒ CF 当前没缓存；嫌疑从 CF 规则转向 Next 预渲染缺省（仍属推理） ｜ 出处：`AI_MEMORY/ISSUES.md:2004（#269 两处更正）；AI_MEMORY/ISSUES.md:2020（#272 缓存嫌疑更正）；tmp/cache-source-probe.mjs:1；worktrees/develop/next.config.ts:79`
- **[等您定]** `CSDN-LINK-PATCH`（2026-10-23 12:36）：百度前排那篇 CSDN 文里官网是两处纯文本、可点链接 0 个 ⇒ 改稿包已备好（只把"图译工坊（官网 tuyigf.com）"做成链接，标题与 URL 不动） ｜ 出处：`交付档案/宣传与运营/改稿包_20261023_CSDN首篇接回官网链接_手点清单.md:1；交付档案/执行方案/操卡_20261017_站外四道人工闸_手点清单.md:16；tmp/_csdn_live.html:1`
- **[等您定]** `MULTIDRAFT-STEP1-COPY-GUIDE`（2026-10-23 10:54）：多稿工作台第 1 步文案减负与引导：设计说明退出常驻层（716→357 字）＋首登 4 步＋页头问号＋就地提示，附可点模拟 ｜ 出处：`交付档案/审查报告/审查报告_20261023_多稿工作台第1步_文案减负与引导.md:1；交付档案/执行方案/模拟_20261023_多稿工作台第1步_文案减负与引导.html:1；worktrees/multidraft2/src/components/workbench/attribution-stage.tsx:194`

## 5. 最近产出的 18 份交付档案（源自 `交付档案/`）

- `2026-10-24 10:41` — `交付档案/宣传与运营/opensource-agent-governance-kit/GOVERNANCE.md`
- `2026-10-24 10:41` — `交付档案/宣传与运营/opensource-agent-governance-kit/README.md`
- `2026-10-24 10:39` — `交付档案/执行方案/飞书_20261024_并车部署完成_测试站5299cd64.md`
- `2026-10-24 10:17` — `交付档案/审查报告/审查报告_20261024_SEO_GEO与宣传下一步_五面对抗式审查.md`
- `2026-10-24 09:51` — `交付档案/宣传与运营/opensource-yt-adversarial-review/README.md`
- `2026-10-24 09:49` — `交付档案/宣传与运营/opensource-yt-adversarial-review/skills/yt-adversarial-review/references/pitfalls.md`
- `2026-10-24 09:49` — `交付档案/宣传与运营/opensource-yt-adversarial-review/skills/yt-adversarial-review/references/negative-controls.md`
- `2026-10-24 09:49` — `交付档案/宣传与运营/opensource-yt-adversarial-review/skills/yt-adversarial-review/references/stress-techniques.md`
- `2026-10-24 09:48` — `交付档案/宣传与运营/opensource-yt-adversarial-review/skills/yt-adversarial-review/references/drilling.md`
- `2026-10-24 09:48` — `交付档案/宣传与运营/opensource-yt-adversarial-review/skills/yt-adversarial-review/SKILL.md`
- `2026-10-24 09:41` — `交付档案/审查报告/审查报告_20261024_GitHub打通数据不互通对抗式审查与内部四项优化落地.md`
- `2026-10-24 09:27` — `交付档案/审查报告/审查报告_20261024_三个月沉淀全景导航与内部资产对抗式审查.md`
- `2026-10-24 09:05` — `交付档案/审查报告/审查报告_20261024_对抗式审查深水区_续篇_可复用战术与量化边界.md`
- `2026-10-24 08:47` — `交付档案/审查报告/审查报告_20261024_全项目可沉淀资产与对抗式审查深水区_调研.md`
- `2026-10-24 07:58` — `交付档案/执行方案/飞书_20261024_多稿工作台第1步_P0P2三阶段全绿.md`
- `2026-10-24 07:35` — `交付档案/审查报告/收生产第1步四盲区_飞书版_20261024.md`
- `2026-10-24 07:33` — `交付档案/审查报告/审查报告_20261024_收生产第1步_四盲区对抗式深审.md`
- `2026-10-24 07:03` — `交付档案/执行报告/飞书_20261024_收生产第一步_编号更正.md`
