// 用户可见面文案守卫（2026-10-21 Owner 令，ISSUES #220）
// 运行：node scripts/smoke-user-visible-copy.mjs
//
// 纪律：用户能看到的界面只写「现象 + 一个动作（+ 可选短码）」。
// 后台实现（运营字段名、能力位、执行器、内部校验失败原因、解锁节奏）不得进正文。
//
// 边界（如实说明）：本脚本只扫下列**用户可见面**文件的非注释文本，属源码层契约；
// 不扫 admin 运营台（那里允许内部用语），也不扫助手二进制里的既有文案——
// 助手侧文案改动要走版本纪律（见 ISSUES #220 处置段）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let passed = 0
function ok(cond, label) {
  assert.ok(cond, label)
  passed += 1
}

/** 去掉 /* *\/ 块注释与整行/行尾 // 注释；保留字符串与 JSX 正文。 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/[^\r\n]*/, ''))
    .join('\n')

// ── 探针自检（阴性/阳性对照，防"探针失灵报 0"）─────────────────────────────
const sample = "const a = '这里提到能力位'\n// 注释里提能力位不算\n/* 块注释 执行器 */\nconst b = '正常文案'"
const probeVisible = stripComments(sample)
ok(probeVisible.includes('能力位'), '阳性对照：代码里的禁词会被保留（不做字符串级豁免）')
ok(probeVisible.includes('正常文案'), '对照：正常文案不被误删')
ok(!probeVisible.includes('注释里提能力位'), '阴性对照：行注释被剥掉')
ok(!probeVisible.includes('块注释 执行器'), '阴性对照：块注释被剥掉')

// ── 禁写词族（用户可见面）───────────────────────────────────────────────────
const BANNED = [
  '运营备注',
  '能力位',
  '执行器',
  '写回未开放',
  '升级解锁',
  '授权回读',
  '回读未通过',
  '组件同步',
  '灰度白名单',
  '代际',
  // 积分明细实例（2026-10-22 Owner 截图质询）：审计分级文案不得渲染进用户面。
  '旧口径',
  '本机报告',
  '都在账上',
  '行级覆盖',
  '对象级',
  '助手证据',
]

const FILES = [
  'src/components/site/home-account-menu.tsx',
  'src/components/site/site-header.tsx',
  'src/components/workbench/typography-panel.tsx',
  'src/components/workbench/design-file-card.tsx',
  'src/components/workbench/assistant-setup-banner.tsx',
  'src/components/workbench/execute-step.tsx',
  'src/components/workbench/execution-scope-dialog.tsx',
  'src/components/workbench/workbench-view.tsx',
  'src/lib/workbench/batch-execution-client.ts',
  'src/lib/workbench/error-messages.ts',
  'src/components/workbench/credits-badge.tsx',
]

for (const file of FILES) {
  const src = stripComments(readFileSync(file, 'utf8'))
  const hits = BANNED.filter((word) => src.includes(word))
  ok(hits.length === 0, `${file} 正文不含后台术语（命中：${hits.join('、') || '无'}）`)
}

// ── 三处已证实例的定点回归 ──────────────────────────────────────────────────
const accountMenu = readFileSync('src/components/site/home-account-menu.tsx', 'utf8')
ok(!accountMenu.includes('acct-foot'), '账号菜单不再渲染页脚说明（#220 实例一）')

// 积分明细（2026-10-22 实例四）：审计分级只留在接口载荷，不进渲染面。
const badge = readFileSync('src/components/workbench/credits-badge.tsx', 'utf8')
ok(!badge.includes('jobSummary.evidenceNote'), '积分明细不再渲染 evidenceNote（#220 实例四）')
ok(badge.includes('evidenceNote 只留在接口载荷里供对账审计'), '积分明细保留不渲染的证据注释行')

const panel = stripComments(readFileSync('src/components/workbench/typography-panel.tsx', 'utf8'))
ok(!panel.includes('以下定制'), '排版面板撤下「以下定制不会写进设计稿」整段解释（#220 实例二）')
ok(panel.includes('排版定制暂不可用'), '排版面板只用一句话说明不可用')

const card = readFileSync('src/components/workbench/design-file-card.tsx', 'utf8')
ok(card.includes('resolvePairBoundMessage'), '扫描失败走配对类用户语言映射（#220 实例三）')
ok(
  (card.match(/resolvePairBoundMessage\(/g) || []).length >= 2,
  '单稿与多稿两条扫描失败路径都接上映射（实得 ' + (card.match(/resolvePairBoundMessage\(/g) || []).length + ' 处 ≥ 2）',
)

const errorTable = readFileSync('src/lib/workbench/error-messages.ts', 'utf8')
for (const code of [
  'PAIR_BOUND_LOCAL_AUTH_PERSISTENCE_FAILED',
  'PAIR_BOUND_LOCAL_AUTH_INVALID',
  'PAIR_BOUND_COMPONENT_SYNC_FAILED',
]) {
  ok(errorTable.includes(code), `文案表登记 ${code}（用户语言）`)
}
ok(
  errorTable.includes('export function resolvePairBoundMessage'),
  '文案表导出 resolvePairBoundMessage（调用方唯一入口）',
)

// ── 排版入口能力位门（与 smoke-typography-customization 互补，两条各钉一头）──
// 2026-10-22 Owner 令（图六）改口径：入口**不再因能力位缺失而消失**，
// 改为常驻 + 置灰 + 一句话原因（「功能可以不可用，但不能装作不存在」）。
// 旧断言「typographyEntryVisible === 能力位」已作废，替换为下面的新合同。
const workbench = readFileSync('src/components/workbench/workbench-view.tsx', 'utf8')
ok(
  workbench.includes('const typographyEnabled = featureAccess.typographyCustomization'),
  '排版入口只由灰度开关决定在不在（能力位不再决定有无入口）',
)
ok(
  !workbench.includes('typographyEntryVisible'),
  '旧「能力位未开即隐去入口」的变量必须退役（防两套口径并存）',
)
ok(
  (workbench.match(/\{typographyEnabled && \(/g) || []).length === 3,
  '三处常驻入口（顶栏/卡头/面板挂载）都只由灰度开关门（能力位只管能不能写回）',
)
ok(
  workbench.includes('{typographyEnabled && !typographyDrawerOpen && ('),
  '悬浮球同样只由灰度开关门，不再叠能力位（否则又回到"消失"）',
)
ok(
  workbench.includes('describeTypographyEntry') && workbench.includes('typographyBlockedReason'),
  '入口把能力位探测结果翻成一句话原因（单源在 typography-entry.ts）',
)

// ── 学习同意面守卫（2026-10-22 Owner 裁定：先不给用户自助撤回，界面与注释都不出现相关提示）──
// 钉三件事：① 用户侧没有自助撤回/关闭入口（consent 路由只有 GET）；② 用户可见界面不出现"可关闭学习/撤回学习"式提示；
// ③ 源码注释不再出现"用户可随时自助关闭"这类与裁定相反的说法。
// 边界（如实）：《隐私政策》"您的权利"第 ⑤ 项属法定告知（个保法第 15 条要求告知撤回权），**不是产品提示，不在禁写范围内**；
// 因此禁写词表刻意不含单独的"撤回同意"四字，只禁"自助/随时关闭"这类承诺站内开关的说法。
const SELF_SERVICE_PHRASES = [
  '可随时自助关闭',
  '用户可随时自助关闭',
  '关闭智能学习',
  '撤回学习同意',
  '自助撤回',
]

const consentRouteSrc = readFileSync('src/app/api/workbench/learning/consent/route.ts', 'utf8')
ok(!/export\s+(?:async\s+)?function\s+POST/.test(consentRouteSrc), '学习同意路由不导出 POST（用户侧无自助撤回入口）')
ok(/export\s+(?:async\s+)?function\s+GET/.test(consentRouteSrc), '学习同意路由仍提供只读查询（内部判定用）')

const surfaceFiles = [...new Set([...FILES, 'src/app/(zh)/auth/register/page.tsx', 'src/app/en/auth/register/page.tsx'])]
for (const file of surfaceFiles) {
  let body
  try {
    body = stripComments(readFileSync(file, 'utf8'))
  } catch {
    continue // 文件不存在（如英文注册页尚未建）——由上面的 FILES 扫描负责，不在这里造失败
  }
  const hits = SELF_SERVICE_PHRASES.filter((phrase) => body.includes(phrase))
  ok(hits.length === 0, `${file} 界面正文不含"自助撤回/关闭学习"式提示（命中：${hits.join('、') || '无'}）`)
}

const gateSrc = readFileSync('src/lib/learning/consent-gate.ts', 'utf8')
ok(!gateSrc.includes('可随时自助关闭'), 'consent-gate 注释不再承诺"用户可随时自助关闭"')
ok(gateSrc.includes('用户侧不提供自助开关'), 'consent-gate 注释写明真实授权来源（注册自动授予／管理端）')
const registerSrc = readFileSync('src/app/api/auth/register/route.ts', 'utf8')
ok(!registerSrc.includes('注册页已显著提示'), '注册路由注释不再声称"注册页已显著提示"（实测注册页 0 处学习提示）')

console.log(`smoke-user-visible-copy: ${passed} assertions passed`)
