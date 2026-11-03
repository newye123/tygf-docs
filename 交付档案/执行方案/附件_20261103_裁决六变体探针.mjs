// P3 结算裁决 · 六枚变体探针（含"诚实失败"是否被错扣）
// 跑法：node --experimental-strip-types "<本文件>"
// 默认 off 也测一遍，证明灰度没开时行为不变。
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const { resolveSettlementVerdict } = await import(
  pathToFileURL(path.join(HERE, '..', 'src', 'lib', 'trust-chain', 'settlement-verdict.ts')).href
)

const authority = { expectedAssignmentCount: 60 }   // 服务端冻结的计划工作量
const base = {
  schemaVersion: 'v1.5-settlement-1', scriptVersion: '3.7.32', reportHash: 'f'.repeat(64),
  resultArtifactHash: 'a'.repeat(64), startedAt: '2026-11-03T00:00:00.000Z', finishedAt: '2026-11-03T00:02:00.000Z',
  totalPSD: 1, totalLanguages: 1, totalTextLayers: 60, exportedFiles: 1,
  unmatchedLayers: 0, skippedLayers: 0, errorCount: 0, warningCount: 0,
  verificationLevel: 'REOPEN_VERIFIED', objectEvidenceDigest: 'b'.repeat(64),
  attemptStatus: 'SUCCEEDED', artifactDisposition: 'PUBLISHED', completedAssignmentCount: 60,
  outputFingerprint: 'c'.repeat(64),
}

// 六枚形状：最后一枚是"诚实失败"——按 v15-runner.js:255-266 真实失败分支的字段形态构造
const variants = [
  ['① 真成功（自报成功＋产物）', { ...base }],
  ['② 谎报失败但留着 PUBLISHED', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, artifactDisposition: 'PUBLISHED' }],
  ['③ 谎报失败但留着指纹', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, artifactDisposition: 'NONE', outputFingerprint: 'c'.repeat(64) }],
  ['④ 谎报失败＋抹掉一切证据', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 0, artifactDisposition: 'NONE', outputFingerprint: null, exportedFiles: 0, errorCount: 1 }],
  ['⑤ 中途真失败（有完成量无产物）', { ...base, attemptStatus: 'PARTIAL_FAILED', completedAssignmentCount: 20, artifactDisposition: 'NONE', outputFingerprint: null }],
  ['⑥ 诚实失败·工作副本已隔离留档', { ...base, attemptStatus: 'FAILED', completedAssignmentCount: 37, artifactDisposition: 'QUARANTINED', outputFingerprint: 'd'.repeat(64), exportedFiles: 0, errorCount: 3, verificationLevel: 'TEXT_READBACK_VERIFIED' }],
]

console.log('变体'.padEnd(30), 'usable', 'reason'.padEnd(26), '金额（本链二值：全额或零）')
for (const [label, receipt] of variants) {
  const v = resolveSettlementVerdict(receipt, authority)
  console.log(label.padEnd(28), String(v.usable).padEnd(6), v.reason.padEnd(26), v.usable ? '按冻结工作量全额扣' : '释放，不扣')
  console.log(''.padEnd(28), '  ', v.note)
}

// 默认 off 时的对照：适配器走的是旧判据 succeeded||partiallyCompleted
const oldRule = (r) => r.attemptStatus === 'SUCCEEDED' || r.attemptStatus === 'PARTIAL_FAILED'
console.log('\n灰度 off（旧判据）对照：④ 谎报抹证据 ⇒', oldRule(variants[3][1]) ? '仍扣' : '释放（这就是那条白嫖账）',
  '| ⑥ 诚实失败 ⇒', oldRule(variants[5][1]) ? '扣' : '释放')
