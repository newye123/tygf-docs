import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const csv = read('src/components/workbench/csv-step.tsx')
const review = read('src/components/workbench/review-step.tsx')
const ps = read('src/components/workbench/photoshop-step.tsx')
const wb = read('src/components/workbench/workbench-view.tsx')
const exec = read('src/components/workbench/execute-step.tsx')
const copy = read('src/config/siteContent.ts')
const spec = read('product-specs/workbench-flow.md')

assert.match(csv, /copy\.csvFormatGuide/, 'Step 1 must show the short format guide')
assert.match(csv, /<details open className=/, 'Step 1 format examples must open by default')
assert.ok(!csv.includes("useState<'csv' | 'text' | 'image'>"), 'image mode must not return')
assert.match(copy, /csvDescBasic: ''/, 'redundant Step 1 subtitle stays removed')
assert.match(copy, /reviewDescPrefix: '智能检测 ·'/, 'Step 2 wording must identify Smart Review')
assert.ok(!copy.includes('提示只是提醒，不会锁定下一步'), 'Step 2 copy must not contradict blocking confirmation semantics')
assert.match(copy, /真实歧义或硬信息风险需确认后继续/, 'Step 2 copy must explain the confirmation boundary')
assert.match(review, /reviewSmartSummaryTitle/, 'Smart Review value summary must remain visible')
assert.match(review, /checkedRowCount - attentionRows\.length/, 'normal-row summary must exclude rows needing attention')
assert.match(review, /reviewNoProblemSubDone/, 'no-problem copy must distinguish completed AI review')
assert.match(review, /reviewNoProblemSubPending/, 'no-problem copy must distinguish pending AI review')
assert.ok(!review.includes('onNext() // auto'), 'Smart Review must not silently auto-advance')

const stage3 = wb.indexOf("id=\"stage-adaptation\"")
const psPanel = wb.indexOf('<PhotoshopStep', stage3)
const stage4 = wb.indexOf("id=\"stage-delivery\"")
assert.ok(stage3 >= 0 && psPanel > stage3 && psPanel < stage4, 'Photoshop readiness must live in Step 3')
assert.ok(!wb.slice(stage4).includes('deliveryOpen && !psReady'), 'Step 4 must not own first-time Photoshop readiness')
assert.match(wb, /photoshopReady: psReady/, 'workbench state machine must gate delivery on Photoshop readiness')
const autoAdvanceStart = wb.indexOf('// B：只有完整交付门已开放')
const autoAdvanceEnd = wb.indexOf('// P0-C-3：', autoAdvanceStart)
assert.ok(autoAdvanceStart >= 0 && autoAdvanceEnd > autoAdvanceStart, 'auto-advance contract block must remain identifiable')
const autoAdvanceBlock = wb.slice(autoAdvanceStart, autoAdvanceEnd)
assert.match(autoAdvanceBlock, /if \(!deliveryOpen\) return/, 'Step 3 must not auto-advance until the authoritative delivery gate is open')
assert.ok(!autoAdvanceBlock.includes('if (!isReady) return'), 'auto-advance must not bypass Photoshop readiness by checking isReady alone')

assert.ok(!ps.includes('{copy.psNeedLocalAssistant}</p>'), 'generic always-on assistant warning must stay removed')
assert.match(ps, /copy\.psReadyStatus/, 'ready state must use concise status line')
assert.match(ps, /copy\.psReadyReplaceableLabel/, 'ready state must show replaceable count')
assert.match(ps, /copy\.psReadyManualLabel/, 'ready state must show manual count')
assert.match(ps, /copy\.psReadyLayerDetails/, 'detailed layer list must remain available behind disclosure')

assert.match(exec, /copy\.execLanguageRowsLabel/, 'Step 4 must show language + row count')
assert.match(exec, /copy\.execReadyStatusAll/, 'Step 4 must show batch-ready status')
assert.match(exec, /copy\.execReadyStatusSingle/, 'Step 4 must show single-language ready status')
assert.match(exec, /\(completed \|\| failed\)/, 'later owner decision: completion reset outlet must be preserved')
assert.match(spec, /后续明确决定优先于旧模拟稿/, 'mock deviations must be documented, not silently guessed')

// ─── UX P1（2026-09-17）：阶段头动作 / 语言卡状态 / 只读抽屉 / 单语言重跑 / 术语统一 ───
const terms = read('src/lib/workbench/workbench-terms.ts')
const panel = read('src/components/workbench/working-editor-panel.tsx')
const grid = read('src/components/workbench/working-grid.tsx')

assert.match(wb, /WB_TERMS\.detectAllLanguages/, 'Step 2 header must own the batch action 检测全部语言')
assert.match(wb, /WB_TERMS\.editSheet/, 'Step 2 header must own the 编辑译表 entry')
assert.match(wb, /<SheetContent side="right"/, '译表工作稿 must open as a right-side drawer')
assert.match(wb, /languageCode=\{currentLanguage\}[\s\S]{0,200}readOnly/, 'drawer grid must be read-only preview (option A)')
assert.match(wb, /handleRunSingleLanguageReview/, 'failed/unknown language must provide explicit single-language rerun')
assert.match(wb, /不自动重试/, 'no-auto-retry disclosure must remain')
assert.ok(!wb.includes('全语言审查（'), 'legacy 全语言审查 button label must be gone')
assert.ok(!wb.includes('站内编辑表格'), 'legacy 站内编辑表格 label must be gone')
assert.ok(!wb.includes('导出对账单（当前语言）'), 'legacy 对账单 export label must be gone')
assert.ok(!wb.includes('导出补译清单（当前语言）'), 'legacy 补译清单 export label must be gone')
assert.match(review, /languageReviewStatusLabel/, 'language cards must derive per-language status labels')
assert.match(review, /onRetryLanguage/, 'language card must expose retry for failed/unknown languages')
assert.match(panel, /readOnly\?: boolean/, 'working editor panel must support a read-only mode')
assert.match(grid, /readOnly\?: boolean/, 'grid must honor read-only mode')
// 2026-10-23 i18n：术语表改成 getter（渲染取值时才翻译），断言跟到新形态，
// 但仍锁定同一个中文原词——不允许借重构换掉统一说法。
assert.match(
  terms,
  /get unmatchedRows\(\)\s*\{\s*return t\('表里多出的行'\)/,
  'unified term for unmatched rows',
)
assert.match(
  terms,
  /get missingObjects\(\)\s*\{\s*return t\('设计稿里缺译文的对象'\)/,
  'unified term for missing objects',
)
assert.match(
  terms,
  /get keepSource\(\)\s*\{\s*return t\('保留原文（不替换）'\)/,
  'unified term for keep-source',
)
assert.match(
  terms,
  /get ignoreRow\(\)\s*\{\s*return t\('忽略这行（不写入、不计费）'\)/,
  'unified term for ignored rows',
)
assert.match(
  terms,
  /get retryLanguage\(\)\s*\{\s*return t\('重跑这一语言'\)/,
  'unified retry label',
)
assert.match(spec, /WF-008/, 'P1 IA + terminology must be documented in the workbench flow spec')

// #55（2026-09-18 真机发现）：第 4 步「仅当前语言」必须跟随智能检测当前语言，不得固定语言列表第一项
assert.match(
  wb,
  /const deliveryLanguage =\s*[\s\S]{0,160}targetLanguages\.includes\(currentLanguage\)/,
  '#55: Step 4 single-language target must derive from current language',
)
assert.match(wb, /targetLanguage=\{deliveryLanguage\}/, '#55: ExecuteStep must receive deliveryLanguage')
assert.match(wb, /editedTranslations=\{editedTranslations\[deliveryLanguage\]/, '#55: edited translations must follow delivery language')
assert.match(wb, /forcedBindings=\{forcedBindingsByLang\[deliveryLanguage\]/, '#55: forced bindings must follow delivery language')
assert.ok(
  !/targetLanguage=\{targetLanguages\[0\]\}/.test(wb),
  '#55: Step 4 must not pin the first language directly',
)
assert.match(spec, /单语言模式的目标语言/, '#55: workbench flow spec must document the delivery language rule')

// P5（2026-09-19 自动换行工作包）：译前版式例外必须可全量浏览并逐条处置，
// 不得退回"只看前 8 条、只能看不能动"的形态。
const layoutList = read('src/components/workbench/layout-exception-list.tsx')
assert.match(wb, /<LayoutExceptionList/, 'Step 3 must render the layout exception list')
assert.ok(!/overflowRisk\.top\.map/.test(wb), 'exception panel must not cap at the top-N slice')
assert.match(layoutList, /summary\.all\.filter/, 'exception list must page over the full capped list')
assert.match(
  layoutList,
  /overflowLanguageCode\(risk\.language\)/,
  'chip counts and row filtering must share one language key',
)
assert.match(layoutList, /WB_TERMS\.keepSource/, 'exception action must use the unified keep-source term')
// 真浏览器点击抓到的状态回归（2026-09-19）：切语言芯片曾把已展开的条目收回头 8 条
assert.equal(
  (layoutList.match(/setLimit\(/g) ?? []).length,
  1,
  'limit 只允许一处修改（"再显示"）；切换筛选不得回收用户已展开的条目',
)
assert.match(layoutList, /setLimit\(\(prev\) => prev \+ PAGE_SIZE\)/, '展开只能递增')
assert.match(layoutList, /处未列出/, 'list must state honestly when items are omitted beyond the cap')
// 渲染件里抓到的自相矛盾文案（2026-09-19）：行数没变却超宽的条目曾写成"需 1 行（设计稿 1 行）"
assert.match(layoutList, /单行放不下/, 'over-width rows with unchanged line count must say it plainly')
assert.match(wb, /onToggleExclude=\{handleToggleLayoutExclusion\}/, 'exception rows must use the shared exclusion handler')
assert.match(
  wb,
  /commitExcluded\(\[\.\.\.keys\]\.sort\(\)\)/,
  'exception exclusion must go through the single commit path',
)
assert.match(
  wb,
  /decisionFamily: 'layer_scope_exclusion',\s*actionCode: 'excluded',\s*contextFeatures: \{ stage: 'layout_exception_list' \}/,
  'exception exclusion must leave a human-confirmed decision fact',
)
assert.match(spec, /WF-009/, 'WF-009 must document the layout exception list')

// ── 自动归属（2026-10-23 Owner 选 A）────────────────────────────────────────
// 判据在产品合同里，界面只渲染：模态表格必须由 attribution 计划驱动，
// 不得退回「按文件名/目录猜」的 pairing.rows；冲突行不许替用户预选。
assert.match(wb, /buildAttributionPlan\(/, 'bulk import must compute the SKU×deliverable attribution plan')
assert.match(wb, /attributionAutoChoices\(/, 'only auto rows may pre-fill the table choice')
assert.ok(!wb.includes('bulkImport.pairing.rows'), 'modal rows must not fall back to name-based pairing')
assert.match(wb, /bulkImport\.attribution\.rows\.map/, 'modal rows must render the attribution plan')
assert.match(wb, /bulkImport\.attribution\.orphans\.map/, 'tables without drafts must be listed, not dropped')
assert.match(wb, /bulkImport\.attribution\.matrix\.map/, 'SKU×deliverable overview must be rendered')
for (const label of ['自动配好', '要你定', '没找到表', '有表无稿']) {
  assert.ok(wb.includes(label), `attribution summary must show「${label}」`)
}
assert.match(wb, /\{row\.reason\}/, 'every attribution row must show its human-readable reason')
assert.match(
  wb,
  /bulkChoices\[row\.draft\.masterPath\]/,
  'table choice must be keyed by masterPath (same-name drafts must not overwrite each other)',
)
assert.match(
  wb,
  /row\.identity\.deliverable/,
  'sheet selection must reuse the attributed deliverable instead of guessing from the filename again',
)

// ── 第 1 步壳（2026-10-23 按 Owner 点头的模拟重做）────────────────────────────
// 结构权威：交付档案/执行方案/模拟_20261022_多稿工作台_完美版.html 的 renderStep1B()。
// 这条合同只守三件事：① 壳按模拟的骨架在；② 旧能力（逐稿手动导入）仍有出口；
// ③ 页内选文件夹走助手的只读端点，同一张票，不新增权限。
const stage = read('src/components/workbench/step1-stage-view.tsx')
const picker = read('src/components/workbench/folder-picker-dialog.tsx')
const assistantServer = read('download/local-assistant/server.js')
const client = read('src/lib/workbench/local-assistant-client.ts')

assert.match(wb, /<Step1StageView/, 'Step 1 must render the approved workbench shell')
assert.match(wb, /plan=\{stagePlan\}/, 'shell must be driven by the attribution plan, not a second judgement')
assert.match(wb, /choices=\{stageResolved\.choices\}/, 'shell choices must come from the single resolver (override > memory > auto)')
assert.match(wb, /onShowClassic=/, 'manual per-draft import must keep an exit (capability preserved)')
// 2026-10-23 整体替换：壳层文案全部收进 siteContent.step1，组件不再写死中文，
// 所以「保留」断言改查文案源；结构断言改查 data-step1-target 与新编排。
assert.match(stage, /useSiteCopy\('workbench'\)\.step1/, 'Step 1 shell copy must come from siteContent.step1')
for (const target of ['folder', 'queue', 'matrix', 'next']) {
  assert.ok(stage.includes(`data-step1-target="${target}"`), `Step 1 shell must expose guide target「${target}」`)
}
for (const marker of ['整批语言覆盖矩阵', '要你处理的', '有表无稿', '本批语言格', '逐稿手动导入', '扫描设计稿']) {
  assert.ok(copy.includes(marker), `Step 1 shell must keep「${marker}」in editable copy`)
}
// 2026-10-24 多稿第 1 步重排 P2：矩阵从「SKU×语言计数」升级为「译文来源矩阵」，
// 判格一律走 P0 纯函数 deriveSourceMatrix，覆盖率一律来自与执行前闸同口径的
// calcCoverageMatrixForDraftTables（#190：estimable=false 的格不喂数字）。
assert.match(stage, /deriveSourceMatrix\(/, 'source matrix must be derived from the pure P0 matrix function')
assert.match(stage, /calcCoverageMatrixForDraftTables\(/, 'matrix coverage must come from the shared pre-execution estimator')
assert.match(stage, /data-step1-target="language-detail"/, 'language cell click must open a visible detail region')
assert.match(stage, /setDrawer/, 'source matrix cells must have a real click action, not a dead td')
assert.match(stage, /aria-pressed=/, 'language cells/headers must expose selected state')
assert.match(stage, /copy\.choose\.forget/, 'remembered attribution must be revocable from the UI')
assert.match(stage, /<StepGuide/, 'Step 1 must keep the first-run guide')
assert.match(stage, /<StepHelp/, 'Step 1 must keep the help drawer')
assert.match(wb, /loadAttributionMemory\(/, 'attribution memory must be loaded from storage')
assert.match(wb, /saveAttributionMemory\(/, 'attribution memory must be persisted when a human chooses')

// 2026-10-23 第 1 步按执行方案替换：自动读表、按 SKU＋交付物去重、同名分组、下一步闸、扫描桥。
assert.match(wb, /loadStageTable\(/, 'Step 1 must auto-read the chosen table (no assistant release needed)')
assert.match(wb, /runStageTableBatch\(/, 'Step 1 table reads must run through the bounded concurrency pump')
assert.match(wb, /dedupeStageChoices\(/, 'attribution memory must not assign one table to two same-identity drafts')
assert.match(wb, /groupDuplicateDrafts\(/, 'same-name drafts must be compared by fingerprint before merging')
assert.match(wb, /evaluateStageGate\(/, 'Step 1 must gate Next on scan + choice + table read')
assert.match(wb, /stageResolved\.dropped/, 'deduped memory choices must be surfaced, not silently dropped')
assert.match(wb, /onScanStateChange=/, 'scan queue progress must be surfaced in the new shell')
assert.match(wb, /onScanAll=/, 'new shell must expose the scan-all action')
assert.match(wb, /handleStageFolderSnapshot/, 'folder scan must auto-fill the batch')

// 2026-10-23 第二刀：删第一层、文件夹入口照单稿卡、原生选择框、手动选表。
const gate = read('src/components/workbench/stage-folder-gate.tsx')
const tablePicker = read('src/components/workbench/table-picker-dialog.tsx')
const designCard = read('src/components/workbench/design-file-card.tsx')
assert.match(wb, /<StageFolderGate/, 'no-folder state must show the single-style folder gate')
assert.match(wb, /loadStageFolder/, 'folder reading must be owned by the parent (visible loading/errors)')
assert.match(wb, /<TablePickerDialog/, 'manual table picker must be mounted')
assert.match(wb, /stageManualChoices/, 'manual table choice must survive the resolver')
assert.ok(
  wb.includes("batchMode && !stageClassic ? 'hidden' : undefined"),
  'the old multi-select first layer must stay hidden in the new batch flow',
)
assert.match(stage, /onPickTable/, 'missing/conflict rows must expose a manual table exit')
assert.match(stage, /copy\.missing\.pickTable/, 'missing row must offer「选择译文表…」')
assert.match(stage, /copy\.choose\.changeTable/, 'chosen row must allow changing the table')
assert.match(tablePicker, /onPick\(table\.path\)/, 'table picker must select a table path')
// 2026-10-24 多稿第 1 步重排 P1/P2：译文表清单收进 step1-stage-view 新壳内部；选择器接表册补结构信息。
const tableInventory = read('src/components/workbench/table-inventory-list.tsx')
assert.match(stage, /<TableInventoryList/, 'batch step 1 must list the folder table inventory inside the new shell')
assert.match(tableInventory, /buildTableInventory\(/, 'table inventory must derive from the pure P0 function')
assert.match(tableInventory, /onRetryRead/, 'table inventory read/retry must reuse the existing per-draft read queue')
assert.match(gate, /onReadFolder/, 'folder gate must own a read action')
assert.match(gate, /picking/, 'folder gate must distinguish native picker wait from folder reading')
// 2026-10-23 纠正：图三的 OpenFileDialog 只能选文件，不能选文件夹；
// 批量页必须恢复真正的原生文件夹选择（FolderBrowserDialog），
// 选 PSD 再取父目录只是错位替代，会选不到空文件夹/项目根。
assert.match(wb, /selectImportFolderDirect\(\)/, 'batch entry must use the native folder picker')
assert.match(wb, /parentFolderOfFile/, 'pasted PSD/PSB paths must still normalize to their folder')
assert.match(wb, /onPickFolder=\{handleStagePickFolder\}/, 'folder gate primary action must open the native folder picker')
assert.ok(!wb.includes('selectDesignFileDirect'), 'batch must not use the file picker as a folder picker')
assert.ok(!wb.includes('stagePickerOpen'), 'new batch flow must not mount the in-app folder browser')
assert.ok(!wb.includes('FolderPickerDialog'), 'new batch flow must not mount FolderPickerDialog')
assert.ok(!gate.includes('onUseSystemDialog'), 'folder gate must not keep a duplicate system-dialog link')
assert.ok(!gate.includes('<h1'), 'folder gate must not duplicate the shared step title')
assert.ok(!stage.includes('<h1'), 'step 1 stage view must not duplicate the shared step title')
assert.match(wb, /!batchMode && preparationDone/, 'single-draft file summary must not leak into batch header')
const headerAt = wb.indexOf('data-typography-trigger="header"')
const batchBranchAt = wb.indexOf('{batchMode && !stageClassic && (')
assert.ok(
  headerAt > 0 && batchBranchAt > 0 && headerAt < batchBranchAt,
  'title + typography header must be shared outside the batch/classic branch',
)
assert.match(picker, /mode === 'psd'/, 'the in-app picker must support PSD file mode')
assert.match(picker, /onConfirmFile/, 'PSD mode must return a file path')
// 2026-10-23 回退：Owner 要单稿用原来的 Windows 原生文件框，不是页内浏览。
assert.match(designCard, /selectDesignFileDirect\(anchor\)/, 'single-draft file picker must use the native file dialog')
assert.match(
  designCard,
  /window\.outerWidth \/ 2/,
  'native dialog owner must be centered on the app window, not the button',
)
assert.ok(!designCard.includes('mode="psd"'), 'single-draft must not use the in-app PSD browser')

assert.match(picker, /选择工作文件夹/, 'classic fallback folder picker must remain the in-app dialog')
assert.match(picker, /listLocalDirectory/, 'folder picker must read directories through the local assistant')
assert.ok(!picker.includes('webkitdirectory'), 'picker must not switch to browser folder upload (it cannot give absolute paths)')
assert.ok(!picker.includes('readTable'), 'picker must not read table contents (read-only listing)')

assert.match(assistantServer, /p === '\/v1\.5\/list-dir'/, 'assistant must expose the read-only directory listing endpoint')
assert.match(
  assistantServer,
  /result\.operation !== 'select_file'[\s\S]{0,160}LIST_DIR_NOT_AUTHORIZED/,
  'directory listing must reuse the select_file ticket instead of inventing a new permission',
)
assert.ok(!assistantServer.includes('LIST_DIR_WRITE'), 'directory listing must stay read-only')
assert.match(client, /assistantSupportsDirectoryListing/, 'old assistants must be detected and fall back to the system dialog')
assert.match(client, /patch >= 24/, 'the directory listing gate must start at assistant 3.7.24')

assert.match(csv, /whitespace-nowrap/, 'format example headers must not wrap into the next column')
assert.match(csv, /overflow-x-auto/, 'format examples must scroll horizontally instead of squeezing columns')

console.log('workbench UI product contract: ok')
