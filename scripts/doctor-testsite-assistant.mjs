#!/usr/bin/env node
/**
 * scripts/doctor-testsite-assistant.mjs
 *
 * 作用：针对「工作台点了没反应 / 文件夹读不出 / 授权超时」的一键只读联调诊断器。
 * 覆盖 4 层物理现场（不凭空猜 UI）：
 *   1. 本机助手 127.0.0.1:49152/ping 在线状态、版本、buildId
 *   2. 助手日志（E:\软件\图译工坊本地助手\logs\assistant-events.log）最近 200 行的真卡点计数：
 *      - VERIFY_TIMEOUT（服务端验票 >10s 超时）
 *      - verify slow hop（单跳延迟 >3s）
 *      - callback=http://localhost:3000（回调地址错配 403）
 *      - ASSISTANT_INSTALL_BINDING_MISMATCH（账号/浏览器 installId 与助手绑定漂移）
 *   3. 本机端口转发（3000）与测试站 /api/runtime-provenance 版本对齐度
 *
 * 退出码三档（遵循探针三档纪律）：
 *   0 = 全链路健康（PASS）
 *   1 = 检出真实卡点（WARN/BLOCK，点名具体层与修法）
 *   2 = 探针自身运行异常
 */

import fs from 'node:fs'

const ASSISTANT_BASE = process.env.TYGF_ASSISTANT_URL || 'http://127.0.0.1:49152'
const ASSISTANT_LOG = process.env.TYGF_ASSISTANT_LOG || 'E:\\软件\\图译工坊本地助手\\logs\\assistant-events.log'
const PROVENANCE_URLS = [
  'http://127.0.0.1:3000/api/runtime-provenance',
  'https://test.tuyigf.com/api/runtime-provenance',
]

async function fetchJsonWithTimeout(url, timeoutMs = 4000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    const text = await res.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data, rawPreview: text.slice(0, 160) }
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

function analyzeAssistantLog(logPath, tailLines = 250) {
  if (!fs.existsSync(logPath)) {
    return { exists: false, logPath }
  }
  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  const recent = lines.slice(-tailLines)

  let verifyTimeouts = 0
  let slowHops = 0
  let maxSlowHopMs = 0
  let localhostCallback403 = 0
  let bindingMismatch = 0
  let lastTimestamp = ''

  for (const line of recent) {
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)
    if (tsMatch) lastTimestamp = tsMatch[1]
    if (line.includes('reason=VERIFY_TIMEOUT') || line.includes('code=VERIFY_TIMEOUT')) {
      verifyTimeouts++
    }
    if (line.includes('[ticket] verify slow hop')) {
      slowHops++
      const msMatch = line.match(/elapsedMs=(\d+)/)
      if (msMatch) {
        const ms = Number(msMatch[1])
        if (ms > maxSlowHopMs) maxSlowHopMs = ms
      }
    }
    if (line.includes('callback=http://localhost:3000') && line.includes('403')) {
      localhostCallback403++
    }
    if (line.includes('ASSISTANT_INSTALL_BINDING_MISMATCH')) {
      bindingMismatch++
    }
  }

  return {
    exists: true,
    logPath,
    scannedLines: recent.length,
    lastTimestamp,
    verifyTimeouts,
    slowHops,
    maxSlowHopMs,
    localhostCallback403,
    bindingMismatch,
  }
}

async function main() {
  const findings = []
  console.log('=== 图译工坊 · 测试站与本地助手联调诊断器 (doctor-testsite-assistant) ===')

  // 1. 探测本地助手 /ping
  const ping = await fetchJsonWithTimeout(`${ASSISTANT_BASE}/ping`, 3000)
  if (!ping.ok || !ping.data) {
    console.log(`[BLOCK] 1. 本地助手 (${ASSISTANT_BASE}/ping): 不可达 (${ping.error || `HTTP ${ping.status}`})`)
    findings.push('本地助手未启动或 49152 端口不通')
  } else {
    const d = ping.data
    console.log(`[OK]    1. 本地助手在线: version=${d.version || 'unknown'} buildId=${d.buildId || 'unknown'} psRunning=${Boolean(d.psRunning)}`)
  }

  // 2. 探测测试站 runtime-provenance
  let provResult = null
  for (const url of PROVENANCE_URLS) {
    const r = await fetchJsonWithTimeout(url, 4000)
    if (r.ok && r.data?.provenance) {
      provResult = { url, ...r.data.provenance }
      break
    }
  }
  if (!provResult) {
    console.log('[WARN]  2. 测试站 runtime-provenance: 本机 3000 隧道未开，且公网受访问门拦截（需 ?key= 令牌）')
  } else {
    console.log(`[OK]    2. 测试站连接正常 (${provResult.url}): status=${provResult.status} commit=${String(provResult.webCommitSha || '').slice(0, 8)} expectedAssistant=${provResult.expectedAssistantVersion}/${provResult.expectedAssistantBuildId}`)
    if (ping.ok && ping.data?.version && provResult.expectedAssistantVersion && ping.data.version !== provResult.expectedAssistantVersion) {
      console.log(`[WARN]     -> 版本漂移: 本机助手=${ping.data.version} vs 测试站期望=${provResult.expectedAssistantVersion}`)
      findings.push(`助手版本与测试站期望不一致 (${ping.data.version} != ${provResult.expectedAssistantVersion})`)
    }
  }

  // 3. 诊断助手日志真卡点
  const logStats = analyzeAssistantLog(ASSISTANT_LOG)
  if (!logStats.exists) {
    console.log(`[WARN]  3. 助手日志未找到: ${ASSISTANT_LOG}`)
  } else {
    console.log(`[INFO]  3. 助手日志尾部扫描 (${logStats.scannedLines} 行, 最新=${logStats.lastTimestamp || 'n/a'}):`)
    if (logStats.verifyTimeouts > 0 || logStats.slowHops > 0) {
      console.log(`[BLOCK]    -> 验票超时/慢跳: VERIFY_TIMEOUT=${logStats.verifyTimeouts} 次, slow_hop=${logStats.slowHops} 次 (最大耗时=${logStats.maxSlowHopMs}ms, 助手单跳阈值=10000ms)`)
      findings.push(`助手向服务端验票发生超时 (VERIFY_TIMEOUT=${logStats.verifyTimeouts}, maxSlowHop=${logStats.maxSlowHopMs}ms)，会导致读文件夹/扫描/替换全部 403`)
    } else {
      console.log('[OK]       -> 验票耗时正常 (0 次 VERIFY_TIMEOUT)')
    }

    if (logStats.localhostCallback403 > 0) {
      console.log(`[BLOCK]    -> 回调地址错配: 检出 ${logStats.localhostCallback403} 条 callback=http://localhost:3000 返回 HTTP_403（测试站应回调 test.tuyigf.com）`)
      findings.push(`助手回执/授权回调地址指向了 http://localhost:3000 (${logStats.localhostCallback403} 次 403)`)
    } else {
      console.log('[OK]       -> 回调地址无 localhost:3000 403 记录')
    }

    if (logStats.bindingMismatch > 0) {
      console.log(`[WARN]     -> 设备绑定漂移: 检出 ${logStats.bindingMismatch} 次 ASSISTANT_INSTALL_BINDING_MISMATCH（当前浏览器登录账号的 installId 与本机助手已绑定账号不一致）`)
      findings.push('浏览器当前账号 installId 与本机助手绑定不一致 (ASSISTANT_INSTALL_BINDING_MISMATCH)')
    }
  }

  console.log('-------------------------------------------------------------------------')
  if (findings.length > 0) {
    console.log(`诊断结论: CONCERNS/BLOCK（共发现 ${findings.length} 处底层卡点，请勿在纯 UI 层打转）`)
    for (let i = 0; i < findings.length; i++) {
      console.log(`  [${i + 1}] ${findings[i]}`)
    }
    process.exit(1)
  } else {
    console.log('诊断结论: CLEAN（本地助手与测试站授权链路未见异常）')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(`[doctor-error] ${err instanceof Error ? err.message : String(err)}`)
  process.exit(2)
})
