'use client'

// 图译工坊内测版 v0.1 — Step 5 执行与报告 (B-008 / B-009 / B-010 / B-011)
// 边界：
// - 报告内容绝不包含本地绝对路径、Windows 用户名、设备名、堆栈、Token (RG-003)
// - generateJsonReport / generateHtmlReport 内置 RG-003 脱敏，发现禁止路径抛 ReportSanitizeError
// - ReportSanitizeError → execution_failed，不提供下载 (Recovery 10.6)
// - 其他执行失败 → 尝试 buildFailedReport 生成失败报告供下载 (Recovery 10.4)

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  FileText,
  Flag,
  FolderOpen,
  Loader2,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Undo2,
  XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type {
  ParsedCsv,
  ReplaceReport,
  ReviewRow,
} from '@/lib/types'
import type { PsStateSnapshot } from '@/lib/workbench/photoshop'
import type { MultiPsdEntry, PsdSelection } from '@/lib/workbench/psd-selection'
import {
  basenameOf,
  getMultiPsdPreparedCount,
  getMultiPsdUnscanned,
  isMultiPsdSelectionReady,
} from '@/lib/workbench/psd-selection'
import { buildReview } from '@/lib/workbench/review'
import {
  LocalAssistantRequestError,
  ensureAssistantBinding,
  selectOutputDirectoryDirect,
  startPreparationScan,
  submitV15Execution,
  executeBatchLanguageDirect,
  prepareBatchEvidenceDirect,
  prepareBatchBindingPlanDirect,
  retryV15Report,
  waitForV15Completion,
  V15_ERROR_CODE_ZH,
} from '@/lib/workbench/local-assistant-client'
import {
  abandonBatchLanguage,
  BatchClientRequestError,
  fetchBatchExecutionCapability,
  getBatchStatus,
  type BatchExecutionCapability,
} from '@/lib/workbench/batch-execution-client'
import { reportTypographyEvidence } from '@/lib/workbench/typography-upload-client'
import { BatchResultPanel } from '@/components/workbench/batch-result-panel'
import { ElapsedSeconds } from '@/components/workbench/elapsed-seconds'
import { resolveErrorMessage } from '@/lib/workbench/error-messages'
import { WB_ACTIONS } from '@/lib/workbench/terms'
import { flushLearningSignals } from '@/lib/workbench/learning-signal-client'
import {
  buildSupportContentPack,
  readSupportMode,
  type SupportContentPack,
} from '@/lib/workbench/support-content'
import {
  uploadAssistantSupportBundle,
  uploadAssistantSupportContent,
} from '@/lib/workbench/local-assistant-client'
import { SupportUploadDialog } from '@/components/workbench/support-upload-dialog'
import {
  ExecutionScopeDialog,
  type ExecutionScopeLine,
} from '@/components/workbench/execution-scope-dialog'
import { isSystemicPreExecutionError, isBusyDispatchCode, runWithBusyRetry, SYSTEMIC_BATCH_ERROR_CODES, isReceiptMissingErrorCode, funnelSafeErrorCode, funnelStageForBatchFailure, sanitizeFunnelErrorMessage, v15WaitTimeoutDetail } from '@/lib/workbench/batch-error-policy'
import { REVIEW_SNAPSHOT_MAX_ROWS, uncoveredSnapshotLanguages } from '@/lib/workbench/review-snapshot-limits'
import { saveReviewSnapshot } from '@/lib/workbench/snapshot-client'
import { notifyCreditsChanged } from '@/lib/workbench/credits-client'
import {
  clearExecutionRecovery,
  discardSubmissionRecoveryFor,
  loadExecutionRecovery,
  recoverableBatchAttemptLanguage,
  resumePendingSubmission,
  saveExecutionRecovery,
} from '@/lib/workbench/execution-recovery'
import { estimateBilling } from '@/lib/billing/rules'
import {
  BILLING_SCOPE_VERSION,
  excludedRowIndexSet,
  type BillingScope,
  type BillingScopeRow,
} from '@/lib/billing/billing-scope'
import {
  computeBatchLanguageBilling,
  quoteCreditsForBatch,
} from '@/lib/billing/batch-v3'
import { basenameOnly } from '@/lib/report/sanitize'
import { submitFunnelEvent, trackFunnelEvent, workbenchAuthHeaders, readWorkbenchActivation } from '@/lib/workbench/funnel-client'
import { formatLanguageCode } from '@/lib/workbench/lang-display'
import {
  buildUnproducedReportHtml,
  collectUnproducedLanguages,
  unproducedReportFileName,
} from '@/lib/workbench/failure-report'
import {
  preparationFreshness,
  preExecutionNotice,
} from '@/lib/workbench/v15-freshness'
import { useFeatureFlags } from '@/lib/workbench/use-feature-flags'
import { useFeedback } from '@/lib/workbench/feedback'
import { localAssistantReportFileName } from '@/config/localAssistant'
import { digestWorkbenchValue, stableTranslationRowIds } from '@/lib/workbench/workbench-revision'
import { buildBillingPreviewRows } from '@/lib/workbench/billing-preview'
import { buildRowDerivation, type RowDerivationReason } from '@/lib/workbench/billing/row-derivation'
import { buildBatchExecutableRows } from '@/lib/workbench/batch-executable-rows'
import { COVERAGE_THRESHOLD, type CoverageMatrixCell } from '@/lib/workbench/coverage'
import type { SmartReviewDecision } from '@/lib/workbench/smart-review-contract'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { fillCopy, useSiteCopy } from '@/lib/workbench/site-copy'
import { t } from '@/lib/i18n/t'
import { localAssistantDownloadUrl, localAssistantVersion } from '@/config/localAssistant'
import {
  EMPTY_FEEDBACK_STUDIO_RESPONSE,
  FEEDBACK_STUDIO_DEFINITION_ID,
  NEXT_USE_INTENT_VALUES,
  RESULT_USABILITY_VALUES,
  REVIEW_INCREMENTAL_VALUE_VALUES,
  feedbackStudioResponseComplete,
  type NextUseIntent,
  type ResultUsability,
  type ReviewIncrementalValue,
} from '@/lib/feedback/feedback-studio-contract'

const APP_NAME = '图译工坊内测版'
const APP_VERSION = '0.1'
interface ExecuteStepProps {
  parsed: ParsedCsv
  targetLanguage: string
  selectedLanguages?: string[]
  editedTranslations: Record<number, string>
  editedTranslationsByLanguage: Record<string, Record<number, string>>
  reviewDecisionsByLanguage?: Record<string, SmartReviewDecision[]>
  psState: PsStateSnapshot
  psdSelection: PsdSelection | null
  /** 任务准备台解决结果：人工确认的对象绑定（按 ledgerEntryId） */
  forcedBindings?: { ledgerEntryId: string; target: string; fragmentRowIds?: string[] }[]
  forcedBindingsByLanguage?: Record<string, { ledgerEntryId: string; target: string; fragmentRowIds?: string[] }[]>
  /** 已确认不参与本次写入的 PSD 对象与未使用译文行（身份不可混用） */
  excludedLayerObjectIds?: string[]
  ignoredTranslationRowIds?: string[]
  /** 任务准备台判定"译文在 PSD 中无对应对象"的行（全语言汇总）；计费与执行一律排除 */
  unmatchedTranslationRowIds?: string[]
  /** 2026-09-17 S0：版式例外清单（工作台计算后随报告落盘；结构缺陷必须处理，其余仅提示） */
  overflowRisks?: { language: string; objectId: string; layerLabel: string; sourcePreview: string; targetPreview: string; reason: string; sourceLines: number; targetLines: number; widthRatio: number | null }[]
  /** 全批溢出风险真总数（工作台算得，报告只许显示它，不许用截断长度冒充） */
  overflowRiskTotal?: number
  /** 2026-09-17 批次B：evidence 绑定失败出口——清空本批次确认绑定并重新检查 */
  onEvidenceRecoveryRecheck: () => void
  /** 2026-09-17 批次B：evidence 绑定失败出口——取消这些语言的勾选（重试由用户再次点击执行发起） */
  onEvidenceRecoveryExcludeLanguages: (languages: string[]) => void
  onPsdSelectionChange: (selection: PsdSelection | null) => void
  onPrev: () => void
  onReset: () => void
  /** 重置两击确认态（确认窗口 4s）：为真时 footer 按钮显示"再点一次确认"提示 */
  resetConfirming?: boolean
  onExecutionAuthorized: (authorized: boolean) => void
  /**
   * 批量模式（由 WorkbenchView 透传，来自当前视图而非全局开关）。
   * 2026-10-16：原先这里读 `featureFlags.multiPsdExperimentEnabled`，改为视图决定模式，
   * 与 design-file-card 的静态读取一并收口（ISSUES #151 的双语义）。
   */
  batchMode?: boolean
  /** 批量模式：多 PSD 编排 */
  multiPsdSelection?: import('@/lib/workbench/psd-selection').MultiPsdSelection
  /** 每稿一表（v7）：各稿自己的已选语言，key=masterPath（与 entries 同序取用）。 */
  multiDraftLanguageColumns?: Record<string, string[]>
  /** 实验模式触发器：递增时触发 runExecution（workbench-view 逐 PSD 编排用） */
  experimentTrigger?: number
  /** 实验模式：单 PSD 执行完成回调（workbench-view 编排下一 PSD 用） */
  onExperimentPsdComplete?: (psdIndex: number, success: boolean) => void
  /** 实验模式：开始编排回调（workbench-view 设置第一个 PSD + 触发执行） */
  onExperimentStart?: () => void
  /**
   * 批量模式：编排是否正在运行（2026-10-16 新增）。
   * 原先 WorkbenchView 的 `experimentRunning` 只写不读 ⇒ 批量执行期间界面毫无反馈，
   * 用户不知道跑到第几稿、是否还在跑。现在由视图下拉为 prop，面板据此显示真实进度。
   */
  experimentRunning?: boolean
  /** 批量模式：当前正在执行的稿序号（0-based），用于显示「第 N/M 个」 */
  experimentIndex?: number
  /** 批量模式：编排提示（未扫描不放行 / 某稿失败中止 / 全部完成） */
  experimentNotice?: string | null
  /**
   * #140/D5 覆盖率闸：低于阈值的矩阵格子（与覆盖率矩阵同源口径；空/undefined＝无闸）。
   * 非空且未勾选显式放行时，批量启动按钮禁用；workbench-view 侧对同一条件再拦一道。
   */
  coverageBelowCells?: CoverageMatrixCell[]
  /** #140/D5：用户勾选的显式放行（对当前批 × 当前语言表；数据变化由视图重置）。 */
  coverageReleaseAck?: boolean
  /** #140/D5：勾选/取消放行的回调（状态由 workbench-view 持有）。 */
  onCoverageReleaseChange?: (ack: boolean) => void
}

type ExecutionState =
  | 'idle'
  | 'execution_running'
  | 'execution_submitted'
  | 'execution_completed'
  | 'execution_failed'

// 2026-09-17 批次B：evidence 绑定失败的逐语言清单与出口。
// 只含 language + code（标识符级），不含任何译文/图层原文。
export interface EvidenceLanguageFailure {
  language: string
  code: string
}

class EvidenceLanguageFailureError extends Error {
  failures: EvidenceLanguageFailure[]
  constructor(failures: EvidenceLanguageFailure[]) {
    super('BATCH_EVIDENCE_BINDING_FAILED')
    this.name = 'EvidenceLanguageFailureError'
    this.failures = failures
  }
}

function evidenceFailureSuggestion(code: string): string {
  if (code === 'V15_FORCED_SOURCE_MISMATCH') {
    return t('手工确认的绑定与图层原文不一致：清空确认后重新检查，或取消该语言。')
  }
  if (code === 'BINDING_COMPILE_FAILED') {
    return t('该语言的绑定编译失败：确认表格与设计稿对应关系后重新检查。')
  }
  return t('该语言的绑定检查未通过：清空确认后重新检查，或取消该语言后再执行。')
}

/**
 * P-14：清单正文只用中文文案——已登记码走统一错误文案表（含动作），
 * 未登记码沿用本清单既有处置建议；原始编号一律只由 title 携带，不印进正文。
 */
function evidenceFailureMessage(code: string): string {
  const spec = resolveErrorMessage(code)
  if (spec.raw !== undefined) return evidenceFailureSuggestion(code)
  const actions = spec.actions.length > 0 ? `（${spec.actions.join('；')}）` : ''
  return `${spec.title}。${spec.body}${actions}`
}

function summarizeEvidenceFailures(failures: EvidenceLanguageFailure[]): string {
  return failures.map((item) => `${item.language}:${item.code}`).join(';').slice(0, 200)
}

/**
 * P-06：失败码的兜底说明走统一错误文案表（title+body），用户可见正文里绝不出现裸编号；
 * 原始编号由失败提示的 title 属性携带，供排障使用。
 */
function fallbackErrorDetail(code: string): string {
  const spec = resolveErrorMessage(code)
  return `${spec.title}。${spec.body}`
}

interface LocalOutputLocation {
  directory: string
  filePath: string
}

function v15OutputLocation(
  masterPath: string,
  _attemptId: string,
  locale: string,
  outputDirectory?: string | null,
  outputBaseName?: string | null,
): LocalOutputLocation | null {
  const normalized = masterPath.replace(/\//g, '\\')
  const slash = normalized.lastIndexOf('\\')
  const fileName = slash >= 0 ? normalized.slice(slash + 1) : normalized
  const extension = fileName.match(/\.(psd|psb)$/i)?.[0]?.toLowerCase()
  if (!extension || !_attemptId || !locale) return null
  const sourceBase = safeOutputName(
    (outputBaseName || fileName.slice(0, -extension.length)).replace(/\.(psd|psb)$/i, ''),
  ) || fileName.slice(0, -extension.length)
  const parent = slash >= 0 ? normalized.slice(0, slash) : ''
  const directory = outputDirectory?.trim().replace(/\//g, '\\') || parent || '.'
  return {
    directory,
    filePath: `${directory}\\${sourceBase}__${locale}${extension}`,
  }
}

function outputLocationFromFinalPath(finalPath: string): LocalOutputLocation | null {
  const normalized = finalPath.trim().replace(/\//g, '\\')
  const slash = normalized.lastIndexOf('\\')
  if (slash <= 0) return null
  return { directory: normalized.slice(0, slash), filePath: normalized }
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeOutputName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function resolveOutputBaseName(value: string, fallback: string): string {
  return safeOutputName(value.replace(/\.(psd|psb)$/i, '')) || fallback
}

/** 被版本／合同门挡下时必须当场给出口（2026-10-27 D5）。
 *  过去这里只说一句"请升级"，附近连个链接都没有——客户只能自己去找下载页。 */
const ASSISTANT_DOWNLOAD_REASONS = new Set([
  'BATCH_ASSISTANT_VERSION_MISMATCH',
  'BATCH_ASSISTANT_CONTRACT_MISMATCH',
  'ASSISTANT_IDENTITY_MISSING',
])

function AssistantDownloadLink({ reasonCode }: { reasonCode?: string | null }) {
  if (!reasonCode || !ASSISTANT_DOWNLOAD_REASONS.has(reasonCode)) return null
  return (
    <a
      href={localAssistantDownloadUrl}
      download
      className="ml-1 font-semibold underline underline-offset-2"
    >
      {t('下载安装包')} v{localAssistantVersion}
    </a>
  )
}

export function ExecuteStep({
  parsed,
  targetLanguage,
  selectedLanguages,
  editedTranslations,
  editedTranslationsByLanguage,
  reviewDecisionsByLanguage,
  psState,
  psdSelection,
  forcedBindings,
  forcedBindingsByLanguage,
  excludedLayerObjectIds,
  ignoredTranslationRowIds,
  unmatchedTranslationRowIds,
  overflowRisks,
  overflowRiskTotal,
  onEvidenceRecoveryRecheck,
  onEvidenceRecoveryExcludeLanguages,
  onPsdSelectionChange,
  onPrev,
  onReset,
  resetConfirming,
  onExecutionAuthorized,
  batchMode = false,
  multiPsdSelection,
  multiDraftLanguageColumns,
  experimentTrigger,
  onExperimentPsdComplete,
  onExperimentStart,
  experimentRunning,
  experimentIndex,
  experimentNotice,
  coverageBelowCells,
  coverageReleaseAck,
  onCoverageReleaseChange,
}: ExecuteStepProps) {
  const copy = useSiteCopy('workbench')
  const [execState, setExecState] = useState<ExecutionState>('idle')
  // 实验模式（2026-10-16）：state 镜像到 ref——.finally 里读闭包 state 恒是启动时快照（非 failed），
  // 会把失败误报成成功、带病推进下一个 PSD（实测：12 格全失败却一路空转到底）。
  const execStateRef = useRef<ExecutionState>('idle')
  const transitionExecState = (next: ExecutionState) => {
    execStateRef.current = next
    setExecState(next)
  }
  const [report, setReport] = useState<ReplaceReport | null>(null)
  const [reportJson, setReportJson] = useState<string | null>(null)
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [localReportStatus, setLocalReportStatus] = useState<'unknown' | 'pending' | 'generated' | 'failed'>('unknown')
  const [outputBaseName, setOutputBaseName] = useState<string>('')
  const [outputLocation, setOutputLocation] = useState<LocalOutputLocation | null>(null)
  const [outputPathCopied, setOutputPathCopied] = useState(false)
  const [customOutputDirectory, setCustomOutputDirectory] = useState<string | null>(null)
  const [selectingOutputDirectory, setSelectingOutputDirectory] = useState(false)
  const [customOutputName, setCustomOutputName] = useState<string>('')
  const [projectId] = useState(() => crypto.randomUUID())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [executionErrorCode, setExecutionErrorCode] = useState<string | null>(null)
  // 2026-09-17 批次B：evidence 逐语言失败清单（非空时展示恢复面板）
  const [evidenceFailures, setEvidenceFailures] = useState<EvidenceLanguageFailure[] | null>(null)
  // 2026-09-17 批次C（切片2）：失败现场"上传排查信息"对话框
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)

  // 由当前表格/译文构建排障内容包（结构档不含正字；原文档需用户显式勾选）
  const buildSupportContent = (tier: 'structure' | 'original'): SupportContentPack | null => {
    const rows = parsed?.rows
    if (!rows || rows.length === 0) return null
    const languages = selectedLanguages && selectedLanguages.length > 0 ? selectedLanguages : [targetLanguage]
    const translationsByLanguage: Record<string, { rowId: string; source: string; target: string }[]> = {}
    for (const language of languages) {
      translationsByLanguage[language] = rows.map((row, index) => ({
        rowId: row.recordId || String(index + 1),
        source: typeof row.source === 'string' ? row.source : '',
        target: editedTranslationsByLanguage?.[language]?.[index] ?? row.translations?.[language] ?? '',
      }))
    }
    return buildSupportContentPack({ tier, translationsByLanguage })
  }

  const { notify } = useFeedback()
  // 支持模式：开启后失败自动上传（元数据 + 所选档位内容包），失败不影响主流程但明确提示
  const autoUploadSupportIfEnabled = (build: (tier: 'structure' | 'original') => SupportContentPack | null) => {
    const mode = readSupportMode()
    if (!mode) return
    void (async () => {
      try {
        const metadata = await uploadAssistantSupportBundle()
        if (metadata.pending > 0 || metadata.failed > 0 || metadata.uploaded + metadata.deduped === 0) {
          notify({
            title: t('排障信息尚未确认上传'),
            description: t('上传 {uploaded} 份、去重 {deduped} 份、待处理 {pending} 份、失败 {failed} 份。', { uploaded: String(metadata.uploaded), deduped: String(metadata.deduped), pending: String(metadata.pending), failed: String(metadata.failed) }),
            variant: 'destructive',
            dedupeKey: 'support-metadata-upload-incomplete',
          })
          return
        }
        const pack = build(mode.includeOriginal ? 'original' : 'structure')
        if (pack) {
          const content = await uploadAssistantSupportContent({ consentVersion: mode.consentVersion, content: pack })
          if (content.stored + content.deduped === 0) {
            notify({ title: t('排障内容包未确认上传'), description: t('元数据已确认，内容包没有收到保存或去重确认。'), variant: 'destructive', dedupeKey: 'support-content-upload-incomplete' })
          }
        }
      } catch (error) {
        notify({
          title: t('排障信息上传失败'),
          description: error instanceof Error ? error.message : t('请稍后在失败现场重新上传。'),
          variant: 'destructive',
          dedupeKey: 'support-upload-failed',
        })
      }
    })()
  }
  // V1.5 执行前新鲜度提示（预扫描只作提示，不阻断执行）
  const [preparationNotice, setPreparationNotice] = useState<string | null>(
    () => (psdSelection ? preExecutionNotice(psdSelection.summary) : null),
  )
  // 批量模式：多语言表一次执行全部语言（引擎任务包原生支持按语言分组）
  // 2026-10-16 实验收口：实验编排逐 PSD 会对账并让执行卡卸载重挂载，组件内 state 会被重置
  // （实测「全部语言」被吞回「仅当前语言」，批量链永远进不去）——选择需跨重挂载保留，读初值走 localStorage。
  // 写入侧由 updateRunAllLanguages 门控在 batchMode（#batch 视图），避免影响正式路径的默认值。
  const [runAllLanguages, setRunAllLanguages] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('tygf.workbench.runAllLanguages') === '1'
    } catch {
      return false
    }
  })
  const updateRunAllLanguages = (value: boolean) => {
    setRunAllLanguages(value)
    if (!batchMode) return
    try {
      window.localStorage.setItem('tygf.workbench.runAllLanguages', value ? '1' : '0')
    } catch {
      // 持久化失败不影响本次选择
    }
  }
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState(() => ({ ...EMPTY_FEEDBACK_STUDIO_RESPONSE }))
  // V1.5 信任链执行开关（运营台 feature flags）；单语言与批量共用同一安全链，禁止经典链回退。
  const featureFlags = useFeatureFlags()
  const [serverExecutionEnabled, setServerExecutionEnabled] = useState<boolean | null>(null)
  const v15ExecutionEnabled =
    featureFlags.workbenchV15ExecutionEnabled === true &&
    serverExecutionEnabled === true
  const [batchCapability, setBatchCapability] = useState<BatchExecutionCapability | null>(null)
  // 产品入口与单次执行就绪分离：客户端不决定权限，只有启动前的
  // execution-ready 闸门会阻止不安全的本次批量执行。
  const batchExecutionReady =
    v15ExecutionEnabled &&
    featureFlags.batchBillingV3Enabled === true &&
    batchCapability?.enabled === true
  // 连续执行（V1.5）：一次确认后逐语言自动跑完全部语言；PS 常驻不关。
  const generationRef = useRef(0)
  // 同步提交锁：React state 异步更新挡不住连点，双击必须只产生一次提交
  const submittingRef = useRef(false)
  // L1 质量门：同一 scanId 的排版学习样本只在执行成功后上报一次
  const typographyUploadedScanRef = useRef<string | null>(null)
  // P1-2：学习信号按任务只上报一次（attempt 落库后 runId 归属成立）。
  const learningFlushRef = useRef<string | null>(null)
  // E2：记录批次系统终止时的真实原因码（v3-batch-flow 只回传 BATCH_ABORTED_SYSTEMIC）。
  const v3AbortCodeRef = useRef<string | null>(null)
  // 内存闸（2026-10-20）：助手那句带实测 MB 的中文说明要留到批次收口后再呈现，
  // 因为批次级文案只会吐原因码，不讲「还剩多少内存、该怎么办」。
  const v3AbortMessageRef = useRef<string | null>(null)
  // E2b：本次批次的忙碌重试统计（失败事件富字段；派发尝试次数含初始一次）。
  const busyRetryInfoRef = useRef({ attempts: 0, waitedMs: 0 })
  // 实验模式（2026-10-16）：本格 V15 完成回执 Promise——单语言链受理后不阻塞返回（fire-and-forget），
  // runExecution 收尾要靠它等真实完成再推进；null＝本格未走单语言 V15 链（如批量链，内部已等完成）。
  const activeV15CompletionRef = useRef<ReturnType<typeof waitForV15Completion> | null>(null)
  // W 补丁（2026-10-12，纯展示层）：逐语言失败事实留存，只供「本次未产出」报告展示。
  // 只写不断言——不参与任何执行、授权、计费、回执分支；唯一读取点是下面报告组装处。
  const languageFailureFactsRef = useRef(
    new Map<string, { code: string | null; attemptId: string | null }>(),
  )
  // W 补丁：零产出批次的可下载报告（落在浏览器下载目录，不是交付目录）。
  const [unproducedReport, setUnproducedReport] = useState<{
    html: string
    fileName: string
    outputDirectory: string
  } | null>(null)
  // 当前已受理任务（用于失败后立即退回积分，对抗式审查修复）
  const [lastOperationId, setLastOperationId] = useState<string | null>(null)
  const [lastJobId, setLastJobId] = useState<string | null>(null)
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null)
  const [lastBatchId, setLastBatchId] = useState<string | null>(null)
  // 服务端尚未确认结算时保持工作台锁定；未知状态不能被“重试”伪装成新任务。
  const [unsettledExecution, setUnsettledExecution] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [retryingReport, setRetryingReport] = useState(false)
  const [refundNotice, setRefundNotice] = useState<string | null>(null)
  // V1.1-F1:同一提示框先后承载成功/失败/锁定三种语义,绿色报失败会被读成成功——按内容配色。
  const [refundNoticeTone, setRefundNoticeTone] = useState<'success' | 'warning' | 'error'>('success')

  // 恢复（H1）：刷新后若存在未完成执行，恢复 submitted 态并重挂回执轮询
  useEffect(() => {
    const recovery = loadExecutionRecovery()
    const allowedLanguages = selectedLanguages?.length
      ? selectedLanguages
      : parsed.languageColumns
    if (!recovery || (recovery.targetLanguage !== targetLanguage && !allowedLanguages.includes(recovery.targetLanguage))) return
    generationRef.current = recovery.generation
    setLastOperationId(recovery.operationId)
    setLastBatchId(recovery.batchId ?? null)
    if (!recovery.attemptId) {
      if (recovery.jobId) {
        setLastJobId(recovery.jobId)
        setUnsettledExecution(true)
        onExecutionAuthorized(true)
        transitionExecState('execution_failed')
        // 恢复锁回查服务端终态：挂死 job 若已被收口（released/settled），解锁工作台，
        // 不再把已了结的结算当成"未确认"永久锁死重置/返回/退分（对抗式审查 #2）。
        // 回查失败＝维持锁定（fail-closed），刷新页面会再次回查。
        void (async () => {
          try {
            const res = await fetch(
              `/api/billing/photoshop/jobs/${encodeURIComponent(recovery.jobId!)}/status`,
              { headers: workbenchAuthHeaders(), signal: AbortSignal.timeout(15000) },
            )
            const data = (await res.json().catch(() => null)) as
              | { ok?: boolean; job?: { status?: string; settlement?: { finalStatus?: string } } }
              | null
            if (generationRef.current !== recovery.generation) return
            const finalStatus = data?.job?.settlement?.finalStatus
            if (res.ok && data?.ok === true && (finalStatus === 'released' || finalStatus === 'settled')) {
              clearExecutionRecovery()
              setUnsettledExecution(false)
              onExecutionAuthorized(false)
              transitionExecState('idle')
              setPreparationNotice(
                finalStatus === 'released'
                  ? t('检测到上次任务已结束：未执行部分的积分已自动退回，本次不会重复执行或重复计费。')
                  : t('检测到上次任务已按完成结算，本次不会重复执行或重复计费。'),
              )
            }
          } catch {
            // 网络失败保持现状；下一次进入工作台时会再次回查。
          }
        })()
      }
      setPreparationNotice(
        recovery.phase === 'between'
          ? t('批量任务已完成 {value0} / {value1} 种语言；再次开始会从下一种语言继续。', { value0: String(recovery.completedLanguages?.length ?? 0), value1: String(recovery.batchLanguages?.length ?? 0) })
          : t('检测到上次提交在取得受理回执前中断；再次开始时会以同一操作号安全重试，不会重复创建任务。'),
      )
      return
    }
    const resumeAcceptedAttempt = () => {
      // 恢复状态不持久化本机绝对输出路径；等本地助手终态回执返回真实 finalPath。
      setOutputLocation(null)
      if (recovery.jobId) setLastJobId(recovery.jobId)
      setUnsettledExecution(true)
      setLastAttemptId(recovery.attemptId)
      setLocalReportStatus(v15ExecutionEnabled ? 'pending' : 'unknown')
      transitionExecState('execution_submitted')
      setPreparationNotice(
        t('检测到之前有执行仍在进行（attempt {value0}），正在重新等待本机完成回执…', { value0: String(recovery.attemptId!.slice(0, 8)) }),
      )
      onExecutionAuthorized(true)
      void waitForV15Completion(recovery.attemptId!).then((completion) => {
        if (generationRef.current !== recovery.generation) return
        if (completion === null) {
          setPreparationNotice(
            t('执行已提交；较长时间未观察到本机完成回执，请查看本地助手窗口与源 PSD 所在目录。'),
          )
          transitionExecState('execution_failed')
        } else if (!completion.success) {
          const unresolved = [
            'ASSISTANT_DISCONNECTED_DURING_EXECUTION',
            'ATTEMPT_STATUS_NOT_FOUND',
            'PHOTOSHOP_HEARTBEAT_STALE',
          ].includes(completion.errorCode ?? '')
          if (recovery.batchLanguages?.length && !unresolved) {
            saveExecutionRecovery({ ...recovery, attemptId: null, phase: 'between', currentMatchedCount: 0 })
          } else if (!recovery.batchLanguages?.length && !unresolved) {
            clearExecutionRecovery()
          }
          const detail = completion.errorCode
            ? (V15_ERROR_CODE_ZH[completion.errorCode] ?? fallbackErrorDetail(completion.errorCode))
            : t('详情请查看本地助手窗口。')
          // 账务一句只按助手回传的 settlement 真值说，不替云端承诺未发生的退款（FG-RECEIPT-STALE）。
          const creditLine = completion.settlement?.finalStatus === 'released'
            ? t('本批未收到回执的部分不计费，预留积分已整笔退回。')
            : ''
          // 回执缺件一族：本机做完了，断的是回执，不得写成"Photoshop 阶段未成功"。
          setErrorMsg(isReceiptMissingErrorCode(completion.errorCode)
            ? t('本机执行已完成，云端未收到回执：{detail}{creditLine}', { detail: String(detail), creditLine: String(creditLine) })
            : t('V1.5 执行在 Photoshop 阶段未成功：{detail}', { detail: String(detail) }))
          if (unresolved) {
            setPreparationNotice(t('原批次仍保留，当前不会重新报价、冻结或执行；请先恢复本地助手并核对原任务状态。'))
          }
          if (completion.settlement?.ok === true && ['released', 'settled'].includes(completion.settlement.finalStatus ?? '')) {
            setUnsettledExecution(false)
            onExecutionAuthorized(false)
          }
          transitionExecState('execution_failed')
        } else {
          const reportFailed = v15ExecutionEnabled && completion.reportStatus !== 'GENERATED'
          setLocalReportStatus(v15ExecutionEnabled ? (reportFailed ? 'failed' : 'generated') : 'unknown')
          if (completion.finalPath) {
            setOutputLocation(outputLocationFromFinalPath(completion.finalPath))
          }
          if (recovery.batchLanguages?.length) {
            const activeLanguage = recoverableBatchAttemptLanguage(recovery)
            if (!activeLanguage) {
              setPreparationNotice(t('本机回执已成功，但恢复记录无法安全确定它对应的语言；原 attempt 与批次已保留，当前不会继续执行或重复计费，请先核对批次状态。'))
              transitionExecState('execution_failed')
              return
            }
            const completedLanguages = [...new Set([...(recovery.completedLanguages ?? []), activeLanguage])]
            const completedMatchedCount = (recovery.completedMatchedCount ?? 0) + (recovery.currentMatchedCount ?? 0)
            saveExecutionRecovery({ ...recovery, attemptId: null, phase: 'between', completedLanguages, completedMatchedCount, currentMatchedCount: 0 })
            setPreparationNotice(t('已恢复完成 {length} / {length_1} 种语言；点击开始后继续剩余语言。', { length: String(completedLanguages.length), length_1: String(recovery.batchLanguages.length) }))
            transitionExecState('idle')
            setUnsettledExecution(false)
            onExecutionAuthorized(false)
          } else {
            clearExecutionRecovery()
            setPreparationNotice(
              reportFailed
                ? t('设计文件已生成，但 {localAssistantReportFileName} 未通过助手确认；请检查输出目录，必要时只重建报告，不要重复执行 Photoshop。', { localAssistantReportFileName: String(localAssistantReportFileName) })
                : null,
            )
            transitionExecState('execution_completed')
            if (completion.settlement?.ok === true && ['released', 'settled'].includes(completion.settlement.finalStatus ?? '')) {
              setUnsettledExecution(false)
              onExecutionAuthorized(false)
            }
          }
        }
      })
    }

    // 批次恢复必须先看服务端终态；已释放/结算的旧批次不能再被当成 V1.5 单任务无限等待。
    if (recovery.batchId && recovery.batchLanguages?.length) {
      void getBatchStatus({ batchId: recovery.batchId })
        .then(({ batch }) => {
          if (['SETTLED', 'RELEASED', 'EXPIRED', 'STALLED', 'MANUAL_REVIEW'].includes(batch.status)) {
            clearExecutionRecovery()
            setPreparationNotice(t('上次批量任务已结束（{status}），本次不会重复执行或重复计费。', { status: String(batch.status) }))
            transitionExecState('idle')
            onExecutionAuthorized(false)
            return
          }
          resumeAcceptedAttempt()
        })
        .catch(() => {
          // 服务端状态暂不可达时保留原恢复态，避免把未完成批次误清掉。
          resumeAcceptedAttempt()
        })
      return
    }
    resumeAcceptedAttempt()
  }, [])


  // 实时构建审查行（与审查步骤共享同算法）
  const reviewRows: ReviewRow[] = useMemo(() => {
    const rowsForReview = parsed.rows.map((r, idx) => {
      const edited = editedTranslations[idx + 1]
      const translations: Record<string, string> = { ...r.translations }
      if (edited !== undefined) {
        translations[targetLanguage] = edited
      }
      return { source: r.source, translations }
    })
    return buildReview({ rows: rowsForReview, targetLanguage }).rows
  }, [parsed.rows, editedTranslations, targetLanguage])

  const allLanguages = selectedLanguages?.length
    ? selectedLanguages
    : parsed.languageColumns
  const stableRowIds = useMemo(() => stableTranslationRowIds(parsed), [parsed])
  const isMultiLang = allLanguages.length > 1
  // v7：多稿编排下每一稿都是一次独立批次（1 稿 × 该稿语言），即使该稿只有 1 个语言
  // 也不能退回单语言链——否则批次链的完成回调不触发，逐稿编排会在第一稿停死。
  const isMultiDraft = batchMode === true && (multiPsdSelection?.entries.length ?? 0) > 0
  const useBatchChain = isMultiDraft || (isMultiLang && runAllLanguages)

  // 批量能力检查：多语言单稿与多稿编排都要走批次链，必须同样取能力门。
  const needsBatchCapability = isMultiLang || isMultiDraft
  useEffect(() => {
    let alive = true
    setServerExecutionEnabled(null)
    if (needsBatchCapability) setBatchCapability(null)
    void fetchBatchExecutionCapability()
      .then((capability) => {
        if (!alive) return
        setServerExecutionEnabled(capability.executionEnabled === true)
        if (needsBatchCapability) setBatchCapability(capability)
      })
      .catch(() => {
        if (alive) {
          setServerExecutionEnabled(false)
          if (needsBatchCapability) {
            setBatchCapability({
              executionEnabled: false,
              enabled: false,
              mode: 'disabled',
              reasonCode: 'EXECUTION_DISABLED',
              message: t('当前测试环境仅开放 Web 功能，真实执行暂未开放。'),
              nextAction: t('Batch-1 仅开放 Web 流程；完成后续执行回归并进入下一批次后再开启。'),
              assistant: null,
            })
          }
        }
      })
    return () => {
      alive = false
    }
  }, [needsBatchCapability])

  // 批量模式的每语言汇总（行数/空译文），供执行前确认
  const batchSummary = useMemo(() => {
    if (!isMultiLang) return []
    return allLanguages.map((lang) => {
      let empty = 0
      for (let i = 0; i < parsed.rows.length; i++) {
        const value =
          editedTranslationsByLanguage[lang]?.[i + 1] ??
          parsed.rows[i].translations[lang] ??
          ''
        if (!value.trim()) empty += 1
      }
      return { lang, rowCount: parsed.rows.length, empty }
    })
  }, [isMultiLang, allLanguages, parsed.rows, editedTranslationsByLanguage])

  // 单语链（v2）的可执行行作用域：用户忽略的行 ∪ 任务准备台判定"设计稿里没有对应对象"
  // 的行都不会发生替换，因此既不进报价、也要作为跳过清单下发给助手。
  // 判据与批量链（v3 的 scopeStatus）同源；批量预览投影仍走 billing-preview.ts。
  const singleRunScope = useMemo(() => {
    const ignored = new Set(ignoredTranslationRowIds ?? [])
    const unmatched = new Set(unmatchedTranslationRowIds ?? [])
    const excludedRows: BillingScopeRow[] = []
    for (let index = 0; index < parsed.rows.length; index += 1) {
      const rowId = stableRowIds[index]
      if (!rowId) continue
      // 同一行既被忽略又无对象时，记 UNMATCHED 才是实情（不是用户主动不要）。
      if (unmatched.has(rowId)) excludedRows.push({ rowIndex: index + 1, reason: 'UNMATCHED' })
      else if (ignored.has(rowId)) excludedRows.push({ rowIndex: index + 1, reason: 'IGNORED' })
    }
    const scope: BillingScope = {
      version: BILLING_SCOPE_VERSION,
      language: targetLanguage,
      excludedRows,
    }
    return { scope, excludedRowIndexSet: excludedRowIndexSet(scope) }
  }, [
    parsed.rows,
    stableRowIds,
    targetLanguage,
    ignoredTranslationRowIds,
    unmatchedTranslationRowIds,
  ])

  // #85（2026-09-20）：预览必须用真实行作用域。此前这里把**每一行**都标成 INCLUDED 且
  // requiredObjectCount 硬编码 1 ⇒ 表里多出的行、被「忽略这行」的行都进了预览，
  // 而助手 evidence 会把它们判 EXCLUDED ⇒ 预览与冻结额分叉（虚高）。投影逻辑提到
  // lib/workbench/billing-preview.ts 单一来源，并由 smoke-billing-preview-parity 与
  // 助手侧 buildBillingEvidenceRows 逐语言对账。
  const batchBillingPreview = useMemo(() => computeBatchLanguageBilling({
    languageCodes: allLanguages,
    rows: buildBillingPreviewRows({
      parsed,
      stableRowIds,
      ignoredTranslationRowIds,
      unmatchedTranslationRowIds,
      allLanguages,
      editedTranslationsByLanguage,
    }),
  }), [allLanguages, parsed, stableRowIds, ignoredTranslationRowIds, unmatchedTranslationRowIds, editedTranslationsByLanguage])

  // BILL-ROW-DERIVE-1：逐行推导（纯展示）。数字全部来自共享公式（服务端报价同入口），
  // 本组件不新增算术；展示口径见 src/lib/workbench/billing/row-derivation.ts。
  const rowDerivation = useMemo(() => buildRowDerivation({
    parsed,
    stableRowIds,
    ignoredTranslationRowIds,
    unmatchedTranslationRowIds,
    allLanguages,
    editedTranslationsByLanguage,
  }), [allLanguages, parsed, stableRowIds, ignoredTranslationRowIds, unmatchedTranslationRowIds, editedTranslationsByLanguage])

  const derivationReasonCopy: Record<RowDerivationReason, string> = {
    IGNORED: t('你忽略了这行'),
    UNMATCHED: t('设计稿里找不到对应文字'),
    SOURCE_EMPTY: t('原文为空'),
    TARGET_EMPTY: t('译文为空'),
  }
  const derivationSingleLanguage = allLanguages.length === 1
  const derivationFormat = (record: Record<string, number>): string => {
    if (derivationSingleLanguage) return String(record[allLanguages[0] ?? ''] ?? 0)
    return allLanguages.map((languageCode) => `${formatLanguageCode(languageCode)} ${record[languageCode] ?? 0}`).join(' · ')
  }

  // 按钮旁「弱感知」积分预估（定价文档：不在执行前弹窗，只在按钮附近显示积分数字）。
  // 纯客户端估算，权威值仍由服务端 quote 决定；批量模式按各语言行汇总。
  // 超出单批计价上限时计价函数按合同抛错——这里降级为 null（界面如实说"无预估"），不得让工作台白屏（#222）。
  const estimatedCredits = useMemo<number | null>(() => {
    try {
      if (useBatchChain) {
        return quoteCreditsForBatch(batchBillingPreview.totalStandardUnits)
      }
      const billingRows = reviewRows.map((r) => ({
          sourceText: r.sourceText,
          translatedText: r.translatedText ?? '',
          // 与服务端报价同判据：不替换的行不参与估算，否则界面显示的价格虚高。
          ignored: singleRunScope.excludedRowIndexSet.has(r.rowIndex),
        }))
      return estimateBilling(billingRows).photoshopExecutionCredits
    } catch {
      return null
    }
  }, [useBatchChain, batchBillingPreview, reviewRows, singleRunScope])

  // 预估取不到＝这批不该提交（#222 的降级点：以前只把数字降级成「无预估」却仍允许点执行，
  // 用户点完拿到一个「请重试」的 500——那是 FA-3）。单批标准单位上限已撤，此处只兜"行数据异常"。
  const unitCapBlocked = estimatedCredits === null
  const unitCapHint = t('这批的计费预估取不到（行数据异常），请重新预览或重新扫描后再执行。')

  /** 批量模式：组装全部语言的替换行（当前语言应用手工编辑，空译文行跳过=保留原文） */
  const buildRowsByLang = () => {
    const rowsByLang: Record<
      string,
      { source: string; translation: string; type: string }[]
    > = {}
    for (const lang of allLanguages) {
      rowsByLang[lang] = parsed.rows.map((r, idx) => ({
        source: r.source,
        translation:
          editedTranslationsByLanguage[lang]?.[idx + 1] ??
          r.translations[lang] ??
          '',
        type: 'text',
      }))
    }
    return rowsByLang
  }

  /** 语言维度的确认绑定选择：按语言映射存在时只取本语言（缺失即空），否则回落旧扁平列表。 */
  const forcedBindingsForLanguage = (language: string) => {
    if (forcedBindingsByLanguage) return forcedBindingsByLanguage[language] ?? []
    return forcedBindings ?? []
  }

  /** 规范化按语言绑定映射：用于证据/执行载荷与 scopeDecisionDigest（v2，语言维度）。 */
  const normalizedForcedBindingsByLanguage = (languages: string[]) =>
    Object.fromEntries(
      languages.map((language) => [
        language,
        forcedBindingsForLanguage(language).map((binding) => ({
          ledgerEntryId: binding.ledgerEntryId,
          target: binding.target,
          fragmentRowIds: [...(binding.fragmentRowIds ?? [])],
        })),
      ]),
    )

  /** P0 语言串写修复：范围决策摘要升级为语言维度（v2）。
   *  同一提交内 challenge/evidence/quote 三处必须使用同一算法。 */
  const buildScopeDecisionDigest = (languages: string[]) =>
    digestWorkbenchValue({
      scopeDecisionVersion: 2,
      excludedLayerObjectIds: [...(excludedLayerObjectIds ?? [])].sort(),
      ignoredTranslationRowIds: [...(ignoredTranslationRowIds ?? [])].sort(),
      forcedBindingsByLanguage: Object.fromEntries(
        [...languages]
          .sort((left, right) => left.localeCompare(right))
          .map((language) => [
            language,
            forcedBindingsForLanguage(language)
              .map((binding) => ({
                ledgerEntryId: binding.ledgerEntryId,
                target: binding.target,
                fragmentRowIds: [...(binding.fragmentRowIds ?? [])].sort(),
              }))
              .sort((left, right) => left.ledgerEntryId.localeCompare(right.ledgerEntryId)),
          ]),
      ),
    })

  const runLocalAssistantExecution = async () => {
    const startedAt = new Date().toISOString()

    // V1.5：预扫描过期则先自动刷新（失败不阻断——正式检查由执行链单独完成）
    if (
      psdSelection?.masterPath &&
      preparationFreshness(psdSelection.summary) === 'stale'
    ) {
      setPreparationNotice(t('预扫描已超过 24 小时，正在刷新只读信息…'))
      try {
        const refreshed = await startPreparationScan(psdSelection.masterPath)
        if (
          refreshed.state === 'prepared' ||
          refreshed.state === 'needs_review'
        ) {
          onPsdSelectionChange({
            masterPath: psdSelection.masterPath,
            state: refreshed.state,
            scanId: refreshed.scanId,
            summary: refreshed.summary,
            updatedAt: new Date().toISOString(),
          })
          setPreparationNotice(null)
        } else {
          setPreparationNotice(
            t('预扫描刷新未完成（不阻断执行，正式检查仍会单独完成）。'),
          )
        }
      } catch {
        setPreparationNotice(
          t('预扫描刷新失败（不阻断执行，正式检查仍会单独完成）。'),
        )
      }
    }

    // T-0117 P1（命名修复）：输出名以「源 PSD 文件名」为准。psState.documentName 来自助手 ping
    // 的任务目录显示名（有 taskRoot 时恒为"本地任务目录"，见 local-assistant-client.ts:374），
    // 不能作输出基准，否则交付文件恒被命名成"本地任务目录__<语言>"。
    // 回退顺序：源 PSD 文件名 → 打开文档名 → PSD。
    const sourceBaseName = basenameOnly(psdSelection?.masterPath || '').replace(/\.(psd|psb)$/i, '')
    const docBase = safeOutputName(
      sourceBaseName ||
        (psState.documentName || 'PSD').replace(/\.(psd|psb)$/i, ''),
    )
    const preferredOutputBaseName = resolveOutputBaseName(customOutputName, docBase || 'TYGF_OUTPUT')
    const projectLabelSnapshot = (
      customOutputName.trim().replace(/\.(psd|psb)$/i, '') ||
      basenameOnly(psdSelection?.masterPath || psState.documentName || t('新项目'))
        .replace(/\.(psd|psb)$/i, '')
    ).slice(0, 120)

    // v0.1.1 确认快照：保存确认后的替换表文本 + 审查决策事件（失败不阻断执行）。
    // manifestHash 是 v0.2.0 新鲜度门与票据绑定的地基。
    const snapshotRows = useBatchChain
      ? Object.entries(buildRowsByLang()).flatMap(([lang, rows]) =>
          rows.map((row, idx) => ({
            language: lang,
            rowIndex: idx + 1,
            source: row.source,
            target: row.translation,
          })),
        )
      : reviewRows.map((row) => ({
          language: targetLanguage,
          rowIndex: row.rowIndex,
          source: row.sourceText,
          target: row.translatedText ?? '',
        }))
    const snapshotLanguages = useBatchChain ? allLanguages : [targetLanguage]
    // 事故2修复：行数超限必须显式停止（旧路由静默截断 → 快照语言集缺失 → 证据门 6 连拒）。
    if (snapshotRows.length > REVIEW_SNAPSHOT_MAX_ROWS) {
      throw new LocalAssistantRequestError(
        t('本次确认内容共 {length} 行，超过单次上限 {REVIEW_SNAPSHOT_MAX_ROWS} 行，任务已停止，不会冻结积分。请减少语言或行数后重试。', { length: String(snapshotRows.length), REVIEW_SNAPSHOT_MAX_ROWS: String(REVIEW_SNAPSHOT_MAX_ROWS) }),
        'REVIEW_SNAPSHOT_ROWS_EXCEEDED',
      )
    }
    const snapshot = await saveReviewSnapshot({
      targetLanguage,
      rows: snapshotRows,
      decisionsByLanguage: Object.fromEntries(
        snapshotLanguages.map((language) => [
          language,
          reviewDecisionsByLanguage?.[language] ?? [],
        ]),
      ),
      projectId,
      projectLabelSnapshot,
    })
    if (!snapshot) {
      throw new Error(t('本次确认内容未能保存，任务已停止。请重新确认后重试。'))
    }
    // 事故2修复：服务端冻结语言集必须覆盖全部执行语言，否则在报价/冻结之前停止。
    const uncoveredLanguages = uncoveredSnapshotLanguages(snapshot.languages, snapshotLanguages)
    if (uncoveredLanguages.length > 0) {
      throw new LocalAssistantRequestError(
        t('以下语言的确认内容未成功保存：{value0}。任务已停止，不会冻结积分。请刷新页面，重新确认这些语言后再试。', { value0: String(uncoveredLanguages.join(t('、'))) }),
        'REVIEW_SNAPSHOT_LANGUAGE_COVERAGE',
      )
    }

    if (!v15ExecutionEnabled) {
      throw new LocalAssistantRequestError(
        t('安全执行链当前未启用，本次任务已停止；不会降级到旧替换链。'),
        'V15_EXECUTION_REQUIRED',
      )
    }

    // 批量执行门控未通过时明确阻断：不调用旧逐语言重复计费链，不静默降级。
    if (useBatchChain && !batchExecutionReady) {
      throw new LocalAssistantRequestError(
        t('{value0} {value1} 不会降级到旧逐语言重复计费链。', { value0: String(batchCapability?.message ?? t('批量执行能力检查未通过。')), value1: String(batchCapability?.nextAction ?? t('请检查本地门控状态。')) }),
        'BATCH_BILLING_V3_REQUIRED',
      )
    }

    // 批量报价/挑战/冻结前先确认本机授权已绑定当前内测资格。
    // 旧 token 只在这里做一次无计费迁移，避免冻结后才发现授权门拒绝。
    if (useBatchChain) await ensureAssistantBinding()

    const executionLanguages = useBatchChain ? allLanguages : [targetLanguage]
    if (useBatchChain) {
      // 批次计费 v3 主链（调整方案 Phase 3 §8.2/8.4）：
      // 一次 quote → 一次 confirm → 每语言 attempt → 本地助手执行 → 一次 finish。
      // 浏览器只转发本地助手生成的证据封包；刷新后从 v3 草稿恢复同一批次。
      if (!psdSelection?.scanId || !psdSelection?.masterPath) {
        throw new Error(t('V1.5 信任链执行需要先完成 Step 1 的 PSD 预扫描。'))
      }
      const {
        issueBillingChallenge,
        quoteBatch,
        confirmBatch,
        createLanguageAttempt,
        requestFinishBatch,
      } = await import('@/lib/workbench/batch-execution-client')
      const { runV3BatchFlow } = await import('@/lib/workbench/v3-batch-flow')
      const recovery = loadExecutionRecovery()
      const operationId = recovery?.operationId ?? crypto.randomUUID()
      setLastOperationId(operationId)
      const rowsByLanguage = buildRowsByLang()
      // 批次闭环方案 §3.2 逻辑行合同：同一源对象只生成一个与语言无关的 rowToken，
      // targetCharactersByLanguage 必须含本批次各语言真实目标字符数。
      // 计费字符数 = max(sourceCharacters, 最长目标字符数)——由服务端权威计算。
      const logicalRowMap = new Map<string, {
        rowId: string
        rowToken: string
        source: string
        translationByLang: Record<string, string>
        sourceCharacters: number
        targetCharactersByLanguage: Record<string, number>
        requiredObjectCount: number
        scopeStatus: 'INCLUDED'
        billableLanguages: Record<string, boolean>
      }>()
      for (const locale of executionLanguages) {
        const langRows = rowsByLanguage[locale] ?? []
        for (let index = 0; index < langRows.length; index += 1) {
          const row = langRows[index]
          const rowId = stableRowIds[index] ?? `row:${index + 1}`
          const existing = logicalRowMap.get(rowId)
          if (existing) {
            existing.translationByLang[locale] = row.translation
            existing.targetCharactersByLanguage[locale] = row.translation.length
          } else {
            const tokenInput = new TextEncoder().encode(
              `tygf-batch-row-v1\0${snapshot.snapshotId}\0${rowId}\0${index + 1}`,
            )
            const tokenDigest = await crypto.subtle.digest('SHA-256', tokenInput)
            const rowToken = `rt_${Array.from(new Uint8Array(tokenDigest), (b) => b.toString(16).padStart(2, '0')).join('')}`
            logicalRowMap.set(rowId, {
              rowId,
              rowToken,
              source: row.source,
              translationByLang: { [locale]: row.translation },
              sourceCharacters: row.source.length,
              targetCharactersByLanguage: { [locale]: row.translation.length },
              requiredObjectCount: 1,
              scopeStatus: 'INCLUDED' as const,
              billableLanguages: {},
            })
          }
        }
      }
      // 完成率一致性方案 P1：唯一可执行集合投影。报价 rows、助手 evidence、
      // 执行 payload 一律以 billableRows 为准，禁止各层再用 target/source 过滤。
      const { billableRows, excludedRows } = buildBatchExecutableRows({
        rows: [...logicalRowMap.values()],
        languages: executionLanguages,
        ignoredRowIds: ignoredTranslationRowIds ?? [],
      })
      if (billableRows.length === 0) {
        throw new LocalAssistantRequestError(
          t('没有可执行的数据行：全部行都因空原文、用户忽略或未翻译被排除，本次未发起计费。'),
          'BATCH_NO_EXECUTABLE_ROWS',
        )
      }
      // 批次共享输出目录：用户未另存时，整批合并到「源目录/<名>_ALL_<N>LANG__时间戳」，
      // 避免每语言各建一个时间戳文件夹（用户可见的产物聚合诉求）。
      const batchSharedOutputDirectory = (() => {
        if (customOutputDirectory) return customOutputDirectory
        const sourceDirectory = psdSelection.masterPath.replace(/[\\/][^\\/]+$/, '')
        const sourceBase = safeOutputName(
          basenameOnly(psdSelection.masterPath).replace(/\.(psd|psb)$/i, ''),
        ) || 'TYGF_OUTPUT'
        const now = new Date()
        const pad2 = (n: number) => String(n).padStart(2, '0')
        const timeSuffix = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
        return `${sourceDirectory}\\${sourceBase}_ALL_${executionLanguages.length}LANG__${timeSuffix}`
      })()
      // 批次闭环方案 §3.2：逻辑行 = 每个源对象一行（不按语言展开），
      // targetCharactersByLanguage 含各语言真实目标字符数，服务端按最长目标权威计费。
      // 计费对齐（v3-batch-flow BREAKDOWN_MISMATCH 修复）：任务准备台判定"无对应
      // 对象"的行必须与本端计费投影同样排除——3.6.15+ 助手 evidence 按真实绑定
      // 排除这些行，浏览器不同步排除会导致报价明细对不上（24 vs 22 行分叉）。
      const unmatchedRowIdSet = new Set(unmatchedTranslationRowIds ?? [])
      const allRows = billableRows.map((lr) => {
        const unbound = unmatchedRowIdSet.has(lr.rowId)
        return {
          rowToken: lr.rowToken,
          sourceCharacters: lr.sourceCharacters,
          targetCharactersByLanguage: lr.targetCharactersByLanguage,
          requiredObjectCount: unbound ? 0 : lr.requiredObjectCount,
          scopeStatus: unbound ? ('EXCLUDED' as const) : ('INCLUDED' as const),
          billableLanguages: lr.billableLanguages,
        }
      })
      // 译文摘要合同 §3.2：逐语言真实 SHA256（WebCrypto），禁止占位值
      const translationDigests: Record<string, string> = {}
      for (const locale of executionLanguages) {
        const digestInput = billableRows
          .map((lr) => `${lr.rowToken}:${lr.translationByLang[locale] ?? ''}`)
          .join('\n')
        const digestBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(digestInput))
        translationDigests[locale] =
          Array.from(new Uint8Array(digestBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')
      }
      const langSetInput = executionLanguages.slice().sort().map((l) => `${l}:${translationDigests[l] ?? ''}`).join('\n')
      const langSetBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(langSetInput))
      const languageSetDigest =
        Array.from(new Uint8Array(langSetBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')
      let authoritativeBindingPlanDigest = digestWorkbenchValue({ reviewSnapshotId: snapshot.snapshotId, rowIds: stableRowIds })
      const batchEvidenceParams = (challengeId?: string, nonce?: string, prepareOnly = false) => ({
        challengeId,
        nonce,
        prepareOnly,
        installId: readWorkbenchActivation()?.anonymousInstallId ?? '',
        scanId: psdSelection.scanId as string,
        masterPath: psdSelection.masterPath,
        languageCode: executionLanguages[0],
        translations: billableRows.filter((lr) => lr.billableLanguages[executionLanguages[0]]).map((lr) => ({
          source: lr.source,
          target: lr.translationByLang[executionLanguages[0]] ?? '',
          rowToken: lr.rowToken,
          rowId: lr.rowId,
        })),
        translationsByLanguage: Object.fromEntries(executionLanguages.map((locale) => [
          locale,
          billableRows.filter((lr) => lr.billableLanguages[locale]).map((lr) => ({
            source: lr.source,
            target: lr.translationByLang[locale] ?? '',
            rowToken: lr.rowToken,
            rowId: lr.rowId,
          })),
        ])),
        documentFingerprint: snapshot.manifestHash,
        reviewSnapshotId: snapshot.snapshotId,
        translationSetDigest: languageSetDigest,
        scopeDecisionDigest: buildScopeDecisionDigest(executionLanguages),
        languageSetDigest,
        bindingPlanDigest: authoritativeBindingPlanDigest,
        excludedLayerObjectIds: excludedLayerObjectIds ?? [],
        ignoredTranslationRowIds: ignoredTranslationRowIds ?? [],
        // 语言维度权威（新助手逐语言编译）；扁平字段仅为旧助手兼容（=首语言绑定，旧行为）。
        forcedBindingsByLanguage: normalizedForcedBindingsByLanguage(executionLanguages),
        forcedBindings: forcedBindingsForLanguage(executionLanguages[0]),
      })
      const v3Plan = {
        principalId: '',
        projectId: projectId.trim(),
        runId: operationId,
        projectLabelSnapshot,
        reviewSnapshotId: snapshot.snapshotId,
        documentFingerprint: snapshot.manifestHash,
        translationSetDigest: languageSetDigest,
        scopeDecisionDigest: buildScopeDecisionDigest(executionLanguages),
        languageSetDigest: languageSetDigest,
        bindingPlanDigest: authoritativeBindingPlanDigest,
        translationDigests,
        languageCodes: executionLanguages,
        rows: allRows,
      }
      busyRetryInfoRef.current = { attempts: 0, waitedMs: 0 }
      v3AbortCodeRef.current = null
      v3AbortMessageRef.current = null
      languageFailureFactsRef.current = new Map()
      setEvidenceFailures(null)
      const v3Result = await runV3BatchFlow(v3Plan, {
        issueChallenge: async () => {
          const prepared = await prepareBatchBindingPlanDirect(batchEvidenceParams(undefined, undefined, true))
          if (prepared.failedLanguages.length > 0) {
            setEvidenceFailures(prepared.failedLanguages)
            throw new EvidenceLanguageFailureError(prepared.failedLanguages)
          }
          authoritativeBindingPlanDigest = prepared.bindingPlanDigest
          v3Plan.bindingPlanDigest = authoritativeBindingPlanDigest
          return issueBillingChallenge({
            reviewSnapshotId: snapshot.snapshotId,
            documentFingerprint: snapshot.manifestHash,
            translationSetDigest: languageSetDigest,
            scopeDecisionDigest: buildScopeDecisionDigest(executionLanguages),
            languageSetDigest: languageSetDigest,
            bindingPlanDigest: authoritativeBindingPlanDigest,
          })
        },
        prepareEvidence: async ({ plan, challengeId, nonce }) => {
          const evidence = await prepareBatchEvidenceDirect({
            ...batchEvidenceParams(challengeId, nonce),
            bindingPlanDigest: plan.bindingPlanDigest,
          })
          if (evidence.failedLanguages.length > 0) {
            setEvidenceFailures(evidence.failedLanguages)
            throw new EvidenceLanguageFailureError(evidence.failedLanguages)
          }
          return evidence
        },
        quote: ({ challengeId, evidence }) =>
          quoteBatch({
            quoteRequestId: `v3:quote:${operationId}`,
            projectId: projectId.trim(),
            runId: operationId,
            projectLabelSnapshot,
            reviewSnapshotId: snapshot.snapshotId,
            documentFingerprint: snapshot.manifestHash,
            translationSetDigest: v3Plan.translationSetDigest,
            scopeDecisionDigest: buildScopeDecisionDigest(executionLanguages),
            languageSetDigest: languageSetDigest,
            bindingPlanDigest: v3Plan.bindingPlanDigest,
            languageCodes: executionLanguages,
            rows: allRows,
            challengeId,
            ...(evidence ? { evidence: evidence as never } : {}),
          }).then((r) => ({
            batchId: r.batch.id,
            quotedCredits: r.batch.quotedCredits,
            status: r.batch.status,
            billingBreakdown: r.billingBreakdown,
          })),
        confirm: (o) =>
          confirmBatch({
            batchId: o.batchId,
            confirmRequestId: o.confirmRequestId,
            projectId: o.projectId,
            runId: o.runId,
            projectLabelSnapshot: o.projectLabelSnapshot,
            languages: o.languages,
          }).then((r) => ({ reservationRequestId: r.reservationRequestId, reservedCredits: r.reservedCredits })),
        createAttempt: (o) =>
          createLanguageAttempt(o).then((r) => ({
            attemptId: r.attemptId,
            languageJobId: r.languageJobId,
            ticket: r.ticket,
          })),
        finish: (o) =>
          requestFinishBatch(o).then((r) => ({
            status: r.finalStatus,
            committedCredits: r.committedCredits,
            releasedCredits: r.releasedCredits,
            deliveryCompletionRate: r.deliveryCompletionRate ?? null,
            plannedAssignmentCount: r.plannedAssignmentCount ?? null,
            deliveredAssignmentCount: r.deliveredAssignmentCount ?? null,
          })),
        saveDraft: (d) =>
          saveExecutionRecovery({
            operationId,
            attemptId: d.activeAttemptId,
            targetLanguage: d.languageCodes[0] ?? targetLanguage,
            startedAt,
            generation: 1,
            phase: d.activeAttemptId ? 'accepted' : d.activeAttemptRequestId ? 'submitting' : 'between',
            reviewSnapshotId: d.reviewSnapshotId,
            batchLanguages: d.languageCodes,
            completedLanguages: d.completedLanguages,
            batchId: d.batchId,
            reservationRequestId: d.reservationRequestId,
            quotedCredits: d.quotedCredits,
            bindingPlanDigest: d.bindingPlanDigest,
            runId: d.runId,
            projectLabelSnapshot: d.projectLabelSnapshot,
            activeAttemptLanguageCode: d.activeAttemptLanguageCode ?? undefined,
            activeAttemptRequestId: d.activeAttemptRequestId ?? undefined,
          }),
        loadDraft: () => {
          const r = loadExecutionRecovery()
          if (!r?.batchId || !r.reservationRequestId || !r.bindingPlanDigest) return null
          return {
            batchId: r.batchId,
            reservationRequestId: r.reservationRequestId,
            quotedCredits: r.quotedCredits ?? 0,
            runId: r.runId ?? '',
            bindingPlanDigest: r.bindingPlanDigest,
            reviewSnapshotId: r.reviewSnapshotId ?? '',
            projectLabelSnapshot: r.projectLabelSnapshot ?? '',
            languageCodes: r.batchLanguages ?? executionLanguages,
            completedLanguages: r.completedLanguages ?? [],
            activeAttemptId: r.attemptId,
            activeAttemptRequestId: r.activeAttemptRequestId ?? null,
            activeAttemptLanguageCode: recoverableBatchAttemptLanguage(r) ?? undefined,
          }
        },
        // T5 v2：重试 pass 对非终态失败 attempt 先显式放弃（释放单赢家互斥）再重建。
        abandonLanguage: async (opts) => abandonBatchLanguage(opts),
        executeLanguage: async (opts) => {
          // C3/B2：接入助手 batch/execute 一步式执行（复用 V1.5 内核），
          // 受理后轮询 attemptRuntime 终态；逐对象回执由助手直报云端。
          // M1 延伸（2026-09-13 P0）：预执行业务拒绝不得掀翻整批——该语言判失败、
          // best-effort 释放执行权后继续其余语言；系统性故障（助手不可达）仍短路整批。          // B 收口（2026-09-13 事故）：忙碌类拒绝（ASSISTANT_BUSY/ASSISTANT_ATTEMPT_LOCKED）
          // 先有界等待+重试（同一请求体、同一 attemptId，不重新创建/不重复计费）；
          // 预算耗尽 → 释放当前 attempt → 抛系统性错误停止后续派发（由 v3-batch-flow 收口 finish）。
          try {
            await runWithBusyRetry(
              () => executeBatchLanguageDirect({
                ticket: opts.ticket,
                attemptId: opts.attemptId,
                languageCode: opts.languageCode,
                masterPath: psdSelection.masterPath,
                scanId: psdSelection.scanId as string,
                reviewSnapshotId: snapshot.snapshotId,
                reviewDecisionDigest: snapshot.decisionDigest,
                reviewSchemaVersion: snapshot.reviewSchemaVersion,
                reviewEngineVersion: snapshot.reviewEngineVersion,
                ruleSetVersion: snapshot.ruleSetVersion,
                translations: billableRows.filter((lr) => lr.billableLanguages[opts.languageCode]).map((lr) => ({
                  source: lr.source,
                  target: lr.translationByLang[opts.languageCode] ?? '',
                  rowToken: lr.rowToken,
                  rowId: lr.rowId,
                })),
                excludedLayerObjectIds: excludedLayerObjectIds ?? [],
                ignoredTranslationRowIds: ignoredTranslationRowIds ?? [],
                // P0 语言串写修复：本语言只带本语言的确认绑定（旧助手用扁平字段=本语言，不再广播他语言）。
                forcedBindings: forcedBindingsForLanguage(opts.languageCode),
                forcedBindingsByLanguage: normalizedForcedBindingsByLanguage(executionLanguages),
                outputDirectory: batchSharedOutputDirectory,
                outputBaseName: preferredOutputBaseName,
                reportContext: {
                  excludedRows,
                  // P1-A：译前溢出风险随报告落盘（估算，仅提示）。
                  // 不再在这里二次截断——真 total 由报告展示，条数上限由助手侧统一控制。
                  overflowRisks: overflowRisks ?? [],
                  overflowRiskTotal: overflowRiskTotal ?? null,
                },
              }),
              {
                codeOf: (error) => (error instanceof LocalAssistantRequestError ? error.code : null),
                onWait: ({ attempt, delayMs }) => {
                  busyRetryInfoRef.current.attempts += 1
                  busyRetryInfoRef.current.waitedMs += delayMs
                  setPreparationNotice(
                    t('本地助手正在结束上一个语言，等待第 {attempt} 次重试（{value1} 秒后自动重发，不会重复计费）。', { attempt: String(attempt), value1: String(Math.round(delayMs / 1000)) }),
                  )
                },
              },
            )
          } catch (error) {
            const code = error instanceof LocalAssistantRequestError ? error.code : null
            // W 补丁（纯展示）：留存本语言失败事实，供「本次未产出」报告逐语言展示。
            languageFailureFactsRef.current.set(opts.languageCode, {
              code,
              attemptId: opts.attemptId ?? null,
            })
            // 2026-09-14 事故3：语言级拒绝的精确原因（助手 code + 脱敏 message）随漏斗事件上云。
            // 此前未知码被收敛成通用码（LOCAL_ASSISTANT_EXECUTE_FAILED），导致 MANIFEST 阶段
            // 5 连拒无法定案、只能反复向用户取报错原文。
            trackFunnelEvent('error', {
              currentStep: 'execution_language_failed',
              targetLanguageCode: opts.languageCode,
              errorCode: funnelSafeErrorCode(code),
              errorStage: funnelStageForBatchFailure(code),
              errorMessageSafe: sanitizeFunnelErrorMessage(error instanceof Error ? error.message : ''),
              batchId: opts.batchId,
              errorCount: 1,
            })
            if (isBusyDispatchCode(code)) {
              // 有界等待后仍忙碌：本语言 attempt 从未被本地接受（零副作用），
              // best-effort 释放后按系统性故障停止批次——继续派发只会复制孤儿 attempt。
              try {
                await abandonBatchLanguage({
                  batchId: opts.batchId,
                  languageCode: opts.languageCode,
                  attemptId: opts.attemptId,
                })
              } catch { /* 释放失败：保持云端事实，后续由 reaper 兜底（≤15min STALLED 全额释放） */ }
              v3AbortCodeRef.current = 'ASSISTANT_BUSY_PERSISTENT'
              throw new LocalAssistantRequestError(
                t('本地助手持续忙碌，未受理语言 {value0}；已停止本批次（不会重复扣费）。其余未执行语言可稍后重试。', { value0: String(formatLanguageCode(opts.languageCode)) }),
                'ASSISTANT_BUSY_PERSISTENT',
              )
            }
            if (code === 'LOCAL_MEMORY_LOW') {
              // 内存闸：助手在启动 Photoshop 之前拒绝，attempt 从未被本地接受＝零副作用。
              // best-effort 放弃该语言，让批次立刻按终态结算；放弃失败也不追——
              // 服务端 reaper 会把它终态化为 ATTEMPT_ABANDONED_NEVER_DISPATCHED，
              // 整批按实际交付单位结算、未执行部分退回，全部未执行即全额释放
              // （src/lib/server/execution-batch.ts:1655-1658、:2060-2070）。
              try {
                await abandonBatchLanguage({
                  batchId: opts.batchId,
                  languageCode: opts.languageCode,
                  attemptId: opts.attemptId,
                })
              } catch { /* 释放失败：保持云端事实，由 reaper 兜底 */ }
              v3AbortCodeRef.current = code
              v3AbortMessageRef.current = error instanceof Error && error.message
                ? error.message
                : t('本机可用内存不足，已停止本批次派发；未执行的语言不会扣费。')
              throw error
            }
            if (isSystemicPreExecutionError(code) || (code !== null && SYSTEMIC_BATCH_ERROR_CODES.has(code))) {
              // 保留真实系统性原因码供失败事件（v3-flow 只回传 BATCH_ABORTED_SYSTEMIC）。
              v3AbortCodeRef.current = code ?? null
              throw error
            }
            const message = error instanceof Error && error.message ? error.message : t('该语言执行请求被拒绝。')
            try {
              await abandonBatchLanguage({
                batchId: opts.batchId,
                languageCode: opts.languageCode,
                attemptId: opts.attemptId,
              })
            } catch { /* 释放失败：保持云端事实，后续由 reaper 兜底 */ }
            setPreparationNotice(t('语言 {value0} 未完成：{message}其余语言继续执行。', { value0: String(formatLanguageCode(opts.languageCode)), message: String(message) }))
            return { success: false, matchedCount: 0, finalPath: null }
          }
          setLastAttemptId(opts.attemptId)
          const completion = await waitForV15Completion(opts.attemptId)
          if (!completion?.success) {
            // R3：透出助手端真实失败原因（如心跳超时），不再只报"未成功"；
            // completion 为 null = 轮询超时未观察到终态。T-0069 P4：
            // 浏览器放弃等待 ≠ 任务失败——助手/Photoshop 可能仍在跑，云端事实
            // 由回执与裁决链决定；保持 activeAttemptId，禁止释放执行权或派发下一语言。
            if (!completion) {
              throw new LocalAssistantRequestError(
                t('语言 {value0} 的执行结果尚未确认；已停止后续派发，请先核对原任务状态。', { value0: String(formatLanguageCode(opts.languageCode)) }),
                'ATTEMPT_STATUS_REQUEST_FAILED',
              )
            }
            const errorCode = completion.errorCode ?? null
            // W 补丁（纯展示）：终态失败同样留存，供「本次未产出」报告展示。
            languageFailureFactsRef.current.set(opts.languageCode, {
              code: errorCode,
              attemptId: opts.attemptId ?? null,
            })
            const detail = errorCode ? (V15_ERROR_CODE_ZH[errorCode] ?? fallbackErrorDetail(errorCode)) : t('任务返回未成功终态。')
            // T-0117 M1：系统性故障（助手断连/未知 attempt）→ 短路整批，继续只会接连失败。
            if (errorCode && SYSTEMIC_BATCH_ERROR_CODES.has(errorCode)) {
              throw new LocalAssistantRequestError(
                t('本地助手连接中断，已中止批次：{detail}', { detail: String(detail) }),
                'V3_LANGUAGE_EXECUTION_FAILED',
              )
            }
            // T-0117 W1：回执未确认 ≠ 语言失败——本机设计文件已产出、回执正由 outbox 异步重试投递。
            // 计入已完成，避免"界面说失败、云端已按成功结算"的分歧（云端结算仍以回执为准）。
            if (errorCode === 'RECEIPT_NOT_DELIVERED') {
              setPreparationNotice(t('语言 {value0} 已完成（本机已产出设计文件，云端回执同步中）。', { value0: String(formatLanguageCode(opts.languageCode)) }))
              return { success: true, matchedCount: 0, finalPath: null }
            }
            // FG-RECEIPT-STALE：回执这一环断了（载荷没建出来／没被云端确认）不得写成"语言未完成"——
            // Photoshop 侧确实做完了，缺的是云端凭据。success 仍为 false（结算与重试资格一律不动），
            // 只把文案换成如实的两句式（逐码文案见 V15_ERROR_CODE_ZH，分类见 RECEIPT_MISSING_ERROR_CODES）。
            if (isReceiptMissingErrorCode(errorCode)) {
              setPreparationNotice(t('语言 {value0}：{detail}其余语言继续执行。', { value0: String(formatLanguageCode(opts.languageCode)), detail: String(detail) }))
              return { success: false, matchedCount: 0, finalPath: null }
            }
            // T-0117 M1：语言级失败（PS 卡死/校验失败）→ 记录并继续下一个语言，不再掀翻整批。
            setPreparationNotice(t('语言 {value0} 未完成：{detail}其余语言继续执行。', { value0: String(formatLanguageCode(opts.languageCode)), detail: String(detail) }))
            return { success: false, matchedCount: 0, finalPath: null }
          }
          if (completion.reportStatus === 'GENERATED') {
            setLocalReportStatus('generated')
          } else {
            setLocalReportStatus('failed')
            setPreparationNotice(t('当前语言设计文件已生成，但共享 HTML 报告未通过助手确认；后续语言完成时会继续尝试写入。'))
          }
          // P1-2：首个语言执行成功（attempt 已落库）后上报本任务的审查决策信号（best-effort）。
          if (psdSelection.scanId && learningFlushRef.current !== psdSelection.scanId) {
            learningFlushRef.current = psdSelection.scanId
            void flushLearningSignals({
              runId: psdSelection.scanId,
              // 批次链的清单身份就是绑定计划摘要；归属校验按 manifestDigest 认它（ExecutionBatch.principalId 同人即过）。
              manifestDigest: v3Plan.bindingPlanDigest,
              bindingPlanDigest: v3Plan.bindingPlanDigest,
            })
          }
          return {
            success: true,
            matchedCount: 0, // 权威完成数在云端 receipt（逐对象 rowResults），UI 不依赖
            finalPath: completion.finalPath ?? null,
          }
        },
        now: () => new Date().toISOString(),
      })
      // 2026-10-03：finish 成功即终态已确认（SETTLED/STALLED/EXPIRED 皆然）——无论成功/部分/失败，
      // 都释放执行授权与未结算锁；否则“重置工作台”会被陈旧授权拦截（实测 STALLED 已退分仍提示不能清空）。
      // finish 失败（finishNotice 非空=结算未确认）时保持锁定，fail-closed 不变。
      if (!v3Result.finishNotice) {
        onExecutionAuthorized(false)
        setUnsettledExecution(false)
      }
      if (!v3Result.ok) {
        // T-0117 M1：部分语言成功不再整体报失败——有产出且已结算即进入完成态并如实告知；
        // 仅当 finish 未结算（fail-closed）或无任何语言完成时才判失败。
        const completedCount = v3Result.completedLanguages.length
        const failedCount = v3Result.failedLanguages.length
        const unresolvedLanguages = v3Result.unresolvedLanguages
        const unresolvedCount = unresolvedLanguages.length
        // E2：批次失败结构化事件（只上报枚举与计数；原因码经白名单收敛，绝不携带自由文本）。
        const batchFailureCode =
          v3Result.code === 'BATCH_ABORTED_SYSTEMIC'
            ? (v3AbortCodeRef.current ?? 'BATCH_ABORTED_SYSTEMIC')
            : v3Result.code === 'BATCH_ATTEMPT_UNRESOLVED'
              ? 'BATCH_ATTEMPT_UNRESOLVED'
            : v3Result.code === 'V3_PARTIAL_FAILURE'
              ? 'V3_PARTIAL_FAILURE'
              : 'BATCH_FINISH_FAILED'
        // 内存闸那拍的真实原因码要在复位前取走（复位后字面量类型已不含 LOCAL_MEMORY_LOW）。
        const abortCodeForCopy = v3AbortCodeRef.current
        v3AbortCodeRef.current = null
        trackFunnelEvent('error', {
          currentStep: 'execution_failed',
          // 契约只接受单个语言码（逗号串会被 FIELD_VALUE 整条拒绝）；多语言信息由计数承载。
          targetLanguageCode: executionLanguages[0] ?? targetLanguage,
          csvRowCount: parsed.rows.length,
          reviewRowCount: snapshotRows.length,
          matchedCount: completedCount,
          unmatchedCount: unmatchedTranslationRowIds?.length ?? 0,
          warningCount: 0,
          errorCount: failedCount + unresolvedCount,
          photoshopStatus: psState.status,
          errorCode: funnelSafeErrorCode(batchFailureCode),
          errorStage: funnelStageForBatchFailure(batchFailureCode),
          // 2026-09-16：批次失败也上报脱敏 message（此前只有语言级事件带 message）。
          errorMessageSafe: sanitizeFunnelErrorMessage(v3Result.message ?? ''),
          durationSeconds: Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000)),
          // E2b：批次失败富字段（仅标识符与计数；契约白名单只允许 error 事件携带）
          batchId: v3Result.batchId ?? null,
          dispatchAttempts: 1 + busyRetryInfoRef.current.attempts,
          busyWaitSeconds: Math.round(busyRetryInfoRef.current.waitedMs / 1000),
          completedLanguageCount: completedCount,
          failedLanguageCount: failedCount,
        })
        if (unresolvedCount > 0) {
          const completedNotice = completedCount > 0 ? t('已完成 {completedCount} 个语言。', { completedCount: String(completedCount) }) : ''
          setPreparationNotice(
            t('{completedNotice}语言 {value1} 的执行结果尚未确认。{value2}系统已停止后续派发；请先核对原任务状态，不要再次执行。', { completedNotice: String(completedNotice), value1: String(unresolvedLanguages.join('、')), value2: String(v3Result.finishNotice ? `${v3Result.finishNotice}。` : '') }),
          )
        } else if (v3Result.finishNotice) setPreparationNotice(v3Result.finishNotice)
        else if (v3Result.code === 'BATCH_ABORTED_SYSTEMIC' && v3Result.message) {
          // 内存闸要说「还剩多少、线是多少、该怎么办」，而不是把 LOCAL_MEMORY_LOW 吐给用户。
          const memoryAbortCopy = abortCodeForCopy === 'LOCAL_MEMORY_LOW' ? v3AbortMessageRef.current : null
          v3AbortMessageRef.current = null
          const base = memoryAbortCopy || v3Result.message
          setPreparationNotice(
            completedCount > 0 ? t('{base}已完成 {completedCount} 个语言。', { base: String(base), completedCount: String(completedCount) }) : base,
          )
        }
        if (unresolvedCount > 0) {
          setLastBatchId(v3Result.batchId ?? null)
          transitionExecState('execution_failed')
          notify({
            title: t('执行状态待核实'),
            description: t('系统已停止后续派发，原任务仍待对账。请勿重新提交或再次执行。'),
            variant: 'destructive',
            dedupeKey: 'batch-outcome-unresolved',
          })
        } else if (!v3Result.finishNotice && completedCount > 0) {
          setLastBatchId(v3Result.batchId ?? null)
          setPreparationNotice(
            t('已完成 {completedCount} 个语言，{failedCount} 个语言未完成：{value2}。未完成语言的积分会按失败自动结算退回。', { completedCount: String(completedCount), failedCount: String(failedCount), value2: String(v3Result.failedLanguages.join('、')) }),
          )
          transitionExecState('execution_completed')
          clearExecutionRecovery()
          notify({
            title: t('部分语言未完成'),
            description: t('已完成 {completedCount} 个；未完成：{value1}。未完成部分积分自动退回。', { completedCount: String(completedCount), value1: String(v3Result.failedLanguages.join('、')) }),
            variant: 'destructive',
            dedupeKey: 'batch-partial-failed',
          })
        } else {
          transitionExecState('execution_failed')
          notify({
            title: t('执行未完成'),
            description:
              v3Result.finishNotice ?? v3Result.message ?? t('批次未收口，请查看错误原因；批次停滞约 15 分钟后未完成部分积分自动退回。'),
            variant: 'destructive',
            dedupeKey: 'batch-failed',
          })
        }
        // W 补丁（2026-10-12，纯展示层新增）：本批次零产出时，生成一份「本次未产出」报告
        // 供用户下载。浏览器写不了交付目录，所以它落下载目录——报告正文已把这点写死。
        // 只投影上面已经算好的结果：不创建任务、不改判定、不改计费/回执、不调用 Photoshop。
        if (completedCount === 0) {
          const generatedAt = new Date()
          const observedAttemptId =
            [...languageFailureFactsRef.current.values()]
              .map((facts) => facts.attemptId)
              .find((attemptId) => Boolean(attemptId)) ?? lastAttemptId
          setUnproducedReport({
            html: buildUnproducedReportHtml({
              generatedAt,
              batchId: v3Result.batchId ?? null,
              attemptId: observedAttemptId,
              operationId,
              masterFileName: basenameOnly(psdSelection.masterPath),
              plannedOutputDirectory: batchSharedOutputDirectory,
              batchFailureCode,
              batchFailureMessage: v3Result.message ?? null,
              settlementUnconfirmed: Boolean(v3Result.finishNotice),
              finishNotice: v3Result.finishNotice ?? null,
              quotedCredits: v3Result.quotedCredits ?? 0,
              committedCredits: v3Result.committedCredits ?? 0,
              releasedCredits: v3Result.releasedCredits ?? 0,
              languages: collectUnproducedLanguages({
                executionLanguages,
                completedLanguages: v3Result.completedLanguages,
                failedLanguages: v3Result.failedLanguages,
                unresolvedLanguages,
                languageFailureFacts: languageFailureFactsRef.current,
              }),
            }),
            fileName: unproducedReportFileName(generatedAt),
            outputDirectory: batchSharedOutputDirectory,
          })
        }
        notifyCreditsChanged()
        return
      }
      if (v3Result.finishNotice) setPreparationNotice(v3Result.finishNotice)
      setLastBatchId(v3Result.batchId ?? null)
      transitionExecState('execution_completed')
      clearExecutionRecovery()
       setOutputBaseName(`${preferredOutputBaseName}__${executionLanguages.length}-languages`)
      notify({
        title: t('执行完成'),
        description: t('{length} 种语言已生成设计文件与报告。', { length: String(v3Result.completedLanguages.length) }),
        dedupeKey: 'batch-complete',
      })
      notifyCreditsChanged()
      trackFunnelEvent('replacement_done', {
        currentStep: 'replacement_done',
        // 契约只接受单个语言码（逗号串会被 FIELD_VALUE 整条拒绝）；完成语言数由 matchedCount 承载。
        targetLanguageCode: executionLanguages[0] ?? targetLanguage,
        csvRowCount: parsed.rows.length,
        reviewRowCount: snapshotRows.length,
        matchedCount: v3Result.completedLanguages.length,
        unmatchedCount: unmatchedTranslationRowIds?.length ?? 0,
        warningCount: 0,
        errorCount: 0,
        photoshopStatus: psState.status,
        durationSeconds: Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000)),
      })
      return
    }

    // V1.5 信任链：端到端编排（观测→ledger→readiness→job→attempt→manifest→execute）
    if (v15ExecutionEnabled) {
      if (!psdSelection?.scanId || !psdSelection?.masterPath) {
        throw new Error(t('V1.5 信任链执行需要先完成 Step 1 的 PSD 预扫描。'))
      }
      generationRef.current += 1
      const generation = generationRef.current
      const pendingSubmission = resumePendingSubmission(
        loadExecutionRecovery(),
        targetLanguage,
        snapshot.manifestHash,
        snapshot.decisionDigest,
      )
      const operationId = pendingSubmission?.operationId ?? crypto.randomUUID()
      setLastOperationId(operationId)
      setLastBatchId(null)
      const reviewSnapshotId = pendingSubmission?.reviewSnapshotId ?? snapshot.snapshotId
      const reviewManifestHash = pendingSubmission?.reviewManifestHash ?? snapshot.manifestHash
      const reviewDecisionDigest = pendingSubmission?.reviewDecisionDigest ?? snapshot.decisionDigest
      const initialRecovery = {
        operationId,
        jobId: null,
        attemptId: null,
        targetLanguage,
        startedAt,
        generation,
        phase: 'submitting',
        reviewSnapshotId,
        reviewManifestHash,
        reviewDecisionDigest,
      } as const
      if (!saveExecutionRecovery(initialRecovery)) {
        throw new LocalAssistantRequestError(
          t('无法保存本次执行的恢复状态，本次未发起计费。请允许浏览器使用本地存储后重试。'),
          'EXECUTION_RECOVERY_PERSISTENCE_FAILED',
        )
      }
      const submitted = await submitV15Execution({
        operationId,
        masterPath: psdSelection.masterPath,
        scanId: psdSelection.scanId,
        targetLanguage,
        reviewSnapshotId,
        reviewManifestHash,
        reviewDecisionDigest,
        reviewSchemaVersion: snapshot.reviewSchemaVersion,
        reviewEngineVersion: snapshot.reviewEngineVersion,
        ruleSetVersion: snapshot.ruleSetVersion,
        translations: reviewRows.map((row) => ({
          rowId: stableRowIds[row.rowIndex - 1],
          rowIndex: row.rowIndex,
          source: row.sourceText,
          target: row.translatedText ?? '',
        })),
        // 单语言路径：扁平字段必须是本执行语言的绑定（不再是首语言扁平值）。
        forcedBindings: forcedBindingsForLanguage(targetLanguage),
        excludedLayerObjectIds,
        ignoredTranslationRowIds,
        // 未匹配行既不进报价，也要随同一份跳过清单下发给助手（客户端合并）。
        unmatchedTranslationRowIds,
        billingScope: singleRunScope.scope.excludedRows.length > 0 ? singleRunScope.scope : undefined,
        outputDirectory: customOutputDirectory,
        outputBaseName: preferredOutputBaseName,
        projectId,
        projectLabelSnapshot,
        onJobConfirmed: ({ jobId }) => {
          setLastJobId(jobId)
          setUnsettledExecution(true)
          onExecutionAuthorized(true)
          if (!saveExecutionRecovery({ ...initialRecovery, jobId })) {
            throw new LocalAssistantRequestError(
              t('执行额度已冻结，但恢复状态保存失败；系统将先核对并退回本次冻结，请勿重复执行。'),
              'EXECUTION_RECOVERY_PERSISTENCE_FAILED',
            )
          }
        },
      })
      setLastJobId(submitted.jobId ?? null)
      setLastAttemptId(submitted.attemptId)
      setOutputLocation(
        v15OutputLocation(
          psdSelection.masterPath,
          submitted.attemptId,
          targetLanguage,
          submitted.outputDirectory ?? customOutputDirectory,
          preferredOutputBaseName,
        ),
      )
      const acceptedRecoverySaved = saveExecutionRecovery({
        operationId,
        jobId: submitted.jobId,
        attemptId: submitted.attemptId,
        targetLanguage,
        startedAt,
        generation,
        phase: 'accepted',
        reviewSnapshotId,
        reviewManifestHash,
        reviewDecisionDigest,
      })
      if (!acceptedRecoverySaved) {
        setPreparationNotice(t('执行已受理，但本地恢复记录更新失败；本次任务仍被锁定，请先等待或核对任务状态，不要重新执行。'))
      }
      notifyCreditsChanged()
      const submittedAt = new Date().toISOString()
       const outputFileName = `${preferredOutputBaseName}__${targetLanguage}.${submitted.outputFormat.toLowerCase()}`
      setOutputBaseName(outputFileName.replace(/\.(psd|psb)$/i, ''))

      const baseReport: ReplaceReport = {
        appName: APP_NAME,
        version: APP_VERSION,
        targetLanguageCode: targetLanguage,
        sourceRowCount: parsed.rows.length,
        reviewRowCount: reviewRows.length,
        matchedCount: submitted.matchedCount,
        unmatchedCount: submitted.unmatchedCount,
        warningCount: 0,
        errorCount: 0,
        startedAt,
        finishedAt: submittedAt,
        outputFileName,
        matchedItems: [],
        unmatchedItems: [],
        warnings: [{
          code: 'V15_EXECUTION_SUBMITTED',
          message: t('V1.5 信任链执行已受理（{matchedCount} 个图层对象），Photoshop 阶段正在本机推进，完成后会在源 PSD 所在目录生成语言副本。', { matchedCount: String(submitted.matchedCount) }),
        }],
        errors: [],
      }

      setReport(baseReport)
      setReportJson(null)
      setReportHtml(null)
      transitionExecState('execution_submitted')
      onExecutionAuthorized(true)

      // 受理 ≠ 完成（P0-3）：这里只发 replacement_submitted，完成事件必须等真实回执
      trackFunnelEvent('replacement_submitted', {
        currentStep: 'replacement_submitted',
        targetLanguageCode: targetLanguage,
        csvRowCount: parsed.rows.length,
        reviewRowCount: reviewRows.length,
        matchedCount: submitted.matchedCount,
        unmatchedCount: submitted.unmatchedCount,
        warningCount: 0,
        errorCount: 0,
        photoshopStatus: psState.status,
        durationSeconds: 0,
      })

      // 等待本机完成回执（不阻塞；超时/失败都显式提示，不静默）
      const v15CompletionPromise = waitForV15Completion(submitted.attemptId)
      // 实验模式：把完成 Promise 暴露给 runExecution 收尾——逐 PSD 编排必须等真实完成再推进。
      activeV15CompletionRef.current = v15CompletionPromise
      void v15CompletionPromise.then((completion) => {
        if (generationRef.current !== generation) return // 防旧回执串台（M4）
        const finishedAt = new Date().toISOString()
        const durationSeconds = Math.max(
          0,
          Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000),
        )
        if (completion === null) {
          setPreparationNotice(
            t('执行已提交；较长时间未观察到本机完成回执，请查看本地助手窗口与源 PSD 所在目录。'),
          )
          transitionExecState('execution_failed')
        } else if (!completion.success) {
          if (completion.settlement?.ok === true && ['released', 'settled'].includes(completion.settlement.finalStatus ?? '')) {
            clearExecutionRecovery()
            setUnsettledExecution(false)
            onExecutionAuthorized(false)
          }
          setErrorMsg(t('V1.5 执行在 Photoshop 阶段未成功，详情请查看本地助手窗口。'))
          transitionExecState('execution_failed')
          trackFunnelEvent('error', {
            currentStep: 'execution_failed',
            targetLanguageCode: targetLanguage,
            csvRowCount: parsed.rows.length,
            reviewRowCount: reviewRows.length,
            matchedCount: submitted.matchedCount,
            unmatchedCount: submitted.unmatchedCount,
            photoshopStatus: psState.status,
            errorCode: 'V15_EXECUTION_FAILED',
            errorStage: 'execute',
            durationSeconds,
          })
        } else {
          const reportFailed = v15ExecutionEnabled && completion.reportStatus !== 'GENERATED'
          setLocalReportStatus(v15ExecutionEnabled ? (reportFailed ? 'failed' : 'generated') : 'unknown')
          // 真实回执：完成语义 + 完成事件
          if (completion.finalPath) {
            setOutputLocation(outputLocationFromFinalPath(completion.finalPath))
          }
          // L1 质量门：执行成功后才上报排版学习样本（REOPEN_VERIFIED + SUCCEEDED）
          if (psdSelection.summary && typographyUploadedScanRef.current !== psdSelection.scanId) {
            typographyUploadedScanRef.current = psdSelection.scanId
            void reportTypographyEvidence({
              summary: psdSelection.summary,
              executionStatus: 'SUCCEEDED',
              attemptId: submitted.attemptId,
            })
          }
          // P1-2：单语言执行成功（attempt 已落库）后上报本任务的审查决策信号（best-effort）。
          if (psdSelection.scanId && learningFlushRef.current !== psdSelection.scanId) {
            learningFlushRef.current = psdSelection.scanId
            void flushLearningSignals({
              runId: psdSelection.scanId,
              // attempt.executionManifestDigest 已在授权时落库，传同值让归属校验命中并升级 attestation=manifest_bound。
              manifestDigest: submitted.executionManifestDigest,
            })
          }
          clearExecutionRecovery()
          setPreparationNotice(
            reportFailed
              ? t('设计文件已生成，但 {localAssistantReportFileName} 生成失败或未确认；请检查输出目录，不要重复执行 Photoshop。', { localAssistantReportFileName: String(localAssistantReportFileName) })
              : null,
          )
          transitionExecState('execution_completed')
          if (completion.settlement?.ok === true && ['released', 'settled'].includes(completion.settlement.finalStatus ?? '')) {
            setUnsettledExecution(false)
            onExecutionAuthorized(false)
          }
          trackFunnelEvent('replacement_done', {
            currentStep: 'replacement_done',
            targetLanguageCode: targetLanguage,
            csvRowCount: parsed.rows.length,
            reviewRowCount: reviewRows.length,
            matchedCount: submitted.matchedCount,
            unmatchedCount: submitted.unmatchedCount,
            warningCount: 0,
            errorCount: 0,
            photoshopStatus: psState.status,
            durationSeconds,
          })
          trackFunnelEvent('report_generated', {
            currentStep: 'report_generated',
            targetLanguageCode: targetLanguage,
            csvRowCount: parsed.rows.length,
            reviewRowCount: reviewRows.length,
            matchedCount: submitted.matchedCount,
            unmatchedCount: submitted.unmatchedCount,
            warningCount: 0,
            errorCount: 0,
            photoshopStatus: psState.status,
            durationSeconds,
            reportGenerated: !reportFailed,
          })
        }
      })
      return
    }

  }

  const retryLocalReport = async () => {
    if (!lastAttemptId || retryingReport) return
    setRetryingReport(true)
    setErrorMsg(null)
    try {
      await retryV15Report(lastAttemptId)
      setLocalReportStatus('generated')
      setPreparationNotice(t('HTML 报告已重建完成；本次没有重新执行 Photoshop，也没有重新冻结积分。'))
      notify({ title: t('报告已重建'), description: t('未重新执行 Photoshop，积分未重复冻结。'), dedupeKey: 'report-rebuilt' })
      trackFunnelEvent('report_generated', {
        currentStep: 'report_generated',
        targetLanguageCode: targetLanguage,
        csvRowCount: parsed.rows.length,
        reviewRowCount: reviewRows.length,
        warningCount: 0,
        errorCount: 0,
        reportGenerated: true,
      })
    } catch (error) {
      setLocalReportStatus('failed')
      setPreparationNotice(
        t('HTML 报告重建失败：{value0}', { value0: String(error instanceof Error ? error.message : t('请检查本地助手后重试。')) }),
      )
      notify({
        title: t('报告重建失败'),
        description: error instanceof Error ? error.message : t('请检查本地助手后重试。'),
        variant: 'destructive',
        dedupeKey: 'report-rebuild-failed',
      })
    } finally {
      setRetryingReport(false)
    }
  }

  // 失败后退回积分：无回执任务默认冻结至宽限窗口，这里提供立即退回入口（对抗式审查修复）
  const cancelRefund = async () => {
    const jobId = lastJobId
    if (refunding) return
    if (!jobId) {
      // 批次 v3 主链不产生单语言 jobId：如实说明没有可退对象与自动退回预期，禁止静默返回。
      const message =
        t('当前没有可直接退回的单次执行任务。批量执行的积分由系统自动核对：批次停滞约 15 分钟后，未执行部分会自动全额退回，无需重复操作。')
      setRefundNotice(message)
      setRefundNoticeTone('warning')
      notify({ title: t('没有可退回的任务'), description: message, dedupeKey: 'execution-refund-no-job' })
      return
    }
    setRefunding(true)
    setRefundNotice(null)
    try {
      const res = await fetch('/api/billing/photoshop/cancel', {
        method: 'POST',
        headers: workbenchAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ jobId, anonymousInstallId: readWorkbenchActivation()?.anonymousInstallId ?? '' }),
        // 无超时的取消请求会在连接挂起时永久转圈（用户视角＝又一个"没反应"的按钮）。
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.ok !== true) {
        setRefundNotice(t('退回失败：{value0}', { value0: String(data?.message ?? t('请稍后重试')) }))
        setRefundNoticeTone('error')
        notify({ title: t('退回失败'), description: data?.message ?? t('请稍后重试'), variant: 'destructive', dedupeKey: 'execution-refund-failed' })
        return
      }
      setLastJobId(null)
      setUnsettledExecution(false)
      onExecutionAuthorized(false)
      clearExecutionRecovery()
      setRefundNotice(
        t('已取消执行并退回 {value0} 积分，余额已刷新。', { value0: String(data.releasedCredits ?? 0) }),
      )
      setRefundNoticeTone('success')
      notify({ title: t('已取消执行'), description: t('已退回 {value0} 积分，余额已刷新。', { value0: String(data.releasedCredits ?? 0) }), dedupeKey: 'execution-refunded' })
      notifyCreditsChanged()
    } catch {
      setRefundNotice(t('退回请求失败，请重试或稍后刷新余额。'))
      setRefundNoticeTone('error')
    } finally {
      setRefunding(false)
    }
  }

  // v12（2026-10-21）D1：执行前范围确认。
  // 为什么要有：批量下误触一次＝N 稿 × M 语言，而写进 PSD 的内容不可逆（本产品没有 PSD 备份）。
  // 纪律：只拦「点击 → 派发」这一步，不改变执行链、不参与计费；确认时重算范围指纹，
  // 范围在确认框打开期间变了就不许拿过期范围开工（TOCTOU）。
  // Round 2 修正：指纹要含**语言名单**而非只有个数——同数量换语言（EN+JP → EN+KO）原始人眼看不出，
  // 但写出去的是另一套译文；另外切档时清掉未确认的弹层，避免切回来时冒出一个过期确认框。
  const [scopeConfirm, setScopeConfirm] = useState<{
    kind: 'single' | 'batch'
    signature: string
    title: string
    description: string
    lines: ExecutionScopeLine[]
    confirmLabel: string
    run: () => void
  } | null>(null)

  useEffect(() => {
    setScopeConfirm(null)
  }, [batchMode])

  const singleScopeSignature = `${psdSelection?.masterPath ?? ''}##${allLanguages.join(',')}##${parsed.rows.length}`

  // 确认框里的「文件名」需要一个与提交同规则的预览值：提交处那份在闭包里（见 preferredOutputBaseName），
  // 这里按同一条回退顺序（源 PSD 名 → 'TYGF_OUTPUT'）重算一次，避免两处口径分叉。
  const scopeOutputBaseName = resolveOutputBaseName(
    customOutputName,
    basenameOnly(psdSelection?.masterPath || '').replace(/\.(psd|psb)$/i, '') || 'TYGF_OUTPUT',
  )

  const confirmScope = () => {
    const pending = scopeConfirm
    setScopeConfirm(null)
    pending?.run()
  }

  const runExecution = () => {
    if (submittingRef.current) return // 防双击：连点只产生一次提交
    if (unsettledExecution) {
      const message =
        t('本次执行的结算尚未确认，已锁定重试。系统正在核对执行结果，无需重复操作；核对完成或自动退回后这里会解锁。')
      setRefundNotice(message)
      setRefundNoticeTone('warning')
      notify({ title: t('执行已锁定，正在核对结算'), description: message, dedupeKey: 'execution-start-locked' })
      return
    }
    // C3 收口（批次闭环方案 §3.1）：全部语言只走 runV3BatchFlow 批次主链。
    // sequential 逐语言计费路径已从生产移除——语言循环发生在批次流内部，
    // 共享一次预留、一个目录、一份报告，不再产生 N 个独立计费身份。
    submittingRef.current = true
    activeV15CompletionRef.current = null
    onExecutionAuthorized(false)
    transitionExecState('execution_running')
    notify({
      title: t('已开始执行'),
      description: t('{value0} 种语言将依次在本机生成，请保持页面打开、Photoshop 可用。', { value0: String(useBatchChain ? allLanguages.length : 1) }),
      dedupeKey: 'batch-start',
    })
    setErrorMsg(null)
    setExecutionErrorCode(null)
    setReport(null)
    setReportJson(null)
    setReportHtml(null)
    setUnproducedReport(null)
    setLocalReportStatus(v15ExecutionEnabled ? 'pending' : 'unknown')

    if (psState.adapterMode !== 'local_assistant') {
      submittingRef.current = false
      const message =
        t('当前是网页演示状态，不能启动 Photoshop、生成执行报价或计费。请返回上一步连接本地助手后重试。')
      transitionExecState('execution_failed')
      setErrorMsg(message)
      notify({ title: t('无法开始执行'), description: message, variant: 'destructive', dedupeKey: 'web-demo-blocked' })
      trackFunnelEvent('error', {
        currentStep: 'web_demo_execution_blocked',
        targetLanguageCode: targetLanguage,
        csvRowCount: parsed.rows.length,
        reviewRowCount: reviewRows.length,
        photoshopStatus: psState.status,
        errorCode: 'WEB_DEMO_EXECUTION_BLOCKED',
        errorStage: 'execute',
      })
      return
    }

    void runLocalAssistantExecution()
      .catch((e) => {
        if (e instanceof LocalAssistantRequestError && discardSubmissionRecoveryFor(e.code)) {
          clearExecutionRecovery()
        }
        if (e instanceof LocalAssistantRequestError) {
          if (e.compensationStatus === 'released') {
            setLastJobId(null)
            setUnsettledExecution(false)
            notifyCreditsChanged()
          } else if (e.compensationStatus === 'unknown' && e.jobId) {
            setLastJobId(e.jobId)
            setUnsettledExecution(true)
          } else if (e.compensationStatus === 'held' && e.jobId) {
            setLastJobId(e.jobId)
            setUnsettledExecution(true)
          }
        }
        if (!(e instanceof LocalAssistantRequestError && ['held', 'unknown'].includes(e.compensationStatus ?? ''))) {
          onExecutionAuthorized(false)
          setUnsettledExecution(false)
        } else {
          onExecutionAuthorized(true)
        }
        const message = e instanceof Error ? e.message : t('本地助手执行失败')
        // 2026-09-17 批次B：evidence 逐语言失败 → 收进恢复面板（未执行、未扣费），不走通用失败路径
        const perLanguageFailure =
          e instanceof EvidenceLanguageFailureError
            ? e.failures
            : e instanceof LocalAssistantRequestError &&
                e.code === 'BATCH_EVIDENCE_BINDING_FAILED' &&
                Array.isArray((e as LocalAssistantRequestError & { perLanguage?: unknown }).perLanguage)
              ? ((e as LocalAssistantRequestError & { perLanguage?: EvidenceLanguageFailure[] }).perLanguage ?? [])
              : null
        if (perLanguageFailure) {
          autoUploadSupportIfEnabled(buildSupportContent)
          transitionExecState('execution_failed')
          setExecutionErrorCode('BATCH_EVIDENCE_BINDING_FAILED')
          setErrorMsg(
            perLanguageFailure.length > 0
              ? t('本批次有语言未通过绑定检查：本次未执行、未扣费。请按下方清单处理。')
              : t('批次绑定检查未通过：没有可用的语言绑定计划。本次未执行、未扣费。'),
          )
          trackFunnelEvent('error', {
            currentStep: 'local_assistant_failed',
            targetLanguageCode: targetLanguage,
            csvRowCount: parsed.rows.length,
            reviewRowCount: reviewRows.length,
            photoshopStatus: psState.status,
            errorCode: 'BATCH_EVIDENCE_BINDING_FAILED',
            errorStage: 'dispatch',
            errorMessageSafe:
              perLanguageFailure.length > 0
                ? summarizeEvidenceFailures(perLanguageFailure)
                : sanitizeFunnelErrorMessage(message),
          })
          return
        }
        autoUploadSupportIfEnabled(buildSupportContent)
        transitionExecState('execution_failed')
        // 2026-09-16：云端编排拒绝（BatchClientRequestError，如 attempt 创建 409）此前
        // 不在转发范围，真实码被折叠成 LOCAL_ASSISTANT_EXECUTE_FAILED（无法定案）。
        const failureCode =
          e instanceof LocalAssistantRequestError || e instanceof BatchClientRequestError ? e.code : null
        setExecutionErrorCode(
          e instanceof LocalAssistantRequestError ? e.code : null,
        )
        setErrorMsg(message)
        trackFunnelEvent('error', {
          currentStep: 'local_assistant_failed',
          targetLanguageCode: targetLanguage,
          csvRowCount: parsed.rows.length,
          reviewRowCount: reviewRows.length,
          photoshopStatus: psState.status,
          errorCode: funnelSafeErrorCode(failureCode),
          errorStage: 'execute',
          errorMessageSafe: sanitizeFunnelErrorMessage(message),
        })
      })
      .finally(async () => {
        // 批量模式（2026-10-16）：单语言 V15 链受理后即返回，本收尾必须等本格真实完成回执——
        // 否则会带着助手 busy 冲突推进下一格；成功判据用真实 completion（批量链用状态镜像 ref）。
        // 收尾期间不放行 submittingRef，防重挂载/双击造成双派发。
        if (isMultiDraft && onExperimentPsdComplete && multiPsdSelection) {
          const currentIdx = multiPsdSelection.entries.findIndex(
            e => e.masterPath === psdSelection?.masterPath
          )
          if (currentIdx >= 0) {
            let success = execStateRef.current !== 'execution_failed'
            const completionPromise = activeV15CompletionRef.current
            if (completionPromise) {
              activeV15CompletionRef.current = null
              try {
                const completion = await completionPromise
                success = completion !== null && completion.success === true
              } catch {
                success = false
              }
            }
            submittingRef.current = false
            onExperimentPsdComplete(currentIdx, success)
            return
          }
        }
        submittingRef.current = false
      })
  }

  // 实验模式：监听外部触发器，逐 PSD 复用现有 runExecution。
  // 2026-10-16 两点收口：①只认「触发器变化」——对账期间交付门关闭会把本组件卸载再挂回，
  // 重挂载时旧 trigger 仍在（>0），直接点火会带着上一格的身份误跑；②能力开关未落定
  // （serverExecutionEnabled=null）不点火——重挂载首帧 v15 门为 false，立即点火会误报
  // "安全执行链未启用"，把逐 PSD 编排在第一格停死（实测事故）。
  const lastExperimentTriggerRef = useRef(experimentTrigger ?? 0)
  useEffect(() => {
    const trigger = experimentTrigger ?? 0
    if (trigger <= 0) return
    if (trigger === lastExperimentTriggerRef.current) return
    if (serverExecutionEnabled === null) return
    lastExperimentTriggerRef.current = trigger
    runExecution()
  }, [experimentTrigger, serverExecutionEnabled])

  const resetExecution = () => {
    if (unsettledExecution) {
      // 结算未确认期间锁定重置：提示必须经 toast 全局可见，且不得指引到当前态不存在的退回按钮。
      // 文案按真实结算机制分流：批次有 15 分钟停滞收口；单语言任务核对窗口更长，
      // 不得对单语言承诺批次专属的时限（对抗式审查 #3）。
      const message = lastBatchId
        ? t('本次任务仍未完成结算，暂时不能重新执行或清空。系统正在核对执行结果：完成的部分正常扣减，未执行的部分会在批次停滞约 15 分钟后自动全额退回（服务端每 10 分钟核对一次，通常不超过 25 分钟）。')
        : t('本次任务仍未完成结算，暂时不能重新执行或清空。系统正在核对执行结果：完成的部分正常扣减，未执行的部分会在核对完成后自动退回，无需重复操作。')
      setRefundNotice(message)
      setRefundNoticeTone('warning')
      notify({ title: t('执行已锁定，正在核对结算'), description: message, dedupeKey: 'execution-reset-locked' })
      return
    }
    generationRef.current += 1 // 使在途回执失效，防串台
    clearExecutionRecovery()
    transitionExecState('idle')
    setReport(null)
    setReportJson(null)
    setReportHtml(null)
    setUnproducedReport(null)
    setLocalReportStatus('unknown')
    setOutputBaseName('')
    setOutputLocation(null)
    setLastOperationId(null)
    setLastAttemptId(null)
    setLastJobId(null)
    setLastBatchId(null)
    setUnsettledExecution(false)
    setOutputPathCopied(false)
    setErrorMsg(null)
    setExecutionErrorCode(null)
    setFeedbackSent(false)
    setFeedbackSubmitting(false)
    setFeedbackSubmitError(null)
    setFeedback({ ...EMPTY_FEEDBACK_STUDIO_RESPONSE })
    setPreparationNotice(
      psdSelection ? preExecutionNotice(psdSelection.summary) : null,
    )
    onExecutionAuthorized(false)
  }

  const submitFeedback = async () => {
    if (!feedbackStudioResponseComplete(feedback) || feedbackSubmitting) return
    setFeedbackSubmitting(true)
    setFeedbackSubmitError(null)
    const ok = await submitFunnelEvent('feedback_received', {
      feedbackDefinitionId: FEEDBACK_STUDIO_DEFINITION_ID,
      resultUsability: feedback.resultUsability,
      reviewIncrementalValue: feedback.reviewIncrementalValue,
      nextUseIntent: feedback.nextUseIntent,
      improvementText: feedback.improvementText.trim() || undefined,
      operationId: lastOperationId ?? undefined,
      jobId: lastJobId ?? undefined,
      attemptId: lastAttemptId ?? undefined,
      batchId: lastBatchId ?? undefined,
      currentStep: 'feedback_received',
    })
    setFeedbackSubmitting(false)
    if (ok) {
      setFeedbackSent(true)
    } else {
      setFeedbackSubmitError(t('反馈暂未提交成功，请检查网络后重试。不会影响已经生成的文件。'))
    }
  }

  const switchToCurrentLanguage = () => {
    // BATCH_BILLING_V3_REQUIRED 在计费挑战前抛出，此时切换不会遗留冻结批次。
    updateRunAllLanguages(false)
    resetExecution()
    setPreparationNotice(t('已切换为仅生成当前语言。'))
  }

  const running = execState === 'execution_running'
  const submitted = execState === 'execution_submitted'
  const completed = execState === 'execution_completed'
  const failed = execState === 'execution_failed'
  // 受理只是 Photoshop 后台执行的开始，不是一次执行的终态。
  // 在收到成功/失败回执前保持主按钮锁定，避免用户因按钮恢复原文而重复创建任务。
  const executionInFlight = running || submitted || unsettledExecution

  const downloadHtml = () => {
    if (!reportHtml || !outputBaseName) return
    downloadBlob(reportHtml, `${outputBaseName}.html`, 'text/html')
  }

  // W 补丁（纯展示）：下载「本次未产出」报告。由用户手势触发，不自动下载
  // （自动下载会被浏览器弹窗策略拦截，且会在非失败路径上意外触发）。
  const downloadUnproducedReport = () => {
    if (!unproducedReport) return
    downloadBlob(unproducedReport.html, unproducedReport.fileName, 'text/html')
  }

  const copyOutputPath = async () => {
    if (!outputLocation) return
    try {
      await navigator.clipboard.writeText(outputLocation.directory)
      setOutputPathCopied(true)
      window.setTimeout(() => setOutputPathCopied(false), 2000)
    } catch {
      setErrorMsg(t('无法自动复制，请手动复制：{directory}', { directory: String(outputLocation.directory) }))
    }
  }

  const chooseOutputDirectory = async () => {
    if (executionInFlight) return
    setSelectingOutputDirectory(true)
    setErrorMsg(null)
    try {
      const selected = await selectOutputDirectoryDirect()
      if (selected) {
        setCustomOutputDirectory(selected)
        setOutputLocation(null)
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : t('无法选择另存目录'))
    } finally {
      setSelectingOutputDirectory(false)
    }
  }

  // ===== 批量模式：多 PSD 编排面板（由视图决定，不再读全局开关）=====
  if (isMultiDraft && multiPsdSelection && multiDraftLanguageColumns) {
    const totalEntries = multiPsdSelection.entries.length
    const draftLanguages = (entry: MultiPsdEntry) =>
      multiDraftLanguageColumns[entry.masterPath] ?? []
    const totalCells = multiPsdSelection.entries.reduce(
      (sum, entry) => sum + draftLanguages(entry).length,
      0,
    )
    // v12 D1：范围指纹——列表、语言格数、覆盖率放行态任一变化即视为「范围变了」。
    const batchScopeSignature = `${multiPsdSelection.entries
      .map((entry) => entry.masterPath)
      .join('|')}##${totalCells}##${coverageBelowCells?.length ?? 0}##${coverageReleaseAck ? 1 : 0}`
    // 2026-10-16：口径收口到 psd-selection.isMultiPsdEntryScanned。
    // 原先此处各写一份 `state === 'prepared' && !!summary`，导致两处后果：
    //   ① 扫描成功但有检查项的 `needs_review` 被算成「未扫描」；
    //   ② 与 design-file-card 列表的计数不一致，用户看到两个不同的数。
    const preparedCount = getMultiPsdPreparedCount(multiPsdSelection)
    const unscanned = getMultiPsdUnscanned(multiPsdSelection)
    const ready = isMultiPsdSelectionReady(multiPsdSelection)
    const running = experimentRunning === true
    // #140/D5 覆盖率闸：低于阈值的格子必须显式放行才能开始（按钮禁用 + 视图侧再拦一道）。
    const coverageBelowCount = coverageBelowCells?.length ?? 0
    const coverageGateBlocked = coverageBelowCount > 0 && !coverageReleaseAck
    const lowestBelow =
      coverageBelowCount > 0
        ? coverageBelowCells!.reduce((a, b) => (b.coverage < a.coverage ? b : a))
        : null
    // 边界保护：运行中若列表被删短，experimentIndex 可能越界（否则会显示「第 4/3 个」）。
    const currentIdx = Math.min(
      Math.max(experimentIndex ?? 0, 0),
      Math.max(totalEntries - 1, 0),
    )
    const currentEntry = multiPsdSelection.entries[currentIdx]
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <Card className="p-6">
          <CardHeader className="px-0">
            <CardTitle>{t('多设计稿执行')}</CardTitle>
            <CardDescription>
              {preparedCount}/{totalEntries} {t('个设计稿已扫描 · 各按自己的语言表 · 共 ')}{totalCells} {t('格')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            {!ready && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">
                  {t('还有 ')}{unscanned.length} {t('个设计稿没有扫描完成，暂不能开始：')}</p>
                <p className="mt-1 font-mono">
                  {unscanned.map((entry) => basenameOf(entry.masterPath)).join('、')}
                </p>
                <p className="mt-1">
                  {t('请回到「准备素材」点「全部扫描」按顺序扫描（也可逐个点「扫描」），全部扫描完成后再开始。未扫描的稿不会被跳过，也不会被静默略过。')}</p>
              </div>
            )}

            {running && currentEntry && (
              <div className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                <span className="font-semibold">
                  {t('正在执行第 ')}{currentIdx + 1}/{totalEntries} {t('个设计稿')}</span>
                <span className="ml-2 font-mono">{basenameOf(currentEntry.masterPath)}</span>
                <p className="mt-1">{t('逐个串行执行，一个完成后自动开始下一个。')}</p>
                {coverageBelowCount > 0 && coverageReleaseAck && (
                  <p className="mt-1">
                    {t('覆盖率闸：本批执行前已显式放行（')}{coverageBelowCount} {t('格低于 ')}{COVERAGE_THRESHOLD}%）。
                  </p>
                )}
              </div>
            )}

            {coverageBelowCount > 0 && !running && (
              <div
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                role="status"
              >
                <p className="font-semibold">
                  {t('覆盖率低于 ')}{COVERAGE_THRESHOLD}{t('% 阈值：')}{coverageBelowCount} {t('格')}{lowestBelow
                    ? t('（最低 {coverage}%：{psdName} × {lang}）', { coverage: String(lowestBelow.coverage), psdName: String(lowestBelow.psdName), lang: String(lowestBelow.lang) })
                    : ''}
                </p>
                <p className="mt-1">
                  {t('部分译文覆盖率不足，请先在“准备素材”查看明细。若仍要生成，请勾选下方确认。')}</p>
                <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={coverageReleaseAck === true}
                    onChange={(e) => onCoverageReleaseChange?.(e.target.checked)}
                  />
                  {t('我已知晓覆盖率不足，仍要生成')}</label>
              </div>
            )}

            {experimentNotice && (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                {experimentNotice}
              </div>
            )}

            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{t('本批交付范围')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('按列表顺序逐份生成；每份只使用自己的译文表和已确认语言，完成后再开始下一份。')}</p>
              {/* 范围两列小表：三个数全部取既有派生（totalEntries／totalCells／estimatedCredits），不新算一套账 */}
              <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-8 gap-y-1 text-xs">
                <dt className="text-muted-foreground">{t('设计稿')}</dt>
                <dd className="text-right font-mono">{totalEntries} {t('份')}</dd>
                <dt className="text-muted-foreground">{t('语言格')}</dt>
                <dd className="text-right font-mono">{totalCells} {t('格')}</dd>
                <dt className="font-semibold">{t('预计')}</dt>
                <dd className="text-right font-mono font-semibold">
                  {estimatedCredits === null ? t('待报价') : `${estimatedCredits} ${t('积分')}`}
                </dd>
              </dl>
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {multiPsdSelection.entries.map((entry, entryIndex) => {
                  const languages = draftLanguages(entry)
                  const executionStatus = running
                    ? entryIndex < currentIdx
                      ? t('已完成')
                      : entryIndex === currentIdx
                        ? t('正在生成')
                        : t('等待处理')
                    : null
                  return (
                    <li
                      key={entry.masterPath}
                      aria-current={running && entryIndex === currentIdx ? 'step' : undefined}
                      className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-xs ${running && entryIndex === currentIdx ? 'bg-sky-50 dark:bg-sky-950/40' : ''}`}
                    >
                      <span className="font-mono">{basenameOf(entry.masterPath)}</span>
                      <span className="text-muted-foreground">
                        {languages.length > 0 ? t('{length} 语言', { length: String(languages.length) }) : t('未选语言')}
                      </span>
                      {languages.length > 0 && (
                        <span className="text-muted-foreground">
                          {languages.map(formatLanguageCode).join(' · ')}
                        </span>
                      )}
                      {executionStatus && (
                        <span className="ml-auto rounded-full border px-2 py-0.5 font-semibold" role="status">
                          {executionStatus}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!batchExecutionReady && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" role="status">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t('本次批量执行尚未就绪：')}{batchCapability?.message ? t(batchCapability.message) : t('正在检查批量执行条件')}
                    {batchCapability?.nextAction ? ` ${t(batchCapability.nextAction)}` : ''}
                    <AssistantDownloadLink reasonCode={batchCapability?.reasonCode} />
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!ready || running || !v15ExecutionEnabled || coverageGateBlocked || !batchExecutionReady || unitCapBlocked}
                  title={!v15ExecutionEnabled ? t('当前测试环境仅开放 Web 功能，真实执行暂未开放。') : unitCapBlocked ? unitCapHint : undefined}
                  onClick={() =>
                    setScopeConfirm({
                      kind: 'batch',
                      signature: batchScopeSignature,
                      title: t('确认开始这一批'),
                      description: t('确认之前不会冻结积分，也不会写任何文件。'),
                      lines: [
                        { label: t('范围'), value: t('本批 {count} 个设计稿，按列表顺序逐份执行', { count: totalEntries }) },
                        { label: t('语言'), value: t('共 {count} 个语言格（每稿只用该稿自己的表）', { count: totalCells }) },
                        {
                          label: t('文件名'),
                          value: t('各稿按自己的名字生成（多语言自动加 __<N>-languages 后缀）'),
                        },
                        {
                          label: t('保存位置'),
                          value:
                            customOutputDirectory ||
                            t('各稿源目录下自动建 <稿名>_ALL_<语言数>LANG__时间戳 子文件夹'),
                        },
                        {
                          label: t('费用'),
                          value: t('按各稿行数在受理时报价并冻结；未执行部分自动核对退回'),
                        },
                        {
                          label: t('失败处理'),
                          value: t('某稿对账失败或生成门未开即暂停并告知，不会静默跳过后续'),
                        },
                      ],
                      confirmLabel: t('确认并开始（本批 {totalEntries} 份）', { totalEntries: String(totalEntries) }),
                      run: () => onExperimentStart?.(),
                    })
                  }
                >
                  {running
                    ? t('执行中…（第 {value0}/{totalEntries} 个）', { value0: String(currentIdx + 1), totalEntries: String(totalEntries) })
                    : t('开始执行（本批 {totalEntries} 份 · 逐份）', { totalEntries: String(totalEntries) })}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <ExecutionScopeDialog
          open={scopeConfirm?.kind === 'batch'}
          onOpenChange={(open) => {
            if (!open) setScopeConfirm(null)
          }}
          title={scopeConfirm?.title ?? t('确认开始这一批')}
          description={scopeConfirm?.description ?? ''}
          lines={scopeConfirm?.lines ?? []}
          confirmLabel={scopeConfirm?.confirmLabel ?? t('确认并开始')}
          stale={scopeConfirm ? scopeConfirm.signature !== batchScopeSignature : false}
          onConfirm={confirmScope}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6">
        <CardHeader className="px-0">
          <CardTitle>{copy.execStepTitle}</CardTitle>
          <CardDescription>
            {copy.execStepDesc}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 space-y-4">
          {/* Web 演示模式说明（已连接本地助手时不显示任何提示条——用户要求） */}
          {psState.adapterMode !== 'local_assistant' && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{copy.execDemoNoPs}</span>
              </div>
            </div>
          )}

          {/* V1.5 执行前新鲜度提示（预扫描只作提示） */}
          {preparationNotice && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-300/60 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{preparationNotice}</span>
            </div>
          )}

          <div className="rounded-lg border bg-card p-4">
            <label htmlFor="project-output-name" className="mb-2 block text-sm font-semibold">
              {copy.execProjectLabel}
            </label>
            <p className="mb-3 text-xs text-muted-foreground">
              {copy.execProjectHint}
            </p>
            <Input
              id="project-output-name"
              value={customOutputName}
              maxLength={120}
              onChange={(e) => setCustomOutputName(e.target.value)}
              placeholder={resolveOutputBaseName('', safeOutputName((psState.documentName || 'PSD').replace(/\.psd?$/i, '')) || 'PSD')}
              disabled={executionInFlight}
            />
          </div>

          {v15ExecutionEnabled && psdSelection?.masterPath && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{copy.execSaveLocationShortLabel}</span>
                <span className="min-w-0 truncate text-right font-mono text-xs">
                  {customOutputDirectory ? customOutputDirectory : copy.execSaveDefault}
                </span>
                <div className="flex shrink-0 gap-2">
                  {customOutputDirectory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={executionInFlight || selectingOutputDirectory}
                      onClick={() => {
                        setCustomOutputDirectory(null)
                        setOutputLocation(null)
                      }}
                    >
                      {copy.execRestoreDefault}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={executionInFlight || selectingOutputDirectory}
                    onClick={() => void chooseOutputDirectory()}
                  >
                    {selectingOutputDirectory ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FolderOpen className="h-3.5 w-3.5" />
                    )}
                    {copy.execSaveTo}
                  </Button>
                </div>
              </div>
              {selectingOutputDirectory && (
                <p className="mt-2 text-xs font-semibold text-foreground" role="status" aria-live="polite">
                  {copy.execOpeningFolderPicker}
                </p>
              )}
            </div>
          )}

          {/* 批量执行模式选择（多语言表专属） */}
          {isMultiLang && execState === 'idle' && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{copy.execScopeLabel}</span>
                <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={runAllLanguages ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => updateRunAllLanguages(false)}
                  className={
                    !runAllLanguages
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : ''
                  }
                >
                  {fillCopy(copy.execScopeCurrentOnly, { lang: formatLanguageCode(targetLanguage) })}
                </Button>
                <Button
                  type="button"
                  variant={runAllLanguages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateRunAllLanguages(true)}
                  className={
                    runAllLanguages
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : ''
                  }
                  title={batchExecutionReady ? copy.execScopeAllOnceHint : batchCapability?.message ? t(batchCapability.message) : t('正在检查批量执行条件')}
                >
                  {fillCopy(copy.execScopeAllN, { count: allLanguages.length })}
                </Button>
                </div>
              </div>

              {batchCapability && !batchExecutionReady && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100" role="status">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t('本次批量执行尚未就绪：')}{t(batchCapability.message)} {t(batchCapability.nextAction)}
                    <AssistantDownloadLink reasonCode={batchCapability.reasonCode} />
                  </span>
                </div>
              )}

              {runAllLanguages && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1.5 max-sm:grid-cols-3">
                    {batchSummary.map((s) => (
                      <span
                        key={s.lang}
                        className={
                          'rounded-md border px-2 py-1 font-mono text-xs ' +
                          (s.empty > 0
                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200')
                        }
                        title={s.empty > 0 ? fillCopy(copy.execEmptyHint, { count: s.empty }) : copy.execAllTranslated}
                      >
                        {formatLanguageCode(s.lang)} {s.rowCount} {t('行')}{s.empty > 0 ? t(' · {empty} 空', { empty: String(s.empty) }) : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {copy.execPhotoshopWillGenerate}
                  </p>
                  <details className="group overflow-hidden rounded-md border border-sky-200 bg-sky-50/70 text-xs text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
                    {/* 折叠不得删报：语言数与标准单位原句保留在展开体内，报价口径同源不变 → src/lib/workbench/billing-preview.ts */}
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
                      <span>
                        {estimatedCredits === null
                          ? unitCapHint
                          : t('预计花 {estimatedCredits} 积分（成功后按实际扣，失败自动退回）', { estimatedCredits: String(estimatedCredits) })}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-sky-700 dark:text-sky-300">
                        {copy.execViewBillingDetail}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </span>
                    </summary>
                    <div className="border-t border-sky-200 px-3 py-2 dark:border-sky-800">
                      {/* 折叠不得删报：原「语言数 · 标准单位 · 预计冻结」口径行原样留在这里 → src/lib/workbench/billing-preview.ts */}
                      <p className="mb-1 text-sky-800 dark:text-sky-200">
                        {fillCopy(copy.execBillingSummary, { count: allLanguages.length, units: batchBillingPreview.totalStandardUnits, credits: estimatedCredits ?? '—' })}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono">
                        {allLanguages.map((languageCode) => (
                          <span key={languageCode}>
                            {formatLanguageCode(languageCode)} {batchBillingPreview.standardUnitsByLanguage[languageCode] ?? 0} {t('单位')}</span>
                        ))}
                      </div>
                      {/* 折叠不得删报：折起来时参与计价的行、不计价的行与各自原因仍原样留在这里 → 同屏展开 */}
                      <details className="mt-2 rounded border border-sky-200/80 px-2 py-1.5 dark:border-sky-800">
                        <summary className="cursor-pointer text-sky-700 dark:text-sky-300">
                          {t('逐行推导（共 {total} 行：参与计价 {billable} 行 · 不计价 {excluded} 行）', {
                            total: String(rowDerivation.rows.length),
                            billable: String(rowDerivation.billableRowCount),
                            excluded: String(rowDerivation.excludedRowCount),
                          })}
                        </summary>
                        <div className="mt-2 space-y-2">
                          <p className="text-sky-800 dark:text-sky-200">
                            {t('标准行＝一行按 200 字符折算：不超过 200 字符算 1 个标准行，超出的部分每满 200 字符加 1 个；各语言分别折算后相加，单行单语言最多按 15 个标准行计。')}
                          </p>
                          {[
                            {
                              key: 'billable',
                              label: t('参与计价 {billable} 行', { billable: String(rowDerivation.billableRowCount) }),
                              rows: rowDerivation.rows.filter((row) => row.exclusionReason === null),
                            },
                            {
                              key: 'excluded',
                              label: t('不替换也不计费 {excluded} 行', { excluded: String(rowDerivation.excludedRowCount) }),
                              rows: rowDerivation.rows.filter((row) => row.exclusionReason !== null),
                            },
                          ].map((group) => (
                            <div key={group.key}>
                              <p className="mb-1 font-medium text-sky-800 dark:text-sky-200">{group.label}</p>
                              <table className="w-full border-collapse font-mono text-[11px]">
                                <thead>
                                  <tr className="text-left text-sky-700 dark:text-sky-300">
                                    <th className="py-0.5 pr-2 font-medium">{t('行号')}</th>
                                    <th className="py-0.5 pr-2 font-medium">{t('原文字符')}</th>
                                    <th className="py-0.5 pr-2 font-medium">{t('译文字符')}</th>
                                    <th className="py-0.5 pr-2 font-medium">{t('计费字符')}</th>
                                    <th className="py-0.5 pr-2 font-medium">{t('标准行')}</th>
                                    <th className="py-0.5 font-medium">{t('不计价原因')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.rows.map((row) => (
                                    <tr key={row.rowNumber} className="border-t border-sky-200/60 dark:border-sky-800/60">
                                      <td className="py-0.5 pr-2">{row.rowNumber}</td>
                                      <td className="py-0.5 pr-2">{row.sourceCharacters}</td>
                                      <td className="py-0.5 pr-2">{derivationFormat(row.targetCharactersByLanguage)}</td>
                                      <td className="py-0.5 pr-2">{derivationFormat(row.billingCharactersByLanguage)}</td>
                                      <td className="py-0.5 pr-2">
                                        {derivationSingleLanguage
                                          ? row.standardUnitsTotal
                                          : `${derivationFormat(row.standardUnitsByLanguage)} ＝ ${row.standardUnitsTotal}`}
                                      </td>
                                      <td className="py-0.5 font-sans">
                                        {row.exclusionReason ? derivationReasonCopy[row.exclusionReason] : ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                          <p className="font-mono text-sky-800 dark:text-sky-200">
                            {t('合计 {units} 个标准行单位', { units: String(batchBillingPreview.totalStandardUnits) })}
                          </p>
                        </div>
                      </details>
                      <p className="mt-1 text-sky-800 dark:text-sky-200">{copy.execBillingAuthorityNote}</p>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
          {execState === 'idle' && serverExecutionEnabled === false && (
            <div className="flex items-start gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 text-xs font-medium text-sky-900 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100" role="status">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('当前测试环境仅开放 Web 功能，真实执行暂未开放；不会创建执行尝试、冻结或结算积分。')}</span>
            </div>
          )}

          {execState === 'idle' && !(
            // T-0062 去重：批量模式下上方已展示每语言行数 chips、合计冻结与
            // 可展开计费明细，这两行信息完全重复，仅在单语言/非批量路径保留。
            isMultiLang && runAllLanguages
          ) && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{copy.execLanguageRowsLabel}</span>
                <span className="text-right text-xs">
                  {isMultiLang
                    ? batchSummary.map((item) => `${formatLanguageCode(item.lang)} ${item.rowCount}`).join(' · ')
                    : `${formatLanguageCode(targetLanguage)} ${parsed.rows.length}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{t('预计费用')}</span>
                <span className="text-xs">
                  {estimatedCredits === null ? (
                    unitCapHint
                  ) : (
                    <>
                      <b className="font-mono">{estimatedCredits}</b> {t('积分 · 失败自动退回')}</>
                  )}
                </span>
              </div>
              {/* 报价口径告知：这些行不会发生替换，因此没进报价（与单语链报价作用域同源）。 */}
              {!useBatchChain && singleRunScope.scope.excludedRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('其中 ')}{singleRunScope.scope.excludedRows.length} {t('行在设计稿里找不到对应文字，或已被你忽略， 不替换也不计费；本次只对能真正替换的行收费。')}</p>
              )}
              {psState.adapterMode === 'local_assistant' && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {isMultiLang && runAllLanguages
                    ? fillCopy(copy.execReadyStatusAll, { count: allLanguages.length })
                    : copy.execReadyStatusSingle}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {execState === 'idle' && psState.adapterMode !== 'local_assistant' && copy.execNotExecuted}
              {/* P-13：执行中如实计时（长任务动辄数分钟），不给时间承诺。 */}
              {running && (
                <>
                  {copy.execRunning} <ElapsedSeconds />
                </>
              )}
              {submitted && copy.execSubmittedWithPath}
              {completed && (v15ExecutionEnabled
                ? localReportStatus === 'generated'
                  ? copy.execDoneWithReport
                  : copy.execDoneNoReport
                : copy.execDoneDownloadable)}
              {failed && copy.execFailedNote}
            </div>
            <div className="flex items-center gap-2">
              {completed && v15ExecutionEnabled && localReportStatus === 'failed' && lastAttemptId && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={retryingReport}
                  onClick={() => void retryLocalReport()}
                  className="h-10"
                >
                  {retryingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {copy.execRebuildReport}
                </Button>
              )}
              {(completed || failed) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetExecution}
                  className="h-10"
                  title={t('清空本轮执行状态，保留素材与表格')}
                >
                  <RotateCcw className="h-4 w-4" />
                  {copy.execRetry}
                </Button>
              )}
              {!completed && !failed && (
                <Button
                  type="button"
                  onClick={() =>
                    setScopeConfirm({
                      kind: 'single',
                      signature: singleScopeSignature,
                      title: t('确认开始执行'),
                      description: t('确认之前不会冻结积分，也不会写任何文件。'),
                      lines: [
                        {
                          label: t('设计稿'),
                          value: psdSelection ? basenameOf(psdSelection.masterPath) : t('当前设计稿'),
                          mono: true,
                        },
                        {
                          label: t('语言'),
                          value: t('{count} 个：{list}', { count: allLanguages.length, list: allLanguages.map(formatLanguageCode).join(' · ') }),
                        },
                        { label: t('替换行数'), value: t('{count} 行', { count: parsed.rows.length }) },
                        {
                          label: t('文件名'),
                          // 与真实产物一致：多语言时提交的是 `<base>__<N>-languages`（execute-step.tsx:1594 附近）
                          value:
                            allLanguages.length > 1
                              ? `${scopeOutputBaseName}__${allLanguages.length}-languages`
                              : scopeOutputBaseName,
                          mono: true,
                        },
                        {
                          label: t('保存位置'),
                          value:
                            customOutputDirectory ||
                            (useBatchChain
                              ? t('与设计稿同目录（自动建 <稿名>_ALL_<语言数>LANG__时间戳 子文件夹）')
                              : t('与设计稿同目录（自动建 <稿名>__时间戳 子文件夹；可点「选择输出目录」改）')),
                        },
                        {
                          label: t('预计费用'),
                          value:
                            (estimatedCredits ?? 0) > 0
                              ? t('{estimatedCredits} 积分（按实际交付结算，失败自动退回）', { estimatedCredits: String(estimatedCredits) })
                              : t('按受理时报价并冻结（此处无预估）'),
                        },
                      ],
                      confirmLabel: t('确认并开始'),
                      run: runExecution,
                    })
                  }
                  disabled={executionInFlight || !v15ExecutionEnabled || unitCapBlocked}
                  title={!v15ExecutionEnabled ? t('当前测试环境仅开放 Web 功能，真实执行暂未开放。') : unitCapBlocked ? unitCapHint : undefined}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-5"
                >
                  {executionInFlight ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {submitted ? copy.execSubmittedWaiting : copy.execSubmittingGeneric}
                      {/* V1-2 冻结可视化：报价在受理时真实冻结，让「钱在哪」随时可查而非一把锁。 */}
                      {estimatedCredits !== null && (
                        <span className="ml-1 font-normal opacity-90">{t('· 已冻结约 ')}{estimatedCredits} {t('积分')}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      {isMultiLang && runAllLanguages
                        ? fillCopy(copy.execStartN, { count: allLanguages.length })
                        : copy.execStartSingle}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

{/* 失败提示 */}
          {failed && errorMsg && (
              <Alert variant="destructive" className="border-2">
                <XCircle className="h-4 w-4" />
                <AlertTitle>
                  {executionErrorCode === 'BATCH_BILLING_V3_REQUIRED'
                    ? copy.execFailNotStarted
                    : copy.execFailTitle}
                </AlertTitle>
                <AlertDescription>
                  {/* P-06：正文不出现裸编号；原始编号放 title 供排障（悬停可见）。 */}
                  <p title={executionErrorCode ? t('原始编号：{executionErrorCode}', { executionErrorCode: String(executionErrorCode) }) : undefined}>
                    {errorMsg}
                  </p>
                  {executionErrorCode === 'BATCH_BILLING_V3_REQUIRED' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={switchToCurrentLanguage}
                      className="mt-1 bg-background"
                    >
                      {copy.execSwitchToCurrent}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSupportDialogOpen(true)}
                    className="mt-1 ml-2 bg-background"
                  >
                    {t('上传排查信息')}</Button>
                </AlertDescription>
              </Alert>
            )}

          {/* W 补丁（2026-10-12，纯展示层新增）：「本次未产出」报告下载。
              独立成块，不复用上面的失败提示——那条要求 errorMsg 非空，而批次路径不写 errorMsg。 */}
          {failed && unproducedReport && (
            <div className="rounded-lg border-2 border-destructive/60 bg-destructive/5 px-3 py-2.5 text-xs">
              <p className="font-semibold">{t('本次未产出任何文件')}</p>
              <p className="mt-1 text-muted-foreground">
                {t('计划交付目录：')}<span className="font-mono break-all">{unproducedReport.outputDirectory}</span>
                　{t('其中 0 个文件、无报告。本报告由网页端生成，未调用 Photoshop。')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadUnproducedReport}
                className="mt-2 bg-background"
              >
                <FileText className="h-4 w-4" />
                {t('下载「本次未产出」执行报告')}</Button>
            </div>
          )}

          {failed && evidenceFailures && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">{t('以下语言未通过绑定检查（本次未执行、未扣费）：')}</p>
              <ul className="mt-1.5 space-y-1">
                {evidenceFailures.map((item) => (
                  <li key={`${item.language}:${item.code}`}>
                    <span title={t('原始编号：{code}', { code: String(item.code) })}>
                      {formatLanguageCode(item.language)} — {evidenceFailureMessage(item.code)}
                    </span>
                  </li>
                ))}
              </ul>
              {evidenceFailures.length === 0 && (
                <p className="mt-1.5">{t('没有可用的语言绑定计划：请先回到检查步骤确认绑定，或换用与当前设计稿匹配的表格。')}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-background"
                  onClick={() => {
                    onEvidenceRecoveryRecheck()
                    setEvidenceFailures(null)
                  }}
                >
                  {t('清空确认并')}{WB_ACTIONS.recheck.label}
                </Button>
                {evidenceFailures.length > 0 &&
                  evidenceFailures.length < (selectedLanguages?.length ?? 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-background"
                      onClick={() => {
                        onEvidenceRecoveryExcludeLanguages(evidenceFailures.map((item) => item.language))
                        setEvidenceFailures(null)
                      }}
                    >
                      {t('暂不执行这些语言')}</Button>
                  )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setEvidenceFailures(null)}>
                  {t('知道了')}</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-background"
                  onClick={() => setSupportDialogOpen(true)}
                >
                  {t('上传排查信息')}</Button>
              </div>
            </div>
          )}

          <SupportUploadDialog
            open={supportDialogOpen}
            onOpenChange={setSupportDialogOpen}
            buildContent={buildSupportContent}
          />

          {failed && unsettledExecution && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('本次任务仍未确认结算，重试、')}{WB_ACTIONS.rescan.label}{t('和清空已锁定；系统正在核对执行结果：完成的部分正常扣减，未执行的部分核对完成后自动退回，无需重复操作。')}</span>
            </div>
          )}

          {/* 失败后退回积分：无回执任务默认冻结至宽限窗口，提供立即退回入口（对抗式审查修复） */}
          {/* 批次结果面板：完成/失败后展示逐语言终态；执行锁期间 live 轮询逐语言进度（V1-3）。 */}
          {lastBatchId && (
            <BatchResultPanel batchId={lastBatchId} live={executionInFlight} />
          )}
          {failed && lastJobId && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <span>
                {copy.execRefundPrompt}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={refunding}
                onClick={() => void cancelRefund()}
              >
                {refunding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
                {copy.execRefundButton}
              </Button>
            </div>
          )}
          {refundNotice && (
            <p
              role="status"
              className={
                'rounded-lg border px-3 py-2 text-xs ' +
                (refundNoticeTone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                  : refundNoticeTone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200')
              }
            >
              {refundNotice}
            </p>
          )}

          {/* 结果摘要 */}
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold">
                    {psState.adapterMode === 'local_assistant'
                      ? completed
                        ? copy.execResultFileGenerated
                        : copy.execResultSubmitted
                      : copy.execResultSummary}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {formatLanguageCode(report.targetLanguageCode)}
                  </Badge>
                </div>
                {psState.adapterMode === 'local_assistant' ? (
                  <div className="space-y-3 text-sm">
                    <p className="leading-relaxed text-muted-foreground">
                      {completed
                        ? copy.execResultReopenDone
                        : copy.execResultExecuting}
                    </p>
                    {outputLocation && (
                      <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <div>
                          <div className="mb-1 font-semibold">{copy.execOutputDirLabel}</div>
                          <div className="break-all font-mono leading-relaxed">
                            {outputLocation.directory}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 font-semibold">{copy.execOutputFilesLabel}</div>
                          <div className="break-all font-mono leading-relaxed">
                            {outputLocation.filePath}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copyOutputPath}
                          className="bg-background"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {outputPathCopied ? copy.execPathCopied : copy.execCopyPath}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatCell label={t('命中数量')} value={report.matchedCount} tone="emerald" />
                      <StatCell label={t('表里多出的行')} value={report.unmatchedCount} tone="amber" />
                      <StatCell label={t('警告数量')} value={report.warningCount} tone="amber" />
                      <StatCell
                        label={t('错误数量')}
                        value={report.errorCount}
                        tone={report.errorCount > 0 ? 'rose' : 'emerald'}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>
                        {t('开始时间：')}<span className="font-mono">{report.startedAt}</span>
                      </div>
                      <div>
                        {t('完成时间：')}<span className="font-mono">{report.finishedAt}</span>
                      </div>
                      <div className="sm:col-span-2">
                        {t('输出文件名：')}<span className="font-mono">{report.outputFileName}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 下载按钮 */}
              {reportHtml && psState.adapterMode !== 'local_assistant' && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {t('HTML 报告已生成（不含本地路径）')}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={downloadHtml}
                      className="bg-teal-600 text-white hover:bg-teal-700 h-10"
                    >
                      <FileText className="h-4 w-4" />
                      {t('下载 HTML 报告')}</Button>
                  </div>
                </div>
              )}

              {/* 表里多出的行 */}
              {report.unmatchedItems.length > 0 && (
                <div className="rounded-lg border">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                    <Flag className="h-3.5 w-3.5" />
                    {t('表里多出的行（')}{report.unmatchedItems.length}{t('）— 需人工复查')}</div>
                  <div className="max-h-72 overflow-y-auto workbench-scroll">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                        <tr>
                          <th className="w-12 p-2 text-left font-medium text-muted-foreground">
                            #
                          </th>
                          <th className="p-2 text-left font-medium text-muted-foreground min-w-[160px]">
                            {t('原文')}</th>
                          <th className="p-2 text-left font-medium text-muted-foreground min-w-[200px]">
                            {t('译文')}</th>
                          <th className="p-2 text-left font-medium text-muted-foreground">
                            {t('原因')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.unmatchedItems.map((u) => (
                          <tr key={u.rowIndex} className="border-t">
                            <td className="p-2 text-muted-foreground">
                              {u.rowIndex}
                            </td>
                            <td className="p-2 align-top">
                              <span className="whitespace-pre-wrap break-all">
                                {u.sourceText || t('(空)')}
                              </span>
                            </td>
                            <td className="p-2 align-top">
                              <span className="whitespace-pre-wrap break-all">
                                {u.translatedText || t('(空)')}
                              </span>
                            </td>
                            <td className="p-2 align-top">
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {u.reason}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 警告列表 */}
              {psState.adapterMode !== 'local_assistant' && report.warnings.length > 0 && (
                <div className="rounded-lg border">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('警告（')}{report.warnings.length}）
                  </div>
                  <ul className="max-h-60 space-y-1 overflow-y-auto p-3 text-xs workbench-scroll">
                    {report.warnings.map((w, i) => (
                      <li key={i} className="flex flex-wrap items-start gap-2">
                        <span className="break-all">{w.message}</span>
                        {w.rowIndex != null && (
                          <span className="text-muted-foreground">
                            {t('(行 ')}{w.rowIndex})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                  {t('内测反馈')}</div>
                {psState.adapterMode === 'local_assistant' && !feedbackSent && (
                  <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                    {t('请先等待 Photoshop 完成，并打开本地 report 文件夹复查结果后再填写。')}</p>
                )}
                {feedbackSent ? (
                  <div className="text-sm text-emerald-700 dark:text-emerald-300">
                    {t('反馈已提交，感谢。后台会把你的判断与本次运行事实关联；只保存你主动填写的文字，不保存 PSD、表格、译文或报告正文。')}</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FeedbackSelect
                      label={t('这次生成结果离“可以交付”还有多远？')}
                      value={feedback.resultUsability}
                      options={[...RESULT_USABILITY_VALUES]}
                      onChange={(v) => setFeedback((p) => ({ ...p, resultUsability: v as ResultUsability }))}
                    />
                    <FeedbackSelect
                      label={t('智能检测这次真正帮到了你什么？')}
                      value={feedback.reviewIncrementalValue}
                      options={[...REVIEW_INCREMENTAL_VALUE_VALUES]}
                      onChange={(v) => setFeedback((p) => ({ ...p, reviewIncrementalValue: v as ReviewIncrementalValue }))}
                    />
                    <FeedbackSelect
                      label={t('明天有一个类似真实项目，你会怎么做？')}
                      value={feedback.nextUseIntent}
                      options={[...NEXT_USE_INTENT_VALUES]}
                      onChange={(v) => setFeedback((p) => ({ ...p, nextUseIntent: v as NextUseIntent }))}
                    />
                    <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                      <span>{t('如果只能改一个地方，什么最能让你下次更愿意使用？（可选）')}</span>
                      <Textarea
                        value={feedback.improvementText}
                        onChange={(event) => setFeedback((p) => ({ ...p, improvementText: event.target.value.slice(0, 600) }))}
                        rows={3}
                        maxLength={600}
                        placeholder={t('例如：日语标题的字号还是偏大，希望少一点人工调整。')}
                      />
                      <span className="block text-right text-[11px]">{feedback.improvementText.length}/600</span>
                    </label>
                    {feedbackSubmitError && (
                      <div className="sm:col-span-2 text-xs text-rose-600 dark:text-rose-400">
                        {feedbackSubmitError}
                      </div>
                    )}
                    <div className="sm:col-span-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {t('跑通状态、耗时、Photoshop 状态等由系统自动关联，不再重复询问。')}</p>
                      <Button
                        onClick={() => void submitFeedback()}
                        variant="outline"
                        className="h-10 shrink-0"
                        disabled={!feedbackStudioResponseComplete(feedback) || feedbackSubmitting}
                        title={!feedbackStudioResponseComplete(feedback) ? t('请先完成上方全部选择项') : undefined}
                      >
                        {feedbackSubmitting ? t('提交中…') : t('提交反馈')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 错误列表 */}
              {report.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>{t('执行错误（')}{report.errors.length}）</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {report.errors.map((e, i) => (
                        <li key={i}>{e.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="px-0 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            className="h-10"
            disabled={running}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.execFooterPrev}
          </Button>
          {(completed || failed || lastBatchId) && (
            <Button
              variant="ghost"
              onClick={onReset}
              className={
                'h-10 ' +
                (resetConfirming ? 'font-semibold text-rose-700 dark:text-rose-400' : 'text-muted-foreground')
              }
              disabled={running}
              title={t('清空素材、译文表、扫描结果与全部决定，回到第 1 步；不删除本机文件，不动积分')}
            >
              <RefreshCw className="h-4 w-4" />
              {resetConfirming ? t('再点一次确认重置') : copy.execFooterReset}
            </Button>
          )}
        </CardFooter>
      </Card>
      <ExecutionScopeDialog
        open={scopeConfirm?.kind === 'single'}
        onOpenChange={(open) => {
          if (!open) setScopeConfirm(null)
        }}
        title={scopeConfirm?.title ?? t('确认开始执行')}
        description={scopeConfirm?.description ?? ''}
        lines={scopeConfirm?.lines ?? []}
        confirmLabel={scopeConfirm?.confirmLabel ?? t('确认并开始')}
        stale={scopeConfirm ? scopeConfirm.signature !== singleScopeSignature : false}
        onConfirm={confirmScope}
      />
    </motion.div>
  )
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'rose'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-rose-700 dark:text-rose-400'
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={'mt-1 text-xl font-bold ' + toneClass}>{value}</p>
    </div>
  )
}

function FeedbackSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const labels: Record<string, string> = {
    direct_delivery: t('可以直接交付'),
    minor_adjustment: t('少量调整后可以交付'),
    major_rework: t('需要较多人工调整'),
    unusable: t('基本不可用'),
    found_missed_issue: t('发现了我原本可能漏掉的问题'),
    increased_confidence: t('帮我确认结果，可以更放心继续'),
    no_special_value: t('没发现特别有价值的问题'),
    too_many_false_positives: t('误报/提示过多，增加了判断'),
    direct_use: t('直接用图译工坊'),
    use_with_review: t('会用，但会重点人工检查'),
    depends_on_importance: t('看项目重要程度再决定'),
    prefer_manual: t('更愿意用原来的人工流程'),
    not_now: t('暂时不会再用'),
    completed: t('跑通了，可以继续用'),
    completed_with_rework: t('跑通了，但需要较多人工修正'),
    failed: t('没跑通'),
    helpful: t('有帮助'), neutral: t('一般'), difficult: t('操作麻烦'), unclear: t('看不懂'),
    yes: t('会'), maybe: t('可能会'), no: t('不会'),
    per_project: t('按项目付费'), monthly: t('按月付费'), team: t('团队版'),
    trial_only: t('暂时只想免费体验'), unsure: t('还不确定'),
    none: t('没有明显问题'), photoshop_connection: t('Photoshop / 助手连接'),
    ocr_quality: t('OCR 识别质量'), review_workflow: t('智能检测流程'),
    replacement_result: t('替换结果'), report_clarity: t('报告易读性'),
    performance: t('速度或稳定性'), other_structured: t('其他分类'),
  }
  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        <option value="">{t('请选择')}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  )
}
