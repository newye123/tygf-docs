#!/usr/bin/env bash
# 中台控制面日检编排器（.sh 独占执行权：git 实测 + lark-cli 拉飞书快照 + 调 node 纯变换）
# 用法（Windows 下用 Git Bash）：
#   bash scripts/control-plane.sh              # 全检（ledger 判定 + 飞书回读闸）
#   CONTROL_PLANE_SKIP_READBACK=1 bash scripts/control-plane.sh   # 只查本机（离线时）
# 约定：每天早上第一条命令。退出码 0=全绿；1=有告警（人读报告里列明）。
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

DEVELOP_DIR="${CONTROL_PLANE_CORE_WORKTREE:-worktrees/develop}"
MAIN_REF="${CONTROL_PLANE_MAIN_REF:-main}"
DUMP="${CONTROL_PLANE_DUMP:-tmp/readback/records.ndjson}"
STATE="${CONTROL_PLANE_STATE:-tmp/readback/state.json}"
# 目标表凭据：环境变量 → 本机私有 secrets.local.sh（已 gitignore）→ 否则 fail-closed。
# 2026-10-21 按密钥纪律把原先硬编码在此的 base token 外移，禁止再写回本文件。
[ -f "scripts/secrets.local.sh" ] && . "scripts/secrets.local.sh"
BASE_TOKEN="${LARK_TASK_BASE_TOKEN:?缺 LARK_TASK_BASE_TOKEN：设环境变量或建 scripts/secrets.local.sh}"
TABLE_ID="${LARK_TASK_TABLE_ID:?缺 LARK_TASK_TABLE_ID：设环境变量或建 scripts/secrets.local.sh}"

if ! command -v git >/dev/null 2>&1; then
  echo "[control-plane] git 不在 PATH，无法实测发布事实" >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[control-plane] node 不在 PATH" >&2
  exit 2
fi

RELEASE_SHA="$(git -C "$DEVELOP_DIR" rev-parse --short "$MAIN_REF" 2>/dev/null)"
RELEASE_FULL="$(git -C "$DEVELOP_DIR" rev-parse "$MAIN_REF" 2>/dev/null)"
RELEASE_FOUND=0
if [ -n "$RELEASE_SHA" ]; then
  if grep -rqF -- "$RELEASE_SHA" 总控 AI_MEMORY 2>/dev/null; then RELEASE_FOUND=1; fi
fi

node scripts/control-plane.mjs --release-sha "$RELEASE_SHA" --release-found "$RELEASE_FOUND" "$@"
code=$?
echo "[control-plane] main(ref=$MAIN_REF full=${RELEASE_FULL:0:12}) found=$RELEASE_FOUND exit=$code" >&2

# ---------- 记账仓备份闸（2026-11-02 加） ----------
# 背景：本目录（记账仓）10-31 17:11 之后备份静默断链 —— remote 被删、ssh Host 缺失、
# 而 origin 指向一个不存在的仓库，任何人 `git push` 都失败却没人发现（ISSUES #298）。
# 判据只认「远端实读」（git ls-remote），不认本地 remote-tracking ref —— 后者正是这次骗过所有人的东西。
echo
bk_code=0
if [ "${CONTROL_PLANE_SKIP_BACKUP:-0}" = "1" ]; then
  echo "记账仓备份闸：按 CONTROL_PLANE_SKIP_BACKUP=1 跳过（离线时用，跳过即视为未验证）"
else
  bk_head="$(git rev-parse master 2>/dev/null)"
  bk_remote="$(timeout 25 git ls-remote origin refs/heads/master 2>/dev/null | awk 'NR==1{print $1}')"
  if [ -z "$bk_remote" ]; then
    echo "⛔ 记账仓备份闸：远端不可达或仓库不存在（无法验证是否已备份）"
    echo "    查：git remote -v 应为 newye123/tygf-docs；~/.ssh/config 需有 Host github-tygf-docs"
    bk_code=1
  elif [ "$bk_remote" = "$bk_head" ]; then
    echo "记账仓备份：✅ 本地 master=${bk_head:0:7} 与远端一致"
  else
    bk_behind="$(git rev-list --count "$bk_remote..$bk_head" 2>/dev/null)"
    echo "⛔ 记账仓备份：远端落后 ${bk_behind:-?} 笔（本地 ${bk_head:0:7} / 远端 ${bk_remote:0:7}）⇒ 跑 git push origin master"
    bk_code=1
  fi
  bk_dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${bk_dirty:-0}" != "0" ]; then
    echo "    （提示：工作树还有 $bk_dirty 项未提交，未提交的改动不在任何备份里；本条不计告警）"
  fi
fi

# ---------- bundle 冷备闸（GitHub 之外的第二副本，2026-11-02 加） ----------
# 为什么单列一道：上面那道只保证「GitHub 有一份」，账号级事故（仓被删／密钥吊销／误删分支）
# 会连带丢掉全部记账历史。bundle 是能从零 clone 回来的离线包，落在服务器上。
# RPO 定为 7 天：GitHub 那条链是 RPO 0，这条是兜底，落后几笔属正常窗口。
bd_code=0
if [ "${CONTROL_PLANE_SKIP_BACKUP:-0}" = "1" ]; then
  echo "bundle 冷备闸：按 CONTROL_PLANE_SKIP_BACKUP=1 跳过（跳过即视为未验证）"
else
  bd_out="$(bash scripts/backup-ledger-bundle.sh --verify-only 2>&1)"; bd_code=$?
  printf '%s\n' "$bd_out"
fi

# ---------- 飞书回读闸（单向投影的反向对账） ----------
rb_code=0
echo
if [ "${CONTROL_PLANE_SKIP_READBACK:-0}" = "1" ]; then
  echo "飞书回读闸：按 CONTROL_PLANE_SKIP_READBACK=1 跳过（只查了本机）"
elif command -v lark-cli >/dev/null 2>&1; then
  mkdir -p "$(dirname "$DUMP")"
  rb_err="$(dirname "$DUMP")/last-error.log"
  if lark-cli base +record-list --base-token "$BASE_TOKEN" --table-id "$TABLE_ID" --as user \
       --format ndjson --output "$DUMP" --overwrite >/dev/null 2>"$rb_err"; then
    node scripts/feishu-readback.mjs --feishu "$DUMP" --state "$STATE"
    rb_code=$?
  else
    echo "⛔ 回读闸：飞书快照拉取失败（详见 $rb_err）"
    tail -c 300 "$rb_err" 2>/dev/null | sed 's/^/    /'
    rb_code=1
  fi
else
  echo "⛔ 回读闸不可用：lark-cli 不在 PATH（装上才能看见您在飞书里写的批注）"
  rb_code=1
fi

# ---------- 官网流量日读数（只读聚合；不可用只提示，不改变退出码） ----------
echo
if [ "${CONTROL_PLANE_SKIP_TRAFFIC:-0}" = "1" ]; then
  echo "官网流量读数：按 CONTROL_PLANE_SKIP_TRAFFIC=1 跳过（要看就跑 node scripts/site-traffic-report.mjs）"
else
  tout="$(node scripts/site-traffic-report.mjs --quiet 2>&1)"; trc=$?
  if [ "$trc" -eq 0 ]; then
    echo "官网流量读数：$tout  （明细：node scripts/site-traffic-report.mjs）"
  else
    echo "⚠ 官网流量读数不可用（ssh/sudo/日志读取失败，不影响本巡检结论）：$(printf '%s' "$tout" | tail -1)"
  fi
fi

echo "[control-plane] ledger_exit=$code readback_exit=$rb_code backup_exit=$bk_code" >&2
if [ "$code" -ne 0 ]; then exit "$code"; fi
if [ "$bk_code" -ne 0 ]; then exit "$bk_code"; fi
exit "$rb_code"
