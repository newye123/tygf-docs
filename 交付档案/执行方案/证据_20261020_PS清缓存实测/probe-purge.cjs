'use strict'

// 测试专用：验证 app.purge 对 Photoshop 工作集/私有内存的真实效果。
// 安全边界：
//  - 只操作本测试脚本打开的 ag_out.psd 副本，关闭时 DONOTSAVECHANGES；
//  - 任何一步发现 Photoshop 里有非本测试文档，立即中止，不清任何缓存；
//  - 不调用 PurgeTarget.ALLCACHES / CLIPBOARDCACHE（会清用户剪贴板）；
//  - 不杀进程、不重启 Photoshop。

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { runJsx, jsxString } = require('./ps-jsx-runner.cjs')
const memoryProbe = require('../../download/local-assistant/memory-probe.cjs')

const TEST_PSD = 'F:/工具开发/图译工坊内测版/tmp/agtest/ag_out.psd'
const TEST_PSD_NAME = 'ag_out.psd'
const OUT_DIR = path.join(__dirname, 'purge-probe')
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
      timeout: 15000,
    }).trim()
  } catch {}
  const [ws, priv] = out.split(',').map((v) => Number(v))
  return {
    workingSetMB: Number.isFinite(ws) ? Math.round((ws / 1048576) * 10) / 10 : null,
    privateMB: Number.isFinite(priv) ? Math.round((priv / 1048576) * 10) / 10 : null,
  }
}

async function sample(pid, label, count = 5, gapMs = 400) {
  const rows = []
  for (let i = 0; i < count; i += 1) {
    rows.push(psSnapshot(pid))
    if (i < count - 1) await sleep(gapMs)
  }
  const valid = rows.filter((r) => Number.isFinite(r.workingSetMB))
  const pick = (key, fn) => (valid.length ? fn(...valid.map((r) => r[key])) : null)
  const median = (...arr) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }
  const result = {
    label,
    samples: rows,
    medianWorkingSetMB: pick('workingSetMB', median),
    medianPrivateMB: pick('privateMB', median),
    minWorkingSetMB: pick('workingSetMB', Math.min),
    minPrivateMB: pick('privateMB', Math.min),
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

async function runStep(name, body, timeoutMs = 180000) {
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
  const out = {
    step: name,
    elapsedMs: Date.now() - started,
    runner,
    result,
  }
  console.log(JSON.stringify(out))
  return out
}

function assertNoForeignDocs(stepResult) {
  const docs = stepResult && stepResult.result ? stepResult.result.docs : null
  if (docs !== 0) {
    throw new Error(`ABORT_FOREIGN_DOCS: docs=${docs} at ${stepResult.step}`)
  }
}

;(async () => {
  const before = await memoryProbe.probePhotoshopProcesses()
  console.log('photoshopProcesses', JSON.stringify(before))
  const real = [...before].sort((a, b) => b.workingSetMB - a.workingSetMB)[0]
  if (!real) throw new Error('PS_NOT_RUNNING')
  const pid = real.pid
  console.log('targetPid', pid, 'startWorkingSetMB', real.workingSetMB)

  const evidence = {
    startedAt: new Date().toISOString(),
    pid,
    testPsd: TEST_PSD,
    steps: [],
    samples: [],
    safety: {
      allCachesUsed: false,
      clipboardCacheUsed: false,
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
    // 0. 先确认没有用户文档，再测“无文档时 purge 是不是空操作”。
    const pre = await runStep('00-preflight', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      writeResult('{"ok":true,"docs":0,"version":"' + jsonEscape(app.version) + '"}');
    `, 60000)
    evidence.steps.push(pre)
    assertNoForeignDocs(pre)
    await record('0-baseline-no-docs')

    // 1. 无文档时清历史缓存，看工作集是否下降。
    const p1 = await runStep('01-purge-history-no-docs', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var t0 = nowMs();
      app.purge(PurgeTarget.HISTORYCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + '}');
    `)
    evidence.steps.push(p1)
    assertNoForeignDocs(p1)
    await record('1-after-history-purge-no-docs')

    // 2. 无文档时清撤销缓存。
    const p2 = await runStep('02-purge-undo-no-docs', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var t0 = nowMs();
      app.purge(PurgeTarget.UNDOCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + '}');
    `)
    evidence.steps.push(p2)
    assertNoForeignDocs(p2)
    await record('2-after-undo-purge-no-docs')

    // 3. 打开测试稿，建立与真实执行相近的历史状态（改 30 个文字层）。
    const openStep = await runStep('03-open-test-psd', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var doc = app.open(new File("${jsxString(TEST_PSD)}"));
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"name":"' + jsonEscape(doc.name) + '","width":' + doc.width.as("px") + ',"height":' + doc.height.as("px") + ',"topLayers":' + doc.layers.length + '}');
    `, 180000)
    evidence.steps.push(openStep)
    if (!openStep.result || !openStep.result.ok) throw new Error(`OPEN_FAILED: ${JSON.stringify(openStep.result)}`)
    await record('3-after-open')

    const editStep = await runStep('04-create-history', `
      if (app.documents.length !== 1 || app.activeDocument.name !== "${TEST_PSD_NAME}") {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
        return;
      }
      var doc = app.activeDocument;
      var changed = 0;
      function walk(layers) {
        for (var i = 0; i < layers.length; i += 1) {
          var layer = layers[i];
          if (layer.typename === "LayerSet") {
            walk(layer.layers);
          } else if (layer.kind === LayerKind.TEXT && changed < 30) {
            try {
              layer.textItem.contents = "PURGE-TEST-" + (changed + 1);
              changed += 1;
            } catch (e) {}
          }
        }
      }
      walk(doc.layers);
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"changed":' + changed + ',"historyStates":' + doc.historyStates.length + '}');
    `, 180000)
    evidence.steps.push(editStep)
    if (!editStep.result || !editStep.result.ok) throw new Error(`EDIT_FAILED: ${JSON.stringify(editStep.result)}`)
    await record('4-after-30-edits')

    // 4. 文档打开时清历史缓存（只清本测试稿的）。
    const p3 = await runStep('05-purge-history-doc-open', `
      if (app.documents.length !== 1 || app.activeDocument.name !== "${TEST_PSD_NAME}") {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
        return;
      }
      var doc = app.activeDocument;
      var before = doc.historyStates.length;
      var t0 = nowMs();
      app.purge(PurgeTarget.HISTORYCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + ',"historyBefore":' + before + ',"historyAfter":' + doc.historyStates.length + '}');
    `)
    evidence.steps.push(p3)
    if (!p3.result || !p3.result.ok) throw new Error(`PURGE_OPEN_FAILED: ${JSON.stringify(p3.result)}`)
    await record('5-after-history-purge-doc-open')

    // 5. 关闭测试稿（不保存），再测无文档时清历史缓存。
    const closeStep = await runStep('06-close-test-psd', `
      if (app.documents.length === 0) {
        writeResult('{"ok":true,"docs":0,"alreadyClosed":true}');
        return;
      }
      if (app.documents.length !== 1 || app.activeDocument.name !== "${TEST_PSD_NAME}") {
        writeResult('{"ok":false,"error":"UNEXPECTED_DOC_SET","docs":' + app.documents.length + '}');
        return;
      }
      app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"closed":"${TEST_PSD_NAME}"}');
    `, 120000)
    evidence.steps.push(closeStep)
    assertNoForeignDocs(closeStep)
    await record('6-after-close')

    const p4 = await runStep('07-purge-history-after-close', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var t0 = nowMs();
      app.purge(PurgeTarget.HISTORYCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + '}');
    `)
    evidence.steps.push(p4)
    assertNoForeignDocs(p4)
    await record('7-after-history-purge-after-close')

    const p5 = await runStep('08-purge-undo-after-close', `
      if (app.documents.length !== 0) {
        writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
        return;
      }
      var t0 = nowMs();
      app.purge(PurgeTarget.UNDOCACHES);
      var ms = nowMs() - t0;
      writeResult('{"ok":true,"docs":' + app.documents.length + ',"purgeMs":' + ms + '}');
    `)
    evidence.steps.push(p5)
    assertNoForeignDocs(p5)
    await record('8-after-undo-purge-after-close')

    evidence.finishedAt = new Date().toISOString()
    evidence.ok = true
  } catch (error) {
    evidence.finishedAt = new Date().toISOString()
    evidence.ok = false
    evidence.error = String(error && error.message ? error.message : error)
    // 收尾：只关本测试稿，绝不关闭别人的文档。
    try {
      const cleanup = await runStep('99-cleanup', `
        if (app.documents.length === 1 && app.activeDocument.name === "${TEST_PSD_NAME}") {
          app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        }
        writeResult('{"ok":true,"docs":' + app.documents.length + '}');
      `, 60000)
      evidence.steps.push(cleanup)
    } catch {}
  }

  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  console.log('EVIDENCE_PATH', RESULT_PATH)
  if (!evidence.ok) {
    console.error('PURGE_PROBE_FAILED', evidence.error)
    process.exitCode = 1
  }
})()
