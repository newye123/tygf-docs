# 图译工坊 Tuyi Workshop V14.1

**版本定位：V14.1 = V14 工作台交互原型 + 真实执行报告 UI/UX 重构 + 完整上下文交接包。**

V14.1 不代表真实 Photoshop 生产引擎已经完成。V15 Local Production Engine 仍是下一阶段工程方案，尚未实现本地 Agent、PSD/PSB 真实扫描或 Photoshop 写入。

## 先从这里开始

1. 打开 `tuyigf-v14.1-fullsite.html`：产品官网、单稿工作台、批量工作台、字体抽屉和交互原型。
2. 点击顶部“执行报告”或首页“查看执行报告优化样例”，打开 `execution-report-redesign.html`。
3. 打开 `CONTEXT-HANDOFF.md` 或 `handoff/00-START-HERE.md`：了解项目状态、当前决定和下一步任务。
4. 打开 `handoff/RESUME-PROMPT.md`：在新会话中复制完整交接提示词，继续开发。

## 本版新增内容

- 新增独立执行报告中心，基于用户上传的 2026-10-31 原始报告。
- 重构报告信息层级：结果概览、待处理事项、语言与文件交付、替换明细、溯源证据。
- 支持 348 条替换明细搜索/语言筛选/分页/CSV 导出。
- 支持 200 条未命中预览搜索/语言筛选/分页/CSV 导出，并明确报告总数 432。
- 支持 40 条版式风险、8 个未覆盖对象、12 条规格数值待确认事项的独立展示。
- 支持 12 种语言的交付状态、24 个输出文件名和按语言展开的溯源信息。
- 支持打印/保存 PDF。
- 修正官网案例区旧报告的过期数据，改为当前上传报告数据。
- 在官网导航、首页 CTA 和工作台侧栏增加执行报告入口。
- 增加完整上下文交接文档，包含项目背景、决策、数据审计、文件地图、测试状态和继续开发提示词。

## 文件入口

| 文件 | 用途 |
|---|---|
| `tuyigf-v14.1-fullsite.html` | 当前主站与交互工作台 |
| `execution-report-redesign.html` | 独立执行报告 UX 页面 |
| `reports/execution-report-data.json` | 从原始报告提取的结构化数据 |
| `reports/report-template.html` | 报告页面模板 |
| `reference/original-execution-report.html` | 用户上传的原始执行报告，作为审计证据保留 |
| `docs/REPORT-UX-SPEC.md` | 报告中心 UI/UX 规格 |
| `docs/REPORT-DATA-DICTIONARY.md` | 报告指标与状态口径 |
| `docs/UIUX-DESIGN-SYSTEM.md` | Unslop 方法吸收与 UI 设计规范 |
| `docs/V15-LOCAL-PRODUCTION-ENGINE-PLAN.md` | V15 本地生产引擎方案（见根目录同名旧文件） |
| `handoff/00-START-HERE.md` | 最重要的上下文入口 |

## 如何重新生成报告页面

需要 Python 3 与 BeautifulSoup 4：

```bash
pip install -r tools/requirements.txt
python tools/extract_report_data.py
python tools/build_report_page.py
```

提取脚本读取 `reference/original-execution-report.html`，输出 `reports/execution-report-data.json`。构建脚本把数据嵌入 HTML，使报告页可直接双击打开，不依赖本地 HTTP 服务。

## 测试

```bash
python tests/static_checks.py
node tests/parser-tests.js
python tests/report-data-integrity.py
```

如已安装 Playwright 与 Chromium：

```bash
python tests/browser-smoke-v14.py
python tests/issue-audit-v14.py
python tests/entrypoints-smoke-v14.py
python tests/report-ux-smoke-v14_1.py
```

测试只证明 HTML/JS 与浏览器交互正常，不证明 Photoshop 生产能力。

## 关键边界

- V14.1 的 PSD / PSB 文件选择仍只是前端模拟，未读取真实 PSD 图层。
- 未连接 Photoshop、UXP、JSX 或本地 Agent。
- 未执行真实文字写入、保存、重开、JPG/PNG 导出。
- 字体列表与预览是原型数据，未枚举本机安装字体或验证字形覆盖。
- 报告页面使用用户提供的报告数据；PSB/JPG 实体文件没有随报告 HTML 上传，因此项目包不包含这些输出实体。
- 12 条规格信息复核、79 条明细严格相同记录等属于二次核对结论，已在 UI 中与原报告汇总字段区分。

## 版本关系

- V13：用户原始工作台项目。
- V14：流程门禁、异常聚合、字体抽屉、批量状态与响应式改进。
- V14.1：加入真实执行报告中心、数据口径审计和上下文交接包。
- V15：计划建设本地生产引擎，按 PSD 只读扫描、译文映射、单对象写入、验证、批量执行分阶段推进。
