#!/usr/bin/env node
/**
 * scripts/build-hot-index.mjs
 *
 * 作用：解决 AI_MEMORY/TASK_LOG.md (1.65MB)、ISSUES.md (526KB)、交付档案 (985件) 体积过大、
 *       以及 CURRENT_STATUS.md 单写者滞后导致新 AI 会话开机读取慢或读到过期信息的问题。
 * 铁律：100% 只读原账（严守治理三令，不删改 TASK_LOG / ISSUES / 三账一字），
 *       仅生成一份 <15KB 的轻量级热索引 `AI_MEMORY/HOT_INDEX.md` 供新会话秒读。
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const TASK_LOG = path.join(ROOT, 'AI_MEMORY', 'TASK_LOG.md')
const LEDGER = path.join(ROOT, 'AI_MEMORY', 'ledger.jsonl')
const ARCHIVE_DIR = path.join(ROOT, '交付档案')
const OUT_FILE = path.join(ROOT, 'AI_MEMORY', 'HOT_INDEX.md')

function extractRecentTaskLogHeadings(limit = 15) {
  if (!fs.existsSync(TASK_LOG)) return []
  const raw = fs.readFileSync(TASK_LOG, 'utf8')
  const lines = raw.split(/\r?\n/)
  const items = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      items.push({ line: i + 1, title: lines[i].slice(3).trim() })
      if (items.length >= limit) break
    }
  }
  return items
}

function extractActiveLedgerRows() {
  if (!fs.existsSync(LEDGER)) return { active: [], waiting: [] }
  const raw = fs.readFileSync(LEDGER, 'utf8')
  const byTask = new Map()
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj.taskId === 'string') {
        byTask.set(obj.taskId, obj)
      }
    } catch {
      // ignore malformed line
    }
  }
  const active = []
  const waiting = []
  for (const row of byTask.values()) {
    if (row.status === '进行中' || row.status === '待复验' || row.wip === true) {
      if (row.status !== '已交付' && row.status !== '已搁置') {
        active.push(row)
      }
    } else if (row.status === '等您定') {
      waiting.push(row)
    }
  }
  const sortByTimeDesc = (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  return {
    active: active.sort(sortByTimeDesc).slice(0, 12),
    waiting: waiting.sort(sortByTimeDesc).slice(0, 15),
  }
}

function extractRecentDeliverables(limit = 18) {
  if (!fs.existsSync(ARCHIVE_DIR)) return []
  const all = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('_飞书版.md')) {
        const stat = fs.statSync(full)
        all.push({
          rel: path.relative(ROOT, full).replace(/\\/g, '/'),
          mtime: stat.mtime,
          mtimeStr: stat.mtime.toISOString().slice(0, 16).replace('T', ' '),
        })
      }
    }
  }
  walk(ARCHIVE_DIR)
  return all.sort((a, b) => b.mtime - a.mtime).slice(0, limit)
}

const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ')
const recentLogs = extractRecentTaskLogHeadings(15)
const { active, waiting } = extractActiveLedgerRows()
const recentDocs = extractRecentDeliverables(18)

const md = [
  `# AI_MEMORY 热索引（HOT_INDEX · 自动生成，勿手改）`,
  ``,
  `> 生成时刻：\`${nowStr} UTC\` ｜ 生成器：\`node scripts/build-hot-index.mjs\`（只读提取，不改原账）`,
  `> 用途：解决 \`TASK_LOG.md\`（1.65MB）与 \`CURRENT_STATUS.md\`（单写者滞后）带来的开机慢与读旧账问题。需要细节时按下方行号/路径精确 \`read\`。`,
  ``,
  `## 1. 当前活动代码树与核心入口指针`,
  ``,
  `- **主开发树（活体）**：\`worktrees/develop/\`（接力总账：\`worktrees/develop/docs/HANDOFF.md\`）`,
  `- **当前多稿工作台工作树**：\`worktrees/multidraft2/\``,
  `- **自研 Skills 单一真源**：\`skills/\`（同步脚本：\`node scripts/sync-yt-skills.mjs --check\`，含 \`yt-adversarial-review\` / \`yt-zongkong-round\` / \`yt-sansheng-liubu\` / \`yt-uiux\`）`,
  `- **测试站与本地助手 10 秒联调诊断**：\`node scripts/doctor-testsite-assistant.mjs\``,
  `- **TASK_LOG 防吞标题唯一写入口**：\`node scripts/tasklog-prepend.mjs\``,
  ``,
  `## 2. 最近 15 次任务记录（源自 \`AI_MEMORY/TASK_LOG.md\`）`,
  ``,
  ...recentLogs.map((item) => `- \`TASK_LOG.md:${item.line}\` — ${item.title}`),
  ``,
  `## 3. 台账进行中 / 待复验项（源自 \`AI_MEMORY/ledger.jsonl\` 最新态）`,
  ``,
  ...(active.length
    ? active.map((r) => `- **[${r.status}]** \`${r.taskId}\`（${r.updatedAt || 'n/a'}）：${r.title} → 下一步：${String(r.next || '').slice(0, 90)}`)
    : [`- （当前无进行中/待复验项）`]),
  ``,
  `## 4. 等 Owner 拍板项（最近 15 条 \`等您定\`）`,
  ``,
  ...(waiting.length
    ? waiting.map((r) => `- **[等您定]** \`${r.taskId}\`（${r.updatedAt || 'n/a'}）：${r.title} ｜ 出处：\`${r.source || ''}\``)
    : [`- （当前无等您定项）`]),
  ``,
  `## 5. 最近产出的 18 份交付档案（源自 \`交付档案/\`）`,
  ``,
  ...recentDocs.map((d) => `- \`${d.mtimeStr}\` — \`${d.rel}\``),
  ``,
].join('\n')

fs.writeFileSync(OUT_FILE, md, 'utf8')
const bytes = Buffer.byteLength(md, 'utf8')
console.log(`[build-hot-index] PASS wrote ${OUT_FILE} (${bytes} B, logs=${recentLogs.length}, active=${active.length}, waiting=${waiting.length}, docs=${recentDocs.length})`)
