import fs from 'node:fs';
import { execSync } from 'node:child_process';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8').trim();
  } catch {
    return '';
  }
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function block(reason) {
  console.error(`[TYGF GUARDRAIL BLOCKED] ${reason}`);
  process.exit(2);
}

const raw = readStdin();
if (!raw) process.exit(0);

let event;
try {
  event = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolName = String(event.tool_name || '');
const input = event.tool_input || {};

// 1. Guard file edits & writes
if (['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
  const filePath = String(input.file_path || input.path || '').replace(/\\/g, '/');

  // Protect UI reference prototype source of truth
  if (/(^|\/)docs\/ui-reference\/workbench-v3\.html$/i.test(filePath)) {
    block('禁止修改视觉真源原型文件 docs/ui-reference/workbench-v3.html，只能读取对照。');
  }

  // Protect secrets & certificates
  if (/(^|\/)\.env(\.|$)|\.(pem|pfx|p12|key)$/i.test(filePath)) {
    block(`禁止 AI 直接修改密钥或环境变量文件：${filePath}`);
  }

  // Block AI_MEMORY edits on feature sub-branches to stop 50-branch merge wars
  if (/(^|\/)AI_MEMORY\//.test(filePath) && process.env.TYGF_ALLOW_MEMORY_EDIT !== '1') {
    const branch = getCurrentBranch();
    if (branch && !['main', 'develop'].includes(branch)) {
      block(
        `当前在特性分支 (${branch})，禁止修改 AI_MEMORY/*（由主控在收口阶段统一归并）。如需豁免请设置 TYGF_ALLOW_MEMORY_EDIT=1。`
      );
    }
  }
}

// 2. Guard dangerous Bash git/filesystem commands
if (toolName === 'Bash') {
  const cmd = String(input.command || '');

  if (/\bgit\s+push\b.*(--force|-f\b)/i.test(cmd)) {
    block('禁止执行 git push --force。');
  }
  if (/\bgit\s+push\b.*\borigin\s+main\b/i.test(cmd) && process.env.TYGF_ALLOW_MAIN_PUSH !== '1') {
    block('禁止直接推送到 origin/main，请先推送特性分支并通过全部门禁与人工真机验收。');
  }
  if (/\bgit\s+reset\s+--hard\b/i.test(cmd)) {
    block('禁止执行 git reset --hard，以免误删未提交改动。');
  }
  if (/\brm\s+-rf\s+(\/|~|\$HOME)\b/i.test(cmd)) {
    block('检测到高危删除命令，已拦截。');
  }
}

process.exit(0);
