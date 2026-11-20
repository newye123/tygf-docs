import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function runHook(scriptRelPath, stdinObj, envExtra = {}) {
  return spawnSync(process.execPath, [scriptRelPath], {
    input: stdinObj ? JSON.stringify(stdinObj) : '',
    encoding: 'utf8',
    env: { ...process.env, ...envExtra },
  });
}

// 1. PreToolUse blocks editing docs/ui-reference/workbench-v3.html
const r1 = runHook('scripts/hooks/pre-tool-guard.mjs', {
  tool_name: 'Edit',
  tool_input: { file_path: 'docs/ui-reference/workbench-v3.html' },
});
assert.equal(r1.status, 2, '应拦截修改 UI 原型真源');
console.log('PASS [1/5] PreToolUse 成功拦截修改 UI 原型真源');

// 2. PreToolUse blocks git push --force and direct push to main
const r2 = runHook('scripts/hooks/pre-tool-guard.mjs', {
  tool_name: 'Bash',
  tool_input: { command: 'git push origin main' },
});
assert.equal(r2.status, 2, '应拦截直推 origin/main');
console.log('PASS [2/5] PreToolUse 成功拦截直推 origin/main');

// 3. PreToolUse allows normal feature source edits
const r3 = runHook('scripts/hooks/pre-tool-guard.mjs', {
  tool_name: 'Edit',
  tool_input: { file_path: 'src/components/workbench-v3/step2-review-v3.tsx' },
});
assert.equal(r3.status, 0, '应放行正常业务代码编辑');
console.log('PASS [3/5] PreToolUse 正常放行白名单业务代码');

// 4. PostToolUse blocks forbidden engine jargon in frontend file
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tygf-hook-test-'));
const fakeFrontendDir = path.join(tmpRoot, 'src', 'components', 'workbench-v3');
fs.mkdirSync(fakeFrontendDir, { recursive: true });
const badFile = path.join(fakeFrontendDir, 'bad-ui.tsx');
fs.writeFileSync(badFile, 'export const msg = "当前电脑无PS，已自动回退到PhotoCraft";\n', 'utf8');

const r4 = runHook('scripts/hooks/post-edit-lint.mjs', {
  tool_name: 'Write',
  tool_input: { file_path: badFile },
});
assert.equal(r4.status, 2, '应拦截含禁用引擎词的前端文件');
console.log('PASS [4/5] PostToolUse 成功拦截前端禁用引擎词泄露');

// 5. PostToolUse passes clean pure-Chinese frontend file
const goodFile = path.join(fakeFrontendDir, 'good-ui.tsx');
fs.writeFileSync(goodFile, 'export const msg = "当前本地运行环境仅支持标准字形替换";\n', 'utf8');

const r5 = runHook('scripts/hooks/post-edit-lint.mjs', {
  tool_name: 'Write',
  tool_input: { file_path: goodFile },
});
assert.equal(r5.status, 0, '应放行纯中文合规前端文件');
console.log('PASS [5/5] PostToolUse 放行纯中文合规前端文件');

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log('\nALL 5 GUARDRAIL HOOK ASSERTIONS PASSED (RC=0)');
