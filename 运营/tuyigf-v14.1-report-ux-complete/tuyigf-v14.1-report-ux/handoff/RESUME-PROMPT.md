# 新会话恢复提示词（复制全文）

你正在继续开发“图译工坊 / Tuyi Workshop”项目。请先读取项目包中的以下文档：

1. `handoff/00-START-HERE.md`
2. `handoff/DECISIONS-AND-CONSTRAINTS.md`
3. `handoff/CURRENT-STATE-AND-ROADMAP.md`
4. `handoff/FILE-MAP.md`
5. `docs/REAL-REPORT-ANALYSIS.md`
6. `docs/REPORT-UX-SPEC.md`
7. `docs/REPORT-DATA-DICTIONARY.md`
8. `docs/UIUX-DESIGN-SYSTEM.md`

当前基线为 V14.1。主入口 `tuyigf-v14.1-fullsite.html`，执行报告中心 `execution-report-redesign.html`。原始报告在 `reference/original-execution-report.html`，结构化数据在 `reports/execution-report-data.json`。

请严格保留以下事实：原报告记录 12 种语言，每种 29/29，合计 348 次写入操作；37 个唯一文字对象；8 个未覆盖对象；40 条宽度风险；83 条疑似未翻译汇总，但替换明细严格相同为 79 条，日语汇总 6 与明细 2 有 4 条差异；432 条表格未命中只在 HTML 中展示 200 条预览；图层 6350 的原文含 80.0g / 2.8oz，12 种语言目标文本均未保留 2.8oz 数值，需要确认是否有意省略。不能将写入验证说成视觉验收通过。

当前 V14.1 是前端交互原型与静态报告 UI，没有连接真实 Photoshop、没有读取 PSD/PSB 图层、没有真实写入和导出。V15 Local Production Engine 目前只有工程方案。

后续工作必须遵守：不覆盖原始基线；不虚构数据和测试；将写入验证、保存重开、人工视觉批准和交付完整性分开；每次交付都要更新 QA 文档和本上下文交接文档；每次交付都必须提供完整项目 ZIP，且 ZIP 内包含完整 handoff 文档与恢复提示词。

请先检查项目文件和测试状态，再继续用户指定的下一项工作。若修改项目，保持 V14.1 或明确升级版本号，并同步更新 README、文件地图、当前状态、QA 报告和 ZIP 包。
