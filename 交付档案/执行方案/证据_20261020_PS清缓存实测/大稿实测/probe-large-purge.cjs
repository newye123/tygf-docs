'use strict'

// 大稿专用：验证 app.purge 在 GB 级 PSD/PSB 上是否真的释放内存。
// 安全边界：
//  - 只打开命令行传入的那一份大稿，绝不保存，关闭一律 DONOTSAVECHANGES；
//  - 开跑前 Photoshop 必须 0 文档；中途发现非本测试文档立即中止；
//  - ALLCACHES 只在剪贴板“纯文本”时测试，先备份后还原；否则跳过并记录；
//  - 不杀进程、不重启 Photoshop、不改首选项。
//
// 用法：
//   node probe-large-purge.cjs "<大稿绝对路径>" <标签>

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { runJsx, jsxString } = require('./ps-jsx-runner.cjs')
const memoryProbe = require('../../download/local-assistant/memory-probe.cjs')

const TEST_FILE = process.argv[2]
const LABEL = process.argv[3] || 'large'
if (!TEST_FILE || !fs.existsSync(TEST_FILE)) {
  console.error('USAGE: node probe-large-purge.cjs "<existing .psd/.psb>" <label>')
  process.exit(2)
}
const TEST_NAME = path.basename(TEST_FILE)
const TEST_BYTES = fs.statSync(TEST_FILE).size
const OUT_DIR = path.join(__dirname, `purge-large-${LABEL}`)
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
      encoding: 'utf8',
      windowsHide: true,
      timeout: 20000,
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
    label,
    samples: rows,
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
  const out = {
    step: name,
    elapsedMs: Date.now() - started,
    runner,
    result,
  }
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
  } catch {
    return 'UNKNOWN'
  }
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
  } catch {
    return null
  }
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
  } catch {
    return false
  }
}

;(async () => {
  const before = await memoryProbe.probePhotoshopProcesses()
  console.log('photoshopProcesses', JSON.stringify(before))
  const real = [...before].sort((a, b) => b.workingSetMB - a.workingSetMB)[0]
  if (!real) throw new Error('PS_NOT_RUNNING')
  const pid = real.pid
  const startFreeMB = Math.round(os.freemem() / 1048576)
  console.log('targetPid', pid, 'startWorkingSetMB', real.workingSetMB, 'osFreeMB', startFreeMB)
  if (startFreeMB < 4096) {
    console.error(`INSUFFICIENT_HEADROOM: osFreeMB=${startFreeMB}`)
    process.exit(3)
  }

  const evidence = {
    startedAt: new Date().toISOString(),
    pid,
    label: LABEL,
    testFileBytes: TEST_BYTES,
    testFileSizeGB: Math.round((TEST_BYTES / 1073741824) * 100) / 100,
    testFileName: TEST_NAME,
    steps: [],
    samples: [],
    safety: {
      saved: false,
      allCachesUsed: false,
      clipboardCacheUsed: false,
      clipboardFormats: clipboardFormats(),
      clipboardPreserved: null,
      userDocsTouched: false,
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
      writeResult('{"ok":true,"docs":0,"version":"' + jsonEscape(app.version) + '","osFreeBytes":"' + ${Math.round(os.freemem())} + '"}');
    `, 60000)
    evidence.steps.push(pre)
    if (!pre.result || !pre.result.ok) throw new Error(`PREFLIGHT_FAILED: ${JSON.stringify(pre.result)}`)
    await record('0-baseline-no-docs')

    // 打开大稿。GB 级文件可能耗时数分钟，给 30 分钟。
    const openStep = await runStep('01-open-large', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var t0 = nowMs();
      var doc = app.open(new File("${jsxString(TEST_FILE)}"));
      var openMs = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"name":"' + jsonEscape(doc.name) + '","width":' + doc.width.as("px") + ',"height":' + doc.height.as("px") + ',"resolution":' + doc.resolution + ',"bits":"' + jsonEscape(doc.bitsPerChannel) + '","topLayers":' + doc.layers.length + ',"historyStates":' + doc.historyStates.length + ',"openMs":' + openMs + '}');
    `, 1800000)
    evidence.steps.push(openStep)
    if (!openStep.result || !openStep.result.ok) throw new Error(`OPEN_FAILED: ${JSON.stringify(openStep.result)}`)
    await sleep(8000)
    await record('1-after-open')

    // 在一个新的透明层上，对左上角一块区域连续填色，制造真实像素历史。
    // 区域按位数控制在每状态约 24–96 MB，避免把机器打到换页。
    const editStep = await runStep('02-create-pixel-history', `
      if (app.documents.length !== 1) {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
        return;
      }
      var doc = app.activeDocument;
      var historyBefore = doc.historyStates.length;
      var w = Math.min(2000, doc.width.as("px"));
      var h = Math.min(2000, doc.height.as("px"));
      var layer = doc.artLayers.add();
      layer.name = "PURGE_TEST_LAYER_DO_NOT_SAVE";
      doc.activeLayer = layer;
      var colors = [[255,0,0],[0,255,0],[0,0,255],[255,255,0],[0,255,255]];
      var fills = 0;
      for (var i = 0; i < colors.length; i += 1) {
        var sel = doc.selection;
        sel.select([[0,0],[w,0],[w,h],[0,h]]);
        var c = new SolidColor();
        c.rgb.red = colors[i][0]; c.rgb.green = colors[i][1]; c.rgb.blue = colors[i][2];
        sel.fill(c, ColorBlendMode.NORMAL, 100, false);
        sel.deselect();
        fills += 1;
      }
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"regionW":' + w + ',"regionH":' + h + ',"fills":' + fills + ',"historyBefore":' + historyBefore + ',"historyAfter":' + doc.historyStates.length + '}');
    `, 600000)
    evidence.steps.push(editStep)
    if (!editStep.result || !editStep.result.ok) throw new Error(`EDIT_FAILED: ${JSON.stringify(editStep.result)}`)
    await sleep(3000)
    await record('2-after-pixel-history')

    const p1 = await runStep('03-purge-history-doc-open', `
      if (app.documents.length !== 1) {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
        return;
      }
      var doc = app.activeDocument;
      var before = doc.historyStates.length;
      var t0 = nowMs();
      app.purge(PurgeTarget.HISTORYCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + ',"historyBefore":' + before + ',"historyAfter":' + doc.historyStates.length + '}');
    `, 300000)
    evidence.steps.push(p1)
    if (!p1.result || !p1.result.ok) throw new Error(`PURGE_HISTORY_FAILED: ${JSON.stringify(p1.result)}`)
    await record('3-after-history-purge-immediate')
    await sleep(30000)
    await record('4-after-history-purge-30s')

    // ALLCACHES：只在纯文本剪贴板时执行，先备份、后还原并回读校验。
    const formats = evidence.safety.clipboardFormats
    const textOnly = formats === 'EMPTY' || /^(System\.String|UnicodeText|Text|Locale|OEMText)(,(System\.String|UnicodeText|Text|Locale|OEMText))*$/.test(formats)
    if (!textOnly) {
      evidence.steps.push({ step: '05-purge-all-caches', skipped: true, reason: `CLIPBOARD_NOT_TEXT_ONLY: ${formats}` })
    } else {
      const clip = clipboardTextBase64()
      const p2 = await runStep('05-purge-all-caches', `
        if (app.documents.length !== 1) {
          writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
          return;
        }
        var doc = app.activeDocument;
        var before = doc.historyStates.length;
        var t0 = nowMs();
        app.purge(PurgeTarget.ALLCACHES);
        var ms = nowMs() - t0;
        writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + ',"historyBefore":' + before + ',"historyAfter":' + doc.historyStates.length + '}');
      `, 300000)
      evidence.steps.push(p2)
      evidence.safety.allCachesUsed = true
      const restored = clipboardRestore(clip)
      evidence.safety.clipboardPreserved = restored
      if (!p2.result || !p2.result.ok) throw new Error(`PURGE_ALL_FAILED: ${JSON.stringify(p2.result)}`)
      await record('5-after-all-purge-immediate')
      await sleep(30000)
      await record('6-after-all-purge-30s')
    }

    const closeStep = await runStep('06-close-large', `
      if (app.documents.length === 0) {
        writeResult('{"ok":true,"docs":0,"alreadyClosed":true}');
        return;
      }
      if (app.documents.length !== 1 || app.activeDocument.name !== ${JSON.stringify(TEST_NAME)}) {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + ',"active":"' + jsonEscape(app.activeDocument.name) + '"}');
        return;
      }
      app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"closed":"' + jsonEscape(${JSON.stringify(TEST_NAME)}) + '"}');
    `, 600000)
    evidence.steps.push(closeStep)
    if (!closeStep.result || !closeStep.result.ok || closeStep.result.docs !== 0) {
      throw new Error(`CLOSE_FAILED: ${JSON.stringify(closeStep.result)}`)
    }
    await sleep(8000)
    await record('7-after-close')
    await sleep(30000)
    await record('8-after-close-30s')

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
        writeResult('{"ok":true,"docs":' + app.documents.length + ',"active":"' + (app.documents.length ? jsonEscape(app.activeDocument.name) : "") + '"}');
      `, 600000)
      evidence.steps.push(cleanup)
    } catch {}
  }

  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  console.log('EVIDENCE_PATH', RESULT_PATH)
  if (!evidence.ok) {
    console.error('LARGE_PURGE_PROBE_FAILED', evidence.error)
    process.exitCode = 1
  }
})()
