// delivery-verify.cjs — 检发同源第 (iv) 步的可复跑取证器（心跳载体自建工具，只读、零写盘）
// 存在理由：官制.md:1553 ① 定死四步（落盘→对该文件 lint→投递→取回逐字节比）；第 (iv) 步此前每拍手搓
//   一次性脚本，五轮五类错（正则被 shell 吃掉、按 mtime 取错会话文件、把筛出的行当证据）。沉成一件工具。
// 用法：node delivery-verify.cjs --needle "<正文里独有的长串>" --sid <接收会话前8位> --file <定稿文件>
//          [--must "<第二条独有串>"]  [--transcript <自己的 jsonl 路径>]
// 缺省转录＝本仓 F-------------- 目录下 155472f8 开头那个 .jsonl（载体自己的会话；**不按 mtime 取最新**，
//   外发后最新那份往往是接收方的，里面搜不到我的正文——见记忆第 113 条）。
// 输出：MATCHES／IDX／折算本地钟／identical／sent_bytes／linted_bytes／first_diff_at＋两侧上下文
// 退出码：0＝identical=true；3＝检过 A 发的是 B（须当场补投并再跑本器）；1＝没取到记录或参数缺（不算通过）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2);
  if (argv[i + 1] && !argv[i + 1].startsWith('--')) opt[k] = argv[++i]; else opt[k] = true;
}
const fail = (m) => { process.stdout.write('VERIFY_FAIL ' + m + '\n'); process.exit(1); };
if (!opt.needle || !opt.sid || !opt.file) fail('ARGS_NEED needle/sid/file');
const TR = opt.transcript || 'C:/Users/ivan/.qoder-cn/projects/F--------------/155472f8-c766-442e-a257-5f7d74697771.jsonl';
if (!fs.existsSync(TR)) fail('TRANSCRIPT_MISSING');
if (!fs.existsSync(opt.file)) fail('FILE_MISSING ' + opt.file);

const lines = fs.readFileSync(TR, 'utf8').split(/\n/).filter(Boolean);
let picked = null, count = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (!l.includes(opt.needle)) continue;
  let o;
  try { o = JSON.parse(l); } catch { continue; }
  const c = o.message && o.message.content;
  if (!Array.isArray(c)) continue;
  for (const x of c) {
    if (x.type !== 'tool_use' || !/mcp_call/.test(x.name || '')) continue;
    const tn = (x.input && x.input.toolName) || '';
    if (!/send_message/.test(tn)) continue;
    const a = (x.input && x.input.arguments) || {};
    if (!a.sessionId || !a.sessionId.startsWith(opt.sid)) continue;
    if (!a.prompt || !a.prompt.includes(opt.needle)) continue;
    if (opt.must && !a.prompt.includes(String(opt.must))) continue;
    count++;
    picked = { i, ts: o.timestamp, prompt: a.prompt, sid: a.sessionId };
  }
}
process.stdout.write('MATCHES=' + count + '\n');
if (!picked) fail('NO_SEND_RECORD（needle/must/sid 三者有一不对，别当成"没发出去"）');
const sent = Buffer.from(picked.prompt);
const file = Buffer.from(fs.readFileSync(opt.file, 'utf8').replace(/\s+$/, ''));
const eq = sent.equals(file);
const local = new Date(picked.ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
process.stdout.write('IDX=' + picked.i + ' 折算=' + local + ' SID8=' + picked.sid.slice(0, 8) + '\n');
process.stdout.write('identical=' + eq + ' sent_bytes=' + sent.length + ' linted_bytes=' + file.length + '\n');
if (!eq) {
  let i = 0;
  while (i < Math.min(sent.length, file.length) && sent[i] === file[i]) i++;
  const cut = (b) => JSON.stringify(b.slice(Math.max(0, i - 24), i + 24).toString());
  process.stdout.write('first_diff_at=' + i + ' sent=' + cut(sent) + ' file=' + cut(file) + '\n');
  process.exit(3);
}
process.exit(0);
