# 图译工坊 worktrees 治理与空间回收 · 执行方案

> 编制：砚　日期：2026-09-12
> 方法：Critical Thinking → Fetch（GitHub/官方文档实证）→ Deep Thinking（第一性原理）→ Review（100 条对抗式审查）
> 状态：**待 yt 批准后执行。本方案编制过程中未删除、未移动任何文件。**
> 证据基础：`盘点报告_20260911_worktrees孤儿目录清单与体积.md` + 本次新增实测

---

# 第 0 部分 · Critical Thinking：先质疑问题本身

## 0.1 你问的是"怎么清理 17GB"，但 17GB 不是你的问题

**实测：F 盘 2.8T 总量，已用 2.1T，剩余 695 GB。**

17 GB 占可用空间的 **2.4%**。清理它不会让你脱离任何危险区。如果你的目标是"腾空间"，这个方案不值得做——投入产出比极低。

## 0.2 第一性原理：这个工作区真正的病症是什么

把"worktree 太多"这个表象拆到不可再分，得到三个互相独立的问题：

| 编号 | 真问题 | 本质 | 后果 |
| --- | --- | --- | --- |
| **P1** | **唯一副本暴露** | 本地 `develop` 领先 `origin/develop` **12 个提交未推送**（2026-09-12 08:5x 实测复核）（含 3.6.39/3.6.40 与 T-0117 全部修复） | 这台机器挂了，一天的工作没了。**这是唯一不可重建的损失** |
| **P2** | **认知失真** | 主仓库 `tygf-v0.1-source/` 被 `PROJECT_CONTEXT.md:33` 标为"🔒 历史"；被指定为"唯一活动目录"的 `v1.5-trust-chain` 落后 **204 个提交**；`AI_MEMORY` 存在 **4 份**（2026-09-12 修正：原判 3 份）且最新的那份在 `develop` 分支里、无人被指向 | 任何按文档行事的会话都会**在错误的目录里改代码**，或**删掉整个仓库** |
| **P3** | **结构无生命周期** | 3 个卫星克隆 + 22 个挂靠 worktree + 16 个裸目录，创建时无登记、合并后无回收 | 目录越多，"多窗口串基线"的概率越高（项目已因此出过一次部署事故） |

**17 GB 只是 P3 的副产品。** 只清空间不修 P1/P2，下个月还会长回来，而且你依然可能在某天删掉主仓库。

## 0.3 因此本方案的目标排序（与直觉相反）

```
1. 先保命（P1）  →  2. 再正名（P2）  →  3. 最后回收（P3）
```

**不是**：先删空间 → 再说别的。

---

# 第 1 部分 · Fetch：别人怎么做（GitHub / 官方文档实证）

## 1.1 Git 官方对 `--shared` 的警告（已核实）

`git-clone` 文档原文：

> this is a possibly dangerous operation; do **not** use it unless you understand what it does. If you clone your repository using this option and then delete branches (or use any other Git command that makes any existing commit unreferenced) in the source repository, some objects may become unreferenced (or dangling). These objects may be removed by normal Git operations (such as `git commit`) ... If these objects are removed and were referenced by the cloned repository, then the cloned repository will **become corrupt**.

**本地实测结论（重要修正）**：`HANDOFF.md:8` 记载打包用的是 `git clone --shared`，但实测**两个仓库都没有 `.git/objects/info/alternates`**——对象各自独立，**不存在互相损坏风险**。这条历史记录不准确，但幸运的是没有实际危害。

## 1.2 Worktrunk（GitHub: max-sixty/worktrunk）——专为并行 AI agent 设计

它的定位就是我们现在这个场景：*"a CLI for git worktree management, designed for running AI agents in parallel"*。

五条可直接借鉴的设计：

| # | 做法 | 解决我们哪个问题 |
| --- | --- | --- |
| 1 | **worktree 按分支名寻址**，路径由模板计算（`../repo.feat`），人不需要记路径 | P3：消除"48 个自由命名目录" |
| 2 | **清理是工作流的副产品**：`wt merge` 合并后自动移除 worktree 与分支 | P3 根因：让回收不需要"记得做" |
| 3 | **删除先进 trash**：移除时先重命名到 `.git/wt/trash/`，再异步真删 | 可逆性：删除变成可撤销操作 |
| 4 | **`pre-remove` hook**：移除前跑检查 | 安全门：把"能不能删"自动化 |
| 5 | **共享构建缓存**（`wt step copy-ignored`，APFS/btrfs/XFS reflink）：十个 worktree 共用 `node_modules` 而不复制 | P3：从根上不产生 17 GB |
| 6 | `wt list` 显示 ahead/behind、未推送、staged 状态 | 让"哪些是死目录"一眼可见 |

它的状态枚举里就有 `prunable` / `branch_worktree_mismatch` / `duplicate_branch`——**把"可疑 worktree"当成一等公民来建模**。

## 1.3 社区通行的最佳实践（多来源一致）

- **同级目录模式**：worktree 放在主仓库**旁边**，绝不嵌套在主仓库内部（`gitworktree.org`）。我们的 `worktrees/` 是"父目录聚合"变体，本身不算错，但缺约定。
- **命名镜像分支名**：`myapp-feat-auth` 优于 `worktree-for-the-authentication-feature`。
- **合并即清理**：`git worktree remove` + `git branch -d`，不要攒。
- **`git worktree prune` 定期跑**：清理被手工 `rm -rf` 掉目录留下的元数据。
- **限制并发 worktree 数量**（社区建议 3–5 个）。
- **node_modules 是 worktree 磁盘占用的主因**，pnpm 内容寻址 store 可跨 worktree 去重 60–70%。

## 1.4 我们的实测：`prune` 帮不上忙

```
主仓库  git worktree prune --dry-run  →  0 条
第二仓库 git worktree prune --dry-run  →  0 条
```

**原因**：这 25 个目录里，**22 个是被第二仓库正常注册的 worktree**（不是孤儿），2 个是独立克隆，只有 3 个是"裸目录"。

> **这是对上一份报告的重要修正**：把它们叫"孤儿 worktree"是错的。真正的孤儿只有 `_deploy-b6c9085` 与 `_release-pack-9b3345d-20260909`（且它们其实是独立克隆）。**`prune` 一条也清不掉**——这不是清理问题，是**退役问题**。

---

# 第 2 部分 · Deep Thinking：完整拓扑（实测）

```
F:\工具开发\图译工坊内测版\
│
├── tygf-v0.1-source/                    ★ 主仓库（.git 是目录，object store 所在）
│     remote: GitHub newye123/tygf        pack 255 MB
│     分支 feature/email-auth
│     └── 注册 12 个 worktree，其中 9 个在 worktrees/ 下：
│           v1.5-trust-chain (3.05GB) / develop (16.0GB) / production (375MB)
│           psd-preflight-assistant (1.39GB) / assistant-3.6.22-20260907 (1.10GB)
│           a6-identity-convergence / a7-billing-convergence / sr-patch-test / admin-security
│
└── worktrees/                           50 个目录，40.16 GB
     ├── 主仓库的 9 个链接 worktree（上列）
     ├── 3 个独立克隆（.git 是目录）
     │    ├── integration-develop-.../    23 分支, pack 172MB, 1.90GB  ← 22 个 worktree 挂在它名下
     │    ├── _deploy-b6c9085/            1 分支,  pack 141MB, 333MB
     │    └── _release-pack-9b3345d-.../  1 分支,  pack 144MB, 454MB
     │         └─ remote 指向本地主仓库路径（clone-of-clone）
     ├── 22 个上述克隆的链接 worktree            ← 本次处置主体
     └── 16 个裸目录（无 .git）  0.78 GB
```

## 2.1 独有内容清点（决定性）

| 类别 | 结论 |
| --- | --- |
| 第二仓库 37 个 refs 中，主仓库缺失的 | **仅 2 个**：`codex/a6-identity-b489-20260901`、`codex/a7-billing-b489-20260901` |
| 另两个克隆（`_deploy` / `_release-pack`）的独有 refs | **0 个** |
| 3 个目录的未提交源码改动 | 已归档 patch（260 KB） |
| `batch1-web-only-20260904/.env` | ⚠️ **唯一不可再生**（腾讯 SES 三键、独立支付宝密钥对） |
| git 对象 | 全部可由主仓库或归档 patch 恢复 |

**即：处置这 25 个目录，唯一真正会丢的东西是那一个 `.env` 文件。**

---

# 第 3 部分 · 执行方案

## Step 0 · 保命（最高优先级，先于一切）

| # | 动作 | 命令 | 验收 |
| --- | --- | --- | --- |
| 0.1 | **推送本地 develop 的 12 个未推送提交** | `git -C worktrees/develop push origin develop` | `git rev-list --count origin/develop..develop` = 0 |
| 0.2 | 回读确认远端真的收到 | `git -C tygf-v0.1-source ls-remote origin develop` | SHA 与本地一致 |
| 0.3 | 决定 `batch1-web-only-20260904/.env` 去留 | 见 Step 3-C | 你签字 |

> **0.1 是全方案最高优先级**。17 GB 可以慢慢清，那 12 个提交不能等。
> 注：推送需你授权（项目纪律：push 需 Owner 批准）。

## Step 1 · 正名（消除 P2 的认知失真）

| # | 动作 | 文件 | 说明 |
| --- | --- | --- | --- |
| 1.1 | **修正主仓库标注** | `AI_MEMORY/PROJECT_CONTEXT.md:33` | 把 `tygf-v0.1-source/` 从"🔒 历史／不开发"改为"**★ 主仓库（object store），禁止删除**" |
| 1.2 | 重定"活动目录" | `AGENTS.md`、`PROJECT_CONTEXT.md:28,95` | 二选一：**A** 改为 `worktrees/develop`；**B** 保留 `v1.5-trust-chain` 但加"开工前必须先 `git fetch` 并合并 develop" |
| 1.3 | 记录三仓库拓扑 | `docs/WORKSPACE-MAP.md` | 画上第 2 部分的拓扑图；标注 3 个卫星克隆 |
| 1.4 | 加开工自检 | `AGENTS.md` | `git rev-list --count HEAD..origin/develop` ≠ 0 就停手报告 |
| 1.5 | 修正失效闸门描述 | `PROJECT_CONTEXT.md:62`、`ISSUES.md #4` | `BATCH_EXECUTION_READY` 在代码中已不存在；实际机制是 `TYGF_BATCH_EXECUTION_MODE` |

## Step 2 · 记忆合一（消除 P2 的第二半）

现状：3 份 `AI_MEMORY`——根目录（未入库，09-09）、`codex/v1.5-trust-chain` 内（入库，09-01）、**`develop` 内（入库，09-11，最新）**。

| # | 动作 |
| --- | --- |
| 2.1 | 定 `develop` 内那份为**唯一权威**（它最新、已入库、随分支走） |
| 2.2 | 根目录 `AI_MEMORY/` 降级为**三行指针**（指向 `worktrees/develop/AI_MEMORY/`） |
| 2.3 | `codex/v1.5-trust-chain` 内那份在下次合并 develop 时自动被覆盖 |
| 2.4 | `AGENTS.md` 明确写"记忆只读 `worktrees/develop/AI_MEMORY/`，其它副本一律忽略" |

## Step 3 · 分级回收

### 3-A · 直接回收（19 个，约 10.2 GB）

已并入 develop + 零未提交 + 无独有对象。含 22 个挂靠 worktree 中的 16 个（A 级）+ 2 个已归档的 C 级 + `_deploy-b6c9085`、`_release-pack-9b3345d`（0 独有 refs）。

**执行顺序（不可颠倒）**：
```bash
# 1) 先卸注册（第二仓库自己的，不能混用主仓库命令）
git -C worktrees/integration-develop-.../ worktree remove --force <path>
git -C worktrees/integration-develop-.../ worktree prune -v

# 2) 再删目录
# 3) 最后单独处理 3 个独立克隆（它们不是 worktree，直接删目录 + 确认无独有 refs）
```

### 3-B · 先归档再回收（3 个，约 10.1 GB）

`_verify-ca30524` / `g4g5-evidence-provenance` / `l9-smart-review` / `wave1-release-candidate` / `c2c3-integration` / `feedback-studio-v1-merge` / `integration-develop`（第二仓库本体）

**patch 已归档**（`backups/worktree-orphan-archive-20260911/`，260 KB）。删除后如需恢复：`git apply <patch>`。

> `integration-develop` 本体建议**保留到最后**：它是 22 个 worktree 的宿主，删它之前必须先确保所有挂靠者已卸注册，否则会在别处留下悬空引用。

### 3-C · 单独决策（1 个，1.20 GB）⛔

`batch1-web-only-20260904` —— 因 `.env` 唯一性，**必须二选一**：

- **方案 A**：你把 `TENCENT_SES_SECRET_ID/KEY/REGION`、`PROFILE_PSEUDONYM_SECRET`、支付宝密钥对收进密码管理器（或确认服务器侧已有），我删除该目录。
- **方案 B**：保留该目录，用 `.gitignore` 显式排除其 `.env` 之外无风险，占 1.20 GB 换确定性。

**我不复制这份 `.env` 到任何地方**——主动扩散密钥不在我的权限范围。

### 3-D · 保留不动

- 主仓库 `tygf-v0.1-source/`（禁止删除）
- `worktrees/develop`（活跃）
- `worktrees/production`（冻结的生产基线）
- 主仓库注册的其余活跃 worktree

## Step 4 · 防复发（这一步决定方案成败）

| # | 机制 | 落地方式 |
| --- | --- | --- |
| 4.1 | **命名即归属** | 约定 `wt-<分支名>` 前缀；独立克隆一律叫 `<用途>-clone-<日期>`，禁止裸名 |
| 4.2 | **登记表** | `docs/WORKSPACE-MAP.md` 维护一张表：路径 / 仓库 / 分支 / 创建日期 / 用途 / 负责人 / 状态 |
| 4.3 | **合并即回收** | 分支合并进 develop 后，同一 PR/提交内 `git worktree remove` |
| 4.4 | **并发上限** | 同时活跃 worktree ≤ 5；超了先回收再新建 |
| 4.5 | **周期性体检** | 每月一次只读脚本：列出所有 worktree 的 ahead/behind、未提交、未推送、体积，输出报告不自动删 |
| 4.6 | **node_modules 去重** | 评估迁移 pnpm（内容寻址 store 跨 worktree 去重 60–70%），从根上不再产生 17 GB |
| 4.7 | **`pre-remove` 式自检** | 写一个 `scripts/wt-audit.mjs`：删除前自动检查 unmerged / dirty / 未跟踪 / 被忽略的敏感文件（`.env`） |

> **4.7 是针对本次教训的直接产物**：`git status` 看不见 `.gitignore` 掉的文件，这正是差点让 `batch1-web-only/.env` 被误删的原因。

---

# 第 4 部分 · Review：100 条对抗式审查

> 对上述方案逐条自我攻击。✅=方案已覆盖　⚠️=需补充　❌=方案有错

## A 组 · 事实与前提（1–10）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 1 | "17GB 不紧急"会不会让你低估了清理的价值？ | ✅ 已量化：占可用 2.4%。价值在 P2/P3 不在 P1 |
| 2 | 695GB 空闲是实测还是缓存？ | ⚠️ `df` 单次读数，未复测。执行前应复测 |
| 3 | 25 个目录的清单会不会已经过期？ | ⚠️ 数据采集于 09-11 23:30。**执行前必须重新采集**（期间 develop 又有提交） |
| 4 | 体积数据可信吗？ | ✅ 两法交叉验证（du 与 .NET 枚举）误差 <5% |
| 5 | "只有 2 个独有 refs"会不会漏了 detached HEAD？ | ⚠️ 未检查各 worktree 的 detached HEAD 是否含独有提交。需补 |
| 6 | 归档 patch 能真正恢复吗？ | ⚠️ **未实际演练 `git apply`/`git am`**。必须演练一次 |
| 7 | 第二仓库的 reflog 里有独有提交吗？ | ⚠️ 未查 reflog。`git fsck --lost-found` 也未跑 |
| 8 | stash 里有东西吗？ | ❌ **未检查任何仓库的 stash**。必须补 |
| 9 | 其他分支的 worktree 是否还有第三份未提交内容？ | ✅ 已逐目录 `git status`，仅 7 个有脏项且已分类 |
| 10 | 未跟踪但未被 `.gitignore` 覆盖的文件查了吗？ | ✅ `git status --porcelain` 的 `??` 已列出（c2c3/wave1/g4g5 等） |

## B 组 · 数据丢失风险（11–20）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 11 | 删 worktree 会连带删掉未推送的分支吗？ | ✅ 不会。分支在 `.git` 里，与工作目录分离 |
| 12 | 删第二仓库会丢分支吗？ | ⚠️ 会丢 a6/a7 两个——**已归档**，但需演练恢复 |
| 13 | `.env` 之外还有被忽略的敏感文件吗？ | ❌ **只查了 `.env*`**。未查 `*.pem`、`*.key`、`credentials*`、`db/custom.db`。必须补 |
| 14 | `db/custom.db`（各 worktree 的本地库）里有独有数据吗？ | ❌ **未检查**。可能含真实测试批次/积分数据 |
| 15 | 用户素材（PSD/CSV/报告）在废弃 worktree 里吗？ | ⚠️ 抽查过 A 级未发现，但未全量查 `遇到的问题/`、输出目录 |
| 16 | 删除会不会触发 git 的自动 gc 清掉 dangling 对象？ | ✅ 不会——gc 只动 unreachable 对象，且我们保留了 patch |
| 17 | 归档 patch 放在 `backups/`，而 `backups/` 本身在"不开发"目录里，会被误清吗？ | ❌ **风险真实**。应移到独立、明确标注的位置并写进 WORKSPACE-MAP |
| 18 | patch 里含密钥吗？ | ⚠️ `_verify-ca30524` 的 patch 含 AI_MEMORY/HANDOFF 改动，需扫一遍是否有明文密钥 |
| 19 | 如果 `batch1-web-only/.env` 里的 SES 键是测试站正在用的，删了会怎样？ | ⚠️ 不会立即故障（服务器有自己的 `.env`），但会丢失唯一的本地恢复副本 |
| 20 | 删除过程中断电/中断会怎样？ | ⚠️ 逐目录串行 + 每步校验；建议先做 trash 重命名而非直接删 |

## C 组 · git 机制（21–30）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 21 | `git worktree remove` 对 dirty worktree 会拒绝，怎么办？ | ✅ 已识别：对 3 个 dirty 目录先归档再 `--force` |
| 22 | `--force` 会跳过哪些检查？ | ⚠️ 会跳过 dirty 检查。**必须人工确认后才用**，且只在已归档后 |
| 23 | 两个仓库的 `worktree prune` 能混用吗？ | ✅ 方案已明确禁止混用 |
| 24 | 删掉 `integration-develop` 后，它 `.git/worktrees/` 里的注册项会怎样？ | ⚠️ 随目录一起消失，但**必须先把挂靠者卸干净**，否则 git 元数据可能残留指向 |
| 25 | 会不会有两个 worktree 检出同一分支导致 remove 失败？ | ⚠️ 未检查分支占用冲突。执行前应 `git worktree list` 比对 |
| 26 | `_release-pack-9b3345d` 的 remote 指向本地主仓库路径，删了会影响主仓库吗？ | ✅ 不会（它只是消费者），但**主仓库路径若变更会破坏它**——这是保留它的理由之一 |
| 27 | 删除会不会影响主仓库的 `git gc` 性能？ | ✅ 反而改善（原文档指出 gc 要扫描所有 worktree） |
| 28 | Windows 路径长度限制会成为障碍吗？ | ⚠️ 部分目录名极长（`integration-develop-20260831-98d4f9508ac548e9a2a982dbf9a71bc7`）。删除时可能触发 MAX_PATH。需用 `\\?\` 前缀或 PowerShell |
| 29 | 文件被占用（编辑器/PM2/DevServer 锁住）会删不掉吗？ | ❌ **未检查是否有进程占用这些目录**。必须先查 |
| 30 | 只读文件/长路径会让 `rm -rf` 部分失败吗？ | ⚠️ 需逐目录校验删除结果，失败即停 |

## D 组 · 仓库拓扑（31–40）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 31 | 会不会还有第 4 个克隆藏在别处？ | ❌ **未全盘搜索**。应在整个工作区搜 `.git` 目录（非文件） |
| 32 | `tygf-v0.1-source` 作为主仓库，这个结论会不会反转？ | ✅ 已用 `v1.5-trust-chain/.git` 的 `gitdir` 内容直接证实 |
| 33 | 主仓库为什么在"v0.1-source"这个误导性名字下？ | ⚠️ 历史原因。方案只改文档不改路径（改名风险远大于收益） |
| 34 | `.codex/` 下那两个 worktree 算进去了吗？ | ⚠️ 未测体积、未纳入处置。需明确列为"保留"或"待评估" |
| 35 | 主仓库还有 3 个 worktree 在 `worktrees/` 之外（`tygf-v0.1-source`、`.codex/`×2） | ⚠️ 需补进 WORKSPACE-MAP |
| 36 | `worktrees/develop` 16 GB 是最大单点，能瘦身吗？ | ⚠️ 可（node_modules + .next + db），但它是活跃目录，需单独方案 |
| 37 | 3 个卫星克隆是"流程产物"还是"意外"？ | ✅ 有据：`HANDOFF.md:8` 记载了 `git clone --shared` 打包流程 |
| 38 | 删掉卫星克隆会不会破坏某个自动化脚本？ | ❌ **未搜索引用**。需 grep 脚本里是否硬编码了这些路径 |
| 39 | `release-staging/`、`releases/`、`safety-snapshots/` 是否同类问题？ | ⚠️ 未评估（另有 5 tar / 222 文件 / 16 快照） |
| 40 | 工作区根还有 `tygf_deploy_*.zip`、`tygf-code-*.zip` 等 | ⚠️ 未计入本次范围 |

## E 组 · 文档与记忆（41–50）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 41 | 改 `PROJECT_CONTEXT.md` 算不算"动规范文档"（项目纪律禁止）？ | ⚠️ 纪律说"不动既有方案文档除非明确要求"。**本方案即明确要求**，但需你确认 |
| 42 | 三份 AI_MEMORY 合一，会不会丢掉根目录版里独有的内容？ | ❌ **未做三方 diff 全量比对**。09-09 那份可能有 develop 版没有的条目 |
| 43 | `develop` 内那份会不会随分支删除而消失？ | ⚠️ 若将来删 develop 分支会。应同时把关键内容提交到主仓库 |
| 44 | 记忆指向 `worktrees/develop/AI_MEMORY/`，若 develop worktree 被重建呢？ | ⚠️ 路径依赖。更稳的做法是指向**仓库内相对路径**而非绝对路径 |
| 45 | 修正 `PROJECT_CONTEXT.md:33` 后，旧文档里的其它引用还一致吗？ | ⚠️ 需 grep 全仓库搜 `tygf-v0.1-source` 找出所有描述处 |
| 46 | `ISSUES.md` 有两个 #33、头部日期错，本方案管吗？ | ⚠️ 应纳入 Step 1（顺手修） |
| 47 | `HANDOFF.md:66` 的乱码残句 | ⚠️ 同上 |
| 48 | 文档改了之后，谁负责同步到另外两份副本？ | ✅ Step 2.2 已定"根目录降级为指针"消除双写 |
| 49 | "开工自检"写成规则，会不会被忽略？ | ⚠️ 规则不如工具。建议同时提供 `scripts/wt-audit.mjs` 一条命令 |
| 50 | 本方案本身要存哪？ | ⚠️ 建议 `docs/plans/`，并登记进 WORKSPACE-MAP |

## F 组 · 多窗口协作（51–60）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 51 | 执行删除时若有其他窗口正在这些目录里工作？ | ❌ **未做占用检测**。必须先确认无活跃会话 |
| 52 | 项目历史上已有一次"多窗口串基线"部署事故 | ✅ 方案 Step 0 先推送，正是为隔离风险 |
| 53 | 删目录会不会让某个窗口的编辑器会话崩溃？ | ⚠️ 会的。应提示先关闭相关窗口 |
| 54 | 并发上限 5 条规则如何执行？ | ⚠️ 无强制手段，靠约定 + 周期体检报告 |
| 55 | 如何知道哪个 worktree 是"当前有人在用"？ | ❌ **无机制**。建议用 `git worktree lock` 标记活跃，或维护登记表 |
| 56 | 若两窗口同时跑回收脚本？ | ⚠️ 脚本应加锁文件（`.wt-audit.lock`） |
| 57 | 登记表靠人维护，会不会烂？ | ⚠️ 会。更好的做法是脚本自动生成 + 人只填"用途" |
| 58 | 删除后 `git worktree list` 输出会干净吗？ | ⚠️ 需实测验证；预期主仓库剩 12 个、第二仓库剩 1 个 |
| 59 | 与 HANDOFF 的"当前占用"字段如何联动？ | ⚠️ 应把回收动作写进 HANDOFF 偏差登记 |
| 60 | 若 yt 在另一个 AI 窗口同时改代码？ | ⚠️ 执行窗口需独占；建议回收期间冻结开发 |

## G 组 · 执行安全（61–70）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 61 | 批量删除脚本写错了会不会误删主仓库？ | ⚠️ **最高风险**。方案应：① 白名单硬编码 25 个路径；② 断言路径必须以 `worktrees/` 开头；③ 断言不含 `tygf-v0.1-source` |
| 62 | 通配符 `rm -rf worktrees/*` 会怎样？ | ❌ **绝对禁止**。方案必须明令禁止通配符 |
| 63 | 是否应该先做"trash 重命名"再删？ | ✅ 强烈建议（借鉴 worktrunk）：先 `mv` 到 `_trash-20260912/`，观察一周再真删 |
| 64 | 重命名会破坏 worktree 注册吗？ | ⚠️ 会。所以顺序应是"先 `worktree remove` 卸注册，再 `mv` 到 trash" |
| 65 | 每批多少合适？ | ✅ 建议每批 ≤ 5 个，每批后校验 |
| 66 | 失败即停还是继续？ | ✅ 失败即停（个人文件安全纪律同样适用） |
| 67 | 需要备份吗？ | ✅ 归档 patch（已做）+ 建议对 A 级做一次目录清单快照（已做） |
| 68 | 删除操作需要记录吗？ | ⚠️ 必须。生成 `docs/records/20260912_worktree回收执行记录.md` |
| 69 | 谁批准？ | ✅ 需 yt 逐项批准，特别是 Step 0.1 推送与 Step 3-C |
| 70 | 能回滚吗？ | ⚠️ 真删后**不可回滚**；trash 方案可回滚。**这是选 trash 的核心理由** |

## H 组 · 密钥与合规（71–80）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 71 | 除 `.env` 外还有明文密钥散落吗？ | ❌ 未扫。应 grep `sk-`、`AKID`、`BEGIN PRIVATE KEY`、`LTAI` 等模式 |
| 72 | `staging-site-access.txt` / `test-site-access.txt` / `key/` 有保护吗？ | ❌ **未被 `.gitignore` 覆盖**（`check-ignore` 返回 1），靠"没人 add"兜底 |
| 73 | 应加 `.gitignore` 规则吗？ | ✅ 是。低风险高收益：`*-site-access.txt`、`key/`、`.env`、`*.pem` |
| 74 | 归档 patch 含密钥吗？ | ⚠️ 见 #18，需扫描 |
| 75 | 删除废弃 worktree 是降低还是提高泄露面？ | ✅ **降低**——移除 8 份陈旧 `.env` 副本 |
| 76 | 项目有密钥泄露前科（ISSUES #7），本次是否应顺带做密钥轮换评估？ | ⚠️ 建议纳入，但不属本方案范围 |
| 77 | 归档目录 `backups/` 会不会被打进发布包？ | ❌ **未验证**。需确认发布脚本的排除规则 |
| 78 | `_verify-ca30524` 的 patch 含 AI_MEMORY 改动，里面提到过密钥吗？ | ⚠️ 需扫 |
| 79 | 删除后服务器/测试站会受影响吗？ | ✅ 不会——这些目录不参与部署（部署源是 develop worktree） |
| 80 | 合规上是否需要告知团队？ | ⚠️ 单人项目，不适用 |

## I 组 · 可逆性与回滚（81–90）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 81 | 恢复一个被删的 worktree 需要什么？ | `git worktree add <path> <branch>` + `git apply <patch>`（若曾有未提交改动） |
| 82 | 恢复 `_verify-ca30524` 的 16 个未提交改动可行吗？ | ⚠️ 未演练。**必须演练** |
| 83 | 恢复 a6/a7 两个分支可行吗？ | ⚠️ 未演练。`git am` 到新分支，需验证 commit message/SHA 一致性 |
| 84 | patch 与目录同时丢失怎么办？ | 无解。**这是把 patch 放到独立位置（#17）的理由** |
| 85 | trash 方案下回滚成本？ | 一条 `mv` 命令 |
| 86 | 回滚后 worktree 需要重新 `npm install` 吗？ | ✅ 不需要（目录整体还在）——trash 相对"删+重建"的关键优势 |
| 87 | 删掉 `integration-develop` 后想恢复 22 个 worktree？ | ⚠️ 需要重新 clone + 逐个 add。成本高。**这是把它放到最后删的理由** |
| 88 | 归档 patch 的 SHA 记录了吗？ | ❌ **未记录**。应生成 manifest 含每个 patch 的 SHA-256 |
| 89 | 回滚演练做几次？ | ✅ 建议至少 1 次全流程（apply a6 patch 到临时分支） |
| 90 | 有"一键回滚"吗？ | ⚠️ 可以写：`scripts/wt-restore.mjs --from-archive` |

## J 组 · 长期防复发（91–100）

| # | 攻击 | 结论 |
| --- | --- | --- |
| 91 | 清理完多久会重新长回来？ | ⚠️ 若无 Step 4，**一周内**。这是本方案最该被检验的假设 |
| 92 | 谁会执行"合并即回收"？ | ⚠️ 多窗口 AI 会话，靠 AGENTS.md 规则。**规则易被忽略** |
| 93 | 能否自动化？ | ✅ 建议 git hook（`post-merge`）自动移除已合并 worktree |
| 94 | 周期体检的频率？ | ✅ 每月；建议同时在看板/备忘设提醒 |
| 95 | pnpm 迁移值得吗？ | ⚠️ 需评估：项目已有 `bun.lock` + `package-lock.json` 并存，再加 pnpm 会三头马车 |
| 96 | 并发上限 5 会不会太紧？ | ⚠️ 社区建议值，需按实际并行窗口数调整 |
| 97 | 命名约定如何强制？ | ⚠️ 靠约定；可加 `pre-worktree-add` 包装脚本 |
| 98 | 如何度量防复发是否生效？ | ✅ 指标：`worktrees/` 目录数、总占用、90 天未访问目录数 |
| 99 | 本方案本身会过期吗？ | ⚠️ 会。应在 30 天后复查一次并更新 |
| 100 | 最重要的一条攻击是什么？ | ✅ **"只做 Step 3（清空间）不做 Step 0/1/2"** —— 那样你既没解决真问题，又增加了拓扑混乱。**Step 0 必须先于一切** |

## 审查汇总

| 组 | ✅ 已覆盖 | ⚠️ 需补充 | ❌ 方案有错/遗漏 |
| --- | --- | --- | --- |
| A 事实前提 | 4 | 5 | 1 |
| B 数据丢失 | 2 | 6 | 2 |
| C git 机制 | 5 | 5 | 0 |
| D 仓库拓扑 | 3 | 6 | 1 |
| E 文档记忆 | 2 | 8 | 0 |
| F 多窗口 | 1 | 7 | 2 |
| G 执行安全 | 6 | 4 | 0 |
| H 密钥合规 | 3 | 4 | 3 |
| I 可逆回滚 | 3 | 6 | 1 |
| J 防复发 | 3 | 6 | 1 |
| **合计** | **32** | **57** | **11** |

**11 条 ❌ 是必须在执行前补掉的硬缺口 —— 已全部补齐，见第 6 部分**：

| # | 缺口 | 补齐结论 |
| --- | --- | --- |
| 1 | (#8) 未检查任何仓库的 stash | ✅ 主仓库 1 条，**内容为 `generated/` 构建产物，可再生**；其余 3 仓库 0 条 |
| 2 | (#13) 未查 `.env` 以外的敏感文件 | ✅ 25 目录内**零命中**（无 `*.pem`/`*.key`/`credentials*`/`id_rsa*`/`*.jks`） |
| 3 | (#14) 未检查各 worktree 的 `db/*.db` | ✅ 所列目录内**零命中** |
| 4 | (#17) 归档 patch 放在 `backups/` 的位置风险 | ✅ 位置确认安全（`backups/` 未被任何仓库跟踪、不进发布包）；但需在归档目录内加 `README` 防误清 |
| 5 | (#29) 未检查目录是否被进程占用 | ⚠️ **发现 1 个孤儿进程**（PID 49564，占 8491 端口，CWD 已不存在）；**无任何进程锁定目标目录** |
| 6 | (#31) 未全盘搜索是否还有第 4 个克隆 | ❌ **不止第 4 个——`.codex/` 下另有 4 个独立克隆**，共 3.55 GB，且含 **1 个独有提交** |
| 7 | (#38) 未 grep 脚本硬编码路径 | ✅ 根目录 + `private-ops/` + `tmp/` 脚本**零命中**，删除不打断自动化 |
| 8 | (#42) 未做 AI_MEMORY 全量 diff | ❌ **实为 4 份不是 3 份，且没有一份完整**，需按文件级合并（见第 6 部分） |
| 9 | (#51) 未做窗口占用检测 | ✅ 26 个 node 进程全部为 IDE/MCP/Adobe/Codex/Tabbit 工具进程，无一跑在目标目录 |
| 10 | (#62) 通配符删除风险 | ✅ 方案已明令禁止通配符（Step 3 全部为逐条精确路径） |
| 11 | (#71/#77) 密钥扫描 / `backups` 进发布包 | ⚠️ **发现明文密钥散落**（`key/` + 2 个 `*-site-access.txt`）；`backups/` **确认不进发布包** ✅ |

**两条 ❌ 补出的是「新问题」而非「方案错误」**——#31 和 #42 说明原盘点的边界本身画错了，已回写进盘点报告第 11 节。

---

# 第 5 部分 · 建议执行顺序（含前置补齐）

> 2026-09-12 修订：**新增 Step 0.5（密钥收口）与 Step 1.5（分支收口）**。理由——不可逆风险（未推送提交、明文密钥）优先于空间回收；而分支是内容的索引，必须早于目录回收。

```
【前置补齐】 11 项缺口检查（已完成，见第 6 部分）
     ↓
Step 0    推送 develop 12 个提交         ← 需你授权。唯一「机器挂了就没了」的东西
     ↓
Step 0.5  明文密钥收口                    ← 需你决策。泄漏风险，与清理无关但更紧急
          key/SecretKey.csv · key/新建子用户信息.csv
          staging-site-access.txt · test-site-access.txt
     ↓
Step 1    文档正名（主仓库标注 / 活动目录 / 拓扑图）
     ↓
Step 1.5  分支收口                        ← 新增，见第 7 部分
          1.5-A 删 12 个 A 类分支（零风险）
          1.5-B 判读 10 个未落地提交（2 个 B 类 + 8 个 C 类）
          1.5-C 2 个长生命周期分支单独决策
          1.5-D 第二仓库 23 个分支过一遍（待补 cherry 分析）
     ↓
Step 2    记忆合一（按文件级合并，见 6.2）
     ↓
Step 3    分级回收（分支定案后，这一步变成机械操作）
          3-A 先 trash 重命名 → 观察 → 真删
          3-B 已归档的
          3-C batch1-web-only（等你对 .env 的决定）
          3-D integration-develop 本体
          3-E .codex/ 4 个独立克隆 + pkg-build-tools（新增，见 6.1）
     ↓
Step 4    防复发机制 + 生成 wt-audit 脚本
     ↓
【独立待办】 kill 孤儿进程 PID 49564（占 8491 端口 34h）
【记录】     docs/records/20260912_worktree回收执行记录.md
```

**不可逆程度排序**（这是本方案真正的优先级依据）：

| 优先级 | 事项 | 为什么 |
| --- | --- | --- |
| 1 | Step 0 推送 12 个提交 | 唯一无法重建的损失 |
| 2 | Step 0.5 密钥收口 | 泄漏不可撤回 |
| 3 | Step 1.5 分支收口 | 10 个未落地提交可能含安全/资金改动 |
| 4 | Step 2 记忆合一 | 决定后续会话是否还在错误目录里干活 |
| 5 | Step 3 目录回收 | 43.7 GB 占 2.8 T 的 1.5%，**不紧急** |

---

# 第 6 部分 · 缺口补齐结果（2026-09-11 23:5x 执行，全只读）

补齐过程**未删除、未移动、未 `worktree remove`、未 `prune` 任何东西**。以下按缺口编号给出实测结论，**三条改变了方案本身**。

## 6.1 【改变方案】#31 → `.codex/` 下另有 4 个独立克隆，共 3.55 GB

原盘点第 206 行自认「未测 `.codex/` 下两个 worktree 的体积」，实际那里有 **7 个目录**：

| 目录 | `.git` 类型 | 体积 | HEAD |
| --- | --- | --- | --- |
| `release-test-5015851-final` | **DIR 独立克隆** | **1.51 GB** | `5015851` |
| `release-test-20260802` | FILE 链接 worktree（主仓库注册） | 904.5 MB | `77e98d8` |
| `release-test-20260803-343` | **DIR 独立克隆** | 576.1 MB | `5015851` |
| `release-develop-clone-20260802` | **DIR 独立克隆** | 323.0 MB | `6da00de` ⚠️ |
| `release-test-20260803-343-clean` | **DIR 独立克隆** | 193.1 MB | `a8ab2b2` |
| `release-base-20260802` | FILE 链接 worktree（主仓库注册） | 87.6 MB | `7f15e89` |
| `pkg-build-tools` | 无 `.git` | 8.6 MB | — |
| **合计** | | **≈3.55 GB** | |

**修正后总量：55 个目录 / ≈43.7 GB**（原口径 50 个 / 40.16 GB，其中 `.codex` 两目录体积按 0 计入）。

### ⚠️ 新增 1 个不可再生提交

`release-develop-clone-20260802` 的 HEAD `6da00de` 在主仓库与第二仓库的对象库里**都不存在**：

```
chore(release): publish test assistant 3.4.2
8 文件改动，含 public/downloads/tygf-engine-setup-3.4.2.exe（12.5 MB 二进制）
父提交 a8590fee 在主仓库存在 → 本地打完包没推
```

内容已被 3.6.40 取代，业务价值低但**不可再生**。处置需你单独拍板（归档 or 明确放弃）。

其余 3 个克隆（`5015851`×2、`a8ab2b2`）经 `merge-base --is-ancestor` 验证**均为 develop 祖先，零独有提交** ✅。

## 6.2 【改变方案】#42 → AI_MEMORY 实为 4 份，且**没有一份完整**

| 文件 | 根 `AI_MEMORY/` | `v1.5-trust-chain/` | `develop/` | `integration-develop/` |
| --- | --- | --- | --- | --- |
| `CURRENT_STATUS.md` | 84 行 | 78 行 | **187 行** ⭐ | 96 行 |
| `PROJECT_CONTEXT.md` | 101 行 ⚠️旧 | 106 行 | 106 行 | 106 行 |
| `ISSUES.md` | 303 行 | 303 行 | **482 行** ⭐ | 372 行 |
| `CHANGELOG.md` | 138 行 | 155 行 | **233 行** ⭐ | 169 行 |
| `TASK_LOG.md` | **1158 行** ⭐ | 683 行 | 963 行 | 694 行 |

（`develop/` 与 `integration-develop/` 的 `PROJECT_CONTEXT.md` md5 完全相同 = `461a329475d5`；根目录那份是 101 行的旧版，即含前述致命错误的那份。）

**结论：Step 2「记忆合一」不能简单"选一份当权威"，必须按文件级合并**：

- `TASK_LOG.md` → 取**根目录版**（1158 行，历史最全）
- `CURRENT_STATUS.md` / `ISSUES.md` / `CHANGELOG.md` → 取 **`develop/` 版**（三项均为最长、最新）
- `PROJECT_CONTEXT.md` → 取 **`develop/` 版**（106 行，已修正根目录 101 行版的错误）

合并后建议：`AI_MEMORY/` 只保留**一份**（容器仓库已跟踪它，7 个文件之一），其余三处通过软链或明确声明「非权威，勿读」处理。

## 6.3 【改变方案】#71 → 发现明文密钥散落（新 P1）

容器仓库**只跟踪 3 个顶层条目**（`AGENTS.md` / `AI_MEMORY` / `WORKSPACE-MAP.md`，共 7 文件），其余全部是 `??` untracked。因此下列文件**未入库**，但明文躺在磁盘上：

| 文件 | 内容性质 | 入库状态 |
| --- | --- | --- |
| `key/SecretKey.csv` | 5 行，表头 `SecretId / SecretKey` | 未跟踪 ✅ |
| `key/新建子用户信息.csv` | `Username,Password,SecretId,SecretKey,LoginURL` | 未跟踪 ✅ |
| `staging-site-access.txt` | 431 B 站点访问凭据 | 未跟踪 ✅ |
| `test-site-access.txt` | 175 B 站点访问凭据 | 未跟踪 ✅ |

风险：不入库 ≠ 安全。这些文件会被**磁盘快照、目录打包、归档 zip、云端同步**带走；也与项目「密钥纪律」（只放环境变量或后台 `ApiCredential`）直接冲突。

**处置建议（独立于 worktree 回收，建议优先）**：收进密码管理器 → 删除明文文件。**注意：归档 patch 中不得包含这些文件**——已实测本次归档的 5 个 patch **零密钥命中** ✅。

## 6.4 其余缺口：结论与风险降级

| # | 结论 | 影响 |
| --- | --- | --- |
| #8 stash | 主仓库 1 条（`pre-batch1-merge generated artifacts`），改动 4 个 `download/local-assistant/generated/*` 文件；其余 3 仓库 0 条 | **风险降为无害**：纯构建产物，`npm run build` 可再生 |
| #13 敏感文件 | 25 目录内无 `*.pem`/`*.key`/`credentials*`/`id_rsa*`/`*.jks` | 干净 ✅ |
| #14 db 文件 | 所列目录内无 `db/*.db` | 干净 ✅ |
| #29 进程占用 | **无任何进程锁定目标目录**（无 `.git/index.lock`；26 个 node 进程命令行均不指向目标） | 删除路径通畅 ✅ |
| #29 附带发现 | **孤儿进程 PID 49564**：`node tmp\browser-evidence\harness-server.mjs`，2026-09-10 13:30 启动，已跑 34 小时，占 **8491 端口**且仍在应答（HTTP 404）；其所在 `tmp/browser-evidence/` 目录**已不存在** | 需单独 kill，不影响回收 |
| #38 脚本硬编码 | 根目录 + `private-ops/` + `tmp/` 全部脚本**零命中** | 删除不打断任何自动化 ✅ |
| #51 窗口占用 | 26 个 node 进程逐一核对命令行，全为 Adobe/Codex/MCP/Workbench 工具进程 | 无 IDE 占用目标目录 ✅ |
| #77 发布包 | 容器仓库只跟踪 7 文件；`package-release.cjs` 打包 `git rev-parse HEAD^{tree}` → **未跟踪内容（含 `backups/`）不会进发布包** ✅ | `backups/` 位置安全 |
| #17 归档位置 | 位置本身安全（见上）；**但缺一个 `README` 说明用途**，防未来被当垃圾清掉 | 需补 1 个文件 |

## 6.5 补齐后的方案变更摘要

1. **Step 3 增加 3-E 组**：`.codex/` 下 4 个独立克隆（2.65 GB）+ `pkg-build-tools`（8.6 MB），但其中 `release-develop-clone-20260802` 含独有提交 `6da00de`，**需先归档再删**。
2. **Step 2 从"选一份"改为"按文件级合并"**（映射见 6.2）。
3. **新增 Step 0.5**：明文密钥收口（`key/` + 2 个 `*-site-access.txt`），建议先于所有删除动作。
4. **新增一条独立待办**：kill 孤儿进程 PID 49564。
5. **总量修正**：可回收量从 15.83 GB 上调，`.codex` 侧另有约 **2.65 GB** 可回收（扣除需归档的那 323 MB 后约 2.33 GB）。

---

# 第 7 部分 · 分支收口（2026-09-12 新增，优先级高于目录回收）

## 7.1 为什么必须先做分支再做目录

**分支是"内容"的索引，目录是"内容"的实体。** 先删目录的话，分支还在却 checkout 不出来，反而制造新的悬空引用；先把分支的去留定下来，目录回收就退化成纯机械操作。

## 7.2 分支现状（实测）

| 仓库 | 本地分支 | 远端跟踪 |
| --- | --- | --- |
| `tygf-v0.1-source`（主） | 25 | 15 |
| `integration-develop-…`（第二） | 23 | 14 |
| `_deploy-b6c9085` | 1 | 1 |
| `_release-pack-9b3345d` | 1 | 1 |
| `.codex/` 4 个独立克隆 | 各 1 | 1 / 14 / 1 / 14 |
| **本地合计** | **54** | — |

去重后唯一分支名 **57 个**。

## 7.3 主仓库 24 个非 develop 分支的分类（`git cherry` 实测）

### A 类 · 可零风险删除（12 个）

**A1 · 已并入 develop（`merge-base --is-ancestor` 通过，6 个）**

`chore/recovery-baseline` · `codex/batch-execution-closure-20260909` · `codex/c2c3-integration-20260901` · `codex/release-2b46fbb` · `codex/user-profile-p0` · `codex/verification`

**A2 · 未合并但改动已全部等价进 develop（`git cherry` 未进数 = 0，6 个）**

| 分支 | 已进/未进 |
| --- | --- |
| `codex/environment-isolation` | 1 / 0 |
| `codex/test-report-20260802` | 1 / 0 |
| `codex/user-profile-contract` | 2 / 0 |
| `codex/admin-access-gate` | 2 / 0 |
| `codex/patch-smart-review-20260830` | 1 / 0 |
| `codex/a6-identity-convergence-20260901` | 1 / 0 |

> A2 这 6 个正是"干完没收拾"的典型：改动通过 squash/cherry-pick 进了 develop，但分支指针留着，`is-ancestor` 判否，于是看起来像"未完成的工作"。

### B 类 · 部分已进（2 个，需看未进的那部分）

| 分支 | 已进/未进 | 未进的提交 |
| --- | --- | --- |
| `codex/credit-settlement` | 3 / 1 | `4d46e3c` fix(billing): enforce absolute report deadline（08-01） |
| `codex/assistant-3.6.22-20260907` | 1 / 1 | `122b872` fix(release): close Next route and assistant smoke gates（09-07） |

### C 类 · 改动完全未进 develop（8 个分支 / 10 个提交，**必须逐个判读**）

| 分支 | 未进提交 | 日期 | 风险归类 |
| --- | --- | --- | --- |
| `codex/admin-security` | `2a554c9` feat(admin): enforce named fail-closed access<br>`3520e32` fix(deploy): remove shared admin password bootstrap<br>`2beb180` fix(admin): enforce production access gates | 08-01 | 🔴 **安全/权限** |
| `codex/a7-billing-convergence-20260901` | `67a983e` feat(billing): converge payment credits refunds and reservations | 09-01 | 🔴 **资金** |
| `codex/smart-review-cost-guard-cg1-20260908` | `a21b281` fix(review): enforce Smart Review cost guard | 09-08 | 🟠 **近期功能** |
| `codex/user-profile-p0-v2` | `ceafc1c` feat: add privacy-safe user profiles | 08-04 | 🟠 功能 |
| `codex/psd-preflight-assistant` | `7bfb8e5` docs: problem retrospective for 2026-08-05 | 08-05 | 🟡 文档 |
| `codex/v1.5-trust-chain` | `4ad008c` docs(handoff): homepage v5.6 round-2 fixes deployed (ee6add0) | 09-10 | 🟡 文档 |
| `codex/recovery-email-auth-20260801` | `6e721df` chore(recovery): preserve mixed email auth workspace | 08-01 | ⚪ 临时保存 |
| `codex/recovery-develop-ui-20260801` | `4d102e6` chore(recovery): preserve local develop UI workspace | 08-01 | ⚪ 临时保存 |

> ⚠️ `codex/v1.5-trust-chain` 的未进提交 `4ad008c` **正是当前"活动目录" worktree 的 HEAD**。也就是说：被文档指定为"唯一活动目录"的那个目录，它自己的分支头有一个 commit 不在 develop 里。这解释了为什么它落后 develop 204 个提交却仍有独有内容。

### 两个长生命周期分支（不按 lane 处理）

- `feature/email-auth`：领先 13 / 落后 452
- `main`：领先 5 / 落后 457

## 7.4 执行顺序

```
7-A  删 12 个 A 类分支（零风险）
      主仓库: git branch -d <每个>      ← -d 而非 -D，git 会自己复核是否已并入
      注意: A2 那 6 个因未真正 merge，-d 会拒绝 → 确认 cherry 未进数=0 后用 -D

7-B  判读 2 个 B 类 + 8 个 C 类（10 个提交）
      对每个提交三选一：
        ① 归档成 patch 存入 backups/worktree-orphan-archive-20260911/branches/
        ② 确认仍需要 → 单独开 lane 重新落地到 develop
        ③ 确认已被后续版本取代 → 记一笔"放弃理由"后删分支

7-C  处理 2 个长生命周期分支（feature/email-auth / main）——需你单独决策

7-D  第二仓库 23 个分支同样过一遍（本次未做 cherry 分析）
```

## 7.5 判断规则（避免重复今天的问题）

- **"已合并"不等于"改动已进 develop"**：squash/cherry-pick 会让 `is-ancestor` 判否而内容其实已落地。**判"有没有丢东西"必须用 `git cherry`，不能用 `merge-base --is-ancestor`。**
- **`git branch -d` 会拒绝删未合并分支**——这是保护，不要习惯性改成 `-D`。
- **`chore(recovery): preserve …` 这类提交名是危险信号**：它当时的语义是"先存着别丢"，而不是"做完了"。这类提交必须回看原始意图再决定。

---

# 附：本方案未做的事（诚实声明）

- 未删除、未移动、未 `worktree remove`、未 `prune`、未删任何分支。
- **未演练 patch 恢复**（审查 #6/#82/#83 仍为待办——这是执行前最后一道保险，建议在真删之前用 `git apply --check` 验一次）。
- **未对第二仓库的 23 个分支做 `git cherry` 分析**（第 7 部分只覆盖了主仓库 24 个非 develop 分支）；第二仓库 20 个独有分支里是否还有未落地的改动，**待查**。
- 未评估 `releases/`、`release-staging/`、`safety-snapshots/`、根目录 zip 等其它空间占用。
- 未逐一核对 48 个 `worktrees/` 目录的**每一个** `.gitignore` 忽略文件（仅对 16 个 A 级做了抽查，其中发现 1 个 `.env`）。
- 第 7.3 的 C 类风险归类是**按提交标题推测**的，未逐个读 diff —— 实际判读时以 diff 为准。
- 100 条审查是我自己对自己方案的攻击，**不构成对方案的验证**；其中 57 条 ⚠️ 中仍有部分未闭环（主要是"需你决策"类，非"需我检查"类）。
