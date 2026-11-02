/* 一次性：量 11/12 页导航链接的实际盒子，找 smallTap 根因。 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(import.meta.dirname, '..');

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const f of ['11-en-psd-delivery.html', '12-en-multilingual-replace.html', '01-psd-batch-edit.html']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file:///' + path.join(ROOT, 'sites', f).replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => Array.from(document.querySelectorAll('.nav a')).map((a) => {
    const b = a.getBoundingClientRect();
    const cs = getComputedStyle(a);
    return { href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 12), w: Math.round(b.width), h: Math.round(b.height), disp: cs.display, pad: cs.padding };
  }));
  console.log(f, JSON.stringify(r));
  await p.close();
}
await b.close();
