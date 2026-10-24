@AGENTS.md

## 通知通道（2026-10-14 Owner 令，全文见容器根 `AGENTS.md:52`）

- 一切**执行方案通知、方案/报告文件**（含面向 Owner 的 md+HTML 交付件）只走 Owner 2026-10-14 指定的那一个飞书机器人通道；**旧通道已停用、禁止再发**。
- 通道 webhook 只存本机 Windows User 级 `FEISHU_BOT_WEBHOOK`，**URL 不写进任何文档、不进提交**；**发送载体＝直接发 md 文档**（Owner 2026-10-14 二令「还是直接发md文档吧，html在线打不开」）：`node F:\工具开发\图译工坊内测版\scripts\send-feishu-report.mjs <报告.md> [标题]`（`code:0` 才算发到）；**HTML 在线链接停用，禁止再用 `coze file upload` 换链接发超链接**，HTML 只本地查看。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
