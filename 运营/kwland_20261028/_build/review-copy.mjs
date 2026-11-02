/* 文案闸：① 反义句式（不是…而是 / 而不是 / not…but …）逐条列出，只放行"诚实限定"类否定；
   ② 对外主张词表（保证/一键/100%/guarantee…）只报不拦，用来人工复核；
   ③ 中英文串的排版毛刺（双空格、标点后缺空格、重复词、小写开头）。
   只读：不改 sites，不改文案。 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = fs.readdirSync(path.join(ROOT, 'sites')).filter((f) => f.endsWith('.html')).sort();
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

/* ---------------- ① 反义句式 ---------------- */
const ALLOW = /承诺|实测|业绩|证据|验收|示例|示意|翻译工具|承诺|claim|guarantee|measurement|measured|evidence|example|sample|visual QA|recording|screenshot|comparison|durations|illustration|rehearsal/i;
const ANTITHESIS = [
  ['zh 不是…而是', /不是[^。！？<]{0,60}?而是/g],
  ['zh 不是…，是', /不是[^。！？<]{0,60}?，是/g],
  ['zh 而不是', /而不是/g],
  ['zh 并不是', /并不是/g],
  ['en not…but', /\bnot\b[^.!?<]{0,60}\bbut\b/gi],
  ['en Not X — Y', /\bNot\b[^.!?<]{0,40}[—–]/g],
  ['en is not A. It is B', /\bis not\b[^.!?<]{0,60}\.\s*(It|That|This)\s+is\b/gi],
  ['en , not X', /,\s+not\s+[a-z][^.!?<]{0,40}/gi],
  ['zh 跨句 不是。而是', /不是[^<]{0,26}[。！？]\s*而是/g],
  ['zh 跨句 不是。…，是', /不是[^<]{0,26}[。！？][^<]{0,10}?，是/g],
  ['en 跨句 not. but', /\bnot\b[^<]{0,26}[.!?]\s*but\b/gi],
];
const SOURCES = ['kwdata.mjs', 'kwui.mjs', 'page.mjs'];
const bad = [];
const kept = new Map();
for (const f of SOURCES) {
  const p = path.join(import.meta.dirname, f);
  if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const [name, re] of ANTITHESIS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const hit = m[0].replace(/\s+/g, ' ').trim();
        if (ALLOW.test(m[0])) { kept.set(hit, (kept.get(hit) || 0) + 1); continue; }
        bad.push(`${f}:${i + 1} [${name}] ${m[0].slice(0, 90)}`);
      }
    }
  });
}
for (const f of SITES) {
  const html = fs.readFileSync(path.join(ROOT, 'sites', f), 'utf8');
  let visible = strip(html).replace(/\s+/g, ' ');
  const island = html.match(/<script type="application\/json" id="kw-langs">([\s\S]*?)<\/script>/);
  if (island) { try { visible += ' ' + JSON.stringify(JSON.parse(island[1])); } catch (e) { console.log('JSON island unparsable in ' + f); } }
  for (const [name, re] of ANTITHESIS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(visible))) {
      if (ALLOW.test(m[0])) continue;
      bad.push(`sites/${f} [${name}] ${m[0].slice(0, 90)}`);
    }
  }
}
console.log('① ANTITHESIS hits:', bad.length);
for (const b of bad) console.log('  ✗ ' + b);
console.log('   kept (honesty qualifiers, exempt):', kept.size);
for (const [k, n] of kept) console.log('   · ' + k + (n > 1 ? `  ×${n}` : ''));

/* ---------------- ② 对外主张词 ---------------- */
const risky = {
  zh: [/保证/g, /100%/g, /零/g, /一键/g, /秒级/g, /瞬间/g, /越用越准/g, /永久/g, /免费/g, /\d+%/g],
  en: [/\bguarantee/gi, /\b100%/g, /\bzero\b/gi, /\binstant(ly)?\b/gi, /\bpermanent(ly)?\b/gi, /\bfree\b/gi, /\b\d+%/g],
};
const claim = {};
for (const f of SITES) {
  const visible = strip(fs.readFileSync(path.join(ROOT, 'sites', f), 'utf8')).replace(/\s+/g, ' ');
  for (const [lang, list] of Object.entries(risky)) {
    for (const re of list) {
      re.lastIndex = 0;
      const m = visible.match(re);
      if (m) {
        const key = lang + ':' + re.source;
        claim[key] = claim[key] || [];
        for (const x of m) claim[key].push(f + ' «' + x + '»');
      }
    }
  }
}
console.log('\n② CLAIM-word hits (报数不拦，人工复核):');
const claimKeys = Object.keys(claim).sort((a, b) => claim[b].length - claim[a].length);
if (!claimKeys.length) console.log('   0');
for (const k of claimKeys) {
  const files = [...new Set(claim[k].map((x) => x.split(' ')[0]))];
  console.log('  ' + String(claim[k].length).padStart(3), k, '|', files.slice(0, 5).join(','), '|', claim[k].slice(0, 2).join(' ; '));
}

/* ---------------- ③ 排版毛刺 ---------------- */
const en = new Set();
const zh = new Set();
for (const f of SITES) {
  const body = fs.readFileSync(path.join(ROOT, 'sites', f), 'utf8');
  for (const m of body.matchAll(/<span class="zh">([^<]{4,})<\/span>/g)) zh.add(m[1].trim());
  for (const m of body.matchAll(/<span class="en">([^<]{4,})<\/span>/g)) en.add(m[1].trim());
}
const EN = [...en];
const dbl = EN.filter((s) => / {2,}/.test(s));
const punct = EN.filter((s) => /[,.;:!?][A-Za-z]/.test(s.replace(/&(amp|lt|gt|quot|#39);/g, ' ')));
const dup = EN.filter((s) => /\b(\w+)\s+\1\b/i.test(s));
const lower = EN.filter((s) => /^[a-z]/.test(s) && s.length > 18);
const ZH = [...zh];
const zhSpace = ZH.filter((s) => /[\u4e00-\u9fa5]\s+[\u4e00-\u9fa5]/.test(s));
console.log('\n③ TYPOGRAPHY');
console.log('   EN strings:', EN.length, '| ZH strings:', ZH.length);
console.log('   en double-space:', dbl.length, '| en missing space after punct:', punct.length, '| en dup word:', dup.length, '| en lowercase start:', lower.length);
console.log('   zh inner space:', zhSpace.length, '| scanned files:', SITES.length);
for (const [k, list] of Object.entries({ dbl, punct, dup, lower, zhSpace })) {
  if (list.length) console.log('   ' + k + ':', list.slice(0, 4));
}
fs.writeFileSync(path.join(import.meta.dirname, 'copy-en.txt'), EN.sort().join('\n'), 'utf8');
fs.writeFileSync(path.join(import.meta.dirname, 'copy-zh.txt'), ZH.sort().join('\n'), 'utf8');

process.exitCode = bad.length ? 1 : 0;
