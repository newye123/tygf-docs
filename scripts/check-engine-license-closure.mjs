#!/usr/bin/env node
/*
 * check-engine-license-closure.mjs — 内置排版引擎（tygf-engine，上游 PhotoCraft）依赖闭包的许可闸
 *
 * 为什么要有它（ISSUES #213）：
 *   出厂的中性引擎是我们自己 cargo build 出来的，但随包的第三方组件清单
 *   （licenses/THIRD-PARTY-NOTICES.tsv，345 行）是 2026-10-17 对**上游产物**的 Cargo.lock 算的；
 *   BUILD-MANIFEST.txt:64 自陈"本自编产物没有重跑，且仓库内没有可复跑的扫描脚本"。
 *   一旦引擎换版本（上游 main 已修 #6968，迟早要升），依赖闭包必变 ⇒ 没有这道闸就等于对外分发未核过的二进制。
 *
 * 它做什么（纯本地、无网络、不依赖 cargo）：
 *   1) 解析指定 Cargo.lock，按依赖边算出 `photocraft-cli` 的真实闭包（与 10-17 那次同口径：含未启用可选依赖＝上界）；
 *   2) 与随包 TSV 逐只对照：闭包里有、清单里没有 ⇒ **未披露**（exit 1）；
 *   3) 扫许可串里的强 copyleft（GPL/AGPL/LGPL）⇒ **阻断**（exit 1）；MPL/CDDL/EPL 只提示（弱 copyleft，组件级隔离即可）；
 *   4) 打印可贴进交付件的三行摘要（闭包数／清单行数／差集）。
 *
 * 用法：
 *   node scripts/check-engine-license-closure.mjs [Cargo.lock 路径] [TSV 路径]
 *   缺省：tmp/photocraft-src/Cargo.lock ＋ worktrees/develop/.../vendor/photocraft/licenses/THIRD-PARTY-NOTICES.tsv
 * 退出码：0 通过｜1 有未披露或强 copyleft｜2 输入文件缺失
 */
import fs from 'node:fs'

const ROOT = process.cwd()
const LOCK = process.argv[2] || `${ROOT}/tmp/photocraft-src/Cargo.lock`
const TSV = process.argv[3] ||
  `${ROOT}/worktrees/develop/download/local-assistant/build/vendor/photocraft/licenses/THIRD-PARTY-NOTICES.tsv`
const ROOT_PKG = 'photocraft-cli'
// Cargo.lock 本身**不带** license 字段（实测全空），许可串只认随包 TSV 里那列（来源＝crates.io 逐只查询）。
const STRONG = /(GPL|AGPL|LGPL)/i
const WEAK = /(MPL|CDDL|EPL)/i
const PERMISSIVE = /(MIT|Apache|BSD|ISC|0BSD|Zlib|Unlicense|CC0|OFL|WTFPL|Mulan|PostgreSQL)/i

/**
 * 判定"强制 copyleft"：SPDX 里 `A OR B` 表示**接收方可选**，只要有一个宽松选项就不阻断
 * （r-efi 就是 Apache-2.0 OR MIT OR GPL-3.0 WITH autoconf_exception，10-17 已选 MIT/Apache）；
 * 只有 `AND` 链里出现 copyleft、或整串没有任何宽松选项时才算阻断。
 */
function classify(lic) {
  if (!lic) return { strong: false, weak: false, note: '无许可记录' }
  const options = String(lic).split(/\s+OR\s+/i)
  const anyPermissive = options.some((o) => PERMISSIVE.test(o))
  const strongOnly = !anyPermissive && options.some((o) => STRONG.test(o))
  const andCopyleft = /AND/i.test(lic) && STRONG.test(lic)
  return { strong: strongOnly || andCopyleft, weak: WEAK.test(lic), note: '' }
}

if (!fs.existsSync(LOCK)) { console.error(`[license-closure] 缺 Cargo.lock：${LOCK}`); process.exit(2) }
if (!fs.existsSync(TSV)) { console.error(`[license-closure] 缺随包清单：${TSV}`); process.exit(2) }

// —— 1) 解析 lock 并算闭包（逻辑与 10-17 的 tmp/pc-closure.mjs 同源，此处入库为唯一权威版）——
const blocks = fs.readFileSync(LOCK, 'utf8').split('[[package]]').slice(1)
const pkgs = []
for (const b of blocks) {
  const nm = /name = "([^"]+)"/.exec(b)
  const vr = /version = "([^"]+)"/.exec(b)
  const src = /source = "([^"]+)"/.exec(b)
  const lic = /license = "([^"]+)"/.exec(b)
  const deps = [...b.matchAll(/^\s+"([^"]+)"/gm)].map((m) => m[1])
  if (nm && vr) pkgs.push({ key: `${nm[1]} ${vr[1]}`, name: nm[1], version: vr[1], license: lic ? lic[1] : '', registry: src ? src[1] : 'local', deps })
}
const byKey = new Map(pkgs.map((p) => [p.key, p]))
for (const p of pkgs) {
  for (let i = 0; i < p.deps.length; i++) {
    const d = p.deps[i]
    if (!byKey.has(d)) {
      const cands = pkgs.filter((q) => q.name === d)
      if (cands.length === 1) p.deps[i] = cands[0].key
    }
  }
}
const seen = new Set()
const stack = pkgs.filter((p) => p.name === ROOT_PKG)
for (const s of stack) seen.add(s.key)
while (stack.length) {
  const p = stack.pop()
  for (const d of p.deps) {
    const q = byKey.get(d)
    if (q && !seen.has(d)) { seen.add(d); stack.push(q) }
  }
}
const closure = [...seen].map((k) => byKey.get(k)).filter(Boolean)
const registry = closure.filter((p) => p.registry.startsWith('registry'))

// —— 2) 读随包 TSV（跳过 # 注释与表头）——
const shipped = new Map()
for (const line of fs.readFileSync(TSV, 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue
  const [name, license] = line.split('\t')
  if (name && name !== 'component') shipped.set(name.trim(), (license || '').trim())
}

// —— 3) 对照与 copyleft 扫描（许可串只取 TSV 那列）——
const licOf = (p) => shipped.get(p.name) || ''
const uniqueNames = [...new Set(registry.map((p) => p.name))]
const missing = registry.filter((p) => !shipped.has(p.name)).map((p) => `${p.name} ${p.version}`)
const extra = [...shipped.keys()].filter((n) => !registry.some((p) => p.name === n))
const strong = registry.filter((p) => classify(licOf(p)).strong)
const weak = registry.filter((p) => classify(licOf(p)).weak)
const unl = registry.filter((p) => !licOf(p))

console.log(`[license-closure] lock=${LOCK.split('/').slice(-2).join('/')} 闭包=${closure.length} 个包版本（registry ${registry.length} 版本／${uniqueNames.length} 个唯一名／workspace local ${closure.length - registry.length}）`)
console.log(`[license-closure] 随包清单=${shipped.size} 行｜未披露=${missing.length}｜清单多余=${extra.length}（多余＝上界口径的正常结果，只作提示）`)
if (unl.length) console.log(`[license-closure] 提示：${unl.length} 只在清单里查不到许可串（多为 workspace 内件或清单缺列）`)
if (weak.length) console.log(`[license-closure] 弱 copyleft 提示 ${weak.length} 只（组件级隔离即可，不阻断）：${[...new Set(weak.map((p) => p.name))].slice(0, 8).join(', ')}${weak.length > 8 ? ' …' : ''}`)
for (const m of missing) console.log(`[license-closure] ✗ 未披露：${m}`)
for (const s of strong) console.log(`[license-closure] ✗ 强制 copyleft（无宽松选项）：${s.name} ${s.version}｜${licOf(s)}`)

const fail = missing.length > 0 || strong.length > 0
console.log(fail
  ? '[license-closure] 结论：不通过——换版本后必须补齐随包清单（或移除该依赖）才能出包'
  : '[license-closure] 结论：通过——闭包内每一只都已在随包清单披露，且无强 copyleft')
process.exit(fail ? 1 : 0)
