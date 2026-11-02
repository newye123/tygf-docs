## 2026-11-01 21:2x　免PS换手三刀定形：判据改问「指挥得动吗」、缓存带来源、换手进浏览器投影（决策级：白名单一枚标签＋只读面豁免）

Owner 令「免PS引擎是当 PS 没有反应的时候就要启动的备选」＋「要，开工，做完再一起推」。对抗式审查 Round1 打回的自动换手，本轮按三刀落地并推 origin/develop＝29f8bc28（代码笔 19c65c3e ＋ 合入排版分组 da518369 的合并笔 f04239de ＋ 接力笔 29f8bc28）。定下四件事：

- **判据只认实测**：换手触发＝助手完整性级别实测高于 Photoshop（就是卡住那 12 份稿的一票），未实测一律视为指挥得动 ⇒ 现役路径零额外动作；**故意不拿握手状态或超时当触发**（那个数据源扫描成功不会刷新，会误判）。引擎没备好或开关关 ⇒ 明确拒绝并保留今天那句「请以普通权限重启助手」，不假装换得了手。
- **来源必须进缓存判定**：通道判定提到缓存快路径之前，命中还要比是谁扫的（observationChannelOf）。根因是实测：同一份稿两只手给的层号不是一套（引擎 {3,4,6,7,8} 对 ag-psd {5,7,11,13…}），跨手复用＝静默拿错层号干活。
- **投影层合同只放开一枚标签**：executorHand（'photoshop' 或 'engine'）进浏览器摘要并在三处界面标出，tooltip 如实写「出件仍需 Photoshop」；引擎版本／哈希／母版路径／Photoshop 版本仍一律不出本机（旧断言改窄不删＋加正向断言）。**回执与报价侧刻意不动**——execution-manifest 的 assertExactKeys 与云端 RECEIPT_KEYS 是精确键校验，多一枚键会让整批行回执被 400 丢弃并改变结算摘要哈希。云端「数得出」仍差一列（要一次 Prisma 迁移＝等 Owner 单独点头）。
- **安全锁只在不改状态时豁免**：Photoshop 卡出「需人工恢复」后，内置引擎的纯只读扫描可以进来（不产生 COM 那种「退出状态未确认」含糊）；PS 道扫描、执行段、attempt 锁不符照旧全挡。判据只许 setBusy 一处调用，两处取锁各交出自己的通道（门禁把形状钉死）。

不变的红线：写回执行器仍未接线（smoke-pc-wiring-freeze 负向钉死，三个上游 P0＋排版写回通道一条未解）；pcExecutorEnabled 出厂 false ⇒ 现役机器与测试站行为一字不变；助手侧改动要进 3.7.31 包才到用户机器。

验证：合并 origin/develop 后整批 12 条门逐条 rc=0（单测 48 文件／567 条、tsc、lint、contracts、batch-row-contract、typography-groups、trust-chain、assistant-auth-barrier、privilege-log 七格、preparation-scan-contract、pc-channel 10/10、wiring-freeze 9/9）；四组负控实跑都会红，改完一律 cmp 逐字节还原。

出处：AI_MEMORY/TASK_LOG.md:1（2026-11-01 21:1x 段）·AI_MEMORY/ISSUES.md:16 #296 状态追加·worktrees/unified-opt-20261031/docs/HANDOFF.md:1·审查件 交付档案/审查报告/审查报告_20261101_PS与免PS引擎如何配合_左右手.md·交付件 交付档案/执行报告/执行报告_20261101_刀2刀3_换手可见与恢复锁不连坐.md。
## 2026-11-01 17:40　排版浮窗内「按原稿分组配字体」落地（决策级：偏好形状加分组，不下发容器键）

Owner 令按模拟件 20261027 把分组配字体做进真浮窗（提交 da518369→origin/develop，测试站已部署）。定下的三件事：① 分组是**偏好**的一部分，键用源稿 PostScript 脸名（②再叠两位小数读数），与助手 A2、执行器 1.4.0 的命中键逐字符同形，因此浏览器侧不做二次猜测也不做大小写归一；② `groups` 是容器不是字段，"本次会发 N 项"必须数默认档字段＋各组字段，且下发按 24 组截断（助手超上限会整份拒收、连默认档一起废），存盘每种留 96 组以便旧稿的组不因换稿被清；③ ③字号阈值／④逐层勾选与模拟件的「段落」块一律不进界面——前者 Owner 已撤，后者助手契约与执行器还没有段落写回，摆出来就是假可供性。验证入口 `npm run test:typography-groups`（含把浏览器产的信封直接喂助手 A2 校验器＋两枚负控）；交付与边界见 AI_MEMORY/TASK_LOG.md:1。

## 2026-10-30 21:04 视觉质检与学习验证离线首批

新增本地证据审核与候选质量验证，原因是估算/用户选择一致不能代替输出质量证明。保持现有学习只记录合同与执行链；交付与边界见 交付档案/执行报告/执行报告_20261030_视觉质检与学习验证_离线首批.md:1。

## 2026-10-30 11:40　批量台四步按 v3 模拟件重做：五刀显示层落地、新增两道门（决策级：为什么只改投影不改行为、为什么文案要跟代码事实锁在一起）

- **变化**：Owner 指定按 v3 模拟件统一四步——① 色板：`--batch-*` 提成 `--wb-*` 语义令牌并统一 teal（主按钮 `#007066`，对白字 5.98:1），新建色板守卫 `scripts/check-wb-tokens.mjs`（41 条）；② 第 1 步语言格条五态不合并 ＋ 归属切片条；③ 第 2 步取数口改到切片之后的有效片，三个数一次派生，最多渲 50 行；④ 交付物矩阵搬到第 3 步，新建纯函数 `countMatrixCells` 做五桶计数，「人工决定」并进同一张例外清单（门没松）；⑤ 第 4 步按既有 5 秒轮询做逐语种进度条、份口径两个数并排、停批三处出口说实话。develop 工作树未提交、未推送、未部署。
- **为什么这么切**：v3 的第一性原理是「交付物 = 稿 × 语种」，四步要按这个轴说同一件事；本轮只动显示层，矩阵/计费/执行/排除语义一字未动，因此合同四层不触发。唯一新增能力是纯函数计数，被矩阵组件与统计两侧共用，堵死「矩阵红、统计绿」。
- **两条判据留档**：① 单源：格子分类只认 `src/lib/workbench/coverage-matrix-counts.ts` 的 `classifyCell`，两侧不得各算一套；② 文案不作承诺：任务书拟的「重跑请从该稿继续」与代码 `setExperimentIndex(0)` 相反，落地改成实话，并用门把这句话和 `setExperimentIndex(0)` 锁在一起——将来真做成续跑，门先红。
- **复跑与定性**：tsc rc=0；定向 ESLint 0 error/23 warning；新门四步 100/100、色板 41/41；guards 63、groups 128、flow/ui-contract/scope 绿；全量 vitest 2 failed/477 passed（与基线同两只，非本轮）；i18n 缺口 121→116（改善）；英文 92.4%（1509/1633，门要求 100%，缺的 124 条是旧账）。负控现场 12 条逐条 rc=1、还原后 sha256 一致。
- **自查揪出的三处门洞**：FAILED 曾被算成已完成而门没咬住（子串门看不见）⇒ 改成钉死 `done:` 整行形状；两条断言抄死字面永远匹配不上 ⇒ 改正则并绑定常量；一处文案跨行写导致覆盖率不可见 ⇒ 改单行。均为修门，不是放宽阈值。
- **界外**：真实 12 稿×12 语深态、真实执行与回执未跑（不跑真实 AI/PS 是红线）；深色模式未验；英文第 3 步曾量到 22 个汉字，两次复探为 0 ⇒ 只记怀疑。三项要 Owner 拍板：停批后重跑会从第 1 稿重来（#288）、多稿空态空白横条（#289）、英文 124 条旧账。
- **关联**：变更书 `worktrees/develop/changes/active/20261030-wb-v3-four-screens.md`；报告 `交付档案/审查报告/审查报告_20261030_批量台四步v3重做_执行与复验.md`（VERDICT：有条件放行）；TASK_LOG 同轮条目；台账 `WB-V3-FOUR-SCREENS-20261030`。
## 2026-10-29 22:05　工作台全流程第二轮接手：修掉一处会白屏的开发态回归，第 4 步确认框按真实分支说话（决策级：为什么"hook 当实参"必须拆成两行、为什么确认框只改投影）

- **变化**：第二轮（`WB-UX-FLOW-20261029`）计划内 20 个写入目标全部落地，真变 16 个文件。接手时补了三件事：① `src/components/workbench/stage-folder-gate.tsx` 把 `useSiteCopy()` 从"函数实参"改成先落变量再迁移（3 行）；② `execute-step.tsx` 确认框显示语言改为跟真实执行分支（`useBatchChain ? allLanguages : [targetLanguage]`），行数写「译文表共 N 行」、名称区改「输出名称前缀」，确认指纹 4 项补到 8 项；③ 两条被新行为打红的门禁断言按新口径重钉（`scripts/smoke-workbench-scope.mjs`、`scripts/smoke-step1-mock-contract.mjs`）。develop 工作树未提交、未推送、未部署。
- **为什么这么切**：切「多个设计稿」会整页掉进 Next 错误边界，控制台 `ReferenceError: useSiteCopy is not defined`。根因不是 hook 用法违规，而是**开发态编译器对"hook 调用直接当实参"这种写法漏改写**——产物里留一个裸标识符，而同一模块里另一个组件改写正常，所以测试和经验都不容易发现。把它拆成两行（先赋值、再传参）不是风格偏好，是让编译器没有机会漏改。第 4 步确认框同理：用户看到的是"这次到底生成哪些语言、落盘叫什么"，所以只改投影（显示集合、行数措辞、名称措辞、指纹字段），积分冻结、绑定摘要、提交参数、run 回调**一字未动**。
- **两条判据留档**：① 白屏回归没有文本门可钉——它是编译器改写缺陷，`vitest` 跑不到这条路径，只能靠编译产物取证（裸调用 1→0、正确改写 2 处）＋浏览器往返；② 确认指纹只准加强、不准放松：设计稿路径、语言集合、表格行数之外补执行分支、当前语言、显示语言、输出名称，让"换了范围却还能确认"的旧弹窗失效（`scripts/smoke-workbench-scope.mjs` 53 assertions 钉住）。
- **复跑与定性**：tsc rc=0；6 个源文件定向 ESLint 0 error/21 warning；ui-contract ok；step1-mock 102 项失败 0；flow／batch-groups／batch-guards rc=0；scope 53 assertions；本轮 5 个测试文件 73 passed；copy 49 assertions。三条红门均既有：英文覆盖率 92.1%（1454/1579）、i18n 121 条缺口（基线对照 121 既有、新增 0）、两支单测（一支键名不一致、一支源文件是别的会话在飞改动）。负控在隔离树做：换回基线/HEAD 后对应门变红并点名，全部换回三闸全绿。
- **界外**：读全部表头的四路账、第 3/4 步深态与真实 Photoshop 生成未验（需本地助手＋真实稿）；英文只核了无中文残留。字节包在 `交付档案/执行方案/字节包_20261029_工作台全流程_第二轮接手/`（20 条目标双 sha256＋`restore.mjs`＋隔离还原演练 18/18、删除 2）。报告 `交付档案/审查报告/审查报告_20261029_工作台全流程第二轮_接手复验与交付.md`（VERDICT：有条件放行）。
- **关联**：方案 `交付档案/执行方案/执行方案_20261029_工作台全流程UIUX优化_Luna执行.md`；TASK_LOG 同轮条目；台账 `WB-UX-FLOW-20261029`。原执行人于 20:12:09 因额度用尽停工（会话记录 `usage_limit_exceeded`），本会话接手。

## 2026-10-29 17:43　多稿工作台展示收口：身份、状态词、按钮范围、第 3 步分区（L2 展示决策：为什么只改投影不改算法）

- **变化**：多稿工作台的四件事统一到一条规则上——① 同名稿显示用「最短可区分路径」共用纯函数（新文件 `src/lib/workbench/draft-display-labels.ts:12`），矩阵、第 1 步同名稿提醒、第 2/3 步逐稿队列三处同源，点击/恢复仍传完整原始路径；② 覆盖率格按真实来源分轴：扫描态走 `isMultiPsdEntryScanned`（`src/lib/workbench/psd-selection.ts:131`）经 `scannedByDraft` 传入，算不出覆盖率时已扫描说「已扫描，但缺少可估算的原文信息」、未扫描才说「请先扫描本稿」，行头「未检查」改「配表待核对」（那是表归属证据轴），「已确认」全改「译文审查确认」；③ 第 2 步两个检测按钮把范围写进标签（「检测当前稿全部 N 种语言」／「智能检测当前语言 日语」），单稿沿用原文案；④ 第 3 步给既有四块各挂范围标签（待确认范围／必须处理／版式复核／可选详情），缺译句在确认前只说「建议保持原文，等你确认后再按此处理」。develop 工作树未提交，10 个文件 +445/−123 行。
- **为什么这么切**：Owner 反馈「第 2、3 步看起来没变化、第 1 步选项和重复信息过多」。复核定位到根因不是缺功能，而是**同一页面把不同来源的事实说成同一个词**——「已扫描 12」「未检查」「已确认 4/4」各自都对，放在一起就像互相打脸。所以本轮只做只读展示投影：范围集合、确认摘要、覆盖率算法、阻断汇总、计费、执行门**一字未动**，合同变更纪律四层不触发。
- **两条判据留档**：① 展示标签永远不作身份（`hasScanned: scannedByDraft?.[draft.masterPath] ?? Boolean(draft.summary)`，`coverage-matrix.tsx:134` 用原始路径取数）；② 「译文审查已确认」不等于「可执行」——矩阵内 `可执行` 字样已清 0 命中，守卫加了反向锁（`scripts/smoke-batch-workbench-guards.mjs:246`），防止以后又写回去。
- **复验（独立复验者本会话自测，非执行者自报）**：字节包逐文件重算 10/10 一致；定向行为测试 62/62 rc=0；六道既有保护闸 rc=0（61 checks／49 assertions／96 判据等）；tsc rc=0；定向 ESLint 0 error；负控（把 helper 换成只显文件名的夹具）rc=1、5 failed／1 passed，证明身份断言真的拦得住；真页面只读导航期间仅 2 个 GET，无扫描／AI／执行请求。详见 `交付档案/审查报告/审查报告_20261029_多稿工作台UIUX复验.md`（VERDICT：有条件放行）。
- **界外（本决策不覆盖）**：真实 12 稿／53 表深态未在浏览器验收（当前批次 0 稿）；第 4 步执行锁与访客例外原样保留，未新增预览或执行出口；内部词「Batch-1」仍从接口 `nextAction` 与 `execute-step.tsx:768` 两处漏到用户面前；读表按钮在「没有待读任务」时仍说成「没有绑定的稿」（`step1-stage-view.tsx:1424`）。后两条是上一轮审查里未进本轮授权写入面的旧账。
- **关联**：变更单 `worktrees/develop/changes/active/20261029-multi-draft-uiux-clarity.md`；方案 `交付档案/执行方案/执行方案_20261029_多稿工作台UIUX收口_Luna执行.md`；执行回包 `tmp/mdw-ux-20261029/luna-result.md`；台账 `MDW-UX-20261029`。未 push、未部署、生产与测试站未动。

## 2026-10-26 14:5x　批量台第一步换成「一稿一组语言表」（决策级：为什么合并放在读表之后、下游形状不变）

- **变化**：第 1 步从「一稿只能绑一张表」改成「一稿自动成组、组内每门语言一张表」，读完整组后合成**一张多语言表**写回 `parsedTables[稿]`。develop 两笔提交 `7c3f3f8f`（纯函数内核）＋ `f6d140ae`（界面与读表接线），未 push、未部署、生产未动。
- **为什么这么切**：Owner 的真是事是「一个文件夹 12 稿 × 12 语＝144 张表」，旧结构下 144 张只读得到 12 张、只能交 12/144 份（ISSUES #282 实测）。把「归组」与「合并」做成无 IO 的纯函数层，界面只渲染同一套判据 ⇒ 执行链、报价、结算、回执、助手协议**一个字都不用改**，合同变更纪律四层不触发（施工图 §10 判定）。
- **三条默认与两条硬闸（Owner 2026-10-26 拍）**：组准入①文件名 SKU 是硬门槛（唯一能挡「同原文、别稿译文」F14 的门）；同门两张**不替用户挑**、界面原地点开选；结构差一行**只拦那一张**、其余照常合并与交付；合并基准＝**行数最多优先、并列按文件名**（否则行序由扫描顺序悄悄决定，同批数据两次合并结果不同）。
- **三处静默行为升级为点名报错**：同一门两张译文不同 → `CSV_MERGE_LANGUAGE_CONFLICT`（原来先到静默赢）；没有严格多数 → `CSV_MERGE_STRUCTURE_SPLIT`（原来 6:6 照合，134 进 134 出）；原文几乎对不上 → `CSV_MERGE_NO_OVERLAP`（原来误报「行数超 300」）；第 13 门话术改为点名那张表并给出路。
- **表级事实必须单独存**：`stageTableParses`（归一表身份 → 这张表自己的语言/行数）。踩过的坑：拿稿级合并结果反推会让基准表冒充 12 门、其余 11 张被算成「没被用到」，`deriveStageChoices` 交出的基准与真合并基准也会分家。表册改为接受调用方算好的那一份（`table-inventory-list.tsx` 不再自己按一稿一表重算第二套事实）。
- **同批修的口径**：`normalizeTableId` 补消 `.`／`..` 段——同一张表两种写法曾得两个身份，排除项重扫会静默复活；「读全部表头」改为循环到队列空（助手单次上限 12 张，144 张要 12 轮，原来点一次只读前 12 张）。
- **界外（本决策不覆盖）**：矩阵归位第 4 步、第 2 步语言 tab 真过滤、第 3 步 1:N（P3）；份数口径与例外收口（P4）；真机端到端＋出包＋测试站（P5）。读表 worker 的取数循环目前只有单测与投影级证据，真助手＋真文件夹未跑。
- **关联**：ISSUES #282（本条为其落地记录，待 P5 真机证据才结案）、ISSUES **#283**（顺带查出的假红门：`test:batch-workbench-guards` 抠已被 i18n 改写的源码原文，连红至少 6 天且不在 `test:contracts` 链里）；方案 `交付档案/执行方案/执行方案_20261025_批量台一稿一组语言表_五轮审查后施工图.md`。

## 2026-10-25 21:4x　官网字体分片改为「1 小时边缘新鲜 + 1 天后台刷新」（决策级：为什么不用 immutable）

- **决策**：`next.config.ts` 的 `headers()` 为 `/fonts/:path*` 统一下发 `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`（提交 `cdc40807`，develop）。
- **理由**：源站对 `public/` 静态文件默认 `public, max-age=0` + ETag，Cloudflare 因此每次请求都回源做条件校验（实测同一路径 6 次里 4 次 `REVALIDATED`；对照 `/_next/static/*` 为 `HIT` + immutable）。首页冷访问要拉 5 个字体分片（406,956 B），等于每次多 5 次 LAX↔SIN 跨洋往返，而源站在新加坡、边缘落洛杉矶。
- **为什么不是 immutable**：分片文件名不带内容 hash（`public/fonts/shsc/manifest.json` 只记 sha256），一旦给一年缓存，字体更新后老用户会长期拿旧文件。折中值＝更新最迟约 1 小时进边缘、常规访问 0 回源。
- **界外（未随本决策改变）**：首页 HTML 仍 `no-store`——首页读草稿模式与会话摘要（`src/app/(zh)/page.tsx:32,35`），把 HTML 做成可缓存必须与 Cloudflare Cache Rule 的「带 cookie 绕过」成对上线，属 CF 后台动作，未在本次落地（见 ISSUES #281 进展）。
- **上生产（2026-10-26 08:1x，发布挂号 `main` = `80eb4263`）**：`origin/main` 从 `df93c257` 快进到 `80eb4263`（`cdc40807` 挑单笔，`git diff` 仅 `next.config.ts`）；生产预检 18 门全 PASS（UnsignedBeta 按 09-13 A 案 override，包内安装包与现役同字节），包 `tygf-production-80eb4263390d.zip`（27,472,661 B，SHA-256 `6124A5EF…E90F`），`deploy-release.sh` rc=0，`tygf-current → 80eb4263`、systemd 三单元 active、健康 200、provenance BOUND。**生产实测**：`/fonts/*` 由每次 `REVALIDATED` 变为 `EXPIRED → HIT`（`Age 2/4`），`/` 仍 `no-store + DYNAMIC`、`/_next/static/*` 仍 immutable。
- **关联**：ISSUES #281；报告 `交付档案/执行方案/执行方案_20261025_网站慢A方案落地_字体缓存与CF两处开关.md:1`、`交付档案/执行报告/执行报告_20261026_网站慢A2上生产_字体边缘缓存.md:1`。

## 2026-10-25 本地助手 3.7.28 出厂：浏览器预检放行头补齐（多绑定引入的隐性断点），测试站 `d317bb7f`

- **变化**：助手 `cors()` 的 `Access-Control-Allow-Headers` 补 `x-tygf-install-id`（3.7.25 多绑定起客户端每个请求都带它，名单没跟上＝Chrome 预检直接拒，请求从未到达助手）；`ASSISTANT_UNREACHABLE` 归入网络类错误码表，不再按授权失效提示；新增回归门 `scripts/smoke-assistant-cors-preflight.mjs`（从客户端源码现取实发头 → 起真 server.js → OPTIONS 预检断言），接入 `test:assistant-auth-barrier`（发布门链内）。
- **版本链**：8 处同号升 3.7.28（identity/`server.js` VERSION/助手 package.json/report-renderer buildId `cors-preflight-20261025-r1`/installer.iss/.env.example/server-setup.sh ×4/.gitattributes 豁免行）。
- **证据**：17 道发布闸全 PASS；出厂件本体在 49318 端口实测 OPTIONS → 204 且三头齐；测试站 `d317bb7f` 健康 200、latest 接口 3.7.28、安装包 SHA `458D25EB…420A1F0` 与服务器逐位一致。
- **取舍**：生产站未动（仍 `origin/main`）；安装包未签名；云端验票慢链与 `serverUrl=localhost:3000` 的积压回执另案。
- **台账**：`AI_MEMORY/ISSUES.md` #280；报告 `交付档案/执行报告/执行报告_20261025_本地助手3.7.28_CORS修复与测试站部署.md:1`。

## 2026-10-25 生产站首页字体改为按字集分片（14.13 MiB → 406,956 B），main `df93c257`

- **变化**：首页不再预载整包思源黑体 VF，改为 4 个 `unicode-range` 分片（400,892 B）＋ 6 字补充片（6,064 B）；文件名不变、URL 不变，仅首页预载，其它路由不受影响。
- **部署**：测试站 `dbc434ff` → 生产 `df93c257`（父提交即原生产 `319bc138`，前进 1 笔、落后 0 笔）；两站字体件 200、旧 VF 404、provenance BOUND。
- **效果**：真浏览器读得 5 个字体面全部 loaded（277–446 ms）；整页从 14.37 MB 降到 446,865 B。
- **仍存在的瓶颈**：Cloudflare `cf-cache-status: DYNAMIC`（首页每次回源，首字节 3.0–4.4 s）与跨洋链路截断（12 次复测 5 次 20 秒只传一半），属 CDN/网络配置层，未动线上配置。
- **回滚**：`/var/www/tygf-current` 切回 `319bc138` 的发布目录即可（部署脚本保留上一版目录）。

## 2026-10-23 英文站 i18n 接缝定在三处出口（`useSiteCopy` 出口 / 术语 getter / t 占位符），并加两道静态守卫

- **决策**：① 站点文案在 `src/lib/workbench/site-copy.ts` 的 `useSiteCopy` **出口**统一本地化一次，而不是逐个组件包 t()（200+ 调用点、局部变量名各不相同，逐个包必漏）；② `WB_ACTIONS` 的 label/hint 用 **getter**，保证在"渲染取值那一刻"求值——模块级常量会在 import 时被定格成中文；③ 动态消息（含本机助手地址）走 `t('...{url}...', { url })`，不再拼中文模板。
- **理由**：英文站不能靠"首屏看着是英文"验收。模块级求值、文案出口、动态模板这三处漏任何一处，界面就是中文，而且**都不报错**——只能靠静态判据＋登录态逐步实测发现。
- **守卫**：`scripts/i18n-guard-module-scope.mjs`（模块级 t() ＋ 词典缺口，rc=1；已并入 `smoke-en-workbench`）、`scripts/i18n-scan-unwrapped.mjs`（裸中文余量，当前 325 处 ⇒ #273）。覆盖率下限 `MIN_COVERAGE_PERCENT` 45 → 100。
- **中文侧不受影响**：t() 在 zh 下原样返回同一字符串；`AppShell` 显式 `LocaleProvider locale="zh"`，不再依赖"中英文是两套根布局所以整页刷新"这一框架行为。

## 2026-10-22 工作台 i18n 接缝（以中文原文为键）＋ /en/workbench 路由＋机械包装器

- **新增**：src/lib/i18n/t.ts（模块级当前语言 + 词典查表 + 占位符填充；中文原样返回）、src/lib/i18n/dict-en.json（键＝中文原文）、src/lib/i18n/locale-provider.tsx。
- **新增**：/en/workbench 英文工作台路由与 en-workbench-shell.tsx；ViewProvider 增 initialView（默认 home，中文站行为不变）。
- **新增工具**：scripts/i18n-wrap-workbench.mjs（TS 语法树包装器，只碰显示层字符串）、scripts/i18n-report.mjs（覆盖率与按文件缺口）、scripts/smoke-en-workbench.mjs（英文首屏 0 中文 / 中文站仍中文 / 无报错 / 覆盖率下限）。
- **改动面**：29 个工作台组件共 744 处文案被包装；中文站头部 EN 入口按视图分流到 /en/workbench。
- **当前覆盖率**：322/645（49.9%），首屏路径全译；第 2~4 步面板 323 条待译。

## 2026-10-22 英文站新增认证路由（/en/auth/login、/en/auth/reset）与首页登录入口；守卫扩到"入口存在且指对"

- **新增路由**：`src/app/en/auth/layout.tsx`（居中卡片薄壳、noindex）、`login/page.tsx`（英文登录）、`reset/page.tsx`（英文重置）。行为与中文站 `(zh)/auth/*` 逐条对齐（同一套 API、错误码分支、safeNext、激活态恢复），认证逻辑未改。
- **首页入口**：英文首页 `nav-actions` 补 `Log in`（此前 Wave 0 改版漏搬，`nav-login` 样式槽被 `/en/download` 占着），href=`/en/auth/login?next=/en`，保留测试站 `?key=` 令牌；登录后回英文站。
- **响应式取舍**：`@media (max-width:480px)` 撤下载入口（加登录入口后 390px 实测溢出 40px）；页脚与直链下载不受影响。
- **守卫**：`scripts/smoke-en-layout.mjs` 新增"英文首页必须有 Log in 且指向 /en/auth/login"＋"/en/auth/login 与 /en/auth/reset 必须 200 且 SSR HTML 含英文标题"，断言数 42→61。
- **已知缺口**：英文站注册/会话管理/邮箱验证仍是中文页，英文首页登录后不变账号菜单（归 Wave 4），见 ISSUES #270。

## 2026-10-23 08:0x 多稿工作台第二笔：批量导入从「按文件名配对」改成「SKU×交付物归属」，冲突一律人定

- **变了什么**：`worktrees/multidraft2` 三笔（`52f26307` 界面、`dacc8fc5` 弹窗加宽、`8a984d0c` 合同与字体修正）已推到 `origin/develop` 并部署测试站（测试站现役 `8a984d0c`，备份 `deploy-20261023_080203-8a984d0c141d`，生产未碰）。归属判据从「同名/同目录猜」换成内核 `buildAttributionPlan`（`src/lib/workbench/sku-attribution.ts`）：只认同 SKU＋同交付物；表名认不出交付物＝通用工作簿（按稿的交付物选 sheet）；**不跨交付物借表**（独立站主图不借 Amazon 主图表）；唯一候选才自动配；多候选、以及「同 SKU 同交付物多份稿抢一张表」一律台上要人定；没被认领的表进「有表无稿」并逐张说原因。
- **为什么**：Owner 2026-10-22 定「表应该自动找到自己的归属」并点头界面形态；旧口径在真实目录里会把 A+ 的稿配到主图表、把同名不同内容的两份稿算成一份。选表键同时从文件名改成 `masterPath`（同名不同内容两份稿不再互相覆盖）；读表交付物改为复用归属身份 `row.identity.deliverable`，不再二次猜文件名。
- **口径边界（写死进合同 smoke）**：确认框只能渲染归属计划（`bulkImport.attribution.rows`），不得退回 `pairing.rows`；只有 `attributionAutoChoices` 允许预选；有表无稿必须逐张列出。已知未做：二选一的「记住」只在会话内（`bulkRememberedRef`），跨重启落存储待下一轮；矩阵到 SKU×交付物，语言矩阵仍在第 3 步（归属时表未读，语言未知）。

## 2026-10-23 01:4x 助手 3.7.23 成对出厂＋测试站换到 `1ff266f0`；本机内存闸**明确不装**；孤儿运行时测试收编

- **变了什么**：`worktrees/develop` 新增六笔——`5e10f65f`（收编 10-21 起未提交的 v12 执行前确认运行时测试，`tsc` 由红转绿）、`7d20b050`（未登记原因码的兜底次序补闸：助手原文带脚本名/摘要/本机路径时不再直出用户面）、`8296384f`（llms 索引两行收编，先证教程页已在线）、`567cf3da`（合流 origin/develop 14 笔）、`561f6d88`（3.7.22→3.7.23 版本声明 14 处／8 文件＋安装包）、`1ff266f0`（归档豁免块 3.7.22＋3.7.23）。测试站 BOUND 由 `557fe767` → `1ff266f0`，备份 `deploy-20261023_012513-1ff266f0a8b4`，库结构零差异、Nginx 未动。生产未碰（仍 `319bc1384a36`）。
- **为什么必须重出包**：安装包是 11:56 造的，而 `ca74bd64`／`a624e8c6`／`1da79114` 三处改动都在 exe 的 require 链上（`server.js:235` 静态 require `script-distribution.cjs`），版本号没动 ⇒ 界面与身份门全都显示"一致"（对抗式审查 F-104／问题 #262）。**不重出，你明早测这三条就不算数。**
- **为什么内存闸不装（决策级）**：那条线会在可用内存低于 `max(2048 MB, 总内存 10%)` 时 503 拒绝执行；Owner 10-20 定的是"先测够再决定建不建"（同批 ≥20 稿、末 5 与首 5 中位耗时差 ≤10% 且失败率不升 ⇒ 不建），判据未成立；且明早 Owner 要亲手跑批量，装了闸被拒会被误判成产品坏了。整条 9 文件连补丁带哈希存档于 `总控/在飞存档_20261022_内存保护线/`，装回可逐字节复现。
- **新立问题**：**#267**（批次完成但未结算时排版面板只读且措辞与顶部"已全部完成"打脸，且成功未结算态在界面上找不到任何可点的下一步——退回按钮条件为 `failed && unsettledExecution`）。**#263 未修**（出包门不核 HEAD 是否含进远端全部；今晚靠手工合流补掉）。
- **门禁与证据**：合流后 `npx tsc --noEmit` rc=0（前提＝`npx prisma generate`，否则认不出远端新增两列）、eslint rc=0（36 warning／0 error）、排版全链 75+63+86+214+47+36+45 断言、row-contract／v2-billing／snapshot-quota／billing-rules／user-visible-copy 44／workbench-scope 52／batch-groups／mail-notify／release-consistency 46 全绿；`release:preflight:test` 23:00:02 全门 PASS；打包机自证 `version 3.7.23／assistantBuildId detail-hygiene-20261022-r1／frozenEvidenceContract true`＋四项反破解自检；部署 rc=0，loopback 三次 200，公网与助手隧道取到的 provenance 同一枚。细节见 `交付档案/执行报告/执行报告_20261022_今晚收口_全仓盘点与3.7.23出厂.md`。

## 2026-10-22　产品口径变更：入口存在性只由灰度开关决定，能力位只决定「能不能写回」——不可用＝置灰＋一句话原因，不得整块消失

- **背景**：Owner 2026-10-22 亲判「图六」。同一块排版入口被三道门叠着藏起来（宽度 ≥1280／仅第 1 步／能力位未开），用户既看不到入口、也看不到原因，无法区分"坏了"和"没这功能"。同日 Owner 把口径定死：**功能可以不可用，但不能装作不存在**（ISSUES #265）。
- **决策一（入口存在性单源）**：`typographyEnabled = featureAccess.typographyCustomization`（灰度）。助手能力位 `typographyApplyReady` 只决定"能不能写回"，不再决定"有没有入口"。旧变量 `typographyEntryVisible` 退役，源码与两条 smoke 同批清理，并加"不得复活"断言防两套口径并存。**这是对 2026-10-21 ISSUES #220 的明确反转**（旧令：能力位没开就不露出按钮/悬浮球）。
- **决策二（不可用怎么说）**：三处入口（顶栏 <1024 图标／卡头按钮／≥1024 悬浮球）一律保留 ＋ 置灰（`aria-disabled`、虚线边、琥珀角标）；点开抽屉给"现象 ＋ 一个动作"：一句话原因（含助手版本号）＋「重新检测」＋「下载最新助手」。文案单源 `src/lib/workbench/typography-entry.ts` 的 `describeTypographyEntry`，界面只消费结果，不各自拼说法。
- **决策三（步骤与执行态）**：入口四步常驻；第 4 步执行中（批量执行中，或本次执行已授权未结算）打开＝**只读查看**（顶部一句说明 ＋ `fieldset[disabled]` 冻住所有控件），确保用户不会以为现在改的会进正在执行的这一单。
- **不变量**：不改任何执行／计费／回执判定；只读不改动已保存偏好；<1024 与 ≥1024 两个入口互斥可见（不会同时出现两颗）；能力位缺失只是"当前写不回"，字体清单与偏好照旧可读。
- **验证**：见 TASK_LOG 2026-10-22 22:22 条与 ISSUES #265——vitest 20 passed、`smoke-typography-customization` 75 断言、`smoke-user-visible-copy` 44 断言、wiring/profile/faces rc=0、负控 rc=0、tsc 仅他会话既有错、eslint 0 error。develop `4a5f68ef`（未 push）；真机分宽度实拍 NOT RUN（3000 被 ssh 转发占用）。

## 2026-10-22　技术决策：用户可见的错误正文**不得出现内部标识**——判定放在网页侧单一函数，助手侧的内部事实改走结构化字段

- **背景**：Owner 实拍失败提示把脚本文件名讲给了用户（`TYGF_V15_Thin_Executor.jsx`，ISSUES #264）。病根是"助手回的中文原文直接上屏"：只要助手文案里写了文件名/摘要，界面就照着念。
- **决策一（判定单源在网页）**：新增 `src/lib/workbench/error-messages.ts` 的 `containsInternalOperationDetail` ＋ `resolveUserFacingAssistantMessage`——原文含脚本/程序文件名、十六进制摘要、内部原因码、本机绝对路径，且该原因码已登记用户文案时，整段改用登记文案；**未登记码不改写**（不许凭空编理由），原始码仍进排障位（title／失败报告／支持包）。四个边界（授权、单语执行、代理、批量）各调用一次，原文只进控制台诊断。
- **决策二（助手侧内部事实改为结构化字段）**：`download/local-assistant/script-distribution.cjs` 的四条文案不再插值组件名与 sha，改由 `error.component`／`components`／`cacheSha`／`expectedSha`／`syncError`／`detail` 承载。**排障能力不减**：支持包与日志读字段，用户正文只留"哪一步没成＋做什么"。
- **为什么两侧都要改**：只改助手＝得等下一版助手包（现有 3.7.22 已装用户仍会看到文件名）；只改网页＝任何没登记的码、或将来新写的助手文案仍可能漏。两侧同改后：网页侧立刻生效，助手侧成为源头防线。
- **不变量**：本决策只改"怎么说"，不改任何执行、拒绝、计费或回执判定；`SCRIPT_COMPONENT_STALE`／`SCRIPT_COMPONENT_UNAVAILABLE` 仍 fail-closed。
- **验证**：单测 10 passed（含 Owner 原文逐字用例）、`test:error-message-contract`（新增 (f) 段）、分发模块 A18/A19/A26、`smoke-local-assistant-errors` 四边界源码合同、`smoke-user-visible-copy` 41 断言、`smoke-release-consistency` 46 checks，均实测通过；develop `1da79114`（`a8d07038` 已 amend 并入批量 `data.error` 兜底与 `smoke-batch-error-zh-mapping` (c) 断言）。

## 2026-10-22　技术决策：邮件提醒**不经过站点**——Cloudflare Worker 直推飞书（带 HMAC 签名），站内入口降为可选路径

- **背景**：Owner 要「收到邮件就飞书提醒我，跟收到用户申请那个提醒同一个位置」。原设计是 Worker → 站内 `/api/mail-notifications` → 飞书（好处：站内去重/限流/应用日志）。实测这条路的代价被低估了：生产 `tygf.service` 的 `ExecStart` 实指 `/var/www/tygf-releases/319bc13…`（该提交在 `main` 上），`main` 树里没有该入口；而 `main..origin/develop` = **78 笔**，其中含未进部署脚本批准名单的结构迁移 `20261022120000_quote_billing_scope` ⇒ 要让提醒生效必须先推 78 笔上生产。**为一个邮件提醒承担跨 78 笔的发版风险，判断为不成比例。**
- **决策一（投递方式二选一，互斥）**：Worker 首选**直推飞书**（绑定 `FEISHU_WEBHOOK_URL` ＋ 可选 `FEISHU_WEBHOOK_SECRET`）；只有在**没有**飞书配置、且同时绑了 `SITE_BASE` ＋ `MAIL_HOOK_SECRET` 时才走站内接口。两条路径互斥 ⇒ 同一条邮件路由规则不会发出两条提醒。站内入口与 `src/lib/server/notifications/mail-notify.ts` **保留**：将来站点上了该路由，去掉 `FEISHU_WEBHOOK_URL` 即可切回，同一份文案、同一个通道。
- **决策二（签名不是可选项）**：站上通道 `ADMIN_NOTIFY_WEBHOOK_SECRET` 实测已启用（21 字符）⇒ Worker 必须按同一算法签名（`HMAC-SHA256(key=\`${ts}\n${secret}\`, data=空串) → Base64`），否则飞书拒收。`crypto.subtle` 在 Worker 里是异步的，实现用 Web Crypto 而非 Node `crypto`。
- **决策三（文案只允许有一份事实源）**：Worker 的 `buildMailNotifyText` 与站内 TS 版**必须逐字相同**，由 `scripts/smoke-mail-notify.mjs` 的 [C2] 段断言：两边各导入真实实现、同一输入比对整段文本，改坏任一侧立即变红（门禁 32 → 43 条断言）。这是防止"两个实现慢慢漂开"的唯一可靠手段。
- **决策四（时间与运行时区解耦）**：原 `fmtTime` 用运行时区取时分；服务器是 `Asia/Shanghai` 而 Worker 跑在 UTC 边缘节点 ⇒ 同一条提醒会差 8 小时。统一改为固定 `+08:00` 渲染（两端同口径，可跨机器复现）。
- **验证（真实读数）**：`npm run test:mail-notify` 43 断言 passed；eslint 四文件 rc=0；`tsc --noEmit` 涉及文件 0 错；用**生产真实 webhook ＋ 签名密钥**跑 Worker 同一段代码发样例提醒 → `{"ok":true}`（真消息已进「新的内测申请」同一会话）。
- **边界**：本决策只改投递路径，不改任何用户可见行为、不碰计费/回执/执行合同、不新建数据库表（邮件档案＝邮箱本身，飞书那条是提醒不是台账），因此不触发高风险状态机门禁。

## 2026-10-22　技术决策：单批上限的**数值一个不改**，但"拒绝"必须成为可执行规则——确定性业务错误从此走 409 共享口径

- **背景**：Owner 问"为什么超 1500 积分就故障？不应该给用户设限"。对抗式审查（`交付档案/审查报告/审查报告_20261022_1500上限完全解决_对抗式审查.md`）给出反直觉实测：测试站 112 批按规模分桶，**52 个中止全落在 121 单位以上，而历史最大批次只有 528 单位——从来没有一批撞到 1500**；12 语种批次的成功率只有 24%（`ISSUES #245`）。所以"先放开上限"顺序错误，本轮只把"故障"变成"规则"。
- **决策一（409 共享口径）**：新增 `src/lib/billing/billing-error-copy.ts`，把"单批超上限"从通用 500「批次报价失败，请重试」改成 **409 ＋ 带数值 ＋ 动作建议**，批量与单语两条报价路由共用（此前同一错误 v3 报 500、v2 报 422）。这是执行 2026-08-18 计费方案原文那句"不能默认为 500"。
- **决策二（两个 1500 拆成两份命名事实源）**：计价侧新增 `rules.BATCH_MAX_STANDARD_UNITS`（值仍 1500），与服务端条数侧 `batch-limits.BATCH_MAX_SERVER_ROWS` 明确分离，并用断言禁止在 `batch-limits` 再定义标准单位上限、禁止 `rules.ts` 内出现第二个 `1_500` 字面量。**代价与踩坑**：上限本来该住 `batch-limits.ts`，但实测放不进去——`smoke-billing-rules` 不经 ts loader 直接 import `rules.ts`，一旦 `rules.ts` 引入跨模块相对路径就 `ERR_MODULE_NOT_FOUND`（rc=127，两次复现）⇒ 于是把"`rules.ts` 必须零 import"也写成断言。
- **决策三（报不出价＝不提交）**：界面两个执行入口都加 `unitCapBlocked`（#222 上一笔只降级数字、按钮仍可点的半成品已补）。
- **决策四（不在数据之前放开上限）**：上限该定多少，由阶段二真机实测（250 行 ×3 语／×12 语两档）决定；或长期走"自动切分"。任何改数都是**计费口径**，须 Owner 明令。
- **验证（真实退出码）**：`test:contracts` RC=0（含 `[zh-font] OK 1197 码位全覆盖`、`[en-font] OK`、对外文案守卫、计价预览一致性；该轮在改 `schema.prisma` 注释前跑完）；改注后补跑 `prisma validate`／`smoke-billing-rules`／`test:batch-limits`／`test:batch-row-contract` 各 RC=0；`lint` RC=0。新断言的灵敏度对 HEAD 复跑证明：旧码上 `unitCapBlocked` 命中 0、两路由引用共享口径 false、`rules.ts` 里 `1_500` 字面量 2。**未部署、未上站、未动历史账务。**

## 2026-10-22　技术决策：跨层枚举**不许各写一份**；"扩大回执接受面"不等于"改计费口径"；学习终选码**宁缺毋造**

- **背景**：全项目上帝视角审查（`交付档案/审查报告/审查报告_20261022_全项目上帝视角_对抗式审查.md`）把六条链连起来看，查出两处"每个点都有代码、连起来不通"的结构性断点，本轮按"对抗式审查 → 方案 → 执行 → 运行验证"闭环修掉。
- **决策一（收敛到单一权威源， develop `872f532b`）**：批次回执的验证等级白名单 `execution-batch.ts:2327` 曾自己写了一份四元素集合，而权威阶梯在 `src/lib/trust-chain/attempt-state.ts:15-22`——两份已经漂移：集合里的 `PARTIAL/FAILED` 不是阶梯成员，阶梯里的 `WRITE_CONFIRMED/TEXT_READBACK_VERIFIED/SAVE_SUCCEEDED/DISK_OUTPUT_VERIFIED` 又全被拒，于是助手"部分完成"的真实回执被服务端 400 拒收（实测测试站 37 条语言尝试／811 个指派）。**修法不是"补一个枚举值"，而是消费方一律 import 权威阶梯**；`PARTIAL/FAILED` 作为批次汇总值显式保留并写进注释，避免下一轮被当成冗余删掉。
- **决策二（钱口径与接受面分开讲）**：收费门 `execution-batch.ts:1384-1398` 只认 `REOPEN_VERIFIED` 且带对象证据摘要，其余等级的 `VERIFIED` 行一律降级 `FAILED` 并挂 `EVIDENCE_LEVEL_NOT_TRUSTED`。所以**扩大接受面不会让任何一行变得可计费**，改的是"证据能否落库、批次能否终态"。这条澄清必须写在提交信息里，否则下一个读的人会以为动了计费。
- **决策三（终选码宁缺毋造， develop `0f93b932`）**：原建议"五个采集点都补 `finalCode`"经逐点读码被砍成"只补 `source_binding` 一个点"。其余四点的 `actionCode` 本身就是 `excluded/ignored/accepted`，不存在"系统提案 vs 用户终选"的分歧，填进去只会让聚合产出同义反复的候选规则并喂进管理端队列与 Shadow 评估——那是造数据。新增的 `bindingFinalCode` 只返回决策码（`candidate_rank_N`/`combined_rank_N`/`conflict_rank_N`/`manual_entry`），**不含任何正文**。
- **决策四（不新增对外文案）**：#222 的降级提示复用校内既有的一句「按受理时报价并冻结（此处无预估）」，没有写"请分批/减语种"的新句子——10-22 上午刚踩过中文字体子集门（#166：正确处置是重新生成子集，不是改文案绕过），而这次不值得为一句新文案再重生成 394 KB 资产。**代价**：用户看不到"该拆分批次"这个可执行动作，已作为"部分修"记在 #222，口径等 Owner 定。
- **验证（真实退出码，混合树：同棵树含别手在飞的助手内存保护改动）**：`test:batch-row-contract`／`test:trust-chain`／`test:contracts`（含中英字体子集两门 OK、`smoke-execute-step-reset` PASS）／`test:batch-billing-routes`／`test:batch-billing-v3`／`test:learning-signal-client`／`test:learning-phase0-4`＋`typography` 全部 RC=0；`lint` RC=0（0 error）；`tsc --noEmit` 本两轮文件 0 错（全仓仅剩 4 错，全在别手未跟踪文件）。端到端另用隔离库证明：`finalCode` 全空时 `--apply` 写 0 条候选，补值后同一条 `--apply` 写出 1 条 `personal/candidate`。**未部署、未上站、未动两站数据与历史账务。**
- **仍然没接上的（不在本决策范围）**：停摆批次扫尾无调度（#238）、聚合 `--apply` 无调度且无下游消费方（#239）、学习同意面 92/106 无记录且用户无自助撤回（#239③）、生产 0 笔已付而三个支付开关为 true（#224）、测试站对账 timer 已红 15 天（#236）。

## 2026-10-22　技术决策：**元素边界上的空格**也是产品事实——「粗体粘在前文上」要靠真浏览器门钉，不靠读源码

- **背景**：英文首页两处粗体与前文之间没有空格（`…over to a tool.**It is about…**` ⇒ 「tool.It」；`<div class="try-contact">Email<b>tuyi@tuyigf.com</b></div>` ⇒ 「Emailtuyi@tuyigf.com」）。HTML 结构是**对的**（`<span>…</span><b>…</b>`），缺的是**元素边界上那个空格** ⇒ 读源码看不出来，只有把真实渲染结果拿出来才现形。
- **决策一（判据只判拉丁文）**：中文标签与值之间、中文句号后本来就不加空格 ⇒ 一刀切会把中文侧也判红。判据必须是「紧邻的前一个字符是拉丁字母/拉丁标点时才要求空格」。
- **决策二（门要跨元素往前找）**：粗体前面常常是 `<span>` 而不是文本节点；只看 `previousSibling` 是文本节点会漏掉一半。门里必须写一个「往前跨过元素取紧邻文字」的辅助函数。
- **决策三（页面内测量脚本的注释里不能有反引号）**：本轮在 MEASURE（外层是模板字符串）里写了含反引号的注释 ⇒ 模板提前结束 ⇒ 页面脚本语法错误 ⇒ 门报「重叠 undefinedpx」这种**假象**而不是真问题。⇒ 模板字符串里的注释一律不用反引号，并留注记。
- **验证（对照实验，不是推断）**：对当前已上站站点跑那道真浏览器门 ⇒ **rc=1**，实得 **2 处**（hero ＋ 联系块），两处都点名；修完再上站，同一道门转绿。

## 2026-10-22　技术决策：对抗式审查的输入可以是**线上**——用真浏览器对已上站站点巡检，查出「字体晚发现」并补两道门

- **背景**：前几轮的对抗式审查都审**代码**（v13 审分组口径、v15 审归属与门缺口）。本轮改审**已上站的测试站**（真浏览器 ＋ SSH 隧道绕开 Cloudflare 与令牌门），结果查出一个代码审不出来、也没人审的**真实用户可见缺陷**。
- **发现**：英文站**一个 font preload 都没有** ⇒ 浏览器要等 CSS 下载并解析完才发现 @font-face 才去取字体。实测请求时间线（/en）：document@0ms → stylesheet@1393ms → script@1394ms → **font@3380ms** ⇒ 字体是**最后一个关键资源**，H1（LCP 元素）先以回退字体绘制再换字（可见 FOUT）。中文站对照：预加载了 4 个分片，没有这个问题 ⇒ 两站不对称。
- **决策一（把「预加载」当成一等不变量）**：英文站在 **layout**（不是首页）加 `<link rel="preload" as="font">` —— 因为字体规则是 `html[lang="en"] body`，**全部 /en 页面**都渲染英文正文；这与中文站「只首页预加载」（其余路由不渲染中文正文）不同。
- **决策二（门钉「原因」而不是钉「毫秒」）**：① 真浏览器门（`smoke-en-layout.mjs`，跑已上站站点）加「英文页必须预加载自己的字体」＋「中文页必须预加载 4 个分片」；② 出包门（`build-en-font-subset.mjs --check`，**在 `test:contracts` 链尾**）加结构性断言「声明该字体的 layout 必须预加载它」。**只钉「preload 标签在」这个确定性事实** —— 毫秒数随网络抖，钉毫秒就是假门；「晚发现 2 秒」是**为什么要修**的量化证据，门负责钉**原因**。
- **决策三（生成物过期时，重新生成，不是改文案）**：3.7.21 入库带来新字「搬」⇒ 出包门拦下。另一会话的处置是**把发布说明里的一个字换掉来避开这道门**（提交 `31bed477`）—— 那是反过来的：子集是生成物、文案是产品事实。正确处置是**按已提交状态重新生成**（`478bae42`），并把守卫的失败提示补全为「不要改文案绕过」＋「在已提交状态下生成」（`cad83e4f`）。
- **决策四（巡检里「差点误报」的东西必须查清再写）**：我一度以为「已提交的助手源码 require 了未提交的文件 ⇒ 干净检出下助手加载不了」—— **实测证伪**：`git grep` 搜的是**工作树**（含别人在飞的改动），看**提交版本**（`git show HEAD:…`）就没有那个 require。已提交树是自洽的。这类事只有查清才能写进任何文档。
- **验证（对照实验，不是推断）**：真浏览器门对**当前已上站**站点 ⇒ **rc=1**，`FAIL 桌面1920 英文页必须预加载自己的字体子集（实得 preload []）` ⇒ 门能抓住这个线上缺陷；出包门删掉 preload ⇒ **rc=1**，还原 ⇒ **rc=0**。

## 2026-10-22 中文字体瘦身：全量思源 VF（13.47 MiB）⇒ 按字集分片（4 片 385 KiB）；生成式 CSS 与守卫同批入库

- **移除**：`public/fonts/SourceHanSansSC-VF.woff2`（14,129,688 B）从仓库删除；中文首页预加载改为 4 个分片（`/fonts/shsc/zh-subset-0..3.woff2`，合计 394,372 B）。中文首页字体下载量 **13.47 MiB → 385.1 KiB（缩小 35.8 倍，−97.1%）**，仓库少 13.4 MiB。
- **新增事实一**：中文字体改用 Google 版 Noto Sans SC 的按字集子集（OFL 1.1，自托管）。与原 Adobe 版 Source Han Sans SC VF **视觉不变**，已用浏览器逐像素对照证明：字宽逐字相同（2176 = 2176）、墨量差 0.05%、差异像素仅占墨量 2~4% 且最大通道差 72（抗锯齿级）。字重轴由 250–900 变 100–900，而全站无一处真的用到 250 以下字重 ⇒ 无可见变化。
- **新增事实二**：Google CSS2 的 `text=` 参数**有长度上限**（URL 超约 4.7 KB 被静默忽略并退回整站分片 CSS）⇒ 中文子集必须**分片请求**（本轮 4 片 × ≤420 字）。**且同族 @font-face 的 unicode-range 必须互不重叠**——实测重叠时浏览器只拉宽范围那一份（两种声明顺序均如此）。
- **新增事实三**：`scripts/build-zh-font-subset.mjs`（生成器 + `--check` 守卫，按字体自己的 cmap 核对覆盖率）与其产物 `src/components/site/fonts-zh.generated.css`（@font-face，range 由各片 cmap 唯一归属算出）、`src/config/zhFontPreload.ts`（预加载清单）、`public/fonts/shsc/manifest.json`（sha256 + 码位）。族名仍是 "Tuyigf Source Han Sans"，组件侧零改动；生成 CSS **只由中文首页引入**，英文页不会白拉中文分片 CSS。
- **新增事实四**：`npm run test:zh-font`（覆盖率，已挂进 `test:contracts` 链尾）、`npm run build:zh-font`（重新生成）；`smoke-en-layout.mjs` 的中文站断言改为"不得再拉全量 VF / 必须加载分片 / 合计 ≤1 MiB"。
- **新增事实五**：生僻字（子集外）落系统 CJK 字体（PingFang SC / Microsoft YaHei），**不出豆腐块**但那个字不是思源黑体；文案新增字符由 `test:zh-font` 报红、`build:zh-font` 重生成解决。

## 2026-10-21 英文站字体与版式：新增"思源黑体英文按字集子集"管线与 `.home-v17--en` 作用域（Wave 0）

- **新增事实一**：英文站正文改用思源黑体（Source Han Sans 家族）的**按字集子集** `public/fonts/SourceHanSansSC-EN-VF.woff2`（33,976 B / 231 码位 / wght 100–900），自托管入 git；生成器 `scripts/build-en-font-subset.mjs`（字符集由 7 个英文文案源文件实测推导 + 安全集，
+ 清单含 sha256 与码位表），守卫 `scripts/smoke-en-layout.mjs` 以**字体文件自己的 cmap** 复核覆盖率。
- **新增事实二**：中文站那份 13.47 MiB 全量 VF **不动**；英文站不引它（引它＝每首次访客下 13.5 MB）。英文站新增独立字体族 `Tuyigf Source Han Sans EN`，经 `html[lang="en"] body` 作用于 /en 整棵子树 ⇒ 中文站（`html lang="zh-CN"`）零影响。
- **新增事实三**：英文首页根节点加 `home-v17--en` 作用域，承载英文专属版式参数（标题 `clamp(38px,4.1vw,52px)` / `letter-spacing:-.03em` / 允许换行、分区标题 `clamp(32px,3.3vw,46px)`、按钮可换行、面板头不全大写、卡片加高 + 装饰大字下移、≤560px 撤下导航"中文版"）。全部规则带 `--en` 作用域 ⇒ **中文站一行不改**。
- **新增事实四**：英文 hero 标题被右侧产品卡盖住的根因是 `white-space:nowrap` ＋ 照中文字长定的字号档（重叠 171px@1440 / 278px@1081），不是图片盖字。**任何按元素盒子量的溢出检查在 `nowrap` 下都会失明**（盒子宽仍是栏宽，只有画出来的字越界）⇒ 必须用 `Range.selectNodeContents()` 量真实绘制宽度。
- **新增门禁**：`npm run test:en-layout`（真浏览器 6 视口：标题不被盖、不横向溢出、字体 ≤256 KB 且不引全量 VF、字体族正确、字号区间、中文站仍引全量 VF）；`npm run test:en-font`（字体覆盖率，已挂进 `test:contracts` 链尾）；`npm run build:en-font`（重新生成子集）。
- **未改但已登记**：仓库全量 VF 的字重轴 250–900 与 CSS 声明 100–900 不符（ISSUES #223）；3000 端口 dev server 服务的是 tmp-e2e-v7 而非 develop（ISSUES #224）；英文子集的"源文件清单"是手写的第二份声明，W2 i18n 接缝须收敛（ISSUES #222）。

## 2026-10-21　首页登录态统一：服务端注入会话摘要，导航三态（登录／头像／骨架）＋跨标签同步

- **变化**：① 新增 `src/lib/auth/session-summary.ts`——把当前用户压成可下发的最小摘要 `{state:anonymous|authenticated|blocked,email,emailVerified}`（不下发 `name/billingPrincipalId/sessionId`；blocked 判定与 `/api/auth/me` 的 403 同口径）；`src/app/(zh)/page.tsx` 读 cookie 算摘要并作为 props 下发（首页仍 `force-dynamic`）。② 新增 `src/components/site/auth-session-context.tsx`（会话 Provider，显示层单一真相）：首帧用服务端注入、**挂载时不请求**、网络不可达保留上次已知状态（P-17）、BroadcastChannel＋storage 跨标签同步且只广播事件不带数据。③ 新增 `src/components/site/home-account-menu.tsx`（home-v17 风格，不引 radix/shadcn；Esc/点外部关闭；停用态只留退出登录；登出留原地并提示）。④ `home-view.tsx` 导航三态：未知→34px 骨架、已登录（含 blocked）→头像菜单、未登录→原"登录"链接（位置与文案不变）。⑤ `workbench/user-account-menu.tsx` 改读 Provider，不再自取 `/api/auth/me`。⑥ `auth/login/page.tsx`"已在登录状态"卡默认落 `/#workbench`（尊重显式 `?next=`）。
- **理由**：登录态此前只活在工作台组件里，官网导航是静态渲染——登录后首页仍写"登录"，用户看不出自己已登录；且首屏靠客户端请求才知道登录态，必然先闪一下"登录"。本次按 Owner 令以对抗式审查先行（10 条攻击），并据审查**改掉方案三处**：账号门不接共享状态（授权路径不吃乐观状态）、"登出后留原地"只限首页（工作台内容是敏感面）、驳回给 `SiteHeader` 加账号入口（会造成两个账号入口）。
- **边界**：不动 AccountGate 的鉴权语义与 fail-closed 口径；不做用户自设昵称（L2，Owner 定调暂不做）；不动首页"申请试跑"（L2 未获批）；不动英文站（`/en` 导航无登录入口，审查报告原"同用 nav-login"为误读，已修正）；不改计费/回执/冻结语义。
- **状态**：develop `e65b572`，**未推远端、未部署两站**。验证：`npx tsc --noEmit` rc=0、eslint 8 文件 0 problems、新 smoke `scripts/smoke-home-session-ui.mjs` 39 项 rc=0、`test:identity-account-gate`／`test:identity-logout-device-semantics`／`test:user-profile-privacy` 全 rc=0；**端到端真跑**（本地 dev server＋隔离库＋真登录）未登录/已登录/停用三态全对、备注不外泄、me 形状仍最小集；**真浏览器** console 0 错 0 警、水合告警 0、菜单可开可 Esc 关、头像与 CTA 不重叠。见 `AI_MEMORY/ISSUES.md` #216、`交付档案/执行报告/执行报告_20261021_首页登录态统一_落地.md`。

## 2026-10-21　登录态拆写者：身份接口只回用户自有身份，运营备注走独立通道（#216）

- **变化**：① `GET /api/auth/me` 响应收窄为 `{ok,email,emailVerified,accountStatus}`（原含 `name/betaUserId/sessionId`），并在 §7.4 注释旁写明"`name` 属运营字段不得下发"；② `/api/auth/login` 响应与 `loginUser` **服务层结果**同去 `name`（结构上防复发）；③ 工作台账号菜单显示名改用邮箱本地部分，不再读 `me.name`；设备与会话页不再携带 `name`；④ 运营侧 `update_profile` **不再写 `name`**，带不同姓名回 409 `ADMIN_USER_NAME_READONLY`（不静默忽略），校验改为"联系方式不能为空"；⑤ **新增** `GET|PATCH /api/admin/users/[id]/operator-note`——运营备注（`BetaUser.adminNote`）的独立通道，owner 限定、审计 `user.update_operator_note`、唯一写者；两个后台界面拆成「用户姓名（只读）」＋「运营备注（仅后台可见）」；⑥ 新增两支 smoke（26 项源码契约＋12 项运行时真调路由）并补登 `smoke-admin-security` 的三处清单。
- **理由**：`BetaUser.name` 是"用户自报姓名"与"运营内部备注"两个语义合流在同一格——运营要写备注，是因为所有后台用户资料载荷都过 `assertSafeUserProfile` 隐私守卫、而守卫把 `adminNote` 列为禁键（`user-profile-contract.ts:14`），运营手里没有"备注"这一格可用，只好拿 `name` 顶替，结果内部备注直接出现在用户界面并随接口下发。**本次不动那条守卫，而是给它补一个合规位置。**
- **边界**：不新增用户可见能力（Owner 定调"先只拆写者"），用户昵称与首页登录态（问题 B）均未做；不改用户资料载荷口径（仍不带 `adminNote`）；不碰计费/回执/冻结语义；`BetaUser.name` 的历史脏数据未清（需点名，不可自动区分）。
- **状态**：develop `26e84c4`＋`67032ea`，**未推远端、未部署两站**。验证：`npx tsc --noEmit` rc=0、eslint 10 文件 0 problems、新 smoke 26＋12 项 rc=0、`test:auth` 79/79、`test:identity-account-gate`／`test:identity-logout-device-semantics`／`test:user-profile-privacy`／`test:admin-security` 全 rc=0。见 `AI_MEMORY/ISSUES.md` #216、`交付档案/执行报告/执行报告_20261021_登录态拆写者_运营备注隔离落地.md`。

## 2026-10-21　工作台两档可见性（②范围条 / ③状态带按档切语义 / ⑥主按钮带范围）＋执行前范围确认 D1

- **变化**：① `workbench-view.tsx` 切换器右侧新增常驻范围条（`data-testid="workbench-scope-chip"`）：单稿 `这份稿：<文件名>` / 多稿 `这一批：N 个设计稿 · 已扫描 X · Y 个待扫描`；② 顶部状态带改写成 `batchMode ? 集合语义 : 原样`，多稿给「N 个设计稿 / 已扫描 / 待扫描 / 去扫描（还有 N 个）→ materials」，单稿分支零改动；③ 多稿主按钮改 `开始执行（本批 N 份 · 逐份）`，单稿按钮文案不动（其 N 是语言数）；④ 新增 `execution-scope-dialog.tsx`，单稿与多稿两个执行入口都先弹范围确认（`取消，先不开始` / `确认并开始`），确认前不冻结不写盘，框内明写「开始之后不能撤销 / 没有 PSD 备份」，并以范围指纹（列表 / 语言格数 / 覆盖率放行态）拦 TOCTOU；⑤ 多稿档「N 项待处理」加「本稿 」前缀（该数取自 `batchResult.summary.decisionCount`，是当前稿的）。
- **理由**：切到多稿档后顶部仍显示某一个文件名，用户无法确认自己在哪一档（v12 审查 F1–F11）；Owner 原话「如果是不小心按到的话，没有一个取消的按钮」。写进 PSD 的内容不可逆（`siteContent.ts:423` 只让用户自行备份），所以先做派发前确认，不做「撤销已写入」。
- **边界**：不触碰执行、计费、结算、回执、冻结语义；不改服务端；C1 停止 / C2 取消并退回（需批次级 cancel＋高风险状态机门禁＋合同变更四层同步，现 `api/billing/photoshop/cancel/route.ts:3` 只处理 `reserved`）与 P1 默认密度**未做**。扫描队列仍单 owner（`design-file-card.tsx:742`），状态带只做跳转。
- **状态**：未提交、未推、未部署；tsc rc=0、eslint 0 error、`test:workbench-scope` 44 条断言 rc=0、既有 7 个 smoke 全 rc=0。L2 记录 `changes/active/20261021-workbench-scope-preflight-confirm.md`；交付件 `交付档案/执行方案/执行方案_20261021_批量台v12落地_两档可见性与执行前确认.md`（＋HTML）。

## 2026-10-20　行标识白名单收成单源＋跨层一致性门（事故3 复发的结构性收口）

- **变化**：① 新增 src/lib/workbench/row-identifier.ts 为行标识白名单唯一出处，清单组装（trust-chain/execution-manifest.ts 的 assertExecutionManifest）与 5 个派发入口（local-assistant-client.ts）全部改读它；② 新增发布链内部门 scripts/smoke-row-id-whitelist.mjs——18 条语料要求浏览器判定与本机助手判定逐条一致，并要求两侧正则字面量逐字相同；③ 诊断云端摄取从「一条坏丢整批」改为逐条降级并记 skipped；④ deploy-release.sh 把 support-bundles 列进 Web 单元 ReadWritePaths（排障快照通道自 09-17 起在沙箱内只读、恒 503）。
- **理由**：同类事故两次（09-14、10-20）同因——两侧标准各写各的且无人断言，用户的「记录编号」走到助手才整批被拒，代价是积分冻结、attempt 悬挂、界面取消与完成全 409。行为门加字面门双锁是出包前唯一能拦住漂移的形式；「放宽服务端白名单」被对抗审查驳回。
- **边界**：不改计费、回执、冻结语义（闸位在其之前）；「记录编号」不合形在导入面只提示不拦表，保留「无多行拼接、无排除行仍可跑通」这条既有用户能力（Product Drift Guard 第 2/3 条）。
- **状态**：未提交、未打包、未部署；tsc、lint、行合同门、全量信任链门均 rc=0。见 交付档案/执行方案/执行方案_20261020_行标识白名单跨层闸与排障通道修复.md 与 ISSUES #195/#196/#205。

## 2026-10-20　批量台 v7：译表按设计稿分槽（每稿一表），多稿单语言也走批次链

- **变化**：① `workbench-view.tsx` 把「一个 `parsed`」改成「`parsedTables`：draftKey → 表」，当前稿的表仍是 `parsed`，切稿经 `captureLiveDraft/applyDraftSnapshot` 往返存灌一整套会话现场（语言勾选、编辑、审查确认、决策、忽略/强制/排除、智能检测结果）；单稿模式沿用 `SINGLE_DRAFT_KEY`，单→多时整份过继给第一个稿。② 覆盖率矩阵与执行前闸共用 `calcCoverageMatrixForDraftTables`（每稿只用自己的表，缺表不产格并在界面点名）。③ `execute-step.tsx` 新增 `isMultiDraft` 与 `useBatchChain`：多稿下即使每稿只有 1 个语言也走批次链（1 稿 × 该稿语言 = 1 批），修掉「第一稿跑完编排停死」；批量能力门、积分预估、快照语言集、执行语言集全部按 `useBatchChain` 取。④ 执行编排回调改为每渲染重建的普通函数，避免 `useCallback` 把旧稿现场写进快照。⑤ F10：助手检查报告新增全量 `unmatchedTranslationRowIds` 并透传到浏览器，未命中行排除与一键忽略不再受 50 条展示上限截断。提交 `develop@3d85a2a`（未 push、未部署生产；已部署测试站并核验 BOUND）。
- **理由**：多稿批量此前共用一张译表与一份语言列，第二个稿的对账/执行会拿第一个稿的表——这是「每稿一表」需求的根因；而多稿单语言走单语言链时批次完成回调不触发，编排会在第一稿静默停住。F10 是同一类「展示上限被当成业务上限」：`items` 截断到 50 条，浏览器据此算可执行集，与助手 evidence 的 breakdown 对不上（`BATCH_BILLING_BREAKDOWN_MISMATCH`）。
- **边界**：服务端报价/结算入参未变（仍按浏览器提交的可执行行与助手回执 evidence 结算），不涉计费数学；旧版助手不返回新字段时浏览器自动回落旧投影（不报错）。真实多稿 PS 执行需 Owner 真机验收。

## 2026-10-17　官网文案刀四：一段话＝一个键（`\n` 换行 ＋ `**粗体**` ＋ `{占位符}`）——43 个碎片键并成 16 个，中文页可见文本逐字未变

- **变化**：① 新增语法层 `src/lib/site-copy-markup.ts`（纯函数：`splitBold`/`splitLines`/`hasUnbalancedBold`/`extractPlaceholders`/`COPY_TEMPLATE_PLACEHOLDERS`/`markupViolation`）与渲染层 `src/components/site/rich-text.tsx`（`renderRichText` 段落、`renderRichLines` 标题逐行、`renderTemplate` 占位符代入并把值渲染成 `<b>`；只建 React 节点，**绝不把文案字符串当 HTML 注入**）。② 内容树合并：`siteContent.ts` 与 `siteContentEn.ts` 各把 7 处 `titleL1/titleL2[abc]`、4 处 `leadA/leadB`、`hero.copyA/copyStrong/copyB`、`try.form.successSubA/Join/End` 并成单键（值里 `\n` 表换行、`**…**` 表粗体、`{wechat}`/`{email}` 表动态值），合计 **43 个键 → 16 个**。③ 渲染端 `home-view.tsx` 13 处、`home-view-en.tsx` 13 处改读单键，中文首页 `<wbr/>` 归零。④ 咽喉新增两道校验（`createSiteContentDraft`，与角色枚举同一处，两扇写门共用）：`CONTENT_MARKUP_UNBALANCED`、`CONTENT_PLACEHOLDER_MISSING`。提交 `develop@3316292`（**未 push、未部署**）。
- **理由（含一次自纠的定义错）**：Owner 指截图「这些分得也太散了吧，不能是自行换行然后是一个文本内容吗？」并补「我指的是这个只是例子」。上一轮我只归并标题，是**把问题定义成"标题被切"**；实测真实规律是"一段话被 JSX 节点边界切开"——16 组 43 键，标题只占 7 组。**分类按渲染代码定，不一律合并**：B 类"排版尾巴"（`<span class="nowrap">` 包住的不可断行片段，`home-view.tsx:242/:703`）保留两键，合并等于把排版约束塞进文案语法；C 类"句里嵌动态值"（`successSub` 夹微信号与邮箱）用占位符；A 类真·一段话才并成一个键。
- **顺带修掉一个对外可见缺陷（#178）**：英文页用 `<wbr/>` 拼碎片成行，而 `<wbr/>` **不产生空格**（中文无碍、英文把词焊住）——本地渲染实测 `"every languagefrom scratch"`、`"seewhere to look next"`，`[a-z][A-Z]` 探针命中 3/7 个 h2、实际 7 个全粘连（3 是下界）。合并时显式补回 8 个空格。生产跑旧构建（`curl /en` 的 h1 是旧文案、`h2.section-title` 数 0）⇒ 线上暂未可见。**反向禁令**：不得用 `.phrase{margin-right}` 之类 CSS 糊——中文页会多出空隙，且复制与搜索引擎抓到的仍是粘连词，必须修在文本层。
- **能力边界与守卫**：语法**封顶两样**（`\n`、`**`）加占位符；将来要行内链接／颜色／字号应换富文本层，不往这套语法上叠（Tiptap／PortableText 已在可行性对照中否过：要接管渲染树）。新增 20 条源码/行为钉进 `test:content-studio-v1`（含"双树双渲染端碎片键＝0""渲染器禁 `dangerouslySetInnerHTML=` 与 `__html`""zh 首页 `<wbr/>` 计数 0"），`test:content-studio-draft` 加三态（落单星号拒、丢占位符拒、合法语法原样入库）。**关键一条判据**：合并前后剥标签取可见文本，中文 **3,104 字符逐字相同**、英文**去空格后相同**（差 8 个补回的空格）。`test:seo-consistency` 本地 28 FAIL 判为**环境红**（全是 origin 域名断言，`SEO_TARGET` 缺省本机；换真 origin 后只剩 1 条＋7 条打线上旧构建的 fetch 失败），故该门对本次改动记 NOT RUN。
- **合同影响**：不涉执行清单／digest／授权绑定／计费／回执／行排除四层 ⇒ 不触 `test:batch-row-contract`。改的是内容树键形状与官网渲染层。**部署前置**：#173 的旧键计数面须扩到 `leadA|leadB|copyA|copyB|copyStrong|successSub*`——`sanitizeAgainst` 只遍历模板键，库里存过人改值的旧键会被静默丢弃、回落模板默认，不报错不进审计。

## 2026-10-17　字体排版 W2：面板改按 PostScript 脸名写回，清单解析纯函数化，派发链接通 typographyProfile

- **变化**：新增 <code>src/lib/workbench/typography-faces.ts</code>（清单解析 + 唯一命中才绑脸名 + <code>isUsableFontList</code>）；<code>typography-persistence.ts</code> 的 profile 增 <code>face</code> 键、写入升 v2 且 **v1 旧盘仍可读**、<code>tracking:0</code> 不再被当"没设"；<code>local-assistant-client.ts</code> 在单语 prepare 与批量 batch/execute 各按 attempt 语言带一份 <code>typographyProfile</code>（没设不带）；面板字体项的值改为 PostScript 脸名，未命中时明说"本次不会改字体"。提交 <code>develop@583f683</code>（未推、未部署）。
- **理由（真缺陷）**：A1 端点回对象数组、客户端只收字符串 ⇒ 每项被跳过，面板"读到 0 款"却报成功，两侧门同时绿——因为解析逻辑贴在 fetch 里无法测。PS 22 实测显示名/未知名会被**静默换成 MyriadPro-Regular 且不抛错**，所以写回值必须是脸名，且匹配不唯一时宁可不发。
- **合同影响**：执行清单键集与 digest 零改动（排版值走 <code>execution-envelope.json</code> 兄弟字段，A3 已定）；回执构造不含执行器结果整体展开 ⇒ 不改回执口径，<b>不触四层合同同步纪律</b>。新增 <code>smoke-typography-faces</code>（63 断言，含"面板产出必须被助手 A2 校验器接受"跨层一条）并挂进 <code>test:feature-flag-whitelist</code>；customization 46→50、wiring 同步新形状。负控 <code>nc-w2</code> 六道全红（首跑两道没红，暴露两条"文本存在即通过"的空断言，已改为形状断言）。
- **能力位仍 false**：<code>TYPOGRAPHY_APPLY_READY</code> 翻 true 的前提是出厂执行器 ≥1.2.0 且真机整批验过（配对闸在 smoke 内），属 A6（Owner）。
- **验证**：<code>npm run test:feature-flag-whitelist</code> rc=0（287 项）／<code>npx tsc --noEmit</code> rc=0／eslint 改动文件 0 errors／六道负控 rc=0。未执行项（助手 HTTP 行为级、真机整批）登记 NOT RUN，见 TASK_LOG 同日条目与 ISSUES #167/#168/#177。

## 2026-10-17　文案后台刀二：枚举闸下沉到草稿咽喉 ＋ 行数组结构写回端点（加行/删行/排序/换角色）——断行从「只能改代码」变成「页面上点着改」

- **变化**：① 排版角色白名单从「只挡单键 PATCH」下沉进 `createSiteContentDraft`（`src/lib/server/site-settings.ts:588`），单键 PATCH 与字典整树 POST（`src/app/api/admin/site-content/route.ts:58`）两扇写门从此共用一道咽喉；PATCH 里那条逐键检查保留，只用于回精确键名，不再当安全边界。② 新增 `PATCH /api/admin/site-content/lines`（`src/app/api/admin/site-content/lines/route.ts:38`，146 行）：`{key, lines:[{text, role}], baseRevisionId, baseContentDigest}` 整组替换一个行数组，加行/删行/排序/换角色/改字一次提交；落草稿仍走 `createSiteContentDraft`，digest 乐观锁、draftKey 幂等、审计动作 `site-content.lines.replace`、回滚全部复用，**不新造发布链**。③ 编辑层加行数组弹层（`inline-edit-client.tsx:458` 分派 / `:589` 提交 / `:1030` 角色）：每行一个输入框 + ↑ ↓ 删 + 加一行（封顶 6）+ 角色，角色取值取自服务端 `COPY_LINE_ROLES` 唯一声明处；`measureFit` 逐行量宽，任一行放不下整次不提交。④ 逐行判据沉成纯函数 `normalizeCopyLines`（`site-content-paths.ts:188`）供路由与行为测试共用；新增 `isCopyLineArray:32`、`firstEnumLeafViolation:64`、`readNodeAtPath:164`、`replaceArrayAtPath:221`。提交 `develop@30ca65c`（8 文件 +718/−22，**未 push、未部署**）。
- **理由（含一次自造事故换来的判据形状）**：初版咽喉判据按字段名写（路径末尾 `.role` 即判枚举），隔离库实跑直接红在 `「homeV17.value.cards.0.role」只能取 plain / accent 之一，收到「设计师」`（RC=1）——内容树里 `value.cards[].role` 存的是语义标签，与排版无关。**按名字一刀切会把合法文案写入打死、把整树写门变成永久红门**。现改为**按形状判**：只有数组每项恰好是 `{text, role}` 两格才认作行数组；并加反向钉「出厂内容树本身必须过咽喉」。同族第二处：交回字段与模板不符时选 `CONTENT_LINES_SHAPE_UNSUPPORTED` 拒掉而不是静默补齐——补齐＝「保存成功但原文少了一块」，最难查的一类事故。
- **主动撤下的一段**：方案第四段原拟把 `homeV17.cost` 的 `titleL1/titleL2a/titleL2b` + `<wbr/>` 迁成行数组当「其余 22 处旧碎片键的配方」（计数：`grep -cE "titleL[12][abc]?:|titleLine[12]:" src/config/siteContent.ts`＝22）。执行时撤掉——cost 现用「短语＋软断点」模型，宽屏两短语渲染成一行，硬换行数组会把桌面端两行变三行＝**一次没人下令的外观改动**；且短语级不折行本就在该刀 OUT OF SCOPE。
- **能力边界与守卫**：新增门为既有两道的扩展断言（`test:content-studio-draft` 45 断言、`test:content-studio-v1` 155 断言，本刀 +28 条），加上源码级钉（整树路由不得自带校验、编辑层必须调 `/lines`）。**未跑到的**：owner 会话里的真点击链（本机 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 未设置），所以「后台点一行→加行→发布」这条完整链目前只有模拟台与服务层证据，未记为绿。生产写锁与两站内容一律未触碰。
- **合同影响**：不涉执行清单／digest／授权绑定／计费／回执／行排除四层 ⇒ 不触 `test:batch-row-contract` 同步纪律；改的是内容树形状与 Content Studio 写入口。新登记 `AI_MEMORY/ISSUES.md` **#173**：行数组改形后，库里存过**人改值**的旧碎片键会在部署时被 `sanitizeAgainst`（`:221`/`:243`）丢弃、`deepMerge`（`:257`）回落模板默认，**静默丢改动且不进审计**；模板默认值与旧两句逐字相同（实测 `8bec41e~1:688-689`），故未改过的键安全，改过的必须按 #173 的计数判据在部署前实测。
## 2026-10-17　字体排版定制写回链落地（A2 校验器／A3 信封旁路／A4 执行器应用／W3 面板改读能力位）——排版走旁路，执行清单与四层合同一字未动

- **变化**：新增助手侧白名单校验器 <code>download/local-assistant/typography-profile.js</code>（只放行 <code>face/tracking/leading/autoKerning/fauxBold/fauxItalic</code>，锁死 <code>composer/kind/noBreak/fontSize/width/height</code> 等 15 项，未知键当场拒，全默认归一为 <code>null</code>＝零写入）；<code>server.js</code> 三条执行入口（旧 <code>/v1.5/execute</code>、<code>execute/prepare→run</code>、<code>batch/execute</code>）各加一道 400 闸并把校验值随 attempt 透传；<code>v15-runner.js</code> 把 <code>typography</code> 写成 <code>execution-envelope.json</code> 顶层与 <code>manifest</code> 同级的兄弟字段；<code>TYGF_V15_Thin_Executor.jsx</code> 1.1.0→1.2.0，写完 contents 并核过后按 <code>face→autoKerning→leading→tracking→faux*</code> 应用，逐字段读回并随结果落 <code>typographyIssues</code>（四码：FONT_UNAVAILABLE／FONT_FALLBACK_APPLIED／LEADING_NOT_APPLIED／TYPOGRAPHY_INVALID）。面板与客户端改读助手报的 <code>typographyApplyReady</code>（此前只看"清单读到了"）。提交 <code>develop@2d35bf8</code>／<code>b5ac8ce</code>／<code>e9f639f</code>（未 push、未部署）。
- **理由**：清单键集是**精确校验**的（<code>execution-manifest.js:28</code>），且 <code>computeExecutionManifestDigest</code> 自己先跑这道校验（<code>:181</code>）——实测带排版键的清单连摘要都算不出来，进清单等于改行排除／计费／回执／冻结四层口径并触发合同变更纪律；旁路是唯一不动合同又能把值送到执行器的路。"按语言一份 profile"在执行侧无法解析（语种只在 <code>manifest.locale</code> 与各 attempt），故改为**每 attempt 一份已定语言的 profile**。
- **能力位仍为 false**：配对闸写进 <code>smoke-typography-wiring</code>——翻 <code>TYPOGRAPHY_APPLY_READY=true</code> 的前提是出厂执行器 ≥1.2.0 **且**真机整批验过；本轮只到合成单层（真机整批属 A6，需 Owner 给钟点）。
- **合同影响与守卫**：执行合同（清单/digest/授权绑定）零变化 ⇒ 不触 <code>test:batch-row-contract</code> 四层同步；新增 <code>smoke-typography-profile</code>（86）与 <code>smoke-typography-wiring</code>（42）两道门，并把此前**从未挂进门禁**的 <code>smoke-fonts-catalog</code> 一并入 <code>test:feature-flag-whitelist</code>。负控共 16 道（A2 5／A3 5／A4 6／A1 复跑 2＋CRLF 不变性控制），全部"改→跑→还原→核哈希"同命令内完成。
- **真机证据（本机 PS 22.0.0，DoJavaScriptFile＝生产同通道）**：合法档读回全等零 issue；显示名 <code>Arial</code> 与不存在脸名均被 PS 静默替换为 <code>MyriadPro-Regular</code> 并正确报 <code>FONT_FALLBACK_APPLIED</code>；未设排版零写入；非法行距档当场拒。这一跑抓到写回侧两处假绿（脸名读回误用 <code>item.font.name</code>；行距用 <code>String()</code> 得 <code>"30 pt"</code> ⇒ <code>Number()</code> 为 NaN、比较恒 false），已修并各配负控。另证实 PS 22 无原生 JSON，结果序列化依赖助手 wrapper 注入的 polyfill，新增数组字段已用该 polyfill 真机往返比对同形。
- **验证**：<code>npx tsc --noEmit</code> rc=0／<code>npx eslint</code> 改动文件 rc=0（0 error，5 既有 a11y warning）／排版四门与 <code>smoke-thin-executor</code>、<code>smoke-v15-runner</code> 全 rc=0。未执行的项目（助手 HTTP 行为级实跑、真机整批）已如实登记为 NOT RUN，见 ISSUES #157/#158/#167/#168 与 TASK_LOG 同日条目。

## 2026-10-17　官网首屏大标题断行从 JSX 搬进内容树（行数组 + 排版角色白名单）——文案后台第一次能自己决定断行

- **变化**：<code>homeV17.hero.titleLine1/titleLine2</code> 两个碎片键 → <code>homeV17.hero.titleLines: [{text, role}]</code>（zh/en 两棵树同形）；新增服务端唯一角色白名单 <code>COPY_LINE_ROLES</code>（<code>plain / accent</code>），<code>draft</code> PATCH 对任何 <code>*.role</code> 叶子校验，越界回 <code>CONTENT_ENUM_VALUE_INVALID</code>；编辑层新增 <code>measureFit()</code> 溢出量测，宿主 <code>nowrap</code> 时拦保存。提交 <code>develop@b89c4ea</code>（未 push、未部署）。
- **理由**：断点原先写死在 JSX（<code>&lt;wbr/&gt;</code> + <code>display:block</code> span + <code>white-space:nowrap</code>），运营改长一句就裁字——线上实测 7 字→11 字溢出 202px 且零预警。曾考虑交给 <code>text-wrap:balance</code>（项目已用 13 处），但线上实测 balance 会把「一直」「少做」从词中间切断（Range 逐字定位 4 例劣化）⇒ 中文断点必须作者显式给。
- **合同影响与守卫**：内容树形状变化 ⇒ <code>smoke-content-studio-v1</code> 追加 22 条断言钉住（含「源码不得再现 titleLine1」负控）。不触计费／回执／行排除四层合同。风险登记：DB 内旧 override 若含 <code>titleLine1/2</code> 会被 <code>sanitizeAgainst</code> 丢弃并回落到模板默认值（测试站 Revision 1 需复验；生产未动）。
- **验证**：tsc rc=0／lint 0 errors／两道 Content Studio 冒烟 PASS／本地 dev 真渲染取证通过（详见 TASK_LOG 同日条目与执行报告）。
## 2026-10-17　覆盖率执行前闸双端落地（#140-A 模拟工作台 / #140-B 产品批量台）——批量执行 <95% 必须显式放行

- **变化**：①产品批量台（`#batch` 视图）执行前新增覆盖率闸——任一矩阵格 <95% 时启动按钮在勾选「显式放行」前禁用；矩阵逐格计算抽为共享纯函数 `calcCoverageMatrix`（矩阵组件与闸同源口径，杜绝两套真值）；放行确认随 PSD 集合/低于阈值清单变化失效重置；放行记入本批执行摘要（运行中提示＋完成摘要）；视图侧防御层不静默开跑。②模拟工作台 `/api/run` 同构：409 拦截＋`gate-log.jsonl` 留痕＋放行落 `exp.coverageGate`；顺带修复其 UI `scan/run/fixture` 的 GET 调 POST-only 路由缺陷（按钮此前不通）。③引擎内 warning 语义**不动**（本闸为执行前闸）。L2 登记 `changes/active/20261017-coverage-gate.md`。
- **理由**：ISSUES #140/#153（12×12 前第 1 道闸）——v2.9 引擎对未命中只记 warning、94.12%<95% 静默完成，接产品链路即「不得静默降级」红线入口。随批量台收口提交 `ee05c9a` 部署测试站（2026-10-17 15:20:47，备份 deploy-20261017_152047-ee05c9ae6465）。
- **验证**：tsc 0；lint 0 errors；smoke 8 项全绿（batch-workbench-logic 58→65 checks，含新增闸口径 7 断言）；模拟工作台活体 409 实测（真实数据 94.12%）＋纯函数单测 5/5；部署后 `/api/runtime-provenance` BOUND `ee05c9ae64651db812bc5978b4c20ccdd5c0157f`。待 Owner：真助手复跑（点扫描 8 秒）与 12×N 触闸实测。

## 2026-10-16　PhotoCraft 集成 v2 B1 灰度白名单接入（pcExecutorBetaUsers，默认关闭未部署）

- **变化**：v1.5 worktree `server.js` 新增 `pcExecutorBetaUsers` 白名单（install_id 数组，默认空＝谁都不开）；本地执行与云批次两条分派路径均加白名单校验；两层开关需同时满足，PC 免 PS 通道才接管。
- **理由**：补齐 F-4 灰度缺口，与 P0′ 先例同构，为测试站部署把灰度闸备齐；默认行为零变化，未部署未碰两站（代码已推 `49c8230`）。

## 2026-10-16　投影前对账闸上线（P0）：手改机器列不再被静默覆盖；投影执行段「静默部分失败」缺陷同步修复

- **变化**：`scripts/sync-task-ledger.mjs` 投影前逐格三值对账（台账 L／飞书现值 F／上次投影快照 P＝`tmp/readback/last-projected.ndjson`）——全等行跳过不发写命令（幂等二跑 update=0）；`L≠F 且 F=P` 正常待投影放行；`L≠F 且 L=P`＝人手改，整行拦下点名；两边都动＝冲突拦下；无快照＝保守拦下；`--force` 为显式强推口子。`scripts/sync-task-ledger.sh` 快照仅在执行全成功时提升（pending→final），`[fail]>0` 不提升且 exit 1，`held>0` 通报 exit 1（调用方 `|| true` 不阻塞）。计划命令新增 `[ok]/[fail]` 标记，同时**修复原执行段静默部分失败**（原先数的是计划行数、只看最后一条退出码）。新增夹具 `scripts/test-sync-reconcile.sh`（29 断言）。
- **理由**：协议 v1 的最后缺口——手改机器列若先遇投影会被静默覆盖（窗口 ≤24h）；顺带修掉让「覆盖成功/失败」不可见的既有缺陷。
- **验证**：夹具 29/29；真表播种+空跑+复跑（stateFound=true、update=0）；`control-plane.sh` 复跑双段全绿。语义全案见 `交付档案/执行方案/执行方案_20261015_中台收口_投影前对账闸与支线残料终清.md`；纪律已入 `AGENTS.md` 第 6 条。

## 2026-10-15　PhotoCraft 集成 v2 本地执行：免 PS 兜底执行器落地（默认关闭，未推未部署）

- **变化**：v1.5 worktree 新增 `download/local-assistant/pc-executor.js`（走 PhotoCraft CLI serve 行协议，执行/重开两相位；回执合同 `executor-result.json`/`reopen-result.json` 与既有 JSX 孪生语义逐字对齐）；`server.js` 无 PS 环境兜底（本地握手失败且有 PC 时切 `'pc'` 模式、云批次同构、组件检查放行下限、错误映射两码）；开关 `pcExecutorEnabled` 默认 **false**（物理断路=默认行为零变化）；`package.json` 加 `test:pc-executor` 并挂 `test:trust-chain` 尾。
- **理由**：Owner 令按 v2 重修方案本地执行（十闸对抗审查闭环）；无 PS 用户保底=选项 C 方向 Phase 1；B 组（灰度白名单接入+部署闸）留待 Owner 裁定。
- **验证**：Phase 0 四钉 spike 全绿；冒烟 12/12 EXIT=0；trust-chain 逐脚本 22/22 全绿（#145 已修复：本机 `prisma db push` 约 165s，环境级 SQLite I/O 慢，与改动零交集）；真机 E2E（真 exe+夹具 PSD）exec→reopen 两产物读回一致含中文；`node --check` 双过。未推、未部署、未碰两站。

## 2026-10-14　O1 生产链全链执行：对账合并 + #149 前置修复 + 预检全绿 + 打包部署 + IndexNow + 真站复验 ✅

- **变化**：Owner 批准「O1 全链执行（推荐）」后，完成 develop→main 对账合并（21 笔、a593f1b）、#149 前置小 PR（eb855ff，deploy-release.sh 6 处 sqlite3 加 timeout + 三处守卫同步）、detached 临时树预检 14 门全绿、打包 `tygf-production-eb855fff8e16.zip` (40.8 MB, SHA-256 9F3FC4B8...)、scp+sudo 生产部署（tygf-server, 43.134.175.26）、IndexNow 推送 6 URL（HTTP 202）、真站 SEO smoke 复验（1 FAIL/0 F/3 SKIP，唯一 FAIL = 预期 #130 族 DB 内容漂移，无新回归）、GSC sitemap 6 条已收录、tygf-smart-review 重启、tygf-smart-review 手动重启（不在 rebuild 清单）。本地 main 领先 origin/main 1（对账合并 + #149 fix），推送待单独授权。3 个他人 WIP 文件零接触。
- **关键技术点**：
  - #149 兑现 Owner 10-13 定「下次生产部署之前」：deploy/deploy-release.sh 6 处裸 sqlite3 全加 `-cmd '.timeout 20000'`（T-0166 探针实证：带 timeout 0/300 失败、裸调用 4/300 失败，journal_mode=delete 活库 worker 2s/30s 轮询）；check-partial-index-guard.mjs 标记不钉值 + timeout 在场断言（preflight 门内锁死）；check-repo-policy.cjs requireMatch（正则接受任意毫秒值）。
  - 对账合并：AI_MEMORY 三账冲突按双侧条目并集解决，ISSUES #149/#150/#151 与 TASK_LOG T-0166 撞号双条保留并就地注记、不重编号。
  - 预检全门：acceptance-record (3.7.15 真机验收记录在库)、release-identity、batch-row-contract、test:contracts、test:v3-batch-flow、test:trust-chain、5×assistant、partial-index-guard、fold-no-report-loss、content-studio-v1、content-studio-draft 全 PASS。
  - 脱离脏树打包：临时 detached worktree `pkg-eb855fff8e16` + junction node_modules，规避 3 个既有 WIP 文件的 clean 门。
- **真站复验**：SEO smoke（`SEO_TARGET=https://tuyigf.com/`）assertion failures=1 / fetch failures=0 / skip=3（网络超时）。唯一 FAIL = `FAQ discloses layer-text and translation handling`（预期的 #130 族 DB 内容漂移，DB 未触碰）。余 robots/AI 爬虫组、sitemap 6 条、hreflang 双语互指、og:url、canonical、JSON-LD、FAQ 可见性、EN FAQ 披露层文字/译文/OCR、CJK 余量、llms.txt 全 PASS。无新回归。
- **IndexNow / sitemap**：6 URL 推送 ACCEPTED (HTTP 202)。GSC sitemap 6 条已在库（上次读取 2026/10/6），Bing sitemap 受阻（MS 登录 AUTHENTICATION_REQUIRED、公网探针 CAPTCHA）待 Owner 自浏览器提交/记录。
- **遗留/风险**：支付 flag/历史账务/nginx/测试站未动；本地 main 推送待授权；#132 解绑按钮修复未部署；#130 族 DB 内容漂移待 Owner 授权清洗；#134 测试站 nginx 白名单需 Owner 授权脱敏审计；本地 main 领先 origin/main 1（推送需授权）。
- **红线遵守**：零 reset/checkout/clean/force push；WIP 文件零接触；密钥零打印；无 `--accept-data-loss`；工作树脏文件仅既有 3 处。

# CHANGELOG.md — 重要变化记录（架构/功能/技术决策，新条目置顶）

> 最后更新：2026-10-14
> 只记重要的：架构变化、功能变化、技术决策（附理由）。修复细节见 TASK_LOG。

## 2026-10-14　飞书通知通道唯一化：执行方案通知/文件只走 Owner 新指定机器人，旧通道停用
- **变化**：根 `AGENTS.md:52` 工作规则由「交付报告自动发飞书群」改写为「执行方案通知与文件一律发飞书」——今后一切执行方案通知、方案/报告文件只走 Owner 2026-10-14 指定的那一个飞书机器人通道，旧通道（旧 webhook、旧群入口）禁发；本机 Windows User 级 `FEISHU_BOT_WEBHOOK` 已切换为新通道（回读比对通过）。详录见 `AI_MEMORY/TASK_LOG.md:1`。
- **理由**：Owner 2026-10-14 令「通知全部对话…以后全部执行方案通知和文件都要走这个通道…之前的通道不用发了」；通道唯一化防多入口漏发。webhook 按既有密钥纪律只存环境变量，不进文档、不进提交。

## 2026-10-13　推翻 AR-18/AR-47：英文站 SEO/GEO 立项施工
- **变化**：SEO v2 对抗审查曾两笔在案驳回英文站方向（AR-18「不做独立英文站」、AR-47 相关，见 `worktrees/develop/docs/records/20261010_SEO_GEO_v2_对抗审查100轮与调整方案.md:74,112`）；Owner 2026-10-13 推翻并批「可以按你的来」＝批准实施方案全部推荐决策点（`/en` 前缀同站、x-default→中文根、P1=营销两页、llms.txt 单文件双语、英文内容 git 单源不经 DB、条款/隐私英页不建页等）。施工基线 `worktrees/develop` `b9d6903`，立项件 `changes/active/20261013-english-seo-geo.md`；`docs/records/` 存档不动。
- **理由**：准备推英文市场；中文 SEO/GEO 收官后英文面为零（9 项摸底全 0 命中）。Owner 决策优先于旧驳回记录。
- **安全边界**：不改中文可见文案与行为；不动 `src/app/api/**`、支付、工作台；条款/隐私英页等定稿；不 commit（未获明示）。

## 2026-08-30　助手安装绑定、3.6.17 发布身份、失败报告与结算合同收口
- **变化**：
  - legacy redeem 对缺少 activation 的授权码 fail-closed；只允许当前 origin 的一次安全配对、读回和授权重试，保留服务端 activation-bound 安全门。
  - 助手身份不可变升至 3.6.17，统一 server、renderer、schema、manifest、installer 与 download 发布声明，并加入发布一致性门禁。
  - 失败语言进入同一份中文聚合 HTML，报告只列真实输出；可信失败通过现有幂等 finish 释放，回执未知时保持冻结，到期 sweep 只收尾一次。
- **理由**：旧 redeem 能签发空 `inviteActivationId` token，必然触发 `ASSISTANT_INSTALL_BINDING_INVALID`；组件身份漂移会让安装包与站点合同不一致；失败报告曾把未发布语言呈现为正常/虚假文件，容易误判账务和交付状态。
- **安全边界**：不放宽授权校验、不重放 Photoshop、不直接写积分、不回溯历史批次；本轮只准备测试站发布，生产站、`main`、支付 flag 不动。
- **实施**：`03df623`、`6e3e495`、`1b2b6fe`、`0623e62`、`c631ee5`、`4f291b1`、`9a3c2e3`；develop 候选 `26cc58b` 已推送并部署测试站。安装包 SHA-256=`469862102A364ABC2CFBBABC93B7E0F0553D4A3D2FF6D08FDAA91A2F8148D59E`，大小 12637266 bytes；测试归档 SHA-256=`2D9C79CABE1A333D05D112ED47D705BD6C8CD71CAAAEEDCAA479EACD84EDDF65`。

## 2026-08-29　组合绑定等价裁决 + 智能检测分批化（重复区块场景根治）
- **变化**：
  - 绑定语义【合同变更】：组合匹配的多个候选拼接写入结果完全一致时自动绑定（等价副本避让已占用行），不再误判 `V15_COMBINED_AMBIGUOUS`；真歧义语义收窄为"写入结果真不确定"（唯一副本争夺、译义不同仍阻断）。
  - 半互换原子性过滤器：目标在表内出现 ≥2 次视为共享资源豁免检查；目标唯一仍拦截。
  - 智能检测从"整包一次调用 120s"改为 40 行/批、单批 60s、重试 1 次，部分批次失败返回部分结果；超时错误中文化。
  - 提示词候选带出现次数（旧 Set 去重恰好抹掉了重复区块这一最强错位证据）；新增孤儿译文锚定的分段错位确定性检测。
- **理由**：判据从"数据无重复"修正为"写入结果唯一确定"（与单行层 canonicalizeTranslations 同一原则）。实测 JP-5294 重复区块 CSV：112 行整包调用必超时零输出；等价冗余被误判死胡同；有效错位修正被半互换过滤器按排他语义误杀（"越改越出错"机制）。
- **安全边界**：不自动应用任何建议；同源多译禁止自动裁决（MULTI_TARGET 事实）；真歧义用例（smoke :479）保持拦截。已登记 HANDOFF 偏差表待追认。
- **实施**：`3d5f137..0c569c7` 五 commit，每阶段 tsc/lint/trust-chain 全绿；未部署测试站。

## 2026-08-29　Photoshop 执行改为进度驱动心跳，悬挂 attempt 禁止重入
- **变化**：JSX 写入打开、逐对象、保存、预览和重开验证阶段；助手按进度续约 heartbeat，浏览器区分断联/状态丢失/PS 无进度；恢复草稿仍有 active attempt 时禁止重新报价、冻结和执行。
- **理由**：固定计时无法证明 Photoshop 真实前进；浏览器吞掉状态错误后把未知状态当失败，现场扩散为 6 个独立悬挂批次。
- **安全边界**：状态未知不等于失败；不得自动重跑、删除批次或回溯改账。现有批次必须先检查 journal/产物/回执。
- **发布身份**：助手 3.6.16 / `v15-ps-heartbeat-recovery-20260829`，本地安装包已构建但未部署。

## 2026-08-26　批次完成率一致性方案（P0-P4）
- **变化**：
  - 新建 `batch-executable-rows.ts` 纯函数投影模块，统一「可计费行」与「可执行行」的集合定义，消除浏览器/助手/server 三层 filter 不一致。
  - Attempt 创建时冻结 `expectedRowTokensJson`（预期 token 集）；finish 时对冻结 attempt 的缺口合成 `FAILED(RECEIPT_NOT_RECEIVED)` 终态（不改变计费数学），冻结语言仍有缺项时拒绝静默 SETTLED。
  - 浏览器端完整接线 expectedRowTokens：execute-step → v3-flow → client → route → lib。
  - 双指标展示：积分明细 ledger 新增交付完成率/计划数/实交数；credits-badge 展示「交付 X/Y · 核销率 Z%」。
  - HTML 报告新增守恒摘要 section（冻结预期行/收到行/缺口对照）和排除行 section（未计入计费的行明细）；新增 `RECEIPT_NOT_RECEIVED` ISSUE_LABEL + `REASON_LABELS` 中文映射。
- **理由**：3 层集合漂移导致 12 个幽灵单位 → 报告显示 22/22 但积分显示 92%；finish 扁平结构 vs 客户端嵌套期望 → 结算显示为 0。
- **安全边界**：整语言未执行（按语言计费的合法部分执行）按 0 单位结算放行；旧数据（无冻结 attempt）按原语义放行；合成终态只补状态不改 verified 数学。P5（历史批次无扣费重建 + 文档）待实施。

## 2026-08-26　批次 HTML 改用 batchId 聚合语言结果
- **变化**：批次每个 language job 继续独立执行和回执，但报告缓存统一使用共享 `reportGroupId=batchId`；报告重建从本地回执读取同一键。
- **理由**：原实现按 `languageJobId` 分散保存数据，却让所有语言覆盖同一个 HTML，最终只保留最后完成语言。
- **安全边界**：只重建 HTML，不重跑 Photoshop、不触发计费；修复提交 `d50c7a8`，ISSUES #23 已关闭。

## 2026-08-26　批次 v3 按语言计费
- **变化**：新批次按 `Σ(语言 × INCLUDED 行单位)` 报价；每语言每行按 `ceil(max(原文字符, 该语言译文字符)/200)` 计算。服务端、助手 evidence、语言 attempt、回执与结算共享同一语言单位快照。
- **理由**：旧“按源对象一次”使多语言与单语言近似同价，不符合用户确认的 B 方案；仅在 UI 乘语言数会破坏部分成功结算。
- **兼容与安全**：`pricingVersion` 隔离新旧口径；历史批次不重算。ISSUES #23 聚合报告未包含在该提交。

## 2026-08-26　多文件导入建立多数结构合同
- **变化**：三个以上语言表共同导入且存在严格多数原文结构时，多数结构成为本次合并合同；偏离文件在合并前 fail-closed，不再把额外重复/错位行传播到所有语言。智能检测增加明确完成态和缺译文边界说明。
- **理由**：单个 50 行错位 ES 表曾作为首表基准污染其余六个 24 行语言表；警告式追加不足以保护跨语言数据一致性。
- **安全影响**：不自动删行、不猜测译文、不改原文件；两个文件或没有严格多数时保留既有兼容合并行为。批量执行闸门不变。

## 2026-08-26　执行报告分离用户展示与内部证据
- **变化**：HTML 用户报告不再展示助手构建、报告合同、渲染器、执行器版本或英文验证码；用户可见状态、语言名、文件类型与问题说明统一中文。机器回执继续保留原始内部证据供结算和排错。
- **理由**：内部合同值对普通用户没有交付价值，且与“中文执行报告”的产品预期冲突；删除展示不能删除收费与可信验证所需的底层证据。
- **安全影响**：只改变展示层，不改变 receipt、验证级别、计费门或 `BATCH_EXECUTION_READY=false`。

## 2026-08-26　第 4 步名称输入合一
- **变化**：输出文件基础名与积分项目名称改为同一输入来源；界面从两个输入缩减为一个“项目与文件名称”。
- **理由**：两个字段对用户语义重复，容易误以为必须维护两套名称。
- **兼容行为**：积分明细保留用户输入原文，文件名使用 Windows 安全规范化结果；空值回退 PSD 文件名，语言缩写与保存位置不变。

## 2026-08-25　V1.5 中文执行报告与助手身份合同收口
- **变化**：V1.5 新任务统一生成 `图译工坊执行报告.html`；报告渲染、回执、运行时状态和 Web 客户端统一透传报告名及 assistant build/schema/renderer 三项身份；单语言与多语言直连执行均在请求前做合同预检；旧回执重建保留旧文件名兼容。
- **理由**：现场出现“版本号相同但进程仍加载旧报告模块”的假绿，导致译文列为空、报告结构退化，不能拿单语言成功解锁批量。身份合同将运行代码与源码版本绑定，报告则只展示真实证据，缺失数据不伪造结论。
- **安全影响**：`BATCH_EXECUTION_READY=false` 继续 fail-closed；当前 49155 激活状态为 `required`，真实 Photoshop 回归与 7 语言跨层 E2E 未完成前不开放批量。

## 2026-08-25　v1.5 第 4 步与正式 HTML 报告恢复（本地交付链路）
- **变化**：恢复 v1.5 第 4 步的正式确认信息结构；统一输出文件名为 `源文件名__语言缩写`；新增单一正式信息架构的 HTML 报告渲染器；将报告状态从 Photoshop 执行状态中拆出，并增加只重建报告的 direct/proxy 路由。
- **理由**：临时 V1.5 执行改造逐步侵入产品 UI，造成“连跑”、隐藏文件名和简化报告；需要恢复用户熟悉的确认结构，同时保留批次 v3 的计费安全与 V1.5 的回读证据。
- **安全影响**：`BATCH_EXECUTION_READY=false` 继续 fail-closed；报告失败不得伪装成完整成功，也不得通过旧逐语言路径静默降级或重复冻结积分。真实 Photoshop P6 未通过前不开放批量入口。

## 2026-08-24 22:45　生产站恢复 systemd 监督（运维架构修复）
- **变化**：在生产 VPS 恢复并启用 `/etc/systemd/system/tygf.service`，以 `/var/www/tygf/.next/standalone/server.js`、端口 3000、现有 `ubuntu` 用户运行；清理两个已确认的旧 Next 孤儿进程。
- **理由**：原生产 unit 缺失，Nginx 仍反代 3000，但旧进程无响应；测试 previous 进程同时占用约 98% CPU，导致资源紧张和公网回源超时。
- **影响**：`tuyigf.com` 本机应用、Nginx 和公网首页均恢复 200；服务具备开机启动和失败重启能力。部署脚本/实际服务器用户的一致性仍需后续核对。

## 2026-08-24　本地引擎 v3.6.9：验票超时缩短 + 报错原因可见化（缺陷根治，已入库待部署）
- **变化**：server.js VERSION 3.6.8→3.6.9；`verifyTicket` 回云验票 60s→10s；select-file/select-folder 操作不匹配、preparation scan 鉴权失败、scan status/cancel NOT_FOUND 全部补中文 message；前端 `local-assistant-client.ts` 直连请求分档超时（普通 API 15s/文件对话框 330s）；重建安装包并刷新发布标识五件套（0c7862f 入库）
- **理由**：测试站「无法打开文件选择框/扫描失败」实锤根因三连——引擎回云验票间歇超时(60s，assistant-events.log 六次实证) × 老引擎 403 无 message 字段（真因被前端兜底文案吞掉）× 版本冻结致升级通道失效；只修代码不发版等于没修，故同步 bump 版本重建安装包
- **影响**：测试站部署新版后，老引擎用户将收到升级提示（通道恢复）；验票网络抖动从最长 60s 转圈变为 10s 明确报错；文件对话框不受短超时误杀

## 2026-08-24　对外条款口径定稿方向 + 入门积分 888（产品决策）
- **变化**：①《用户协议》v0.3.8《隐私政策》v0.3.6 多轮修订：移除全部"翻译服务"表述（定位=替换执行工具）、智能学习单句化且如实披露字体名 TopN 计数、第三方不列具体名单、免责声明扩写 6 类场景、删除代码没有的能力承诺（内容过滤）；②内测入门赠送 100+700=800 → 100+788=888（credits.ts:36-38，守恒上限同步 800→888 否则 topUp 截断）；③工作台 UI"翻译范围/翻译表"统一"替换范围/译文表"（4 处文案+5 注释；csv.ts 识别词与 AI 防翻译提示词刻意保留）
- **理由**：条款与代码实际行为逐条一致是对外合规底线；产品不做翻译，界面/SEO/调研页口径必须与协议及首页 FAQ 一致；用户指定赠送额度
- **影响**：新注册用户入门积分变 888；老用户补齐上限随守恒值升至 888（800 存量用户会幂等补 88）

## 2026-08-24　记忆系统建立
- **变化**：新建 `AI_MEMORY/` 五文件 + 更新根 `AGENTS.md`（会话记忆纪律）
- **理由**：多窗口 AI 协作需要零上下文接手能力；此前状态散落在 HANDOFF/worklog/records 多处

## 2026-08-24　跨窗口 AI 协作协议落地（架构变化）
- **变化**：`docs/HANDOFF.md` 接力入口 + `docs/plans/` 方案目录 + `docs/records/` 执行记录目录；"先方案后动手、收工写记录"成为纪律
- **理由**：多个 AI 窗口并行工作曾互相覆盖工作树（0c7862f 代提交 12 文件即为实例），需要制度化交接

## 2026-08-24　BATCH_EXECUTION_READY 翻 true（功能/决策，⚠️ 待用户追认）
- **变化**：`src/components/workbench/execute-step.tsx:85` 硬闸 false→true；featureFlags.batchBillingV3Enabled 默认开（featureFlags.ts:20）
- **理由**：C3/B1+B2 贯通证据 + v3 smoke 全绿（e7f0fcb/c742afd）
- **风险**：违反收口方案 v2 红线"BATCH_EXECUTION_READY 保持 false"；未追认可 `git revert 19452fc`（独立提交无耦合）

## 2026-08-24　分支首次推送远端（工程决策）
- **变化**：`codex/v1.5-trust-chain` 首次 `git push -u origin`（此前全部成果只在单机）
- **理由**：消除单机风险，发布链路阶段一完成

## 2026-08-23　收口方案 v2 取代 v1 —— 主线切换（决策）
- **变化**：主线从 C3（助手批量协议）改为**支付生产上线收口**；C3 降级为数据驱动立项（P2，默认不立项）
- **理由**：c742afd 逐语言连续执行已诚实解锁多语言体验（无静默降级），C3 从"守恒必需"变为"计费优化项"

## 2026-08-23　支付退款能力落地（功能）
- **变化**：订单关闭/全额退款/退款查询（Owner-only，审计 + 幂等撤销）；`PaymentRefund` 模型；6 个支付 flag 代码默认全 false（featureFlags.ts:24-33）+ 服务端 409 拦截补漏
- **理由**：支付上线前的资金安全与差错处理（runbook S1/S4 互补）

## 2026-08-23　发布安全态（架构约束）
- **变化**：内测宣传版要求支付相关 6 flag 在代码默认 + DB 覆盖均 false
- **理由**：内测宣传版解耦支付，避免未验收支付能力暴露给用户

## 2026-08-18　整批计费 v3（功能/架构）
- **变化**：ExecutionBatch/BatchSettlement/BillingQuote 等模型 + 整批唯一报价 + 行级比例结算；批量执行组合闸（运营台开关 × 代码硬闸，execute-step.tsx:221-223）
- **理由**：批量多语言任务计费结算正确性；纵深防御

## 2026-08-17~18　排版学习系统（功能，用户拍板）
- **变化**：隐性采集"每个可见文字图层的排版特征"直传云端（本地零落盘、不含正文），无 consent 默认允许，仅管理端可禁用；L1 质量门 + 用户排版指纹 v2
- **理由**：worklog Task 9 决策——移除用户端"学习"入口改为隐形采集

## 2026-08-15~16　v1.5 信任链引擎（架构）
- **变化**：readiness → attempt → ticket → execute 全链；执行清单/日志/工作副本恢复机制；交付三件套（psd/jpg/report.html）；receipt 隐私化
- **理由**：执行过程可审计、可恢复、防篡改

## 2026-08-10~11　逐语言诚实连跑（架构决策）
- **变化**：批量多语言改为"每个语言独立计费与结算"的逐语言连续执行，UI 明示；取代静默批量
- **理由**：项目铁律"不得引入静默降级"；多语言体验在 C3 未立项前诚实解锁

## 2026-07-06　v0.1 三层架构奠基（初始）
- **变化**：官网（Canvas A）/ 本地工作台（Canvas B）/ 内测运营台（Canvas C）+ RG-001~008 红线（CSV 不上传、报告路径脱敏、无支付/积分/公开注册等）
- **理由**：内测定位的边界约束；后续红线随产品演进逐步放开

