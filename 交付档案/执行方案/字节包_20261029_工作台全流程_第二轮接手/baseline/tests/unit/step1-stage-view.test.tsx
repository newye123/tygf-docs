// 第 1 步新壳 step1-stage-view 的能力清单测试（多稿第 1 步重排 P2，执行工单 §4.2）。
// 能力 ①–⑬ 逐项至少 1 断言：先立后破——本文件跑绿之后才允许删 attribution-stage。
// 运行：npx vitest run tests/unit/step1-stage-view.test.tsx

import React from 'react'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { Step1StageView } from '@/components/workbench/step1-stage-view'
import { buildGroupBindings } from '@/lib/workbench/group-binding'
import { countDeliverables, excludedReadySlots } from '@/lib/workbench/slot-scope'
import { attributionAutoChoices, buildAttributionPlan } from '@/lib/workbench/sku-attribution'
import { evaluateStageGate, stageGateRowsFromPlan } from '@/lib/workbench/stage-rows'
import type { StageTableReadState } from '@/lib/workbench/stage-table-loader'
import { LocalAssistantRequestError } from '@/lib/workbench/local-assistant-client'
import type { FolderScanResult } from '@/lib/workbench/local-assistant-client'

// 3.7.25 批量表头调查（survey-tables）是网络调用：单测里换成可控 mock——
// 成功→并入表册；旧助手（SURVEY_ENDPOINT_MISSING）→回退逐张 onRetryRead。
const { surveyPreparationTablesMock } = vi.hoisted(() => ({ surveyPreparationTablesMock: vi.fn() }))
vi.mock('@/lib/workbench/local-assistant-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workbench/local-assistant-client')>()
  return { ...actual, surveyPreparationTables: surveyPreparationTablesMock }
})
import type { AttributionPlan } from '@/lib/workbench/sku-attribution'
import type { StageGateResult } from '@/lib/workbench/stage-rows'
import type { ParsedCsv } from '@/lib/types'

const A = { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' }
const B = { path: 'C:\\tmp\\6896-主图.psb', relPath: '6896-主图.psb' }
const C = { path: 'C:\\tmp\\7788-详情页.psb', relPath: '7788-详情页.psb' }
const T1 = { path: 'C:\\tmp\\5857-主图.xlsx', relPath: '5857-主图.xlsx', ext: 'xlsx', dir: '' }
const T2 = { path: 'C:\\tmp\\6896-主图.xlsx', relPath: '6896-主图.xlsx', ext: 'xlsx', dir: '' }
const T3 = { path: 'C:\\tmp\\7788-详情页.xlsx', relPath: '7788-详情页.xlsx', ext: 'xlsx', dir: '' }
/** 孤儿表：文件名认不出 SKU，没有任何稿绑定（能力⑧）。 */
const T4 = { path: 'C:\\tmp\\备用表.xlsx', relPath: '备用表.xlsx', ext: 'xlsx', dir: '' }

type Design = { path: string; relPath: string }
type Table = { path: string; relPath: string; ext: string; dir: string }

function parsed(languageColumns: string[], sources: string[]): ParsedCsv {
  return {
    sourceHeader: '原文',
    sheetNames: ['Sheet1'],
    languageColumns,
    rows: sources.map((source) => ({ source, translations: {} })),
    warnings: [],
  }
}

// 覆盖率夹具：词与词之间互不为子串（覆盖率粗估含「部分包含」档，s1⊂s10 会假命中）。
// A=90%（待检查）、B=50%（有问题）、C=100%（就绪）——与执行前闸同一口径。
const A_SOURCES = ['a1b', 'c2d', 'e3f', 'g4h', 'i5j', 'k6l', 'm7n', 'o8p', 'q9r', 's0t']

const MAIN_PARSED: Record<string, ParsedCsv | null> = {
  [A.path]: parsed(['ES', 'FR'], A_SOURCES.slice(0, 9)),
  [B.path]: parsed(['ES'], ['b1']),
  [C.path]: parsed(['JA'], ['c1']),
}
const MAIN_COVERAGE_DRAFTS = [
  {
    masterPath: A.path,
    summary: { textLayers: A_SOURCES.map((source) => ({ sourceText: source })) },
    table: { languageColumns: ['ES', 'FR'], rows: A_SOURCES.slice(0, 9).map((source) => ({ source })) },
  },
  {
    masterPath: B.path,
    summary: { textLayers: [{ sourceText: 'b1' }, { sourceText: 'b2' }] },
    table: { languageColumns: ['ES'], rows: [{ source: 'b1' }] },
  },
  {
    masterPath: C.path,
    summary: { textLayers: [{ sourceText: 'c1' }] },
    table: { languageColumns: ['JA'], rows: [{ source: 'c1' }] },
  },
]

interface Core {
  scan: FolderScanResult
  plan: AttributionPlan
  choices: Record<string, string>
  reads: Record<string, StageTableReadState>
  gate: StageGateResult
}

function makeCore(designs: Design[], tables: Table[]): Core {
  const plan = buildAttributionPlan(
    designs.map((design) => ({ masterPath: design.path, relPath: design.relPath })),
    tables,
  )
  const choices = attributionAutoChoices(plan)
  const reads: Record<string, StageTableReadState> = {}
  for (const row of plan.rows) {
    const tablePath = choices[row.draft.masterPath]
    if (tablePath) reads[row.draft.masterPath] = { status: 'ready', tablePath }
  }
  const gate = evaluateStageGate({
    entries: designs.map((design) => ({ masterPath: design.path, name: design.relPath, scanned: true })),
    rows: stageGateRowsFromPlan(plan, choices),
    reads,
  })
  const scan: FolderScanResult = {
    root: 'C:\\tmp',
    designs,
    designTotal: designs.length,
    designKept: designs.length,
    droppedDesigns: [],
    droppedTruncated: false,
    tables,
    tableTotal: tables.length,
    tablesTruncated: false,
    skipped: [],
    skippedTotal: 0,
    maxDepth: 3,
    truncated: false,
  }
  return { scan, plan, choices, reads, gate }
}

const MAIN: Core = makeCore([A, B, C], [T1, T2, T3, T4])

type Props = ComponentProps<typeof Step1StageView>

function buildProps(overrides: Partial<Props> = {}, core: Core = MAIN): Props {
  const base: Props = {
    root: core.scan.root,
    scan: core.scan,
    plan: core.plan,
    choices: core.choices,
    remembered: {},
    languagesByDraft: {
      [A.path]: ['ES', 'FR'],
      [B.path]: ['ES'],
      [C.path]: ['JA'],
    },
    droppedChoices: [],
    readStates: core.reads,
    probes: {},
    folderLoading: false,
    folderError: null,
    scanState: null,
    scanPending: 0,
    duplicateAlerts: [],
    skippedDrafts: [],
    gate: core.gate,
    notice: null,
    onChangeFolder: vi.fn(),
    onRescan: vi.fn(),
    onScanAll: vi.fn(),
    onStopScan: vi.fn(),
    onChoose: vi.fn(),
    onChooseGroup: vi.fn(),
    onForget: vi.fn(),
    onRetryRead: vi.fn(),
    onSkip: vi.fn(),
    onUndoSkip: vi.fn(),
    onPickTable: vi.fn(),
    onRestoreDuplicates: vi.fn(),
    onKeepOne: vi.fn(),
    onDismissNotice: vi.fn(),
    onNext: vi.fn(),
    onShowClassic: vi.fn(),
    parsedByDraft: MAIN_PARSED,
    getDraftKey: (masterPath: string) => masterPath,
    coverageDrafts: MAIN_COVERAGE_DRAFTS,
    deliverablesByDraft: {},
    manualPickCount: 0,
    onToggleSlot: vi.fn(),
    onRestoreSlots: vi.fn(),
    onClearChoice: vi.fn(),
    onBlockTable: vi.fn(),
    onUnblockTable: vi.fn(),
    onOpenReview: vi.fn(),
    onIncludeLanguage: vi.fn(),
  }
  return { ...base, ...overrides }
}

function renderStage(overrides: Partial<Props> = {}, core: Core = MAIN) {
  const props = buildProps(overrides, core)
  render(<Step1StageView {...props} />)
  return props
}

function selectWorkspaceView(view: 'matrix' | 'detail' | 'library') {
  const back = screen.queryByTestId('step1-view-matrix')
  if (back) fireEvent.click(back)
  if (view !== 'matrix') fireEvent.click(screen.getByTestId(`step1-view-${view}`))
}

const internalCopy = ['现状对照（图一）', '一组表 vs 今天的做法', '手工选表', '矩阵格数', '会话摘要', '同一个取数口', '切换视图不会改变执行范围'];
function assertProductCopy(html: string) {
  for (const text of internalCopy) expect(html, text).not.toContain(text)
}

describe('任务入口与产品文案', () => {
  it('默认显示进度，设计稿和译文表可由上下文入口管理并返回', () => {
    const props = renderStage()
    expect(screen.queryByRole('group', { name: '工作台视图' })).toBeNull()
    expect(screen.getByTestId('step1-workspace-matrix').hidden).toBe(false)
    selectWorkspaceView('detail')
    expect(screen.getByTestId('step1-draft-list').hidden).toBe(false)
    expect(screen.getByTestId('step1-workspace-matrix').hidden).toBe(true)
    selectWorkspaceView('library')
    expect(screen.getByTestId('step1-workspace-library-list').hidden).toBe(false)
    selectWorkspaceView('matrix')
    expect(screen.getByTestId('step1-workspace-matrix').hidden).toBe(false)
    expect(props.onNext).not.toHaveBeenCalled()
    expect(props.onToggleSlot).not.toHaveBeenCalled()
    expect(props.onIncludeLanguage).not.toHaveBeenCalled()
  })

  it('开发说明不渲染，探针能拒绝注入的历史对照文案', () => {
    const html = renderToStaticMarkup(<Step1StageView {...buildProps()} />)
    assertProductCopy(html)
    expect(() => assertProductCopy(html + '现状对照（图一）')).toThrow()
    assertProductCopy(html)
  })

  it('译文表入口仍能打开归属详情，查看不自动保存分配', () => {
    const save = vi.fn()
    const props = renderStage({ onSaveTableAllocation: save })
    selectWorkspaceView('library')
    fireEvent.click(screen.getAllByRole('button', { name: '详情 / 归属' })[0])
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(save).not.toHaveBeenCalled()
    expect(props.onNext).not.toHaveBeenCalled()
  })
})

beforeEach(() => {
  // 括号不能省：mockReset() 返回 spy 本身，被 beforeEach 当返回值会注册成 afterEach 清理钩子，
  // 反过来把 mock 当无参清理函数再调一次（曾由此造出 unhandled rejection）。
  surveyPreparationTablesMock.mockReset()
})

afterEach(cleanup)

describe('第 1 步新壳（step1-stage-view）能力清单', () => {
  it('主结构：文件夹条/待办条/矩阵/下一步锚点、统计 8 卡、表清单、译文来源矩阵都在，没有 undefined 文案', () => {
    const html = renderToStaticMarkup(<Step1StageView {...buildProps()} />)
    for (const target of ['folder', 'queue', 'matrix', 'next']) {
      expect(html).toContain(`data-step1-target="${target}"`)
    }
    expect(html).toContain('译文来源')
    expect(html).toContain('译文表清单')
    expect(html).toContain('备用表.xlsx')
    expect(html).toContain('要你处理的 1 件：')
    expect(html).toContain('去处理第一件')
    expect(html).toContain('交付进度')
    expect(html).not.toContain('手工选表')
    expect(html).not.toContain('<h1')
    expect(html).not.toContain('undefined')
  })


  it('能力①：文件夹条显示路径，换文件夹/重扫回调可达', () => {
    const props = renderStage()
    expect(screen.getByTitle('C:\\tmp')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '换文件夹' }))
    expect(props.onChangeFolder).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getAllByRole('button', { name: '重新扫描' })[0])
    expect(props.onRescan).toHaveBeenCalled()
  })

  it('能力②：扫描状态条＋全部扫描＋停止', () => {
    const props = renderStage({ scanPending: 2 })
    expect(screen.getByText(/还有 2 份稿没扫描/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '全部扫描（按顺序）' }))
    expect(props.onScanAll).toHaveBeenCalledTimes(1)
    cleanup()
    const running = renderStage({
      scanState: { running: true, total: 3, done: 1, currentIndex: 1, scanningPath: null, notice: null },
    })
    fireEvent.click(screen.getByRole('button', { name: '停止' }))
    expect(running.onStopScan).toHaveBeenCalledTimes(1)
  })

  it('能力②-补（契约 5）：真扫时出现四阶段清单＋按步数算的进度条；不扫时不出现', () => {
    const idle = renderStage()
    expect(idle).toBeTruthy()
    expect(screen.queryByTestId('step1-pair-stages')).toBeNull()
    cleanup()
    renderStage({
      scanState: { running: true, total: 3, done: 1, currentIndex: 1, scanningPath: A.path, notice: null },
    })
    const strip = screen.getByTestId('step1-pair-stages')
    for (const label of ['扫描文件夹', '认 SKU 与交付物', '归组', '读表头']) {
      expect(within(strip).getByText(label)).toBeTruthy()
    }
    // 四步的数字取现有派生：3 份稿 / 4 张表、3/3 认出、4 张归 3 组、3/4 张表头已知。
    expect(within(strip).getByText('3 份稿 · 4 张表')).toBeTruthy()
    expect(within(strip).getByText('3/3 认出')).toBeTruthy()
    expect(within(strip).getByText('4 张 → 3 组')).toBeTruthy()
    // 第四步数「表头已知」，不是「全文读完」：表册的 rows 一有值就说明表头读到了。
    expect(within(strip).getByText('3/4 张表头已读')).toBeTruthy()
    // 四步状态直接写在 DOM 上：前三步成立；第四步 3/4 没满、也没在跑 ⇒ todo。
    expect(strip.querySelector('[data-stage="folder"]')?.getAttribute('data-stage-state')).toBe('done')
    expect(strip.querySelector('[data-stage="sku"]')?.getAttribute('data-stage-state')).toBe('done')
    expect(strip.querySelector('[data-stage="group"]')?.getAttribute('data-stage-state')).toBe('done')
    expect(strip.querySelector('[data-stage="headers"]')?.getAttribute('data-stage-state')).toBe('todo')
    // 进度条＝几步行了（文件夹／认 SKU／归组三步成立；读表头 3/4 没满），不写死。
    const bar = screen.getByTestId('step1-pair-bar')
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('4')
    // 条内宽度跟着步数走：3/4 ⇒ 75%。
    expect((bar.querySelector('i') as HTMLElement).style.width).toBe('75%')
    // 逐稿真实进度那一行不能被清单吞掉。
    expect(within(strip).getByText(/正在扫描 2\/3/)).toBeTruthy()
  })



  it('能力②-补（契约 5，认不出 SKU）：认出数带真实分母，第二步停在 ○ 而不是假装满了', () => {
    const NO_SKU = { path: 'C:\\tmp\\无编号-主图.psb', relPath: '无编号-主图.psb' }
    const core = makeCore([A, B, NO_SKU], [T1, T2, T3])
    renderStage(
      {
        scanState: { running: true, total: 3, done: 2, currentIndex: 2, scanningPath: NO_SKU.path, notice: null },
      },
      core,
    )
    const strip = screen.getByTestId('step1-pair-stages')
    expect(within(strip).getByText('2/3 认出')).toBeTruthy()
    expect(strip.querySelector('[data-stage="sku"]')?.getAttribute('data-stage-state')).toBe('todo')
  })

  it('能力②-补（契约 5，空组不算归好）：内核给认不出 SKU 的稿也推空组，只数真收了表的', () => {
    const NO_SKU = { path: 'C:\\tmp\\无编号-主图.psb', relPath: '无编号-主图.psb' }
    const files = ['ES-5857.xlsx', 'FR-5857.xlsx']
    const core = makeCore([A, NO_SKU], files.map((name) => ({ path: `C:\\tmp\\${name}`, relPath: name, ext: 'xlsx', dir: '' })))
    const groupBindings = buildGroupBindings({
      drafts: [
        { masterPath: A.path, fileName: '5857-主图.psb' },
        { masterPath: NO_SKU.path, fileName: '无编号-主图.psb' },
      ],
      tables: files.map((name) => ({
        path: `C:\\tmp\\${name}`,
        relPath: name,
        langs: [name.slice(0, 2)],
        sources: ['同一行原文'],
      })),
      expectedLanguages: ['ES', 'FR'],
    })
    expect(groupBindings.groups.length).toBe(2)
    renderStage(
      {
        groupBindings,
        scanState: { running: true, total: 2, done: 2, currentIndex: 1, scanningPath: null, notice: null },
      },
      core,
    )
    const strip = screen.getByTestId('step1-pair-stages')
    // 2 份稿、2 张表：真收了表的只有 1 组；空组要是也算进来，这里会变成「2 张 → 2 组」。
    expect(within(strip).getByText('2 张 → 1 组')).toBeTruthy()
    cleanup()
    // 全军覆没（所有稿都认不出 SKU）⇒ 不许报「归好组」，第三步停在 ○。
    const none = makeCore([NO_SKU], [T1])
    const noneBindings = buildGroupBindings({
      drafts: [{ masterPath: NO_SKU.path, fileName: '无编号-主图.psb' }],
      tables: [{ path: T1.path, relPath: T1.relPath, langs: ['ES'], sources: ['同一行原文'] }],
      expectedLanguages: ['ES'],
    })
    renderStage(
      {
        groupBindings: noneBindings,
        scanState: { running: true, total: 1, done: 1, currentIndex: 0, scanningPath: null, notice: null },
      },
      none,
    )
    const empty = screen.getByTestId('step1-pair-stages')
    expect(within(empty).getByText('还没配上组')).toBeTruthy()
    expect(empty.querySelector('[data-stage="group"]')?.getAttribute('data-stage-state')).toBe('todo')
  })

  it('能力②-补（契约 5，只读表头不扫稿）：第四步在跑时状态条也在，不会因为没扫稿就消失', async () => {
    // 读表头是独立动作：scanState 为空、扫描停了，条子仍要出现并说明在做什么。
    surveyPreparationTablesMock.mockImplementation(() => new Promise(() => {}))
    renderStage(
      {
        readStates: {
          [B.path]: { status: 'ready', tablePath: T2.path },
          [C.path]: { status: 'ready', tablePath: T3.path },
        },
      },
      MAIN,
    )
    expect(screen.queryByTestId('step1-pair-stages')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '读全部表头' }))
    const strip = await waitFor(() => screen.getByTestId('step1-pair-stages'))
    expect(within(strip).getByText('正在读表头…')).toBeTruthy()
    expect(strip.querySelector('[data-stage="headers"]')?.getAttribute('data-stage-state')).toBe('on')
  })

  it('能力②-补（契约 5，读不了的表）：第四步点名失败张数，不把错误藏进分母', () => {
    renderStage(
      {
        readStates: {
          [A.path]: { status: 'error', tablePath: T1.path, message: '坏文件' },
          [B.path]: { status: 'ready', tablePath: T2.path },
          [C.path]: { status: 'ready', tablePath: T3.path },
        },
        parsedByDraft: { [B.path]: MAIN_PARSED[B.path], [C.path]: MAIN_PARSED[C.path] },
        scanState: { running: true, total: 3, done: 2, currentIndex: 2, scanningPath: null, notice: null },
      },
      MAIN,
    )
    const strip = screen.getByTestId('step1-pair-stages')
    expect(within(strip).getByText('2 张表头已读 · 1 张读不了')).toBeTruthy()
    expect(strip.querySelector('[data-stage="headers"]')?.getAttribute('data-stage-state')).toBe('todo')
  })

  it('能力③：同名稿提示可只留一份/可分开做', () => {
    const props = renderStage({
      duplicateAlerts: [
        {
          key: 'g1',
          name: '5857-主图.psb',
          count: 2,
          state: 'identical',
          members: [
            { masterPath: 'C:/tmp/sku-a/5857-主图.psb', temporarilyRemoved: false },
            { masterPath: 'C:/tmp/sku-b/5857-主图.psb', temporarilyRemoved: true },
          ],
          canKeepOne: true,
          canRestore: true,
        },
      ],
    })
    expect(screen.getByText(/2 份同名且内容相同/)).toBeTruthy()
    expect(screen.getByText('同名稿：5857-主图.psb')).toBeTruthy()
    expect(screen.getByText('sku-a / 5857-主图.psb')).toBeTruthy()
    expect(screen.getByText('sku-b / 5857-主图.psb')).toBeTruthy()
    expect(screen.getByText('已暂时移出本批')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '只留一份' }))
    expect(props.onKeepOne).toHaveBeenCalledWith('g1')
    fireEvent.click(screen.getByRole('button', { name: '分开做' }))
    expect(props.onRestoreDuplicates).toHaveBeenCalledWith('g1')
  })

  it('能力④：记忆撞车提示可见', () => {
    renderStage({ droppedChoices: [B.path] })
    expect(screen.getByText(/有 1 份稿被记忆配到同一张表/)).toBeTruthy()
  })

  it('能力⑤：冲突逐件裁决——待办条计数、去处理第一件开抽屉、候选可点（onChoose/onChooseGroup 可达）', () => {
    const d1 = { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' }
    const d2 = { path: 'C:\\tmp\\5857-主图-2.psb', relPath: '5857-主图-2.psb' }
    const d3 = { path: 'C:\\tmp\\5857-详情页.psb', relPath: '5857-详情页.psb' }
    // d1/d2 同 SKU 同交付物抢一张表（冲突）；d3 交付物不同但同 SKU 的表也算候选（通用工作簿）。
    const core = makeCore([d1, d2, d3], [T1])
    const props = renderStage(
      {
        scan: core.scan,
        plan: core.plan,
        choices: core.choices,
        gate: core.gate,
        readStates: {},
        languagesByDraft: {},
        parsedByDraft: {},
        coverageDrafts: [],
      },
      core,
    )
    expect(screen.getByText(/要你处理的 2 件/)).toBeTruthy()
    expect(screen.getByText(/配对待确认 2/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '去处理第一件' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('选一个')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: /5857-主图\.xlsx/ }))
    expect(props.onChoose).toHaveBeenCalledWith(d1.path, T1.path)
    fireEvent.click(within(dialog).getByRole('button', { name: /同 SKU 的其他 1 份也用这张/ }))
    expect(props.onChooseGroup).toHaveBeenCalledWith(d1.path, T1.path)
  })

  it('能力⑤（缺表分支）：抽屉里选择译文表…回调 onPickTable', () => {
    const missing = { path: 'C:\\tmp\\9999-主图.psb', relPath: '9999-主图.psb' }
    const core = makeCore([A, missing], [T1])
    const props = renderStage(
      {
        scan: core.scan,
        plan: core.plan,
        choices: core.choices,
        gate: core.gate,
        readStates: {},
        languagesByDraft: { [A.path]: ['ES', 'FR'] },
        parsedByDraft: { [A.path]: MAIN_PARSED[A.path] },
        coverageDrafts: [MAIN_COVERAGE_DRAFTS[0]],
      },
      core,
    )
    expect(screen.getByText(/未配表 1/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '去处理第一件' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('这份稿没有候选表')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: '选择译文表…' }))
    expect(props.onPickTable).toHaveBeenCalledWith(missing.path)
  })

  it('能力⑥：跳过这份稿与撤销都可点', () => {
    const props = renderStage()
    selectWorkspaceView('library')
    fireEvent.click(screen.getByRole('button', { name: /5857-主图\.psb · ES/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '跳过这份稿（可撤销）' }))
    expect(props.onSkip).toHaveBeenCalledWith(A.path)
    cleanup()
    const undone = renderStage({ skippedDrafts: [{ masterPath: A.path, name: '5857-主图.psb' }] })
    expect(screen.getByText(/已跳过：5857-主图\.psb/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '撤销 · 5857-主图.psb' }))
    expect(undone.onUndoSkip).toHaveBeenCalledWith(A.path)
  })

  it('能力⑦：抽屉里的换一张表…入口回调 onPickTable', () => {
    const props = renderStage()
    selectWorkspaceView('library')
    fireEvent.click(screen.getByRole('button', { name: /5857-主图\.psb · ES/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '换一张表…' }))
    expect(props.onPickTable).toHaveBeenCalledWith(A.path)
  })

  it('能力⑧：孤儿表罗列在译文表清单里（未用可见）', () => {
    renderStage()
    const list = screen.getByTestId('table-inventory-list')
    expect(within(list).getByText('备用表.xlsx')).toBeTruthy()
    expect(within(list).getByText('未用')).toBeTruthy()
  })

  it('能力⑨：配对待确认可改——记忆带出的选择可忘掉（onForget）', () => {
    const props = renderStage({ remembered: { [A.path]: true } })
    selectWorkspaceView('library')
    fireEvent.click(screen.getByRole('button', { name: /5857-主图\.psb · ES/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('这条是从上次的选择里带出来的。')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: '忘掉这条' }))
    expect(props.onForget).toHaveBeenCalledWith(A.path)
  })

  it('能力⑩：12 稿上限 dropped 逐条列出，不折叠成一句', () => {
    renderStage({
      scan: {
        ...MAIN.scan,
        droppedDesigns: [{ path: 'C:\\tmp\\overflow.psb', relPath: 'overflow.psb' }],
        droppedTruncated: true,
      },
    })
    expect(screen.getByText(/1 份稿超出本批上限，未加入：/)).toBeTruthy()
    expect(screen.getByText('overflow.psb')).toBeTruthy()
    expect(screen.getByText(/未逐条列出/)).toBeTruthy()
  })

  it('能力⑪：来源矩阵格＝来源短名＋状态＋覆盖率；点格开抽屉，列头开列视图，na 格显示—', () => {
    // 新契约：只有「这一稿这一语在执行范围里、库里有这一列、表已读完」才允许进复核；
    // 因此这一条必须带上范围（真实调用侧由 matrixScopeByDraft 提供）。
    const props = renderStage({
      scopeByDraft: { [A.path]: ['ES', 'FR'], [B.path]: ['ES'], [C.path]: ['JA'] },
    })
    selectWorkspaceView('library')
    // 格：来源短名＋覆盖率写进可访问名（title 同文）
    const cell = screen.getByRole('button', { name: '5857-主图.psb · ES · 90% · 待检查' })
    expect(cell.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(cell)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('5857-主图.xlsx')).toBeTruthy()
    expect(within(dialog).getByText('取自')).toBeTruthy()
    expect(within(dialog).getByText('对稿覆盖率')).toBeTruthy()
    // 抽屉按钮组：查看该稿审核（主，随 gate 放行）——它只把人带到「这一稿这一语」，
    // 不再顺手推进整批（旧实现调 onNext，会把整批往后翻一格）。
    fireEvent.click(within(dialog).getByRole('button', { name: '查看该稿审核' }))
    expect(props.onOpenReview).toHaveBeenCalledWith(A.path, 'ES')
    expect(props.onNext).not.toHaveBeenCalled()
    // 关闭抽屉
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // 列头视图：该语言全稿对照
    fireEvent.click(screen.getByRole('button', { name: /ES：2 份稿做这门语言/ }))
    const columnDialog = screen.getByRole('dialog')
    expect(within(columnDialog).getByText('ES · 全部设计稿')).toBeTruthy()
    expect(within(columnDialog).getByText('6896-主图.psb')).toBeTruthy()
    // na 格：本稿不做这门语言
    expect(screen.getByRole('button', { name: '5857-主图.psb · JA · — 本稿不做' })).toBeTruthy()
  })

  it('能力⑫：更多▾里保留逐稿手动导入出口（onShowClassic）', () => {
    const props = renderStage()
    fireEvent.click(screen.getByText('逐稿手动导入…'))
    expect(props.onShowClassic).toHaveBeenCalledTimes(1)
  })

  it('能力⑬：帮助抽屉可打开，引导组件挂载', () => {
    render(<Step1StageView {...buildProps()} />)
    fireEvent.click(screen.getByRole('button', { name: '这一步怎么做' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('带我看一遍')).toBeTruthy()
  })

  it('只看有问题的：切换后非问题格降透明度（照模拟）', () => {
    renderStage()
    selectWorkspaceView('library')
    const toggle = screen.getByRole('button', { name: '只看有问题的' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: '7788-详情页.psb · JA · 100% · 就绪' }).className).not.toContain('opacity-25')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '7788-详情页.psb · JA · 100% · 就绪' }).className).toContain('opacity-25')
  })

  it('左侧设计稿列表：搜索框过滤文件名（矩阵不受影响）', () => {
    renderStage()
    selectWorkspaceView('detail')
    const list = screen.getByTestId('step1-draft-list')
    fireEvent.change(within(list).getByRole('textbox', { name: '搜索文件名或 SKU' }), { target: { value: '6896' } })
    expect(within(list).getByText('6896-主图.psb')).toBeTruthy()
    expect(within(list).queryByText('5857-主图.psb')).toBeNull()
  })

  it('读全部表头：队列里没有可读的绑定时置灰；旧助手（端点缺失）回退逐张走 onRetryRead', async () => {
    // 主夹具三张表都已读，唯一 listed 的孤儿表没有绑定稿 → 置灰
    const props = renderStage()
    const readAll = screen.getByRole('button', { name: '读全部表头' })
    expect(readAll.hasAttribute('disabled')).toBe(true)
    expect(props.onRetryRead).not.toHaveBeenCalled()
    cleanup()
    // 撤掉 A 的读状态：T1 变 listed 且有绑定稿 → 可读
    const reads = renderStage(
      {
        readStates: {
          [B.path]: { status: 'ready', tablePath: T2.path },
          [C.path]: { status: 'ready', tablePath: T3.path },
        },
      },
      MAIN,
    )
    const enabled = screen.getByRole('button', { name: '读全部表头' })
    expect(enabled.hasAttribute('disabled')).toBe(false)
    // 3.7.25：优先批量 survey；旧助手没有该端点（SURVEY_ENDPOINT_MISSING）→ 回退现行为
    surveyPreparationTablesMock.mockRejectedValue(
      new LocalAssistantRequestError('不支持批量读表头', 'SURVEY_ENDPOINT_MISSING'),
    )
    fireEvent.click(enabled)
    await waitFor(() => expect(reads.onRetryRead).toHaveBeenCalledWith(A.path))
  })

  it('读全部表头：survey 成功时一次票并入表册元数据（不逐张 onRetryRead）', async () => {
    surveyPreparationTablesMock.mockImplementation(async (_root: string, tablePaths: string[]) =>
      tablePaths.map((tablePath) => ({
        relPath: tablePath.split(/[\\/]/).pop() ?? tablePath,
        sheets: ['主图', 'A+'],
        languages: ['ES', 'FR'],
        rows: 9,
        warnings: [],
      })),
    )
    const reads = renderStage(
      {
        readStates: {
          [B.path]: { status: 'ready', tablePath: T2.path },
          [C.path]: { status: 'ready', tablePath: T3.path },
        },
      },
      MAIN,
    )
    fireEvent.click(screen.getByRole('button', { name: '读全部表头' }))
    await waitFor(() => expect(surveyPreparationTablesMock).toHaveBeenCalledTimes(1))
    expect(reads.onRetryRead).not.toHaveBeenCalled()
    // 表清单并入元数据：survey 过的表出现「2 种语言」「9 行」与 2 个 sheet
    const list = screen.getByTestId('table-inventory-list')
    await waitFor(() => {
      expect(within(list).getAllByText('2 种语言').length).toBeGreaterThan(0)
      expect(within(list).getAllByText('9 行').length).toBeGreaterThan(0)
      expect(within(list).getAllByText('2 个 sheet').length).toBeGreaterThan(0)
    })
  })

  it('下一步按钮随 gate.ok 置灰，且不放行时点击不前进', () => {
    const props = buildProps({ gate: { ok: false, blockers: [] } })
    const { container } = render(<Step1StageView {...props} />)
    const next = container.querySelector('[data-step1-target="next"]')
    expect(next?.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(next as Element)
    expect(props.onNext).not.toHaveBeenCalled()
  })
})

// ── 三栏（Owner 2026-10-26 定）：左稿 / 中组卡 / 右例外 ─────────────────────
// 前一条 describe 的夹具是「一稿一表」；这里换成「一稿一组语言表」，
// 断言只看两件事：① 中栏每门一格、每格一条去向；② 例外逐件有结论，不合并成一句。
describe('第 1 步三栏：一稿一组语言表', () => {
  const D = { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' }
  const LANGS = ['ES', 'FR', 'JA']

  const tableOf = (fileName: string) => ({
    path: `C:\\tmp\\${fileName}`,
    relPath: fileName,
    ext: 'xlsx',
    dir: '',
  })

  // 文件名第一段就是语言码（languageFromFileName 的口径），段里有 4 位 SKU。
  const langOf = (fileName: string) => fileName.slice(0, 2).toUpperCase()

  const bind = (files: string[], langs: string[] = LANGS) => {
    const tables = files.map((fileName) => ({
      path: `C:\\tmp\\${fileName}`,
      relPath: fileName,
      langs: [langOf(fileName)],
      sources: ['同一行原文'],
    }))
    return buildGroupBindings({
      drafts: [{ masterPath: D.path, fileName: '5857-主图.psb' }],
      tables,
      expectedLanguages: langs,
    })
  }

  /** 夹具里替 workbench-view 算同一份派生：份数＝ready 槽位 ∩ 这一稿要做哪几门。 */
  const deliverablesOf = (bindings: ReturnType<typeof buildGroupBindings>, langs: string[]) =>
    Object.fromEntries(
      bindings.groups.map((group) => [
        group.draftPath,
        { count: countDeliverables(group.slots, langs), excluded: excludedReadySlots(group.slots, langs) },
      ]),
    )

  const renderGroup = (files: string[], overrides: Partial<Props> = {}, langs: string[] = LANGS) => {
    const core = makeCore([D], files.map(tableOf))
    const groupBindings = bind(files, langs)
    const deliverablesByDraft = deliverablesOf(groupBindings, langs)
    const props = buildProps(
      {
        languagesByDraft: { [D.path]: LANGS },
        parsedByDraft: {},
        coverageDrafts: [],
        deliverablesByDraft,
        groupBindings: bind(files, langs),
        ...overrides,
      },
      core,
    )
    render(<Step1StageView {...props} />)
    selectWorkspaceView('detail')
    return props
  }

  // ── 契约 7／8：点掉一格真少一格（只有 ready 格是开关） ──
  it('ready 格是复选框：点它是「这一门不做」，不是打开选表面板', () => {
    const onToggleSlot = vi.fn()
    const props = renderGroup(['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx'], { onToggleSlot })
    const card = screen.getByTestId('step1-group-card')
    const cells = card.querySelectorAll('[role="checkbox"]')
    expect(cells.length).toBe(3)
    fireEvent.click(cells[0]!)
    expect(onToggleSlot).toHaveBeenCalledTimes(1)
    expect(onToggleSlot.mock.calls[0]).toEqual([D.path, 'ES', false])
    expect(props.onPickTable).not.toHaveBeenCalled()
  })

  it('点掉一格：aria-checked 翻转、格上写「已剔除」、组卡报「剔除 1 门」并出「全选回来」', () => {
    const onToggleSlot = vi.fn()
    const onRestoreSlots = vi.fn()
    renderGroup(
      ['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx'],
      {
        onToggleSlot,
        onRestoreSlots,
        deliverablesByDraft: { [D.path]: { count: 2, excluded: ['ES'] } },
      },
    )
    const card = screen.getByTestId('step1-group-card')
    const dropped = card.querySelector('[data-slot-excluded="true"]')
    expect(dropped?.getAttribute('aria-checked')).toBe('false')
    expect(dropped?.textContent).toContain('已剔除')
    expect(within(card).getByText('剔除 1 门')).toBeTruthy()
    expect(within(card).getByText('可交付 2 份')).toBeTruthy()
    fireEvent.click(screen.getByTestId('step1-restore-slots'))
    expect(onRestoreSlots).toHaveBeenCalledWith(D.path)
    fireEvent.click(dropped!)
    expect(onToggleSlot).toHaveBeenCalledWith(D.path, 'ES', true)
  })

  it('缺表的格不是开关：点它不改变做任何几门（否则会把份数减成负数）', () => {
    const onToggleSlot = vi.fn()
    renderGroup(['ES-5857.xlsx', 'JA-5857.xlsx'], { onToggleSlot })
    const card = screen.getByTestId('step1-group-card')
    const missing = card.querySelector('[data-slot-state="missing"]')
    expect(missing).toBeTruthy()
    expect(missing?.getAttribute('role')).toBeNull()
    fireEvent.click(missing!)
    expect(onToggleSlot).not.toHaveBeenCalled()
    expect(within(card).getByText('可交付 2 份')).toBeTruthy()
  })


  it('「配表详情」是批准稿原话，不是「看依据」', () => {
    renderGroup(['ES-5857.xlsx'])
    expect(screen.queryByText('看依据')).toBeNull()
    expect(screen.getByText('配表详情')).toBeTruthy()
  })

  it('中栏一门一格：三张表 → 三个 ready 格；左栏报「可交付 3 份」，矩阵仍在（整行）', () => {
    renderGroup(['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx'])
    const card = screen.getByTestId('step1-group-card')
    expect(within(card).getByText('5857-主图.psb')).toBeTruthy()
    expect(card.querySelectorAll('[data-slot-state="ready"]').length).toBe(3)
    for (const lang of LANGS) {
      expect(within(card).getByText(lang)).toBeTruthy()
    }
    expect(screen.getAllByText('可交付 3 份').length).toBeGreaterThan(0)
    expect(document.querySelector('[data-step1-target="matrix"]')).toBeTruthy()
  })

  it('缺门不写成「没有这张表」了事：中栏一格虚线，右栏一条「少 1 门」', () => {
    renderGroup(['ES-5857.xlsx', 'JA-5857.xlsx'])
    const card = screen.getByTestId('step1-group-card')
    const missing = card.querySelectorAll('[data-slot-state="missing"]')
    expect(missing.length).toBe(1)
    expect(missing[0]?.textContent).toContain('FR')
    const exceptions = screen.getByTestId('step1-exceptions')
    expect(within(exceptions).getByText('5857-主图.psb 少 1 门')).toBeTruthy()
    expect(within(exceptions).getByText('FR')).toBeTruthy()
  })

  it('同一门两张：中栏那格点开是两张候选，点「用这张」按稿＋表路径回调，不替你挑', () => {
    const props = renderGroup(['ES-5857.xlsx', 'ES-5857-v2.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx'])
    const card = screen.getByTestId('step1-group-card')
    const pending = card.querySelector('[data-slot-state="pending"]')
    expect(pending?.textContent).toContain('ES')
    expect(pending?.textContent).toContain('两张 · 点这里去选')
    fireEvent.click(pending as Element)
    const picker = screen.getByTestId('step1-slot-pick')
    const rows = within(picker).getAllByRole('listitem')
    expect(rows.length).toBe(2)
    // 候选顺序由内核按文件名排；这里不假设先后，点哪一行就认那一行的文件名。
    const target = rows[1]
    const fileName = target.querySelector('span')?.textContent ?? ''
    fireEvent.click(within(target).getByRole('button', { name: '用这张' }))
    expect(props.onChoose).toHaveBeenCalledWith(D.path, `C:\\tmp\\${fileName}`)
  })

  it('例外清单逐件有结论：读不出 SKU 的表列在「没归到任何稿」，不吞掉', () => {
    renderGroup(['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx', 'Copy of 表格.xlsx'])
    const exceptions = screen.getByTestId('step1-exceptions')
    expect(within(exceptions).getByText('表名读不出 SKU')).toBeTruthy()
    expect(within(exceptions).getByText('Copy of 表格.xlsx')).toBeTruthy()
  })

  // ── 绑定证据（v3 公理 C：绑定必须可证）──────────────────────────────
  it('归属对上、表还没读 ⇒ 声明，不许冒充实证', () => {
    // 稿已扫到原文（有 summary），但表一张都没读 ⇒ 只有归属这一条证据。
    renderGroup(['ES-5857.xlsx', 'FR-5857.xlsx'], {
      coverageDrafts: [
        { masterPath: D.path, summary: { textLayers: [{ sourceText: '同一行原文' }] }, table: null },
      ],
    })
    const badge = screen.getByTestId('step1-group-evidence')
    expect(badge.getAttribute('data-evidence-tier')).toBe('declared')
    expect(badge.textContent).toBe('已指定')
    expect(screen.getByTestId('step1-group-evidence-detail').textContent).toContain('请先读取内容')
  })

  it('归属对上＋原文集全覆盖 ⇒ 实证（双证据），条数写在卡上', () => {
    renderGroup(['ES-5857.xlsx'], {
      tableParsesById: { 'c:/tmp/es-5857.xlsx': parsed(['ES'], ['同一行原文']) },
      coverageDrafts: [
        { masterPath: D.path, summary: { textLayers: [{ sourceText: '同一行原文' }] }, table: null },
      ],
    })
    const badge = screen.getByTestId('step1-group-evidence')
    expect(badge.getAttribute('data-evidence-tier')).toBe('verified')
    expect(badge.textContent).toBe('已核对')
    expect(screen.getByTestId('step1-group-evidence-detail').textContent).toContain('覆盖 100%')
  })

  it('原文集与本稿零交集 ⇒ 不符：进第 2 步的按钮换成「换一张表」', () => {
    renderGroup(['ES-5857.xlsx'], {
      tableParsesById: { 'c:/tmp/es-5857.xlsx': parsed(['ES'], ['完全不同的原文']) },
      coverageDrafts: [
        { masterPath: D.path, summary: { textLayers: [{ sourceText: '本稿原文' }] }, table: null },
      ],
    })
    expect(screen.getByTestId('step1-group-evidence').getAttribute('data-evidence-tier')).toBe('mismatch')
    expect(screen.getByText('这一组的表对不上：换一张表再进第 2 步')).toBeTruthy()
    expect(
      document.querySelector('[data-step1-target="next-group"]')?.getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('「模块」列指向别的 SKU ⇒ 不符（原文集全对也不放行）', () => {
    const otherSku: ParsedCsv = {
      ...parsed(['ES'], ['同一行原文']),
      rows: [{ source: '同一行原文', translations: {}, module: '6877' }],
    }
    renderGroup(['ES-5857.xlsx'], {
      tableParsesById: { 'c:/tmp/es-5857.xlsx': otherSku },
      coverageDrafts: [
        { masterPath: D.path, summary: { textLayers: [{ sourceText: '同一行原文' }] }, table: null },
      ],
    })
    expect(screen.getByTestId('step1-group-evidence').getAttribute('data-evidence-tier')).toBe('mismatch')
  })

  it('「模块」列写成分区名 ⇒ 不认作归属、也不冤枉成错表，仍按表名 SKU＋原文集判', () => {
    const sectioned: ParsedCsv = {
      ...parsed(['ES'], ['同一行原文']),
      rows: [{ source: '同一行原文', translations: {}, module: 'Banner' }],
    }
    renderGroup(['ES-5857.xlsx'], {
      tableParsesById: { 'c:/tmp/es-5857.xlsx': sectioned },
      coverageDrafts: [
        { masterPath: D.path, summary: { textLayers: [{ sourceText: '同一行原文' }] }, table: null },
      ],
    })
    expect(screen.getByTestId('step1-group-evidence').getAttribute('data-evidence-tier')).toBe('verified')
  })

  it('矩阵按语言取表：没配这一门的稿不许顶替基准表答话，列视图也只数真做这门语言的稿', () => {
    const three = [
      { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' },
      { path: 'C:\\tmp\\6896-主图.psb', relPath: '6896-主图.psb' },
      { path: 'C:\\tmp\\7788-详情页.psb', relPath: '7788-详情页.psb' },
    ]
    const files = ['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-6896.xlsx']
    const core = makeCore(three, files.map(tableOf))
    const groupBindings = buildGroupBindings({
      drafts: three.map((design) => ({ masterPath: design.path, fileName: design.relPath })),
      tables: files.map((fileName) => ({
        path: `C:\\tmp\\${fileName}`,
        relPath: fileName,
        langs: [langOf(fileName)],
        sources: ['同一行原文'],
      })),
      expectedLanguages: LANGS,
    })
    renderStage(
      {
        languagesByDraft: Object.fromEntries(three.map((design) => [design.path, LANGS])),
        tableParsesById: {
          'c:/tmp/es-5857.xlsx': parsed(['ES'], ['x1']),
          'c:/tmp/fr-5857.xlsx': parsed(['FR'], ['x1']),
          'c:/tmp/ja-6896.xlsx': parsed(['JA'], ['x1']),
        },
        // 覆盖率只给 5857（它有 ES／FR 两张表）：6896 没有 ES 表，也不许因此变成「就绪」。
        parsedByDraft: { [three[0]!.path]: parsed(['ES', 'FR'], ['x1']) },
        coverageDrafts: [
          {
            masterPath: three[0]!.path,
            summary: { textLayers: [{ sourceText: 'x1' }] },
            table: { languageColumns: ['ES', 'FR'], rows: [{ source: 'x1' }] },
          },
        ],
        readStates: { [three[0]!.path]: { status: 'ready', tablePath: 'C:\\tmp\\ES-5857.xlsx' } },
        groupBindings,
      },
      core,
    )
    selectWorkspaceView('library')
    // 点 ES 列：三份稿里只有 5857 真做 ES（6896／7788 是缺门，不在这里重复占位）。
    fireEvent.click(screen.getByRole('button', { name: /ES：1 份稿做这门语言/ }))
    const columnDialog = screen.getByRole('dialog')
    expect(within(columnDialog).getByText('本批 3 份稿中 1 份做这门语言')).toBeTruthy()
  })

  it('份数＝Σ 每组真能用的语言数：缺一门就少一份，不按 12 虚高', () => {
    const three = [
      { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' },
      { path: 'C:\\tmp\\6896-主图.psb', relPath: '6896-主图.psb' },
      { path: 'C:\\tmp\\7788-详情页.psb', relPath: '7788-详情页.psb' },
    ]
    // 三语并集；5857 有 ES+FR（缺 JA），6896 只有 JA，7788 一张都没有 ⇒ 份数 2+1+0＝3
    const files = ['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-6896.xlsx']
    const core = makeCore(three, files.map(tableOf))
    const tables = files.map((fileName) => ({
      path: `C:\\tmp\\${fileName}`,
      relPath: fileName,
      langs: [langOf(fileName)],
      sources: ['同一行原文'],
    }))
    const groupBindings = buildGroupBindings({
      drafts: three.map((design) => ({ masterPath: design.path, fileName: design.relPath })),
      tables,
      expectedLanguages: LANGS,
    })
    renderStage(
      {
        languagesByDraft: Object.fromEntries(three.map((design) => [design.path, LANGS])),
        parsedByDraft: {},
        coverageDrafts: [],
        readStates: {},
        groupBindings,
        deliverablesByDraft: deliverablesOf(groupBindings, LANGS),
      },
      core,
    )
    // 反向钉住"只有一个来源"：本夹具里一张表都没读（就绪格＝0），
    // 份数必须是内核的 3。旧口径两样都不成立——列集合取自表册时未读的表给不出语言，
    // 卡片数格子的结果是 0（这条断言因此能抓住回退，而不是自己跟自己比）。
    selectWorkspaceView('detail')
    const draftList = screen.getByTestId('step1-draft-list')
    expect(within(draftList).getByText('可交付 2 份')).toBeTruthy()
    expect(within(draftList).getByText('可交付 1 份')).toBeTruthy()
    expect(within(draftList).getByText('可交付 0 份')).toBeTruthy()
    cleanup()
    // 反向：把缺的那一门补上，份数就加一份（证明这数字真跟着门数走）。
    const filled = [...files, 'JA-5857.xlsx']
    const filledCore = makeCore(three, filled.map(tableOf))
    const filledBindings = buildGroupBindings({
      drafts: three.map((design) => ({ masterPath: design.path, fileName: design.relPath })),
      tables: filled.map((fileName) => ({
        path: `C:\\tmp\\${fileName}`,
        relPath: fileName,
        langs: [langOf(fileName)],
        sources: ['同一行原文'],
      })),
      expectedLanguages: LANGS,
    })
    renderStage(
      {
        languagesByDraft: Object.fromEntries(three.map((design) => [design.path, LANGS])),
        parsedByDraft: {},
        coverageDrafts: [],
        readStates: {},
        groupBindings: filledBindings,
        deliverablesByDraft: deliverablesOf(filledBindings, LANGS),
      },
      filledCore,
    )
    expect(filledBindings.groups.reduce((sum, group) => sum + group.languageCount, 0)).toBe(4)
    selectWorkspaceView('detail')
    expect(within(screen.getByTestId('step1-draft-list')).getByText('可交付 3 份')).toBeTruthy()
  })

  it('第 1 步的矩阵默认收起，但格子一条不少（折叠只收排版，不收事实）', () => {
    renderStage()
    selectWorkspaceView('library')
    const body = document.getElementById('step1-matrix-body') as HTMLElement
    const toggle = screen.getByRole('button', { name: '展开' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(body.className).toContain('hidden')
    // 收起状态下格数照旧在 DOM 里：统计卡与判据读的还是同一份事实。
    const cellsWhenClosed = body.querySelectorAll('td').length
    expect(cellsWhenClosed).toBeGreaterThan(0)
    fireEvent.click(toggle)
    const opened = document.getElementById('step1-matrix-body') as HTMLElement
    expect(opened.className).not.toContain('hidden')
    expect(opened.querySelectorAll('td').length).toBe(cellsWhenClosed)
  })

  it('没有 groupBindings 时退回两栏：不硬塞中栏/右栏', () => {
    render(<Step1StageView {...buildProps()} />)
    expect(screen.queryByTestId('step1-group-card')).toBeNull()
    expect(screen.queryByTestId('step1-exceptions')).toBeNull()
    expect(document.querySelector('[data-step1-target="matrix"]')).toBeTruthy()
  })

  it('表册按表投影：基准表只报自己那一门，组里其余表不算「未被使用」', () => {
    const files = ['ES-5857.xlsx', 'FR-5857.xlsx', 'JA-5857.xlsx', 'Copy of 表格.xlsx']
    const core = makeCore([D], files.map(tableOf))
    renderStage(
      {
        languagesByDraft: { [D.path]: LANGS },
        // 稿级表是整组合并出来的三门；表册若拿它填基准行，ES 那张会冒充「3 种语言」。
        parsedByDraft: { [D.path]: parsed(['ES', 'FR', 'JA'], ['x1']) },
        tableParsesById: {
          'c:/tmp/es-5857.xlsx': parsed(['ES'], ['x1']),
          'c:/tmp/fr-5857.xlsx': parsed(['FR'], ['x1']),
          'c:/tmp/ja-5857.xlsx': parsed(['JA'], ['x1']),
          // 读过了、但归不进组（读不出 SKU）：表册要同时说「已读」和「未用」，不能退回未读。
          'c:/tmp/copy of 表格.xlsx': parsed(['ES'], ['x9']),
        },
        readStates: { [D.path]: { status: 'ready', tablePath: 'C:\\tmp\\ES-5857.xlsx' } },
        coverageDrafts: [],
        groupBindings: bind(files),
      },
      core,
    )
    const list = screen.getByTestId('table-inventory-list')
    // 四张读过的表各自报自己那一门；没有任何一张拿合并结果冒充自己。
    expect(within(list).getAllByText('1 种语言').length).toBe(4)
    expect(within(list).queryByText('3 种语言')).toBeNull()
    const copyRow = within(list).getByText(/Copy of 表格/).closest('li') as HTMLElement
    expect(copyRow.textContent).toContain('已读')
    expect(copyRow.textContent).toContain('未用')
    // 组里三张都归到了稿上，只有读不出 SKU 的那张才是「未被使用」。
    expect(screen.getByText(/1 张表未被使用/)).toBeTruthy()
  })

  it('没读过的表不许说「没有语言列」；读过了、真的没有语言列才这么说', () => {
    const files = ['ES-5857.xlsx', 'Copy of 表格.xlsx']
    const core = makeCore([D], files.map(tableOf))
    renderStage(
      {
        languagesByDraft: { [D.path]: ['ES'] },
        parsedByDraft: { [D.path]: parsed(['ES'], ['x1']) },
        // ES 这张读完了，语言列确实是零；Copy 这张一次都没读过。
        tableParsesById: { 'c:/tmp/es-5857.xlsx': parsed([], ['x1']) },
        readStates: { [D.path]: { status: 'ready', tablePath: 'C:\\tmp\\ES-5857.xlsx' } },
        coverageDrafts: [],
      },
      core,
    )
    const list = screen.getByTestId('table-inventory-list')
    const readRow = within(list).getByText(/ES-5857/).closest('li') as HTMLElement
    const unreadRow = within(list).getByText(/Copy of 表格/).closest('li') as HTMLElement
    expect(readRow.textContent).toContain('没有语言列')
    expect(unreadRow.textContent).not.toContain('没有语言列')
    expect(unreadRow.textContent).toContain('未读')
  })

  it('读全部表头分轮跑满：36 张 → 三轮，每轮不超过 12 张，不停在前 12 张', async () => {
    const ALL = ['ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'PL', 'RU', 'JA', 'KO', 'ZH', 'VI']
    const designs = [
      { path: 'C:\\tmp\\5857-主图.psb', relPath: '5857-主图.psb' },
      { path: 'C:\\tmp\\6896-主图.psb', relPath: '6896-主图.psb' },
      { path: 'C:\\tmp\\7788-详情页.psb', relPath: '7788-详情页.psb' },
    ]
    const files = designs.flatMap((design) =>
      ALL.map((lang) => `${lang}-${design.relPath.slice(0, 4)}.xlsx`),
    )
    const core = makeCore(designs, files.map(tableOf))
    const groupBindings = buildGroupBindings({
      drafts: designs.map((design) => ({ masterPath: design.path, fileName: design.relPath })),
      tables: files.map((fileName) => ({
        path: `C:\\tmp\\${fileName}`,
        relPath: fileName,
        langs: [langOf(fileName)],
        sources: ['同一行原文'],
      })),
      expectedLanguages: ALL,
    })
    surveyPreparationTablesMock.mockImplementation(async (_root: string, paths: string[]) =>
      paths.map((tablePath) => {
        const relPath = tablePath.split(/[\\/]/).pop() ?? tablePath
        return { relPath, sheets: ['Sheet1'], languages: [langOf(relPath)], rows: 3, warnings: [] }
      }),
    )
    renderStage(
      {
        languagesByDraft: Object.fromEntries(designs.map((design) => [design.path, ALL])),
        readStates: {},
        parsedByDraft: {},
        coverageDrafts: [],
        groupBindings,
      },
      core,
    )
    fireEvent.click(screen.getByRole('button', { name: '读全部表头' }))
    await waitFor(() => expect(screen.getByText(/已读 36 张表的表头/)).toBeTruthy(), { timeout: 3000 })
    const rounds = surveyPreparationTablesMock.mock.calls.map((call) => call[1] as string[])
    expect(rounds.length).toBe(3)
    for (const round of rounds) expect(round.length).toBeLessThanOrEqual(12)
    expect(new Set(rounds.flat()).size).toBe(36)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// v3 交付物矩阵的验收（V01/V02/V03/V04/V12）
//
// 全部用**真实渲染 + 真点击**：矩阵默认可见、点格只开详情、缺列与不做给原因、
// 份数按各稿自己的范围求和。源码字符串断言只作补充（scripts/smoke-batch-workbench-guards.mjs）。
// ─────────────────────────────────────────────────────────────────────────────
const TWO_COVERAGE: Props['coverageDrafts'] = [
  {
    masterPath: A.path,
    summary: { textLayers: [{ sourceText: 'a1b' }, { sourceText: 'c2d' }] },
    table: { languageColumns: ['EN', 'DE'], rows: [{ source: 'a1b' }, { source: 'c2d' }] },
  },
  {
    masterPath: B.path,
    summary: { textLayers: [{ sourceText: 'b1' }, { sourceText: 'b2' }] },
    table: { languageColumns: ['EN'], rows: [{ source: 'b1' }, { source: 'b2' }] },
  },
]

const TWO_CORE: Core = makeCore([A, B], [T1, T2])

function deliveryMatrix(): HTMLElement {
  const node = document.querySelector('[data-step1-target="delivery-matrix"]')
  expect(node).toBeTruthy()
  return node as HTMLElement
}

function cellButton(file: string, language: string): HTMLElement {
  const found = within(deliveryMatrix())
    .getAllByRole('button')
    .find((button) => (button.getAttribute('aria-label') ?? '').startsWith(`${file} ${language} `))
  expect(found, `格 ${file} ${language} 必须存在`).toBeTruthy()
  return found as HTMLElement
}

describe('交付物矩阵 · 整批进度（V01/V02/V12）', () => {
  it('默认就看得见矩阵：不需要展开「译文来源」、不需要选语言', () => {
    renderStage(
      {
        coverageDrafts: TWO_COVERAGE,
        scopeByDraft: { [A.path]: ['EN', 'DE'], [B.path]: ['EN', 'DE'] },
        confirmedByDraft: { [A.path]: ['EN'], [B.path]: [] },
      },
      TWO_CORE,
    )
    const matrix = deliveryMatrix()
    expect(within(matrix).getByText('5857-主图.psb')).toBeTruthy()
    expect(within(matrix).getByText('6896-主图.psb')).toBeTruthy()
    // 两稿状态分清：A/EN 已确认；A/DE 覆盖到了但没人确认；B/DE 库里没这一列
    expect(cellButton('5857-主图.psb', 'EN').getAttribute('aria-label')).toContain('译文审查已确认')
    expect(cellButton('5857-主图.psb', 'DE').getAttribute('aria-label')).toContain('覆盖率足够，译文审查待确认')
    expect(cellButton('6896-主图.psb', 'DE').textContent).toBe('缺列')
  })

  it('扫描完成但缺少可估算原文时保留未知格，不要求重复扫描', () => {
    renderStage(
      {
        coverageDrafts: [
          {
            masterPath: A.path,
            summary: { textLayers: [] },
            table: { languageColumns: ['EN'], rows: [] },
          },
        ],
        scopeByDraft: { [A.path]: ['EN'] },
        confirmedByDraft: {},
        scannedByDraft: { [A.path]: true },
      },
      makeCore([A], [T1]),
    )
    const cell = cellButton('5857-主图.psb', 'EN')
    expect(cell.getAttribute('data-cell-kind')).toBe('none')
    expect(cell.getAttribute('aria-label')).toContain('已扫描，但缺少可估算的原文信息')
    expect(cell.getAttribute('aria-label')).not.toContain('请先扫描')
    expect(cell.textContent).toBe('—')
  })

  it('统一扫描状态确认未扫描时才提示先扫描，并且仍不显示伪造覆盖率', () => {
    renderStage(
      {
        coverageDrafts: [
          {
            masterPath: A.path,
            // 旧摘要仍在，但统一扫描状态已不算扫描完成（例如扫描过期）。
            summary: { textLayers: [] },
            table: { languageColumns: ['EN'], rows: [] },
          },
        ],
        scopeByDraft: { [A.path]: ['EN'] },
        confirmedByDraft: {},
        scannedByDraft: { [A.path]: false },
      },
      makeCore([A], [T1]),
    )
    const cell = cellButton('5857-主图.psb', 'EN')
    expect(cell.getAttribute('aria-label')).toContain('请先扫描本稿')
    expect(cell.textContent).toBe('—')
  })

  it('份数按各稿自己的范围求和：2 稿 × 2 门 = 4 份，不是只数当前稿', () => {
    renderStage(
      {
        coverageDrafts: TWO_COVERAGE,
        scopeByDraft: { [A.path]: ['EN', 'DE'], [B.path]: ['EN', 'DE'] },
        confirmedByDraft: { [A.path]: ['EN'], [B.path]: [] },
      },
      TWO_CORE,
    )
    const text = deliveryMatrix().textContent ?? ''
    expect(text).toContain('计划生成 4 份')
    expect(text).toContain('译文审查确认 1/4')
  })

  it('12 稿 × 12 语：144 格都在，但份数只按各自范围算（每稿 3 门 = 36 份）', () => {
    const designs = Array.from({ length: 12 }, (_, index) => ({
      path: `C:\\tmp\\${1001 + index}-主图.psb`,
      relPath: `${1001 + index}-主图.psb`,
    }))
    const tables = designs.map((design) => ({
      path: design.path.replace(/\.psb$/, '.xlsx'),
      relPath: design.relPath.replace(/\.psb$/, '.xlsx'),
      ext: 'xlsx',
      dir: '',
    }))
    const core = makeCore(designs, tables)
    const LANGS = ['EN', 'DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'PL', 'RU', 'JP', 'KO', 'TH']
    const coverage = designs.map((design) => ({
      masterPath: design.path,
      summary: { textLayers: [{ sourceText: 'x1' }] },
      table: { languageColumns: LANGS, rows: [{ source: 'x1' }] },
    }))
    const scopeByDraft: Record<string, string[]> = Object.fromEntries(
      designs.map((design) => [design.path, LANGS.slice(0, 3)]),
    )
    renderStage(
      { coverageDrafts: coverage, scopeByDraft, confirmedByDraft: {}, languagesByDraft: scopeByDraft },
      core,
    )
    const matrix = deliveryMatrix()
    const labels = within(matrix)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? '')
    // 文件名里没有空格 ⇒ 第二个词就是语种；12 语全算，共 12×12 格
    const cells = labels.filter((label) => {
      const parts = label.split(' ')
      return parts.length >= 2 && LANGS.includes(parts[1] ?? '')
    })
    expect(cells.length).toBe(144)
    const text = matrix.textContent ?? ''
    expect(text).toContain('计划生成 36 份')
    expect(text).toContain('译文审查确认 0/36')
  })
})

describe('交付物矩阵 · 点格查看（V03/V04）', () => {
  const base = {
    coverageDrafts: TWO_COVERAGE,
    scopeByDraft: { [A.path]: ['EN', 'DE'], [B.path]: ['EN', 'DE'] },
    confirmedByDraft: { [A.path]: ['EN'], [B.path]: [] },
  }

  it('点格只开这份稿这门语言的详情：不改范围、不确认、不启动执行', () => {
    const props = renderStage(base, TWO_CORE)
    fireEvent.click(cellButton('6896-主图.psb', 'EN'))
    // 「查看该稿审核」只在抽屉里出现 ⇒ 它出现＝详情已打开
    const review = screen.getByRole('button', { name: '查看该稿审核' })
    expect(review).toBeTruthy()
    // 抽屉里「这一份」显示的就是刚点的那门语言
    const rowText = screen.getByText('这一份').parentElement?.textContent ?? ''
    expect(rowText).toContain('EN')
    expect(props.onToggleSlot).not.toHaveBeenCalled()
    expect(props.onRestoreSlots).not.toHaveBeenCalled()
    expect(props.onOpenReview).not.toHaveBeenCalled()
    expect(props.onIncludeLanguage).not.toHaveBeenCalled()
    expect(props.onNext).not.toHaveBeenCalled()
  })

  it('缺列的格：说清原因，且「查看该稿审核」是禁用的（不承诺能执行）', () => {
    const props = renderStage(base, TWO_CORE)
    fireEvent.click(cellButton('6896-主图.psb', 'DE'))
    const review = screen.getByRole('button', { name: '查看该稿审核' })
    expect(review.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(review)
    expect(props.onOpenReview).not.toHaveBeenCalled()
    expect(props.onToggleSlot).not.toHaveBeenCalled()
  })

  it('本稿不做的语种：详情给原因，只有「明确加入执行范围」才会改范围', () => {
    const props = renderStage(
      {
        ...base,
        coverageDrafts: [
          {
            masterPath: A.path,
            summary: { textLayers: [{ sourceText: 'a1b' }, { sourceText: 'c2d' }] },
            table: {
              languageColumns: ['EN', 'DE', 'FR'],
              rows: [{ source: 'a1b' }, { source: 'c2d' }],
            },
          },
          TWO_COVERAGE[1]!,
        ],
        scopeByDraft: { [A.path]: ['EN', 'DE'], [B.path]: ['EN'] },
      },
      TWO_CORE,
    )
    fireEvent.click(cellButton('5857-主图.psb', 'FR'))
    expect(screen.getByText('查看详情不会把这门语言加入执行范围。')).toBeTruthy()
    expect(props.onToggleSlot).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '明确加入执行范围' }))
    expect(props.onIncludeLanguage).toHaveBeenCalledWith(A.path, 'FR')
    expect(props.onToggleSlot).not.toHaveBeenCalled()
  })
})
