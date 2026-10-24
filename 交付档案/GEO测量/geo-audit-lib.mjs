// GEO 日基线工具的共用纯函数（离线、零依赖、可被自测直接调用）。
// 为什么抽出来：10-21 对抗式审查（执行方案_20261021_GEO续做第二轮…）指出内容轴/连续同分/形态闸五处缺陷，
// 判据必须能**离线复跑**才算数——所以逻辑放这里，抓取与录行只调用它。
import fs from 'node:fs'
import crypto from 'node:crypto'

// Cloudflare 邮箱混淆：每次响应重写两处串，长度不变字节变 ⇒ 原始 sha 天天不同。
// 注意（AR-7）：归一只解决"版面内容轴"，邮箱**本身**被改会被抹平 ⇒ 另用 contactEmailSha 兜住。
export const CF_PATTERNS = [
  [/data-cfemail="[0-9a-fA-F]*"/gi, 'data-cfemail="<CF>"'],
  [/email-protection#[0-9a-fA-F]+/gi, 'email-protection#<CF>'],
]
export const cfNorm = (s) => CF_PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), s)
export const sha16 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)
export const normSha = (text) => sha16(Buffer.from(cfNorm(text), 'utf8'))

// Next.js 构建产物名（/_next/static/chunks/<hash>.js|.css）：同一次构建内稳定，**每次重新构建就整体换名**。
// 10-22 实测：home 与 download 字节数一字不差（96429 / 27852），归一哈希却变了，
// 差异只在 31hz5o0vqo-3u.css → 183qv3fke54s-.css（旧名现已 404）⇒ 那是"线上构建换了"，不是文案变了。
// 所以内容轴再降一级噪声（CF 混淆之后的第二颗）；构建集合单独走 buildFp，不藏进"未变"里。
export const BUILD_PATTERNS = [
  [/\/_next\/static\/chunks\/[A-Za-z0-9._-]+/g, '/_next/static/chunks/<BUILD>'],
  // 同一个构建的另一枚噪声：RSC 载荷里的 Next buildId（21 位随机串，同码重建也会换）。
  // 10-22 实测 home 全文只剩这一处不同（1Q43fW-wotZl1slZ2l1vs → kajh6gOqApI-0WS5rJFru）。
  [/\\?"b\\?":\\?"[A-Za-z0-9_-]{20,25}\\?"/g, '"b":"<BUILDID>"'],
]
export const buildNorm = (s) => BUILD_PATTERNS.reduce((acc, [re, to]) => acc.replace(re, to), cfNorm(s))
export const buildNormSha = (text) => sha16(Buffer.from(buildNorm(text), 'utf8'))
export const chunkNames = (text) => (String(text).match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+/g) || []).slice().sort()
// 构建号单独取出来当"部署探测器"：同一枚 build 的页面必带同一个串；变了只说明换过一次构建，
// 不据此断言发了哪一笔代码（同码重新构建也会变）。
export const buildIdOf = (text) => {
  const m = String(text).match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{20,25})\\?"/)
  return m ? m[1] : null
}
// 构建指纹＝该页引用的产物名集合的哈希。变了只说明"这一页指向的构建/产物集合变了"，
// 不据此断言"发了新代码"（同码重新构建也会变）。
export const buildFp = (text) => sha16(Buffer.from(chunkNames(text).join(','), 'utf8'))

// 首页 JSON-LD 里机构联系方式的明文邮箱：不受 CF 混淆影响，专治"邮箱被改掉却报未变"。
export const contactEmailSha = (text) => {
  const m = String(text).match(/"contactPoint"\s*:\s*\{[^{}]*?"email"\s*:\s*"([^"]+)"/i) || String(text).match(/mailto:([^"'?\s]+)/i)
  return m ? sha16(Buffer.from(m[1].trim().toLowerCase(), 'utf8')) : null
}

// 逐件形态闸（AR-6②）：200 不等于拿到真页面——CF 挑战页/HTML 壳会以 200＋几百字节混进来。
export const shapeOk = (key, text) => {
  const t = String(text || '')
  if (!t.trim()) return '空正文'
  switch (key) {
    case 'home': case 'en': case 'download': case 'guide':
      return /<html[\s>]/i.test(t) ? true : '缺 <html>'
    case 'robots':
      return /user-agent\s*:/i.test(t) ? true : '缺 user-agent'
    case 'sitemap':
      return /<urlset[\s>]/i.test(t) ? true : '缺 <urlset>'
    case 'llms': case 'llmsfull':
      return /^\s*#/m.test(t) ? true : '不以 Markdown 标题起头'
    default:
      return '未知资产键'
  }
}

// 响应头里的"这一份是谁供的、能存多久"（#269）：同一站点不同 URL 的缓存寿命不同，
// 跨日抓回来的字节可能不是同一时刻的同一件事 ⇒ 必须把这四枚头随资产一起留底。
// 有多段响应头（-L 重定向）时按"最后一枚生效"取，与 curl 实际给客户端的那份一致。
export const CACHE_HDRS = ['cf-cache-status', 'cache-control', 'age', 'last-modified', 'etag']
export const readCacheHeaders = (headText) => {
  const o = {}
  for (const line of String(headText || '').split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const k = line.slice(0, i).trim().toLowerCase()
    if (CACHE_HDRS.includes(k)) o[k] = line.slice(i + 1).trim()
  }
  return o
}
// s-maxage 秒数（共享缓存寿命，CDN/上游代理含爬虫链路）。没有就返回 0。
export const smaxageOf = (cc) => { const m = /s-maxage=(\d+)/i.exec(String(cc || '')); return m ? Number(m[1]) : 0 }

// 日历相邻（AR-5）：'2026-10-20' 的前一日必须真是 20 号，缺一天就断串。
export const prevDay = (iso) => {
  const d = new Date(iso + 'T12:00:00+08:00')
  d.setUTCDate(d.getUTCDate() - 1)
  return new Date(d.getTime() + 0).toISOString().slice(0, 10)
}
export const streakDays = (byDay, endDay) => {
  let n = 1, cur = endDay
  while (true) {
    const p = prevDay(cur)
    if (!byDay[p] || !byDay[cur] || byDay[p].normalized_100 !== byDay[cur].normalized_100) break
    n++; cur = p
  }
  return n
}

// 差集（AR-9：分母会随内容漂移，同分不等于同一件事 ⇒ 必须比 FAIL 集合）
export const diffIds = (prevList = [], curList = []) => {
  const p = new Set(prevList), c = new Set(curList)
  return { added: curList.filter((x) => !p.has(x)), removed: prevList.filter((x) => !c.has(x)) }
}

// 本地日（UTC+8）——三处各自算 date 曾导致跨 00:00 记错日（AR-6 附带未决项，先统一到一个出口）
export const localDay = (d = new Date()) => new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 10)
export const dayOfStamp = (isoTs) => (isoTs ? new Date(new Date(isoTs).getTime() + 8 * 3600e3).toISOString().slice(0, 10) : null)

export const readText = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null)
