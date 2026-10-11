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

### 工作规则

- **先查记忆再问用户**：能查到的（状态/方案/历史/问题）不重复提问
- **产品铁律/红线不可违**：见 PROJECT_CONTEXT「治理规则」——不得静默降级、不得从 develop 直建生产、支付 flag 保持 false（未批准不得翻转）等；违反即停
- **结论必须有 file:line 证据**；不确定标"待确认"，不编造
- **禁止无出处的否定式断言（2026-09-23 新增，与上一条同权重）**：说"我们有 X"必须给 `file:line`；说"我们没有 X / 这是新东西"必须二选一给出——① `总控/产品功能全景_*.md` 的**行号**（该行标注为 U/无出处的空档），② 实测的 grep/命令原式 + **真实退出码与 0 命中证据**。缺出处一律写成**「未核实」**，不得写成「没有」。病根：规则一直要求"肯定式要证据"，却允许否定式随口讲，于是反复把"已有能力"当"待新建"派活（实例：学习子系统九环皆有代码与库表，曾被当新东西提出）。
- **不动存档和规范文档**（archives/、backups/、docs 既有方案文档）除非明确要求
- **只改当前任务授权的目录和文件**，先核对 Git 现场；禁止 `git reset --hard` / `git checkout -- .` / `git clean -fd` / `git restore .` / force push
- **合同变更纪律（2026-08-29 事故后新增）**：凡改"行排除 / 计费口径 / 回执 / 冻结"语义——同一提交内必须同步全部受影响层（浏览器投影 / 助手 evidence / 服务端报价 / 结算闸）+ 更新 `smoke-batch-row-contract` 的 fixture，并在 HANDOFF 偏差登记表标注【合同变更】；未跑 `npm run test:batch-row-contract` 与 `test:trust-chain` 不得部署测试站。跨层基准是无争议权威（服务端+真实绑定），不是任一层实现
- **密钥纪律**：DeepSeek/PaddleOCR 等密钥只放环境变量或后台 ApiCredential，禁止明文进文档/提交
- **治理三令（2026-09-26 19:2x Owner 令生效）：节流令／单写者令／法条萃取令**——条文与判据见 `总控/草案_治理三令_20260926.md`（v2.1），生效落账见 `总控/官制.md:1414`。对本文件的直接效力（读到这里就按这四条做，别照旧条文善意违令）：① 上面「任务结束必做」第 2 条**改读为**：`AI_MEMORY/CURRENT_STATUS.md` 是**单写者现状类文件（属主＝总控长槽）**，非属主会话不得整档重写——需变更就向 `总控/待投递指令.md` 投属主，或在 `总控/官制.md` 的「代写区」追加一行（属主 24h 内并入或驳回）；② 跨文件引用一律写 `路径:行号` 指针，**禁止把大段原文抄进新条目**（抄录是三账膨胀主因）；③ 三账（官制／待投递指令／待复验队列）净增 **≤30 KB/周**、每周新签任务书 **≤7**，超限即冻结新签发（Owner 一票阀除外，须记原话与到期）；④ 萃取对账表过复验前**禁止删除、压缩或移档**官制与三账，以及 `AI_MEMORY/ISSUES.md`（该件移档口径等 Owner 补令）——只许追加。

### 项目关键路径速查

- 历史代码库导航：`worktrees/v1.5-trust-chain/`；当前活动目录与分支必须实测。
- 当前主线方案：`worktrees/v1.5-trust-chain/docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md`
- 接力入口/执行记录：`worktrees/v1.5-trust-chain/docs/HANDOFF.md` 与 `docs/records/`
- 记忆系统：`AI_MEMORY/`（本目录）
- 验证基线：`npx tsc --noEmit` + `npm run lint` + 对应 `npm run test:*` smoke 入口
