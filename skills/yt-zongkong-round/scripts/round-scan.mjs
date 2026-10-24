#!/usr/bin/env node
/**
 * 总控轮次 · 只读扫盘（yt-zongkong-round 第 1 步）
 * 用法：node scripts/round-scan.mjs [--since "YYYY-MM-DD HH:MM"] [--sites] [--root <path>] [--no-state] [--self-test]
 * 纪律：除自家状态文件外零写入、零网络写、不连库。站端读数只在 --sites 时发 GET（curl：本机 node fetch 不通）。
 * 写面（2026-09-26 三项统计追加）：只写 `总控/.round-scan.state.json` 一个文件，且只存三账字节基线；
 * 三账本体（官制／待投递指令／待复验队列）是**只读解析对象＝机器契约**，本脚本一律不改。
 * 加 --no-state 可完全只读跑（御史台复验用：不留任何写入痕迹）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const ROOT = path.resolve(opt('root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')));
const ZK = path.join(ROOT, '总控');
const DEV = path.join(ROOT, 'worktrees', 'develop');
/** 本地日（00:00–07:59 之间用 toISOString 会取到"昨天"，本仓日报册按本地日开册） */
const localDay = (offsetDays = 0, sep = '-') => {
  const d = new Date(Date.now() - offsetDays * 864e5), p = (n) => String(n).padStart(2, '0');
  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate())].join(sep);
};
const SINCE = opt('since', localDay() + ' 00:00');
// 15:1x 修（心跳轮 14 追加更正）：旧实现只吃 "YYYY-MM-DD HH:MM"（硬拼 ':00+08:00'），
// 传带秒的 "HH:MM:SS" 会拼成非法串 ⇒ NaN ⇒ `mtime >= NaN` 恒假 ⇒ 静默印成 (none)，
// 会把"没人交件"造成长期默静假账。现在 HH:MM 与 HH:MM:SS 都吃；解析不出即非零退并打印用法。
const sinceMs = (s) => {
  const parts = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!parts) return NaN;
  const [, y, mo, d, hh, mm, ss] = parts;
  return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss || '00'}+08:00`).getTime();
};
const SINCE_MS = sinceMs(SINCE);
if (!Number.isFinite(SINCE_MS)) {
  console.error(`[round-scan] --since 参数格式错（要 "YYYY-MM-DD HH:MM" 或 "YYYY-MM-DD HH:MM:SS"），收到：${SINCE}`);
  process.exit(2);
}

const pad = (s, n) => String(s).padEnd(n);
const sha7 = (s) => String(s || '').slice(0, 7);
/** 一律本地时区（本仓踩过：源站 CST／助手日志 UTC，差整 8 小时，用 UTC 显示会读错钟点） */
const shortDate = (ms) => {
  const d = new Date(ms), p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const L = (title, lines) => {
  console.log(`\n[${title}]`);
  const arr = Array.isArray(lines) ? lines : [String(lines)];
  (arr.length ? arr : ['(none)']).forEach((l) => console.log('  ' + l));
};

function git(args, cwd) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 60000 });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function st(p) {
  try {
    const s = fs.statSync(p);
    return { ok: true, dir: s.isDirectory(), size: s.size, mtime: s.mtimeMs };
  } catch { return { ok: false }; }
}
function walkFiles(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

/* ===== 三项统计的公共件（2026-09-26 追加·EXEC-SCAN-3STAT） ===== */
/** 三账＝净增配额对象；行首标记族与任务书目录都从这里取，别处不许另立口径 */
const ACCTS = ['官制.md', '待投递指令.md', '待复验队列.md'];
const NET_QUOTA = 30000;   // 令三甲-2「净增 ≤30 KB/周」；本脚本按 30,000 B 取严
const BOOK_QUOTA = 7;      // 令三甲-2「每周新签任务书 ≤7」
const STATE_PATH = path.join(ZK, '.round-scan.state.json');
const NO_STATE = flag('no-state');

/** 本地周一 00:00（周起点唯一口径；周中判定一律以此毫秒对表，不用"7 天内"这种滑动窗） */
function weekStartMs(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
/** 与 `awk 'END{print NR}'` 同形的行数（文件以换行结尾时 split 会多出一空元素） */
function awkLines(text) {
  if (!text.length) return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}
/** 任务书文件名里最后一段 YYYYMMDD＝落单日；无日期段返回 null（不猜） */
function nameDateMs(file) {
  const ds = file.match(/(20\d{6})/g);
  if (!ds) return null;
  const s = ds[ds.length - 1];
  const t = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00+08:00`).getTime();
  return Number.isFinite(t) ? t : null;
}
/** 行首标记族＝`- `X`[<token>` 里的 token（截到 · ] 空格 为止）；X 为反引号或任意单字符 */
function rowHeadToken(line) {
  const m = /^- .\[([^\]·\s`]+)/.exec(line);
  return m ? m[1] : null;
}
/** 行首合法五形＝`总控/官制.md:1285`（16:5x 定为五形，不新增第六形）；本脚本认形不认号 */
const VOCAB_ALL = ['待投', '已投', '已派', '已办', '销', '作废'];
/** 官制:1285 硬禁令：数 `[待投` 行首＝0 不得当"队列没有未派事项"的判据 ⇒ 同拍必跑这条短语探针 */
const PHRASE_RE = /(请总控长|择机派|待拍|请派|待派)/;
/** 表外但明显未结的旧形（词汇表对 100+ 历史行首无追溯力，本脚本如实单列、不并入五形） */
const LEGACY_OPEN = ['暂缓', '核'];

/** ③ 队列行首族计数（旧实现只认 `[待投`，暂缓／核／销 与"短语型未派活路"全不可见） */
function queueFamilies(dqLines) {
  const vocab = {};
  VOCAB_ALL.forEach((v) => { vocab[v] = 0; });
  const outside = new Map();
  const open = [], held = [], phrase = [];
  let heads = 0;
  dqLines.forEach((l, i) => {
    if (PHRASE_RE.test(l)) phrase.push(`:${i + 1} ${l.slice(0, 84)}…`);
    const t = rowHeadToken(l);
    if (!t) return;
    heads++;
    const hit = VOCAB_ALL.find((v) => t.startsWith(v));
    if (hit) {
      vocab[hit]++;
      if (hit === '待投') open.push(`:${i + 1} ${l.slice(0, 84)}…`);
    } else {
      outside.set(t, (outside.get(t) || 0) + 1);
      if (LEGACY_OPEN.some((v) => t.startsWith(v))) held.push(`:${i + 1} [${t}] ${l.slice(0, 84)}…`);
    }
  });
  const daifu = dqLines.filter((l) => /^- .\[待投/.test(l)).length;
  const outsideRows = [...outside.values()].reduce((a, b) => a + b, 0);
  return { vocab, outside, outsideRows, heads, open, held, phrase, daifu };
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return null; }
}
function writeState(s) {
  if (NO_STATE) return 'skipped(--no-state)';
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(s) + '\n', 'utf8');
    return 'written';
  } catch (e) {
    return 'FAIL ' + String(e.message).slice(0, 60);
  }
}

/** ① 三账净增：首跑（无状态或换周）只落基线不判红；此后按基线算净增并判配额 */
function accountDelta(cur, st0, wStart) {
  const fresh = !st0 || st0.weekStart !== wStart || !st0.baseline;
  if (fresh) {
    const next = { weekStart: wStart, baseline: cur, lastSeen: cur, updatedAt: new Date().toISOString(), reason: !st0 ? 'first-run' : (st0.weekStart !== wStart ? 'new-week' : 'no-baseline') };
    return { fresh, rows: [], total: 0, verdict: 'BASELINE（首跑/换周只落基线，不判红）', next };
  }
  let total = 0, missing = 0;
  const gBase = [], gCur = [], gDiff = [];
  const rows = ACCTS.map((f) => {
    const b = st0.baseline[f], c = cur[f];
    if (typeof b !== 'number' || typeof c !== 'number') {
      missing++; gBase.push('缺'); gCur.push('缺'); gDiff.push('缺');
      return `${pad(f, 14)} 基线或现值缺档 ⇒ 不计`;
    }
    const d = c - b;
    gBase.push(b); gCur.push(c); gDiff.push(d);
    total += Math.max(d, 0); // 净增只累计正向增长（瘦身不冲抵别人的增量，否则周中一改就把敞口抹平）
    return `${pad(f, 14)} 基线=${b} 现=${c} 净增=${d >= 0 ? '+' : ''}${d}`;
  });
  // 四组同拍＋余额（官制.md:1563 ②：采纳"扫盘直接印距配额余额"，验收式＝同拍打四组数且与手算一致；
  // 负控＝任一册缺失或读不到时报错退出、**不许印 0**——0 会被下游读成"没增长"）
  const balance = NET_QUOTA - total;
  const verdict = total > NET_QUOTA ? `OVER ⇒ 按令三甲-2 应冻结新签发` : `OK（未超 ${NET_QUOTA} B）`;
  return { fresh, rows, total, verdict, missing, balance, gBase, gCur, gDiff, err: missing > 0, next: { ...st0, lastSeen: cur, updatedAt: new Date().toISOString() } };
}

/** ② 本周新签任务书：主口径＝birth time；旁核＝文件名落单日；mtime 明确不用（修订会刷新） */
function newBooks(bookFiles, wStart) {
  let birth = 0, named = 0, noNameDate = 0, noBirth = 0;
  for (const f of bookFiles) {
    let b = null;
    try { b = fs.statSync(path.join(ZK, f)).birthtimeMs; } catch {}
    if (Number.isFinite(b) && b > 0) { if (b >= wStart) birth++; } else noBirth++;
    const nd = nameDateMs(f);
    if (nd === null) noNameDate++;
    else if (nd >= wStart) named++;
  }
  return { birth, named, noBirth, noNameDate, agree: birth === named };
}

/** --self-test：①的算术用内存夹具过一遍（不碰三账、不写状态文件），含正负两侧 */
function selfTest() {
  const cases = [
    { name: '首跑无状态', st0: null, cur: { '官制.md': 100, '待投递指令.md': 200, '待复验队列.md': 300 }, want: 'BASELINE' },
    { name: '换周', st0: { weekStart: 1, baseline: { '官制.md': 1, '待投递指令.md': 1, '待复验队列.md': 1 } }, cur: { '官制.md': 100, '待投递指令.md': 200, '待复验队列.md': 300 }, want: 'BASELINE' },
    { name: '同周净增 400', st0: { weekStart: 7, baseline: { '官制.md': 100, '待投递指令.md': 200, '待复验队列.md': 300 } }, cur: { '官制.md': 300, '待投递指令.md': 300, '待复验队列.md': 400 }, want: 'total=400' },
    { name: '同周超配额', st0: { weekStart: 7, baseline: { '官制.md': 0, '待投递指令.md': 0, '待复验队列.md': 0 } }, cur: { '官制.md': 20000, '待投递指令.md': 20000, '待复验队列.md': 0 }, want: 'total=40000 OVER' },
    { name: '瘦身不冲抵', st0: { weekStart: 7, baseline: { '官制.md': 1000, '待投递指令.md': 0, '待复验队列.md': 0 } }, cur: { '官制.md': 0, '待投递指令.md': 900, '待复验队列.md': 0 }, want: 'total=900' },
    { name: '缺档不计且置错', st0: { weekStart: 7, baseline: { '官制.md': 1000 } }, cur: { '官制.md': 1200, '待投递指令.md': 5, '待复验队列.md': 5 }, want: 'total=200 missing=2 err' },
    { name: '四组与余额一致', st0: { weekStart: 7, baseline: { '官制.md': 100, '待投递指令.md': 200, '待复验队列.md': 300 } }, cur: { '官制.md': 300, '待投递指令.md': 300, '待复验队列.md': 400 }, want: 'total=400 balance=29600 groups=ok' },
  ];
  let pass = 0;
  for (const c of cases) {
    const r = accountDelta(c.cur, c.st0, 7);
    const groupsOk = r.fresh || (r.gBase.length === ACCTS.length && r.gCur.length === ACCTS.length && r.gDiff.length === ACCTS.length && r.balance === NET_QUOTA - r.total);
    const got = r.fresh ? r.verdict : `total=${r.total}` + (r.missing ? ` missing=${r.missing}` : '') + (r.err ? ' err' : '') + (r.verdict.startsWith('OVER') ? ' OVER' : '') + ` balance=${r.balance}` + ` groups=${groupsOk ? 'ok' : 'bad'}`;
    const ok = got.includes(c.want);
    if (ok) pass++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${pad(c.name, 14)} want=${c.want} got=${got}`);
  }
  const lineCases = [['a\nb\n', 2], ['a\nb', 2], ['', 0], ['x', 1]];
  let lpass = 0;
  for (const [t, want] of lineCases) if (awkLines(t) === want) lpass++;
  console.log(`  ${lpass === lineCases.length ? 'PASS' : 'FAIL'} awkLines 同形 want=4 got=${lpass}`);
  console.log(`self-test ${pass}/${cases.length} ＋行数同形 ${lpass}/${lineCases.length}`);
  process.exit(pass === cases.length && lpass === lineCases.length ? 0 : 1);
}
if (flag('self-test')) selfTest();

console.log(`ZK-SCAN v2（＋三项统计）  T=${new Date().toString().replace(/\s+\(.*\)$/, '')}`);
console.log(`ROOT=${ROOT}\nSINCE=${SINCE}`);

/* 1. 锁 */
const locksDir = path.join(ZK, '.locks');
const mainLock = st(path.join(locksDir, 'round.lock'));
const nightLock = st(path.join(locksDir, 'round.lock.night'));
L('locks', [
  `mainline round.lock = ${mainLock.ok ? (mainLock.dir ? 'HELD(dir mtime ' + shortDate(mainLock.mtime) + ')' : 'present') : 'absent'}  ← 本链禁止触碰`,
  `round.lock.night    = ${nightLock.ok ? (nightLock.dir ? 'HELD(dir mtime ' + shortDate(nightLock.mtime) + ')' : 'present') : 'free ⇒ 本轮可 mkdir 抢得'}`,
]);

/* 2. develop 树现场 */
const head = git(['rev-parse', '--short', 'HEAD'], DEV);
const headWhen = git(['log', '-1', '--date=format:%m-%d %H:%M:%S', '--format=%h %ad'], DEV);
const porc = git(['status', '--porcelain'], DEV);
const porcLines = porc.out ? porc.out.split('\n') : [];
const numstat = git(['diff', '--numstat'], DEV);
const mergedSince = git(['log', '--since=' + SINCE, '--oneline'], DEV);
L('develop tree', [
  `HEAD=${head.out || '?'}  last=${headWhen.out || '?'}  (取数 ${new Date().toTimeString().slice(0, 8)})`,
  `porcelain=${porcLines.length}`,
  ...porcLines.map((l) => '  · ' + l),
  `numstat: ${(numstat.out || '(no diff)').split('\n').join(' | ')}`,
  `新合入 since ${SINCE} = ${mergedSince.out ? mergedSince.out.split('\n').length : 0} 笔`,
  ...(mergedSince.out ? mergedSince.out.split('\n').map((l) => '  · ' + l) : []),
]);
const unpushed = git(['rev-list', '--count', 'origin/main..HEAD'], DEV);
const remoteRef = git(['log', '-1', '--date=format:%m-%d %H:%M', '--format=%h %ad', 'origin/main'], DEV);
L('push 面(本地 ref，不联网)', [
  `origin/main = ${remoteRef.out || '?'}`,
  `origin/main..HEAD = ${unpushed.code === 0 ? unpushed.out : 'rc=' + unpushed.code + ' ' + unpushed.err}`,
]);

/* 3. 总控关键件 */
const keyFiles = ['官制.md', '发布进展.md', '待投递指令.md', '待复验队列.md',
  `日报_${localDay(0, '')}.md`, `日报_${localDay(1, '')}.md`];
const kLines = keyFiles.map((f) => {
  const s = st(path.join(ZK, f));
  return s.ok ? `${pad(f, 26)} ${pad(s.size, 8)} ${shortDate(s.mtime)}` : `${pad(f, 26)} MISSING`;
});
const qPath = path.join(ZK, '待复验队列.md');
let qCount = 'n/a', qLines = 'n/a';
if (st(qPath).ok) {
  const q = fs.readFileSync(qPath, 'utf8');
  qCount = (q.match(/^- \*\*件名\*\*/gm) || []).length;
  qLines = awkLines(q);
}
/** 官制行数（对表 `awk 'END{print NR}' 总控/官制.md`；净增与行号引用都靠它） */
const gzPath = path.join(ZK, '官制.md');
const gzLines = st(gzPath).ok ? awkLines(fs.readFileSync(gzPath, 'utf8')) : 'MISSING';
L('总控 key files', [...kLines, `待复验队列 件名条目=${qCount} 行数=${qLines}`, `官制.md 行数=${gzLines}`]);

/* 4. 待投队列开放项（③盲区修复：旧实现只认 `[待投`，暂缓／核／销 一律不可见） */
const dqPath = path.join(ZK, '待投递指令.md');
const dqLines = st(dqPath).ok ? fs.readFileSync(dqPath, 'utf8').split('\n') : [];
const qf = queueFamilies(dqLines);
const vocabLine = VOCAB_ALL.map((v) => `${v}=${qf.vocab[v]}`).join('／');
L('待投递指令 开放项（③盲区修复＝五形＋短语探针，对表 官制.md:1285）', [
  `合法五形行首：${vocabLine}  （行首总数=${qf.heads}，表外旧形种数=${qf.outside.size}／${qf.outsideRows} 行 ⇒ 词汇表对历史行首无追溯力，如实计数不判红）`,
  `待投(未投出)=${qf.daifu}  ← 对表式：grep -c '^- .\\[待投' 总控/待投递指令.md`,
  `短语探针(请总控长|择机派|待拍|请派|待派)=${qf.phrase.length}  ← 对表式：grep -c -E '请总控长|择机派|待拍|请派|待派' 总控/待投递指令.md`,
  qf.daifu !== qf.phrase.length
    ? `⚠ 两数不等（${qf.daifu} ≠ ${qf.phrase.length}）⇒ 按官制:1285 硬禁令，**不得**据行首判"队列无未派事项"，须逐行读下列短语行`
    : `两数相等（本轮无"短语型活路"漏在行首之外）`,
  `表外未结形（暂缓／核）=${qf.held.length} 行`,
  ...qf.open,
  ...qf.held,
  ...qf.phrase,
]);

/* 5. 回收目录新交付 */
const days = [localDay(0), localDay(1)].map((d) => '回收_' + d.replace(/-/g, ''));
const fresh = [];
for (const d of [...days, '功能普查']) {
  for (const f of walkFiles(path.join(ZK, d))) {
    const s = st(f);
// 白名单含 log（22:4x 追加）：读数件常以 .log 成交（NEGCTRL／LOG-REDACTION 两枚因此对扫盘不可见 ⇒ 连轮误判"未交件"）
    if (s.ok && s.mtime >= SINCE_MS && /\.(md|patch|txt|json|jsonl|cjs|mjs|log)$/i.test(f)) {
      fresh.push(`${shortDate(s.mtime)}  ${pad(s.size, 8)} ${path.relative(ZK, f).replace(/\\/g, '/')}`);
    }
  }
}
fresh.sort();
L(`新交付 since ${SINCE}`, fresh.map((l) => l));

/* 6. 两站 provenance（可选，只读 GET） */
if (flag('sites')) {
  const sites = [['test', 'https://test.tuyigf.com/api/runtime-provenance'], ['prod', 'https://tuyigf.com/api/runtime-provenance']];
  const rows = sites.map(([name, url]) => {
    try {
      const out = execFileSync('curl', ['-sS', '-m', '15', url], { encoding: 'utf8', timeout: 20000 }).trim();
      let j = null; try { j = JSON.parse(out); } catch {}
      /** 实测形状：字段嵌在 provenance 下，顶层只有 ok（08:50 curl 核实）；取不到字段就如实报 RAW，不猜键 */
      const p = j && j.provenance ? j.provenance : j;
      const body = p
        ? `ok=${j.ok} env=${p.environment} status=${p.status} web=${sha7(p.webCommitSha)} assistant=${p.expectedAssistantVersion} build=${p.expectedAssistantBuildId}`
        : out.slice(0, 160);
      return `${pad(name, 6)} ok(${p ? 'JSON' : 'RAW'}) ${body}`;
    } catch (e) { return `${pad(name, 6)} CURL_FAIL ${String(e.message).slice(0, 90)}`; }
  });
  L('sites provenance (read-only GET)', rows);
} else L('sites provenance', ['跳过（加 --sites 才发只读 GET）']);

/* 7. ①三账净增字节（令三甲-2 配额；首跑只落基线不判红） */
const W_START = weekStartMs();
const curSizes = {};
for (const f of ACCTS) { const s = st(path.join(ZK, f)); curSizes[f] = s.ok ? s.size : null; }
const st0 = readState();
const ad = accountDelta(curSizes, st0, W_START);
const stWrite = writeState(ad.next);
L('三账净增字节（周口径＝本地周一 00:00）', [
  `本周起点=${shortDate(W_START)}（+08 本地）  状态文件=${path.basename(STATE_PATH)} 本轮=${stWrite}`,
  ad.fresh
    ? `首跑/换周 ⇒ 只落基线：${ACCTS.map((f) => `${f}=${curSizes[f]}`).join(' ')} ⇒ 净增判定从下一拍起生效（本行不判红）`
    : ad.rows.join('\n  ') + `\n  净增合计=${ad.total} B / 周配额=${NET_QUOTA} B ⇒ ${ad.verdict}` + (ad.missing ? `  （缺档 ${ad.missing} 项未计）` : ''),
  !ad.fresh ? `四组同拍（序＝${ACCTS.join('／')}）基线=[${ad.gBase.join(', ')}] 现值=[${ad.gCur.join(', ')}] 差额=[${ad.gDiff.join(', ')}] 余额=${ad.balance} B` : '',
  !ad.fresh && ad.err ? `ACCT_ERROR 三账有 ${ad.missing} 项读不到 ⇒ 余额与合计不可信，**不印 0**；本拍退出码置 1（负控形状，见本文件配额段注释）` : '',
  st0 && !ad.fresh ? `  基线建于 ${st0.updatedAt || '?'}（状态旧于本轮属正常；换周自动重落基线）` : '',
].filter(Boolean));
if (!ad.fresh && ad.err) process.exitCode = 1;

/* 8. ②本周新签任务书（禁用 mtime；主口径 birth time，旁核＝文件名落单日） */
const bookFiles = fs.readdirSync(ZK).filter((f) => /^任务书_.*\.md$/.test(f) && st(path.join(ZK, f)).ok && !st(path.join(ZK, f)).dir);
const nb = newBooks(bookFiles, W_START);
L('本周新签任务书（对表 find 总控 -maxdepth 1 -name 任务书_*.md | wc -l）', [
  `总数=${bookFiles.length}（maxdepth 1 同形）`,
  `新签（主口径 birth time）=${nb.birth}  旁核（文件名落单日）=${nb.named}  ${nb.agree ? '两口径同值' : `两口径差 ${Math.abs(nb.birth - nb.named)} ⇒ 以主口径为准，差值待门下省判（birth 反映"本机建档时刻"，文件名反映"落单笔上的日期"）`}`,
  nb.noBirth || nb.noNameDate ? `  无法判定：无 birth=${nb.noBirth} 文件名无日期段=${nb.noNameDate}（不猜、不计入）` : '',
  `周配额=${BOOK_QUOTA} ⇒ ${nb.birth > BOOK_QUOTA ? `OVER（超 ${nb.birth - BOOK_QUOTA}）⇒ 按令三甲-2 应冻结新签发，Owner 一票阀除外` : 'OK'}`,
  `  mtime 明确不用：本周被修订刷新的任务书=${bookFiles.filter((f) => st(path.join(ZK, f)).mtime >= W_START).length} 枚（全量口径，含历史件被改动）⇒ 用它数新签必然虚高`,
].filter(Boolean));

L('tmp', `探针与草稿一律外置：${os.tmpdir()}`);
