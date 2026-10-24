// GEO 复测工具 v2（只取答案容器＋负控自证）— 编排本地 node，经 tabbit-cli 驱动已登录会话
// 用法：node 交付档案/GEO测量/geo-retest-v2.js [--engine doubao] [--out 文件] [--max-ask N] [--ref]
// v1→v2 的两处硬修：①选择器消歧（textarea[data-testid=...]，实测同名两枚会撞 strict mode）
//                    ②稳定判据从"整页长度不变"改成"答案容器字数过阈值且两次采样相同"（v1 把导航瞬间的空页当稳定）
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CLI = 'C:/Users/ivan/AppData/Local/Tabbit/LocalAgent/bin/tabbit-cli.exe'
const TASK = 'geo retest v2'
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const has = (n) => argv.includes('--' + n)
const engine = arg('engine', 'doubao')
const out = arg('out', '交付档案/GEO测量/geo-baseline_20261017_doubao_v2.jsonl')
const maxAsk = Number(arg('max-ask', '3'))

const QUESTIONS = [
  '图译工坊是什么？',
  'PSD 批量改语言用什么工具？',
  '图译工坊 和 ImageTrans 有什么区别？',
].slice(0, maxAsk)

const SEL = {
  doubao: {
    start: 'https://www.doubao.com/',
    input: 'textarea[data-testid="chat_input_input"]',
    // 实测（2026-10-17 21:1x 探针）答案块是 .md-box-root（class 带 md-box-root container-*），其余为兜底
    answers: ['.md-box-root', '[class*="markdown-body"]', '[class*="prose"]', '[data-testid*="message"]'],
    sidebar: ['发消息或按住空格说话', '新建对话'],
  },
}

function innerScript(cfg, question, tryRef) {
  const q = JSON.stringify(question)
  const start = JSON.stringify(cfg.start)
  const inputSel = JSON.stringify(cfg.input)
  const answerSels = JSON.stringify(cfg.answers)
  const sidebar = JSON.stringify(cfg.sidebar)
  return `
const p = await context.newPage()
try {
  await p.goto(${start}, { waitUntil: 'domcontentloaded', timeout: 45000 })
  const inp0 = p.locator(${inputSel}).first()
  await inp0.waitFor({ state: 'attached', timeout: 25000 })
  await p.waitForTimeout(3000)
  let sent = false
  for (let a = 0; a < 6 && !sent; a++) {
    // 每次重试都重新取句柄：豆包输入框在水合期会 detach 重建，复用旧句柄必失败（v2 首跑实测）
    try {
      const inp = p.locator(${inputSel}).first()
      await inp.waitFor({ state: 'attached', timeout: 12000 })
      await inp.click({ force: true, timeout: 5000 })
      await p.keyboard.type(${q}, { delay: 14 })
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
  let refPanelOpened = false, extHosts = []
  const baseHosts = await p.evaluate(() => [...new Set(Array.from(document.querySelectorAll('a[href^="http"]')).map(a => { try { return new URL(a.href).hostname } catch { return null } }).filter(Boolean))])
  if (${tryRef}) {
    try {
      // 用 JS 侧文本匹配点「参考 N 篇」，避开 Playwright text=/…/ 在模板串里的二次转义坑（v2 首试即栽在这）
      refPanelOpened = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll('div,span,button,a'))
        const chip = els.find(e => /^参考\\s*\\d+\\s*[篇条]/.test((e.innerText || '').trim()) && e.children.length <= 3)
        if (!chip) return false
        chip.click()
        return true
      })
      await p.waitForTimeout(3000)
    } catch (e) { refPanelOpened = false }
  }
  const nowHosts = await p.evaluate(() => [...new Set(Array.from(document.querySelectorAll('a[href^="http"]')).map(a => { try { return new URL(a.href).hostname } catch { return null } }).filter(Boolean))])
  extHosts = nowHosts.filter(h => !baseHosts.includes(h))
  const all = await p.evaluate(() => ({ body: document.body.innerText }))
  const merged = [...new Set(nowHosts.filter(h => !/doubao\\.com|bytedance|toutiao|pstatp|volces|snssdk/i.test(h)))]
  const sb = ${sidebar}
  return {
    ok: true,
    url: p.url(),
    answerChars: answer.length,
    sidebarContaminated: sb.some(m => answer.includes(m)),
    counts: { tu: (answer.match(/图译工坊/g) || []).length, it: (answer.match(/ImageTrans/g) || []).length, tuyigf: (answer.match(/tuyigf/gi) || []).length },
    refChipInAnswer: (answer.match(/参考\\s*\\d+\\s*[篇条]/g) || []).slice(0, 2),
    refPanelOpened, newHosts: extHosts.slice(0, 20), extHostsAll: merged.slice(0, 25),
    bodyChars: all.body.length,
    answer: answer.slice(0, 2400)
  }
} finally { await p.close() }
`
}

function runOne(question, requestId, tryRef) {
  const cfg = SEL[engine]
  const file = path.join('tmp', '_retest2_' + requestId + '.js')
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
  // 完整性闸：没拿到答案就不算成功（v2 首跑曾以 0 字答案报 OK＝假绿，禁止复现）
  if (!v.answerChars || v.answerChars < 160) throw new Error('EMPTY_ANSWER chars=' + v.answerChars + ' bodyChars=' + v.bodyChars + ' url=' + v.url)
  return v
}

if (!fs.existsSync(out)) fs.writeFileSync(out, '', 'utf8')
let okCount = 0, contaminated = 0, refOk = 0
for (let i = 0; i < QUESTIONS.length; i++) {
  const q = QUESTIONS[i]
  const rid = 'v2' + (i + 1) + '-' + Date.now().toString(36)
  process.stdout.write('[' + engine + ' q' + (i + 1) + '] ' + q + ' ... ')
  const stamp = new Date().toISOString()
  try {
    const v = runOne(q, rid, has('ref'))
    const rec = { ts: stamp, engine, question: q, tool: 'v2', answerChars: v.answerChars, sidebarContaminated: v.sidebarContaminated, counts: v.counts, refChipInAnswer: v.refChipInAnswer, refPanelOpened: v.refPanelOpened, newHosts: v.newHosts, extHostsAll: v.extHostsAll, url: v.url, answer: v.answer }
    fs.appendFileSync(out, JSON.stringify(rec) + '\n', 'utf8')
    okCount += 1
    if (v.sidebarContaminated) contaminated += 1
    if (v.newHosts && v.newHosts.length) refOk += 1
    console.log('OK 答案字数=' + v.answerChars + ' 污染=' + v.sidebarContaminated + ' 图译工坊=' + v.counts.tu + ' ImageTrans=' + v.counts.it + ' tuyigf=' + v.counts.tuyigf + ' 面板开=' + v.refPanelOpened + ' 新域名=' + (v.newHosts || []).length)
  } catch (e) {
    fs.appendFileSync(out, JSON.stringify({ ts: stamp, engine, question: q, tool: 'v2', error: String(e.message).slice(0, 240) }) + '\n', 'utf8')
    console.log('FAIL ' + String(e.message).slice(0, 120))
  }
}
console.log('汇总：成功 ' + okCount + '/' + QUESTIONS.length + '｜侧栏污染 ' + contaminated + ' 条｜拿到新域名 ' + refOk + ' 条｜写盘 ' + out)
process.exitCode = okCount >= 2 && contaminated === 0 ? 0 : 1
