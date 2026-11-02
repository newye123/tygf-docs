'use client'
import { t } from '@/lib/i18n/t'

// 第 1 步「准备素材」的壳（2026-10-24 照 2026-10-21 模拟整体换装，多稿第 1 步重排 P2）。
//
// 视觉基准：10/20 交付物矩阵与归属切片模拟稿；10/24 能力清单作为换壳不丢能力的验收尺。
// 与执行工单 §4（能力清单 ①–⑬ 是换壳不丢能力的验收尺）。
//
// 默认先展示逐稿交付矩阵；其余工作视图复用单稿组卡、译文来源矩阵和表册详情。
// 扫描、范围确认与四阶段操作沿用现有控件和门禁；详情与译文表按需进入。
// 没有 groupBindings（旧调用方／单测）时保留原来的双栏能力，不硬塞中栏。
// 没有 groupBindings（旧调用方／单测）时退回原来的「左稿 ＋ 右矩阵」两栏，不硬塞中栏。
//
// 这一层只做展示与选择：
// - 归属判据全部来自 sku-attribution.ts；矩阵格状态机来自 table-inventory.ts（P0 纯函数）；
// - 覆盖率来自 coverage.ts 的 calcCoverageMatrixForDraftTables（与执行前闸同一份口径，
//   #190 铁律：算不出的格 coverage 传 null，不给数字不涂色）；
// - 读表、扫描、同名合并的编排在 workbench-view，组件只消费状态与回调。

import { useEffect, useMemo, useRef, useState } from 'react'

import type { ParsedCsv } from '@/lib/types'
import {
  createTableAllocation,
  moduleValuesOf,
  tableAllocationKey,
  type TableAllocation,
  type TableAllocationKind,
  type TableAllocationStore,
} from '@/lib/workbench/table-allocation'
import {
  LocalAssistantRequestError,
  surveyPreparationTables,
  type FolderScanResult,
} from '@/lib/workbench/local-assistant-client'
import {
  DELIVERABLE_LABEL,
  type AttributionPlan,
} from '@/lib/workbench/sku-attribution'
import { calcCoverageMatrixForDraftTables, type CoverageDraftLike } from '@/lib/workbench/coverage'
import { buildDraftDisplayLabels } from '@/lib/workbench/draft-display-labels'
import { CoverageMatrix } from './coverage-matrix'
import {
  EVIDENCE_ACTION,
  buildBindingEvidences,
  type BindingEvidence,
  type EvidenceTier,
} from '@/lib/workbench/binding-evidence'
import { evidenceLabel } from './evidence-label'
export { evidenceLabel } from './evidence-label'
import type { StageTableProbe, StageTableReadState } from '@/lib/workbench/stage-table-loader'
import type { StageGateResult } from '@/lib/workbench/stage-rows'
import { fillCopy, useSiteCopy } from '@/lib/workbench/site-copy'
import {
  buildTableInventory,
  deriveSourceMatrix,
  isTableFullyRead,
  normalizeTableId,
  planTableReadQueue,
  TRUNCATED_TABLE_ID,
  type SourceMatrixCell,
  type TableMetaInput,
  type TableRecord,
} from '@/lib/workbench/table-inventory'
import type { DraftGroupBinding, GroupLanguageSlot } from '@/lib/workbench/group-binding'
import type { GroupReject, GroupRejectReason } from '@/lib/workbench/table-grouping'
import { TableInventoryList } from './table-inventory-list'
import {
  StepGuide,
  StepHelp,
  hasSeenStep1Guide,
  type HelpItem,
} from './step-guide'

export interface StageScanState {
  running: boolean
  total: number
  done: number
  currentIndex: number | null
  scanningPath: string | null
  notice: { tone: 'ok' | 'warn' | 'error'; text: string } | null
}

export interface StageDuplicateAlert {
  key: string
  name: string
  count: number
  state: 'identical' | 'different' | 'unknown'
  members?: Array<{ masterPath: string; temporarilyRemoved: boolean }>
  canKeepOne?: boolean
  canRestore?: boolean
}

export interface Step1StageViewProps {
  root: string
  scan: FolderScanResult
  plan: AttributionPlan
  /** 稿 masterPath → 选中的表路径（自动配 + 记忆 + 人手选，合并后的一份） */
  choices: Record<string, string>
  /** 稿 masterPath → 这条选择是不是从记忆里带出来的 */
  remembered: Record<string, boolean>
  /** 稿 masterPath → 已读到的语言（没读表＝空数组） */
  languagesByDraft: Record<string, string[]>
  /** 被「一表一稿」去重撤掉选择的稿（记忆撞车），界面要说明 */
  droppedChoices: string[]
  /** 稿 masterPath → 读表状态 */
  readStates: Record<string, StageTableReadState>
  /** `${draftPath}::${tablePath}` → 冲突候选的结构摘要 */
  probes: Record<string, StageTableProbe>
  /** 换文件夹时的读取状态：不能只留在入口卡里，数据态也要看得见。 */
  folderLoading: boolean
  folderError: string | null
  scanState: StageScanState | null
  scanPending: number
  duplicateAlerts: StageDuplicateAlert[]
  skippedDrafts: Array<{ masterPath: string; name: string }>
  gate: StageGateResult
  notice: string | null
  onChangeFolder: () => void
  onRescan: () => void
  onScanAll: () => void
  onStopScan: () => void
  onChoose: (draftPath: string, tablePath: string) => void
  onChooseGroup: (draftPath: string, tablePath: string) => void
  onForget: (draftPath: string) => void
  onRetryRead: (draftPath: string) => void
  onSkip: (draftPath: string) => void
  onUndoSkip: (draftPath: string) => void
  /** 单稿逻辑：为某份稿手动选择译文表（不要求是 SKU 候选）。 */
  onPickTable: (draftPath: string) => void
  onRestoreDuplicates: (groupKey: string) => void
  onKeepOne: (groupKey: string) => void
  onDismissNotice: () => void
  onNext: () => void
  onShowClassic: () => void
  /**
   * 每稿的份数与被点掉的语言。口径只有一处（`slot-scope.ts` 的 ready 槽位 ∩ 该稿要做哪几门），
   * 这里只渲染，不再自己数——同一屏出现两套份数是最贵的那类错。
   */
  deliverablesByDraft: Record<string, { count: number; excluded: string[] }>
  /** 真正确认过的选表次数；打开又取消的对话框不算。 */
  manualPickCount: number
  onToggleSlot: (draftPath: string, lang: string, keep: boolean) => void
  onRestoreSlots: (draftPath: string) => void
  onClearChoice: (draftPath: string) => void
  onBlockTable: (tablePath: string) => void
  onUnblockTable: (tablePath: string) => void
  /**
   * 按稿键存放的解析结果（workbench-view 的 parsedTables）——表册的语言列/行数/sheet
   * 与覆盖率粗估都要用它；AttributionStageProps 之外的三个数据口之一。
   */
  parsedByDraft: Record<string, ParsedCsv | null>
  /**
   * 按**表身份**存放的解析结果（归一的表路径 → 这张表自己读出来的内容）。
   * 一稿一组之后 parsedByDraft 装的是整组合并出的多语言表，拿它填表册会让基准表
   * 冒充 12 门、其余 11 张显示「没被用到」。表册的逐表事实一律以这里为准。
   */
  tableParsesById?: Record<string, ParsedCsv>
  /** 原表按稿保留的原始 sheet 解析，用于详情中预览真实归属片。 */
  tableParsesByDraft?: Record<string, Record<string, ParsedCsv>>
  /**
   * 稿 masterPath → { 表身份 → 这一步**实际会执行的那一片** }（已过归属切片）。
   *
   * 存在就必须优先于 `tableParsesById`：合表按归属切给多稿时，原始整表的原文集
   * 会替本片作答，把「本片缺行」粉饰成「全覆盖」——证据要指向真正会写进 PSD 的那份。
   */
  effectiveTableParses?: Record<string, Record<string, ParsedCsv>>
  declaredTableIdsByDraft?: Record<string, string[]>
  tableAllocations?: TableAllocationStore
  allocationDrafts?: Array<{ masterPath: string; fingerprint: string | null; label: string }>
  onReadTableForAllocation?: (tablePath: string, masterPath: string) => void
  onSaveTableAllocation?: (allocation: TableAllocation) => void
  onClearTableAllocation?: (tablePath: string, sheetName: string) => void
  /** 稿 masterPath → parsedByDraft 的键（workbench-view 的 draftKeyOfMasterPath）。 */
  getDraftKey: (masterPath: string) => string
  /**
   * 每稿一表的覆盖率粗估输入（workbench-view 的 coverageDrafts，逐稿 summary＋表行）。
   * 组件内经 calcCoverageMatrixForDraftTables 取数，喂 deriveSourceMatrix。
   */
  coverageDrafts: CoverageDraftLike[]
  /** 每稿当前执行范围与同一份解析摘要派生的已确认语言，用于默认交付矩阵。 */
  scopeByDraft?: Record<string, string[]>
  confirmedByDraft?: Record<string, string[]>
  scannedByDraft?: Record<string, boolean>
  /** 仅从格详情显式进入逐稿复核；查看格本身不改变范围。 */
  onOpenReview?: (draftPath: string, language: string) => void
  onIncludeLanguage?: (draftPath: string, language: string) => void
  /**
   * 一稿一组语言表的绑定视图（workbench-view 用 buildGroupBindings 派生）。
   * 有它时第 1 步按「左稿 / 中组卡 / 右例外」三栏渲染；没有时退化成原来的两栏。
   */
  groupBindings?: { groups: DraftGroupBinding[]; orphans: GroupReject[] }
}

function baseName(path: string): string {
  return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? path
}

const STATUS_TONE: Record<string, string> = {
  ok: 'border-teal-600/40 bg-teal-600/10 text-teal-700 dark:text-teal-300',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  bad: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  mute: 'border-border bg-muted text-muted-foreground',
}

/**
 * 绑定证据徽章：颜色＋文字双编码（v3 方案 D14，色盲也要能读）。
 * 「推定」与「声明」都是蓝档——它们是「能用但没双证据」，不是异常。
 */
const EVIDENCE_CLASS: Record<EvidenceTier, string> = {
  verified: 'border-teal-600/40 bg-teal-600/10 text-teal-700 dark:text-teal-300',
  declared: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  inferred: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  doubtful: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  mismatch: 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  unchecked: 'border-dashed border-border bg-muted text-muted-foreground',
}

/** 同一套档位的纯文字色（组卡里那一行依据用；不铺底色，免得和格子抢注意力）。 */
const EVIDENCE_TEXT: Record<EvidenceTier, string> = {
  verified: 'text-teal-700 dark:text-teal-300',
  declared: 'text-sky-700 dark:text-sky-300',
  inferred: 'text-sky-700 dark:text-sky-300',
  doubtful: 'text-amber-700 dark:text-amber-300',
  mismatch: 'text-rose-700 dark:text-rose-300',
  unchecked: 'text-muted-foreground',
}

function Tag({ tone = 'mute', children }: { tone?: keyof typeof STATUS_TONE; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[tone] ?? STATUS_TONE.mute}`}>
      {children}
    </span>
  )
}

// 矩阵格配色：沿用 coverage-matrix.tsx 的语义色（emerald/amber/rose/muted＋dashed）。
// #190 铁律：算不出覆盖率的格（noscan/unread/unbound/na）不给红绿，只给中性或虚线。
const CELL_CLASS: Record<SourceMatrixCell['status'], string> = {
  ready: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  wait: 'border-amber-300 bg-transparent text-amber-700 dark:border-amber-700 dark:text-amber-300',
  bad: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  unread: 'border-border bg-muted/40 text-muted-foreground',
  noscan: 'border-dashed border-border bg-background text-muted-foreground',
  unbound: 'border-rose-400 bg-background text-rose-600 dark:text-rose-400',
  na: 'border-dotted border-border/70 bg-transparent text-muted-foreground/50',
}

// 中栏语言格的配色：与矩阵同一套语义（ready 绿 / pending 黄 / blocked 红 / 缺表虚线 / 已排除点线）。
const SLOT_CLASS: Record<GroupLanguageSlot['state'], string> = {
  ready: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  missing: 'border-dashed border-border bg-background text-muted-foreground',
  blocked: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  pending: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  excluded: 'border-dotted border-border/70 bg-transparent text-muted-foreground/70',
}

/** 有问题的格＝需要人处理的格（覆盖率不足/未配表/读失败）；「只看有问题的」只压暗其余格。 */
/** 一句依据：只拼数字与短句，文案留在组件层（lib 层不产用户可见中文）。 */
function evidenceDetail(evidence: BindingEvidence): string {
  if (evidence.tier === 'mismatch') {
    return fillCopy(t('这一稿的 {n} 条原文，表里一条都对不上'), { n: evidence.sourceCount })
  }
  if (evidence.coverage === null) {
    if (evidence.tier === 'declared') {
      return t('已指定译文表，请先读取内容。')
    }
    return t('请先扫描此稿，再核对译文表。')
  }
  return fillCopy(t('本稿 {n} 条原文，覆盖 {pct}%，缺 {miss} 条，表里多 {extra} 条'), {
    n: evidence.sourceCount,
    pct: Math.round(evidence.coverage),
    miss: evidence.missing,
    extra: evidence.extra,
  })
}

function isIssueCell(cell: SourceMatrixCell, record: TableRecord | null): boolean {
  if (cell.status === 'bad' || cell.status === 'wait' || cell.status === 'unbound') return true
  if (cell.status === 'unread' && record?.stage === 'error') return true
  return false
}

/** 为什么这张表没进组（右栏照实说，不合并成一句「其余忽略」）。 */
const REJECT_REASON_LABEL: Record<GroupRejectReason, string> = {
  NO_SKU_IN_FILENAME: '表名读不出 SKU',
  SKU_MISMATCH: 'SKU 对不上这稿',
  LANGUAGE_UNKNOWN: '读不出语言',
  LANGUAGE_DUPLICATE: '同一门有两张',
  MULTI_LANGUAGE_TABLE: '一张表带多门语言',
  STRUCTURE_OUTLIER: '结构跟组里多数不一致',
  LANGUAGE_LIMIT: '超过 12 门上限',
  DRAFT_SKU_UNKNOWN: '稿名读不出 SKU',
}

type DraftStatus = 'scanning' | 'unscanned' | 'unbound' | 'confirm' | 'error' | 'bad' | 'wait' | 'unread' | 'ready'

const DRAFT_TONE: Record<DraftStatus, keyof typeof STATUS_TONE> = {
  scanning: 'mute',
  unscanned: 'mute',
  unbound: 'bad',
  confirm: 'warn',
  error: 'bad',
  bad: 'bad',
  wait: 'warn',
  unread: 'warn',
  ready: 'ok',
}

type TodoKind = 'unbound' | 'confirm' | 'coverage' | 'readfail' | 'evidence'

interface TodoItem {
  kind: TodoKind
  draftPath: string | null
  language: string | null
}

type DrawerSelection =
  | { kind: 'cell'; draftPath: string; language: string }
  | { kind: 'language'; language: string }
  | { kind: 'table'; tableId: string }

type Step1WorkspaceView = 'matrix' | 'detail' | 'library'

export function Step1StageView({
  root,
  scan,
  plan,
  choices,
  remembered,
  languagesByDraft,
  droppedChoices,
  readStates,
  probes,
  folderLoading,
  folderError,
  scanState,
  scanPending,
  duplicateAlerts,
  skippedDrafts,
  gate,
  notice,
  onChangeFolder,
  onRescan,
  onScanAll,
  onStopScan,
  onChoose,
  onChooseGroup,
  onForget,
  onRetryRead,
  onSkip,
  onUndoSkip,
  onPickTable,
  onRestoreDuplicates,
  onKeepOne,
  onDismissNotice,
  onNext,
  onShowClassic,
  parsedByDraft,
  tableParsesById,
  tableParsesByDraft,
  effectiveTableParses,
  declaredTableIdsByDraft,
  tableAllocations = {},
  allocationDrafts = [],
  onReadTableForAllocation = () => {},
  onSaveTableAllocation = () => {},
  onClearTableAllocation = () => {},
  getDraftKey,
  coverageDrafts,
  scopeByDraft,
  confirmedByDraft,
  scannedByDraft,
  onOpenReview = () => {},
  onIncludeLanguage = () => {},
  groupBindings,
  deliverablesByDraft,
  onToggleSlot,
  onRestoreSlots,
  onClearChoice,
  onUnblockTable,
}: Step1StageViewProps) {
  const copy = useSiteCopy('workbench').step1
  const scanBusy = Boolean(scanState?.running || scanState?.scanningPath)
  const [helpOpen, setHelpOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyIssue, setOnlyIssue] = useState(false)
  const [drawer, setDrawer] = useState<DrawerSelection | null>(null)
  /** 左栏点了哪份稿：中栏跟着换组（点「详情」才开抽屉，别让每次选稿都弹一层）。 */
  const [selectedDraftPath, setSelectedDraftPath] = useState<string | null>(null)
  /** 中栏正在为哪一门语言选表（同一门两张时展开候选，不替你挑）。 */
  const [pickingLang, setPickingLang] = useState<string | null>(null)
  // 矩阵按 Owner 2026-10-26 的裁定归第 4 步；第 1 步先留折叠版（默认收起，展开与否不改变任何判据）。
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [workspaceView, setWorkspaceView] = useState<Step1WorkspaceView>('matrix')
  const autoGuideRef = useRef(false)

  const handleWorkspaceViewChange = (nextView: Step1WorkspaceView) => {
    if (drawer?.kind === 'cell') {
      setSelectedDraftPath(drawer.draftPath)
      setDrawer(null)
    } else if (drawer?.kind === 'language') {
      setDrawer(null)
    }
    // 表详情可能有尚未确认的分配编辑；保留抽屉与其局部状态，避免切视图时丢失。
    setWorkspaceView(nextView)
  }

  // ── 批量表头调查（3.7.25 survey-tables，工作单 E）：
  //    一次票读最多 12 张表的表头元数据，结果并入表册（表清单/矩阵刷新走现有派生）；
  //    端点缺失（旧助手 404）时回退现行为——逐张读全文（onRetryRead 循环）。 ──
  const [surveyMeta, setSurveyMeta] = useState<Record<string, NonNullable<TableMetaInput['survey']>>>({})
  const [surveyBusy, setSurveyBusy] = useState(false)
  const [surveyNotice, setSurveyNotice] = useState<string | null>(null)

  useEffect(() => {
    // 换文件夹后旧格子的稿/语言可能已不存在，收起抽屉，避免指向上一批。
    setDrawer(null)
  }, [root])

  useEffect(() => {
    // 换文件夹后旧根的调查结果对新根毫无意义：清空，表册回到扫描事实。
    setSurveyMeta({})
    setSurveyNotice(null)
  }, [root])

  // ── 表册（表级事实）：与 TableInventoryList 同一份投影，一张表一条记录 ──
  const inventory = useMemo(() => {
    const meta: Record<string, TableMetaInput> = {}
    // 一稿一组：整组逐张填自己的解析结果。基准表不能拿合并后的多语言表冒充自己，
    // 其余十一张也不能因为「choices 只装一张」就被算成没被用到。
    for (const group of groupBindings?.groups ?? []) {
      if (group.sku === null) continue
      const state = readStates[group.draftPath]
      if (state?.status !== 'ready') continue
      for (const tablePath of group.tables) {
        const id = normalizeTableId(tablePath)
        const slot: TableMetaInput = meta[id] ?? {}
        if (!slot.readState) slot.readState = state
        if (!slot.parsed) {
          const parsed = tableParsesById?.[id]
          if (parsed) slot.parsed = parsed
        }
        meta[id] = slot
      }
    }
    // 读过但没归进任何组的表（结构离群、被排除、孤儿）：「读过了」这个事实要留着，
    // 不能退回「未读」——它确实被读进内存并被判定过，不然表册就在替内核撒谎。
    for (const table of scan.tables) {
      const id = normalizeTableId(table.path)
      const parsed = tableParsesById?.[id]
      if (!parsed) continue
      const slot: TableMetaInput = meta[id] ?? {}
      if (!slot.readState) slot.readState = { status: 'ready' }
      if (!slot.parsed) slot.parsed = parsed
      meta[id] = slot
    }
    for (const [draftPath, tablePath] of Object.entries(choices)) {
      if (!tablePath) continue
      const id = normalizeTableId(tablePath)
      const state = readStates[draftPath]
      if (!state || normalizeTableId(state.tablePath) !== id) continue
      const slot: TableMetaInput = meta[id] ?? {}
      if (!slot.readState) slot.readState = state
      if (!slot.parsed) {
        const parsed = parsedByDraft[getDraftKey(draftPath)]
        if (parsed) slot.parsed = parsed
      }
      meta[id] = slot
    }
    // survey 结果（按表 id 存）并入表册：只有元数据、不覆盖全文解析/读状态。
    for (const [tableId, survey] of Object.entries(surveyMeta)) {
      const slot: TableMetaInput = meta[tableId] ?? {}
      if (!slot.parsed && !slot.readState) slot.survey = survey
      meta[tableId] = slot
    }
    // 一稿一组语言表：组内其余十一张也要算「被这稿用到」，否则表册把它们报成未用。
    const tableUses: Record<string, string[]> = {}
    for (const group of groupBindings?.groups ?? []) {
      // 稿名读不出 SKU 时整组归不出来，组内不会有余表可标归属。
      if (group.sku === null) continue
      for (const tablePath of group.tables) {
        const id = normalizeTableId(tablePath)
        const list = tableUses[id] ?? (tableUses[id] = [])
        if (!list.includes(group.draftPath)) list.push(group.draftPath)
      }
    }
    // 不能归 SKU 组的显式表册分配也是真实使用关系；切片稿只记有效解析里实际拿到的表。
    for (const [draftPath, effectiveTables] of Object.entries(effectiveTableParses ?? {})) {
      for (const tableId of Object.keys(effectiveTables)) {
        const list = tableUses[tableId] ?? (tableUses[tableId] = [])
        if (!list.includes(draftPath)) list.push(draftPath)
      }
    }
    return buildTableInventory({
      tables: scan.tables,
      tableTotal: scan.tableTotal,
      tablesTruncated: scan.tablesTruncated,
      choices,
      meta,
      tableUses,
    })
  }, [scan, choices, readStates, parsedByDraft, tableParsesById, getDraftKey, surveyMeta, groupBindings, effectiveTableParses])

  const recordById = useMemo(() => new Map(inventory.map((record) => [record.id, record])), [inventory])

  // ── 覆盖率：与执行前闸同一份口径（calcCoverageMatrixForDraftTables）；
  //    estimable=false 的格不给数字（#190），喂给 deriveSourceMatrix 时保持 null。 ──
  const coverageByDraft = useMemo(() => {
    const cells = calcCoverageMatrixForDraftTables(coverageDrafts)
    const out: Record<string, Record<string, number>> = {}
    for (const cell of cells) {
      if (!cell.estimable) continue
      const masterPath = coverageDrafts[cell.psdIndex]?.masterPath
      if (!masterPath) continue
      const slot = out[masterPath] ?? (out[masterPath] = {})
      slot[cell.lang] = cell.coverage
    }
    return out
  }, [coverageDrafts])

  const unscannedPaths = useMemo(
    () => new Set(gate.blockers.filter((blocker) => blocker.kind === 'unscanned').map((blocker) => blocker.masterPath)),
    [gate],
  )

  // ── 绑定证据（v3 公理 C：绑定必须可证）──
  // 归属信号两个：表名 SKU（归组内核已强制）与表里的「模块」列（解析层早就有，csv.ts:422-423）。
  // 「模块」列含义可能是分区（别名含 SECTION），所以只在全部取值都对得上时才算归属，
  // 对不上但同形（都带数字）才算「指到别的稿」——见 binding-evidence.ts 的 ownerFromValues。
  // 覆盖信号一律走 coverage.ts 的三档口径，不许这里另算一套（v3 方案 D18）。
  const evidenceByDraft = useMemo(
    () =>
      buildBindingEvidences({
        drafts: coverageDrafts,
        groups: groupBindings?.groups,
        tableParsesById,
        ...(effectiveTableParses ? { tableParsesByDraft: effectiveTableParses } : {}),
        declaredTableIdsByDraft,
      }),
    [coverageDrafts, groupBindings, tableParsesById, effectiveTableParses, declaredTableIdsByDraft],
  )

  // 语言并集（≤12）：有组的时候用内核算出来的那份，没有才按表册首现顺序取。
  // 表册首现那条路会把孤儿表的语言也列成一门（实测把「Copy of …」读出的 CO 挂成列头）。
  const languages = useMemo(() => {
    const fromGroups: string[] = []
    for (const group of groupBindings?.groups ?? []) {
      for (const slot of group.slots) {
        if (!fromGroups.includes(slot.lang) && fromGroups.length < 12) fromGroups.push(slot.lang)
      }
    }
    if (fromGroups.length > 0) return fromGroups
    const langs: string[] = []
    for (const record of inventory) {
      if (record.id === TRUNCATED_TABLE_ID) continue
      for (const language of record.langs) {
        if (!langs.includes(language) && langs.length < 12) langs.push(language)
      }
    }
    return langs
  }, [inventory, groupBindings])

  /** 一稿一门的表（基准表不替整行应答）；没有组的稿返回空、走老的一稿一表。 */
  const tablePathByLanguage = useMemo(() => {
    const out: Record<string, Record<string, string | null>> = {}
    for (const group of groupBindings?.groups ?? []) {
      if (group.sku === null) continue
      const map: Record<string, string | null> = {}
      for (const slot of group.slots) map[slot.lang] = slot.tablePath
      out[group.draftPath] = map
    }
    return out
  }, [groupBindings])

  const matrixDrafts = useMemo(
    () =>
      plan.rows.map((row) => {
        const path = row.draft.masterPath
        const byLanguage = tablePathByLanguage[path]
        return {
          masterPath: path,
          fileName: baseName(row.draft.relPath),
          scanned: !unscannedPaths.has(path),
          tablePath: choices[path] ?? null,
          coverage: coverageByDraft[path] ?? null,
          ...(byLanguage ? { tablePathByLanguage: byLanguage } : {}),
        }
      }),
    [plan.rows, unscannedPaths, choices, coverageByDraft, tablePathByLanguage],
  )

  const matrix = useMemo(
    () => deriveSourceMatrix({ drafts: matrixDrafts, inventory, languages }),
    [matrixDrafts, inventory, languages],
  )

  const cellsOf = (draftPath: string): SourceMatrixCell[] => {
    const index = matrixDrafts.findIndex((draft) => draft.masterPath === draftPath)
    return index >= 0 ? matrix[index] ?? [] : []
  }

  // ── 左「设计稿」列表行：状态、语种数、问题数、扫描进度 ──
  const draftItems = useMemo(
    () =>
      plan.rows.map((row) => {
        const path = row.draft.masterPath
        const chosen = choices[path] ?? null
        const read = readStates[path]
        const cells = cellsOf(path)
        const isScanning = scanBusy && scanState?.scanningPath === path
        const unscanned = unscannedPaths.has(path)
        const badCount = cells.filter((cell) => cell.status === 'bad' || cell.status === 'wait').length
        const boundRecord = chosen ? recordById.get(normalizeTableId(chosen)) ?? null : null
        let status: DraftStatus
        if (isScanning) status = 'scanning'
        else if (unscanned) status = 'unscanned'
        else if (!chosen) status = row.candidates.length === 0 ? 'unbound' : 'confirm'
        else if (read?.status === 'error') status = 'error'
        else if (cells.some((cell) => cell.status === 'bad')) status = 'bad'
        else if (cells.some((cell) => cell.status === 'wait')) status = 'wait'
        else if (cells.length > 0 && cells.some((cell) => cell.status !== 'na') && boundRecord?.stage !== 'ready') status = 'unread'
        else status = 'ready'
        const statusLabel =
          status === 'scanning'
            ? t('扫描中')
            : status === 'unscanned'
              ? t('未扫')
              : status === 'unbound'
                ? t('未配表')
                : status === 'confirm'
                  ? t('配对待确认')
                  : status === 'error'
                    ? t('读表失败')
                    : status === 'bad'
                      ? t('有问题')
                      : status === 'wait'
                        ? t('待检查')
                        : status === 'unread'
                          ? t('待读全文')
                          : t('就绪')
        return {
          path,
          name: baseName(row.draft.relPath),
          relPath: row.draft.relPath,
          sku: row.identity.sku,
          deliverableLabel: DELIVERABLE_LABEL[row.identity.deliverable],
          chosen,
          remembered: Boolean(remembered[path]),
          status,
          statusLabel,
          tone: DRAFT_TONE[status],
          languageCount: (languagesByDraft[path] ?? []).length,
          issueCount: badCount,
          reading: read?.status === 'reading',
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.rows, choices, readStates, remembered, languagesByDraft, scanBusy, scanState?.scanningPath, unscannedPaths, matrix, inventory],
  )

  const filteredDrafts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return draftItems
    return draftItems.filter(
      (item) => item.name.toLowerCase().includes(needle) || (item.sku ?? '').toLowerCase().includes(needle),
    )
  }, [draftItems, query])

  // ── 配对四阶段（批准稿契约 5）：四步的数字全部取现有派生，组件不另算进度 ──
  //    扫描或读表头时出现（下面状态条的条件），两个动作都停了就消失，不当常驻看板。
  const pairStages = useMemo(() => {
    const drafts = plan.counts.drafts
    const tables = scan.tables.length
    const skuKnown = plan.rows.filter((row) => Boolean(row.identity?.sku)).length
    // 「组」只数真收了表的组：内核每稿必推一组，认不出 SKU 的稿也推一个空组
    // （table-grouping.ts:238-258），直接数 groups.length 会把「一份稿都没配上」说成归好组。
    const groups = groupBindings
      ? groupBindings.groups.filter((group) => group.tables.length > 0).length
      : plan.rows.filter((row) => Boolean(choices[row.draft.masterPath])).length
    // 第四步数「表头已知」而不是「全文读完」：表册的 rows 在表头读完或全文读完时都非空，
    // 而 stage 只有全文读完才是 ready（table-inventory.ts:160「表头已读≠读全文」）。
    const headerKnown = inventory.filter((record) => record.rows !== null).length
    const failedTables = inventory.filter((record) => record.stage === 'error').length
    return [
      {
        key: 'folder',
        label: t('扫描文件夹'),
        detail: t('{drafts} 份稿 · {tables} 张表', { drafts, tables }),
        done: drafts > 0,
        running: folderLoading,
      },
      {
        key: 'sku',
        label: t('认 SKU 与交付物'),
        detail: t('{n}/{total} 认出', { n: skuKnown, total: drafts }),
        done: drafts > 0 && skuKnown === drafts,
        running: false,
      },
      {
        key: 'group',
        label: t('归组'),
        detail:
          groups > 0
            ? t('{tables} 张 → {groups} 组', { tables, groups })
            : tables > 0
              ? t('还没配上组')
              : t('等前面完成'),
        done: groups > 0,
        running: false,
      },
      {
        key: 'headers',
        label: t('读表头'),
        detail:
          failedTables > 0
            ? t('{n} 张表头已读 · {failed} 张读不了', { n: headerKnown, failed: failedTables })
            : t('{n}/{total} 张表头已读', { n: headerKnown, total: tables }),
        done: tables > 0 && headerKnown >= tables,
        running: surveyBusy,
      },
    ]
  }, [plan.counts.drafts, plan.rows, choices, scan.tables.length, groupBindings, inventory, surveyBusy, folderLoading])
  const pairDoneCount = pairStages.filter((stage) => stage.done).length
  const allCells = useMemo(() => matrix.flat(), [matrix])

  // ── 一稿一组语言表：有绑定视图就按三栏渲染（左稿 / 中组卡 / 右例外） ──
  const groupByDraft = useMemo(
    () => new Map((groupBindings?.groups ?? []).map((group) => [group.draftPath, group])),
    [groupBindings],
  )
  // 中栏跟「点过哪份稿」走；没点过就跟抽屉／第一份。
  const activeDraftPath =
    drawer?.kind === 'cell'
      ? drawer.draftPath
      : selectedDraftPath && draftItems.some((item) => item.path === selectedDraftPath)
        ? selectedDraftPath
        : (filteredDrafts[0]?.path ?? plan.rows[0]?.draft.masterPath ?? null)
  const activeGroup = activeDraftPath ? groupByDraft.get(activeDraftPath) ?? null : null
  // 已读到行数的表（只有当前绑定的那张有全文，其余等读）；中栏「45 行」只报真读数。
  const rowCountByTableId = useMemo(() => {
    const out: Record<string, number> = {}
    for (const row of plan.rows) {
      const tablePath = choices[row.draft.masterPath]
      const parsed = parsedByDraft[getDraftKey(row.draft.masterPath)]
      if (!tablePath || !parsed) continue
      out[normalizeTableId(tablePath)] = parsed.rows.length
    }
    return out
  }, [plan.rows, choices, parsedByDraft, getDraftKey])

  // ── 待办条：绑定证据（不符/存疑）/ 未配表 / 配对待确认 / 覆盖率<80 / 读表失败 ──
  const todoItems = useMemo<TodoItem[]>(() => {
    const items: TodoItem[] = []
    // 证据只把「不符」算进待办：存疑＝原文集只对上一部分，那本来就是覆盖率闸的事
    // （<95% 要显式放行），再进待办条就是同一个问题报两遍（v3 方案 D16 的降噪条款）。
    for (const row of plan.rows) {
      const evidence = evidenceByDraft[row.draft.masterPath]
      if (evidence?.tier === 'mismatch') {
        items.push({ kind: 'evidence', draftPath: row.draft.masterPath, language: null })
      }
    }
    for (const row of plan.rows) {
      const path = row.draft.masterPath
      if (!choices[path]) {
        items.push({
          kind: row.candidates.length === 0 ? 'unbound' : 'confirm',
          draftPath: path,
          language: null,
        })
      }
    }
    for (const row of plan.rows) {
      const bad = cellsOf(row.draft.masterPath).find((cell) => cell.status === 'bad')
      if (bad) items.push({ kind: 'coverage', draftPath: row.draft.masterPath, language: bad.language })
    }
    for (const record of inventory) {
      if (record.stage === 'error') items.push({ kind: 'readfail', draftPath: null, language: null })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.rows, choices, matrix, inventory, evidenceByDraft])

  const todoCounts = useMemo(() => {
    const counts: Record<TodoKind, number> = { unbound: 0, confirm: 0, coverage: 0, readfail: 0, evidence: 0 }
    for (const item of todoItems) counts[item.kind] += 1
    return counts
  }, [todoItems])

  const openDraftDrawer = (draftPath: string, language?: string | null) => {
    const cells = cellsOf(draftPath)
    const fallback =
      language ?? cells.find((cell) => cell.status !== 'na')?.language ?? languages[0] ?? ''
    setDrawer({ kind: 'cell', draftPath, language: fallback })
  }

  const handleGoTodo = () => {
    const first = todoItems[0]
    if (!first) return
    if (first.draftPath) openDraftDrawer(first.draftPath, first.language)
    else {
      const record = inventory.find((item) => item.stage === 'error')
      if (record) setDrawer({ kind: 'table', tableId: record.id })
    }
  }

  // ── 读全部表头（3.7.25 起两段式）：优先一次票批量调查（survey-tables，只读元数据、
  //    结果并入表册）；端点缺失（旧助手 404，code=SURVEY_ENDPOINT_MISSING）时回退现行为——
  //    按 planTableReadQueue 顺序把「有绑定稿」的表逐张交给逐稿读表队列
  //    （loader 层按表去重，一张表只读一次）。不给它新增父层函数。 ──
  const readQueue = useMemo(() => planTableReadQueue(inventory), [inventory])
  const readableQueueRecords = useMemo(
    () =>
      readQueue
        .map((id) => recordById.get(id) ?? null)
        .filter((record): record is TableRecord => Boolean(record && record.usedBy.length > 0)),
    [readQueue, recordById],
  )
  const readAllDisabled = readableQueueRecords.length === 0
  const handleReadAllTables = () => {
    if (surveyBusy || readAllDisabled) return
    // 一轮只发 12 张（助手单次上限），发完待发集合才算空：144 张的文件夹要跑 12 轮。
    // 不循环时点一次只读前 12 张，剩下 132 张永远停在「未读」，用户以为按钮坏了。
    // 剩余集合在本地推进——循环里读不到 render 期之后的 surveyMeta。
    const targets = inventory.filter(
      (record) => record.id !== TRUNCATED_TABLE_ID && !surveyMeta[record.id],
    )
    const remainingIds = new Set(targets.map((record) => record.id))
    const nextRoundRecords = (): TableRecord[] => {
      const queue = planTableReadQueue(targets.filter((record) => remainingIds.has(record.id)))
      return queue
        .map((id) => recordById.get(id) ?? null)
        .filter((record): record is TableRecord => Boolean(record))
    }
    const firstRound = nextRoundRecords()
    if (firstRound.length === 0) return
    setSurveyBusy(true)
    setSurveyNotice(null)
    void (async () => {
      let okTotal = 0
      let failedTotal = 0
      let readTotal = 0
      let roundRecords = firstRound
      try {
        while (roundRecords.length > 0) {
          const tablePaths = roundRecords.map((record) => record.path)
          // 发出去过就从剩余集合摘掉：助手回得不全也不卡在同一轮上重试。
          for (const record of roundRecords) remainingIds.delete(record.id)
          const entries = await surveyPreparationTables(root, tablePaths)
          const relToPath = new Map(scan.tables.map((table) => [table.relPath, table.path] as const))
          const next: Record<string, NonNullable<TableMetaInput['survey']>> = {}
          let okCount = 0
          let unmatched = 0
          for (const entry of entries) {
            const tablePath = relToPath.get(entry.relPath)
            if (!tablePath) {
              unmatched += 1
              continue
            }
            next[normalizeTableId(tablePath)] = {
              sheets: entry.sheets,
              languages: entry.languages,
              rows: entry.rows,
              warnings: entry.warnings,
              error: entry.error,
            }
            if (!entry.error) okCount += 1
          }
          okTotal += okCount
          failedTotal += entries.length - okCount + unmatched
          readTotal += tablePaths.length
          setSurveyMeta((previous) => ({ ...previous, ...next }))
          // 每轮都给进度：读得慢时用户能看出它在动，而不是卡在「正在读表头…」。
          setSurveyNotice(
            t('正在读表头：已读 {n} 张，还剩 {left} 张。', {
              n: String(readTotal),
              left: String(remainingIds.size),
            }),
          )
          if (entries.length === 0) break
          roundRecords = nextRoundRecords()
        }
        setSurveyNotice(
          failedTotal === 0
            ? t('已读 {n} 张表的表头（sheet/语言/行数见译文表清单）；读全文仍按绑定逐张进行。', { n: String(okTotal) })
            : t('已读 {ok} 张表的表头，{failed} 张没读成（清单里有原因）；读全文仍按绑定逐张进行。', {
                ok: String(okTotal),
                failed: String(failedTotal),
              }),
        )
      } catch (error) {
        if (error instanceof LocalAssistantRequestError && error.code === 'SURVEY_ENDPOINT_MISSING') {
          // 旧助手没有批量端点：回退现行为（逐张读全文），不给用户添新失败。
          for (const record of readableQueueRecords) {
            for (const draftPath of record.usedBy) onRetryRead(draftPath)
          }
          return
        }
        setSurveyNotice(
          error instanceof Error && error.message
            ? error.message
            : t('批量读取表头失败，请重试或改用逐张读取。'),
        )
      } finally {
        setSurveyBusy(false)
      }
    })().catch(() => { /* 内部已 catch；这里只兜 unhandled rejection */ })
  }

  const folderMeta = [
    fillCopy(copy.folderMeta, { designs: scan.designTotal, tables: scan.tableTotal }),
    scan.skippedTotal > 0 ? fillCopy(copy.folderSkipped, { n: scan.skippedTotal }) : '',
    scan.truncated ? copy.folderTruncated : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const helpItems: readonly HelpItem[] = copy.help.items

  // 首次进入且有稿才弹引导；只弹一次，可跳过。
  useEffect(() => {
    if (autoGuideRef.current) return
    if (plan.rows.length === 0) return
    autoGuideRef.current = true
    if (hasSeenStep1Guide()) return
    const timer = window.setTimeout(() => setGuideOpen(true), 450)
    return () => window.clearTimeout(timer)
  }, [plan.rows.length])

  const unusedTableCount = useMemo(
    () => inventory.filter((record) => record.id !== TRUNCATED_TABLE_ID && record.usedBy.length === 0).length,
    [inventory],
  )

  const matrixCellTitle = (cell: SourceMatrixCell, record: TableRecord | null): string => {
    const statusText =
      cell.status === 'ready'
        ? t('就绪')
        : cell.status === 'wait'
          ? t('待检查')
          : cell.status === 'bad'
            ? t('有问题')
            : cell.status === 'unbound'
              ? t('未配表')
              : cell.status === 'noscan'
                ? t('未扫')
                : cell.status === 'na'
                  ? t('— 本稿不做')
                  : record?.stage === 'ready'
                    ? t('无法估算')
                    : record?.stage === 'error'
                      ? t('读表失败')
                      : t('待读全文')
    const coverageText = cell.coverage != null ? ` · ${cell.coverage}%` : ''
    return `${cell.draftName} · ${cell.language}${coverageText} · ${statusText}`
  }

  const cellText = (cell: SourceMatrixCell, record: TableRecord | null): string => {
    switch (cell.status) {
      case 'ready':
        return '✓'
      case 'wait':
      case 'bad':
        return `${cell.coverage}%`
      case 'unbound':
        return t('未配表')
      case 'noscan':
        return t('未扫')
      case 'na':
        return '—'
      case 'unread':
        return record?.stage === 'ready' ? t('无法估算') : record?.stage === 'error' ? t('读失败') : t('待读全文')
    }
  }

  // ── 中栏：当前稿的一整组语言表（一门一格，每格只有一条去向） ──
  const slotMeta = (slot: GroupLanguageSlot): string => {
    if (slot.state === 'ready') {
      const rows = slot.tablePath ? rowCountByTableId[normalizeTableId(slot.tablePath)] : undefined
      return rows != null ? fillCopy(t('{n} 行'), { n: rows }) : t('可交付')
    }
    if (slot.state === 'missing') return t('没有这张表')
    if (slot.state === 'blocked') return t('对不上 · 拦下')
    if (slot.state === 'pending') return t('两张 · 点这里去选')
    return t('已排除')
  }

  const pickSlot =
    activeGroup?.slots.find((slot) => slot.state === 'pending' && slot.lang === pickingLang) ?? null

  const renderGroupCard = () => {
    if (!groupBindings) return null
    if (!activeGroup) {
      return (
        <div
          data-testid="step1-group-card"
          className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed bg-card px-5 text-center text-[12px] leading-relaxed text-muted-foreground"
        >
          {plan.rows.length === 0
            ? t('还没有设计稿：左上角先选文件夹。')
            : t('左边选一份稿，这里显示它的一整组语言表。')}
        </div>
      )
    }
    const group = activeGroup
    const evidence = evidenceByDraft[group.draftPath]
    // 不符＝这张表和本稿原文一条都对不上：不许带着它进第 2 步（v3「不符 → 拦批」）。
    // 只拦「进下一步」，不改执行闸——执行闸那边的覆盖率闸本来就会为 0% 格要求显式放行。
    const blockedByEvidence = evidence ? EVIDENCE_ACTION[evidence.tier] === 'block' : false
    const canAdvance = gate.ok && group.pendingCount === 0 && !blockedByEvidence
    const deliverable = deliverablesByDraft[group.draftPath] ?? { count: 0, excluded: [] }
    return (
      <div data-testid="step1-group-card" className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold" title={group.draftPath}>
            {baseName(group.draftPath)}
          </span>
          {evidence && (
            <span
              data-testid="step1-group-evidence"
              data-evidence-tier={evidence.tier}
              title={evidenceDetail(evidence)}
              className={`rounded border px-1.5 py-px text-[10.5px] font-bold ${EVIDENCE_CLASS[evidence.tier]}`}
            >
              {evidenceLabel(evidence.tier)}
            </span>
          )}
          <Tag tone={group.tone}>{group.statusLabel}</Tag>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b px-3 py-2 text-[11.5px] text-muted-foreground">
          <span>{fillCopy(t('可交付 {n} 份'), { n: deliverable.count })}</span>
          {deliverable.excluded.length > 0 && (
            <>
              <span className="text-rose-700 dark:text-rose-300">
                {fillCopy(t('剔除 {n} 门'), { n: deliverable.excluded.length })}
              </span>
              <button
                type="button"
                data-testid="step1-restore-slots"
                className="rounded border px-2 py-0.5 hover:bg-muted"
                onClick={() => onRestoreSlots(group.draftPath)}
              >
                {t('全选回来')}
              </button>
            </>
          )}
          {group.pendingCount > 0 && (
            <span className="text-amber-700 dark:text-amber-300">
              {fillCopy(t('等你定 {n} 件'), { n: group.pendingCount })}
            </span>
          )}
          {group.defaultedCount > 0 && (
            <span>{fillCopy(t('已按默认 {n} 件'), { n: group.defaultedCount })}</span>
          )}
        </div>
        {/* 绑定证据：这一组凭什么算这一稿的（v3 公理 C）。单独一行，不塞进折叠区——
            这是执行前最该看见的那句话，折起来等于没有。 */}
        {evidence && (
          <div
            data-testid="step1-group-evidence-detail"
            data-evidence-tier={evidence.tier}
            className={`border-b px-3 py-1 text-[11px] leading-snug ${EVIDENCE_TEXT[evidence.tier]}`}
          >
            {fillCopy(t('译文表检查（{tier}）：{detail}'), {
              tier: evidenceLabel(evidence.tier),
              detail: evidenceDetail(evidence),
            })}
          </div>
        )}
        <div className="wb-v3-language-chips grid grid-cols-3 gap-1.5 p-2.5 sm:grid-cols-4 xl:grid-cols-3">
          {group.slots.map((slot) => {
            // 只有 ready 格可以点掉：missing／blocked／pending 都不是「要不要做」的开关，
            // 把它们做成可点就会拿一个不在份数口径里的东西去减份数。
            // 开关判据单独一行：只有 ready 格是「要不要做这一门」。
            // 别处不许照抄成「非 pending 都可点」——那会把缺表/拦下的格拿去做份数减法（I-4）。
            const droppable = slot.state === 'ready'
            const dropped = droppable && deliverable.excluded.includes(slot.lang)
            if (slot.state === 'pending') {
              return (
                <button
                  key={slot.lang}
                  type="button"
                  data-slot-state="pending"
                  aria-pressed={pickingLang === slot.lang}
                  title={`${slot.lang} · ${slotMeta(slot)}`}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] leading-tight hover:brightness-95 ${SLOT_CLASS.pending}`}
                  onClick={() => setPickingLang((previous) => (previous === slot.lang ? null : slot.lang))}
                >
                  <span className="font-bold">{slot.lang}</span>
                  <span className="max-w-full truncate text-[10px]">{slotMeta(slot)}</span>
                </button>
              )
            }
            if (droppable) {
              return (
                <button
                  key={slot.lang}
                  type="button"
                  role="checkbox"
                  aria-checked={!dropped}
                  data-slot-state={slot.state}
                  data-slot-excluded={String(dropped)}
                  title={
                    dropped
                      ? `${slot.lang} · ${t('已剔除，点这里加回来')}`
                      : `${slot.lang} · ${slotMeta(slot)} · ${t('点这里这一门就不做')}`
                  }
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] leading-tight hover:brightness-95 ${dropped ? SLOT_CLASS.excluded : SLOT_CLASS.ready}`}
                  onClick={() => onToggleSlot(group.draftPath, slot.lang, dropped)}
                >
                  <span className="font-bold">{slot.lang}</span>
                  <span className="max-w-full truncate text-[10px]">{dropped ? t('已剔除') : slotMeta(slot)}</span>
                </button>
              )
            }
            if (slot.state === 'excluded' && slot.tablePath) {
              return (
                <button
                  key={slot.lang}
                  type="button"
                  data-slot-state={slot.state}
                  title={`${slot.lang} · ${t('这张表被你拦下，点这里放开')}`}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] leading-tight hover:brightness-95 ${SLOT_CLASS.excluded}`}
                  onClick={() => onUnblockTable(slot.tablePath as string)}
                >
                  <span className="font-bold">{slot.lang}</span>
                  <span className="max-w-full truncate text-[10px]">{t('拦下 · 点这里放开')}</span>
                </button>
              )
            }
            return (
              <div
                key={slot.lang}
                data-slot-state={slot.state}
                title={`${slot.lang} · ${slotMeta(slot)}`}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[11px] leading-tight ${SLOT_CLASS[slot.state]}`}
              >
                <span className="font-bold">{slot.lang}</span>
                <span className="max-w-full truncate text-[10px]">{slotMeta(slot)}</span>
              </div>
            )
          })}
        </div>
        {pickSlot && (
          <div
            data-testid="step1-slot-pick"
            className="mx-2.5 mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11.5px]"
          >
            <div className="font-bold">{fillCopy(t('{lang} 有两张表：用哪一张？'), { lang: pickSlot.lang })}</div>
            <ul className="mt-1 space-y-1">
              {pickSlot.others.map((candidate) => (
                <li key={candidate.path} className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={candidate.relPath}>
                    {baseName(candidate.relPath)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded border px-2 py-0.5 hover:bg-muted"
                    onClick={() => {
                      onChoose(group.draftPath, candidate.path)
                      setPickingLang(null)
                    }}
                  >
                    {t('用这张')}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('系统不替你挑：选了哪张，另一张这一批不用。')}
            </p>
          </div>
        )}
        {/* 折叠不得删报：归属／覆盖／唯一三条依据折起来也留在同一张组卡里 → 同屏展开 */}
        <details className="mt-auto border-t px-3 py-2 text-[11.5px]">
          <summary className="cursor-pointer text-muted-foreground">{t('配表详情')}</summary>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            <li>
              {fillCopy(t('归属：{sku} · {kind}'), {
                sku: group.sku ?? t('读不出 SKU'),
                kind: DELIVERABLE_LABEL[group.deliverable],
              })}
            </li>
            <li>
              {fillCopy(t('覆盖：{have} 门有表，{miss} 门缺'), {
                have: group.languageCount,
                miss: group.missingLanguages.length,
              })}
            </li>
            <li>
              {fillCopy(t('唯一：{defaulted} 件按默认处理，{pending} 件等你定'), {
                defaulted: group.defaultedCount,
                pending: group.pendingCount,
              })}
            </li>
          </ul>
        </details>
        <div className="border-t px-3 py-2">
          <button
            type="button"
            data-step1-target="next-group"
            aria-disabled={!canAdvance}
            className={`w-full rounded-md px-3 py-1.5 text-xs font-bold ${
              canAdvance ? 'bg-primary text-primary-foreground' : 'border bg-muted text-muted-foreground'
            }`}
            onClick={() => {
              if (canAdvance) onNext()
            }}
          >
            {group.pendingCount > 0
              ? fillCopy(t('先定 {n} 件，再进第 2 步'), { n: group.pendingCount })
              : blockedByEvidence
                ? t('这一组的表对不上：换一张表再进第 2 步')
                : gate.ok
                  ? copy.next
                  : t('还有稿没准备好：先处理左上角待办')}
          </button>
        </div>
      </div>
    )
  }

  // ── 右栏：例外清单。每一件都有一条结论（选哪张 / 只拦这张 / 补表接上 / 已按你的选择） ──
  const renderExceptions = (focusDraftPath?: string | null) => {
    if (!groupBindings) return null
    const pendingCards: React.ReactNode[] = []
    const unknownCards: React.ReactNode[] = []
    const blockedCards: React.ReactNode[] = []
    const missingCards: React.ReactNode[] = []
    const decidedCards: React.ReactNode[] = []
    for (const group of groupBindings.groups) {
      if (focusDraftPath && group.draftPath !== focusDraftPath) continue
      const name = baseName(group.draftPath)
      for (const slot of group.slots) {
        if (slot.state === 'pending') {
          pendingCards.push(
            <div
              key={`p:${group.draftPath}:${slot.lang}`}
              data-testid="step1-exception"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11.5px]"
            >
              <div className="font-bold">{fillCopy(t('{name} · {lang} 有两张表'), { name, lang: slot.lang })}</div>
              <ul className="mt-1 space-y-1">
                {slot.others.map((candidate) => (
                  <li key={candidate.path} className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={candidate.relPath}>
                      {baseName(candidate.relPath)}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded border px-1.5 py-0.5 hover:bg-muted"
                      onClick={() => onChoose(group.draftPath, candidate.path)}
                    >
                      {t('用这张')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
          )
        } else if (slot.state === 'blocked') {
          const relPath = slot.others[0]?.relPath ?? slot.tablePath ?? ''
          blockedCards.push(
            <div
              key={`b:${group.draftPath}:${slot.lang}`}
              data-testid="step1-exception"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-[11.5px]"
            >
              <div className="font-bold">{fillCopy(t('{name} · {lang} 的表对不上'), { name, lang: slot.lang })}</div>
              <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{baseName(relPath)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('只拦这一张：这一门先缺着，其余照跑。')}</p>
            </div>,
          )
        }
      }
      for (const table of group.unknownTables) {
        unknownCards.push(
          <div
            key={`u:${group.draftPath}:${table.path}`}
            data-testid="step1-exception"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11.5px]"
          >
            <div className="font-bold">{fillCopy(t('{name}：有一张表读不出语言'), { name })}</div>
            <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{table.relPath}</p>
            <button
              type="button"
              className="mt-1 rounded border px-2 py-0.5 hover:bg-muted"
              onClick={() => onChoose(group.draftPath, table.path)}
            >
              {t('读这张表再判')}
            </button>
          </div>,
        )
      }
      if (group.missingLanguages.length > 0) {
        missingCards.push(
          <div
            key={`m:${group.draftPath}`}
            data-testid="step1-exception"
            className="rounded-lg border bg-muted/40 p-2 text-[11.5px]"
          >
            <div className="font-bold">
              {fillCopy(t('{name} 少 {n} 门'), { name, n: group.missingLanguages.length })}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{group.missingLanguages.join('、')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t('补表后重扫会自动接上；不补就按现有门数交付。')}
            </p>
          </div>,
        )
      }
      for (const reject of group.decided) {
        decidedCards.push(
          <div
            key={`d:${group.draftPath}:${reject.relPath}`}
            data-testid="step1-exception"
            className="rounded-lg border bg-muted/40 p-2 text-[11.5px]"
          >
            <div className="font-bold">{fillCopy(t('{name}：已按你的选择'), { name })}</div>
            <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
              {baseName(reject.relPath)} · {t('这一批不用')}
            </p>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                data-testid="step1-decided-change"
                className="rounded border px-2 py-0.5 hover:bg-muted"
                onClick={() => onPickTable(group.draftPath)}
              >
                {t('改')}
              </button>
              <button
                type="button"
                data-testid="step1-decided-undo"
                className="rounded border px-2 py-0.5 hover:bg-muted"
                onClick={() => onClearChoice(group.draftPath)}
              >
                {t('撤销')}
              </button>
            </div>
          </div>,
        )
      }
    }
    const orphanCards = groupBindings.orphans.map((reject) => (
      <div
        key={`o:${reject.relPath}:${reject.reason}`}
        data-testid="step1-exception"
        className="rounded-lg border border-dashed bg-card p-2 text-[11.5px]"
      >
        <div className="font-bold">{REJECT_REASON_LABEL[reject.reason]}</div>
        <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{reject.relPath}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{reject.detail}</p>
      </div>
    ))
    const sections = [
      { key: 'pending', title: t('等你定'), cards: pendingCards },
      { key: 'unknown', title: t('读不出语言'), cards: unknownCards },
      { key: 'blocked', title: t('按默认拦下'), cards: blockedCards },
      { key: 'missing', title: t('缺门'), cards: missingCards },
      { key: 'decided', title: t('已按你的选择'), cards: decidedCards },
      { key: 'orphan', title: t('没归到任何稿'), cards: orphanCards },
    ].filter((section) => section.cards.length > 0)
    const total = sections.reduce((sum, section) => sum + section.cards.length, 0)
    return (
      <div data-testid="step1-exceptions" className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-[12px] font-bold">
          {t('例外')}
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">{total}</span>
        </div>
        <div className="max-h-[460px] space-y-2 overflow-y-auto px-2.5 py-2.5">
          {sections.length === 0 ? (
            <p className="px-1 py-4 text-center text-[11.5px] leading-relaxed text-muted-foreground">
              {t('没有例外：每张表都归到稿上了。')}
            </p>
          ) : (
            sections.map((section) => (
              <section key={section.key} className="space-y-1.5">
                <h3 className="px-0.5 text-[11px] font-bold text-muted-foreground">
                  {section.title} · {section.cards.length}
                </h3>
                {section.cards}
              </section>
            ))
          )}
        </div>
      </div>
    )
  }


  return (
    <div className="wb-v3-workspace space-y-3" data-step1-workspace-view={workspaceView}>
      {workspaceView !== 'matrix' && (
        <button type="button" data-testid="step1-view-matrix" className="self-start rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => handleWorkspaceViewChange('matrix')}>
          ← {t('返回总览')}
        </button>
      )}

      <div hidden={workspaceView !== 'matrix'} data-testid="step1-workspace-matrix">
      {/* 标题已由外层卡头统一渲染；这里只留本步的辅助与操作。 */}
      {/* 工具行：全部扫描 / 读全部表头 / 更多▾（逐稿手动导入出口） */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          disabled={scanBusy}
          onClick={onScanAll}
        >
          {t('全部扫描（按顺序）')}
        </button>
        {scanState?.running && (
          <button type="button" className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={onStopScan}>
            {copy.scan.stop}
          </button>
        )}
        <button
          type="button"
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled={readAllDisabled || surveyBusy}
          title={
            readAllDisabled
              ? t('队列里的表都还没有绑定的稿：先为稿配表，再读表。')
              : surveyBusy
                ? t('正在批量读取表头…')
                : t('识别译文表的工作表和语言列，不会修改表格。')
          }
          onClick={handleReadAllTables}
        >
          {surveyBusy ? t('正在读表头…') : t('读全部表头')}
        </button>
        <button type="button" data-testid="step1-view-detail" className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => handleWorkspaceViewChange('detail')}>
          {t('设计稿')} · {plan.counts.drafts}
        </button>
        <button type="button" data-testid="step1-view-library" className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => handleWorkspaceViewChange('library')}>
          {t('译文表')} · {scan.tables.length}
        </button>

        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-bold text-muted-foreground hover:bg-muted"
          aria-label={copy.helpLabel}
          title={copy.helpLabel}
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-step1-target="next"
            aria-disabled={!gate.ok}
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${
              gate.ok ? 'bg-primary text-primary-foreground' : 'border bg-muted text-muted-foreground'
            }`}
            onClick={() => {
              if (gate.ok) onNext()
            }}
          >
            {copy.next}
          </button>
        </div>
        {/* 折叠不得删报：这里只收「逐稿手动导入」出口（能力⑫）；能力保留 → 同屏展开（点开本菜单即达 stageClassic 经典界面） */}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            {copy.more}
            <span
              aria-hidden
              className="ml-1 inline-block h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent border-t-current align-middle"
            />
          </summary>
          <div className="absolute right-0 z-30 mt-1 w-44 rounded-md border bg-card p-1 shadow-lg">
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={onShowClassic}
            >
              {copy.classic}
            </button>
          </div>
        </details>
      </div>

      <section data-step1-target="delivery-matrix" aria-label={t('逐稿交付矩阵')}>
        {coverageDrafts.length > 0 ? (
          <CoverageMatrix
            drafts={coverageDrafts}
            scopeByDraft={scopeByDraft}
            confirmedByDraft={confirmedByDraft}
            scannedByDraft={scannedByDraft}
            evidenceByDraft={evidenceByDraft}
            onSelect={(draftPath, language) => setDrawer({ kind: 'cell', draftPath, language })}
          />
        ) : (
          <div className="rounded-xl border bg-card px-3 py-4 text-[12px] text-muted-foreground">
            {t('完成扫描并读取译文表后，这里会显示逐稿交付矩阵。')}
          </div>
        )}
      </section>

      <div className="wb-v3-preparation">
      {/* 文件夹条（能力①） */}
      <div data-step1-target="folder" className="rounded-xl border bg-card px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className="text-base">📁</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12px]" title={root}>
            {root}
          </span>
          <button type="button" className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted" onClick={onChangeFolder}>
            {copy.changeFolder}
          </button>
          <button type="button" className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted" onClick={onRescan}>
            {copy.rescan}
          </button>
        </div>
        <div className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{folderMeta}</div>
      </div>

      {folderLoading && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-[12px]">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          {copy.folderGate.reading}
        </div>
      )}
      {folderError && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">
          {folderError}
        </div>
      )}

      {/* 扫描状态条（能力②）：未扫完 / 正在扫 / 正在读表头 / 失败时出现；都停了自动消失 */}
      {(scanPending > 0 || scanBusy || surveyBusy || scanState?.notice?.tone === 'error') && (
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-[12px] ${
            scanState?.notice?.tone === 'error'
              ? 'border-rose-500/40 bg-rose-500/10'
              : scanBusy || surveyBusy
                ? 'border-sky-500/40 bg-sky-500/10'
                : 'border-amber-500/40 bg-amber-500/10'
          }`}
        >
          {scanBusy || surveyBusy ? (
            // 四阶段清单（批准稿契约 5）：第四步之前是配对流水，四步的状态与数字都是现有事实，
            // 进度条只数「几步行了」；上面那一行仍是真实动作的进度，不合并成一个假百分比。
            <div data-testid="step1-pair-stages" className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">
                  {!scanBusy ? (
                    t('正在读表头…')
                  ) : scanState?.running ? (
                    `${fillCopy(copy.scan.running, {
                        done: Math.max(scanState.done, scanState.currentIndex !== null ? scanState.done + 1 : scanState.done),
                        total: scanState.total || scanPending,
                      })}${scanState.scanningPath ? ` · ${baseName(scanState.scanningPath)}` : ''}`
                  ) : (
                    `${copy.scan.single}${scanState?.scanningPath ? ` · ${baseName(scanState.scanningPath)}` : ''}`
                  )}
                </span>
                <span
                  data-testid="step1-pair-bar"
                  role="progressbar"
                  aria-label={t('配对了 {done}/{total} 步', { done: pairDoneCount, total: pairStages.length })}
                  aria-valuemin={0}
                  aria-valuemax={pairStages.length}
                  aria-valuenow={pairDoneCount}
                  className="ml-auto block h-1.5 w-28 overflow-hidden rounded-full bg-muted"
                >
                  <i
                    className="block h-full bg-sky-500"
                    style={{ width: `${Math.round((pairDoneCount / pairStages.length) * 100)}%` }}
                  />
                </span>
              </div>
              <ol className="mt-1 grid gap-x-3 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-4">
                {pairStages.map((stage) => (
                  <li
                    key={stage.key}
                    data-stage={stage.key}
                    data-stage-state={stage.done ? 'done' : stage.running ? 'on' : 'todo'}
                    className="flex min-w-0 items-baseline gap-1"
                  >
                    <span aria-hidden className={stage.done ? 'text-emerald-600' : stage.running ? 'text-sky-600' : 'text-muted-foreground'}>
                      {stage.done ? '●' : stage.running ? '◐' : '○'}
                    </span>
                    <span className="min-w-0 truncate">
                      <span className="font-bold">{stage.label}</span>
                      <span className="ml-1 text-[11px] text-muted-foreground">{stage.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <span className="min-w-0 flex-1">{fillCopy(copy.scan.pending, { n: scanPending })}</span>
          )}
          {scanState?.notice && (
            <div
              className={`w-full text-[11.5px] leading-relaxed ${
                scanState.notice.tone === 'error'
                  ? 'text-rose-700 dark:text-rose-300'
                  : scanState.notice.tone === 'warn'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {scanState.notice.text}
            </div>
          )}
        </div>
      )}

      {/* 同名稿提示（能力③） */}
      {duplicateAlerts.map((alert) => {
        const members = alert.members ?? []
        const memberLabels = buildDraftDisplayLabels(members)
        return (
          <div
            key={alert.key}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px]"
          >
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-semibold">{t('同名稿：{name}', { name: alert.name })}</span>
                {' · '}
                {alert.state === 'unknown'
                  ? fillCopy(copy.duplicate.unknown, { n: alert.count })
                  : alert.state === 'identical'
                    ? fillCopy(copy.duplicate.identical, { n: alert.count })
                    : fillCopy(copy.duplicate.different, { n: alert.count })}
              </p>
              {members.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {members.map((member, index) => (
                    <li key={member.masterPath} className="flex flex-wrap gap-x-2">
                      <span>{memberLabels[index] ?? member.masterPath}</span>
                      <span>{member.temporarilyRemoved ? t('已暂时移出本批') : t('在本批')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {alert.canKeepOne && (
              <button
                type="button"
                className="rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-muted"
                onClick={() => onKeepOne(alert.key)}
              >
                {copy.duplicate.keepOne}
              </button>
            )}
            {alert.state === 'different' && !alert.canRestore && (
              <span className="text-[11.5px] text-muted-foreground">{copy.duplicate.keepBoth}</span>
            )}
            {alert.canRestore && (
              <button
                type="button"
                className="ml-auto rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-muted"
                onClick={() => onRestoreDuplicates(alert.key)}
              >
                {copy.duplicate.separate}
              </button>
            )}
          </div>
        )
      })}

      {/* 记忆撞车说明（能力④） */}
      {droppedChoices.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px]">
          {fillCopy(copy.dedupe.dropped, { n: droppedChoices.length })}
        </div>
      )}

      {/* 12 稿上限：被移出的稿逐条列出（能力⑩），不折叠成一句“其余已忽略” */}
      {(scan.droppedDesigns.length > 0 || scan.droppedTruncated) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px]">
          <div className="font-bold">
            {fillCopy(t('{n} 份稿超出本批上限，未加入：'), { n: scan.droppedDesigns.length })}
          </div>
          <ul className="mt-1 space-y-0.5">
            {scan.droppedDesigns.map((design) => (
              <li key={design.path} className="break-all text-[11.5px]">
                {design.relPath}
              </li>
            ))}
          </ul>
          {scan.droppedTruncated && (
            <p className="mt-1 text-[11.5px] text-muted-foreground">{t('超出上限的稿太多，以下未逐条列出。')}</p>
          )}
        </div>
      )}

      {/* 操作回执 */}
      {notice && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[12px]">
          <span className="min-w-0 flex-1">{notice}</span>
          <button type="button" className="rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-muted" onClick={onDismissNotice}>
            {copy.notice.close}
          </button>
        </div>
      )}

      {/* 批量表头调查回执（3.7.25 survey）：成功/失败都点名，不静默 */}
      {surveyNotice && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[12px]">
          <span className="min-w-0 flex-1">{surveyNotice}</span>
          <button type="button" className="rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-muted" onClick={() => setSurveyNotice(null)}>
            {copy.notice.close}
          </button>
        </div>
      )}

      {/* 已跳过的稿：不静默消失，逐个可撤销（能力⑥） */}
      {skippedDrafts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[12px]">
          <span className="text-muted-foreground">
            {copy.skip.done}：{skippedDrafts.map((draft) => draft.name).join('、')}
          </span>
          {skippedDrafts.map((draft) => (
            <button
              key={draft.masterPath}
              type="button"
              className="rounded-md border px-2 py-0.5 text-[11.5px] hover:bg-muted"
              onClick={() => onUndoSkip(draft.masterPath)}
            >
              {copy.skip.undo} · {draft.name}
            </button>
          ))}
        </div>
      )}

      {/* 待办条（能力⑤的入口）：要你处理的 N 件＋去处理第一件 */}
      {todoItems.length > 0 && (
        <div
          data-step1-target="queue"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px]"
        >
          <b>{fillCopy(t('要你处理的 {n} 件：'), { n: todoItems.length })}</b>
          <span className="text-muted-foreground">
            {[
              todoCounts.evidence > 0 ? `${t('绑定不符')} ${todoCounts.evidence}` : '',
              todoCounts.unbound > 0 ? `${t('未配表')} ${todoCounts.unbound}` : '',
              todoCounts.confirm > 0 ? `${t('配对待确认')} ${todoCounts.confirm}` : '',
              todoCounts.coverage > 0 ? `${t('覆盖率<80%')} ${todoCounts.coverage}` : '',
              todoCounts.readfail > 0 ? `${t('读表失败')} ${todoCounts.readfail}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <button
            type="button"
            className="ml-auto rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-bold text-primary-foreground hover:opacity-90"
            onClick={handleGoTodo}
          >
            {t('去处理第一件')}
          </button>
        </div>
      )}


      </div>

      </div>

      <section
        hidden={workspaceView !== 'detail'}
        data-testid="step1-single-draft-view"
        className="rounded-xl border bg-card px-3 py-2.5"
        aria-label={t('单稿详情')}
      >
        <h3 className="text-[13px] font-bold">{t('单稿详情')}</h3>
      </section>

      <section
        hidden={workspaceView !== 'library'}
        data-testid="step1-library-heading"
        className="rounded-xl border bg-card px-3 py-2.5"
        aria-label={t('译文表')}
      >
        <h3 className="text-[13px] font-bold">{t('译文表')}</h3>
      </section>

      {/* 单稿详情复用左侧稿列表与组卡；译库视图复用来源矩阵和表册。 */}
      <div
        hidden={workspaceView === 'matrix' && !groupBindings}
        className={`grid gap-3 lg:items-start ${
          workspaceView === 'detail' && groupBindings
            ? 'lg:grid-cols-[300px_minmax(0,1fr)]'
            : 'grid-cols-1'
        }`}
      >
        {/* 左：设计稿（搜索＋状态行；点行换中栏，点「详情」开抽屉） */}
        <div hidden={workspaceView !== 'detail'} data-testid="step1-draft-list" className="lg:row-span-2 overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-[12px] font-bold">
            {t('设计稿')}
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">{plan.counts.drafts}</span>
          </div>
          <div className="border-b px-3 py-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              spellCheck={false}
              placeholder={t('搜索文件名或 SKU')}
              aria-label={t('搜索文件名或 SKU')}
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-[12px]"
            />
          </div>
          <div className="max-h-[460px] overflow-y-auto">
            {filteredDrafts.length === 0 && (
              <div className="px-3 py-5 text-center text-[12px] text-muted-foreground">
                {fillCopy(t('没有匹配「{query}」的稿'), { query })}
              </div>
            )}
            {filteredDrafts.map((item) => {
              const group = groupByDraft.get(item.path)
              const tone = group?.tone ?? item.tone
              const statusLabel = group?.statusLabel ?? item.statusLabel
              const evidence = evidenceByDraft[item.path]
              const active = activeDraftPath === item.path
              return (
                <div
                  key={item.path}
                  className={`flex w-full items-start gap-2 border-b px-3 py-2 text-[12px] ${
                    active ? 'bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      tone === 'ok'
                        ? 'bg-teal-600'
                        : tone === 'warn'
                          ? 'bg-amber-500'
                          : tone === 'bad'
                            ? 'bg-rose-500'
                            : 'bg-muted-foreground/40'
                    }`}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedDraftPath(item.path)}
                  >
                    <span className="block truncate font-bold" title={item.relPath}>
                      {item.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Tag tone={tone}>{statusLabel}</Tag>
                      {evidence && (
                        <span
                          data-testid="step1-evidence-badge"
                          data-evidence-tier={evidence.tier}
                          title={evidenceDetail(evidence)}
                          className={`rounded border px-1 py-px text-[10px] font-bold ${EVIDENCE_CLASS[evidence.tier]}`}
                        >
                          {evidenceLabel(evidence.tier)}
                        </span>
                      )}
                      {group ? (
                        <span>
                          {fillCopy(t('可交付 {n} 份'), { n: deliverablesByDraft[group.draftPath]?.count ?? 0 })}
                        </span>
                      ) : (
                        item.chosen && <span>{fillCopy(t('{n} 语种'), { n: item.languageCount })}</span>
                      )}
                      {item.issueCount > 0 && <span>{fillCopy(t('{n} 处'), { n: item.issueCount })}</span>}
                      {item.reading && <span>{copy.read.shortReading}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                    aria-label={fillCopy(t('查看 {name} 的详情'), { name: item.name })}
                    title={t('查看详情：换表 / 读全文 / 跳过')}
                    onClick={() => openDraftDrawer(item.path)}
                  >
                    {t('详情')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div hidden={workspaceView !== 'detail'}>{renderGroupCard()}</div>
        <div hidden={workspaceView === 'library'} className={workspaceView === 'detail' ? 'lg:col-start-2' : undefined}>
          {renderExceptions(workspaceView === 'detail' ? activeDraftPath : null)}
        </div>

        {/* 译库视图：来源矩阵是表来源诊断，不替代交付矩阵。 */}
        <div
          hidden={workspaceView !== 'library'}
          data-step1-target="matrix"
          data-testid="step1-source-matrix"
          className="overflow-hidden rounded-xl border bg-card"
        >
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <h2 className="text-[13px] font-bold">{t('译文来源')}</h2>
            <button
              type="button"
              aria-pressed={onlyIssue}
              className="rounded border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
              onClick={() => setOnlyIssue((previous) => !previous)}
            >
              {onlyIssue ? t('看全部') : t('只看有问题的')}
            </button>
            <button
              type="button"
              className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              aria-expanded={matrixOpen}
              aria-controls="step1-matrix-body"
              onClick={() => setMatrixOpen((previous) => !previous)}
            >
              {matrixOpen ? t('收起') : t('展开')}
            </button>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {fillCopy(t('{n} 格'), { n: allCells.length })}
              {unusedTableCount > 0 ? ` · ${fillCopy(t('{n} 张表未被使用'), { n: unusedTableCount })}` : ''}
            </span>
          </div>
          {/* 折叠只收排版不收事实：格子全部留在 DOM 里，收起时也照样被第 1 步的判据读到。 */}
          <div id="step1-matrix-body" className={`max-h-[460px] overflow-auto ${matrixOpen ? '' : 'hidden'}`}>
            {plan.rows.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">{copy.matrix.empty}</div>
            ) : languages.length === 0 ? (
              <div className="px-3 py-4 text-[12px] leading-relaxed text-muted-foreground">
                {copy.matrix.noLangs}
              </div>
            ) : (
              <table className="w-full min-w-[560px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="sticky left-0 z-20 min-w-[110px] bg-muted/40 px-2.5 py-1.5 text-left font-bold">
                      {t('设计稿 ＼ 语种')}
                    </th>
                    {languages.map((language) => {
                      const doingCount = allCells.filter(
                        (cell) => cell.language === language && cell.status !== 'na' && cell.status !== 'unbound',
                      ).length
                      const languageSelected = drawer?.kind === 'language' && drawer.language === language
                      return (
                        <th key={language} className="sticky top-0 z-10 whitespace-nowrap bg-muted/40 px-1 py-1 text-center font-bold">
                          <button
                            type="button"
                            aria-pressed={languageSelected}
                            aria-label={fillCopy(t('{language}：{n} 份稿做这门语言'), { language, n: doingCount })}
                            title={t('点击查看这门语言下每份稿、来源表和读表状态')}
                            onClick={() =>
                              setDrawer(languageSelected ? null : { kind: 'language', language })
                            }
                            className={`cursor-pointer rounded px-2 py-1 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground ${
                              languageSelected ? 'bg-muted text-foreground' : ''
                            }`}
                          >
                            {language}
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row, rowIndex) => {
                    const item = draftItems[rowIndex]
                    return (
                      <tr key={row.draft.masterPath} className="border-b last:border-b-0">
                        <th className="sticky left-0 z-10 max-w-[150px] bg-card px-2.5 py-1.5 text-left font-normal">
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 text-left hover:underline"
                            title={row.draft.relPath}
                            onClick={() => openDraftDrawer(row.draft.masterPath)}
                          >
                            <span
                              aria-hidden
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                item.tone === 'ok'
                                  ? 'bg-teal-600'
                                  : item.tone === 'warn'
                                    ? 'bg-amber-500'
                                    : item.tone === 'bad'
                                      ? 'bg-rose-500'
                                      : 'bg-muted-foreground/40'
                              }`}
                            />
                            <span className="truncate font-mono text-[11.5px]">{item.name}</span>
                          </button>
                        </th>
                        {languages.map((language, languageIndex) => {
                          const cell = matrix[rowIndex]?.[languageIndex]
                          if (!cell) return <td key={language} className="p-0 text-center text-muted-foreground">—</td>
                          const record = cell.tableId ? recordById.get(cell.tableId) ?? null : null
                          const dimmed = onlyIssue && !isIssueCell(cell, record)
                          const selected =
                            drawer?.kind === 'cell' && drawer.draftPath === cell.draftPath && drawer.language === cell.language
                          return (
                            <td key={language} className="p-0.5 text-center">
                              <button
                                type="button"
                                aria-pressed={selected}
                                aria-label={matrixCellTitle(cell, record)}
                                title={matrixCellTitle(cell, record)}
                                onClick={() => setDrawer({ kind: 'cell', draftPath: cell.draftPath, language: cell.language })}
                                className={`flex min-h-[34px] w-full flex-col items-center justify-center gap-0.5 border px-1 py-1 text-[10.5px] leading-tight transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground ${
                                  CELL_CLASS[cell.status]
                                } ${dimmed ? 'opacity-25' : ''} ${selected ? 'ring-2 ring-foreground ring-inset' : ''}`}
                              >
                                <span className="max-w-full truncate font-bold">
                                  {cell.status === 'na' ? '—' : cell.sourceLabel || '—'}
                                </span>
                                <span>{cellText(cell, record)}</span>
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {/* 图例（七态） */}
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2 text-[11px] text-muted-foreground ${matrixOpen ? '' : 'hidden'}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40" aria-hidden />
              {t('就绪（≥95%）')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40" aria-hidden />
              {t('待检查（80–94%）')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40" aria-hidden />
              {t('有问题（<80%）')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-border bg-muted/40" aria-hidden />
              {t('表头已读 · 待读全文')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-dashed border-border" aria-hidden />
              {t('未扫描')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-rose-400" aria-hidden />
              {t('未配表')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm border border-dotted border-border/70" aria-hidden />
              {t('— 本稿不做')}
            </span>
          </div>
        </div>
      </div>

      {/* 译库视图中的表册：文件夹里每张表都列出，含孤儿表与读失败的。 */}
      <div hidden={workspaceView !== 'library'} data-testid="step1-workspace-library-list">
        <TableInventoryList
          tables={scan.tables}
          tableTotal={scan.tableTotal}
          tablesTruncated={scan.tablesTruncated}
          choices={choices}
          readStates={readStates}
          parsedByDraft={parsedByDraft}
          getDraftKey={getDraftKey}
          surveyMeta={surveyMeta}
          records={inventory}
          onRetryRead={onRetryRead}
          onOpenTable={(record) => setDrawer({ kind: 'table', tableId: record.id })}
        />
      </div>

      {/* 右侧抽屉：格视图（稿×语言）/ 列视图（该语言全稿）/ 表详情 */}
      {drawer && (
        <div
          data-step1-target="language-detail"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex justify-end bg-black/30"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawer(null)
          }}
        >
          <aside className="flex h-full w-full max-w-[420px] flex-col overflow-hidden border-l bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{drawerTitle(drawer, plan, recordById)}</span>
              <button
                type="button"
                className="rounded-md border px-2 py-0.5 text-[11.5px] text-muted-foreground hover:bg-muted"
                aria-label={t('关闭')}
                onClick={() => setDrawer(null)}
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-[12px]">
              {drawer.kind === 'cell' && (
                <CellDrawerBody
                  drawer={drawer}
                  plan={plan}
                  choices={choices}
                  remembered={remembered}
                  readStates={readStates}
                  probes={probes}
                  languages={languages}
                  recordById={recordById}
                  cellsOf={cellsOf}
                  onChoose={onChoose}
                  onChooseGroup={onChooseGroup}
                  onForget={onForget}
                  onRetryRead={onRetryRead}
                  onSkip={onSkip}
                  onPickTable={onPickTable}
                  onRescan={onRescan}
                  scopeByDraft={scopeByDraft ?? {}}
                  onOpenReview={onOpenReview}
                  onIncludeLanguage={onIncludeLanguage}
                />
              )}
              {drawer.kind === 'language' && (
                <LanguageDrawerBody
                  language={drawer.language}
                  plan={plan}
                  matrix={matrix}
                  languages={languages}
                  onOpenCell={(draftPath) => openDraftDrawer(draftPath, drawer.language)}
                />
              )}
              {drawer.kind === 'table' && (
                <TableDrawerBody
                  record={recordById.get(drawer.tableId) ?? null}
                  onRetryRead={onRetryRead}
                  parsedByDraft={tableParsesByDraft ?? {}}
                  allocationDrafts={allocationDrafts}
                  allocations={tableAllocations}
                  onReadForAllocation={onReadTableForAllocation}
                  onSaveAllocation={onSaveTableAllocation}
                  onClearAllocation={onClearTableAllocation}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      <StepGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title={copy.guide.title}
        skipLabel={copy.guide.skip}
        prevLabel={copy.guide.prev}
        nextLabel={copy.guide.next}
        doneLabel={copy.guide.done}
      />
      <StepHelp
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onReplay={() => {
          setHelpOpen(false)
          setGuideOpen(true)
        }}
        title={copy.help.title}
        closeLabel={copy.help.close}
        replayLabel={copy.help.replay}
        items={helpItems}
      />
    </div>
  )
}

function drawerTitle(
  drawer: DrawerSelection,
  plan: AttributionPlan,
  recordById: Map<string, TableRecord>,
): string {
  if (drawer.kind === 'language') return fillCopy(t('{language} · 全部设计稿'), { language: drawer.language })
  if (drawer.kind === 'table') return recordById.get(drawer.tableId)?.relPath ?? t('表详情')
  const row = plan.rows.find((item) => item.draft.masterPath === drawer.draftPath)
  const name = row ? baseName(row.draft.relPath) : drawer.draftPath
  return drawer.language ? `${name} · ${drawer.language}` : name
}

interface CellDrawerBodyProps {
  drawer: { kind: 'cell'; draftPath: string; language: string }
  plan: AttributionPlan
  choices: Record<string, string>
  remembered: Record<string, boolean>
  readStates: Record<string, StageTableReadState>
  probes: Record<string, StageTableProbe>
  languages: string[]
  recordById: Map<string, TableRecord>
  cellsOf: (draftPath: string) => SourceMatrixCell[]
  onChoose: (draftPath: string, tablePath: string) => void
  onChooseGroup: (draftPath: string, tablePath: string) => void
  onForget: (draftPath: string) => void
  onRetryRead: (draftPath: string) => void
  onSkip: (draftPath: string) => void
  onPickTable: (draftPath: string) => void
  onRescan: () => void
  scopeByDraft: Record<string, string[]>
  onOpenReview: (draftPath: string, language: string) => void
  onIncludeLanguage: (draftPath: string, language: string) => void
}

/** 格视图：一份稿 × 一门语言的详情＋这一稿的配对裁决（能力⑤⑦⑨的落点）。 */
function CellDrawerBody({
  drawer,
  plan,
  choices,
  remembered,
  readStates,
  probes,
  languages,
  recordById,
  cellsOf,
  onChoose,
  onChooseGroup,
  onForget,
  onRetryRead,
  onSkip,
  onPickTable,
  onRescan,
  scopeByDraft,
  onOpenReview,
  onIncludeLanguage,
}: CellDrawerBodyProps) {
  const copy = useSiteCopy('workbench').step1
  const row = plan.rows.find((item) => item.draft.masterPath === drawer.draftPath) ?? null
  const cells = cellsOf(drawer.draftPath)
  const activeLanguage =
    drawer.language || cells.find((cell) => cell.status !== 'na')?.language || languages[0] || ''
  const languageIndex = languages.indexOf(activeLanguage)
  const cell = languageIndex >= 0 ? cells[languageIndex] ?? null : null
  const chosen = choices[drawer.draftPath] ?? null
  // 格上有表就用格上那张；格上明确没有表（这一门没配表）时**不许**回退去拿基准表答话，
  // 否则抽屉会把别的语言的表写成「取自」，把缺门说成有表。
  const record = cell
    ? cell.tableId
      ? recordById.get(cell.tableId) ?? null
      : null
    : chosen
      ? recordById.get(normalizeTableId(chosen)) ?? null
      : null
  const inExecutionScope = (scopeByDraft[drawer.draftPath] ?? []).includes(activeLanguage)
  const languageExists = Boolean(record?.langs.includes(activeLanguage))
  const canOpenReview = inExecutionScope && languageExists && record?.stage === 'ready'
  const read = readStates[drawer.draftPath]
  const isMissing = Boolean(row && row.candidates.length === 0 && !chosen)
  const isConflict = Boolean(row && row.status === 'conflict' && !chosen && row.candidates.length > 0)

  const issues: string[] = []
  if (!chosen) {
    issues.push(t('这份稿还没配上译文表：手动选一张，或跳过这份稿。'))
  } else if (record?.stage === 'error') {
    issues.push(fillCopy(t('绑定的表读失败：{message}'), { message: record.error?.message ?? read?.message ?? '' }))
  } else {
    if (cell?.status === 'bad') {
      issues.push(fillCopy(t('对稿覆盖率 {coverage}%，低于 80%：大部分句子没对上'), { coverage: cell.coverage ?? 0 }))
    } else if (cell?.status === 'wait') {
      issues.push(fillCopy(t('对稿覆盖率 {coverage}%，低于 95% 阈值，需人工确认'), { coverage: cell.coverage ?? 0 }))
    } else if (record && record.stage !== 'ready' && cell && cell.status !== 'na') {
      issues.push(t('请先读取这张译文表，再进行校对。'))
    }
  }

  const coverageText =
    cell?.coverage != null
      ? `${cell.coverage}%`
      : cell
        ? cell.status === 'ready'
          ? '✓'
          : cell.status === 'na'
            ? '—'
            : record?.stage === 'ready'
              ? t('无法估算')
              : t('待读全文')
        : '—'

  return (
    <div className="space-y-3">
      <dl className="space-y-1.5 rounded-md border px-2.5 py-2 text-[12px]">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('状态')}</dt>
          <dd className="min-w-0 flex-1">
            {read?.status === 'error'
              ? t('读表失败')
              : read?.status === 'reading'
                ? copy.read.reading
                : chosen
                  ? t('已配表')
                  : t('未配表')}
            {cell?.status === 'ready' && <span> · {t('就绪')}</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('这一份')}</dt>
          <dd className="min-w-0 flex-1 font-mono">{activeLanguage || '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('取自')}</dt>
          <dd className="min-w-0 flex-1 break-all">{record ? record.relPath : '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('对稿覆盖率')}</dt>
          <dd className="min-w-0 flex-1 font-mono">{coverageText}</dd>
        </div>
        {row && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">{t('交付物')}</dt>
            <dd className="min-w-0 flex-1">
              {row.identity.sku ?? t('认不出 SKU')} · {DELIVERABLE_LABEL[row.identity.deliverable]}
            </dd>
          </div>
        )}
      </dl>

      {issues.length > 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 leading-relaxed">
          <b>{t('要处理的')}</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-teal-600/40 bg-teal-600/10 px-2.5 py-2 leading-relaxed">
          <b>{t('这一份就绪')}</b>
          <p className="mt-0.5 text-muted-foreground">{t('覆盖率达到阈值，人工确认后即可进入生成。')}</p>
        </div>
      )}

      {/* 配对裁决（能力⑤⑨）：冲突候选 / 缺表 / 记忆带出可忘掉，全部接现有回调 */}
      {isMissing && (
        <div className="space-y-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2">
          <div className="font-bold">{copy.missing.title}</div>
          <p className="leading-relaxed text-muted-foreground">{copy.missing.body}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-bold text-primary-foreground hover:opacity-90"
              onClick={() => onPickTable(drawer.draftPath)}
            >
              {copy.missing.pickTable}
            </button>
            <button type="button" className="rounded-md border bg-card px-2.5 py-1 text-[11.5px] hover:bg-muted" onClick={onRescan}>
              {copy.missing.rescan}
            </button>
            <button
              type="button"
              className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted"
              onClick={() => onSkip(drawer.draftPath)}
            >
              {copy.missing.skip}
            </button>
          </div>
        </div>
      )}

      {isConflict && row && (
        <div className="space-y-1.5">
          <div className="text-[11.5px] font-bold">{copy.choose.one}</div>
          <div className="grid gap-1.5">
            {row.candidates.map((candidate) => {
              const groupOthers = plan.rows.filter(
                (other) =>
                  other.draft.masterPath !== row.draft.masterPath &&
                  other.candidates.some((item) => item.path === candidate.path) &&
                  !(
                    other.identity.sku === row.identity.sku &&
                    other.identity.deliverable === row.identity.deliverable
                  ),
              )
              const probe = probes[`${drawer.draftPath}::${candidate.path}`]
              return (
                <div key={candidate.path} className="rounded-md border px-2.5 py-2">
                  <button type="button" className="block w-full text-left hover:underline" onClick={() => onChoose(drawer.draftPath, candidate.path)}>
                    <span className="block truncate font-bold">{baseName(candidate.path)}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{candidate.relPath}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {DELIVERABLE_LABEL[candidate.deliverable]}
                      {candidate.exactDeliverable ? t('（交付物一致）') : t('（交付物不同）')}
                    </span>
                  </button>
                  {probe && (
                    <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-foreground">
                      {probe.status === 'reading'
                        ? copy.choose.probeReading
                        : probe.status === 'error'
                          ? fillCopy(copy.choose.probeError, { message: probe.message ?? '' })
                          : fillCopy(copy.choose.probeReady, { sheets: probe.sheets, languages: probe.languages, rows: probe.rows })}
                    </span>
                  )}
                  {groupOthers.length > 0 && (
                    <button
                      type="button"
                      className="mt-1.5 w-full rounded border px-2 py-1 text-[11px] hover:bg-muted"
                      onClick={() => onChooseGroup(drawer.draftPath, candidate.path)}
                    >
                      {fillCopy(copy.choose.group, { n: groupOthers.length })}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {chosen && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2">
          <span className="min-w-0 flex-1 break-all">
            {t('当前：')}
            {baseName(chosen)}
          </span>
          <button
            type="button"
            className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted"
            onClick={() => onPickTable(drawer.draftPath)}
          >
            {copy.choose.changeTable}
          </button>
        </div>
      )}

      {chosen && remembered[drawer.draftPath] && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-teal-600/40 bg-teal-600/10 px-2.5 py-1.5 text-[11.5px]">
          <span>{copy.choose.remembered}</span>
          <button type="button" className="rounded border px-1.5 py-0.5 hover:bg-muted" onClick={() => onForget(drawer.draftPath)}>
            {copy.choose.forget}
          </button>
        </div>
      )}

      {/* 这张表的语言列清单：哪些语言这份稿做、哪些不做 */}
      {record && record.langs.length > 0 && (
        <div>
          <div className="mb-1 text-[11.5px] text-muted-foreground">{t('这张表的语言列')}</div>
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {record.langs.map((language) => (
                <tr key={language} className="border-b last:border-b-0">
                  <td className="px-1 py-1 font-mono">{language}</td>
                  <td className="px-1 py-1 text-right">
                    {language === activeLanguage && cell?.status !== 'na' ? (
                      <Tag tone="ok">{t('做')}</Tag>
                    ) : (
                      <Tag tone="mute">{t('做')}</Tag>
                    )}
                  </td>
                </tr>
              ))}
              {languages
                .filter((language) => !record.langs.includes(language))
                .map((language) => (
                  <tr key={language} className="border-b text-muted-foreground/60 last:border-b-0">
                    <td className="px-1 py-1 font-mono">{language}</td>
                    <td className="px-1 py-1 text-right">{t('— 本稿不做')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!inExecutionScope && languageExists && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[11.5px] leading-relaxed">{t('查看详情不会把这门语言加入执行范围。')}</p>
          <button
            type="button"
            className="mt-2 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground"
            onClick={() => onIncludeLanguage(drawer.draftPath, activeLanguage)}
          >
            {t('明确加入执行范围')}
          </button>
        </div>
      )}

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {record && record.usedBy.length > 1
          ? fillCopy(
              t(
                '这张表由 {n} 份稿使用；本稿仅使用分配给它的行。',
              ),
              { n: record.usedBy.length },
            )
          : t('这张表仅用于当前设计稿。')}
      </p>

      {/* 抽屉按钮组：明确打开该稿该语言的复核 / 读全文或重试 / 换表 / 跳过 */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <button
          type="button"
          disabled={!canOpenReview}
          aria-disabled={!canOpenReview}
          title={canOpenReview ? t('到第 2 步看这份稿×这门语言的逐句审核') : t('这门语言未纳入范围或译文表尚未读完')}
          className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold ${
            canOpenReview ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border bg-muted text-muted-foreground'
          }`}
          onClick={() => {
            if (canOpenReview) onOpenReview(drawer.draftPath, activeLanguage)
          }}
        >
          {t('查看该稿审核')}
        </button>
        {record && record.stage === 'error' && (
          <button
            type="button"
            className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted"
            onClick={() => onRetryRead(drawer.draftPath)}
          >
            {copy.read.retry}
          </button>
        )}
        {record && (record.stage === 'listed' || record.stage === 'reading') && (
          <button
            type="button"
            className="rounded-md border px-2.5 py-1 text-[11.5px] hover:bg-muted"
            onClick={() => onRetryRead(drawer.draftPath)}
          >
            {t('读这张表的全文')}
          </button>
        )}
        <button
          type="button"
          className="ml-auto rounded-md border px-2.5 py-1 text-[11.5px] text-muted-foreground hover:bg-muted"
          onClick={() => onSkip(drawer.draftPath)}
        >
          {t('跳过这份稿（可撤销）')}
        </button>
      </div>
    </div>
  )
}

interface LanguageDrawerBodyProps {
  language: string
  plan: AttributionPlan
  matrix: SourceMatrixCell[][]
  languages: string[]
  onOpenCell: (draftPath: string) => void
}

/** 列视图：这门语言下全部稿的来源与状态对照。 */
function LanguageDrawerBody({ language, plan, matrix, languages, onOpenCell }: LanguageDrawerBodyProps) {
  const languageIndex = languages.indexOf(language)
  // 点一列＝看「哪些稿真做这门语言」。缺这一门的稿不进这张表：它们已经在中栏
  // 「没有这张表」和右栏「少 N 门」里逐条点过名，重复列在这里会把 4 份撑成 14 份。
  const rows = plan.rows
    .map((row, index) => ({ row, cell: matrix[index]?.[languageIndex] ?? null }))
    .filter(
      (entry) =>
        entry.cell && entry.cell.status !== 'na' && entry.cell.status !== 'unbound',
    )
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        {fillCopy(t('本批 {total} 份稿中 {n} 份做这门语言'), { total: plan.rows.length, n: rows.length })}
      </p>
      {rows.length === 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 leading-relaxed">
          {t('没有任何表提供这门语言——本批不做它。')}
        </div>
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-1.5 py-1 font-bold">{t('设计稿')}</th>
              <th className="px-1.5 py-1 font-bold">{t('来源表')}</th>
              <th className="px-1.5 py-1 font-bold">{t('对稿覆盖率')}</th>
              <th className="px-1.5 py-1 font-bold">{t('状态')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, cell }) => (
              <tr key={row.draft.masterPath} className="border-b last:border-b-0">
                <td className="px-1.5 py-1">
                  <button type="button" className="truncate hover:underline" onClick={() => onOpenCell(row.draft.masterPath)}>
                    {baseName(row.draft.relPath)}
                  </button>
                </td>
                <td className="px-1.5 py-1 font-mono text-[11px]">{cell?.sourceLabel || '—'}</td>
                <td className="px-1.5 py-1 font-mono">{cell?.coverage != null ? `${cell.coverage}%` : '—'}</td>
                <td className="px-1.5 py-1">
                  {cell?.status === 'ready'
                    ? t('就绪')
                    : cell?.status === 'wait'
                      ? t('待检查')
                      : cell?.status === 'bad'
                        ? t('有问题')
                        : cell?.status === 'unbound'
                          ? t('未配表')
                          : cell?.status === 'noscan'
                            ? t('未扫')
                            : t('待读全文')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

interface TableDrawerBodyProps {
  record: TableRecord | null
  onRetryRead: (draftPath: string) => void
  parsedByDraft: Record<string, Record<string, ParsedCsv>>
  allocationDrafts: Array<{ masterPath: string; fingerprint: string | null; label: string }>
  allocations: TableAllocationStore
  onReadForAllocation: (tablePath: string, masterPath: string) => void
  onSaveAllocation: (allocation: TableAllocation) => void
  onClearAllocation: (tablePath: string, sheetName: string) => void
}

/** 表册详情：读表预览后明确设独占、共享或归属切片。 */
function TableDrawerBody({
  record,
  onRetryRead,
  parsedByDraft,
  allocationDrafts,
  allocations,
  onReadForAllocation,
  onSaveAllocation,
  onClearAllocation,
}: TableDrawerBodyProps) {
  const [selectedDraftPath, setSelectedDraftPath] = useState('')
  const [kind, setKind] = useState<TableAllocationKind>('exclusive')
  const [members, setMembers] = useState<string[]>([])
  const [moduleOwners, setModuleOwners] = useState<Record<string, string>>({})
  const [moduleConfirmed, setModuleConfirmed] = useState(false)
  const [allowUnassigned, setAllowUnassigned] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const variants = useMemo(() => {
    if (!record) return []
    return Object.entries(parsedByDraft).flatMap(([draftPath, byId]) => {
      const parsed = byId[record.id]
      return parsed ? [{ draftPath, parsed }] : []
    })
  }, [record, parsedByDraft])
  const activeVariant = variants.find((item) => item.draftPath === selectedDraftPath) ?? null
  const parsed = activeVariant?.parsed ?? null
  const sheetName = parsed?.selectedSheetName ?? ''
  const stored = record && parsed ? allocations[tableAllocationKey(record.path, sheetName)] : undefined
  const modules = parsed ? moduleValuesOf(parsed) : []
  const fingerprintCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const draft of allocationDrafts) {
      if (draft.fingerprint) counts.set(draft.fingerprint, (counts.get(draft.fingerprint) ?? 0) + 1)
    }
    return counts
  }, [allocationDrafts])
  const selectableDrafts = allocationDrafts.filter(
    (draft): draft is typeof draft & { fingerprint: string } => Boolean(draft.fingerprint),
  )
  const assignedMembers = kind === 'slice'
    ? [...new Set(Object.values(moduleOwners).filter(Boolean))]
    : members
  const allocationPreview = record && parsed
    ? createTableAllocation({
        parsed,
        tablePath: record.path,
        tableRelPath: record.relPath,
        kind,
        members: assignedMembers,
        moduleOwners,
        moduleColumnConfirmed: moduleConfirmed,
        allowUnassignedRows: allowUnassigned,
        availableFingerprints: selectableDrafts.map((draft) => draft.fingerprint),
      })
    : null

  useEffect(() => {
    if (!selectedDraftPath && variants.length > 0) setSelectedDraftPath(variants[0].draftPath)
    if (selectedDraftPath && !variants.some((item) => item.draftPath === selectedDraftPath)) {
      setSelectedDraftPath(variants[0]?.draftPath ?? '')
    }
  }, [selectedDraftPath, variants])

  useEffect(() => {
    setNotice(null)
    if (!stored) {
      setKind('exclusive')
      setMembers([])
      setModuleOwners({})
      setModuleConfirmed(false)
      setAllowUnassigned(false)
      return
    }
    setKind(stored.kind)
    setMembers(stored.members)
    setModuleOwners(stored.moduleOwners ?? {})
    setModuleConfirmed(stored.moduleColumnConfirmed === true)
    setAllowUnassigned(stored.allowUnassignedRows === true)
  }, [record?.id, sheetName, stored])

  if (!record) {
    return <p className="text-[12px] text-muted-foreground">{t('这张表已不在表册里。')}</p>
  }
  return (
    <div className="space-y-3">
      <dl className="space-y-1.5 rounded-md border px-2.5 py-2 text-[12px]">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('读状态')}</dt>
          <dd className="min-w-0 flex-1">
            {record.stage === 'ready'
              ? t('已读')
              : record.stage === 'reading'
                ? t('读取中')
                : record.stage === 'error'
                  ? t('读表失败')
                  : record.stage === 'truncated'
                    ? t('已截断')
                    : t('未读')}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('语言列')}</dt>
          <dd className="min-w-0 flex-1 break-all">
            {record.langs.length > 0
              ? record.langs.join(' · ')
              : isTableFullyRead(record)
                ? t('没有语言列')
                : t('未读')}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('行数')}</dt>
          <dd className="min-w-0 flex-1 font-mono">{record.rows != null ? record.rows : '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">{t('被谁用')}</dt>
          <dd className="min-w-0 flex-1 break-all">
            {record.usedBy.length > 0
              ? record.usedBy.map((draftPath) => baseName(draftPath)).join('、')
              : t('没有稿用这张表。')}
          </dd>
        </div>
      </dl>
      {record.stage === 'error' && record.error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 leading-relaxed text-rose-700 dark:text-rose-300">
          {fillCopy(t('绑定的表读失败：{message}'), { message: record.error.message })}
        </div>
      )}
      {record.usedBy.length > 0 && record.stage !== 'ready' && (
        <button
          type="button"
          className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-bold text-primary-foreground hover:opacity-90"
          onClick={() => {
            for (const draftPath of record.usedBy) onRetryRead(draftPath)
          }}
        >
          {record.stage === 'error' ? t('重试') : t('读这张表的全文')}
        </button>
      )}
      <section className="space-y-2 rounded-md border p-2.5" aria-label={t('归属与切片')}>
        <div>
          <h4 className="font-bold">{t('这张表给哪些稿用')}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {t('先读一份稿对应的工作表，再明确选独占、共享或按模块切片。未确认的表不会自动套整表。')}
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11.5px]">
            {t('按哪份稿选择工作表')}
            <select
              className="mt-1 block w-full rounded border bg-background px-2 py-1.5"
              value={selectedDraftPath}
              onChange={(event) => setSelectedDraftPath(event.currentTarget.value)}
            >
              <option value="">{t('选择一份已扫描的稿')}</option>
              {allocationDrafts.map((draft) => {
                const variant = variants.find((item) => item.draftPath === draft.masterPath)
                return (
                  <option key={draft.masterPath} value={draft.masterPath} disabled={!draft.fingerprint}>
                    {draft.label}{variant ? ` · ${variant.parsed.selectedSheetName || t('CSV')}` : draft.fingerprint ? ` · ${t('待读')}` : ` · ${t('尚未扫描')}`}
                  </option>
                )
              })}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedDraftPath || !allocationDrafts.find((draft) => draft.masterPath === selectedDraftPath)?.fingerprint}
            className="rounded border px-2 py-1 text-[11.5px] disabled:opacity-50"
            onClick={() => onReadForAllocation(record.path, selectedDraftPath)}
          >
            {variants.some((item) => item.draftPath === selectedDraftPath) ? t('重读该工作表') : t('读表并预览归属')}
          </button>
        </div>

        {parsed ? (
          <>
            <div className="grid grid-cols-2 gap-1 text-[11.5px]">
              <span>{t('选中的工作表')}</span><b className="truncate text-right">{sheetName || t('CSV 文件')}</b>
              <span>{t('原表行数')}</span><b className="text-right">{parsed.rows.length}</b>
              <span>{t('模块值数量')}</span><b className="text-right">{modules.length}</b>
            </div>
            <label className="block text-[11.5px]">
              {t('分配方式')}
              <select
                className="mt-1 block w-full rounded border bg-background px-2 py-1.5"
                value={kind}
                onChange={(event) => setKind(event.currentTarget.value as TableAllocationKind)}
              >
                <option value="exclusive">{t('本稿独占整表')}</option>
                <option value="shared">{t('明确共享整表')}</option>
                <option value="slice">{t('按模块归属切片')}</option>
              </select>
            </label>

            {kind !== 'slice' ? (
              <fieldset className="space-y-1 rounded border p-2">
                <legend className="px-1 text-[11px] font-semibold">{kind === 'exclusive' ? t('选择唯一稿件') : t('选择共享稿件')}</legend>
                {allocationDrafts.map((draft) => {
                  const fingerprint = draft.fingerprint
                  const duplicate = Boolean(fingerprint && fingerprintCounts.get(fingerprint) !== 1)
                  const checked = Boolean(fingerprint && members.includes(fingerprint))
                  return (
                    <label key={draft.masterPath} className="flex items-center gap-2 text-[11.5px]">
                      <input
                        type={kind === 'exclusive' ? 'radio' : 'checkbox'}
                        name={`allocation-${record.id}`}
                        disabled={!fingerprint || duplicate}
                        checked={checked}
                        onChange={() => {
                          if (!fingerprint) return
                          setMembers((previous) => kind === 'exclusive'
                            ? [fingerprint]
                            : checked ? previous.filter((item) => item !== fingerprint) : [...previous, fingerprint])
                        }}
                      />
                      <span>{draft.label}</span>
                      {duplicate && <span className="text-amber-700">{t('有重复设计稿，无法区分')}</span>}
                    </label>
                  )
                })}
              </fieldset>
            ) : (
              <div className="space-y-2 rounded border p-2">
                <label className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <input type="checkbox" checked={moduleConfirmed} onChange={(event) => setModuleConfirmed(event.currentTarget.checked)} />
                  <span>{t('我确认这列模块值表示稿件归属，不是 Banner / Detail 之类的分区标签。')}</span>
                </label>
                {modules.length === 0 ? (
                  <p className="text-[11px] text-rose-700">{t('没有模块值，不能切片。')}</p>
                ) : modules.map((value) => (
                  <label key={value} className="grid grid-cols-[1fr_1.2fr] items-center gap-2 text-[11.5px]">
                    <span className="truncate" title={value}>{value}</span>
                    <select
                      className="min-w-0 rounded border bg-background px-1.5 py-1"
                      value={moduleOwners[value] ?? ''}
                      onChange={(event) => setModuleOwners((previous) => ({ ...previous, [value]: event.currentTarget.value }))}
                    >
                      <option value="">{t('待指定')}</option>
                      {selectableDrafts.map((draft) => (
                        <option key={draft.fingerprint} value={draft.fingerprint} disabled={fingerprintCounts.get(draft.fingerprint) !== 1}>
                          {draft.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <input type="checkbox" checked={allowUnassigned} onChange={(event) => setAllowUnassigned(event.currentTarget.checked)} />
                  <span>{t('明确保留空模块或未映射行，不把它们分给任何稿。')}</span>
                </label>
                {parsed.rows.some((row) => !(row.module ?? '').trim()) && (
                  <p className="text-[11px] text-amber-700">{t('{n} 行模块为空', { n: parsed.rows.filter((row) => !(row.module ?? '').trim()).length })}</p>
                )}
              </div>
            )}

            <div className="rounded bg-muted/50 px-2 py-1.5 text-[11px]" aria-live="polite">
              <b>{t('应用前预览')}</b>
              <p>{t('原表 {total} 行；分配 {assigned} 行；未分配 {leftover} 行', {
                total: allocationPreview?.validation.totalRows ?? parsed.rows.length,
                assigned: Object.values(allocationPreview?.validation.rowsByFingerprint ?? {}).reduce((sum, count) => sum + count, 0),
                leftover: allocationPreview?.validation.leftoverRows ?? parsed.rows.length,
              })}</p>
              {allocationPreview?.validation.reason && <p className="mt-0.5 text-rose-700">{allocationPreview.validation.reason}</p>}
              {Object.entries(allocationPreview?.validation.rowsByFingerprint ?? {}).map(([fingerprint, count]) => (
                <p key={fingerprint}>{selectableDrafts.find((draft) => draft.fingerprint === fingerprint)?.label ?? fingerprint.slice(0, 10)}：{count} 行</p>
              ))}
            </div>
            {notice && <p role="status" className="text-[11px] text-rose-700">{notice}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!allocationPreview?.allocation}
                className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-bold text-primary-foreground disabled:opacity-50"
                onClick={() => {
                  if (!allocationPreview?.allocation) return
                  onSaveAllocation(allocationPreview.allocation)
                  setNotice(t('归属已保存；受影响稿的旧确认会重新核验。'))
                }}
              >
                {t('确认并应用')}
              </button>
              {stored && (
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-[11.5px]"
                  onClick={() => onClearAllocation(record.path, sheetName)}
                >
                  {t('清除这条归属')}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{t('先读表，才能预览工作表、模块值和分配行数。')}</p>
        )}
      </section>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {t('译文表变更后，请重新确认分配。')}
      </p>
    </div>
  )
}
