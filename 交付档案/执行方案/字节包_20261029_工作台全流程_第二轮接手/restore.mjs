#!/usr/bin/env node
/**
 * 第二轮（WB-UX-FLOW-20261029）字节包还原器。
 *
 * 作用：把这 19 个写入目标退回到第二轮动工之前的样子——
 *   · kind=modified 的 17 个：用 baseline/ 里的原件覆盖回去；
 *   · kind=added 的 2 个（新文件）：直接删掉。
 * 覆盖/删除后逐个核对 sha256（新增件核「文件已不存在」），对不上就 exit 1。
 *
 * 用法：
 *   node restore.mjs --root <目标树根> [--dry-run] [--quiet] [--backup-dir <目录>]
 *
 * 纪律（写在代码里，不是口头的）：
 *   1) 只认 manifest.json 列出的那 19 条路径，不扫目录、不猜；
 *   2) 任何路径解析后跑到 --root 之外即拒跑（exit 2），防手滑写错根；
 *   3) --dry-run 只打印将要发生的事，不落盘；
 *   4) 先备份被覆盖的现件到 <包>/pre-restore-<时间戳>/ 再动手（可反悔）；
 *   5) 还原失败不静默：逐条打印 FAIL 并 exit 1。
 *
 * 注意：execute-step.tsx 的基线是第二轮动工前的快照，不是 HEAD——
 * 该文件同时带着别的会话 2026-10-27 的未提交改动（D5 下载链接），
 * 用 HEAD 还原会把这些别人的活一起抹掉。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const PKG_DIR = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST = path.join(PKG_DIR, 'manifest.json')
const BASELINE = path.join(PKG_DIR, 'baseline')

function usage(msg) {
  if (msg) console.error(`restore: ${msg}`)
  console.error('用法: node restore.mjs --root <目标树根> [--dry-run] [--quiet] [--backup-dir <目录>]')
  process.exit(2)
}

const argv = process.argv.slice(2)
let root = null
let dryRun = false
let quiet = false
let backupDirOpt = null
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--root') {
    root = argv[++i] ?? null
  } else if (a.startsWith('--root=')) {
    root = a.slice('--root='.length)
  } else if (a === '--backup-dir') {
    backupDirOpt = argv[++i] ?? null
  } else if (a.startsWith('--backup-dir=')) {
    backupDirOpt = a.slice('--backup-dir='.length)
  } else if (a === '--dry-run') {
    dryRun = true
  } else if (a === '--quiet') {
    quiet = true
  } else if (a === '-h' || a === '--help') {
    usage()
  } else {
    usage(`不认识的参数 ${a}`)
  }
}
if (!root) usage('必须给 --root（要还原的那棵树的根目录）')

const rootAbs = path.resolve(root)
if (!fs.existsSync(rootAbs) || !fs.statSync(rootAbs).isDirectory()) usage(`--root 不是目录: ${rootAbs}`)

if (!fs.existsSync(MANIFEST)) usage(`找不到 manifest.json: ${MANIFEST}`)
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
if (!Array.isArray(manifest.files) || manifest.files.length === 0) usage('manifest.files 为空，拒绝执行')

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function bytes(file) {
  return fs.statSync(file).size
}

/** 解析并确认目标路径落在 --root 内。跑到外面就拒跑。 */
function insideRoot(rel) {
  const abs = path.resolve(rootAbs, rel)
  const relBack = path.relative(rootAbs, abs)
  if (relBack === '' || relBack.startsWith('..') || path.isAbsolute(relBack)) {
    usage(`路径越界，拒绝执行: ${rel} -> ${abs}`)
  }
  return abs
}

const stamp = new Date()
  .toLocaleString('sv-SE', { hour12: false })
  .replace(/[: ]/g, '-')
const backupDir = backupDirOpt ? path.resolve(backupDirOpt) : path.join(PKG_DIR, `pre-restore-${stamp}`)

let restored = 0
let removed = 0
let skipped = 0
const failures = []

if (!quiet) {
  console.log(`root     : ${rootAbs}`)
  console.log(`manifest : ${manifest.files.length} 条（${manifest.files.filter((f) => f.kind === 'modified').length} 改 / ${manifest.files.filter((f) => f.kind === 'added').length} 新增）`)
  console.log(`baseline : ${BASELINE}`)
  console.log(`mode     : ${dryRun ? 'DRY-RUN（不落盘）' : 'APPLY'}`)
  console.log('')
}

for (const f of manifest.files) {
  const target = insideRoot(f.path)

  if (f.kind === 'added') {
    if (!fs.existsSync(target)) {
      skipped++
      if (!quiet) console.log(`SKIP  ${f.path}  （新增件本就不在）`)
      continue
    }
    if (dryRun) {
      removed++
      if (!quiet) console.log(`DRY   ${f.path}  （会删除，现 ${bytes(target)} B）`)
      continue
    }
    const keep = path.join(backupDir, f.path)
    fs.mkdirSync(path.dirname(keep), { recursive: true })
    fs.copyFileSync(target, keep)
    fs.unlinkSync(target)
    if (fs.existsSync(target)) {
      failures.push(`${f.path}: 删除后仍然存在`)
    } else {
      removed++
      if (!quiet) console.log(`DEL   ${f.path}`)
    }
    continue
  }

  if (f.kind !== 'modified') {
    failures.push(`${f.path}: manifest 里出现未知 kind=${f.kind}`)
    continue
  }

  const src = path.join(BASELINE, f.path)
  if (!fs.existsSync(src)) {
    failures.push(`${f.path}: 基线缺失 ${src}`)
    continue
  }
  const wantSha = f.before?.sha256
  const wantBytes = f.before?.bytes
  if (!wantSha || typeof wantBytes !== 'number') {
    failures.push(`${f.path}: manifest 缺 before.sha256/bytes，无法核验`)
    continue
  }
  const srcSha = sha256(src)
  if (srcSha !== wantSha || bytes(src) !== wantBytes) {
    failures.push(`${f.path}: 基线自身与 manifest 不符（sha ${srcSha.slice(0, 12)} vs ${String(wantSha).slice(0, 12)}）`)
    continue
  }

  if (dryRun) {
    const cur = fs.existsSync(target) ? `${bytes(target)} B` : '缺失'
    restored++
    if (!quiet) console.log(`DRY   ${f.path}  （${cur} -> ${wantBytes} B）`)
    continue
  }

  if (fs.existsSync(target)) {
    const keep = path.join(backupDir, f.path)
    fs.mkdirSync(path.dirname(keep), { recursive: true })
    fs.copyFileSync(target, keep)
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true })
  }
  fs.copyFileSync(src, target)

  const gotSha = sha256(target)
  if (gotSha !== wantSha || bytes(target) !== wantBytes) {
    failures.push(`${f.path}: 还原后 sha 不符（${gotSha.slice(0, 12)} vs ${String(wantSha).slice(0, 12)}）`)
  } else {
    restored++
    if (!quiet) console.log(`OK    ${f.path}  ${wantBytes} B`)
  }
}

if (!quiet) {
  console.log('')
  console.log(`合计：还原 ${restored} · 删除 ${removed} · 跳过 ${skipped} · 失败 ${failures.length}${dryRun ? ' · DRY-RUN 未落盘' : ''}`)
  if (!dryRun && fs.existsSync(backupDir)) console.log(`还原前的现件已备份到：${backupDir}`)
}

if (failures.length) {
  console.error('')
  for (const m of failures) console.error(`FAIL  ${m}`)
  process.exit(1)
}
process.exit(0)
