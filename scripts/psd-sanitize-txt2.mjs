#!/usr/bin/env node
/**
 * psd-sanitize-txt2.mjs — 摘掉 PSD 里的全局 `Txt2`（文档级文本引擎数据）块。
 *
 * 背景（2026-10-20 实测，见 交付档案/执行方案/执行方案_20261020_免PS写回_Txt2阻断判决与修复层_对抗式审查.md）：
 *   PhotoCraft 引擎保存出来的 PSD 会多写一个全局 `Txt2` 块；PS 22.0 打开这类文件报
 *   0x80042260「发生了常规 Photoshop 错误」。把该块摘掉后，4 个夹具全部能打开、137 个
 *   文字层齐全、改过的层显示新文本，且 PS 能正常另存并再次打开。
 *
 * 边界（刻意保守）：
 *   - 只支持 PSD（8BPS, version=1）。PSB（version=2）**拒绝**并给出明确错误，不猜结构。
 *   - 只在「确实存在 Txt2」时改文件；不存在时退出码 3、不写盘（不制造无意义改动）。
 *   - 任何结构不自洽（签名/长度越界/块头不完整）⇒ 退出码 1，不写盘。
 *
 * 这不是产品接线：仅研究/运维工具。产品侧接线须按方案 A 档走 pc-executor 保存后清洗，
 * 并保持 smoke-pc-wiring-freeze 的冻结断言不被绕过。
 *
 * 用法：
 *   node scripts/psd-sanitize-txt2.mjs inspect <file.psd>
 *   node scripts/psd-sanitize-txt2.mjs strip <in.psd> <out.psd>
 * 退出码：0 成功 / 1 拒绝或失败 / 3 没有 Txt2（未写盘）
 */
import fs from 'node:fs'

const SIG = '8BPS'

function fail (msg) {
  const e = new Error(msg)
  e.code = 'SANITIZE_REFUSED'
  throw e
}

export function parsePsd (buf) {
  if (buf.length < 26) fail('文件太短，连 26 字节的 PSD 头都不够')
  if (buf.subarray(0, 4).toString('latin1') !== SIG) fail('不是 PSD：签名不是 8BPS')
  const version = buf.readUInt16BE(4)
  if (version === 2) fail('PSB（8BPS version=2）不在本工具范围：段长度语义不同，需单独实现与验收')
  if (version !== 1) fail(`未知 PSD 版本 ${version}`)

  let o = 26
  const colorModeLen = buf.readUInt32BE(o); o += 4
  if (o + colorModeLen > buf.length) fail('颜色模式段越界')
  o += colorModeLen

  const imageResourcesLen = buf.readUInt32BE(o); o += 4
  if (o + imageResourcesLen > buf.length) fail('图像资源段越界')
  o += imageResourcesLen

  const layerMaskLenPos = o
  const layerMaskLen = buf.readUInt32BE(o); o += 4
  const layerMaskStart = o
  if (layerMaskStart + layerMaskLen > buf.length) fail('图层与蒙版段越界')

  let p = o
  const layerInfoLen = buf.readUInt32BE(p); p += 4
  if (p + layerInfoLen > buf.length) fail('图层信息子段越界')
  p += layerInfoLen

  const globalMaskLen = buf.readUInt32BE(p); p += 4
  if (p + globalMaskLen > buf.length) fail('全局蒙版段越界')
  p += globalMaskLen

  const end = layerMaskStart + layerMaskLen
  const blocks = []
  while (p + 12 <= end) {
    const sig = buf.subarray(p, p + 4).toString('latin1')
    if (sig !== '8BIM' && sig !== '8B64') break
    const key = buf.subarray(p + 4, p + 8).toString('latin1')
    const len = buf.readUInt32BE(p + 8)
    const size = 12 + len + (len % 2)
    if (p + size > end) fail(`块 ${key} 声明长度 ${len} 越过图层与蒙版段末尾`)
    blocks.push({ sig, key, len, offset: p, size })
    p += size
  }

  return { version, layerMaskLenPos, layerMaskLen, layerMaskStart, layerInfoLen, globalMaskLen, blocks, scanEnd: p, sectionEnd: end }
}

export function stripTxt2 (buf) {
  const parsed = parsePsd(buf)
  const hits = parsed.blocks.filter(b => b.key === 'Txt2')
  if (hits.length === 0) return { changed: false, removed: 0, removedBytes: 0, out: buf, parsed }

  let out = Buffer.from(buf)
  let removedBytes = 0
  for (const h of [...hits].sort((a, b) => b.offset - a.offset)) {
    out = Buffer.concat([out.subarray(0, h.offset), out.subarray(h.offset + h.size)])
    removedBytes += h.size
  }
  out.writeUInt32BE(parsed.layerMaskLen - removedBytes, parsed.layerMaskLenPos)

  // 自校验：重新解析 + 长度账目必须对得上
  const after = parsePsd(out)
  if (after.layerMaskLen !== parsed.layerMaskLen - removedBytes) fail('自校验失败：图层与蒙版段长度未按删除量收缩')
  if (out.length !== buf.length - removedBytes) fail('自校验失败：文件总长与删除量不符')
  if (after.blocks.some(b => b.key === 'Txt2')) fail('自校验失败：仍残留 Txt2 块')

  return { changed: true, removed: hits.length, removedBytes, out, parsed, after }
}

function main (argv) {
  const [cmd, a, b] = argv
  if (cmd === 'inspect') {
    if (!a) return usage()
    const parsed = parsePsd(fs.readFileSync(a))
    console.log(JSON.stringify({
      file: a,
      version: parsed.version,
      layerMaskLen: parsed.layerMaskLen,
      layerInfoLen: parsed.layerInfoLen,
      globalMaskLen: parsed.globalMaskLen,
      blocks: parsed.blocks.map(x => ({ key: x.key, len: x.len, offset: x.offset })),
      unparsedTailBytes: parsed.sectionEnd - parsed.scanEnd
    }, null, 1))
    return 0
  }
  if (cmd === 'strip') {
    if (!a || !b) return usage()
    const buf = fs.readFileSync(a)
    let r
    try {
      r = stripTxt2(buf)
    } catch (e) {
      console.error(`REFUSED ${e.message}`)
      return 1
    }
    if (!r.changed) {
      console.error(`NO_TXT2 ${a}：没有 Txt2 块，未写盘`)
      return 3
    }
    fs.writeFileSync(b, r.out)
    console.log(JSON.stringify({ in: a, out: b, removedBlocks: r.removed, removedBytes: r.removedBytes, inBytes: buf.length, outBytes: r.out.length }))
    return 0
  }
  return usage()
}

function usage () {
  console.error('usage: node scripts/psd-sanitize-txt2.mjs inspect <file.psd>\n       node scripts/psd-sanitize-txt2.mjs strip <in.psd> <out.psd>')
  return 2
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/scripts/psd-sanitize-txt2.mjs')
if (invokedDirectly) process.exit(main(process.argv.slice(2)))
