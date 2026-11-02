import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITES = path.join(HERE, '..', 'sites');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || '' });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message.split('\n')[0] });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

await page.goto(pathToFileURL(path.join(SITES, '02-features-bento.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(500);

await check('route demo via hash', async () => {
  await page.evaluate(() => { location.hash = '#/demo'; });
  await page.waitForTimeout(400);
  const active = await page.$$eval('.page.active', (ps) => ps.map((p) => p.id));
  assert(active.length === 1 && active[0] === 'view-demo', 'active=' + active);
  return active[0];
});

await check('matrix run fills statuses', async () => {
  await page.click('#view-demo [data-run]');
  await page.waitForTimeout(2600);
  const done = await page.$eval('#view-demo [data-count="done"]', (el) => Number(el.textContent));
  const issues = await page.$eval('#view-demo [data-count="issues"]', (el) => Number(el.textContent));
  const pct = await page.$eval('#view-demo [data-progress-text]', (el) => el.textContent);
  assert(done + issues > 0, `done=${done} issues=${issues}`);
  assert(pct.indexOf('0%') !== 0, 'progress=' + pct);
  return `done=${done} issues=${issues} progress=${pct}`;
});

await check('matrix cell opens inspector', async () => {
  await page.click('#view-demo .cell');
  await page.waitForTimeout(200);
  const open = await page.$eval('#view-demo [data-inspector]', (el) => el.classList.contains('open') || el.getBoundingClientRect().height > 80);
  const obj = await page.$eval('#view-demo [data-ins="object"]', (el) => el.textContent.trim());
  assert(open, 'inspector not open');
  assert(obj && obj !== '—', 'object empty');
  return 'object=' + obj;
});

await check('matrix filter issues', async () => {
  await page.click('#view-demo [data-filter="issues"]');
  await page.waitForTimeout(200);
  const lit = await page.$$eval('#view-demo .matrix-grid .cell', (els) => els.filter((e) => !e.classList.contains('dim')).length);
  assert(lit > 0 && lit < 20, 'lit cells=' + lit);
  await page.click('#view-demo [data-filter="all"]');
  return 'lit=' + lit;
});

await check('lab apply updates readout', async () => {
  await page.selectOption('#view-demo [data-lab-font]', { index: 1 });
  await page.$eval('#view-demo [data-lab-weight]', (el) => { el.value = '900'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#view-demo [data-lab-leading]', (el) => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('#view-demo [data-lab-tracking]', (el) => { el.value = '120'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(200);
  const lines = await page.$eval('#view-demo [data-lab-lines]', (el) => el.textContent.trim());
  const leading = await page.$eval('#view-demo [data-lab-leading-val]', (el) => el.textContent.trim());
  await page.click('#view-demo [data-lab-apply]');
  await page.waitForTimeout(200);
  const applied = await page.$eval('#view-demo [data-lab-applied]', (el) => el.classList.contains('show') || getComputedStyle(el).visibility !== 'hidden');
  assert(lines !== '—', 'lines=' + lines);
  assert(leading === '2.00' || leading === '2' , 'leading=' + leading);
  assert(applied, 'applied badge not shown');
  return `lines=${lines} leading=${leading}`;
});

await check('wrap read-back runs', async () => {
  await page.$eval('#view-demo [data-wrap-width]', (el) => { el.value = '240'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150);
  const before = await page.$eval('#view-demo [data-rb-rendered]', (el) => el.textContent.trim());
  await page.click('#view-demo [data-readback]');
  await page.waitForTimeout(1600);
  const after = await page.$eval('#view-demo [data-rb-rendered]', (el) => el.textContent.trim());
  const planned = await page.$eval('#view-demo [data-rb-planned]', (el) => el.textContent.trim());
  assert(after !== '—', 'rendered=' + after);
  assert(planned !== '—', 'planned=' + planned);
  return `planned=${planned} rendered=${after} (before ${before})`;
});

await check('quiz blocks on no and passes on yes', async () => {
  const qs = await page.$$('#view-fit [data-quiz] .quiz-q');
  assert(qs.length >= 3, 'questions=' + qs.length);
  const target = await page.$$('#view-fit [data-quiz] .quiz-q');
  for (let i = 0; i < 3; i++) {
    await target[i].$eval('input[value="yes"]', (el) => el.click());
  }
  await page.waitForTimeout(250);
  const okState = await page.$eval('#view-fit [data-quiz-result]', (el) => el.dataset.state);
  await target[0].$eval('input[value="no"]', (el) => el.click());
  await page.waitForTimeout(250);
  const badState = await page.$eval('#view-fit [data-quiz-result]', (el) => el.dataset.state);
  assert(okState !== 'wait', 'state stayed wait on all yes');
  assert(badState !== okState, 'state unchanged after no');
  return `allYes=${okState} oneNo=${badState}`;
});

await check('roi recalculates', async () => {
  await page.goto(pathToFileURL(path.join(SITES, '17-roi-lab.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const before = await page.$eval('#view-home [data-roi-big]', (el) => el.textContent.trim());
  for (const [sel, v] of [['#view-home [data-roi-drafts]', '12'], ['#view-home [data-roi-langs]', '12'], ['#view-home [data-roi-mins]', '45'], ['#view-home [data-roi-setup]', '1']]) {
    await page.$eval(sel, (el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  }
  await page.waitForTimeout(250);
  const after = await page.$eval('#view-home [data-roi-big]', (el) => el.textContent.trim());
  assert(before !== after, 'roi unchanged: ' + after);
  return `${before} -> ${after}`;
});

await check('shop language tab swaps copy', async () => {
  await page.goto(pathToFileURL(path.join(SITES, '13-ecommerce.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ja = await page.$eval('#view-home [data-shop-card] .shop-name', (el) => el.dataset.ja);
  await page.click('#view-home [data-shop-lang="ja"]');
  await page.waitForTimeout(200);
  const shown = await page.$eval('#view-home [data-shop-card] .shop-name', (el) => el.textContent.trim());
  assert(shown === ja, `shown=${shown} expected=${ja}`);
  const pressed = await page.$eval('#view-home [data-shop-lang="ja"]', (el) => el.getAttribute('aria-pressed'));
  assert(pressed === 'true', 'aria-pressed=' + pressed);
  return shown;
});

await check('apply form validates email locally', async () => {
  await page.click('.nav-links a[data-route="apply"]');
  await page.waitForTimeout(400);
  await page.fill('#view-apply [data-apply-name]', '测试用户');
  await page.fill('#view-apply [data-apply-email]', 'not-an-email');
  await page.fill('#view-apply [data-apply-wechat]', 'tuyi-test');
  await page.fill('#view-apply [data-apply-project]', '12 份 PSD，目标 6 个语种，已有确认译文。');
  await page.click('#view-apply [data-apply] button[type="submit"]');
  await page.waitForTimeout(200);
  const err = await page.$eval('#view-apply [data-apply-error]', (el) => ({ hidden: el.hasAttribute('hidden'), text: el.textContent.trim() }));
  assert(!err.hidden, 'invalid email accepted');
  await page.fill('#view-apply [data-apply-email]', 'test@example.com');
  await page.click('#view-apply [data-apply] button[type="submit"]');
  await page.waitForTimeout(300);
  const pre = await page.$eval('#view-apply [data-apply-pre]', (el) => el.textContent);
  const shown = await page.$eval('#view-apply [data-apply-summary]', (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
  assert(shown, 'summary hidden');
  assert(pre.indexOf('test@example.com') >= 0, 'summary missing email');
  return 'error text=' + err.text.slice(0, 30);
});

await check('stage player advances', async () => {
  await page.goto(pathToFileURL(path.join(SITES, '01-cinema.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const dots = await page.$$('[data-stage] .stage-dot');
  assert(dots.length > 1, 'stage dots=' + dots.length);
  const first = await page.evaluate(() => [...document.querySelectorAll('[data-stage] .stage-scene')].findIndex((el) => el.classList.contains('active')));
  await dots[1].click();
  await page.waitForTimeout(500);
  const second = await page.evaluate(() => [...document.querySelectorAll('[data-stage] .stage-scene')].findIndex((el) => el.classList.contains('active')));
  assert(first !== second, 'scene did not change (index ' + first + ')');
  return `scene ${first} -> ${second}`;
});

await check('marketplace tabs swap typographic notes', async () => {
  await page.goto(pathToFileURL(path.join(SITES, '21-amazon-pain.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const firstText = await page.$eval('#view-home [data-site-panel]:not([hidden]) dd', (el) => el.textContent.trim());
  const firstCode = await page.$eval('#view-home [data-site-panel]:not([hidden])', (el) => el.dataset.sitePanel);
  await page.click('#view-home [data-site-tab="ja"]');
  await page.waitForTimeout(200);
  const shownCode = await page.$eval('#view-home [data-site-panel]:not([hidden])', (el) => el.dataset.sitePanel);
  const shownText = await page.$eval('#view-home [data-site-panel]:not([hidden]) dd', (el) => el.textContent.trim());
  const visiblePanels = await page.$$eval('#view-home [data-site-panel]:not([hidden])', (els) => els.length);
  const pressed = await page.$eval('#view-home [data-site-tab="ja"]', (el) => el.getAttribute('aria-pressed'));
  assert(visiblePanels === 1, 'visible panels=' + visiblePanels);
  assert(shownCode === 'ja', 'panel=' + shownCode);
  assert(shownText !== firstText, 'notes unchanged');
  assert(pressed === 'true', 'aria-pressed=' + pressed);
  return `${firstCode} -> ${shownCode} (${shownText.slice(0, 12)}…)`;
});

await check('outsource split recalculates', async () => {
  await page.goto(pathToFileURL(path.join(SITES, '22-outsource.html')).href, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const before = await page.$eval('#view-home [data-scope-sum]', (el) => el.textContent.trim());
  await page.click('#view-home [data-scope-row="1"] [data-scope-set="you"]');
  await page.waitForTimeout(200);
  const after = await page.$eval('#view-home [data-scope-sum]', (el) => el.textContent.trim());
  const pressed = await page.$eval('#view-home [data-scope-row="1"] [data-scope-set="you"]', (el) => el.getAttribute('aria-pressed'));
  const cleared = await page.$eval('#view-home [data-scope-row="1"] [data-scope-set="tool"]', (el) => el.getAttribute('aria-pressed'));
  assert(before && after && before !== after, `sum unchanged: ${after}`);
  assert(pressed === 'true' && cleared === 'false', `pressed=${pressed} cleared=${cleared}`);
  return `${before} -> ${after}`;
});

await check('no console/page errors', async () => {
  assert(errors.length === 0, errors.slice(0, 3).join(' | '));
  return 'clean';
});

await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
fs.writeFileSync(path.join(HERE, 'interact.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(failed.length ? 1 : 0);
