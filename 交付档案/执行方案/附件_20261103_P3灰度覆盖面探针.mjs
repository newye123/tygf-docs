// P3 enforce 到底改不改钱：真适配器 + 真回执校验器，六枚变体两模式对照
// 跑法：node --experimental-strip-types --experimental-loader ./scripts/ts-path-loader.mjs tmp/probe-enforce-money.mjs
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const { settlementReceiptToBillingReport } = await import(
  pathToFileURL(path.join(ROOT, 'src', 'lib', 'trust-chain', 'settlement-adapter.ts')).href)

// photoshop-billing.ts:650-657 的 resultUsable 表达式（逐字搬，不加工）
function resultUsable(r) {
  return (r.deliveryStatus
    ? r.deliveryStatus === 'complete'
    : r.status === 'completed' && r.summary.unmatchedLayers === 0 && r.summary.skippedLayers === 0)
    && r.summary.exportedFiles > 0
    && r.summary.errorCount === 0
}

const H = 'c'.repeat(64)
const base = {
  schemaVersion: 1, jobId: 'job_0001', attemptId: 'att_0001',
  assistantVersion: '3.7.32', executorVersion: '3.7.32',
  executionManifestDigest: 'a'.repeat(64), reviewDecisionDigest: 'e'.repeat(64), provenanceDigest: 'b'.repeat(64),
  totalAssignmentCount: 60, completedAssignmentCount: 60,
  attemptStatus: 'SUCCEEDED', artifactDisposition: 'PUBLISHED', outputFingerprint: H,
  verificationLevel: 'REOPEN_VERIFIED', objectEvidenceDigest: 'd'.repeat(64),
  settlementStatus: 'REPORTED', issueCodes: [],
  startedAt: '2026-11-03T00:00:00.000Z', verifiedAt: '2026-11-03T00:02:00.000Z',
}
// 每枚都过 assertServerSettlementReceipt（校验器本身就拦掉一部分自相矛盾的谎报形状）
const variants = [
  ['① 真成功', { ...base }],
  ['② 只改 status（产物照发）', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, verificationLevel: 'DISK_OUTPUT_VERIFIED' }],
  ['③ 改 status＋改 NONE，留着指纹', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, artifactDisposition: 'NONE', verificationLevel: 'TEXT_READBACK_VERIFIED' }],
  ['④ 抹掉一切证据', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, artifactDisposition: 'NONE', outputFingerprint: null, verificationLevel: 'NONE', objectEvidenceDigest: '', issueCodes: ['EXECUTOR_FAILED'] }],
  ['⑤ 中途真失败（完成 20，隔离但无指纹）', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 20, artifactDisposition: 'QUARANTINED', outputFingerprint: null, verificationLevel: 'TEXT_READBACK_VERIFIED', issueCodes: ['PHOTOSHOP_TIMEOUT'] }],
  ['⑥ 诚实失败·隔离留档带指纹', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 37, artifactDisposition: 'QUARANTINED', verificationLevel: 'TEXT_READBACK_VERIFIED', issueCodes: ['PHOTOSHOP_TIMEOUT'] }],
]

async function run(mode) {
  process.env.SETTLEMENT_VERDICT_MODE = mode
  const out = []
  for (const [, r] of variants) {
    try { out.push({ usable: resultUsable(settlementReceiptToBillingReport({ ...r })), err: null }) }
    catch (e) { out.push({ usable: null, err: String(e.message).slice(0, 46) }) }
  }
  return out
}
const off = await run('off')
const enforce = await run('enforce')
delete process.env.SETTLEMENT_VERDICT_MODE

const money = (x) => (x === null ? '校验拒收' : x ? '全额扣' : '不扣（释放）')
console.log('变体'.padEnd(32), 'off'.padEnd(12), 'enforce'.padEnd(12), '差异')
variants.forEach(([label], i) => {
  const a = off[i], b = enforce[i]
  const diff = JSON.stringify(a.usable) === JSON.stringify(b.usable)
    ? '无（金额一致）'
    : (a.usable && !b.usable ? 'enforce 更松 ⇒ 要盯' : 'enforce 更严 ⇒ 拦住')
  console.log(label.padEnd(30), money(a.usable).padEnd(10), money(b.usable).padEnd(10),
    diff + (a.err || b.err ? `  [off:${a.err ?? '-'} | enf:${b.err ?? '-'}]` : ''))
})
