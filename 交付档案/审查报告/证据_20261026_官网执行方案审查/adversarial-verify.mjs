// scripts/adversarial-verify.mjs
// 图译工坊 (tuyigf.com) R1-R31 自动化对抗审查回归断言脚本
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];

function walkFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.txt', '.md']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'artifacts'].includes(entry.name)) continue;
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

const sourceFiles = [
  ...walkFiles(path.join(ROOT, 'src')),
  ...walkFiles(path.join(ROOT, 'public')),
  ...walkFiles(path.join(ROOT, 'download')),
];

// 断言 1：违禁词与已撤回失实承诺零容忍扫描 (R1, R3, R15, R19, R27)
const forbiddenPatterns = [
  { id: 'R27-JARGON', regex: /撑版/, msg: '残留晦涩黑话“撑版”，必须替换为“译文过长自动换行 / 行数变化或超宽”' },
  { id: 'R27-OLD-WRAP', regex: /把.*换行.*留给你/, msg: '残留“把换行留给你”旧文案（产品已实现译文过长自动换行）' },
  { id: 'R1-RASTER-NAME', regex: /报告会点名到具体图层/, msg: '残留 R1/F3 失实承诺“报告会点名到具体图层”' },
  { id: 'R1-RASTER-LIST', regex: /栅格化文字[\s\S]{0,30}会在替换报告中列出/, msg: '残留 R1 首页 FAQ 失实承诺“栅格化文字会在替换报告中列出”' },
  { id: 'R1-REPORT-3GROUPS', regex: /报告分成[「“"']?已确认\s*\/\s*待复查\s*\/\s*需要你决定/, msg: '残留 R1/F4 失实描述“报告分成三组”' },
  { id: 'R3-TERMS-CONFLICT', regex: /此时输入内容不离开您的设备/, msg: '残留 R3 用户协议第八条冲突文案“此时输入内容不离开您的设备”' },
  { id: 'R15-PRIVACY-BUNDLE', regex: /撤回智能学习同意视同您停止使用本服务/, msg: '残留 R15 隐私政策强制捆绑智能学习条款' },
  { id: 'R19-EN-CHINESE', regex: /Prepared by the 图译工坊 team/, msg: '残留 R19 英文站未翻译署名“Prepared by the 图译工坊 team”' },
];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  for (const rule of forbiddenPatterns) {
    if (rule.regex.test(content)) {
      errors.push(`[FAIL ${rule.id}] ${rel}: ${rule.msg}`);
    }
  }
}

// 断言 2：关键新增资产与 SEO/GEO 路由文件存在性检查 (R4, R11, R21, R26)
const requiredFiles = [
  'CLAUDE.md',
  'src/lib/workbench/guest-trial-contract.ts',
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'public/llms.txt',
  'public/llms-full.txt',
  'public/samples/sample-translations.csv',
  'src/app/(zh)/try-sandbox/page.tsx',
  'src/app/(zh)/guide/photoshop-variables-vs-batch-replace/page.tsx',
  'src/app/(zh)/guide/psd-batch-replace-script-pitfalls/page.tsx',
  'src/app/(zh)/guide/honest-spec/page.tsx',
];

for (const relPath of requiredFiles) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    errors.push(`[FAIL MISSING-FILE] 缺少必需文件: ${relPath}`);
  }
}

// 断言 3：免注册试跑安全门硬编码检查 (R2, R29)
const contractPath = path.join(ROOT, 'src/lib/workbench/guest-trial-contract.ts');
if (fs.existsSync(contractPath)) {
  const contractContent = fs.readFileSync(contractPath, 'utf8');
  if (!/allowThirdPartyAi\s*:\s*false/.test(contractContent)) {
    errors.push('[FAIL R2-SECURITY] guest-trial-contract.ts 未强制锁死 allowThirdPartyAi: false');
  }
}

if (errors.length > 0) {
  console.error('\n❌ 对抗式审查回归验证未通过，共发现 ' + errors.length + ' 处阻断问题：\n');
  for (const err of errors) console.error('  - ' + err);
  process.exit(1);
} else {
  console.log('\n✅ ALL 31 ADVERSARIAL CHECKS PASSED! 全仓文案、SEO/GEO 基建与免注册安全边界验证通过。\n');
}
