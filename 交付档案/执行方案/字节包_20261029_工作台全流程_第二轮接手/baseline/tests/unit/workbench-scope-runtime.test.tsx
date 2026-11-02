// v12 执行前确认 —— 真 DOM 运行时测试（不是读源码）
//
// 为什么补这一层：v12 的静态合同（scripts/smoke-workbench-scope.mjs）只能证明
// 「源码里写了确认框、两个入口都 setScopeConfirm」。它证明不了：
//   ① 运行时点「开始替换 / 开始执行」真的先弹确认、**没有直接派发**；
//   ② 取消之后什么都没发生；
//   ③ 确认框打开期间范围变了（稿数 / 语言格）真的会停用确认按钮（TOCTOU）。
// 这三条是本版唯一不可逆操作前的拦截，必须在真组件树上按一次。
//
// 运行：npx vitest run tests/unit/workbench-scope-runtime.test.tsx

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'

import { ExecutionScopeDialog } from '@/components/workbench/execution-scope-dialog'
import { ExecuteStep } from '@/components/workbench/execute-step'

// 只替换「外部世界」：开关、能力门、本地助手。组件本身（含两个入口的 onClick）跑真代码。
vi.mock('@/lib/workbench/use-feature-flags', () => ({
  useFeatureFlags: () => ({
    workbenchV15ExecutionEnabled: true,
    batchBillingV3Enabled: true,
  }),
}))

const capability = {
  executionEnabled: true,
  enabled: true,
  mode: 'local_test' as const,
  reasonCode: null,
  message: '可执行',
  nextAction: '',
  assistant: null,
}

vi.mock('@/lib/workbench/batch-execution-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workbench/batch-execution-client')>()
  return {
    ...actual,
    fetchBatchExecutionCapability: vi.fn(async () => capability),
    getBatchStatus: vi.fn(),
    abandonBatchLanguage: vi.fn(),
  }
})

// 派发函数全部换成探针：本测试只允许走到「确认框」，永远不点确认。
const dispatchSpies = vi.hoisted(() => ({
  ensureAssistantBinding: vi.fn(),
  submitV15Execution: vi.fn(),
  executeBatchLanguageDirect: vi.fn(),
  prepareBatchEvidenceDirect: vi.fn(),
  prepareBatchBindingPlanDirect: vi.fn(),
  startPreparationScan: vi.fn(),
}))

vi.mock('@/lib/workbench/local-assistant-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/workbench/local-assistant-client')>()
  return { ...actual, ...dispatchSpies }
})

function installDomShims() {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  }
}

beforeEach(() => {
  installDomShims()
  // 站点文案 / 开关类请求一律返回空对象，测试不触网。
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const parsed = {
  sourceHeader: '源文',
  languageColumns: ['JA'],
  rows: [
    { source: '你好', translations: { JA: 'こんにちは' } },
    { source: '谢谢', translations: { JA: 'ありがとう' } },
  ],
  warnings: [],
}

const psState = {
  status: 'ready_to_execute' as const,
  documentName: 'a.psd',
  textLayerCount: 2,
  textLayers: [],
  message: '',
}

function summary(scanId: string, basename: string) {
  return {
    schemaVersion: 1 as const,
    scanId,
    basename,
    preparedAt: '2026-10-21T00:00:00.000Z',
    staleAt: '2026-10-22T00:00:00.000Z',
    fingerprint: 'a'.repeat(64),
    textLayerCount: 2,
    hiddenTextLayerCount: 0,
    uneditableTextLayerCount: 0,
    layerErrorCount: 0,
    issues: [],
  }
}

function entry(path: string, basename: string) {
  return {
    masterPath: path,
    state: 'prepared' as const,
    scanId: `scan-${basename}`,
    summary: summary(`scan-${basename}`, basename),
    errorCode: null,
    updatedAt: '2026-10-21T00:00:00.000Z',
  }
}

const PATH_A = 'C:\\e2e\\a.psd'
const PATH_B = 'C:\\e2e\\b.psd'
const PATH_C = 'C:\\e2e\\c.psd'

type ExecuteStepProps = ComponentProps<typeof ExecuteStep>

function baseProps(): ExecuteStepProps {
  return {
    parsed,
    targetLanguage: 'JA',
    selectedLanguages: ['JA'],
    editedTranslations: {},
    editedTranslationsByLanguage: {},
    psState,
    psdSelection: null,
    onEvidenceRecoveryRecheck: vi.fn(),
    onEvidenceRecoveryExcludeLanguages: vi.fn(),
    onPsdSelectionChange: vi.fn(),
    onPrev: vi.fn(),
    onReset: vi.fn(),
    onExecutionAuthorized: vi.fn(),
  }
}

async function waitEnabled(button: HTMLElement) {
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
}

describe('ExecutionScopeDialog（确认框本体）', () => {
  it('写清三条不可逆事实；确认可用；两个按钮各自回调', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ExecutionScopeDialog
        open
        onOpenChange={onOpenChange}
        title="确认开始执行"
        description="确认之前不会冻结积分，也不会写任何文件。"
        lines={[
          { label: '设计稿', value: 'a.psd', mono: true },
          { label: '语言', value: '1 个：日语' },
        ]}
        confirmLabel="确认并开始"
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByTestId('execution-scope-dialog')).toBeTruthy()
    expect(screen.getByText('确认开始执行')).toBeTruthy()
    expect(screen.getByText(/a\.psd/)).toBeTruthy()
    expect(screen.getByText(/开始之后不能撤销/)).toBeTruthy()
    expect(screen.getByText(/没有 PSD 备份/)).toBeTruthy()
    expect(screen.getByText(/这一版还没有「停止」按钮/)).toBeTruthy()

    const confirm = screen.getByRole('button', { name: '确认并开始' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '取消，先不开始' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stale 时显示拦截说明，确认按钮停用且点不动', () => {
    const onConfirm = vi.fn()
    render(
      <ExecutionScopeDialog
        open
        onOpenChange={() => {}}
        title="确认开始这一批"
        description="确认之前不会冻结积分，也不会写任何文件。"
        lines={[]}
        confirmLabel="确认并开始（本批 2 份）"
        stale
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('范围在确认框打开期间变了')
    const confirm = screen.getByRole('button', { name: '确认并开始（本批 2 份）' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('ExecuteStep 两个入口（真组件、真点击）', () => {
  it('单稿：点「开始替换」只弹确认框，取消后一个派发函数都没被调用', async () => {
    const props = baseProps()
    props.psdSelection = {
      masterPath: PATH_A,
      state: 'prepared',
      scanId: 'scan-a.psd',
      summary: summary('scan-a.psd', 'a.psd'),
      updatedAt: '2026-10-21T00:00:00.000Z',
    }
    render(<ExecuteStep {...props} />)

    const start = screen.getByRole('button', { name: /开始替换/ })
    await waitEnabled(start)

    fireEvent.click(start)
    expect(screen.getByTestId('execution-scope-dialog')).toBeTruthy()
    expect(screen.getByText('确认开始执行')).toBeTruthy()
    expect(screen.getByText(/开始之后不能撤销/)).toBeTruthy()

    // 确认之前：任何真实派发都不许发生
    expect(dispatchSpies.submitV15Execution).not.toHaveBeenCalled()
    expect(dispatchSpies.ensureAssistantBinding).not.toHaveBeenCalled()
    expect(dispatchSpies.executeBatchLanguageDirect).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '取消，先不开始' }))
    await waitFor(() => {
      expect(screen.queryByTestId('execution-scope-dialog')).toBeNull()
    })
    expect(dispatchSpies.submitV15Execution).not.toHaveBeenCalled()
    expect(dispatchSpies.ensureAssistantBinding).not.toHaveBeenCalled()
  })

  it('多稿：点「开始执行」只弹确认框；打开期间加了稿 → 范围过期、确认停用（TOCTOU）', async () => {
    const props = baseProps()
    props.batchMode = true
    props.multiPsdSelection = { entries: [entry(PATH_A, 'a.psd'), entry(PATH_B, 'b.psd')] }
    props.multiDraftLanguageColumns = { [PATH_A]: ['JA'], [PATH_B]: ['JA'] }

    const view = render(<ExecuteStep {...props} />)
    const start = screen.getByRole('button', { name: /开始执行（本批 2 份/ })
    await waitEnabled(start)

    fireEvent.click(start)
    expect(screen.getByTestId('execution-scope-dialog')).toBeTruthy()
    expect(screen.getByText('确认开始这一批')).toBeTruthy()
    expect(screen.getByText(/本批 2 个设计稿/)).toBeTruthy()
    expect(dispatchSpies.executeBatchLanguageDirect).not.toHaveBeenCalled()
    expect(dispatchSpies.prepareBatchEvidenceDirect).not.toHaveBeenCalled()

    // 打开期间列表变成 3 稿（范围变了）——确认框必须自己停用，不能拿旧范围开工
    view.rerender(
      <ExecuteStep
        {...props}
        multiPsdSelection={{ entries: [entry(PATH_A, 'a.psd'), entry(PATH_B, 'b.psd'), entry(PATH_C, 'c.psd')] }}
        multiDraftLanguageColumns={{ [PATH_A]: ['JA'], [PATH_B]: ['JA'], [PATH_C]: ['JA'] }}
      />,
    )
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('范围在确认框打开期间变了')
    })
    const confirm = screen.getByRole('button', { name: /确认并开始/ }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(confirm)
    expect(dispatchSpies.executeBatchLanguageDirect).not.toHaveBeenCalled()
    expect(dispatchSpies.prepareBatchEvidenceDirect).not.toHaveBeenCalled()
  })
})
