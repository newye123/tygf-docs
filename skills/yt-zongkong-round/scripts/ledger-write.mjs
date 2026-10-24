#!/usr/bin/env node
// ledger-write.mjs — 追加型台账的唯一守卫写入口（三账＋发布进展＋日报）。存在理由：
// 1) 2026-09-27 F-056 定形——Edit／Write 类工具改文件＝换新 inode（整册替换），会静默吞掉别人在我读与写之间 append 的行；
// 2) 本仓天天咬人的三件事：吞标题／非纯增量／把近似钟点与盘符路径写进台账。故把闸与自证固化成一条命令。
// 用法：node scripts/ledger-write.mjs --book <总控下文件名> --mode append|prepend-section|flip-head [选项]
//   append            文末追加（草稿可多行）
//   prepend-section   在首个 "## " 节之前置顶插入一整节（草稿须以 "## " 起头）
//   flip-head         只换某一行的行首标记：--match "<旧行唯一子串>"，草稿＝那一行的新内容（单行）
//   --draft <file>    正文（放系统临时目录；@@TS@@ 会被换成本命令的钟）
//   --release [name]  写完在同一条命令内放心跳锁（默认 round.lock.hb）
// 退出码 0＝通过并落盘；3＝任一闸拦下（不落盘）。
// 近似钟点两道闸的正则原式（2026-09-27 官制.md:1541 第① 条之三要求写进文件头，配可复跑负控；与 hb-write.mjs 同套）：
//   approxclock = /\d{1,2}:\d{2}:\d[xX]/   拦"末位写成 x"的半缩写形（例：14:22:4x）
//   approxx     = /:[xX]/                  拦"冒号后紧跟 x 或 X"的整体缩写形（例：19:xx）——第 9 道闸
// 只作用于将落盘的正文；命中即 exit 3 拒写。禁止删钟点过闸（缺钟点比近似钟点更坏）；引用别手该形时只描形状、
// 不拄字面；不得为过闸放宽判据。NEGCTRL＝一枚全是合法读数的样本，任一闸咬住它即 CTRL_FALSEPOSITIVE 退出。
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  if (k === 'release') { opt.release = true; if (argv[i + 1] && !argv[i + 1].startsWith('--')) opt.lock = argv[++i]; }
  else if (argv[i + 1] && !argv[i + 1].startsWith('--')) opt[k] = argv[++i];
  else opt[k] = true;
}
const ROOT = opt.root || 'F:\\工具开发\\图译工坊内测版';
const fail = (m) => { process.stdout.write('GATE_BLOCK ' + m + '\n'); process.exit(3); };
if (!opt.book || !opt.mode || !opt.draft) fail('ARGS_NEED book/mode/draft');
const BOOK = path.join(ROOT, '总控', opt.book);
if (!fs.existsSync(BOOK)) fail('BOOK_MISSING ' + opt.book);

const now = new Date();
if (now.getTimezoneOffset() !== -480) fail('TZ offset=' + now.getTimezoneOffset());
const p2 = (n) => String(n).padStart(2, '0');
const TS = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate()) + ' ' +
  p2(now.getHours()) + ':' + p2(now.getMinutes()) + ':' + p2(now.getSeconds());

let text = '';
if (!fs.existsSync(opt.draft)) fail('DRAFT_MISSING');
try { text = fs.readFileSync(opt.draft, 'utf8').replace(/\s+$/, ''); } catch (e) { fail('DRAFT_READ ' + e.code); }
if (!text.trim()) fail('DRAFT_EMPTY');
text = text.replace(/@@TS@@/g, TS);
let SIL = '';
if (opt['sil-base']) {
  const b = new Date(opt['sil-base']).getTime();
  if (Number.isNaN(b)) fail('SIL_BASE_NAN');
  const rawMs = now.getTime() - b;
  if (rawMs <= 0) fail('SIL_NONPOS ' + rawMs);
  let ms = rawMs, note = '';
  if (opt['jump-ms'] && opt['jump-at']) {
    const at = new Date(opt['jump-at']).getTime();
    if (Number.isNaN(at)) fail('JUMP_AT_NAN');
    const jm = Number(opt['jump-ms']);
    if (!Number.isFinite(jm)) fail('JUMP_MS');
    if (b < at && at < now.getTime()) {
      ms -= jm;
      note = '；已扣跨 ' + opt['jump-at'] + ' 那枚 ' + jm + ' ms 改钟事件（未扣原值 ' + Math.floor(rawMs / 1000).toLocaleString('en-US') + ' 秒）';
    } else note = '；本窗未跨改钟时刻，不扣';
  }
  const s = Math.floor(ms / 1000);
  SIL = Math.floor(s / 3600) + ' 小时 ' + Math.floor((s % 3600) / 60) + ' 分 ' + (s % 60) + ' 秒（' + s.toLocaleString('en-US') + ' 秒）' + note;
}
if (SIL) text = text.replace(/@@SIL@@/g, SIL);

const BS = String.fromCharCode(92), ZW = String.fromCharCode(0x200B);
const gates = [
  ['placeholder', /@@[A-Z0-9_]+@@/],
  ['approxclock', /\d{1,2}:\d{2}:\d[xX]/],
  ['approxx', /:[xX]/],
  ['drivepath', /[A-Za-z]:[\\/]/],
  ['zwsp', new RegExp(ZW)],
  ['backslash', /\\/],
  ['ipv4', /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/],
  ['doubledate', /\d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}/],
  ['doubleclock', /\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/],
];
const ctrl = {
  placeholder: 'x@@DB@@y', approxclock: '14:22:4x', approxx: 'a 15:xy b', drivepath: 'F:' + BS + 'tmp',
  zwsp: 'a' + ZW + 'b', backslash: 'a' + BS + 'b', ipv4: '8.8.8.8',
  doubledate: 'a 2026-09-27 2026-09-27 b', doubleclock: 'a 14:22:40 14:22:41 b',
};
let cp = 0;
for (const [n, re] of gates) if (!re.test(ctrl[n])) fail('CTRL_MISSING ' + n); else cp++;
// 负控（官制:1541 ① 之三，与 hb-write.mjs 同一条）：全是合法读数的样本必须穿过全部闸，咬住即闸过宽
const NEGCTRL = '轮 140 实采：起钟 19:15:25、取数 19:15:40、窗 19:17:10–19:17:24（14 秒）；' +
  '分位 min 0.733／p50 0.998／p90 1.648；静默 19 小时 53 分 38 秒（71,618 秒）；' +
  '指针 总控/官制.md 第 1539 行与 ledger-write.mjs:66；助手 3.7.3；净增 197,394 B。';
for (const [n, re] of gates) if (re.test(NEGCTRL)) fail('CTRL_FALSEPOSITIVE ' + n);
for (const [n, re] of gates) {
  let hit = re.test(text);
  if (n === 'ipv4') hit = (text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || []).filter((s) => s !== '127.0.0.1').length > 0;
  if (hit) fail('TEXT ' + n);
}

const orig = fs.readFileSync(BOOK, 'utf8');
if (!orig.endsWith('\n')) fail('BOOK_NOEOL');
const oLines = orig.replace(/\n$/, '').split('\n');
const nLines = text.split('\n');
const cnt = (arr, re) => arr.filter((l) => re.test(l)).length;
const h2b = cnt(oLines, /^## /);
const itmB = cnt(oLines, /^- \*\*件名\*\*/);
const bytesB = Buffer.byteLength(orig);
let next = null; const report = [];

if (opt.mode === 'append') {
  next = orig + text + '\n';
  report.push('mode=append lines ' + oLines.length + '->' + (oLines.length + nLines.length));
} else if (opt.mode === 'prepend-section') {
  if (!/^## /.test(nLines[0])) fail('SECTION_SHAPE（草稿首行须以 "## " 起头）');
  const first = oLines.findIndex((l) => /^## /.test(l));
  if (first < 0) fail('NO_EXISTING_SECTION');
  const prevHead = oLines[first];
  next = oLines.slice(0, first).join('\n') + '\n' + text + '\n\n' + oLines.slice(first).join('\n') + '\n';
  const chk = next.split('\n');
  if (chk[first + nLines.length + 1] !== prevHead) fail('PREV_HEAD_NOT_KEPT');
  if (chk.slice(0, first).join('\n') !== oLines.slice(0, first).join('\n')) fail('HEADER_BLOCK_CHANGED');
  report.push('mode=prepend-section prevHead_kept=true header_block_intact=true');
} else if (opt.mode === 'flip-head') {
  if (!opt.match) fail('NEED_MATCH');
  if (nLines.length !== 1) fail('FLIP_MUST_BE_ONE_LINE');
  const hits = oLines.filter((l) => l.includes(opt.match));
  if (hits.length !== 1) fail('MATCH_NOT_UNIQUE count=' + hits.length);
  const oldLine = oLines.indexOf(hits[0]);
  const cut = hits[0].indexOf(']`');
  if (cut < 0) fail('OLD_LINE_NO_HEAD_END');
  const oldBody = hits[0].slice(cut + 2);
  const newCut = nLines[0].indexOf(']`');
  if (newCut < 0) fail('NEW_LINE_NO_HEAD_END');
  if (nLines[0].slice(newCut + 2) !== oldBody) fail('BODY_CHANGED（只准改行首，正文一字不动）');
  const arr = oLines.slice();
  arr[oldLine] = nLines[0];
  next = arr.join('\n') + '\n';
  report.push('mode=flip-head line=' + (oldLine + 1) + ' body_kept=true head_old=' + JSON.stringify(hits[0].slice(0, 12)));
} else fail('MODE_UNKNOWN ' + opt.mode);

const expLines = opt.mode === 'append' ? oLines.length + nLines.length
  : opt.mode === 'prepend-section' ? oLines.length + nLines.length + 1
  : oLines.length;
const expH2 = opt.mode === 'prepend-section' ? h2b + 1 : h2b;
const expDelta = opt.mode === 'append' ? Buffer.byteLength(text) + 1
  : opt.mode === 'prepend-section' ? Buffer.byteLength(text) + 2 : null;
// 先算后写：所有断言都在内存里对 next 验过，才碰盘（第一版把断言放在写之后，实测会"先破坏再报警"）
const check = (label, s) => {
  const al = s.replace(/\n$/, '').split('\n');
  const dBytes = Buffer.byteLength(s) - bytesB;
  const diff = al.filter((l, i) => l !== oLines[i]).length;
  const r = {
    lines_ok: al.length === expLines,
    h2_ok: cnt(al, /^## /) === expH2,
    itm_ok: opt.mode === 'flip-head' ? true : cnt(al, /^- \*\*件名\*\*/) === itmB,
    pure_ok: expDelta === null ? dBytes > -1 : dBytes === expDelta,
    diff_ok: opt.mode !== 'flip-head' || diff === 1,
    bytes: Buffer.byteLength(s), delta: dBytes, diff, rounds: cnt(al, /^- \*\*件名\*\*/),
  };
  r.ok = r.lines_ok && r.h2_ok && r.itm_ok && r.pure_ok && r.diff_ok;
  if (!r.ok && label === 'pre') {
    process.stdout.write('PRE_CHECK_FAIL ' + JSON.stringify(r) + '\n');
    process.exit(3);
  }
  return r;
};
const pre = check('pre', next);
fs.writeFileSync(BOOK, next, 'utf8');
const after = fs.readFileSync(BOOK, 'utf8');
const post = check('post', after);
const ok = pre.ok && post.ok && after === next;
const aLines = after.replace(/\n$/, '').split('\n');
process.stdout.write([
  'WROTE book=' + opt.book + ' ts=' + TS + ' bytes ' + bytesB + '->' + Buffer.byteLength(after) + ' delta=' + post.delta,
  report.join(' | '),
  'pre_ok=' + pre.ok + ' post_ok=' + post.ok + ' readback_identical=' + (after === next) + ' diff_lines=' + post.diff,
  'lines ' + oLines.length + '->' + aLines.length + ' h2 ' + h2b + '->' + cnt(aLines, /^## /) + ' itm ' + itmB + '->' + post.rounds,
  'ctrl=' + cp + '/' + gates.length + ' INCR_OK=' + ok,
].join('\n') + '\n');
if (!ok) { process.stdout.write('INCR_MISMATCH\n'); process.exit(3); }
if (opt.release) {
  const lock = path.join(ROOT, '总控', '.locks', opt.lock || 'round.lock.hb');
  try {
    fs.rmSync(path.join(lock, 'owner'), { force: true });
    fs.rmdirSync(lock);
    process.stdout.write('RELEASE=ok exists_after=' + fs.existsSync(lock) + '\n');
  } catch (e) { process.stdout.write('RELEASE_FAIL ' + e.code + '\n'); }
}
