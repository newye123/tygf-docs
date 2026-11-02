import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes } from './data.mjs';
import { nav, footer, homePage, demoPage, fitPage, applyPage } from './ui.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, 'assets');

const read = (name) => fs.readFileSync(path.join(ASSETS, name), 'utf8');

const BASE_CSS = read('base.css');
const EXTRA_CSS = read('extra.css');
const CLIENT_JS = read('client.js');

export function themeStyle(themeName) {
  const t = themes[themeName];
  if (!t) throw new Error(`Unknown theme: ${themeName}`);
  const root = Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';');
  const en = Object.entries(t.en || {}).map(([k, v]) => `${k}:${v}`).join(';');
  return `:root{${root}}\nhtml[data-lang="en"]{${en}}\n${t.css || ''}`;
}

export function renderSite(v, root) {
  const title = {
    zh: `${v.zh} · 图译工坊`,
    en: `${v.en} · TuYi Workshop`
  };
  const desc = v.sub;
  const html = `<!doctype html>
<html lang="zh-CN" data-lang="zh" data-theme="${v.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title data-zh="${title.zh}" data-en="${title.en}">${title.zh}</title>
<meta name="description" data-zh="${escAttr(desc.zh)}" data-en="${escAttr(desc.en)}" content="${escAttr(desc.zh)}">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="light dark">
<script>document.documentElement.classList.add('js');</script>
<style>${BASE_CSS}</style>
<style>${themeStyle(v.theme)}</style>
<style>${EXTRA_CSS}</style>
</head>
<body>
${nav()}
<main id="main">
${homePage(v).replace('<div class="page" id="view-home">', '<div class="page active" id="view-home">')}
${demoPage()}
${fitPage(v)}
${applyPage()}
</main>
${footer(root)}
<noscript><p style="position:fixed;left:12px;bottom:12px;z-index:99;background:#111;color:#fff;padding:8px 12px;border-radius:6px;font-size:12px">示意页：交互需要 JavaScript。Interactive demo needs JavaScript.</p></noscript>
<script>${CLIENT_JS}</script>
</body>
</html>
`;
  return html;
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function siteFileName(v) {
  return `${v.id}-${v.slug}.html`;
}
