// GEO 复测工具（可复跑基线）— 由本地 node 编排，经 tabbit-cli 驱动已登录会话
// 用法：node tmp/geo-retest.mjs [--engine doubao] [--out tmp/geo-baseline-20261017.jsonl]
// 判据落盘：每题一行 JSON（问题、命中数、外部引用域、回答尾部片段、时刻）
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CLI = 'C:/Users/ivan/AppData/Local/Tabbit/LocalAgent/bin/tabbit-cli.exe'
const TASK = 'geo retest harness'
const argv = process.argv.slice(2)
const arg = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt }
const engine = arg('engine', 'doubao')
const out = arg('out', 'tmp/geo-baseline-20261017.jsonl')

const QUESTIONS = (arg('q','') || '').split('||').filter(Boolean).length ? (arg('q','') || '').split('||') : [
  '图译工坊是什么？',
  'PSD 批量改语言用什么工具？',
  '图译工坊 和 ImageTrans 有什么区别？',
]

const STARTERS = {
  doubao: 'https://www.doubao.com/',
  kimi: 'https://www.kimi.com/',
  deepseek: 'https://chat.deepseek.com/',
}

function buildScript(question, startUrl) {
  const q = JSON.stringify(question)
  const u = JSON.stringify(startUrl)
  return [
    'const Q = ' + q,
    'const p = await context.newPage()',
    'try {',
    '  await p.goto(' + u + ', { waitUntil: "domcontentloaded", timeout: 45000 })',
    '  await p.waitForTimeout(4000)',
    '  const ta = p.locator("textarea").first()',
    '  await ta.click({ timeout: 10000 })',
    '  await ta.fill(Q)',
    '  await p.keyboard.press("Enter")',
    '  let last = -1, stable = 0',
    '  for (let i = 0; i < 28; i++) {',
    '    await p.waitForTimeout(2000)',
    '    const len = await p.evaluate(() => document.body.innerText.length)',
    '    if (len === last) { stable++; if (stable >= 3) break } else { stable = 0; last = len }',
    '  }',
    '  const out = await p.evaluate(() => {',
    '    const txt = document.body.innerText',
    '    const links = Array.from(document.querySelectorAll(\'a[href^="http"]\')).map(a => { try { return new URL(a.href).hostname } catch { return null } }).filter(Boolean)',
    '    const ext = [...new Set(links.filter(h => !/doubao\\.com|bytedance|toutiao|pstatp|volces|snssdk|kimi\\.com|moonshot|deepseek\\.com/i.test(h)))]',
    '    return {',
    '      url: location.href,',
    '      chars: txt.length,',
    '      extHosts: ext.slice(0, 20),',
    '      refChip: (txt.match(/参考\\s*\\d+\\s*[篇条]/g) || []).slice(0, 2),',
    '      counts: { tuyigf: (txt.match(/tuyigf/g) || []).length, tu: (txt.match(/图译工坊/g) || []).length, it: (txt.match(/ImageTrans/g) || []).length },',
    '      tail: txt.slice(-1100)',
    '    }',
    '  })',
    '  return { ok: true, ...out }',
    '} finally { await p.close() }',
  ].join('\n')
}

function runOne(question, requestId) {
  const file = path.join('tmp', '_retest_' + requestId + '.js')
  fs.writeFileSync(file, buildScript(question, STARTERS[engine]), 'utf8')
  let raw
  try { raw = execFileSync(CLI, ['nodejs', '--task', TASK, '--request-id', requestId, '--timeout-ms', '170000'], {
    input: fs.readFileSync(file, 'utf8'),
    maxBuffer: 32 * 1024 * 1024, stdio: ["pipe","pipe","pipe"],
    encoding: 'utf8',
    timeout: 200000,
  }) } catch (e) { throw new Error(String(e.stdout || '').slice(-260) || String(e.message).slice(0,160)) }
  const i = raw.indexOf('{')
  const j = JSON.parse(raw.slice(i))
  if (j.status !== 'succeeded') throw new Error('tabbit:' + (j.result && j.result.error || j.status))
  return j.result.value
}

const lines = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean) : []
if (!fs.existsSync(out)) fs.writeFileSync(out, '', 'utf8')

let n = 0
for (const q of QUESTIONS) {
  n += 1
  const rid = engine + n + '-' + Date.now().toString(36)
  const stamp = new Date().toISOString()
  process.stdout.write('[' + engine + ' q' + n + '] ' + q + ' ... ')
  try {
    const v = runOne(q, rid)
    const rec = { ts: stamp, engine, question: q, counts: v.counts, refChip: v.refChip, extHosts: v.extHosts, url: v.url, chars: v.chars, tail: v.tail, mentionsUs: v.counts.tu > 0 || v.counts.tuyigf > 0, ourCited: (v.extHosts || []).some(h => /tuyigf/.test(h)) }
    fs.appendFileSync(out, JSON.stringify(rec) + '\n', 'utf8')
    process.stdout.write('OK 命中图译工坊=' + rec.counts.tu + ' 域名=' + rec.counts.tuyigf + ' 引用含我方=' + rec.ourCited + '\n')
  } catch (e) {
    const rec = { ts: stamp, engine, question: q, error: String(e.message).slice(0, 200) }
    fs.appendFileSync(out, JSON.stringify(rec) + '\n', 'utf8')
    process.stdout.write('FAIL ' + rec.error + '\n')
  }
}
console.log('写盘：' + out + '（本次共 ' + n + ' 条，累计 ' + fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).length + ' 条）')
