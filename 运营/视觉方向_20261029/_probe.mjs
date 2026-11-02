/* 视觉方向四选一实测：对比度、点按区、横向溢出、控制台错误。只读渲染，不改文件。 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const ROOT = import.meta.dirname;
const FILE = 'file:///' + path.join(ROOT, '视觉方向四选一_同一内容实测.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const DIRS = ['d0', 'd1', 'd2', 'd3'];
const NAMES = { d0: '现站基线', d1: '生产力工具', d2: '工业软件暗朱红', d3: '高端SaaS' };

const audit = () => {
  const lum = (rgb) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.85) return c;
      n = n.parentElement;
    }
    return [255, 255, 255, 1];
  };
  const ratio = (fg, bg) => {
    const a = lum(fg), b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const root = document.querySelector('[dir-root]:not([hidden])');
  const fails = [];
  let checked = 0;
  root.querySelectorAll('p,h1,h2,h3,h4,b,span,a,td,th,label,small,button').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.nodeValue.trim())) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const fg = parse(cs.color); if (!fg) return;
    const cr = ratio(fg, bgOf(el));
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    checked++;
    if (cr < need) fails.push({ text: el.textContent.trim().slice(0, 22), size: Math.round(size * 10) / 10, cr: Math.round(cr * 100) / 100, need, tag: el.tagName.toLowerCase() });
  });
  const taps = [];
  root.querySelectorAll('a,button,input,select,textarea,label').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.width < 44 || r.height < 44) taps.push({ el: (el.className || el.tagName) + '', w: Math.round(r.width), h: Math.round(r.height) });
  });
  const tokens = {};
  const probe = getComputedStyle(root);
  ['--bg', '--surface', '--ink', '--muted', '--faint', '--brand', '--line', '--r'].forEach((k) => { tokens[k] = probe.getPropertyValue(k).trim(); });
  const h1 = root.querySelector('h1');
  const small = root.querySelector('.schematic, .trust, small');
  return {
    dir: root.getAttribute('data-dir'),
    contrastChecked: checked,
    contrastFails: fails.length,
    failSample: fails.slice(0, 6),
    tapUnder44: taps.length,
    tapTotal: root.querySelectorAll('a,button,input').length,
    tokens,
    h1: h1 ? { fs: getComputedStyle(h1).fontSize, fw: getComputedStyle(h1).fontWeight, lh: getComputedStyle(h1).lineHeight } : null,
    smallest: small ? Math.round(parseFloat(getComputedStyle(small).fontSize) * 10) / 10 : null,
    docW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth
  };
};

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = {};
for (const d of DIRS) {
  for (const w of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 1440 ? 900 : 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(FILE + '#' + d, { waitUntil: 'load' });
    await page.waitForTimeout(420);
    const r = await page.evaluate(audit);
    r.errors = errors;
    report[d + '@' + w] = r;
    if (w === 1440) await page.screenshot({ path: path.join(OUT, `dir-${d}-1440.png`), fullPage: false });
    else await page.screenshot({ path: path.join(OUT, `dir-${d}-390.png`), fullPage: false });
    await page.close();
  }
}
fs.writeFileSync(path.join(ROOT, 'visual-audit.json'), JSON.stringify(report, null, 1), 'utf8');

console.log('方向                 宽度   对比度检查 不过  点按<44  溢出   最小字号  h1            错误');
for (const [k, v] of Object.entries(report)) {
  console.log(
    (NAMES[v.dir] + '      ').slice(0, 18).padEnd(18),
    k.split('@')[1].padEnd(6),
    String(v.contrastChecked).padStart(6), String(v.contrastFails).padStart(7),
    String(v.tapUnder44).padStart(7) + '/' + v.tapTotal,
    (v.scrollW > v.docW + 2 ? 'YES ' + v.scrollW : 'no').padStart(9),
    String(v.smallest).padStart(8),
    (v.h1 ? v.h1.fs + '/' + v.h1.fw : '-').padStart(12),
    v.errors.length ? ' ' + v.errors.length : ''
  );
}
console.log('\n各方向不过样本判决（4.5:1 正文 / 3:1 大字）：');
for (const [k, v] of Object.entries(report)) {
  if (!v.contrastFails) continue;
  console.log(' ', k, v.failSample.map((f) => `${f.text}(${f.size}px ${f.cr}:1<${f.need})`).join(' | '));
}
console.log('\n令牌：');
for (const d of DIRS) console.log(' ', d, JSON.stringify(report[d + '@1440'].tokens));
