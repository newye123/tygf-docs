'use strict'

// 大稿关闭后“已留住”的内存能否被 purge 释放。
// 只测无文档状态；ALLCACHES 前备份纯文本剪贴板、后还原并回读校验。
// 不打开任何文档、不杀进程、不改首选项。

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { runJsx, jsxString } = require('./ps-jsx-runner.cjs')
const memoryProbe = require('../../download/local-assistant/memory-probe.cjs')

const OUT_DIR = path.join(__dirname, 'purge-large-retained')
const RESULT_PATH = path.join(OUT_DIR, 'results.json')
fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function psSnapshot(pid) {
  const script = [
    `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue`,
    'if ($p) {',
    '  "{0},{1}" -f $p.WorkingSet64, $p.PrivateMemorySize64',
    '} else { "NA,NA" }',
  ].join('; ')
  let out = 'NA,NA'
  try {
    out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
      encoding: 'utf8', windowsHide: true, timeout: 20000,
    }).trim()
  } catch {}
  const [ws, priv] = out.split(',').map((v) => Number(v))
  return {
    workingSetMB: Number.isFinite(ws) ? Math.round((ws / 1048576) * 10) / 10 : null,
    privateMB: Number.isFinite(priv) ? Math.round((priv / 1048576) * 10) / 10 : null,
    osFreeMB: Math.round((os.freemem() / 1048576) * 10) / 10,
  }
}

async function sample(pid, label, count = 5, gapMs = 400) {
  const rows = []
  for (let i = 0; i < count; i += 1) {
    rows.push(psSnapshot(pid))
    if (i < count - 1) await sleep(gapMs)
  }
  const valid = rows.filter((r) => Number.isFinite(r.workingSetMB))
  const median = (...arr) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }
  const pick = (key) => (valid.length ? median(...valid.map((r) => r[key])) : null)
  const result = {
    label, samples: rows,
    medianWorkingSetMB: pick('workingSetMB'),
    medianPrivateMB: pick('privateMB'),
    medianOsFreeMB: pick('osFreeMB'),
  }
  console.log(JSON.stringify(result))
  return result
}

function jsxPrelude(resultPath) {
  return `
var RESULT_PATH = "${jsxString(resultPath)}";
function writeResult(obj) {
  var f = new File(RESULT_PATH);
  f.encoding = "UTF-8";
  f.open("w");
  f.write(obj);
  f.close();
}
function nowMs() { return new Date().getTime(); }
function jsonEscape(v) {
  return String(v).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"').replace(/\\r/g, "").replace(/\\n/g, " ");
}
`
}

async function runStep(name, body, timeoutMs = 120000) {
  const jsxPath = path.join(OUT_DIR, `${name}.jsx`)
  const resultPath = path.join(OUT_DIR, `${name}.json`)
  const logPath = path.join(OUT_DIR, `${name}.log`)
  const jsx = `${jsxPrelude(resultPath)}
(function () {
  app.displayDialogs = DialogModes.NO;
  try {
    ${body}
  } catch (error) {
    writeResult('{"ok":false,"error":"' + jsonEscape(error && error.message ? error.message : error) + '","docs":' + app.documents.length + '}');
  }
})();
`
  fs.writeFileSync(jsxPath, `${jsx}\n`, 'utf8')
  const started = Date.now()
  const runner = await runJsx(jsxPath, logPath, timeoutMs)
  let result = null
  try { result = JSON.parse(fs.readFileSync(resultPath, 'utf8')) } catch (error) {
    result = { ok: false, error: `RESULT_UNREADABLE: ${error.message}` }
  }
  const out = { step: name, elapsedMs: Date.now() - started, runner, result }
  console.log(JSON.stringify(out))
  return out
}

function clipboardFormats() {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$d=[System.Windows.Forms.Clipboard]::GetDataObject()',
    'if ($d -eq $null) { "EMPTY" } else { ($d.GetFormats() -join ",") }',
  ].join('; ')
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
      encoding: 'utf8', windowsHide: true, timeout: 20000,
    }).trim()
  } catch { return 'UNKNOWN' }
}

function clipboardTextBase64() {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$t=[System.Windows.Forms.Clipboard]::GetText()',
    '[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($t))',
  ].join('; ')
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
      encoding: 'utf8', windowsHide: true, timeout: 20000,
    }).trim()
  } catch { return null }
}

function clipboardRestore(base64) {
  if (!base64) return false
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    `$t=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${base64}"))`,
    '[System.Windows.Forms.Clipboard]::SetText($t)',
  ].join('; ')
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
      encoding: 'utf8', windowsHide: true, timeout: 20000,
    })
    return clipboardTextBase64() === base64
  } catch { return false }
}

;(async () => {
  const before = await memoryProbe.probePhotoshopProcesses()
  const real = [...before].sort((a, b) => b.workingSetMB - a.workingSetMB)[0]
  if (!real) throw new Error('PS_NOT_RUNNING')
  const pid = real.pid
  const evidence = {
    startedAt: new Date().toISOString(),
    pid,
    steps: [],
    samples: [],
    safety: {
      docsTouched: false,
      allCachesUsed: false,
      clipboardFormats: clipboardFormats(),
      clipboardPreserved: null,
      processKilled: false,
    },
  }
  const record = async (label) => {
    const s = await sample(pid, label)
    evidence.samples.push(s)
    return s
  }
  try {
    const pre = await runStep('00-preflight', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      writeResult('{"ok":true,"docs":0,"version":"' + jsonEscape(app.version) + '"}');
    `, 60000)
    evidence.steps.push(pre)
    if (!pre.result || !pre.result.ok) throw new Error(`PREFLIGHT_FAILED: ${JSON.stringify(pre.result)}`)
    await record('0-baseline-retained')

    for (const [name, target] of [
      ['01-purge-history', 'HISTORYCACHES'],
      ['02-purge-undo', 'UNDOCACHES'],
    ]) {
      const step = await runStep(name, `
        if (app.documents.length !== 0) {
          writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
          return;
        }
        var t0 = nowMs();
        app.purge(PurgeTarget.${target});
        writeResult('{"ok":true,"docs":0,"purgeMs":' + (nowMs() - t0) + '}');
      `)
      evidence.steps.push(step)
      if (!step.result || !step.result.ok) throw new Error(`${name}_FAILED: ${JSON.stringify(step.result)}`)
      await record(`1-after-${target}`)
    }

    const formats = evidence.safety.clipboardFormats
    const textOnly = formats === 'EMPTY' || /^(System\.String|UnicodeText|Text|Locale|OEMText)(,(System\.String|UnicodeText|Text|Locale|OEMText))*$/.test(formats)
    if (!textOnly) {
      evidence.steps.push({ step: '03-purge-all', skipped: true, reason: `CLIPBOARD_NOT_TEXT_ONLY: ${formats}` })
    } else {
      const clip = clipboardTextBase64()
      const step = await runStep('03-purge-all', `
        if (app.documents.length !== 0) {
          writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
          return;
        }
        var t0 = nowMs();
        app.purge(PurgeTarget.ALLCACHES);
        writeResult('{"ok":true,"docs":0,"purgeMs":' + (nowMs() - t0) + '}');
      `)
      evidence.steps.push(step)
      evidence.safety.allCachesUsed = true
      evidence.safety.clipboardPreserved = clipboardRestore(clip)
      if (!step.result || !step.result.ok) throw new Error(`03_FAILED: ${JSON.stringify(step.result)}`)
      await record('2-after-ALLCACHES-immediate')
      await sleep(5000)
      await record('3-after-ALLCACHES-5s')
      await sleep(10000)
      await record('4-after-ALLCACHES-15s')
      await sleep(15000)
      await record('5-after-ALLCACHES-30s')
    }
    evidence.finishedAt = new Date().toISOString()
    evidence.ok = true
  } catch (error) {
    evidence.finishedAt = new Date().toISOString()
    evidence.ok = false
    evidence.error = String(error && error.message ? error.message : error)
  }
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  console.log('EVIDENCE_PATH', RESULT_PATH)
  if (!evidence.ok) process.exitCode = 1
})()
