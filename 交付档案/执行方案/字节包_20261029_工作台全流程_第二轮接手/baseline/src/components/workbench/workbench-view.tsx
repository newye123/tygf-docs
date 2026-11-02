'use client'

// 图译工坊内测版 — 本地工作台主入口（准备素材 → 审查原文与译文 → 设计稿校对 → 生成交付）
// 边界：
// - activation.json 只含 LocalActivation 字段 (RG-004)
// - 报告不含本地绝对路径 (RG-003)
// - 对象级检查只返回浏览器可见削减版（对象名/问题/计数，无图层路径与正文全文）
// - 批量多语言：每语言独立对账（prepare-check）与执行（V1.5 执行链逐语言循环）

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
// 工作台对齐官网令牌（墨绿/暖灰/思源黑体/16px 圆角）。
// 文件头有完整理由：官网零 teal/sky，而工作台 192 处，靠覆盖色板变量一次收敛。
import './workbench-tokens.css'
import './batch-workspace.css'
import { featureFlags } from '@/config/featureFlags'
import { motion } from 'framer-motion'
import { ElapsedSeconds } from '@/components/workbench/elapsed-seconds'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import type { ParsedCsv } from '@/lib/types'
import type { SmartReviewDecision } from '@/lib/workbench/smart-review-contract'
import { buildReview } from '@/lib/workbench/review'
import { isSmartReviewTechnicalMetadataRow } from '@/lib/workbench/smart-review-contract'
import type { PsStateSnapshot } from '@/lib/workbench/photoshop'
import { removeEmptyParsedRows } from '@/lib/workbench/parsed-row'
import { assessRowExclusion } from '@/lib/workbench/row-exclusion'
import { useView } from '@/components/site/view-context'
import { ActivationGate } from '@/components/workbench/activation-gate'
import { AccountGate } from '@/components/workbench/account-gate'
import { AssistantSetupBanner } from '@/components/workbench/assistant-setup-banner'
import { CsvStep } from '@/components/workbench/csv-step'
import { ReviewStep } from '@/components/workbench/review-step'
import { PhotoshopStep } from '@/components/workbench/photoshop-step'
import { ExecuteStep } from '@/components/workbench/execute-step'
import { LayoutExceptionList } from '@/components/workbench/layout-exception-list'
import { DesignFileCard } from '@/components/workbench/design-file-card'
import { GuestInlineNote, useWorkbenchGuest } from '@/components/workbench/guest-mode'
import { TypographyPanel } from '@/components/workbench/typography-panel'
import { CoverageMatrix } from '@/components/workbench/coverage-matrix'
import { buildDraftDisplayLabels } from '@/lib/workbench/draft-display-labels'
import { BatchWorkspaceEmpty } from '@/components/workbench/batch-workspace-empty'
import {
  COVERAGE_THRESHOLD,
  calcCoverageMatrixForDraftTables,
  type CoverageDraftLike,
  type CoverageMatrixCell,
} from '@/lib/workbench/coverage'
import { buildBindingEvidences } from '@/lib/workbench/binding-evidence'
import { confirmedLanguagesOf } from '@/lib/workbench/deliverable-view'
import { CreditsBadge } from '@/components/workbench/credits-badge'
import { UserAccountMenu } from '@/components/workbench/user-account-menu'
import { CreditPackEntry } from '@/components/workbench/credit-pack-entry'
import { useFeatureFlags } from '@/lib/workbench/use-feature-flags'
import { useFeatureAccess } from '@/lib/workbench/use-feature-access'
import { useWorkbenchUrlState } from '@/hooks/use-workbench-url-state'
import { ReadinessBoard } from '@/components/workbench/readiness-board'
import { WhyDetails } from '@/components/workbench/why-details'
import { ObjectsDrawer } from '@/components/workbench/objects-drawer'
import {
  ObjectInspector,
  type InspectorResolution,
} from '@/components/workbench/object-inspector'
import { trackFunnelEvent } from '@/lib/workbench/funnel-client'
import { clearDecisionLog } from '@/lib/workbench/decision-log'
import type { PsdSelection } from '@/lib/workbench/psd-selection'
import {
  basenameOf,
  parentFolderOfFile,
  isPsdSelectionReady,
  clearMultiPsdSelection,
  addMultiPsdEntry,
  keepFirstMultiPsdEntries,
  getMultiPsdUnscanned,
  isMultiPsdEntryScanned,
  isMultiPsdSelectionReady,
} from '@/lib/workbench/psd-selection'
import type { MultiPsdEntry, MultiPsdSelection } from '@/lib/workbench/psd-selection'
import {
  buildGroupBindings,
  deriveStageChoices,
  type DraftGroupBinding,
} from '@/lib/workbench/group-binding'
import {
  countDeliverables,
  excludedReadySlots,
  readySlotLanguages,
  removedLanguages,
  withLanguages,
  withoutLanguage,
} from '@/lib/workbench/slot-scope'
import type { GroupReject } from '@/lib/workbench/table-grouping'
import { mergeTableGroup, type GroupMergeTable } from '@/lib/workbench/group-merge'
import { normalizeTableId } from '@/lib/workbench/table-inventory'
import {
  classifyDraftAttention,
  isDraftFullyReviewed,
} from '@/lib/workbench/draft-groups'
import {
  DraftTableList,
  type DraftTableRow,
} from '@/components/workbench/draft-table-list'
import { MultiDraftStageQueue } from '@/components/workbench/multi-draft-stage-queue'
import {
  collectOverflowRisks,
  type OverflowRiskItemInput,
  type OverflowTypography,
} from '@/lib/workbench/overflow-estimator'
import { humanizeInternalIds, INTERNAL_ID_POINTER } from '@/lib/workbench/display-humanize'
import { bufferLearningSignal } from '@/lib/workbench/learning-signal-client'
import {
  clearWorkbenchDraft,
  readWorkbenchDraft,
  writeWorkbenchDraft,
} from '@/lib/workbench/draft'
import { clearExecutionRecovery } from '@/lib/workbench/execution-recovery'
import {
  deriveLanguages,
  exclusionsFor,
  loadLanguageExclusions,
  nextExclusions,
  saveLanguageExclusions,
  withLanguageExclusions,
  type LanguageExclusionStore,
} from '@/lib/workbench/language-exclusion-memory'
import { useSiteCopy } from '@/lib/workbench/site-copy'
import {
  detectAssistant,
  diagnosePhotoshopAutomation,
  fetchTypographyCapability,
  runPrepareCheckBatch,
  readPreparationTable,
  listFolderDesigns,
  selectImportFolderDirect,
  setAssistantTaskRoot,
  LocalAssistantRequestError,
  type FolderTableEntry,
  type FolderScanResult,
  type PrepareBatchDecisions,
  type PrepareBatchResult,
  type PrepareCheckItem,
  type PrepareCheckResult,
} from '@/lib/workbench/local-assistant-client'
// 2026-10-22（图六）：排版入口三态的唯一判定与一句话原因（界面只消费结果）。
import {
  describeTypographyEntry,
  type TypographyCapabilityProbe,
} from '@/lib/workbench/typography-entry'
import {
  pairDesignsWithTables,
  type TablePairingResult,
} from '@/lib/workbench/table-pairing'
import { MAX_TABLE_BYTES, parseTableBytes, TABLE_FILE_RE } from '@/lib/workbench/table-file'
import {
  ATTRIBUTION_DELIVERABLE_ORDER,
  ATTRIBUTION_STATUS_LABEL,
  attributionAutoChoices,
  buildAttributionPlan,
  DELIVERABLE_LABEL,
  identifyDraft,
  parseDeliverable,
  type AttributionPlan,
  type DeliverableKind,
} from '@/lib/workbench/sku-attribution'
// 2026-10-23：归属记忆落存储（Owner 选 B）＋ 第 1 步壳（按模拟重做）。
import {
  attributionMemoryKey,
  loadAttributionMemory,
  resolveRememberedTable,
  saveAttributionMemory,
  withAttributionChoice,
  withoutAttributionChoice,
  type AttributionMemory,
} from '@/lib/workbench/attribution-memory'
import {
  loadTableAllocationStore,
  projectTableAllocation,
  saveTableAllocationStore,
  tableAllocationKey,
  tableAllocationDigest,
  type TableAllocation,
  type TableAllocationStore,
} from '@/lib/workbench/table-allocation'
import { Step1StageView } from './step1-stage-view'
import type { StageDuplicateAlert, StageScanState } from './step1-stage-view'
import { StageFolderGate } from './stage-folder-gate'
import { TablePickerDialog } from './table-picker-dialog'
import {
  clearStageTableCache,
  loadStageTable,
  probeParsedTable,
  runStageTableBatch,
  type StageTableProbe,
  type StageTableReadState,
} from '@/lib/workbench/stage-table-loader'
import {
  dedupeStageChoices,
  evaluateStageGate,
  groupDuplicateDrafts,
  stageGateRowsFromPlan,
  type DuplicateGroup,
} from '@/lib/workbench/stage-rows'
import {
  clearCommittedDecisions,
  decisionsToBatch,
  EMPTY_TRIO,
  loadCommittedDecisions,
  saveCommittedDecisions,
  type DecisionTrio,
  type ForcedBinding,
} from '@/lib/workbench/decision-persistence'
import { bindingFinalCode, nextTrioAfterResolution } from '@/lib/workbench/inspector-decisions'
import { reportPrepareCheckEvidence } from '@/lib/workbench/learning-evidence-client'
import { reportTypographyEvidence } from '@/lib/workbench/typography-upload-client'
import { formatLanguageCode } from '@/lib/workbench/lang-display'
import { displaySourceHeader } from '@/lib/workbench/source-header'
import {
  deriveWorkbenchReadiness,
  deriveWorkbenchState,
  type WorkbenchStage,
} from '@/lib/workbench/workbench-machine'
import {
  StageRail,
  type StageRailItem,
} from '@/components/workbench/stage-rail'
import { WorkbenchActionBar } from '@/components/workbench/workbench-action-bar'
import {
  stableTranslationRowIds,
  translationLanguageDigest,
} from '@/lib/workbench/workbench-revision'
import {
  groupBlockingItems,
  summarizePrepareChecks,
} from '@/lib/workbench/prepare-check-summary'
import { WorkingEditorPanel } from '@/components/workbench/working-editor-panel'
import {
  REVIEW_PHASE_LABEL,
  WB_TERMS,
  reviewAggregateLabel,
} from '@/lib/workbench/workbench-terms'
import { WB_ACTIONS } from '@/lib/workbench/terms'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { fitSmartReviewPayload } from '@/lib/workbench/smart-review-payload'
import { legacyRowId, type WorkingDocument } from '@/lib/workbench/working-document'
import { digestWorkbenchValue } from '@/lib/workbench/workbench-revision'
import {
  readWorkbenchActivation,
  workbenchAuthHeaders,
} from '@/lib/workbench/funnel-client'
import { readWorkbenchApiResponse } from '@/lib/workbench/api-response'
import { t } from '@/lib/i18n/t'
import {
  buildReconciliationStatement,
  buildReplenishCsv,
} from '@/lib/workbench/reconciliation-actions'

/** S2：本地导出（对账单/补译清单），不触网、不写服务端。 */
function downloadTextFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

type LanguageCheckState = 'idle' | 'running' | 'ready' | 'error' | 'stale'

/** 每稿一表（v7）：单稿模式与「尚未绑定到设计稿」的译表共用同一个键。 */
const SINGLE_DRAFT_KEY: string = '__single__'
function draftKeyOfMasterPath(masterPath: string): string {
  return `psd:${masterPath}`
}
/**
 * 一组表的身份＝表路径集合（与顺序无关）。
 * 读完才知行数、基准会换到第一张，那种换序只是「同一组表」内部重排，不该触发重读。
 */
function groupSignatureOf(tablePaths: string[]): string {
  return [...tablePaths].sort().join('\u0001')
}
function allocationSignatureOf(store: TableAllocationStore, tablePaths: string[]): string {
  const ids = [...new Set(tablePaths.map(normalizeTableId))].sort()
  return digestWorkbenchValue(ids.map((id) => [
    id,
    Object.entries(store)
      .filter(([, allocation]) => normalizeTableId(allocation.tablePath) === id)
      .map(([key, allocation]) => [key, allocation.kind, allocation.members, allocation.moduleOwners ?? {}, allocation.moduleColumnConfirmed ?? false, allocation.allowUnassignedRows ?? false, allocation.tableDigest])
      .sort(([left], [right]) => String(left).localeCompare(String(right), 'en')),
  ]))
}
// v13：这里原来还有一张 `DRAFT_STATE_LABEL` 状态标签表。v13 把状态徽标抽到共享件
// `draft-state-badge.tsx`（`DraftStateBadge`）之后，它变成了**没人引用的死表**——
// 而「状态文案有两处」正是本项目反复点名的两套真相苗头（v12 F11 的同族病）。
// ⇒ 本轮把它删掉，状态标签只剩 `draft-state-badge.tsx` 一个来源。
// 旧表里 'stale' 写的是硬编码「需重新扫描」，共享件用的是 `需${WB_ACTIONS.rescan.label}`
// （术语单一来源），二者当前同字。


type LanguageReviewStatus = {
  phase: string
  notes?: number
  suggestions?: number
  omitted?: number
  error?: string
}
type BatchReviewState = {
  batchId: string
  aggregate: string
  error?: string
  statuses: Record<string, LanguageReviewStatus>
}

/** 一个设计稿在浏览器内存里的完整会话：译表本身另存 parsedTables[draftKey]。 */
interface DraftRuntimeSnapshot {
  scanId: string | null
  targetLanguages: string[]
  editedTranslations: Record<string, Record<number, string>>
  sheetExtrasByLanguage: Record<string, { source: string; target: string }[]>
  reviewedLanguageDigests: Record<string, string>
  reviewDecisionsByLanguage: Record<string, SmartReviewDecision[]>
  currentLanguage: string | null
  batchReview: BatchReviewState | null
  batchReviewRunning: boolean
  retryingLanguage: string | null
  checkedRevision: string | null
  batchResult: PrepareBatchResult | null
  excludedLayerObjectIds: string[]
  ignoredTranslationRowIds: string[]
  forcedBindingsByLang: Record<string, ForcedBinding[]>
  pending: DecisionTrio
  committed: DecisionTrio | null
  pendingDirty: boolean
  appliedReviewCount: number
}

/** 批量响应 → 单语言视图（与 runPrepareCheck 响应同形，供既有板块消费） */
function toPrepareCheckResult(
  batch: PrepareBatchResult,
  lang: string,
): PrepareCheckResult | null {
  const lr = batch.languageResults[lang]
  if (!lr) return null
  return {
    ok: true,
    checkedAt: batch.checkedAt,
    scanId: batch.scanId,
    targetLanguage: lang,
    writableCount: lr.writableCount,
    targetedCount: lr.targetedCount,
    boundCount: lr.boundCount,
    blockedCount: lr.blockingCount,
    reviewCount: lr.reviewCount,
    unmatchedTranslationCount: lr.unmatchedTranslationCount,
    unmatchedTranslationRowIds: lr.unmatchedTranslationRowIds,
    excludedCount: lr.items.filter((item) => item.kind === 'excluded').length,
    items: lr.items,
  }
}

/**
 * 本地工作台主入口。
 *
 * `batchMode`（2026-10-16 新增）：同一套步骤的**批量模式**，由 `#batch` 视图传入。
 *  - `false`（默认，`#workbench`）：纯单文件工作台——多 PSD 列表、覆盖率矩阵、逐稿编排
 *    **一律不渲染**。这从结构上杜绝了「多 PSD 实验顶替原工作台」再次发生。
 *  - `true`（`#batch`）：文件区换成多设计稿列表，语言区出现覆盖率矩阵，执行区走逐稿编排。
 *
 * 为什么用 prop 而不是 flag：原先批量分支读 `featureFlags.multiPsdExperimentEnabled`，
 * 那个 flag 一旦打开就会把单文件工作台**整体换掉**（`design-file-card.tsx:600` 就地 return），
 * 用户没有「继续用旧的」这个选项。改为「视图决定模式」后，两个工作台各自独立、互不影响，
 * 且与全局开关解耦（开关只管入口开不开）。
 */
export function WorkbenchView({ batchMode: batchModeFromUrl = false }: { batchMode?: boolean }) {
  // 访客模式的 Provider 由 AccountGate 渲染，所以消费 useWorkbenchGuest() 的必须是它的子组件：
  // 若把 Provider 写在下面这个组件的 return 里，本组件自己是读不到的（永远拿到默认值）。
  return (
    <AccountGate>
      <WorkbenchBody batchModeFromUrl={batchModeFromUrl} />
    </AccountGate>
  )
}

function WorkbenchBody({ batchModeFromUrl = false }: { batchModeFromUrl?: boolean }) {
  // 2026-10-18：单稿 / 多稿从「两个并列视图」改成「同一工作台内的两种模式」，页内切换。
  // 初始值仍由 URL 给出（旧书签 #batch 直达的语义不变），之后由页头分段切换器维护。
  // 好处：27 处 batchMode 引用一行都不用改。
  const [batchMode, setBatchMode] = useState(batchModeFromUrl)
  // 多 → 单的确认弹窗（本批超过 1 个稿时必须问；点名会被移出的稿）
  const [modeConfirmOpen, setModeConfirmOpen] = useState(false)
  // 批量导入：配对确认 → 逐张取表 → 写入各稿表槽（2026-10-21）
  // folder＝文件夹扫描后经助手读表；files＝工作台上直接多选表格文件，由浏览器读字节。
  const [bulkImport, setBulkImport] = useState<{
    kind: 'folder' | 'files'
    root?: string
    tables: Array<FolderTableEntry & { file?: File }>
    pairing: TablePairingResult
    /** 归属计划（SKU × 交付物 × 表）——界面只渲染，判据在内核里 */
    attribution: AttributionPlan
  } | null>(null)
  const [bulkChoices, setBulkChoices] = useState<Record<string, string>>({})
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkErrors, setBulkErrors] = useState<Array<{ design: string; message: string }>>([])
  const [bulkNotice, setBulkNotice] = useState<string | null>(null)
  /** 批量导入时表里没说清的事（多工作表没读进来等）——必须显示，不许静默 */
  const [bulkTableWarnings, setBulkTableWarnings] = useState<string[]>([])
  const { setView } = useView()
  const wbCopy = useSiteCopy('workbench')
  const featureFlags = useFeatureFlags()
  const featureAccess = useFeatureAccess()
  // 访客模式（2026-10-28 Owner 定案 A）：账号门把人放进工作台后，这里决定
  // 哪些动作要挡到注册。不是访客时 requireAccount 恒为 true，行为与改前一致。
  const { isGuest, requireAccount } = useWorkbenchGuest()
  const [initialDraft] = useState(() => {
    const draft = readWorkbenchDraft()
    if (!draft) return null
    const parsed = removeEmptyParsedRows(draft.parsed)
    return parsed === draft.parsed
      ? draft
      : { ...draft, parsed, editedTranslations: {} }
  })
  const [issuesOpen, setIssuesOpen] = useState(true)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  // S2：译表工作稿抽屉（默认关闭；P1 只读预览，编辑统一走 ReviewStep）
  const [editorOpen, setEditorOpen] = useState(false)
  // 排版定制入口（2026-10-20）：按设计稿「卡头按钮 + 悬浮球 + 右侧抽屉」。
  // 面板 JSX 仍挂在阶段一内（smoke-typography-customization 的位置断言不变），
  // 抽屉本体在面板内 portal 到 body 并补 .wb-brand，避免丢工作台令牌/字体。
  const [typographyDrawerOpen, setTypographyDrawerOpen] = useState(false)
  const [typographyDirty, setTypographyDirty] = useState(false)
  // 2026-10-22 Owner 令（图六）：能力位没开时入口**不再整块消失**——
  // 「功能可以不可用，但不能装作不存在」：入口常驻、置灰、点开给一句话原因与动作。
  // 旧口径（2026-10-21 ISSUES #220「不露出按钮/悬浮球」）就此作废，见 typography-entry.ts 头注。
  // null＝还没探完（诚实标"正在连接"，不当成"不可用"）。
  const [typographyCapability, setTypographyCapability] = useState<TypographyCapabilityProbe | null>(null)
  const typographyEntry = describeTypographyEntry(typographyCapability)

  // 悬浮球在抽屉打开时会卸载，不能靠"打开前的 DOM 引用"归还焦点；
  // 记住这次是从哪个入口打开的，关闭后按来源重新取节点。
  // 2026-10-22：入口从 2 个变 3 个（卡头 / 悬浮球 / 顶栏窄屏图标），焦点归还也跟着分三路。
  const typographyTrigger = useRef<'header' | 'ball' | 'topbar'>('header')
  const openTypographyDrawer = useCallback((source: 'header' | 'ball' | 'topbar') => {
    typographyTrigger.current = source
    setTypographyDrawerOpen(true)
  }, [])
  const closeTypographyDrawer = useCallback(() => {
    setTypographyDrawerOpen(false)
  }, [])
  const restoreTypographyFocus = useCallback(() => {
    // 面板 cleanup 里调用时，React 已把关闭态 DOM 提交完（球重新挂载），
    // 且 #workbench-surface 的 inert 已移除，focus() 不会被丢弃。
    // 三路入口里可能只有一路在当前宽度可见（球 ≥1024、顶栏图标 <1024），
    // 所以取第一个真实可见的节点，找不到就退回卡头按钮。
    const selectors = [
      `[data-typography-trigger="${typographyTrigger.current}"]`,
      '[data-typography-trigger="ball"]',
      '[data-typography-trigger="header"]',
      '[data-typography-trigger="topbar"]',
    ]
    for (const selector of selectors) {
      const node = document.querySelector<HTMLElement>(selector)
      // 用 getClientRects() 判可见，不用 offsetParent——固定定位元素的 offsetParent 恒为 null，
      // 用它判会把悬浮球永远当成"不可见"（2026-10-22 实测）。
      if (node && node.getClientRects().length > 0) {
        node.focus()
        return
      }
    }
  }, [])
  // S3：检测全部语言（一次启动全部选定语言；逐语言进度如实披露）
  const [batchReviewRunning, setBatchReviewRunning] = useState(false)
  // P1：单语言重跑（仅失败/未知语言的显式人工处置；不自动重试）
  const [retryingLanguage, setRetryingLanguage] = useState<string | null>(null)
  const [batchReview, setBatchReview] = useState<BatchReviewState | null>(null)
  // P1 单屏单阶段：activeStage = 当前查看阶段（默认跟随 machine 建议，可被 StageRail 手动覆盖）
  // P-04：阶段与当前语言写进 URL（只允许 stage/lang 两个视图状态进 URL；
  // 译文、批次数据、草稿内容一律不进——地址栏会进入历史与分享链接）。
  const {
    stage: activeStage,
    setStage: setActiveStage,
    language: currentLanguage,
    setLanguage: setCurrentLanguage,
    stageFromUrl,
  } = useWorkbenchUrlState({
    fallbackStage: 'materials',
    fallbackLanguage: initialDraft?.targetLanguage ?? null,
  })
  // 2026-10-22 Owner 令（图六）：入口在四个步骤都常驻，所以探测不能只在第 1 步跑一次
  // （原来 `activeStage !== 'materials'` 就 return，第 2 步起入口永远算"未知"）。
  // 仍然只探一次，失败不自动重试；用户点「重新检测」时由 refreshTypographyCapability 重置。
  const [typographyProbeNonce, setTypographyProbeNonce] = useState(0)
  useEffect(() => {
    if (!featureAccess.typographyCustomization) return
    if (typographyCapability !== null) return
    let cancelled = false
    void fetchTypographyCapability().then((result) => {
      if (cancelled) return
      setTypographyCapability(result)
    })
    return () => {
      cancelled = true
    }
  }, [featureAccess.typographyCustomization, typographyCapability, typographyProbeNonce])
  const refreshTypographyCapability = useCallback(() => {
    setTypographyCapability(null)
    setTypographyProbeNonce((n) => n + 1)
  }, [])
  // 灰度开关开＝入口在（可用或置灰）；助手能力位只决定"能不能写回"，不再决定"有没有入口"。
  const typographyEnabled = featureAccess.typographyCustomization
  const typographyWritable = typographyEntry.status === 'ready'
  // 探测进行中只置淡，不挂告警图标——否则首帧会闪一下琥珀色，像出错了。
  const typographyAttention = typographyEntry.status === 'blocked'
  const typographyBlockedReason =
    typographyEntry.status === 'blocked'
      ? `${typographyEntry.reason}${typographyEntry.action}`
      : null
  // 只要服务端任务尚未确认终态，整个工作台都不能切换素材或清空现场。
  const [executionAuthorized, setExecutionAuthorized] = useState(false)
  const [executionLockNotice, setExecutionLockNotice] = useState<string | null>(null)
  const manualStageRef = useRef(false)
  const goToStage = useCallback((stage: WorkbenchStage, options?: { bypassExecutionLock?: boolean }) => {
    if (executionAuthorized && !options?.bypassExecutionLock && stage !== 'delivery') {
      setExecutionLockNotice(t('本次执行尚未完成结算，暂不能切换素材、{label}或清空工作台。请先核对原任务或完成积分退回。', { label: String(WB_ACTIONS.rescan.label) }))
      return
    }
    manualStageRef.current = true
    setActiveStage(stage)
  }, [executionAuthorized])
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null)
  const [focusReviewAfterImport, setFocusReviewAfterImport] = useState(false)

  // ─── 素材状态 ────────────────────────────────────────────────────────────────
  // v7（2026-10-20）：译文表按设计稿分槽存放。批量模式下每个稿一张表；
  // 单稿模式沿用 SINGLE_DRAFT_KEY。parsed 不再是独立 state，而是「当前稿的表」，
  // 这样切稿时所有既有派生（语言、编辑、对账、执行载荷）自动跟着当前稿走。
  const [activeDraftKey, setActiveDraftKey] = useState<string>(SINGLE_DRAFT_KEY)
  const activeDraftKeyRef = useRef(SINGLE_DRAFT_KEY)
  /** 当前稿 live 证据对应的扫描号；用于识别「同一稿被重扫」。 */
  const activeDraftScanIdRef = useRef<string | null>(null)
  const [parsedTables, setParsedTables] = useState<Record<string, ParsedCsv | null>>(() =>
    initialDraft?.parsed ? { [SINGLE_DRAFT_KEY]: initialDraft.parsed } : {},
  )
  const parsedTablesRef = useRef(parsedTables)
  useLayoutEffect(() => {
    parsedTablesRef.current = parsedTables
  }, [parsedTables])
  const parsed = parsedTables[activeDraftKey] ?? null
  const draftSnapshotsRef = useRef<Record<string, DraftRuntimeSnapshot>>({})
  const [targetLanguages, setTargetLanguages] = useState<string[]>(() => {
    if (!initialDraft) return []
    // V1-1：优先取全量勾选；与当前表的语言列取交集（表可能被编辑过），再退回旧版单语言字段。
    const saved = initialDraft.targetLanguages
    if (saved?.length) {
      const columns = initialDraft.parsed?.languageColumns ?? []
      const valid = columns.length ? saved.filter((lang) => columns.includes(lang)) : saved
      return valid.length ? valid : initialDraft.targetLanguage ? [initialDraft.targetLanguage] : []
    }
    return initialDraft.targetLanguage ? [initialDraft.targetLanguage] : []
  })
  const [editedTranslations, setEditedTranslations] = useState<
    Record<string, Record<number, string>>
  >(initialDraft?.editedTranslations ?? {})
  // S2：工作表追加行（补译入表）——parsed 无对应行，单独随请求发送并进入摘要。
  const [sheetExtrasByLanguage, setSheetExtrasByLanguage] = useState<
    Record<string, { source: string; target: string }[]>
  >({})
  const [reviewedLanguageDigests, setReviewedLanguageDigests] = useState<
    Record<string, string>
  >({})
  const [reviewDecisionsByLanguage, setReviewDecisionsByLanguage] = useState<
    Record<string, SmartReviewDecision[]>
  >({})
  const [psState, setPsState] = useState<PsStateSnapshot | null>(null)
  const [assistantConnected, setAssistantConnected] = useState(false)
  const [psdSelection, setPsdSelection] = useState<PsdSelection | null>(null)
  const psdSelectionRef = useRef(psdSelection)
  useLayoutEffect(() => {
    psdSelectionRef.current = psdSelection
  }, [psdSelection])
  // 批量模式下才有「多设计稿选择」这套状态；单文件模式恒为 null（组件树与原行为一致）。
  const [multiPsdSelection, setMultiPsdSelection] = useState<MultiPsdSelection | null>(() =>
    batchMode ? clearMultiPsdSelection() : null,
  )
  const [experimentTrigger, setExperimentTrigger] = useState(0)
  // 2026-10-16：experimentRunning 原为「只写不读」的死状态（批量执行期间界面零反馈）。
  // 现在下拉给 ExecuteStep，用于显示真实进度与锁定按钮。
  const [experimentRunning, setExperimentRunning] = useState(false)
  // 实验模式：当前 PSD 完成后先对新 PSD 重跑对账（scanId 变则 checkRevision 变），
  // 交付门重新开放后才推进下一个批次——否则新 PSD 未对账、阶段 4 关闭、编排静默停摆。
  const [experimentPendingAdvance, setExperimentPendingAdvance] = useState(false)
  const [experimentIndex, setExperimentIndex] = useState(0)
  const [experimentNotice, setExperimentNotice] = useState<string | null>(null)
  // #140/D5：覆盖率闸放行确认。对「当前 PSD 集合 × 当前语言表」的一次显式放行；
  // 集合或「低于阈值清单」任一变化即失效重置（见 coverageGateSignature 效果）——避免一次勾选永久放行。
  const [coverageReleaseAck, setCoverageReleaseAck] = useState(false)
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft))
  const [confirmReset, setConfirmReset] = useState(false)
  const [replaceTableOpen, setReplaceTableOpen] = useState(false)
  const [pendingReplacement, setPendingReplacement] = useState<ParsedCsv | null>(null)

// ─── 适配状态（批量原子检查，P0-C §3.1）────────────────────────────────────
  const [batchResult, setBatchResult] = useState<PrepareBatchResult | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  // T1（2026-09-27）：历史忽略/排除决策恢复时必须显式告知——这些决定会让对应英文
  // 保留在成品上（跳过未翻译），静默重放正是“表里全有却替换不成功”的机制之一。
  const [restoredDecisionsNotice, setRestoredDecisionsNotice] = useState<{ ignoredRows: number; excludedLayers: number } | null>(null)
  const [checkedRevision, setCheckedRevision] = useState<string | null>(null)
  const [excludedLayerObjectIds, setExcludedLayerObjectIds] = useState<string[]>([])
  const [ignoredTranslationRowIds, setIgnoredTranslationRowIds] = useState<string[]>([])
  const [forcedBindingsByLang, setForcedBindingsByLang] = useState<
    Record<string, ForcedBinding[]>
  >({})
  const [inspectorItem, setInspectorItem] = useState<PrepareCheckItem | null>(null)
  const [inspectorSaving, setInspectorSaving] = useState(false)
  const [inspectorError, setInspectorError] = useState<string | null>(null)
  // P2 收敛进度：本次会话累计已应用的智能检测建议条数（应用后自动触发重查）
  const [appliedReviewCount, setAppliedReviewCount] = useState(0)
  const [objectsOpen, setObjectsOpen] = useState(false)
  const checkSeqRef = useRef(0)
  // 自动对账的一次性闸门（按扫描/语言/修订组合去重）与「导入即对账」的上次表引用。
  // 提到这里声明：v7 切稿时的证据清空（invalidateDraftEvidence 等）也要能复位它们。
  const autoCheckDoneRef = useRef('')
  const importReconcileRef = useRef<ParsedCsv | null>(null)
  const inspectorPendingIdRef = useRef<string | null>(null)
  const pendingDirtyRef = useRef(false)
  const decisionsRestoredRef = useRef(false)
  // 决策最新值：批量请求/持久化同步读取，避免 setState 异步闭包陈旧
  const pendingRef = useRef<DecisionTrio>({
    forcedBindingsByLang: {},
    excludedLayerObjectIds: [],
    ignoredTranslationRowIds: [],
  })
  // committed 决策基线（恢复自 localStorage；isReady 通过后提升，P0-C-3）
  const committedRef = useRef<DecisionTrio | null>(null)

  // v7：切稿＝存下当前稿的会话快照，再灌回目标稿的快照。
  // 译表本体在 parsedTables；快照只装「围绕这张表的审查/决策/对账现场」。
  const captureLiveDraft = (): DraftRuntimeSnapshot => ({
    scanId: psdSelection?.scanId ?? null,
    targetLanguages,
    editedTranslations,
    sheetExtrasByLanguage,
    reviewedLanguageDigests,
    reviewDecisionsByLanguage,
    currentLanguage,
    batchReview,
    batchReviewRunning,
    retryingLanguage,
    checkedRevision,
    batchResult,
    excludedLayerObjectIds,
    ignoredTranslationRowIds,
    forcedBindingsByLang,
    pending: pendingRef.current,
    committed: committedRef.current,
    pendingDirty: pendingDirtyRef.current,
    appliedReviewCount,
  })
  /** 扫描号变了：只清证据（对账/决策/智能检测），保留译表、编辑与人工审查确认。 */
  const invalidateDraftEvidence = (key: string, nextScanId: string | null) => {
    checkSeqRef.current += 1
    const isActive = key === activeDraftKeyRef.current
    if (isActive) {
      activeDraftScanIdRef.current = nextScanId
      setBatchResult(null)
      setBatchError(null)
      setBatchLoading(false)
      setCheckedRevision(null)
      setExcludedLayerObjectIds([])
      setIgnoredTranslationRowIds([])
      setForcedBindingsByLang({})
      setBatchReview(null)
      setBatchReviewRunning(false)
      setRetryingLanguage(null)
      setInspectorItem(null)
      setInspectorError(null)
      pendingRef.current = EMPTY_TRIO
      committedRef.current = null
      pendingDirtyRef.current = false
      decisionsRestoredRef.current = false
      autoCheckDoneRef.current = ''
      importReconcileRef.current = parsedTablesRef.current[key] ?? null
    }
    const snapshot = draftSnapshotsRef.current[key]
    if (snapshot) {
      draftSnapshotsRef.current[key] = {
        ...snapshot,
        scanId: nextScanId,
        batchResult: null,
        checkedRevision: null,
        excludedLayerObjectIds: [],
        ignoredTranslationRowIds: [],
        forcedBindingsByLang: {},
        pending: EMPTY_TRIO,
        committed: null,
        pendingDirty: false,
        batchReview: null,
        batchReviewRunning: false,
        retryingLanguage: null,
      }
    }
  }

  const applyDraftSnapshot = (
    nextKey: string,
    snapshot: DraftRuntimeSnapshot | null,
    table: ParsedCsv | null,
    expectedScanId: string | null | undefined,
  ) => {
    checkSeqRef.current += 1
    setBatchLoading(false)
    setBatchError(null)
    setInspectorItem(null)
    setInspectorSaving(false)
    setInspectorError(null)
    setObjectsOpen(false)
    setRestoredDecisionsNotice(null)
    setReplaceTableOpen(false)
    setPendingReplacement(null)
    setLangPickerOpen(false)
    setFocusReviewAfterImport(false)
    autoCheckDoneRef.current = ''
    // 切稿不是「导入新表」：抑制导入即对账的一次性触发，交给自动对账/实验推进效果判定。
    importReconcileRef.current = table

    let applied = snapshot
    if (applied && expectedScanId !== undefined && applied.scanId !== expectedScanId) {
      applied = {
        ...applied,
        scanId: expectedScanId,
        batchResult: null,
        checkedRevision: null,
        excludedLayerObjectIds: [],
        ignoredTranslationRowIds: [],
        forcedBindingsByLang: {},
        pending: EMPTY_TRIO,
        committed: null,
        pendingDirty: false,
        batchReview: null,
        batchReviewRunning: false,
        retryingLanguage: null,
      }
    }

    if (applied) {
      draftSnapshotsRef.current[nextKey] = applied
      activeDraftScanIdRef.current =
        expectedScanId !== undefined ? expectedScanId : applied.scanId
      setTargetLanguages(applied.targetLanguages)
      setEditedTranslations(applied.editedTranslations)
      setSheetExtrasByLanguage(applied.sheetExtrasByLanguage)
      setReviewedLanguageDigests(applied.reviewedLanguageDigests)
      setReviewDecisionsByLanguage(applied.reviewDecisionsByLanguage)
      setBatchReview(applied.batchReview)
      setBatchReviewRunning(applied.batchReviewRunning)
      setRetryingLanguage(applied.retryingLanguage)
      setCheckedRevision(applied.checkedRevision)
      setBatchResult(applied.batchResult)
      setExcludedLayerObjectIds(applied.excludedLayerObjectIds)
      setIgnoredTranslationRowIds(applied.ignoredTranslationRowIds)
      setForcedBindingsByLang(applied.forcedBindingsByLang)
      setAppliedReviewCount(applied.appliedReviewCount)
      setCurrentLanguage(applied.currentLanguage)
      pendingRef.current = applied.pending
      committedRef.current = applied.committed
      pendingDirtyRef.current = applied.pendingDirty
      decisionsRestoredRef.current = Boolean(applied.committed)
    } else {
      activeDraftScanIdRef.current = expectedScanId !== undefined ? expectedScanId : null
      const entry = (multiPsdSelection?.entries ?? []).find(
        (item) => draftKeyOfMasterPath(item.masterPath) === nextKey,
      )
      const fingerprint = entry?.summary?.fingerprint ?? psdSelection?.summary?.fingerprint
      const initialLanguages = deriveLanguages({
        live: null,
        tableColumns: table?.languageColumns ?? [],
        excluded: exclusionsFor(languageExclusions, fingerprint),
      })
      setTargetLanguages(initialLanguages)
      setEditedTranslations({})
      setSheetExtrasByLanguage({})
      setReviewedLanguageDigests({})
      setReviewDecisionsByLanguage({})
      setBatchReview(null)
      setBatchReviewRunning(false)
      setRetryingLanguage(null)
      setCheckedRevision(null)
      setBatchResult(null)
      setExcludedLayerObjectIds([])
      setIgnoredTranslationRowIds([])
      setForcedBindingsByLang({})
      setAppliedReviewCount(0)
      setCurrentLanguage(initialLanguages[0] ?? null)
      pendingRef.current = EMPTY_TRIO
      committedRef.current = null
      pendingDirtyRef.current = false
      decisionsRestoredRef.current = false
    }
  }

  /**
   * 切到某个设计稿的会话。
   * - 从单稿模式第一次进批量：把「尚未绑定设计稿」的译表连同现场一起过继给该稿；
   * - 两稿之间：存旧稿快照、灌新稿快照（scanId 不一致时只清证据，不吞译表）。
   */
  const activateDraft = (nextKey: string, options?: { scanId?: string | null }) => {
    const prevKey = activeDraftKeyRef.current
    if (prevKey === nextKey) return
    let tables = parsedTablesRef.current
    let snapshot = draftSnapshotsRef.current[nextKey] ?? null
    const live = captureLiveDraft()
    draftSnapshotsRef.current[prevKey] = live
    setInactiveDraftSnapshots((previous) => {
      const next = { ...previous, [prevKey]: live }
      delete next[nextKey]
      return next
    })
    if (
      prevKey === SINGLE_DRAFT_KEY &&
      nextKey !== SINGLE_DRAFT_KEY &&
      !tables[nextKey] &&
      tables[SINGLE_DRAFT_KEY]
    ) {
      tables = { ...tables, [nextKey]: tables[SINGLE_DRAFT_KEY] }
      delete tables[SINGLE_DRAFT_KEY]
      setParsedTables(tables)
      snapshot = live
      draftSnapshotsRef.current[nextKey] = live
    }
    activeDraftKeyRef.current = nextKey
    setActiveDraftKey(nextKey)
    setParsedTables(tables)
    applyDraftSnapshot(nextKey, snapshot, tables[nextKey] ?? null, options?.scanId)
  }
  /** 多稿 → 单稿：把保留下来的那一稿连同译表与会话现场搬进 SINGLE 槽。 */
  const moveDraftToSingle = (sourceKey: string | null) => {
    const prevKey = activeDraftKeyRef.current
    let tables = parsedTablesRef.current
    let snapshot: DraftRuntimeSnapshot | null = null
    if (sourceKey && sourceKey !== SINGLE_DRAFT_KEY) {
      if (sourceKey === prevKey) {
        snapshot = captureLiveDraft()
        draftSnapshotsRef.current[sourceKey] = snapshot
      } else {
        snapshot = draftSnapshotsRef.current[sourceKey] ?? null
      }
      if (tables[sourceKey]) {
        tables = { ...tables, [SINGLE_DRAFT_KEY]: tables[sourceKey] }
        delete tables[sourceKey]
        setParsedTables(tables)
      }
      if (snapshot) draftSnapshotsRef.current[SINGLE_DRAFT_KEY] = snapshot
      else delete draftSnapshotsRef.current[SINGLE_DRAFT_KEY]
    } else {
      snapshot =
        prevKey === SINGLE_DRAFT_KEY
          ? captureLiveDraft()
          : (draftSnapshotsRef.current[SINGLE_DRAFT_KEY] ?? null)
    }
    setInactiveDraftSnapshots((previous) => {
      const next = { ...previous }
      delete next[SINGLE_DRAFT_KEY]
      if (sourceKey) delete next[sourceKey]
      return next
    })
    activeDraftKeyRef.current = SINGLE_DRAFT_KEY
    setActiveDraftKey(SINGLE_DRAFT_KEY)
    applyDraftSnapshot(
      SINGLE_DRAFT_KEY,
      snapshot,
      tables[SINGLE_DRAFT_KEY] ?? null,
      undefined,
    )
  }

  const commitExcluded = (next: string[]) => {
    pendingRef.current = { ...pendingRef.current, excludedLayerObjectIds: next }
    setExcludedLayerObjectIds(next)
    pendingDirtyRef.current = true
  }
  const commitIgnored = (next: string[]) => {
    pendingRef.current = { ...pendingRef.current, ignoredTranslationRowIds: next }
    setIgnoredTranslationRowIds(next)
    pendingDirtyRef.current = true
  }
  const commitForced = (next: Record<string, ForcedBinding[]>) => {
    pendingRef.current = { ...pendingRef.current, forcedBindingsByLang: next }
    setForcedBindingsByLang(next)
    pendingDirtyRef.current = true
  }

  // ─── 派生：批量响应 → 每语言视图（既有板块全部继续消费 check/checks）───────
  const checks = useMemo((): Record<string, PrepareCheckResult | null> => {
    if (!batchResult) return {}
    return Object.fromEntries(
      targetLanguages.map((lang) => [lang, toPrepareCheckResult(batchResult, lang)]),
    )
  }, [batchResult, targetLanguages])

  // 任务准备台判定"译文在 PSD 中无对应对象"的行（全语言汇总）。
  // 执行与计费投影必须与助手 evidence（按真实绑定排除）一致，否则报价明细对不上
  // （v3-batch-flow BATCH_BILLING_BREAKDOWN_MISMATCH 修复）。
  // 优先读助手给的全量 id：items 里的 unmatched 条目有 50 条上限，按它派生会在
  // 大量未命中行时截断（F10）；旧助手不返回该字段时回退到 items。
  const unmatchedTranslationRowIds = useMemo(() => {
    const keys = new Set<string>()
    for (const lang of targetLanguages) {
      const c = checks[lang]
      if (!c) continue
      if (c.unmatchedTranslationRowIds && c.unmatchedTranslationRowIds.length > 0) {
        for (const rowId of c.unmatchedTranslationRowIds) keys.add(rowId)
        continue
      }
      for (const item of c.items) {
        if (item.kind === 'unmatched' && item.translationRowId) keys.add(item.translationRowId)
      }
    }
    return [...keys]
  }, [checks, targetLanguages])

  // P1-A 译前溢出风险（S0 例外制，只提示不阻断）：扫描排版数据 × 各语言已绑定译文。
  // 防回归（2026-09-17）：typographyLayers 的键必须是派生 objectId（obj_ 前缀），
  // 历史上助手写过 ledgerEntryId → 前端恒 miss、提示永不触发。
  const typographyByObjectId = useMemo(() => {
    const map: Record<string, OverflowTypography | null | undefined> = {}
    for (const layer of psdSelection?.summary?.typographyLayers ?? []) {
      if (!layer.objectId.startsWith('obj_')) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            '[typography] key 口径不符（期望 obj_ 前缀）：',
            layer.objectId,
          )
        }
        continue
      }
      map[layer.objectId] = (layer.typography ?? null) as OverflowTypography | null
    }
    return map
  }, [psdSelection?.summary])

  // P2 的"本稿字号分布"块已按 Owner 2026-10-27 令撤下（改做按源稿分组配字体）：
  // 读数不再单占一块，随每一组的行给出（组＝源稿脸名，② 才叠读数）。

  const overflowRisk = useMemo(() => {
    const items: OverflowRiskItemInput[] = []
    for (const lang of targetLanguages) {
      const c = checks[lang]
      if (!c) continue
      for (const item of c.items) {
        if (item.kind !== 'bound' || !item.objectId || !item.targetText?.trim()) continue
        items.push({
          language: lang,
          objectId: item.objectId,
          layerLabel: item.layerLabel,
          groupLabel: item.groupLabel,
          sourcePreview: item.sourcePreview,
          targetText: item.targetText,
          sourceLineCount: item.sourceLineCount,
          targetLineCount: item.targetLineCount,
        })
      }
    }
    return collectOverflowRisks({ items, typographyByObjectId })
  }, [checks, targetLanguages, typographyByObjectId])

  useEffect(() => {
    trackFunnelEvent('app_opened', { currentStep: 'workbench_opened' })
    trackFunnelEvent('onboarding_started', { currentStep: 'onboarding_started' })
  }, [])

  useEffect(() => {
    if (initialDraft) {
      trackFunnelEvent('draft_restored', { currentStep: 'draft_restored' })
    }
  }, [initialDraft])

  useEffect(() => {
    if (!parsed || targetLanguages.length === 0) return
    writeWorkbenchDraft({
      savedAt: new Date().toISOString(),
      step: Math.min(2, 2) as 1 | 2 | 3,
      parsed,
      targetLanguage: targetLanguages[0],
      targetLanguages,
      editedTranslations,
      designFileNeedsRevalidation: !isPsdSelectionReady(psdSelection),
    })
  }, [editedTranslations, parsed, psdSelection, targetLanguages])

  // ─── 派生：单语言视图 ───────────────────────────────────────────────────────
  const check = currentLanguage ? (checks[currentLanguage] ?? null) : null
  // #55：第 4 步「仅当前语言」跟随智能检测阶段选择的当前语言；当前语言缺失/已被移出集合时回退第一个语言。
  const deliveryLanguage =
    currentLanguage && targetLanguages.includes(currentLanguage)
      ? currentLanguage
      : targetLanguages[0]
  const blockedItems = useMemo(
    () => groupBlockingItems(check?.items ?? []),
    [check],
  )
  const checkSummary = useMemo(
    () => summarizePrepareChecks(checks, targetLanguages),
    [checks, targetLanguages],
  )
  const forcedBindings = currentLanguage
    ? (forcedBindingsByLang[currentLanguage] ?? [])
    : []

  const translationsFor = useCallback((lang: string) => {
    if (!parsed) return []
    const langEdits = editedTranslations[lang] ?? {}
    const rowIds = stableTranslationRowIds(parsed)
    const extras = (sheetExtrasByLanguage[lang] ?? []).map((row, index) => ({
      rowId: `sheet-extra:${index}`,
      rowIndex: parsed.rows.length + index + 1,
      source: row.source,
      target: row.target,
    }))
    return [
      ...parsed.rows
        .map((row, idx) => {
          const edited = langEdits[idx + 1]
          const target = edited ?? row.translations[lang] ?? ''
          return {
            rowId: rowIds[idx],
            rowIndex: idx + 1,
            source: row.source,
            target,
          }
        })
        .filter((t) => t.source.trim() !== ''),
      ...extras.filter((t) => t.source.trim() !== ''),
    ]
  }, [editedTranslations, parsed, sheetExtrasByLanguage])

  // S2：工作表改动回流——原表行按 legacy rowId 对位写回 editedTranslations（只写有变化的），补译追加行进入 sheetExtras。
  const handleSheetDocumentChange = useCallback(
    (language: string, document: WorkingDocument) => {
      if (!parsed) return
      const sourceColumn = document.columns.find((column) => column.kind === 'source')
      const targetColumn = document.columns.find(
        (column) => column.kind === 'target' && column.languageCode === language,
      )
      if (!sourceColumn || !targetColumn) return
      const indexByRowId = new Map(
        parsed.rows.map((row, index) => [legacyRowId(index, row.source), index]),
      )
      const edits: Record<number, string> = {}
      const extras: { source: string; target: string }[] = []
      for (const row of document.rows) {
        const source = row.cells[sourceColumn.columnId] ?? ''
        const target = row.cells[targetColumn.columnId] ?? ''
        const index = indexByRowId.get(row.rowId)
        if (index === undefined) {
          extras.push({ source, target })
          continue
        }
        const current =
          editedTranslations[language]?.[index + 1] ??
          parsed.rows[index].translations[language] ??
          ''
        if (current !== target) edits[index + 1] = target
      }
      if (Object.keys(edits).length > 0) {
        setEditedTranslations((previous) => ({
          ...previous,
          [language]: { ...(previous[language] ?? {}), ...edits },
        }))
      }
      setSheetExtrasByLanguage((previous) => ({ ...previous, [language]: extras }))
    },
    [editedTranslations, parsed],
  )

  // R2-a：按行"不翻译"。决定作用域=全部语言（沿用既有 ignoredTranslationRowIds 口径，不新建第二套排除），
  // 入口在对象详情抽屉与译表工作稿的「已标不翻译」条，两处都能撤回。
  const assessRow = useCallback(
    (rowId: string | null | undefined) =>
      parsed && rowId
        ? assessRowExclusion({
            parsed,
            rowId,
            languages: targetLanguages,
            editedTranslationsByLanguage: editedTranslations,
          })
        : null,
    [parsed, targetLanguages, editedTranslations],
  )

  const inspectorRowExclusion = useMemo(() => {
    const assessment = assessRow(inspectorItem?.translationRowId)
    if (!assessment) return null
    // 未匹配行没有可绑对象，本来一行也不会写进设计稿 ⇒ 排除它不丢内容，别用"会退出已有译文"吓人。
    const unbound = inspectorItem?.kind === 'unmatched'
    return {
      rowId: assessment.rowId,
      safeToExclude: unbound ? true : assessment.safeToExclude,
      languagesWithText: unbound ? [] : assessment.languagesWithText,
      alreadyIgnored: ignoredTranslationRowIds.includes(assessment.rowId),
    }
  }, [assessRow, inspectorItem, ignoredTranslationRowIds])

  const ignoredRowsForSheet = useMemo(() => {
    if (!parsed) return []
    const rowIds = stableTranslationRowIds(parsed)
    return ignoredTranslationRowIds.flatMap((rowId) => {
      const assessment = assessRow(rowId)
      if (!assessment) return []
      const index = rowIds.indexOf(rowId)
      return [
        {
          rowId,
          sourcePreview: parsed.rows[index]?.source.slice(0, 60) ?? '',
          languagesWithText: assessment.languagesWithText,
        },
      ]
    })
  }, [parsed, ignoredTranslationRowIds, assessRow])

  const handleToggleRowExclusion = (rowId: string) => {
    const keys = new Set(ignoredTranslationRowIds)
    const removing = keys.has(rowId)
    if (removing) keys.delete(rowId)
    else keys.add(rowId)
    commitIgnored([...keys].sort())
    const scanId = psdSelection?.scanId
    if (!removing && scanId) {
      void bufferLearningSignal({
        scanId,
        objectId: rowId,
        decisionFamily: 'translation_row_exclusion',
        actionCode: 'ignored',
      })
    }
    setStageNotice(
      removing
        ? t('这行已恢复写入和计费。生成前请重新确认范围。')
        : t('这行在全部语言中都不写入、不计费。生成前请重新确认范围；可在译表工作稿中恢复。'),
    )
  }

  const languageDigests = useMemo(() => {
    if (!parsed) return {}
    return Object.fromEntries(
      targetLanguages.map((language) => [
        language,
        translationLanguageDigest(
          parsed,
          language,
          editedTranslations[language] ?? {},
          sheetExtrasByLanguage[language] ?? [],
        ),
      ]),
    )
  }, [editedTranslations, parsed, sheetExtrasByLanguage, targetLanguages])

  // T-0062 自动确认：与 ReviewStep.multiLangSummary 同口径，逐语言跑确定性
  // 审查引擎；0 待处理行的语言无需人工「确认当前语言并继续」。编辑会同时
  // 改变 digest 与待处理数，自动解除确认，安全性质与人工确认一致。
  const languagePendingIssueCounts = useMemo(() => {
    if (!parsed) return {} as Record<string, number>
    return Object.fromEntries(
      targetLanguages.map((language) => {
        const langReview = buildReview({
          rows: parsed.rows.map((r, idx) => ({
            source: r.source,
            translations: {
              ...r.translations,
              [language]: editedTranslations[language]?.[idx + 1] ?? r.translations[language] ?? '',
            },
          })),
          targetLanguage: language,
        })
        const pending = langReview.rows.filter(
          (row) =>
            !isSmartReviewTechnicalMetadataRow({
              sourceText: row.sourceText,
              translatedText: row.translatedText ?? '',
            }) && row.warnings.length > 0,
        ).length
        return [language, pending]
      }),
    )
  }, [editedTranslations, parsed, targetLanguages])

  const checkRevision = useMemo(
    () =>
      JSON.stringify({
        scanId: psdSelection?.scanId ?? null,
        languages: targetLanguages.map((language) => ({
          language,
          translations: translationsFor(language),
          forcedBindings: forcedBindingsByLang[language] ?? [],
        })),
        excludedLayerObjectIds,
        ignoredTranslationRowIds,
      }),
    [
      excludedLayerObjectIds,
      ignoredTranslationRowIds,
      forcedBindingsByLang,
      psdSelection?.scanId,
      targetLanguages,
      translationsFor,
    ],
  )

// 门禁与主按钮只认批量摘要的跨语言去重阻断组数（P0-C-2：唯一聚合器口径）
  const decisionCount = batchResult?.summary.decisionCount ?? 0
  const totalBlocked = decisionCount

const totalSuggestion = checkSummary.suggestionCount

  const totalAutoApplied = useMemo(() => {
    let total = 0
    for (const lang of targetLanguages) {
      const c = checks[lang]
      if (c) total += c.boundCount
    }
    return total
  }, [checks, targetLanguages])

  const totalSourceChanged = checkSummary.sourceChanges.length
  const overview = {
    missing: checkSummary.missingObjects.length,
    unmatched: checkSummary.unmatchedRows.length,
    ambiguousGroups: checkSummary.ambiguousGroups.length,
    duplicateGroups: checkSummary.duplicateGroups.length,
    changed: checkSummary.sourceChanges.length,
    invalidTargetByLang: checkSummary.invalidTargetByLanguage,
    writableTotal: checkSummary.writableCount,
  }
  // 展示层派生（不参与门禁）：目标译文为空的条数合计与是否需要「要你决定」卡
  const invalidTargetTotal = targetLanguages.reduce(
    (sum, lang) => sum + (overview.invalidTargetByLang[lang] ?? 0),
    0,
  )
  const needsDecisionCard =
    overview.changed > 0 ||
    overview.ambiguousGroups > 0 ||
    overview.duplicateGroups > 0 ||
    invalidTargetTotal > 0
  // 折叠层用：逐语言要你决定几处（tabs 上原来直接把数字摊在屏上）
  const blockedCountByLanguage = targetLanguages.flatMap((lang) => {
    const result = checks[lang]
    if (!result) return []
    const count = groupBlockingItems(result.items).length
    return count > 0 ? [{ lang, count }] : []
  })

  // 差集只形成一次材料范围确认；高差异时升级措辞，但不逐语言轰炸。
  const materialMismatch = useMemo(() => {
    if (!checkSummary.scopeNeedsConfirmation || overview.writableTotal === 0) return false
    const ratio = overview.missing / overview.writableTotal
    const totalDiff = overview.missing + overview.unmatched
    return (ratio > 0.3 && totalDiff >= 3) || totalDiff >= 10
  }, [checkSummary.scopeNeedsConfirmation, overview.missing, overview.unmatched, overview.writableTotal])

  // S2：对账单 / 补译清单导出（当前语言；纯本地导出，不写服务端）。
  const handleExportReconcile = (kind: 'statement' | 'replenish') => {
    if (!currentLanguage) return
    const items = (checks[currentLanguage]?.items ?? []).map((item) => ({
      kind: item.kind,
      severity: item.severity,
      code: item.code,
      objectId: item.objectId,
      translationRowId: item.translationRowId ?? null,
      groupLabel: item.groupLabel,
      layerLabel: item.layerLabel,
      sourcePreview: item.sourcePreview,
      combinedSourceRows: item.combinedSourceRows,
    }))
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    if (kind === 'replenish') {
      downloadTextFile(
        t('缺译对象清单_{currentLanguage}_{stamp}.csv', { currentLanguage: String(currentLanguage), stamp: String(stamp) }),
        `\ufeff${buildReplenishCsv(items)}`,
        'text/csv',
      )
      return
    }
    const statement = buildReconciliationStatement({
      documentId: psdSelection?.scanId ?? 'no-scan',
      revision: checkRevision,
      scanId: psdSelection?.scanId ?? null,
      language: currentLanguage,
      generatedAt: new Date().toISOString(),
      summary: {
        missing: overview.missing,
        unmatched: overview.unmatched,
        sourceChanged: overview.changed,
        ambiguousGroups: overview.ambiguousGroups,
        duplicateGroups: overview.duplicateGroups,
        combined: items.filter((item) => item.kind === 'combined').length,
        excluded: excludedLayerObjectIds.length,
        ignored: ignoredTranslationRowIds.length,
        ready: totalBlocked === 0 && allChecksDone,
      },
      items,
      // S3：界面上不再展示的估算宽度比与判据定义，完整落到对账单（审计层）
      overflowRisks: overflowRisk.all.filter((risk) => risk.language === currentLanguage),
    })
    downloadTextFile(t('对账单_{currentLanguage}_{stamp}.md', { currentLanguage: String(currentLanguage), stamp: String(stamp) }), statement, 'text/markdown')
  }

  // P1：语言级批次状态写入口（函数式更新，单语言重跑与整批共用）
  const setLanguageReviewStatus = (
    language: string,
    status: { phase: string; notes?: number; suggestions?: number; omitted?: number; error?: string },
  ) =>
    setBatchReview((previous) =>
      previous
        ? { ...previous, statuses: { ...previous.statuses, [language]: status } }
        : previous,
    )

  const activationReviewFields = () => {
    const activation = readWorkbenchActivation()
    return {
      anonymousInstallId: activation?.anonymousInstallId,
      usagePrefix: activation?.anonymousInstallId
        ? `TYGF-${activation.anonymousInstallId.slice(0, 8)}`
        : undefined,
    }
  }

  // S3：单语言检测（整批与单语言重跑共用；失败只标记该语言，不伪造成整批失败）
  const runLanguageReview = async (
    language: string,
    batchId: string,
    activationFields: { anonymousInstallId?: string; usagePrefix?: string },
  ) => {
    // v7：结果只写回发起时的那一稿；切稿后迟到的回包不得污染新稿。
    const reviewDraftKey = activeDraftKeyRef.current
    const writeStatus = (status: LanguageReviewStatus) => {
      if (activeDraftKeyRef.current !== reviewDraftKey) return
      setLanguageReviewStatus(language, status)
    }
    writeStatus({ phase: 'running' })
    try {
      const issueKindsByRowId = new Map<string, string[]>()
      for (const item of checks[language]?.items ?? []) {
        if (!item.translationRowId) continue
        const kinds = issueKindsByRowId.get(item.translationRowId) ?? []
        if (!kinds.includes(item.kind)) kinds.push(item.kind)
        issueKindsByRowId.set(item.translationRowId, kinds)
      }
      const rowIdByRowIndex = new Map(
        translationsFor(language).map((translation) => [
          translation.rowIndex,
          translation.rowId,
        ]),
      )
      const fitted = fitSmartReviewPayload(
        buildReview({
          rows: translationsFor(language).map((translation) => ({
            source: translation.source,
            translations: { [language]: translation.target },
          })),
          targetLanguage: language,
        }).rows
          .filter(
            (row) =>
              !(!row.sourceText.trim() && !(row.translatedText ?? '').trim()),
          )
          .map((row) => {
            const rowId = rowIdByRowIndex.get(row.rowIndex)
            const reconciliationIssueKinds = rowId
              ? issueKindsByRowId.get(rowId)
              : undefined
            return {
              rowIndex: row.rowIndex,
              sourceText: row.sourceText,
              translatedText: row.translatedText ?? '',
              warnings: row.warnings,
              ...(reconciliationIssueKinds
                ? { reconciliationIssueKinds }
                : {}),
            }
          }),
      )
      const rows = fitted.rows
      const actionKey = crypto.randomUUID()
      type ReviewResponse = {
        ok?: boolean
        status?: 'QUEUED' | 'RUNNING'
        correlationId?: string
        message?: string
        notes?: string[]
        suggestions?: unknown[]
      }
      let res = await fetch('/api/workbench/ai-review', {
        method: 'POST',
        headers: workbenchAuthHeaders({
          'Content-Type': 'application/json',
          'Idempotency-Key': actionKey,
        }),
        body: JSON.stringify({ rows, targetLanguage: language, batchId, ...activationFields }),
      })
      let data = await readWorkbenchApiResponse<ReviewResponse>(res, WB_TERMS.smartReview)
      const startedAt = Date.now()
      while (res.status === 202 && data?.ok && data.correlationId) {
        if (activeDraftKeyRef.current !== reviewDraftKey) return
        if (Date.now() - startedAt > 15 * 60 * 1000) {
          throw new Error(t('后台处理超时，请稍后回到该语言查看结果。'))
        }
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 2_000)
        })
        res = await fetch('/api/workbench/ai-review/status', {
          method: 'POST',
          headers: workbenchAuthHeaders({
            'Content-Type': 'application/json',
            'Idempotency-Key': actionKey,
          }),
          body: JSON.stringify({ correlationId: data.correlationId, ...activationFields }),
        })
        data = await readWorkbenchApiResponse<ReviewResponse>(res, WB_TERMS.smartReview)
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || t('该语言审查未完成'))
      }
      writeStatus({
        phase: 'succeeded',
        notes: data.notes?.length ?? 0,
        suggestions: data.suggestions?.length ?? 0,
        ...(fitted.omittedRows > 0 ? { omitted: fitted.omittedRows } : {}),
      })
    } catch (error) {
      writeStatus({
        phase: 'failed',
        error: error instanceof Error ? error.message : t('未知错误'),
      })
    }
  }

  const refreshBatchAggregate = async (batchId: string) => {
    try {
      const statusRes = await fetch(
        `/api/workbench/ai-review/batch?batchId=${encodeURIComponent(batchId)}`,
        { headers: workbenchAuthHeaders() },
      )
      const statusData = await readWorkbenchApiResponse<{
        aggregate?: { state?: string; manualLanguages?: string[] }
      }>(statusRes, t('批次状态'))
      if (statusRes.ok && statusData?.aggregate?.state) {
        const state = statusData.aggregate.state
        setBatchReview((previous) =>
          previous ? { ...previous, aggregate: state } : previous,
        )
      }
    } catch {
      // 聚合状态只用于展示；服务端语言事实不受影响
    }
  }

  // 检测全部语言——一次启动全部选定语言（每语言一个批次子任务），逐语言显示进度与失败原因。
  const handleRunAllLanguageReview = async () => {
    if (!parsed || targetLanguages.length === 0 || batchReviewRunning) return
    if (!requireAccount('ai-review')) return
    const reviewDraftKey = activeDraftKeyRef.current
    setBatchReviewRunning(true)
    const activationFields = activationReviewFields()
    try {
      const openRes = await fetch('/api/workbench/ai-review/batch', {
        method: 'POST',
        headers: workbenchAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          scanId: psdSelection?.scanId ?? null,
          revisionKey: digestWorkbenchValue(checkRevision),
          contentDigest: translationDigestFor(),
          languages: targetLanguages,
          round: 0,
          ...activationFields,
        }),
      })
      const opened = await readWorkbenchApiResponse<{
        ok?: boolean
        batchId?: string
        message?: string
      }>(openRes, WB_TERMS.smartReview)
      if (!openRes.ok || !opened?.batchId) {
        throw new Error(opened?.message || t('批次创建失败，未启动任何语言。'))
      }
      const batchId = opened.batchId
      setBatchReview({
        batchId,
        aggregate: 'processing',
        statuses: Object.fromEntries(
          targetLanguages.map((language) => [language, { phase: 'queued' }]),
        ),
      })
      for (const language of targetLanguages) {
        if (activeDraftKeyRef.current !== reviewDraftKey) break
        await runLanguageReview(language, batchId, activationFields)
      }
      if (activeDraftKeyRef.current === reviewDraftKey) {
        await refreshBatchAggregate(batchId)
      }
    } catch (error) {
      if (activeDraftKeyRef.current !== reviewDraftKey) return
      const message = error instanceof Error ? error.message : t('检测全部语言失败')
      // 批次级失败：不把开批失败伪造成"每个语言都失败"
      setBatchReview({ batchId: '', aggregate: 'failed', error: message, statuses: {} })
    } finally {
      if (activeDraftKeyRef.current === reviewDraftKey) setBatchReviewRunning(false)
    }
  }

  // P1：单语言重跑——仅失败/未知语言的显式人工处置（不自动重试）；新开单语言批次避免同批复用旧的失败事实。
  const handleRunSingleLanguageReview = async (language: string) => {
    if (!parsed || batchReviewRunning || retryingLanguage) return
    if (!requireAccount('ai-review')) return
    const reviewDraftKey = activeDraftKeyRef.current
    setRetryingLanguage(language)
    const activationFields = activationReviewFields()
    try {
      const openRes = await fetch('/api/workbench/ai-review/batch', {
        method: 'POST',
        headers: workbenchAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          scanId: psdSelection?.scanId ?? null,
          revisionKey: digestWorkbenchValue(checkRevision),
          contentDigest: translationDigestFor(),
          languages: [language],
          round: 0,
          ...activationFields,
        }),
      })
      const opened = await readWorkbenchApiResponse<{
        ok?: boolean
        batchId?: string
        message?: string
      }>(openRes, WB_TERMS.smartReview)
      if (!openRes.ok || !opened?.batchId) {
        throw new Error(opened?.message || t('重跑失败：批次创建失败。'))
      }
      setBatchReview((previous) =>
        previous
          ? { ...previous, error: undefined, statuses: { ...previous.statuses, [language]: { phase: 'queued' } } }
          : { batchId: opened.batchId as string, aggregate: 'processing', statuses: { [language]: { phase: 'queued' } } },
      )
      await runLanguageReview(language, opened.batchId, activationFields)
      if (activeDraftKeyRef.current !== reviewDraftKey) return
      // 单语言批次不在原批次聚合内：按客户端语言事实重算聚合显示
      setBatchReview((previous) => {
        if (!previous) return previous
        const phases = Object.values(previous.statuses).map((status) => status.phase)
        const aggregate = phases.some((phase) => phase === 'unknown')
          ? 'contains_unknown'
          : phases.some((phase) => phase === 'failed')
            ? 'partial_failure'
            : phases.length > 0 && phases.every((phase) => phase === 'succeeded')
              ? 'completed'
              : 'processing'
        return { ...previous, aggregate }
      })
    } catch (error) {
      if (activeDraftKeyRef.current !== reviewDraftKey) return
      const message = error instanceof Error ? error.message : t('重跑这一语言失败')
      setBatchReview((previous) =>
        previous
          ? { ...previous, error: message }
          : { batchId: '', aggregate: 'failed', error: message, statuses: {} },
      )
    } finally {
      if (activeDraftKeyRef.current === reviewDraftKey) setRetryingLanguage(null)
    }
  }
// 版式例外清单逐条处置：复用既有对象级排除决策（作用域=全部语言），只在新增排除时留学习信号。
  const handleToggleLayoutExclusion = (objectId: string) => {
    const keys = new Set(excludedLayerObjectIds)
    if (keys.has(objectId)) {
      keys.delete(objectId)
      commitExcluded([...keys].sort())
      return
    }
    keys.add(objectId)
    commitExcluded([...keys].sort())
    const scanId = psdSelection?.scanId
    if (!scanId) return
    void bufferLearningSignal({
      scanId,
      objectId,
      decisionFamily: 'layer_scope_exclusion',
      actionCode: 'excluded',
      contextFeatures: { stage: 'layout_exception_list' },
      semantic: 'human_confirmed',
      scopeHints: { templateFingerprint: psdSelection?.summary?.fingerprint ?? null },
    })
  }
  // 一键：按稳定 objectId 排除全部未替换对象；同文案的其他图层不受影响。
  const handleExcludeMissing = () => {
    const keys = new Set(excludedLayerObjectIds)
    const newlyExcluded: string[] = []
    for (const lang of targetLanguages) {
      const c = checks[lang]
      if (!c) continue
      for (const item of c.items) {
        if (item.kind === 'missing' && item.objectId && !keys.has(item.objectId)) {
          keys.add(item.objectId)
          newlyExcluded.push(item.objectId)
        }
      }
    }
    commitExcluded([...keys])
    // P1-2 学习采集（限流 20 条/次，best-effort）：用户显式确认的图层范围排除。
    const scanId = psdSelection?.scanId
    if (scanId) {
      for (const objectId of newlyExcluded.slice(0, 20)) {
        void bufferLearningSignal({
          scanId,
          objectId,
          decisionFamily: 'layer_scope_exclusion',
          actionCode: 'excluded',
          contextFeatures: { stage: 'scope_confirm' },
          semantic: 'human_confirmed',
          scopeHints: { templateFingerprint: psdSelection?.summary?.fingerprint ?? null },
        })
      }
    }
  }

  // 一键：按原始 rowId 忽略全部多余译文行；不按原文批量吞掉重复行。
  // 用全量清单（含 >50 的部分），与计费投影同一来源。
  const handleIgnoreUnmatched = () => {
    const keys = new Set(ignoredTranslationRowIds)
    const newlyIgnored: string[] = []
    for (const rowId of unmatchedTranslationRowIds) {
      if (keys.has(rowId)) continue
      keys.add(rowId)
      newlyIgnored.push(rowId)
    }
    commitIgnored([...keys])
    // P1-2 学习采集（限流 20 条/次，best-effort）：用户显式忽略的译文行。
    const scanId = psdSelection?.scanId
    if (scanId) {
      for (const rowId of newlyIgnored.slice(0, 20)) {
        void bufferLearningSignal({
          scanId,
          objectId: rowId,
          decisionFamily: 'translation_row_exclusion',
          actionCode: 'ignored',
          contextFeatures: { stage: 'scope_confirm' },
          semantic: 'human_confirmed',
          scopeHints: { templateFingerprint: psdSelection?.summary?.fingerprint ?? null },
        })
      }
    }
  }

  const openIssueKind = (kinds: PrepareCheckItem['kind'][]) => {
    for (const lang of targetLanguages) {
      const item = checks[lang]?.items.find((entry) => kinds.includes(entry.kind))
      if (!item) continue
      setCurrentLanguage(lang)
      setIssuesOpen(true)
      setInspectorItem(item)
      return
    }
  }
// ─── 阶段派生 ───────────────────────────────────────────────────────────────
  const preparationDone =
    !!parsed && targetLanguages.length > 0 && isPsdSelectionReady(psdSelection)
  const allChecksDone =
    targetLanguages.length > 0 &&
    targetLanguages.every((lang) => checks[lang] != null) &&
    checkedRevision === checkRevision
  // 批量请求只发非空源行；targetsByLanguage 由 translationsFor 同行过滤，rowId 一致。
  const batchSourceRows = useMemo(() => {
    if (!parsed) return []
    const rowIds = stableTranslationRowIds(parsed)
    return parsed.rows
      .map((row, idx) => ({
        rowId: rowIds[idx] ?? `row-${idx + 1}`,
        rowIndex: idx + 1,
        source: row.source,
      }))
      .filter((r) => r.source.trim() !== '')
  }, [parsed])
  // 与 checkRevision 同构的请求键：事务重查用 override 三元组即时计算，避免 setState 闭包陈旧
  const revisionKeyOf = useCallback(
    (trio: DecisionTrio) =>
      JSON.stringify({
        scanId: psdSelection?.scanId ?? null,
        languages: targetLanguages.map((language) => ({
          language,
          translations: translationsFor(language),
          forcedBindings: trio.forcedBindingsByLang[language] ?? [],
        })),
        excludedLayerObjectIds: trio.excludedLayerObjectIds,
        ignoredTranslationRowIds: trio.ignoredTranslationRowIds,
      }),
    [psdSelection?.scanId, targetLanguages, translationsFor],
  )
  const translationDigestFor = useCallback(
    () => targetLanguages.map((lang) => languageDigests[lang] ?? '').join('|'),
    [targetLanguages, languageDigests],
  )
  // 每语言显式状态机（P0-C-1）：idle / running / ready / error / stale
  const languageStates = useMemo((): Record<string, LanguageCheckState> => {
    const states: Record<string, LanguageCheckState> = {}
    for (const lang of targetLanguages) {
      if (batchLoading) states[lang] = 'running'
      else if (batchError) states[lang] = 'error'
      else if (!batchResult?.languageResults[lang]) states[lang] = 'idle'
      else if (checkedRevision !== checkRevision) states[lang] = 'stale'
      else states[lang] = 'ready'
    }
    return states
  }, [
    batchLoading,
    batchError,
    batchResult,
    targetLanguages,
    checkedRevision,
    checkRevision,
  ])
  // A4：isReady = 全部语言当前 + 无失败/stale（原子批量恒空）+ 无阻断组
  const isReady = Boolean(
    batchResult &&
      !batchLoading &&
      !batchError &&
      allChecksDone &&
      batchResult.summary.isReady,
  )
  const psReady =
    psState?.status === 'ready_to_execute' &&
    psState.adapterMode === 'local_assistant' &&
    isPsdSelectionReady(psdSelection)
  const readiness = deriveWorkbenchReadiness({
    translationCommitted: Boolean(parsed && targetLanguages.length > 0),
    designReady: isPsdSelectionReady(psdSelection),
    selectedLanguages: targetLanguages,
    languageDigests,
    reviewedLanguageDigests,
    reconcileCurrent: allChecksDone,
    reconcileReady: isReady,
    photoshopReady: psReady,
  })
  const derived = deriveWorkbenchState({
    translationCommitted: Boolean(parsed && targetLanguages.length > 0),
    designReady: isPsdSelectionReady(psdSelection),
    selectedLanguages: targetLanguages,
    languageDigests,
    reviewedLanguageDigests,
    reconcileCurrent: allChecksDone,
    reconcileReady: isReady,
    photoshopReady: psReady,
    blockingIssueCount: decisionCount,
  })
  // P1：未手动导航时，activeStage 跟随 machine 建议（自动推进）。
  // P-04：刷新恢复时 URL 已显式携带阶段，首次挂载跳过一轮，保证「刷新后仍在同一步」。
  const skipFirstAutoStageRef = useRef(stageFromUrl)
  useEffect(() => {
    if (skipFirstAutoStageRef.current) {
      skipFirstAutoStageRef.current = false
      return
    }
    if (!manualStageRef.current) setActiveStage(derived.activeStage)
  }, [derived.activeStage, setActiveStage])

  // P-04：URL 恢复的语言可能已不在当前语言集合（草稿变化或手工改地址），回落到第一个语言。
  useEffect(() => {
    if (!parsed || targetLanguages.length === 0) return
    if (currentLanguage && targetLanguages.includes(currentLanguage)) return
    setCurrentLanguage(targetLanguages[0] ?? null)
  }, [currentLanguage, parsed, setCurrentLanguage, targetLanguages])
  const deliveryOpen = readiness.deliveryOpen
  const reconciliationDone =
    readiness.reconcileOpen && allChecksDone && isReady && totalBlocked === 0

  // PS 预热：进入设计稿校对时后台自动检测，避免用户到最后一步才开始等
  const psPreheatRef = useRef(false)
  useEffect(() => {
    if (!readiness.reconcileOpen || psReady || psPreheatRef.current) return
    psPreheatRef.current = true
    let cancelled = false
    const warm = async () => {
      try {
        const assistant = await detectAssistant()
        if (cancelled) return
        if (assistant.psState.status === 'ready_to_execute') {
          setPsState(assistant.psState)
          return
        }
        try {
          const automation = await diagnosePhotoshopAutomation()
          if (!cancelled) setPsState(automation.psState)
        } catch {
          if (!cancelled) setPsState(assistant.psState)
        }
      } catch {
        // 助手不可达等静默：交付阶段仍会兜底提示
      }
    }
    void warm()
    return () => {
      cancelled = true
    }
  }, [readiness.reconcileOpen, psReady])

  // 访客：底部主按钮只负责往下走一步。他没登录、电脑上没有助手，扫描和生成都跑不了，
  // 所以不按「扫描设计稿」这类前置条件卡住（Owner 2026-10-29：要走到最后一步）。
  const guestNextStage: WorkbenchStage =
    activeStage === 'materials'
      ? 'translation_review'
      : activeStage === 'translation_review'
        ? 'design_reconcile'
        : 'delivery'
  const guestNextLabel =
    guestNextStage === 'translation_review'
      ? t(wbCopy.stageReview)
      : guestNextStage === 'design_reconcile'
        ? t(wbCopy.stageReconcile)
        : t(wbCopy.stageDelivery)
  const ctaLabel = isGuest
    ? t('下一步：{stage}', { stage: guestNextLabel })
    : batchLoading
      ? t('检查中…')
      : !parsed || targetLanguages.length === 0
        ? t('准备素材')
        : !readiness.allLanguagesReviewed
          ? t('审查原文与译文')
          : !isPsdSelectionReady(psdSelection)
            ? t('扫描设计稿')
            : !allChecksDone
              ? t('开始设计稿校对')
              : totalBlocked > 0
                ? t('处理 {count} 项 →', { count: totalBlocked })
                : !psReady
                  ? t('完成 Photoshop 检测 →')
                  : t('生成当前语言版本（{count} 个对象将替换{extra}）', {
                      count: check?.boundCount ?? 0,
                      extra:
                        check && check.excludedCount > 0
                          ? t(' · {count} 个保留原文（不替换）', { count: check.excludedCount })
                          : '',
                    })

  const mainCta = () => {
    if (isGuest) {
      goToStage(guestNextStage)
      return
    }
    if (!parsed || targetLanguages.length === 0) {
      goToStage('materials')
      return
    }
    if (!readiness.allLanguagesReviewed) {
      goToStage('translation_review')
      reviewHeadingRef.current?.focus({ preventScroll: true })
      return
    }
    if (!isPsdSelectionReady(psdSelection)) {
      goToStage('materials')
      return
    }
    if (!allChecksDone) {
      void runBatchCheck()
      goToStage('design_reconcile')
      return
    }
    if (totalBlocked > 0) {
      goToStage('design_reconcile')
      setIssuesOpen(true)
      return
    }
    if (!psReady) {
      goToStage('design_reconcile')
      return
    }
    goToStage('delivery')
  }

  const fileDotClass =
    psdSelection?.state === 'prepared'
      ? 'bg-emerald-500'
      : psdSelection?.state === 'needs_review' || psdSelection?.state === 'stale'
        ? 'bg-amber-500'
        : 'bg-zinc-400'

  // ─── 事件 ───────────────────────────────────────────────────────────────────
const handleParsedChange = (p: ParsedCsv | null) => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能替换译文表。请先核对原任务或完成积分退回。'))
      return
    }
    const sanitized = p ? removeEmptyParsedRows(p) : null
    // v7：只写当前稿的表槽——单稿模式是 SINGLE，批量模式是当前设计稿。
    // 其他设计稿的表与现场一律不动（F12：单稿替换是单事务）。
    const key = activeDraftKeyRef.current
    delete draftSnapshotsRef.current[key]
    setParsedTables((previous) => ({ ...previous, [key]: sanitized }))
    clearDecisionLog()
    clearCommittedDecisions()
    setEditedTranslations({})
    setReviewedLanguageDigests({})
    setReviewDecisionsByLanguage({})
    setPsState(null)
    psPreheatRef.current = false
    setExecutionAuthorized(false)
    commitForced({})
    commitExcluded([])
    commitIgnored([])
    pendingDirtyRef.current = false
    committedRef.current = null
    setBatchResult(null)
    setBatchError(null)
    setBatchLoading(false)
    setCheckedRevision(null)
    setReplaceTableOpen(false)
    setPendingReplacement(null)
    // 换表后该稿的智能检测批次也失效，避免旧语言的进度挂在新表上。
    setBatchReview(null)
    setBatchReviewRunning(false)
    setRetryingLanguage(null)
    autoCheckDoneRef.current = ''
    importReconcileRef.current = sanitized
    if (sanitized) {
      // 上传多语言主表 = 全部语言都要替换：自动全选语言列（可反选排除）
      setTargetLanguages(sanitized.languageColumns)
      setCurrentLanguage(sanitized.languageColumns[0] ?? null)
      goToStage('translation_review')
      setFocusReviewAfterImport(true)
      trackFunnelEvent('csv_loaded', {
        currentStep: 'csv_loaded',
        csvRowCount: sanitized.rows.length,
      })
    } else {
      setTargetLanguages([])
      setCurrentLanguage(null)
    }
  }

  useLayoutEffect(() => {
    if (!focusReviewAfterImport || !parsed) return
    goToStage('translation_review')
    reviewHeadingRef.current?.focus({ preventScroll: true })
    setFocusReviewAfterImport(false)
  }, [focusReviewAfterImport, parsed, goToStage])

  const addLanguage = (lang: string) => {
    setTargetLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]))
    setCurrentLanguage((cur) => cur ?? lang)
    setReviewedLanguageDigests((previous) => {
      const next = { ...previous }
      delete next[lang]
      return next
    })
    setReviewDecisionsByLanguage((previous) => {
      const next = { ...previous }
      delete next[lang]
      return next
    })
  }
const removeLanguage = (lang: string) => {
    const remaining = targetLanguages.filter((l) => l !== lang)
    setTargetLanguages(remaining)
    setCurrentLanguage((cur) => (cur === lang ? (remaining[0] ?? null) : cur))
    setBatchResult(null)
    setCheckedRevision(null)
    setReviewedLanguageDigests((previous) => {
      const next = { ...previous }
      delete next[lang]
      return next
    })
  }


const handlePsdSelectionChange = (next: PsdSelection | null) => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能更换或{label} PSD。请先核对原任务或完成积分退回。', { label: String(WB_ACTIONS.rescan.label) }))
      return
    }
    const previous = psdSelectionRef.current
    const evidenceChanged =
      previous?.masterPath !== next?.masterPath ||
      (Boolean(next?.scanId) && previous?.scanId !== next?.scanId)
    // v7：批量模式下证据属于「某个稿」。换到另一稿时灌回那一稿自己的现场；
    // 同一稿重扫只清这一稿的证据，绝不清别的稿。
    if (batchMode) {
      const nextKey = next?.masterPath
        ? draftKeyOfMasterPath(next.masterPath)
        : activeDraftKeyRef.current
      if (next?.masterPath && nextKey !== activeDraftKeyRef.current) {
        activateDraft(nextKey, { scanId: next.scanId ?? null })
        setPsdSelection(next)
        if (evidenceChanged) setExecutionAuthorized(false)
        return
      }
      setPsdSelection(next)
      if (!evidenceChanged) return
      invalidateDraftEvidence(nextKey, next?.scanId ?? null)
      setExecutionAuthorized(false)
      return
    }
    setPsdSelection(next)
    activeDraftScanIdRef.current = next?.scanId ?? null
    if (!evidenceChanged) return
    checkSeqRef.current += 1
    clearCommittedDecisions()
    setBatchResult(null)
    setBatchError(null)
    setBatchLoading(false)
    setCheckedRevision(null)
    commitForced({})
    commitExcluded([])
    commitIgnored([])
    pendingDirtyRef.current = false
    committedRef.current = null
    decisionsRestoredRef.current = false
    setExecutionAuthorized(false)
  }

  // v7：非当前稿的会话快照要能参与渲染（列表里显示各稿语言/确认进度），
  // 不能直接读 ref——ref 在渲染期读取会被 react-hooks/refs 拦下且不会触发更新。
  const [inactiveDraftSnapshots, setInactiveDraftSnapshots] = useState<
    Record<string, DraftRuntimeSnapshot>
  >({})

  const activeDraftLabel = useMemo(() => {
    const entry = (multiPsdSelection?.entries ?? []).find(
      (item) => draftKeyOfMasterPath(item.masterPath) === activeDraftKey,
    )
    const masterPath = entry?.masterPath ?? psdSelection?.masterPath ?? null
    return masterPath ? basenameOf(masterPath) : null
  }, [multiPsdSelection, activeDraftKey, psdSelection])

  const activeDraftDisplayLabel = useMemo(() => {
    const entries = multiPsdSelection?.entries ?? []
    const activeIndex = entries.findIndex(
      (entry) => draftKeyOfMasterPath(entry.masterPath) === activeDraftKey,
    )
    if (activeIndex < 0) return activeDraftLabel
    return buildDraftDisplayLabels(
      entries.map((entry) => ({ masterPath: entry.masterPath, basename: basenameOf(entry.masterPath) })),
    )[activeIndex] ?? activeDraftLabel
  }, [multiPsdSelection, activeDraftKey, activeDraftLabel])

  // 归属内核（sku-attribution.ts）：当前稿要哪种交付物（A+ / 主图 / 主副图 / 独立站主图）。
  // 多工作表的工作簿按它选 sheet——A+ 的稿必须读 A+ 那张 sheet，
  // 原来固定读第一个 sheet 会把 A+ 的行整块丢掉（而且不报错）。
  const activeDraftDeliverable = useMemo<DeliverableKind>(() => {
    const entry = (multiPsdSelection?.entries ?? []).find(
      (item) => draftKeyOfMasterPath(item.masterPath) === activeDraftKey,
    )
    const masterPath = entry?.masterPath ?? psdSelection?.masterPath ?? null
    return masterPath ? parseDeliverable(basenameOf(masterPath)) : 'unknown'
  }, [multiPsdSelection, activeDraftKey, psdSelection])

  // v7：切换当前稿＝切换整套译表会话（译表 + 审查 + 对账），不只是换一个扫描号。
  const switchActiveDraft = (entry: MultiPsdEntry) => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能切换设计稿。请先核对原任务或完成积分退回。'))
      return
    }
    if (experimentRunning) {
      setExperimentNotice(t('正在执行批量任务，等这一批跑完再切换设计稿。'))
      return
    }
    if (batchReviewRunning || retryingLanguage) {
      setExperimentNotice(t('当前稿的智能检测仍在进行，等它完成后再切换设计稿。'))
      return
    }
    activateDraft(draftKeyOfMasterPath(entry.masterPath), {
      scanId: entry.scanId,
    })
    setPsdSelection(
      isMultiPsdEntryScanned(entry)
        ? {
            masterPath: entry.masterPath,
            state: entry.state,
            scanId: entry.scanId,
            summary: entry.summary,
            updatedAt: entry.updatedAt,
          }
        : null,
    )
  }

  // 二选一的记忆（2026-10-23）：同 SKU 同交付物选过一次，下次导入默认还用那张。
  // 只有「本会话内」有效——跨重启要落存储，已登记为遗留项，不假装记住了。
  const bulkRememberedRef = useRef<Record<string, string>>({})
  const rememberedAttributionChoices = useCallback((plan: AttributionPlan) => {
    const out: Record<string, string> = {}
    for (const row of plan.rows) {
      if (row.status !== 'conflict') continue
      const key = `${row.identity.sku ?? '?'}·${row.identity.deliverable}`
      const remembered = bulkRememberedRef.current[key]
      if (remembered && row.candidates.some((candidate) => candidate.path === remembered)) {
        out[row.draft.masterPath] = remembered
      }
    }
    return out
  }, [])

  // ─── 第 1 步壳：文件夹快照 / 归属选择 / 归属记忆（2026-10-23 按模拟重做）────
  const [folderSnapshot, setFolderSnapshot] = useState<{ root: string; scan: FolderScanResult } | null>(null)
  const [stageFolderAction, setStageFolderAction] = useState<
    | { id: number; action: 'pick' }
    | { id: number; action: 'system-pick' }
    | { id: number; action: 'scan'; path: string }
    | { id: number; action: 'scan-all' }
    | { id: number; action: 'scan-stop' }
    | undefined
  >(undefined)

  const [stageClassic, setStageClassic] = useState(false)
  /** 原生选稿框打开中：防连点造成第二个系统框；和“读文件夹”分开显示。 */
  const [stagePicking, setStagePicking] = useState(false)
  const stagePickingRef = useRef(false)
  const [stageChoiceOverride, setStageChoiceOverride] = useState<Record<string, string>>({})
  // 单稿逻辑的人手选表：只要表在文件夹里就接受（不要求它是 SKU 候选）。
  const [stageManualChoices, setStageManualChoices] = useState<Record<string, string>>({})
  const [stageTablePickerFor, setStageTablePickerFor] = useState<string | null>(null)
  // 「只拦这一张」走内核 excluded 通道：组内一表只供一门语言（table-grouping.ts:213-221 把
  // 多语言列判孤儿），所以拦一张表＝拦这一稿的这一门，不需要另造一份格级状态。
  const [stageExcludedTables, setStageExcludedTables] = useState<string[]>([])
  // 「手工选表 N 次」只数真正确认过的；打开又取消的对话框、以及「读这张表再判」都不算。
  const [manualPickCount, setManualPickCount] = useState(0)
  const [stageFolderLoading, setStageFolderLoading] = useState(false)
  const [stageFolderError, setStageFolderError] = useState<string | null>(null)
  const stageFolderRequestRef = useRef(0)
  const [attributionMemory, setAttributionMemory] = useState<AttributionMemory>(() =>
    typeof window === 'undefined' ? {} : loadAttributionMemory(),
  )
  const [tableAllocationStore, setTableAllocationStore] = useState<TableAllocationStore>(() =>
    typeof window === 'undefined' ? {} : loadTableAllocationStore(),
  )
  const stageActionIdRef = useRef(0)
  const pulseStageFolderAction = (
    action: 'pick' | 'system-pick' | 'scan-all' | 'scan-stop' | { path: string },
  ) => {
    stageActionIdRef.current += 1
    const id = stageActionIdRef.current
    setStageFolderAction(typeof action === 'string' ? { id, action } : { id, action: 'scan', path: action.path })
  }

  // ─── 第 1 步读表 / 扫描 / 同名稿（2026-10-23 按执行方案）──────────────────
  // 读表状态按 draftKey 存；parsedTables 仍是全站唯一表来源（第 2 步直接复用）。
  const [stageTableStates, setStageTableStates] = useState<Record<string, StageTableReadState>>({})
  const stageTableStatesRef = useRef(stageTableStates)
  useLayoutEffect(() => {
    stageTableStatesRef.current = stageTableStates
  }, [stageTableStates])
  const stageTableSourceRef = useRef<Record<string, string>>({})
  // 逐张表的解析结果（归一表身份 → 这张表自己的语言/原文）。
  // 一稿一组之后 parsedTables[稿] 是整组合并出来的表，不能再拿来回答「这一张表带哪门语言」，
  // 否则基准表会被算成 12 门、其余 11 张反被判成同语言重复。
  const [stageTableParses, setStageTableParses] = useState<Record<string, ParsedCsv>>({})
  const stageTableParsesRef = useRef(stageTableParses)
  useLayoutEffect(() => {
    stageTableParsesRef.current = stageTableParses
  }, [stageTableParses])
  // 同一工作簿可以按交付物读到不同 sheet；稿级原始解析与其有效切片按稿隔离。
  const [stageTableParsesByDraft, setStageTableParsesByDraft] = useState<Record<string, Record<string, ParsedCsv>>>({})
  const [stageEffectiveTableParsesByDraft, setStageEffectiveTableParsesByDraft] = useState<Record<string, Record<string, ParsedCsv>>>({})
  const [stageReadNonce, setStageReadNonce] = useState(0)
  const stageReadRunRef = useRef(0)
  const stageRetryRef = useRef<Set<string>>(new Set())
  const [stageProbes, setStageProbes] = useState<Record<string, StageTableProbe>>({})
  const stageProbesRef = useRef(stageProbes)
  const stageProbeRunRef = useRef(0)
  useLayoutEffect(() => {
    stageProbesRef.current = stageProbes
  }, [stageProbes])
  const [stageScanState, setStageScanState] = useState<StageScanState | null>(null)
  // 扫描进行中（队列或单稿）时，禁止增删批次条目：队列/轮询按数组下标定位，
  // 中途移除或恢复会把结果写到别的稿上。
  const stageScanBusy = Boolean(stageScanState?.running || stageScanState?.scanningPath)
  const [stageNotice, setStageNotice] = useState<string | null>(null)
  // 被「先不做」或「同名合并/只留一份」移出批次的稿：留在池里可撤销，不从世界消失。
  const [stageExcluded, setStageExcluded] = useState<Array<{
    entry: MultiPsdEntry
    reason: 'skipped' | 'identical' | 'different'
    groupKey?: string
  }>>([])
  const [stageDuplicateSeparate, setStageDuplicateSeparate] = useState<Record<string, boolean>>({})

  // 归属计划：用当前批次的稿 + 文件夹里的表算，与导入时同一个内核（不另编判据）。
  const stagePlan = useMemo(() => {
    if (!folderSnapshot) return null
    const relByPath = new Map(folderSnapshot.scan.designs.map((design) => [design.path, design.relPath]))
    return buildAttributionPlan(
      (multiPsdSelection?.entries ?? []).map((entry) => ({
        masterPath: entry.masterPath,
        relPath: relByPath.get(entry.masterPath) ?? basenameOf(entry.masterPath),
      })),
      folderSnapshot.scan.tables.map((table) => ({ path: table.path, relPath: table.relPath })),
    )
  }, [folderSnapshot, multiPsdSelection])

  // 一稿一组语言表：复用现有归组内核，但先按稿身份与已确认的分配规则挑表/切片。
  // 同 SKU 仍可能是不同物料，只有候选唯一、显式独占/共享或已确认归属片才可进入本稿。
  const stageGroupBindings = useMemo<{ groups: DraftGroupBinding[]; orphans: GroupReject[] }>(() => {
    const entries = multiPsdSelection?.entries ?? []
    if (!folderSnapshot || entries.length === 0 || !stagePlan) return { groups: [], orphans: [] }
    const ownersByTable = new Map<string, string[]>()
    for (const row of stagePlan.rows) {
      for (const candidate of row.candidates) {
        const id = normalizeTableId(candidate.path)
        const owners = ownersByTable.get(id) ?? []
        if (!owners.includes(row.draft.masterPath)) owners.push(row.draft.masterPath)
        ownersByTable.set(id, owners)
      }
    }
    const groups: DraftGroupBinding[] = []
    const orphans: GroupReject[] = []
    for (const row of stagePlan.rows) {
      const entry = entries.find((item) => item.masterPath === row.draft.masterPath)
      const fingerprint = entry?.summary?.fingerprint ?? ''
      const parsedById = stageTableParsesByDraft[row.draft.masterPath] ?? {}
      const tables = row.candidates.flatMap((candidate) => {
        const id = normalizeTableId(candidate.path)
        const parsed = parsedById[id]
        const allocation = parsed
          ? tableAllocationStore[tableAllocationKey(candidate.path, parsed.selectedSheetName ?? '')]
          : Object.values(tableAllocationStore).find((item) =>
              normalizeTableId(item.tablePath) === id && item.members.includes(fingerprint),
            )
        const explicitlyChosen =
          stageChoiceOverride[row.draft.masterPath] === candidate.path ||
          stageManualChoices[row.draft.masterPath] === candidate.path
        const uniqueOwner = (ownersByTable.get(id)?.length ?? 0) === 1
        if (allocation && !allocation.members.includes(fingerprint)) return []
        if (!allocation && !uniqueOwner && !explicitlyChosen) return []
        const projected = allocation && parsed
          ? projectTableAllocation({
              parsed,
              allocation,
              draftFingerprint: fingerprint,
              allowUniqueAuto: false,
              availableFingerprints: entries.map((item) => item.summary?.fingerprint ?? '').filter(Boolean),
            })
          : null
        if (projected?.status === 'not-assigned') return []
        // stale/invalid allocations stay visible as a failing source; the read/execute path below
        // rejects them and never substitutes the raw table.
        const effective = projected?.status === 'ready' ? projected.parsed : parsed
        return [{
          path: candidate.path,
          relPath: candidate.relPath,
          langs: effective?.languageColumns,
          sources: effective?.rows.map((item) => item.source),
        }]
      })
      const choices = [stageChoiceOverride[row.draft.masterPath], stageManualChoices[row.draft.masterPath]]
        .filter((value): value is string => Boolean(value))
        .map(normalizeTableId)
      const built = buildGroupBindings({
        drafts: [{ masterPath: row.draft.masterPath, fileName: basenameOf(row.draft.masterPath) }],
        tables,
        choices,
        excluded: [...stageExcludedTables],
      })
      groups.push(...built.groups)
      orphans.push(...built.orphans)
    }
    return { groups, orphans }
  }, [multiPsdSelection, folderSnapshot, stagePlan, stageTableParsesByDraft, tableAllocationStore, stageChoiceOverride, stageManualChoices, stageExcludedTables])

  /**
   * 稿 masterPath → 这份稿的内容指纹（扫描摘要里本来就有）。
   *
   * 剔除记忆只能键在指纹上：masterPath 按 psd-selection.ts 划的边界不许进
   * 草稿/存储；而指纹是内容哈希，换目录、改文件名都还认得出同一份稿。
   * 没有指纹＝这稿还没扫完，读不到记忆，也就不写。
   */
  const fingerprintByDraft = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const entry of multiPsdSelection?.entries ?? []) {
      if (entry.summary?.fingerprint) out[entry.masterPath] = entry.summary.fingerprint
    }
    if (psdSelection?.masterPath && psdSelection.summary?.fingerprint) {
      out[psdSelection.masterPath] = psdSelection.summary.fingerprint
    }
    return out
  }, [multiPsdSelection, psdSelection])
  const [languageExclusions, setLanguageExclusions] = useState<LanguageExclusionStore>(() =>
    loadLanguageExclusions(),
  )

  /** 这一稿当前要做哪几门：当前稿取活现场，其余稿取它自己的快照、再退到那张表的列（扣掉记住的剔除）。 */
  const languagesByDraftRuntime: Record<string, string[]> = (() => {
    const out: Record<string, string[]> = {}
    for (const entry of multiPsdSelection?.entries ?? []) {
      const masterPath = entry.masterPath
      const key = draftKeyOfMasterPath(masterPath)
      if (key === activeDraftKey) {
        // 现场数组（包括 []）优先；显式清空不能被表列或旧记忆补回来。
        out[masterPath] = targetLanguages
      } else {
        out[masterPath] = deriveLanguages({
          live: inactiveDraftSnapshots[key]?.targetLanguages ?? null,
          tableColumns: parsedTables[key]?.languageColumns ?? [],
          excluded: [...exclusionsFor(languageExclusions, fingerprintByDraft[masterPath])],
        })
      }
    }
    return out
  })()

  /**
   * 「沿用上次剔除」必须说出来。
   *
   * 记忆是替你做的一次决定，暗着生效就是静默行为。这里只在**没有本会话现场**、
   * 且确实扣掉了语言时提示一次（按指纹去重），并给出撤回入口。
   */
  const announcedExclusionsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const lines: string[] = []
    for (const group of stageGroupBindings.groups) {
      const key = draftKeyOfMasterPath(group.draftPath)
      if (key === activeDraftKey || inactiveDraftSnapshots[key] || !parsedTables[key]) continue
      const fingerprint = fingerprintByDraft[group.draftPath]
      const remembered = exclusionsFor(languageExclusions, fingerprint)
      if (!fingerprint || remembered.length === 0) continue
      if (announcedExclusionsRef.current.has(fingerprint)) continue
      announcedExclusionsRef.current.add(fingerprint)
      lines.push(t('{file}：{langs}', { file: basenameOf(group.draftPath), langs: remembered.join('、') }))
    }
    if (lines.length === 0) return
    setStageNotice(
      t('沿用了上次剔掉的语言（{value0}）。要恢复就点那一稿的「全选回来」。', { value0: lines.join('；') }),
    )
  }, [stageGroupBindings, activeDraftKey, inactiveDraftSnapshots, parsedTables, fingerprintByDraft, languageExclusions])

  /** 份数只有一个来源：ready 槽位 ∩ 这一稿要做哪几门（slot-scope.ts）。四个显示位都读这一份。 */
  const stageDeliverables = useMemo(() => {
    const out: Record<string, { count: number; excluded: string[] }> = {}
    for (const group of stageGroupBindings.groups) {
      const languages = languagesByDraftRuntime[group.draftPath] ?? []
      out[group.draftPath] = {
        count: countDeliverables(group.slots, languages),
        excluded: excludedReadySlots(group.slots, languages),
      }
    }
    return out
  }, [stageGroupBindings, languagesByDraftRuntime])
  /** 这一稿当前要做哪几门（点格与「全选回来」都读这一份；派生挂在 stageGroupBindings 之后）。 */
  const languagesOfDraft = (masterPath: string): string[] => languagesByDraftRuntime[masterPath] ?? []

  /**
   * 第 1 步点格／「全选回来」的唯一写入口。
   *
   * 真相只落在「这一稿要做哪几门」那份语言集合里：执行语言、执行前的逐稿确认检查、
   * 顶栏份数、第 2 步页签都从它取数——不为剔除再造一份平行状态，否则就会出现
   * 「界面说没做、助手照做」的两套账。
   *
   * 同一份会话有两个副本：`draftSnapshotsRef`（执行前检查读它）与 `inactiveDraftSnapshots`
   * （渲染读它），非当前稿必须同一笔写两处。
   */
  const setDraftLanguages = (masterPath: string, next: string[]) => {
    const key = draftKeyOfMasterPath(masterPath)
    const dropped = removedLanguages(languagesOfDraft(masterPath), next)
    if (dropped.length === 0 && next.length === languagesOfDraft(masterPath).length) return
    // 这一笔决定要能跨会话活着：按内容指纹记下被剔掉的门（不存路径）。
    // 刷新/重扫/换目录后同一份稿仍按它算；「全选回来」把门加齐时这条记忆自动删掉。
    const fingerprint = fingerprintByDraft[masterPath]
    if (fingerprint) {
      const remembered = withLanguageExclusions(
        languageExclusions,
        fingerprint,
        nextExclusions(exclusionsFor(languageExclusions, fingerprint), languagesOfDraft(masterPath), next),
      )
      setLanguageExclusions(remembered)
      saveLanguageExclusions(remembered)
    }
    const dropDigests = (previous: Record<string, string>) => {
      const updated = { ...previous }
      for (const language of dropped) delete updated[language]
      return updated
    }
    if (key === activeDraftKey) {
      setTargetLanguages(next)
      setCurrentLanguage((cur) => (cur && next.includes(cur) ? cur : (next[0] ?? null)))
      setBatchResult(null)
      setCheckedRevision(null)
      if (dropped.length > 0) setReviewedLanguageDigests(dropDigests)
      return
    }
    const snapshot = draftSnapshotsRef.current[key]
    if (snapshot) {
      const updated: DraftRuntimeSnapshot = {
        ...snapshot,
        targetLanguages: next,
        currentLanguage:
          snapshot.currentLanguage && next.includes(snapshot.currentLanguage)
            ? snapshot.currentLanguage
            : (next[0] ?? null),
        reviewedLanguageDigests: dropped.length > 0 ? dropDigests(snapshot.reviewedLanguageDigests) : snapshot.reviewedLanguageDigests,
      }
      draftSnapshotsRef.current[key] = { ...updated }
      // 两个副本必须是两个对象：共享同一引用会让 ref 侧的后续改动偷偷漏进渲染侧（React Compiler 报 may be modified later）。
      setInactiveDraftSnapshots((previous) => ({ ...previous, [key]: { ...updated } }))
      return
    }
    // 没访问过的稿没有会话快照（激活时才由 applyDraftSnapshot 从译表派生）。
    // 这里走 v7 的切稿路径先把会话建起来，再同一笔写语言——宁可让你看见切稿，
    // 也不替剔除凭空造一份别的代码都不认的现场。
    const entry = (multiPsdSelection?.entries ?? []).find((item) => item.masterPath === masterPath)
    if (!entry) return
    activateDraft(key, { scanId: entry.scanId })
    setTargetLanguages(next)
    setCurrentLanguage((cur) => (cur && next.includes(cur) ? cur : (next[0] ?? null)))
    setBatchResult(null)
    setCheckedRevision(null)
    if (dropped.length > 0) setReviewedLanguageDigests(dropDigests)
  }

  /** 点一格：keep=false 点掉这门，keep=true 把它加回来（同一份语言集合，只有一个写入口）。 */
  const handleStageToggleSlot = (masterPath: string, lang: string, keep: boolean) => {
    const current = languagesOfDraft(masterPath)
    setDraftLanguages(masterPath, keep ? withLanguages(current, [lang]) : withoutLanguage(current, lang))
  }

  const handleStageRestoreSlots = (masterPath: string) => {
    const group = stageGroupBindings.groups.find((item) => item.draftPath === masterPath)
    if (!group) return
    setDraftLanguages(masterPath, withLanguages(languagesOfDraft(masterPath), readySlotLanguages(group.slots)))
  }

  const handleDeliveryMatrixIncludeLanguage = (masterPath: string, language: string) => {
    if (executionAuthorized || experimentRunning || batchReviewRunning || retryingLanguage) {
      setExperimentNotice(t('当前执行或复核仍在进行，不能改执行范围。'))
      return
    }
    const key = draftKeyOfMasterPath(masterPath)
    const table = key === activeDraftKey ? parsed : parsedTables[key]
    const current = languagesByDraftRuntime[masterPath] ?? []
    if (!table?.languageColumns.includes(language) || current.includes(language)) return
    setDraftLanguages(masterPath, [...current, language])
  }

  const handleDeliveryMatrixOpenReview = (masterPath: string, language: string) => {
    const key = draftKeyOfMasterPath(masterPath)
    const entry = (multiPsdSelection?.entries ?? []).find((item) => item.masterPath === masterPath)
    const table = key === activeDraftKey ? parsed : parsedTables[key]
    if (!entry || !isMultiPsdEntryScanned(entry) || !table?.languageColumns.includes(language)) return
    if (!(languagesByDraftRuntime[masterPath] ?? []).includes(language)) return
    if (executionAuthorized || experimentRunning || batchReviewRunning || retryingLanguage) {
      switchActiveDraft(entry)
      return
    }
    switchActiveDraft(entry)
    if (activeDraftKeyRef.current !== key) return
    // applyDraftSnapshot restores the prior currentLanguage; this final write intentionally wins.
    setCurrentLanguage(language)
    goToStage('translation_review')
  }

  /** 一稿 → 组内可用表（基准在前）。读全文按这个清单逐张读，读完合并成一张。 */
  const stageGroupTablePaths = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    const scannedIds = new Set((folderSnapshot?.scan.tables ?? []).map((table) => normalizeTableId(table.path)))
    for (const group of stageGroupBindings.groups) {
      const paths = new Set(group.tables)
      const fingerprint = fingerprintByDraft[group.draftPath]
      if (fingerprint) {
        for (const allocation of Object.values(tableAllocationStore)) {
          if (allocation.members.includes(fingerprint) && scannedIds.has(normalizeTableId(allocation.tablePath))) {
            paths.add(allocation.tablePath)
          }
        }
      }
      if (paths.size > 0) out[group.draftPath] = [...paths]
    }
    for (const entry of multiPsdSelection?.entries ?? []) {
      if (out[entry.masterPath]) continue
      const fingerprint = fingerprintByDraft[entry.masterPath]
      if (!fingerprint) continue
      const paths = Object.values(tableAllocationStore)
        .filter((allocation) => allocation.members.includes(fingerprint) && scannedIds.has(normalizeTableId(allocation.tablePath)))
        .map((allocation) => allocation.tablePath)
      if (paths.length > 0) out[entry.masterPath] = [...new Set(paths)]
    }
    return out
  }, [stageGroupBindings, folderSnapshot, multiPsdSelection, fingerprintByDraft, tableAllocationStore])

  // 选择优先级写死在一处：人手覆盖 > 记忆 > 唯一候选自动。
  const stageResolved = useMemo(() => {
    if (!stagePlan) {
      return {
        choices: {} as Record<string, string>,
        remembered: {} as Record<string, boolean>,
        dropped: [] as string[],
      }
    }
    const auto = attributionAutoChoices(stagePlan)
    const tablePaths = new Set((folderSnapshot?.scan.tables ?? []).map((table) => table.path))
    const choices: Record<string, string> = {}
    const remembered: Record<string, boolean> = {}
    for (const row of stagePlan.rows) {
      const draftPath = row.draft.masterPath
      // 单稿逻辑：人手选表优先，且不要求它是 SKU 候选（只要求表还在这个文件夹里）。
      const manual = stageManualChoices[draftPath]
      if (manual && tablePaths.has(manual)) {
        choices[draftPath] = manual
        continue
      }
      const override = stageChoiceOverride[draftPath]
      // 人手覆盖也要先核一遍：同根重扫可能把这张表移出候选，旧覆盖不能继续指着一张不存在的表。
      if (override && row.candidates.some((candidate) => candidate.path === override)) {
        choices[draftPath] = override
        continue
      }
      if (row.identity.sku) {
        const entry = attributionMemory[attributionMemoryKey(row.identity.sku, row.identity.deliverable)]
        const resolved = resolveRememberedTable(
          entry,
          row.candidates.map((candidate) => ({ path: candidate.path, relPath: candidate.relPath })),
        )
        if (resolved) {
          choices[draftPath] = resolved
          remembered[draftPath] = true
          continue
        }
      }
      if (auto[draftPath]) choices[draftPath] = auto[draftPath]
    }
    // 记忆键只有「SKU·交付物」：两稿同组会被带出同一张表。这里只保留先出现的一份，
    // 后一份撤掉选择落回冲突。跨交付物（主图 / A+）共用同一本工作簿不拦。
    // 顺序必须按优先级排：人手覆盖 > 记忆 > 自动；否则同组里先出现的记忆会压掉人手覆盖。
    const priority = (row: (typeof stagePlan.rows)[number]) =>
      stageManualChoices[row.draft.masterPath]
        ? 0
        : stageChoiceOverride[row.draft.masterPath]
          ? 1
          : remembered[row.draft.masterPath]
            ? 2
            : 3
    const orderedRows = [...stagePlan.rows].sort((left, right) => priority(left) - priority(right))
    const deduped = dedupeStageChoices(
      orderedRows.map((row) => ({
        masterPath: row.draft.masterPath,
        sku: row.identity.sku,
        deliverable: row.identity.deliverable,
      })),
      choices,
    )
    for (const draftPath of deduped.dropped) delete remembered[draftPath]
    // 一稿一组：下游那句「这一稿用哪张表」＝组基准（行数最多那张，并列按文件名）。
    // 必须与「读表按整组读、读完合并」同一笔生效：parsedTables[稿] 已是整组合并出的多语言表，
    // 这里只是给它一个路径指针。单独上这一条会让第 2 步拿一张单语言表当整组，静默只剩一门。
    const basis = deriveStageChoices(stageGroupBindings.groups)
    const resolvedChoices: Record<string, string> = { ...deduped.choices }
    for (const [draftPath, tablePath] of Object.entries(basis)) {
      // 单稿逻辑里人手挑的表不受归组结果改写（经典导入路径保留）。
      if (stageManualChoices[draftPath]) continue
      resolvedChoices[draftPath] = tablePath
    }
    for (const entry of multiPsdSelection?.entries ?? []) {
      if (resolvedChoices[entry.masterPath]) continue
      const fingerprint = fingerprintByDraft[entry.masterPath]
      if (!fingerprint) continue
      const allocation = Object.values(tableAllocationStore).find((item) =>
        item.members.includes(fingerprint) &&
        folderSnapshot?.scan.tables.some((table) => normalizeTableId(table.path) === normalizeTableId(item.tablePath)),
      )
      if (allocation) resolvedChoices[entry.masterPath] = allocation.tablePath
    }
    return { choices: resolvedChoices, remembered, dropped: deduped.dropped }
  }, [stagePlan, stageChoiceOverride, stageManualChoices, attributionMemory, folderSnapshot, stageGroupBindings, multiPsdSelection, fingerprintByDraft, tableAllocationStore])

  const stageLanguages = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const entry of multiPsdSelection?.entries ?? []) {
      out[entry.masterPath] = parsedTables[draftKeyOfMasterPath(entry.masterPath)]?.languageColumns ?? []
    }
    return out
  }, [multiPsdSelection, parsedTables])

  const handleStageChoose = (draftPath: string, tablePath: string) => {
    const row = stagePlan?.rows.find((candidate) => candidate.draft.masterPath === draftPath)
    // 一表一稿只在同 SKU＋同交付物内成立；跨交付物共用同一本工作簿是内核允许的。
    const clash = stagePlan?.rows.some(
      (other) =>
        other.draft.masterPath !== draftPath &&
        other.identity.sku === row?.identity.sku &&
        other.identity.deliverable === row?.identity.deliverable &&
        stageResolved.choices[other.draft.masterPath] === tablePath,
    )
    if (clash) {
      setStageNotice(t('这张表已经给了同一 SKU、同一交付物的另一份稿；一张表只够一份，请为其中一份换一张。'))
      return
    }
    setStageManualChoices((previous) => {
      if (!(draftPath in previous)) return previous
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageChoiceOverride((prev) => ({ ...prev, [draftPath]: tablePath }))
    setManualPickCount((count) => count + 1)
    if (!row || !row.identity.sku) return
    const table = folderSnapshot?.scan.tables.find((candidate) => candidate.path === tablePath)
    const next = withAttributionChoice(attributionMemory, {
      sku: row.identity.sku,
      deliverable: row.identity.deliverable,
      tablePath,
      tableRelPath: table?.relPath ?? tablePath,
    })
    setAttributionMemory(next)
    saveAttributionMemory(next)
  }

  /**
   * 同 SKU 的其他交付物一起用这张表：只对「候选里确实有这张表」且**不同交付物**的稿生效。
   * 同 SKU 同交付物的第二份稿不会被带上——那正是「一张表只够一份」的红线。
   */
  const handleStageChooseGroup = (draftPath: string, tablePath: string) => {
    const source = stagePlan?.rows.find((row) => row.draft.masterPath === draftPath)
    if (!source) return
    const sourceClash = stagePlan?.rows.some(
      (other) =>
        other.draft.masterPath !== draftPath &&
        other.identity.sku === source.identity.sku &&
        other.identity.deliverable === source.identity.deliverable &&
        stageResolved.choices[other.draft.masterPath] === tablePath,
    )
    if (sourceClash) {
      setStageNotice(t('这张表已经给了同一 SKU、同一交付物的另一份稿；一张表只够一份。'))
      return
    }
    const targets = (stagePlan?.rows ?? []).filter(
      (row) =>
        row.draft.masterPath !== draftPath &&
        row.candidates.some((candidate) => candidate.path === tablePath) &&
        !(
          row.identity.sku === source.identity.sku &&
          row.identity.deliverable === source.identity.deliverable
        ),
    )
    setStageManualChoices((previous) => {
      const next = { ...previous }
      delete next[draftPath]
      for (const row of targets) delete next[row.draft.masterPath]
      return next
    })
    setStageChoiceOverride((prev) => {
      const next = { ...prev, [draftPath]: tablePath }
      for (const row of targets) next[row.draft.masterPath] = tablePath
      return next
    })
    setManualPickCount((count) => count + 1)
    const table = folderSnapshot?.scan.tables.find((candidate) => candidate.path === tablePath)
    let memory = attributionMemory
    for (const row of [source, ...targets]) {
      if (!row.identity.sku) continue
      memory = withAttributionChoice(memory, {
        sku: row.identity.sku,
        deliverable: row.identity.deliverable,
        tablePath,
        tableRelPath: table?.relPath ?? tablePath,
      })
    }
    setAttributionMemory(memory)
    saveAttributionMemory(memory)
    // 没有同胞稿要一起用时就是一次普通的单稿选表，别弹「同时给了 N 份稿」。
    if (targets.length > 0) {
      setStageNotice(
        t('这张表同时给了 {value0} 份稿；不同交付物会在读表时各取自己的 sheet。', {
          value0: String(targets.length + 1),
        }),
      )
    }
  }

  /**
   * 单稿逻辑的人手选表：不要求这张表是 SKU 候选，只要求它还在当前文件夹里。
   * 同 SKU＋同交付物仍守一表一稿；SKU 认不出时不做静默去重（用户自己决定）。
   */
  const handleStagePickTable = (draftPath: string, tablePath: string) => {
    const row = stagePlan?.rows.find((candidate) => candidate.draft.masterPath === draftPath)
    const table = folderSnapshot?.scan.tables.find((candidate) => candidate.path === tablePath)
    if (!row || !table) {
      setStageNotice(t('这张表已经不在当前文件夹里，请重新扫描后再选。'))
      return
    }
    if (row.identity.sku) {
      const clash = stagePlan?.rows.some(
        (other) =>
          other.draft.masterPath !== draftPath &&
          other.identity.sku === row.identity.sku &&
          other.identity.deliverable === row.identity.deliverable &&
          stageResolved.choices[other.draft.masterPath] === tablePath,
      )
      if (clash) {
        setStageNotice(t('这张表已经给了同一 SKU、同一交付物的另一份稿；一张表只够一份，请换一张。'))
        return
      }
    }
    setStageManualChoices((previous) => ({ ...previous, [draftPath]: tablePath }))
    setStageChoiceOverride((previous) => {
      if (!(draftPath in previous)) return previous
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageNotice(t('已为 {value0} 选表：{relPath}', { value0: String(basenameOf(draftPath)), relPath: String(table.relPath) }))
    setManualPickCount((count) => count + 1)
  }

  /** 撤销「已按你的选择」：两把键必须同一笔删干净，只删一把会让旧覆盖继续生效。 */
  const handleStageClearChoice = (draftPath: string) => {
    setStageManualChoices((previous) => {
      if (!(draftPath in previous)) return previous
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageChoiceOverride((previous) => {
      if (!(draftPath in previous)) return previous
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageNotice(t('已撤销这一稿的选表，回到自动归组的结果。'))
  }

  /** 表级拦下／放开：走内核 excluded（组内一表一门，所以这就是「只拦这一张」的语义）。 */
  const handleStageBlockTable = (tablePath: string) => {
    const id = normalizeTableId(tablePath)
    setStageExcludedTables((previous) => (previous.includes(id) ? previous : [...previous, id]))
  }

  const handleStageUnblockTable = (tablePath: string) => {
    const id = normalizeTableId(tablePath)
    setStageExcludedTables((previous) => previous.filter((item) => item !== id))
  }

  const handleStageForget = (draftPath: string) => {
    const row = stagePlan?.rows.find((candidate) => candidate.draft.masterPath === draftPath)
    if (row?.identity.sku) {
      const next = withoutAttributionChoice(
        attributionMemory,
        attributionMemoryKey(row.identity.sku, row.identity.deliverable),
      )
      setAttributionMemory(next)
      saveAttributionMemory(next)
    }
    setStageChoiceOverride((prev) => {
      if (!(draftPath in prev)) return prev
      const copy = { ...prev }
      delete copy[draftPath]
      return copy
    })
  }

  /** 把自动读进来的表从 parsedTables 撤掉（换表/换文件夹/跳过时用），不动手工导入的表。 */
  const removeStageTable = (key: string, masterPath?: string) => {
    delete stageTableSourceRef.current[key]
    if (key in parsedTablesRef.current) {
      const next = { ...parsedTablesRef.current }
      delete next[key]
      parsedTablesRef.current = next
      setParsedTables(next)
    }
    delete draftSnapshotsRef.current[key]
    setInactiveDraftSnapshots((previous) => {
      if (!(key in previous)) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
    const removedDraftPath = masterPath ?? multiPsdSelection?.entries.find(
      (entry) => draftKeyOfMasterPath(entry.masterPath) === key,
    )?.masterPath
    if (removedDraftPath) {
      setStageTableParsesByDraft((previous) => {
        if (!(removedDraftPath in previous)) return previous
        const next = { ...previous }
        delete next[removedDraftPath]
        return next
      })
      setStageEffectiveTableParsesByDraft((previous) => {
        if (!(removedDraftPath in previous)) return previous
        const next = { ...previous }
        delete next[removedDraftPath]
        return next
      })
    }
    if (key === activeDraftKeyRef.current) {
      applyDraftSnapshot(key, null, null, activeDraftScanIdRef.current)
    }
  }

  const clearStageForNewFolder = () => {
    stageReadRunRef.current += 1
    clearStageTableCache()
    for (const key of Object.keys(stageTableSourceRef.current)) removeStageTable(key)
    stageTableSourceRef.current = {}
    stageTableStatesRef.current = {}
    stageTableParsesRef.current = {}
    setStageTableParses({})
    setStageTableParsesByDraft({})
    setStageEffectiveTableParsesByDraft({})
    stageProbesRef.current = {}
    setStageTableStates({})
    setStageProbes({})
    setStageChoiceOverride({})
    setStageManualChoices({})
    setStageTablePickerFor(null)
    setStageFolderError(null)
    setStageExcluded([])
    setStageDuplicateSeparate({})
    stageRetryRef.current = new Set()
    setStageReadNonce((value) => value + 1)
    setStageScanState(null)
    setStageNotice(null)
  }

  /**
   * 选文件夹即整批：新根替换本批，同根重扫只补新稿、不删已有稿。
   * 换根前界面已问过「会换成新的一批」，所以这里可以放心替换。
   */
  const handleStageFolderSnapshot = (snapshot: { root: string; scan: FolderScanResult } | null) => {
    if (!snapshot) {
      setFolderSnapshot(null)
      return
    }
    const rootChanged = folderSnapshot?.root !== snapshot.root
    if (rootChanged) clearStageForNewFolder()
    setFolderSnapshot(snapshot)
    const existing = multiPsdSelection ?? clearMultiPsdSelection()
    let next = rootChanged ? clearMultiPsdSelection() : existing
    let added = 0
    const now = new Date().toISOString()
    // 同根重扫不能把用户「先不做 / 已合并」的稿又加回来——那是明确的用户决定。
    const excludedPaths = new Set(stageExcluded.map((item) => item.entry.masterPath))
    for (const design of snapshot.scan.designs) {
      if (!rootChanged && excludedPaths.has(design.path)) continue
      const result = addMultiPsdEntry(next, {
        masterPath: design.path,
        state: 'stale',
        scanId: null,
        summary: null,
        updatedAt: now,
      })
      next = result.selection
      if (result.outcome === 'added') added += 1
    }
    if (rootChanged || added > 0) setMultiPsdSelection(next)
    if (rootChanged) ensureActiveDraftInBatch(next.entries)
    if (rootChanged && existing.entries.length > 0) {
      setStageNotice(
        t('已换成「{value0}」这一批：{length} 份稿。上一批的选择和已读表已清空。', { value0: String(basenameOf(snapshot.root)), length: String(next.entries.length) }),
      )
    } else if (snapshot.scan.designs.length === 0) {
      setStageNotice(t('这个文件夹里没有找到设计稿。'))
    } else if (next.entries.length < snapshot.scan.designs.length) {
      setStageNotice(
        t('文件夹里有 {length} 份稿，本批上限 12 份，只加入前 {length_1} 份。', { length: String(snapshot.scan.designs.length), length_1: String(next.entries.length) }),
      )
    }
  }

  /**
   * 文件夹读取收到父层：第一层不再可见后，进度/错误不能留在隐藏组件里。
   * 成功走同一个 handleStageFolderSnapshot（自动填批、换根清空、上限说明都不变）。
   */
  const loadStageFolder = async (path: string) => {
    const raw = path.trim().replace(/^["']|["']$/g, '')
    if (!raw) {
      setStageFolderError(t('请选择或输入一个文件夹路径。'))
      return
    }
    // 入口按钮选的是 PSD/PSB 文件；粘贴框也可能被贴成文件路径。
    // 用同一个父目录判据收口，避免把 C:\...\a.psd 当文件夹去读。
    const target = /\.(psd|psb)$/i.test(raw) ? parentFolderOfFile(raw) : raw
    if (!target) {
      setStageFolderError(t('这个文件路径没有上级文件夹，请直接粘贴文件夹路径读取。'))
      return
    }
    if (stageScanBusy) {
      setStageFolderError(t('扫描正在进行，等这一轮结束再换文件夹。'))
      return
    }
    const requestId = stageFolderRequestRef.current + 1
    stageFolderRequestRef.current = requestId
    setStageFolderLoading(true)
    setStageFolderError(null)
    try {
      const scan = await listFolderDesigns(target)
      if (stageFolderRequestRef.current !== requestId) return
      handleStageFolderSnapshot({ root: scan.root, scan })
      // 一键「扫描并自动配对」：读成功后自动排上扫描，不用再回界面点第二次。
      // 读表头仍留手动——扫描完成没有可等待的信号，硬串就变成轮询；界面上那句提示照此写。
      pulseStageFolderAction('scan-all')
      setStageNotice(t('文件夹已读取，已自动开始扫描设计稿；读完表头就能配好每一门。'))
    } catch (error) {
      if (stageFolderRequestRef.current !== requestId) return
      const message =
        error instanceof Error && error.message ? error.message : t('这个文件夹读不了，请换一个。')
      setStageFolderError(message)
    } finally {
      if (stageFolderRequestRef.current === requestId) setStageFolderLoading(false)
    }
  }

  const handleStageRescanFolder = () => {
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再重新扫描文件夹。'))
      return
    }
    clearStageTableCache()
    if (folderSnapshot) void loadStageFolder(folderSnapshot.root)
  }

  /**
   * 批量页选文件夹：Windows 原生 FolderBrowserDialog（助手 3.7.24）。
   *
   * 图三的 OpenFileDialog 只能选 PSD/PSB 文件，不能选文件夹；上一版用
   * “选一份稿再取父目录”替代，功能不对（选不到空文件夹/项目根），这里撤回。
   * 要“直接选文件夹 + 图三现代外观”，需助手 3.7.25 的
   * IFileOpenDialog(FOS_PICKFOLDERS)；本轮先恢复正确功能，未擅自发助手。
   */
  const handleStagePickFolder = () => {
    if (stagePickingRef.current || stageFolderLoading) return
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再换文件夹。'))
      return
    }
    stagePickingRef.current = true
    setStagePicking(true)
    void (async () => {
      let picked: string | null = null
      try {
        picked = await selectImportFolderDirect()
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : t('无法打开文件夹选择框。')
        setStageFolderError(message)
        setStageNotice(message)
      } finally {
        // 先把“等待选择”落下，再进入“读取文件夹”，避免两个状态同时显示。
        stagePickingRef.current = false
        setStagePicking(false)
      }
      if (picked) await loadStageFolder(picked)
    })()
  }

  /** 当前稿被移出批次时，切到剩下第一份；否则第 2 步会拿着一个不在批次里的当前稿。 */
  const ensureActiveDraftInBatch = (entries: MultiPsdEntry[]) => {
    const active = activeDraftKeyRef.current
    if (entries.some((entry) => draftKeyOfMasterPath(entry.masterPath) === active)) return
    const first = entries[0]
    if (first) activateDraft(draftKeyOfMasterPath(first.masterPath), { scanId: first.scanId })
  }

  const handleStageChangeFolder = () => {
    if (stagePickingRef.current) return
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再换文件夹，避免扫描结果写错稿。'))
      return
    }
    if ((multiPsdSelection?.entries.length ?? 0) > 0) {
      const ok = window.confirm(
        t('换文件夹会换成新的一批：当前 {value0} 份稿的选择和已读表会清空。继续？', { value0: String(multiPsdSelection?.entries.length ?? 0) }),
      )
      if (!ok) return
    }
    handleStagePickFolder()
  }

  /** 「这稿先不做」：真的移出批次（执行/计数/矩阵都不再算它），留在池里可撤销。 */
  const handleStageSkip = (draftPath: string) => {
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再跳过，避免队列错位。'))
      return
    }
    const entry = multiPsdSelection?.entries.find((item) => item.masterPath === draftPath)
    if (!entry) return
    const nextEntries = (multiPsdSelection?.entries ?? []).filter((item) => item.masterPath !== draftPath)
    setMultiPsdSelection({ entries: nextEntries })
    ensureActiveDraftInBatch(nextEntries)
    setStageExcluded((previous) => [
      ...previous.filter((item) => item.entry.masterPath !== draftPath),
      { entry, reason: 'skipped' },
    ])
    const key = draftKeyOfMasterPath(draftPath)
    removeStageTable(key, draftPath)
    stageTableStatesRef.current = { ...stageTableStatesRef.current }
    delete stageTableStatesRef.current[key]
    setStageTableStates((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
    setStageChoiceOverride((previous) => {
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageManualChoices((previous) => {
      if (!(draftPath in previous)) return previous
      const next = { ...previous }
      delete next[draftPath]
      return next
    })
    setStageNotice(t('已把 {value0} 先移出本批；可以撤销。', { value0: String(basenameOf(draftPath)) }))
  }

  const handleStageUndoSkip = (draftPath: string) => {
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再恢复，避免队列错位。'))
      return
    }
    const item = stageExcluded.find(
      (candidate) => candidate.entry.masterPath === draftPath && candidate.reason === 'skipped',
    )
    if (!item) return
    const current = multiPsdSelection ?? clearMultiPsdSelection()
    const result = addMultiPsdEntry(current, item.entry)
    if (result.outcome !== 'added') {
      setStageNotice(result.outcome === 'full' ? t('本批已满 12 份，先移出一份再撤销。') : t('这份稿已经在批次里了。'))
      return
    }
    setMultiPsdSelection(result.selection)
    setStageExcluded((previous) => previous.filter((candidate) => candidate !== item))
  }

  const handleStageRetryRead = (draftPath: string) => {
    const key = draftKeyOfMasterPath(draftPath)
    clearStageTableCache()
    removeStageTable(key, draftPath)
    stageTableStatesRef.current = { ...stageTableStatesRef.current }
    delete stageTableStatesRef.current[key]
    setStageTableStates((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
    stageRetryRef.current.add(draftPath)
    setStageReadNonce((value) => value + 1)
  }

  const handleReadTableForAllocation = (tablePath: string, masterPath: string) => {
    const entry = multiPsdSelection?.entries.find((item) => item.masterPath === masterPath)
    if (!folderSnapshot?.root || !entry?.summary?.fingerprint) {
      setStageNotice(t('这份稿尚未扫描完成，不能建立可恢复的归属。'))
      return
    }
    const row = stagePlan?.rows.find((item) => item.draft.masterPath === masterPath)
    const deliverable = row?.identity.deliverable ?? identifyDraft(basenameOf(masterPath)).deliverable
    void loadStageTable({ root: folderSnapshot.root, tablePath, deliverable })
      .then((parsed) => {
        const id = normalizeTableId(tablePath)
        setStageTableParsesByDraft((previous) => ({
          ...previous,
          [masterPath]: { ...(previous[masterPath] ?? {}), [id]: parsed },
        }))
        stageTableParsesRef.current = { ...stageTableParsesRef.current, [id]: parsed }
        setStageTableParses({ ...stageTableParsesRef.current })
        setStageNotice(t('已读入这张表的工作表与模块值；确认分配后才会进入本稿执行。'))
      })
      .catch((error) => {
        setStageNotice(error instanceof Error ? error.message : t('读表失败，请重试。'))
      })
  }

  const handleSaveTableAllocation = (allocation: TableAllocation) => {
    if (executionAuthorized || experimentRunning || batchReviewRunning || retryingLanguage) {
      setStageNotice(t('执行或复核期间不能更改表归属。'))
      return
    }
    const key = tableAllocationKey(allocation.tablePath, allocation.sheetName)
    const next = { ...tableAllocationStore, [key]: allocation }
    setTableAllocationStore(next)
    const saved = saveTableAllocationStore(next)
    setStageNotice(saved
      ? t('归属已保存，请重新核对受影响的设计稿。')
      : t('归属仅保存在本次工作台会话，浏览器存储不可用。'))
  }

  const handleClearTableAllocation = (tablePath: string, sheetName: string) => {
    if (executionAuthorized || experimentRunning || batchReviewRunning || retryingLanguage) {
      setStageNotice(t('执行或复核期间不能更改表归属。'))
      return
    }
    const key = tableAllocationKey(tablePath, sheetName)
    if (!(key in tableAllocationStore)) return
    const next = { ...tableAllocationStore }
    delete next[key]
    setTableAllocationStore(next)
    saveTableAllocationStore(next)
    setStageNotice(t('已清除这条归属；相关稿会重新按可验证的绑定读取。'))
  }

  const handleStageRestoreDuplicates = (groupKey: string) => {
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再恢复，避免队列错位。'))
      return
    }
    const items = stageExcluded.filter((item) => item.groupKey === groupKey)
    if (items.length === 0) return
    let next = multiPsdSelection ?? clearMultiPsdSelection()
    const restoredPaths = new Set<string>()
    for (const item of items) {
      const result = addMultiPsdEntry(next, item.entry)
      if (result.outcome === 'added') {
        next = result.selection
        restoredPaths.add(item.entry.masterPath)
      }
    }
    if (restoredPaths.size === 0) {
      setStageNotice(t('本批已满 12 份，先移出一份再恢复。'))
      return
    }
    setMultiPsdSelection(next)
    setStageExcluded((previous) =>
      previous.filter(
        (item) => !(item.groupKey === groupKey && restoredPaths.has(item.entry.masterPath)),
      ),
    )
    setStageDuplicateSeparate((previous) => ({ ...previous, [groupKey]: true }))
    setStageNotice(t('已恢复到分开做（{size} 份）；这一组不会再自动合并。', { size: String(restoredPaths.size) }))
  }

  const handleStageKeepOne = (groupKey: string) => {
    if (stageScanBusy) {
      setStageNotice(t('扫描正在进行，等这一轮结束再取舍同名稿。'))
      return
    }
    const group = groupDuplicateDrafts(multiPsdSelection?.entries ?? []).find((item) => item.key === groupKey)
    if (!group) return
    const removed = group.entries.slice(1)
    if (removed.length === 0) return
    const nextEntries = (multiPsdSelection?.entries ?? []).filter(
      (entry) => !removed.some((item) => item.masterPath === entry.masterPath),
    )
    setMultiPsdSelection({ entries: nextEntries })
    ensureActiveDraftInBatch(nextEntries)
    setStageExcluded((previous) => [
      ...previous,
      ...removed.map((entry) => ({ entry, reason: 'different' as const, groupKey })),
    ])
    for (const entry of removed) {
      const key = draftKeyOfMasterPath(entry.masterPath)
      removeStageTable(key, entry.masterPath)
      setStageTableStates((previous) => {
        const next = { ...previous }
        delete next[key]
        return next
      })
      setStageChoiceOverride((previous) => {
        const next = { ...previous }
        delete next[entry.masterPath]
        return next
      })
      setStageManualChoices((previous) => {
        if (!(entry.masterPath in previous)) return previous
        const next = { ...previous }
        delete next[entry.masterPath]
        return next
      })
    }
    setStageNotice(t('已只留 {value0} 一份；另外 {length} 份可撤销。', { value0: String(basenameOf(group.entries[0].masterPath)), length: String(removed.length) }))
  }

  // 同名且内容相同：扫完后自动折叠成一份（真的移出批次，执行不会做两遍），并给撤销口。
  useEffect(() => {
    if (!multiPsdSelection || stageScanBusy) return
    const groups = groupDuplicateDrafts(multiPsdSelection.entries)
    const targets = groups.filter(
      (group) =>
        group.state === 'identical' &&
        !stageDuplicateSeparate[group.key] &&
        !stageExcluded.some((item) => item.groupKey === group.key),
    )
    if (targets.length === 0) return
    const removed: Array<{ entry: MultiPsdEntry; reason: 'identical'; groupKey: string }> = []
    const drop = new Set<string>()
    for (const group of targets) {
      for (const entry of group.entries.slice(1)) {
        drop.add(entry.masterPath)
        removed.push({ entry, reason: 'identical', groupKey: group.key })
      }
    }
    if (removed.length === 0) return
    const nextEntries = multiPsdSelection.entries.filter((entry) => !drop.has(entry.masterPath))
    setMultiPsdSelection({ entries: nextEntries })
    ensureActiveDraftInBatch(nextEntries)
    setStageManualChoices((previous) => {
      const next = { ...previous }
      for (const item of removed) delete next[item.entry.masterPath]
      return next
    })
    setStageExcluded((previous) => [...previous, ...removed])
    setStageNotice(
      t('发现 {length} 组同名且内容相同的稿，已按一份算；需要分开可在提示条里撤销。', { length: String(targets.length) }),
    )
  }, [multiPsdSelection, stageScanState?.running, stageDuplicateSeparate, stageExcluded])

  const stageDuplicateGroups = useMemo(
    () => groupDuplicateDrafts(multiPsdSelection?.entries ?? []),
    [multiPsdSelection],
  )

  const stageDuplicateAlerts = useMemo(() => {
    const byKey = new Map<string, StageDuplicateAlert>()
    for (const group of stageDuplicateGroups) {
      const members = group.entries.map((entry) => ({
        masterPath: entry.masterPath,
        temporarilyRemoved: false,
      }))
      if (group.state === 'unknown') {
        byKey.set(group.key, { key: group.key, name: group.name, count: members.length, state: 'unknown', members })
      } else if (group.state === 'different') {
        byKey.set(group.key, {
          key: group.key,
          name: group.name,
          count: members.length,
          state: 'different',
          members,
          canKeepOne: true,
        })
      }
    }
    for (const item of stageExcluded) {
      if (!item.groupKey) continue
      const existing = byKey.get(item.groupKey)
      const member = { masterPath: item.entry.masterPath, temporarilyRemoved: true }
      if (existing) {
        if (!existing.members?.some((entry) => entry.masterPath === member.masterPath)) {
          existing.members = [...(existing.members ?? []), member]
        }
        existing.count = existing.members.length
        existing.canRestore = true
      } else {
        const activeMembers = (multiPsdSelection?.entries ?? [])
          .filter((entry) => basenameOf(entry.masterPath).toLowerCase() === item.groupKey)
          .map((entry) => ({ masterPath: entry.masterPath, temporarilyRemoved: false }))
        const members = [...activeMembers, member]
        byKey.set(item.groupKey, {
          key: item.groupKey,
          name: basenameOf(item.entry.masterPath),
          count: members.length,
          state: item.reason === 'identical' ? 'identical' : 'different',
          members,
          canRestore: true,
        })
      }
    }
    return Array.from(byKey.values())
  }, [stageDuplicateGroups, stageExcluded, multiPsdSelection])

  // 触发自动读表：只用「路径+选择+交付物」的签名做依赖，避免扫描轮询每 2 秒
  // 重建 plan 对象就把在读的表全部取消重来。
  // 组清单按**排序后**拼：读完全组才知道行数、基准会换到第一张，那种换序不需要重读。
  const stageReadSignature = useMemo(() => {
    if (!stagePlan) return ''
    return stagePlan.rows
      .map((row) => {
        const draftPath = row.draft.masterPath
        const group = stageGroupTablePaths[draftPath]
        const target =
          group && group.length > 0 ? groupSignatureOf(group) : (stageResolved.choices[draftPath] ?? '')
        const allocationPaths = row.candidates.map((candidate) => candidate.path)
        if (stageResolved.choices[draftPath]) allocationPaths.push(stageResolved.choices[draftPath])
        const fingerprint = fingerprintByDraft[draftPath]
        if (fingerprint) {
          allocationPaths.push(...Object.values(tableAllocationStore)
            .filter((allocation) => allocation.members.includes(fingerprint))
            .map((allocation) => allocation.tablePath))
        }
        const allocations = allocationSignatureOf(tableAllocationStore, allocationPaths)
        return `${draftPath}\u0000${target}\u0000${row.identity.deliverable}\u0000${allocations}`
      })
      .join('\n')
  }, [stagePlan, stageResolved.choices, stageGroupTablePaths, tableAllocationStore, fingerprintByDraft])
  const stageReadInputRef = useRef({
    plan: stagePlan,
    choices: stageResolved.choices,
    groupTables: stageGroupTablePaths,
    root: folderSnapshot?.root ?? '',
    allocations: tableAllocationStore,
    fingerprints: fingerprintByDraft,
    manualChoices: stageManualChoices,
    choiceOverrides: stageChoiceOverride,
  })
  // 渲染期不改 ref（React Compiler 规则）：layout effect 在下面的读表 effect 之前跑。
  useLayoutEffect(() => {
    stageReadInputRef.current = {
      plan: stagePlan,
      choices: stageResolved.choices,
      groupTables: stageGroupTablePaths,
      root: folderSnapshot?.root ?? '',
      allocations: tableAllocationStore,
      fingerprints: fingerprintByDraft,
      manualChoices: stageManualChoices,
      choiceOverrides: stageChoiceOverride,
    }
  }, [stagePlan, stageResolved.choices, stageGroupTablePaths, folderSnapshot?.root, tableAllocationStore, fingerprintByDraft, stageManualChoices, stageChoiceOverride])

  useEffect(() => {
    const input = stageReadInputRef.current
    if (!input.plan || !input.root) return
    const plan = input.plan
    const runId = stageReadRunRef.current + 1
    stageReadRunRef.current = runId
    const todo = plan.rows.filter((row) => {
      const paths = input.groupTables[row.draft.masterPath]
      const tablePath = paths && paths.length > 0 ? paths[0] : input.choices[row.draft.masterPath]
      if (!tablePath) return false
      const key = draftKeyOfMasterPath(row.draft.masterPath)
      const allocationPaths = row.candidates.map((candidate) => candidate.path)
      if (input.choices[row.draft.masterPath]) allocationPaths.push(input.choices[row.draft.masterPath])
      const signature = `${groupSignatureOf(paths ?? [tablePath])}\u0000${allocationSignatureOf(input.allocations, allocationPaths)}`
      const state = stageTableStatesRef.current[key]
      // 已就绪且整组表没换过（排除/换表/人选都会改签名）才跳过；只换了一张也要重读。
      if (state?.status === 'ready' && stageTableSourceRef.current[key] === signature) return false
      if (
        state?.status === 'error' &&
        stageTableSourceRef.current[key] === signature &&
        !stageRetryRef.current.has(row.draft.masterPath)
      ) {
        return false
      }
      return true
    })
    if (todo.length === 0) return
    void runStageTableBatch(
      todo,
      async (row) => {
        if (runId !== stageReadRunRef.current) return
        const key = draftKeyOfMasterPath(row.draft.masterPath)
        const groupPaths = input.groupTables[row.draft.masterPath] ?? []
        const singlePath = input.choices[row.draft.masterPath]
        const tablePaths = groupPaths.length > 0 ? groupPaths : singlePath ? [singlePath] : []
        if (tablePaths.length === 0) return
        const allocationPaths = row.candidates.map((candidate) => candidate.path)
        if (singlePath) allocationPaths.push(singlePath)
        const signature = `${groupSignatureOf(tablePaths)}\u0000${allocationSignatureOf(input.allocations, allocationPaths)}`
        if (stageTableSourceRef.current[key] && stageTableSourceRef.current[key] !== signature) {
          removeStageTable(key, row.draft.masterPath)
        }
        stageRetryRef.current.delete(row.draft.masterPath)
        const reading: StageTableReadState = { status: 'reading', tablePath: tablePaths[0] }
        stageTableStatesRef.current = { ...stageTableStatesRef.current, [key]: reading }
        setStageTableStates((previous) => ({ ...previous, [key]: reading }))
        // 整组逐张读：loadStageTable 按表去重（一张表全批只读一次），并发仍守 2 张。
        // 某一张读失败不拖垮整组——剩下的照常合并（Owner 2026-10-26 定「只拦这一张」）。
        const reads = new Map<string, ParsedCsv | null>()
        const failures = new Map<string, { message: string; code?: string }>()
        await runStageTableBatch(
          tablePaths,
          async (tablePath) => {
            try {
              reads.set(
                tablePath,
                await loadStageTable({
                  root: input.root,
                  tablePath,
                  deliverable: row.identity.deliverable,
                }),
              )
            } catch (error) {
              reads.set(tablePath, null)
              failures.set(tablePath, {
                message: error instanceof Error ? error.message : t('读表失败'),
                code: (error as { code?: string } | undefined)?.code,
              })
            }
          },
          { concurrency: 2, isCancelled: () => runId !== stageReadRunRef.current },
        )
        if (runId !== stageReadRunRef.current) return
        const rawMembers = tablePaths
          .map((tablePath) => ({ tablePath, parsed: reads.get(tablePath) ?? null }))
          .filter((member): member is { tablePath: string; parsed: ParsedCsv } => member.parsed !== null)
        const rawParsesById: Record<string, ParsedCsv> = {}
        const effectiveParsesById: Record<string, ParsedCsv> = {}
        const members: typeof rawMembers = []
        const failedPaths = tablePaths.filter((tablePath) => reads.get(tablePath) == null)
        const readFailures = failedPaths.map(
          (tablePath) => `${basenameOf(tablePath)}：${failures.get(tablePath)?.message ?? t('读表失败')}`,
        )
        for (const member of rawMembers) {
          const id = normalizeTableId(member.tablePath)
          rawParsesById[id] = member.parsed
          const possibleOwners = plan.rows.filter((candidateRow) =>
            candidateRow.candidates.some((candidate) => normalizeTableId(candidate.path) === id),
          )
          const explicitlyChosen =
            input.manualChoices[row.draft.masterPath] === member.tablePath ||
            input.choiceOverrides[row.draft.masterPath] === member.tablePath
          const allocation = input.allocations[
            tableAllocationKey(member.tablePath, member.parsed.selectedSheetName ?? '')
          ]
          const fingerprint = input.fingerprints[row.draft.masterPath] ?? ''
          const projection = projectTableAllocation({
            parsed: member.parsed,
            allocation,
            draftFingerprint: fingerprint,
            allowUniqueAuto: possibleOwners.length === 1 || explicitlyChosen,
            availableFingerprints: Object.values(input.fingerprints),
          })
          if (projection.status === 'ready' && projection.parsed) {
            effectiveParsesById[id] = projection.parsed
            members.push({ tablePath: member.tablePath, parsed: projection.parsed })
          } else {
            readFailures.push(`${basenameOf(member.tablePath)}：${projection.reason ?? t('这张表没有分配给本稿')}`)
          }
        }
        setStageTableParsesByDraft((previous) => ({ ...previous, [row.draft.masterPath]: rawParsesById }))
        setStageEffectiveTableParsesByDraft((previous) => ({ ...previous, [row.draft.masterPath]: effectiveParsesById }))
        if (Object.keys(rawParsesById).length > 0) {
          stageTableParsesRef.current = { ...stageTableParsesRef.current, ...rawParsesById }
          setStageTableParses({ ...stageTableParsesRef.current })
        }
        if (members.length === 0) {
          const firstFailure = failures.get(tablePaths[0])
          const failed: StageTableReadState = {
            status: 'error',
            tablePath: tablePaths[0],
            message: firstFailure?.message ?? readFailures[0] ?? t('读表失败'),
            code: firstFailure?.code ?? (readFailures.length > 0 ? 'TABLE_ALLOCATION_BLOCKED' : undefined),
          }
          stageTableSourceRef.current[key] = signature
          stageTableStatesRef.current = { ...stageTableStatesRef.current, [key]: failed }
          setStageTableStates((previous) => ({ ...previous, [key]: failed }))
          return
        }
        const basisPath = members[0].tablePath
        let parsed: ParsedCsv
        let warnings: string[]
        try {
          if (members.length === 1) {
            parsed = members[0].parsed
            warnings = [...(parsed.warnings ?? []), ...readFailures]
          } else {
            const merged = mergeTableGroup(
              members.map((member) => ({
                id: normalizeTableId(member.tablePath),
                fileName: basenameOf(member.tablePath),
                parsed: member.parsed,
              })),
            )
            parsed = merged.parsed
            warnings = [
              ...(parsed.warnings ?? []),
              ...readFailures,
              ...merged.rejected.map((reject) => `${reject.fileName}：${reject.detail}`),
            ]
          }
        } catch (error) {
          const failed: StageTableReadState = {
            status: 'error',
            tablePath: basisPath,
            message: error instanceof Error ? error.message : t('这一组表合并失败'),
            code: (error as { code?: string } | undefined)?.code,
          }
          stageTableSourceRef.current[key] = signature
          stageTableStatesRef.current = { ...stageTableStatesRef.current, [key]: failed }
          setStageTableStates((previous) => ({ ...previous, [key]: failed }))
          return
        }
        stageTableSourceRef.current[key] = signature
        const nextTables = { ...parsedTablesRef.current, [key]: parsed }
        parsedTablesRef.current = nextTables
        setParsedTables(nextTables)
        delete draftSnapshotsRef.current[key]
        setInactiveDraftSnapshots((previous) => {
          if (!(key in previous)) return previous
          const next = { ...previous }
          delete next[key]
          return next
        })
        if (key === activeDraftKeyRef.current) {
          applyDraftSnapshot(key, null, parsed, activeDraftScanIdRef.current)
        }
        // tablePath 交**基准表**（整组第一张）：表册与下游按它反查这一稿用的是哪张表。
        const ready: StageTableReadState = { status: 'ready', tablePath: basisPath, warnings }
        stageTableStatesRef.current = { ...stageTableStatesRef.current, [key]: ready }
        setStageTableStates((previous) => ({ ...previous, [key]: ready }))
      },
      { concurrency: 1, isCancelled: () => runId !== stageReadRunRef.current },
    )
    // 依赖只放签名/根/重试号；plan 对象本身会被扫描轮询重建。
  }, [stageReadSignature, folderSnapshot?.root, stageReadNonce])

  // 冲突候选的结构摘要：只读尚未定的冲突行候选，用来把“两套表结构不一样”说清楚。
  // 独立于自动读表（冲突行没有选择，不会走上面那条），并发仍是 2。
  const stageProbeSignature = useMemo(() => {
    if (!stagePlan) return ''
    return stagePlan.rows
      .filter((row) => row.status === 'conflict' && !stageResolved.choices[row.draft.masterPath])
      .map(
        (row) =>
          `${row.draft.masterPath}|${row.identity.deliverable}|${row.candidates
            .map((candidate) => candidate.path)
            .join(',')}`,
      )
      .join('\n')
  }, [stagePlan, stageResolved.choices])
  const stageProbeInputRef = useRef({ plan: stagePlan, root: folderSnapshot?.root ?? '' })
  useLayoutEffect(() => {
    stageProbeInputRef.current = { plan: stagePlan, root: folderSnapshot?.root ?? '' }
  }, [stagePlan, folderSnapshot?.root])

  useEffect(() => {
    const input = stageProbeInputRef.current
    if (!input.plan || !input.root) return
    const runId = stageProbeRunRef.current + 1
    stageProbeRunRef.current = runId
    const seen = new Set<string>()
    const todo = input.plan.rows
      .filter((row) => row.status === 'conflict' && !stageResolved.choices[row.draft.masterPath])
      .flatMap((row) =>
        row.candidates.map((candidate) => ({
          key: `${row.draft.masterPath}::${candidate.path}`,
          tablePath: candidate.path,
          deliverable: row.identity.deliverable,
        })),
      )
      .filter((item) => {
        if (seen.has(item.key)) return false
        seen.add(item.key)
        const state = stageProbesRef.current[item.key]
        return !state || state.status === 'error'
      })
    if (todo.length === 0) return
    void runStageTableBatch(
      todo,
      async (item) => {
        if (runId !== stageProbeRunRef.current) return
        const reading: StageTableProbe = { status: 'reading', sheets: 0, languages: 0, rows: 0 }
        stageProbesRef.current = { ...stageProbesRef.current, [item.key]: reading }
        setStageProbes((previous) => ({ ...previous, [item.key]: reading }))
        try {
          const parsed = await loadStageTable({
            root: input.root,
            tablePath: item.tablePath,
            deliverable: item.deliverable,
          })
          if (runId !== stageProbeRunRef.current) return
          const probe = probeParsedTable(parsed)
          stageProbesRef.current = { ...stageProbesRef.current, [item.key]: probe }
          setStageProbes((previous) => ({ ...previous, [item.key]: probe }))
        } catch (error) {
          if (runId !== stageProbeRunRef.current) return
          const failed: StageTableProbe = {
            status: 'error',
            sheets: 0,
            languages: 0,
            rows: 0,
            message: error instanceof Error ? error.message : t('结构读不到'),
          }
          stageProbesRef.current = { ...stageProbesRef.current, [item.key]: failed }
          setStageProbes((previous) => ({ ...previous, [item.key]: failed }))
        }
      },
      { concurrency: 2, isCancelled: () => runId !== stageProbeRunRef.current },
    )
    // 只跟冲突签名/根走；probes 自身变化不触发重读。
  }, [stageProbeSignature, folderSnapshot?.root])

  const stageScanPending = useMemo(
    () => (multiPsdSelection?.entries ?? []).filter((entry) => !isMultiPsdEntryScanned(entry)).length,
    [multiPsdSelection],
  )
  const stageSkippedDrafts = useMemo(
    () =>
      stageExcluded
        .filter((item) => item.reason === 'skipped')
        .map((item) => ({ masterPath: item.entry.masterPath, name: basenameOf(item.entry.masterPath) })),
    [stageExcluded],
  )

  const stageTableUsedBy = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [draftPath, tablePath] of Object.entries(stageResolved.choices)) {
      out[tablePath] = basenameOf(draftPath)
    }
    return out
  }, [stageResolved.choices])

  const stageReadStatesByPath = useMemo(() => {
    const out: Record<string, StageTableReadState> = {}
    for (const entry of multiPsdSelection?.entries ?? []) {
      const state = stageTableStates[draftKeyOfMasterPath(entry.masterPath)]
      if (state) out[entry.masterPath] = state
    }
    return out
  }, [multiPsdSelection, stageTableStates])

  const stageGate = useMemo(() => {
    if (!stagePlan || (multiPsdSelection?.entries.length ?? 0) === 0) {
      return { ok: false, blockers: [] as ReturnType<typeof evaluateStageGate>['blockers'] }
    }
    const entries = (multiPsdSelection?.entries ?? []).map((entry) => ({
      masterPath: entry.masterPath,
      name: basenameOf(entry.masterPath),
      scanned: isMultiPsdEntryScanned(entry),
    }))
    const reads: Record<string, { status: 'idle' | 'reading' | 'ready' | 'error'; tablePath?: string; message?: string }> = {}
    for (const entry of entries) {
      const state = stageTableStates[draftKeyOfMasterPath(entry.masterPath)]
      reads[entry.masterPath] = state
        ? { status: state.status, tablePath: state.tablePath, message: state.message }
        : { status: 'idle' }
    }
    return evaluateStageGate({
      entries,
      rows: stageGateRowsFromPlan(stagePlan, stageResolved.choices),
      reads,
      duplicateUnknown: stageDuplicateGroups.filter((group) => group.state === 'unknown').length,
    })
  }, [stagePlan, stageResolved.choices, stageTableStates, multiPsdSelection, stageDuplicateGroups])

  const stageBlockNotice = () => {
    const names = (kind: 'unscanned' | 'pending-choice' | 'missing-table' | 'read-error' | 'unread') =>
      stageGate.blockers
        .filter((blocker) => blocker.kind === kind)
        .slice(0, 3)
        .map((blocker) => blocker.name)
        .join(t('、'))
    const countOf = (kind: string) => stageGate.blockers.filter((blocker) => String(blocker.kind) === kind).length
    const parts: string[] = []
    const unscanned = countOf('unscanned')
    if (unscanned) {
      parts.push(t('还有 {count} 份没扫描（{names}）', { count: String(unscanned), names: names('unscanned') }))
    }
    const pendingChoice = countOf('pending-choice')
    if (pendingChoice) {
      parts.push(t('{count} 份还没拍板（{names}）', { count: String(pendingChoice), names: names('pending-choice') }))
    }
    const missingTable = countOf('missing-table')
    if (missingTable) {
      parts.push(t('{count} 份缺表（{names}）', { count: String(missingTable), names: names('missing-table') }))
    }
    const readError = countOf('read-error')
    if (readError) {
      parts.push(t('{count} 份读表失败（{names}）', { count: String(readError), names: names('read-error') }))
    }
    const unread = countOf('unread')
    if (unread) {
      parts.push(t('{count} 份表还在读（{names}）', { count: String(unread), names: names('unread') }))
    }
    if (countOf('duplicate-unknown')) {
      parts.push(t('有同名稿还没扫描完，内容没法比对'))
    }
    return parts.join(t('；')) || t('还不能进入下一步。')
  }

  const handleStageNext = () => {
    if (!stageGate.ok) {
      setStageNotice(stageBlockNotice())
      return
    }
    // 当前稿没有表时，自动切到第一份有表的稿：否则第 2 步会被 !parsed 锁住。
    if (!parsedTablesRef.current[activeDraftKeyRef.current]) {
      const first = (multiPsdSelection?.entries ?? []).find(
        (entry) => parsedTablesRef.current[draftKeyOfMasterPath(entry.masterPath)],
      )
      if (first) activateDraft(draftKeyOfMasterPath(first.masterPath), { scanId: first.scanId })
    }
    setStageNotice(null)
    setActiveStage('translation_review')
  }

  // 下拉框里把「候选表」排前面：冲突行第一眼就能看到该选的那几张，其余表排后面并标注。
  const bulkAttributionOptions = useMemo(() => {
    const out = new Map<string, Array<FolderTableEntry & { file?: File }>>()
    if (!bulkImport) return out
    const byPath = new Map(bulkImport.tables.map((table) => [table.path, table]))
    for (const row of bulkImport.attribution.rows) {
      const candidatePaths = new Set(row.candidates.map((candidate) => candidate.path))
      const candidates = row.candidates
        .map((candidate) => byPath.get(candidate.path))
        .filter((table): table is FolderTableEntry & { file?: File } => Boolean(table))
      const rest = bulkImport.tables.filter((table) => !candidatePaths.has(table.path))
      out.set(row.draft.masterPath, [...candidates, ...rest])
    }
    return out
  }, [bulkImport])

  // ─── 文件夹批量导入：配对确认 + 一次读表（2026-10-21）──────────────────────
  // 只在批量模式出现；单稿的 CsvStep 一字不动。配对只是建议，用户确认才读表。
  const openBulkImport = (payload: {
    root: string
    tables: FolderTableEntry[]
    pairing: TablePairingResult
  }) => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能替换译文表。请先核对原任务或完成积分退回。'))
      return
    }
    // 自动归属（2026-10-23）：唯一候选才预选；多候选/多稿抢一张表一律留空要人定。
    const attribution = buildAttributionPlan(
      (multiPsdSelection?.entries ?? []).map((entry) => ({
        masterPath: entry.masterPath,
        relPath: basenameOf(entry.masterPath),
      })),
      payload.tables.map((table) => ({ path: table.path, relPath: table.relPath })),
    )
    setBulkChoices({ ...attributionAutoChoices(attribution), ...rememberedAttributionChoices(attribution) })
    setBulkErrors([])
    setBulkNotice(null)
    setBulkProgress(null)
    setBulkImport({
      kind: 'folder',
      root: payload.root,
      tables: payload.tables,
      pairing: payload.pairing,
      attribution,
    })
  }

  // 工作台已有多稿时，直接多选表格文件：一次选完、按文件名/目录配对，逐个确认。
  // 走浏览器 File 而非助手端点，因此不依赖译文表在不在扫描过的文件夹里。
  const openFilesBulkImport = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能替换译文表。请先核对原任务或完成积分退回。'))
      return
    }
    const entries = multiPsdSelection?.entries ?? []
    if (entries.length === 0) {
      setBulkNotice(t('先把设计稿加入工作台，再批量导入译文表。'))
      return
    }
    const rejected: string[] = []
    const tables: Array<FolderTableEntry & { file?: File }> = []
    for (const file of files) {
      if (!TABLE_FILE_RE.test(file.name)) {
        rejected.push(t('{name}（不是表格）', { name: file.name }))
        continue
      }
      if (file.size > MAX_TABLE_BYTES) {
        rejected.push(t('{name}（超过 5MB）', { name: file.name }))
        continue
      }
      const relPath = file.webkitRelativePath || file.name
      tables.push({
        path: `file:${tables.length}:${relPath}`,
        relPath,
        ext: (relPath.split('.').pop() ?? '').toLowerCase(),
        dir: relPath.includes('/') ? relPath.slice(0, relPath.lastIndexOf('/')) : '',
        file,
      })
    }
    if (tables.length === 0) {
      setBulkNotice(t('选中的文件都不是可用的译文表：{value0}', { value0: String(rejected.join('、')) }))
      return
    }
    const pairing = pairDesignsWithTables(
      entries.map((entry) => ({ path: entry.masterPath, relPath: basenameOf(entry.masterPath) })),
      tables,
    )
    // 自动归属：与文件夹导入同一套判据（内核唯一），这里只是把表来源换成浏览器文件。
    const attribution = buildAttributionPlan(
      entries.map((entry) => ({
        masterPath: entry.masterPath,
        relPath: basenameOf(entry.masterPath),
      })),
      tables.map((item) => ({ path: item.path, relPath: item.relPath })),
    )
    setBulkChoices({ ...attributionAutoChoices(attribution), ...rememberedAttributionChoices(attribution) })
    setBulkErrors([])
    setBulkNotice(
      rejected.length > 0 ? t('已跳过 {length} 个文件：{value1}', { length: String(rejected.length), value1: String(rejected.join('、')) }) : null,
    )
    setBulkProgress(null)
    setBulkImport({ kind: 'files', tables, pairing, attribution })
  }

  const applyBulkTables = (assignments: Record<string, ParsedCsv>) => {
    const nextTables = { ...parsedTablesRef.current, ...assignments }
    parsedTablesRef.current = nextTables
    setParsedTables(nextTables)
    for (const key of Object.keys(assignments)) {
      delete draftSnapshotsRef.current[key]
    }
    setInactiveDraftSnapshots((previous) => {
      const next = { ...previous }
      for (const key of Object.keys(assignments)) delete next[key]
      return next
    })
    const currentKey = activeDraftKeyRef.current
    if (assignments[currentKey]) {
      applyDraftSnapshot(currentKey, null, assignments[currentKey], activeDraftScanIdRef.current)
      setFocusReviewAfterImport(true)
      return
    }
    const firstKey = Object.keys(assignments)[0]
    const entry = (multiPsdSelection?.entries ?? []).find(
      (candidate) => draftKeyOfMasterPath(candidate.masterPath) === firstKey,
    )
    if (entry) switchActiveDraft(entry)
  }

  const confirmBulkImport = async () => {
    if (!bulkImport || bulkImporting) return
    if (executionAuthorized) {
      setBulkNotice(t('本次执行尚未完成结算，不能替换译文表。请先核对原任务或完成积分退回。'))
      return
    }
    const tableByPath = new Map(bulkImport.tables.map((table) => [table.path, table]))
    const targets = bulkImport.attribution.rows
      .map((row) => ({ row, tablePath: bulkChoices[row.draft.masterPath] ?? '' }))
      .filter((item) => item.tablePath.length > 0)
    if (targets.length === 0) {
      setBulkNotice(t('还没有为任何一稿选择译文表。可以逐行选一张，或先关闭这个窗口。'))
      return
    }
    setBulkImporting(true)
    setBulkErrors([])
    setBulkTableWarnings([])
    setBulkProgress({ done: 0, total: targets.length })
    const assignments: Record<string, ParsedCsv> = {}
    const failures: Array<{ design: string; message: string }> = []
    const warnings: string[] = []
    // 一表一稿：同 SKU＋同交付物内，一张表只能给一份稿。跨交付物共用同一本
    // 工作簿（主图 / A+ 各取自己的 sheet）仍然允许，不能一刀切成全局唯一。
    const tableUsedByGroup = new Map<string, string>()
    for (let index = 0; index < targets.length; index += 1) {
      const { row, tablePath } = targets[index]
      try {
        const table = tableByPath.get(tablePath)
        if (!table) throw new Error(t('这张表已不在候选清单里，请重新选择。'))
        const key = draftKeyOfMasterPath(row.draft.masterPath)
        if (assignments[key]) throw new Error(t('同一稿只能有一张表，请取消重复选择。'))
        const groupKey = row.identity.sku
          ? `${row.identity.sku}·${row.identity.deliverable}::${tablePath.toLowerCase()}`
          : null
        if (groupKey) {
          const usedBy = tableUsedByGroup.get(groupKey)
          if (usedBy) {
            throw new Error(
              t('这张表已经给了同一 SKU、同一交付物的另一份稿（{name}）；一张表只够一份，请换一张。', {
                name: basenameOf(usedBy),
              }),
            )
          }
        }
        const file = table.file
          ? { name: table.file.name, bytes: await table.file.arrayBuffer() }
          : await readPreparationTable(bulkImport.root ?? '', table.path)
        // 归属内核：按**这份稿**要哪种交付物选 sheet。多工作表的工作簿
        // （`5857\ES 西班牙-5857.xlsx` = 主图 + A+）原来固定读第一个 sheet，
        // A+ 的稿会拿到「主图」的行。没读进来的 sheet 必须在警告里说出来。
        const deliverable = row.identity.deliverable
        const parsedTable = removeEmptyParsedRows(
          parseTableBytes(file.bytes, file.name, { deliverable }),
        )
        if (parsedTable.rows.length === 0) throw new Error(t('表里没有可用的译文行。'))
        for (const warning of parsedTable.warnings) {
          warnings.push(`${row.draft.relPath}：${warning}`)
        }
        assignments[key] = parsedTable
        if (groupKey) tableUsedByGroup.set(groupKey, row.draft.masterPath)
      } catch (error) {
        failures.push({
          design: row.draft.relPath,
          message: error instanceof Error ? error.message : t('读取失败'),
        })
      }
      setBulkProgress({ done: index + 1, total: targets.length })
    }
    setBulkImporting(false)
    setBulkErrors(failures)
    const importedCount = Object.keys(assignments).length
    if (importedCount === 0) {
      setBulkNotice(t('这一批没有一张表导入成功，原因见下。'))
      return
    }
    applyBulkTables(assignments)
    setBulkNotice(
      t('已为 {importedCount} 稿导入译文表{value1}', { importedCount: String(importedCount), value1: String(failures.length > 0 ? t('；{count} 稿失败，原因见下', { count: failures.length }) : t('。')) }),
    )
    if (warnings.length > 0) setBulkTableWarnings(warnings)
    if (failures.length === 0) setBulkImport(null)
  }

  // ===== #140/D5：执行前覆盖率闸 =====
  // v7：每稿只用自己的译文表估算。矩阵组件与闸都经 calcCoverageMatrixForDraftTables 取数，
  // 杜绝「矩阵显示一套、闸算另一套」；低于 COVERAGE_THRESHOLD 的格子必须显式放行才能开始。
  const coverageDrafts = useMemo<CoverageDraftLike[]>(() => {
    if (!batchMode) return []
    return (multiPsdSelection?.entries ?? []).map((entry) => {
      const key = draftKeyOfMasterPath(entry.masterPath)
      const table = key === activeDraftKey ? parsed : parsedTables[key] ?? null
      return {
        masterPath: entry.masterPath,
        summary: entry.summary,
        table: table
          ? {
              languageColumns: table.languageColumns,
              rows: table.rows.map((row) => ({ source: row.source })),
            }
          : null,
      }
    })
  }, [batchMode, multiPsdSelection, activeDraftKey, parsed, parsedTables])

  const scannedByDraft = useMemo<Record<string, boolean>>(
    () => Object.fromEntries(
      (multiPsdSelection?.entries ?? []).map((entry) => [
        entry.masterPath,
        isMultiPsdEntryScanned(entry),
      ]),
    ),
    [multiPsdSelection],
  )

  // 每稿一份证据来自它实际使用的解析表；矩阵与第 1 步共用同一派生。
  //
  // 必须优先用「这一步实际会执行的片」（stageEffectiveTableParsesByDraft：已过
  // projectTableAllocation），而不是读表缓存的原始整表：合表按归属切开后，
  // 整表的原文覆盖率会替本片作答——那就是矩阵说全覆盖、本片其实缺行的第二套真值。
  // 没有该稿有效片记录时（老的一稿一表路径）才退回原始解析。
  const matrixDeclaredTableIdsByDraft = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    const tablePathById = new Map((folderSnapshot?.scan.tables ?? []).map((table) => [normalizeTableId(table.path), table.path]))
    for (const entry of multiPsdSelection?.entries ?? []) {
      const fingerprint = fingerprintByDraft[entry.masterPath]
      if (!fingerprint) continue
      for (const [tableId, effective] of Object.entries(stageEffectiveTableParsesByDraft[entry.masterPath] ?? {})) {
        const tablePath = tablePathById.get(tableId)
        const raw = stageTableParsesByDraft[entry.masterPath]?.[tableId]
        if (!tablePath || !raw) continue
        const allocation = tableAllocationStore[tableAllocationKey(tablePath, raw.selectedSheetName ?? '')]
        if (allocation?.members.includes(fingerprint) && allocation.tableDigest === tableAllocationDigest(raw)) {
          const ids = out[entry.masterPath] ?? (out[entry.masterPath] = [])
          if (!ids.includes(tableId)) ids.push(tableId)
        }
        // Reading the effective object here makes stale allocations fail closed if a parse variant changed.
        void effective
      }
    }
    return out
  }, [folderSnapshot, multiPsdSelection, fingerprintByDraft, stageEffectiveTableParsesByDraft, stageTableParsesByDraft, tableAllocationStore])
  const matrixEvidenceByDraft = useMemo(
    () =>
      buildBindingEvidences({
        drafts: coverageDrafts,
        groups: stageGroupBindings?.groups,
        tableParsesById: stageTableParses,
        tableParsesByDraft: stageEffectiveTableParsesByDraft,
        declaredTableIdsByDraft: matrixDeclaredTableIdsByDraft,
      }),
    [coverageDrafts, stageGroupBindings, stageTableParses, stageEffectiveTableParsesByDraft, matrixDeclaredTableIdsByDraft],
  )

  // 执行面板、矩阵和启动闸共用逐稿范围；这里不再单独退回整表语言列。
  const multiDraftLanguages = useMemo<Record<string, string[]>>(() => {
    if (!batchMode) return {}
    const result: Record<string, string[]> = {}
    for (const entry of multiPsdSelection?.entries ?? []) {
      result[entry.masterPath] = languagesByDraftRuntime[entry.masterPath] ?? []
    }
    return result
  }, [batchMode, multiPsdSelection, languagesByDraftRuntime])

  // v13：多稿档「每稿一行」的完整数据（含注意判定）。
  //
  // 口径纪律：注意判定统一走 `classifyDraftAttention`（draft-groups.ts），面板与组卡片
  // 都只渲染、不自己判——否则就会重演 v12 F11 那类「状态带说 9 个、稿表说 10 个」。
  // 「已确认语言数」的算法与原面板逐字一致（translationLanguageDigest 比对），
  // 这里只是把它从 JSX 里搬出来，算法没改。
  const draftTableRows = useMemo<Array<DraftTableRow & { confirmedLanguages: string[] }>>(() => {
    if (!batchMode) return []
    return (multiPsdSelection?.entries ?? []).map((entry) => {
      const key = draftKeyOfMasterPath(entry.masterPath)
      const active = key === activeDraftKey
      const table = active ? parsed : parsedTables[key] ?? null
      const snapshot = active ? null : inactiveDraftSnapshots[key] ?? null
      const languages = languagesByDraftRuntime[entry.masterPath] ?? []
      const reviewedDigests = active
        ? reviewedLanguageDigests
        : snapshot?.reviewedLanguageDigests ?? {}
      const confirmedLanguages = confirmedLanguagesOf({
        table,
        languages,
        reviewedDigests,
        editedTranslations: active ? editedTranslations : (snapshot?.editedTranslations ?? {}),
        extrasByLanguage: active
          ? sheetExtrasByLanguage
          : (snapshot?.sheetExtrasByLanguage ?? {}),
      })
      const reviewedCount = confirmedLanguages.length
      // 阻断项：当前稿用活的 batchResult，其余稿用切走时留下的快照。
      // 没有快照 = 还没审过这份稿 ⇒ 不知道（null），不猜。
      const blockedItems = active
        ? batchResult?.summary.decisionCount ?? 0
        : snapshot?.batchResult?.summary.decisionCount ?? null
      const attention = classifyDraftAttention({
        scanState: entry.state,
        scanned: isMultiPsdEntryScanned(entry),
        hasTable: Boolean(table),
        languageCount: languages.length,
        unconfirmedLanguages: Math.max(0, languages.length - reviewedCount),
        blockedItems,
      })
      return {
        masterPath: entry.masterPath,
        basename: basenameOf(entry.masterPath),
        state: entry.state,
        hasTable: Boolean(table),
        rowCount: table?.rows.length ?? 0,
        languageCount: table?.languageColumns.length ?? 0,
        reviewedCount,
        languages,
        confirmedLanguages,
        attention,
      }
    })
  }, [
    batchMode,
    multiPsdSelection,
    activeDraftKey,
    parsed,
    parsedTables,
    inactiveDraftSnapshots,
    targetLanguages,
    reviewedLanguageDigests,
    editedTranslations,
    sheetExtrasByLanguage,
    batchResult,
    languagesByDraftRuntime,
  ])

  const matrixScopeByDraft = useMemo(
    () => Object.fromEntries(draftTableRows.map((row) => [row.masterPath, row.languages])) as Record<string, string[]>,
    [draftTableRows],
  )
  const matrixConfirmedByDraft = useMemo(
    () => Object.fromEntries(draftTableRows.map((row) => [row.masterPath, row.confirmedLanguages])) as Record<string, string[]>,
    [draftTableRows],
  )

  // v13 审稿队列：还有几份稿没审完（没表 / 没选语言 / 有语言没确认）。
  // 「审完」的判据只用既有事实，不另立状态机（isDraftFullyReviewed）。
  const unreviewedDraftPaths = useMemo(
    () =>
      draftTableRows
        .filter(
          (row) =>
            !isDraftFullyReviewed({
              hasTable: row.hasTable,
              languageCount: row.languages.length,
              reviewedCount: row.reviewedCount,
            }),
        )
        .map((row) => row.masterPath),
    [draftTableRows],
  )

  const batchCoverageCells: CoverageMatrixCell[] = useMemo(() => {
    if (!batchMode) return []
    return calcCoverageMatrixForDraftTables(coverageDrafts)
  }, [batchMode, coverageDrafts])
  const batchCoverageBelow = useMemo(
    // #190：只有真有分母的格子才参与「低于阈值」判定。无法估算的格子既不判绿也不判红，
    // 由矩阵如实显示「无法估算」，命中率仍以第 3 步对账为准。
    () => batchCoverageCells.filter((c) => c.estimable && c.coverage < COVERAGE_THRESHOLD),
    [batchCoverageCells],
  )

  // 放行只对「这一批稿 × 每一稿各自的表」有效：集合、表内容或低于阈值清单任一变化即失效重置。
  const coverageGateSignature = useMemo(() => {
    const selectionSig = multiPsdSelection?.entries?.map((e) => e.masterPath).join('|') ?? ''
    const tableSig = coverageDrafts
      .map((draft) =>
        draft.table
          ? digestWorkbenchValue({
              languages: draft.table.languageColumns,
              sources: draft.table.rows.map((row) => row.source),
            })
          : 'no-table',
      )
      .join('|')
    const belowSig = batchCoverageBelow.map((c) => `${c.psdIndex}:${c.lang}:${c.coverage}`).join(',')
    return `${selectionSig}##${tableSig}##${belowSig}`
  }, [multiPsdSelection, coverageDrafts, batchCoverageBelow])

  useEffect(() => {
    setCoverageReleaseAck(false)
  }, [coverageGateSignature])

  // ===== 单稿 / 多稿 模式切换（2026-10-18）=================================
  // 由页头分段切换器调用。三条纪律：
  //   ① 单 → 多直接切，已选的那个稿带过去，不丢；
  //   ② 多 → 单且本批超过 1 个稿时**必须先确认**，把会被移出的稿点名，绝不静默丢；
  //   ③ 执行中不给切（跨模式会打断逐稿编排）。
  // 不用 useCallback：切模式要捕获当前稿的界面现场（译表/编辑/审查），
  // 依赖数组漏一项就会把旧值存进快照再灌回去。每次渲染重建，闭包恒为最新。
  const requestModeChange = (nextMulti: boolean) => {
      if (nextMulti === batchMode) return
      if (experimentRunning) {
        setExperimentNotice(t('正在执行批量任务，等这一批跑完再切换。'))
        return
      }
      if (batchReviewRunning || retryingLanguage) {
        setExperimentNotice(t('当前稿的智能检测仍在进行，等它完成后再切换单稿/多稿。'))
        return
      }
      if (nextMulti) {
        setBatchMode(true)
        // 2026-10-18 修「切了多稿但界面没变化」：
        // 卡片是否走多稿渲染的判据是 `batchMode && multiSelection`
        // （design-file-card.tsx:929）。首屏 multiSelection 是 null（:298 只在
        // batchMode 为真时才初始化），而本函数原先只 setBatchMode(true)，
        // 于是判据右半边恒为假 ⇒ 卡片继续按单稿渲染，用户看到的唯一差别只有
        // 页头那枚按钮的高亮。这里补一次空集初始化；已有选择则原样保留
        // （「单 → 多，已选的那个稿带过去」这条纪律靠 prev ?? 保证）。
        setMultiPsdSelection((prev) => prev ?? clearMultiPsdSelection())
        // v7：单稿现场随「已选的那个稿」一起过继到它的稿槽；没有选中稿时
        // 先留在 SINGLE，等第一次选中设计稿时再整体过继（activateDraft 内处理）。
        const current = psdSelectionRef.current
        if (current?.masterPath) {
          activateDraft(draftKeyOfMasterPath(current.masterPath), {
            scanId: current.scanId,
          })
        }
        return
      }
      if (multiPsdSelection && multiPsdSelection.entries.length > 1) {
        // 交给弹窗确认；完成后由 confirmSwitchToSingle 真正落盘
        setModeConfirmOpen(true)
        return
      }
      setBatchMode(false)
  }

  // 弹窗按下的「切换，只保留第 1 个」
  const confirmSwitchToSingle = async () => {
    setModeConfirmOpen(false)
    if (!multiPsdSelection) {
      setBatchMode(false)
      return
    }
    const { selection: keptSelection, kept, removed } = keepFirstMultiPsdEntries(multiPsdSelection, 1)
    setMultiPsdSelection(keptSelection)
    setBatchMode(false)
    // v7：保留稿的译表与现场随它一起进单稿槽；被移出的稿只是离开本批，
    // 其表仍在浏览器内存的稿槽里（文件与用户数据都没删）。
    moveDraftToSingle(
      kept[0]
        ? draftKeyOfMasterPath(kept[0].masterPath)
        : activeDraftKeyRef.current,
    )
    if (kept.length > 0) {
      const entry = kept[0]
      // 与扫描时同一约定：taskRoot = 该稿所在目录，避免切模式后跨目录执行撞
      // MASTER_OUTSIDE_CONFIGURED_ROOT（server.js 的执行前路径闸）。
      const dir = entry.masterPath.replace(/[\\/][^\\/]*$/, '')
      try {
        await setAssistantTaskRoot(dir)
      } catch (e) {
        setExperimentNotice(
          t('已切换到单个设计稿，但任务目录切换到 {masterPath} 所在目录失败：{value1}', { masterPath: String(entry.masterPath), value1: String(e instanceof LocalAssistantRequestError ? e.message : String(e)) })
        )
        return
      }
      setPsdSelection({
        masterPath: entry.masterPath,
        state: entry.state,
        scanId: entry.scanId,
        summary: entry.summary,
        updatedAt: entry.updatedAt,
      })
    }
    if (removed.length > 0) {
      setExperimentNotice(
        t('已切换到单个设计稿，只保留 {value0}；移出本批 {length} 个：{value2}。文件本身没动，随时可以再加回来。', { value0: String(kept[0]?.masterPath ?? ''), length: String(removed.length), value2: String(removed
          .map((r) => r.masterPath)
          .join('、')) })
      )
    } else {
      setExperimentNotice(null)
    }
  }

  // ===== 批量模式：多 PSD 编排回调 =====
  // 2026-10-16 修：原先只找「第一个 prepared」就开跑，其余未扫描的稿被**静默跳过**，
  // 跑完又**静默停止**（无任何提示）。现在改为「全部扫描完成才放行」，否则点名到底卡了哪几稿。
  // v7：本函数要读各稿的实时审查现场（未确认语言必须在开跑前点名），
  // 与 requestModeChange 同理不用 useCallback，避免闭包里拿到旧审查状态。
  const handleExperimentStart = async () => {
    if (!multiPsdSelection || multiPsdSelection.entries.length === 0) return
    if (!isMultiPsdSelectionReady(multiPsdSelection)) {
      const unscanned = getMultiPsdUnscanned(multiPsdSelection)
      setExperimentNotice(
        t('还有 {length} 个设计稿没有扫描完成，暂不能开始：{value1}。请回到「准备素材」点「全部扫描」按顺序扫描（也可逐个点「扫描」）。', { length: String(unscanned.length), value1: String(unscanned
          .map((entry) => basenameOf(entry.masterPath))
          .join('、')) }),
      )
      return
    }
    if (batchReviewRunning || retryingLanguage) {
      setExperimentNotice(t('当前稿的智能检测仍在进行，等它完成后再开始批量执行。'))
      return
    }
    // v7 F11：每个稿都必须有自己的译表——缺表的稿点名拦下，绝不静默沿用别的稿的表。
    const missingTables = multiPsdSelection.entries.filter(
      (entry) => !parsedTablesRef.current[draftKeyOfMasterPath(entry.masterPath)],
    )
    if (missingTables.length > 0) {
      setExperimentNotice(
        t('还有 {length} 个设计稿没有导入译文表，暂不能开始：{value1}。请回到「准备素材」为每个稿分别导入译文表（每稿一张表，互不共用）。', { length: String(missingTables.length), value1: String(missingTables
          .map((entry) => basenameOf(entry.masterPath))
          .join('、')) }),
      )
      return
    }
    // v7：执行前每稿的全部语言都必须完成审查确认——否则逐稿推进会停在
    // 一个「交付门未开放」的稿上，而那时才报错已经晚了。
    const unreviewedDrafts: string[] = []
    for (const entry of multiPsdSelection.entries) {
      const key = draftKeyOfMasterPath(entry.masterPath)
      const table = parsedTablesRef.current[key]
      if (!table) continue
      const runtime =
        key === activeDraftKeyRef.current
          ? captureLiveDraft()
          : draftSnapshotsRef.current[key]
      // `[]` 是用户明确清空的范围；启动闸与矩阵、执行面板读同一份逐稿派生。
      const languages = languagesByDraftRuntime[entry.masterPath] ?? []
      if (languages.length === 0) {
        unreviewedDrafts.push(t('{name}（未选择语言）', { name: basenameOf(entry.masterPath) }))
        continue
      }
      const pending = languages.filter((language) => {
        const digest = translationLanguageDigest(
          table,
          language,
          runtime?.editedTranslations?.[language] ?? {},
          runtime?.sheetExtrasByLanguage?.[language] ?? [],
        )
        return runtime?.reviewedLanguageDigests?.[language] !== digest
      })
      if (pending.length > 0) {
        unreviewedDrafts.push(
          t('{name}（{languages} 未确认）', { name: basenameOf(entry.masterPath), languages: pending.map(formatLanguageCode).join(t('、')) }),
        )
      }
    }
    if (unreviewedDrafts.length > 0) {
      setExperimentNotice(
        t('还有 {length} 个设计稿的译文没有完成审查确认，暂不能开始：{value1}。请切换到对应稿完成审查后再开始。', { length: String(unreviewedDrafts.length), value1: String(unreviewedDrafts.join('；')) }),
      )
      return
    }
    // #140/D5 覆盖率闸（防御层）：UI 已禁用按钮，这里再拦一道——不放行绝不静默开跑。
    if (batchCoverageBelow.length > 0 && !coverageReleaseAck) {
      setExperimentNotice(
        t('覆盖率闸：{length} 格低于 {COVERAGE_THRESHOLD}% 阈值，需在下方勾选「显式放行」后才能开始。', { length: String(batchCoverageBelow.length), COVERAGE_THRESHOLD: String(COVERAGE_THRESHOLD) }),
      )
      return
    }
    setExperimentNotice(null)
    const entry = multiPsdSelection.entries[0]
    // ── P0-1（2026-10-18）：执行前必须把助手任务目录切到「本稿所在目录」────────
    // 服务端执行前有 MASTER_OUTSIDE_CONFIGURED_ROOT 闸（server.js:5721-5726）：
    // masterPath 必须落在 cfg.taskRoot 之下。而 taskRoot 只在扫描时被写
    // （design-file-card.tsx:247 单稿 / :534 批量逐稿），执行链从不重设。
    // ⇒ 各稿不在同一目录时，执行第 1 稿拿到的还是「最后一次扫描那稿」的目录，
    //   path.relative 得出 "..\A\1.psd" ⇒ 直接 403。
    // 今天靠「用户习惯把同一批 PSD 放同一目录」掩盖着；文件夹导入天然产生
    // 多子目录，一选就炸。修法＝与扫描时同一约定（taskRoot = 该稿所在目录）。
    try {
      await setAssistantTaskRoot(entry.masterPath)
    } catch (e) {
      setExperimentRunning(false)
      setExperimentNotice(
        t('无法把助手的任务目录切到「{value0}」所在目录，批量执行未开始：', { value0: String(basenameOf(entry.masterPath)) }) +
          (e instanceof Error ? e.message : t('请确认本地助手仍在运行。')),
      )
      return
    }
    setExperimentIndex(0)
    setExperimentRunning(true)
    // v7：执行起点先切到第 1 稿的译表与会话，再开放执行卡（两者同一批更新）。
    activateDraft(draftKeyOfMasterPath(entry.masterPath), {
      scanId: entry.scanId,
    })
    setPsdSelection({
      masterPath: entry.masterPath,
      state: entry.state,
      scanId: entry.scanId,
      summary: entry.summary,
      updatedAt: entry.updatedAt,
    })
    // 2026-10-16：起点推进也走对账门——选中变更会让交付门先关闭重对账，
    // 直接 +trigger 会在组件重挂载时被新实例的 ref 基线吞掉（编排在起点停摆）；
    // pendingAdvance 效果保证「对账完成、交付门重新开放」后才递增触发器。
    setExperimentPendingAdvance(true)
  }

  const handleExperimentPsdComplete = async (psdIndex: number, success: boolean) => {
    if (!multiPsdSelection) return
    const total = multiPsdSelection.entries.length
    const finishedEntry = multiPsdSelection.entries[psdIndex]
    if (!success) {
      // 失败即停：不自动推进（失败 PSD 未执行，跳过会造成静默漏格）；点名是哪一稿失败。
      setExperimentRunning(false)
      setExperimentPendingAdvance(false)
      setExperimentNotice(
        t('第 {value0}/{total} 个设计稿（{value2}）执行失败，已停止后续设计稿。', { value0: String(psdIndex + 1), total: String(total), value2: String(basenameOf(finishedEntry?.masterPath ?? '')) }) +
          t('请修复该稿后重新开始。'),
      )
      return
    }
    const nextIdx = psdIndex + 1
    if (nextIdx < total) {
      const nextEntry = multiPsdSelection.entries[nextIdx]
      if (!isMultiPsdEntryScanned(nextEntry)) {
        // 扫描态在运行期间被改写（stale / 重新扫描 / 失败）⇒ 点名，不静默跳过。
        setExperimentRunning(false)
        setExperimentPendingAdvance(false)
        setExperimentNotice(
          t('第 {value0} 个设计稿（{value1}）当前不是「已扫描」状态，批量执行已暂停。', { value0: String(nextIdx + 1), value1: String(basenameOf(nextEntry.masterPath)) }) +
            t('请重新扫描该稿后再开始。'),
        )
        return
      }
      // P0-1：换稿前先把助手任务目录切到下一稿所在目录（同 handleExperimentStart 的理由）。
      try {
        await setAssistantTaskRoot(nextEntry.masterPath)
      } catch (e) {
        setExperimentRunning(false)
        setExperimentPendingAdvance(false)
        setExperimentNotice(
          t('无法把助手的任务目录切到第 {value0} 个设计稿（{value1}）所在目录，批量执行已暂停：', { value0: String(nextIdx + 1), value1: String(basenameOf(nextEntry.masterPath)) }) +
            (e instanceof Error ? e.message : t('请确认本地助手仍在运行。')),
        )
        return
      }
      setExperimentIndex(nextIdx)
      // v7：切到下一稿的译表与会话，与 psdSelection 同一批更新——否则新 PSD
      // 会拿上一稿的表去对账/执行（每稿一表的根因）。
      activateDraft(draftKeyOfMasterPath(nextEntry.masterPath), {
        scanId: nextEntry.scanId,
      })
      setPsdSelection({
        masterPath: nextEntry.masterPath,
        state: nextEntry.state,
        scanId: nextEntry.scanId,
        summary: nextEntry.summary,
        updatedAt: nextEntry.updatedAt,
      })
      // 等新 PSD 对账完成、交付门重新开放后再触发下一批（见 experimentPendingAdvance 效果）。
      setExperimentPendingAdvance(true)
      return
    }
    setExperimentRunning(false)
    setExperimentNotice(
      t('全部 {total} 个设计稿已执行完成。', { total: String(total) }) +
        (batchCoverageBelow.length > 0 && coverageReleaseAck
          ? t('（覆盖率闸：执行前已显式放行 {length} 格低于 {COVERAGE_THRESHOLD}%）', { length: String(batchCoverageBelow.length), COVERAGE_THRESHOLD: String(COVERAGE_THRESHOLD) })
          : ''),
    )
  }

  // 批量原子检查：一次请求全部语言（P0-C §3.1）
  const checkable =
    !!parsed &&
    targetLanguages.length > 0 &&
    isPsdSelectionReady(psdSelection) &&
    !!psdSelection?.scanId

  const runBatchCheck = useCallback(
    async (options?: { overrideTrio?: DecisionTrio }): Promise<boolean> => {
      if (!checkable || !psdSelection || !parsed) return false
      const seq = ++checkSeqRef.current
      const trio = options?.overrideTrio ?? pendingRef.current
      const requestRevision = `${psdSelection.scanId as string}:${seq}:${Date.now().toString(36)}`
      setBatchLoading(true)
      setBatchError(null)
      try {
        const result = await runPrepareCheckBatch({
          scanId: psdSelection.scanId as string,
          requestRevision,
          sourceRows: batchSourceRows,
          targetsByLanguage: Object.fromEntries(
            targetLanguages.map((lang) => [
              lang,
              translationsFor(lang).map((t) => ({ rowId: t.rowId, target: t.target })),
            ]),
          ),
          decisions: decisionsToBatch(committedRef.current ?? pendingRef.current),
          provisionalDecisions: decisionsToBatch(trio),
        })
        if (seq !== checkSeqRef.current) return false
        // B8：requestRevision 回显不匹配 → 整包丢弃，绝不合并进状态
        if (result.requestRevision !== requestRevision) {
          setBatchError(t('检查响应与本次请求不匹配，结果已丢弃，请重试。'))
          return false
        }
        setBatchResult(result)
        if (seq === checkSeqRef.current) {
          setCheckedRevision(revisionKeyOf(trio))
        }
        for (const lang of targetLanguages) {
          const perLanguage = toPrepareCheckResult(result, lang)
          if (perLanguage) {
            void reportPrepareCheckEvidence({
              runId: psdSelection.scanId as string,
              scanId: psdSelection.scanId as string,
              targetLanguage: lang,
              result: perLanguage,
            })
          }
        }
        // L1 质量门：排版学习样本改到「执行成功回执后」上报（见 execute-step 成功分支），
        // 校对阶段不再上传，避免失败执行的排版污染学习库。
        // P0-C-3：isReady 时把 pending 提升为 committed 并持久化（刷新后可恢复）
        const hasPending =
          pendingDirtyRef.current &&
          (Object.keys(trio.forcedBindingsByLang).length > 0 ||
            trio.excludedLayerObjectIds.length > 0 ||
            trio.ignoredTranslationRowIds.length > 0)
if (
          hasPending &&
          result.summary.isReady &&
          psdSelection.summary?.fingerprint
        ) {
          committedRef.current = { ...trio }
          saveCommittedDecisions({
            scanId: psdSelection.scanId as string,
            fingerprint: psdSelection.summary.fingerprint,
            translationDigest: translationDigestFor(),
            forcedBindingsByLang: trio.forcedBindingsByLang,
            excludedLayerObjectIds: trio.excludedLayerObjectIds,
            ignoredTranslationRowIds: trio.ignoredTranslationRowIds,
            savedAt: new Date().toISOString(),
          })
          pendingDirtyRef.current = false
        }
        return true
      } catch (error) {
        if (seq !== checkSeqRef.current) return false
        setBatchError(error instanceof Error ? error.message : t('批量检查失败，请重试。'))
        return false
      } finally {
        if (seq === checkSeqRef.current) setBatchLoading(false)
      }
    },
    [
      checkable,
      psdSelection,
      parsed,
      targetLanguages,
      translationsFor,
      batchSourceRows,
      revisionKeyOf,
      translationDigestFor,
    ],
  )

  // 实验模式：推进下一批前对新 PSD 补跑对账；交付门开放后才递增触发器。
  useEffect(() => {
    if (!experimentPendingAdvance) return
    if (!psdSelection || !isPsdSelectionReady(psdSelection)) return
    if (deliveryOpen) {
      setExperimentPendingAdvance(false)
      setExperimentTrigger((t) => t + 1)
      return
    }
    if (batchLoading) return
    if (batchError) {
      // v7：某稿对账失败必须停批并点名，不能挂在「执行中」静默等。
      setExperimentPendingAdvance(false)
      setExperimentRunning(false)
      setExperimentNotice(
        t('第 {value0} 个设计稿对账失败，批量执行已暂停：{batchError}', { value0: String(experimentIndex + 1), batchError: String(batchError) }),
      )
      return
    }
    if (allChecksDone && checkedRevision === checkRevision) {
      // v7：对账完成但交付门没开（有必须处理项等）——停批并点名，
      // 否则会一直显示「执行中」而实际没有任何进展。
      setExperimentPendingAdvance(false)
      setExperimentRunning(false)
      setExperimentNotice(
        totalBlocked > 0
          ? t('第 {value0} 个设计稿对账后仍有 {totalBlocked} 个必须处理项，批量执行已暂停。请切到该稿的设计稿校对阶段处理后再重新开始。', { value0: String(experimentIndex + 1), totalBlocked: String(totalBlocked) })
          : t('第 {value0} 个设计稿对账完成，但生成交付门未开放（{value1}），批量执行已暂停。', { value0: String(experimentIndex + 1), value1: String(derived.reason ?? t('请检查 Photoshop 连接与语言审查状态')) }),
      )
      return
    }
    void runBatchCheck()
  }, [
    experimentPendingAdvance,
    psdSelection,
    deliveryOpen,
    batchLoading,
    batchError,
    allChecksDone,
    checkedRevision,
    checkRevision,
    runBatchCheck,
    experimentIndex,
    totalBlocked,
    derived.reason,
  ])

  // 2026-09-17 批次B：evidence 绑定失败的出口①——清空本批次确认绑定并重新检查。
  // 复用"换 PSD/换扫描"时的状态清理口径，保证内存 pending/committed 与 localStorage 同步。
  const handleEvidenceRecoveryRecheck = () => {
    checkSeqRef.current += 1
    clearCommittedDecisions()
    setBatchResult(null)
    setBatchError(null)
    setBatchLoading(false)
    setCheckedRevision(null)
    commitForced({})
    commitExcluded([])
    commitIgnored([])
    pendingDirtyRef.current = false
    committedRef.current = null
    decisionsRestoredRef.current = false
    autoCheckDoneRef.current = ''
    void runBatchCheck({ overrideTrio: EMPTY_TRIO })
  }

  // ─── 流程自动化（表格确认 → 自动校对 → 通过自动推进）─────────────────────
  // A：进入「设计稿校对」且条件具备时自动开始批量校对。
  // 触发条件：有译文语言 + PSD 已扫描 + 不在校对加载中 + 无错误 + 该轮结果缺失或已过期。
  // （state 就绪后才跑，规避 handleCsvNext 里 setState 异步导致的空 targets 竞态）
  const autoCheckKey = `${activeStage}:${targetLanguages.join(',')}:${psdSelection?.scanId ?? ''}:${checkRevision}`
  useEffect(() => {
    if (activeStage !== 'design_reconcile') return
    if (targetLanguages.length === 0 || !isPsdSelectionReady(psdSelection)) return
    if (batchLoading || batchError) return
    if (allChecksDone && checkedRevision === checkRevision) return
    if (autoCheckDoneRef.current === autoCheckKey) return
    autoCheckDoneRef.current = autoCheckKey
    void runBatchCheck()
  }, [autoCheckKey, batchLoading, batchError, allChecksDone, checkedRevision, runBatchCheck])

  // S2 导入即对账：先扫描后导入时，导入完成即触发首轮对账，不等用户手动切到设计稿校对阶段。
  useEffect(() => {
    if (!parsed || importReconcileRef.current === parsed) return
    if (targetLanguages.length === 0 || !isPsdSelectionReady(psdSelection)) return
    if (batchLoading || batchError) return
    importReconcileRef.current = parsed
    void runBatchCheck()
  }, [parsed, psdSelection, targetLanguages, batchLoading, batchError, runBatchCheck])

  // B：只有完整交付门已开放（含设计稿对账 + Photoshop 就绪）才自动推进到生成步。
  // 每轮校对只推一次；用户手动回校对步查看时不强推。
  const autoAdvancedRef = useRef('')
  useEffect(() => {
    // 2026-10-16 竞态修复（第七轮真机测试实证）：deliveryOpen 变真时 activeStage 可能还是
    // translation_review（批量模式：镜像 + 语言自动确认让交付门提前开放），此时旧写法会
    // 消费掉一次性 ref 却不推进阶段 ⇒ 永久卡在翻译审查步、生成交付永远到不了。
    // 口径改为：等 activeStage 真的处于 design_reconcile 才推进（每轮校对仍只推一次）。
    if (!deliveryOpen) return
    if (activeStage !== 'design_reconcile') return
    if (autoAdvancedRef.current === checkRevision) return
    autoAdvancedRef.current = checkRevision
    setActiveStage('delivery')
  }, [deliveryOpen, activeStage, checkRevision])

  // P0-C-3：恢复 committed 决策（scanId + fingerprint + 译文 digest + TTL 全中才恢复）
  useEffect(() => {
    if (decisionsRestoredRef.current) return
    if (!parsed || !psdSelection?.summary?.fingerprint || !psdSelection.scanId) return
    decisionsRestoredRef.current = true
    const restored = loadCommittedDecisions(
      psdSelection.scanId,
      psdSelection.summary.fingerprint,
      translationDigestFor(),
    )
    if (!restored) return
    committedRef.current = restored
    pendingRef.current = { ...restored }
    setForcedBindingsByLang(restored.forcedBindingsByLang)
    setExcludedLayerObjectIds(restored.excludedLayerObjectIds)
    setIgnoredTranslationRowIds(restored.ignoredTranslationRowIds)
    pendingDirtyRef.current = false
    if (restored.excludedLayerObjectIds.length > 0 || restored.ignoredTranslationRowIds.length > 0) {
      setRestoredDecisionsNotice({
        ignoredRows: restored.ignoredTranslationRowIds.length,
        excludedLayers: restored.excludedLayerObjectIds.length,
      })
    }
  }, [parsed, psdSelection, translationDigestFor])

  const handleCsvNext = () => {
    if (!parsed?.languageColumns.length) return
    addLanguage(parsed.languageColumns[0])
    // Product Guard：译文表确认后必须先进入智能检测。
    // 不允许因静态检查为 0 或 PSD 已就绪而跳过用户可见的 Review 阶段。
    goToStage('translation_review')
  }

  const recordReviewDecisions = (decisions: SmartReviewDecision[]) => {
    if (!currentLanguage) return
    setReviewDecisionsByLanguage((previous) => ({
      ...previous,
      [currentLanguage]: decisions,
    }))
  }

  // T-0062：0 待处理行的语言自动标记确认（digest 失配时本效果自动重放）
  useEffect(() => {
    if (!parsed) return
    const updates: Record<string, string> = {}
    for (const language of targetLanguages) {
      const digest = languageDigests[language]
      if (!digest) continue
      if (reviewedLanguageDigests[language] === digest) continue
      if ((languagePendingIssueCounts[language] ?? 0) === 0) {
        updates[language] = digest
      }
    }
    if (Object.keys(updates).length > 0) {
      setReviewedLanguageDigests((previous) => ({ ...previous, ...updates }))
    }
  }, [parsed, targetLanguages, languageDigests, languagePendingIssueCounts, reviewedLanguageDigests])

  const handleReviewConfirmed = () => {
    if (!parsed || !currentLanguage) return
    const reviewedLanguage = currentLanguage
    const currentDigest = languageDigests[reviewedLanguage]
    if (!currentDigest) return
    setReviewedLanguageDigests((previous) => ({
      ...previous,
      [reviewedLanguage]: currentDigest,
    }))
    trackFunnelEvent('review_completed', {
      currentStep: 'review_completed',
      targetLanguageCode: reviewedLanguage,
      csvRowCount: parsed.rows.length,
      reviewRowCount: parsed.rows.length,
    })

    const nextLanguage = targetLanguages.find(
      (language) =>
        language !== reviewedLanguage &&
        reviewedLanguageDigests[language] !== languageDigests[language],
    )
    if (nextLanguage) {
      setCurrentLanguage(nextLanguage)
      reviewHeadingRef.current?.focus({ preventScroll: true })
      return
    }

    if (!isPsdSelectionReady(psdSelection)) {
      goToStage('materials')
      return
    }
    goToStage('design_reconcile')
  }

  const cancelTableReplacement = () => {
    setReplaceTableOpen(false)
    setPendingReplacement(null)
  }

  /** duplicate_source 表级二选一：把当前语言持有冲突译文的行统一为选定译文，随后重查 */
  const handleUnifyTranslation = async (
    targetsToReplace: string[],
    target: string,
  ): Promise<void> => {
    if (!currentLanguage || !parsed) return
    const replaceSet = new Set(
      targetsToReplace.filter((value) => value && value !== target),
    )
    if (replaceSet.size === 0) return
    // V1.1-F3:unify 与 resolve 同款三段式——saving 反馈、成功关闭抽屉、异常保留现场。
    setInspectorSaving(true)
    try {
      setEditedTranslations((previous) => {
        const langEdits = { ...(previous[currentLanguage] ?? {}) }
        parsed.rows.forEach((row, index) => {
          const rowIndex = index + 1
          const current = (
            langEdits[rowIndex] ??
            row.translations[currentLanguage] ??
            ''
          ).trim()
          if (replaceSet.has(current)) langEdits[rowIndex] = target
        })
        return { ...previous, [currentLanguage]: langEdits }
      })
      setInspectorItem(null)
      await runBatchCheck()
    } finally {
      setInspectorSaving(false)
    }
  }

  const confirmTableReplacement = () => {
    if (!pendingReplacement) return
    handleParsedChange(pendingReplacement)
    cancelTableReplacement()
  }

  const handleInspectorResolve = async (
    resolution: InspectorResolution,
  ): Promise<void> => {
    if (!currentLanguage || !psdSelection) return
    const item = inspectorItem
    if (!item) return
    // 双击单事务：同屏只能有一个进行中的 resolve
    if (inspectorPendingIdRef.current) return
    const pendingId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    inspectorPendingIdRef.current = pendingId
    setInspectorSaving(true)
    setInspectorError(null)
    try {
      const next = nextTrioAfterResolution(
        pendingRef.current,
        resolution,
        item,
        currentLanguage,
        targetLanguages,
        checks,
      )
      pendingRef.current = next
      setForcedBindingsByLang(next.forcedBindingsByLang)
      pendingDirtyRef.current = true
      const ok = await runBatchCheck({ overrideTrio: next })
      if (inspectorPendingIdRef.current !== pendingId) return
      inspectorPendingIdRef.current = null
      if (ok) {
        // P1-2 学习采集（best-effort）：用户显式确认的绑定决策（含目标选择/手填）。
        const learningObjectId = item.objectId ?? item.ledgerEntryId ?? ''
        if (psdSelection.scanId && learningObjectId) {
          void bufferLearningSignal({
            scanId: psdSelection.scanId,
            objectId: learningObjectId,
            decisionFamily: 'source_binding',
            actionCode: item.kind === 'missing' ? 'modified' : 'accepted',
            proposalCode: item.code,
            finalCode: bindingFinalCode(item, resolution),
            contextFeatures: {
              itemKind: item.kind,
              hadCandidates: Boolean(item.candidates?.length || item.combinedCandidates?.length),
              hadConflictTargets: Boolean(item.conflictTargets?.length),
            },
            semantic: 'human_confirmed',
            scopeHints: { templateFingerprint: psdSelection.summary?.fingerprint ?? null },
          })
        }
        setInspectorItem(null)
        return
      }
      // 重查失败：保留目标文本，事务结束但抽屉不关闭（超时不删 draft）
      setInspectorError(t('重查失败，目标文本已保留。可稍后重试。'))
    } catch (error) {
      inspectorPendingIdRef.current = null
      setInspectorError(
        error instanceof Error ? error.message : t('解决失败，请重试。'),
      )
    } finally {
      setInspectorSaving(false)
    }
  }

  const handleRescan = () => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，{label}已锁定。请先核对原任务或完成积分退回。', { label: String(WB_ACTIONS.rescan.label) }))
      return
    }
    goToStage('materials')
  }
  const handleFullReset = () => {
    if (executionAuthorized) {
      setExecutionLockNotice(t('本次执行尚未完成结算，不能清空工作台。请先核对原任务或完成积分退回。'))
      return
    }
    if (!confirmReset) {
      setConfirmReset(true)
      window.setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    setConfirmReset(false)
    setReplaceTableOpen(false)
    setPendingReplacement(null)
clearDecisionLog()
    clearCommittedDecisions()
    setParsedTables({})
    draftSnapshotsRef.current = {}
    activeDraftKeyRef.current = SINGLE_DRAFT_KEY
    setActiveDraftKey(SINGLE_DRAFT_KEY)
    setTargetLanguages([])
    setCurrentLanguage(null)
    setEditedTranslations({})
    setReviewedLanguageDigests({})
    setReviewDecisionsByLanguage({})
    setPsState(null)
    psPreheatRef.current = false
    setPsdSelection(null)
    setExecutionAuthorized(false)
    commitForced({})
    commitExcluded([])
    commitIgnored([])
    pendingDirtyRef.current = false
    committedRef.current = null
    decisionsRestoredRef.current = false
    setBatchResult(null)
    setBatchError(null)
    setBatchLoading(false)
    setCheckedRevision(null)
    setInspectorItem(null)
    setInspectorSaving(false)
    setInspectorError(null)
    setObjectsOpen(false)
    clearWorkbenchDraft()
    clearExecutionRecovery()
    setDraftRestored(false)
    // 重置后必须显式回到第 1 步：activeStage 不随数据清空自动变化（曾停留在第 4 步锁定态）
    goToStage('materials', { bypassExecutionLock: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const psdBasename = psdSelection ? basenameOf(psdSelection.masterPath) : ''
  const parsedName = parsed ? displaySourceHeader(parsed.sourceHeader) : ''

  // ─── P1 壳层派生：阶段导轨 + 底部操作条 ────────────────────────────────
  const completedStages = derived.completedStages
  const stageItems: StageRailItem[] = [
    {
      stage: 'materials',
      label: t(wbCopy.stageMaterials),
      done: completedStages.includes('materials'),
      active: activeStage === 'materials',
    },
    {
      stage: 'translation_review',
      label: t(wbCopy.stageReview),
      done: completedStages.includes('translation_review'),
      active: activeStage === 'translation_review',
      locked: !parsed ? t('导入译文表后开始') : undefined,
    },
    {
      stage: 'design_reconcile',
      label: t(wbCopy.stageReconcile),
      done: completedStages.includes('design_reconcile'),
      active: activeStage === 'design_reconcile',
      // 访客不锁阶段：Owner 2026-10-29「要能够一直往下走的，走到最后一步去」。
      locked: isGuest
        ? undefined
        : !readiness.reconcileOpen && parsed
          ? t('确认全部语言后开放')
          : undefined,
    },
    {
      stage: 'delivery',
      label: t(wbCopy.stageDelivery),
      done: false,
      active: activeStage === 'delivery',
      locked: isGuest
        ? undefined
        : !deliveryOpen
          ? derived.reason ?? t('解决必须处理项后开放')
          : undefined,
    },
  ]
  const prevStageOf: Record<WorkbenchStage, WorkbenchStage | null> = {
    materials: null,
    translation_review: 'materials',
    design_reconcile: 'translation_review',
    delivery: 'design_reconcile',
  }
  const prevStage = prevStageOf[activeStage]
  const actionStatus = isGuest
    ? t('访客演示：可一直往下走；真读稿、真生成要登录并装本地助手。')
    : derived.reason ??
      (activeStage === 'materials'
      ? t(wbCopy.stageMaterials)
      : activeStage === 'translation_review'
        ? t(wbCopy.stageReview)
        : activeStage === 'design_reconcile'
          ? t(wbCopy.stageReconcile)
          : deliveryOpen
            ? t(wbCopy.stageDeliveryReady)
            : t(wbCopy.stageDelivery))

  // ── v12（2026-10-21）两档可见性：② 范围条 / ③ 状态带集合语义 ─────────────
  // 纪律：③ 只允许写成 `batchMode ? 集合语义 : 原样`，单稿档的既有节点一字不动；
  //      ② 是纯增量节点（新增 chip），不替换任何既有元素。
  // 计数口径统一走 psd-selection.isMultiPsdEntryScanned（与第 1 步列表同一判据），
  // 避免出现「状态带说 9 个已扫描、列表说 10 个」这类两套数。
  const batchScopeEntries = multiPsdSelection?.entries ?? []
  const batchScopeTotal = batchScopeEntries.length
  const batchScopeScanned = batchScopeEntries.filter(isMultiPsdEntryScanned).length
  const batchScopeUnscanned = batchScopeTotal - batchScopeScanned
  const activeDraftMasterPath = batchScopeEntries.find(
    (entry) => draftKeyOfMasterPath(entry.masterPath) === activeDraftKey,
  )?.masterPath ?? null

  return (
    <ActivationGate>
      <div
        id="workbench-surface"
        className={`wb-brand ${batchMode ? 'wb-batch-v3' : ''} min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8`}
      >
        <div className={batchMode ? 'wb-v3-container mx-auto space-y-4' : 'mx-auto max-w-5xl space-y-4'}>
          <header className="flex flex-col gap-3 px-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-extrabold tracking-tight">{t('工作台')}</h1>
                {/* 单稿 / 多稿：同一工作台内的两种模式。
                    Owner 2026-10-18 明确否掉「两个并列工作台」与「一对多 / 多对多」这类关系词
                    ——这里唯一表达的维度是「这次要处理几个设计稿」。 */}
                <div
                  className="inline-flex items-center gap-1 rounded-[10px] border border-border bg-muted/50 p-1"
                  role="tablist"
                  aria-label={t('设计稿数量')}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!batchMode}
                    onClick={() => requestModeChange(false)}
                    disabled={experimentRunning}
                    className={`h-7 rounded-[7px] px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      !batchMode
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('单个设计稿')}</button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={batchMode}
                    onClick={() => requestModeChange(true)}
                    disabled={experimentRunning}
                    className={`h-7 rounded-[7px] px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      batchMode
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('多个设计稿')}</button>
                </div>
                {/* ② 范围条（v12）：常驻显示"我现在管 1 个还是 12 个"。
                    纯增量节点——不替换、不包裹任何既有元素。 */}
                <span
                  data-testid="workbench-scope-chip"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      batchMode
                        ? batchScopeUnscanned > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : fileDotClass
                    }`}
                  />
                  <span className="truncate">
                    {batchMode
                      ? `${t('这一批：')}${batchScopeTotal}${t(' 个设计稿 · 已扫描 ')}${batchScopeScanned}${
                          batchScopeUnscanned > 0
                            ? ` · ${batchScopeUnscanned}${t(' 个待扫描')}`
                            : ''
                        }`
                      : `${t('这份稿：')}${psdBasename || t('尚未选择')}`}
                  </span>
                </span>
              </div>
              {!batchMode && <p className="mt-1.5 text-sm text-muted-foreground">
                {t('扫描设计稿、导入译文并在本机生成多语言文件；设计文件不会上传。')}
              </p>}
            </div>
            <div className="flex items-center gap-1">
              {/* 2026-10-22（图六）：<1024 的排版入口。原来悬浮球在 xl 以下整块消失、
                  卡头按钮又只在第 1 步可见，窄屏等于没有入口。这里在顶栏补一个常驻图标，
                  与 ≥1024 的悬浮球互补（一个可见另一个就隐藏，不会重复）。 */}
              {typographyEnabled && (
                <button
                  type="button"
                  onClick={() => openTypographyDrawer('topbar')}
                  aria-haspopup="dialog"
                  aria-expanded={typographyDrawerOpen}
                  aria-controls="typography-panel"
                  aria-disabled={!typographyWritable}
                  data-typography-trigger="topbar"
                  data-typography-state={typographyEntry.status}
                  aria-label={
                    typographyWritable
                      ? t('排版定制（内测预览）')
                      : t('排版定制暂不可用：{value0}', { value0: String(typographyBlockedReason ?? t('正在连接本地助手…')) })
                  }
                  title={
                    typographyWritable
                      ? t('排版定制（内测预览）')
                      : t('排版定制暂不可用：{value0}', { value0: String(typographyBlockedReason ?? t('正在连接本地助手…')) })
                  }
                  className={
                    'relative inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-bold transition-colors lg:hidden ' +
                    (typographyWritable
                      ? 'border-foreground/20 bg-background text-foreground hover:border-foreground/40 hover:bg-muted'
                      : 'border-dashed border-border bg-muted/40 text-muted-foreground hover:text-foreground')
                  }
                >
                  <span
                    className={
                      'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] text-[9px] font-black leading-none ' +
                      (typographyWritable
                        ? 'bg-foreground text-background'
                        : 'bg-muted-foreground/60 text-background')
                    }
                  >
                    T
                  </span>
                  {t('排版')}{typographyAttention && (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  )}
                  {typographyDirty && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" aria-label={t('有未保存改动')} />
                  )}
                </button>
              )}
              {featureFlags.creditPacksEnabled && <CreditPackEntry />}
              <CreditsBadge />
              <UserAccountMenu />
            </div>
          </header>
          {/* ── 顶部状态带 ─────────────────────────────────────────────── */}
          <div className="sticky top-16 z-30 rounded-none bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {batchMode ? (
                /* ③ 状态带（v12）：多稿档换成集合语义——"这一批几个稿、扫了几个、还剩几个"。
                   单稿档走下面的原路径，节点与文案一字不动。 */
                <div className={batchScopeUnscanned > 0 ? "flex min-w-0 items-center gap-2" : "hidden"} data-testid="workbench-batch-status">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      batchScopeUnscanned > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    title={t('扫描状态')}
                  />
                  <span className="truncate text-sm font-bold">{batchScopeTotal} {t('个设计稿')}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    · {batchScopeScanned} {t('个已扫描')}{batchScopeUnscanned > 0 ? t(' · {batchScopeUnscanned} 个待扫描', { batchScopeUnscanned: String(batchScopeUnscanned) }) : ''}
                  </span>
                  {batchScopeUnscanned > 0 && (
                    <button
                      type="button"
                      onClick={() => goToStage('materials')}
                      className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      {t('去扫描（还有 ')}{batchScopeUnscanned} {t('个）')}</button>
                  )}
                </div>
              ) : (
              <div className="flex min-w-0 items-center gap-2">
                {psdSelection ? (
                  <>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${fileDotClass}`}
                      title={t('扫描状态')}
                    />
                    <button
                      type="button"
                      onClick={handleRescan}
                      className="truncate text-sm font-bold hover:underline"
                      title={t('{label}（之后需要重新与设计稿对账）', { label: String(WB_ACTIONS.rescan.label) })}
                    >
                      {psdBasename}
                    </button>
                    {psdSelection.state === 'stale' && (
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        {t('扫描已过期 · 点文件名')}{WB_ACTIONS.rescan.label}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleRescan}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {WB_ACTIONS.rescan.label}
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t('尚未选择设计文件')}</span>
                )}
                {parsedName && (
                  <span className="truncate text-xs text-muted-foreground">
                    · {parsedName}
                  </span>
                )}
                {targetLanguages.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    · {targetLanguages.length} {t('个语言')}</span>
                )}
              </div>
              )}

              {batchLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('正在检查…')}<ElapsedSeconds />
                </span>
              ) : allChecksDone && totalBlocked > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    goToStage('design_reconcile')
                    setIssuesOpen(true)
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {/* v12：多稿档下这个数是「当前这一稿」的，必须写明归属，不能和上面的
                      「这一批 12 个稿」混成一套数；单稿档渲染结果不变（前缀为空）。 */}
                  {batchMode ? t('本稿 ') : ''}
                  {totalBlocked} {t('项待处理 ›')}</button>
              ) : allChecksDone ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {batchMode ? t('本稿已对齐') : t('已对齐')}
                </span>
              ) : null}
            </div>
          </div>

          {/* 助手横幅（仅未连接）。访客装不了也用不了助手（要登录激活），不在这里推销安装包。 */}
          {!isGuest && <AssistantSetupBanner onConnectionChange={setAssistantConnected} />}

          {draftRestored && (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-xs">
              <span>
                {/* P-05：草稿存 sessionStorage，只在本标签页有效——文案与实现保持一致。 */}
                {t('已恢复本标签页的草稿（刷新或后退后仍保留；关闭标签页后不再恢复）。')}{!isPsdSelectionReady(psdSelection) && (
                  <span className="text-amber-700 dark:text-amber-300">
                    {' '}
                    {t('设计文件需要重新选择并扫描后才可检查。')}</span>
                )}
              </span>
              <button
                type="button"
                className={
                  'font-medium ' +
                  (confirmReset ? 'text-rose-700' : 'text-emerald-700')
                }
                onClick={handleFullReset}
              >
                {confirmReset ? t('再点一次确认重置工作台') : t('重置工作台')}
              </button>
            </div>
          )}

          {/* P-05：空台（新标签页/已重置）如实说明草稿的保存范围，避免「关闭后还能恢复」的误解。 */}
          {!draftRestored && !parsed && (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              {t('草稿只保存在当前标签页：新开标签页或关闭后重新打开不会自动恢复，请重新导入译文表。')}</div>
          )}

          {batchError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{humanizeInternalIds(batchError)}</span>
            </div>
          )}

          {executionLockNotice && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{executionLockNotice}</span>
            </div>
          )}

          {restoredDecisionsNotice && (
            <div
              role="alert"
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <span>
                {t('已恢复历史决定：忽略译文行 ')}{restoredDecisionsNotice.ignoredRows} {t('条、排除图层 ')}{restoredDecisionsNotice.excludedLayers}{' '}
                {t('个。这些内容将保持英文、计入交付报告的“跳过（未翻译）”，报告不会判完整。如属当时误点，可一键清空后重新检查。')}</span>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-amber-700 bg-background px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-100"
                  onClick={() => {
                    setRestoredDecisionsNotice(null)
                    handleEvidenceRecoveryRecheck()
                  }}
                >
                  {t('清除历史决定并重新检查')}</button>
                <button
                  type="button"
                  className="rounded-md px-2.5 py-1 text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
                  onClick={() => setRestoredDecisionsNotice(null)}
                >
                  {t('知道了')}</button>
              </span>
            </div>
          )}

          {/* ── P1 壳层：左阶段导轨 + 中单阶段；窄屏用 compact 导轨（D-05） ── */}
          <div className={batchMode ? 'flex flex-col gap-3' : 'flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4'}>
            <div className={batchMode ? 'wb-v3-stages' : 'lg:hidden'}>
              <StageRail items={stageItems} onSelect={goToStage} compact />
            </div>
            <aside className={batchMode ? 'hidden' : 'hidden w-[180px] shrink-0 lg:block'}>
              <StageRail items={stageItems} onSelect={goToStage} />
            </aside>
            <div className="min-w-0 flex-1 space-y-4">
          {/* 阶段一：准备素材（常驻 hidden 保活 —— 扫描轮询在 DesignFileCard 内部，
              切到其它阶段时不得卸载，否则扫描结果会丢失） */}
          <section
            id="stage-preparation"
            hidden={activeStage !== 'materials'}
            className={`${batchMode ? 'wb-v3-stage ' : ''}overflow-hidden rounded-xl border bg-card p-4 sm:p-5`}
          >
            {/* 卡头由单稿/批量共用：2026-10-23 Owner 指出两个工作台不一致，
                批量页原来把卡头藏在经典分支里，导致「排版定制」入口消失。 */}
            <div className="mb-3 flex w-full items-center gap-3 text-left">
              <span className="shrink-0 text-sm font-bold">{t('准备素材')}</span>
              <div className="ml-auto flex min-w-0 items-center gap-2">
                {!batchMode && preparationDone && (
                  <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
                    {psdBasename} · {parsedName} ·{' '}
                    {targetLanguages.map(formatLanguageCode).join(' · ')}
                  </span>
                )}
                {/* 卡头入口（设计稿 2026-10-18 固定规则：桌面与窄屏都在卡头右上角；
                    窄屏文案缩成「排版」）。皮肤＝「轻量原生碳」：纸面承载 + 碳色 T 字标。
                    2026-10-22（图六）：入口不再被能力位隐去——不可用时置灰保留，
                    点开抽屉看一句话原因与「重新检测」，标题栏 tooltip 也带上原因。 */}
                {typographyEnabled && (
                  <button
                    type="button"
                    onClick={() => openTypographyDrawer('header')}
                    aria-haspopup="dialog"
                    aria-expanded={typographyDrawerOpen}
                    aria-controls="typography-panel"
                    aria-disabled={!typographyWritable}
                    data-typography-trigger="header"
                    data-typography-state={typographyEntry.status}
                    title={
                      typographyWritable
                        ? t('排版定制（内测预览）')
                        : t('排版定制暂不可用：{value0}', { value0: String(typographyBlockedReason ?? t('正在连接本地助手…')) })
                    }
                    className={
                      typographyWritable
                        ? 'inline-flex h-[30px] max-w-full shrink-0 items-center gap-1.5 rounded-lg border border-foreground/20 bg-background px-2.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-foreground/40 hover:bg-muted'
                        : 'inline-flex h-[30px] max-w-full shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground'
                    }
                  >
                    <span
                      className={
                        typographyWritable
                          ? 'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-foreground text-[10px] font-black leading-none text-background'
                          : 'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-muted-foreground/60 text-[10px] font-black leading-none text-background'
                      }
                    >
                      T
                    </span>
                    <span className="hidden sm:inline">{t('排版定制')}</span>
                    <span className="sm:hidden">{t('排版')}</span>
                    {typographyDirty && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label={t('有未保存改动')} />
                    )}
                    {typographyAttention && (
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    )}
                    <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 opacity-60 sm:block" />
                  </button>
                )}
              </div>
            </div>
            {/* 第 1 步壳（2026-10-23 按模拟重做）：文件夹栏 → 四统计 → 左右队列/证据 → 整宽矩阵。
                旧内容保留在下面（hidden 不卸载）：扫描轮询、逐稿导入、排版入口都还在。 */}
            {batchMode && !stageClassic && (
              <>
                {folderSnapshot && stagePlan ? (
                  <>
                    <Step1StageView
                    root={folderSnapshot.root}
                    scan={folderSnapshot.scan}
                    plan={stagePlan}
                    choices={stageResolved.choices}
                    remembered={stageResolved.remembered}
                    languagesByDraft={stageLanguages}
                    droppedChoices={stageResolved.dropped}
                    readStates={stageReadStatesByPath}
                    probes={stageProbes}
                    folderLoading={stageFolderLoading}
                    folderError={stageFolderError}
                    scanState={stageScanState}
                    scanPending={stageScanPending}
                    duplicateAlerts={stageDuplicateAlerts}
                    skippedDrafts={stageSkippedDrafts}
                    gate={stageGate}
                    notice={stageNotice}
                    onChangeFolder={handleStageChangeFolder}
                    onRescan={handleStageRescanFolder}
                    onScanAll={() => pulseStageFolderAction('scan-all')}
                    onStopScan={() => pulseStageFolderAction('scan-stop')}
                    onChoose={handleStageChoose}
                    onChooseGroup={handleStageChooseGroup}
                    onForget={handleStageForget}
                    onRetryRead={handleStageRetryRead}
                    onSkip={handleStageSkip}
                    onUndoSkip={handleStageUndoSkip}
                    onRestoreDuplicates={handleStageRestoreDuplicates}
                    onKeepOne={handleStageKeepOne}
                    onDismissNotice={() => setStageNotice(null)}
                    onPickTable={(draftPath) => setStageTablePickerFor(draftPath)}
                    onNext={handleStageNext}
                    onShowClassic={() => setStageClassic(true)}
                    parsedByDraft={parsedTables}
                    tableParsesById={stageTableParses}
                    tableParsesByDraft={stageTableParsesByDraft}
                    effectiveTableParses={stageEffectiveTableParsesByDraft}
                    tableAllocations={tableAllocationStore}
                    declaredTableIdsByDraft={matrixDeclaredTableIdsByDraft}
                    allocationDrafts={(multiPsdSelection?.entries ?? []).map((entry) => ({
                      masterPath: entry.masterPath,
                      fingerprint: fingerprintByDraft[entry.masterPath] ?? null,
                      label: basenameOf(entry.masterPath),
                    }))}
                    onReadTableForAllocation={handleReadTableForAllocation}
                    onSaveTableAllocation={handleSaveTableAllocation}
                    onClearTableAllocation={handleClearTableAllocation}
                    getDraftKey={draftKeyOfMasterPath}
                    coverageDrafts={coverageDrafts}
                    scopeByDraft={matrixScopeByDraft}
                    confirmedByDraft={matrixConfirmedByDraft}
                    scannedByDraft={scannedByDraft}
                    onOpenReview={handleDeliveryMatrixOpenReview}
                    onIncludeLanguage={handleDeliveryMatrixIncludeLanguage}
                    groupBindings={stageGroupBindings}
                    deliverablesByDraft={stageDeliverables}
                    manualPickCount={manualPickCount}
                    onToggleSlot={handleStageToggleSlot}
                    onRestoreSlots={handleStageRestoreSlots}
                    onClearChoice={handleStageClearChoice}
                    onBlockTable={handleStageBlockTable}
                    onUnblockTable={handleStageUnblockTable}
                  />
                  </>
                ) : (
                  <>
                    {isGuest && (
                      <div className="mb-3">
                        <GuestInlineNote text="访客演示：读整个文件夹里的设计稿要经过你电脑上的本地助手，没登录、没装助手读不到；切回单稿就能真导入译文表。" />
                      </div>
                    )}
                    <BatchWorkspaceEmpty>
                    <StageFolderGate
                      initialPath={folderSnapshot?.root ?? ''}
                      loading={stageFolderLoading}
                    picking={stagePicking}
                    error={stageFolderError}
                    onPickFolder={handleStagePickFolder}
                    onReadFolder={(path) => void loadStageFolder(path)}
                    onShowClassic={() => setStageClassic(true)}
                    />
                    </BatchWorkspaceEmpty>
                  </>
                )}
                <TablePickerDialog
                  open={Boolean(stageTablePickerFor)}
                  tables={folderSnapshot?.scan.tables ?? []}
                  usedBy={stageTableUsedBy}
                  onClose={() => setStageTablePickerFor(null)}
                  onPick={(tablePath) => {
                    const draftPath = stageTablePickerFor
                    setStageTablePickerFor(null)
                    if (draftPath) handleStagePickTable(draftPath, tablePath)
                  }}
                  onShowClassic={() => {
                    setStageTablePickerFor(null)
                    setStageClassic(true)
                  }}
                />
              </>
            )}
            <div className={batchMode && !stageClassic ? 'hidden' : undefined}>
              {batchMode && stageClassic && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                  <span>{t('现在是逐稿手动导入的老界面。归属工作台里做的选择都还在，不会丢。')}</span>
                  <button
                    type="button"
                    className="ml-auto rounded-md border bg-card px-2.5 py-1 hover:bg-muted"
                    onClick={() => setStageClassic(false)}
                  >
                    {t('回到归属工作台')}
                  </button>
                </div>
              )}
            {/* 多稿工作台（2026-10-22，Owner 点头）：第 1 步改成「左队列 + 右当前稿」。
                宽屏（lg 起）左栏是稿队列、右栏是当前稿的译表/语言/审查面板；
                窄屏仍是上下排（单列），能力一件不减。 */}
            <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start">
                <div className="rounded-xl bg-muted/30 p-4 lg:col-span-2">
                  <p className="mb-3 text-sm font-extrabold">
                    {t('选择设计文件 · 只读预扫描')}</p>
                  {isGuest && (
                    <div className="mb-3">
                      <GuestInlineNote text="访客演示：设计稿要由你电脑上的本地助手在 Photoshop 里读，没登录、没装助手读不了；下面的译文表现在就能真导入。" />
                    </div>
                  )}
<DesignFileCard
                  selection={psdSelection}
                  onSelectionChange={handlePsdSelectionChange}
                  multiSelection={multiPsdSelection ?? undefined}
                  onMultiSelectionChange={(next) => {
                    setMultiPsdSelection(next)
                    // 列表被清空/移除后，上一轮的编排态与提示必须一起归零，
                    // 否则「全部 N 个设计稿已执行完成」这类提示会挂在新一轮的空白列表上（张冠李戴）。
                    if (!next || next.entries.length === 0) {
                      setExperimentRunning(false)
                      setExperimentIndex(0)
                      setExperimentNotice(null)
                    }
                    if (!batchMode) return
                    const entries = next?.entries ?? []
                    // v7：当前激活稿必须始终是列表内的一稿。列表里没有它（首次选择/
                    // 被移除）时切到第一个已扫描稿，否则第一稿；已扫描优先避免把
                    // 一个未扫描稿当成「当前稿」却看不到任何对账入口。
                    const activeKey = activeDraftKeyRef.current
                    let activeEntry = entries.find(
                      (entry) => draftKeyOfMasterPath(entry.masterPath) === activeKey,
                    )
                    if (!activeEntry && entries.length > 0) {
                      activeEntry =
                        entries.find((entry) => isMultiPsdEntryScanned(entry)) ?? entries[0]
                      activateDraft(
                        draftKeyOfMasterPath(activeEntry.masterPath),
                        { scanId: activeEntry.scanId },
                      )
                    }
                    // 当前稿重扫：只清这一稿的证据（译表与人工审查确认保留）。
                    if (
                      activeEntry &&
                      isMultiPsdEntryScanned(activeEntry) &&
                      activeDraftScanIdRef.current !== activeEntry.scanId
                    ) {
                      invalidateDraftEvidence(
                        draftKeyOfMasterPath(activeEntry.masterPath),
                        activeEntry.scanId,
                      )
                    }
                    // psdSelection 只镜像「当前激活稿」：它已扫描就指向它，未扫描就为
                    // null（交付门如实关闭）；不再让列表顺序决定当前稿。
                    if (activeEntry) {
                      setPsdSelection(
                        isMultiPsdEntryScanned(activeEntry)
                          ? {
                              masterPath: activeEntry.masterPath,
                              state: activeEntry.state,
                              scanId: activeEntry.scanId,
                              summary: activeEntry.summary,
                              updatedAt: activeEntry.updatedAt,
                            }
                          : null,
                      )
                    } else if (!entries.length) {
                      setPsdSelection(null)
                    }
                  }}
                  batchMode={batchMode}
                  onBulkImport={batchMode ? openBulkImport : undefined}
                  onFolderSnapshot={batchMode ? handleStageFolderSnapshot : undefined}
                  onScanStateChange={batchMode ? setStageScanState : undefined}
                  folderAction={stageFolderAction}
/>
                </div>
                {/* v7：每稿一表。批量模式下译表、语言、审查确认与对账证据都按稿隔离，
                    这里列出每一稿的表状态，并提供唯一的按稿切换入口。 */}
                {batchMode && (multiPsdSelection?.entries.length ?? 0) > 0 && (
                  <>
                    <div className="rounded-xl border bg-background p-4 lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold">{t('译文表 · 每个设计稿一张')}</p>
                      <span className="text-xs text-muted-foreground">
                        {(multiPsdSelection?.entries ?? []).filter((entry) =>
                          Boolean(parsedTables[draftKeyOfMasterPath(entry.masterPath)]),
                        ).length}
                        {' / '}
                        {multiPsdSelection?.entries.length} {t('稿已导入')}</span>
                      {activeDraftLabel && (
                        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold">
                          {t('当前稿：')}{activeDraftLabel}
                        </span>
                      )}
                      <label className="cursor-pointer rounded-md border border-foreground/30 bg-background px-2 py-0.5 text-[11px] font-semibold hover:border-foreground/60 hover:bg-muted">
                        {t('一次导入多张表')}<input
                          type="file"
                          multiple
                          accept=".csv,.tsv,.txt,.xlsx,.xls"
                          className="hidden"
                          aria-label={t('一次选择多张译文表')}
                          onChange={(event) => {
                            const files = event.target.files
                            event.target.value = ''
                            openFilesBulkImport(files)
                          }}
                        />
                      </label>
                      {(multiPsdSelection?.entries.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const entries = multiPsdSelection?.entries ?? []
                            const index = entries.findIndex(
                              (entry) =>
                                draftKeyOfMasterPath(entry.masterPath) === activeDraftKey,
                            )
                            const next = entries[(index + 1) % entries.length]
                            if (next) switchActiveDraft(next)
                          }}
                          className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold hover:border-foreground/40 hover:bg-muted"
                        >
                          {t('下一稿 →')}</button>
                      )}
                      {/* v13 审稿队列：一次导入多张表后不必自己找下一稿。
                          「未审」＝该稿还没审完（没表 / 没选语言 / 有语言没确认），
                          判据走 isDraftFullyReviewed，只用既有事实，不另立状态机。
                          原有「下一稿 →」保留不动（不得删用户能力），两个按钮职责不同。 */}
                      {unreviewedDraftPaths.length > 0 && (
                        <button
                          type="button"
                          data-testid="workbench-review-next"
                          onClick={() => {
                            const entries = multiPsdSelection?.entries ?? []
                            const currentPath = entries.find(
                              (entry) =>
                                draftKeyOfMasterPath(entry.masterPath) === activeDraftKey,
                            )?.masterPath
                            const currentIndex = entries.findIndex(
                              (entry) => entry.masterPath === currentPath,
                            )
                            // 从当前稿之后开始找，找不到就从队首绕回来（不静默停住）。
                            const ordered = [
                              ...entries.slice(currentIndex + 1),
                              ...entries.slice(0, Math.max(currentIndex, 0)),
                            ]
                            const next = ordered.find((entry) =>
                              unreviewedDraftPaths.includes(entry.masterPath),
                            )
                            if (next) switchActiveDraft(next)
                          }}
                          className="rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                        >
                          {t('还有 ')}{unreviewedDraftPaths.length} {t('稿未审 · 审下一稿 →')}</button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {t('译表、语言选择、人工审查确认与对账证据只属于各自的稿；切换当前稿会同时切换这四样，互不共用。')}</p>
                    {bulkNotice && (
                      <p
                        role="status"
                        className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                      >
                        {bulkNotice}
                      </p>
                    )}
                    {/* v13：多稿档的稿表清单——按子文件夹分组 ＋ 默认密度（先摊开要处理的）＋ 审稿队列。
                        2026-10-22（Owner 点头的多稿工作台）：这段从工具条里搬出来，
                        宽屏时成为**左栏的稿队列**，与右栏的当前稿面板并排。 */}
                  </div>
                    <div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[70vh] lg:overflow-auto">
                    <DraftTableList
                      rows={draftTableRows}
                      activeDraftPath={
                        (multiPsdSelection?.entries ?? []).find(
                          (entry) => draftKeyOfMasterPath(entry.masterPath) === activeDraftKey,
                        )?.masterPath ?? null
                      }
                      onSelectDraft={(masterPath) => {
                        const target = (multiPsdSelection?.entries ?? []).find(
                          (entry) => entry.masterPath === masterPath,
                        )
                        if (target) switchActiveDraft(target)
                      }}
                    />
                    </div>
                  </>
                )}
                {/* 右栏：当前稿的译表 / 语言 / 审查面板（宽屏时与左栏队列并排）。
                    单稿模式没有左栏队列，此时这一栏必须占满两列——否则左边会留一条空档。 */}
                <div
                  className={
                    batchMode
                      ? 'min-w-0 space-y-4 lg:col-start-2'
                      : 'min-w-0 space-y-4 lg:col-span-2'
                  }
                >
                {/* 译文行：独立空态/完成态 */}
                {parsed ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold">{parsedName}</span>
                    {batchMode && activeDraftLabel && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                        {t('当前稿：')}{activeDraftLabel}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {targetLanguages.length > 0
                        ? targetLanguages.map(formatLanguageCode).join(' · ')
                        : t('未选语言')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLangPickerOpen((v) => !v)}
                      className="rounded-lg border border-border px-2.5 py-1 font-semibold hover:border-foreground/40"
                    >
                      {t('选择语言')}</button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingReplacement(null)
                        setReplaceTableOpen(true)
                      }}
                      title={
                        batchMode
                          ? t('只更换当前稿的译文表，其它稿不受影响；确认前保留当前任务')
                          : t('先选择并确认新译文表；确认前保留当前任务')
                      }
                      className="rounded-lg border-2 border-amber-500 bg-amber-100 px-3 py-1.5 font-extrabold text-amber-950 shadow-sm hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-100"
                    >
                      {t(wbCopy.csvReselectTable)}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-sm font-bold">
                      {t(wbCopy.csvHeaderTitle)}
                    </p>
                    <CsvStep
                      parsed={null}
                      onParsed={handleParsedChange}
                      onNext={handleCsvNext}
                      deliverable={activeDraftDeliverable}
                    />
                  </div>
                )}
                {replaceTableOpen && parsed && (
                  <div
                    role="alert"
                    className="space-y-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40"
                  >
                    <div className="flex items-start gap-2 text-amber-950 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-extrabold">{t('更换译文表会重新开始与设计稿对账')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                          {t('当前译文、人工绑定与检查结果会一直保留，直到你选好新表并再次确认。')}</p>
                      </div>
                    </div>
                    <CsvStep
                      parsed={null}
                      onParsed={(next) =>
                        setPendingReplacement(next ? removeEmptyParsedRows(next) : null)
                      }
                      onNext={() => undefined}
                      deliverable={activeDraftDeliverable}
                    />
                    {pendingReplacement && (
                      <div className="rounded-lg border border-amber-300 bg-background/80 p-3 text-xs">
                        <strong className="block text-sm">
                          {t('待更换：')}{pendingReplacement.sourceHeader || t('新译文表')}
                        </strong>
                        <span className="text-muted-foreground">
                          {pendingReplacement.rows.length} {t('行 · ')}{pendingReplacement.languageColumns.length} {t('个语言')}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelTableReplacement}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold"
                      >
                        {t('取消，保留当前任务')}</button>
                      <button
                        type="button"
                        disabled={!pendingReplacement}
                        onClick={confirmTableReplacement}
                        className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-bold text-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t('确认更换并重新与设计稿对账')}</button>
                    </div>
                  </div>
                )}
                {langPickerOpen && parsed && (
                  <div className="rounded-xl bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-extrabold">
                        {t('语言（默认全部，取消勾选可排除）')}</p>
                      <button
                        type="button"
                        onClick={() => setLangPickerOpen(false)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {t('完成')}</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsed.languageColumns.map((lang) => (
                        <label
                          key={lang}
                          className={
                            'flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/40 ' +
                            (targetLanguages.includes(lang)
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background hover:border-foreground/40')
                          }
                        >
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={targetLanguages.includes(lang)}
                            onChange={(e) => {
                              if (e.target.checked) addLanguage(lang)
                              else removeLanguage(lang)
                            }}
                          />
                          {formatLanguageCode(lang)}
                        </label>
                      ))}
                      {/* 批量模式：覆盖率矩阵入口 */}
                      {batchMode && (
                        <CoverageMatrix
                          drafts={coverageDrafts}
                          scopeByDraft={matrixScopeByDraft}
                          confirmedByDraft={matrixConfirmedByDraft}
                          evidenceByDraft={matrixEvidenceByDraft}
                          scannedByDraft={scannedByDraft}
                          onSelect={handleDeliveryMatrixOpenReview}
                        />
                      )}
                    </div>
                  </div>
                )}
                {typographyEnabled && (
                  <TypographyPanel
                    targetLanguages={targetLanguages}
                    /* 2026-10-22（图六）：四个步骤都能打开——面板本体 portal 到 body，
                       不受本区段 hidden 影响；步骤不再是一个门。 */
                    open={typographyDrawerOpen}
                    blockedReason={typographyBlockedReason}
                    probing={typographyEntry.status === 'probing'}
                    onRetryCapability={refreshTypographyCapability}
                    /* 第 4 步执行中打开＝只读查看（图六第 2 层）：批量执行中或本次执行已授权未结算。 */
                    readOnly={experimentRunning || executionAuthorized}
                    onClose={closeTypographyDrawer}
                    onDirtyChange={setTypographyDirty}
                    onClosed={restoreTypographyFocus}
                  />
                )}
                </div>
              </div>
            </div>
          </section>

          {/* 悬浮球（设计稿固定规则：与卡头按钮同时出现）。皮肤同卡头＝轻量原生碳。
              2026-10-22 Owner 令（图六）三层修正：
              · 宽度：xl(≥1280) → lg(≥1024)；<1024 不再消失，由顶栏「排版」图标接手。
              · 步骤：原来是 activeStage === 'materials' 的专属，现在四个步骤都常驻。
              · 能力：助手没回报能力位时不再整块消失，改为置灰 + 点开给一句话原因。
              位置必须挂在阶段一 section 之外——那个 section 带 hidden，fixed 子节点也会一起被藏掉。 */}
          {typographyEnabled && !typographyDrawerOpen && (
            <div className="group fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
              <button
                type="button"
                onClick={() => openTypographyDrawer('ball')}
                aria-haspopup="dialog"
                aria-expanded={false}
                aria-controls="typography-panel"
                aria-disabled={!typographyWritable}
                aria-label={
                  typographyWritable
                    ? t('排版定制（内测预览）')
                    : t('排版定制暂不可用：{value0}', { value0: String(typographyBlockedReason ?? t('正在连接本地助手…')) })
                }
                data-typography-trigger="ball"
                data-typography-state={typographyEntry.status}
                className={
                  typographyWritable
                    ? 'relative flex h-11 w-11 items-center justify-center rounded-full border border-foreground/20 bg-background/95 text-foreground shadow-lg backdrop-blur transition-colors hover:border-foreground/40 hover:bg-muted'
                    : 'relative flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-border bg-muted/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-foreground/30 hover:text-foreground'
                }
              >
                <span className="text-sm font-black leading-none">T</span>
                {typographyDirty && (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-background"
                    aria-label={t('有未保存改动')}
                  />
                )}
                {typographyAttention && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-background ring-2 ring-background">
                    <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                  </span>
                )}
              </button>
              <span
                role="tooltip"
                className={
                  'pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium leading-snug text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 ' +
                  (typographyWritable ? 'whitespace-nowrap' : 'w-[220px] text-left')
                }
              >
                {typographyWritable
                  ? t('排版定制（内测预览）')
                  : t('排版定制暂不可用：{value0}', { value0: String(typographyBlockedReason ?? t('正在连接本地助手…')) })}
              </span>
            </div>
          )}

          {/* 阶段二：智能检测（仅 activeStage=translation_review 渲染） */}
          {batchMode && activeStage === 'translation_review' && (
            <MultiDraftStageQueue
              stage="translation_review"
              rows={draftTableRows}
              activeDraftPath={activeDraftMasterPath}
              currentLanguage={currentLanguage}
              onSelectDraft={(masterPath) => {
                const target = batchScopeEntries.find((entry) => entry.masterPath === masterPath)
                if (target) switchActiveDraft(target)
              }}
            />
          )}
          {activeStage === 'translation_review' && (
          <section
            id="stage-review"
            className="overflow-hidden rounded-xl border bg-card p-4 sm:p-5"
          >
            <div className="mb-3 flex w-full flex-wrap items-center gap-3 text-left">
              <h2
                ref={reviewHeadingRef}
                tabIndex={-1}
                className="text-sm font-bold outline-none"
              >
                {WB_TERMS.smartReview}
              </h2>
              <span className="text-xs text-muted-foreground">
                {!parsed
                  ? t('导入译文表后开放')
                  : t('译文审查确认 {count}/{total}', {
                      count: String(targetLanguages.filter((language) => reviewedLanguageDigests[language] === languageDigests[language]).length),
                      total: String(targetLanguages.length),
                    })}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {batchReview && (
                  <span
                    className={
                      'rounded-md px-2 py-0.5 text-[11px] font-bold ' +
                      (batchReview.aggregate === 'failed' || batchReview.aggregate === 'partial_failure'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : batchReview.aggregate === 'contains_unknown'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                          : 'bg-muted text-muted-foreground')
                    }
                    title={checkedRevision !== checkRevision ? t('内容有修改，请重新检查。') : undefined}
                  >
                    {t('批次状态：')}{reviewAggregateLabel(batchReview.aggregate).label}
                    {checkedRevision !== checkRevision ? t('（内容已改）') : ''}
                  </span>
                )}
                <button
                  type="button"
                  disabled={!parsed || !currentLanguage}
                  onClick={() => setEditorOpen(true)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-40"
                >
                  {WB_TERMS.editSheet}
                </button>
                <button
                  type="button"
                  disabled={batchReviewRunning || !parsed || targetLanguages.length === 0}
                  onClick={() => void handleRunAllLanguageReview()}
                  className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:bg-foreground/90 disabled:opacity-40"
                >
                  {batchReviewRunning
                    ? WB_TERMS.detectAllRunning
                    : batchMode
                      ? t('检测当前稿全部 {count} 种语言', { count: String(targetLanguages.length) })
                      : WB_TERMS.detectAllLanguages(targetLanguages.length)}
                </button>
              </div>
            </div>
            {parsed && currentLanguage && (
              <div className="space-y-4">
                <ReviewStep
                  parsed={parsed}
                  targetLanguage={currentLanguage}
                  selectedLanguages={targetLanguages}
                  editedTranslations={editedTranslations[currentLanguage] ?? {}}
                  confirmedLanguages={
                    targetLanguages.filter(
                      (language) => reviewedLanguageDigests[language] === languageDigests[language],
                    )
                  }
                  reviewStatusByLanguage={batchReview?.statuses ?? {}}
                  onRetryLanguage={(language) => void handleRunSingleLanguageReview(language)}
                  retryRunning={batchReviewRunning || retryingLanguage !== null}
                  editedTranslationsByLanguage={editedTranslations}
                  onEditTranslation={(rowIndex, value) =>
                    setEditedTranslations((previous) => ({
                      ...previous,
                      [currentLanguage]: {
                        ...(previous[currentLanguage] ?? {}),
                        [rowIndex]: value,
                      },
                    }))
                  }
                  onChangeLanguage={(language) => {
                    if (!targetLanguages.includes(language)) addLanguage(language)
                    setCurrentLanguage(language)
                  }}
                  onAfterApply={(appliedCount) => {
                    // P2：应用建议后立即重查检查台，让"剩余阻塞"实时收敛
                    setAppliedReviewCount((previous) => previous + appliedCount)
                    void runBatchCheck()
                  }}
                  onLearningSuggestionApplied={(rowIndex) => {
                    // P1-2 学习采集（best-effort）：用户显式应用智能检测建议（仅稳定行号，无正文）。
                    const scanId = psdSelection?.scanId
                    if (!scanId) return
                    void bufferLearningSignal({
                      scanId,
                      objectId: `row:${currentLanguage ?? ''}:${rowIndex}`,
                      decisionFamily: 'fragment_join_policy',
                      actionCode: 'accepted',
                      contextFeatures: { stage: 'smart_review' },
                      semantic: 'human_confirmed',
                      scopeHints: { templateFingerprint: psdSelection?.summary?.fingerprint ?? null },
                    })
                  }}
                  onNext={handleReviewConfirmed}
                  onReviewed={recordReviewDecisions}
                  nextLabel={t('确认当前语言并继续')}
                  detectIdleLabel={batchMode
                    ? t('智能检测当前语言 {lang}', { lang: formatLanguageCode(currentLanguage) })
                    : undefined}
                />
                {batchReview && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    {batchReview.error && (
                      <p className="mb-2 text-xs font-bold text-rose-600">
                        {humanizeInternalIds(batchReview.error)}
                      </p>
                    )}
                    <ul className="space-y-1.5 text-xs">
                      {targetLanguages.map((language) => {
                        const status = batchReview.statuses[language]
                        const phaseLabel = status
                          ? t(REVIEW_PHASE_LABEL[status.phase] ?? status.phase)
                          : t(REVIEW_PHASE_LABEL.not_run)
                        const canRetry = status?.phase === 'failed' || status?.phase === 'unknown'
                        return (
                          <li key={language} className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{formatLanguageCode(language)}</span>
                            <span
                              className={
                                status?.phase === 'failed' || status?.phase === 'unknown'
                                  ? 'font-bold text-rose-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              {phaseLabel}
                            </span>
                            {status?.suggestions !== undefined && (
                              <span className="text-muted-foreground">
                                {t('有建议 ')}{status.suggestions} {t('条 / 提示 ')}{status.notes ?? 0} {t('条（建议数仅供参考；检测结果不跨语言保留，处理需在该语言内重新检测）')}</span>
                            )}
                            {status?.omitted !== undefined && status.omitted > 0 && (
                              <span className="text-amber-700">
                                {t('未覆盖 ')}{status.omitted} {t('行（表格超出单次审查上限，请分批处理）')}</span>
                            )}
                            {status?.error && (
                              <span className="text-rose-600">{humanizeInternalIds(status.error)}</span>
                            )}
                            {canRetry && (
                              <button
                                type="button"
                                disabled={batchReviewRunning || retryingLanguage !== null}
                                onClick={() => void handleRunSingleLanguageReview(language)}
                                className="rounded-lg border border-border px-2 py-0.5 font-bold hover:bg-muted disabled:opacity-40"
                              >
                                {WB_TERMS.retryLanguage}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t('建议不会自动应用：逐语言确认后生效；失败/未知结果如实显示，不自动重试。')}</p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportReconcile('statement')}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                    >
                      {t('导出对账结果（当前语言）')}</button>
                    <button
                      type="button"
                      onClick={() => handleExportReconcile('replenish')}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                    >
                      {t('导出缺译对象清单（当前语言）')}</button>
                  </div>
                </div>
                <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
                  <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
                    <SheetHeader>
                      <SheetTitle>{WB_TERMS.sheetDraft}</SheetTitle>
                      <SheetDescription>
                        {experimentRunning || executionAuthorized
                          ? <>{t('当前语言 ')}{formatLanguageCode(currentLanguage)} {t('· 本轮已授权或正在执行，译表暂为只读；等结算完成后再来改。')}</>
                          : <>{t('当前语言 ')}{formatLanguageCode(currentLanguage)} {t('· 这里就是译表的编辑处：改完可用「撤销／重做」退回；与「')}{WB_TERMS.smartReview}{t('」列的是同一份译文，不会互相覆盖。')}</>}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="px-4 pb-4">
                      <WorkingEditorPanel
                        documentId={`scan:${psdSelection?.scanId ?? 'draft'}:${currentLanguage}`}
                        parsed={parsed}
                        editedTranslations={editedTranslations[currentLanguage] ?? {}}
                        scanId={psdSelection?.scanId ?? null}
                        languageCode={currentLanguage}
                        readOnly={experimentRunning || executionAuthorized}
                        ignoredRows={ignoredRowsForSheet}
                        onRestoreIgnoredRow={handleToggleRowExclusion}
                        onDocumentChange={(document) => {
                          if (!currentLanguage) return
                          handleSheetDocumentChange(currentLanguage, document)
                        }}
                        replenishItems={(checks[currentLanguage]?.items ?? [])
                          .filter((item) => item.kind === 'missing')
                          .map((item) => ({
                            objectId: item.objectId,
                            label: item.groupLabel || item.layerLabel,
                            sourceText: item.sourceText,
                            sourceTextOmitted: item.sourceTextOmitted,
                          }))}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </section>
          )}

          {/* 阶段三：设计稿校对（仅 activeStage=design_reconcile 渲染） */}
          {batchMode && activeStage === 'design_reconcile' && (
            <MultiDraftStageQueue
              stage="design_reconcile"
              rows={draftTableRows}
              activeDraftPath={activeDraftMasterPath}
              currentLanguage={currentLanguage}
              activeStageStatus={
                !allChecksDone || checkedRevision !== checkRevision
                  ? batchLoading
                    ? t('正在检查')
                    : t('待检查当前稿')
                  : totalBlocked > 0
                    ? t('{count} 项待处理', { count: String(totalBlocked) })
                    : t('当前稿检查完成')
              }
              onSelectDraft={(masterPath) => {
                const target = batchScopeEntries.find((entry) => entry.masterPath === masterPath)
                if (target) switchActiveDraft(target)
              }}
            />
          )}
          {activeStage === 'design_reconcile' && (
          <section
            id="stage-adaptation"
            className="overflow-hidden rounded-xl border bg-card p-4 sm:p-5"
          >
            <div className="mb-3 flex w-full items-center gap-3 text-left">
              <span className="text-sm font-bold">{t('设计稿校对')}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {allChecksDone
                  ? totalBlocked > 0
                    ? WB_TERMS.blockedVerdict(totalBlocked)
                    : WB_TERMS.alignedVerdict
                  : batchLoading
                    ? t('正在计算…')
                    : readiness.allLanguagesReviewed
                      ? t('扫描设计稿后开始与设计稿对账')
                      : t('确认译文后开放')}
              </span>
            </div>
            {isGuest ? (
              <div className="space-y-3">
                <GuestInlineNote text="访客演示：与设计稿对账要先扫描设计稿；扫描由你电脑上的本地助手在 Photoshop 里做，要登录并装好助手才会真跑。" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {parsed && targetLanguages.length > 0
                    ? t('这次导入了 {languages} 个语言、{rows} 行译文。扫描之后，这里会逐个文字对象显示：原文、对应译文、有没有换行风险，以及需要你拍板的地方。', {
                        languages: String(targetLanguages.length),
                        rows: String(parsed.rows.length),
                      })
                    : t('先在第一步导入译文表，这里才会显示要对账的内容。')}
                </p>
                <button
                  type="button"
                  onClick={() => goToStage('delivery')}
                  className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background hover:bg-foreground/90"
                >
                  {t('下一步：生成交付')}</button>
              </div>
            ) : readiness.reconcileOpen ? (
              <div className="space-y-3">
                {/* PSD/译文表差集是一个任务范围判断，不按语言、对象重复展示。 */}
                {checkSummary.scopeNeedsConfirmation && (
                  <div data-testid="reconcile-pending-scope" className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/40">
                    <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] dark:bg-amber-900/50">{t('待确认范围')}</span>
                      <AlertTriangle className="h-4 w-4" />
                      {materialMismatch
                        ? t('设计稿与译文表可能不是同一版本')
                        : t('确认本次替换范围')}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                      {overview.missing > 0
                        ? t('{count} 处文字对象在译文表里没有对应行。建议保持原文，等你确认后再按此处理；确认后这些对象保持原文，不写入、不扣积分。只需确认一次，不按语言重复。', { count: String(overview.missing) })
                        : t('请检查材料并确认本次替换范围。')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleExcludeMissing()
                          handleIgnoreUnmatched()
                        }}
                        className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-700"
                      >
                        {overview.missing > 0 ? t('确认按建议保持原文') : t('确认本次范围')}</button>
                      {overview.missing > 0 && (
                        <button
                          type="button"
                          onClick={() => openIssueKind(['missing'])}
                          className="rounded-lg border border-amber-700 bg-background px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-200"
                        >
                          {t('逐个补译（{count}）', { count: String(overview.missing) })}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => goToStage('materials')}
                        className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:text-amber-200"
                      >
                        {t('检查材料')}</button>
                    </div>
                  </div>
                )}

                {/* 真阻断才占用常驻层：卡片默认收起，标题不带第二个数字（计数在阶段头那一句） */}
                {needsDecisionCard && (
                  <details data-testid="reconcile-required-items" className="overflow-hidden rounded-xl bg-muted/30">
                    {/* 折叠不得删报：卡内逐类按钮与逐语言空译文 chip 原样保留，全量条目另有对账单 → src/lib/workbench/reconciliation-actions.ts */}
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{t('必须处理')}</span>
                        {t('{needYourDecision}（点了才能生成）', { needYourDecision: String(WB_TERMS.needYourDecision) })}
                      </span>
                      <span className="text-[11px] font-semibold">{t('展开看是哪几处 ›')}</span>
                    </summary>
                    <div className="space-y-2 border-t px-3 py-2.5">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t('同一问题在多种语言里只列一次；下面每一处都要你决定，不决定就不能生成。')}</p>
                      <div className="flex flex-wrap gap-2">
                        {overview.changed > 0 && (
                          <button
                            type="button"
                            onClick={() => openIssueKind(['source_changed'])}
                            className="rounded-lg border border-amber-600 bg-background px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-200"
                          >
                            {t('原文变化 ')}{overview.changed} {t('处 · 逐项确认')}</button>
                        )}
                        {(overview.ambiguousGroups > 0 || overview.duplicateGroups > 0) && (
                          <button
                            type="button"
                            onClick={() => openIssueKind(['ambiguous', 'duplicate_source'])}
                            className="rounded-lg border border-amber-600 bg-background px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 dark:text-amber-200"
                          >
                            {t('重复文案 ')}{overview.ambiguousGroups + overview.duplicateGroups} {t('处 · 选择目标')}</button>
                        )}
                      </div>
                      {/* 只在目标文本确实缺失时提示；不再用“完整”与下方阻断数制造矛盾。 */}
                      {allChecksDone && invalidTargetTotal > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {targetLanguages
                            .filter(
                              (lang) => (overview.invalidTargetByLang[lang] ?? 0) > 0,
                            )
                            .map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => setCurrentLanguage(lang)}
                                className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                              >
                                {formatLanguageCode(lang)}{t('：缺')}{' '}
                                {overview.invalidTargetByLang[lang]} {t('条目标译文')}</button>
                            ))}
                        </div>
                      )}
                    </div>
                  </details>
                )}
                {(overflowRisk.total > 0 || overflowRisk.unmeasuredCount > 0) && (
                  <div data-testid="reconcile-layout-review" className="rounded-xl border border-sky-300 bg-sky-50/70 p-3 dark:border-sky-800/60 dark:bg-sky-950/30">
                    <p className="mb-1 text-[11px] font-semibold text-sky-800 dark:text-sky-200">{t('版式复核')}</p>
                    <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                      {overflowRisk.structureLossCount > 0
                        ? t('版式需复核：{structureLossCount} 处译文写进去会丢内容', { structureLossCount: String(overflowRisk.structureLossCount) })
                        : overflowRisk.total > 0
                          ? t('有译文比设计稿宽：只影响排面，不改写入内容')
                          : t('本版量不出译文宽度：设计稿没给到字号或文字框宽度，逐层核对请看下方清单')}
                      {overflowRisk.unmeasuredCount > 0 && overflowRisk.total > 0
                        ? t('（另有 {unmeasuredCount} 处量不出宽度，未计入上面的数）', { unmeasuredCount: String(overflowRisk.unmeasuredCount) })
                        : ''}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-sky-800/80 dark:text-sky-300/80">
                      {t('要收只有三种做法：缩字号、精简译文，或把该层改成段落文本框。')}</p>
                    <details className="mt-2">
                      {/* 折叠不得删报：版式例外逐条仍在下方清单里，可定位图层并保留原文 → src/components/workbench/layout-exception-list.tsx */}
                      <summary className="cursor-pointer text-[11px] font-semibold text-sky-900 dark:text-sky-200">
                        {t('全部版式明细（')}{overflowRisk.total} {t('处，可定位到图层并选择保留原文）')}</summary>
                      <LayoutExceptionList
                        summary={overflowRisk}
                        excludedObjectIds={excludedLayerObjectIds}
                        onPickLanguage={setCurrentLanguage}
                        onToggleExclude={handleToggleLayoutExclusion}
                      />
                    </details>
                  </div>
                )}
                {/* 语言 tabs */}
<div className="flex flex-wrap gap-2">
                  {targetLanguages.map((lang) => {
                    const c = checks[lang]
                    const n = c
                      ? groupBlockingItems(c.items).length
                      : null
                    const active = lang === currentLanguage
                    const state = languageStates[lang] ?? 'idle'
                    const dotClass =
                      state === 'ready'
                        ? 'bg-emerald-500'
                        : state === 'stale'
                          ? 'bg-amber-500'
                          : state === 'error'
                            ? 'bg-rose-500'
                            : state === 'running'
                              ? 'bg-sky-500 animate-pulse'
                              : 'bg-zinc-400'
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setCurrentLanguage(lang)}
                        title={
                          (n != null && n > 0
                            ? t('这一语言要你决定 {n} 处 · ', { n: String(n) })
                            : '') +
                          (state === 'stale'
                            ? t('译文或决定已变化，需要重新与设计稿对账')
                            : state === 'error'
                              ? t('检查失败')
                              : state === 'ready'
                                ? t('已与设计稿对账')
                                : '')
                        }
                        className={
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ' +
                          (active
                            ? 'border-foreground bg-foreground text-background'
                            : n != null && n > 0
                              ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                              : 'border-border bg-background text-muted-foreground hover:border-foreground/40')
                        }
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                        {formatLanguageCode(lang)}
                      </button>
                    )
                  })}
                </div>

                {appliedReviewCount > 0 && currentLanguage && batchLoading && (
                  <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {t('✓ 建议已应用，正在重新检查…')}</p>
                )}

                {currentLanguage && check && blockedItems.length > 0 && (
                  <details
                    open={issuesOpen}
                    onToggle={(e) =>
                      setIssuesOpen((e.target as HTMLDetailsElement).open)
                    }
                    className="overflow-hidden rounded-xl bg-amber-50 dark:bg-amber-950/40"
                  >
                    {/* 折叠不得删报：本语言全部阻断项逐条与处置动作都在展开后的就绪板里 → src/components/workbench/readiness-board.tsx */}
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {formatLanguageCode(currentLanguage)} {t('有')}{' '}
                        {blockedItems.length} {t('项与设计稿对不上')}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {t('展开处理 ›')}</span>
                      </span>
                    </summary>
                    <div className="px-3 pb-3 [&_section]:border-0 [&_section]:rounded-none [&_section]:shadow-none">
<ReadinessBoard
                        check={check}
                        loading={batchLoading}
                        error={batchError}
                        targetLanguage={currentLanguage}
                        onOpenItem={setInspectorItem}
                        onOpenObjects={() => setObjectsOpen(true)}
                        onRescan={handleRescan}
                        onOpenReview={() => goToStage('translation_review')}
                      />
                    </div>
                  </details>
                )}

                {currentLanguage && check && blockedItems.length === 0 && (
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    ✓ {formatLanguageCode(currentLanguage)} {t('已全部对齐')}</p>
                )}

                {/* YG-QUIET：常驻层只留结论与动作，机制量与后台工作全部收进这一层，一条不删 */}
                {/* 折叠不得删报：常驻层移走的每个数都收在这一层，原句与口径未改 → src/lib/workbench/reconciliation-actions.ts */}
                <WhyDetails
                  title={t('可选详情')}
                  items={[
                    {
                      label: t('可以不管的'),
                      value:
                        t('{totalSuggestion} 条：译文表里的这些行在设计稿中没有对应的文字对象，', { totalSuggestion: String(totalSuggestion) }) +
                        t('不需要处理，也不影响继续生成（清单最多显示 50 条）'),
                    },
                    {
                      label: t('稿子里可写文字对象'),
                      value: t('{count} 个', { count: overview.writableTotal }),
                    },
                    {
                      label: t('已匹配'),
                      value: t('{count} 个对象', { count: totalAutoApplied }),
                    },
                    {
                      label: t('已自动匹配'),
                      value:
                        checkSummary.autoClosedComposites.length > 0 ? (
                          <span>
                            {checkSummary.autoClosedComposites.length} {t('个多行对象：')}<ul className="mt-1 space-y-0.5">
                              {checkSummary.autoClosedComposites.slice(0, 8).map((item) => (
                                <li key={item.objectId ?? item.layerLabel}>
                                  {item.groupLabel ? `${item.groupLabel} / ` : ''}
                                  {item.layerLabel} {t('← 译文表第')}{' '}
                                  {(item.combinedSourceRows ?? []).join('、')} {t('行')}</li>
                              ))}
                            </ul>
                            {checkSummary.autoClosedComposites.length > 8 && (
                              <span>
                                {t('另有 ')}{checkSummary.autoClosedComposites.length - 8} {t('个，完整清单见「导出对账结果」。')}</span>
                            )}
                          </span>
                        ) : null,
                    },
                    {
                      label: t('每种语言要你决定'),
                      value:
                        blockedCountByLanguage.length > 0
                          ? blockedCountByLanguage
                              .map(({ lang, count }) => t('{value0} {count} 处', { value0: String(formatLanguageCode(lang)), count: String(count) }))
                              .join(' · ')
                          : null,
                    },
                    {
                      label: t('本轮已应用智能检测建议'),
                      value: appliedReviewCount > 0 ? t('{appliedReviewCount} 条', { appliedReviewCount: String(appliedReviewCount) }) : null,
                    },
                    {
                      label: t('译文比设计稿宽'),
                      value:
                        overflowRisk.extraLinesCount > 0
                          ? t('{extraLinesCount} 处（其中 {needsExtraLineCount} 处设计稿只有一行，需要精简译文或手动断行：{value2}）', { extraLinesCount: String(overflowRisk.extraLinesCount), needsExtraLineCount: String(overflowRisk.needsExtraLineCount), value2: String(Object.entries(
                              overflowRisk.byLanguage,
                            )
                              .filter(([, counts]) => counts.needsExtraLine > 0)
                              .sort((left, right) => right[1].needsExtraLine - left[1].needsExtraLine)
                              .map(([code, counts]) => `${formatLanguageCode(code)} ${counts.needsExtraLine}`)
                              .join(' · ')) })
                          : null,
                    },
                    {
                      label: t('宽度为什么只能估'),
                      value:
                        overflowRisk.total > 0
                          ? t('文字框坐标测不出图形边界，是否压到图形只能看图定；实际效果以 Photoshop 渲染为准。')
                          : null,
                    },
                  ]}
                />

                {reconciliationDone && (
                  <div className="pt-1">
                    <PhotoshopStep
                      psState={psState}
                      psdSelection={psdSelection}
                      targetLanguages={targetLanguages}
                      onDetected={setPsState}
                      onNext={() => goToStage('delivery')}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {derived.reason ?? t('确认全部语言后开放与设计稿对账')}
              </p>
            )}
          </section>
          )}

          {/* 阶段四：生成交付（仅 activeStage=delivery 渲染） */}
          {activeStage === 'delivery' && (
          <section
            id="stage-delivery"
            className="overflow-hidden rounded-xl border bg-card p-4 sm:p-5"
          >
            <div className="mb-3 flex w-full items-center gap-3 text-left">
              <span className="text-sm font-bold">{t('生成交付')}</span>
              {!deliveryOpen && !isGuest && batchMode && activeDraftDisplayLabel && (
                <span className="text-xs text-muted-foreground" data-testid="delivery-current-draft">
                  {t('当前稿：{draft}', { draft: activeDraftDisplayLabel })}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {deliveryOpen
                  ? t('确认语言、文件名和费用')
                  : isGuest
                    ? t('访客可以先看这次要生成的范围')
                    : derived.reason ?? t('解决必须处理项后开放')}
              </span>
            </div>
            <div className="space-y-4">
              {isGuest && (
                <div className="space-y-3">
                  <GuestInlineNote text="访客演示：生成这一步由你电脑上的本地助手在 Photoshop 里逐层替换文字，要登录并装好助手才会真跑；设计稿和译文都不会上传到服务器。" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {parsed && targetLanguages.length > 0
                      ? t('这次要处理 {languages} 个语言、{rows} 行译文。登录并扫描设计稿后，这一步会显示每个对象对应哪句译文、几处保留原文，以及可选的字体与排版设置。', {
                          languages: String(targetLanguages.length),
                          rows: String(parsed.rows.length),
                        })
                      : t('先在第一步导入译文表，这里才会显示这次要生成的范围。')}
                  </p>
                </div>
              )}
              {!deliveryOpen && !isGuest && (
                <p className="text-xs text-muted-foreground">
                    {t('完成译文审查、与设计稿对账并确认 Photoshop 就绪后开放。')}</p>
              )}
                {deliveryOpen && psState && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {t('可以按当前范围生成 ')}{targetLanguages.length} {t('个语言版本。')}{check && (
                        <>
                          {' '}
                          {check.boundCount} {t('个对象将被替换')}{check.excludedCount > 0 &&
                            t(' · {excludedCount} 个保留原文（不替换）', { excludedCount: String(check.excludedCount) })}
                        </>
                      )}
                    </p>
                    <div className="overflow-hidden rounded-xl bg-background px-4 py-4">
                      <ExecuteStep
                        parsed={parsed as ParsedCsv}
                        targetLanguage={deliveryLanguage}
                        selectedLanguages={targetLanguages}
                        editedTranslations={editedTranslations[deliveryLanguage] ?? {}}
                        editedTranslationsByLanguage={editedTranslations}
                        reviewDecisionsByLanguage={reviewDecisionsByLanguage}
                        psState={psState}
                        psdSelection={psdSelection}
                        forcedBindings={forcedBindingsByLang[deliveryLanguage] ?? []}
                        forcedBindingsByLanguage={forcedBindingsByLang}
                        excludedLayerObjectIds={excludedLayerObjectIds}
                        ignoredTranslationRowIds={ignoredTranslationRowIds}
                        unmatchedTranslationRowIds={unmatchedTranslationRowIds}
                        overflowRisks={overflowRisk.all}
                        overflowRiskTotal={overflowRisk.total}
                        onEvidenceRecoveryRecheck={handleEvidenceRecoveryRecheck}
                        onEvidenceRecoveryExcludeLanguages={(languages) => {
                          setTargetLanguages((prev) => prev.filter((code) => !languages.includes(code)))
                        }}
                        onPsdSelectionChange={handlePsdSelectionChange}
                        onPrev={() => goToStage('design_reconcile')}
                        onReset={handleFullReset}
                        resetConfirming={confirmReset}
                        onExecutionAuthorized={setExecutionAuthorized}
                        batchMode={batchMode}
                        multiPsdSelection={multiPsdSelection ?? undefined}
                        multiDraftLanguageColumns={multiDraftLanguages}
                        experimentTrigger={experimentTrigger}
                        onExperimentPsdComplete={handleExperimentPsdComplete}
                        onExperimentStart={handleExperimentStart}
                        experimentRunning={experimentRunning}
                        experimentIndex={experimentIndex}
                        experimentNotice={experimentNotice}
                        coverageBelowCells={batchCoverageBelow}
                        coverageReleaseAck={coverageReleaseAck}
                        onCoverageReleaseChange={setCoverageReleaseAck}
                      />
                    </div>
                  </div>
                )}
              </div>
          </section>
          )}
              </div>
            </div>
          <div className="flex justify-end">
            <button
              onClick={() => setView('home')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('返回首页')}</button>
          </div>

          {/* P1 底部唯一操作条 */}
          {/* P-07：已在交付阶段时隐藏主按钮——它只会 goToStage('delivery')（原地无效），
              真正的执行入口在执行卡内；留一个死按钮比没有按钮更糟。 */}
          <WorkbenchActionBar
            prevLabel={prevStage ? stageItems.find((s) => s.stage === prevStage)?.label : undefined}
            onPrev={prevStage ? () => goToStage(prevStage) : undefined}
            status={actionStatus}
            primaryLabel={ctaLabel}
            onPrimary={mainCta}
            primaryDisabled={batchLoading}
            primaryHidden={activeStage === 'delivery'}
          />
        </div>
      </div>

      {/* 抽屉（任务准备台） */}
      <ObjectsDrawer
        open={objectsOpen}
        check={check}
        summary={psdSelection?.summary ?? null}
        onClose={() => setObjectsOpen(false)}
      />
      <ObjectInspector
        key={`${currentLanguage ?? ''}:${inspectorItem?.issueGroupId ?? inspectorItem?.ledgerEntryId ?? 'none'}`}
        item={inspectorItem}
        targetLanguage={currentLanguage ?? ''}
        saving={inspectorSaving}
        error={inspectorError}
        onClose={() => setInspectorItem(null)}
        onResolve={handleInspectorResolve}
        onOpenReview={() => goToStage('translation_review')}
        onUnifyTranslation={handleUnifyTranslation}
        rowExclusion={inspectorRowExclusion}
        onToggleRowExclusion={handleToggleRowExclusion}
      />

      {/* ── 批量导入译文表：配对确认（2026-10-21）────────────────────────────
          一次选文件夹后，逐稿显示建议配对；用户可改选或留空，确认后逐张读表。
          与模式确认同款：留在 React 树内，不 portal，跟着工作台换肤。 */}
      {bulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-background p-5 shadow-lg">
            <h2 className="text-base font-bold">{t('确认每一稿用哪张译文表')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('请核对每份稿使用的译文表；有多个候选时请选择一张。选“不导入”的稿保持空表，之后仍可单独导入。')}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              {bulkImport.kind === 'folder'
                ? bulkImport.root
                : t('已选 {length} 张表（浏览器直接读取）', { length: String(bulkImport.tables.length) })}
            </p>
            {/* 整批统计：四个数说清这批要做什么，不用点开看 */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-muted px-2 py-0.5">
                {bulkImport.attribution.counts.drafts} {t('份稿')}</span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                {bulkImport.attribution.counts.tables} {t('张表')}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  bulkImport.attribution.counts.auto > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('自动配好 ')}{bulkImport.attribution.counts.auto}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  bulkImport.attribution.counts.conflict > 0
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('要你定 ')}{bulkImport.attribution.counts.conflict}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  bulkImport.attribution.counts.missing > 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('没找到表 ')}{bulkImport.attribution.counts.missing}
              </span>
              {bulkImport.attribution.counts.orphans > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  {t('有表无稿 ')}{bulkImport.attribution.counts.orphans}
                </span>
              )}
            </div>
            {/* SKU × 交付物 一览：格子＝「稿数 / 能用的表数」，0 表就是还没表 */}
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-2 py-1 font-semibold">SKU</th>
                    {ATTRIBUTION_DELIVERABLE_ORDER.map((kind) => (
                      <th key={kind} className="px-2 py-1 font-semibold">
                        {DELIVERABLE_LABEL[kind]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkImport.attribution.matrix.map((row) => (
                    <tr key={row.sku ?? 'unknown-sku'} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">{row.sku ?? t('未识别')}</td>
                      {ATTRIBUTION_DELIVERABLE_ORDER.map((kind) => {
                        const cell = row.cells[kind]
                        if (cell.drafts === 0 && cell.tables === 0) {
                          return (
                            <td key={kind} className="px-2 py-1 text-muted-foreground/50">
                              —
                            </td>
                          )
                        }
                        return (
                          <td
                            key={kind}
                            className={`px-2 py-1 ${cell.tables === 0 ? 'font-semibold text-rose-700 dark:text-rose-300' : ''}`}
                          >
                            {cell.drafts} {t('稿 / ')}{cell.tables} {t('表')}</td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
                {t('格子里是「这份稿数 / 同 SKU 同交付物能用的表数」。0 表的格子＝这些稿还没有表。')}</p>
            </div>
            <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {bulkImport.attribution.rows.map((row) => (
                <li
                  key={row.draft.masterPath}
                  className={`rounded-lg border px-3 py-2 ${
                    row.status === 'conflict'
                      ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20'
                      : row.status === 'missing'
                        ? 'border-rose-200 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'
                        : 'bg-muted/20'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.status === 'auto'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : row.status === 'conflict'
                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                            : 'bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100'
                      }`}
                    >
                      {ATTRIBUTION_STATUS_LABEL[row.status]}
                    </span>
                    <span className="text-xs font-semibold">{row.identity.label}</span>
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
                      title={row.draft.relPath}
                    >
                      {row.draft.relPath}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t('为 {relPath} 选择译文表', { relPath: String(row.draft.relPath) })}
                      value={bulkChoices[row.draft.masterPath] ?? ''}
                      disabled={bulkImporting}
                      onChange={(event) => {
                        const value = event.target.value
                        setBulkChoices((previous) => ({
                          ...previous,
                          [row.draft.masterPath]: value,
                        }))
                        // 二选一的记忆：同 SKU 同交付物选过一次，下次导入沿用（仅本次会话）
                        if (row.status === 'conflict' && value) {
                          bulkRememberedRef.current[
                            `${row.identity.sku ?? '?'}·${row.identity.deliverable}`
                          ] = value
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px]"
                    >
                      <option value="">{t('不导入（保持空表）')}</option>
                      {(bulkAttributionOptions.get(row.draft.masterPath) ?? bulkImport.tables).map(
                        (table) => (
                          <option key={table.path} value={table.path}>
                            {table.relPath}
                            {row.candidates.some((candidate) => candidate.path === table.path)
                              ? ''
                              : t('（同 SKU 以外/交付物不同，借表要你自己担）')}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{row.reason}</p>
                </li>
              ))}
            </ul>
            {/* 有表无稿：没被任何稿认领的表，逐张说清为什么 */}
            {bulkImport.attribution.orphans.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">
                  {t('有表无稿 ')}{bulkImport.attribution.orphans.length} {t('张（这些表没归给任何稿）')}</p>
                <ul className="mt-1 space-y-0.5">
                  {bulkImport.attribution.orphans.map((orphan) => (
                    <li key={orphan.table.path}>
                      <span className="font-mono">{orphan.table.relPath}</span>
                      <span className="opacity-80">
                        （{orphan.identity.label}）{orphan.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bulkProgress && (
              <p role="status" className="mt-2 text-xs text-sky-700 dark:text-sky-300">
                {t('正在读表：')}{bulkProgress.done} / {bulkProgress.total}
              </p>
            )}
            {bulkNotice && (
              <p
                role="status"
                className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200"
              >
                {bulkNotice}
              </p>
            )}
            {bulkTableWarnings.length > 0 && (
              <ul
                role="status"
                className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {bulkTableWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {bulkErrors.length > 0 && (
              <ul
                role="alert"
                className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {bulkErrors.map((item) => (
                  <li key={item.design}>
                    <span className="font-mono">{item.design}</span>：{item.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkImport(null)}
                disabled={bulkImporting}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-40"
              >
                {t('关闭')}</button>
              <button
                type="button"
                onClick={() => void confirmBulkImport()}
                disabled={bulkImporting}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                {bulkImporting
                  ? t('正在读表…')
                  : t('导入选中的 {length} 张表', { length: String(Object.values(bulkChoices).filter(Boolean).length) })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 多 → 单 模式切换确认（2026-10-18）────────────────────────────
          不静默丢稿：把会被移出的设计稿逐个点名，用户点头才切。
          刻意**不用** Dialog（它 portal 到 body，会脱离 .wb-brand 作用域、配色退回旧色板）；
          这个覆盖层留在 React 树内，跟着工作台换肤。 */}
      {modeConfirmOpen && multiPsdSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-lg">
            <h2 className="text-base font-bold">{t('切到「单个设计稿」后，只保留第 1 个')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('本批有 ')}{multiPsdSelection.entries.length} {t('个设计稿，切换后以下')}{' '}
              {multiPsdSelection.entries.length - 1}{' '}
              {t('个会移出本批。文件本身不受影响，随时可以再加回来。')}</p>
            <ul className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-muted p-3">
              {multiPsdSelection.entries.slice(1).map((e) => (
                <li key={e.masterPath} className="truncate py-0.5 text-xs text-muted-foreground">
                  {e.masterPath}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModeConfirmOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted"
              >
                {t('取消')}</button>
              <button
                type="button"
                onClick={confirmSwitchToSingle}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t('切换，只保留第 1 个')}</button>
            </div>
          </div>
        </div>
      )}
    </ActivationGate>
  )
}
