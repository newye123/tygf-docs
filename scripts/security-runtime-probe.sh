#!/usr/bin/env bash
# 运行时安全探针（可复跑）—— 判"我们的运行时是否还站在已知的安全水位之上"。
#
# 为什么要有它：2026-10-22 之前两次都是 Owner 看到新闻才发起排查（PHP 假警报、Node 落后一整个安全版本）。
# 这条脚本把"看新闻"换成"每月跑一次并给出 rc"，红就点名缺哪一件。
#
# 用法：
#   bash scripts/security-runtime-probe.sh              # 连服务器 + 查官方发行索引
#   bash scripts/security-runtime-probe.sh --offline     # 只查服务器侧（不联网，供网络受限环境）
# 退出码：0＝全绿；1＝有 FAIL（需处理）；2＝探针自己跑不动（缺 ssh/网络/基线文件，不等于安全）
set -uo pipefail

BASELINE="$(cd "$(dirname "$0")/.." && pwd)/scripts/security-runtime-baseline.json"
OFFLINE=0
[[ "${1:-}" == "--offline" ]] && OFFLINE=1

[[ -f "$BASELINE" ]] || { echo "[probe-broken] 基线文件不存在：$BASELINE"; exit 2; }
command -v ssh >/dev/null 2>&1 || { echo "[probe-broken] 本机没有 ssh"; exit 2; }

# 一次读全部基线字段（八条 node -e 太脆，2026-10-22 实测被自己的括号咬了一次）
if ! eval "$(node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const q = (v) => JSON.stringify(String(v === undefined || v === null ? "" : v));
const out = [];
out.push("HOST=" + q(b.serverSshHost));
out.push("MIN_VER=" + q(b.minVersion));
out.push("ABI_WANT=" + q(b.abi));
out.push("ORIGIN_WANT=" + q(b.allowedOriginsMustInclude));
out.push("REBOOT_WANT=" + q(b.automaticRebootMustBe));
out.push("DISK_MIN=" + q(b.diskFreePctMin));
out.push("FAILED_WANT=" + q(b.expectedFailedUnits));
out.push("LINE=" + q(b.nodeLine));
process.stdout.write(out.join("\n") + "\n");
' "$BASELINE")"; then
  echo "[probe-broken] 基线 JSON 解析失败：$BASELINE"
  exit 2
fi
[[ -n "${HOST:-}" && -n "$MIN_VER" ]] || { echo "[probe-broken] 基线缺字段（HOST/MIN_VER）"; exit 2; }

FAILS=0; WARNS=0
ok()   { printf '[ok]   %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; WARNS=$((WARNS+1)); }
bad()  { printf '[FAIL] %s\n' "$*"; FAILS=$((FAILS+1)); }

# 版本比较：$1 < $2 时返回 0（真）
ver_lt() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ] && [ "$1" != "$2" ]; }

echo "运行时安全探针  $(date '+%F %T %Z')  主机=$HOST  基线=$BASELINE"
echo "--- 服务器侧实测 ---"

if ! REMOTE=$(ssh -o BatchMode=yes -o ConnectTimeout=12 "$HOST" 'bash -s' <<'REMOTE_EOF'
echo "system_node=$(/usr/bin/node -v 2>/dev/null | tr -d v)"
echo "opt_node=$(/opt/tygf-node-v22/bin/node -v 2>/dev/null | tr -d v)"
echo "opt_abi=$(/opt/tygf-node-v22/bin/node -p process.versions.modules 2>/dev/null)"
echo "opt_resolved=$(readlink -f /opt/tygf-node-v22/bin/node 2>/dev/null)"
echo "security_left=$(apt list --upgradable 2>/dev/null | grep -c '/noble-security' || true)"
echo "pending_all=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst' || true)"
echo "upgradable=$(apt list --upgradable 2>/dev/null | grep -vc '^Listing' || true)"
echo "auto_security_line=$(grep -cE '^[[:space:]]*"\$\{distro_id\}:\$\{distro_codename\}-security";' /etc/apt/apt.conf.d/50unattended-upgrades || true)"
echo "reboot_flag=$(grep -E '^[[:space:]]*Unattended-Upgrade::Automatic-Reboot[[:space:]]' /etc/apt/apt.conf.d/50unattended-upgrades | grep -oE '"[a-z]+"' | tr -d '"' || true)"
echo "failed_units=$(systemctl --failed --no-legend --no-pager 2>/dev/null | wc -l)"
echo "failed_list=$(systemctl --failed --no-legend --no-pager 2>/dev/null | awk '{print $2}' | paste -sd, -)"
echo "disk_free_pct=$(df -P / | awk 'NR==2{gsub("%","",$5); print 100-$5}')"
echo "kernel=$(uname -r)"
# 业务库定时备份新鲜度（2026-10-22 上线 tygf-db-backup.timer；缺这份判据＝"备份有没有在跑"只能靠人记）
latest_epoch=$(sudo -n find /var/www/tygf-state-backup/prod -mindepth 1 -maxdepth 1 -type d -printf "%T@\n" 2>/dev/null | sort -nr | head -1 | cut -d. -f1)
[[ -z "$latest_epoch" ]] && latest_epoch=0
echo "backup_age_h=$(( ( $(date +%s) - latest_epoch ) / 3600 ))"
echo "backup_sites=$(sudo -n ls -1 /var/www/tygf-state-backup 2>/dev/null | wc -l)"
REMOTE_EOF
); then
  echo "[probe-broken] ssh 取数失败（$HOST）—— 这是探针自己坏了，不得读成「安全」"
  exit 2
fi

get() { printf '%s\n' "$REMOTE" | grep "^$1=" | head -1 | cut -d= -f2-; }
SYS_NODE=$(get system_node); OPT_NODE=$(get opt_node); OPT_ABI=$(get opt_abi); OPT_REAL=$(get opt_resolved)
SEC_LEFT=$(get security_left); PENDING_ALL=$(get pending_all); UPGR=$(get upgradable)
AUTO_LINE=$(get auto_security_line); REBOOT=$(get reboot_flag)
FAILED=$(get failed_units); FAILED_LIST=$(get failed_list)
DISK_PCT=$(get disk_free_pct); KERNEL=$(get kernel)

echo "  系统 node=v${SYS_NODE}／业务 node=v${OPT_NODE}（ABI ${OPT_ABI}，实指 ${OPT_REAL}）内核 ${KERNEL}"

# 1) 业务运行时不得低于基线水位
if [[ -z "$OPT_NODE" ]]; then bad "读不到业务运行时版本（路径变了？）"
elif ver_lt "$OPT_NODE" "$MIN_VER"; then bad "业务运行时 v$OPT_NODE 低于基线 v$MIN_VER —— 缺安全补丁"
else ok "业务运行时 v$OPT_NODE ≥ 基线 v$MIN_VER"; fi

# 2) 系统运行时同样不得掉回 EOL 线
if [[ -z "$SYS_NODE" ]]; then ok "系统里没有 /usr/bin/node（无 EOL 运行时敞口）"
elif ver_lt "$SYS_NODE" "$MIN_VER"; then bad "系统运行时 v$SYS_NODE 低于基线 v$MIN_VER（PM2 守护进程与任何写死 /usr/bin/node 的单元都跑在它上面）"
else ok "系统运行时 v$SYS_NODE ≥ 基线 v$MIN_VER"; fi

# 3) ABI 必须与基线一致（不一致＝依赖可能要重装，升版方式要重评）
if [[ "$OPT_ABI" == "$ABI_WANT" ]]; then ok "ABI=$OPT_ABI 与基线一致"
else bad "ABI=$OPT_ABI ≠ 基线 $ABI_WANT（升大版了？核对原生依赖与部署链）"; fi

# 4) 待装**安全**包必须为 0（按 pocket 数：apt list --upgradable 的行里带 /noble-security 才算安全包）
if [[ "${SEC_LEFT:-x}" == "0" ]]; then ok "待装安全包 0（noble-security 源里 0 行）"
else bad "待装安全包 $SEC_LEFT 个（来自 noble-security）—— 自动更新又没工作？"; fi
# 非安全类的待装只提醒，不当闸（Ubuntu 对部分包做灰度推送 phasing，强推反而危险）
if [[ "${PENDING_ALL:-0}" -gt 0 ]]; then warn "另有 $PENDING_ALL 个待装（非安全 pocket，含官方灰度 phasing 的包）—— 看情况升，不当闸"; fi

# 5) 自动更新必须真的允许 security 源（直接核配置，不解析日志——日志会随轮转消失）
if [[ "${AUTO_LINE:-0}" -ge 1 ]]; then ok "自动更新已放开 ${ORIGIN_WANT}（配置里那行未被注释）"
else bad "自动更新配置里 security 那行仍是注释态 ⇒ 它不会打安全补丁（本轮 158 个积压就是这么来的）"; fi

# 6) 自动重启必须关着（这机器没人值守）
if [[ "$REBOOT" == "$REBOOT_WANT" ]]; then ok "Automatic-Reboot=$REBOOT_WANT"
else bad "Automatic-Reboot=${REBOOT:-取不到} 应为 $REBOOT_WANT（无人值守机器不许自动重启）"; fi

# 7) 红单元只允许存量那一枚
if [[ "${FAILED:-x}" == "$FAILED_WANT" ]]; then ok "红单元 $FAILED 枚＝基线（存量：$FAILED_LIST）"
elif [[ "${FAILED:-99}" -gt "$FAILED_WANT" ]]; then bad "红单元 $FAILED 枚 > 基线 $FAILED_WANT（新增：$FAILED_LIST）"
else warn "红单元 $FAILED 枚 < 基线 $FAILED_WANT（存量那枚自己好了？查清原因再下调基线）"; fi

# 8) 磁盘
if [[ -n "$DISK_PCT" && "$DISK_PCT" -lt "$DISK_MIN" ]]; then bad "磁盘可用 ${DISK_PCT}% < ${DISK_MIN}%（下次大版本更新会写到一半满盘）"
else ok "磁盘可用 ${DISK_PCT}%"; fi

# 9) 官方发行索引：索引在服务器上取（本机 curl nodejs.org 实测 http=000 取不到，服务器 0.05 秒 335 KB），
#    解析交给独立文件 scripts/security-runtime-latest.mjs（塞进 heredoc 的 node -e 会被解析器咬）
OFFICIAL=""
if [[ "$OFFLINE" -eq 0 ]]; then
  OFFICIAL=$(ssh -o BatchMode=yes -o ConnectTimeout=12 "$HOST" 'curl -s --max-time 25 https://nodejs.org/dist/index.json' 2>/dev/null \
    | node "$(dirname "$0")/security-runtime-latest.mjs" "$LINE" 2>/dev/null || true)
fi
OFF_VER=${OFFICIAL%%|*}; OFF_DATE=$(printf '%s' "$OFFICIAL" | cut -s -d'|' -f2); OFF_KIND=$(printf '%s' "$OFFICIAL" | cut -s -d'|' -f3)
if [[ "$OFFLINE" -eq 1 ]]; then
  echo "[skip] 官方发行索引（--offline）"
elif [[ -z "$OFF_VER" ]]; then
  warn "官方发行索引取不到（服务器侧网络或索引格式变了）——这一项本轮未核，不得读成「已核过没问题」"
elif ver_lt "$OPT_NODE" "$OFF_VER"; then
  if [[ "$OFF_KIND" == "security" ]]; then
    bad "官方 $LINE 最新是 v$OFF_VER（$OFF_DATE，**安全版**），我们在 v$OPT_NODE —— 必须升"
  else
    warn "官方 $LINE 最新是 v$OFF_VER（$OFF_DATE，非安全版），我们在 v$OPT_NODE —— 不必立刻升，但要看一眼"
  fi
else
  ok "已是官方 $LINE 最新（v$OFF_VER，$OFF_DATE，$OFF_KIND）"
fi

# 10) 业务库定时备份新鲜度（tygf-db-backup.timer 每天 03:30 ⇒ 超 26 小时没新备份＝它没在跑）
BK_AGE=$(get backup_age_h); BK_SITES=$(get backup_sites)
BK_MAX=$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.backupMaxAgeHours??26))' "$BASELINE" 2>/dev/null || echo 26)
if [[ "${BK_AGE:-99999}" -le "$BK_MAX" && "${BK_SITES:-0}" -ge 2 ]]; then ok "业务库备份新鲜（最新一份 ${BK_AGE}h 前 ≤ ${BK_MAX}h，${BK_SITES} 个站点目录）"
else bad "业务库备份不新鲜（最新 ${BK_AGE}h 前，站点目录 ${BK_SITES} 个；阈值 ${BK_MAX}h）⇒ tygf-db-backup.timer 可能没跑"; fi

echo "--- 判定 ---"
echo "FAIL=$FAILS WARN=$WARNS"
if [[ "$FAILS" -gt 0 ]]; then echo "结论：需要处理（按上面点名逐条来）"; exit 1; fi
if [[ "$WARNS" -gt 0 ]]; then echo "结论：可继续，但有 $WARNS 条要看一眼"; exit 0; fi
echo "结论：全绿"; exit 0
