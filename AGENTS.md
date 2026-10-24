## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

> ⚠️ 警示（2026-08-24 盘点）：根目录 `graphify-out/` 目前是 2026-07-06 的空壳图（只索引了 graphify 工具自身 8 文件，未覆盖业务代码）。在重建真实图（在 `worktrees/v1.5-trust-chain` 跑 `graphify update .`）之前，`graphify query` 的结果**不可信**，代码库问题请改用 grep/glob/Read 或先查 AI_MEMORY/。

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- Use Graphify only when its graph covers the current repository and is not marked stale. Otherwise search source directly; a missing or stale graph does not require rebuilding it for the task.
- Dirty graph files alone do not establish freshness or coverage.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Update Graphify only when maintaining an active, relevant graph is within task scope; documentation-only changes do not require it.

## skill 命名规则

- 自创、无明确出处的 skill 用 `yt-` 前缀；有明确作者/出处的（如李继刚的 ljg-*）保留原前缀。

## 项目长期记忆系统（AI_MEMORY/）— 每个会话的读写纪律

本仓库的记忆系统位于 `AI_MEMORY/`。所有 AI 会话（本目录及其子目录的 worktree 均适用）必须遵守以下纪律，禁止凭空假设项目状态。

### 会话开始按需读取（同一任务可复用未变化的已核实上下文）

1. `AI_MEMORY/CURRENT_STATUS.md` —— 现在做到哪里、下一步做什么
2. `AI_MEMORY/PROJECT_CONTEXT.md` —— 项目是什么、架构、铁律、目录结构
3. `AI_MEMORY/ISSUES.md` —— 已知问题与风险
4. `总控/产品功能全景_*.md` —— **能力现状权威清单**（**每次现取文件名日期最大的那一份**；本行不写死文件名——写死即永久过期指针，2026-09-27 由总控长按门下省块 33 问③ 裁定删除旧"当前为 X"半句）：它只作**方向索引**，用来避免把"已有能力"当成"待新建"。对外承诺、写派工判据或说"某能力处于某状态"之前，必须**实测**被引那一条的 `file:line` 与状态（该文件会过期；过期判据见其页眉"最后核验基线/核验时刻/过期判据"）。

> 本项目为容器仓库 + 多 worktree。活动目录以当前任务授权路径及 Git 实测为准；历史目录仅供导航，不构成修改授权。业务上下文读取目标 worktree 内的治理文件。

### 状态文件优先级（HANDOFF vs AI_MEMORY，2026-08-25 审查后新增）
- `docs/HANDOFF.md` = 接力指针层（对账入口、当前占用、偏差登记）；`AI_MEMORY/CURRENT_STATUS.md` = 状态详情层。
- 两者不一致时以 Git 和运行证据为准；只读任务报告偏差，不自动修改文件。
- 项目状态实际变化时同步相关状态和接力指针；无需为无状态变化的任务重写两份文件。

### 任务结束必做

以下记录用于实际实现或项目状态变化。只读审查和解释不自动写文件；纯治理文档修改仅检查差异，不触发业务测试。

1. `AI_MEMORY/TASK_LOG.md` 置顶追加本次记录（目标/方案/修改文件/原因/测试结果/遗留问题）
2. 状态有变则更新 `AI_MEMORY/CURRENT_STATUS.md`
3. 架构/功能/决策级变化 → `AI_MEMORY/CHANGELOG.md`（新条目置顶，附理由）
4. 新问题登记 `AI_MEMORY/ISSUES.md`；修复旧问题只更新其状态，不删除条目
5. 按代码影响范围选择适用验证，保留真实结果；不重复运行无关测试，不将未执行项目标为 PASS。
6. **结构化台账投影（2026-10-15 起）**：做第 1 项（TASK_LOG 追加）时，同步向 `AI_MEMORY/ledger.jsonl` 追加**一行 JSON**——它是 TASK_LOG 的**结构化伴生**（同事件的机器可读形态），**不替代** TASK_LOG，**不属**三令所述三账、不占其配额。字段：`taskId`（主键，语义 slug 如 `GRAY-P0`；同一任务状态变更**追加新行**，取最后一条为准）／`title`／`status`（枚举 `等您定|进行中|待复验|已交付|已搁置`，须与飞书单选选项一致）／`owner`／`next`／`source`（证据指针 `路径:行号`）／`updatedAt`（`YYYY-MM-DD HH:mm`）。随后 `bash scripts/sync-task-ledger.sh` 投影到飞书台账（**失败不阻塞交付**，用 `|| true` 包裹；`--dry-run` 先预览）。投影脚本只写机器列（2026-10-15 起 8 列：任务ID/标题/状态/负责人/下一步/出处/更新时间/**到期日**＝ledger 的 `due`），**永不触碰「Owner 批注」列**（该列只由 Owner 填，是 Owner 对台账的唯一写入口）。**写入口纪律（2026-10-15 实测事故）**：ledger.jsonl 只许用 node `fs.appendFileSync`（UTF-8、`\n`）追加，**禁用 PowerShell `Add-Content`**（实测把 3 行并成 1 行、造出坏行）。**执行前健全性闸（2026-10-15 重复行事故后新增）**：`sync-task-ledger.sh` 会校验「update 条数 == 带 `--record-id` 条数」，不符即拒绝执行；PS 绕行复刻执行时必须逐条带 `--record-id`（漏带会把 update 变 create、造重复行，见 ISSUES #144）。**投影前对账闸（2026-10-15 夜实施）**：投影前逐格三值比对（台账 L／飞书现值 F／上次投影快照 P＝`tmp/readback/last-projected.ndjson`，只在本次执行全成功时提升）；人手改/冲突/无快照的行**拦下不投影**并点名，`--force`＝显式强推口子；`held>0` 或写入有 `[fail]` 均 exit 1（调用方 `|| true` 不阻塞）；全等行跳过不发写命令（幂等二跑 update=0）；夹具 `scripts/test-sync-reconcile.sh`（29 断言），语义全案见 `交付档案/执行方案/执行方案_20261015_中台收口_投影前对账闸与支线残料终清.md`。
7. **控制面日检（中台，2026-10-15 Owner「按你的意思来」批 B 案）**：① **在办上限 2**——`ledger.jsonl` 里 `wip:true` 且非终态的行即在办，在办必须带 `due`（到期日）与 `claim`（认领者），超限／无到期日／进行中未标 wip 均报警；② **每天早上第一条命令**：`bash scripts/control-plane.sh`（退出码 0=全绿、1=有告警；人读报告会点名具体条目）；③ **发布挂号**：任何进 `main` 的合并须在同一提交里带一行挂号（在 `总控/` 或 `AI_MEMORY/` 写出 `main` 的 short sha）；控制面按 `git rev-parse --short main` 在这两处取证，取不到即告警「发布未挂号」；④ **飞书回读闸**（2026-10-15 Owner 问「我直接在飞书点任务你会知道吗」→ 补）：投影是单向的，Owner 在飞书写的**「Owner 批注」**、手改的机器列、手加的空行/新行，由 `scripts/feishu-readback.mjs` 读回对账——新批注/漂移/多余行/缺行/重复行即告警（已读批注不重复报警）；**机器列（含状态/到期日）手改会在下次投影被真相层覆盖，请在「Owner 批注」列留言或直接对我说**。

### 工作规则

- **先查记忆再问用户**：能查到的（状态/方案/历史/问题）不重复提问
- **「能处理就直接处理」作业模式（2026-10-17 Owner 令「你能处理的就直接处理就行了…以后都要这样操作，我只看结果是否可以运行成功」，长期有效）**：凡会话内能自行处理的环节（查证、对抗式审查、出方案、执行、验证），**直接做完，不再逐环请示**；每个任务按「对抗式审查 → 执行方案 → 直接执行 → 运行验证」一气闭环。**Owner 验收标准＝结果能否运行成功**——交付必须附真实运行证据（命令输出 / 健康检查 / 实测通过项），过程性汇报从简；只有触碰红线（部署生产、翻闸、支付 flag、删档）或证据对不上时才停下来问。**逐条对号审查**：每条结论必须对得上 `file:line` / 命令输出证据，对不上号的标「待确认」，不凑数。
- **环境开关漂移对账纪律（2026-10-17 ISSUES #156，长期有效）**：① 联调要开本地库覆盖（尤其支付类）前先跑 `npm run flags:drift` 留底，用完即清；② 隔离验证 `DATABASE_URL` 一律写**绝对路径**（`file:` 相对路径经 node_modules 符号链接会静默读 develop 共享库——已三次实证）；③ 交付/验收口径只认「运行中的进程 + 它实际读的库」，不认「树里配置应该是什么」；陈旧 dev 进程（启动早于最近 .env 改动）的行为不作数。
- **交付报告一律附 HTML（2026-10-13 Owner 令）**：审查报告/可行性报告/评估报告等面向 Owner 的交付件，除 md 外必须同时产出同名 `.html`，版式沿用 `交付档案/审查报告/审查报告_20261012_PSD原生改文字_五路对抗式审查.html` 的组件体系（verdict/split/stats/table/cards/gates/notes/callout/footer，IBM Plex + Noto Sans SC，亮暗双主题）；文件与 md 同目录。（2026-10-14 起根目录交付件已按类型归入 `交付档案/`，新→旧映射见 `交付档案/索引_根目录整理_新旧路径映射_20261014.md`；历史台账里写死「容器根 文件名」的旧指针不回改。）
- **执行方案通知与文件一律发飞书（2026-10-14 Owner 令「通知全部对话…以后全部执行方案通知和文件都要走这个通道…之前的通道不用发了」）**：今后一切执行方案通知、方案/报告文件（含每份面向 Owner 的交付件 md+HTML）**只走 Owner 2026-10-14 指定的那一个飞书机器人通道**，**旧通道已停用、禁止再发**（含旧 webhook、旧群入口）。落位方式：通道 webhook 只存本机 User 级环境变量 `FEISHU_BOT_WEBHOOK`（该变量已切换为新通道），**URL 不写进任何文档、不进提交——包括本文件**；各会话按此变量取通道，勿另记 URL。发送方式：`node F:\工具开发\图译工坊内测版\scripts\send-feishu-report.mjs <报告.md> [标题]`（**发送载体＝直接发 md 文档**——2026-10-14 Owner 二令「还是直接发md文档吧，html在线打不开」；脚本对 `.md` 原样发卡片、对 HTML 自动转 markdown、>27KB 自动分片、返回 `code:0` 才算发到、失败退出码 1 只登记不阻塞交付）。**HTML 在线链接已停用：禁止再走 `coze file upload` 换在线链接发卡片超链接**；HTML 仍按上一条与 md 同目录产出，仅本地查看、不作发送载体。脚本按 进程 `FEISHU_REPORT_WEBHOOK` → 进程 `FEISHU_BOT_WEBHOOK` → Windows User 级 `FEISHU_BOT_WEBHOOK` 顺序解析，URL 永不打印。**内容形态（2026-10-14 Owner 三令「以后到飞书是需要能够直接阅读的文本内容就可以了」）**：飞书卡片里的正文必须是**人直接可读的文本**——写成连贯段落/要点列表，不用 markdown 表格、不堆嵌套代码块/源码围栏（飞书端读起来是原始符号）；`file:line` 指针可保留但别做成表格。**讲人话（2026-10-20 Owner 四令「以后发到飞书的内容要讲人话」）**：先给结论和「这对你意味着什么」，再给证据；内部代号、错误码、文件名第一次出现要顺手说明它是什么；不堆只有工程师能懂的缩写；能用一句话说清就不写五句。**发送义务（同日 Owner 令「不是要不要发，是一定要发的」）**：凡本条覆盖的交付件/通知/交接文档，**产出后必须直接发送，不再询问 Owner 是否要发**；只在发送失败（退出码 1）时登记并继续交付。
- **一切对外输出讲人话（2026-10-22 Owner 令「以后都给我发人话…进到规则里面去让全部对话都知道」；范围＝对话正文＋飞书卡＋交付件正文，不分渠道）**：① 先给结论和"这对你意味着什么"，再给证据；② 内部代号、错误码、文件名第一次出现时顺手说清它是什么；③ 不堆只有工程师懂的缩写，不把 `file:line` 当句子主干（指针放句末或括号里）；④ 短句、要点列表优先，长句拆两行；⑤ 要他拍的选项写成"A 还是 B，各自会发生什么"，不写成参数名。**讲人话改的是表达，不是减信息**——结论、实测数字、file:line 证据照旧必须给。
- **产品铁律/红线不可违**：见 PROJECT_CONTEXT「治理规则」——不得静默降级、不得从 develop 直建生产、支付 flag 保持 false（未批准不得翻转）等；违反即停
- **结论必须有 file:line 证据**；不确定标"待确认"，不编造
- **禁止无出处的否定式断言（2026-09-23 新增，与上一条同权重）**：说"我们有 X"必须给 `file:line`；说"我们没有 X / 这是新东西"必须二选一给出——① `总控/产品功能全景_*.md` 的**行号**（该行标注为 U/无出处的空档），② 实测的 grep/命令原式 + **真实退出码与 0 命中证据**。缺出处一律写成**「未核实」**，不得写成「没有」。病根：规则一直要求"肯定式要证据"，却允许否定式随口讲，于是反复把"已有能力"当"待新建"派活（实例：学习子系统九环皆有代码与库表，曾被当新东西提出）。
- **不动存档和规范文档**（archives/、backups/、docs 既有方案文档）除非明确要求
- **只改当前任务授权的目录和文件**，先核对 Git 现场；禁止 `git reset --hard` / `git checkout -- .` / `git clean -fd` / `git restore .` / force push
- **发布必须走 GitHub 三段轨（2026-10-22 Owner 令，长期有效）**：「先推 GitHub → 从 GitHub 拿代码更新测试站做测试 → 测试通过再从 GitHub 拿代码推生产站」。任何会话动手上站前：① 先 `git push origin <分支>`（**禁止 force push**），再出包部署；测试站认 `origin/develop` 上的提交，生产认 `origin/main` 上的提交。已落成闸：`scripts/release-preflight.cjs` 会核"要出包的提交必须已在 `origin/<目标分支>` 上"，远端引用取不到＝硬失败（不许静默跳过），未推则拒跑出包（负控实测：不可达提交 ⇒ `merge-base --is-ancestor` rc=1）。**代码有异地副本是这条轨的副产品，也是它的底线**：2026-10-22 之前 develop 领先远端 94 笔、main 领先 33 笔，代码只存在于服务器＋一台笔记本上（当日已推平，`origin/main` 与生产现役 `319bc1384a36` 逐位对齐）
- **合同变更纪律（2026-08-29 事故后新增）**：凡改"行排除 / 计费口径 / 回执 / 冻结"语义——同一提交内必须同步全部受影响层（浏览器投影 / 助手 evidence / 服务端报价 / 结算闸）+ 更新 `smoke-batch-row-contract` 的 fixture，并在 HANDOFF 偏差登记表标注【合同变更】；未跑 `npm run test:batch-row-contract` 与 `test:trust-chain` 不得部署测试站。跨层基准是无争议权威（服务端+真实绑定），不是任一层实现
- **密钥纪律**：DeepSeek/PaddleOCR 等密钥只放环境变量或后台 ApiCredential，禁止明文进文档/提交
- **治理三令（2026-09-26 19:2x Owner 令生效）：节流令／单写者令／法条萃取令**——条文与判据见 `总控/草案_治理三令_20260926.md`（v2.1），生效落账见 `总控/官制.md:1414`。对本文件的直接效力（读到这里就按这四条做，别照旧条文善意违令）：① 上面「任务结束必做」第 2 条**改读为**：`AI_MEMORY/CURRENT_STATUS.md` 是**单写者现状类文件（属主＝总控长槽）**，非属主会话不得整档重写——需变更就向 `总控/待投递指令.md` 投属主，或在 `总控/官制.md` 的「代写区」追加一行（属主 24h 内并入或驳回）；② 跨文件引用一律写 `路径:行号` 指针，**禁止把大段原文抄进新条目**（抄录是三账膨胀主因）；③ 三账（官制／待投递指令／待复验队列）净增 **≤30 KB/周**、每周新签任务书 **≤7**，超限即冻结新签发（Owner 一票阀除外，须记原话与到期）；④ 萃取对账表过复验前**禁止删除、压缩或移档**官制与三账，以及 `AI_MEMORY/ISSUES.md`（该件移档口径等 Owner 补令）——只许追加。

### 项目关键路径速查

- 当前活动开发树：`worktrees/develop/`（多稿工作台等专题分支以当前授权 worktree 及 Git 实测为准；`worktrees/v1.5-trust-chain/` 为 2026-09 历史归档树，勿当现行入口）。
- 接力入口/执行记录：`worktrees/develop/docs/HANDOFF.md` 与 `docs/records/`
- 记忆系统与热索引：`AI_MEMORY/HOT_INDEX.md`（`<17KB` 开机秒读热索引，由 `node scripts/build-hot-index.mjs` 只读生成）＋ `node scripts/reconcile-ai-memory.mjs [--apply]`（扫描并归并 31 个子 worktree 的独有 `TASK_LOG` 回容器根、向全部子树分发 `HOT_INDEX.md`）
- 自研 Skills 单一真源与四端同步：`skills/`（含 `yt-adversarial-review` / `yt-zongkong-round` / `yt-sansheng-liubu` / `yt-uiux`），同步OpenCode/Claude/Qoder四端命令：`node scripts/sync-yt-skills.mjs [--check]`
- 测试站与本地助手 10 秒联调诊断：`node scripts/doctor-testsite-assistant.mjs`
- `TASK_LOG.md` 防吞标题唯一写入口：`node scripts/tasklog-prepend.mjs --section-file <新条目.md>`（自检：`--self-test`）
- 验证基线：`npx tsc --noEmit` + `npm run lint` + 对应 `npm run test:*` smoke 入口
