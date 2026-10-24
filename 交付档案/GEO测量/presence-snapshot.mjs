// 在场快照（read-only）：把"我们到底在不在场"落成一条可复跑、可比对的读数。
// 用法：
//   node 交付档案/GEO测量/presence-snapshot.mjs                 # 跑一轮并追加一行 jsonl
//   node 交付档案/GEO测量/presence-snapshot.mjs --strict        # 任一件未拿满字节即 exit 1
//   node 交付档案/GEO测量/presence-snapshot.mjs --negative-control  # 负控： bogus 路径必须判"不满"
//   node 交付档案/GEO测量/presence-snapshot.mjs --history [文件]  # 只读趋势＋连续 3 轮同形才报警
//   node 交付档案/GEO测量/presence-snapshot.mjs --self-test      # 离线夹具自测趋势判据（不联网、不碰真实读数）
//   node 交付档案/GEO测量/presence-snapshot.mjs --tries 5 --timeout-ms 20000
// 设计约束：零依赖、零登录、零写生产、零第三方脚本；本文件自身不联网除目标站以外的主机。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'presence-snapshot_20261018.jsonl')

const args = process.argv.slice(2)
const argVal = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt
}
const origin = (process.env.PRESENCE_ORIGIN || 'https://tuyigf.com').replace(/\/+$/, '')
const TRIES = argVal('--tries', 3)
const TIMEOUT_MS = argVal('--timeout-ms', 15000)
const STRICT = args.includes('--strict')
const NEG = args.includes('--negative-control')
const HIST = args.includes('--history')
const SELFTEST = args.includes('--self-test')

const ASSETS = [
  { key: 'home', path: '/' },
  { key: 'home_en', path: '/en' },
  { key: 'download', path: '/download' },
  { key: 'terms', path: '/terms' },
  { key: 'privacy', path: '/privacy' },
  { key: 'robots', path: '/robots.txt' },
  { key: 'sitemap', path: '/sitemap.xml' },
  { key: 'llms', path: '/llms.txt' },
  { key: 'llms_full', path: '/llms-full.txt' },
  { key: 'baidu_verify', path: '/baidu_verify_codeva-eNLQKp1jN0.html' },
]

// 只量"能不能整份拿到"，不量好坏：短字节＝取数失败（与站内既有口径一致：rc≠0 计入失败）。
async function once(target) {
  const t0 = Date.now()
  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) presence-snapshot/1.0' },
    })
    const buf = Buffer.from(await res.arrayBuffer())
    return { http: res.status, bytes: buf.length, ms: Date.now() - t0, body: buf.toString('utf8'), err: null }
  } catch (e) {
    const cause = e && e.cause ? String(e.cause.code || e.cause.message || e.cause.name) : null
    return { http: 0, bytes: 0, ms: Date.now() - t0, body: '', err: `${String(e && e.name || e)}${cause ? '/' + cause : ''}` }
  }
}

async function measure(entry) {
  const runs = []
  for (let i = 0; i < TRIES; i++) runs.push(await once(origin + entry.path))
  const max = Math.max(...runs.map((r) => r.bytes))
  const full = runs.filter((r) => r.bytes === max && r.http === 200).length
  return {
    key: entry.key,
    path: entry.path,
    fullTries: full,
    tries: TRIES,
    maxBytes: max,
    bytes: runs.map((r) => r.bytes),
    http: runs.map((r) => r.http),
    err: runs.map((r) => r.err).filter(Boolean),
    p50ms: runs.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(TRIES / 2)],
  }
}

function tally(rows) {
  const t = { assets: rows.length, clean: 0, partial: 0, failed: 0 }
  for (const r of rows) {
    if (r.fullTries === r.tries) t.clean++
    else if (r.fullTries > 0) t.partial++
    else t.failed++
  }
  return t
}

// 两格顺带的结构事实：sitemap 页数、首页静态 href 里指向本站页面的条数（可发现性，#169 口径）
// 关键防假：正文没拿到时这两格必须写 null，不许写 0——否则"取数失败"会伪装成"结构上 0 条链接"。
function extras(bodyByAsset) {
  const sitemap = bodyByAsset.sitemap ? ((bodyByAsset.sitemap.match(/<url>/g) || []).length) : null
  const home = bodyByAsset.home
  if (home == null) return { sitemapUrls: sitemap, homeLinks: null, homeLinksNote: 'home body not fetched — 不可读作 0' }
  const hrefs = new Set()
  for (const m of home.matchAll(/href\s*=\s*"([^"]+)"/gi)) {
    const raw = m[1]
    if (!raw.startsWith('/') || raw.startsWith('//')) continue
    const p = raw.split('#')[0].split('?')[0]
    hrefs.add(p.length > 1 ? p.replace(/\/+$/, '') : '/')
  }
  const internal = [...hrefs].filter((p) => p === '/' || /^\/[^/]+$/.test(p)).sort()
  return { sitemapUrls: sitemap, homeInternalLinks: internal }
}

function loadRounds(file) {
  if (!fs.existsSync(file)) return { rounds: [], missing: true }
  const all = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
  // 强制全失败的自检轮（timeout<=1s）不进趋势：它是夹具/分支验证，不是真实读数
  return { rounds: all.filter((r) => Number(r.timeoutMs) > 1000), selfTests: all.length - all.filter((r) => Number(r.timeoutMs) > 1000).length, missing: false }
}

function rate(r) {
  const tries = r.assets.reduce((s, a) => s + a.tries, 0)
  const short = r.assets.reduce((s, a) => s + (a.tries - a.fullTries), 0)
  // 健全性闸：short 必在 [0, tries]。出界＝读数自身不自洽（夹具写错或别手改过盘），一律标 invalid 而不是报一个负百分比
  const invalid = short < 0 || short > tries || tries === 0
  return { tries, short, pct: invalid ? null : (100 * short) / tries, invalid }
}

// 节拍判据（§A2）：异常要连续 3 轮同形才报——单轮抖动在本机控制组里已被证明多为链路尾，不是站点状态变化
const isAnomaly = (r) => r.tally.failed > 0 || r.tally.partial >= 3

function history(file) {
  const { rounds, selfTests, missing } = loadRounds(file)
  if (missing) { console.log(`[history] 没有读数文件 ${file}`); return 3 }
  const local = (iso) => new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(5, 16).replace('T', ' ')
  console.log(`[history] ${file}｜真实读数 ${rounds.length} 轮｜自检轮已排除 ${selfTests} 轮`)
  for (const r of rounds.slice(-12)) {
    const q = rate(r)
    console.log(`  ${local(r.ts)}  tries=${r.tries} to=${r.timeoutMs}ms  clean=${r.tally.clean}/${r.tally.assets} partial=${r.tally.partial} failed=${r.tally.failed}  ${q.invalid ? '短字节=invalid（该轮读数自身不自洽，不进趋势）' : `短字节=${q.short}/${q.tries}=${q.pct.toFixed(1)}%`}  sitemap=${r.extras.sitemapUrls ?? 'null'} homeLinks=${r.extras.homeInternalLinks ? r.extras.homeInternalLinks.length : 'null'}`)
  }
  if (rounds.length === 0) { console.log('[history] 无可比读数'); return 3 }
  const last = rounds[rounds.length - 1]
  const comparable = rounds.filter((r) => r.tries === last.tries && r.timeoutMs === last.timeoutMs)
  const recent = comparable.slice(-3)
  const anom = recent.map(isAnomaly)
  const verdict = recent.length >= 3 && anom.every(Boolean)
  console.log(`\n[节拍] 同参数可比轮次=${comparable.length}；最近 ${recent.length} 轮异常标志=[${anom.map((a) => (a ? '异常' : '正常')).join(',')}]`)
  console.log(verdict ? '[报警] 连续 3 轮同形异常 ⇒ 可上报（判据：failed>0 或 partial>=3）' : '[静默] 未达连续 3 轮同形 ⇒ 不报，避免把链路尾当站点回归')
  return verdict ? 1 : 0
}

function selfTest() {
  const file = path.join(os.tmpdir(), 'tygf-presence-selftest.jsonl')
  const mkAssets = (tries, clean, partial, failed) => {
    const one = (fullTries) => ({ key: 'home', path: '/', fullTries, tries, maxBytes: 1, bytes: [fullTries === tries ? 1 : 0], http: [200], err: [], p50ms: 10 })
    return [...Array(clean).fill(0).map(() => one(tries)), ...Array(partial).fill(0).map(() => one(1)), ...Array(failed).fill(0).map(() => one(0))]
  }
  const mk = (ts, tries, timeoutMs, clean, partial, failed) => JSON.stringify({
    ts, origin: 'https://fixture.invalid', tries, timeoutMs,
    tally: { assets: clean + partial + failed, clean, partial, failed },
    extras: { sitemapUrls: 8, homeInternalLinks: ['/privacy'] },
    assets: mkAssets(tries, clean, partial, failed),
  })
  const lines = [
    mk('2026-10-18T10:00:00.000Z', 3, 30000, 10, 0, 0),
    mk('2026-10-18T10:05:00.000Z', 3, 30000, 8, 2, 0),
    mk('2026-10-18T10:10:00.000Z', 3, 30000, 9, 1, 0),
    mk('2026-10-18T10:15:00.000Z', 1, 1, 0, 0, 10), // 自检轮，必须被排除
    mk('2026-10-18T10:20:00.000Z', 3, 30000, 6, 3, 1),
    mk('2026-10-18T10:25:00.000Z', 3, 30000, 5, 4, 1),
    mk('2026-10-18T10:30:00.000Z', 3, 30000, 6, 2, 2),
  ]
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8')
  let pass = 0, fail = 0
  const say = (label, ok) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`)
    if (ok) pass++
    else fail++
  }
  const { rounds, selfTests } = loadRounds(file)
  say(`自检轮被排除（selfTests=1）`, selfTests === 1)
  say(`真实轮次=6`, rounds.length === 6)
  say(`连续 3 轮异常⇒报警`, history(file) === 1)
  fs.writeFileSync(file, lines.slice(0, 3).join('\n') + '\n', 'utf8')
  say(`仅 2 轮异常不满 3⇒静默（无报警）`, history(file) === 0)
  const bogus = JSON.parse(mk('2026-10-18T11:00:00.000Z', 3, 30000, 2, 0, 0))
  bogus.assets.push({ key: 'x', path: '/x', fullTries: 9, tries: 3 })
  say(`健全性闸：fullTries>tries 的不自洽行被标 invalid（不报负百分比）`, rate(bogus).invalid === true)
  console.log(`\n[self-test] pass=${pass} fail=${fail} 夹具=${file}`)
  process.exit(fail === 0 ? 0 : 1)
}

async function run() {
  const rows = []
  const bodyByAsset = {}
  for (const a of ASSETS) {
    if (NEG) break
    const r = await measure(a)
    // 只在最后一轮留正文做结构统计，避免多次重复体
    const last = await once(origin + a.path)
    if (last.http === 200 && last.bytes === r.maxBytes) bodyByAsset[a.key] = last.body
    rows.push(r)
    console.log(
      `${r.fullTries === r.tries ? 'ok  ' : 'WARN'} ${a.key.padEnd(13)} full=${r.fullTries}/${r.tries} max=${r.maxBytes}B bytes=[${r.bytes}] http=[${r.http}] p50=${r.p50ms}ms${r.err.length ? ' err=' + r.err.join(',') : ''}`,
    )
  }

  if (NEG) {
    const bogus = await measure({ key: 'bogus', path: '/no-such-asset-for-negative-control-9c1f' })
    const notFull = bogus.http.some((h) => h !== 200) || bogus.maxBytes === 0
    console.log(`${notFull ? 'ok  ' : 'FAIL'} negative-control：bogus 路径 http=[${bogus.http}] maxBytes=${bogus.maxBytes} ⇒ 判定器能分辨"不在场"`)
    process.exit(notFull ? 0 : 1)
  }

  const t = tally(rows)
  const ex = extras(bodyByAsset)
  const rec = {
    ts: new Date().toISOString(),
    origin,
    tries: TRIES,
    timeoutMs: TIMEOUT_MS,
    tally: t,
    extras: ex,
    assets: rows,
  }
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n', 'utf8')
  const links = ex.homeInternalLinks
  console.log(
    `\n[summary] assets=${t.assets} clean=${t.clean} partial=${t.partial} failed=${t.failed} sitemapUrls=${ex.sitemapUrls} homeLinks=${links == null ? 'null（正文没拿到，不作 0 读）' : `${links.length} [${links.join(' ')}]`}`,
  )
  console.log(`[written] ${OUT}`)
  const bad = t.failed > 0 || t.partial > 0
  if (STRICT && bad) {
    console.log('[strict] 存在未拿满字节的资产 ⇒ exit 1')
    process.exit(1)
  }
  process.exit(0)
}

const hi = args.indexOf('--history')
const histFile = hi >= 0 && args[hi + 1] && !args[hi + 1].startsWith('--') ? args[hi + 1] : OUT

if (SELFTEST) selfTest()
else if (HIST) process.exit(history(histFile))
else
  run().catch((e) => {
    console.error('RUN_FAIL', e && e.message ? e.message : e)
    process.exit(2)
  })
