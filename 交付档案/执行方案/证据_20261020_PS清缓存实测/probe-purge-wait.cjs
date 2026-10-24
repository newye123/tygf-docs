'use strict'

// 测试专用：无文档时 purge 后延长观察 30 秒，排除“内存延迟释放”。
// 不打开任何文档、不清剪贴板、不杀进程。

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { runJsx, jsxString } = require('./ps-jsx-runner.cjs')
const memoryProbe = require('../../download/local-assistant/memory-probe.cjs')

const OUT_DIR = path.join(__dirname, 'purge-wait')
fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function snapshot(pid) {
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
    at: new Date().toISOString(),
    workingSetMB: Number.isFinite(ws) ? Math.round((ws / 1048576) * 10) / 10 : null,
    privateMB: Number.isFinite(priv) ? Math.round((priv / 1048576) * 10) / 10 : null,
  }
}

async function runPurge(name, target) {
  const jsxPath = path.join(OUT_DIR, `${name}.jsx`)
  const resultPath = path.join(OUT_DIR, `${name}.json`)
  const logPath = path.join(OUT_DIR, `${name}.log`)
  const jsx = `
var RESULT_PATH = "${jsxString(resultPath)}";
function writeResult(v) {
  var f = new File(RESULT_PATH);
  f.encoding = "UTF-8";
  f.open("w");
  f.write(v);
  f.close();
}
(function () {
  app.displayDialogs = DialogModes.NO;
  if (app.documents.length !== 0) {
    writeResult('{"ok":false,"error":"USER_DOCS_OPEN","docs":' + app.documents.length + '}');
    return;
  }
  var t0 = new Date().getTime();
  app.purge(${target});
  var ms = new Date().getTime() - t0;
  writeResult('{"ok":true,"docs":0,"purgeMs":' + ms + '}');
})();
`
  fs.writeFileSync(jsxPath, `${jsx}\n`, 'utf8')
  const runner = await runJsx(jsxPath, logPath, 60000)
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  console.log(name, JSON.stringify({ runner, result }))
  return result
}

;(async () => {
  const procs = await memoryProbe.probePhotoshopProcesses()
  const real = [...procs].sort((a, b) => b.workingSetMB - a.workingSetMB)[0]
  if (!real) throw new Error('PS_NOT_RUNNING')
  const pid = real.pid
  const evidence = { startedAt: new Date().toISOString(), pid, samples: [], purges: [] }

  const take = async (label, waitMs) => {
    if (waitMs) await sleep(waitMs)
    const s = snapshot(pid)
    s.label = label
    evidence.samples.push(s)
    console.log(JSON.stringify(s))
    return s
  }

  await take('baseline', 0)
  const h = await runPurge('purge-history', 'PurgeTarget.HISTORYCACHES')
  evidence.purges.push({ target: 'HISTORYCACHES', result: h })
  await take('history+0s', 0)
  await take('history+5s', 5000)
  await take('history+15s', 10000)
  await take('history+30s', 15000)

  const u = await runPurge('purge-undo', 'PurgeTarget.UNDOCACHES')
  evidence.purges.push({ target: 'UNDOCACHES', result: u })
  await take('undo+0s', 0)
  await take('undo+5s', 5000)

  evidence.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
})().catch((error) => {
  console.error('FAILED', error && error.stack ? error.stack : error)
  process.exitCode = 1
})
