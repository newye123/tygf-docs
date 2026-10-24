// SERP 结果分类（纯函数、可离线复跑）：把"结果页上有没有我们"拆成三件事，不再混成一个"位次"。
// 为什么要拆：10-22 复算 10-21 的盘上读数发现，探针只认 ASCII `tuyigf`（geo-serp-probe.mjs:62），
// 而百度结果卡的 src 位放的是**中文站名**（"CSDN博客"）、host 位全是 `/link?url=` 跳转壳（www.baidu.com）。
// 于是我们那篇 CSDN 文在 5 组自有查询里出现 4 次（品牌词第 5、产品词第 2、需求词第 6、长句词**第 1**），
// 却全被判成"百度 0 条在场"——**把"站外的我们"读成了"没有我们"**。
// 纪律：本模块只按"证据形状"分类，不猜归属；站外归属靠**标题签名**（我们发布稿里的原文标题），不靠平台名。

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase()

// 我们自己在站外发过的稿子——签名一律取**盘上可证的已发布标题片段**，一条对应一篇。
// 不靠平台名归属（"CSDN博客"上有别人的文），只靠标题签名。
export const OWN_OFFSITE_SIGNATURES = [
  {
    id: 'csdn-1',
    sig: '图层体检、译文表、回读核对的完整流程与五个坑',
    source: '交付档案/执行方案/操卡_20261017_站外四道人工闸_手点清单.md:12（标题原文）',
    proof: '本会话线上实测（curl 夹在两次 date 回显 09:38:13 与 09:41:07 之间）：https://blog.csdn.net/qq_15947311/article/details/168246942 ⇒ http=200、330,812 B、<title> 与该签名逐字一致、正文含 tuyigf.com 2 次',
  },
  {
    id: 'zhihu-1',
    sig: '从图层体检到回读核对的完整流程',
    source: '交付档案/杂项/飞书推送_20261017_编码撤回与词面改PS.md:33（"已线上生效，标题实测一致"）',
    proof: '本轮未独立复采线上页面 ⇒ 归属按盘上记录，标 B 级',
  },
  // 下面两条由 10-23 的"从 SERP 反查归属"扫描补入：每条都必须①标题真的出现在已落盘的结果行里，
  // ②仓库里有对应稿子/判决。缺任何一条就不许进表（上一轮的错就错在按平台名猜归属）。
  {
    id: 'github-docs',
    sig: '图译工坊公开文档',
    source: '交付档案/宣传与运营/宣传运营方向_20261014_GitHub阵地_对抗式审查与方向裁定.md:78（tygf-docs 两仓判决）',
    proof: '本会话实跑：必应品牌词行 items 含 "GitHub - newye123/tygf-docs: 图译工坊公开文档：安装 …"（geo-serp_20261021_r3.jsonl，账号 newye123 与本仓 git user 同名）',
  },
  {
    id: 'toutiao-2',
    sig: '第三类才是把已有译文批量写回',
    source: '交付档案/宣传与运营/发布稿_20261017_微头条第二条_三类产品拆分.txt:1',
    proof: '发布证据为盘上原式：执行报告_20261017_GEO内容第二批_知乎长文与微头条上线.md:14（POST /mp/agw/article/wtt → 200，后台「已发布」）；本会话实跑：必应长句词行 items 含同标题（今日头条）',
  },
]

// 本站域名信号（不区分大小写、去空白后匹配）。
const DOMAIN_SIG = 'tuyigf'
// 品牌名信号：出现在标题里但域名不是我们的 ⇒ 只算"被提及"，不算"本站在场"。
const BRAND_SIG = '图译工坊'
// 同族名撞车（"X 译工坊／翻译工坊"这类），专治"品牌词页上不是我们"。
const COLLISION_RE = /[\u4e00-\u9fa5]{1,4}译工坊|翻译工坊|译图工坊/

const textOf = (it) => norm((it.title || '') + '|' + (it.src || '') + '|' + (it.host || ''))

// 分类一条结果。返回 null 表示"与本站无关的第三方"。
export function classifyItem(it) {
  const t = textOf(it)
  if (t.includes(DOMAIN_SIG)) return 'own_domain'
  const hit = OWN_OFFSITE_SIGNATURES.find((s) => t.includes(norm(s.sig)))
  if (hit) return 'own_offsite:' + hit.id
  if (t.includes(norm(BRAND_SIG))) return 'brand_mention'
  if (COLLISION_RE.test(String(it.title || '') + ' ' + String(it.src || ''))) return 'name_collision'
  return null
}

// 整页分类：位次一律用 `pos`（该块在结果节点里的原始序号，1 起），不用"解析成功第几条"。
// 10-21 的 rank 是 items 数组下标（probe.mjs:48 会把没有标题锚点的块整块跳过 ⇒ 序号会往前挤）。
export function classifyItems(items = []) {
  const out = { ownDomain: [], ownOffsite: [], brandMention: [], nameCollision: [], unknown: [] }
  items.forEach((it, i) => {
    const pos = Number.isFinite(it.pos) && it.pos > 0 ? it.pos : i + 1
    const cls = classifyItem(it)
    const rec = { pos, title: it.title, src: it.src, host: it.host }
    if (cls === 'own_domain') out.ownDomain.push(rec)
    else if (cls && cls.startsWith('own_offsite:')) out.ownOffsite.push({ ...rec, who: cls.slice(12) })
    else if (cls === 'brand_mention') out.brandMention.push(rec)
    else if (cls === 'name_collision') out.nameCollision.push(rec)
    else out.unknown.push(rec)
  })
  const first = (a) => (a.length ? a[0].pos : -1)
  const ownPositions = [first(out.ownDomain), first(out.ownOffsite)].filter((x) => x >= 0)
  return {
    ...out,
    ownDomainPos: first(out.ownDomain),
    ownOffsitePos: first(out.ownOffsite),
    // 品牌名最早被别家用在第几位（专治「SCT图译工坊」这种直接拿我们名字当产品名的）
    brandMentionPos: first(out.brandMention),
    // "我们"在页上最早的位置：本站与站外我们取更早的一个；两者都没有 ⇒ -1。
    ownAnyPos: ownPositions.length ? Math.min(...ownPositions) : -1,
    collisionPos: first(out.nameCollision),
  }
}
