# yt-adversarial-review · 对抗式审查与深挖探查引擎

**让"写代码的人不能给自己打分"，用负控（Mutation Control）证明门禁真的拦得住，用 IS / IS-NOT 把问题钻到物理层。**

*Make "looks done" survive falsification — an adversarial review & deep root-cause drilling skill for AI coding agents.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Skill Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](./skills/yt-adversarial-review/SKILL.md)

---

## 为什么 90% 的 AI Code Review 只是走过场？

大多数时候，当你让 AI 审查一段代码，或者让刚写完代码的 Agent "自查一遍"，你得到的是一份礼貌的同意书，外加几条无关痛痒的命名建议。这不是因为提示词不够严厉，而是因为三个底层事实：

1. **同源盲区（Generator = Critic）**
   模型审自己写错的 diff 时最宽容（arXiv 2603.04582 自我归因偏差）；让同一个模型在同一次上下文里"解释并给修复"，反而会**提高**误判率（arXiv 2508.12358）；同模型自我批评在标准基准上增加 72% 成本，换来**零增益**（arXiv 2608.18167）。此外，跨模型审查具有显著的方向性（arXiv 2607.21656 实测 116 道难题）：强审弱 +18.1pp，弱审强反而 **−8.6pp（修好 3 个，弄坏 13 个）**。
2. **虚假共识（False Consensus）与全体一致陷阱**
   两个 Agent 一旦被要求达成共识，天然倾向于互相附和。更反直觉的是：**全体一致往往是警告，不是安心**——在真实测试中，80+ 个 Agent 一致认定 OpenSSL CMS 存在一个根本不存在的 padding oracle，最终被**1 个实测用例**当场证伪。
3. **假绿门禁（Empty Gates）与表层打转**
   "测试全绿"不等于代码正确。门禁极性写反时，五道门全绿，却静默把运行环境的 Node 22 降回了 20.20.2；UI 按钮改了三轮还是"点了没反应"，真卡点其实在底下第三层——本地守护进程 `10007ms` 验票超时（服务端存在 `3.7s–5.8s` 慢跳）外加配置里写死的 `localhost:3000` 回调地址。

**核心结论：写代码的能力已经接近竞赛水平，但诊断"为什么挂了"（OpenRCA 基准最高仅 36%–48% 准确率）和证伪改动，必须换一把尺子来量。**

---

## 核心架构：五步证伪骨架

`yt-adversarial-review` 不靠固定的角色扮演名单，而是按审查对象的切面执行五步闭环：

```text
[1. 固定基线] ──► [2. 分面只读取证] ──► [3. 主审逐条证伪] ──► [4. 收敛 Verdict] ──► [5. 风险门（负控）]
```

### Step 1 · 固定基线（Freeze Baseline）
- 钉死 Commit SHA，声明审查过程**全程只读**（剥夺审查者的 Write/Edit 权限，防止边审边改导致基线漂移）。
- 只认 Git 内容哈希，**绝不认文件 `mtime`**（分支切换或检出后 `find -newermt` 会产生假 0）。
- 审查者**不读实现者的推理过程**，只看最终 diff 与契约判据——审"做成了什么"，不审"想干什么"。

### Step 2 · 分面只读取证（Faceted Read-Only Probing）
按对象性质动态切面，每路必须交出 `file:line` 或 `命令原式 + 真实退出码`，且**否定式断言（"没有 X"）必须附 0 命中实测证据与探针自证**，否则一律标为"未核实"：
- **功能改动**：链路事实 / 兼容性 / 复用裁决 / 架构契约 / 产品价值
- **线上事故**：现象面 / 日志面 / 网络面 / 配置面 / 进程面 / 物理面
- **三轮以上深审（盲区法）**：只审前几轮未覆盖的切面，对改动依赖的每个符号做目标分支逐符号 grep 溯源（并强制保留"符号在场 ≠ 运行正确"的残留检验点）。

### Step 3 · 主审逐条证伪与离散分歧协议（Disagreement Protocol）
主审对各路回报执行三分处置：**采信**（亲自复读核实）、**改判**（独立复跑读数不同）、**不采信归入未决**（未核到退出码）。
为打破 LLM 的虚假共识，批评者只能以三种离散状态收尾：
- `AGREE`
- `DISAGREE_EVIDENCE: <与该结论直接矛盾的具体代码引证或实测读数>`
- `DISAGREE_CONCERN: <具体质疑点>`（提出方必须在代码中找到实证保留结论，或撤回结论，**严禁"你说得有道理但算了"**——该约束实测将分歧裁决 F1 从 0.457 提升至 **0.533**）。

### Step 4 · 收敛 Verdict（Structured Verdict）
输出强制收敛为 `VERDICT: BLOCK | CONCERNS | CLEAN`。每条 Finding 必须包含五要素：
1. **问题**：违反了哪条具体契约（拒绝泛泛而谈的风格建议，防止诱发过度工程）
2. **证据**：`file:line` + 命令原式与真实退出码
3. **影响**：用直白语言说明线上会发生什么故障
4. **修复路径**：最小干预改法（先裁决"需不需要动"，再给改法）
5. **防回归测试**：哪条测试能钉住它（**此项严禁留空**）

### Step 5 · 风险门：负控四式（Mutation & Negative Controls）
> **"负控不红的断言＝没有断言，绿门数不等于门数。空门比没门更坏。"**

任何"我修好了"或"门禁已加"的声明，必须走完六步闭环：**① 基线门确认绿 → ② 注入已知破坏 → ③ 确认门变红且红在注入点 → ④ 还原 → ⑤ 确认门回绿 → ⑥ 校验还原后 `sha256` 与改动前一致**。

| 负控式 | 适用场景 | 实操做法与判定标准 |
|---|---|---|
| **式一：短路式** | 校验逻辑 / 条件分支 | 将 `if (badDate)` 改为 `if (false && badDate)` → 观察断言从 `PASS=35 FAIL=0` 变为 `PASS=30 FAIL=5` → 还原核哈希 |
| **式二：抬基线式** | 版本门禁 / 性能阈值 | 将期望基线抬至不可能达到的值（如 Node `22.x → 22.99.0`）→ 必须触发 `FAIL` 且 `rc=1` |
| **式三：注入真值式** | 数据结构 / 账本契约 | 在合法数据集中塞入一行带非法占位符的数据（如 `2026-10-23 22:3x`）→ 门禁必须精确点名该行且 `invalidRowCount +1` |
| **式四：变异式** | 核心业务分支 | 改坏源码分支前，先跑 `assert.notEqual(mutated, original)` 证明替换确实命中（防 CRLF/子串失配导致假负控），再验测试转红 |

---

## 把问题钻到物理层：IS / IS-NOT 与加宽版 5 Whys

当遇到"UI 改完了但现象还在"时，严禁在当前层继续打转。`references/drilling.md` 提供了从表象直达物理层的六把铲子：

1. **三层下钻铁律**：界面现象 → 浏览器 Network/Console → 服务端日志 → 本地守护进程日志 → 进程实际读的文件（防 `file:` 相对路径经软链静默读取共享库） → 网卡端口抓包（例如从"12 路并发下载超时"一路往下钻，发现 16KB 耗时 1.31s、64KB 耗时 17.44s，最终定位到 `eth0` 出口带宽在 781 KB/s 封顶，而非代码逻辑问题）。
2. **Kepner-Tregoe IS / IS-NOT 四维对比**：在 `What / Where / When / Extent` 四个维度同时列出"什么坏了（IS）"与"什么没坏（IS NOT）"。**一个合格的候选根因，必须能解释所有 IS 事实，且与任何一条 IS NOT 事实都不冲突。**
3. **加宽版 5 Whys（带回退点与反向验证）**：告别单链条脑补。每一层先摆开最多 $N=3$ 个互不重叠的候选子因，写明选边理由；未选中的留作回退锚点。找到根因后**倒着往回验**——若在第 $m$ 层解释不通上游事实，立即回退到第 $m$ 层的候选清单换路重钻。
4. **矛盾读数求共同前提**：一路测出"10 行数据全部应该匹配"，另一路测出"实际匹配 0 行"——两边读数都对，合并前提直接锁定"解析器只读取了双 Sheet 表格中的第一个 Sheet，那 10 行根本没进候选集"。

---

## 混沌工程：七把压力测试刀法与 `Survived` 判定

对于常规审查中**活下来的结论（认为没问题的部分）**，`references/stress-techniques.md` 引入混沌工程的**强制多样性（Forced Variety）**机制——每次审查至少选用 3 把不同的刀法进行压力冲击：

1. **存在性质疑（Existence Question）**：在脑中把它删掉，如果什么都不坏，它就不该存在（专砍过度工程与防御性废代码）。
2. **规模跳变（Scale Shift）**：数据量或并发 10 倍、0 倍、负数时会怎样？
3. **时间旅行（Time Travel）**：6 个月后接手的人会踩什么坑？哪些写死的版本号、buildId 或行号假设已经过期？
4. **需求反转（Requirement Inversion）**：如果需求极性完全反过来，现有测试还能拦住吗？（专抓"只验数值、没验方向"的极性反写）。
5. **跨接缝探针（Cross-Seam Probe）**：模块 A 调模块 B 的接缝处，两边对数据结构或 `installId` 的假设一致吗？
6. **删除探针（Delete Probe）**：真删一次跑测试，炸出来的地方就是它的真实隐式依赖清单。
7. **重放探针（Replay Probe）**：完全相同的输入连跑两次（重复激活、重复同步、重复部署），幂等性还在吗？

**显式标注 `Survived: yes / no`**：
> *"Resilience confirmed is as valuable as weakness found."*
> 报告中必须对经过压力测试的模块标明 `Survived: yes` 或 `Survived: no`，未测试部分必须诚实声明"未做压力测试"，彻底消除"没报错就等于全覆盖"的虚假安全感。

---

## 九族高频工程踩坑速查（`references/pitfalls.md`）

凝聚高强度工程迭代中的真实事故，审查时花 60 秒过一遍：

- **A 族（门禁假绿/空门）**：门没配 remote 静默跳过算绿、单向祖先检查放过落后远端 10 笔的分支、门极性写反导致 Node 22 降级回 20.20.2。
- **B 族（负控工具自身 Bug）**：连做多发注入只在最后统一还原，导致后几发继承第一发的破坏；在 CRLF 仓库按 `\n` 替换源码静默失配。
- **C 族（静默失败 `rc=0`）**：`git apply` 在子目录静默 no-op；`git grep` 路径不存在返回 `rc=1` 被当成"0 命中"；管道吞掉前置命令的非零退出码。
- **D 族（记账/日志吞数据）**：1.65MB 大日志文件置顶插入时吞掉 Markdown 二级标题（写入后必须校验 `grep -c '^## '` 恰好 `+1`）；日期列写 `22:3x` 占位符被同步闸静默丢弃。
- **E 族（并发写者与读数过期）**：多会话并发推进分支，报告落笔前必须重跑 `git rev-parse` 核对基线。
- **F 族（度量假信号）**：Cloudflare 邮箱混淆 `data-cfemail` 每次刷新变化被误判为"页面内容变更"。
- **G 族（第一性原理推翻自己）**：目录扫描+字体解析只扫出 1293 项，与系统枚举的 1587 项仅重合 1235 项，当场证伪自己刚写的方案——**推翻自己必须显眼记录，严禁静默改口**。
- **H 族（环境/时区/权限错配）**：源站 Nginx 用 CST、客户端日志用 UTC（相差整 8 小时）；按进程镜像名清理时误杀宿主机正常浏览器（进程回收铁律：只按 PID）。
- **I/J 族（并发竞态与表层打转）**：分片并发上传不信 `wait`，必须逐块核对期望字节数与 `sha256` 后再拼接。

---

## 一键安装（Installation）

本开源包遵循标准 Agent Skills 目录规范，支持主流 AI 编程工具一键加载：

### 方式一：使用 `npx skills` 一键安装（推荐）

```bash
npx skills add <your-org-or-username>/yt-adversarial-review
```

### 方式二：手动安装到各 AI 工具目录

将 `skills/yt-adversarial-review` 目录复制到对应工具的 Skills 目录即可：

- **Claude Code**
  ```bash
  mkdir -p ~/.claude/skills
  cp -r skills/yt-adversarial-review ~/.claude/skills/
  ```
- **OpenCode / 通用 `.agents` 规范**
  ```bash
  mkdir -p ~/.agents/skills
  cp -r skills/yt-adversarial-review ~/.agents/skills/
  ```
- **Cursor**
  ```bash
  # 项目级加载
  mkdir -p .cursor/skills
  cp -r skills/yt-adversarial-review .cursor/skills/
  ```
- **Qoder**
  ```bash
  # 全局加载（或复制到项目根目录 .qoder/skills/）
  mkdir -p ~/.qoder/skills
  cp -r skills/yt-adversarial-review ~/.qoder/skills/
  ```

---

## 触发词与使用示例（Usage）

安装后，你可以在对话中直接通过 `/yt-adversarial-review` 唤起，或者使用自然语言触发：

- **改动上线前把关**：「用对抗式审查审一遍当前分支的改动，重点做负控，看看能不能上线。」
- **久调不愈的疑难杂症**：「我已经改了两次 UI 但还是没反应，按 `yt-adversarial-review` 的 IS/IS-NOT 帮我往下一层钻到底。」
- **给测试门禁验真**：「我刚写了 `scripts/smoke-xxx.mjs`，帮我做一次变异式或短路式负控，证明这道门真的拦得住。」
- **方案/架构红队压力测试**：「对这个技术方案用七把压力刀法挑毛病，每条给出 `Survived: yes/no`。」

---

## 仓库结构（Repository Structure）

```text
.
├── LICENSE
├── README.md
└── skills/
    └── yt-adversarial-review/
        ├── SKILL.md                           # 核心协议：五步骨架、分歧协议、红线与产出规范
        └── references/
            ├── drilling.md                    # 钻到底：六种下钻手法、IS/IS-NOT、加宽版 5 Whys
            ├── negative-controls.md           # 负控四式：短路/抬基线/注入真值/变异 + 门内自证
            ├── pitfalls.md                    # 九族反复踩的坑：从假绿门禁到时区/软链错配速查
            └── stress-techniques.md           # 压力测试：混沌工程七把刀法、强制多样性与 Survived 判定
```

---

## License

Released under the [MIT License](./LICENSE).
