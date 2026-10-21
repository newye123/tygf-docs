#!/usr/bin/env bash
# 任务台账投影编排器
#   1) 用 lark-cli 拉飞书现状 ndjson
#   2) 调 scripts/sync-task-ledger.mjs（纯变换）生成 shell 计划
#   3) source 执行计划（source 而非 spawn，规避本沙箱 node/bash 内 spawn 被拦的问题）
#
# 用法：
#   bash scripts/sync-task-ledger.sh [--dry-run] [--ledger <path>] [--force]
# 退出码：0 成功（含 ledger 不存在时的空跑）；1 拉取、写入失败、健全性检查失败、
#   写入有 [fail]、或对账闸拦下（held）。调用方若要求「失败不阻塞交付」，请用 `|| true` 包裹。
#
# 健全性闸（2026-10-15 事故防复现）：执行前校验计划里每条 [update] 都带 --record-id。
#   事故：用 PowerShell 复刻执行本计划时丢了 --record-id，19 条 update 实际变成 create，
#   飞书出现 19 任务 ×3 重复行（详见 AI_MEMORY/ISSUES.md，已手工去重）。
#
# 投影前对账闸（2026-10-15 夜 · P0）：mjs 逐格三值比对（台账 L / 飞书 F / 上次投影快照 P），
#   人手改/冲突/无快照的行拦下不投影（--force 显式强推）；快照只在本次执行全成功
#   （无 [fail]）时提升（pending → final），失败不提升以便下次重试。
#
# 纪律：payload 永不含「Owner 批注」列；幂等由 mjs 按「任务ID」比对现状承担。
# 注意：git bash 的 MSYS 路径（/f/...、/tmp/...）node 不认，故所有传给 node 的
#   路径统一经 to_win 转成 Windows 形式，否则 existsSync 为假 → 静默空跑。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

to_win() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

LEDGER="${LEDGER_PATH:-$REPO_ROOT/AI_MEMORY/ledger.jsonl}"
STATE_FILE="${SYNC_STATE_FILE:-$REPO_ROOT/tmp/readback/last-projected.ndjson}"
STATE_PENDING="$STATE_FILE.pending"
DRY_RUN=0
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --ledger) LEDGER="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "[sync-task-ledger] 忽略未知参数: $1" >&2; shift ;;
  esac
done
mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true

# 目标表凭据：环境变量 → 本机私有 secrets.local.sh（已 gitignore）→ 否则 fail-closed。
# 2026-10-21 按密钥纪律把原先硬编码在此的 base token 外移，禁止再写回本文件。
[ -f "$REPO_ROOT/scripts/secrets.local.sh" ] && . "$REPO_ROOT/scripts/secrets.local.sh"
BASE_TOKEN="${LARK_TASK_BASE_TOKEN:?缺 LARK_TASK_BASE_TOKEN：设环境变量或建 scripts/secrets.local.sh}"
TABLE_ID="${LARK_TASK_TABLE_ID:?缺 LARK_TASK_TABLE_ID：设环境变量或建 scripts/secrets.local.sh}"

# 定位 lark-cli（PATH 优先，回退已知安装路径）
LARK=""
if command -v lark-cli >/dev/null 2>&1; then
  LARK="lark-cli"
else
  for cand in \
    "/c/Users/ivan/.workbuddy-ai/binaries/node/versions/22.22.2-6/lark-cli" \
    "$HOME/.workbuddy-ai/binaries/node/versions/22.22.2-6/lark-cli"; do
    if [[ -x "$cand" ]]; then LARK="$cand"; break; fi
  done
fi
if [[ -z "$LARK" ]]; then
  echo "[sync-task-ledger] 找不到 lark-cli（先 npm i -g @larksuite/cli 并 auth login）" >&2
  exit 1
fi

# 定位 node（PATH 优先，回退 managed 版本）
NODE=""
if command -v node >/dev/null 2>&1; then
  NODE="node"
else
  for cand in \
    "/c/Users/ivan/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe" \
    "$HOME/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"; do
    if [[ -x "$cand" ]]; then NODE="$cand"; break; fi
  done
fi
if [[ -z "$NODE" ]]; then
  echo "[sync-task-ledger] 找不到 node" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP" 2>/dev/null || true' EXIT

CUR="$TMP/current.ndjson"
if ! "$LARK" base +record-list --base-token "$BASE_TOKEN" --table-id "$TABLE_ID" \
      --as user --format ndjson --output "$CUR" --overwrite >/dev/null 2>"$TMP/pull.err"; then
  echo "[sync-task-ledger] 拉取现状失败" >&2
  sed 's/^/    /' "$TMP/pull.err" >&2
  exit 1
fi

PLAN="$TMP/plan.sh"
MJS=( "$NODE" "$SCRIPT_DIR/sync-task-ledger.mjs"
  --ledger "$(to_win "$LEDGER")"
  --current "$(to_win "$CUR")"
  --out "$(to_win "$PLAN")"
  --state "$(to_win "$STATE_FILE")"
  --summary "$(to_win "$TMP/summary.json")" )
if [[ $DRY_RUN -eq 0 ]]; then MJS+=( --state-out "$(to_win "$STATE_PENDING")" ); fi
if [[ $FORCE -eq 1 ]]; then MJS+=( --force ); fi
"${MJS[@]}"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "[sync-task-ledger] DRY-RUN 计划（未执行）："
  cat "$PLAN"
  exit 0
fi

if [[ ! -s "$PLAN" ]]; then
  echo "[sync-task-ledger] 计划为空，无事可做"
  exit 0
fi

# 健全性闸：update 数必须 == 含 --record-id 的命令数，否则拒绝执行（防误建重复行）
UPDATES=$(grep -c '\[update\]' "$PLAN" 2>/dev/null || true)
WITHID=$(grep -c -- '--record-id' "$PLAN" 2>/dev/null || true)
if [ "${UPDATES:-0}" != "${WITHID:-0}" ]; then
  echo "[sync-task-ledger] ⛔ 计划健全性检查失败：计划含 update=$UPDATES 但带 --record-id 的命令=$WITHID；拒绝执行" >&2
  exit 1
fi

EXEC_LOG="$TMP/exec.log"
if ! { . "$PLAN"; } >"$EXEC_LOG" 2>&1; then
  echo "[sync-task-ledger] 写入执行出错：" >&2
  sed 's/^/    /' "$EXEC_LOG" >&2
  exit 1
fi

# 逐条成败标记（计划内每条命令带 [ok]/[fail]）；有失败则不提升快照，便于下次重试
FAILS=$(grep -c '^\[fail\]' "$EXEC_LOG" 2>/dev/null || true); FAILS=${FAILS:-0}
if [ "$FAILS" -gt 0 ]; then
  echo "[sync-task-ledger] ⛔ 写入执行有 $FAILS 条失败（快照未提升，下次重试）：" >&2
  grep '^\[fail\]' "$EXEC_LOG" | sed 's/^/    /' >&2
  exit 1
fi

# 全成功 → 提升投影快照（pending → final；只在非 dry-run 且 pending 存在时）
if [[ $DRY_RUN -eq 0 && -f "$STATE_PENDING" ]]; then
  mv -f "$STATE_PENDING" "$STATE_FILE"
  echo "[sync-task-ledger] 投影快照已更新：$STATE_FILE"
fi

CREATED=$(grep -c '^\[create\]' "$EXEC_LOG" 2>/dev/null || true)
UPDATED=$(grep -c '^\[update\]' "$EXEC_LOG" 2>/dev/null || true)
CREATED=${CREATED:-0}; UPDATED=${UPDATED:-0}
SKIP_N=$(grep -o '"skip": *[0-9]*' "$TMP/summary.json" 2>/dev/null | head -1 | grep -o '[0-9]*$' || true); SKIP_N=${SKIP_N:-0}
HELD_N=$(grep -o '"heldCount": *[0-9]*' "$TMP/summary.json" 2>/dev/null | head -1 | grep -o '[0-9]*$' || true); HELD_N=${HELD_N:-0}
echo "[sync-task-ledger] 完成 create=$CREATED update=$UPDATED skip=$SKIP_N held=$HELD_N base=$BASE_TOKEN table=$TABLE_ID"
if [ "$HELD_N" -gt 0 ]; then
  echo "[sync-task-ledger] ⛔ 对账闸拦下 $HELD_N 行（人手改/冲突/无快照），未投影；采纳后（更新 ledger）再同步，或确认后 --force 显式强推" >&2
  exit 1
fi
