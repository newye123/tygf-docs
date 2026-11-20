import fs from 'node:fs';

const FORBIDDEN_FRONTEND_TERMS = [
  'Photoshop',
  'PhotoCraft',
  '双引擎',
  '无PS',
  '回退',
  'Fallback',
];

const LEGACY_DIALOG_PATTERNS = [
  /BrowseForFolder/i,
  /Shell\.Application/i,
  /粘贴多行\s*PSD\s*路径/,
];

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8').trim();
  } catch {
    return '';
  }
}

function block(reason) {
  console.error(`[TYGF POST-EDIT LINT BLOCKED] ${reason}`);
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

const input = event.tool_input || {};
const filePath = String(input.file_path || input.path || '').replace(/\\/g, '/');
if (!filePath || !fs.existsSync(filePath)) process.exit(0);

// Only lint frontend UI / client-facing source files (skip internal tests & backend engine internals)
const isFrontendFile =
  /(^|\/)src\/(components|app|pages|lib\/workbench)\//.test(filePath) &&
  !/\.(test|spec)\.[jt]sx?$/.test(filePath);

if (!isFrontendFile) process.exit(0);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip pure single-line comments
  if (/^\s*(\/\/|\*)/.test(line)) continue;

  for (const term of FORBIDDEN_FRONTEND_TERMS) {
    if (line.includes(term)) {
      block(
        `前端文件 ${filePath}:${i + 1} 出现禁止泄露给用户的引擎/技术词 "${term}"，请立即改为中性纯中文业务表达。`
      );
    }
  }

  for (const re of LEGACY_DIALOG_PATTERNS) {
    if (re.test(line)) {
      block(
        `前端文件 ${filePath}:${i + 1} 检测到已废弃的旧弹窗/冗余入口 (${re})，请彻底移除。`
      );
    }
  }
}

process.exit(0);
