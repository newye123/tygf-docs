/* 负控：往产物 HTML 里注入五类缺陷，逐条证明对应的闸会报非 0；每发之后重建还原。
   只动 sites/*.html（生成物，node build.mjs 可整批还原），不动 _build 源码。 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const TARGET = path.join(HERE, '..', 'sites', '01-psd-batch-edit.html');
const ORIG = fs.readFileSync(TARGET, 'utf8');

const CASES = [
  {
    name: 'NC1 跨句反义句式（不是快。而是稳。）',
    gate: 'review-copy.mjs',
    inject: '<p>不是快。而是稳。</p>',
    expect: /ANTITHESIS hits: [1-9]/
  },
  {
    name: 'NC2 白底白字（祖先带 background-image）',
    gate: 'review-a11y.mjs',
    inject: '<div style="background-image:linear-gradient(#fff,#fff)"><p style="color:rgba(255,255,255,0.35);font-size:14px">这段字几乎看不见 CONTRAST CANARY</p></div>',
    expect: /contrast [1-9]/
  },
  {
    name: 'NC3 删掉 12 语种演示容器',
    gate: 'interact-kw.mjs',
    inject: '<script>window.addEventListener("load",function(){var d=document.querySelector("[data-demo]");if(d)d.remove();});</script>',
    expect: /缺 \[data-demo\]/
  },
  {
    name: 'NC4 单字成行（尾行只剩一个字）',
    gate: 'review-lines.mjs',
    inject: '<p style="max-width:200px">交付前的六项检查里最后一项是当地用语<br>框</p>',
    expect: /instances: [1-9]/
  },
  {
    name: 'NC5 页面级横向溢出',
    gate: 'verify.mjs',
    inject: '<div style="width:2000px;height:10px;background:#c00"></div>',
    expect: /errors\+overflow total: [1-9]/
  }
];

function rebuild() {
  execFileSync(process.execPath, ['build.mjs'], { cwd: HERE, stdio: 'ignore' });
}

const rows = [];
for (const c of CASES) {
  rebuild();
  const html = fs.readFileSync(TARGET, 'utf8');
  fs.writeFileSync(TARGET, html.replace('</body>', c.inject + '</body>'), 'utf8');
  let rc = 0; let out = '';
  try {
    out = execFileSync(process.execPath, [c.gate], { cwd: HERE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 40e6 });
  } catch (e) {
    rc = e.status === undefined ? -1 : e.status;
    out = (e.stdout || '') + (e.stderr || '');
  }
  const caught = c.expect.test(out);
  rows.push({ nc: c.name, gate: c.gate, rc, caught, sample: (out.match(/.{0,90}/g) || []).filter((l) => c.expect.test(l))[0] || '' });
}
rebuild();
const restored = fs.readFileSync(TARGET, 'utf8') === ORIG;

console.log('\n负控结果（每发都应 rc=1 且 caught=true）');
for (const r of rows) {
  console.log(' ', (r.rc === 1 && r.caught ? 'PASS' : 'FAIL').padEnd(5), r.gate.padEnd(18), 'rc=' + r.rc, '|', r.nc);
  if (r.sample) console.log('        ↳', r.sample.trim().slice(0, 110));
}
console.log('产物已还原（与注入前逐字节一致）:', restored);
process.exitCode = rows.every((r) => r.rc === 1 && r.caught) && restored ? 0 : 1;
