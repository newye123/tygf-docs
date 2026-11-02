// 工作台「单个 / 多个设计稿」可见性与执行前确认的静态合同（v12，2026-10-21）
//
// 为什么用「读源码做断言」：这三件事全是**展示层 + 一次点击拦截**，
// 运行时症状是「看起来没变化」或「按下去就直接开跑」——纯函数测不到，
// 而项目里已有先例（smoke-workbench-ui-contract / smoke-batch-workbench-guards）
// 用静态断言把「删掉也不报错」的东西钉死。
//
// 本文件钉的五组不变量：
//   A ② 范围条常驻，且两档各有自己的话术（不是一句通用文案）
//   B ③ 状态带按档分支；单稿档既有节点一个不少（改多稿别把单稿改坏）
//   C ⑥ 只有多稿档的主按钮带份数；单稿档按钮文案不动
//   D D1 执行前确认：两个入口都必须先过确认；确认时重算范围指纹（TOCTOU）
//   E 不做项：没有「撤销已写入」、没有半成品的「停止这一批」（C1/C2 未实现）
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n')
const view = read('src/components/workbench/workbench-view.tsx')
const exec = read('src/components/workbench/execute-step.tsx')
const dialog = read('src/components/workbench/execution-scope-dialog.tsx')
const card = read('src/components/workbench/design-file-card.tsx')
const pkg = JSON.parse(read('package.json'))

let passed = 0
function ok(condition, label) {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('[A] ② 范围条：两档各有话术，且就在切换器旁边')
ok(view.includes('data-testid="workbench-scope-chip"'), '范围条节点存在（data-testid=workbench-scope-chip）')
ok(
  view.includes("t('这份稿：')") && view.includes('psdBasename'),
  '单稿档话术＝「这份稿：<文件名>」',
)
ok(
  view.includes("t('这一批：')") && view.includes('batchScopeTotal'),
  '多稿档话术＝「这一批：N 个设计稿…」',
)
ok(
  view.includes("t(' 个设计稿 · 已扫描 ')") && view.includes('batchScopeScanned'),
  '多稿档带已扫描计数',
)
const tablistIdx = view.indexOf("aria-label={t('设计稿数量')}")
const chipIdx = view.indexOf('data-testid="workbench-scope-chip"')
const bandIdx = view.indexOf('data-testid="workbench-batch-status"')
ok(tablistIdx >= 0 && chipIdx > tablistIdx, '范围条排在分段切换器之后（同一行）')
ok(bandIdx > chipIdx, '状态带排在范围条之后')

console.log('[B] ③ 状态带：多稿走集合语义，单稿既有节点一个不少')
ok(view.includes('data-testid="workbench-batch-status"'), '多稿状态带节点存在')
ok(/\{batchMode \? \(\n[\s\S]{0,2000}?\) : \(\n\s*<div className="flex min-w-0 items-center gap-2">/.test(view), '状态带写成 batchMode ? 集合语义 : 原样')
const bandSlice = view.slice(bandIdx, view.indexOf('{batchLoading ? (', bandIdx))
ok(bandSlice.includes('尚未选择设计文件'), '单稿分支保留「尚未选择设计文件」')
ok(bandSlice.includes("psdSelection.state === 'stale'"), '单稿分支保留「扫描已过期」提示')
ok(bandSlice.includes('{WB_ACTIONS.rescan.label}'), '单稿分支保留「重新扫描」动作')
ok(bandSlice.includes('· {parsedName}'), '单稿分支保留解析名')
ok(
  bandSlice.includes('{targetLanguages.length}') && bandSlice.includes("t('个语言')"),
  '单稿分支保留语言数',
)
ok(view.includes('isMultiPsdEntryScanned'), '多稿计数复用 psd-selection 的唯一判据（不另写 state===prepared）')
ok(!/state === 'prepared' && !!entry\.summary/.test(view), '没有手搓第二套「已扫描」判据')
ok(card.includes('全部扫描'), '「全部扫描（按顺序）」仍在第 1 步（队列只有这一个 owner）')
ok(!bandSlice.includes('全部扫描'), '状态带不复制第二套扫描队列（只给「去扫描」跳转）')
ok(bandSlice.includes("goToStage('materials')"), '状态带的「去扫描」跳到第 1 步')
ok(
  view.includes("{batchMode ? t('本稿 ') : ''}"),
  '多稿档的「N 项待处理」标明归属（不与批次计数混成一套数）',
)
ok(
  view.includes("{batchMode ? t('本稿已对齐') : t('已对齐')}"),
  '多稿档的「已对齐」标明归属',
)

console.log('[C] ⑥ 主按钮带范围：只有多稿档带份数')
ok(
  exec.includes("t('开始执行（本批 {totalEntries} 份 · 逐份）'") && exec.includes('totalEntries'),
  '多稿主按钮带「本批 N 份」',
)
ok(
  exec.includes("t('执行中…（第 {value0}/{totalEntries} 个）'") &&
    exec.includes('currentIdx + 1'),
  '多稿执行中带「第 N/M 个」',
)
ok(exec.includes('copy.execStartN') && exec.includes('copy.execStartSingle'), '单稿按钮文案仍是原 copy（未被改成份数）')
ok(
  /confirmLabel: t\('确认并开始'\),\s*run: runExecution/.test(exec),
  '单稿确认按钮不带份数，且 run 就是 runExecution',
)

console.log('[D] D1 执行前确认：两个入口都先过确认，且防 TOCTOU')
ok(dialog.includes('data-testid="execution-scope-dialog"'), '确认框组件存在')
ok(dialog.includes('取消，先不开始'), '确认框有「取消，先不开始」出口')
ok(dialog.includes('开始之后不能撤销'), '确认框如实写「开始之后不能撤销」')
ok(dialog.includes('没有 PSD 备份'), '确认框如实写没有 PSD 备份（不承诺还原）')
ok(dialog.includes('stale') && dialog.includes('范围在确认框打开期间变了'), '确认框有「范围已变」拦截')
ok(exec.includes("kind: 'batch'") && exec.includes("kind: 'single'"), '两个入口（多稿 / 单稿）都走确认')
ok(!exec.includes('onClick={() => onExperimentStart?.()}'), '多稿按钮不再直接派发')
ok(!exec.includes('onClick={runExecution}'), '单稿按钮不再直接派发')
ok(exec.includes('const singleScopeSignature ='), '单稿范围指纹在渲染期重算')
ok(exec.includes('const batchScopeSignature ='), '多稿范围指纹在渲染期重算')
ok(exec.includes("stale={scopeConfirm ? scopeConfirm.signature !== batchScopeSignature : false}"), '多稿确认框按实时指纹判过期')
ok(exec.includes("stale={scopeConfirm ? scopeConfirm.signature !== singleScopeSignature : false}"), '单稿确认框按实时指纹判过期')
ok(exec.includes('const confirmScope = () =>'), '确认与执行之间只有一个收口函数')
ok(!exec.includes('scopeConfirm.signature !== singleScopeSignature : false} onConfirm={confirmScope}'), '不变量：确认后立刻关闭确认框')

console.log('[D2] Round 2 修正：不承诺没做的能力、补 spec 四项、防残留')
ok(!dialog.includes('中途只能「停止」'), '不承诺不存在的「停止」按钮（C1 未实现）')
ok(dialog.includes('还没有「停止」按钮'), '如实写「这一版还没有停止按钮」')
ok((exec.match(/label: t\('保存位置'\)/g) ?? []).length >= 2, '两个确认框都给「保存位置」（spec 四项之一）')
ok((exec.match(/label: t\('文件名'\)/g) ?? []).length >= 2, '两个确认框都给「文件名」')
ok(exec.includes("label: t('失败处理')"), '多稿确认框写明某稿失败会暂停')
ok(/useEffect\(\(\) => \{\s*setScopeConfirm\(null\)\s*\}, \[batchMode\]\)/.test(exec), '切档时清掉未确认的弹层')
ok(/allLanguages\.join\(['"],['"]\)/.test(exec), '单稿指纹含语言名单而非只有个数')
ok(exec.includes('按受理时报价并冻结（此处无预估）'), '预估为 0 时不撒谎显示「0 积分」')

console.log('[E] 不做项：没有「撤销已写入」，也没有半成品的停止')
ok(!exec.includes('停止这一批'), '没有半成品「停止这一批」（C1 未实现，不得先露按钮）')
ok(!dialog.includes('撤销已写入'), '确认框没有「撤销已写入」这种做不到的承诺')
ok(!exec.includes('cancelBatch'), '没有偷偷加批次级取消调用（C2 需服务端 + 门禁）')
const cancelRoute = fs.readFileSync('src/app/api/billing/photoshop/cancel/route.ts', 'utf8')
ok(cancelRoute.includes('reserved'), '服务端取消语义仍是「只有 reserved 可原子释放」')
ok(!fs.existsSync('src/app/api/billing/photoshop/batch-cancel'), '没有批次级 cancel 路由（与文档一致）')

console.log('[F] 测试入口已登记')
ok(pkg.scripts['test:workbench-scope'] === 'node scripts/smoke-workbench-scope.mjs', 'package.json 有 test:workbench-scope')

console.log(`\nworkbench scope contract: ok (${passed} assertions)`)
