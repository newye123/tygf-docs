// 裁决搬到服务端后的算力与上行体量量级压测（合成规模，可复跑）
// 跑法：node --experimental-strip-types "交付档案/执行方案/附件_20261102_compile量级压测.mjs"
// 口径：耗时＝预热 1 次后取 5 次均值；上行字节＝JSON.stringify 的字节数，分别给三种投影口径。
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', 'worktrees', 'develop')
const { compileBindings } = await import(pathToFileURL(path.join(REPO, 'src/lib/trust-chain/binding-core.ts')).href)

const fingerprint = 'a'.repeat(64)

function build(nLayers, nRows) {
  const textLayers = []
  for (let i = 0; i < nLayers; i++) {
    const src = i % 3 === 0 ? `Feature ${i}\r\nmulti line ${i} with some more words` : `Feature ${i} short copy`
    textLayers.push({
      ledgerEntryId: `doc|Layer ${i}@${i}`, layerId: i + 1, layerPath: `L${i}`,
      sourceText: src, uneditable: false, textKind: 'TEXT',
    })
  }
  const translations = []
  for (let i = 0; i < nRows; i++) {
    translations.push({ rowId: `source:${i}`, rowIndex: i, source: `Feature ${i} short copy`, target: `Features ${i} courte kopie tekst` })
    if (i % 3 === 0) translations.push({ rowId: `source:multi:${i}`, rowIndex: i, source: `Feature ${i}\nmulti line ${i} with some more words`, target: `多行 ${i} 特徴テキスト 説明` })
  }
  return { observation: { fingerprint, textLayers }, translations, forcedBindings: [], excludedRowIds: [], ignoredRowIds: [] }
}

const bytes = (o) => Buffer.byteLength(JSON.stringify(o))
const projFull = (i) => ({ textLayers: i.observation.textLayers, translations: i.translations })
const projSlim = (i) => ({
  textLayers: i.observation.textLayers.map((l) => ({ ledgerEntryId: l.ledgerEntryId, layerId: l.layerId, sourceText: l.sourceText, uneditable: l.uneditable, textKind: l.textKind })),
  translations: i.translations.map((t) => ({ rowId: t.rowId, rowIndex: t.rowIndex, source: t.source, target: t.target })),
})
const projNoBody = (i) => ({
  textLayers: i.observation.textLayers.map((l) => ({ ledgerEntryId: l.ledgerEntryId, layerId: l.layerId, uneditable: l.uneditable, textKind: l.textKind, sourceDigest: '0'.repeat(64) })),
  translations: i.translations.map((t) => ({ rowId: t.rowId, rowIndex: t.rowIndex, source: t.source, target: t.target })),
})

function timeIt(input, reps = 5) {
  compileBindings(input) // 预热
  const runs = []
  for (let k = 0; k < reps; k++) {
    const t0 = process.hrtime.bigint()
    compileBindings(input)
    runs.push(Number(process.hrtime.bigint() - t0) / 1e6)
  }
  runs.sort((a, b) => a - b)
  return { median: runs[Math.floor(runs.length / 2)], min: runs[0], max: runs[runs.length - 1] }
}

console.log('规模(层×行)  中位ms   最小/最大ms   上行·全投影B  上行·瘦投影B  上行·不带图层正文B')
for (const [L, R] of [[57, 57], [300, 300], [800, 1500], [1500, 1500]]) {
  const input = build(L, R)
  const t = timeIt(input)
  console.log(
    `${String(L) + '×' + String(R)}`.padEnd(12),
    t.median.toFixed(1).padStart(7),
    `${t.median.toFixed(0)}/${t.max.toFixed(0)}`.padStart(14),
    String(bytes(projFull(input))).padStart(13),
    String(bytes(projSlim(input))).padStart(13),
    String(bytes(projNoBody(input))).padStart(20),
  )
}

const one = build(800, 1500)
const per = timeIt(one).median
console.log(`12 门语言各算一次（800×1500）：单门中位 ${per.toFixed(1)} ms ⇒ 合计约 ${(per * 12 / 1000).toFixed(2)} s`)
console.log('对照：PS 真跑一稿约 75,000 ms（既有真机读数），判定占比≈', ((per * 12) / 75000 * 100).toFixed(2) + '%')
