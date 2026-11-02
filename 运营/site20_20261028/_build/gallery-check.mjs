import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const info = await page.evaluate(() => {
  const frames = [...document.querySelectorAll('iframe')];
  return {
    cards: document.querySelectorAll('.card, .site-card, article').length,
    iframes: frames.length,
    first: frames[0] ? { w: frames[0].clientWidth, h: frames[0].clientHeight, transform: getComputedStyle(frames[0]).transform } : null,
    docW: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    bodyH: document.body.scrollHeight,
    chips: document.querySelectorAll('[data-group], .chip').length
  };
});
await page.screenshot({ path: path.join(ROOT, 'screens', '00-index-1440.png') });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const mob = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
await page.screenshot({ path: path.join(ROOT, 'screens', '00-index-390.png') });
console.log(JSON.stringify({ info, mob, errors }, null, 2));
await browser.close();
