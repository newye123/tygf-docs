// 代操作探针 v10（一次性，测完即删）——Owner 授权「你帮我操作然后做测试」
// 与 probe8 的差别：① 真实表单登录（不注入 cookie）；② 点顶栏「批量工作台」入口进 #batch；
// ③ 关键步骤截图到 tmp-shots/。P1–P4 场景逻辑与 probe8 一致。
import { chromium } from 'playwright-core'
import { writeFileSync, mkdirSync } from 'node:fs'

const EXE = 'C:/Users/ivan/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe'
const BASE = 'http://localhost:3440'
const CSV = 'F:/工具开发/图译工坊内测版/worktrees/batch-workbench/tmp-probe10.csv'
const SHOTS = 'F:/工具开发/图译工坊内测版/worktrees/batch-workbench/tmp-shots'
mkdirSync(SHOTS, { recursive: true })

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
const shot = async (page, name) => {
  try { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }) } catch {}
}

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const apiLog = []
page.on('response', (r) => {
  const u = r.url()
  if (u.includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${u.replace(BASE, '')}`)
})

// ═════════ 第 0 步：真实表单登录 ═════════
try {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.locator('#email').waitFor({ timeout: 60000 })
  await page.waitForTimeout(2000)
  // hydration 重试循环：每次重填（hydration 会用空 state 重刷 DOM），点登录，等接口响应
  let loginResp = null
  for (let i = 0; i < 5 && !loginResp; i++) {
    await page.locator('#email').fill('demo@tuyigf.local')
    await page.locator('#password').fill('tygf123456')
    if (i === 1) await shot(page, 'shot-1-login-filled')
    const respP = page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 6000 }).catch(() => null)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    loginResp = await respP
  }
  if (!loginResp) throw new Error('点击 5 次仍未发出登录请求（hydration 未完成？）')
  const respBody = await loginResp.text().catch(() => '')
  rec('P0', '登录接口响应', loginResp.ok(), `status=${loginResp.status()}；body=${respBody.slice(0, 150)}`)
  if (!loginResp.ok()) throw new Error(`登录接口失败: ${loginResp.status()} ${respBody.slice(0, 150)}`)
  await page.waitForURL((u) => !String(u).includes('/auth/login'), { timeout: 60000 })
  rec('P0', '表单登录成功（跳离登录页）', true, `落地 URL：${page.url()}`)
  await page.waitForTimeout(2000)
  await shot(page, 'shot-2-home-after-login')
} catch (e) {
  rec('P0', '登录异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 600))
}

// ═════════ 进批量工作台（SiteHeader 只在非首页渲染 ⇒ 直达 #batch 后点顶栏按钮 + 邀请码激活门） ═════════
try {
  await page.goto(`${BASE}/#batch`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }) // 同文档 hash 跳转不重挂载 ⇒ 强制整页加载
  // 等两种可能之一出现：激活门（#invite-code）或批量卡片（dev 编译慢，不能定时赌）
  await page.waitForFunction(
    () => !!document.querySelector('#invite-code') || document.body.innerText.includes('多设计稿选择（批量模式）'),
    null,
    { timeout: 180000 },
  ).catch(async (e) => {
    const body = await page.locator('body').innerText().catch(() => '(取不到)')
    console.log(`[dump] URL=${page.url()}`)
    console.log(`[dump] body 前 800 字：${body.slice(0, 800).replace(/\n/g, ' | ')}`)
    throw e
  })
  // 激活门：真实内测用户路径——输入邀请码激活（点击加重试，防 hydration 未完成）
  const gateVisible = await page.locator('#invite-code').isVisible().catch(() => false)
  if (gateVisible) {
    rec('P0', '激活门出现（未激活账号被如实拦截）', true, '工作台显示邀请码激活页')
    let actResp = null
    for (let i = 0; i < 4 && !actResp; i++) {
      await page.locator('#invite-code').fill('TYGF-A7K3-P9WD')
      if (i === 0) await shot(page, 'shot-2b-activation-gate')
      const actP = page.waitForResponse((r) => r.url().includes('/api/invite/activate'), { timeout: 6000 }).catch(() => null)
      await page.getByRole('button', { name: '激活并进入工作台' }).click()
      actResp = await actP
    }
    rec('P0', '邀请码激活接口', !!actResp && actResp.ok(), actResp ? `status=${actResp.status()}` : '未发出')
    await page.waitForTimeout(3000)
  }
  await page.locator('xpath=//p[text()="多设计稿选择（批量模式）"]').waitFor({ timeout: 120000 })
  // 激活后顶栏（SiteHeader 仅非首页渲染）应有「批量工作台」按钮（开关生效的可视证据）
  const navBtn = page.getByRole('button', { name: '批量工作台' })
  const navCount = await navBtn.count()
  rec('P0', '顶栏出现「批量工作台」入口（开关生效）', navCount > 0, `顶栏按钮数=${navCount}`)
  await shot(page, 'shot-3-batch-entry')
} catch (e) {
  rec('P0', '进入批量工作台异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 600))
}

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
  const mix = [paths.a, paths.b, paths.review, paths.fail, paths.a, 'F:\\tygf-probe\\readme.txt', 'F:\\tygf-probe\\pic.jpg', ''].join('\n')
  await page.locator('textarea[aria-label="粘贴多个 PSD 路径（每行一个）"]').fill(mix)
  await card().getByRole('button', { name: '加入列表' }).click()
  const fb = await card().locator('p[role="status"], p[role="alert"]').last().innerText()
  const want = '已加入 4 个；1 个已在列表里（已忽略）；2 行不是 .psd / .psb 后缀（已忽略）。'
  rec('P1', '四类反馈文案', fb.trim() === want, `实际：「${fb.trim()}」`)
  await shot(page, 'shot-3-batch-paste-feedback')

  const header = (await card().innerText()).split('\n').find((l) => l.includes('已添加')) ?? ''
  const m = header.match(/已添加\s+(\d+)\/(\d+)\s+个 PSD\s+·\s+已扫描\s+(\d+)\s+·\s+扫描中\s+(\d+)/)
  rec('P1', '列表计数 4/12', !!m && +m[1] === 4 && +m[2] === 12, `实际：「${header}」`)

  await page.locator('textarea[aria-label="粘贴多个 PSD 路径（每行一个）"]').fill('readme.txt\npic.jpg')
  await card().getByRole('button', { name: '加入列表' }).click()
  const fb2 = await card().locator('p[role="alert"]').last().innerText()
  rec('P1', '全无效时明示', fb2.includes('没有加入任何路径'), `实际：「${fb2.trim()}」`)
} catch (e) {
  rec('P1', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 900))
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
  await shot(page, 'shot-4-batch-scanned')
} catch (e) {
  rec('P2', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 900))
}

// ═════════ P3：执行面板门控（全新页面，4 条可扫路径） ═════════
try {
  const p3 = await context.newPage()
  p3.on('response', (r) => { if (r.url().includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
  await p3.goto(`${BASE}/#batch`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await p3.locator('xpath=//p[text()="多设计稿选择（批量模式）"]').waitFor({ timeout: 120000 })
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

  writeFileSync(CSV, '\ufeffsource,EN\r\nHello,你好\r\n', 'utf8')
  await p3.locator('input[type=file]').first().setInputFiles(CSV)
  await p3.waitForTimeout(4000)
  const confirmBtn = p3.getByRole('button', { name: '确认当前语言并继续' })
  if ((await confirmBtn.count()) > 0 && (await confirmBtn.first().isEnabled())) {
    await confirmBtn.first().click()
  }
  await p3.waitForFunction(() => document.body.innerText.includes('多设计稿执行（批量模式）'), { timeout: 120000 })
  rec('P3', '镜像修复后交付阶段可达（面板出现）', true, '多设计稿执行（批量模式）可见')

  const execBtn = p3.getByRole('button', { name: '开始执行（逐 PSD 编排）' })
  const disabled = await execBtn.isDisabled()
  const panelText = await p3.locator('body').innerText()
  const namesUnscanned = panelText.includes('c.psd') && /没有扫描完成，暂不能开始/.test(panelText)
  rec('P3', '门控禁用+点名未扫稿', disabled && namesUnscanned, `disabled=${disabled}；点名=${namesUnscanned}`)
  await shot(p3, 'shot-5-delivery-gate-partial')

  const rail = p3.locator('nav[aria-label="任务阶段"]').last()
  await rail.getByRole('button', { name: /准备素材/ }).click()
  await p3.waitForTimeout(1000)
  await row3('c.psd').locator('button').click()
  await waitRow3('c.psd', /已扫描/)
  await rail.getByRole('button', { name: /生成交付/ }).click()
  await p3.waitForFunction(() => /4\/4 个设计稿已扫描/.test(document.body.innerText), null, { timeout: 60000 })
  const enabled = await execBtn.isEnabled()
  rec('P3', '全扫后（4/4）但执行关闭 ⇒ 入口禁用', !enabled, `enabled=${enabled}（关闭应禁用，不静默放行）`)

  const expDisabled = await execBtn.isDisabled()
  const expTitle = (await execBtn.getAttribute('title').catch(() => '')) || ''
  rec('P3', '执行关闭时实验入口禁用（与主线一致）', expDisabled && /暂未开放/.test(expTitle), `disabled=${expDisabled}；title="${expTitle}"`)

  const mainBtn = p3.getByRole('button', { name: /开始替换|开始执行/ })
  const mainDisabled = await mainBtn.first().isDisabled().catch(() => null)
  rec('P3', '执行关闭时主线按钮禁用', mainDisabled === true, `mainDisabled=${mainDisabled}`)
  await shot(p3, 'shot-6-delivery-gate-closed')

  const srv = await p3.evaluate(async () => {
    try {
      const r = await fetch('/api/workbench/execution-batches/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousInstallId: 'demo-view-0001', quoteRequestId: 'q', projectId: 'p', runId: 'r', projectLabelSnapshot: 'x', documentFingerprint: 'd'.repeat(64), translationSetDigest: 't'.repeat(64), scopeDecisionDigest: 's'.repeat(64), bindingPlanDigest: 'b'.repeat(64), languageSetDigest: 'l'.repeat(64), languageCodes: ['EN'], rows: [] }),
      })
      const t = await r.text()
      return { status: r.status, body: t.slice(0, 220) }
    } catch (e) { return { status: -1, body: String(e) } }
  })
  const serverGate = srv.status === 503 && /EXECUTION_DISABLED/.test(srv.body)
  rec('P3', '服务端兜底 503 EXECUTION_DISABLED', serverGate, `status=${srv.status}；body=${srv.body}`)

  const stillDelivery = (await p3.locator('body').innerText()).includes('多设计稿执行（批量模式）')
  rec('P3', '无静默回退（仍停留交付阶段）', stillDelivery, `stillDelivery=${stillDelivery}`)
  await p3.close()
} catch (e) {
  rec('P3', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 900))
}

// ═════════ P4：单文件模式回归 ═════════
try {
  const p4 = await context.newPage()
  p4.on('response', (r) => { if (r.url().includes('/api/local-assistant/')) apiLog.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
  await p4.goto(`${BASE}/#workbench`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await p4.locator('xpath=//p[text()="选择要处理的 PSD 文件"]').waitFor({ timeout: 120000 })
  const p4body = await p4.locator('body').innerText()
  rec('P4', '单文件卡片渲染', true, '选择要处理的 PSD 文件 可见')
  rec('P4', '无批量 UI', !p4body.includes('多设计稿选择（批量模式）') && !p4body.includes('加入列表'), '批量区不存在')

  await p4.locator('input[placeholder="文件路径（选择或粘贴后自动扫描）"]').fill(paths.a)
  await p4.getByRole('button', { name: '扫描', exact: true }).first().click()
  await p4.waitForFunction(() => document.body.innerText.includes('个文字图层'), { timeout: 90000 })
  const t = await p4.locator('body').innerText()
  rec('P4', '单文件扫描链（桩）→ 5 个文字图层', /5\s*个文字图层/.test(t), '已到达 prepared 摘要（完整契约不再崩溃）')
  await shot(p4, 'shot-7-single-workbench')
  await p4.close()
} catch (e) {
  rec('P4', '执行异常', false, (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join(' \n ') : String(e)).slice(0, 900))
}

console.log('\n===== 汇总 =====')
console.log(JSON.stringify(results.map((r) => ({ s: r.scenario, n: r.name, p: r.pass }))))
console.log('===== API 调用 =====')
console.log(JSON.stringify(apiLog, null, 1))
await browser.close()
