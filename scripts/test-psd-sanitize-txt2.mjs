#!/usr/bin/env node
/**
 * psd-sanitize-txt2.mjs 的离线自测（不联网、不依赖 Photoshop）。
 * 用合成的极小 PSD 夹具验证：只摘 Txt2、长度账目正确、拒绝 PSB/坏签名/越界块。
 * 若本机存在真实夹具（%TEMP%\tygf-typeedit-probe），再补一条「与已知良好产物逐字节一致」的断言。
 *
 * 用法：node scripts/test-psd-sanitize-txt2.mjs   退出码 0=全过
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parsePsd, stripTxt2 } from './psd-sanitize-txt2.mjs'

let passed = 0
function ok (name, fn) {
  try { fn(); passed++; console.log(`ok   ${name}`) } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1 }
}

function block (key, data) {
  const head = Buffer.alloc(12)
  head.write('8BIM', 0, 'latin1')
  head.write(key, 4, 'latin1')
  head.writeUInt32BE(data.length, 8)
  return Buffer.concat([head, data, Buffer.alloc(data.length % 2)])
}

function buildPsd ({ version = 1, blocks = [], bogusBlockLength = null } = {}) {
  const header = Buffer.alloc(26)
  header.write('8BPS', 0, 'latin1')
  header.writeUInt16BE(version, 4)
  header.writeUInt16BE(3, 12) // channels
  header.writeUInt32BE(10, 14) // height
  header.writeUInt32BE(10, 18) // width
  header.writeUInt16BE(8, 22) // depth
  header.writeUInt16BE(3, 24) // mode (RGB)
  const parts = [header, Buffer.alloc(4), Buffer.alloc(4)] // 颜色模式段、图像资源段长度均为 0
  const liLen = Buffer.alloc(4)
  const gmLen = Buffer.alloc(4)
  let blocksBuf = Buffer.concat(blocks)
  if (bogusBlockLength !== null) {
    const b = Buffer.from(blocksBuf)
    b.writeUInt32BE(bogusBlockLength, 8) // 故意把第一个块的声明长度改坏
    blocksBuf = b
  }
  const sectionLen = 4 + 0 + 4 + 0 + blocksBuf.length
  const lmLen = Buffer.alloc(4)
  lmLen.writeUInt32BE(sectionLen)
  parts.push(lmLen, liLen, gmLen, blocksBuf)
  return Buffer.concat(parts)
}

const txt2 = block('Txt2', Buffer.from('old-text-old-text', 'utf16le').subarray(0, 10))
const artd = block('artd', Buffer.from([1, 2, 3, 4]))

ok('合成夹具结构可解析', () => {
  const p = parsePsd(buildPsd({ blocks: [artd, txt2] }))
  assert.equal(p.version, 1)
  assert.deepEqual(p.blocks.map(b => b.key), ['artd', 'Txt2'])
  assert.equal(p.sectionEnd - p.scanEnd, 0, '块应恰好铺满图层与蒙版段')
})

ok('strip 只摘 Txt2，长度账目与总长同步', () => {
  const src = buildPsd({ blocks: [artd, txt2] })
  const r = stripTxt2(src)
  assert.equal(r.changed, true)
  assert.equal(r.removed, 1)
  assert.equal(r.out.length, src.length - r.removedBytes)
  const after = parsePsd(r.out)
  assert.deepEqual(after.blocks.map(b => b.key), ['artd'])
  assert.equal(after.layerMaskLen, parsePsd(src).layerMaskLen - r.removedBytes)
})

ok('没有 Txt2 时不改盘（changed=false）', () => {
  const r = stripTxt2(buildPsd({ blocks: [artd] }))
  assert.equal(r.changed, false)
  assert.equal(r.removed, 0)
})

ok('非 PSD 签名必须拒绝', () => {
  const bad = buildPsd({ blocks: [artd] })
  bad.write('XXXX', 0, 'latin1')
  assert.throws(() => parsePsd(bad), /签名不是 8BPS/)
})

ok('PSB（version=2）必须拒绝而不是猜结构', () => {
  assert.throws(() => parsePsd(buildPsd({ version: 2, blocks: [artd] })), /PSB/)
})

ok('块声明长度越过段末尾必须拒绝', () => {
  assert.throws(() => parsePsd(buildPsd({ blocks: [artd], bogusBlockLength: 4096 })), /越过图层与蒙版段末尾/)
})

ok('多个 Txt2 块一次摘净', () => {
  const src = buildPsd({ blocks: [txt2, artd, txt2] })
  const r = stripTxt2(src)
  assert.equal(r.removed, 2)
  assert.equal(parsePsd(r.out).blocks.some(b => b.key === 'Txt2'), false)
})

// —— 真实夹具交叉验证（存在才跑；不存在不算失败）——
const real = path.join(os.tmpdir(), 'tygf-typeedit-probe')
const src = path.join(real, 'out.psd')
const known = path.join(real, 'out-no-txt2.psd')
if (fs.existsSync(src) && fs.existsSync(known)) {
  ok('真实夹具：本工具输出与已验证的良好产物逐字节一致', () => {
    const r = stripTxt2(fs.readFileSync(src))
    assert.equal(r.changed, true)
    assert.ok(r.out.equals(fs.readFileSync(known)), '与 out-no-txt2.psd 不一致 ⇒ 算法已漂')
  })
} else {
  console.log('skip 真实夹具交叉验证（%TEMP%\\tygf-typeedit-probe 不完整）')
}

console.log(`\n${passed} passed`)
