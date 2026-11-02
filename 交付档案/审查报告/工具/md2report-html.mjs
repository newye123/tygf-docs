/* md → 审查报告 HTML：沿用 交付档案/审查报告 的设计令牌与组件体系（masthead / verdict band /
   状态色 ledger / footer），保证 md 与 HTML 内容同源不漂移。
   用法：node md2report-html.mjs <报告.md> [输出.html] */
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node md2report-html.mjs <report.md> [out.html]'); process.exit(2); }
const out = process.argv[3] || src.replace(/\.md$/, '.html');
const md = fs.readFileSync(src, 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(（])_([^_]+)_(?=[\s)）,，。：;；]|$)/g, '$1<em>$2</em>');

const lines = md.split(/\r?\n/);
const blocks = [];
let title = '';
const meta = [];
let i = 0;
for (; i < lines.length; i++) {
  const l = lines[i];
  if (!title && l.startsWith('# ')) { title = l.slice(2).trim(); continue; }
  if (title && meta.length < 4 && l.trim() && !l.startsWith('---') && !l.startsWith('#')) { meta.push(l.trim()); continue; }
  break;
}

let list = null;
const flush = () => { if (list) { blocks.push(list); list = null; } };
for (; i < lines.length; i++) {
  const l = lines[i];
  const t = l.trim();
  if (!t) { flush(); continue; }
  if (t === '---') { flush(); blocks.push({ k: 'hr' }); continue; }
  let m;
  if ((m = t.match(/^(#{2,4})\s+(.*)$/))) { flush(); blocks.push({ k: 'h' + m[1].length, text: m[2] }); continue; }
  if ((m = t.match(/^[-*]\s+(.*)$/))) { (list = list || { k: 'ul', items: [] }).items.push(m[1]); continue; }
  if ((m = t.match(/^\d+[.、]\s+(.*)$/))) { (list = list || { k: 'ol', items: [] }).items.push(m[1]); continue; }
  if ((m = t.match(/^>\s?(.*)$/))) { flush(); blocks.push({ k: 'quote', text: m[1] }); continue; }
  flush();
  if (/^\*\*VERDICT/.test(t)) { flush(); blocks.push({ k: 'verdict', text: t }); continue; }
  blocks.push({ k: 'p', text: t });
}
flush();

const CSS = `
:root{--bg:#f6f7f9;--surface:#fff;--sunk:#eef1f5;--ink:#131820;--ink-2:#3d4757;--muted:#657084;--line:#dde2ea;--line-strong:#c3cbd8;
--accent:#1b5bd0;--accent-soft:#e8effc;--ok:#0d6f4a;--ok-soft:#e6f4ec;--bad:#ae2318;--bad-soft:#fbeae8;--warn:#8a5a00;--warn-soft:#fbf1dc;
--font-body:"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;--font-display:"IBM Plex Sans","Noto Sans SC",system-ui,sans-serif;
--font-mono:"IBM Plex Mono",ui-monospace,"Cascadia Mono",Consolas,monospace;--pad:clamp(18px,4vw,40px);--radius:10px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#0d1015;--surface:#151a22;--sunk:#1b212b;--ink:#e8ecf3;--ink-2:#c2cad7;--muted:#8d97a8;--line:#252c38;--line-strong:#38414f;--accent:#78a8ff;--accent-soft:#17233a;--ok:#54cf96;--ok-soft:#12291f;--bad:#ff8d80;--bad-soft:#2c1614;--warn:#e0b64a;--warn-soft:#2a2110}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 15.5px/1.75 var(--font-body);-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:0 var(--pad) 80px}
.masthead{border-bottom:1px solid var(--line);background:var(--surface);padding:34px 0 26px;margin-bottom:30px}
.masthead .wrap{padding-bottom:0}
.eyebrow{font:600 11px/1 var(--font-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
h1{font:700 clamp(26px,4.4vw,40px)/1.18 var(--font-display);letter-spacing:-.015em;margin:12px 0 14px;overflow-wrap:anywhere}
.meta{display:grid;gap:6px;font-size:13px;color:var(--muted)}
.meta div{overflow-wrap:anywhere}
.verdict{background:var(--warn-soft);border:1px solid var(--warn);border-left-width:4px;border-radius:var(--radius);padding:16px 18px;margin:22px 0 26px;font-size:15px;color:var(--ink)}
h2{font:700 21px/1.35 var(--font-display);margin:40px 0 12px;padding-top:16px;border-top:1px solid var(--line);overflow-wrap:anywhere}
h3{font:600 17px/1.4 var(--font-display);margin:26px 0 8px;color:var(--ink-2)}
h4{font:600 15px/1.4 var(--font-display);margin:20px 0 6px;color:var(--ink-2)}
p{margin:0 0 13px;overflow-wrap:anywhere}
ul,ol{margin:0 0 15px;padding-left:22px}li{margin:0 0 7px;overflow-wrap:anywhere}
li::marker{color:var(--muted)}
code{font:500 .92em/1.5 var(--font-mono);background:var(--sunk);border:1px solid var(--line);border-radius:5px;padding:1px 5px;overflow-wrap:anywhere}
strong{font-weight:700}
hr{border:0;border-top:1px solid var(--line);margin:34px 0}
blockquote{margin:0 0 15px;padding:12px 16px;background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:6px;color:var(--ink-2);font-size:14.5px}
.footer{margin-top:46px;padding-top:18px;border-top:1px solid var(--line);font:500 12px/1.7 var(--font-mono);color:var(--muted)}
`;

const body = blocks.map((b, n) => {
  if (b.k === 'hr') {
    const next = blocks[n + 1];
    if (!next || next.k === 'hr' || /^h[234]$/.test(next.k)) return '';
    return '<hr>';
  }
  if (b.k === 'verdict') return `<div class="verdict">${inline(b.text)}</div>`;
  if (b.k === 'quote') return `<blockquote>${inline(b.text)}</blockquote>`;
  if (b.k === 'ul') return `<ul>${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;
  if (b.k === 'ol') return `<ol>${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`;
  if (b.k.startsWith('h')) return `<h${b.k.slice(1)}>${inline(b.text)}</h${b.k.slice(1)}>`;
  return `<p>${inline(b.text)}</p>`;
}).join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap">
<style>${CSS}</style>
</head>
<body>
<header class="masthead"><div class="wrap">
<div class="eyebrow">对抗式审查 · 图译工坊</div>
<h1>${esc(title)}</h1>
<div class="meta">${meta.map((m) => `<div>${inline(m)}</div>`).join('')}</div>
</div></header>
<main class="wrap">
${body}
<div class="footer">同源正文：${esc(path.basename(src))} · 版式沿用 交付档案/审查报告 设计令牌 · 本件不索引</div>
</main>
</body>
</html>
`;
fs.writeFileSync(out, html, 'utf8');
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB', '| blocks', blocks.length);
