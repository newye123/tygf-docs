#!/usr/bin/env node
// 执行报告 → Owner 飞书群（常设指令，AGENTS.md「执行方案通知与文件一律发飞书」；
//   发送载体＝直接发 md 文档，HTML 在线链接已停用——Owner 2026-10-14 二令）
// Usage:
//   node scripts/send-feishu-report.mjs <report-file.html|md|txt> [--title "标题"]
//   node scripts/send-feishu-report.mjs <file> "自定义标题"
// Webhook 解析顺序：FEISHU_REPORT_WEBHOOK(进程) → FEISHU_BOT_WEBHOOK(进程)
//   → Windows User 级 FEISHU_BOT_WEBHOOK(注册表)。URL 永不打印。
// 说明：飞书 webhook 不渲染原始 HTML；本脚本把 HTML 转 markdown 后以
//   interactive 卡片发送（群内富文本呈现＝「以 html 方式」的实际可行形态）。
//   单卡上限按 ~27KB 截断并分片续发；失败退出码 1，不阻塞调用方交付。

import { readFileSync, existsSync } from 'node:fs'
import { resolve, basename, extname } from 'node:path'
import { execSync } from 'node:child_process'

const MAX_CHUNK = 27000

function resolveWebhook() {
  const direct = process.env.FEISHU_REPORT_WEBHOOK || process.env.FEISHU_BOT_WEBHOOK
  if (direct) return direct.trim()
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'FEISHU_BOT_WEBHOOK\',\'User\')"',
        { stdio: ['ignore', 'pipe', 'ignore'] },
      ).toString().trim()
      if (out.startsWith('http')) return out
    } catch { /* fallthrough */ }
  }
  return null
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/gi, '&')
}

function htmlToMarkdown(html) {
  let s = html
  s = s.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<hr\s*\/?>/gi, '\n---\n')
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => '\n' + '#'.repeat(Number(n)) + ' ')
  s = s.replace(/<li\b[^>]*>/gi, '- ')
  s = s.replace(/<(?:strong|b)\b[^>]*>/gi, '**').replace(/<\/(?:strong|b)>/gi, '**')
  s = s.replace(/<(?:em|i)\b[^>]*>/gi, '*').replace(/<\/(?:em|i)>/gi, '*')
  s = s.replace(/<code\b[^>]*>/gi, '`').replace(/<\/code>/gi, '`')
  s = s.replace(/<a\b[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${text.replace(/<[^>]+>/g, '').trim() || href}](${href})`)
  s = s.replace(/<t[hd]\b[^>]*>/gi, ' | ')
  s = s.replace(/<tr\b[^>]*>/gi, '\n')
  s = s.replace(/<\/(p|div|section|article|main|header|footer|blockquote|pre|table|ul|ol|figure)\s*>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = decodeEntities(s)
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return s
}

function titleFrom(raw, fallback, isHtml) {
  if (isHtml) {
    const m = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (m && m[1].trim()) return decodeEntities(m[1].trim())
    const h1 = raw.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
    if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, '').trim())
  } else {
    const m = raw.match(/^#\s+(.+)$/m)
    if (m) return m[1].trim()
  }
  return fallback
}

function chunkText(text, limit) {
  if (text.length <= limit) return [text]
  const parts = text.split(/\n\n+/)
  const out = []
  let cur = ''
  const flush = () => { if (cur) { out.push(cur); cur = '' } }
  for (const part of parts) {
    if (cur && (cur.length + 2 + part.length) > limit) flush()
    let p = part
    if (p.length > limit) {
      flush()
      while (p.length > limit) { out.push(p.slice(0, limit)); p = p.slice(limit) }
      cur = p
      continue
    }
    cur = cur ? `${cur}\n\n${p}` : p
  }
  flush()
  return out
}

async function main() {
  const args = process.argv.slice(2)
  let title = null
  const pos = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) { title = args[++i] } else { pos.push(args[i]) }
  }
  if (pos.length < 1) {
    console.error('usage: send-feishu-report.mjs <file.html|md|txt> [title]')
    process.exit(2)
  }
  if (pos.length >= 2 && !title) title = pos[1]
  const file = resolve(pos[0])
  if (!existsSync(file)) { console.error(`file not found: ${file}`); process.exit(2) }

  const webhook = resolveWebhook()
  if (!webhook) { console.error('[feishu-report] NO_WEBHOOK: FEISHU_BOT_WEBHOOK 未配置'); process.exit(1) }

  const raw = readFileSync(file, 'utf8')
  const ext = extname(file).toLowerCase()
  const isHtml = ext === '.html' || /^\s*<!doctype html|<html[\s>]/i.test(raw)
  const md = isHtml ? htmlToMarkdown(raw) : raw.trim()
  const finalTitle = title || titleFrom(raw, basename(file, ext), isHtml)

  const chunks = chunkText(md, MAX_CHUNK)
  for (let i = 0; i < chunks.length; i++) {
    const partLabel = chunks.length > 1 ? `（${i + 1}/${chunks.length}）` : ''
    const card = {
      header: {
        title: { tag: 'plain_text', content: `${finalTitle}${partLabel}` },
        template: 'blue',
      },
      elements: [{ tag: 'markdown', content: chunks[i] }],
    }
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msg_type: 'interactive', card }),
    })
    const data = await res.json().catch(() => ({}))
    const ok = (data.code ?? data.StatusCode) === 0
    if (!ok || !res.ok) {
      console.error(`[feishu-report] REJECTED chunk ${i + 1}/${chunks.length} http=${res.status} ${JSON.stringify(data)}`)
      process.exit(1)
    }
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 500))
  }
  console.log(`[feishu-report] SENT title="${finalTitle}" chunks=${chunks.length} file=${basename(file)}`)
}

main().catch((error) => {
  console.error(`[feishu-report] ERROR ${error?.message || error}`)
  process.exit(1)
})
