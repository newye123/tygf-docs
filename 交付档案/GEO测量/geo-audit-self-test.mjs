// GEO 日基线工具的离线负控（P3）：不联网、不碰真实日基线，逐条造反例验"必须判红"。
// 跑法：node 交付档案/GEO测量/geo-audit-self-test.mjs     （全绿 rc=0；任一失守 rc=1）
// 每条对应 10-21 对抗式审查的一个编号（AR-5/6/7/9），坏判据比没判据更坏，所以每条都要能复跑。
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { spawnSync } from 'node:child_process'
import { cfNorm, sha16, normSha, buildNorm, buildNormSha, buildFp, buildIdOf, chunkNames, readCacheHeaders, smaxageOf, CACHE_HDRS, contactEmailSha, shapeOk, prevDay, streakDays, diffIds } from './geo-audit-lib.mjs'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
// 夹具源＝tmp 下最新的 geo-assets-<日期> 目录（10-22 起不再写死 20261021：
// 写死的代价是那个目录一旦被清，离线负控整批跑不起来）。
const ASSET_DIRS = fs.readdirSync(path.join(ROOT, 'tmp')).filter((x) => /^geo-assets-\d{8}$/.test(x)).sort()
const SRC = path.join(ROOT, 'tmp', ASSET_DIRS[ASSET_DIRS.length - 1] || 'geo-assets-20261021')
const fail = []
let total = 0
const ok = (name, cond, detail) => { total++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' ｜ ' + detail : ''}`); if (!cond) fail.push(name) }

const home = fs.readFileSync(path.join(SRC, 'home.txt'), 'utf8')

// AR-7：归一只抹 CF 混淆串——正文改一个字必须变（灵敏度），只改 cfemail 必须"看不出来"（已知边界）。
// 针子取正文真实片段（不用猜的词），保证"确实改了东西"。
const needle = home.slice(20000, 20012)
ok('T1a 正文一字之差 ⇒ 归一哈希变', needle.length === 12 && normSha(home) !== normSha(home.replace(needle, needle.slice(0, 11) + 'X')))
const cfBefore = (home.match(/data-cfemail="([0-9a-fA-F]*)"/) || [])[1]
ok('T1b 只改 CF 混淆串 ⇒ 原始 sha 变', sha16(Buffer.from(home.replace(cfBefore, 'ff' + cfBefore.slice(2)), 'utf8')) !== sha16(Buffer.from(home, 'utf8')))
ok('T1c 只改 CF 混淆串 ⇒ 归一哈希不变（已知边界，由 T2 兜）', normSha(home.replace(cfBefore, 'ff' + cfBefore.slice(2))) === normSha(home))
// AR-7 的补救：明文邮箱变了必须点名。
const email = (home.match(/"email"\s*:\s*"([^"]+)"/) || [])[1]
ok('T2 明文联系邮箱变 ⇒ contactEmailSha 变', email && contactEmailSha(home.replace(email, 'other@example.com')) !== contactEmailSha(home))
ok('T2b 未改动 ⇒ contactEmailSha 稳', contactEmailSha(home) === contactEmailSha(home))

// AR-6②：形态闸——200 但内容不对的必须挡。
ok('T3a 真 robots 过关', shapeOk('robots', fs.readFileSync(path.join(SRC, 'robots.txt'), 'utf8')) === true)
ok('T3b CF 挑战页冒充 robots 被挡', shapeOk('robots', '<html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>') === '缺 user-agent')
ok('T3c sitemap 壳被挡', shapeOk('sitemap', '<html><body>ok</body></html>') === '缺 <urlset>')
ok('T3d llms 无标题被挡', shapeOk('llms', 'plain text without heading') === '不以 Markdown 标题起头')
ok('T3e 空正文被挡', shapeOk('home', '   ') === '空正文')

// AR-5：连续同分必须日历相邻。
const day = (iso, n) => streakDays({ [iso]: { normalized_100: 87.4 }, [prevDay(iso)]: { normalized_100: 87.4 } }, iso)
ok('T4a 相邻两天同分 ⇒ 2', day('2026-10-21', 1) === 2)
ok('T4b 中间缺一天 ⇒ 1', streakDays({ '2026-10-21': { normalized_100: 87.4 }, '2026-10-19': { normalized_100: 87.4 } }, '2026-10-21') === 1)
ok('T4c 相邻但不同分 ⇒ 1', streakDays({ '2026-10-21': { normalized_100: 87.4 }, '2026-10-20': { normalized_100: 85.4 } }, '2026-10-21') === 1)
ok('T4d prevDay 跨月正确', prevDay('2026-11-01') === '2026-10-31' && prevDay('2027-01-01') === '2026-12-31')

// AR-9：同分还得比 FAIL 集合。
ok('T5 差集点名', JSON.stringify(diffIds(['a', 'b'], ['b', 'c'])) === JSON.stringify({ added: ['c'], removed: ['a'] }))

// AR-6①③：录行闸离线的三条反例（用真资产造临时目录，不碰真实日基线）。
const mkFix = (name, mut) => {
  const d = path.join(ROOT, 'tmp', '_geo_selftest_' + name)
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(d, { recursive: true })
  for (const k of ['home', 'robots', 'llms', 'llmsfull']) fs.copyFileSync(path.join(SRC, k + '.txt'), path.join(d, k + '.txt'))
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))
  manifest.assets = manifest.assets.filter((a) => ['home', 'robots', 'llms', 'llmsfull'].includes(a.key))
  // 基线＝"新版抓取器会写的样子"（有形态闸、有**本轮**时间戳），再把各条反例单独打破，
  // 否则拒录原因会混在一起（分不清是缺 shape_ok 还是缺时间戳）。
  // 10-22 复跑教训：这里原本写 `a.fetched_at || now`，夹具沿用了抓取的当天时间戳 ⇒
  // 隔一天再跑，正例 T6a 被"核心件来自昨天"这道闸拒录（好 fixture 必须天天新鲜）。
  manifest.assets.forEach((a) => { a.shape_ok = true; a.fetched_at = new Date().toISOString() })
  mut(manifest)
  fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return d
}
const runAudit = (d) => {
  const rec = path.join(d, 'rows.jsonl')
  const r = spawnSync(process.execPath, [path.join(HERE, 'geo-audit-self.mjs'), d, '--record=' + rec], { encoding: 'utf8', timeout: 60000 })
  return { rc: r.status, out: String(r.stdout || '') + String(r.stderr || ''), rec }
}
// ① 合格夹具：必须录行，且行里带 fetched_at/contact_email_sha/stale 字段
//    （今天 08:37 真跑的 manifest 出自加形态闸之前的版本，缺 shape_ok ⇒ 这里显式补成新版会写的样子）
const good = mkFix('good', (m) => { m.assets.forEach((a) => { a.shape_ok = true }) })
const g1 = runAudit(good)
ok('T6a 全合格 ⇒ 录行 rc=0', g1.rc === 0 && g1.out.includes('RECORDED'), 'rc=' + g1.rc)
const row = fs.existsSync(g1.rec) ? JSON.parse(fs.readFileSync(g1.rec, 'utf8').trim().split('\n').pop()) : {}
ok('T6b 行内带 fetched_at 与 contact_email_sha', !!(row.inputs && row.inputs.home && row.inputs.home.fetched_at && row.contact_email_sha))
// ② 旧格式 manifest（无 shape_ok/fetched_at）：必须拒录 rc=3
const legacy = mkFix('legacy', (m) => { m.assets.forEach((a) => { delete a.shape_ok; delete a.fetched_at }) })
const g2 = runAudit(legacy)
ok('T6c 旧格式（无形态/时间戳）⇒ 拒录 rc=3', g2.rc === 3 && g2.out.includes('RECORD_SKIPPED'), 'rc=' + g2.rc)
// ③ llms 的 fetched_at 是昨天（--only 复活场景）：必须拒录 rc=3
const stale = mkFix('stale', (m) => { const a = m.assets.find((x) => x.key === 'llms'); a.fetched_at = new Date(Date.parse(a.fetched_at) - 86400000).toISOString() })
const g3 = runAudit(stale)
ok('T6d 核心件来自昨天 ⇒ 拒录 rc=3', g3.rc === 3 && g3.out.includes('RECORD_SKIPPED'), 'rc=' + g3.rc)
// ④ 形态不符（robots 被挑战页顶替，http 仍 200）：必须拒录 rc=3
const challenge = mkFix('challenge', (m) => { const a = m.assets.find((x) => x.key === 'robots'); a.shape_ok = false })
fs.writeFileSync(path.join(challenge, 'robots.txt'), '<html><body>Just a moment</body></html>')
const g4 = runAudit(challenge)
ok('T6e 200 但形态不符 ⇒ 拒录 rc=3', g4.rc === 3 && g4.out.includes('RECORD_SKIPPED'), 'rc=' + g4.rc)

// ── T7 构建产物名归一（10-22 实测新增：home/download 字节数一字不差、归一哈希却变了）──
const P1 = '<html><head><link rel="stylesheet" href="/_next/static/chunks/31hz5o0vqo-3u.css"/></head><body><h1>图译工坊</h1></body></html>'
const P2 = '<html><head><link rel="stylesheet" href="/_next/static/chunks/183qv3fke54s-.css"/></head><body><h1>图译工坊</h1></body></html>'
ok('T7a 仅构建产物名不同 ⇒ 原始不等、CF 归一后仍不等、去构建名后相等',
  sha16(Buffer.from(P1)) !== sha16(Buffer.from(P2)) && normSha(P1) !== normSha(P2) && buildNormSha(P1) === buildNormSha(P2),
  'build_norm=' + buildNormSha(P2))
// 负控：归一**不得**抹掉真文案改动（过度归一是 10-21 邮箱那课的同一类错）
const P3 = P2.replace('<h1>图译工坊</h1>', '<h1>图译工坊改名了</h1>')
ok('T7b 换了文案 ⇒ 去构建名后必须仍不等（不许过度归一）', buildNormSha(P2) !== buildNormSha(P3), buildNormSha(P2) + '/' + buildNormSha(P3))
// 负控：JSON-LD 里多出 contactPoint（10-22 /en 的真变化）必须算文案变化，不能被当成构建噪声
const P4 = P2.replace('</body>', '<script type="application/ld+json">{"@type":"Organization","contactPoint":{"email":"tuyi@tuyigf.com"}}</script></body>')
ok('T7c 新增 contactPoint ⇒ 算文案变化（不当构建噪声）', buildNormSha(P2) !== buildNormSha(P4))
ok('T7d buildFp 只认产物名集合：同名换位置＝同，换名＝不同',
  buildFp('<link href="/_next/static/chunks/b.js"/><link href="/_next/static/chunks/a.js"/>')
  === buildFp('<link href="/_next/static/chunks/a.js"/><link href="/_next/static/chunks/b.js"/>')
  && buildFp('<link href="/_next/static/chunks/a.js"/>') !== buildFp('<link href="/_next/static/chunks/c.js"/>'))
ok('T7e chunkNames 不去重（引用两次算两次，免得把集合大小当构建身份）',
  chunkNames('<link href="/_next/static/chunks/a.css"/><link href="/_next/static/chunks/a.css"/>').length === 2)
// 实盘两日对照：取 tmp 里最近两个 geo-assets-<日期> 目录（10-22 起不写死日期，同上不新断言）
const D1 = ASSET_DIRS[ASSET_DIRS.length - 2]
const D2 = ASSET_DIRS[ASSET_DIRS.length - 1]
const pairFile = (k) => (D1 && D2
  ? [path.join(ROOT, 'tmp', D1, k + '.txt'), path.join(ROOT, 'tmp', D2, k + '.txt')]
  : [null, null])
const fileReady = (ps) => ps.every((p) => p && fs.existsSync(p))
// **10-23 午自纠**：下面这一段原来把"实盘两日比较"写成了通过/失守（T7f 相等、T7g 构建号必须不同、T7i 文案必须不同）。
// 那是设计错误：两日之间变或不变**都是合法世界状态**——文案真改了 T7f 就红，线上同码重建没发生 T7g 就红。
// 本会话就被它咬过一次：10-22→10-23 构建号与 en 文案都没变，两条同时失守，差点逼我去"修测试"而掩盖真读数。
// ⇒ 现在实盘比较一律只打 INFO；断言只留"方向无关"的结构性质（取法非占位、归一生效、同文件幂等）。
if (fileReady(pairFile('home'))) {
  const [p1, p2] = pairFile('home')
  const t1 = fs.readFileSync(p1, 'utf8'), t2 = fs.readFileSync(p2, 'utf8')
  const id1 = buildIdOf(t1), id2 = buildIdOf(t2)
  console.log('INFO 实盘 home（' + D1 + ' vs ' + D2 + '）：文案归一后' + (buildNormSha(t1) === buildNormSha(t2) ? '相等' : '有变')
    + '｜构建号' + (id1 && id2 ? (id1 === id2 ? '未变（' + id2 + '）' : '换了 ' + id1 + '→' + id2) : '缺')
    + '｜这行是读数，不是判据')
  ok('T7f 构建号取法在真页上给出 20–25 位非占位串（不返回被归一的假串）',
    !!id2 && /^[A-Za-z0-9_-]{20,25}$/.test(id2), String(id2))
  ok('T7g 归一确实作用在真页上（原始含构建号、归一后换成占位串）',
    t2.includes(id2) && buildNorm(t2).includes('"b":"<BUILDID>"'), 'raw_len=' + t2.length + ' norm_len=' + buildNorm(t2).length)
  ok('T7h 同一文件两次计算逐位一致（幂等，否则"内容轴"不可比）',
    buildNormSha(t2) === buildNormSha(fs.readFileSync(p2, 'utf8')) && sha16(Buffer.from(t2)) === sha16(Buffer.from(fs.readFileSync(p2, 'utf8'))),
    buildNormSha(t2))
} else {
  console.log('NOT_RUN T7f–T7h tmp 里不足两个含 home.txt 的 geo-assets 目录（现有 ' + ASSET_DIRS.join(',') + '）')
}
if (fileReady(pairFile('en'))) {
  const [p1, p2] = pairFile('en')
  const e1 = fs.readFileSync(p1, 'utf8'), e2 = fs.readFileSync(p2, 'utf8')
  console.log('INFO 实盘 en（' + D1 + ' vs ' + D2 + '）：文案归一后' + (buildNormSha(e1) === buildNormSha(e2) ? '相等' : '有变（' + buildNormSha(e1) + '→' + buildNormSha(e2) + '）')
    + '｜contactPoint ' + ((e1.match(/contactPoint/g) || []).length) + '→' + ((e2.match(/contactPoint/g) || []).length) + '｜读数不是判据')
  ok('T7i 明文联系邮箱 sha 在真页上取得到（归一抹平噪声但邮箱必须可查）',
    !!contactEmailSha(e2) && /^[a-f0-9]{16}$/.test(contactEmailSha(e2)), String(contactEmailSha(e2)))
} else {
  console.log('NOT_RUN T7i tmp 里不足两个含 en.txt 的 geo-assets 目录')
}

// ── T8 形态闸补齐 guide（10-22 实测：抓到了 33441 字节却因"未知资产键"永远判不合格）──
ok('T8a guide 真 HTML ⇒ 形态合格', shapeOk('guide', P1) === true, String(shapeOk('guide', P1)))
ok('T8b guide 空正文 ⇒ 拦下', shapeOk('guide', '') === '空正文', String(shapeOk('guide', '')))
ok('T8c guide 挑战页壳 ⇒ 拦下', shapeOk('guide', '<div>Just a moment</div>') === '缺 <html>', String(shapeOk('guide', '<div>Just a moment</div>')))
ok('T8d 未登记的新资产键仍判不合格（不许默默放行）', shapeOk('brandnew', P1) === '未知资产键', String(shapeOk('brandnew', P1)))

// ── T9 缓存头留底（#269：10-23 实测同一站点两套策略——首页 no-store，/en／/download／教程页 s-maxage 一年）──
const HD = 'HTTP/1.1 200 OK\r\nServer: cloudflare\r\nCache-Control: private, no-cache, no-store\r\nCF-Cache-Status: MISS\r\n\r\nHTTP/1.1 200 OK\r\nServer: cloudflare\r\ncache-control: s-maxage=31536000\r\ncf-cache-status: HIT\r\nAge: 12\r\n\r\n'
const ch = readCacheHeaders(HD)
ok('T9a 多段响应头按"最后一枚生效"取（重定向场景不许拿第一段的 no-store 冒充）',
  ch['cache-control'] === 's-maxage=31536000' && ch['cf-cache-status'] === 'HIT' && ch.age === '12', JSON.stringify(ch))
ok('T9b 头名大小写不敏感、未知头不入库', Object.keys(ch).every((k) => CACHE_HDRS.includes(k)) && ch['server'] === undefined)
ok('T9c s-maxage 解析成秒并可换算天数', smaxageOf(ch['cache-control']) === 31536000 && smaxageOf('private, no-cache, no-store') === 0, String(smaxageOf(ch['cache-control'])))
ok('T9d 空/畸形头不得抛（抓取器会在重试失败时传 null）', readCacheHeaders(null)['cache-control'] === undefined && smaxageOf(null) === 0)

for (const d of ['good', 'legacy', 'stale', 'challenge']) fs.rmSync(path.join(ROOT, 'tmp', '_geo_selftest_' + d), { recursive: true, force: true })
console.log(fail.length ? `负控失守 ${fail.length}/${total} 条：${fail.join(', ')}` : `负控全绿 ${total}/${total}`)
process.exit(fail.length ? 1 : 0)
