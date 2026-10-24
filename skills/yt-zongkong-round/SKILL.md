---
name: yt-zongkong-round
description: 图译工坊「总控」一轮的机械流程 —— 抢锁→一条命令扫盘→投递待投指令→收包挂号→转御史复验→派工→十节结构落日报→脱敏自检→汇报 Owner。Use when taking over / continuing the 总控 session in the 图译工坊 repo (container root with 总控/ and worktrees/develop), or when a scheduled 08:00 / night round starts, or the user says 接手总控、继续总控、跑一轮、收包、派工、日报. Governance constitution (roles, 任务书八字段, 复验单七项, 封驳五类, 编制≤8) lives in skill `yt-sansheng-liubu` — this skill only adds the per-round mechanics and this repo's file/lock/release specifics.
---

# 图译工坊 · 总控轮次（yt-zongkong-round）

## Overview

一轮总控＝**把别人交来的东西挂号、把该判的转给御史、把能做的派给空闲槽、把本轮写进日报**，
最后给 Owner ≤3 件按分钟标耗时的事。

**分工**：制度与判据规矩 → `yt-sansheng-liubu`（拟令不自准、未复验不记账、一槽一写者、任务书八字段、复验单七项、封驳五类）。
本 skill 只管**每轮重复的那套机械动作**与本仓落点（锁、队列文件、日报结构、发布面红线）。

**角色边界**：判定「合格」只属于御史 `5f6ad41f`；总控**恒不签字**（日报"由我判合格"常态为 0）。Owner 直接给的活也转派，总控不改源码、不碰发布面、不碰两站。

## 前置：先读（同任务未变化可复用，别每轮重读）

`AGENTS.md` → `总控/官制.md` **末节**（开着哪些面、哪些令仍有效）→ `总控/日报_<今日>.md` **首节**（上轮已报什么）→
`AI_MEMORY/CURRENT_STATUS.md` + `ISSUES.md`。两处状态文件冲突时以 Git 与运行证据为准，**只报偏差不自动改**。
派工前必过 `yt-sansheng-liubu` 步骤 0（能力现状三态＋全景表行号），否则不许派。

## 第 0 步：抢自己的锁

```bash
LOCK="总控/.locks/round.lock.zk-<会话ID前8位>"
mkdir "$LOCK" && date "+%Y-%m-%d %H:%M:%S %z" > "$LOCK/owner"   # MKDIR_RC 当场取，别接管道（管道后的码是 head 的）
```
**一把链一把锁，名字带本轮会话 ID**——`round.lock.night` 归夜链；白天接管总控**不要复用那名字**（09-25 08:5x 实测踩过：白天轮抢了夜链的锁，两链会互判"对方在跑"）。
抢不到＝**本轮只读**（不派工、不部署，只扫盘＋汇报），并在日报⑩如实记。
收尾**必须放自己那把**：`rm -f "$LOCK/owner" && rmdir "$LOCK"`，放锁结果写进日报⑩。
**主线 09-22 留的 `round.lock` 不删、不接管、不绕行**——那是 Owner 故意留的闸；其 `owner` 字段每轮被覆写⇒不可信，只认**目录 mtime**。

## 第 1 步：一条命令扫盘（禁止临场拼 ad-hoc 探针）

```bash
node .qoder/skills/yt-zongkong-round/scripts/round-scan.mjs --since "YYYY-MM-DD 00:00" [--sites]
```
八组输出：锁／develop 树 HEAD·porcelain·numstat·新合入／未推笔数（本地 ref，不联网）／`总控/` 关键件 size·mtime·队列计数／
待投开放项／回收目录新交付／（`--sites` 才发只读 GET）两站 provenance。零写入。
**每组读数写进日报④并标取数时刻。**

## 第 2 步：投递（`总控/待投递指令.md`，append-only）

1. 只投 `[待投]`／`[待投·急]`；**每条自写的"触发前提"逐条实测**成立才算成立。
2. 标了 `勿重投`／`已执行`／`作废`／`已核·无需投递` 的一律不投——**重投＝重复下令**（本仓已因此出过两次事故）。
3. 投出后行首改 `[已投 HH:MM]`，**不删行、不改正文**；读数过期就追加 `[事实更正·不投·勿重投]`（只更正事实，不撤令、不改历史行）。
4. **被委派轮次**（worker 回包或 cron 触发的那一轮）**禁止 `send_message_to_chat_session`** ⇒ 新指令只落本文件，正常轮次再投。

## 第 3 步：收包＝只挂号，不判合格

新交付判据：`总控/回收_YYYYMMDD/`、`总控/功能普查/` 内 mtime ≥ 上轮末的 `.md`（脚本已列好）。
逐件写进 `总控/待复验队列.md` 队尾，每格写「需判定」而不是「通过」。

**队列追加三步核算**（本仓天天咬人）：① `cp` 原件进 `os.tmpdir()`；② 用 Edit/Write 追加，**别拿旧条目标题行当锚点**（会吞标题）；
③ `diff` 必须 `+N / −0` 纯增量，`grep -c '^- \*\*件名\*\*'` 与行数各自实测写进日报。

## 第 4 步：复验转派

触发：队列积压 ≥3 件，或含**对外可见文本**（条文页/首页/收费页），或含**发版自证敞口**。
一次写全任务书（八字段见 `yt-sansheng-liubu`），要求逐件三态＋自己 grep 到的 `file:line`＋命令原式与**真实退出码**；
边界＝只读、不改源码、不动 develop 树、不碰两站、不重启本机 PS 与助手；判不了写「未核实」。
优先级：**对外文本 > 发版自证敞口 > 其余**。

## 第 5 步：派工

槽位与在飞见 `references/roster.md`；**归属以 `总控/官制.md` 当轮实读 ＋ `list_chat_sessions` 实测状态为准**（快照会过期）。
- 只派 ready/cold 且身上无未收口单的槽；`running` 不堆第二条；新建会话前先确认没有槽在做这件事（编制 ≤8，交包即解任）。
- **HEAD 钉子**：`worktrees/develop` 任何一笔新提交都会让已成对的安装包当场红（`package-candidate` 按当前 HEAD 现推包名）⇒ 发版窗口内不派"会产生提交"的活。
- 任务书落 `总控/任务书_<单号>_<名>_<YYYYMMDD>.md`；回包落 `总控/回收_<日期>/<单号>_回包.md`。

## 第 6 步：日报（十节，置顶进当日册）

跨零点**另开** `日报_YYYYMMDD.md` 并在页眉写明承接哪一本。节次固定：
**⓪一句话 ①投递 ②收包 ③派工 ④现场终值 ⑤新立案 ⑥需 Owner 拍 ⑦三态三个数 ⑧红线自查 ⑨脱敏自检 ⑩锁**
- 三态三个数＝新交付 N／由我判合格（常态 0）／新合入主干 N（`git log --since` 实测）。
- ⑥ 给 Owner ≤3 条，各标耗时（分钟），并给**我的立场与推荐**，不给选项菜单。

**置顶插入的防吞标题步（本仓一天犯三次，含我自己两次）**：用 Edit 插到上一节之前时，
`old_string` 与 `new_string` **两边都必须完整包含被锚定那一节的 `## ` 标题行**（新节写在前、原标题行原样复述在后）；
落笔后**立刻**跑 `grep -c '^## ' 日报_YYYYMMDD.md` 与插入前对比 ⇒ **必须恰好 +1**；少了就是把别人的标题吃了，当场补回再继续。
（同类锚点陷阱：`old_string` 里的中文行必须逐字取自文件，不要凭记忆重排标点——本轮两次 Edit 失败都是这个原因。）

## 第 7 步：落盘前脱敏自检（不可跳）

探针外置 `os.tmpdir()`；**先跑阳性对照**（每类喂一条已知样本，必须全被抓）再报 0，否则那个 0 是探针失灵。
类：凭据赋值／凭据类词面／邮箱／≥12 位连续十六进制／IP／本机盘符绝对路径／服务器绝对路径／素材扩展名／金额点数。
写作规矩：提交号截 7 位；两站写"测试站／生产站"；库路径写 `$TEST_DB` 代称；改文即重扫，计数以最后一次扫描为准。

## 第 8 步：释放自己的锁

删 `owner` 文件后 `rmdir`。日报⑩记抢得与释放的实测时刻。

## 红线（每轮逐条自查，日报⑧要写"动作面"不是"我没干"）

不 push／不改历史／不发生产（除非 Owner 当轮明给时刻且知情于拦截面）／不轮换凭据／不删断言或放宽判据凑绿／
不拿旧包代抵候选／不代装或重启 Owner 本机 PS 与助手／不 restart PM2·nginx／不动 `AGENTS.md`·`CLAUDE.md`·`官制.md`／
不写 develop 树内的 `AI_MEMORY/`／不转派总控旧槽／不碰主线 `round.lock`／服务器只读（不跑任何 `--apply` 删除）。
**进程收尾只按 PID**：禁止 `taskkill /IM`、`pkill -f`、`Stop-Process -Name`。

## Resources

- `scripts/round-scan.mjs` — 只读扫盘（第 1 步唯一入口：`--since`、`--sites`、`--root`）
- `references/roster.md` — 槽位快照、各槽在飞、仍有效的停单令
- `references/redlines-and-pitfalls.md` — 红线全表 ＋ 22 条最常咬总控轮的假结果形状
- skill `yt-sansheng-liubu` — 派工/复验/封驳/编制治理的权威制度（本 skill 不复述）
