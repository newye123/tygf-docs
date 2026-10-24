# 调研：GitHub 公开实现 + 三省六部制度事实

方法说明（诚实边界）：本机无 `gh` CLI。GitHub 侧用 WebFetch 抓 README/源码原文 + WebSearch 补索引；
**抓不到正文的就标"未核验"，不编机制**。下表"抽到的机制"只在能取到原文时才写具体条目。

## 一、GitHub / 公开实现（5 个，含 1 个反面样本）

### 1. `obra/superpowers`（本机已装插件缓存 v6.3.0，读的是磁盘原文，证据最强）
路径：`~/.qoder-cn/plugins/cache/qoder-marketplace/superpowers/6.3.0/skills/*/SKILL.md`
- `subagent-driven-development`：
  - 角色：**fresh implementer per task** + 独立 **task reviewer**（提示词分文件：`implementer-prompt.md` / `task-reviewer-prompt.md` / `re-review-prompt.md`）+ 末尾 **whole-branch reviewer**。
  - 交接：靠 **ledger**（决策台账）——"record every decision in the ledger"，结论与轮次都在册，不靠聊天记忆。
  - 审核：**规格轴 + 质量轴双判**，不过 → 修复轮次 **R≤3 复用同一 implementer，R≥4 换新会话并换更强模型**（升级"人"而不是无限重试）。
  - 隔离：`using-git-worktrees` 强制"先检测已有隔离 → 用原生工具 → 再退 git worktree"，且写树前有 **Safety Verification**。
  - 并发：`dispatching-parallel-agents` 的前置判据就是 **"无共享状态才并行，有共享状态就串行"**。
  - 自治边界：`Rulings, not stalls`——把"必须停下来问人"的情形穷举成少数几类（不可逆/影响共享系统、安全敏感、越出本工作树副作用、发布、计划坏到怎么走都是猜）。
- 我们采纳：双轴验收、修复轮次上限 + 换人升级、"无共享状态才并行"、停车条件穷举。
- 我们改强：superpowers 的 reviewer 由**同一会话**派发（自己找人来审）；本项目要求复验手是**另一只手/另一会话**，因为实测失效正是"自述即结论"。

### 2. `crewAIInc/crewAI` — <https://github.com/crewAIInc/crewAI>
- 角色：`role / goal / backstory` 三元组定义 agent；task 携带期望产出。
- 交接：`context`、`output_file`、`memory`、`knowledge`（产物落到可交接对象，而非对话）。
- 审核：`process=hierarchical` 时由 manager 负责 **"delegation and validation of results"**——委派 + 结果校验同体。
- 数量治理：**未提供 agent 数上限**；README 亦无并发写文件保护（只有 "state management" 泛称）。
- 我们采纳：交接必须落成**文件/产物**（对应"现场交接靠文件"）。
- 我们不照抄：让审核者兼做调度者——manager 既派活又判绿，等于"自己写的诏书自己准"，正是本项目踩过的坑。

### 3. `microsoft/autogen`（AgentChat `SelectorGroupChat`）— <https://github.com/microsoft/autogen>
- 角色：多 agent 同群，由 **model-based speaker selection**（可换 `selector_prompt`、可注入候选函数）决定下一个发言者。
- 交接：消息广播 + 选择器路由。
- 审核：**UserProxyAgent** 作为人审/工具执行方，可批准或否决。
- 防失控：显式 **termination conditions**（`MaxMessageTermination`、`TextMentionTermination` 等）——**给循环设上限**是它最可借鉴的一点。
- 数量治理：无编制上限，靠终止条件兜。
- 我们采纳：轮次/次数上限制度化（重派 ≤3 轮、超时判挂起）；"判据命令 + 期望退出码"充当我们的 `TextMentionTermination`。
- 我们不照抄：动态选举发言者——本项目要的是**固定写入面**，谁写哪本册子必须事先钉死。

### 4. `FoundationAgents/MetaGPT` — <https://github.com/FoundationAgents/MetaGPT>
- 角色：`Code = SOP(Team)`，流水线角色 TeamLeader / ProductManager / Architect / Engineer /（可选）DataAnalyst；**产物是文档**（PRD/设计/接口），不是聊天。
- 审核：读 `metagpt/software_company.py` 可见该路径里 **QA/reviewer 并未被装配**（`run_tests` 类调用处于注释状态）。
- 结论（对我们极有价值）：**只要审核环节是"可选"的，工程实践里它就会退化成没有**——与本项目"preflight 一个测试都不跑，缺陷就是这么发出去的"完全同构。故本 skill 把门下复验写成**强制闸门**（未复验不得记账为绿），而不是角色选项。

### 5. `ruvnet/claude-flow`（现名 `ruflo`）— <https://github.com/ruvnet/claude-flow> ｜反面样本
- README 声明的机制：Queen-led hierarchy、Swarm Coordination、consensus（我抓到的正文只到这一层，**未取到锁/任务认领的具体实现**）。
- 检索到一份公开审计 gist 标题即称 `300+ MCP Tools — 99% Theater`（`gist.github.com/roman-rr/ed603b…`），**该 gist 我抓取失败，未核验内容，只记录存在此指控**。
- 采纳为**反面教训**：机制清单越长，越容易把"声明了治理"当成"有治理"。本 skill 因此只写可判定的动作（谁写哪、谁验、几条上限、退出码），拒绝形容词。

### 6.（补充机制来源，非 GitHub）Anthropic 多 agent 研究系统工程师博客 — <https://www.anthropic.com/engineering/built-multi-agent-research-system>
- **lead agent 委派时必须给：目标、输出格式、工具指引、明确的任务边界**，并显式要求 subagent 把结果**交回指定对象**——正是我们"任务书七字段"的独立印证。
- 并行检索带来大幅时延收益，但同时引入**重复劳动/边界重叠**的失效模式 ⇒ 我们的对策是把"写入面不重叠"设成派工前置条件。
- 评估用 **LLM-as-judge + rubric 做终态判定**，错误靠 **checkpoint 恢复**——对应我们的"回包即产物"与"孤儿现场先快照"。

## 二、三省六部：制度事实（只写有把握的，出处为常见史籍名）

| 机构 | 职掌 | 可移植的机制 |
|---|---|---|
| **中书省**（长官中书令；中书舍人草诏） | 取旨、**拟令** | 起草者不批准自己写的诏 |
| **门下省**（长官侍中；**给事中**） | 审议诏敕，"事有违失，得驳正之"，可**涂归/封驳**；唐·刘祎之"不经凤阁鸾台，何名为敕"（《旧唐书·刘祎之传》，凤阁=中书、鸾台=门下，武后改名） | **未经复核的文书不具效力**——不是"提建议" |
| **尚书省**（令/左右仆射）统领**六部**：吏（铨选考课簿书）、户（计账钱谷）、礼（辞令仪注）、兵（驿传关梁）、刑（律令刑狱复核）、工（营造屯田水衡） | **执行政令**，按事分工 | 分工依据是**事务边界**，边界不重叠 ⇒ 写入面不重叠 |
| **御史台**（御史大夫；下设台院/殿院/察院） | 监察，**不隶三省**，可直奏 | 监察独立于决策与执行链 |
| **考功**（唐制为**吏部**下属考功司，郎中/员外郎掌百官考课，《唐六典》卷二吏部；标准概称"四善三最"） | 定期计考、定黜陟 | 绩效按**册子与考状**（可核对的记录）评，不按自述 |
| **政事堂** | 宰相集体议政之所（初在门下省，开元中张说改为"中书门下"） | 决策留在校审环节，而不是执行环节 |
| **将作监**（少府/将作等"监"） | 临时性 large 工事营造 | 工程队性质：设了就干，干完就撤 |
| 宋初**使职差遣** | "官、职、差遣"分离，实际权限看差遣 | 头衔不等于写权——**以册载授权为准** |

> 注：①「考功」在唐代属吏部四司之一，**不是与三省并列的独立机关**；本 skill 把它用作"绩效功能"的名字，是功能类比，不宣称它是独立官署。②「台谏」并称（御史台 + 谏院）主要流行于宋制，与"门下封驳"是两条不同的制约线。③六部与本项目六个执行槽的对应关系是**我们给的类比**，史实只保证部名与职掌大意。

## 三、我们故意不照抄的四条，以及理由

1. **不给门下无限期拖延权**：史实上封驳可以长期留中不发。AI 会话里"挂起等答复"是已实测失效模式（worker 发问挂死 30 分钟）⇒ 改为 **封驳必须给具体驳回理由 + 重派轮次上限 + 超限升级/停车**。
2. **不给御史"风闻奏事"权**：唐代御史可无实证弹劾。我们的治理失效恰恰是"听起来像绿"⇒ **复验与巡检必须带实证**（`file:line`、真实退出码、porcelain/mtime），否则不许开口的反而是监察方。
3. **不搞多头宰相**：唐以"同中书门下平章事"数人共相，宋代二府分权。我们要**单点总控**（Owner=皇帝，总控=唯一中书），因为本项目实测过"两个大脑同时改一棵树"——决策分散在 AI 协作里放大而不是抑制冲突。
4. **不搬铨选考课的"人"的部分**（品级、升迁、避亲、磨勘）：会话没有职业生涯，搬过来只会变成形式考核。只保留考功的**账目性质**：按产物与退出码记账，红就是红。

## 四、一句话结论

公开实现解决的是"**怎么把活分出去**"，三省六部解决的是"**怎么让发出的命令可信**"。
本项目已实测的失效（假绿、孤儿现场、同树撞车、会话膨胀、worker 挂死）全部属于后者 ⇒ 所以这套 skill 的重心不在编排技巧，而在**三道不可协商的制衡**：拟令不自准、未复验不记账、一槽一写者。
