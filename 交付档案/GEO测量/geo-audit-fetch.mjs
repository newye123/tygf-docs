// 抓取 GEO 自检所需的公开资产（只读 GET，零依赖，走系统 curl）。
// 为什么用 curl：本机 node fetch 对 tuyigf.com 间歇性超时（多轮实测），curl 稳定。
// 用法：
//   node 交付档案/GEO测量/geo-audit-fetch.mjs tmp/geo-assets-20261020
//   node 交付档案/GEO测量/geo-audit-fetch.mjs <dir> --origin=https://tuyigf.com
// 产物：<dir>/<key>.txt ＋ <dir>/manifest.json（http/bytes/sha256/url/时刻）
// 退出码：0=7 件全 200 且首页 sanity 通过；1=有资产非 200 或首页 sanity 失败；2=参数/环境错误。
// 纪律：任何一件失败都不删已取得的文件；manifest 照写，由 geo-audit-self.mjs 的录行闸决定要不要记账。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const DIR = args.find((a) => !a.startsWith('--'))
const origin = (args.find((a) => a.startsWith('--origin='))?.split('=')[1] || 'https://tuyigf.com').replace(/\/+$/, '')
if (!DIR) { console.error('用法: node geo-audit-fetch.mjs <输出目录> [--origin=https://tuyigf.com] [--tries=3]'); process.exit(2) }
const TRIES = Math.max(1, Number(args.find((a) => a.startsWith('--tries='))?.split('=')[1] || 3))
// 45s：10-18 实测 /download 27KB 要 13.6s，25s 的 3 次全断在 22KB；给足单次窗口比重试多次更有效。
const TRY_TIMEOUT_S = Math.max(10, Number(args.find((a) => a.startsWith('--timeout='))?.split('=')[1] || 45))

const ASSETS = [
  { key: 'home', path: '/' },
  { key: 'download', path: '/download' },
  { key: 'en', path: '/en' },
  { key: 'robots', path: '/robots.txt' },
  { key: 'sitemap', path: '/sitemap.xml' },
  { key: 'llms', path: '/llms.txt' },
  { key: 'llmsfull', path: '/llms-full.txt' },
  // 教程承接页：10-21 加。不进评分（保持 87.4 趋势线可比），只进"全资产视图"——
  // 因为 schema/新鲜度两判原来只看首页，会把"内容页有 TechArticle＋日期"误读成"站点没有内容页标记"。
  { key: 'guide', path: '/guide/ps-batch-replace-text' },
]

fs.mkdirSync(DIR, { recursive: true })
// Cloudflare 邮箱混淆（每次请求改写两处串，长度不变字节变）与逐件形态闸都在 lib 里，
// 目的是让"内容轴/取数闸"这些判据能离线复跑（10-21 对抗式审查 AR-6/AR-7）。
import { cfNorm, sha16, shapeOk, localDay, dayOfStamp, buildNormSha, buildFp, buildIdOf, chunkNames, readCacheHeaders, smaxageOf } from './geo-audit-lib.mjs'
const normCf = cfNorm
const sha = sha16
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1]
const targets = ONLY ? ASSETS.filter((a) => ONLY.split(',').includes(a.key)) : ASSETS
if (!targets.length) { console.error('--only 没匹配到任何 key（可选：' + ASSETS.map((a) => a.key).join(',') + '）'); process.exit(2) }

// 允许分多次补齐同一天的资产：与已存在 manifest 合并，逐件保留「最后一次成功」。
const MANIFEST_PATH = path.join(DIR, 'manifest.json')
let prevByKey = {}
try { if (fs.existsSync(MANIFEST_PATH)) for (const r of (JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')).assets || [])) prevByKey[r.key] = r } catch (e) { prevByKey = {} }

const rows = []
let bad = 0
for (const a of targets) {
  const target = origin + a.path
  const out = path.join(DIR, a.key + '.txt')
  // 逐次重试：本机到 tuyigf.com 会间歇超时/被 schannel 断连（今日实测 30s 超时），
  // 取「多次尝试里最大的一份 200 响应」；全失败则不留下半截文件（半截会被下游读成真页面）。
  let best = { http: 0, bytes: 0, file: null, err: null }
  for (let t = 1; t <= TRIES; t++) {
    const tmpOut = `${out}.try${t}`
    const tmpHead = `${out}.head${t}`
    try {
      const stdout = execFileSync('curl', [
        '-sS', '-L', '--http1.1', '--max-time', String(TRY_TIMEOUT_S),
        '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) geo-audit-fetch/1.0',
        '-o', tmpOut,
        '-D', tmpHead,
        '-w', '%{http_code} %{size_download}',
        target,
      ], { encoding: 'utf8', timeout: (TRY_TIMEOUT_S + 10) * 1000, stdio: ['ignore', 'pipe', 'pipe'] })
      const m = stdout.trim().match(/^(\d{3})\s+(\d+)$/)
      const http = m ? Number(m[1]) : 0
      const bytes = m ? Number(m[2]) : 0
      if (http === 200 && bytes > best.bytes && fs.existsSync(tmpOut)) best = { http, bytes, file: tmpOut, head: tmpHead, err: null }
      else best.err = m ? `http=${http}` : 'unparsable_curl_w: ' + stdout.slice(0, 80)
    } catch (e) {
      best.err = String((e && (e.stderr || e.message)) || e).replace(/\s+/g, ' ').slice(0, 180)
    }
  }
  const prev = prevByKey[a.key]
  let row
  if (best.file) {
    fs.copyFileSync(best.file, out)
    const buf = fs.readFileSync(out)
    const shape = shapeOk(a.key, buf.toString('utf8'))
    row = {
      key: a.key, path: a.path, url: target, http: 200,
      bytes: buf.length,
      sha256: sha(buf),
      sha256_norm: sha(Buffer.from(normCf(buf.toString('utf8')), 'utf8')),
      sha256_build_norm: buildNormSha(buf.toString('utf8')),
      build_fp: buildFp(buf.toString('utf8')),
      build_id: buildIdOf(buf.toString('utf8')),
      chunk_count: chunkNames(buf.toString('utf8')).length,
      cache: best.head && fs.existsSync(best.head) ? readCacheHeaders(fs.readFileSync(best.head, 'utf8')) : null,
      smaxage: best.head && fs.existsSync(best.head) ? smaxageOf(readCacheHeaders(fs.readFileSync(best.head, 'utf8'))['cache-control']) : null,
      shape_ok: shape === true, shape_err: shape === true ? null : shape,
      err: null, fetched_at: new Date().toISOString(),
    }
  } else if (prev && prev.http === 200 && fs.existsSync(out) && fs.statSync(out).size === prev.bytes) {
    // 本轮没抓到，但同一天早些时候已抓到整份且文件未变：沿用，不把链路抖动记成站点退步。
    row = { ...prev, last_attempt: { as_of: new Date().toISOString(), err: best.err } }
  } else {
    if (fs.existsSync(out)) fs.rmSync(out, { force: true })
    row = { key: a.key, path: a.path, url: target, http: 0, bytes: 0, sha256: null, err: best.err }
  }
  for (let t = 1; t <= TRIES; t++) { try { fs.rmSync(`${out}.try${t}`, { force: true }); fs.rmSync(`${out}.head${t}`, { force: true }) } catch (e) {} }
  rows.push(row)
  if (row.http !== 200 && !row.last_attempt) bad++
  console.log(`${String(a.key).padEnd(9)} http=${row.http} bytes=${row.bytes} ${row.last_attempt ? 'STALE_OK（沿用 ' + row.fetched_at + '）' : row.err ? 'ERR ' + row.err : 'OK'}`)
}

// 首页 sanity：必须真是 HTML 且带品牌名（CDN 挑战页/空壳会以 200 混进来）。
const homePath = path.join(DIR, 'home.txt')
const homeHtml = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : ''
const homeSanity = /<html[\s>]/i.test(homeHtml) && /图译工坊/.test(homeHtml) && homeHtml.length > 10000
if (!homeSanity) { console.log('HOME_SANITY_FAIL 首页不像真页面（缺 <html>/品牌名或 <10KB）'); bad++ }

const rowByKey = Object.fromEntries(rows.map((r) => [r.key, r]))
const merged = ASSETS.map((a) => rowByKey[a.key] || prevByKey[a.key] || { key: a.key, path: a.path, url: origin + a.path, http: 0, bytes: 0, sha256: null, err: 'not_fetched' })
const CORE = ['home', 'robots', 'llms', 'llmsfull']
// 录行四条件（AR-6）：200 ＋ 有哈希 ＋ **形态合格** ＋ **今天真抓到过**（fetched_at 落在本地今天）。
// 「今天真抓到过」专治 --only 补抓时旧 manifest 行复活——那意味着某天可能一件核心都没抓却照样记行。
const coreOk = CORE.every((k) => { const r = merged.find((x) => x.key === k); return r && r.http === 200 && r.sha256 && r.shape_ok === true && dayOfStamp(r.fetched_at) === localDay() })
const manifest = {
  as_of: new Date().toISOString(),
  date_local: new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10),
  origin, dir: DIR.split(path.sep).join('/'),
  home_sanity: homeSanity,
  core_ok: coreOk,
  assets: merged,
}
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`MANIFEST ${MANIFEST_PATH}｜7 件中非 200=${merged.filter((r) => r.http !== 200).length}｜core_ok=${coreOk}｜home_sanity=${homeSanity}`)
process.exitCode = coreOk && homeSanity && bad === 0 ? 0 : 1
