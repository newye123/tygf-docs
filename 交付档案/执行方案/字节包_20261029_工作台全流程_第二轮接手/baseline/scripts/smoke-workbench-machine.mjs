import assert from 'node:assert/strict'
import {
  deriveWorkbenchReadiness,
  deriveWorkbenchState,
} from '../src/lib/workbench/workbench-machine.ts'
import {
  stableTranslationRowIds,
  translationLanguageDigest,
} from '../src/lib/workbench/workbench-revision.ts'
import {
  decisionsRestorable,
  decisionsToBatch,
  DECISIONS_TTL_MS,
  EMPTY_TRIO,
} from '../src/lib/workbench/decision-persistence.ts'

const parsed = {
  sourceHeader: '原文',
  languageColumns: ['nl', 'pl'],
  warnings: [],
  rows: [
    { source: 'View the Collection', translations: { nl: 'Bekijk', pl: 'Zobacz' } },
    { source: 'View the Collection', translations: { nl: 'Collectie', pl: 'Kolekcja' } },
  ],
}

const ids = stableTranslationRowIds(parsed)
assert.equal(ids.length, 2)
assert.notEqual(ids[0], ids[1], 'duplicate source rows keep distinct identities')

const nlDigest = translationLanguageDigest(parsed, 'nl', {})
assert.notEqual(
  nlDigest,
  translationLanguageDigest(parsed, 'nl', { 2: 'Nieuwe tekst' }),
  'editing one language invalidates that language revision',
)

assert.deepEqual(
  deriveWorkbenchReadiness({
    translationCommitted: true,
    designReady: false,
    selectedLanguages: ['nl'],
    languageDigests: { nl: nlDigest },
    reviewedLanguageDigests: {},
    reconcileCurrent: false,
    reconcileReady: false,
  }),
  {
    reviewOpen: true,
    allLanguagesReviewed: false,
    reconcileOpen: false,
    deliveryOpen: false,
    nextStage: 'translation_review',
  },
)

const ready = deriveWorkbenchReadiness({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: true,
})
assert.equal(ready.deliveryOpen, true)
assert.equal(ready.nextStage, 'delivery')

// A4：批量 isReady=false（有阻断组/失败/stale）时 delivery 必须关闭
const blocked = deriveWorkbenchReadiness({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: false,
})
assert.equal(blocked.deliveryOpen, false, 'isReady=false 时交付门必须关闭')
assert.equal(blocked.nextStage, 'design_reconcile')


// 工作台高保真合同：设计稿对账完成后仍必须在第 3 步完成 Photoshop 就绪，
// 不得把助手/Photoshop 检测拖到第 4 步“生成交付”才处理。
const waitingForPhotoshop = deriveWorkbenchReadiness({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: true,
  photoshopReady: false,
})
assert.equal(waitingForPhotoshop.deliveryOpen, false)
assert.equal(waitingForPhotoshop.nextStage, 'design_reconcile')

const photoshopReadyState = deriveWorkbenchState({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: true,
  photoshopReady: false,
  blockingIssueCount: 0,
})
assert.equal(photoshopReadyState.activeStage, 'design_reconcile')
assert.equal(photoshopReadyState.primaryAction, 'check')
assert.equal(photoshopReadyState.reason, '完成 Photoshop 检测')

const afterPhotoshopReady = deriveWorkbenchReadiness({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: true,
  photoshopReady: true,
})
assert.equal(afterPhotoshopReady.deliveryOpen, true)
assert.equal(afterPhotoshopReady.nextStage, 'delivery')

// ─── P0-C-3：决策恢复纯判定 ─────────────────────────────────────────────────
const snapshot = {
  scanId: 'psn_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  fingerprint: 'f'.repeat(64),
  translationDigest: 'digest-v1',
  forcedBindingsByLang: {
    nl: [{ ledgerEntryId: 'Banner|World@0', target: 'Wereld', fragmentRowIds: ['r1'] }],
  },
  excludedLayerObjectIds: ['obj_x'],
  ignoredTranslationRowIds: ['r9'],
  savedAt: new Date(Date.now() - 60_000).toISOString(),
}
assert.equal(
  decisionsRestorable(snapshot, snapshot.scanId, snapshot.fingerprint, snapshot.translationDigest),
  true,
  'scanId+fingerprint+digest 一致且 TTL 内可恢复',
)
assert.equal(
  decisionsRestorable(snapshot, 'psn_other', snapshot.fingerprint, snapshot.translationDigest),
  false,
  'scanId 不同不可恢复（跨任务）',
)
assert.equal(
  decisionsRestorable(snapshot, snapshot.scanId, 'x'.repeat(64), snapshot.translationDigest),
  false,
  'fingerprint 不同不可恢复（文件变了）',
)
assert.equal(
  decisionsRestorable(snapshot, snapshot.scanId, snapshot.fingerprint, 'digest-v2'),
  false,
  '译文 digest 不同不可恢复（表格/译文变了）',
)
assert.equal(
  decisionsRestorable(
    { ...snapshot, savedAt: new Date(Date.now() - DECISIONS_TTL_MS - 60_000).toISOString() },
    snapshot.scanId,
    snapshot.fingerprint,
    snapshot.translationDigest,
  ),
  false,
  '超过 TTL 不可恢复',
)
assert.equal(decisionsRestorable(null, 'x', 'y', 'z'), false, '空快照不可恢复')

// ─── decisionsToBatch：语言维度权威 + 旧助手兼容扁平（P0 语言串写修复）────────
const batchDecisions = decisionsToBatch({
  forcedBindingsByLang: {
    nl: [{ ledgerEntryId: 'Banner|World@0', target: 'Wereld', fragmentRowIds: ['r1'] }],
    pl: [{ ledgerEntryId: 'Banner|World@0', target: 'Świat', fragmentRowIds: ['r1'] }],
    nl2: [{ ledgerEntryId: 'Other|Text@1', target: 'Anders' }],
  },
  excludedLayerObjectIds: ['obj_x'],
  ignoredTranslationRowIds: ['r9'],
})
assert.equal(batchDecisions.forcedBindings.length, 2, '扁平兼容列表：同 objectId 跨语言只保留一条（旧行为）')
assert.equal(batchDecisions.forcedBindings[0].objectId, 'Banner|World@0')
assert.deepEqual(batchDecisions.forcedBindings[0].fragmentRowIds, ['r1'])
// 语言维度权威：同 objectId 在不同语言下必须各自保留（不再被跨语言去重）
assert.equal(batchDecisions.forcedBindingsByLanguage.nl.length, 1)
assert.equal(batchDecisions.forcedBindingsByLanguage.nl[0].target, 'Wereld')
assert.equal(batchDecisions.forcedBindingsByLanguage.pl.length, 1)
assert.equal(batchDecisions.forcedBindingsByLanguage.pl[0].target, 'Świat', '语言维度不得被首语言覆盖')
assert.equal(batchDecisions.forcedBindingsByLanguage.nl2.length, 1, '各语言绑定各自保留，不跨语言合并')
assert.equal(batchDecisions.forcedBindingsByLanguage.nl2[0].objectId, 'Other|Text@1')
assert.deepEqual(batchDecisions.excludedObjectIds, ['obj_x'])
assert.deepEqual(batchDecisions.ignoredRowIds, ['r9'])
assert.deepEqual(decisionsToBatch(EMPTY_TRIO), {
  forcedBindings: [],
  forcedBindingsByLanguage: {},
  excludedObjectIds: [],
  ignoredRowIds: [],
})

// ─── P1：壳层派生（activeStage/completedStages/primaryAction/reason）─────────
const materialsState = deriveWorkbenchState({
  translationCommitted: false,
  designReady: false,
  selectedLanguages: [],
  languageDigests: {},
  reviewedLanguageDigests: {},
  reconcileCurrent: false,
  reconcileReady: false,
})
assert.equal(materialsState.activeStage, 'materials')
assert.deepEqual(materialsState.completedStages, [])
assert.equal(materialsState.primaryAction, 'prepare')
assert.equal(materialsState.reason, undefined)

const reviewState = deriveWorkbenchState({
  translationCommitted: true,
  designReady: false,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: {},
  reconcileCurrent: false,
  reconcileReady: false,
})
assert.equal(reviewState.activeStage, 'translation_review')
assert.deepEqual(reviewState.completedStages, ['materials'])
assert.equal(reviewState.primaryAction, 'review')
assert.equal(reviewState.reason, undefined, '已导入译文表时审查无锁因')

const reconcileBlocked = deriveWorkbenchState({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: false,
  blockingIssueCount: 3,
})
assert.equal(reconcileBlocked.activeStage, 'design_reconcile')
assert.equal(reconcileBlocked.primaryAction, 'resolve', '有阻断 → resolve')
assert.equal(reconcileBlocked.reason, '3 项需要确认')

const reconcileBlockedNoCount = deriveWorkbenchState({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: false,
})
assert.equal(reconcileBlockedNoCount.primaryAction, 'check', '未给阻断数 → check（不臆断阻断）')

const reconcileOpenNoBlock = deriveWorkbenchState({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl'],
  languageDigests: { nl: nlDigest },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: true,
  reconcileReady: true,
  blockingIssueCount: 0,
})
assert.equal(reconcileOpenNoBlock.activeStage, 'delivery')
assert.equal(reconcileOpenNoBlock.primaryAction, 'generate')
assert.deepEqual(
  reconcileOpenNoBlock.completedStages,
  ['materials', 'translation_review', 'design_reconcile'],
)
assert.equal(reconcileOpenNoBlock.reason, undefined, '全部就绪无锁因')

const reconcileLocked = deriveWorkbenchState({
  translationCommitted: true,
  designReady: true,
  selectedLanguages: ['nl', 'pl'],
  languageDigests: { nl: nlDigest, pl: translationLanguageDigest(parsed, 'pl', {}) },
  reviewedLanguageDigests: { nl: nlDigest },
  reconcileCurrent: false,
  reconcileReady: false,
})
assert.equal(reconcileLocked.activeStage, 'translation_review', '未确认全部语言 → 仍停在审查')
assert.equal(reconcileLocked.primaryAction, 'review')

console.log('workbench machine smoke: ok')