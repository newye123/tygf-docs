# 执行报告 20261024 · 收生产第一步：本地暴露冲突面 + preflight test 档实跑 + 迁移可逆性核验

- 工单：收生产行动方案第五节三件事（全部本地，未推远端、未部署、未碰生产）
- 执行环境：应用仓 worktree `F:/工具开发/图译工坊内测版/worktrees/develop`（分支 develop）；新建 worktree `F:/工具开发/图译工坊内测版/worktrees/release-billing-202610`（新分支 release/billing-2026-10，基底 origin/main）
- 结论速览：三笔 cherry-pick **三笔全冲突**（1 笔 1 块、1 笔 3 文件、1 笔 2 文件），基底已全部复原；preflight test 档实跑 **exit 1，静态门 2 红 + 5 绿 + 1 N/A，17 个测试门全部未执行**，最大红是脚本在 `git diff --check` 处猝死（真凶：脏文件 AI_MEMORY/ISSUES.md 末尾多一空行）；迁移 20261022120000 **手工 down 两条 DROP COLUMN 安全可逆**。

---

## 一、三笔 cherry-pick 实测结果

操作方式严格按工单：某笔冲突 → 记录冲突面 → `git cherry-pick --abort` → 在原基底上试下一笔。三笔各自独立试于基底 `319bc138`（= origin/main = main，实测 `rev-parse --short` 四指针：develop=origin/develop=3a7cdbe7，main=origin/main=319bc138，均未移动）。未解任何冲突、未手工 commit、未 push。

### 第 1 笔 `1316bf34` fix(计费): 单语链按可执行行报价 —— **冲突（1 文件 1 块）**

命令：`git cherry-pick 1316bf34`，rc=1。输出节选：`Auto-merging package.json / CONFLICT (content): Merge conflict in package.json`。

| 冲突文件 | 状态 | 冲突块数 | 性质 |
|---|---|---|---|
| package.json | UU | 1（标记区 59–63 行） | 两边都改了同一条超长的 `test:contracts` npm 脚本行：main 侧在链尾追加了 6 组新测试（`test:auth-session-shape`、`test:workbench-scope`、`test:workbench-batch-groups`、`smoke-user-visible-copy.mjs`、`smoke-preparation-bulk-import.mjs`、`smoke-read-table-path.mjs`、`smoke-runtime-dir-hygiene.mjs`、两个字体子集 `--check`），1316bf34 侧在链中部插入 `smoke-v2-billing-scope.mjs`。同改一行，git 无法自动合并，但两改互不排斥（一处插中间、一处加尾部），属**低危拼接型冲突** |

该笔其余 12 个文件全部自动合并成功，其中含预测基线点名的 docs/HANDOFF.md、src/components/workbench/execute-step.tsx、src/lib/workbench/local-assistant-client.ts（见第五节）。核心计费三文件（src/lib/server/photoshop-billing.ts、src/lib/server/v15-execution-orchestrator.ts、新增 src/lib/billing/billing-scope.ts）零冲突——与预测相符。

处置：`git cherry-pick --abort`，回基底 319bc138，`status --porcelain` 为空。

### 第 2 笔 `ecd7e998` feat(限额): 撤三处用户额度闸 —— **冲突（3 文件，比预测更重）**

命令：`git cherry-pick ecd7e998`，rc=1。

| 冲突文件 | 状态 | 冲突块数 | 性质 |
|---|---|---|---|
| src/app/api/workbench/review-snapshot/route.ts | UU | 3（标记区 20–23、34–40、108–129 行） | 同一限流逻辑两版语义对立：main 侧内联**硬闸**（`MAX_SNAPSHOTS_PER_INSTALL = 100`，超限返回 429 `SNAPSHOT_LIMIT_REACHED`），ecd7e998 侧改**观察模式**（越线只 `console.warn` 不阻断）并 import main 上不存在的模块 `review-snapshot-quota`。"挡"与"不挡"必须二选一，不是拼接能解的 |
| src/lib/server/review-snapshot-quota.ts | DU（modify/delete） | —（文件级冲突） | 该文件由 develop 侧 `9c3dd890`（fix(快照配额)：上限不再把"删不掉的空壳行"计入）在 main 分叉后新增，**main 上从未存在**（实测：`git cat-file -e origin/main:<路径>` 报 "exists on disk, but not in 'origin/main'"，rc=128；`ecd7e998^:<路径>` rc=0 存在）。cherry-pick 以 ecd7e998^ 为合并基底，判 us 侧"删除"。整模块在 main 无落点，连编译都无从谈起 |
| scripts/smoke-snapshot-quota.mjs | DU（modify/delete） | — | 同上，同一笔 9c3dd890 引入 |

预测基线说该笔"与同日快照配额提交语义纠缠，靠编译错误暴露不出来"——实测**相符且更重**：不是语义级而是文件存在性级（2 个 DU + 1 个 3 块内容冲突）。

处置：`git cherry-pick --abort`，回基底复原。

### 第 3 笔 `5b9d8738` feat(积分明细): 每笔单语扣费自带核算凭据 —— **冲突（2 文件，与预测"大体干净"不符）**

命令：`git cherry-pick 5b9d8738`，rc=1。

| 冲突文件 | 状态 | 冲突块数 | 性质 |
|---|---|---|---|
| docs/HANDOFF.md | UU | 1（标记区 845–851 行） | **纯文档追记冲突**：两边在同一表格位置各追加合同变更条目；main 侧该处无新行（HEAD 块为空），5b9d8738 侧追加两条（1316bf34 的报价口径条目 + 本笔核算凭据条目）。低危 |
| scripts/smoke-v2-billing-scope.mjs | DU（modify/delete） | — | 该文件由 **1316bf34 新增**（实测 `git log --diff-filter=A origin/main..5b9d8738^ -- <路径>` 唯一命中 1316bf34），5b9d8738 修改它，main 上没有 → **顺序依赖实证**：三笔必须按序整链上，第 1 笔落上（带来该文件）后此冲突即消失；单独挑第 3 笔必踩 |

该笔其余 5 个文件自动合并（ledger route、credits-badge、新增 evidence-level.ts、credit-ledger-query、credits-client）。

处置：`git cherry-pick --abort`，回基底复原。

### 为什么必须三笔按序整链（实测依据汇总）

- 第 2 笔拖着 main 上不存在的整个配额模块（2 个 DU），解法只能是"整模块带入或整链放弃该模块"，牵动 main 现存硬闸语义；
- 第 3 笔依赖第 1 笔新增的 smoke 文件（DU 实证）；
- 第 1 笔的 package.json 冲突本身低危，但第 3 笔 HANDOFF 追记里**明写**"守卫：新增 test:v2-billing-scope 已串进 test:contracts"——package.json 不合入，测试守卫就断线。

---

## 二、preflight test 档逐门结果

### 调法（读源码确定，非猜测）

- `package.json:121`：`"release:preflight:test": "node scripts/release-preflight.cjs --target test"` —— test 档有**现成 npm script 变体**。
- `scripts/release-preflight.cjs:25-26,48-49`：`--target test` → `expectedBranch = identity.integrationBranch`；`config/release-identity.json:9` → `"integrationBranch": "develop"`，与 develop worktree 当前分支一致。
- `scripts/release-preflight.cjs:195-199`：静态 errors 非空 → 打印汇总并 exit 1，**测试门一律不跑**。

### 实跑结果：exit 1，且零 `[release-preflight]` 输出（异常路径，已定位）

执行了两次（`npm run release:preflight:test` 与裸跑 `node scripts/release-preflight.cjs --target test`），结果一致：rc=1，终端只有两行 git CRLF warning，**没有任何 [release-preflight] 行**——这不符合脚本任何一条正常报错路径（都有 console.error）。

`node --trace-exit` 定位：exit 来自 `release-preflight.cjs:10`（git() helper 的 `console.error(stderr)+process.exit(1)`），调用点 `release-preflight.cjs:115`：`if (git(['diff', '--check'])) errors.push('git diff --check reported errors')`。

真凶（单独复跑取证）：

```
$ git diff --check
warning: in the working copy of 'AI_MEMORY/ISSUES.md', LF will be replaced by CRLF ...
warning: in the working copy of 'src/app/(zh)/guide/ps-batch-replace-text/page.tsx', LF will be replaced by CRLF ...
AI_MEMORY/ISSUES.md:1557: new blank line at EOF.
DIFFCHECK-RC=2
```

**脚本行为缺陷（实测发现，建议登记）**：`release-preflight.cjs:115` 的设计意图是把 diff --check 的结果 push 进 errors 统一汇总（:195-199），但 git() helper（:6-13）对任何非零 rc 直接打印 stderr 并 exit(1)，导致三重后果：① 真正的诊断在 **stdout**（`AI_MEMORY/ISSUES.md:1557: new blank line at EOF.`）被丢弃，终端只见 stderr 上的两行 CRLF warning，等于没说清为什么红；② 比 :115 更晚的远端引用门（:121-129）和错误汇总（:195-199）从未执行；③ 整个测试门序列（:203-224）一个都没启动。

### 逐门结果表

**静态门（脚本按序执行，死在倒数第三道）**

| # | 门 | 脚本位置 | 结果 | 证据 |
|---|---|---|---|---|
| 1 | 发布包内禁跑（scripts/smoke-*.mjs 计数） | :54-58 | **PASS** | 脚本执行流越过该门（它若红会在 :115 之前 exit），死点在 :115；旁证 `ls scripts/smoke-*.mjs \| wc -l` = 246 |
| 2 | environment isolation | :63-70 | **PASS**（手动补测） | 子进程在脚本死前已跑但结果未及打印；按脚本同款命令手动复跑：`node scripts/check-environment-isolation.cjs` → rc=0，"passed: local, staging, test, and production are distinct" |
| 3 | env secret uniqueness（self-test） | :86 | **PASS**（手动补测） | `node scripts/check-env-secret-uniqueness.mjs --self-test` → rc=0"自测通过"（输出中的 FAIL 字样是自攻样例，属测试自身设计） |
| 4 | env secret uniqueness（真实 .env） | :87-89 | **PASS**（手动补测） | .env 存在（`ls .env` rc=0）；`node scripts/check-env-secret-uniqueness.mjs .env` → rc=0 "OK .env：敏感变量无同值复用" |
| 5 | 分支名门（= integrationBranch） | :99-113 | **PASS**（按脚本判定逻辑+实测输入推断；脚本本体未走到打印环节） | 实测输入：`git branch --show-current` = develop；期望值 config/release-identity.json:9 = develop。门条件（不相等）不成立 |
| 6 | **working tree must be clean** | :114 | **FAIL —— 预期红、阻塞项已知** | `git status --porcelain` 非空：4 项脏文件（见第四节前后两次留底，逐字一致）。方案第四节即要求先清它们，本次按工单不清 |
| 7 | **git diff --check** | :115 | **FAIL —— 本次最大红、脚本猝死点** | rc=2，诊断 `AI_MEMORY/ISSUES.md:1557: new blank line at EOF.`（stdout，被脚本丢弃）；trace-exit 证据如上 |
| 8 | 远端引用门（HEAD 须在 origin/develop 上） | :121-129 | **PASS**（按脚本判定逻辑+实测输入推断；脚本未走到） | `git merge-base --is-ancestor HEAD origin/develop` → rc=0（develop 与 origin/develop 同步，均为 3a7cdbe7） |
| 9 | manifest 签名门 | :131-141 | **N/A** | 代码条件 `target !== 'test'` 才查签名（:135）；test 档无此要求 |

红门注记：第 6、7 两道红**同根源**——都是 4 项脏文件（clean 门看 status 非空，diff --check 看已跟踪文件改动中的空白问题；`AI_MEMORY/ISSUES.md:1557` 的 EOF 空行正是脏改动的一部分）。方案第四节"先清脏文件"会同时消掉两道红。

**测试门（RELEASE_GATES，release-preflight.cjs:154-193）——17/17 无法评估**

脚本设计即"静态门红 ⇒ 跳过测试门"（:195-199 注释与逻辑）；本次更进一步——静态门收集中途猝死于 :115，测试门一个都没启动。逐个名单如实标注"未执行"：

acceptance-record（test 档按 :161-162 设计为打印一行跳过说明，本次未达）、release-identity（release:check-identity）、batch-row-contract（test:batch-row-contract）、error-message-contract（test:error-message-contract）、test:contracts、test:v3-batch-flow、test:trust-chain、assistant-auth-barrier、assistant-pair-machine-limit、assistant-device-policy、assistant-token-binding、assistant-script-distribution、partial-index-guard（release:check-partial-indexes）、fold-no-report-loss、content-studio-v1、content-studio-draft-lifecycle（test:content-studio-draft）、legal-pages-drift。

统计：**静态门 2 红 + 4 绿（实测）+ 2 绿（推断，输入已实测、门条件已核对）+ 1 N/A；测试门 17 全部无法评估**。最大的红＝git diff --check（猝死点 + 吞诊断）。

---

## 三、迁移 20261022120000_quote_billing_scope 的 down 路径可逆性

**结论：手工 down 两条 DROP COLUMN 安全可逆；回滚只丢"迁移上线后新写入的 scope 数据"，历史行本来就是 NULL。唯一前置条件：回滚时必须连应用代码一起回（或先回代码再 drop），因为现行代码在读这两列，列没了会直接 SQL 报错——这是"down 无副作用"与"运行中系统可裸 drop"的区别。**

证据链（全部本session实测/实读）：

1. **迁移本体**（`prisma/migrations/20261022120000_quote_billing_scope/migration.sql`，全文 7 行，读原文）：
   ```sql
   ALTER TABLE "BillingQuote" ADD COLUMN "billingScopeJson" TEXT;
   ALTER TABLE "BillingQuote" ADD COLUMN "billingScopeDigest" TEXT;
   ```
   无 NOT NULL、无 DEFAULT、无索引子句；文件头注释明写"纯加法：两个可空列。历史报价保持 NULL＝旧口径，不回填、不改写"。目录内**只有 migration.sql 一个文件，无 down 文件**（`ls -la` 实证，545 字节）。

2. **Prisma 模型为可选字段**（`git -C worktrees/develop show 1316bf34 -- prisma/schema.prisma`）：
   ```diff
   +  billingScopeJson     String?
   +  billingScopeDigest   String?
   ```
   注释行：`null = 旧口径（按快照全表报价，历史单不得改写）`。现行树同形：`prisma/schema.prisma:917-918`。

3. **使用点全清单**（`grep -rn "billingScopeJson\|billingScopeDigest" src/ prisma/`，11 行命中、5 个文件）：
   - `src/app/api/billing/photoshop/quote/route.ts:53-54,65` —— 读侧：`quote.billingScopeJson` 真值才 JSON.parse，digest 透传；
   - `src/lib/server/credit-ledger-query.ts:226,267,268` —— 读侧：select 与摘要、证据分级（同样以真值为条件）；
   - `src/lib/server/photoshop-billing.ts:190-191,199,221-222` —— 写侧：报价 create 时写入两列（`scope ? … : null`）；
   - `prisma/schema.prisma:917-918`、`prisma/migrations/20261022120000_quote_billing_scope/migration.sql:6-7` —— 定义与迁移本体。
   全部是**值的读写**，无 DDL 引用。

4. **否定式实测（命令原式 + 退出码）**：
   - 视图/触发器/索引建在这两列上：`grep -rniE "create[[:space:]]+(view|trigger)|create[[:space:]]+index" prisma/migrations/ --include="*.sql" | grep -i billingscope` → **rc=1（0 命中）**；
   - 回填语句：`grep -rn "UPDATE.*billingScope\|billingScope.*=" prisma/migrations/ --include="*.sql" | grep -vi "ADD COLUMN"` → **rc=1（0 命中）**；
   - `BillingQuote` 模型块（schema.prisma:903 起）内 @@ 声明仅 3 条：`@@unique([principalId, requestPayloadHash])`、`@@index([principalId, status, expiresAt])`、`@@index([snapshotId])` —— **均不涉两列**。

5. **回滚丢什么**：两列上线前的历史行全为 NULL（不回填）；上线后仅 `photoshop-billing.ts` 写入新报价的"可执行行作用域清单"（行号 + 原因码的规范序列化 + SHA256，不含原文/图层名/路径）。DROP COLUMN 丢的只是这部分**事后核算面数据**；读侧两处（quote/route.ts、credit-ledger-query.ts）均以真值判断为条件，数据丢失时行为退回旧口径展示，不崩——前提是列还在或代码已回退。

---

## 四、现场终态

### release worktree

- 路径：`F:/工具开发/图译工坊内测版/worktrees/release-billing-202610`
- 分支：`release/billing-2026-10`（新建，自 origin/main）
- `git log --oneline -5`：
  ```
  319bc138 test(privacy): feedback 门控断言跟进 8412d4a8 的单源形态（发布门 test:contracts 实测红）
  f87de198 chore(release): smoke 脚本的 export-ignore 补 .sh（出包卫生门实测拦下 scripts/smoke-site-traffic-timer.sh）
  8412d4a8 fix(admin): 后台门控与导航同源、刷新真生效、三块概览板写明口径；timer 写死时区并先冒烟后排程
  4170a062 docs(引擎随包说明): 修两处实测出的错话——CRAFT_FONTS_DIR 对 CLI 产物无影响（同哈希），且钉值来历不是"上游 commit"而是我们侧 10-14 的自写提交
  f50635af test(typography): 边界冒烟改与助手 9999 上限同口径（发布门 test:contracts 实测红）
  ```
  ——HEAD 停在基底 319bc138，**三笔全部 abort，零新提交**。
- `git status --porcelain`：空（实测输出后紧跟 `RELEASE-STATUS-EMPTY-OK`）。
- 该 worktree 未安装依赖、未跑任何 npm/tsc 命令（遵守工单第 3 条）。

### develop worktree 四项脏文件前后对照

开工前：
```
 M AI_MEMORY/ISSUES.md
 M AI_MEMORY/TASK_LOG.md
 M src/app/(zh)/guide/ps-batch-replace-text/page.tsx
?? AI_MEMORY/ledger.jsonl
```
收尾后（逐字一致）：
```
 M AI_MEMORY/ISSUES.md
 M AI_MEMORY/TASK_LOG.md
 M src/app/(zh)/guide/ps-batch-replace-text/page.tsx
?? AI_MEMORY/ledger.jsonl
```

### 指针与红线遵守声明

- 实测四指针：develop = origin/develop = `3a7cdbe7`；main = origin/main = `319bc138`。均未被移动。
- 未执行过：push / 任何远端写、部署、reset --hard / checkout -- . / clean、cherry-pick --continue（三笔全部 --abort）、进入 production 等其他 worktree、改动任何业务代码。本次全部写操作 = 新建指定 worktree + 三次 cherry-pick 与三次 abort + 本报告文件。

---

## 五、与预测基线不符之处

1. **1316bf34 的冲突面比预测窄**：预测 docs/HANDOFF.md（15 外团）、local-assistant-client.ts（8）、execute-step.tsx（6）三文件冲突——实测三者在 git 内容层面**全部自动合并通过**（第 1 笔冲突仅 package.json 1 块）。注：自动合并只保证文本可拼，不担保语义无碰，本手段无法评估语义层。
2. **5b9d8738 与预测"大体干净"不符**：实测 2 个冲突文件——docs/HANDOFF.md 追记冲突 1 块（低危）+ scripts/smoke-v2-billing-scope.mjs 的 DU（顺序依赖实证：必须第 1 笔先落上）。
3. **ecd7e998 相符且更重**：预测"语义纠缠、编译错误暴露不出来"——实测升级为 2 个 modify/delete（文件在 main 上从未存在，9c3dd890 引入）+ route.ts 3 块"硬闸 vs 观察模式"语义对立。
4. **preflight 与工单预期不符的实测发现**：工单预期"working tree must be clean 门必然红"——红是红了，但脚本**死在更早的 `git diff --check` 门**（rc=2，`AI_MEMORY/ISSUES.md:1557: new blank line at EOF.`），且因 `release-preflight.cjs:10` git() helper 的行为（回显 stderr、丢弃 stdout 诊断、先于 :195-199 的错误汇总直接 exit），终端零 `[release-preflight]` 输出、17 个测试门一个未启动。两道红同根源（4 项脏文件），清脏可一并消除；脚本"吞诊断"缺陷建议登记 ISSUES。
5. 其余预测（package.json 冲突、核心计费三文件零外团干净）实测相符。

---

*执行：外派工·GLM5.3Flash，2026-10-24。全部结论基于本 session 实跑命令与实读文件；未能执行的项目一律标"无法评估/未执行"，无推断充数（两处标"推断 PASS"的门均已注明依据与限制）。*
