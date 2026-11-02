import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, themes } from './kwdata.mjs';
import { renderSite, renderIndexSite } from './page.mjs';
import { siteFileName, SHAPE } from './kwui.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'sites');
fs.mkdirSync(OUT, { recursive: true });

const seen = new Set();
let total = 0;
const rows = [];

for (const v of pages) {
  if (!SHAPE[v.shape]) throw new Error(`未知承接形态：${v.shape}（${v.slug}）`);
  if (!themes[v.theme]) throw new Error(`未知色调：${v.theme}（${v.slug}）`);
  const name = siteFileName(v);
  if (seen.has(name)) throw new Error(`文件名重复：${name}`);
  seen.add(name);
  const html = renderSite(v);
  fs.writeFileSync(path.join(OUT, name), html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  total += Buffer.byteLength(html, 'utf8');
  rows.push(`${v.id}  ${v.shape.padEnd(9)} ${v.theme.padEnd(9)} ${kb.padStart(6)} KB  ${name}`);
}

const idx = renderIndexSite();
fs.writeFileSync(path.join(OUT, 'index.html'), idx, 'utf8');

console.log(rows.join('\n'));
console.log(`\npages ${pages.length} + index 1`);
console.log(`bytes ${(total / 1024).toFixed(1)} KB (pages) + ${(Buffer.byteLength(idx, 'utf8') / 1024).toFixed(1)} KB (index)`);
console.log(`out ${OUT}`);
