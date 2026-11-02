import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(process.cwd(), '..');
const SITES = fs.readdirSync(path.join(ROOT, 'sites')).filter((f) => f.endsWith('.html')).sort();
const WIDTHS = (process.env.W || '1440,1024,768,390').split(',').map(Number);

const measureFn = () => {
  const SEL = 'h1,h2,h3,h4,p,li,dt,dd,figcaption,blockquote,.ln,.eyebrow,.chip,.tag,.note,.bl-row,.cell';
  const isCJK = (c) => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(c);
  const isPunct = (c) => /[，。、；：！？）》」』】…—,.!?;:)\]]/.test(c);
  const out = [];
  const all = Array.from(document.querySelectorAll(SEL));

  for (const el of all) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r0 = el.getBoundingClientRect();
    if (!r0.width || !r0.height) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const chars = [];
    const range = document.createRange();
    let n;
    while ((n = walker.nextNode())) {
      const pcs = getComputedStyle(n.parentElement);
      if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
      const s = n.nodeValue;
      for (let i = 0; i < s.length; i++) {
        if (/\s/.test(s[i])) continue;
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        chars.push({ ch: s[i], top: Math.round(r.top * 2) / 2, h: r.height, w: r.width });
      }
    }
    if (chars.length < 2) continue;
    // cluster into line boxes by top
    const sorted = chars.slice().sort((a, b) => a.top - b.top);
    const lines = [];
    for (const c of sorted) {
      const tol = Math.max(2, c.h * 0.45);
      let line = lines.find((l) => Math.abs(l.top - c.top) <= tol);
      if (!line) { line = { top: c.top, chars: [] }; lines.push(line); }
      line.chars.push(c);
    }
    lines.sort((a, b) => a.top - b.top);
    if (lines.length < 2) continue;
    const blocks = lines.map((l) => {
      const text = l.chars.map((c) => c.ch).join('');
      const width = Math.max(...l.chars.map((c) => c.w)) * l.chars.length;
      return { text, cjk: l.chars.filter((c) => isCJK(c.ch)).length, n: l.chars.length, width };
    });
    const visible = blocks.map((b) => b.text).join(' ');
    const lone = blocks.filter((b) => b.n === 1);
    if (lone.length) {
      out.push({
        kind: 'lone',
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        sample: visible.slice(0, 90),
        bad: lone.map((b) => b.text),
        totalLines: lines.length,
      });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last.cjk === 1 && last.n <= 2) {
      out.push({
        kind: 'widow-cjk',
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        sample: visible.slice(0, 90),
        last: last.text,
        totalLines: lines.length,
      });
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = {};
for (const file of SITES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('file:///' + path.join(ROOT, 'sites', file).replace(/\\/g, '/'));
  await page.waitForTimeout(700);
  const per = {};
  for (const lang of ['zh', 'en']) {
    if (lang === 'en') {
      await page.click('.lang-toggle');
      await page.waitForTimeout(500);
    }
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.waitForTimeout(250);
      const res = await page.evaluate(measureFn);
      if (res.length) per[lang + '@' + w] = res;
    }
  }
  if (Object.keys(per).length) report[file] = per;
  await page.close();
}
await browser.close();
fs.writeFileSync(path.join(import.meta.dirname, 'review-lines.json'), JSON.stringify(report, null, 1));
const total = Object.values(report).reduce((a, o) => a + Object.values(o).reduce((b, arr) => b + arr.length, 0), 0);
console.log('files with issues:', Object.keys(report).length, 'instances:', total);
for (const [f, o] of Object.entries(report)) console.log(f, Object.entries(o).map(([k, v]) => k + ':' + v.length).join(' '));
