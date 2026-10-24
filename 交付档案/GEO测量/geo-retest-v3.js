// GEO 复测工具 v3（n 次采样 + 品牌位次 + 引用源三列）— 编排本地 node，经 tabbit-cli 驱动已登录会话
// 用法：node 交付档案/GEO测量/geo-retest-v3.js [--engine doubao] [--samples 5] [--question 1|2|3|all]
//        [--out 文件] [--no-ref]
// v2→v3 的三处硬修（对应第十四轮方案 S2；v2 的已知缺陷见 测量记录_20261017_豆包基线与复测工具.md §4）：
//   ① 引用源：v2 只扫 DOM <a>，实测两题都空（面板背后不是锚点）。v3 同时走
//      (a) 网络响应捕获（XHR/fetch 响应体里的 http(s) URL）与 (b) 展开「参考 N 篇」后可见浮层的 innerText，
//      两路取并集，失败时 respective 字段留 null/[] 并在 record 标明，绝不把"没取到"写成"没有引用"。
//   ② 位次：品牌在答案里的第一次出现是第几段（1-based）／第几条列表项／是否进前三条推荐。
//   ③ 采样：同一问跑 N 次（默认 5），聚合行给 mentionRate／mode_answer（按去空白归一后精确众数）／
//      medianBrandPosition／citation_hosts 并集。AI 答案随机，单次读数不构成结论。
//
// 诚信闸（沿用 v2）：答案 < 160 字判 EMPTY_ANSWER 不落 OK 行；侧栏文本混入时 sidebarContaminated=true，
// 该样本的 counts/position 一律不可作对外依据（聚合行会单独数 contaminated）。
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CLI = 'C:/Users/ivan/AppData/Local/Tabbit/LocalAgent/bin/tabbit-cli.exe'
const TASK = 'geo retest v3'
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const has = (n) => argv.includes('--' + n)
const engine = arg('engine', 'doubao')
const samples = Math.max(1, Math.min(10, Number(arg('samples', '5')) || 5))
const out = arg('out', '交付档案/GEO测量/geo-baseline_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '_' + engine + '_v3.jsonl')
const qsel = String(arg('question', 'all'))
const TRY_REF = !has('no-ref')

const QUESTIONS = [
  '图译工坊是什么？',
  'PS 批量改语言用什么工具？',
  '图译工坊 和 ImageTrans 有什么区别？',
].map((q, i) => ({ i: i + 1, q })).filter((x) => qsel === 'all' || String(x.i) === qsel)
if (!QUESTIONS.length) { console.error('no question selected: ' + qsel); process.exit(2) }

const SEL = {
  doubao: {
    start: 'https://www.doubao.com/',
    input: 'textarea[data-testid="chat_input_input"]',
    answers: ['.md-box-root', '[class*="markdown-body"]', '[class*="prose"]', '[data-testid*="message"]'],
    sidebar: ['发消息或按住空格说话', '新建对话'],
  },
}
if (has('dump')) {
  // 只把注入脚本写到 stdout：用于 node --check 语法自检，不碰浏览器
  process.stdout.write(innerScript(SEL[engine], QUESTIONS[0].q, TRY_REF))
  process.exit(0)
}

function innerScript(cfg, question, tryRef) {
  const q = JSON.stringify(question)
  const start = JSON.stringify(cfg.start)
  const inputSel = JSON.stringify(cfg.input)
  const answerSels = JSON.stringify(cfg.answers)
  const sidebar = JSON.stringify(cfg.sidebar)
  return `
const p = await context.newPage()
// ── 网络捕获：必须在 goto 之前挂载，否则漏掉首屏 XHR ──────────────────────────
const net = { all: [], bodies: [] }
p.on('response', (res) => {
  try {
    const req = res.request()
    const rt = req.resourceType()
    if (rt !== 'xhr' && rt !== 'fetch') return
    const u = res.url()
    if (net.all.length < 500) net.all.push({ url: u, status: res.status(), rt })
    // 只读可能装引用的小响应体（<400KB）；大包（音视频/流）直接跳过
    const cl = Number((res.headers() || {})['content-length'] || 0)
    if (cl && cl > 400000) return
    // 3 秒硬上限：豆包有 SSE 长连接，body() 可能永不完结，不加 Race 会让整次采样挂到 CLI 超时
    net.bodies.push({ url: u, promise: Promise.race([
      (async () => { try { const b = await res.body(); if (b && b.length < 400000) return b.toString('utf8') } catch (e) {} return '' })(),
      new Promise((r) => setTimeout(() => r(''), 3000)),
    ]) })
  } catch (e) {}
})
try {
  await p.goto(${start}, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // 2026-10-20 实测：豆包偶发 body 完全空（innerText=0）⇒ 直接打字会落空，整次采样白跑。
  // 等到 body 有实义文本再继续，最多 12 秒。
  for (let i = 0; i < 12; i++) {
    const bl = await p.evaluate(() => (document.body ? document.body.innerText.length : 0)).catch(() => 0)
    if (bl > 50) break
    await p.waitForTimeout(1000)
  }
  const inp0 = p.locator(${inputSel}).first()
  await inp0.waitFor({ state: 'attached', timeout: 25000 })
  await p.waitForTimeout(3000)
  let sent = false
  for (let a = 0; a < 6 && !sent; a++) {
    // 每次重试都重新取句柄：豆包输入框在水合期会 detach 重建，复用旧句柄必失败（v2 首跑实测）
    // 2026-10-20 实测：豆包把可输入面换成了 tiptap contenteditable，textarea 只剩隐藏占位，
    // click 不再可靠 ⇒ 先 JS focus 编辑器，再退回逐选择器点击。
    try {
      const focused = await p.evaluate(() => {
        const cands = [document.querySelector('div[contenteditable="true"]'), document.querySelector('.tiptap'), document.querySelector('textarea[data-testid="chat_input_input"]')]
        const el = cands.find(Boolean)
        if (!el) return false
        el.focus(); return true
      })
      if (!focused) { await p.waitForTimeout(2500); continue }
      await p.keyboard.type(${q}, { delay: 14 })
      const typedOk = await p.evaluate((s) => {
        const el = document.querySelector('div[contenteditable="true"]') || document.querySelector('.tiptap') || document.querySelector('textarea[data-testid="chat_input_input"]')
        const t = el ? (el.innerText || el.textContent || el.value || '') : ''
        return t.includes(s.slice(0, 8))
      }, ${q}).catch(() => false)
      if (!typedOk) { await p.waitForTimeout(1500); continue }
      await p.keyboard.press('Enter')
      sent = true
    }
    catch (e) { await p.waitForTimeout(2500) }
  }
  if (!sent) return { ok: false, stage: 'submit', error: 'input never became clickable' }
  const pick = () => {
    const sels = ${answerSels}
    // 取"最后一个命中"=最新一条回答（v2 首跑用"最长"会挑到整页容器，读到 0 字假绿）
    for (const s of sels) {
      const list = Array.from(document.querySelectorAll(s)).filter(e => (e.innerText || '').trim().length > 160)
      if (list.length) return (list[list.length - 1].innerText || '').trim()
    }
    return ''
  }
  let answer = '', stable = 0
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(2000)
    const now = await p.evaluate(pick)
    if (now && now === answer) { stable++; if (stable >= 2) break } else { stable = 0; answer = now }
  }

  // ── 位次：段落 / 列表项 / 前三条 ────────────────────────────────────────────
  const pos = (() => {
    const paras = answer.split(/\\n+/).map(s => s.trim()).filter(Boolean)
    const bi = paras.findIndex(s => s.includes('图译工坊'))
    const listRe = /^\\s*(?:(\\d{1,2})\\s*[.、)．]|[-•·])\\s+/
    const list = paras.filter(s => listRe.test(s))
    const li = list.findIndex(s => s.includes('图译工坊'))
    const num = (s) => { const m = s.match(listRe); return m && m[1] ? Number(m[1]) : null }
    return {
      paragraphs: paras.length,
      brandParagraph: bi < 0 ? null : bi + 1,
      listItems: list.length,
      brandListItem: li < 0 ? null : li + 1,
      brandListNumber: li < 0 ? null : num(list[li]),
      brandInTop3: li >= 0 && li < 3,
    }
  })()

  // ── 引用池：搜索块 ─────────────────────────────────────────────────────────
  // 2026-10-20 实测（历史会话 38447310206228482）：参考列表默认不在 DOM，且 JS 合成点击打不开，
  // 必须用 Playwright 真实鼠标点击 chip（原文「搜索 6 个关键词，参考 31 篇资料」）才展开 <a href> 列表。
  // 旧 regex 只认行首「参考 N 篇」⇒ v2 两题全空（面板 false），这条是 v2「引用池测不到」的真因。
  let searchUsed = false, refExpanded = false, refChipText = '', refCount = null, refQueries = '', refLinks = []
  if (${tryRef}) {
    const blockSel = '[data-plugin-identifier*="search_query_result_block"]'
    const nBlocks = await p.locator(blockSel).count().catch(() => 0)
    if (nBlocks > 0) {
      searchUsed = true
      const block = p.locator(blockSel).last()
      refChipText = (await block.locator('[data-copy-ignore]').first().innerText({ timeout: 3000 }).catch(() => '') || '').trim()
      const cm = refChipText.match(/参考\\s*(\\d+)\\s*篇/)
      if (cm) refCount = Number(cm[1])
      let linksNow = await block.locator('a[href^="http"]').count().catch(() => 0)
      if (!linksNow) {
        try { await block.locator('[data-copy-ignore]').first().click({ timeout: 6000 }); await p.waitForTimeout(2500) } catch (e) {}
        linksNow = await block.locator('a[href^="http"]').count().catch(() => 0)
      }
      refExpanded = linksNow > 0
      const got = await block.evaluate((b) => {
        const links = Array.from(b.querySelectorAll('a[href^="http"]')).map(a => ({ href: a.href, text: (a.innerText || '').trim().slice(0, 120) }))
        const qline = Array.from(b.querySelectorAll('div')).map(d => (d.innerText || '').trim()).find(t => /^[“"]/.test(t) && t.length > 10 && t.length < 400) || ''
        return { links, qline }
      }).catch(() => ({ links: [], qline: '' }))
      refLinks = (got.links || []).slice(0, 80)
      refQueries = got.qline || ''
    }
  }

  // ── 网络响应体（只作诊断：这里混着配置/推荐噪声，不拿它当引用源） ─────────────
  const ENGINE = /doubao\\.com|bytedance|toutiao|pstatp|volces|snssdk|zijie|byteimg|ibytedapm|feishu|bytegoofy|bytednsdoc|byte\\.org/i
  const hostOf = (u) => { try { return new URL(u).hostname } catch (e) { return null } }
  const bodies = await Promise.allSettled(net.bodies.map(b => b.promise))
  const fromBodies = []
  const endpoints = []
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i]
    if (b.status !== 'fulfilled' || !b.value) continue
    const hs = []
    for (const m of b.value.match(/https?:\\\\?\\/\\\\?\\/[^"'\\\\\\s<>]+/g) || []) {
      const h = hostOf(m.replace(/\\\\\\//g, '/'))
      if (h) hs.push(h)
    }
    const ext = [...new Set(hs.filter(h => !ENGINE.test(h)))]
    if (ext.length) endpoints.push({ url: String(net.bodies[i].url || '').slice(0, 160), chars: b.value.length, hosts: ext.slice(0, 30) })
    for (const h of ext) fromBodies.push(h)
  }
  endpoints.sort((a, b) => b.hosts.length - a.hosts.length)
  const netHosts = net.all.map(x => hostOf(x.url)).filter(h => h && !ENGINE.test(h))
  const refHosts = [...new Set(refLinks.map(l => hostOf(l.href)).filter(h => h && !ENGINE.test(h)))].sort()
  const ourCited = refLinks.some(l => /图译工坊|tuyigf/i.test(l.text + ' ' + l.href))

  return {
    ok: true,
    url: p.url(),
    answerChars: answer.length,
    sidebarContaminated: ${sidebar}.some(m => answer.includes(m)),
    // 记忆污染探针（10-20 实测）：同账号历史对话会把"你之前关注/你在用"写进答案，
    // 这时的提到率测的是账号记忆，不是"新用户问同一个问题会得到什么"。
    personalized: /你之前|之前关注|之前提到|你在用|根据你的|按你的/.test(answer),
    counts: { tu: (answer.match(/图译工坊/g) || []).length, it: (answer.match(/ImageTrans/g) || []).length, tuyigf: (answer.match(/tuyigf/gi) || []).length },
    position: pos,
    citation: {
      searchUsed, refExpanded, refChipText, refCount, refQueries,
      refLinks: refLinks.slice(0, 40),
      hosts: refHosts.slice(0, 40),
      ourCited,
      fromBodies: [...new Set(fromBodies)].slice(0, 20),
      endpoints: endpoints.slice(0, 12),
      endpointHosts: [...new Set(netHosts)].slice(0, 40),
      netAll: net.all.length,
    },
    answer: answer.slice(0, 2400),
  }
} finally { await p.close() }
`
}

function ensureTask() {
  try { execFileSync(CLI, ['create', '--task', TASK], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) { /* 已存在或超时：下一步会暴露真问题 */ }
}

function runOne(question, requestId, tryRef) {
  const cfg = SEL[engine]
  const file = path.join('tmp', '_retest3_' + requestId + '.js')
  fs.writeFileSync(file, innerScript(cfg, question, tryRef), 'utf8')
  let raw
  try {
    raw = execFileSync(CLI, ['nodejs', '--task', TASK, '--request-id', requestId, '--timeout-ms', '165000'], {
      input: fs.readFileSync(file, 'utf8'), maxBuffer: 32 * 1024 * 1024, encoding: 'utf8', timeout: 190000, stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (e) {
    throw new Error('CLI_FAIL ' + String((e.stdout || '') + (e.stderr || '')).replace(/\s+/g, ' ').slice(-200))
  }
  const j = JSON.parse(raw.slice(raw.indexOf('{')))
  if (j.status !== 'succeeded') throw new Error('TABBIT_FAIL ' + String((j.result && (j.result.error || j.result.status)) || '').slice(0, 200))
  const v = j.result.value
  if (!v || !v.ok) throw new Error('RUN_FAIL ' + JSON.stringify(v).slice(0, 200))
  if (!v.answerChars || v.answerChars < 160) throw new Error('EMPTY_ANSWER chars=' + v.answerChars + ' bodyChars=' + (v.bodyChars || 0) + ' url=' + v.url)
  return v
}

const modeOf = (arr) => {
  const norm = (s) => String(s || '').replace(/\s+/g, '')
  const m = new Map()
  for (const x of arr) { const k = norm(x); if (!k) continue; m.set(k, (m.get(k) || 0) + 1) }
  let best = null, n = 0
  for (const [k, c] of m) { if (c > n) { best = k; n = c } }
  return { mode_answer: best, mode_count: n, unique: m.size }
}
const median = (arr) => {
  const a = arr.filter((x) => typeof x === 'number').sort((x, y) => x - y)
  if (!a.length) return null
  const i = Math.floor(a.length / 2)
  return a.length % 2 ? a[i] : Math.round(((a[i - 1] + a[i]) / 2) * 10) / 10
}

if (!fs.existsSync(out)) fs.writeFileSync(out, '', 'utf8')
ensureTask()
let okCount = 0, contaminated = 0
for (let qi = 0; qi < QUESTIONS.length; qi++) {
  const q = QUESTIONS[qi].q
  const rows = []
  for (let s = 1; s <= samples; s++) {
    const rid = 'v3q' + QUESTIONS[qi].i + 's' + s + '-' + Date.now().toString(36)
    process.stdout.write('[' + engine + ' s' + s + '/' + samples + '] ' + q + ' ... ')
    const stamp = new Date().toISOString()
    let v = null, lastErr = null
    // 一次自动重试：只对"页面没起来/提交没成功"这类可重试失败；每次都落一行 attempt 记录，方便辨认
    for (let attempt = 1; attempt <= 2 && !v; attempt++) {
      try { v = runOne(q, rid + '-a' + attempt, TRY_REF) }
      catch (e) {
        lastErr = e
        fs.appendFileSync(out, JSON.stringify({ ts: new Date().toISOString(), engine, question: q, sample: s, tool: 'v3', attempt, error: String(e.message).slice(0, 240) }) + '\n', 'utf8')
        if (!/EMPTY_ANSWER|CLI_FAIL|RUN_FAIL .*submit/.test(String(e.message))) break
      }
    }
    if (v) {
      const rec = {
        ts: stamp, engine, question: q, sample: s, tool: 'v3',
        answerChars: v.answerChars, sidebarContaminated: v.sidebarContaminated, counts: v.counts,
        personalized: !!v.personalized,
        position: v.position, citation: v.citation, url: v.url, answer: v.answer,
      }
      fs.appendFileSync(out, JSON.stringify(rec) + '\n', 'utf8')
      rows.push(rec); okCount += 1
      if (v.sidebarContaminated) contaminated += 1
      console.log('OK 字数=' + v.answerChars + ' 段=' + (v.position && v.position.brandParagraph) + ' 列表位=' + (v.position && v.position.brandListItem) + ' 前3=' + (v.position && v.position.brandInTop3) + ' 搜索=' + (v.citation && v.citation.searchUsed) + ' 展开=' + (v.citation && v.citation.refExpanded) + ' 参考=' + (v.citation && v.citation.refCount) + ' 引用域=' + ((v.citation && v.citation.hosts) || []).length + ' 自引=' + (v.citation && v.citation.ourCited) + ' 污染=' + v.sidebarContaminated + ' 记忆=' + v.personalized)
    } else {
      console.log('FAIL ' + String((lastErr && lastErr.message) || '').slice(0, 120))
    }
  }
  const clean = rows.filter((r) => !r.sidebarContaminated)
  // 记忆未污染的样本才算"干净基线"：账号历史会把品牌写进答案，那测的是记忆不是推荐。
  const unbiased = clean.filter((r) => !r.personalized)
  const agg = {
    ts: new Date().toISOString(), engine, question: q, tool: 'v3', type: 'aggregate', samplesRequested: samples, samplesOk: rows.length, samplesClean: clean.length, samplesUnbiased: unbiased.length,
    personalizedRate: clean.length ? Math.round((clean.filter((r) => r.personalized).length / clean.length) * 100) / 100 : null,
    mentionRate: clean.length ? Math.round((clean.filter((r) => r.counts.tu > 0).length / clean.length) * 100) / 100 : null,
    mentionRateClean: unbiased.length ? Math.round((unbiased.filter((r) => r.counts.tu > 0).length / unbiased.length) * 100) / 100 : null,
    mentionMean: clean.length ? Math.round((clean.reduce((a, r) => a + r.counts.tu, 0) / clean.length) * 100) / 100 : null,
    mentionMeanClean: unbiased.length ? Math.round((unbiased.reduce((a, r) => a + r.counts.tu, 0) / unbiased.length) * 100) / 100 : null,
    medianBrandPosition: median(clean.map((r) => r.position && r.position.brandParagraph)),
    medianBrandPositionClean: median(unbiased.map((r) => r.position && r.position.brandParagraph)),
    top3Rate: clean.length ? Math.round((clean.filter((r) => r.position && r.position.brandInTop3).length / clean.length) * 100) / 100 : null,
    top3RateClean: unbiased.length ? Math.round((unbiased.filter((r) => r.position && r.position.brandInTop3).length / unbiased.length) * 100) / 100 : null,
    ...modeOf(clean.map((r) => r.answer)),
    citation_hosts: [...new Set(clean.flatMap((r) => (r.citation && r.citation.hosts) || []))].sort(),
    searchUsedRate: clean.length ? Math.round((clean.filter((r) => r.citation && r.citation.searchUsed).length / clean.length) * 100) / 100 : null,
    refExpandedRate: clean.length ? Math.round((clean.filter((r) => r.citation && r.citation.refExpanded).length / clean.length) * 100) / 100 : null,
    ourCitedRate: clean.length ? Math.round((clean.filter((r) => r.citation && r.citation.ourCited).length / clean.length) * 100) / 100 : null,
    refCountMedian: median(clean.map((r) => r.citation && r.citation.refCount)),
  }
  fs.appendFileSync(out, JSON.stringify(agg) + '\n', 'utf8')
  console.log('聚合 ' + q + '：提到率=' + agg.mentionRate + '（均次 ' + agg.mentionMean + '）中位段=' + agg.medianBrandPosition + ' 前3率=' + agg.top3Rate + ' 众数=' + agg.mode_count + '/' + (agg.samplesClean || 0) + ' 搜索率=' + agg.searchUsedRate + ' 展开率=' + agg.refExpandedRate + ' 参考中位=' + agg.refCountMedian + ' 引用域=' + agg.citation_hosts.length + ' 自引率=' + agg.ourCitedRate)
  console.log('记忆污染：' + agg.personalizedRate + '（干净样本 ' + agg.samplesUnbiased + '/' + agg.samplesClean + '）｜干净提到率=' + agg.mentionRateClean + ' 干净中位段=' + agg.medianBrandPositionClean + ' 干净前3率=' + agg.top3RateClean)
  if (agg.samplesUnbiased === 0) console.log('⚠ 全部样本含"你之前…"记忆痕迹 ⇒ 本节提到率/位次不可当干净 GEO 基线，只能当"该账号会看到什么"；引用域仍可用。')
}
console.log('汇总：成功 ' + okCount + '/' + (QUESTIONS.length * samples) + '｜侧栏污染 ' + contaminated + ' 条｜写盘 ' + out)
process.exitCode = okCount >= Math.ceil(QUESTIONS.length * samples * 0.6) && contaminated === 0 ? 0 : 1
