import { execSync } from 'node:child_process';
import fs from 'node:fs';

const MAX_FILES_PER_ATOMIC_TASK = Number(process.env.TYGF_MAX_CHANGED_FILES || 10);
const FORBIDDEN_FRONTEND_TERMS = [
  'Photoshop',
  'PhotoCraft',
  '双引擎',
  '无PS',
  '回退',
  'Fallback',
];

function getChangedFiles() {
  try {
    const out = execSync('git status --porcelain', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[A-Z?]+\s+/, '').replace(/\\/g, '/'));
  } catch {
    return [];
  }
}

const files = getChangedFiles();
if (files.length === 0) process.exit(0);

const issues = [];

// 1. Prevent mega-commits like +4,693 lines across 32 files
if (
  files.length > MAX_FILES_PER_ATOMIC_TASK &&
  process.env.TYGF_ALLOW_LARGE_DIFF !== '1'
) {
  issues.push(
    `当前未提交改动已达 ${files.length} 个文件（上限 ${MAX_FILES_PER_ATOMIC_TASK}），请拆分为独立小提交，禁止前后端混塞同一大提交。`
  );
}

// 2. Enforce frontend UI vs backend assistant separation
const touchedV3Ui = files.some((f) => f.startsWith('src/components/workbench-v3/'));
const touchedAssistant = files.some((f) => f.startsWith('download/local-assistant/'));
if (touchedV3Ui && touchedAssistant && process.env.TYGF_ALLOW_MIXED_STACK !== '1') {
  issues.push(
    '检测到同时修改了 workbench-v3 前端页面与 download/local-assistant 助手后端，请按宪法拆分为独立任务提交。'
  );
}

// 3. Final sweep for forbidden engine jargon in modified frontend files
for (const f of files) {
  if (!/^src\/(components|app|pages|lib\/workbench)\//.test(f)) continue;
  if (/\.(test|spec)\.[jt]sx?$/.test(f) || !fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    for (const term of FORBIDDEN_FRONTEND_TERMS) {
      if (line.includes(term)) {
        issues.push(`${f}:${idx + 1} 含禁止前端词 "${term}"`);
      }
    }
  });
}

if (issues.length > 0) {
  console.error('[TYGF STOP CHECKLIST GATE FAILED]');
  for (const item of issues) {
    console.error(`  - ${item}`);
  }
  console.error('请先修复上述阻断项，并确认已执行真实浏览器点击验收与 4 道发布门禁后再结束任务。');
  process.exit(2);
}

process.exit(0);
