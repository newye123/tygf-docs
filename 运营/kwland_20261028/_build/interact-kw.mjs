/* 交互与首屏标题实测：12 语种切换、三态回读、对比表转置、清单勾选与持久化。
   只跑真实浏览器，不读源码猜行为。 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = fs.readdirSync(path.join(ROOT, 'sites')).filter((f) => f.endsWith('.html')).sort();
const WIDTHS = [1440, 390];

const SAMPLES = {
  zh: '这一版改好了', zht: '這一版改好了', en: 'This version is ready', ja: 'この版は完了',
  ko: '이 버전 완료', de: 'Diese Fassung ist fertig', fr: 'Cette version est prête',
  es: 'Esta versión está lista', it: 'Questa versione è pronta', pt: 'Esta versão está pronta',
  ru: 'Эта версия готова', ar: 'هذه النسخة جاهزة'
};
const EXPECT = { ar: ['blocked', 'review', 'done'], de: ['review', 'done', 'done'], ru: ['review', 'done', 'done'], pt: ['review', 'done', 'done'] };

const hero = () => {
  const h1 = document.querySelector('.kw-hero h1, .idx-hero h1');
  if (!h1) return null;
  const lines = [...h1.querySelectorAll('.ln')];
  const box = h1.getBoundingClientRect();
  const rects = lines.map((l) => l.getBoundingClientRect());
  const tops = rects.map((r) => Math.round(r.top));
  return {
    size: parseFloat(getComputedStyle(h1).fontSize),
    lines: lines.length,
    distinctTops: new Set(tops).size,
    widest: rects.length ? Math.max(...rects.map((r) => r.width)) : 0,
    boxW: Math.round(box.width),
    overflow: rects.some((r) => r.right > box.right + 2 || r.left < box.left - 2),
    docW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = {};
const fail = [];

const MUST = { demo: [], tp: [], chk: [] };
{
  const { pages } = await import('./kwdata.mjs');
  for (const p of pages) {
    const f = p.id + '-' + p.slug + '.html';
    if (p.demo) MUST.demo.push(f);
    if (p.routes) MUST.tp.push(f);
    if (p.checks) MUST.chk.push(f);
  }
}
for (const file of SITES) {
  const url = 'file:///' + path.join(ROOT, 'sites', file).replace(/\\/g, '/');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  const rec = { errors, hero: {}, demo: null, tp: null, chk: null };

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.waitForTimeout(280);
    rec.hero['zh@' + w] = await page.evaluate(hero);
    await page.click('.lang-toggle');
    await page.waitForTimeout(320);
    rec.hero['en@' + w] = await page.evaluate(hero);
    await page.click('.lang-toggle');
    await page.waitForTimeout(320);
  }

  const hasDemo = await page.$('[data-demo]');
  if (hasDemo) {
    const got = {};
    for (const code of Object.keys(SAMPLES)) {
      await page.click(`.lg[data-code="${code}"]`);
      await page.waitForTimeout(110);
      got[code] = await page.evaluate(() => ({
        title: document.querySelector('[data-slot="title"]').textContent.trim(),
        dir: document.querySelector('.ps-body').getAttribute('dir'),
        badges: [...document.querySelectorAll('.rb .st-badge')].map((b) => b.className.replace('st-badge ', '')),
        count: document.querySelector('[data-count]').textContent.trim()
      }));
    }
    const bad = [];
    for (const [code, v] of Object.entries(got)) {
      if (v.title !== SAMPLES[code]) bad.push(`${code} text=${v.title}`);
      const want = EXPECT[code] || ['done', 'done', 'done'];
      if (v.badges.join(',') !== want.join(',')) bad.push(`${code} badges=${v.badges}`);
      if (code === 'ar' && v.dir !== 'rtl') bad.push('ar dir≠rtl');
      if (code !== 'ar' && v.dir === 'rtl') bad.push(`${code} dir=rtl`);
    }
    const subZh = await page.evaluate(() => document.querySelector('[data-slot="sub"]').textContent.trim());
    await page.click('.lg[data-code="en"]');
    await page.waitForTimeout(120);
    await page.click('.lang-toggle');
    await page.waitForTimeout(320);
    const subEn = await page.evaluate(() => document.querySelector('[data-slot="sub"]').textContent.trim());
    const badgeEn = await page.evaluate(() => document.querySelector('.rb .st-badge').textContent.trim());
    rec.demo = { langs: Object.keys(got).length, bad, subZh, subEn, badgeEn };
    await page.click('.lang-toggle');
    await page.waitForTimeout(320);
    const count = await page.evaluate(() => document.querySelectorAll('.lg').length);
    rec.demo.buttons = count;
  }

  const tpBtn = await page.$('[data-tp-toggle]');
  if (tpBtn) {
    const snap = () => page.evaluate(() => {
      const t = document.querySelector('table.tp');
      const thead = t.querySelectorAll('thead th').length;
      const first = t.querySelector('tbody tr');
      return {
        flipped: t.dataset.flipped,
        thead,
        rows: t.querySelectorAll('tbody tr').length,
        cols: first ? first.children.length : 0,
        cell: t.querySelector('tbody tr td').innerHTML.slice(0, 40),
        label: document.querySelector('[data-tp-toggle]').textContent.trim()
      };
    });
    const before = await snap();
    await tpBtn.click();
    await page.waitForTimeout(140);
    const after = await snap();
    await page.click('[data-tp-toggle]');
    await page.waitForTimeout(140);
    const back = await snap();
    rec.tp = { before, after, back };
  }

  if (MUST.demo.includes(file) && !await page.$('[data-demo]')) fail.push(`${file} 缺 [data-demo]（该页按矩阵应有 12 语种演示）`);
  if (MUST.tp.includes(file) && !await page.$('[data-transpose]')) fail.push(`${file} 缺 [data-transpose]`);
  if (MUST.chk.includes(file) && !await page.$('[data-checklist]')) fail.push(`${file} 缺 [data-checklist]`);

  const chk = await page.$('[data-checklist]');
  if (chk) {
    const col = await page.$$('input[data-col="zh"]');
    await col[0].check();
    await col[2].check();
    await page.waitForTimeout(120);
    const afterTick = await page.evaluate(() => {
      const th = document.querySelector('th[data-colhead="zh"]');
      return {
        code: th.querySelector('b').textContent.trim(),
        col: th.querySelector('[data-count]').textContent.trim(),
        total: document.querySelector('[data-total]').textContent.trim(),
        filled: document.querySelectorAll('.chk-cell input:checked').length,
        cells: document.querySelectorAll('.chk-cell .box').length
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);
    const afterReload = await page.evaluate(() => ({
      total: document.querySelector('[data-total]').textContent.trim(),
      checked: document.querySelectorAll('.chk-cell input:checked').length
    }));
    await page.click('[data-reset]');
    await page.waitForTimeout(140);
    const afterReset = await page.evaluate(() => ({
      total: document.querySelector('[data-total]').textContent.trim(),
      checked: document.querySelectorAll('.chk-cell input:checked').length,
      stored: localStorage.getItem('tygf.kwland.chk.03')
    }));
    rec.chk = { col: col.length, afterTick, afterReload, afterReset };
  }

  report[file] = rec;
  if (errors.length) fail.push(`${file}: ${errors.length} js errors`);
  for (const [k, v] of Object.entries(rec.hero)) {
    if (!v) { fail.push(`${file} ${k}: no h1`); continue; }
    if (v.lines !== 2 || v.distinctTops !== 2) fail.push(`${file} ${k}: h1 lines=${v.lines} tops=${v.distinctTops}`);
    if (v.overflow) fail.push(`${file} ${k}: h1 line wider than box (${Math.round(v.widest)} > ${v.boxW})`);
    if (v.scrollW > v.docW) fail.push(`${file} ${k}: doc overflow ${v.scrollW} > ${v.docW}`);
    if (v.size < 28) fail.push(`${file} ${k}: h1 shrunk to ${v.size}px`);
  }
  if (rec.demo) {
    if (rec.demo.buttons !== 12) fail.push(`${file}: ${rec.demo.buttons} language buttons`);
    rec.demo.bad.forEach((b) => fail.push(`${file} demo: ${b}`));
    if (rec.demo.subZh === rec.demo.subEn) fail.push(`${file}: demo sub did not switch language`);
    if (rec.demo.badgeEn !== 'Confirmed') fail.push(`${file}: demo badge in EN = ${rec.demo.badgeEn}`);
  }
  if (rec.tp) {
    const { before, after, back } = rec.tp;
    if (after.thead !== before.rows + 1) fail.push(`${file} tp: flipped thead ${after.thead} ≠ rowLabels ${before.rows} + 1`);
    if (after.rows !== before.thead - 1) fail.push(`${file} tp: flipped rows ${after.rows} ≠ routes ${before.thead - 1}`);
    if (after.cols !== after.thead) fail.push(`${file} tp: row cells ${after.cols} ≠ thead ${after.thead}`);
    if (back.thead !== before.thead || back.rows !== before.rows) fail.push(`${file} tp: round trip ${back.thead}x${back.rows} ≠ ${before.thead}x${before.rows}`);
    if (JSON.stringify(before.cell) !== JSON.stringify(back.cell)) fail.push(`${file} tp: cell changed after round trip`);
    if (before.label === after.label) fail.push(`${file} tp: toggle label did not change`);
  }
  if (rec.chk) {
    const { afterTick, afterReload, afterReset } = rec.chk;
    if (afterTick.col !== '2 / 6') fail.push(`${file} chk: column=${afterTick.col}`);
    if (afterTick.code !== 'ZH') fail.push(`${file} chk: column header overwritten → ${afterTick.code}`);
    if (afterTick.cells !== 72) fail.push(`${file} chk: cells=${afterTick.cells}`);
    if (afterTick.filled !== 2) fail.push(`${file} chk: filled=${afterTick.filled}`);
    if (afterTick.total !== '2 / 72') fail.push(`${file} chk: total=${afterTick.total}`);
    if (afterReload.checked !== 2) fail.push(`${file} chk: reload kept ${afterReload.checked}`);
    if (afterReset.checked !== 0 || afterReset.total !== '0 / 72') fail.push(`${file} chk: reset ${JSON.stringify(afterReset)}`);
  }
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(import.meta.dirname, 'interact.json'), JSON.stringify(report, null, 1), 'utf8');

for (const [f, r] of Object.entries(report)) {
  const h = Object.entries(r.hero).map(([k, v]) => `${k}:${v ? Math.round(v.size) + 'px' : 'x'}`).join(' ');
  const bits = [h];
  if (r.demo) bits.push(`demo:${r.demo.buttons}langs/${r.demo.bad.length}bad`);
  if (r.tp) bits.push(`tp:${r.tp.before.thead}x${r.tp.before.rows}→${r.tp.after.thead}x${r.tp.after.rows}`);
  if (r.chk) bits.push(`chk:${r.chk.afterTick.col}/${r.chk.afterTick.total}→${r.chk.afterReload.checked}→${r.chk.afterReset.total}`);
  console.log(f.padEnd(34), bits.join('  '));
}
console.log(`\nscanned ${SITES.length} files | checks: ${fail.length} failures`);
process.exitCode = fail.length ? 1 : 0;
fail.forEach((f) => console.log('  FAIL', f));
