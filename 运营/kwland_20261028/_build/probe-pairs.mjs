import fs from 'node:fs';

const src = fs.readFileSync(new URL('./kwdata.mjs', import.meta.url), 'utf8');
const re = /B\('([^']*)',\s*'([^']*)'\)/g;
let m;
let n = 0;
const bad = [];
const lineAt = (i) => src.slice(0, i).split('\n').length;
while ((m = re.exec(src))) {
  n += 1;
  const zh = m[1];
  const en = m[2];
  const zhCJK = /[\u3400-\u9fff]/.test(zh);
  const enCJK = /[\u3400-\u9fff]/.test(en);
  if (!zhCJK || enCJK) bad.push([lineAt(m.index), zh.slice(0, 70), en.slice(0, 70)]);
}
console.log('B() pairs', n, '| mismatched', bad.length);
for (const b of bad) console.log('  :' + b[0], '|', b[1], '||', b[2]);
