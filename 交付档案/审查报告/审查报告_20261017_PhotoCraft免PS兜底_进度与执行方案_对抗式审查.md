# 审查报告：PhotoCraft 免 PS 兜底（扫描 + 执行）——进度实测 + 对抗式审查 + 执行方案

**判词（一句话）：这条链现在是断的，不是"差最后一步"。** 执行段本地已绿，但代码停在旁支分支（不在 develop）、扫描段一行没写、引擎本体没进安装包；更要紧的是回执里的引擎身份是一个写死的字符串、从未经运行校验，哈希门"配了才校验"——这两条合起来意味着：一旦用户在装了未修版 PhotoCraft 的机器上跑通，写出来的 PSD 真 Photoshop 打不开，而回执会写着 SAVE_SUCCEEDED。

**Owner 验收口径**：本件不要求您读代码，只需要看四个数（下一节）和三句待拍板。

---

## 一、进度实况（2026-10-17 现读，每条带坐标）

已经做过的（10-15 / 10-16 实测，非本轮新证）：

- 免 PS 执行器 `pc-executor.js`（415 行）+ `server.js` 接线 16 处 + B1 白名单，全部在分支 `codex/v1.5-trust-chain`（该分支 HEAD `7d8f09b`，提交 `fc287fb` / `49c8230`）。
- 冒烟 12/12、真机 E2E 执行 + 重开两产物读回一致（含中文往返）、`test:batch-row-contract` 与 `test:trust-chain` 曾逐脚本绿灯。出处：`交付档案/执行方案/执行报告_20261015_PhotoCraft集成v2_本地执行全绿.md:20-25`。

四个断点（本轮实测）：

1. **代码不在主线。** `git merge-base --is-ancestor fc287fb develop` 判定为否；develop 树里 `worktrees/develop/download/local-assistant/pc-executor.js` 不存在；develop 的 `server.js` 里 `pcExecutorEnabled` grep 命中 **0**。两树 merge-base 是 2026-09-10 的 `58f5855`，develop 领先 **764** 笔、v1.5 独有 8 笔；`download/local-assistant/` 两树相差 **+1,152 / −7,813**，其中 `server.js` 单文件差 **3,767** 行。所以"把 PhotoCraft 合进 develop"不是合并，是在同名文件上按现行行号**重新接线**；方案 v2 里所有 `:3352 / :3456 / :4061` 行号已全部作废。
2. **扫描段没做（正是您问的那一条）。** develop `download/local-assistant/server.js:4582`：Photoshop 没在跑就直接 202 `waiting_for_photoshop`；就绪扫描 `:5243-5244` 走 JSX 组件分发（`TYGF_V15_Readiness_Scanner.jsx`，清单在 `script-distribution.cjs:28-29`）。方案 v2 §四 原文写着"本册只标注接口缝，不实现"。⇒ 没装 PS 的机器今天连第一步扫描都过不去，PhotoCraft 只补了执行段。
3. **引擎没内置。** develop 的 `download/` 全目录搜 `photocraft` 命中 **0**；没有 `bin/` 目录；`download/local-assistant/build/installer.iss:44-58` 的安装清单里没有它；配置里 `pcExePath` 默认空。⇒ "本地助手内置 PhotoCraft"这件事**还没开始**。
4. **自动部署探针现在是停的。** 计划任务 `TYGF-Deploy-Probe` 状态 = **Disabled**，末次运行 2026-10-17 12:43:16、结果码 0；`worktrees/v1.5-trust-chain/tmp/deploy-probe.log` 末拍条件读数是 `PhotoCraft=false`。⇒ 台账里"合入 develop 后探针会自动部署"的期待当前不成立（停用归属未核实，见末节）。

---

## 二、对抗式审查（审的对象包含我自己上一轮的方案）

**F-1（阻断级）引擎身份是硬编码字符串，从未经运行校验。**
`worktrees/v1.5-trust-chain/download/local-assistant/pc-executor.js:19` 写 `EXECUTOR_VERSION = 'photocraft-cli f0e8d404'`，并在 `:220 :227 :300 :308 :340` 五处原样写进执行/重开回执，没有任何一处从 exe 取值。本轮实测两只 exe 的 `--version`：打过补丁的构建（43,341,312 B）输出 `photocraft-cli 0.7.0 (dev build)`；未修版（`C:/Program Files/PhotoCraft/photocraft-cli.exe`，67,313,528 B）输出 `photocraft-cli 0.7.0 (792616159, 2026-10-11)`。**同一版本号，且都不含 f0e8d404。** 后果：回执声明的引擎身份不可证，违反本树 `AGENTS.md`「禁止用源码版本代替真实 runtime 身份」，且命中 Stop-the-line 清单里「source、build、installer 与 runtime identity 不一致」。

**F-2（阻断级）哈希门是"配了才校验"，默认不校验。**
`pc-executor.js:181`：`if (expected && sha256File(candidate).toLowerCase() !== expected)`；出厂默认 `pcExeSha256: ''` ⇒ 空值即跳过校验。与 F-1 叠加的真实损害：用户机上是未修版 PhotoCraft 时，PC 通道照样接管，写出的 PSD 真 PS 打不开（10-13 写侧终验 **6/6 FAIL**，见 `AI_MEMORY/TASK_LOG.md:811-818`），而回执写着 `SAVE_SUCCEEDED`、客户件报废、积分照扣。**这是本案最贵的一条，必须先堵再谈功能。**

**F-3（阻断级）现在这条验收路径给不出任何 PhotoCraft 证据。**
台账三处都写"等 Owner 授权测试站部署并人工四验"（`AI_MEMORY/ledger.jsonl:41 / :48 / :56`）。但 PC 通道 100% 活在助手侧，测试站部署换的是 Web/服务端包；助手行为变化必须出安装包并验实际运行版本（`config/release-identity.json` 现 3.7.15）。⇒ 走"部署测试站 + 人工四验"，关于 PhotoCraft 的运行证据是 **0**。这条口径要更正，不能让它继续当"下一步"。

**F-4（重）灰度白名单放错了面。**
v1.5 把名单放在助手本地配置（`server.js:435` `pcExecutorBetaUsers: []`，判定在 `:3372` 与 `:4118`）＝用户改本机一个 JSON 就能自开，属"只能靠自觉"，按既定判据＝无效。develop 已有服务端先例可抄：`src/lib/server/feature-flags-store.ts:184`（`typographyBetaUsersV1`）。

**F-5（重）这条兜底解不了当前的扫描投诉，范围必须先说清。**
分派条件 `:3373` 是 `pcExecutorUsable && !psExeForExecutor && isBetaUser`，只对"PS 没在跑"生效。而现在真客户的卡点是 **PS 在跑但扫不动**（SCAN-FIX-LINE 定案：您三台机都正常、只有用户机不行）。⇒ 别让派工把 PhotoCraft 当成"扫描卡死"的解药；它解的是"这台机器根本没有 PS"，是另一类客户。

**F-6（中）扫描字段缺 2 项，会撞上今天刚落的覆盖率闸。**
10-14 可行性实测 38 字段覆盖 36：`leading` 16/30（多 run 混合态）、`hangingPunctuation` 0/30 真缺（`AI_MEMORY/TASK_LOG.md:768`）。而 develop 今日 HEAD `ee05c9a` 刚落覆盖率闸（批量执行前 <95% 必须显式放行）。PC 扫描若把缺字段写成 0 或空，闸的读数会失真（假低或假高）。合同测试必须锁"缺字段＝如实登记，不补 0"。

**F-7（中）内置 43 MB 引擎的代价还没人算。**
安装包量级 ~12.5 MB（`build/dist/tygf-engine-setup-3.4.3.exe` 实测 12,524,631 B；10-07 台账记录 3.7.6 包 12,396,783 B），并入 patched exe 43,341,312 B ⇒ 约 **56 MB**。下载带宽、自动更新体积、杀软白名单都受影响。许可是 MIT OR Apache-2.0（`AI_MEMORY/TASK_LOG.md:818`），内置须随包附版权与许可声明——`installer.iss` 现在没有这一项。

---

## 三、执行方案（四段串行，每段判据可复跑）

**第 0 段 · 三句待拍板（今天就能说，不说后面都堵）**

1. 引擎进不进安装包（进＝包 ~56 MB；不进＝用户自装、我们只校验哈希并如实报缺件）。
2. 无 PS 验收用哪台机器。您三台机都有 PS，验不到这条链；没 PS 的那台笔记本是唯一对照组。
3. 扫描缺 2 个字段是否接受"如实告知 + 该层不参与计费"（不接受就只能先做 PS 路径的字段补齐，那是另一张单）。

**第 1 段 · 移植（无悔动作，可立即开工，约半天）**
从 develop 新签一棵 `worktrees/pc-port-20261017`，不动 develop 在飞现场（实测 7 项未提交：批量工作台 5 件 + 2 个 smoke + `changes/active/20261017-scan-queue.md`）。六处接线按 develop 现行行号重做，不沿用 v2 的旧坐标。
判据：`node --check` 双过；`npm run test:pc-executor` 12/12；`npm run test:trust-chain` 整链 rc=0（注意 develop 那份 `package.json` 的 trust-chain 是长链，不是 v1.5 的 22 项）；开关断路验证＝`pcExecutorEnabled=false` 时 `git diff` 行为面零变化。

**第 2 段 · 引擎身份闸（先于一切功能，半天 + 真机约一小时）**

- `EXECUTOR_VERSION` 改为**运行时取**：spawn 前跑一次 `--version` + `sha256File` 现算，回执写实测串，不写常量。
- `assertExeReady` 反向：没有 `pcExeSha256` 即**拒绝执行**，不是跳过校验。
- 出厂默认 `pcExeSha256` 钉本次实测值 `628268bbf137e3f95b8505776ec46d16882deed60bc7d81bf5581555c1c5fd1b`（gh_build2 补丁版）。
- 负控冒烟：喂未修版（`be118612931245f9114b2dfe7e567d15557f2b7694c0d3f7f09d9e59e52f3336`）必须拒并出 `PC_EXE_HASH_MISMATCH`。
- 真机复测必须用**助手集成路径的产物**（不是仓外独立 CLI 手改的那份），在 PS 2021 与 PS 22 双版开档 + 深遍历，n≥3 母版（含 224 MB 的 src2 与 5857-A）。

**第 3 段 · 扫描兜底（您问的那条，1–2 天）**
在 `executorMode` 维度给 `server.js:4582`（预扫描 PS 闸）和 `:5243`（就绪扫描）加分流，产出与现役 `Preparation_Scanner.jsx` 同构的 `scan-observation.json`。
判据：同一份母版 PS 扫与 PC 扫双跑，逐字段取差集，差集只允许 `leading` / `hangingPunctuation` 两项且必须在告知面点名；`ledgerEntryId` 树路径 1:1 复刻写成断言；覆盖率闸（`ee05c9a`）在 PC 扫描下的读数实测入档；缺字段一律如实登记、禁补 0。

**第 4 段 · 出厂与灰度（约一天 + 发布链）**
白名单从助手本地挪到服务端判定（同构 `feature-flags-store.ts:184`）；`installer.iss` 增一条 Source 装到 `{app}\bin\`，发布物 manifest 逐项 SHA（照 `local-assistant-release.ts:57-91` 先例），版本 bump 3.7.15 → 3.7.16 并同步九文件一 exe 面；界面显式声明"本次由 PhotoCraft 引擎执行，未使用 Photoshop"（禁静默降级）；三、四段全绿前**对外文案禁写"无需 Photoshop"**；灰度先放 1 台无 PS 白名单机。

---

## 四、我的建议

先只做第 1 段 + 第 2 段。第 2 段是安全闸，不做等于往用户机器上放一个"能把客户件写坏、还回执成功"的通道；第 3 段（扫描兜底）值不值得做，取决于第 0 段第 ③ 句——它决定我们是"如实少两个字段"还是"先补 PS 路径的字段"。探针保持停用，别让它在条件凑齐时自动部署。

---

## 五、未核实项（不编，点名留在这儿）

- 探针被谁停用：只读到 OS 侧 `Status=Disabled` 与末次运行结果码 0，停用动作与归属盘上无痕迹。
- 测试站当前 BOUND 提交：本轮未现读 `/api/runtime-provenance`；台账最后记录是 `aefc8a8`（10-16 08:59 部署），而 develop 已推进到 `ee05c9a`，中间是否有别的部署落站未证。
- `gh_build2` 与提交 `f0e8d40` 的对应关系：只有 `--version` 输出串与 TASK_LOG 叙述，没有构建 manifest，属"强证未闭环"。
- 上游 PhotoCraft 是否已产生新代差：未 fetch 上游，未核实。

— 报告人：Qoder（本会话）｜2026-10-17｜本轮实测命令：`git merge-base --is-ancestor`、`git rev-list --left-right --count`、`git diff --stat`、`git status --porcelain`、`grep -c`、`ls`、`certutil -hashfile`、`photocraft-cli --version`、`schtasks /query /tn TYGF-Deploy-Probe /v`
