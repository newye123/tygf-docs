#!/usr/bin/env node
// 从 nodejs.org 的 dist/index.json（stdin）里取出指定版本线的最新版。
// 输出：`版本|日期|security|plain`（取不到就输出空串并 exit 1 —— 让调用方知道这一项没核成）
// 为什么要独立成文件：把这段塞进 ssh heredoc 里的 node -e 会被解析器咬
// （2026-10-22 实测 SyntaxError: missing ) after argument list）。
import { readFileSync } from 'node:fs';

const line = process.argv[2] || '22.x';
const prefix = `v${line.split('.')[0]}.`;
const buf = readFileSync(0, 'utf8');

let arr;
try {
  arr = JSON.parse(buf);
} catch {
  process.stderr.write('index.json 解析失败\n');
  process.exit(1);
}
if (!Array.isArray(arr) || arr.length === 0) {
  process.stderr.write('index.json 不是预期形状\n');
  process.exit(1);
}

const num = (v) => v.version.slice(1).split('.').map(Number);
const same = arr.filter((r) => typeof r.version === 'string' && r.version.startsWith(prefix));
if (same.length === 0) {
  process.stderr.write(`索引里没有 ${prefix}* 版本\n`);
  process.exit(1);
}
same.sort((a, b) => {
  const A = num(a);
  const B = num(b);
  return (A[1] ?? 0) - (B[1] ?? 0) || (A[2] ?? 0) - (B[2] ?? 0);
});
const top = same[same.length - 1];
process.stdout.write(
  `${top.version.slice(1)}|${String(top.date ?? '').slice(0, 10)}|${top.security ? 'security' : 'plain'}|共 ${same.length} 个 ${prefix}* 版本`
);
