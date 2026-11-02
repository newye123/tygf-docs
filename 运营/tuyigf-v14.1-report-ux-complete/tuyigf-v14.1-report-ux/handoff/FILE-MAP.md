# 项目文件地图

## 根目录

- `README.md`：项目包说明、启动、测试和边界。
- `CHANGELOG.md`：版本改动历史。
- `CONTEXT-HANDOFF.md`：完整上下文交接总文档的根目录副本。
- `tuyigf-v14.1-fullsite.html`：当前整站主入口，含报告入口。
- `execution-report-redesign.html`：独立执行报告中心。
- `tuyigf-v14-fullsite.html`：V14 原始基线，不覆盖。
- `tuyigf-v14-workbench-single.html`：单稿工作台独立入口。
- `tuyigf-v14-workbench-batch.html`：批量工作台独立入口。
- `tuyigf-v14-typography-drawer.html`：字体抽屉独立入口。
- `tuyigf-v14-saas-overview.html`：SaaS 概览入口。
- `V14-OPTIMIZATION-REPORT.md`：V13 → V14 审查与优化记录。
- `V14-QA-REPORT.md`：V14 原型测试记录。
- `V15-LOCAL-PRODUCTION-ENGINE-PLAN.md`：V15 本地生产引擎工程方案。

## reports/

- `execution-report-data.json`：原始报告结构化数据与二次核对项。
- `report-template.html`：报告页面模板。

## reference/

- `original-execution-report.html`：用户上传的原始执行报告。
- 其它原始 ZIP/工程蓝图归档（若存在）。

## docs/

- `REAL-REPORT-ANALYSIS.md`：真实报告审计。
- `REPORT-UX-SPEC.md`：报告中心信息架构、状态和交互。
- `REPORT-DATA-DICTIONARY.md`：统计口径。
- `UIUX-DESIGN-SYSTEM.md`：Unslop 方法吸收与 UI 规范。
- `V14.1-OPTIMIZATION-REPORT.md`：本版改动摘要。
- `QA-REPORT-V14.1.md`：本版测试结果。

## handoff/

- `00-START-HERE.md`：完整上下文入口。
- `PROJECT-CONTEXT.md`：产品背景与生产场景。
- `DECISIONS-AND-CONSTRAINTS.md`：硬约束与决策。
- `CURRENT-STATE-AND-ROADMAP.md`：当前状态和下一步。
- `FILE-MAP.md`：文件地图。
- `RESUME-PROMPT.md`：新会话恢复提示词。
- `SESSION-LOG.md`：本次会话决策与版本演进时间线。

## tools/ 与 tests/

- `tools/extract_report_data.py`：从原始 HTML 提取结构化报告数据。
- `tools/build_report_page.py`：将 JSON 嵌入独立报告 HTML。
- `tools/requirements.txt`：数据提取脚本依赖。
- `tests/`：原型静态、解析、浏览器和报告 UX 测试。
