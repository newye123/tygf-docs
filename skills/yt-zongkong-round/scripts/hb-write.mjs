#!/usr/bin/env node
// hb-write.mjs — 心跳轮台账（总控/心跳.log）唯一写入口。存在理由：手搓 runner 连续五轮各犯一类错
// （正则不合法、正控样本形状不对、占位符与行内字面拼成双日期、近似钟点漏检），故把闸固化成一条命令。
// 用法：node scripts/hb-write.mjs --draft <草稿文件> --anchor "<本轮行首锚串>" [选项]
//   --sil-base <ISO>   HEAD 那笔的提交钟（如 2026-09-26T23:28:50+08:00），用于算静默时长
//   --jump-ms <N>      本机改钟事件的毫秒数（跨该刻的时长读数先减；配 --jump-at <ISO>）
//   --jump-at <ISO>    改钟发生的本地时刻
//   --sans             追加三账净增（读 总控/.round-scan.state.json 的周基线，不写死数字）
//   --release [name]   落笔同一条命令内放锁（默认 round.lock.hb）
//   --root <path>      仓库根（默认取 --draft 所在盘？不：默认 F 盘工程根，可覆盖）
// 退出码：0 成功；3 任一闸拦下（不写盘）。
// 近似钟点两道闸的正则原式（2026-09-27 由官制.md:1541 第① 条之三要求写在这里，配可复跑负控）：
//   approxclock = /\d{1,2}:\d{2}:\d[xX]/   拦"末位写成 x"的半缩写形（例：14:22:4x）
//   approxx     = /:[xX]/                  拦"冒号后紧跟 x 或 X"的整体缩写的形（例：19:xx）——第 9 道闸
// 两道都只作用于"将要写进台账的正文"，命中即 exit 3 拒写；禁止靠删钟点过闸（缺钟点比近似钟点更坏，
// 官制:1541 ① 之一）。引用别手行内的该形时按"只描形状、不拄字面"改写，不得为过闸放宽判据（① 之二）。
// 负控 NEGCTRL（① 之三）：含合法读数串（秒级时间、分位小数、文件:行号 式指针）的样本必须穿过全部闸，
// 任一闸咬住它即 CTRL_FALSEPOSITIVE 退出——不可复跑的闸等于没有闸。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
const LED = path.join(ROOT, '总控', '心跳.log');
const fail = m => { process.stdout.write('GATE_BLOCK ' + m + '\n'); process.exit(3); };

const d = new Date();
if (d.getTimezoneOffset() !== -480) fail('TZ offset=' + d.getTimezoneOffset());
const p2 = n => String(n).padStart(2, '0');
const TS = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
  p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());

let text = '';
if (opt.draft) {
  if (!fs.existsSync(opt.draft)) fail('DRAFT_MISSING ' + opt.draft);
  text = fs.readFileSync(opt.draft, 'utf8').replace(/\s+$/, '');
} else if (opt.lint) {
  text = '';  // lint 模式：只检文件、永不写盘，正文不必读进台账流程
} else {
  fail('NO_DRAFT');
}
// 双日期／双钟点自检（占位符展开后会撞行内字面）
const dbl = [/\d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}/, /\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/];

let SIL = '';
if (opt['sil-base']) {
  const b = new Date(opt['sil-base']).getTime();
  if (Number.isNaN(b)) fail('SIL_BASE_NAN');
  const rawMs = d.getTime() - b;
  if (rawMs <= 0) fail('SIL_NONPOS ' + rawMs);
  let ms = rawMs;
  let note = '';
  if (opt['jump-ms'] && opt['jump-at']) {
    const at = new Date(opt['jump-at']).getTime();
    if (Number.isNaN(at)) fail('JUMP_AT_NAN');
    const jm = Number(opt['jump-ms']);
    if (!Number.isFinite(jm)) fail('JUMP_MS ' + opt['jump-ms']);
    if (b < at && at < d.getTime()) {
      ms -= jm;
      note = '；已扣跨 ' + opt['jump-at'] + ' 那枚 ' + jm + ' ms 改钟事件（未扣原值 ' + Math.floor(rawMs / 1000).toLocaleString('en-US') + ' 秒）';
    } else note = '；本窗未跨改钟时刻，不扣';
  }
  const s = Math.floor(ms / 1000);
  SIL = Math.floor(s / 3600) + ' 小时 ' + Math.floor((s % 3600) / 60) + ' 分 ' + (s % 60) + ' 秒（' +
    s.toLocaleString('en-US') + ' 秒）' + note;
}
let SANS = '';
let INO = '';
if (opt.inodes) {
  // F-056 ⑧：把"活册 inode 有没有被换过"折进轮次行自证——birth 与 mtime 同屏，谁整册替换一眼可辨
  const books = ['官制.md', '待投递指令.md', '待复验队列.md', '发布进展.md', '心跳.log'];
  const f = (dt) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(dt);
  let imp = 0;
  const parts = books.map((n) => {
    const st = fs.statSync(path.join(ROOT, '总控', n));
    const bad = st.mtimeMs < st.birthtimeMs;
    if (bad) imp++;
    return n.replace(/\.(md|log)$/, '') + ' bt' + f(st.birthtime) + ' mt' + f(st.mtime) + (bad ? ' IMPOSSIBLE' : '');
  });
  INO = parts.join('；') + '；mtime<birth 命中＝' + imp + '/' + books.length;
}
if (opt.sans) {
  const st = JSON.parse(fs.readFileSync(path.join(ROOT, '总控', '.round-scan.state.json'), 'utf8'));
  const wk = new Date(st.weekStart); const mon = new Date(wk.getFullYear(), wk.getMonth(), wk.getDate());
  mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  let total = 0; const parts = [];
  for (const [name, base] of Object.entries(st.baseline)) {
    const s = fs.statSync(path.join(ROOT, '总控', name)).size;
    total += s - base; parts.push((s - base).toLocaleString('en-US') + '（' + name + '）');
  }
  SANS = parts.join('＋') + '＝' + total.toLocaleString('en-US') + ' B（周基线取自 .round-scan.state.json，' +
    (d.getTime() < mon.getTime() ? '注意：基线周已过，应以最新扫盘为准' : '本周起点 ' + mon.getFullYear() + '-' + p2(mon.getMonth() + 1) + '-' + p2(mon.getDate())) + '）';
}
text = text.replace(/@@TS@@/g, TS);
// 只替换"确有值"的占位符：漏给选项时留下 @@XXX@@ 原文，让 placeholder 闸拦下，而不是悄悄写成空串
if (SIL) text = text.replace(/@@SIL@@/g, SIL);
if (SANS) text = text.replace(/@@SANS@@/g, SANS);
if (INO) text = text.replace(/@@INO@@/g, INO);

const BS = String.fromCharCode(92), ZW = String.fromCharCode(0x200B);
const gates = [
  ['placeholder', /@@[A-Z0-9_]+@@/],
  ['approxclock', /\d{1,2}:\d{2}:\d[xX]/],
  ['approxx', /:[xX]/],
  ['drivepath', /[A-Za-z]:[\\/]/],
  ['zwsp', new RegExp(ZW)],
  ['backslash', /\\/],
  ['ipv4', /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/],
  ['doubledate', dbl[0]],
  ['doubleclock', dbl[1]],
];
const ctrl = {
  placeholder: 'x@@DB@@y', approxclock: '14:22:4x', approxx: 'a 15:xy b', drivepath: 'F:' + BS + 'tmp',
  zwsp: 'a' + ZW + 'b', backslash: 'a' + BS + 'b', ipv4: '8.8.8.8',
  doubledate: 'a 2026-09-27 2026-09-27 b', doubleclock: 'a 14:22:40 14:22:41 b',
};
let cp = 0;
for (const [n, re] of gates) if (!re.test(ctrl[n])) fail('CTRL_MISSING ' + n); else cp++;
if (/\b127\.0\.0\.1\b/.test('x')) fail('CTRL_SHAPE');
// 负控（官制:1541 ① 之三）：一枚"全是合法读数"的样本必须穿过全部九闸；咬住即闸过宽，当场自杀
const NEGCTRL = '轮 140 实采：起钟 19:15:25、扫盘 rc=0 取数 19:15:40、探针窗 19:17:10–19:17:24（14 秒）；' +
  '分位 min 0.733／p50 0.998／p90 1.648／max 1.648 秒；静默 19 小时 53 分 38 秒（71,618 秒）；' +
  '指针 总控/官制.md 第 1539 行与 hb-write.mjs:104；助手 3.7.3、包名尾缀 d3hop；净增 197,394 B。';
for (const [n, re] of gates) if (re.test(NEGCTRL)) fail('CTRL_FALSEPOSITIVE ' + n);
// --lint <file>：把九闸套到"要发进别的会话的正文"上，只检不写（聊天 prompt 不过写盘闸＝不对称漏口，2026-09-27 轮 143 实测）
// 适用面（轮 145 实测补明）：lint 只用于**不含待展开占位符**的外发正文；台账草稿直喂 lint 必报 placeholder
// 命中（草稿里的双井号串就是要给本脚本展开的），那不是草稿坏了——台账正文由写盘前的同一套闸把关（先展开再过闸）。
if (opt.lint) {
  if (!fs.existsSync(opt.lint)) fail('LINT_MISSING ' + opt.lint);
  const t = fs.readFileSync(opt.lint, 'utf8');
  const hits = [];
  for (const [n, re] of gates) {
    let hit = re.test(t);
    if (n === 'ipv4') hit = (t.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || []).filter((s) => s !== '127.0.0.1').length > 0;
    // 1553 第② 条：含占位符的输入报专用闸名，别让下一只手把它读成"草稿坏了"（那是设计内形状）
    if (hit) hits.push(n === 'placeholder' ? 'PLACEHOLDER_INBOUND' : n);
  }
  process.stdout.write('LINT file=' + path.basename(opt.lint) + ' bytes=' + Buffer.byteLength(t) +
    ' ctrl=' + cp + '/' + gates.length + ' hits=' + (hits.length ? hits.join(',') : '0') + '\n');
  process.exit(hits.length ? 3 : 0);
}
for (const [n, re] of gates) {
  let hit = re.test(text);
  if (n === 'ipv4') {
    const m = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || [];
    hit = m.filter(s => s !== '127.0.0.1').length > 0;
  }
  if (hit) fail('TEXT ' + n);
}
if (!opt.anchor) fail('NO_ANCHOR');
if (!text.includes(opt.anchor)) fail('ANCHOR_NOT_IN_NEW');
const cur = fs.readFileSync(LED, 'utf8');
if (cur.includes(opt.anchor)) fail('DUP_ANCHOR');
if (!cur.endsWith('\n')) fail('LED_NOEOL');
const isNote = !!opt.note;
if (isNote) {
  if (!/^- \*\*心跳\d/.test(text)) fail('NOTE_SHAPE（须以"- **心跳NNN·…"开头，不得占轮次行首）');
  if (/^- \*\*心跳轮 /.test(text)) fail('NOTE_IS_ROUND_ROW');
} else if (!/^- \*\*心跳轮 \d+（\d{4}-\d{2}-\d{2}/.test(text)) {
  fail('ROW_SHAPE（轮次行须以"- **心跳轮 N（YYYY-MM-DD"起头，轮号必带日期）');
}
const before = (cur.match(/^- \*\*心跳轮 /gm) || []).length;
const preSize = Buffer.byteLength(cur);
fs.appendFileSync(LED, text + '\n', 'utf8');
const after = fs.readFileSync(LED, 'utf8');
const nowRounds = (after.match(/^- \*\*心跳轮 /gm) || []).length;
const nowAll = (after.match(/^- \*\*心跳/gm) || []).length;
const nowSize = Buffer.byteLength(after);
const ok = isNote
  ? (nowRounds === before && (nowSize - preSize) === Buffer.byteLength(text + '\n'))
  : (nowRounds === before + 1 && (nowSize - preSize) === Buffer.byteLength(text + '\n'));
const out = [(isNote ? 'NOTE_WROTE' : 'WROTE') + ' ts=' + TS, 'roundRows ' + before + '->' + nowRounds + ' 心跳rows->' + nowAll,
  'size ' + preSize + '->' + nowSize + ' delta=' + (nowSize - preSize),
  'thisline_B=' + Buffer.byteLength(text), 'INCR_OK=' + ok, 'ctrl=' + cp + '/' + gates.length];
if (SIL) out.push('sil=' + SIL);
if (SANS) out.push('sans=' + SANS);
if (INO) out.push('ino=' + INO);
let releaseLine = 'RELEASE=skipped';
if (ok && opt.release) {
  const lock = path.join(ROOT, '总控', '.locks', opt.lock || 'round.lock.hb');
  try {
    fs.rmSync(path.join(lock, 'owner'), { force: true });
    fs.rmdirSync(lock);
    releaseLine = 'RELEASE=ok exists_after=' + fs.existsSync(lock);
  } catch (e) { releaseLine = 'RELEASE_FAIL ' + e.code; }
}
out.push(releaseLine);
process.stdout.write(out.join('\n') + '\n');
if (!ok) fail('INCR_MISMATCH');
