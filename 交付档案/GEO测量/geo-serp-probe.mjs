// GEO 检索面探针（10-21 新建；**10-22 夜第二版：三轴分类**）。百度＋Bing 的"在场性"复测。
// 为什么不用 curl：同轮控制实验实测匿名 curl 拿到的 SERP 是降级的——Bing 对我们首页原句返回的全是字典条目、
//   品牌词前排是壁纸/素材站，百度直接 1,488 B 安全验证墙（tmp/serp-viability.mjs 回显）。⇒ 必须走真实浏览器。
// 10-22 夜的教训（复盘见 geo-serp-classify.mjs 页眉）：旧版把"在场性"压成一个 ownInItems 位次，
//   而匹配串只有 ASCII `tuyigf`——百度结果卡的 src 位放中文站名、host 位是 /link?url= 跳转壳，
//   于是我们把已上线的 CSDN 文（百度长句词第 1、品牌词第 6）读成了"百度 0 条在场"。
//   ⇒ 现在分三轴：本站域名／站外我们（靠发布稿标题签名）／同族名撞车，再加 `thin` 判"拿到的不像结果页"。
// 反假 0 设计（AR 纪律第五/六条＋根账 #183）：每轮必带**阳性对照**（一定该有结果的查询）与
//   **阴性对照**（不可能有结果的乱码串）。阳性对照空 ⇒ 整轮判"通道失效"，所有读数只留痕、不作"未收录"主张。
//   阴性对照串**不得含任何与本站相关的子串**（旧串含 `tuyigf`，查询回显会自己命中守卫 ⇒ 把可用通道判死）。
// 用法：node 交付档案/GEO测量/geo-serp-probe.mjs [--engines baidu,bing] [--out 文件] [--only-own]
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { classifyItems } from './geo-serp-classify.mjs'

const CLI = 'C:/Users/ivan/AppData/Local/Tabbit/LocalAgent/bin/tabbit-cli.exe'
const TASK = 'geo retest v3' // 复用已建任务（同一已登录浏览器上下文）
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const out = arg('out', '交付档案/GEO测量/geo-serp_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.jsonl')
const engines = arg('engines', 'baidu,bing').split(',')
const onlyOwn = argv.includes('--only-own')

const QUERIES = [
  { id: 'site', q: 'site:tuyigf.com', kind: 'own' },
  { id: 'brand', q: '图译工坊', kind: 'own' },
  { id: 'prod', q: 'PS 批量改语言', kind: 'own' },
  { id: 'tut', q: 'PSD 批量替换文字', kind: 'own' },
  { id: 'guide', q: '把已有译文批量写进 PSD', kind: 'own' },
  { id: 'positive', q: 'Photoshop 官方下载', kind: 'control' },
  // 10-22 换串：旧串 `zxqwvplkmtuyigf9937qq` 里带着 `tuyigf`，查询回显会自己命中"本站不得出现"这条守卫，
  // 把可用通道判成造假（r3 第 14 行 ownMentions=2 就是这么来的）。新串与本站无任何共同子串。
  { id: 'negative', q: 'qzpfvbkm9937qdxl', kind: 'control' },
].filter((x) => !onlyOwn || x.kind === 'own')

function innerScript(eng) {
  const base = eng === 'baidu' ? 'https://www.baidu.com/s?wd=' : 'https://www.bing.com/search?q='
  const qs = JSON.stringify(QUERIES.map((x) => ({ id: x.id, q: x.q, kind: x.kind })))
  return `
const pg = page || await context.newPage()
const out = []
for (const item of ${qs}) {
  const url = ${JSON.stringify(base)} + encodeURIComponent(item.q) + (${eng === 'baidu'} ? '&rn=20' : '')
  const rec = { id: item.id, q: item.q, kind: item.kind, url }
  const t0 = Date.now()
  try { await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }) } catch (e) { rec.error = 'GOTO ' + String(e.message).slice(0, 90); out.push(rec); continue }
  await pg.waitForTimeout(3200)
  const d = await pg.evaluate(() => {
    const sel = location.host.includes('baidu') ? 'div.result, div.c-container' : 'li.b_algo'
    const blocks = Array.from(document.querySelectorAll(sel))
    const items = []
    const hostOf = (u) => { try { return new URL(u, location.origin).hostname } catch (e) { return '' } }
    for (const [bi, b] of blocks.entries()) {
      const a = b.querySelector(location.host.includes('baidu') ? 'h3 a' : 'h2 a')
      if (!a) continue
      const title = (a.innerText || '').trim().replace(/\\s+/g, ' ')
      if (!title) continue
      const srcEl = b.querySelector('.c-showurl, [class*="source"], .b_tpcn, cite')
      // pos＝该结果块在页面结果节点里的原始序号（1 起）。10-21 用的是"解析成功第几条"，
      // 被跳过的空块会把位次往前挤 ⇒ 报出来的名次可能比真的好。
      items.push({ pos: bi + 1, title: title.slice(0, 60), host: hostOf(a.getAttribute('href') || ''), src: srcEl ? (srcEl.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 40) : '' })
    }
    const bodyText = document.body ? document.body.innerText : ''
    return {
      items: items.slice(0, 20),
      nBlocks: blocks.length,
      bodyChars: bodyText.length,
      nores: /没有找到相关结果|未找到相关结果|抱歉，没有找到|没有找到相关的结果|There are no results|没有与此相关的结果|没有找到该URL/.test(bodyText),
      // 百度对没收录的 site: 查询给的是"没有找到该URL…以下是网页中包含…的结果"——**这不是空结果页**，
      // 是"该语法没有索引页"的提示；10-21 把它读成 0 条在场，形状上分不清。
      noindex_hint: /没有找到该URL|以下是网页中包含/.test(bodyText),
      wall: /百度安全验证|请输入验证码|人机验证|Access Denied|unusual traffic/i.test(bodyText.slice(0, 4000)),
      ownMentions: (bodyText.match(/tuyigf|图译工坊/gi) || []).length,
    }
  }).catch((e) => ({ items: [], nBlocks: -1, bodyChars: 0, nores: false, noindex_hint: false, wall: false, ownMentions: 0, evalErr: String(e.message).slice(0, 90) }))
  out.push({ ...rec, ...d, ms: Date.now() - t0, finalUrl: pg.url() })
}
if (!page) { try { await pg.close() } catch (e) {} }
return out
`
}

// 大结果会被 CLI 卸到 resource（10-20 实测：>~1 MB 时 value 不在内联 JSON 里）。
// 分片读回：每片上限 65536 字节，直到空片或短片为止，拼起来再解析。
function readResource(rid) {
  let buf = ''
  for (let off = 0; off < 4_000_000; off += 65536) {
    let piece
    try {
      piece = execFileSync(CLI, ['resource', '--task', TASK, '--resource', String(rid), '--offset', String(off), '--max-bytes', '65536'], {
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (e) {
      const msg = String((e && (e.stderr || e.message)) || '').replace(/\s+/g, ' ')
      // CLI 对"offset 超出资源长度"报 RangeError＝正常结束信号（不是故障），已读到的片段照用。
      if (/offset must be at most the resource byteLength/i.test(msg)) break
      throw new Error('RESOURCE_FAIL off=' + off + ' ' + msg.slice(-120))
    }
    if (!piece) break
    const bytes = Buffer.byteLength(String(piece), 'utf8')
    buf += String(piece)
    if (bytes < 65536) break // 末片：不足一整块，说明已到资源末尾
  }
  let arr = null
  try { arr = JSON.parse(buf) } catch (e) { /* 整片不是纯数组，退回切片法 */ }
  if (Array.isArray(arr)) return arr
  const s = buf.slice(buf.indexOf('['), buf.lastIndexOf(']') + 1)
  if (!s.startsWith('[')) throw new Error('RESOURCE_UNPARSABLE 头 300：' + buf.slice(0, 300).replace(/\s+/g, ' '))
  arr = JSON.parse(s)
  if (!Array.isArray(arr)) throw new Error('RESOURCE_NOT_ARRAY')
  return arr
}

function runEngine(eng) {
  const file = path.join('tmp', '_serp21_' + eng + '.js')
  fs.writeFileSync(file, innerScript(eng), 'utf8')
  const rid = 'serp21-' + eng + '-' + Date.now().toString(36)
  let raw
  try {
    raw = execFileSync(CLI, ['nodejs', '--task', TASK, '--request-id', rid, '--timeout-ms', '180000'], {
      input: fs.readFileSync(file, 'utf8'), maxBuffer: 32 * 1024 * 1024, encoding: 'utf8', timeout: 200000, stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (e) { throw new Error('CLI_FAIL ' + String((e.stdout || '') + (e.stderr || '')).replace(/\s+/g, ' ').slice(-160)) }
  const j = JSON.parse(raw.slice(raw.indexOf('{')))
  if (j.status !== 'succeeded') throw new Error('TABBIT_FAIL ' + String((j.result && (j.result.error || j.result.status)) || '').slice(0, 160))
  if (!Array.isArray(j.result.value)) {
    const keys = Object.keys(j).join(',') + ' / result:' + Object.keys(j.result || {}).join(',')
    const rid = (j.result && (j.result.resourceId || j.result.resource_id)) || (j.resourceId || null)
    if (rid) return readResource(rid)
    throw new Error('NO_VALUE keys=[' + keys + '] 尾段：' + String(raw).slice(-400).replace(/\s+/g, ' '))
  }
  return j.result.value
}

if (!fs.existsSync(out)) fs.writeFileSync(out, '', 'utf8')
try { execFileSync(CLI, ['create', '--task', TASK], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) { /* 已存在 */ }

const all = []
for (const eng of engines) {
  process.stdout.write('[' + eng + '] 探测 ' + QUERIES.length + ' 组 ... ')
  let rows
  try { rows = runEngine(eng) } catch (e) { console.log('FAIL ' + String(e.message).slice(0, 130)); fs.appendFileSync(out, JSON.stringify({ ts: new Date().toISOString(), eng, error: String(e.message).slice(0, 240) }) + '\n', 'utf8'); continue }
  console.log('回 ' + rows.length + ' 行')
  // 通道有效性判据（10-21 第二版；**首版判据是我写错的**：原要求"乱码查询应无结果"，
  // 而 Bing 对乱码会改写查询、返回一堆无关结果 ⇒ 会把可用通道误判为无效。
  // 阴性对照真正要防的是**通道把我们的页面凭空塞进任何查询**（污染/造假），所以不变量＝"本站不得出现"，
  // 与"有没有结果"无关。阳性对照仍要求"必须有结果且不撞墙"（防假 0）。
  const pos = rows.find((r) => r.id === 'positive')
  const neg = rows.find((r) => r.id === 'negative')
  // 逐行三轴分类（本站域名／站外我们／同族名撞车）＋ thin（拿到的不像结果页）。
  for (const r of rows) {
    r.own = classifyItems(r.items || [])
    r.thin = !r.error && ((r.items || []).length < 3 || Number(r.bodyChars) < 800 || Number(r.nBlocks) < 3)
  }
  const posOk = !!pos && !pos.wall && (pos.items || []).length > 0
  // 阴性对照的不变量：通道不得把"我们"（本站或站外我们）凭空塞进任何查询。
  const negOwnAny = neg && neg.own ? neg.own.ownAnyPos : -1
  // 10-23 修正：旧规则把"阴性对照这一组自己撞墙"也算成整通道无效——于是百度那一轮
  // 明明有 5 组渲染成功、2 组拿到 18 条真结果，却被一句 neg.wall 判成 INVALID，读数为零可用。
  // 造假守卫要防的是"凭空塞进我们"，撞墙只是**那一行**没拿到页 ⇒ 撞墙行自己标 row_valid=false，
  // 不连坐整通道（阳性对照仍然是硬闸：阳性拿不到页＝整轮不可信）。
  const negWalled = !!neg && neg.wall
  const negClean = !neg || negOwnAny === -1
  const channelValid = posOk && negClean
  // 两个方向不对称，得分开设闸（10-23 上午百度连跑两轮看清的）：
  //   否定读数（"前十没有我们"）怕**假 0** ⇒ 必须阳性对照拿到过页才可信；
  //   肯定读数（"第 4 位是我们的文"）怕**凭空塞** ⇒ 归阴性守卫管，与阳性对照自己撞不撞墙无关。
  // 只有一个 channel_valid 时，"阳性撞墙"会把同轮里已经看见的肯定读数一起作废＝白丢数据（上面那条
  // "阳性拿不到页＝整轮不可信"只在**否定读数**上成立，这里把它限定回去）。
  if (neg) console.log('  对照读数：阳性条数=' + ((pos && pos.items) || []).length + ' 阴性我们位次=' + negOwnAny + '（阳性我们位次=' + (pos && pos.own ? pos.own.ownAnyPos : '?') + '）' + (negWalled ? '｜阴性对照这组自己撞墙，只作该行失效，不连坐通道' : ''))
  for (const r of rows) {
    const rendered = !r.error && !r.wall && !r.thin
    // 标记同时挂到内存对象上：下面的行级结论与"肯定/否定可用数"都读这三枚，
    // 只写盘不进内存的话，回读时全是 undefined ⇒ 每条都被判"该行不可用"（10-23 自己踩到）。
    r.channel_valid = channelValid
    r.row_valid = negClean && rendered
    r.can_support_positive = negClean && rendered
    r.can_support_negative = channelValid && rendered
    fs.appendFileSync(out, JSON.stringify({
      ts: new Date().toISOString(), eng,
      channel_valid: r.channel_valid,
      row_valid: r.row_valid,
      can_support_positive: r.can_support_positive,
      can_support_negative: r.can_support_negative,
      ...r
    }) + '\n', 'utf8')
  }
  all.push({ eng, rows, channelValid, posOk, negClean })
  const renderedCount = rows.filter((r) => !r.error && !r.wall && !r.thin).length
  console.log(`  通道有效性＝${channelValid ? 'OK' : 'INVALID'}（阳性有结果=${posOk} 阴性无我们=${negClean}）｜肯定读数可用 ${negClean ? renderedCount : 0}/${rows.length}｜否定读数可用 ${channelValid ? renderedCount : 0}/${rows.length}`)
  for (const r of rows) {
    const o = r.own || {}
    const rank = (p) => (p >= 0 ? p : '—')
    console.log(`  ${String(r.id).padEnd(8)} 条=${String((r.items || []).length).padStart(2)} 块=${String(r.nBlocks).padStart(2)} 本站=${rank(o.ownDomainPos)} 站外我们=${rank(o.ownOffsitePos)} 撞名=${rank(o.collisionPos)} 品牌名被别家用=${rank(o.brandMentionPos)} 墙=${r.wall} 空/薄=${r.nores}/${r.thin} noindex提示=${r.noindex_hint} body=${r.bodyChars}`)
    if (o.ownOffsite && o.ownOffsite.length) o.ownOffsite.forEach((x) => console.log(`      └ ${x.who} @${x.pos}｜${x.src}｜${x.title}`))
  }
}
const valid = all.filter((a) => a.channelValid)
const positiveRows = all.flatMap((a) => a.rows.filter((r) => r.can_support_positive && r.kind === 'own').map((r) => ({ ...r, eng: a.eng })))
console.log('汇总：引擎 ' + all.length + ' 个｜通道（可作否定结论）有效 ' + valid.length + ' 个｜可作肯定结论的自有查询行 ' + positiveRows.length + ' 个｜写盘 ' + out)
console.log(positiveRows.length ? 'SERP_POSITIVE_OK 有行能支撑"我们第 N 位"这类肯定读数' : 'SERP_POSITIVE_NONE 本轮没有任何一行能支撑肯定读数')
console.log(valid.length ? 'SERP_NEGATIVE_OK 只有通道有效的引擎可作"未收录/前十无"这类否定结论' : 'SERP_NEGATIVE_NOT_USABLE 通道无效 ⇒ 本轮不得写"未收录/未在场"')
// 三轴各自一句结论，禁止再合成"百度有没有我们"这种单值话（10-21 就是这么错的）。
for (const a of all) {
  for (const r of a.rows.filter((x) => x.kind === 'own')) {
    if (!r.can_support_positive) { console.log(`  [${a.eng}/${r.id}] 该行不可用（错=${r.error || '无'} 墙=${r.wall} 薄=${r.thin} 阴性守卫=${a.negClean}）⇒ 不报位次`); continue }
    const o = r.own || {}
    if (!r.can_support_negative) { console.log(`  [${a.eng}/${r.id}] 阳性对照未过关 ⇒ 只报"看见的"（第 ${o.ownAnyPos >= 0 ? o.ownAnyPos : '?'} 位），不报"前十没有"`); }
    if (r.thin) { console.log(`  [${a.eng}/${r.id}] 读数太薄（body=${r.bodyChars} 块=${r.nBlocks}）⇒ 只可说"这一组没拿到可用结果页"，不可说未收录`); continue }
    console.log(`  [${a.eng}/${r.id}] 本站=${o.ownDomainPos >= 0 ? '第 ' + o.ownDomainPos : '前十无'}｜站外我们=${o.ownOffsitePos >= 0 ? '第 ' + o.ownOffsitePos + '（' + o.ownOffsite.map((x) => x.who).join(',') + '）' : '无'}${o.collisionPos >= 0 ? '｜同族名撞车在第 ' + o.collisionPos + '（"' + o.nameCollision[0].src + '"）' : ''}`)
  }
}
process.exitCode = (positiveRows.length || valid.length) ? 0 : 1
