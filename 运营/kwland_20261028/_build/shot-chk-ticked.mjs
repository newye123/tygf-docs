/* 一次性：勾几格后截清单表，用来人工看勾选态。 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(import.meta.dirname, '..');
const url = 'file:///' + path.join(ROOT, 'sites', '03-twelve-langs.html').replace(/\\/g, '/');

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(400);
for (const [col, rows] of [['zh', [0, 1, 2, 3, 4, 5]], ['de', [0, 2]], ['ar', [1]]]) {
  for (const r of rows) {
    await p.click(`input[data-col="${col}"] >> nth=${r}`, { force: true });
  }
}
await p.waitForTimeout(250);
const el = await p.$('[data-checklist]');
await el.screenshot({ path: path.join(ROOT, 'screens', 'chk-03-ticked.png') });
const total = await p.textContent('[data-total]');
console.log('total', total);
await b.close();
