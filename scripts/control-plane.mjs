#!/usr/bin/env node
// 控制面巡检器（纯变换，不 spawn、不联网）
//   输入：AI_MEMORY/ledger.jsonl（真相层）＋ 由 control-plane.sh 实测的 git 事实：
//         --release-sha <sha>    main（生产）当前 HEAD 短 sha
//         --release-found <0|1>  该 sha 是否已在 总控/ 或 AI_MEMORY/ 挂号
//   输出：人读报告（stdout）与机器判定（--json）
//   判定：在办超限 / 到期未交 / 发布未挂号 / 在办缺字段
//
// 与 sync-task-ledger.mjs 同为「读—判定」纯函数，执行权归 bash 编排器。

import { readFileSync, existsSync } from 'node:fs'

const TERMINAL = ['已交付', '已搁置']

function parseArgs(argv) {
  const out = { ledger: 'AI_MEMORY/ledger.jsonl', limit: 2, releaseSha: '', releaseFound: '', json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ledger' && argv[i + 1]) out.ledger = argv[++i]
    else if (a === '--limit' && argv[i + 1]) out.limit = Number(argv[++i])
    else if (a === '--release-sha' && argv[i + 1]) out.releaseSha = argv[++i]
    else if (a === '--release-found' && argv[i + 1]) out.releaseFound = argv[++i]
    else if (a === '--json') out.json = true
  }
  return out
}

function readLedger(path) {
  if (!existsSync(path)) return { rows: [], missing: true }
  const rows = []
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, idx) => {
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('#')) return
    try { rows.push({ ...JSON.parse(t), __line: idx + 1 }) }
    catch (e) { rows.push({ __line: idx + 1, __parseError: String(e.message || e) }) }
  })
  return { rows, missing: false }
}

function todayShanghai() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const { rows, missing } = readLedger(args.ledger)
  const today = todayShanghai()

  const last = new Map()
  const parseErrors = []
  for (const r of rows) {
    if (r.__parseError) { parseErrors.push(`ledger:${r.__line} JSON 解析失败`); continue }
    const id = String(r.taskId ?? '').trim()
    if (id) last.set(id, r)
  }
  const tasks = [...last.values()]
  const byId = (id) => tasks.find((t) => String(t.taskId).trim() === id)

  const inFlight = tasks.filter((t) => t.wip === true && !TERMINAL.includes(String(t.status)))
  const unmarkedInFlight = tasks.filter((t) => String(t.status) === '进行中' && t.wip !== true)
  const waitingOwner = tasks.filter((t) => String(t.status) === '等您定')
  const review = tasks.filter((t) => String(t.status) === '待复验')
  const overdue = tasks.filter((t) => t.due && String(t.due) < today && !TERMINAL.includes(String(t.status)))
  const noDue = inFlight.filter((t) => !t.due)

  const alarms = []
  if (missing) alarms.push(`ledger 不存在：${args.ledger}`)
  if (inFlight.length > args.limit) alarms.push(`在办 ${inFlight.length} 超上限 ${args.limit}（D-1）`)
  for (const t of overdue) alarms.push(`到期未交：${t.taskId}（due=${t.due} 状态=${t.status}）`)
  for (const t of unmarkedInFlight) alarms.push(`进行中但未标 wip：${t.taskId}（无法计入在办限值）`)
  for (const t of noDue) alarms.push(`在办无到期日：${t.taskId}（断路器无法生效）`)
  if (parseErrors.length) alarms.push(...parseErrors)
  if (args.releaseFound === '0') alarms.push(`发布未挂号：main@${args.releaseSha || '?'} 未在 总控/ 或 AI_MEMORY/ 取证`)

  const verdict = {
    today,
    ledger: args.ledger,
    tasks: tasks.length,
    limit: args.limit,
    inFlight: inFlight.map((t) => ({ taskId: t.taskId, title: t.title, due: t.due ?? null, claim: t.claim ?? null })),
    waitingOwner: waitingOwner.map((t) => ({ taskId: t.taskId, title: t.title })),
    review: review.map((t) => ({ taskId: t.taskId, title: t.title })),
    overdue: overdue.map((t) => t.taskId),
    releaseSha: args.releaseSha || null,
    releaseFound: args.releaseFound === '' ? null : args.releaseFound === '1',
    alarms,
    ok: alarms.length === 0,
  }

  if (args.json) { process.stdout.write(JSON.stringify(verdict) + '\n') }
  else {
    const L = []
    L.push(`控制面巡检 ${today}`)
    L.push(`在办 ${inFlight.length}/${args.limit}${inFlight.length > args.limit ? '  ⛔超限' : '  ✅'}`)
    for (const t of inFlight) L.push(`  · ${t.taskId}｜${t.title ?? ''}｜due=${t.due ?? '—'}｜claim=${t.claim ?? '—'}`)
    L.push(`待复验 ${review.length} 条（证据闸前 ${review.length === 0 ? '✅清' : '⚠️未清：' + review.map((t) => t.taskId).join(',')}）`)
    L.push(`等您定 ${waitingOwner.length} 条（决策队列，不占在办）：${waitingOwner.map((t) => t.taskId).join(', ') || '—'}`)
    L.push(`到期未交 ${overdue.length} 条${overdue.length ? '：' + overdue.map((t) => t.taskId).join(', ') : '  ✅'}`)
    if (args.releaseSha) L.push(`发布挂号：main@${args.releaseSha} ${args.releaseFound === '1' ? '✅已挂号' : '⛔未挂号'}`)
    L.push(`判定：${verdict.ok ? 'OK ✅' : 'ALARM ⛔ ' + alarms.length + ' 项'}`)
    for (const a of alarms) L.push(`  ⛔ ${a}`)
    process.stdout.write(L.join('\n') + '\n')
  }

  process.exit(verdict.ok ? 0 : 1)
}

main()
