## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

> ⚠️ 警示（2026-08-24 盘点）：根目录 `graphify-out/` 目前是 2026-07-06 的空壳图（只索引了 graphify 工具自身 8 文件，未覆盖业务代码）。在重建真实图（在 `worktrees/v1.5-trust-chain` 跑 `graphify update .`）之前，`graphify query` 的结果**不可信**，代码库问题请改用 grep/glob/Read 或先查 AI_MEMORY/。

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## skill 命名规则

- 自创、无明确出处的 skill 用 `yt-` 前缀；有明确作者/出处的（如李继刚的 ljg-*）保留原前缀。

## 项目长期记忆系统（AI_MEMORY/）— 每个会话的读写纪律

本仓库的记忆系统位于 `AI_MEMORY/`。所有 AI 会话（本目录及其子目录的 worktree 均适用）必须遵守以下纪律，禁止凭空假设项目状态。

### 会话开始必做（按顺序读）

1. `AI_MEMORY/CURRENT_STATUS.md` —— 现在做到哪里、下一步做什么
2. `AI_MEMORY/PROJECT_CONTEXT.md` —— 项目是什么、架构、铁律、目录结构
3. `AI_MEMORY/ISSUES.md` —— 已知问题与风险

> 注：本项目是"容器仓库 + 多 worktree"结构。真实代码在 `worktrees/v1.5-trust-chain/`（当前唯一活动目录），工作区地图见 `worktrees/v1.5-trust-chain/docs/WORKSPACE-MAP.md`，接力入口 `worktrees/v1.5-trust-chain/docs/HANDOFF.md`。

### 状态文件优先级（HANDOFF vs AI_MEMORY，2026-08-25 审查后新增）
- `docs/HANDOFF.md` = 接力指针层（对账入口、当前占用、偏差登记）；`AI_MEMORY/CURRENT_STATUS.md` = 状态详情层。
- 两者不一致时：以 git 实测为准（对账步骤），并立即将较新一方同步到另一方。
- 任务收工时两个文件**成对更新**，只更新一个视为记录未完成。

### 任务结束必做

1. `AI_MEMORY/TASK_LOG.md` 置顶追加本次记录（目标/方案/修改文件/原因/测试结果/遗留问题）
2. 状态有变则更新 `AI_MEMORY/CURRENT_STATUS.md`
3. 架构/功能/决策级变化 → `AI_MEMORY/CHANGELOG.md`（新条目置顶，附理由）
4. 新问题登记 `AI_MEMORY/ISSUES.md`；修复旧问题只更新其状态，不删除条目
5. 运行验证命令（`npx tsc --noEmit`、`npm run lint`、对应 smoke/test 入口），结果写入 TASK_LOG

### 工作规则

- **先查记忆再问用户**：能查到的（状态/方案/历史/问题）不重复提问
- **产品铁律/红线不可违**：见 PROJECT_CONTEXT「治理规则」——不得静默降级、不得从 develop 直建生产、支付 flag 保持 false（未批准不得翻转）等；违反即停
- **结论必须有 file:line 证据**；不确定标"待确认"，不编造
- **不动存档和规范文档**（archives/、backups/、docs 既有方案文档）除非明确要求
- **只改活动目录** `worktrees/v1.5-trust-chain/`；禁止 `git reset --hard` / `git checkout -- .` / `git clean -fd` / `git restore .` / force push
- **合同变更纪律（2026-08-29 事故后新增）**：凡改"行排除 / 计费口径 / 回执 / 冻结"语义——同一提交内必须同步全部受影响层（浏览器投影 / 助手 evidence / 服务端报价 / 结算闸）+ 更新 `smoke-batch-row-contract` 的 fixture，并在 HANDOFF 偏差登记表标注【合同变更】；未跑 `npm run test:batch-row-contract` 与 `test:trust-chain` 不得部署测试站。跨层基准是无争议权威（服务端+真实绑定），不是任一层实现
- **密钥纪律**：DeepSeek/PaddleOCR 等密钥只放环境变量或后台 ApiCredential，禁止明文进文档/提交

### 项目关键路径速查

- 代码库（唯一活动目录）：`worktrees/v1.5-trust-chain/`（分支 `codex/v1.5-trust-chain`）
- 当前主线方案：`worktrees/v1.5-trust-chain/docs/图译工坊_收口方案v2_支付上线主线_执行交接文档_20260823.md`
- 接力入口/执行记录：`worktrees/v1.5-trust-chain/docs/HANDOFF.md` 与 `docs/records/`
- 记忆系统：`AI_MEMORY/`（本目录）
- 验证基线：`npx tsc --noEmit` + `npm run lint` + 对应 `npm run test:*` smoke 入口