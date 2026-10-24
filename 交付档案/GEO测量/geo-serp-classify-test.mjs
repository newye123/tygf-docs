// 检索面分类器的离线负控（不联网）：拿 10-21 盘上真读数 + 四条人造反例，验"分类会不会骗人"。
// 跑法：node 交付档案/GEO测量/geo-serp-classify-test.mjs    （全绿 rc=0；任一失守 rc=1）
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { classifyItem, classifyItems, OWN_OFFSITE_SIGNATURES } from './geo-serp-classify.mjs'

const HERE = path.dirname(url.fileURLToPath(import.meta.url))
const total = []
const fail = []
const ok = (name, cond, detail) => { total.push(name); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' ｜ ' + detail : ''}`); if (!cond) fail.push(name) }

// ── C1 实盘反例：10-21 百度品牌词那一行，旧判据说"0 在场"，新分类器必须认出站外的我们 ──
const r3file = path.join(HERE, 'geo-serp_20261021_r3.jsonl')
if (fs.existsSync(r3file)) {
  const rows = fs.readFileSync(r3file, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const baiduBrand = rows.find((r) => r.id === 'brand' && /baidu/.test(r.url))
  const baiduGuide = rows.find((r) => r.id === 'guide' && /baidu/.test(r.url))
  const c = classifyItems(baiduBrand.items)
  ok('C1a 实盘百度品牌词：本站域名确实不在前十（ownDomainPos=-1）', c.ownDomainPos === -1, 'ownDomainPos=' + c.ownDomainPos)
  ok('C1b 实盘百度品牌词：我们的 CSDN 文被认出来了（旧尺子读成"0 在场"）',
    c.ownOffsitePos > 0 && c.ownOffsite[0].who === 'csdn-1', 'pos=' + c.ownOffsitePos + ' title=' + c.ownOffsite[0].title.slice(0, 24))
  ok('C1c 实盘百度品牌词：同族名撞车被点名（"美译工坊"那一类）', c.nameCollision.length >= 1, c.nameCollision.map((x) => x.src + '@' + x.pos).join(','))
  ok('C1d ownAnyPos 取"我们"最早位置（站外我们优先于第三方）', c.ownAnyPos === c.ownOffsitePos, 'ownAnyPos=' + c.ownAnyPos)
  const g = classifyItems(baiduGuide.items)
  ok('C1e 实盘百度长句词：我们那条排在第 1（旧报告写的是"百度 0 条"）', g.ownOffsitePos === 1, 'pos=' + g.ownOffsitePos)
  ok('C1f 实盘百度长句词：第三方教程文不得算我们', g.ownOffsite.length === 1 && g.unknown.length > 0, 'ours=' + g.ownOffsite.length + ' unknown=' + g.unknown.length)
} else {
  console.log('NOT_RUN C1 盘上缺 geo-serp_20261021_r3.jsonl')
}

// ── C2 人造正控：本站域名形状必须归 own_domain，且优先于一切 ──
ok('C2a host 是 tuyigf.com ⇒ own_domain', classifyItem({ title: '随便', src: '', host: 'tuyigf.com' }) === 'own_domain')
ok('C2b src 位带域名（Bing 形态）⇒ own_domain', classifyItem({ title: '图译工坊 | PSD multilingual', src: 'tuyigf.com https://tuyigf.co', host: '' }) === 'own_domain')

// ── C3 人造反例：归属只认标题签名，不认平台名（防"凡是 CSDN 都算我们"）──
ok('C3a 别人发的 CSDN 文（平台同、标题不同）不得算我们',
  classifyItem({ title: 'PSD 批量处理教程 - CSDN博客', src: 'CSDN博客', host: 'www.baidu.com' }) === null, String(classifyItem({ title: 'PSD 批量处理教程 - CSDN博客', src: 'CSDN博客', host: 'www.baidu.com' })))
ok('C3b 别人提到我们品牌名 ⇒ brand_mention（不算本站在场）',
  classifyItem({ title: '测评：图译工坊好不好用', src: '知乎', host: 'www.baidu.com' }) === 'brand_mention')
ok('C3c 同族名不得被品牌名吃掉', classifyItem({ title: '美译工坊-在线翻译', src: ' ios.lbgpmb.cn/', host: 'www.baidu.com' }) === 'name_collision')

// ── C4 位次口径：pos（结果节点原始序号）优先于数组下标；缺 pos 时如实退回并可在下游看出差别 ──
ok('C4a 给了 pos 就按 pos 报（数组下标只当兜底）',
  classifyItems([{ pos: 12, title: 'PS 批量替换文字做多语言：图层体检、译文表、回读核对的完整流程与五个坑', src: 'CSDN博客', host: 'www.baidu.com' }]).ownOffsitePos === 12)
ok('C4b 没给 pos 退回下标+1（旧 jsonl 就是这个形状，别当页面位次）',
  classifyItems([{ title: 'x', src: 'y', host: '' }, { title: '图层体检、译文表、回读核对的完整流程与五个坑', src: 'CSDN博客', host: 'www.baidu.com' }]).ownOffsitePos === 2)

// ── C5 已声明的边界：标题签名是子串匹配，别人整篇抄标题会被误判为我们 ──
const copied = classifyItem({ title: '转发：PS 批量替换文字做多语言：图层体检、译文表、回读核对的完整流程与五个坑', src: '某转载站', host: 'www.baidu.com' })
ok('C5 已知边界如实成立（子串匹配会把"整篇抄我们标题的转载"认成我们）⇒ 要消掉得加 URL 白名单',
  copied === 'own_offsite:csdn-1', 'classify=' + copied)
ok('C5b 签名表每条都带出处与证明字段（不许出现无出处签名）',
  OWN_OFFSITE_SIGNATURES.every((s) => !!s.source && !!s.proof), OWN_OFFSITE_SIGNATURES.map((s) => s.id).join(','))

// ── C6 10-23 新入表的两条签名：必须能认出盘上 SERP 真出现过的标题，且不得多吃第三方 ──
ok('C6a GitHub 辅仓标题 ⇒ own_offsite:github-docs（必应品牌词行实测形状）',
  classifyItem({ title: 'GitHub - newye123/tygf-docs: 图译工坊公开文档：安装 …', src: 'Github https://github.com', host: 'github.com' }) === 'own_offsite:github-docs')
ok('C6b 头条微头条标题 ⇒ own_offsite:toutiao-2（必应长句词行实测形状）',
  classifyItem({ title: '第三类才是把已有译文批量写回 PSD/PSB 的文字图层', src: '今日头条 https://www.toutiao.com', host: 'toutiao.com' }) === 'own_offsite:toutiao-2')
ok('C6c 别人的 GitHub 仓（同平台不同标题）不得算我们',
  classifyItem({ title: 'GitHub - someone/psd-tools: PSD 批处理脚本', src: 'Github', host: 'github.com' }) === null)
ok('C6d 别人的头条号（同平台不同标题）不得算我们',
  classifyItem({ title: 'PS 批量替换内容_psd批量替换内容脚本-CSDN博客', src: 'CSDN博客', host: 'blog.csdn.net' }) === null)
// 「SCT图译工坊」这类**顶着我们品牌名的别家**：必须落 brand_mention（不是 own、也不是撞名正则的漏网）
ok('C6e 别家直接用"图译工坊"当产品名 ⇒ brand_mention（既不算在场，也不许被撞名正则吞掉）',
  classifyItem({ title: 'SCT图译工坊', src: '123keye.wang https://lingo.1', host: 'lingo.123keye.wang' }) === 'brand_mention')
// 全量实跑：五份 SERP 文件里我们（本站＋站外）到底出现在几组
const serpFiles = ['geo-serp_20261021_r2.jsonl', 'geo-serp_20261021_r3.jsonl', 'geo-serp_20261023.jsonl', 'geo-serp_20261023_r2.jsonl', 'geo-serp_20261023_r3.jsonl']
  .filter((f) => fs.existsSync(path.join(HERE, f)))
let ownRows = 0, offRows = 0, brandRows = 0, scanned = 0
for (const f of serpFiles) {
  for (const line of fs.readFileSync(path.join(HERE, f), 'utf8').trim().split('\n')) {
    const r = JSON.parse(line)
    if (!r.items || r.kind !== 'own') continue
    scanned++
    const o = classifyItems(r.items)
    if (o.ownDomainPos >= 0) ownRows++
    if (o.ownOffsitePos >= 0) offRows++
    if (o.brandMention.length) brandRows++
  }
}
ok('C6f 并表实跑有数：自有查询行 ' + scanned + ' 条里，官网在场 ' + ownRows + ' 条、站外我们在场 ' + offRows + ' 条、别家用我们品牌名 ' + brandRows + ' 条',
  scanned >= 20 && offRows > 0, 'files=' + serpFiles.length)

console.log(fail.length ? `分类器负控失守 ${fail.length}/${total.length} 条：${fail.join(', ')}` : `分类器负控全绿 ${total.length}/${total.length}`)
process.exit(fail.length ? 1 : 0)
