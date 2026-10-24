// 图译工坊 — 「本次未产出」执行报告（网页端生成，方案 W / 2026-10-12）
//
// 定位：**纯展示层新增**。批次失败且本机零产出时，助手端不会写出任何交付报告，
// 用户在交付目录里找不到任何可核对的东西；本模块把浏览器**已经持有**的事实渲染成
// 一份可下载的 HTML，落到浏览器的下载目录。
//
// 纪律（逐条对应 AGENTS.md 与既有合同）：
// - 不发起任何网络请求；不读本地文件；不调用 Photoshop；不创建/修改任何业务事实。
// - 不参与执行、授权、计费、回执判定——只投影 v3 批次流**已经算好**的结果。
// - 幂等、无副作用：纯函数，同样入参得到同样 HTML。
//
// RG-003（**不是偏离，是直接合规**）：
// 真正禁的不是「绝对路径」，是「本地用户目录路径」——见 src/lib/report/sanitize.ts:4-14
// 的 FORBIDDEN_PATTERNS，只拦 C:\Users\、\Desktop\、\Downloads\、/Users/、/home/ 这几种形态。
// 所以 `F:\改语言\xxx_ALL_4LANG__…` 原样保留（不含用户名，且正是用户对账要用的锚点），
// 而 `C:\Users\<名>\Downloads\…` 会被 sanitizePath 换成 <redacted-path>。
// 计划交付目录一律过 sanitizePath；本模块 import 它属零新增依赖
// （execute-step.tsx:91 早已 `import { basenameOnly } from '@/lib/report/sanitize'`）。
// 被脱敏时报告会明说「已隐去」，并指向工作台界面看真实目录——不静默改内容。
//
// 为什么不复用 src/lib/report/generate.ts：**形状不符**，不是脱敏器的问题。
// 那个模块建模的是经典 runMatch 的 ReplaceReport（matchedItems / unmatchedItems /
// warnings / errors + 单语言 targetLanguageCode），V1.5 批次流根本不产这组数据；
// 且该模块在 src/ 下**零引用**（证据见 README「Product Convergence Review」）。

import { funnelStageForBatchFailure } from '@/lib/workbench/batch-error-policy'
import { resolveErrorMessage } from '@/lib/workbench/error-messages'
import { formatLanguageCode } from '@/lib/workbench/lang-display'
import { sanitizePath } from '@/lib/report/sanitize'

/** 逐语言结果口径。NOT_STARTED = 批次已停止、该语言从未被派发。 */
export type UnproducedLanguageOutcome = 'FAILED' | 'UNRESOLVED' | 'COMPLETED' | 'NOT_STARTED'

export interface UnproducedLanguageEntry {
  /** 语言码，如 'JP'。 */
  code: string
  outcome: UnproducedLanguageOutcome
  /** 机器可读失败码（如 'VERIFY_TIMEOUT'）；未取得时 null。 */
  errorCode: string | null
}

export interface UnproducedFailureReportInput {
  generatedAt: Date
  /** 云端批次标识；未建立批次时 null。 */
  batchId: string | null
  /** 本机任务标识；未派发到本机时 null（本次要覆盖的样本正是这种）。 */
  attemptId: string | null
  /** 浏览器侧本次运行标识。 */
  operationId: string | null
  /** 母版文件名（只放 basename，不放路径）。 */
  masterFileName: string
  /** 计划交付目录——即 execute-step.tsx 的 batchSharedOutputDirectory。 */
  plannedOutputDirectory: string
  /** 批次级失败码（v3 收口码或真实系统码）。 */
  batchFailureCode: string | null
  batchFailureMessage: string | null
  /** true = finish 未确认（fail-closed），积分数字为未确认值。 */
  settlementUnconfirmed: boolean
  finishNotice: string | null
  quotedCredits: number
  committedCredits: number
  releasedCredits: number
  languages: UnproducedLanguageEntry[]
}

/** 语言码 → 该语言已登记的失败事实（浏览器全程只写不判定）。 */
export type LanguageFailureFacts = ReadonlyMap<
  string,
  { code: string | null; attemptId: string | null }
>

/**
 * 把 v3 批次流的四个语言列表 + 逐语言失败码，合成报告用的逐语言条目。
 * 分类优先级：已完成 > 未确认 > 失败 > 未开始（互斥，一个语言只出一个结论）。
 */
export function collectUnproducedLanguages(params: {
  executionLanguages: readonly string[]
  completedLanguages: readonly string[]
  failedLanguages: readonly string[]
  unresolvedLanguages: readonly string[]
  languageFailureFacts: LanguageFailureFacts
}): UnproducedLanguageEntry[] {
  const completed = new Set(params.completedLanguages)
  const unresolved = new Set(params.unresolvedLanguages)
  const failed = new Set(params.failedLanguages)
  return params.executionLanguages.map((code) => {
    const outcome: UnproducedLanguageOutcome = completed.has(code)
      ? 'COMPLETED'
      : unresolved.has(code)
        ? 'UNRESOLVED'
        : failed.has(code)
          ? 'FAILED'
          : 'NOT_STARTED'
    return {
      code,
      outcome,
      errorCode: params.languageFailureFacts.get(code)?.code ?? null,
    }
  })
}

/**
 * 失败码 → 拦截层（人话）。判定本身复用既有 funnelStageForBatchFailure，
 * 本函数只把它的三档枚举翻译成用户能读的层名，不新增判定。
 */
export function interceptionLayerOf(errorCode: string | null | undefined): string {
  switch (funnelStageForBatchFailure(errorCode)) {
    case 'dispatch':
      return '派发前拦截（未进入 Photoshop）'
    case 'execute':
      return '执行中被中止'
    case 'finish':
      return '批次收口（结算）未完成'
    default:
      return '批次收口（结算）未完成'
  }
}

const OUTCOME_LABEL: Record<UnproducedLanguageOutcome, string> = {
  FAILED: '未产出',
  UNRESOLVED: '结果未确认',
  COMPLETED: '已完成（本报告不应出现）',
  NOT_STARTED: '未开始（批次已停止，未派发）',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 生成时间：YYYY-MM-DD HH:mm:ss（本机时区）。 */
function formatGeneratedAt(date: Date): string {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  )
}

/** 文件名时间戳：YYYYMMDD_HHMMSS（本机时区）。 */
function formatFileStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  )
}

/** 报告下载文件名（交付目录里的报告由助手写；本报告一定落在浏览器下载目录）。 */
export function unproducedReportFileName(date: Date): string {
  return `图译工坊执行报告_未产出_${formatFileStamp(date)}.html`
}

function credits(value: number, unconfirmed: boolean): string {
  if (unconfirmed) return '—（未确认）'
  return Number.isFinite(value) ? String(value) : '0'
}

function dash(value: string | null | undefined): string {
  return value && value.trim() ? value : '—'
}

/**
 * 生成「本次未产出」报告的完整 HTML。样式全部写在 <style> 内，不引用任何外部资源，
 * 下载到本地双击即可打开。
 */
export function buildUnproducedReportHtml(input: UnproducedFailureReportInput): string {
  const generatedAt = formatGeneratedAt(input.generatedAt)
  const settlementUnconfirmed = input.settlementUnconfirmed

  // 计划交付目录：进报告前一律过 sanitizePath（RG-003，见文件头）。
  // `F:\改语言\…` 原样保留；命中 FORBIDDEN_PATTERNS（如 C:\Users\<名>\Downloads\…）才替换。
  const rawOutputDirectory = input.plannedOutputDirectory
  const displayOutputDirectory = sanitizePath(rawOutputDirectory)
  const outputDirectoryRedacted = displayOutputDirectory !== rawOutputDirectory

  const unconfirmedLanguages = input.languages.filter((entry) => entry.outcome === 'UNRESOLVED')
  const anyOutputRisk = unconfirmedLanguages.length > 0

  const languageRows = input.languages
    .map((entry) => {
      // 未登记码：resolveErrorMessage 给兜底文案并把原始编号放进 raw。
      // 本报告是排障件，原始编号一律照印（只有用户层组件才隐藏裸编号）。
      const spec = resolveErrorMessage(entry.errorCode)
      const reason = `${spec.title}。${spec.body}`
      const nextStep = spec.actions.length > 0 ? spec.actions.join('；') : '重试；联系作者'
      const layer =
        entry.outcome === 'NOT_STARTED'
          ? '未派发（批次已停止）'
          : interceptionLayerOf(entry.errorCode)
      const rowClass = entry.outcome === 'UNRESOLVED' ? ' class="row-unconfirmed"' : ''
      return `        <tr${rowClass}>
          <td class="lang">${escapeHtml(formatLanguageCode(entry.code) || entry.code)}<span class="code">${escapeHtml(entry.code)}</span></td>
          <td class="mono">${escapeHtml(dash(entry.errorCode))}</td>
          <td>${escapeHtml(OUTCOME_LABEL[entry.outcome])}</td>
          <td>${escapeHtml(layer)}</td>
          <td>${escapeHtml(reason)}</td>
          <td>${escapeHtml(nextStep)}</td>
        </tr>`
    })
    .join('\n')

  const unconfirmedBlock = anyOutputRisk
    ? `
      <section class="alert alert-red">
        <h2>有 ${unconfirmedLanguages.length} 个语言的结果尚未确认（${unconfirmedLanguages
          .map((entry) => escapeHtml(formatLanguageCode(entry.code) || entry.code))
          .join('、')}）</h2>
        <p>这些语言已经派发到本机，但云端没有收到终态：Photoshop 可能仍在处理，或正在等待回执投递。
          <strong>本报告生成时没有观察到任何产出</strong>，但这几个语言的结果不能当作「已失败」处理。</p>
        <p class="strong-red">请先核对原任务状态，不要重复执行这几个语言；重复执行可能造成重复冻结。</p>
      </section>`
    : ''

  const settlementBlock = settlementUnconfirmed
    ? `
      <section class="alert alert-amber">
        <h2>批次结算未完成（数字为未确认值）</h2>
        <p>${escapeHtml(
          input.finishNotice ??
            '本次批次没有收到结算确认，因此上面的积分数字不是最终值。',
        )}</p>
        <p>批次停滞约 15 分钟后，未完成部分的冻结积分会自动全额退回；无需重复操作。</p>
      </section>`
    : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>图译工坊执行报告（本次未产出）· ${escapeHtml(dash(input.batchId))}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 56px; background: #f4f5f7; color: #1f2329;
    font: 14px/1.7 "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  h2 { margin: 0 0 8px; font-size: 15px; }
  p { margin: 6px 0; }
  .sub { margin: 0; color: #646a73; font-size: 13px; }
  section { margin-top: 18px; }
  .card { background: #fff; border: 1px solid #e3e5e8; border-radius: 10px; padding: 16px 18px; }
  .mandatory { background: #fff; border: 2px solid #1f2329; border-radius: 10px; padding: 18px; }
  .mandatory .big { margin: 0 0 10px; font-size: 20px; font-weight: 700; letter-spacing: .5px; }
  .mandatory ol { margin: 10px 0 0; padding-left: 22px; }
  .mandatory li { margin: 4px 0; }
  code, .mono { font-family: Consolas, "Courier New", monospace; font-size: 12.5px; }
  code { background: #f0f1f3; padding: 1px 5px; border-radius: 4px; word-break: break-all; }
  .dir { display: inline-block; background: #fff4e5; border: 1px solid #f0c894; padding: 2px 7px; border-radius: 5px; word-break: break-all; }
  .note { color: #646a73; font-size: 13px; }
  .scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #e3e5e8; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f7f8fa; font-weight: 600; white-space: nowrap; }
  td.lang { white-space: nowrap; font-weight: 600; }
  td.lang .code { display: block; color: #8a9099; font-weight: 400; font-size: 11.5px; }
  tr.row-unconfirmed td { background: #fff5f5; }
  tr.row-unconfirmed td.lang { color: #c0392b; }
  .alert { border-radius: 10px; padding: 14px 18px; }
  .alert-red { background: #fff5f5; border: 2px solid #e05252; }
  .alert-red h2 { color: #b32424; }
  .alert-amber { background: #fffaef; border: 2px solid #e0a63c; }
  .alert-amber h2 { color: #8a6100; }
  .strong-red { color: #b32424; font-weight: 600; }
  .kv { display: grid; grid-template-columns: 190px 1fr; gap: 6px 14px; font-size: 13px; }
  .kv dt { color: #646a73; }
  .kv dd { margin: 0; word-break: break-all; }
  .credits { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
  .credit { flex: 1 1 170px; border: 1px solid #e3e5e8; border-radius: 8px; padding: 10px 14px; background: #fafbfc; }
  .credit .label { color: #646a73; font-size: 12.5px; }
  .credit .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
  footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e3e5e8; color: #8a9099; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <h1>图译工坊执行报告 · 本次未产出</h1>
    <p class="sub">生成时间：${escapeHtml(generatedAt)}　|　批次标识：${escapeHtml(dash(input.batchId))}</p>
  </header>

  <section class="mandatory">
    <p class="big">本次未产出任何文件</p>
    <ol>
      <li>本次执行<strong>没有产出任何设计文件，也没有产出报告</strong>。</li>
      <li>计划交付目录：<span class="dir">${escapeHtml(displayOutputDirectory)}</span>，其中<strong> 0 个文件、无报告</strong>。${
        outputDirectoryRedacted
          ? '<br><span class="note">（该目录含本地用户路径，已按脱敏规则隐去；实际目录请在工作台界面查看。）</span>'
          : ''
      }</li>
      <li>本报告由<strong>网页端</strong>生成，<strong>未调用 Photoshop</strong>。</li>
      <li>生成时间 ${escapeHtml(generatedAt)}；批次标识 ${escapeHtml(dash(input.batchId))}。</li>
    </ol>
    <p class="note">这张报告不会出现在上面那个交付目录里——浏览器写不了那个目录，它只会落在你的<strong>下载目录</strong>。
      所以不要到交付目录去找这张报告：那个目录是空的，这份文件不在这里。</p>
  </section>

  <section class="card">
    <h2>本次执行身份</h2>
    <dl class="kv">
      <dt>源文件</dt><dd>${escapeHtml(input.masterFileName)}</dd>
      <dt>批次标识</dt><dd class="mono">${escapeHtml(dash(input.batchId))}</dd>
      <dt>本机任务标识</dt><dd class="mono">${escapeHtml(dash(input.attemptId))}</dd>
      <dt>本次运行标识</dt><dd class="mono">${escapeHtml(dash(input.operationId))}</dd>
      <dt>涉及语言</dt><dd>${escapeHtml(
        input.languages.map((entry) => formatLanguageCode(entry.code) || entry.code).join('、') || '—',
      )}</dd>
      <dt>计划交付目录</dt><dd><code>${escapeHtml(displayOutputDirectory)}</code></dd>
      <dt>批次失败码</dt><dd class="mono">${escapeHtml(dash(input.batchFailureCode))}</dd>
      <dt>批次失败说明</dt><dd>${escapeHtml(dash(input.batchFailureMessage))}</dd>
    </dl>
  </section>

  <section class="card">
    <h2>逐语言结果</h2>
    <p class="note">「失败码 → 拦截层 → 中文原因 → 下一步」四列即本次处理的完整依据；未确认语言已标红。</p>
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>语言</th>
            <th>失败码</th>
            <th>结论</th>
            <th>拦截层</th>
            <th>中文原因</th>
            <th>下一步</th>
          </tr>
        </thead>
        <tbody>
${languageRows || '          <tr><td colspan="6">（没有可列出的语言）</td></tr>'}
        </tbody>
      </table>
    </div>
  </section>
${unconfirmedBlock}
  <section class="card">
    <h2>积分</h2>
    <div class="credits">
      <div class="credit">
        <div class="label">本次报价冻结（quotedCredits）</div>
        <div class="value">${escapeHtml(credits(input.quotedCredits, false))}</div>
      </div>
      <div class="credit">
        <div class="label">已结算扣减（committedCredits）</div>
        <div class="value">${escapeHtml(credits(input.committedCredits, settlementUnconfirmed))}</div>
      </div>
      <div class="credit">
        <div class="label">已退回（releasedCredits）</div>
        <div class="value">${escapeHtml(credits(input.releasedCredits, settlementUnconfirmed))}</div>
      </div>
    </div>
    <p class="note">未产出、未执行的语言不计费。${
      settlementUnconfirmed
        ? '本次批次未收到结算确认，冻结部分会在批次停滞约 15 分钟后自动全额退回。'
        : '未完成部分已按失败结算退回；请在积分流水中核对最终数字。'
    }</p>
  </section>
${settlementBlock}
  <section class="card">
    <h2>建议下一步</h2>
    <ol>
      <li>先修网络：${escapeHtml('本次失败里若有「连不上服务器／授权响应超时」，这是网络问题，不是授权失效，不需要重新激活或重装。')}</li>
      <li>回到工作台重新扫描设计稿后再重试；失败语言可单独重跑。</li>
      <li>若上述失败码反复出现，请连同本报告的<strong>批次标识与失败码</strong>一起反馈给作者。</li>
      <li>本报告只是记录；它不会自动重试，也不会改变任何批次状态。</li>
    </ol>
  </section>

  <footer>
    图译工坊 · 本报告由网页端生成（未调用 Photoshop），不含 Token、不含图层原文与译文内容。<br>
    本报告为本地下载件：不上传云端、不写入交付目录、不随交付件转发。<br>
    报告生成于 ${escapeHtml(generatedAt)}。
  </footer>

</div>
</body>
</html>`
}
