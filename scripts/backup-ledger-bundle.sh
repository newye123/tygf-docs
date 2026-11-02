#!/usr/bin/env bash
# 记账仓 bundle 第二副本（GitHub 之外的冷备）
#
# 为什么需要：GitHub 是唯一副本时，账号级事故（仓被删／密钥吊销／误删分支）会连带丢掉
# 全部记账历史。bundle 是 git 官方的离线打包格式，能从零 clone 回来。
#
# 用法：
#   bash scripts/backup-ledger-bundle.sh            # 生成 + 上传 + 远端校验
#   BACKUP_REMOTE=tygf-server bash scripts/backup-ledger-bundle.sh
#   bash scripts/backup-ledger-bundle.sh --verify-only   # 只查远端副本是否落后（日检用）
#
# 退出码：0=已就绪；1=落后/失败；2=环境不满足
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

REMOTE="${BACKUP_REMOTE:-tygf-server}"
DEST="${BACKUP_DEST:-tygf-ledger-backups}"
KEEP="${BACKUP_KEEP:-3}"
OUT_DIR="$ROOT/tmp/ledger-bundle"
LATEST_NAME="ledger-latest.bundle"
META_NAME="ledger-latest.head"

die() { echo "⛔ $*" >&2; exit 1; }
ok()  { echo "✅ $*"; }

command -v git >/dev/null 2>&1 || die "git 不在 PATH"
command -v sha256sum >/dev/null 2>&1 || die "sha256sum 不在 PATH"

LOCAL_HEAD="$(git rev-parse master 2>/dev/null)" || die "取不到本地 master"

# ---------- 只验证模式（日检用，不产生任何写入） ----------
if [ "${1:-}" = "--verify-only" ]; then
  command -v ssh >/dev/null 2>&1 || { echo "bundle 冷备：⚠ ssh 不可用，无法验证（不算告警）"; exit 0; }
  remote_meta="$(timeout 30 ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" \
      "cat ~/$DEST/$META_NAME 2>/dev/null" 2>/dev/null)"
  if [ -z "$remote_meta" ]; then
    echo "bundle 冷备：⚠ 服务器上没有 $DEST/$META_NAME（从未生成或目录被清）"
    echo "    修：bash scripts/backup-ledger-bundle.sh"
    exit 1
  fi
  # 元数据是单行两字段：<commit>\t<YYYY-MM-DD HH:MM>
  r_head="$(printf '%s' "$remote_meta" | awk -F'\t' 'NR==1{print $1}')"
  r_time="$(printf '%s' "$remote_meta" | awk -F'\t' 'NR==1{print $2}')"
  if [ "$r_head" = "$LOCAL_HEAD" ]; then
    ok "bundle 冷备：服务器副本 = 本地 master ${LOCAL_HEAD:0:7}（生成于 ${r_time:-未知}）"
    exit 0
  fi
  # 远端是本地祖先 ⇒ 只是落后若干笔，不是损坏。
  # bundle 的 RPO 定为 7 天（GitHub 那条链是 RPO 0，这条只是第二副本），
  # 落后几笔属正常窗口，超过 7 天不刷新才告警 —— 否则每提交一次就报红，闸会被当噪音忽略。
  if git merge-base --is-ancestor "$r_head" "$LOCAL_HEAD" 2>/dev/null; then
    behind="$(git rev-list --count "$r_head..$LOCAL_HEAD" 2>/dev/null)"
    r_epoch="$(date -d "$r_time" +%s 2>/dev/null || echo 0)"
    now_epoch="$(date +%s)"
    if [ "$r_epoch" -gt 0 ]; then age_days=$(( (now_epoch - r_epoch) / 86400 )); else age_days=999; fi
    if [ "$age_days" -ge 7 ]; then
      echo "⚠ bundle 冷备落后 ${behind:-?} 笔，且已 ${age_days} 天未刷新（RPO 上限 7 天）"
      echo "    修：bash scripts/backup-ledger-bundle.sh"
      exit 1
    fi
    ok "bundle 冷备：落后 ${behind:-?} 笔，${age_days} 天内（RPO 7 天，属正常窗口）"
    exit 0
  fi
  echo "⚠ bundle 冷备与本地不是同一条历史（副本 ${r_head:0:7}），需重新生成"
  exit 1
fi

# ---------- 生成 + 上传 ----------
command -v scp >/dev/null 2>&1 || die "scp 不在 PATH"
mkdir -p "$OUT_DIR" || die "无法创建 $OUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
BUNDLE="$OUT_DIR/ledger-$STAMP.bundle"

echo "生成 bundle（HEAD ${LOCAL_HEAD:0:7}）…"
git bundle create "$BUNDLE" --all >/dev/null 2>&1 || die "git bundle create 失败"
git bundle verify "$BUNDLE" >/dev/null 2>&1 || die "git bundle verify 失败（包不自洽）"
LOCAL_SHA="$(sha256sum "$BUNDLE" | cut -d' ' -f1)"
SIZE_H="$(du -h "$BUNDLE" | cut -f1)"
ok "本地 bundle $SIZE_H  sha256=${LOCAL_SHA:0:16}…"

# 远端目录 + 上传（大包可能慢，给足超时）
timeout 60 ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" "mkdir -p ~/$DEST" \
  || die "远端不可达或无法建目录 ~/$DEST"
echo "上传中…"
timeout 900 scp -q "$BUNDLE" "$REMOTE:~/$DEST/ledger-$STAMP.bundle" || die "scp 上传失败"
timeout 900 scp -q "$BUNDLE" "$REMOTE:~/$DEST/$LATEST_NAME" || die "scp 上传 latest 失败"

# 远端校验：逐位比对 sha256，并把 HEAD 元数据落盘（日检读它，不读本地缓存）
REMOTE_SHA="$(timeout 180 ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" \
    "sha256sum ~/$DEST/$LATEST_NAME 2>/dev/null | cut -d' ' -f1" 2>/dev/null)"
if [ "$REMOTE_SHA" != "$LOCAL_SHA" ]; then
  die "远端校验失败：本地 ${LOCAL_SHA:0:16}… / 远端 ${REMOTE_SHA:0:16}…"
fi
ok "远端 sha256 逐位一致"

timeout 60 ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" \
  "printf '%s\t%s\n' '$LOCAL_HEAD' '$(date '+%Y-%m-%d %H:%M')' > ~/$DEST/$META_NAME" \
  || die "写远端元数据失败"

# 轮转：只留最近 KEEP 份带时间戳的包（latest 固定名不参与轮转）
timeout 60 ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" \
  "cd ~/$DEST && ls -1t ledger-*.bundle 2>/dev/null | grep -v '^$LATEST_NAME$' | tail -n +$((KEEP + 1)) | xargs -r rm -f" \
  >/dev/null 2>&1 || echo "（提示：轮转旧包失败，不影响本次备份）"

ok "bundle 冷备完成：$REMOTE:~/$DEST/ledger-$STAMP.bundle（$SIZE_H，保留最近 $KEEP 份）"
