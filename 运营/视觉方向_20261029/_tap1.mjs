/* 只查 d1 的小点按区是否仍满足 WCAG 2.5.8 AA（>=24px）。 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');
const FILE = 'file:///' + path.join(import.meta.dirname, '视觉方向四选一_同一内容实测.html').replace(/\\/g, '/');

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(FILE + '#d1', { waitUntil: 'load' });
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const root = document.querySelector('[dir-root]:not([hidden])');
  const list = [];
  root.querySelectorAll('a,button,input,select,textarea').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.width < 44 || r.height < 44) list.push({ t: el.tagName, cls: String(el.className).slice(0, 22), txt: el.textContent.trim().slice(0, 10), w: Math.round(r.width), h: Math.round(r.height) });
  });
  return list;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
