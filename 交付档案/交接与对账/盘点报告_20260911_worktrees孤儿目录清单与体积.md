# worktrees/ 目录盘点报告 — "孤儿 worktree" 完整清单与体积

> 盘点时间：2026-09-11 23:30–00:24　盘点方式：只读（未删除、未移动、未改任何 git 元数据）  
> 数据来源：`git worktree list`（主仓库与第二仓库分别取）+ .NET 原生递归枚举文件体积（`Get-ChildItem -Recurse -Force -File | Measure-Object Length -Sum`）  
> 体积口径：字节 / 1048576，四舍五入到 0.1 MB



---

## 0. 结论先行

1. **它们不是"孤儿"，是一个完整的第二仓库及其 24 个 worktree。** 删除策略必须按仓库来定，不能按目录来定。
2. **主仓库不在 `worktrees/` 里，而是 `tygf-v0.1-source/`** —— 而 `PROJECT_CONTEXT.md:33` 把它标注为「🔒 历史（软著素材来源）／不开发」。**按文档清理"历史目录"会摧毁整个仓库的 object store，12 个 worktree 全部报废。这是本次盘点最严重的发现。**
3. 25 个目录合计 **17.02 GB**；其中 **5.86 GB 可零风险回收**，**8.98 GB 需先审未提交内容**，**2.19 GB 含未并入提交、动之前必须处理**。
4. ⚠️ **A 级"零风险"已被推翻（见第 10 节）**：`batch1-web-only-20260904/.env` 里有一份**唯一的密钥集**（腾讯 SES 三键、独立的支付宝密钥对、`PROFILE_PSEUDONYM_SECRET`），`git status` 看不见它。该目录**必须单独保留或先备份**。
5. ✅ 截至 2026-09-12 00:31，**B/C 级全部独有内容已归档为 patch**（`backups/worktree-orphan-archive-20260911/`，共 260 KB），删除前的保险动作已完成。

---

## 1. 仓库结构真相（实测）

```
tygf-v0.1-source/.git/                      ← 主仓库 object store（分支 feature/email-auth）
  └─ worktrees/                             ← 主仓库注册 12 个 worktree
       ├─ v1.5-trust-chain/   [codex/v1.5-trust-chain]  ← 文档说的"唯一活动目录"
       ├─ develop/            [develop]                  ← 真正在推进的分支
       ├─ production/         [main]
       └─ ...

worktrees/integration-develop-20260831-98d4f9.../  ← 第二仓库（独立 clone，.git 是目录）
  remote: git@github-tygf:newye123/tygf.git
  HEAD:   6241d3b [develop] 2026-09-01 15:32
  └─ 它自己注册 23 个 worktree  ← 本次盘点的 25 个"孤儿"全在这里
```

**证据**：

- `worktrees/v1.5-trust-chain/.git` 内容 = `gitdir: .../tygf-v0.1-source/.git/worktrees/v1.5-trust-chain`
- `worktrees/integration-develop-.../.git` 是**目录**（独立仓库标志），`git -C` 它可列出 **23 个** worktree
- 第二仓库的 remote 与主仓库同为 `newye123/tygf.git`（即 HANDOFF.md:8 记录的 `git clone --shared` 打包流程产物）

---

## 2. 全部 50 个目录的体积总览

| 类别                                | 数量     | 体积           |
| --------------------------------- | ------ | ------------ |
| 带 `.git` 的目录（真 worktree，含已注册与未注册） | 34     | **39.38 GB** |
| 纯目录残留（无 `.git`，审计/证据/归档）          | 16     | 0.78 GB      |
| **合计**                            | **50** | **40.16 GB** |

其中已注册的 9 个（在 `worktrees/` 内）：

| 目录                          | 体积             | 状态                        |
| --------------------------- | -------------- | ------------------------- |
| `develop`                   | **16362.7 MB** | 🟢 活跃，唯一真实推进分支            |
| `v1.5-trust-chain`          | 3122.9 MB      | 🟡 文档所指"活动目录"，实际落后 204 提交 |
| `psd-preflight-assistant`   | 1387.4 MB      | ⏸ 停用                      |
| `assistant-3.6.22-20260907` | 1100.6 MB      | 🟡 已并入                    |
| `production`                | 375.4 MB       | 🔒 冻结（main）               |
| `a6-identity-convergence`   | 154.6 MB       | 🟡 已并入                    |
| `a7-billing-convergence`    | 154.6 MB       | 🟡 已并入                    |
| `sr-patch-test`             | 154.6 MB       | 🟡 已并入                    |
| `admin-security`            | 87.8 MB        | 🟡 已并入                    |

---


## 3. 25 个待处置目录完整清单（按体积降序）

风险分级：

- **A 级** = 提交已并入 develop 且无未提交改动 → 可零风险回收
- **B 级** = 提交已并入 develop，但有未提交改动 → 需先审内容
- **C 级** = 含未并入 develop 的提交 → 动之前必须处理

| #  | 目录                                                              | 体积        | HEAD    | 最后提交        | 并入 develop | 未提交 | 级别             |
| -- | --------------------------------------------------------------- | --------- | ------- | ----------- | ---------- | --- | -------------- |
| 1  | `wave1-release-candidate-20260901`                              | 2015.5 MB | ca30524 | 09-02 11:25 | ✅          | 10  | **B**          |
| 2  | `integration-develop-20260831-98d4f9508ac548e9a2a982dbf9a71bc7` | 1947.7 MB | 6241d3b | 09-01 15:32 | ✅          | 5   | **B** ⚠️第二仓库本体 |
| 3  | `c2c3-integration-20260901`                                     | 1685.3 MB | 8457026 | 09-01 18:20 | ✅          | 13  | **B**          |
| 4  | `batch1-web-only-20260904`                                      | 1228.7 MB | 3cb32f7 | 09-05 10:42 | ✅          | 0   | **A**          |
| 5  | `g4g5-evidence-provenance-20260831`                             | 1123.9 MB | 746569e | 08-31 22:23 | ✅          | 8   | **B**          |
| 6  | `a7-billing-b489-20260901`                                      | 1121.2 MB | 28d64a6 | 09-01 15:03 | ❌          | 0   | **C**          |
| 7  | `a6-identity-b489-20260901`                                     | 1120.4 MB | f754037 | 09-01 14:23 | ❌          | 0   | **C**          |
| 8  | `_verify-ca30524-20260904`                                      | 1120.4 MB | ca30524 | 09-02 11:25 | ✅          | 16  | **B**          |
| 9  | `l9-smart-review-20260831`                                      | 1119.9 MB | 9cbfd30 | 08-31 16:33 | ✅          | 8   | **B**          |
| 10 | `batch-core-contract-10-to-20-20260901`                         | 1083.1 MB | d1208ad | 09-01 10:25 | ✅          | 0   | **A**          |
| 11 | `content-studio-v1-merge-20260901`                              | 721.8 MB  | 91621f1 | 09-01 11:58 | ✅          | 0   | **A**          |
| 12 | `_release-pack-9b3345d-20260909`                                | 454.2 MB  | 9b3345d | 09-09 07:08 | ✅          | 0   | **A**          |
| 13 | `_deploy-b6c9085`                                               | 333.2 MB  | b6c9085 | 08-30 17:54 | ✅          | 0   | **A**          |
| 14 | `g4g5-test-release`                                             | 310.1 MB  | 746569e | 08-31 22:23 | ✅          | 0   | **A**          |
| 15 | `l4-photoshop-p0-20260831`                                      | 242.7 MB  | 275cedb | 08-31 13:23 | ✅          | 0   | **A**          |
| 16 | `l8-batch-40-20260831`                                          | 228.1 MB  | 9cbfd30 | 08-31 16:33 | ✅          | 0   | **A**          |
| 17 | `feedback-studio-v1-merge-20260901`                             | 179.0 MB  | 63a1047 | 09-01 11:10 | ✅          | 4   | **B**          |
| 18 | `g4g5-test-release-clean`                                       | 178.9 MB  | 746569e | 08-31 22:23 | ✅          | 0   | **A**          |
| 19 | `g4g5-test-integration-20260901`                                | 178.9 MB  | 72267fd | 09-01 00:29 | ✅          | 0   | **A**          |
| 20 | `release-e2e-20260901`                                          | 178.5 MB  | 72267fd | 09-01 00:29 | ✅          | 0   | **A**          |
| 21 | `red-team-review-20260901`                                      | 178.5 MB  | 72267fd | 09-01 00:29 | ✅          | 0   | **A**          |
| 22 | `learning-observatory-v1-merge-20260901`                        | 178.5 MB  | a2750dd | 09-01 11:31 | ✅          | 0   | **A**          |
| 23 | `l7-batch-39-20260831`                                          | 166.7 MB  | 4928b38 | 08-31 15:18 | ✅          | 0   | **A**          |
| 24 | `l6-batch-35-20260831`                                          | 166.7 MB  | db384af | 08-31 14:30 | ✅          | 0   | **A**          |
| 25 | `l5-batch-38-20260831`                                          | 166.7 MB  | d355e41 | 08-31 14:16 | ✅          | 0   | **A**          |

**分级汇总**

| 级别    | 数量 | 体积           | 处置前提         |
| ----- | -- | ------------ | ------------ |
| **A** | 16 | **5.86 GB**  | 无需额外动作，可直接回收 |
| **B** | 7  | **8.98 GB**  | 先审未提交改动      |
| **C** | 2  | **2.19 GB**  | 先处理未并入提交     |
| 合计    | 25 | **17.02 GB** |              |

---

## 4. C 级：2 个未并入提交（必须先处理）

两个目录各有 **1 个** develop 上没有的提交：

| 目录                          | 提交                                                                    | 说明               | 对照                                                                     |
| --------------------------- | --------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `a6-identity-b489-20260901` | `f754037` `feat(auth): enforce beta account and activation ownership` | A6 身份收敛的**早期版本** | 后被 `codex/a6-identity-convergence-20260901`（`be49f30`→合并为 `bd14084`）取代 |
| `a7-billing-b489-20260901`  | `28d64a6` `fix(billing): reconcile payment and refund state`          | A7 计费收敛的**早期版本** | 后被 `codex/a7-billing-convergence-20260901`（`67a983e`→合并为 `394e6cb`）取代  |

**判断**：从提交信息与分支命名看，二者是同一批 A6/A7 工作的"第一版尝试"，最终落地的是 convergence 分支。**但这只是强推断，未逐行比对 diff。** 若要删除，建议先：

```bash
git -C <第二仓库> diff bd14084 f754037 --stat   # 看 A6 差异是否已被覆盖
git -C <第二仓库> diff 394e6cb 28d64a6 --stat   # 看 A7 差异是否已被覆盖
```

确认覆盖后再删；或直接把这两个提交打成 patch 归档（几 KB），再删目录。

---


## 5. B 级：7 个有未提交改动（内容已抽样）

| 目录                                  | 未提交内容                                                                                                                                                                                 | 性质                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `_verify-ca30524-20260904`          | 16 项：`execute-step.tsx`、`execution-batch.ts`、`v3-batch-flow.ts`、`batch-execution-client.ts`、`execution-recovery.ts`、2 个 route、3 个 smoke、AI_MEMORY×4、HANDOFF                           | ⚠️ **含真实源码改动**，非纯文档 |
| `c2c3-integration-20260901`         | 13 项：`download/local-assistant/generated/*`（binding-core / prepare-batch-core / text-diff-core 的 js+d.ts）、AI_MEMORY×4、HANDOFF，+1 未跟踪 `docs/records/20260901_release_qualification.md` | 主要是**重新生成的构建产物**    |
| `g4g5-evidence-provenance-20260831` | 8 项：`smart-review-contract.ts`、1 个 smoke、AI_MEMORY×4、HANDOFF，+1 未跟踪 `smart-review-split-row.ts`                                                                                       | ⚠️ **含真实源码改动**      |
| `l9-smart-review-20260831`          | 8 项                                                                                                                                                                                   | 待细看                 |
| `wave1-release-candidate-20260901`  | 10 项                                                                                                                                                                                  | 待细看                 |
| `integration-develop-...`（第二仓库本体）   | 5 项                                                                                                                                                                                   | 待细看                 |
| `feedback-studio-v1-merge-20260901` | 4 项，全部未跟踪：`prisma/learning-phase{0,3,4}-validation.db`、`learning-typography-validation.db`                                                                                            | 验证用临时 DB，可弃         |

**注意**：4 个 AI_MEMORY 文件 + HANDOFF 的改动在这些目录里反复出现 —— 这是"每个 worktree 各自改记忆文件但从不提交"的系统性现象（主仓库 `v1.5-trust-chain` 的 `TASK_LOG.md` 也是同样状态）。**这类改动没有保留价值**，真正需要审的是那几处 `src/` 源码。

---

## 6. 纯目录残留（16 个，0.78 GB）

| 目录                                                                            | 体积       |
| ----------------------------------------------------------------------------- | -------- |
| `release-2b46fbb`                                                             | 637.7 MB |
| `_audit-old-artifact-20260904-v4`                                             | 90.6 MB  |
| `user-profile-p0-v2-node_modules-partial`                                     | 61.8 MB  |
| `_verification-ca30524-20260904-evidence`                                     | 3.4 MB   |
| `TYGF_AGENT_CONTROL_20260901`                                                 | 1.3 MB   |
| `_g4g5_approved_contract_20260831`                                            | 0.5 MB   |
| `_protocol_layered_autonomous_repair_20260831`                                | 0.1 MB   |
| `_chat_archives` / `_audit-manifest-20260904-v4` / `_l3-assistant-backup-...` | < 0.1 MB |
| `AI_MEMORY` / `repo-isolation` / `user-profile-p0-v2` / `verification`        | 0（空目录）   |

---

## 7. 建议处置顺序

| 序 | 动作                                | 回收      | 风险          |
| - | --------------------------------- | ------- | ----------- |
| 1 | 回收 **A 级 16 个**（已并入 + 零改动）        | 5.86 GB | 极低          |
| 2 | 把 C 级 2 个提交打成 patch 归档后回收         | 2.19 GB | 低（归档后可逆）    |
| 3 | 逐个审 B 级 7 个的 `src/` 改动，确认无独有价值后回收 | 8.98 GB | 中（需人看 diff） |
| 4 | 清纯目录残留                            | 0.78 GB | 低           |

**执行纪律（重要）**：

- 25 个目录分属**两个不同仓库**，清理顺序必须是「先卸 worktree 注册 → 再删目录」，直接 `rm -rf` 会留下第二仓库 `.git/worktrees/` 里的悬空注册项。
- 主仓库与第二仓库要分别用各自的 `git worktree remove` / `git worktree prune`，不能混用。
- **本次只盘点，未执行任何删除。** 具体删哪些、按什么顺序，等 yt 确认。

---

## 8. ⚠️ 顺带发现的文档致命错误

`AI_MEMORY/PROJECT_CONTEXT.md:33` 的目录表：

| 目录                  | 分支                   | 用途                  | 状态    |
| ------------------- | -------------------- | ------------------- | ----- |
| `tygf-v0.1-source/` | `feature/email-auth` | v0.1 历史工作目录（软著素材来源） | 🔒 历史 |

**实测：`tygf-v0.1-source/.git` 是目录，即主仓库 object store 所在，`worktrees/` 下全部 12 个 worktree 都挂在它下面。**

按该文档的"🔒 历史／不开发"去清理这个目录，会一次性摧毁主仓库全部 12 个 worktree。**建议立即修正这一行**，并注明"主仓库，禁止删除"。

---

## 9. 未做的事

- 未删除、未移动、未 `git worktree remove`、未 `prune` 任何东西。
- 未逐行比对 C 级两个提交与 convergence 分支的 diff（仅按提交信息推断，已标注）。
- B 级中 `l9` / `wave1` / `integration-develop` 三处的未提交明细未逐项展开。
- 未测量 `tygf-v0.1-source/`（在 worktrees/ 之外）与 `.codex/` 下两个 worktree 的体积。

---

## 10. 补充（2026-09-12 00:31）：A 级"零风险"结论被推翻

### 10.1 `git status` 看不见的东西

A 级判据是「提交已并入 develop + `git status --porcelain` 为 0」。**但 `.gitignore` 忽略的文件不会出现在 `git status` 里**，这才是真正会丢的部分。逐个检查 16 个 A 级目录后：

| 发现                | 数量      | 说明                                              |
| ----------------- | ------- | ----------------------------------------------- |
| 只有 `.env.example` | 15 个    | 4570 字节 / 43 键，**是入库模板，可从 git 恢复，无风险**          |
| **有真实 `.env`**    | **1 个** | `batch1-web-only-20260904/.env`（4778 字节 / 44 键） |
| 独立测试 DB           | 2 个     | `db/test-<uuid>.db`（1.3 MB，隔离测试库，可弃）            |


### 10.2 `batch1-web-only-20260904/.env` 的风险定性

与当前 `worktrees/develop/.env` 逐键比对（**只比 md5，未读取值**）：

| 类别                         | 键                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠️ **仅此文件有**（develop 完全没有） | `TENCENT_SES_SECRET_ID`、`TENCENT_SES_SECRET_KEY`、`TENCENT_SES_REGION`、`MAIL_FROM`、`PROFILE_PSEUDONYM_SECRET`、`ADMIN_ALLOWED_HOSTS`、`TRUST_CLOUDFLARE_PROXY`、`TYGF_EXECUTION_ENABLED`、`LEARNING_*`（6 个）、`NEXT_PUBLIC_LOCAL_ASSISTANT_VERSION`、`NEXT_PUBLIC_LOCAL_ASSISTANT_DOWNLOAD_URL` |
| ⚠️ **值不同**                 | `ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`、`ALIPAY_APP_ID`、`ALIPAY_SELLER_ID`、`ALIPAY_NOTIFY_URL`、`ALIPAY_RETURN_URL`、`ADMIN_SESSION_SECRET`、`INVITE_CODE_SECRET`、`APP_ORIGIN`、`DATABASE_URL`、`TYGF_LOCAL_ASSISTANT_URL/DIR`、`TYGF_USAGE_PREFIX`、`NEXT_PUBLIC_LOCAL_ASSISTANT_URL`        |

**双重性质**：

- **作为资产**：腾讯 SES 的三个键在本机**只此一份**（`ISSUES.md #14` 记载测试站曾缺 SES 密钥导致注册验证死循环，T-0061 才打通）。删掉可能丢失唯一的本地副本。
- **作为负债**：一份 2026-09-04 的完整密钥集（含支付宝私钥）静静躺在一个废弃 worktree 里，且不受版本控制保护。项目有密钥泄露前科（`ISSUES.md #7`）。

**结论：这个目录不要和其他 15 个一起删。** 二选一：

- **A**：把该 `.env` 移到安全位置（密码管理器 / 服务器侧确认已有）后再删目录；
- **B**：直接保留该目录（多占 1.20 GB，换确定性）。

**我没有复制这份 `.env` 到任何地方** —— 主动扩散密钥不是我的权限范围，这个决定留给 yt。


### 10.3 B 级未提交源码：已归档

B 级 7 个目录中，只有 3 个含真实源码改动，其余 4 个只有 AI_MEMORY/HANDOFF 噪音、未跟踪文档或验证用 DB：

| 目录                                  | 未提交源码                                                                                                                                                  | 状态                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `_verify-ca30524-20260904`          | `execution-batch.ts`(+390/-195)、`execute-step.tsx`(+98)、`v3-batch-flow.ts`、`batch-execution-client.ts`、`execution-recovery.ts`、2 route、3 smoke，共 16 文件 | ✅ 已归档 patch（64,736 字节）        |
| `g4g5-evidence-provenance-20260831` | `smart-review-contract.ts`(+139)、smoke(+128)，+ 未跟踪 `smart-review-split-row.ts`                                                                         | ✅ 已归档 patch（30,775 字节）+ 未跟踪文件 |
| `l9-smart-review-20260831`          | **与上一行内容完全相同**（同 139/128/同未跟踪文件）                                                                                                                       | ✅ 已归档 patch（24,976 字节）+ 未跟踪文件 |
| `c2c3-integration-20260901`         | 无（仅 generated 产物 + 1 个未跟踪文档）                                                                                                                           | 无需归档                          |
| `wave1-release-candidate-20260901`  | 无（仅 3 个未跟踪文档）                                                                                                                                          | 无需归档                          |
| `integration-develop-...`（第二仓库本体）   | 无（脏项全在 AI_MEMORY/docs）                                                                                                                                 | 无需归档                          |
| `feedback-studio-v1-merge-20260901` | 无（仅 4 个验证用 `.db`）                                                                                                                                      | 无需归档                          |

**重要限定**：我比对过这些文件与 `origin/develop` 的版本，**全部不同**；但这些 worktree 的基线本身落后 develop 9 天（`ca30524` @ 09-02 vs develop @ 09-11），所以"不同"**不能证明**它们含 develop 没有的新内容。**我没有做逐行 diff 判定"是否已被取代"** —— 归档 patch 就是为了把这个不确定性变成可逆的。

### 10.4 C 级未并入提交：已归档

| 目录                          | 提交               | patch       |
| --------------------------- | ---------------- | ----------- |
| `a6-identity-b489-20260901` | `f754037`（45 文件） | ✅ 72,736 字节 |
| `a7-billing-b489-20260901`  | `28d64a6`（13 文件） | ✅ 44,182 字节 |

归档位置：`F:\工具开发\图译工坊内测版\backups\worktree-orphan-archive-20260911\`（总计 260 KB）  
恢复方式：`git am <patch>`（C 级）／`git apply <patch>`（B 级未提交改动）。

### 10.5 修正后的可回收量

| 分组                                     | 数量     | 体积           | 前提                   |
| -------------------------------------- | ------ | ------------ | -------------------- |
| A 级（**不含** `batch1-web-only-20260904`） | 15     | **4.66 GB**  | 无，内容可从 develop 完全恢复  |
| `batch1-web-only-20260904`             | 1      | 1.20 GB      | ⛔ 先处理 `.env`（见 10.2） |
| B 级（源码已归档）                             | 7      | **8.98 GB**  | 认可 10.3 的归档即可        |
| C 级（提交已归档）                             | 2      | **2.19 GB**  | 认可 10.4 的归档即可        |
| **合计可回收**                              | **24** | **15.83 GB** |                      |

**本次仍未执行任何删除。** 等 yt 对 10.2 的 `.env` 二选一、并对整体给一次明确 go/no-go。

---

## 11. 补盘（2026-09-11 23:5x）：`.codex/` —— 原盘点漏掉的一整块

### 11.1 为什么漏了

第 206 行已自认「未测量 `.codex/` 下两个 worktree 的体积」。但实测后发现问题**比"没测体积"严重得多**：`.codex/` 下不是 2 个目录，而是 **7 个**，其中 **4 个是独立克隆**（`.git` 是目录，各自带完整 object store），原盘点的 50 个目录里**一个都没有**。

原盘点的「50 个目录」= 48 个 `worktrees/` + 2 个 `.codex/` worktree，而那 2 个的体积**按 0 计入**。

### 11.2 `.codex/` 全量清单（实测）

| 目录                                | `.git` 类型    | 体积         | HEAD      | 分支数 |
| --------------------------------- | ----------- | ---------- | --------- | --- |
| `release-test-5015851-final`      | **DIR 独立克隆** | **1.51 GB** | `5015851` | 1   |
| `release-test-20260802`           | FILE 链接worktree（主仓库） | 904.5 MB   | `77e98d8` | 25  |
| `release-test-20260803-343`       | **DIR 独立克隆** | 576.1 MB   | `5015851` | 1   |
| `release-develop-clone-20260802`  | **DIR 独立克隆** | 323.0 MB   | `6da00de` | 1   |
| `release-test-20260803-343-clean` | **DIR 独立克隆** | 193.1 MB   | `a8ab2b2` | 1   |
| `release-base-20260802`           | FILE 链接worktree（主仓库） | 87.6 MB    | `7f15e89` | 26  |
| `pkg-build-tools`                 | 无 `.git`     | 8.6 MB     | —         | —   |
| **合计**                            |             | **≈3.55 GB** |         |     |

其中 `release-base-20260802`、`release-test-20260802` 是**主仓库 `tygf-v0.1-source` 注册的 worktree**（`git worktree list` 第 2、3 行），不是孤儿；但另外 4 个克隆和 `pkg-build-tools` **完全不在任何注册表里**。

### 11.3 ⚠️ 新发现：1 个不可再生的独有提交

`release-develop-clone-20260802` 的 HEAD `6da00de` **在主仓库和第二仓库的对象库里都不存在**：

```
commit 6da00debc4c68b561e6c81ab12f72667270aa620
Author: newye123 <newye123@users.noreply.github.com>
Date:   Sun Aug 2 21:59:24 2026 +0800
    chore(release): publish test assistant 3.4.2
```

改动 8 个文件，含 `public/downloads/tygf-engine-setup-3.4.2.exe`（**12.5 MB 二进制**）+ `config/release-identity.json` 等版本号提升。父提交 `a8590fee` 在主仓库存在，说明这是**本地打完包后没推的发布提交**。

风险定性：这是**同类于 C 级**的「未推送独有提交」，但内容已被后续版本（现 3.6.40）取代，**业务价值低、不可再生性高**。处置建议：归档 patch + 单独保留那个 12.5 MB exe，或直接确认「3.4.2 无需追溯」后放弃。

### 11.4 其余 3 个克隆：零独有提交 ✅

`5015851`（×2）与 `a8ab2b2` 均为 `develop` 的祖先，`merge-base --is-ancestor` 通过 → **可完全重建**。

### 11.5 修正后的总量

| 口径            | 目录数    | 体积          |
| ------------- | ------ | ----------- |
| 原盘点（worktrees 侧） | 50     | 40.16 GB    |
| `.codex/` 补盘   | +5     | +3.55 GB    |
| **修正后总计**     | **55** | **≈43.7 GB** |

F 盘当前可用 **706 GB**（2.8 T，已用 75%）。清理依然**不紧急**——43.7 GB 占总容量 1.5%。真正的损失风险仍是「未推送提交」，而现在这个集合**从 2 个（a6/a7）扩大到 3 个**（a6/a7 + `6da00de`）。
