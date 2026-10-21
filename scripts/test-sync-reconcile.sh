#!/usr/bin/env bash
# 投影前对账闸夹具测试（2026-10-15 夜 · P0）
#   只测 scripts/sync-task-ledger.mjs 的纯变换（不联网、不碰真表）：
#   三值比对分类（skip/update/hold/force/create）+ 快照输出 + update 必带 --record-id。
# 用法：bash scripts/test-sync-reconcile.sh  （退出码 0=全过）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MJS="$SCRIPT_DIR/sync-task-ledger.mjs"

to_win() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

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
if [[ -z "$NODE" ]]; then echo "找不到 node" >&2; exit 1; fi

T="$(mktemp -d)"
trap 'rm -rf "$T" 2>/dev/null || true' EXIT

PASS=0
FAIL=0

# check <描述> <文件> <grep模式> [期望=0 匹配 / 1 不匹配]
check() {
  local desc="$1" file="$2" pat="$3" want="${4:-0}" got
  if grep -qE "$pat" "$file" 2>/dev/null; then got=0; else got=1; fi
  if [ "$got" = "$want" ]; then
    PASS=$((PASS + 1)); echo "  ok   $desc"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL $desc（期望 match=$want；文件=$file；模式=$pat）"
    sed 's/^/       /' "$file" 2>/dev/null | head -40
  fi
}

run_mjs() { # run_mjs <目录> [额外参数...]
  local dir="$1"; shift
  "$NODE" "$MJS" \
    --ledger "$(to_win "$dir/ledger.jsonl")" \
    --current "$(to_win "$dir/current.ndjson")" \
    --out "$(to_win "$dir/plan.sh")" \
    --summary "$(to_win "$dir/summary.json")" \
    --state-out "$(to_win "$dir/state.pending.ndjson")" \
    "$@" 2>"$dir/mjs.err" || true
}

new_case() { # 建一个目录并写入公共夹具，可变字段由调用方覆盖：$1=目录
  local d="$1"; mkdir -p "$d"
  cat >"$d/ledger.jsonl" <<'EOF'
{"taskId":"T1","title":"甲任务","status":"进行中","owner":"总控长","next":"n1","source":"s1.md:1","updatedAt":"2026-10-15 10:00","due":"2026-10-16","wip":false}
EOF
  cat >"$d/current.ndjson" <<'EOF'
{"record_id":"rec1","任务ID":"T1","标题":"甲任务","状态":["进行中"],"负责人":"总控长","下一步":"n1","出处":"s1.md:1","更新时间":"2026-10-15T10:00:00+08:00","到期日":"2026-10-16T00:00:00+08:00"}
EOF
  cat >"$d/state1.ndjson" <<'EOF'
{"taskId":"T1","record_id":"rec1","values":{"任务ID":"T1","标题":"甲任务","状态":"进行中","负责人":"总控长","下一步":"n1","出处":"s1.md:1","更新时间":"2026-10-15 10:00","到期日":"2026-10-16"},"updatedAt":"2026-10-15 22:00"}
EOF
}

echo "== 例1 全等 → skip（不发写命令；快照带 T1） =="
D="$T/c1"; new_case "$D"
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")"
check "summary skip=1" "$D/summary.json" '"skip": 1'
check "summary update=0" "$D/summary.json" '"update": 0'
check "summary heldCount=0" "$D/summary.json" '"heldCount": 0'
check "计划不含 lark-cli" "$D/plan.sh" 'lark-cli' 1
check "快照 pending 写入且含 T1" "$D/state.pending.ndjson" '"taskId":"T1"'

echo "== 例2 待投影（F=P）→ update 放行（带 --record-id） =="
D="$T/c2"; new_case "$D"
sed -i 's/"下一步":"n1"/"下一步":"old-n1"/' "$D/current.ndjson"
sed -i 's/"下一步":"n1"/"下一步":"old-n1"/' "$D/state1.ndjson"
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")"
check "summary update=1" "$D/summary.json" '"update": 1'
check "summary heldCount=0" "$D/summary.json" '"heldCount": 0'
check "计划含 [update]" "$D/plan.sh" '\[update\]'
check "计划带 --record-id" "$D/plan.sh" "\-\-record-id 'rec1'"
UP=$(grep -c '\[update\]' "$D/plan.sh" || true); WI=$(grep -c -- '--record-id' "$D/plan.sh" || true)
check "健全性：update=$UP == withid=$WI" <(printf 'eq=%s\n' "$UP") "eq=$WI"

echo "== 例3 人手改（L=P，飞书被改）→ 拦下 =="
D="$T/c3"; new_case "$D"
sed -i 's/"下一步":"n1"/"下一步":"手改值"/' "$D/current.ndjson"
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")"
check "summary heldCount=1" "$D/summary.json" '"heldCount": 1'
check "summary update=0" "$D/summary.json" '"update": 0'
check "类别 human-edit" "$D/summary.json" 'human-edit'
check "计划不含 lark-cli" "$D/plan.sh" 'lark-cli' 1
check "stderr 有 HELD 行" "$D/mjs.err" 'HELD T1'

echo "== 例4 冲突（L≠F 且两边都动）→ 拦下 =="
D="$T/c4"; new_case "$D"
sed -i 's/"taskId":"T1","title":"甲任务","status":"进行中","owner":"总控长","next":"n1"/"taskId":"T1","title":"甲任务","status":"进行中","owner":"总控长","next":"ledger新"/' "$D/ledger.jsonl"
sed -i 's/"下一步":"n1"/"下一步":"飞书值"/' "$D/current.ndjson"
sed -i 's/"下一步":"n1"/"下一步":"上投影旧"/' "$D/state1.ndjson"
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")"
check "summary heldCount=1" "$D/summary.json" '"heldCount": 1'
check "类别 conflict" "$D/summary.json" 'conflict'
check "计划不含 lark-cli" "$D/plan.sh" 'lark-cli' 1

echo "== 例5 无快照（--state 不存在）→ 保守拦下 no-snapshot =="
D="$T/c5"; new_case "$D"
sed -i 's/"下一步":"n1"/"下一步":"old-n1"/' "$D/current.ndjson"
run_mjs "$D" --state "$(to_win "$D/no-such-state.ndjson")"
check "summary heldCount=1" "$D/summary.json" '"heldCount": 1'
check "类别 no-snapshot" "$D/summary.json" 'no-snapshot'
check "summary bootstrap=true" "$D/summary.json" '"bootstrap": true'

echo "== 例6 --force → 强制全量覆盖（forced 计数、update 放行） =="
D="$T/c6"; new_case "$D"
sed -i 's/"下一步":"n1"/"下一步":"手改值"/' "$D/current.ndjson"
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")" --force
check "summary forcedCount=1" "$D/summary.json" '"forcedCount": 1'
check "summary heldCount=0" "$D/summary.json" '"heldCount": 0'
check "summary update=1" "$D/summary.json" '"update": 1'
check "计划带 --record-id" "$D/plan.sh" "\-\-record-id 'rec1'"

echo "== 例7 新建（飞书无此行）→ create（对账闸不拦；快照含新行） =="
D="$T/c7"; new_case "$D"
cat >>"$D/ledger.jsonl" <<'EOF'
{"taskId":"T2","title":"乙任务","status":"等您定","owner":"总控长","next":"n2","source":"s2.md:2","updatedAt":"2026-10-15 21:00","due":"2026-10-20"}
EOF
run_mjs "$D" --state "$(to_win "$D/state1.ndjson")"
check "summary create=1" "$D/summary.json" '"create": 1'
check "summary update=0" "$D/summary.json" '"update": 0'
check "计划含 [create] T2" "$D/plan.sh" '\[create\] T2'
check "快照含 T2" "$D/state.pending.ndjson" '"taskId":"T2"'

echo
echo "== 结果：PASS=$PASS FAIL=$FAIL =="
[ "$FAIL" -eq 0 ] || exit 1
