/* 元素级截图：node shot-el.mjs <slug> <selector> [outName] */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const [slug, selector, outName] = process.argv.slice(2);
if (!slug || !selector) {
  console.error('usage: node shot-el.mjs <slug> <selector> [outName]');
  process.exit(2);
}

const ROOT = path.resolve(import.meta.dirname, '..');
const width = Number(process.env.W || 1440);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(ROOT, 'sites', `${slug}.html`)).href, { waitUntil: 'load' });
await page.waitForTimeout(800);

const el = await page.$(selector);
if (!el) {
  console.error('no such element:', selector);
  await browser.close();
  process.exit(1);
}
const name = outName || `${slug}-${selector.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
const file = path.join(ROOT, 'screens', `${name}.png`);
await el.screenshot({ path: file });
console.log('shot', file);
await browser.close();
