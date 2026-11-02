#!/usr/bin/env node
/**
 * 「批准稿＝规格」静态对账门（第 1 步 14 条交互契约）。
 *
 * 为什么是静态对账而不是 DOM 指纹：批准稿是给人点的模拟件，真界面是 React 组件，
 * 两者的样式与结构本来就不该逐字节相同；会骗人的是**文案与取数口**——同一句话在两处
 * 由两套代码算出来，才是这一轮所有事故的共同形状。所以这里只问两件事：
 *   ① 批准稿要求的这句文案，真代码里有没有（没有＝契约没落地）；
 *   ② 同一个数字是不是只有一个来源（出现第二个来源＝红）。
 * 推迟的契约也打印在表里，不许静默消失。
 *
 * 运行：node scripts/smoke-step1-mock-contract.mjs ；挂进 npm run test:contracts
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const VIEW = 'src/components/workbench/workbench-view.tsx'
const STEP1 = 'src/components/workbench/step1-stage-view.tsx'
const SCOPE = 'src/lib/workbench/slot-scope.ts'
const GATE = 'src/components/workbench/stage-folder-gate.tsx'
const EXEC = 'src/components/workbench/execute-step.tsx'
const CONTENT = 'src/config/siteContent.ts'
const EVIDENCE = 'src/lib/workbench/binding-evidence.ts'
const MEMORY = 'src/lib/workbench/language-exclusion-memory.ts'
const DICT = 'src/lib/i18n/dict-en.json'
const view = read(VIEW)
const step1 = read(STEP1)
const scope = read(SCOPE)
const gate = read(GATE)
const exec = read(EXEC)
const content = read(CONTENT)
const evidenceModule = read(EVIDENCE)
const memoryModule = read(MEMORY)
const dict = read(DICT)

let failures = 0
let checked = 0
const rows = []

/** needle 一律按字面串数出现次数；hit 用 exactly 钉死次数（0＝必须没有）。 */
function contract(n, label, status, checks, note) {
  const problems = []
  for (const check of checks) {
    const count = check.source.split(check.needle).length - 1
    if (check.exactly != null ? count !== check.exactly : count < 1) {
      problems.push(`${check.at} 期望 ${check.exactly ?? '≥1'} 次、实得 ${count} 次（${JSON.stringify(String(check.needle)).slice(0, 46)}）`)
    }
  }
  checked += checks.length
  // 只有「推迟／未做·有原因」允许没有判据；「部分·点名」给了 needle 就必须判——
  // 否则那一条 needle 成了装饰品（U-β 实测过一次假绿：删掉一键的自动扫描，门照样绿）。
  const exempt = status === '推迟' || status.startsWith('未做')
  if (problems.length > 0 && !exempt) {
    failures += 1
    rows.push([n, label, '冲突·点名', problems.join('；')])
  } else {
    rows.push([n, label, status, problems.length > 0 ? problems.join('；') : (note ?? '')])
  }
}

// ── 14 条契约（编号与 审查报告_20261026_批准稿即规格_四步界面契约对账.md:13-26 同序） ──
// Owner 10/29: remove development instrumentation from product UI.
contract(1, '开发点击次数不展示（10/29更新）', '已对', [
  { at: STEP1, source: step1, needle: "t('手工选表')", exactly: 0 },
])
contract(2, '内部格数仪表不展示（10/29更新）', '已对', [
  { at: STEP1, source: step1, needle: 'data-testid="step1-stats"', exactly: 0 },
])
contract(3, '顶栏份数只有一个来源', '已对', [
  { at: `${STEP1}`, source: step1, needle: 'deliverablesByDraft[group.draftPath]?.count' },
  { at: `${STEP1}`, source: step1, needle: 'sum + group.languageCount', exactly: 0 },
  { at: `${SCOPE}`, source: scope, needle: 'export function countDeliverables' },
])
contract(4, '空态只保留素材入口和使用约束（10/29更新）', '已对', [
  { at: GATE, source: gate, needle: 'copy.changesTitle', exactly: 0 },
  { at: GATE, source: gate, needle: 'copy.notes.map' },
  { at: GATE, source: gate, needle: 'onReadFolder(path)' },
])
contract(5, '扫描四阶段清单＋进度条', '已对', [
  { at: `${STEP1}: 清单容器`, source: step1, needle: 'data-testid="step1-pair-stages"', exactly: 1 },
  { at: `${STEP1}: 进度条`, source: step1, needle: 'data-testid="step1-pair-bar"', exactly: 1 },
  // 四阶段的字必须四句都在（少一句＝少一步，进度条就会报一个假的分母）。
  { at: `${STEP1}: 阶段一`, source: step1, needle: "t('扫描文件夹')" },
  { at: `${STEP1}: 阶段二`, source: step1, needle: "t('认 SKU 与交付物')" },
  { at: `${STEP1}: 阶段三`, source: step1, needle: "t('归组')" },
  { at: `${STEP1}: 阶段四`, source: step1, needle: "t('读表头')" },
  // 两个动作都要能唤出清单：只挂在扫描上，读表头时第四步就永远看不见。
  // 2 处＝按钮忙碌态文案＋状态条首行；删掉状态条那处就变 1 处，门红。
  { at: `${STEP1}: 读表头也唤出清单`, source: step1, needle: "t('正在读表头…')", exactly: 2 },
  // 进度条必须真按「几步行了」算：写死宽度＝条会骗人（负控实测过：改成常量门变红）。
  { at: `${STEP1}: 条宽随步数`, source: step1, needle: 'width: `${Math.round((pairDoneCount / pairStages.length) * 100)}%`', exactly: 1 },
  // 四步状态写进 DOM：测试与读屏都认这个，写死状态会被断言抓住。
  { at: `${STEP1}: 四步状态`, source: step1, needle: "data-stage-state={stage.done ? 'done' : stage.running ? 'on' : 'todo'}", exactly: 1 },
  // 每步的数字各只有一个来源：把常量塞回去，这条就红。
  { at: `${STEP1}: 认出数取 plan`, source: step1, needle: "t('{n}/{total} 认出', { n: skuKnown, total: drafts })", exactly: 1 },
  // 内核每稿必推一组（认不出 SKU 的稿也推空组，table-grouping.ts:238-258）⇒
  // 组数只准数真收了表的组，退回 groups.length 会把「一份都没配上」说成归好组。
  { at: `${STEP1}: 组数只数非空组`, source: step1, needle: 'group.tables.length > 0', exactly: 1 },
  { at: `${STEP1}: 组数没退回 groups.length`, source: step1, needle: 'groupBindings.groups.length', exactly: 0 },
  // 第四步数「表头已知」（rows 有值），不是只把全文读完算数（table-inventory.ts:160）。
  { at: `${STEP1}: 表头已知取 rows`, source: step1, needle: 'record.rows !== null', exactly: 1 },
  { at: `${STEP1}: 没退回只数全文读完`, source: step1, needle: 'const readTables = inventory.filter', exactly: 0 },
  { at: `${DICT}: 英文对照`, source: dict, needle: '"扫描文件夹"' },
  { at: `${DICT}: 第四步英文`, source: dict, needle: '"{n}/{total} 张表头已读"' },
  { at: `${DICT}: 第四步失败分支英文`, source: dict, needle: '"{n} 张表头已读 · {failed} 张读不了"' },
])
contract(6, '「扫描并自动配对」一键', '部分·点名', [
  { at: `${CONTENT}`, source: content, needle: "read: '扫描并自动配对'" },
  // 一键只保证「读文件夹 → 自动开始扫描」这一跳；读表头仍手动，且这句写在界面上。
  { at: `${VIEW}`, source: view, needle: "t('文件夹已读取，已自动开始扫描设计稿" },
  { at: `${CONTENT}`, source: content, needle: '扫完还要点一次「读全部表头」' },
])
rows.push(['6b', '一键里的「读表头」自动接上', '未做·有原因', '扫描完成没有可等待信号（审查 I-2）：硬串就变成轮询。改为界面上明写"还要点一次读全部表头"。'])
contract(7, '语言格 role=checkbox 且点掉真剔除', '已对', [
  { at: `${STEP1}`, source: step1, needle: 'role="checkbox"', exactly: 1 },
  { at: `${STEP1}`, source: step1, needle: "const droppable = slot.state === 'ready'" },
  { at: `${STEP1}: 挂载点`, source: step1, needle: 'onClick={() => onToggleSlot(group.draftPath, slot.lang, dropped)}' },
  { at: `${VIEW}: 挂载点`, source: view, needle: 'onToggleSlot={handleStageToggleSlot}' },
  { at: `${VIEW}`, source: view, needle: 'const setDraftLanguages = (masterPath: string, next: string[]) => {' },
  // 两个副本必须是两个对象（共享引用＝ref 侧改动能偷偷漏进渲染侧，React Compiler 会报 may be modified later）。
  { at: `${VIEW}: 副本一`, source: view, needle: 'draftSnapshotsRef.current[key] = { ...updated }' },
  { at: `${VIEW}: 副本二`, source: view, needle: 'setInactiveDraftSnapshots((previous) => ({ ...previous, [key]: { ...updated } }))' },
  { at: `${VIEW}: 摘要同删`, source: view, needle: 'setReviewedLanguageDigests(dropDigests)', exactly: 2 },
])
contract(8, '「全选回来」', '已对', [
  { at: `${STEP1}`, source: step1, needle: "t('全选回来')" },
  { at: `${STEP1}`, source: step1, needle: 'onClick={() => onRestoreSlots(group.draftPath)}' },
  // 必须真挂在挂载点上：只判「函数名存在」会被改名蒙过去（N-β 实测过一次假绿）。
  { at: `${VIEW}: 挂载点`, source: view, needle: 'onRestoreSlots={handleStageRestoreSlots}' },
  { at: `${SCOPE}`, source: scope, needle: 'export function readySlotLanguages' },
])
contract(9, '折叠「配表详情」', '已对', [
  { at: `${STEP1}`, source: step1, needle: "t('配表详情')" },
  { at: `${STEP1}: 旧标签撤干净`, source: step1, needle: "t('看依据')", exactly: 0 },
])
contract(10, '四条例外各自按钮', '部分·点名', [
  { at: `${STEP1}: 选哪张`, source: step1, needle: "t('用这张')" },
  { at: `${STEP1}: 先读表再判`, source: step1, needle: "t('读这张表再判')" },
  { at: `${STEP1}: 拦下的反向动作`, source: step1, needle: "t('拦下 · 点这里放开')" },
])
rows.push(['10b', '「排除其余 11 门照跑」的显式按钮', '部分·点名', '缺：Owner 裁定"2只排除这一门"由格剔除承担；拦下的表另有「放开」，未再建第三个按钮'])
contract(11, '处置后「已按默认」＋撤销／改', '已对', [
  { at: `${STEP1}`, source: step1, needle: "data-testid=\"step1-decided-undo\"" },
  { at: `${STEP1}`, source: step1, needle: "data-testid=\"step1-decided-change\"" },
  { at: `${VIEW}: 挂载点`, source: view, needle: 'onClearChoice={handleStageClearChoice}' },
])
contract(12, '移除历史效率对照（10/29更新）', '已对', [
  { at: STEP1, source: step1, needle: 'data-testid="step1-mode-compare"', exactly: 0 },
  { at: STEP1, source: step1, needle: 'data-testid="step1-workspace-legacy"', exactly: 0 },
])
contract(13, '「下一步」按待处置件数禁用', '已对', [
  { at: `${VIEW}: 既有门（不另建第二道）`, source: view, needle: '份还没拍板' },
  { at: 'src/lib/workbench/stage-rows.ts', source: read('src/lib/workbench/stage-rows.ts'), needle: "kind: 'pending-choice'" },
])
contract(14, '左栏每稿状态 pill', '已对', [
  { at: `${STEP1}`, source: step1, needle: '{group.statusLabel}' },
])

// ── 口径纪律：份数不许出现第二个来源 ──
const deliverableSites = step1.split("t('可交付 {n} 份')").length - 1
if (deliverableSites < 2) {
  failures += 1
  rows.push(['S1', '「可交付 N 份」至少两处消费者读同一份派生', '冲突·点名', `实得 ${deliverableSites} 处`])
} else {
  rows.push(['S1', '「可交付 N 份」全部读 deliverablesByDraft', '已对', `${deliverableSites} 处`])
}
const subtractPattern = /languageCount\s*[-+]\s*\d|languageCount\s*-\s*/
if (subtractPattern.test(step1)) {
  failures += 1
  rows.push(['S2', '份数不做减法（I-4：会把缺表的格减成负数）', '冲突·点名', '出现 languageCount 参与加减'])
} else {
  rows.push(['S2', '份数不做减法（I-4）', '已对', ''])
}
checked += 2

// ── 本轮版面判据（七处 UIUX 里"有数据源、看得见"的那几条；其余在表里点名未做） ──
const waitLine = (step1.match(/^\s*wait: '.*$/m) ?? [''])[0]
if (!waitLine || waitLine.includes('bg-amber')) {
  failures += 1
  rows.push(['S3', '待检查格不再整片黄（①）', '冲突·点名', `wait 行仍带琥珀填充：${waitLine.trim().slice(0, 60)}`])
} else {
  rows.push(['S3', '待检查格只描边不填充（①）', '已对', '红底仍留给必须处理的格'])
}
const cellClassDefs = step1.split('const CELL_CLASS').length - 1
if (cellClassDefs !== 1) {
  failures += 1
  rows.push(['S4', '染色判据只有一处（防第二套账）', '冲突·点名', `CELL_CLASS 定义 ${cellClassDefs} 处`])
} else {
  rows.push(['S4', '染色判据只有一处（防第二套账）', '已对', ''])
}
if (!exec.includes('grid grid-cols-6 gap-1.5 max-sm:grid-cols-3')) {
  failures += 1
  rows.push(['S5', '第 4 步语言区为六列网格（⑤）', '冲突·点名', '未找到 grid-cols-6 容器'])
} else {
  rows.push(['S5', '第 4 步语言区六列网格＋窄屏三列（⑤）', '已对', '缺表／不做两态未做：batchSummary 无此维度（审查 I-5）'])
}
if (!exec.includes('grid-cols-[auto_auto]')) {
  failures += 1
  rows.push(['S6', '第 4 步范围两列小表（④）', '冲突·点名', '未找到两列 dl'])
} else {
  rows.push(['S6', '第 4 步范围两列小表（④）', '已对', '三个数全取既有派生，未写"已绑−剔除"（审查 I-3）'])
}
for (const [label, note] of [
  ['日志按稿聚合（⑥）', '未做：执行日志是被整体替换的字符串，结果面板只有语言维（审查 I-6）'],
  ['只重跑失败的那几份（⑦）', '未做：重试需先精确重建服务端冻结的 expectedRowTokens 行集（审查 I-7）'],
]) {
  rows.push(['S7', label, '未做·有原因', note])
}
checked += 5

// ── 绑定证据分级（v3 P0）：六档判定只有一个内核，界面只显示、不自己算 ──
contract('E1', '证据分级内核存在且复用覆盖口径', '已对', [
  // 覆盖口径必须从 coverage.ts 引进来（2026-10-27 起该文件还引 CoverageDraftLike，故只核引自 './coverage'）
  { at: `${EVIDENCE}: 覆盖口径`, source: evidenceModule, needle: "from './coverage'", exactly: 1 },
  { at: `${EVIDENCE}`, source: evidenceModule, needle: 'export function evaluateBindingEvidence', exactly: 1 },
  { at: `${EVIDENCE}`, source: evidenceModule, needle: 'export function ownerFromValues', exactly: 1 },
  // 逐稿装配证据的入口也只有一个（2026-10-27 从第 1 步搬进内核，两个界面同调它）
  { at: `${EVIDENCE}`, source: evidenceModule, needle: 'export function buildBindingEvidences', exactly: 1 },
  // 95% 闸只在 coverage.ts：证据内核不许自带阈值，否则同一份原文两个口径。
  { at: `${EVIDENCE}: 不自带阈值`, source: evidenceModule, needle: 'COVERAGE_THRESHOLD', exactly: 0 },
])
contract('E2', '界面渲染证据档位（档位来源唯一）', '已对', [
  { at: `${STEP1}: 行头徽章`, source: step1, needle: 'data-testid="step1-evidence-badge"', exactly: 1 },
  { at: `${STEP1}: 组卡徽章`, source: step1, needle: 'data-testid="step1-group-evidence"', exactly: 1 },
  { at: `${STEP1}: 组卡依据行`, source: step1, needle: 'data-testid="step1-group-evidence-detail"', exactly: 1 },
  // 档位只从内核的**装配函数**取；界面里再出现逐格判定＝第二套真值 ⇒ 红。
  { at: `${STEP1}: 档位来自内核`, source: step1, needle: 'buildBindingEvidences({', exactly: 1 },
  { at: `${STEP1}: 不许绕过装配函数`, source: step1, needle: 'evaluateBindingEvidence(', exactly: 0 },
])
contract('E3', '「不符」在组卡上硬停，不进第 2 步', '已对', [
  { at: `${STEP1}: 闸拼进 canAdvance`, source: step1, needle: 'const canAdvance = gate.ok && group.pendingCount === 0 && !blockedByEvidence', exactly: 1 },
  { at: `${STEP1}: 按钮第三支`, source: step1, needle: "t('这一组的表对不上：换一张表再进第 2 步')", exactly: 1 },
])
contract('E4', '只有「不符」进待办，存疑交给覆盖率闸（D16 不重复报）', '已对', [
  { at: `${STEP1}: 待办只收 mismatch`, source: step1, needle: 'if (evidence?.tier === \'mismatch\')', exactly: 1 },
  { at: `${STEP1}: 待办条目只此一处`, source: step1, needle: "items.push({ kind: 'evidence'", exactly: 1 },
  { at: `${STEP1}: 待办条文案`, source: step1, needle: "t('绑定不符')", exactly: 1 },
])
contract('E5', '六档文案有英文对照（界面切英文不出中文）', '已对', [
  { at: `${DICT}: 实证`, source: dict, needle: '"实证"' },
  { at: `${DICT}: 不符`, source: dict, needle: '"不符"' },
  { at: `${DICT}: 未核`, source: dict, needle: '"未核"' },
  { at: `${DICT}: 依据行`, source: dict, needle: '"绑定证据（{tier}）：{detail}"' },
])

// ── 剔除记忆（2026-10-27）：剔掉的门要跨会话记得住，且沿用必须说出来 ──
// 为什么键指纹不键路径：psd-selection.ts:2 划的边界——masterPath 不进草稿/存储。
contract('M1', '剔除记忆存在且键内容指纹（不存路径）', '已对', [
  { at: `${MEMORY}: 读`, source: memoryModule, needle: 'export function loadLanguageExclusions(', exactly: 1 },
  { at: `${MEMORY}: 写`, source: memoryModule, needle: 'export function saveLanguageExclusions(', exactly: 1 },
  { at: `${MEMORY}: 叠加`, source: memoryModule, needle: 'export function applyExclusions(', exactly: 1 },
  { at: `${MEMORY}: 取数顺序`, source: memoryModule, needle: 'export function deriveLanguages(', exactly: 1 },
  { at: `${MEMORY}: 记账`, source: memoryModule, needle: 'export function nextExclusions(', exactly: 1 },
  { at: `${MEMORY}: 只认摘要形`, source: memoryModule, needle: 'export function isDocumentFingerprint(', exactly: 1 },
  { at: `${MEMORY}: 存储键`, source: memoryModule, needle: "'tygf:workbench:language-exclusions:v1'", exactly: 1 },
])
contract('M2', '第 1 步读记忆、写记忆（唯一写入口一处）', '已对', [
  // 一处是切稿/恢复现场时按排除记忆回退语言，一处是多稿逐稿派生；两者调同一纯函数。
  { at: `${VIEW}: 两条派生路都套同一记忆`, source: view, needle: 'deriveLanguages({', exactly: 2 },
  // 记忆读取还用于提示和更新被排除集合；调用点增加不产生第二套记忆实现。
  { at: `${VIEW}: 取记忆`, source: view, needle: 'exclusionsFor(', exactly: 4 },
  { at: `${VIEW}: 写记忆`, source: view, needle: 'withLanguageExclusions(', exactly: 1 },
  { at: `${VIEW}: 落存储`, source: view, needle: 'saveLanguageExclusions(remembered)', exactly: 1 },
  { at: `${VIEW}: 记账口径`, source: view, needle: 'nextExclusions(', exactly: 1 },
  { at: `${VIEW}: 批量指纹只从唯一派生表取`, source: view, needle: 'fingerprint: fingerprintByDraft[entry.masterPath] ?? null', exactly: 1 },
  { at: `${VIEW}: 指纹派生唯一入口`, source: view, needle: 'entry.summary?.fingerprint', exactly: 1 },
  { at: `${VIEW}: 指纹来源（单稿）`, source: view, needle: 'if (psdSelection?.masterPath && psdSelection.summary?.fingerprint)', exactly: 1 },
])
contract('M3', '沿用上次剔除必须明说（不许静默生效）', '已对', [
  { at: `${VIEW}: 告知文案`, source: view, needle: "t('沿用了上次剔掉的语言（{value0}）。要恢复就点那一稿的「全选回来」。'", exactly: 1 },
  { at: `${DICT}: 英文对照`, source: dict, needle: '"沿用了上次剔掉的语言（{value0}）。要恢复就点那一稿的「全选回来」。"', exactly: 1 },
])

// ── 打印 ──
const pad = (text, width) => {
  const chars = [...String(text)]
  return chars.length >= width ? String(text) : String(text) + ' '.repeat(width - chars.length)
}
console.log('批准稿 14 条契约 × 真代码对账（静态）')
console.log('  #    状态          契约                                    备注')
for (const [n, label, status, note] of rows) {
  console.log(`  ${pad(n, 4)} ${pad(status, 12)} ${pad(label, 38)} ${note}`)
}
console.log(`\n判据 ${checked} 项 · 行 ${rows.length} 条 · 失败 ${failures} 项`)
if (failures > 0) {
  console.error(`FAIL: ${failures} 条应落地的契约在真代码里找不到，或出现了第二个数字来源`)
  process.exit(1)
}
console.log('PASS: 应落地的契约逐条有出处；推迟项已在表里点名')
