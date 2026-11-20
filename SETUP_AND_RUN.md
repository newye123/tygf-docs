# 图译工坊 Agent 硬护栏与实机验证套件安装指南（3 分钟启用）

本套件将 `AGENTS.md` 软规则升级为 **Hooks 硬拦截 + Playwright/Chrome MCP 实机验证闭环**，全部脚本均为跨平台 Node.js（零外部依赖，Windows/macOS 通用）。

## 第 1 步：解压落盘并锁定 UI 原型真源

1. 将本压缩包直接解压到 `newye123/tygf` 仓库根目录（会自动落盘 `.claude/settings.json` 与 `scripts/hooks/*`、`scripts/e2e-workbench-v3-verify.mjs`）。
2. 将你的 `code_artifact.html` 复制到仓库并提交为只读视觉真源：
   ```bash
   mkdir -p docs/ui-reference
   cp /path/to/code_artifact.html docs/ui-reference/workbench-v3.html
   ```
3. 验证护栏 Hooks 本身工作正常（应输出 `ALL 5 GUARDRAIL HOOK ASSERTIONS PASSED (RC=0)`）：
   ```bash
   node scripts/smoke-hooks-kit.mjs
   ```

## 第 2 步：给本地编码 AI 装上“眼睛和手”（浏览器 MCP）

二选一（推荐两个都装，Playwright 跑点击验收，Chrome DevTools 看控制台报错）：

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

## 第 3 步：在 `AGENTS.md` 顶部粘贴精简“地图指针”（控在 30 行内，防上下文膨胀）

```markdown
## 硬护栏与视觉真源（强制）
- **UI 唯一真源**：`docs/ui-reference/workbench-v3.html`（只读禁止修改）。
- **自动硬拦截**：仓库已启用 `.claude/settings.json` Hooks（禁止前端泄露引擎词、禁止子分支改 `AI_MEMORY/*`、禁止直推 `main`、禁止前后端混塞同一大提交）。
- **取消即终止**：严禁叠加网页假目录窗/老式 Win32 树形框 fallback；用户取消直接安静返回。
- **实机验证铁律**：凡改工作台 UI，禁止只交无头单测，必须通过 Playwright MCP / Chrome DevTools MCP 实点验证并运行 `node scripts/e2e-workbench-v3-verify.mjs` + 4 道发布门禁全绿后方可汇报完成。
```

## 第 4 步：立即让 AI 带护栏修完 9 张截图的问题

直接把之前 Canvas 里的 **`tygf-v3-ui-fix-prompt.md`** 发给本地 AI（此时 Hooks 已生效，AI 只要敢泄露引擎词、改超文件数、或没跑实机验证，都会被自动拦截打回）。
