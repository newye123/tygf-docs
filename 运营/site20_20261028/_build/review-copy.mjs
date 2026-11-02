import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = fs.readdirSync(path.join(ROOT, 'sites')).filter((f) => f.endsWith('.html')).sort();

const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
const risky = {
  zh: [/自动(?!换行)/g, /保证/g, /全部/g, /所有(?!版)/g, /任何/g, /零/g, /一键/g, /秒(?!钟)/g, /分钟/g, /小时/g, /\d+%/g, /学习/g, /越用越准/g, /无需/g, /永久/g, /免费/g, /100%/g, /实时/g, /秒级/g, /瞬间/g, /智能/g, /精准/g, /完美/g, /彻底/g, /翻倍/g, /倍/g],
  en: [/\bguarantee/gi, /\balways\b/gi, /\bnever\b/gi, /\ball\b/gi, /\bevery\b/gi, /\bany\b/gi, /\bzero\b/gi, /\binstant(ly)?\b/gi, /\bautomatically\b/gi, /\bauto-/gi, /\blearn(s|ing)?\b/gi, /\bperfect(ly)?\b/gi, /\b100%/g, /\bminutes?\b/gi, /\bhours?\b/gi, /\bseconds?\b/gi, /\bfaster\b/gi, /\b\d+%/g, /\bcut\b/gi, /\bsave\b/gi, /\breal-time\b/gi, /\bsmart\b/gi, /\bseamless\b/gi],
};

const hits = {};
const english = new Set();
const chinese = new Set();
for (const f of SITES) {
  const html = fs.readFileSync(path.join(ROOT, 'sites', f), 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const text = strip(body);
  for (const [lang, list] of Object.entries(risky)) {
    for (const re of list) {
      const m = text.match(re);
      if (m) {
        const key = lang + ':' + re.source;
        hits[key] = hits[key] || [];
        for (const x of m) hits[key].push(f + ' «' + x + '»');
      }
    }
  }
  // collect visible strings
  for (const m of body.matchAll(/<span class="zh">([^<]{6,})<\/span>/g)) chinese.add(m[1].trim());
  for (const m of body.matchAll(/<span class="en">([^<]{6,})<\/span>/g)) english.add(m[1].trim());
}

console.log('--- risky phrase hits (count, sample files) ---');
for (const [k, v] of Object.entries(hits).sort((a, b) => b[1].length - a[1].length)) {
  const files = [...new Set(v.map((x) => x.split(' ')[0]))];
  console.log(v.length.toString().padStart(4), k, '|', files.slice(0, 4).join(','), '|', v.slice(0, 2).join(' ; '));
}

const en = [...english];
const badSpace = en.filter((s) => / {2,}/.test(s));
const noSpaceAfterPunct = en.filter((s) => /[,.;:!?][A-Za-z]/.test(s));
const dupWord = en.filter((s) => /\b(\w+)\s+\1\b/i.test(s));
const lowerStart = en.filter((s) => /^[a-z]/.test(s) && s.length > 20);
console.log('\nEN strings:', en.length, 'double space:', badSpace.length, 'missing space after punct:', noSpaceAfterPunct.length, 'dup word:', dupWord.length, 'lowercase start:', lowerStart.length);
if (badSpace.length) console.log('  dbl:', badSpace.slice(0, 5));
if (noSpaceAfterPunct.length) console.log('  punct:', noSpaceAfterPunct.slice(0, 5));
if (dupWord.length) console.log('  dup:', dupWord.slice(0, 5));
console.log('ZH strings:', chinese.size);
fs.writeFileSync(path.join(import.meta.dirname, 'copy-en.txt'), en.sort().join('\n'), 'utf8');
fs.writeFileSync(path.join(import.meta.dirname, 'copy-zh.txt'), [...chinese].sort().join('\n'), 'utf8');

/* ------------------------------------------------------------------ *
 * antithesis gate: the "not-X-but-Y" template is banned in shipped copy
 * 允许保留的只有"给数字/主张加诚实限定"的否定（不是承诺/不是实测…），
 * 它们去掉就会变成假话，因此按关键词放行。
 * ------------------------------------------------------------------ */
const ALLOW = /承诺|实测|业绩|证据|验收|示例|翻译工具|claim|guarantee|measurement|evidence|example|sample|visual QA|recording|screenshot|comparison|durations|illustration/i;
const ANTITHESIS = [
  ['zh 不是…而是', /不是[^。！？<]{0,60}?而是/g],
  ['zh 不是…，是', /不是[^。！？<]{0,60}?，是/g],
  ['zh 而不是', /而不是/g],
  ['en not…but', /\bnot\b[^.!?<]{0,60}\bbut\b/gi],
  ['en Not X — Y', /\bNot\b[^.!?<]{0,40}[—–]/g],
  ['en is not A. It is B', /\bis not\b[^.!?<]{0,60}\.\s*(It|That|This)\s+is\b/gi],
  ['en , not X', /,\s+not\s+[a-z][^.!?<]{0,40}/gi],
];
const sources = ['data.mjs', 'ui.mjs', 'build.mjs'];
const bad = [];
const kept = new Map();
for (const f of sources) {
  const lines = fs.readFileSync(path.join(import.meta.dirname, f), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of ANTITHESIS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const hit = m[0].replace(/\s+/g, ' ').trim();
        if (ALLOW.test(m[0])) {
          kept.set(hit, (kept.get(hit) || 0) + 1);
          continue;
        }
        bad.push(`${f}:${i + 1} [${name}] ${m[0].slice(0, 80)}`);
      }
    }
  });
}
for (const f of SITES) {
  const body = fs.readFileSync(path.join(ROOT, 'sites', f), 'utf8');
  const visible = strip(body.slice(body.indexOf('<body'))).replace(/\s+/g, ' ');
  for (const [name, re] of ANTITHESIS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(visible))) {
      if (ALLOW.test(m[0])) continue;
      bad.push(`sites/${f} [${name}] ${m[0].slice(0, 80)}`);
    }
  }
}
console.log('\nANTITHESIS hits:', bad.length);
for (const b of bad.slice(0, 20)) console.log('  ' + b);
console.log('ANTITHESIS kept (honesty qualifiers, exempt):', kept.size);
for (const [k, n] of kept) console.log('  · ' + k + (n > 1 ? `  ×${n}` : ''));
process.exitCode = bad.length ? 1 : 0;
