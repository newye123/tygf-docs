#!/usr/bin/env node
/**
 * scripts/scan-secrets.mjs
 *
 * 作用：在任何"把本地内容推上 GitHub"之前，做一次有阳性对照的密钥/凭据扫描。
 * 纪律（遵循 yt-adversarial-review 的探针自证原则）：
 *   1. 先跑阳性对照：每一类密钥喂一条已知样本，必须 100% 被抓到 —— 否则这个 0 是探针失灵。
 *   2. 再扫真实文件：任何命中都列出 文件:行号（不打印密钥值本身，只打印前后掩码）。
 *   3. 退出码：0 = 干净；1 = 有命中（禁止推送）；2 = 探针自身异常。
 *
 * 用法：node scripts/scan-secrets.mjs <目录或文件...>
 */

import fs from 'node:fs'
import path from 'node:path'

// 每一类都配一条"已知坏样本"用于阳性对照
const RULES = [
  {
    id: 'private-key',
    label: '私钥文件头',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    positive: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...',
  },
  {
    id: 'github-token',
    label: 'GitHub Token',
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
    positive: 'token = ghp_' + 'a'.repeat(36),
  },
  {
    id: 'openai-key',
    label: 'OpenAI / 通用 sk- 密钥',
    re: /\bsk-[A-Za-z0-9_-]{20,}\b/,
    positive: 'OPENAI_API_KEY=sk-' + 'x'.repeat(32),
  },
  {
    id: 'aws-key',
    label: 'AWS Access Key',
    re: /\bAKIA[0-9A-Z]{16}\b/,
    positive: 'aws_access_key_id = AKIA' + 'Q'.repeat(16),
  },
  {
    id: 'feishu-webhook',
    label: '飞书机器人 Webhook',
    re: /open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9-]{20,}/,
    positive: 'https://open.feishu.cn/open-apis/bot/v2/hook/' + '11111111-2222-3333-4444-555555555555',
  },
  {
    id: 'generic-secret-assign',
    label: '密钥类变量赋值（password/secret/token = 长串）',
    re: /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
    positive: 'DB_PASSWORD="Xk29fJ2mQp81Lz"',
  },
  {
    id: 'gate-token',
    label: '访问门令牌（set $xxx_token "长hex"）',
    re: /set\s+\$\w*token\w*\s+["'][0-9a-f]{16,}["']/i,
    positive: 'set $tygf_test_token "abcdef0123456789abcdef0123456789";',
  },
]

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo', 'graphify-out'])
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.rar', '.tar', '.gz', '.7z', '.psd', '.psb', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.exe', '.dll'])
const MAX_FILE_BYTES = 8 * 1024 * 1024

// 扫描器自身含阳性对照样本，按业界惯例跳过自检文件（否则永远自匹配）
const SELF_PATH = path.resolve(import.meta.filename)

function collectFiles(targets) {
  const out = []
  function walk(p) {
    let st
    try {
      st = fs.statSync(p)
    } catch {
      return
    }
    if (st.isDirectory()) {
      const base = path.basename(p)
      if (SKIP_DIRS.has(base)) return
      for (const entry of fs.readdirSync(p)) walk(path.join(p, entry))
    } else if (st.isFile()) {
      if (path.resolve(p) === SELF_PATH) return
      if (SKIP_EXT.has(path.extname(p).toLowerCase())) return
      if (st.size > MAX_FILE_BYTES) return
      out.push(p)
    }
  }
  for (const t of targets) walk(path.resolve(t))
  return out
}

function maskSnippet(line, hit) {
  const idx = line.indexOf(hit)
  if (idx < 0) return '(unprintable)'
  const head = line.slice(Math.max(0, idx - 6), idx)
  return `${head}${hit.slice(0, 4)}${'*'.repeat(Math.max(4, Math.min(20, hit.length - 4)))}`
}

// ---------- 第一阶段：阳性对照（探针自证） ----------
console.log('=== 阶段一：阳性对照（每类必须被抓到，否则探针失灵） ===')
let positivePass = 0
for (const rule of RULES) {
  const caught = rule.re.test(rule.positive)
  console.log(`  ${caught ? '[OK]  ' : '[FAIL]'} ${rule.id.padEnd(24)} ${rule.label}`)
  if (caught) positivePass++
}
if (positivePass !== RULES.length) {
  console.error(`\n[scan-secrets] 探针自身异常：阳性对照 ${positivePass}/${RULES.length}，拒绝继续（防止假绿）`)
  process.exit(2)
}
console.log(`  阳性对照 ${positivePass}/${RULES.length} 全中 ⇒ 探针有效\n`)

// ---------- 第二阶段：真实扫描 ----------
const args = process.argv.slice(2)
const fromFileIdx = args.indexOf('--from-file')

let files = []
if (fromFileIdx !== -1 && args[fromFileIdx + 1]) {
  // 只扫给定的文件清单（用于"精确扫描即将提交的文件集"，避免命令行过长与扫到 gitignore 件）
  const listPath = path.resolve(args[fromFileIdx + 1])
  const listRaw = fs.readFileSync(listPath, 'utf8')
  const candidates = listRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  for (const rel of candidates) {
    const abs = path.resolve(rel)
    let st
    try {
      st = fs.statSync(abs)
    } catch {
      continue
    }
    if (!st.isFile()) continue
    if (SKIP_EXT.has(path.extname(abs).toLowerCase())) continue
    if (st.size > MAX_FILE_BYTES) continue
    files.push(abs)
  }
} else {
  const targets = args
  if (targets.length === 0) {
    console.error('用法: node scripts/scan-secrets.mjs <目录或文件...> | --from-file <文件清单.txt>')
    process.exit(2)
  }
  files = collectFiles(targets)
}

console.log(`=== 阶段二：真实扫描（${files.length} 个文件） ===`)

const hits = []
for (const file of files) {
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (text.includes('\u0000')) continue
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      const m = lines[i].match(rule.re)
      if (m) {
        hits.push({
          file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
          line: i + 1,
          rule: rule.id,
          label: rule.label,
          snippet: maskSnippet(lines[i], m[0]),
        })
      }
    }
  }
}

if (hits.length === 0) {
  console.log(`[scan-secrets] PASS scanned=${files.length} hits=0 (rc=0)`)
  process.exit(0)
}

console.log(`\n[scan-secrets] BLOCK 检出 ${hits.length} 处疑似凭据：`)
const byFile = new Map()
for (const h of hits) {
  if (!byFile.has(h.file)) byFile.set(h.file, [])
  byFile.get(h.file).push(h)
}
for (const [file, list] of byFile) {
  console.log(`\n  ${file}`)
  for (const h of list) {
    console.log(`    :${h.line}  [${h.rule}] ${h.label}  →  ${h.snippet}`)
  }
}
console.log(`\n[scan-secrets] FAIL scanned=${files.length} hits=${hits.length} (rc=1) —— 禁止推送，须先处置`)
process.exit(1)
