#!/usr/bin/env node
/**
 * scripts/reconcile-ai-memory.mjs
 *
 * 作用：解决 30+ 个 worktree 各自拥有独立的 `AI_MEMORY/` 副本导致跨会话记忆分裂（脑裂）的问题。
 * 功能：
 *   1. 扫描所有 worktree 下的 `AI_MEMORY/TASK_LOG.md`，按二级标题 `## ...` 块解析。
 *   2. 找出在子 worktree 中存在、但在容器根 `AI_MEMORY/TASK_LOG.md` 中缺失的独有记录。
 *   3. 若传入 `--apply`：
 *      - 将缺失的独有记录无损归并进容器根 `AI_MEMORY/TASK_LOG.md`（按日期倒序插入顶部区域，且校验标题总数精确等于 `原总数 + 新增数`）；
 *      - 将容器根最新生成的 `AI_MEMORY/HOT_INDEX.md` 同步复制到所有活跃 worktree 的 `AI_MEMORY/HOT_INDEX.md`，让在子目录启动的 AI 也能秒读全局最新状态。
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ROOT_MEMORY = path.join(ROOT, 'AI_MEMORY')
const ROOT_TASK_LOG = path.join(ROOT_MEMORY, 'TASK_LOG.md')
const ROOT_HOT_INDEX = path.join(ROOT_MEMORY, 'HOT_INDEX.md')

function parseSections(markdown) {
  const lines = String(markdown).split(/\r?\n/)
  const preamble = []
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { heading: line.trim(), lines: [line] }
    } else {
      if (current) {
        current.lines.push(line)
      } else {
        preamble.push(line)
      }
    }
  }
  if (current) sections.push(current)
  return {
    preamble: preamble.join('\n').trim(),
    sections: sections.map((s) => ({
      heading: s.heading,
      body: s.lines.join('\n').trimEnd(),
      dateKey: (s.heading.match(/^##\s+(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d[\dx])?)/) || [null, '0000-00-00'])[1],
    })),
  }
}

function findWorktreeMemoryDirs() {
  const dirs = []
  const wtRoot = path.join(ROOT, 'worktrees')
  if (fs.existsSync(wtRoot)) {
    for (const entry of fs.readdirSync(wtRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const memDir = path.join(wtRoot, entry.name, 'AI_MEMORY')
      if (fs.existsSync(memDir)) {
        dirs.push({ name: `worktrees/${entry.name}`, dir: memDir })
      }
    }
  }
  const isoMem = path.join(ROOT, 'iso-clone-deploy', 'AI_MEMORY')
  if (fs.existsSync(isoMem)) {
    dirs.push({ name: 'iso-clone-deploy', dir: isoMem })
  }
  return dirs
}

const applyMode = process.argv.slice(2).includes('--apply')
const rootRaw = fs.readFileSync(ROOT_TASK_LOG, 'utf8')
const rootParsed = parseSections(rootRaw)
const knownHeadings = new Set(rootParsed.sections.map((s) => s.heading))

const worktreeDirs = findWorktreeMemoryDirs()
const missingByHeading = new Map()

for (const wt of worktreeDirs) {
  const tlPath = path.join(wt.dir, 'TASK_LOG.md')
  if (!fs.existsSync(tlPath)) continue
  const parsed = parseSections(fs.readFileSync(tlPath, 'utf8'))
  for (const sec of parsed.sections) {
    // 只收集 2026-10-15 之后的近端独有条目，避免远古改名标题重复
    if (sec.dateKey < '2026-10-15') continue
    if (!knownHeadings.has(sec.heading) && !missingByHeading.has(sec.heading)) {
      missingByHeading.set(sec.heading, { ...sec, sourceWorktree: wt.name })
    }
  }
}

const missingList = Array.from(missingByHeading.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey))

console.log(`[reconcile-ai-memory] root_h2=${rootParsed.sections.length} scanned_worktrees=${worktreeDirs.length} missing_recent_in_root=${missingList.length}`)
for (const item of missingList) {
  console.log(`  + [${item.sourceWorktree}] ${item.heading}`)
}

if (applyMode) {
  let finalH2Count = rootParsed.sections.length
  if (missingList.length > 0) {
    // 将所有章节（含新归并的近端独有章节）合并且保持原有顺序，新归并项按 dateKey 插入在最前面对应日期位置
    const allSections = [...missingList, ...rootParsed.sections]
    // 对顶部 2026-10-20 之后的条目按 dateKey 稳定降序排列，更早的保持原序
    const recentCutoff = '2026-10-20'
    const recent = allSections.filter((s) => s.dateKey >= recentCutoff)
    const older = allSections.filter((s) => s.dateKey < recentCutoff)
    recent.sort((a, b) => b.dateKey.localeCompare(a.dateKey))

    const mergedSections = [...recent, ...older]
    const mergedText = [
      ...(rootParsed.preamble ? [rootParsed.preamble, ''] : []),
      ...mergedSections.map((s) => `${s.body}\n`),
    ].join('\n')

    const newCheck = parseSections(mergedText)
    const expectedCount = rootParsed.sections.length + missingList.length
    if (newCheck.sections.length !== expectedCount) {
      console.error(`[FAIL] H2 count mismatch after merge: got=${newCheck.sections.length} expected=${expectedCount}`)
      process.exit(1)
    }
    fs.writeFileSync(ROOT_TASK_LOG, mergedText, 'utf8')
    finalH2Count = newCheck.sections.length
    console.log(`[reconcile-ai-memory] MERGED ${missingList.length} sections into root TASK_LOG (h2: ${rootParsed.sections.length} -> ${finalH2Count})`)
  }

  // 分发 HOT_INDEX.md 到所有 worktree 的 AI_MEMORY/
  if (fs.existsSync(ROOT_HOT_INDEX)) {
    let copied = 0
    for (const wt of worktreeDirs) {
      fs.copyFileSync(ROOT_HOT_INDEX, path.join(wt.dir, 'HOT_INDEX.md'))
      copied++
    }
    console.log(`[reconcile-ai-memory] DISTRIBUTED HOT_INDEX.md to ${copied} worktrees`)
  }
}
