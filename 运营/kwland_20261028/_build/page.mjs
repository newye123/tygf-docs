import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, pages } from './kwdata.mjs';
import { renderPage, renderIndex, navForIndex, footerForIndex, indexMeta } from './kwui.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, 'assets');
const read = (n) => fs.readFileSync(path.join(ASSETS, n), 'utf8');

const BASE_CSS = read('base.css');
const KW_CSS = read('kw.css');
const EXTRA_CSS = read('extra.css');
const CLIENT_JS = read('client.js');

const escAttr = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* 深色主题靠 --bg 的相对亮度判，不在数据里手写标记，免得两处打架 */
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function themeStyle(name) {
  const t = themes[name];
  if (!t) throw new Error(`Unknown theme: ${name}`);
  const vars = Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';');
  const dark = luminance(t.vars['--bg']) < 0.2;
  return {
    tone: dark ? 'dark' : 'light',
    css: `:root{${vars}}${dark ? '\nhtml{color-scheme:dark}' : ''}`
  };
}

function shell({ title, desc, theme, nav, main, footer, json, lang }) {
  const { tone, css } = themeStyle(theme);
  const ui = lang === 'en' ? 'en' : 'zh';
  return `<!doctype html>
<html lang="${ui === 'en' ? 'en' : 'zh-CN'}" data-lang="${ui}" data-default-lang="${ui}" data-theme="${escAttr(theme)}" data-tone="${tone}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title data-zh="${escAttr(title.zh)}" data-en="${escAttr(title.en)}">${escAttr(ui === 'en' ? title.en : title.zh)}</title>
<meta name="description" data-zh="${escAttr(desc.zh)}" data-en="${escAttr(desc.en)}" content="${escAttr(ui === 'en' ? desc.en : desc.zh)}">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="${tone === 'dark' ? 'dark' : 'light'}">
<script>document.documentElement.classList.add('js');</script>
<style>${BASE_CSS}</style>
<style>${css}</style>
<style>${KW_CSS}</style>
<style>${EXTRA_CSS}</style>
</head>
<body id="top">
<a class="skip" href="#main">跳到正文 / Skip to content</a>
${nav}
${main}
${footer}
<noscript><p style="position:fixed;left:12px;bottom:12px;z-index:99;background:#111;color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;max-width:70ch">这是模拟件，演示区、勾选计数与中英切换都需要 JavaScript。没开 JS 时，带「—」的读数一律按未启用看待，不要当成结果读。This mock needs JavaScript for the demo, the tick counters and the language switch; any reading shown as "—" means not running.</p></noscript>
${json ? `<script type="application/json" id="kw-langs">${json}</script>` : ''}
<script>${CLIENT_JS}</script>
</body>
</html>
`;
}

export function renderSite(v) {
  const r = renderPage(v);
  return shell({
    title: r.title,
    desc: r.desc,
    theme: v.theme,
    nav: r.nav,
    main: r.main,
    footer: r.footer,
    json: r.json,
    lang: v.uiLang || 'zh'
  });
}

export function renderIndexSite() {
  return shell({
    title: indexMeta.title,
    desc: indexMeta.desc,
    theme: 'sand',
    nav: navForIndex(),
    main: renderIndex(),
    footer: footerForIndex(),
    json: null
  });
}

export { pages };
