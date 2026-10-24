#!/usr/bin/env node
/**
 * append-section.mjs — 往 Markdown 大日志顶部追加一节，且保证不吞掉原有标题。
 *
 * 病根：手工用编辑器置顶插入时，很容易把上一节的一级/二级标题行当成锚点替换掉，
 *       于是历史记录凭空少一节，而且没有任何报错。
 *
 * 机制：用代码强制三条不变量——
 *   ① 新条目必须以 "## YYYY-MM-DD" 开头
 *   ② 新条目内只能有 1 个二级标题
 *   ③ 拼接后全文 "^## " 计数必须恰好等于 原标题数 + 1
 * 任何一条不满足即拒绝写入并 exit(1)，绝不产生半成品文件。
 *
 * 用法：
 *   node append-section.mjs --self-test
 *   node append-section.mjs --section-file <新条目.md> [--target <大日志.md>]
 *
 * 退出码：0 成功 / 1 校验失败（未写入）/ 2 用法错误
 */

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

export function countH2Headings(text) {
  let count = 0
  for (const line of String(text).split(/\r?\n/)) {
    if (line.startsWith('## ')) count++
  }
  return count
}

export function buildPrepended(originalContent, newSectionRaw) {
  const section = String(newSectionRaw || '').trim()
  if (!section.startsWith('## 20')) {
    throw new Error('INVALID_HEADING: 新条目必须以 "## YYYY-MM-DD ..." 二级标题开头')
  }
  const added = countH2Headings(section)
  if (added !== 1) {
    throw new Error(`INVALID_SECTION_H2_COUNT: 新条目内含 ${added} 个二级标题（必须恰好 1 个）`)
  }

  const eol = originalContent.includes('\r\n') ? '\r\n' : '\n'
  const normalized = section.replace(/\r?\n/g, eol)

  const before = countH2Headings(originalContent)
  const combined = `${normalized}${eol}${eol}${originalContent}`
  const after = countH2Headings(combined)

  if (after !== before + 1) {
    throw new Error(`H2_COUNT_MISMATCH: 写入后二级标题数 ${after} != 原标题数 ${before} + 1，疑似吞标题，已中止`)
  }
  return { combined, before, after }
}

function selfTest() {
  const sample = [
    '## 2026-01-02 10:00 旧条目一',
    '',
    '- 内容 A',
    '',
    '## 2026-01-01 09:00 旧条目二',
    '',
    '- 内容 B',
    '',
  ].join('\n')

  // 正控：合法单节置顶
  const ok = buildPrepended(sample, '## 2026-01-03 11:00 新条目\n\n- 内容')
  assert.equal(ok.before, 2)
  assert.equal(ok.after, 3)

  // 负控 1：不是 ## 开头
  let n1 = false
  try {
    buildPrepended(sample, '### 2026-01-03 错误三级标题\n- x')
  } catch (e) {
    n1 = String(e.message).includes('INVALID_HEADING')
  }
  assert.equal(n1, true, '负控1：必须拦下非 ## 开头')

  // 负控 2：一次塞两个 ## 标题
  let n2 = false
  try {
    buildPrepended(sample, '## 2026-01-03 A\n\n## 2026-01-03 B')
  } catch (e) {
    n2 = String(e.message).includes('INVALID_SECTION_H2_COUNT')
  }
  assert.equal(n2, true, '负控2：必须拦下多标题注入')

  // 负控 3：模拟"替换掉原首行标题"的吞标题事故，计数守卫必须能识别
  const swallowed = sample.replace('## 2026-01-02 10:00 旧条目一', '## 2026-01-03 11:00 新条目')
  assert.equal(
    countH2Headings(swallowed),
    2,
    '负控3：吞标题后计数停在 2（未达 2+1=3），守卫可精确识别',
  )

  console.log('[append-section] SELF-TEST PASS (正控 1/1 + 负控 3/3)')
}

const args = process.argv.slice(2)

if (args.includes('--self-test')) {
  selfTest()
  process.exit(0)
}

const sIdx = args.indexOf('--section-file')
if (sIdx === -1 || !args[sIdx + 1]) {
  console.error('用法: node append-section.mjs --section-file <新条目.md> [--target <大日志.md>] | --self-test')
  process.exit(2)
}

const tIdx = args.indexOf('--target')
const target = tIdx !== -1 && args[tIdx + 1] ? path.resolve(args[tIdx + 1]) : path.resolve('TASK_LOG.md')
const sectionFile = path.resolve(args[sIdx + 1])

if (!fs.existsSync(sectionFile)) {
  console.error(`[append-section] 找不到新条目文件: ${sectionFile}`)
  process.exit(2)
}
if (!fs.existsSync(target)) {
  console.error(`[append-section] 找不到目标文件: ${target}`)
  process.exit(2)
}

const original = fs.readFileSync(target, 'utf8')
const newSection = fs.readFileSync(sectionFile, 'utf8')

let result
try {
  result = buildPrepended(original, newSection)
} catch (err) {
  console.error(`[append-section] FAIL ${err.message}（未写入）`)
  process.exit(1)
}

fs.writeFileSync(target, result.combined, 'utf8')
console.log(`[append-section] PASS target=${target} h2_before=${result.before} h2_after=${result.after}`)
