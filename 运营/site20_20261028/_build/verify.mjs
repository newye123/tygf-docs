import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const require = createRequire('F:/工具开发/图译工坊内测版/worktrees/develop/package.json');
const { chromium } = require('playwright-core');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITES = path.join(ROOT, 'sites');
const SHOTS = path.join(ROOT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const shot = !args.includes('--no-shot');

const files = fs.readdirSync(SITES).filter((f) => f.endsWith('.html')).sort()
  .filter((f) => !only.length || only.some((o) => f.includes(o)));

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files', '--font-render-hinting=none']
});

const results = [];

for (const file of files) {
  const url = 'file:///' + path.join(SITES, file).replace(/\\/g, '/');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const home = await page.evaluate(() => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
    };
    const active = [...document.querySelectorAll('.page')].filter((p) => p.classList.contains('active')).map((p) => p.id);
    const overflow = [];
    const docW = document.documentElement.clientWidth;
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('iframe,.marquee,.matrix-scroll,.matrix-wrap')) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > docW + 2 || r.left < -2)) {
        const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName;
        if (overflow.length < 12) overflow.push(`${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
    });
    // line measurement for .og blocks: count chars on last visual line using Range rects
    function lastLineChars(el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = n.parentElement;
          if (!p || !vis(p)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const chars = [];
      let n;
      while ((n = walker.nextNode())) {
        for (let i = 0; i < n.nodeValue.length; i++) {
          const ch = n.nodeValue[i];
          if (/\s/.test(ch)) continue;
          const r = document.createRange();
          r.setStart(n, i); r.setEnd(n, i + 1);
          const rect = r.getBoundingClientRect();
          if (rect.width || rect.height) chars.push({ ch, top: Math.round(rect.top), left: Math.round(rect.left) });
        }
      }
      if (!chars.length) return null;
      const maxTop = Math.max(...chars.map((c) => c.top));
      const last = chars.filter((c) => Math.abs(c.top - maxTop) <= 2);
      return { last: last.length, total: chars.length, text: last.map((c) => c.ch).join('') };
    }
    const og = [];
    document.querySelectorAll('.og').forEach((el) => {
      if (!vis(el)) return;
      const m = lastLineChars(el);
      if (!m) return;
      if (m.last <= 6 && m.total > m.last) og.push({ text: (el.textContent || '').trim().slice(0, 40), ...m });
    });
    return {
      title: document.title,
      lang: document.documentElement.getAttribute('data-lang'),
      active,
      pages: document.querySelectorAll('.page').length,
      overflow,
      og,
      h1: document.querySelector('.page.active h1') ? document.querySelector('.page.active h1').innerText.replace(/\s+/g, ' ').trim() : '',
      h1Size: document.querySelector('.page.active h1') ? getComputedStyle(document.querySelector('.page.active h1')).fontSize : '',
      h1Height: document.querySelector('.page.active h1') ? Math.round(document.querySelector('.page.active h1').getBoundingClientRect().height) : 0,
      docW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      bodyHeight: document.body.scrollHeight
    };
  });

  if (shot) {
    await page.screenshot({ path: path.join(SHOTS, file.replace('.html', '-home-1440.png')), fullPage: false });
  }

  // language toggle
  await page.click('.lang-toggle');
  await page.waitForTimeout(500);
  const en = await page.evaluate(() => {
    const vis = (el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
    function lastLineChars(el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = n.parentElement;
          if (!p || !vis(p)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const chars = [];
      let n;
      while ((n = walker.nextNode())) {
        for (let i = 0; i < n.nodeValue.length; i++) {
          const ch = n.nodeValue[i];
          if (/\s/.test(ch)) continue;
          const r = document.createRange();
          r.setStart(n, i); r.setEnd(n, i + 1);
          const rect = r.getBoundingClientRect();
          if (rect.width || rect.height) chars.push({ ch, top: Math.round(rect.top) });
        }
      }
      if (!chars.length) return null;
      const maxTop = Math.max(...chars.map((c) => c.top));
      const last = chars.filter((c) => Math.abs(c.top - maxTop) <= 2);
      return { last: last.length, total: chars.length, text: last.map((c) => c.ch).join('') };
    }
    const og = [];
    document.querySelectorAll('.og').forEach((el) => {
      if (!vis(el)) return;
      const m = lastLineChars(el);
      if (m && m.last <= 6 && m.total > m.last) og.push({ text: (el.textContent || '').trim().slice(0, 40), ...m });
    });
    const h1 = document.querySelector('.page.active h1');
    const w = document.documentElement.clientWidth;
    return {
      lang: document.documentElement.getAttribute('data-lang'),
      title: document.title,
      zhVisible: [...document.querySelectorAll('.zh')].filter(vis).length,
      enVisible: [...document.querySelectorAll('.en')].filter(vis).length,
      h1: h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '',
      h1Size: h1 ? getComputedStyle(h1).fontSize : '',
      h1Height: h1 ? Math.round(h1.getBoundingClientRect().height) : 0,
      og,
      docW: w,
      scrollW: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')].filter((el) => {
        if (el.closest('iframe,.marquee,.matrix-scroll,.matrix-wrap')) return false;
        const r = el.getBoundingClientRect(); return r.width > 0 && r.right > w + 2;
      }).slice(0, 8).map((el) => (typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName))
    };
  });
  if (shot) {
    await page.screenshot({ path: path.join(SHOTS, file.replace('.html', '-home-1440-en.png')), fullPage: false });
  }

  if (args.includes('--mobile')) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return {
        overflow: [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > w + 2; }).slice(0, 10).map((el) => (typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName)),
        scrollW: document.documentElement.scrollWidth,
        clientW: w
      };
    });
    if (shot) await page.screenshot({ path: path.join(SHOTS, file.replace('.html', '-home-390.png')), fullPage: false });
    home.mobileOverflow = m;
  }

  results.push({ file, errors, home, en });
  await page.close();
  console.log(`\n=== ${file}`);
  console.log('  errors:', errors.length ? errors : 'none');
  console.log('  home :', JSON.stringify({ active: home.active, pages: home.pages, h1: home.h1, h1Size: home.h1Size, h1Height: home.h1Height, bodyHeight: home.bodyHeight, scrollW: home.scrollW, overflow: home.overflow, og: home.og }));
  console.log('  en   :', JSON.stringify({ lang: en.lang, title: en.title, h1: en.h1, h1Size: en.h1Size, h1Height: en.h1Height, zhVis: en.zhVisible, enVis: en.enVisible, scrollW: en.scrollW, overflow: en.overflow, og: en.og }));
  if (home.mobileOverflow) console.log('  mob  :', JSON.stringify(home.mobileOverflow));
}

await browser.close();
fs.writeFileSync(path.join(HERE, 'verify.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('\nwrote verify.json');
