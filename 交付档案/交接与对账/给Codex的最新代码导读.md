# 图译工坊 — 最新代码导读（给 Codex 评审用）

> 代码包：`tygf-code-fd91353.zip`（git archive of HEAD `fd91353`，已排除 .env/db/node_modules 等非版本文件）
> 分支：`codex/v1.5-trust-chain`（该提交已推送 GitHub origin，与测试站部署源 develop 同源）
> 生成时间：2026-08-30

## 一、快速上手

1. 解压后先读根目录 `AGENTS.md`（治理权威：会话启动纪律、高风险状态机门禁、12 问、Stop-the-line、禁止模式）。
2. 再读 `AI_MEMORY/CURRENT_STATUS.md` → `PROJECT_CONTEXT.md` → `ISSUES.md`（历史看 `TASK_LOG.md` / `CHANGELOG.md`）。
3. 技术栈：Next.js 16.3 + React 19 + TS5 + Prisma 6/SQLite + Tailwind 4；本地助手为 Node 引擎（`download/local-assistant/`，pkg 打包 exe）。
4. 验证命令：`npx tsc --noEmit`、`npm run lint`、`npm run test:trust-chain`、`npm run test:batch-row-contract`、`npm run test:review-filters`。

## 二、最近 12 个提交（新→旧）

| commit | 内容 |
| --- | --- |
| `fd91353` | 治理迁移：AGENTS + AI_MEMORY 迁入业务仓库（本次评审的治理基线） |
| `9e3eef4` | **P0**：计费启动 vs 启动前释放仲裁（cancel/refund 竞态，+370 行故障注入 smoke） |
| `604cdbc` | HANDOFF：3.6.17 绑定收口记录 |
| `9a3c2e3` | latest 接口发布说明从 identity 生成（防旧文案回归） |
| `4f291b1` | 不可变 3.6.17 安装包入库 |
| `0623e62` | 报告拒绝幽灵输出元数据（不伪造未生成文件） |
| `c631ee5` | 失败结算冻结 smoke（独立 SQLite） |
| `1b2b6fe` | 失败语言统一进入中文聚合报告 |
| `6e3e495` | 发布不可变助手 3.6.17 |
| `03df623` | legacy 授权绑定安全迁移 |
| `08582d8` / `867147c` | 引擎产物重生成 + buildId（等价裁决+选择器候选） |

## 三、本轮重点评审对象（如 Codex 要做对抗审查）

1. **`src/lib/server/photoshop-billing.ts` + `cancel/route.ts` + `ticket/verify/route.ts`**（P0 `9e3eef4`）：启动 vs 启动前释放的单赢家仲裁；重点核对幂等键、事务边界、late ticket/replay 路径。
2. **`src/lib/trust-chain/binding-core.ts`**：组合绑定等价候选裁决（写入结果一致→自动绑定）+ `combinedCandidates` 候选携带。注意头部纪律：修改后必须重跑 `scripts/build-local-binding-core.mjs`（生成产物已同步）。
3. **`src/lib/server/deepseek-align.ts`**：智能检测 40 行/批分批 + `reviewRowsWithDeps`（deps 注入）+ 半互换过滤器"目标出现≥2次豁免" + 孤儿译文锚定分段检测。
4. **`download/local-assistant/server.js` + `v15-runner.js`**：失败语言中文聚合报告、失败幂等结算、未知状态冻结、heartbeat/stalled 机制。
5. **治理文件**：`AGENTS.md`（合并是否破坏原 Next.js 规则）、`AI_MEMORY/*`（历史继承完整性）。

## 四、已知未解决问题（评审时不要当成"全部通过"）

- **#37（blocker）**：疑似真实凭据未确认全部轮换。
- **#33/#28（blocker）**：3.6.17 待测试机真人 Windows/Photoshop 覆盖安装验收。
- **#29（blocker）**：6 个历史悬挂批次（冻结 240 积分）未处置，等用户拍板。
- **#35（major）**：activeAttempt 缺 DB 层唯一性兜底（现靠应用层防重入）。
- **#36**：`repo:check` 已知 FAIL（.gitignore / 3.6.17 installer 登记）。
- 6 个支付 flag 全 false、`BATCH_EXECUTION_READY=false`、生产站 `main` 未动。
