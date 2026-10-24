#!/usr/bin/env node
/**
 * scripts/sync-yt-skills.mjs
 *
 * 作用：解决自研 yt-* Skills 分裂在 4 个目录导致不同 AI 工具（OpenCode / Qoder）互相看不见的问题。
 * 机制：
 *   1. 以容器根 `skills/` 为单一真源（Single Source of Truth）。
 *   2. 首次运行时，若 `skills/<id>` 尚不存在，自动从已知的散落位置收拢母本。
 *   3. 将 `skills/yt-*` 幂等同步到三个工具读取端：
 *      - C:\Users\ivan\.agents\skills
 *      - F:\工具开发\图译工坊内测版\.qoder\skills
 *      - C:\Users\ivan\.qoder-cn\skills
 *   4. 支持 `--check` 只读对账模式：逐文件核对 sha256，任何一端缺失或漂移均返回 rc=1（可用于门禁与负控）。
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..')
const SSOT_DIR = path.join(ROOT, 'skills')
const HOME = os.homedir()

const TARGET_ROOTS = [
  { name: 'agents-global', dir: path.join(HOME, '.agents', 'skills') },
  { name: 'claude-global', dir: path.join(HOME, '.claude', 'skills') },
  { name: 'qoder-repo', dir: path.join(ROOT, '.qoder', 'skills') },
  { name: 'qoder-global', dir: path.join(HOME, '.qoder-cn', 'skills') },
]

const KNOWN_SKILLS = [
  'yt-adversarial-review',
  'yt-uiux',
  'yt-zongkong-round',
  'yt-sansheng-liubu',
]

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function listFilesRecursive(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, baseDir))
    } else if (entry.isFile()) {
      out.push(path.relative(baseDir, full).replace(/\\/g, '/'))
    }
  }
  return out.sort()
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const rel of listFilesRecursive(srcDir)) {
    const srcFile = path.join(srcDir, rel)
    const destFile = path.join(destDir, rel)
    fs.mkdirSync(path.dirname(destFile), { recursive: true })
    fs.copyFileSync(srcFile, destFile)
  }
}

function bootstrapSsotIfNeeded() {
  fs.mkdirSync(SSOT_DIR, { recursive: true })
  for (const skillId of KNOWN_SKILLS) {
    const ssotSkillDir = path.join(SSOT_DIR, skillId)
    if (fs.existsSync(path.join(ssotSkillDir, 'SKILL.md'))) continue
    for (const target of TARGET_ROOTS) {
      const candidate = path.join(target.dir, skillId)
      if (fs.existsSync(path.join(candidate, 'SKILL.md'))) {
        copyDirRecursive(candidate, ssotSkillDir)
        console.log(`[bootstrap] seeded ${skillId} from ${target.name} (${candidate})`)
        break
      }
    }
  }
}

function verifyAll() {
  let mismatches = 0
  let checkedFiles = 0
  for (const skillId of KNOWN_SKILLS) {
    const ssotSkillDir = path.join(SSOT_DIR, skillId)
    if (!fs.existsSync(path.join(ssotSkillDir, 'SKILL.md'))) {
      console.error(`[FAIL] SSOT missing ${skillId}/SKILL.md`)
      mismatches++
      continue
    }
    const relFiles = listFilesRecursive(ssotSkillDir)
    for (const rel of relFiles) {
      const srcHash = sha256File(path.join(ssotSkillDir, rel))
      for (const target of TARGET_ROOTS) {
        checkedFiles++
        const dstFile = path.join(target.dir, skillId, rel)
        if (!fs.existsSync(dstFile)) {
          console.error(`[FAIL] missing ${target.name}:${skillId}/${rel}`)
          mismatches++
          continue
        }
        const dstHash = sha256File(dstFile)
        if (srcHash !== dstHash) {
          console.error(`[FAIL] drift ${target.name}:${skillId}/${rel} (ssot=${srcHash.slice(0, 8)} != dst=${dstHash.slice(0, 8)})`)
          mismatches++
        }
      }
    }
  }
  return { checkedFiles, mismatches }
}

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')

if (!checkOnly) {
  bootstrapSsotIfNeeded()
  for (const skillId of KNOWN_SKILLS) {
    const ssotSkillDir = path.join(SSOT_DIR, skillId)
    if (!fs.existsSync(path.join(ssotSkillDir, 'SKILL.md'))) continue
    for (const target of TARGET_ROOTS) {
      const dstDir = path.join(target.dir, skillId)
      copyDirRecursive(ssotSkillDir, dstDir)
    }
  }
}

const { checkedFiles, mismatches } = verifyAll()
if (mismatches > 0) {
  console.error(`[sync-yt-skills] FAIL checked=${checkedFiles} mismatches=${mismatches}`)
  process.exit(1)
}
console.log(`[sync-yt-skills] PASS skills=${KNOWN_SKILLS.length} targets=${TARGET_ROOTS.length} checked=${checkedFiles} mismatches=0`)
