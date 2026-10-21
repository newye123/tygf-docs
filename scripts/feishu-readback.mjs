#!/usr/bin/env node
// 飞书回读闸（纯变换，不 spawn、不联网）
//   为什么：投影是单向的（ledger → 飞书）。Owner 在飞书里写的「Owner 批注」、
//   手改的机器列、手加的空行/新行，本机原先一概看不到 → 本条把飞书读回，
//   与真相层 ledger 对账，把差异变成告警，并记住已读批注（避免重复报警）。
//
// 输入：--feishu tmp|AI_MEMORY 下的 records.ndjson（由 control-plane.sh 用 lark-cli 拉好）
//       --ledger AI_MEMORY/ledger.jsonl（真相层，同 taskId 取最后一条）
//       --state  已读批注的哈希清单（本脚本负责追加）
// 输出：人读报告 + --json 判定；有「新批注／漂移／表里多余行／缺行／重复行」即告警（退出码 1）
// 2026-10-15 补：重复行检测（事故：PS 复刻执行投影计划丢 --record-id，19 任务 ×3 重复行）

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const COLS = [
  ['任务ID', 'taskId', 'text'],
  ['标题', 'title', 'text'],
  ['状态', 'status', 'select'],
  ['负责人', 'owner', 'text'],
  ['下一步', 'next', 'text'],
  ['出处', 'source', 'text'],
  ['更新时间', 'updatedAt', 'time'],
  ['到期日', 'due', 'date'],
]

function parseArgs(argv) {
  const out = { feishu: 'AI_MEMORY/readback/records.ndjson', ledger: 'AI_MEMORY/ledger.jsonl', state: 'AI_MEMORY/readback/state.json', json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--feishu' && argv[i + 1]) out.feishu = argv[++i]
    else if (a === '--ledger' && argv[i + 1]) out.ledger = argv[++i]
    else if (a === '--state' && argv[i + 1]) out.state = argv[++i]
    else if (a === '--json') out.json = true
  }
  return out
}

function readJsonl(p) {
  const rows = []
  if (!existsSync(p)) return { rows, missing: true }
  for (const line of readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('#')) continue
    try { rows.push(JSON.parse(t)) } catch { /* 坏行由 control-plane.mjs 负责报 */ }
  }
  return { rows, missing: false }
}

// 飞书字段可能是 string / 富文本数组 / null
function normText(v) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : (x && (x.text ?? x.name ?? x.value)) != null ? String(x.text ?? x.name ?? x.value) : JSON.stringify(x))).join('')
  return String(v)
}

// 时间：ledger 存 'YYYY-MM-DD HH:mm' 或 'YYYY-MM-DD'；飞书回 ISO（+08:00）
function normTime(v) {
  const s = normText(v).trim()
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2})?:?(\d{2})?/)
  if (!m) return s
  return `${m[1]}-${m[2]}-${m[3]} ${(m[4] ?? '00').padStart(2, '0')}:${(m[5] ?? '00').padStart(2, '0')}`
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

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const ledger = readJsonl(args.ledger)
  const feishu = readJsonl(args.feishu)
  let state = { notes: [], updatedAt: null }
  if (existsSync(args.state)) {
    try { state = { ...state, ...JSON.parse(readFileSync(args.state, 'utf8')) } } catch { /* 坏了就当空 */ }
  }
  const seen = new Set(state.notes || [])

  const last = new Map()
  for (const r of ledger.rows) {
    const id = String(r.taskId ?? '').trim()
    if (id) last.set(id, r)
  }

  const notes = []
  const drift = []
  const orphanRows = []
  const foreignRows = []
  const seenIds = new Set()
  const idCount = new Map()

  for (const rec of feishu.rows) {
    const taskId = normBy('text', rec['任务ID'])
    if (!taskId) {
      orphanRows.push({ record_id: rec.record_id ?? null, 批注: normText(rec['Owner 批注']).trim() || null })
      continue
    }
    seenIds.add(taskId)
    idCount.set(taskId, (idCount.get(taskId) || 0) + 1)
    const row = last.get(taskId)
    if (!row) {
      foreignRows.push({ taskId, record_id: rec.record_id ?? null, 状态: normBy('select', rec['状态']) })
      continue
    }
    const note = normText(rec['Owner 批注']).trim()
    if (note) {
      const h = sha1(taskId + '|' + note)
      notes.push({ taskId, isNew: !seen.has(h), hash: h, text: note })
    }
    for (const [col, key, kind] of COLS) {
      if (col === '任务ID') continue
      const fv = normBy(kind, rec[col])
      const lv = normBy(kind, row[key])
      if (fv !== lv) drift.push({ taskId, field: col, ledger: lv || '(空)', feishu: fv || '(空)' })
    }
  }

  const missingInFeishu = [...last.keys()].filter((id) => !seenIds.has(id))
  const dupRows = [...idCount.entries()].filter(([, n]) => n > 1)

  const newNotes = notes.filter((n) => n.isNew)
  const alarms = []
  for (const n of newNotes) alarms.push(`Owner 新批注：${n.taskId}｜${n.text}`)
  for (const d of drift) alarms.push(`机器列漂移（飞书值≠真相层）：${d.taskId}｜${d.field}｜ledger=${d.ledger}｜飞书=${d.feishu}`)
  for (const o of orphanRows) alarms.push(`表里有多余行（无任务ID，可能手加或残渣）：record_id=${o.record_id}${o.批注 ? '｜批注：' + o.批注 : ''}`)
  for (const [id, n] of dupRows) alarms.push(`重复行（同一任务ID多条记录）：${id}×${n}`)
  for (const f of foreignRows) alarms.push(`表里有台账外的任务：${f.taskId}（record_id=${f.record_id}）`)
  for (const m of missingInFeishu) alarms.push(`台账里有但表里缺行：${m}（投影未落地）`)
  if (feishu.missing) alarms.push(`飞书快照不存在：${args.feishu}（回读未执行）`)
  if (ledger.missing) alarms.push(`ledger 不存在：${args.ledger}`)

  const verdict = { ok: alarms.length === 0, feishuRecords: feishu.rows.length, ledgerTasks: last.size, notes, newNotes: newNotes.length, drift, orphanRows, foreignRows, missingInFeishu, dupRows, alarms }

  if (args.json) process.stdout.write(JSON.stringify(verdict) + '\n')
  else {
    const L = []
    L.push(`飞书回读闸：表 ${feishu.rows.length} 行 / 台账 ${last.size} 任务`)
    L.push(`Owner 批注 ${notes.length} 条（新 ${newNotes.length}）${notes.length ? '：' + notes.map((n) => `${n.taskId}${n.isNew ? '★新' : ''}`).join(', ') : ''}`)
    L.push(`机器列漂移 ${drift.length} 处${drift.length ? '：' + drift.map((d) => `${d.taskId}.${d.field}`).join(', ') : ' ✅'}`)
    L.push(`表里多余行 ${orphanRows.length}／台账外任务 ${foreignRows.length}／缺行 ${missingInFeishu.length}／重复行 ${dupRows.length} 组`)
    for (const n of newNotes) L.push(`  ★ Owner 批注［${n.taskId}］：${n.text}`)
    for (const a of alarms) if (!a.startsWith('Owner 新批注')) L.push(`  ⛔ ${a}`)
    L.push(`判定：${verdict.ok ? 'OK ✅' : 'ALARM ⛔ ' + alarms.length + ' 项'}`)
    process.stdout.write(L.join('\n') + '\n')
  }

  // 记已读（只增不减，上限 500 条），失败不阻塞
  try {
    const merged = [...new Set([...(state.notes || []), ...notes.map((n) => n.hash)])].slice(-500)
    mkdirSync(path.dirname(args.state), { recursive: true })
    writeFileSync(args.state, JSON.stringify({ notes: merged, updatedAt: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }) }, null, 1) + '\n', 'utf8')
  } catch (e) {
    process.stderr.write(`[feishu-readback] 警告：状态文件写入失败 ${String(e.message || e)}\n`)
  }

  process.exit(verdict.ok ? 0 : 1)
}

main()
