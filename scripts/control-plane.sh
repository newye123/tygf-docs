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

echo "[control-plane] ledger_exit=$code readback_exit=$rb_code" >&2
if [ "$code" -ne 0 ]; then exit "$code"; fi
exit "$rb_code"
