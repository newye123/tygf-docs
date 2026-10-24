'use strict'

// 大稿循环：连续 open/close 同一份 GB 级 PSB，观察 PS 私有内存是复用还是累加。
// 不保存、不改首选项、不杀进程。每次 open 前检查系统可用内存，低于 4 GB 即停止。

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { runJsx, jsxString } = require('./ps-jsx-runner.cjs')
const memoryProbe = require('../../download/local-assistant/memory-probe.cjs')

const TEST_FILE = process.argv[2]
const LABEL = process.argv[3] || 'cycle'
const CYCLES = Number(process.argv[4] || 2)
if (!TEST_FILE || !fs.existsSync(TEST_FILE)) {
  console.error('USAGE: node probe-large-cycle.cjs "<existing .psd/.psb>" <label> [cycles]')
  process.exit(2)
}
const TEST_NAME = path.basename(TEST_FILE)
const OUT_DIR = path.join(__dirname, `purge-large-cycle-${LABEL}`)
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

async function runStep(name, body, timeoutMs = 1800000) {
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
  console.log(JSON.stringify({ step: name, phase: 'begin', at: new Date().toISOString() }))
  const runner = await runJsx(jsxPath, logPath, timeoutMs)
  let result = null
  try { result = JSON.parse(fs.readFileSync(resultPath, 'utf8')) } catch (error) {
    result = { ok: false, error: `RESULT_UNREADABLE: ${error.message}` }
  }
  const out = { step: name, elapsedMs: Date.now() - started, runner, result }
  console.log(JSON.stringify(out))
  return out
}

;(async () => {
  const before = await memoryProbe.probePhotoshopProcesses()
  const real = [...before].sort((a, b) => b.workingSetMB - a.workingSetMB)[0]
  if (!real) throw new Error('PS_NOT_RUNNING')
  const pid = real.pid
  const evidence = {
    startedAt: new Date().toISOString(),
    pid,
    label: LABEL,
    testFileBytes: fs.statSync(TEST_FILE).size,
    testFileName: TEST_NAME,
    requestedCycles: CYCLES,
    cycles: [],
    samples: [],
    safety: { saved: false, processKilled: false, userDocsTouched: false },
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
    evidence.steps = [pre]
    if (!pre.result || !pre.result.ok) throw new Error(`PREFLIGHT_FAILED: ${JSON.stringify(pre.result)}`)
    await record('baseline')

    for (let c = 1; c <= CYCLES; c += 1) {
      const freeBefore = Math.round(os.freemem() / 1048576)
      if (freeBefore < 4096) {
        evidence.cycles.push({ cycle: c, skipped: true, reason: `LOW_HEADROOM: osFreeMB=${freeBefore}` })
        break
      }
      const openStep = await runStep(`cycle-${c}-open`, `
        if (app.documents.length !== 0) {
          writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
          return;
        }
        var t0 = nowMs();
        var doc = app.open(new File("${jsxString(TEST_FILE)}"));
        writeResult('{"ok":true,"docs":' + app.documents.length + ',"name":"' + jsonEscape(doc.name) + '","width":' + doc.width.as("px") + ',"height":' + doc.height.as("px") + ',"resolution":' + doc.resolution + ',"bits":"' + jsonEscape(doc.bitsPerChannel) + '","topLayers":' + doc.layers.length + ',"openMs":' + (nowMs() - t0) + '}');
      `, 1800000)
      evidence.steps.push(openStep)
      if (!openStep.result || !openStep.result.ok) throw new Error(`OPEN_FAILED: ${JSON.stringify(openStep.result)}`)
      await sleep(8000)
      const afterOpen = await record(`cycle-${c}-after-open`)

      const closeStep = await runStep(`cycle-${c}-close`, `
        if (app.documents.length === 0) {
          writeResult('{"ok":true,"docs":0,"alreadyClosed":true}');
          return;
        }
        if (app.documents.length !== 1 || app.activeDocument.name !== ${JSON.stringify(TEST_NAME)}) {
          writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + ',"active":"' + jsonEscape(app.activeDocument.name) + '"}');
          return;
        }
        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        writeResult('{"ok":true,"docs":' + app.documents.length + '}');
      `, 600000)
      evidence.steps.push(closeStep)
      if (!closeStep.result || !closeStep.result.ok || closeStep.result.docs !== 0) {
        throw new Error(`CLOSE_FAILED: ${JSON.stringify(closeStep.result)}`)
      }
      await sleep(8000)
      const afterClose = await record(`cycle-${c}-after-close`)
      evidence.cycles.push({
        cycle: c,
        openMs: openStep.result.openMs,
        docWidth: openStep.result.width,
        docHeight: openStep.result.height,
        docLayers: openStep.result.topLayers,
        afterOpen,
        afterClose,
        privateDeltaFromOpenToCloseMB: (afterClose.medianPrivateMB != null && afterOpen.medianPrivateMB != null)
          ? Math.round((afterClose.medianPrivateMB - afterOpen.medianPrivateMB) * 10) / 10
          : null,
      })
    }
    evidence.finishedAt = new Date().toISOString()
    evidence.ok = true
  } catch (error) {
    evidence.finishedAt = new Date().toISOString()
    evidence.ok = false
    evidence.error = String(error && error.message ? error.message : error)
    try {
      const cleanup = await runStep('99-cleanup', `
        if (app.documents.length === 1 && app.activeDocument.name === ${JSON.stringify(TEST_NAME)}) {
          app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        }
        writeResult('{"ok":true,"docs":' + app.documents.length + '}');
      `, 600000)
      evidence.steps.push(cleanup)
    } catch {}
  }
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  console.log('EVIDENCE_PATH', RESULT_PATH)
  if (!evidence.ok) process.exitCode = 1
})()
