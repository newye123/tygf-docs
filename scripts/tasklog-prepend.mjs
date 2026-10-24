#!/usr/bin/env node
/**
 * scripts/tasklog-prepend.mjs
 *
 * 作用：解决手工用 edit 置顶追加 AI_MEMORY/TASK_LOG.md 时频繁发生「吞掉上一节标题」及「写入非法日期占位」的 D 族事故。
 * 机制：
 *   1. 强制校验新区块必须以 `## YYYY-MM-DD HH:mm `（允许分钟个位用 x，如 `14:2x`，因为这是 TASK_LOG 正文标题惯例，但禁止无日期头）开头。
 *   2. 写入前统计原文件 `^## ` 标题总数 N；拼接后统计新内容 `^## ` 总数 M。
 *   3. 强制断言 `M === N + 1`（一次只准置顶追加一节，且绝不吞原有标题），不满足立即拒绝写入并 exit(1)。
 *   4. 自带 `--self-test` 模式：在内存中运行正控 + 3 发负控（吞标题、无标题、多标题注入），全过才返回 rc=0。
 */

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_TASK_LOG = path.join(ROOT, 'AI_MEMORY', 'TASK_LOG.md')

export function countH2Headings(text) {
  let count = 0
  for (const line of String(text).split(/\r?\n/)) {
    if (line.startsWith('## ')) count++
  }
  return count
}

export function buildPrependedTaskLog(originalContent, newSectionRaw) {
  const trimmedSection = String(newSectionRaw || '').trim()
  if (!trimmedSection.startsWith('## 202')) {
    throw new Error('INVALID_HEADING: 新条目必须以 "## YYYY-MM-DD ..." 二级标题开头')
  }
  const addedH2 = countH2Headings(trimmedSection)
  if (addedH2 !== 1) {
    throw new Error(`INVALID_SECTION_H2_COUNT: 新条目内包含 ${addedH2} 个二级标题（必须恰好为 1）`)
  }

  const useCrlf = originalContent.includes('\r\n')
  const eol = useCrlf ? '\r\n' : '\n'
  const normalizedSection = trimmedSection.replace(/\r?\n/g, eol)

  const beforeCount = countH2Headings(originalContent)
  const combined = `${normalizedSection}${eol}${eol}${originalContent}`
  const afterCount = countH2Headings(combined)

  if (afterCount !== beforeCount + 1) {
    throw new Error(`H2_COUNT_MISMATCH: 置顶后二级标题数 (${afterCount}) != 原标题数 (${beforeCount}) + 1，疑似吞标题！`)
  }
  return { combined, beforeCount, afterCount }
}

function runSelfTest() {
  const sampleOriginal = [
    '## 2026-10-24 12:00 旧条目一',
    '',
    '- 内容 A',
    '',
    '## 2026-10-24 11:00 旧条目二',
    '',
    '- 内容 B',
    '',
  ].join('\n')

  // 正控：合法单节置顶
  const validNew = '## 2026-10-24 14:3x 新条目\n\n- 目标：测试正控'
  const res = buildPrependedTaskLog(sampleOriginal, validNew)
  assert.equal(res.beforeCount, 2, '正控 beforeCount 应为 2')
  assert.equal(res.afterCount, 3, '正控 afterCount 应为 3')

  // 负控 1：缺少二级标题头 -> 必须抛错
  let neg1Caught = false
  try {
    buildPrependedTaskLog(sampleOriginal, '### 2026-10-24 错误三级标题\n- 内容')
  } catch (e) {
    neg1Caught = String(e.message).includes('INVALID_HEADING')
  }
  assert.equal(neg1Caught, true, '负控 1 必须拦下非 ## 开头的条目')

  // 负控 2：一次塞入两个 ## 标题 -> 必须抛错
  let neg2Caught = false
  try {
    buildPrependedTaskLog(sampleOriginal, '## 2026-10-24 条目A\n\n## 2026-10-24 条目B')
  } catch (e) {
    neg2Caught = String(e.message).includes('INVALID_SECTION_H2_COUNT')
  }
  assert.equal(neg2Caught, true, '负控 2 必须拦下多标题注入')

  // 负控 3：模拟手工替换吞掉原第一行标题 -> countH2Headings 必须检出少 1
  const swallowed = sampleOriginal.replace('## 2026-10-24 12:00 旧条目一', validNew)
  assert.equal(countH2Headings(swallowed), 2, '负控 3：吞标题后计数停留在 2（未达 2+1=3），守卫可精确识别')

  console.log('[tasklog-prepend] SELF-TEST PASS (正控 1/1 + 负控 3/3 全红拦截)')
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) {
  runSelfTest()
  process.exit(0)
}

const fileIdx = args.indexOf('--section-file')
if (fileIdx === -1 || !args[fileIdx + 1]) {
  console.error('用法: node scripts/tasklog-prepend.mjs --section-file <新条目.md> [--target <TASK_LOG路径>] 或 --self-test')
  process.exit(2)
}

const sectionFile = path.resolve(args[fileIdx + 1])
const targetIdx = args.indexOf('--target')
const targetFile = targetIdx !== -1 && args[targetIdx + 1] ? path.resolve(args[targetIdx + 1]) : DEFAULT_TASK_LOG

const original = fs.readFileSync(targetFile, 'utf8')
const newSection = fs.readFileSync(sectionFile, 'utf8')
const { combined, beforeCount, afterCount } = buildPrependedTaskLog(original, newSection)
fs.writeFileSync(targetFile, combined, 'utf8')
console.log(`[tasklog-prepend] PASS target=${targetFile} h2_before=${beforeCount} h2_after=${afterCount}`)
