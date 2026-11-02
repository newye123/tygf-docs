import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('usage: node shots.mjs <slug> [slug...] | node shots.mjs --file=<report.html>');
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files']
});

if (slugs[0].startsWith('--file=')) {
  const target = path.join(ROOT, slugs[0].slice(7));
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(target).href, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const base = path.join(ROOT, 'screens', path.basename(target, '.html'));
  await page.screenshot({ path: `${base}-top-1280.png` });
  await page.screenshot({ path: `${base}-full-1280.png`, fullPage: true });
  console.log('shot', target);
  await browser.close();
  process.exit(0);
}

for (const slug of slugs) {
  const file = path.join(ROOT, 'sites', `${slug}.html`);
  for (const w of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width: w, height: w === 1440 ? 1000 : 844 },
      deviceScaleFactor: 1
    });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const base = path.join(ROOT, 'screens', `${slug}-home-${w}`);
    await page.screenshot({ path: `${base}.png` });
    if (w === 1440) {
      await page.click('.lang-toggle');
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${base}-en.png` });
    }
    await page.close();
    console.log('shot', slug, w);
  }
}

await browser.close();
