import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = fs.readdirSync(path.join(ROOT, 'sites')).filter((f) => f.endsWith('.html')).sort();

const audit = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    const m2 = c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
    if (m2) return { r: +m2[1] * 255, g: +m2[2] * 255, b: +m2[3] * 255, a: m2[4] ? +m2[4] : 1 };
    return null;
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { grad: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.85) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const active = document.querySelector('.page.active') || document.body;
  const issues = { contrast: [], noText: [], smallTap: [], imgAlt: [], dupId: [], label: [] };
  let skippedGrad = 0;

  const textEls = Array.from(active.querySelectorAll('p,li,h1,h2,h3,h4,h5,span,a,button,td,th,figcaption,blockquote,label,strong,em'));
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!own) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (bg.grad) { skippedGrad++; continue; }
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const cr = ratio(fg, bg);
    if (cr < (large ? 3 : 4.5)) {
      issues.contrast.push({ text: el.textContent.trim().slice(0, 40), cls: (el.className || '').toString().slice(0, 40), cr: Math.round(cr * 100) / 100, size, bold });
    }
  }

  for (const el of active.querySelectorAll('a,button')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name) issues.noText.push(el.outerHTML.slice(0, 80));
    if (r.width < 24 || r.height < 24) issues.smallTap.push({ html: el.outerHTML.slice(0, 70), w: Math.round(r.width), h: Math.round(r.height) });
  }
  for (const el of active.querySelectorAll('img')) {
    if (!el.hasAttribute('alt')) issues.imgAlt.push(el.outerHTML.slice(0, 80));
  }
  const ids = {};
  for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [id, n] of Object.entries(ids)) if (n > 1) issues.dupId.push(id + ' x' + n);
  for (const el of active.querySelectorAll('input,select,textarea')) {
    const id = el.id;
    const has = (id && document.querySelector('label[for="' + id + '"]')) || el.getAttribute('aria-label') || el.closest('label');
    if (!has) issues.label.push(el.outerHTML.slice(0, 70));
  }

  const heads = Array.from(active.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter((h) => h.getBoundingClientRect().height > 0);
  const seq = heads.map((h) => +h.tagName[1]);
  let jumps = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] - seq[i - 1] > 1) jumps++;

  return {
    lang: document.documentElement.getAttribute('data-lang'),
    title: document.title,
    h1: active.querySelectorAll('h1').length,
    headings: seq.join(''),
    headingJumps: jumps,
    issues,
    skippedGrad,
    nodes: document.querySelectorAll('*').length,
    interactive: active.querySelectorAll('a,button,input,select,textarea,[tabindex]').length,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const out = {};
for (const file of SITES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const t0 = Date.now();
  await page.goto('file:///' + path.join(ROOT, 'sites', file).replace(/\\/g, '/'), { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(700);
  const desk = await page.evaluate(audit);
  const t1 = Date.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const frameMs = Date.now() - t1;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  const mob = await page.evaluate(audit);

  await page.click('.lang-toggle');
  await page.waitForTimeout(400);
  const mobEn = await page.evaluate(audit);

  const bytes = fs.statSync(path.join(ROOT, 'sites', file)).size;
  out[file] = { bytes, loadMs, frameMs, errors, zh: { desk, mob }, en: { mob: mobEn } };
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(import.meta.dirname, 'review-a11y.json'), JSON.stringify(out, null, 1));

const tot = (k) => Object.values(out).reduce((a, o) => a + (o.zh.desk.issues[k].length || 0) + (o.zh.mob.issues[k].length || 0) + (o.en.mob.issues[k].length || 0), 0);
console.log('contrast', tot('contrast'), '| noText', tot('noText'), '| smallTap', tot('smallTap'), '| dupId', tot('dupId'), '| label', tot('label'), '| imgAlt', tot('imgAlt'));
console.log('heading jumps:', Object.entries(out).filter(([, o]) => o.zh.desk.headingJumps > 0).map(([f, o]) => f + '=' + o.zh.desk.headingJumps).join(' '));
console.log('errors:', Object.entries(out).filter(([, o]) => o.errors.length).map(([f, o]) => f + '=' + o.errors.length).join(' ') || 'none');
console.log('bytes max', Math.max(...Object.values(out).map((o) => o.bytes)), 'nodes max', Math.max(...Object.values(out).map((o) => o.zh.desk.nodes)), 'load max', Math.max(...Object.values(out).map((o) => o.loadMs)));
