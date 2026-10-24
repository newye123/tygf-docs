// 第七轮验证探针 v8（一次性，测完即删）——镜像修复后的全链路复验
// P1 粘贴四类反馈 / P2 串行扫描+needs_review+错误 / P3 执行面板门控（disabled→enabled→点击诚实失败）/ P4 单文件回归
import { chromium } from 'playwright-core'
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'

const EXE = 'C:/Users/ivan/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe'
const COOKIE = 'eyJ0IjoiWDVldlU2QTA5RGtyWTZhWTFObmh2VUhUVjZ2RnZIRE9YUnAtVVZKSTRITSIsImV4cCI6MTc5NDc1OTY5NzE0OX0.gpSGGH3lDazQxVv6ZTrqoXOHKcaYf7tXyT8kfvPb1qA'
const BASE = 'http://localhost:3440'
const CSV = 'F:/工具开发/图译工坊内测版/worktrees/batch-workbench/tmp-probe7.csv'
const STUB_LOG = 'F:/工具开发/图译工坊内测版/worktrees/batch-workbench/tmp-stub-requests.log'

const paths = {
  a: 'F:\\tygf-probe\\a.psd',
  b: 'F:\\tygf-probe\\b.psb',
  review: 'F:\\tygf-probe\\design-review.psd',
  fail: 'F:\\tygf-probe\\design-fail.psd',
  c: 'F:\\tygf-probe\\c.psd',
}

const results = []
const rec = (scenario, name, ok, detail) => {
  results.push({ scenario, name, pass: ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} [${scenario}] ${name} — ${detail}`)
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addCookies([{ name: 'tygf_user_session', value: COOKIE, domain: 'localhost', path: '/' }])
const page = await context.newPage()

const apiLog = []
page.on('response', (r) => {
  const u = r.url()
  if (u.includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${u.replace(BASE, '')}`)
})

const card = () => page.locator('xpath=//p[text()="多设计稿选择（批量模式）"]/ancestor::div[contains(@class,"rounded-xl")][1]')
const entryRow = (name) => card().locator('div.rounded-lg', { has: page.locator(`span.font-mono:text-is("${name}")`) })
const waitRow = (name, re, timeout = 90000) =>
  page.waitForFunction(
    ([n, pattern]) => {
      const rows = [...document.querySelectorAll('div.rounded-lg')].filter((d) => {
        const s = d.querySelector('span.font-mono')
        return s && s.textContent === n
      })
      return rows.some((r) => new RegExp(pattern).test(r.innerText))
    },
    [name, re.source],
    { timeout },
  )

// ═════════ P1：粘贴四类如实反馈 ═════════
try {
  await page.goto(`${BASE}/#batch`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.locator('xpath=//p[text()="多设计稿选择（批量模式）"]').waitFor({ timeout: 90000 })
  rec('P1', '批量卡片渲染', true, '多设计稿选择（批量模式）可见')

  const mix = [paths.a, paths.b, paths.review, paths.fail, paths.a, 'F:\\tygf-probe\\readme.txt', 'F:\\tygf-probe\\pic.jpg', ''].join('\n')
  await page.locator('textarea[aria-label="粘贴多个 PSD 路径（每行一个）"]').fill(mix)
  await card().getByRole('button', { name: '加入列表' }).click()
  const fb = await card().locator('p[role="status"], p[role="alert"]').last().innerText()
  const want = '已加入 4 个；1 个已在列表里（已忽略）；2 行不是 .psd / .psb 后缀（已忽略）。'
  rec('P1', '四类反馈文案', fb.trim() === want, `实际：「${fb.trim()}」`)

  const header = (await card().innerText()).split('\n').find((l) => l.includes('已添加')) ?? ''
  const m = header.match(/已添加\s+(\d+)\/(\d+)\s+个 PSD\s+·\s+已扫描\s+(\d+)\s+·\s+扫描中\s+(\d+)/)
  rec('P1', '列表计数 4/12', !!m && +m[1] === 4 && +m[2] === 12, `实际：「${header}」`)

  await page.locator('textarea[aria-label="粘贴多个 PSD 路径（每行一个）"]').fill('readme.txt\npic.jpg')
  await card().getByRole('button', { name: '加入列表' }).click()
  const fb2 = await card().locator('p[role="alert"]').last().innerText()
  rec('P1', '全无效时明示', fb2.includes('没有加入任何路径'), `实际：「${fb2.trim()}」`)
} catch (e) {
  rec('P1', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0,6).join(' \n ') : String(e)).slice(0, 900))
}

// ═════════ P2：多稿串行扫描 + needs_review + 错误路径 ═════════
try {
  await entryRow('a.psd').locator('button').click()
  const bDisabled = await entryRow('b.psb').locator('button').isDisabled()
  rec('P2', '串行互斥（扫描中其他按钮禁用）', bDisabled, `b.psb 按钮 disabled=${bDisabled}`)
  await waitRow('a.psd', /已扫描/)
  const rowA = await entryRow('a.psd').innerText()
  rec('P2', 'a.psd → 已扫描(5层)', /已扫描/.test(rowA) && !/有检查项/.test(rowA) && /5\s*层/.test(rowA), `实际：「${rowA.replace(/\n/g, ' ')}」`)

  await entryRow('b.psb').locator('button').click()
  await waitRow('b.psb', /已扫描/)
  const rowB = await entryRow('b.psb').innerText()
  rec('P2', 'b.psb → 已扫描', /已扫描/.test(rowB) && !/有检查项/.test(rowB), `实际：「${rowB.replace(/\n/g, ' ')}」`)

  await entryRow('design-review.psd').locator('button').click()
  await waitRow('design-review.psd', /已扫描（有检查项）/)
  const rowR = await entryRow('design-review.psd').innerText()
  rec('P2', 'design-review.psd → 已扫描（有检查项）3层', /已扫描（有检查项）/.test(rowR) && /3\s*层/.test(rowR), `实际：「${rowR.replace(/\n/g, ' ')}」`)

  await entryRow('design-fail.psd').locator('button').click()
  await waitRow('design-fail.psd', /扫描失败/)
  const errText = await card().locator('p.text-rose-600').first().innerText().catch(() => '')
  const header = (await card().innerText()).split('\n').find((l) => l.includes('已添加')) ?? ''
  const m = header.match(/已扫描\s+(\d+)\s+·\s+扫描中\s+(\d+)/)
  rec('P2', 'design-fail.psd → 扫描失败+如实报错', !!m && +m[1] === 3 && +m[2] === 0 && errText.length > 0, `头部：${header}；错误：「${errText.trim()}」`)
} catch (e) {
  rec('P2', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0,6).join(' \n ') : String(e)).slice(0, 900))
}

// ═════════ P3：执行面板门控（镜像修复后全链路） ═════════
try {
  // 新页面重来：4 条全可扫路径，先只扫 3 条，留 c.psd 未扫
  const p3 = await context.newPage()
  const p3Gate = []
  const p3Console = []
  const p3Errors = []
  p3.on('console', (m) => { p3Console.push(`[${m.type()}] ${m.text()}`) })
  p3.on('pageerror', (e) => { p3Errors.push(String(e && e.stack ? e.stack : e)) })
  p3.on('response', (r) => { if (r.url().includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
  p3.on('response', async (r) => {
    if (r.url().includes('/api/workbench/execution-batches')) {
      const snip = await r.text().catch(() => '')
      p3Gate.push(`${r.status()} ${r.url().replace(BASE, '')} :: ${snip.slice(0, 200)}`)
    }
  })
  await p3.goto(`${BASE}/#batch`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await p3.locator('xpath=//p[text()="多设计稿选择（批量模式）"]').waitFor({ timeout: 90000 })
  const card3 = () => p3.locator('xpath=//p[text()="多设计稿选择（批量模式）"]/ancestor::div[contains(@class,"rounded-xl")][1]')
  const row3 = (name) => card3().locator('div.rounded-lg', { has: p3.locator(`span.font-mono:text-is("${name}")`) })
  const waitRow3 = (name, re, timeout = 90000) =>
    p3.waitForFunction(
      ([n, pattern]) => {
        const rows = [...document.querySelectorAll('div.rounded-lg')].filter((d) => {
          const s = d.querySelector('span.font-mono')
          return s && s.textContent === n
        })
        return rows.some((r) => new RegExp(pattern).test(r.innerText))
      },
      [name, re.source],
      { timeout },
    )
  await p3.locator('textarea[aria-label="粘贴多个 PSD 路径（每行一个）"]').fill([paths.a, paths.b, paths.review, paths.c].join('\n'))
  await card3().getByRole('button', { name: '加入列表' }).click()
  for (const [name, re] of [['a.psd', /已扫描/], ['b.psb', /已扫描/], ['design-review.psd', /已扫描（有检查项）/]]) {
    await row3(name).locator('button').click()
    await waitRow3(name, re)
  }
  rec('P3', '前三稿扫描完成（c.psd 留未扫）', true, 'a/b/review 已扫描')

  // 导入译文表
  writeFileSync(CSV, '\ufeffsource,EN\r\nHello,你好\r\n', 'utf8')
  await p3.locator('input[type=file]').first().setInputFiles(CSV)
  await p3.waitForTimeout(4000)
  // 语言确认（可能已自动确认；未确认则点按钮）
  const confirmBtn = p3.getByRole('button', { name: '确认当前语言并继续' })
  if (await confirmBtn.count() > 0 && await confirmBtn.first().isEnabled()) {
    await confirmBtn.first().click()
  }
  // 等交付阶段开放并自动推进
  await p3.waitForFunction(() => document.body.innerText.includes('多设计稿执行（批量模式）'), { timeout: 120000 })
  rec('P3', '镜像修复后交付阶段可达（面板出现）', true, '多设计稿执行（批量模式）可见')

  // 门控：c.psd 未扫 ⇒ 禁用 + 琥珀块点名
  const execBtn = p3.getByRole('button', { name: '开始执行（逐 PSD 编排）' })
  const disabled = await execBtn.isDisabled()
  const panelText = await p3.locator('body').innerText()
  const namesUnscanned = panelText.includes('c.psd') && /没有扫描完成，暂不能开始/.test(panelText)
  rec('P3', '门控禁用+点名未扫稿', disabled && namesUnscanned, `disabled=${disabled}；点名=${namesUnscanned}`)

  // 扫 c.psd ⇒ 全扫 ⇒ 放行（按真实用户路径：回素材步扫描，再回交付步）
  const rail = p3.locator('nav[aria-label="任务阶段"]').last()
  await rail.getByRole('button', { name: /准备素材/ }).click()
  await p3.waitForTimeout(1000)
  await row3('c.psd').locator('button').click()
  await waitRow3('c.psd', /已扫描/)
  await rail.getByRole('button', { name: /生成交付/ }).click()
  await p3.waitForFunction(() => /4\/4 个设计稿已扫描/.test(document.body.innerText), null, { timeout: 60000 })
  const enabled = await execBtn.isEnabled()
  rec('P3', '全扫后（4/4）但闸门关闭 ⇒ 入口禁用', !enabled, `enabled=${enabled}（闸门关闭应禁用，不静默放行）`)

  // 修复后：执行闸门在客户端禁用入口（与「开始替换」主按钮一致），服务端 503 作兜底。
  // 1) 实验入口在闸门关闭时应禁用 + 文案说明
  const expDisabled = await execBtn.isDisabled()
  const expTitle = (await execBtn.getAttribute('title').catch(() => '')) || ''
  rec('P3', '闸门关闭时实验入口禁用（与主线一致）', expDisabled && /暂未开放/.test(expTitle), `disabled=${expDisabled}；title="${expTitle}"`)

  // 2) 主线「开始替换」按钮同样禁用（一致性）
  const mainBtn = p3.getByRole('button', { name: /开始替换|开始执行/ })
  const mainDisabled = await mainBtn.first().isDisabled().catch(() => null)
  rec('P3', '闸门关闭时主线按钮禁用', mainDisabled === true, `mainDisabled=${mainDisabled}`)

  // 3) 服务端兜底闸门：直接打 quote 接口，必须 503 EXECUTION_DISABLED（验证 fail-closed 后端）
  const srv = await p3.evaluate(async () => {
    try {
      const r = await fetch('/api/workbench/execution-batches/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousInstallId: 'stub-install-0001', quoteRequestId: 'q', projectId: 'p', runId: 'r', projectLabelSnapshot: 'x', documentFingerprint: 'd'.repeat(64), translationSetDigest: 't'.repeat(64), scopeDecisionDigest: 's'.repeat(64), languageSetDigest: 'l'.repeat(64), bindingPlanDigest: 'b'.repeat(64), languageCodes: ['EN'], rows: [] }),
      })
      const t = await r.text()
      return { status: r.status, body: t.slice(0, 220) }
    } catch (e) { return { status: -1, body: String(e) } }
  })
  const serverGate = srv.status === 503 && /EXECUTION_DISABLED/.test(srv.body)
  rec('P3', '服务端兜底闸门 503 EXECUTION_DISABLED', serverGate, `status=${srv.status}；body=${srv.body}`)

  // 4) 无静默回退：页面仍停在交付阶段（面板可见），未回退到翻译校对
  const stillDelivery = (await p3.locator('body').innerText()).includes('多设计稿执行（批量模式）')
  rec('P3', '无静默回退（仍停留交付阶段）', stillDelivery, `stillDelivery=${stillDelivery}`)
  await p3.close()
} catch (e) {
  rec('P3', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0,6).join(' \n ') : String(e)).slice(0, 900))
}

// ═════════ P4：单文件模式回归 ═════════
try {
  const p4 = await context.newPage()
  p4.on('response', (r) => { if (r.url().includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
  await p4.goto(`${BASE}/#workbench`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await p4.locator('xpath=//p[text()="选择要处理的 PSD 文件"]').waitFor({ timeout: 90000 })
  const p4body = await p4.locator('body').innerText()
  rec('P4', '单文件卡片渲染', true, '选择要处理的 PSD 文件 可见')
  rec('P4', '无批量 UI', !p4body.includes('多设计稿选择（批量模式）') && !p4body.includes('加入列表'), '批量区不存在')

  await p4.locator('input[placeholder="文件路径（选择或粘贴后自动扫描）"]').fill(paths.a)
  await p4.getByRole('button', { name: '扫描', exact: true }).first().click()
  await p4.waitForFunction(() => document.body.innerText.includes('个文字图层'), { timeout: 90000 })
  const t = await p4.locator('body').innerText()
  rec('P4', '单文件扫描链（桩）→ 5 个文字图层', /5\s*个文字图层/.test(t), '已到达 prepared 摘要（完整契约不再崩溃）')
  await p4.close()
} catch (e) {
  rec('P4', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0,6).join(' \n ') : String(e)).slice(0, 900))
}

console.log('\n===== 汇总 =====')
console.log(JSON.stringify(results.map((r) => ({ s: r.scenario, n: r.name, p: r.pass }))))
console.log('===== API 调用 =====')
console.log(JSON.stringify(apiLog, null, 1))
await browser.close()
