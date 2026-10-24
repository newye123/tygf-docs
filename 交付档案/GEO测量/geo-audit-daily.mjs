// 每日 GEO 基线行（S1）一条命令：抓资产 → 取数闸 → 自检 → 录行 → 与上一日对比。
// 用法：
//   node 交付档案/GEO测量/geo-audit-daily.mjs            # 当天只录一行；同日已有行则拒跑
//   node 交付档案/GEO测量/geo-audit-daily.mjs --force    # 同日重录一行（保留旧行，不覆盖）
// 判据（S1）：jsonl 里每个 date_local 一行，含 normalized_100 / fails / as_of；
//   连续两天同一 normalized_100 ⇒ 工具稳定，可当趋势基线。
// 纪律：抓取闸不过 ⇒ 不跑自检、不录行（取数失败不得伪装成分数下跌）。
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { spawnSync } from 'node:child_process'
import { sha16, normSha, buildNormSha, buildFp, streakDays, prevDay, diffIds, localDay } from './geo-audit-lib.mjs'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'geo-audit-daily.jsonl')
const dateLocal = localDay()
const force = process.argv.includes('--force')

const existing = fs.existsSync(OUT)
  ? fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch (e) { return null } }).filter(Boolean)
  : []
if (!force && existing.some((r) => r.date_local === dateLocal)) {
  console.log(`SKIP ${dateLocal} 已有基线行（同日只录一行；要重录加 --force）`)
  process.exit(0)
}

const assetsDir = path.join('tmp', 'geo-assets-' + dateLocal.replace(/-/g, ''))
const run = (args) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 30 * 60 * 1000 })
  process.stdout.write(r.stdout || '')
  process.stderr.write(r.stderr || '')
  return r.status
}

const fetchRc = run([path.join(HERE, 'geo-audit-fetch.mjs'), assetsDir, '--tries=3', '--timeout=45'])
if (fetchRc !== 0) {
  console.log(`GEO_DAILY_ABORT ${dateLocal} 取数闸未过（rc=${fetchRc}）⇒ 不跑自检、不录行`)
  process.exit(1)
}
const auditRc = run([path.join(HERE, 'geo-audit-self.mjs'), assetsDir, '--record=' + OUT, '--date=' + dateLocal])
if (auditRc !== 0) {
  console.log(`GEO_DAILY_ABORT ${dateLocal} 自检或录行失败（rc=${auditRc}）`)
  process.exit(1)
}

const rows = fs.readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
const today = rows.filter((r) => r.date_local === dateLocal).pop()
if (!today) { console.log(`GEO_DAILY_ERROR ${dateLocal} 找不到当天行（跨 00:00 跑或录行被闸拦下）`); process.exit(3) }
const prev = rows.filter((r) => r.date_local < dateLocal).pop()
const byDay = {}
for (const r of rows) byDay[r.date_local] = r
// AR-5：streak 必须**日历相邻**——只按"文件里出现过的天数"数会跨空洞谎称连续。
const streak = streakDays(byDay, dateLocal)
const adjacent = prev ? prev.date_local === prevDay(dateLocal) : null
console.log(`GEO_DAILY ${dateLocal} normalized=${today.normalized_100} fails=${today.fails.length}｜上一行 ${prev ? prev.date_local + '=' + prev.normalized_100 : '(无)'}（日历相邻=${adjacent}）｜连续同分(按日历)=${streak} 天`)
if (prev) {
  const d = diffIds(prev.fails, today.fails)
  console.log(d.added.length || d.removed.length
    ? `FAIL 集合变化：新增 [${d.added.join(', ')}] 消除 [${d.removed.join(', ')}]`
    : 'FAIL 集合＝逐 id 一致（AR-9：分母会随内容漂移，所以同分必须再比集合）')
}
if (streak >= 2) console.log('S1_CRITERION_MET 日历相邻两天同分 ⇒ 基线工具稳定')

// 内容轴（AR-7/AR-8 收紧 ＋ 10-22 三态化）：
//   文案变＝去 CF 混淆再去构建产物名之后仍不等（这是唯一可对外说"内容变了"的一档）；
//   仅构建变＝去混淆后相等、但不去构建名时不等 ⇒ 线上换了一次构建，文案一字未动；
//   噪声变＝原始 sha 变了而两档归一都相等（CF 邮箱混淆）。
// 现算 before 前先验盘上文件＝行内原始 sha，旧目录被回填过 ⇒ 宁可不比也不谎报"未变"。
if (prev && prev.inputs && today.inputs) {
  const copyChanged = [], buildOnly = [], noiseOnly = [], refused = [], recomputed = [], fpChanged = [], noBase = []
  for (const k of Object.keys(today.inputs)) {
    const cur = today.inputs[k]
    if (!cur || !cur.sha256_build_norm) continue
    let p = prev.inputs[k] || null
    let before = p ? { raw: p.sha256, cf: p.sha256_norm, bn: p.sha256_build_norm } : null
    if (!before || !before.bn) {
      // 上一行没有新字段（10-21 之前录的）⇒ 从旧目录现算补齐，但必须先核原始 sha 与行内一致。
      const fp = path.join(prev.dir, k + '.txt')
      if (!fs.existsSync(fp)) { noBase.push(k); continue }
      const buf = fs.readFileSync(fp)
      const rawNow = sha16(buf)
      if (p && p.sha256 && p.sha256 !== rawNow) { refused.push(`${k}（盘上 ${rawNow} ≠ 行内 ${p.sha256}）`); continue }
      const text = buf.toString('utf8')
      before = { raw: rawNow, cf: normSha(text), bn: buildNormSha(text) }
      if (!p) { before.fp = buildFp(text) }
      recomputed.push(k)
    }
    const fpPrev = (p && p.build_fp) || before.fp || null
    if (before.bn !== cur.sha256_build_norm) copyChanged.push(`${k}(${before.bn}→${cur.sha256_build_norm})`)
    else if (before.cf !== cur.sha256_norm) buildOnly.push(`${k}(${before.cf}→${cur.sha256_norm})`)
    else if (before.raw && cur.sha256 && before.raw !== cur.sha256) noiseOnly.push(k)
    if (fpPrev && cur.build_fp && fpPrev !== cur.build_fp) fpChanged.push(k)
  }
  console.log(copyChanged.length
    ? `内容轴＝文案有变：${copyChanged.join(' ')}`
    : buildOnly.length
      ? `内容轴＝文案未变；${buildOnly.length} 件仅构建产物名不同（${buildOnly.map((x) => x.split('(')[0]).join(',')}）`
      : '内容轴＝文案与构建均未变')
  if (noiseOnly.length) console.log(`另有 ${noiseOnly.length} 件原始 sha 不同、两档归一后相等（CF 邮箱混淆，不作变化记账）：${noiseOnly.join(',')}`)
  if (fpChanged.length) console.log(`构建指纹＝变（${fpChanged.length} 件页面的产物名集合不同：${fpChanged.join(',')}）⇒ 只可说"线上构建换了"，不可据此断言发了哪一笔代码`)
  if (refused.length) console.log('内容轴拒比（旧目录与行内指纹不符，不能当"未变"）：' + refused.join(' '))
  if (noBase.length) console.log(`内容轴无比值（上一行无该字段且旧资产不在盘上）：${noBase.join(',')}`)
  if (recomputed.length) console.log(`（其中 ${recomputed.join(',')} 的上一行哈希＝从 ${prev.dir} 现算补出，且已先核过盘上原始 sha＝行内记录值）`)
}
// 缓存轴（#269）：同一站点不同 URL 的共享缓存寿命可以差一年，"跨日字节不同"因此不能直接读成内容变化。
if (today.inputs) {
  const long = [], hit = [], nostore = [], unknownCache = []
  for (const [k, v] of Object.entries(today.inputs)) {
    if (!v || v.cache === undefined) { unknownCache.push(k); continue }
    if (v.cache === null) { unknownCache.push(k); continue }
    const cc = String(v.cache['cache-control'] || '')
    const sm = Number(v.smaxage || 0)
    if (/^(HIT|EXPIRED|STALE)$/i.test(String(v.cache['cf-cache-status'] || ''))) hit.push(k + '[' + v.cache['cf-cache-status'] + ']')
    if (sm >= 86400) long.push(k + '(' + sm / 86400 + '天)')
    else if (/no-store/i.test(cc)) nostore.push(k)
  }
  const parts = []
  if (long.length) parts.push('共享缓存寿命 ≥1 天：' + long.join(','))
  if (nostore.length) parts.push('no-store（每次现取）：' + nostore.join(','))
  if (hit.length) parts.push('本轮由边缘命中供：' + hit.join(','))
  console.log('缓存轴＝' + (parts.length ? parts.join('｜') : '各件缓存头均未达一天且无边缘命中')
    + '｜' + (unknownCache.length ? '无头信息：' + unknownCache.join(',') + '（旧 manifest 未记头，须重抓才有）' : '头信息齐'))
  if (long.length) console.log('  ⇒ 这些页的跨日指纹差可能只是翻页时刻差，不得直接记成"线上内容变了"（#269）')
}
// 构建号轴（10-22 新增）：RSC 载荷里的 Next buildId 每次构建都换（同码重建也换）。
// 用途只有一个——把"线上换过一次构建"和"对外文案变了"分成两件事说；不据此断言发了哪笔代码。
if (prev && prev.inputs && today.inputs) {
  const idChanged = [], idSame = []
  for (const k of Object.keys(today.inputs)) {
    const cur = today.inputs[k] && today.inputs[k].build_id
    const before = prev.inputs[k] && prev.inputs[k].build_id
    if (!cur || !before) continue
    if (cur === before) idSame.push(k + '=' + cur); else idChanged.push(k + '(' + before + '→' + cur + ')')
  }
  if (idChanged.length) console.log('构建号轴＝换过一次构建：' + idChanged.join(' ') + '｜同码重建也会换号 ⇒ 只可说"构建换了"')
  else if (idSame.length) console.log('构建号轴＝未变（' + idSame.length + ' 件同枚 ' + idSame[0].split('=')[1] + '：' + idSame.map((x) => x.split('=')[0]).join(',') + '）')
  else console.log('构建号轴＝无比值（上一行还没有 build_id 这一列，或该页不带构建号）')
}
if (prev && prev.contact_email_sha && today.contact_email_sha && prev.contact_email_sha !== today.contact_email_sha) {
  console.log('邮箱轴＝对外联系邮箱变了（明文 sha 不同，归一哈希不覆盖这一项）')
}
