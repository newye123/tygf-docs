#!/usr/bin/env node
// 任务台账投影器（纯变换，不 spawn、不联网）
//   输入：AI_MEMORY/ledger.jsonl（真相层，写入方产结构化记录）
//         + 飞书现状 ndjson（由 sync-task-ledger.sh 用 lark-cli 预先拉好）
//         + 投影快照 ndjson（上次成功投影时各格的值，供三值对账）
//   输出：一份可执行的 shell 计划（stdout 或 --out），交给 sync-task-ledger.sh 执行
//
// 为什么不让本脚本直接调 lark-cli：本沙箱下 node 进程内 spawn 子进程被拦
//   （spawnSync … EBUSY，2026-10-15 实测 4/4 失败），而 bash 直接执行 lark-cli 正常。
//   故本脚本只做「读—比对—生成命令」的纯函数，执行权交给 bash 编排器。
//
// 幂等纪律：lark-cli 的 +record-upsert 不做业务键自动 upsert（无 --record-id 即新建），
//   因此幂等由本脚本承担：按「任务ID」比对现状，命中则 update、未命中才 create。
// 写权纪律：本脚本产出的 payload 只含 8 个机器列，永不触碰「Owner 批注」列。
//
// 投影前对账闸（2026-10-15 夜 · P0）——防「人手改机器列被静默覆盖」：
//   逐格三值比对：台账值 L / 飞书现值 F / 上次投影快照值 P。
//     L = F            → 无碍（该行全等则整行跳过，不发写命令）
//     L ≠ F 且 F = P   → 正常待投影（放行）
//     L ≠ F 且 L = P   → 人手改（拦下整行，报告点名）
//     其余（L≠P 且 F≠P 且 L≠F）→ 冲突（拦下）
//     无快照（P 缺失）且 L≠F → 保守拦下（no-snapshot），--force 可显式强推
//   拦下语义：默认不动该行；--force 时全量覆盖并在报告里标 forced。
//   快照由 .sh 只在「执行全成功（无 [fail]）」时提升（pending → final）；
//   快照存台账值 L（含被拦行）——存飞书值会让下次误判为「待投影」而覆盖人手改。
//
// 归一口径：与 feishu-readback.mjs 的 normBy（text/date/select/time）同语义，勿各自偏移。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

// 目标表凭据：环境变量 → 本机私有 secrets.local.cjs（已 gitignore）→ 否则 fail-closed。
// 2026-10-21 按密钥纪律把原先硬编码在此的 base token 外移，禁止再写回本文件。
const LOCAL = (() => {
  try { return createRequire(import.meta.url)('./secrets.local.cjs') } catch { return {} }
})()
const BASE_TOKEN = process.env.LARK_TASK_BASE_TOKEN || LOCAL.baseToken || ''
const TABLE_ID = process.env.LARK_TASK_TABLE_ID || LOCAL.tableId || ''
if (!BASE_TOKEN || !TABLE_ID) {
  console.error('[sync-task-ledger] 缺目标表凭据：设 LARK_TASK_BASE_TOKEN/LARK_TASK_TABLE_ID，或建 scripts/secrets.local.cjs')
  process.exit(2)
}

// 机器列 ↔ ledger 字段映射（顺序即写入顺序）
const COLUMNS = [
  ['任务ID', 'taskId'],
  ['标题', 'title'],
  ['状态', 'status'],
  ['负责人', 'owner'],
  ['下一步', 'next'],
  ['出处', 'source'],
  ['更新时间', 'updatedAt'],
  ['到期日', 'due'],
]

// 各列归一化口径（与 feishu-readback.mjs COLS 第三位一致）
const KINDS = {
  任务ID: 'text', 标题: 'text', 状态: 'select', 负责人: 'text',
  下一步: 'text', 出处: 'text', 更新时间: 'time', 到期日: 'date',
}

// 字段级权限（与中台 MetaFieldPermission 元模型对齐）
// 默认全部可读可编辑（向后兼容）；可由 AI_MEMORY/meta-field-permissions.json 按角色覆盖
// 投影前按角色过滤：不可读字段不写入飞书；Owner 批注列继续永不触碰
const DEFAULT_FIELD_PERMISSIONS = Object.fromEntries(COLUMNS.map(([col]) => [col, { canRead: true, canEdit: true }]))
let FIELD_PERMISSIONS = DEFAULT_FIELD_PERMISSIONS

function loadFieldPermissions(role) {
  try {
    const pfPath = 'AI_MEMORY/meta-field-permissions.json'
    if (existsSync(pfPath)) {
      const pf = JSON.parse(readFileSync(pfPath, 'utf8'))
      const rolePerms = pf[role] || {}
      FIELD_PERMISSIONS = { ...DEFAULT_FIELD_PERMISSIONS, ...rolePerms }
    }
  } catch { /* 用默认值 */ }
  return FIELD_PERMISSIONS
}

// 到期日：ledger 存 'YYYY-MM-DD'（北京日），飞书 datetime 列要 epoch 毫秒；空值写 null 以清格
function parseDue(v) {
  const s = String(v ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const ms = Date.parse(s + 'T00:00:00+08:00')
  return Number.isFinite(ms) ? ms : null
}

// 状态枚举必须与飞书单选字段选项一致，否则写入被拒
const STATUS_ENUM = ['等您定', '进行中', '待复验', '已交付', '已搁置']

// —— 归一化（与 feishu-readback.mjs 同语义，勿各自偏移）——
function normText(v) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : (x && (x.text ?? x.name ?? x.value)) != null ? String(x.text ?? x.name ?? x.value) : JSON.stringify(x))).join('')
  return String(v)
}
function normTime(v) {
  const s = normText(v).trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2})?:?(\d{2})?/)
  if (!m) return s
  return `${m[1]}-${m[2]}-${m[3]} ${(m[4] ?? '00').padStart(2, '0')}:${(m[5] ?? '00').padStart(2, '0')}`
}
// 源头挡刀：账本日期列必须是可解析的时间串。归一化会把 "20:1x" 读成 "20:00"，
// 看着能用，但飞书按原样拒收 ⇒ 整次写入失败、快照不提升。故在出计划前先排除该行。
const TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
function isLegalTime(v) {
  const s = normText(v).trim()
  if (!s) return true
  const m = s.match(TIME_RE)
  if (!m) return false
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
  if (m[4] !== undefined && (Number(m[4]) > 23 || Number(m[5]) > 59)) return false
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}
function normDate(v) {
  const s = normTime(v)
  return s ? s.slice(0, 10) : ''
}
const normSelect = (v) => (Array.isArray(v) ? normText(v[0] ?? '') : normText(v))
function normBy(kind, v) {
  if (kind === 'date') return normDate(v)
  if (kind === 'time') return normTime(v)
  if (kind === 'select') return normSelect(v)
  return normText(v).trim()
}

function parseArgs(argv) {
  const out = { ledger: 'AI_MEMORY/ledger.jsonl', current: '', out: '', state: '', stateOut: '', summary: '', force: false, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ledger' && argv[i + 1]) out.ledger = argv[++i]
    else if (a === '--current' && argv[i + 1]) out.current = argv[++i]
    else if (a === '--out' && argv[i + 1]) out.out = argv[++i]
    else if (a === '--state' && argv[i + 1]) out.state = argv[++i]
    else if (a === '--state-out' && argv[i + 1]) out.stateOut = argv[++i]
    else if (a === '--summary' && argv[i + 1]) out.summary = argv[++i]
    else if (a === '--force') out.force = true
    else if (a === '--role' && argv[i + 1]) out.role = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
  }
  return out
}

function readLedger(path) {
  if (!existsSync(path)) return { rows: [], missing: true }
  const rows = []
  const raw = readFileSync(path, 'utf8')
  raw.split(/\r?\n/).forEach((line, idx) => {
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('#')) return
    try {
      rows.push({ ...JSON.parse(t), __line: idx + 1 })
    } catch (e) {
      rows.push({ __line: idx + 1, __parseError: String(e.message || e) })
    }
  })
  return { rows, missing: false }
}

// 现状 ndjson 每行含 record_id + 全部字段；建 任务ID → 记录对象 映射
function readCurrent(path) {
  const map = new Map()
  if (!path || !existsSync(path)) return map
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    try {
      const o = JSON.parse(t)
      const key = String(o['任务ID'] ?? '').trim()
      if (key && o.record_id) map.set(key, o)
    } catch { /* 跳过坏行 */ }
  }
  return map
}

// 投影快照：{taskId, record_id, values:{列→已归一化字符串}} 每行一条
function readState(path) {
  const map = new Map()
  if (!path || !existsSync(path)) return { map, found: false }
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('#')) continue
    try {
      const o = JSON.parse(t)
      const key = String(o.taskId ?? '').trim()
      if (key) map.set(key, o.values || {})
    } catch { /* 跳过坏行 */ }
  }
  return { map, found: true }
}

// 台账行 → 各机器列的归一化值
function ledgerValues(row) {
  const L = {}
  for (const [col, key] of COLUMNS) L[col] = normBy(KINDS[col], row[key])
  return L
}

// 飞书记录 → 各机器列的归一化值
function feishuValues(rec) {
  const F = {}
  for (const [col] of COLUMNS) F[col] = normBy(KINDS[col], rec[col])
  return F
}

// 三值比对：返回被拦下的格（明细）
function classify(L, F, P) {
  const held = []
  for (const [col] of COLUMNS) {
    const lv = L[col]
    const fv = F[col]
    if (lv === fv) continue
    if (!P) {
      held.push({ col, kind: 'no-snapshot', ledger: lv || '(空)', feishu: fv || '(空)', projected: '(无)' })
      continue
    }
    const pv = normBy(KINDS[col], P[col] ?? '')
    if (pv === fv) continue // 正常待投影：放行
    if (pv === lv) {
      held.push({ col, kind: 'human-edit', ledger: lv || '(空)', feishu: fv || '(空)', projected: pv || '(空)' })
      continue
    }
    held.push({ col, kind: 'conflict', ledger: lv || '(空)', feishu: fv || '(空)', projected: pv || '(空)' })
  }
  return held
}

function shQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'"
}

function buildPayload(row, fieldPermissions) {
  const payload = {}
  const skipped = []
  for (const [col, key] of COLUMNS) {
    const perm = fieldPermissions[col]
    if (perm && perm.canRead === false) {
      skipped.push(col)
      continue
    }
    const v = row[key]
    if (col === '状态') {
      payload[col] = [String(v ?? '')]
    } else if (col === '到期日') {
      payload[col] = parseDue(v)
    } else {
      payload[col] = v == null ? '' : String(v)
    }
  }
  return { payload, skipped }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  loadFieldPermissions(args.role || 'operator')
  const { rows, missing } = readLedger(args.ledger)
  const currentMap = readCurrent(args.current)
  const state = args.state ? readState(args.state) : { map: new Map(), found: false }
  const bootstrap = !!args.state && !state.found

  const summary = {
    ledger: args.ledger, currentKnown: currentMap.size, total: 0, deduped: 0,
    create: 0, update: 0, skip: 0, heldCount: 0, forcedCount: 0, invalidRowCount: 0,
    held: [], forced: [], errors: [], skippedFields: [],
    stateIn: args.state || null, stateFound: state.found, bootstrap, force: args.force, role: args.role || 'operator',
  }
  const commands = []
  const snapshotRows = []

  // ledger 为 append-only：同一 taskId 可能有历史多行，只取最后一条为准。
  // 否则同步前的 currentMap 会把重复 taskId 判成多次 create → 飞书出现重复记录。
  const lastByTaskId = new Map()
  let validCount = 0
  for (const row of rows) {
    if (row.__parseError) {
      summary.errors.push(`ledger:${row.__line} JSON 解析失败: ${row.__parseError}`)
      continue
    }
    const id = String(row.taskId ?? '').trim()
    if (!id) continue
    validCount++
    lastByTaskId.set(id, row)
  }
  summary.deduped = validCount - lastByTaskId.size
  const effectiveRows = [...lastByTaskId.values()]

  for (const row of effectiveRows) {
    summary.total++
    const taskId = String(row.taskId ?? '').trim()
    if (!taskId) {
      summary.errors.push(`ledger:${row.__line} 缺少 taskId，跳过`)
      continue
    }
    if (!STATUS_ENUM.includes(String(row.status ?? ''))) {
      summary.errors.push(`ledger:${row.__line} taskId=${taskId} 状态 "${row.status}" 不在枚举 [${STATUS_ENUM.join('/')}]，跳过`)
      continue
    }
    const badDate = [['更新时间', 'updatedAt'], ['到期日', 'due']].find(
      ([, key]) => String(row[key] ?? '').trim() !== '' && !isLegalTime(row[key])
    )
    if (badDate) {
      const [col, key] = badDate
      summary.invalidRowCount++
      summary.errors.push(`ledger:${row.__line} taskId=${taskId} ${col} "${String(row[key])}" 不是合法时间，本行不投影（其余行照常）`)
      process.stderr.write(`[sync-task-ledger] SKIP-INVALID ${taskId}｜${col}="${String(row[key])}" 不是合法时间，本行已排除\n`)
      continue
    }

    const L = ledgerValues(row)
    const rec = currentMap.get(taskId)
    const { payload, skipped } = buildPayload(row, FIELD_PERMISSIONS)
    const jsonArg = JSON.stringify(payload)
    if (skipped.length) summary.skippedFields.push({ taskId, cols: skipped })

    if (!rec) {
      // 新建：飞书侧无值可覆盖，对账闸不拦（与协议 v1 一致）
      summary.create++
      commands.push(`echo ${shQuote(`[create] ${taskId}`)}`)
      commands.push(
        `lark-cli base +record-upsert --base-token ${shQuote(BASE_TOKEN)} --table-id ${shQuote(TABLE_ID)} --as user --json ${shQuote(jsonArg)}` +
        ` && echo ${shQuote(`[ok] create ${taskId}`)} || echo ${shQuote(`[fail] create ${taskId}`)}`
      )
      snapshotRows.push({ taskId, record_id: null, values: L })
      continue
    }

    const recordId = String(rec.record_id)
    const F = feishuValues(rec)
    const P = state.map.get(taskId)
    const held = classify(L, F, P)

    if (held.length && !args.force) {
      summary.heldCount++
      summary.held.push({ taskId, record_id: recordId, cols: held })
      process.stderr.write(`[sync-task-ledger] HELD ${taskId}｜` + held.map((h) => `${h.col}=${h.kind}（台账=${h.ledger}｜飞书=${h.feishu}｜上投影=${h.projected}）`).join('、') + '\n')
      snapshotRows.push({ taskId, record_id: recordId, values: L })
      continue
    }
    if (held.length && args.force) {
      summary.forcedCount++
      summary.forced.push({ taskId, record_id: recordId, cols: held.map((h) => `${h.col}=${h.kind}`) })
    }

    const hasDiff = COLUMNS.some(([col]) => L[col] !== F[col])
    if (!hasDiff) {
      // 全等：无需写入（幂等简化，第二遍同步应 update=0）
      summary.skip++
      snapshotRows.push({ taskId, record_id: recordId, values: L })
      continue
    }

    summary.update++
    commands.push(`echo ${shQuote(`[update] ${taskId} → ${recordId}`)}`)
    commands.push(
      `lark-cli base +record-upsert --base-token ${shQuote(BASE_TOKEN)} --table-id ${shQuote(TABLE_ID)} --as user --record-id ${shQuote(recordId)} --json ${shQuote(jsonArg)}` +
      ` && echo ${shQuote(`[ok] update ${taskId}`)} || echo ${shQuote(`[fail] update ${taskId}`)}`
    )
    snapshotRows.push({ taskId, record_id: recordId, values: L })
  }

  const plan = [
    '#!/usr/bin/env bash',
    '# 由 scripts/sync-task-ledger.mjs 生成 —— 请勿手工编辑',
    'set -uo pipefail',
    ...commands,
  ].join('\n') + '\n'

  if (args.out) writeFileSync(args.out, plan)
  else process.stdout.write(plan)

  // 投影快照（pending 由 .sh 只在全成功后提升为正式快照）
  if (args.stateOut) {
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
    const lines = snapshotRows.map((r) => JSON.stringify({ ...r, updatedAt: now }))
    writeFileSync(args.stateOut, lines.join('\n') + '\n', 'utf8')
  }

  if (args.summary) writeFileSync(args.summary, JSON.stringify(summary, null, 1) + '\n', 'utf8')

  process.stderr.write('[sync-task-ledger] ' + JSON.stringify({ ...summary, held: undefined, forced: undefined }) + '\n')
  if (missing) process.stderr.write(`[sync-task-ledger] 警告：ledger 不存在 ${args.ledger}（视为空账）\n`)
  if (bootstrap) process.stderr.write('[sync-task-ledger] 警告：无投影快照（--state 不存在），差异格一律保守拦下（no-snapshot）；确认后可用 --force 强推\n')
  if (summary.forcedCount) process.stderr.write(`[sync-task-ledger] --force：${summary.forcedCount} 行差异被强制覆盖\n`)
  if (summary.errors.length) process.stderr.write(`[sync-task-ledger] ${summary.errors.length} 行被跳过（详见 summary.errors）\n`)
  if (summary.heldCount) process.stderr.write(`[sync-task-ledger] ${summary.heldCount} 行被对账闸拦下（详见上方 HELD 行），未投影\n`)
}

main()
