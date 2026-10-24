// D13 扩展测试 — 桩助手 v3（一次性，测完即删）
// v2 + 三处忠实化：
//   1. summary 按 BrowserPreparationSummary 完整契约返回（v2 缺 issues 等字段，
//      单文件卡 summary.issues.some 直接整页崩溃——桩不忠实，不是产品 bug）
//   2. /ping 返回完整 AssistantPing（photoshopAutomationStatus=ready + handshake），
//      使服务端 photoshop/status 推出 ready_to_execute（psReady）
//   3. POST /v1.5/prepare/check 返回忠实 PrepareBatchResult（requestRevision 回显 +
//      isReady:true），使批量对账链可跑通
// 请求即时落盘 tmp-stub-requests.log。
import { createServer } from 'node:http'
import { appendFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const scans = new Map() // scanId -> { mode, polls }
const rid = () => 'psn_' + randomBytes(16).toString('hex')

const fullSummary = (scanId, textLayerCount) => ({
  schemaVersion: 1,
  scanId,
  basename: 'stub.psd',
  preparedAt: new Date().toISOString(),
  staleAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  fingerprint: 'f'.repeat(64),
  textLayerCount,
  hiddenTextLayerCount: 0,
  uneditableTextLayerCount: 0,
  layerErrorCount: 0,
  issues: [],
})

const emptyLangResult = () => ({
  decisionCount: 0,
  blockingCount: 0,
  reviewCount: 0,
  suggestionCount: 0,
  writableCount: 1,
  targetedCount: 1,
  boundCount: 1,
  unmatchedTranslationCount: 0,
  items: [],
})

const server = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => {
    body += c
  })
  req.on('end', () => {
    appendFileSync(
      'tmp-stub-requests.log',
      `${new Date().toISOString()} ${req.method} ${req.url} body=${body.slice(0, 200)}\n`,
    )
    const origin = req.headers.origin || '*'
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-tygf-ticket, x-tygf-internal-token',
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      res.end()
      return
    }
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json', ...cors })
      res.end(JSON.stringify(obj))
    }
    if (req.method === 'POST' && req.url === '/config') return send(200, { ok: true })
    // 激活配对：返回忠实 ActivateAssistantResult，使执行链走完 pairing 后抵达服务端闸门
    if (req.method === 'POST' && req.url === '/pair') {
      return send(200, {
        ok: true,
        activationRequired: false,
        activationStatus: 'active',
        activationId: 'stub-activation-0001',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      })
    }
    if (req.method === 'GET' && req.url === '/ping') {
      return send(200, {
        alive: true,
        version: '3.7.15',
        assistantBuildId: 'transport-hardening-20261011-r1',
        reportSchemaVersion: 'local-report-v2',
        reportRendererVersion: 'renderer-v3',
        configured: true,
        taskRoot: 'F:/tygf-probe',
        queueLength: 0,
        activationRequired: false,
        activationStatus: 'active',
        photoshopDetected: true,
        photoshopAutomationStatus: 'ready',
        photoshopHandshake: true,
        photoshopName: 'Adobe Photoshop',
        photoshopVersion: '2025',
        photoshopLastErrorCode: null,
        replacementComponentAvailable: true,
        replacementComponentCompatible: true,
        replacementScriptVersion: 'stub',
        replacementReportSchemaVersion: 'stub',
      })
    }
    if (req.method === 'POST' && req.url === '/v1.5/preparation/scan') {
      let data = {}
      try {
        data = JSON.parse(body)
      } catch { /* ignore */ }
      const path = String(data.masterPath || '')
      if (/fail/i.test(path)) {
        return send(400, { ok: false, code: 'PREPARATION_PSD_NOT_FOUND', message: `找不到文件：${path}` })
      }
      const mode = /review/i.test(path) ? 'review' : 'ok'
      const scanId = rid()
      scans.set(scanId, { mode, polls: 0 })
      return send(200, {
        ok: true,
        state: 'hashing',
        scanId,
        hashProgress: { bytesDone: 0, bytesTotal: 3000 },
      })
    }
    if (req.method === 'GET' && req.url.startsWith('/v1.5/preparation/status/')) {
      const scanId = req.url.split('/').pop()
      const rec = scans.get(scanId) || { mode: 'ok', polls: 0 }
      rec.polls += 1
      scans.set(scanId, rec)
      if (rec.mode === 'review') {
        if (rec.polls === 1) {
          return send(200, { ok: true, state: 'hashing', scanId, hashProgress: { bytesDone: 1500, bytesTotal: 3000 } })
        }
        return send(200, { ok: true, state: 'needs_review', scanId, summary: fullSummary(scanId, 3) })
      }
      if (rec.polls <= 2) {
        return send(200, { ok: true, state: 'hashing', scanId, hashProgress: { bytesDone: rec.polls * 1000, bytesTotal: 3000 } })
      }
      return send(200, { ok: true, state: 'prepared', scanId, summary: fullSummary(scanId, 5) })
    }
    if (req.method === 'POST' && req.url === '/v1.5/prepare/check') {
      let data = {}
      try {
        data = JSON.parse(body)
      } catch { /* ignore */ }
      const requestRevision = String(data.requestRevision || '')
      const targets = (data.targetsByLanguage && typeof data.targetsByLanguage === 'object') ? data.targetsByLanguage : {}
      const languageResults = {}
      for (const lang of Object.keys(targets)) languageResults[lang] = emptyLangResult()
      return send(200, {
        ok: true,
        requestRevision,
        scanId: String(data.scanId || ''),
        documentFingerprint: 'f'.repeat(64),
        bindingPlanDigest: 'd'.repeat(64),
        checkedAt: new Date().toISOString(),
        structuralIssues: [],
        languageResults,
        summary: {
          blockingGroups: [],
          decisionCount: 0,
          allChecksCurrent: true,
          failedLanguages: [],
          staleLanguages: [],
          isReady: true,
        },
      })
    }
    if (req.method === 'POST' && req.url.startsWith('/v1.5/preparation/cancel/')) {
      return send(200, { ok: true, state: 'cancelled', scanId: req.url.split('/').pop() })
    }
    return send(404, { ok: false, code: 'STUB_UNKNOWN', message: `stub: unknown ${req.method} ${req.url}` })
  })
})

server.listen(49153, '127.0.0.1', () => {
  console.log('STUB-3-LISTENING 127.0.0.1:49153')
})
