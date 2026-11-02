# V14.1 QA 报告

## 执行环境

容器内 Chromium Headless + Playwright；静态检查使用 Python 与 Node.js。所有浏览器测试均在本地原型页面执行。

## 已执行并通过

| 测试 | 结果 |
|---|---|
| HTML 解析与重复 ID | 通过 |
| 原 V14 页面结构、路由、内嵌截图 | 通过 |
| 原型内联 JavaScript 语法检查 | 通过 |
| CSV / TSV 解析回归 | 通过 |
| 单稿四阶段门禁与前进/返回 | 通过 |
| 批量工作台门禁与独立状态 | 通过 |
| 字体抽屉编辑、保存、恢复和放弃确认 | 通过 |
| 智能检测空值、原文相同、重复源文、数字风险 | 通过 |
| 只看问题过滤 | 通过 |
| V14.1 报告 6 个摘要卡片 | 通过 |
| 8 个未覆盖对象渲染 | 通过 |
| 12 条规格信息复核渲染 | 通过 |
| 40 条版式风险渲染 | 通过 |
| 12 种语言交付状态渲染 | 通过 |
| 24 个输出文件名记录渲染 | 通过 |
| 348 条替换明细分页、语言筛选和搜索 | 通过 |
| 200 条未命中预览筛选与分页 | 通过 |
| CSV / JSON 导出触发 | 通过 |
| 溯源信息 12 语言折叠展示 | 通过 |
| 桌面与移动端报告布局 | 通过 |
| V14.1 官网、首页 CTA 和工作台侧栏报告入口 | 通过 |
| 浏览器页面异常与控制台错误 | 未发现 |

## 测试命令

```bash
python tools/extract_report_data.py
python tools/build_report_page.py
python tests/static_checks.py
node tests/parser-tests.js
python tests/report-data-integrity.py
python tests/report-ux-smoke-v14_1.py
python tests/browser-smoke-v14.py
python tests/issue-audit-v14.py
python tests/entrypoints-smoke-v14.py
```

## 截图

- `previews/v14.1-report-overview.png`
- `previews/v14.1-report-mobile.png`
- `previews/v14.1-report-trace.png`

## 未验证项

- 未在用户本机 Windows / Edge / Chrome 实际环境验证。
- 未连接真实 Photoshop 或本地 Agent。
- 未验证真实 PSD / PSB 文件写入、保存、重开和导出。
- 未验证原报告中引用的 PSB/JPG 实体，因为这些实体文件没有随上传报告提供。
- 未验证 83/79、8/0 等差异的生产端根因；本版只做证据标注。
