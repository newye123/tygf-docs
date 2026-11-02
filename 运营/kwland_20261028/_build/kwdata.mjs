/* 关键词落地页数据层。
   每个关键词一条：搜索者是谁、SERP 里这类词由什么形态承接、痛点、色调。
   承接形态依据来自 交付档案/GEO测量/测量记录_20261017_中文SERP前排形态与百度收录在场性.md
   词表来自 交付档案/宣传与运营/答复_20261014_SEO-GEO关键词与自查词表.md:22-33 */

const F = '"Segoe UI","Microsoft YaHei",Arial,sans-serif';
const M = 'Consolas,"Microsoft YaHei",monospace';
const D = '"Segoe UI","Microsoft YaHei",Arial,sans-serif';

const base = (v) => ({
  '--font': F, '--display': D, '--mono': M,
  '--radius': '16px', '--radius-sm': '9px',
  '--max': '1180px', '--display-weight': '760', '--display-tracking': '-.05em',
  '--section-pad': '92px',
  ...v
});

export const themes = {
  amber: { label: { zh: '暖琥珀', en: 'Amber' }, vars: base({
    '--bg': '#fbf7f0', '--panel': '#fffdf9', '--soft': '#f4ece0', '--ink': '#1f1a13',
    '--muted': '#6b6053', '--line': '#e6dccd', '--accent': '#8a4b0f', '--accent-2': '#c9822e',
    '--accent-ink': '#fff8ee'
  }) },
  marine: { label: { zh: '墨蓝', en: 'Marine' }, vars: base({
    '--bg': '#f2f5fa', '--panel': '#ffffff', '--soft': '#e6edf7', '--ink': '#101a2b',
    '--muted': '#56637a', '--line': '#d7e0ec', '--accent': '#1b4f9c', '--accent-2': '#5d8ed0',
    '--accent-ink': '#f4f8ff'
  }) },
  teal: { label: { zh: '青绿', en: 'Teal' }, vars: base({
    '--bg': '#f0f8f6', '--panel': '#ffffff', '--soft': '#e0f1ec', '--ink': '#0d1f1c',
    '--muted': '#47635d', '--line': '#cfe4de', '--accent': '#0f6b5c', '--accent-2': '#3f9c8b',
    '--accent-ink': '#f2fdfa'
  }) },
  violet: { label: { zh: '靛紫', en: 'Violet' }, vars: base({
    '--bg': '#f5f3fb', '--panel': '#ffffff', '--soft': '#ebe6f8', '--ink': '#18122b',
    '--muted': '#5d5478', '--line': '#ddd6f0', '--accent': '#5a3fb0', '--accent-2': '#8b74d8',
    '--accent-ink': '#f8f5ff'
  }) },
  graphite: { label: { zh: '石墨', en: 'Graphite' }, vars: base({
    '--bg': '#14161a', '--panel': '#1b1e23', '--soft': '#22262c', '--ink': '#e9edf2',
    '--muted': '#9aa4b1', '--line': '#2c3138', '--accent': '#7fb2e8', '--accent-2': '#b7d3f2',
    '--accent-ink': '#0b1220'
  }) },
  ember: { label: { zh: '暖橙', en: 'Ember' }, vars: base({
    '--bg': '#fdf4ef', '--panel': '#ffffff', '--soft': '#fbe6da', '--ink': '#2a150c',
    '--muted': '#74503f', '--line': '#f0d8c9', '--accent': '#a8451a', '--accent-2': '#d47340',
    '--accent-ink': '#fff5f0'
  }) },
  sand: { label: { zh: '米白', en: 'Sand' }, vars: base({
    '--bg': '#faf7f2', '--panel': '#fffdfa', '--soft': '#f2ece1', '--ink': '#221d16',
    '--muted': '#6a6152', '--line': '#e8e0d2', '--accent': '#6d5218', '--accent-2': '#a9873c',
    '--accent-ink': '#fffaf0'
  }) },
  pine: { label: { zh: '松绿', en: 'Pine' }, vars: base({
    '--bg': '#f1f6f3', '--panel': '#ffffff', '--soft': '#e2eee7', '--ink': '#0f1f18',
    '--muted': '#4e6459', '--line': '#d3e3d9', '--accent': '#20604a', '--accent-2': '#4a9077',
    '--accent-ink': '#f2fbf6'
  }) },
  wine: { label: { zh: '酒红', en: 'Wine' }, vars: base({
    '--bg': '#fbf3f4', '--panel': '#ffffff', '--soft': '#f5e3e6', '--ink': '#261216',
    '--muted': '#74535a', '--line': '#ecd6da', '--accent': '#8a1f33', '--accent-2': '#b85468',
    '--accent-ink': '#fff5f6'
  }) },
  inkgold: { label: { zh: '墨黑金', en: 'Ink & Gold' }, vars: base({
    '--bg': '#0e0d0b', '--panel': '#17150f', '--soft': '#1e1b14', '--ink': '#f2ead9',
    '--muted': '#a89e88', '--line': '#2c281e', '--accent': '#d8b25f', '--accent-2': '#efd69a',
    '--accent-ink': '#16110a'
  }) },
  slate: { label: { zh: '蓝灰', en: 'Slate' }, vars: base({
    '--bg': '#f4f6f8', '--panel': '#ffffff', '--soft': '#e7ecf1', '--ink': '#121a22',
    '--muted': '#55636f', '--line': '#d8e0e7', '--accent': '#2a5f8f', '--accent-2': '#5d90bb',
    '--accent-ink': '#f5faff'
  }) },
  bronze: { label: { zh: '青铜', en: 'Bronze' }, vars: base({
    '--bg': '#15130f', '--panel': '#1c1915', '--soft': '#241f19', '--ink': '#f0e9df',
    '--muted': '#a99e8e', '--line': '#2f2a22', '--accent': '#cf9a52', '--accent-2': '#e6c190',
    '--accent-ink': '#1a130a'
  }) }
};

/* 12 个语种槽位：界面只演示「每种语言占一个槽位」，示例句都是短句，页面标示意 */
export const LANGS = [
  { code: 'zh', name: '简体中文', en: 'Chinese (Simplified)', sample: '这一版改好了', dir: 'ltr' },
  { code: 'zht', name: '繁體中文', en: 'Chinese (Traditional)', sample: '這一版改好了', dir: 'ltr' },
  { code: 'en', name: 'English', en: 'English', sample: 'This version is ready', dir: 'ltr' },
  { code: 'ja', name: '日本語', en: 'Japanese', sample: 'この版は完了', dir: 'ltr' },
  { code: 'ko', name: '한국어', en: 'Korean', sample: '이 버전 완료', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', en: 'German', sample: 'Diese Fassung ist fertig', dir: 'ltr' },
  { code: 'fr', name: 'Français', en: 'French', sample: 'Cette version est prête', dir: 'ltr' },
  { code: 'es', name: 'Español', en: 'Spanish', sample: 'Esta versión está lista', dir: 'ltr' },
  { code: 'it', name: 'Italiano', en: 'Italian', sample: 'Questa versione è pronta', dir: 'ltr' },
  { code: 'pt', name: 'Português', en: 'Portuguese', sample: 'Esta versão está pronta', dir: 'ltr' },
  { code: 'ru', name: 'Русский', en: 'Russian', sample: 'Эта версия готова', dir: 'ltr' },
  { code: 'ar', name: 'العربية', en: 'Arabic', sample: 'هذه النسخة جاهزة', dir: 'rtl' }
];

const B = (zh, en) => ({ zh, en });

/* 每页都带的边界句，内容按页调整 */
const BOUNDARY_COMMON = {
  zh: '本页是模拟件：版面、交互、配色都是真的，页面上的产品界面是示意，不代表真实截图。',
  en: 'This is a mock: the layout, interactions and colours are real; the product UI shown is schematic, not a real screenshot.'
};

export const pages = [
  /* ------------------------------------------------------------------ */
  {
    id: '01', slug: 'psd-batch-edit', theme: 'amber', shape: 'tutorial',
    query: B('PSD 批量改文字', 'batch edit text in PSD'),
    who: B('接了一堆改字活的设计师', 'Designers with a pile of text edits'),
    pain: B('一百处字，一处一处点着改', 'A hundred edits, clicked one by one'),
    why: B('前排形态是量出来的：本仓库实测的四个中文词（含一个我们主动放弃的词）前排共 76 条里，教程形态 38 条，产品落地页只有 1 条。本页这个词未单独测过，按同族处理。所以这页按教程写：先讲清这活分几段，再讲工具。',
      'The shapes were measured: across the four Chinese queries measured in this repo (one since dropped), tutorials take 38 of 76 first-page results and product landing pages exactly 1. The query on this page was not measured on its own and is treated as the same family. So it reads as a tutorial: the stages of the job first, then the tool.'),
    title: B('PSD 批量改文字：一百处字要改，手指头先废了', 'Batch editing text in PSD: a hundred edits, and your fingers give out first'),
    desc: B('PSD 批量改文字绕不开三段：找出要改的图层、把新字写回去、写完再读一遍。写清每段卡在哪，以及哪一步必须你来看。',
      'Batch text edits in PSD come down to three stages: find the layers, write the new text back, then read it once more. Where each stage snags, and which step needs your eyes.'),
    eyebrow: B('搜索承接 · 教程型', 'Search shape · Tutorial'),
    h1: [B('一百处字要改，', 'A hundred edits,'), B('手指头先废了。', 'and your fingers go first.')],
    sub: B('PSD 批量改文字这件事，绕不开三段：把要改的字找出来、把新字写回去、写完再读一遍。大多数人耗在第一段，却以为问题在打字速度。',
      'Batch text edits in PSD come down to three stages: find the text, write the new text back, read it once more. Most people burn their time on the first stage while blaming their typing speed.'),
    note: B('教程按真实工序写；页面里的界面是示意。', 'The tutorial follows the real workflow; UI shown here is schematic.'),
    steps: [
      { no: '01', title: B('找：字到底在哪些图层里', 'Find: which layers hold the text'),
        body: B('一个详情页三十多层，真正有字的三到八层，其余是图、蒙版、组。图层名常常是「图层 12 副本 3」，靠名字认不出来，得点开看。',
          'A detail page has thirty-odd layers; three to eight actually hold text. The rest are images, masks, groups. Layer names read like "Layer 12 copy 3", so names do not tell you a thing — you open them.') },
      { no: '02', title: B('写：新字要落回同一个位置', 'Write: new text must land in the same place'),
        body: B('写回去的同时，字体、字重、对齐、行距、字距都得跟着走。不同语言的字母宽度差得远，同一句德语比英语长一截，框子会撑破。',
          'Writing back means font, weight, alignment, leading and tracking all travel with it. Letter widths differ by language — the same line in German runs longer than in English and bursts the frame.') },
      { no: '03', title: B('读：写完再读一遍', 'Read: read it once more after writing'),
        body: B('改完不等于改对。得把每一层读回来，跟表里的译文对一遍：哪层写上了、哪层长度变了要人看、哪层根本没匹配上。',
          'Written is not the same as right. Every layer has to be read back against the table: which landed, which changed length and needs a human look, which never matched at all.') }
    ],
    pains: [
      { title: B('图层名认不出内容', 'Layer names say nothing'),
        body: B('「文本框 7」里可能是主标题，也可能是角落里的小字。找的过程全靠点，点到手酸。',
          '"Text box 7" may be the headline or the fine print in a corner. Finding things is all clicking, until your hand aches.') },
      { title: B('换个语言，框就撑破', 'A new language bursts the frame'),
        body: B('短句变长句，字号不降就出框；降了字号，又跟旁边的元素对不齐。这类位置必须人看一眼，机器不该替你拍板。',
          'Short lines become long ones; keep the size and it overflows, drop the size and it no longer lines up with its neighbours. Those spots need human eyes — a machine should not decide for you.') },
      { title: B('改完没人再读一遍', 'Nobody reads it back'),
        body: B('最常见的返工理由很朴素：有一层漏了，交稿后才被客户翻出来。',
          'The most common rework reason is dull: one layer was missed, and the client finds it after delivery.') }
    ],
    demo: true,
    fit: [
      { title: B('先拿三页试', 'Try three pages first'),
        body: B('挑结构最有代表性的三页跑一遍，看写回后的位置和字距能不能接受，再决定整批。',
          'Run the three most representative pages, judge placement and tracking, then decide on the batch.') },
      { title: B('超框的位置留给人', 'Leave overflow to a human'),
        body: B('长度变化超过容差的位置会被单独标出来，由你决定缩字号、改文案还是重排版。',
          'Spots whose length shifts beyond tolerance get flagged separately; you decide whether to shrink, rewrite or re-lay.') }
    ],
    boundary: [
      B('译文要你先准备好，工具不负责翻译本身。', 'Translations come from you; the tool does not translate.'),
      B('字体缺该语言的字形时，会用 Photoshop 的替代字体，写进去后宽度可能变化，这类要给字体文件。', 'If a face lacks a script, glyphs fall back to boxes; those need the font file.'),
      B('合并图层、栅格化、文字转曲的稿子，文字已经不是文字了，写不进去。', 'Merged, rasterised or outlined text is no longer text and cannot be written to.') ],
    cta: { h: B('拿你自己的一页稿试试', 'Try it on one of your own pages'),
      p: B('先用一页验证位置和字距，再谈整批。', 'Verify placement and tracking on one page before talking batches.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '02', slug: 'psd-switch-lang', theme: 'marine', shape: 'compare',
    query: B('PSD 换语言', 'switch PSD language'),
    who: B('要出多语版又怕重排版的人', 'Anyone shipping translated versions without redoing layout'),
    pain: B('换一种语言，等于重做一遍', 'A new language means a rebuild'),
    why: B('这个词背后同时存在三条路线（手工、PS 变量与数据组、写回工具）。实测的另两个词前排里，PS 原生路线排在第 11、12 位赢着，产品落地页一条没有；本页这个词未单独测过。所以这页按对比写，把三条路摆在一起。',
      'Three routes coexist for this query (manual, Photoshop variables/data sets, write-back tools). In the two measured queries nearby, the native Photoshop route holds positions 11 and 12 while product landing pages hold none; the query on this page was not measured. So it compares the three routes side by side.'),
    title: B('PSD 换语言：换一种语言，等于把稿子重做一遍？', 'Switching PSD language: does a new language mean rebuilding the layout?'),
    desc: B('PSD 换语言有三条路：手工改、用 PS 变量与数据组、用写回工作台。三条路各自要你点几次、能跑几种语言、出错怎么发现，摆在一起看。',
      'Three routes for switching language in a PSD: by hand, with Photoshop variables and data sets, or with a write-back workbench. How many clicks each needs, how many languages it carries, how errors surface.'),
    eyebrow: B('搜索承接 · 对比型', 'Search shape · Comparison'),
    h1: [B('换一种语言，', 'A new language,'), B('等于重做一遍？', 'or a rebuild?')],
    sub: B('三条路都有人用，代价不一样。把要你点几次、能一次跑几种、出错怎么发现摆在一起，比单看谁快更有用。',
      'People use all three routes at different costs. Put clicks, languages per run and error detection side by side — more useful than a single speed number.'),
    note: B('对比只比工序与留在手里的东西，不比较快慢。', 'This compares steps and what you keep. Speed is left out on purpose.'),
    rowLabels: [
      B('工序', 'Steps'),
      B('一次能出几种语言', 'Languages per run'),
      B('字体与行距', 'Font and leading'),
      B('漏没漏怎么发现', 'How misses surface'),
      B('交到你手上的是什么', 'What reaches you')
    ],
    routes: [
      { name: B('手工改', 'By hand'), tone: 'a',
        rows: [B('一页三十层，一层一层点开改', 'Open and edit all thirty layers, one by one'),
          B('一次只能出一种语言', 'One language per pass'),
          B('字体行距靠自己盯', 'Font and leading by eye'),
          B('漏没漏，靠最后翻一遍', 'Misses found by a final flip-through'),
          B('交出去的是导出的图', 'You hand over exported images')] },
      { name: B('PS 变量 + 数据组', 'PS variables + data sets'), tone: 'b',
        rows: [B('先做模板，把可变位置绑成变量', 'Build a template, bind variable spots'),
          B('一张模板 × N 行数据，可批量出图', 'One template × N data rows, batch export'),
          B('数据组不管字体与行距', 'Data sets ignore font and leading'),
          B('错在单元格里，日志不说哪里', 'Errors live in the sheet; logs do not say where'),
          B('留下的是导出的图', 'You keep exported images')] },
      { name: B('写回工作台', 'Write-back workbench'), tone: 'c',
        rows: [B('把已有译文按语言放进表，选稿与语言', 'Load existing translations per language, pick the file'),
          B('单批最多 12 个语种', 'Up to 12 languages per batch'),
          B('字体、行距、字距按语言设', 'Font, leading and tracking set per language'),
          B('回读核对，逐层给三态', 'Read back and rate every layer'),
          B('留下的是 PSD 原稿，图层还在', 'You keep the PSD with layers intact')] }
    ],
    fit: [
      { title: B('一张模板出几百张图', 'Hundreds of images from one template'),
        body: B('每张只有名字、价格这类字段在变的，变量与数据组配得最顺，先看那条路。',
          'When only names and prices change per image, variables and data sets fit best. Start there.') },
      { title: B('已有成品稿要出多语', 'Existing artwork, many languages'),
        body: B('稿子已经是成品、要做的是换语言，写回这条路才对得上工序。',
          'The artwork is finished and language is what changes; the write-back route matches that workflow.') },
      { title: B('两种活混着来', 'Both at once'),
        body: B('模板类交给变量出图，成品类交给写回，两套并存并不冲突。',
          'Templates go through variables, finished artwork through write-back; the two coexist fine.') }
    ],
    demo: true,
    boundary: [
      B('12 语种是单批上限，语种清单以每次运行时的实际可选为准。', 'Twelve is the per-batch cap; the available list is whatever the run offers.'),
      B('写回不改变你的版式结构，撑不撑得下要人看。', 'Write-back does not change your layout; whether it fits is a human call.'),
      B('变量与数据组的用法属于 Photoshop 自身能力，不在本页说明范围内。', 'Variables and data sets are Photoshop features outside what this page vouches for.') ],
    cta: { h: B('先看它长什么样', 'See what it looks like'),
      p: B('拿一页成品稿，换两种语言，看行距与对齐守不守得住。', 'Take one finished page, switch two languages, watch the leading hold.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '03', slug: 'twelve-langs', theme: 'teal', shape: 'checklist',
    query: B('单批 12 语种', '12 languages in one batch'),
    who: B('一个 SKU 卖十几个国家的人', 'Selling one SKU across a dozen markets'),
    pain: B('十二份稿子，漏一处就退货', 'Twelve files, one miss, one return'),
    why: B('「12 个语种」这类计数词，搜索的人已经在心里列清单了，他要的是「到底要查哪些项」。所以这页做成可勾选的交付清单。',
      'Counting queries like "12 languages" mean the searcher already has a list in mind. They want to know what to check. So this page is a tickable delivery checklist.'),
    title: B('单批 12 语种：十二个国家，十二份稿子，漏一处就是退货', 'Twelve languages per batch: twelve markets, twelve files, one miss is a return'),
    desc: B('一个 SKU 出十二种语言时，翻译对不对只是第一关；真正要查的是六项：长度、字形、行距、断行、数字与单位、当地用语。这里给一张能勾的清单。',
      'Shipping one SKU in twelve languages, the checks are length, glyphs, leading, line breaks, numbers and units, local wording. Here is a checklist you can tick.'),
    eyebrow: B('搜索承接 · 清单型', 'Search shape · Checklist'),
    h1: [B('十二个国家，十二份稿子，', 'Twelve markets, twelve files,'), B('漏一处就是退货。', 'one miss and it comes back.')],
    sub: B('翻译对不对只是第一关。真要交付，还得查长度撑不撑得下、字体有没有该语言的字形、行距够不够、断行有没有断在词中间。',
      'Translation accuracy is the first gate only. Delivery also means checking length, glyph coverage, leading, and whether lines break mid-word.'),
    note: B('清单可勾，勾选存在你自己浏览器里，不上传。', 'The checklist is tickable and stored in your own browser only.'),
    checks: [
      B('译文长度：最长的一句放得进框吗', 'Length: does the longest line fit the frame'),
      B('字形：这套字体有这个语言的字吗', 'Glyphs: does this face cover the script'),
      B('行距：换语言后上下行不粘不撞', 'Leading: lines neither stick nor collide'),
      B('断行：没有断在一个词中间', 'Breaks: no line breaks inside a word'),
      B('数字与单位：小数点和千分位按当地写法', 'Numbers: decimal and thousands separators per locale'),
      B('当地用语：同一句在目标市场不犯忌', 'Wording: the line is acceptable in that market')
    ],
    after: B('六项勾满，只能说明你查过，不能说明都对。清单的作用是让漏项没有地方躲，代替不了人最后看一眼。',
      'Six ticks mean you checked. They do not prove it is right. A checklist leaves misses nowhere to hide; it cannot replace a final human look.'),
    demo: true,
    fit: [
      { title: B('先跑语言最多的那一页', 'Start with the longest-language page'),
        body: B('先把译文最长的几种语言放进去测。它们放得下，其他语言大多也放得下。',
          'German, Russian and Portuguese usually run longest. If they fit, most others will.') },
      { title: B('阿拉伯语单独看一眼', 'Check Arabic on its own'),
        body: B('从右到左的排版会牵动对齐方式与标点位置，值得单开一屏看。',
          'Right-to-left pulls alignment and punctuation with it; give it its own screen.') }
    ],
    boundary: [
      B('语种清单随版本变化，以每次运行时可选的为准。', 'The language list changes between versions; the run tells you what is available.'),
      B('当地用语是否得体属于人工判断，工具不替你拍板。', 'Whether wording suits a market is a human judgement.'),
      B('清单不含法律合规项，那部分要另找人。', 'Compliance is not on this list; that needs someone else.') ],
    cta: { h: B('用清单跑一遍你的稿', 'Run the checklist on your file'),
      p: B('先把最长的那几句挑出来，看框子撑不撑得住。', 'Pull your longest lines first and see whether the frame holds.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '04', slug: 'write-translation-in', theme: 'violet', shape: 'landing',
    query: B('译文写进 PSD', 'write translations into PSD'),
    who: B('译文已经翻好、稿子还没动的人', 'Translations are done, artwork is not'),
    pain: B('译文在表里，稿子里还是原文', 'The sheet is translated, the file is not'),
    why: B('「把已有译文写进去」是明确的动作词，搜索的人已经知道要做什么，只差一个能做的入口。所以做成落地页：三步、看得见的界面、能点的演示。',
      'A clear action query: the searcher knows the task and wants an entry point. So this is a landing page — three steps, visible UI, a demo you can click.'),
    title: B('译文写进 PSD：译文躺在表格里，稿子里还是中文', 'Write translations into PSD: the sheet is done, the artwork is not'),
    desc: B('已有译文按语言放好，选 PSD、选语言、写回文字图层，再逐层回读核对。保留图层与排版，单批最多 12 个语种。',
      'Load existing translations by language, pick the PSD and languages, write back into text layers, then read every layer back. Layers and layout stay; up to 12 languages per batch.'),
    eyebrow: B('搜索承接 · 落地页型', 'Search shape · Landing'),
    h1: [B('译文已经躺在表格里了。', 'The translations are sitting in a sheet.'), B('稿子里还是中文。', 'The artwork is still Chinese.')],
    sub: B('已经翻好的字，要回到它原来那一层里去。位置不变、字体不变、行距不变，改完还能一层一层读回来。',
      'Text that is already translated has to go back into the layer it came from — same position, same face, same leading — and be read back layer by layer afterwards.'),
    note: B('单批最多 12 个语种；界面为示意。', 'Up to 12 languages per batch; UI is schematic.'),
    three: [
      { no: '1', title: B('把译文按语言放好', 'Load translations per language'),
        body: B('每种语言一份表，一行一处文字，跟稿子里的图层对上。',
          'One sheet per language, one row per string, matched to the layers in the file.') },
      { no: '2', title: B('选稿、选语言', 'Pick the file and the languages'),
        body: B('一次最多带 12 个语种，字体、字重、行距、字距可以按语言分别设。',
          'Up to twelve languages at once; size, weight, leading and tracking can be set per language.') },
      { no: '3', title: B('写回，再读一遍', 'Write back, then read back'),
        body: B('写完逐层读回，跟表里的译文对一遍，出三态报告。',
          'After writing, every layer is read back against the sheet and rated.') }
    ],
    zoom: [
      { k: B('图层名', 'Layer'), v: B('标题、副标题、角标各走各的', 'Headline / subhead / corner mark, each its own') },
      { k: B('字体', 'Font'), v: B('按 PostScript 脸名匹配，缺字形会标出来', 'Matched by PostScript face name; missing glyphs get flagged') },
      { k: B('行距与自动字距', 'Leading & auto-kerning'), v: B('可按语言分别设，不必一套吃到底', 'Set per language instead of one value for all') },
      { k: B('字距', 'Tracking'), v: B('自动字距与固定值都能落回去', 'Auto and fixed tracking both write back') }
    ],
    states: [
      { tone: 'ok', k: B('已确认', 'Confirmed'), v: B('该层文字与译文一致，位置没动。', 'Layer text matches the sheet; position unchanged.') },
      { tone: 'warn', k: B('待复查', 'Review'), v: B('长度变化超出容差，行数或位置动了，要你看一眼。', 'Length shifted past tolerance; lines or position moved.') },
      { tone: 'blocked', k: B('需要你决定', 'Your call'), v: B('这一层没匹配上，或者字形缺失，得人来定。', 'No match for this layer, or glyphs missing — a human decides.') }
    ],
    demo: true,
    fit: [
      { title: B('适合什么样的稿', 'What it fits'),
        body: B('文字在独立文字图层里、源文件还在、译文已经定稿。三条都成立，这条路最顺。',
          'Text sits in its own text layers, the source file survives, translations are final. All three true, and this route is the smoothest.') },
      { title: B('不适合什么样的稿', 'What it does not fit'),
        body: B('文字已经合进图片、转成曲线、或者被压成了位图，得先回到能改的状态。',
          'Text merged into artwork, outlined, or flattened to pixels first has to return to an editable state.') }
    ],
    boundary: [
      B('图层文字与译文需要上传，稿子本身在你本机的 Photoshop 里跑，范围见隐私政策。',
        'Layer text and translations are uploaded; the file itself runs in your local Photoshop. Scope is in the privacy policy.'),
      B('“待复查”与“需要你决定”是两件事，前者是长度变了，后者是没匹配上。',
        '"Review" and "your call" are different: the first changed length, the second never matched.'),
      B('本页界面为示意，字体与读数为演示值。', 'The UI is schematic; fonts and readouts are demonstration values.') ],
    cta: { h: B('把译文交给它，把判断留给你', 'Give it the translations, keep the judgement'),
      p: B('先跑一页，看三态报告里有没有“需要你决定”的项。', 'Run one page and see whether the report lists anything for you to decide.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '05', slug: 'layer-text-replace', theme: 'graphite', shape: 'technical',
    query: B('PSD 文字图层替换', 'PSD text layer replacement'),
    who: B('想改却怕动坏图层的人', 'Afraid of wrecking layers by editing'),
    pain: B('图层几百个，字不知道在哪一层', 'Hundreds of layers, text somewhere inside'),
    why: B('实测的四个词里，Adobe 官方帮助在「PSD 批量替换文字」前排占 4 条、四词合计 9 条，说明搜的人要的是机制解释。本页这个词未单独测过，按同一意图族处理。所以这页讲清楚「为什么有的稿改得动、有的改不动」。',
      'Among the four measured queries, Adobe help takes 4 results inside PSD 批量替换文字 and 9 across all 76: searchers want the mechanism. The query on this page was not measured and is treated as the same family, so it explains why some files are editable and others are not.'),
    title: B('PSD 文字图层替换：文字进了图层才改得动', 'PSD text layer replacement: text has to live in a layer'),
    desc: B('文字图层替换的前提是文字还在图层里。哪些情况能改、哪些要先回到源文件、哪些必须人来决定，逐条写清。',
      'Replacing text in a PSD depends on the text still being in a layer. Which cases work, which need the source file, and which need a human — spelled out.'),
    eyebrow: B('搜索承接 · 技术说明型', 'Search shape · Technical'),
    h1: [B('文字进了图层，才改得动。', 'Text in a layer can be changed.'), B('压成像素，这条路就断了。', 'Flattened pixels cannot.')],
    sub: B('同一句话，在两种稿子里是两回事：一种点开就能编辑，一种已经是颜色块。搞清这件事，再谈批量。',
      'The same sentence is two different things across files: one opens for editing, one is already a block of colour. Settle that before talking batches.'),
    note: B('机制说明按 Photoshop 的可编辑性分类，界面为示意。', 'Classified by Photoshop editability; UI is schematic.'),
    mech: {
      ok: B('文字层：双击就能编辑，字体、字号、行距都在图层上',
        'Text layer: double-click to edit; font, size and leading live on the layer'),
      bad: B('位图：颜色已经烤进像素，没有“文字”可替换',
        'Pixels: colour is baked in; there is no text left to replace'),
      pivot: B('智能对象：里面可能还有文字层，要打开源文件才看得见',
        'Smart object: may still hold text layers, visible only in the source file')
    },
    cases: [
      { title: B('能直接写回', 'Writes back directly'),
        body: B('独立文字图层、没有栅格化、字体可用的稿子。', 'Standalone text layers with a usable face.') },
      { title: B('要先打开源文件', 'Open the source first'),
        body: B('智能对象里包着的文字，写在上层是改不动它的。', 'Text inside a smart object cannot be reached from the parent.') },
      { title: B('要人决定', 'Needs a human'),
        body: B('文字被描边、做成路径、加了变形，换语言后形状会变。', 'Outlined, pathified or warped text changes shape with the language.') },
      { title: B('写不进去', 'Cannot be written'),
        body: B('合并层、栅格化、文字转曲、以及整页被压成一张图的稿子。', 'Merged, rasterised, outlined, or a page flattened into one image.') },
      { title: B('能写但要看', 'Written, but check'),
        body: B('一行字被自动换行拆成两行，行数变了，下面的元素要跟着动。', 'An auto-wrapped line becomes two; the elements below must move too.') },
      { title: B('能写但缺字形', 'Written, glyphs missing'),
        body: B('字体里没有目标语言的字，会用 Photoshop 的替代字体，宽度跟着变。', 'The face lacks the target script; it falls back or shows boxes.') }
    ],
    demo: true,
    fit: [
      { title: B('先看图层树', 'Look at the layer tree first'),
        body: B('打开 PSD 看有没有“T”图标。有，这条路就能走；没有，先找回可编辑的版本。',
          'Open the PSD and look for the T icon. Present, the route is open; absent, recover an editable version first.') },
      { title: B('再看字体', 'Then the fonts'),
        body: B('目标语言的字形在不在，决定了写回去是字还是方框。',
          'Whether the target script exists in the face decides between letters and boxes.') }
    ],
    boundary: [
      B('图层可编辑性由 Photoshop 决定，本页只解释边界，不改变它。', 'Editability is decided by Photoshop; this page explains the boundary, it does not move it.'),
      B('描边、变形、混合模式的视觉结果以你的稿为准。', 'Strokes, warps and blend modes render as your file renders.'),
      B('本页界面为示意。', 'UI shown here is schematic.') ],
    cta: { h: B('先判断你的稿能不能改', 'First decide whether your file is editable'),
      p: B('打开图层看一眼，比读十页说明都快。', 'One look at the layer tree beats ten pages of explanation.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '06', slug: 'psd-ecom-batch', theme: 'ember', shape: 'tutorial',
    query: B('psd 批量改文字 电商', 'batch PSD text for e-commerce'),
    who: B('上新前夜还在改主图的电商运营', 'E-commerce ops still editing main images the night before launch'),
    pain: B('主图与详情页两套节奏', 'Main image and detail page run on two clocks'),
    why: B('电商变体的 SERP 是问答与教程混排（问答 5 条、博客 4 条），且 PS 变量路线在前排赢着。这页把两条路各自擅长什么写清楚。',
      'The e-commerce variant mixes Q&A and tutorials (5 Q&A, 4 blog posts) and the Photoshop variables route wins. This page states what each route is good at.'),
    title: B('psd 批量改文字 电商：上新前一天，主图上的字还没换', 'Batch PSD text for e-commerce: launch tomorrow, the main image still says the old price'),
    desc: B('电商图分两种活：一张模板出几百张，和一批成品稿换语言。前者交给 PS 变量与数据组，后者交给写回。两条路各自怎么用。',
      'E-commerce artwork splits two ways: one template into hundreds of images, or finished pages switching language. Variables handle the first, write-back the second.'),
    eyebrow: B('搜索承接 · 教程型（电商变体）', 'Search shape · Tutorial (commerce)'),
    h1: [B('上新前一天，', 'The night before launch,'), B('主图上的字还没换。', 'the main image still says the old price.')],
    sub: B('电商图其实有两种活，很容易混：一种是一张模板出几百张，一种是几十页成品稿换语言。两种活该用两套办法。',
      'E-commerce artwork hides two different jobs: one template into hundreds of images, and dozens of finished pages switching language. They need different tools.'),
    note: B('两条路可以并存；页面里的界面是示意。', 'Both routes can coexist; UI here is schematic.'),
    steps: [
      { no: '01', title: B('先分清是哪种活', 'First, which job is it'),
        body: B('每张图只有字段在变（名字、价格、卖点），那是一张模板出 N 张；整页版式固定、只是语言不同，那是成品稿换语言。',
          'Only fields change per image (name, price, selling point): one template, N outputs. The layout is fixed and only language changes: finished artwork switching language.') },
      { no: '02', title: B('模板活：交给变量与数据组', 'Template job: variables and data sets'),
        body: B('照着数据表把可变位置绑成变量，一次导出整批。这条路 PS 自带，前排那几条教程讲的就是它。',
          'Bind variable spots to a data table and export the batch. This ships with Photoshop, and it is what those top-ranking tutorials cover.') },
      { no: '03', title: B('成品活：交给写回', 'Finished artwork: write-back'),
        body: B('版式已经定了、只是要把另一种语言的字放进原来的层，用写回。逐层回读，位置与行距守得住。',
          'The layout is settled and another language has to land in the same layers. Write-back reads each layer back and holds position and leading.') }
    ],
    pains: [
      { title: B('主图与详情页两套节奏', 'Main image and detail page run on two clocks'),
        body: B('主图改一版就能上，详情页要几十页一起换。用同一套办法处理两种活，总会有一边拖慢。',
          'A main image ships after one edit; a detail page needs dozens switched together. One method for both will drag one side.') },
      { title: B('活动价改口，图没跟上', 'The price changes, the image does not'),
        body: B('文案改了三天，图还是旧价，评论区先炸。这类要的是「改一处、全批跟着变」。',
          'Copy changed three days ago, the image still shows the old price, and the comments notice first. This needs one edit rippling through the batch.') },
      { title: B('多站点同款不同字', 'Same SKU, different words per site'),
        body: B('同一个 SKU 在几个站点上，卖点措辞不一样，图也得分开出。',
          'One SKU across several storefronts with different wording means separate artwork per site.') }
    ],
    demo: true,
    fit: [
      { title: B('大促前两周', 'Two weeks before a promo'),
        body: B('先把模板类跑顺，剩下一周专心处理成品稿的语言版本。',
          'Get templates running first, then spend the last week on language versions of finished pages.') },
      { title: B('新站点开站', 'Opening a new storefront'),
        body: B('一次性把现有详情页换成新市场语言，比重做一套快。',
          'Switching existing detail pages into the new market beats rebuilding them.') }
    ],
    boundary: [
      B('平台对主图的文字占比、水印有各自规则，以卖家后台的现行要求为准。', 'Marketplaces have their own rules on text coverage and watermarks; the seller console is the authority.'),
      B('变量与数据组属 Photoshop 自身能力，不在本页说明范围内。', 'Variables and data sets are Photoshop features outside what this page vouches for.'),
      B('页面里的界面为示意，不构成任何平台规则解读。', 'UI shown is schematic and reads no platform rules.') ],
    cta: { h: B('先分清你手上是哪种活', 'First name the job you have'),
      p: B('分清了再挑工具，比反着来省事。', 'Naming it before choosing a tool saves a detour.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '07', slug: 'auto-translate', theme: 'sand', shape: 'qa',
    query: B('PSD能自动翻译吗', 'does PSD translate automatically'),
    who: B('还没买、先问能不能全自动的人', 'Still deciding, asking whether it can be fully automatic'),
    pain: B('以为点一下就能整份翻完', 'Expecting one click to translate the whole file'),
    why: B('这是第三档问题词，搜索的人要一个直接的回答。所以这页按问答写，第一句就把「能到什么程度」说清。',
      'A tier-three question query. The searcher wants a direct answer, so this page is Q&A and states the limits in the first line.'),
    title: B('PSD 能自动翻译吗：能自动跑，但有几处一定要你来看', 'Does PSD translate automatically? It runs automatically, and some spots still need you'),
    desc: B('PSD 不能自己把中文翻成外语。能做的是：把已经翻好的文字写回文字图层，并逐层回读。哪几处必须人来决定，这里逐条答。',
      'A PSD does not translate on its own. What works: writing finished translations back into text layers and reading them back. Which spots still need a human — answered here.'),
    eyebrow: B('搜索承接 · 问答型', 'Search shape · Q&A'),
    h1: [B('能自动跑。', 'It runs on its own.'), B('有几处，一定要你来看。', 'A few spots still need you.')],
    sub: B('先把边界说在前面：翻译这件事不在稿子里发生。稿子负责的是把已经翻好的字，放回它原来那一层。',
      'The boundary first: translation does not happen inside the file. The file is where finished translations go back into the layers they came from.'),
    note: B('六问按真实口径答；界面为示意。', 'Six answers in plain terms; UI is schematic.'),
    questions: [
      { q: B('PSD 能自己把中文翻成外语吗', 'Can a PSD translate Chinese into another language by itself'),
        a: B('不能。文字图层里存的是字，不是语言能力。翻译要么人做，要么用翻译引擎先出稿，再由你定稿。',
          'No. A text layer stores characters; it holds no language ability. Translation is done by a person or a translation engine first, then approved by you.') },
      { q: B('那你们做的到底是哪一段', 'So which part do you do'),
        a: B('把已经定稿的译文，按语言写回 PSD 的文字图层：位置不动、字体行距跟语言走、写完逐层读回来对一遍。',
          'Writing approved translations back into PSD text layers: position held, font and leading following each language, every layer read back against the sheet.') },
      { q: B('改完会不会错位', 'Will it misalign'),
        a: B('同一语言的同一句话，位置不变。换语言后字母宽度变了，长度超出容差的位置会被单独标出来，由你决定缩字号还是改文案。',
          'Same string, same language, same position. Across languages letter widths change; spots past tolerance get flagged for you to shrink or rewrite.') },
      { q: B('我怎么知道有没有漏', 'How do I know nothing was missed'),
        a: B('写完回读，逐层出三态：已确认、待复查、需要你决定。报告能看出哪一层没匹配上。',
          'Every layer is read back and rated: written, review, your call. The report shows which layer never matched.') },
      { q: B('支持多少种语言', 'How many languages'),
        a: B('单批最多 12 个语种。具体可选哪些，以每次运行时的清单为准，不在此页列死。',
          'Up to twelve per batch. The exact list is whatever the run offers — this page does not freeze it.') },
      { q: B('稿子要不要传出去', 'Does the file leave my machine'),
        a: B('稿子本身在你本机的 Photoshop 里跑。图层文字与译文需要上传，用来做条目与核对，范围写在隐私政策里。',
          'The file runs in your local Photoshop. Layer text and translations are uploaded for matching and checking; scope is in the privacy policy.') }
    ],
    hard: [
      B('艺术字、手写字、被做成形状的文字，换语言后形状会变，机器不该替你判断好不好看。',
        'Display type, handwriting and text converted to shapes change with the language; a machine should not judge whether it looks right.'),
      B('一行变两行的位置，下面的元素要跟着动，这一动可能牵到整个版式。',
        'Where one line becomes two, elements below must move, and that can cascade through the layout.'),
      B('有些句子在目标市场只是「翻对了但说错了」，这一层永远要人。',
        'Some lines are correctly translated and still wrong for the market. That layer always needs a person.')
    ],
    demo: true,
    fit: [
      { title: B('什么时候值得试', 'When it is worth trying'),
        body: B('译文已经定稿、稿子里文字在独立图层、要出的语言多。三条齐了，试一页就知道合不合手。',
          'Approved translations, text in standalone layers, many target languages. All three, and one page tells you whether it fits.') },
      { title: B('什么时候别用', 'When not to'),
        body: B('文字已经压成图、或者整页是视觉稿没法改的时候，先用别的办法把稿子恢复到能改的状态。',
          'Text already flattened, or a page that is purely visual, needs another route to become editable first.') }
    ],
    boundary: [
      B('本页不承诺任何翻译质量，翻译由你和你的译员负责。', 'No translation quality is promised here; that is you and your translators.'),
      B('一批超过十二种会被拦下并逐张给原因，不会静默少做。', 'Beyond twelve languages the batch is refused with a reason per file; nothing is dropped silently.'),
      B('界面为示意，真实交互以产品为准。', 'UI is schematic; the product is the reference.') ],
    cta: { h: B('先问清楚，再动手', 'Ask first, then start'),
      p: B('拿一页稿跑一次，比读十篇介绍快。', 'One page through the tool beats ten introductions.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '08', slug: 'upload-or-not', theme: 'pine', shape: 'qa',
    query: B('需要上传设计文件吗', 'do I need to upload the design file'),
    who: B('稿子涉密、不能出本机的人', 'Working under confidentiality constraints'),
    pain: B('稿子不出本机，才敢接这单', 'Artwork stays on this machine, or the job is off'),
    why: B('这是第三档问题词里最敏感的一问，搜索的人先关心数据去哪。所以这页先答数据，再讲功能。',
      'The most sensitive tier-three question: where does the data go. So this page answers data first, features second.'),
    title: B('需要上传设计文件吗：稿子在你本机跑，上传的是文字', 'Do you need to upload the design file? It runs locally; text is what leaves'),
    desc: B('PSD 本身在你本机的 Photoshop 里运行；需要上传的是图层文字与译文，用于匹配与回读核对。哪些上云、哪些不出去，逐项写清。',
      'The PSD runs in your local Photoshop. Layer text and translations are uploaded for matching and read-back. Which parts travel and which stay, item by item.'),
    eyebrow: B('搜索承接 · 问答型（数据面）', 'Search shape · Q&A (data)'),
    h1: [B('稿子能不能不出本机？', 'Can the file stay on my machine?'), B('能。出去的是字。', 'Yes. The text is what leaves.')],
    sub: B('涉密项目最常卡在这一问。把「哪些留在本机、哪些要上传、上传了用来做什么」摊开写，你自己判断能不能用。',
      'Confidential work stalls on this question. Here is what stays local, what is uploaded, and what it is used for — so you can judge for yourself.'),
    note: B('口径以隐私政策为准；本页只做指引。', 'The privacy policy governs; this page only points.'),
    questions: [
      { q: B('设计文件要上传吗', 'Is the design file uploaded'),
        a: B('不用。PSD 在你自己的 Photoshop 里打开与写回，文件本身不出本机。',
          'No. The PSD opens and is written in your own Photoshop; the file does not leave the machine.') },
      { q: B('那上传的是什么', 'What is uploaded then'),
        a: B('图层里的文字内容、以及你提供的译文，用来做条目匹配、语言分配与回读核对。',
          'The text inside layers plus the translations you provide, used for matching, language assignment and read-back.') },
      { q: B('上传之后存在哪、留多久', 'Where does it go, how long does it stay'),
        a: B('按隐私政策里写的范围与期限执行。要引用具体条款，请以该页现行文本为准，本页不复述。',
          'Per the scope and retention stated in the privacy policy. Quote that page as it currently reads; this page does not restate it.') },
      { q: B('能不能只传部分页面', 'Can I upload only some pages'),
        a: B('可以先跑一页看效果。但一批里的每一页都要经过同样的匹配与核对，跳过的页面不会被写回。',
          'Run one page first if you like. Every page in a batch goes through the same matching; skipped pages are not written to.') },
      { q: B('客户要求全程离线怎么办', 'What if the client requires full offline'),
        a: B('这一条要按你的实际约束来定，别用本页当承诺。涉密到不能有外发的项目，先走内部审批再谈工具。',
          'That depends on your actual constraint; do not read this page as a promise. If nothing may leave, clear it internally before choosing tools.') }
    ],
    hard: [
      B('即便不出本机，稿子也可能被截图、被同步盘带走，这属于你的设备管理范围。',
        'Even locally, artwork can leave through screenshots or sync folders; that is device management, outside this page.'),
      B('团队协作时，你的同事能不能看到这批文字，取决于账号权限设置。',
        'In a team, whether colleagues can see the batch depends on account permissions.'),
      B('本页不构成合规意见，具体行业要求请找你的法务。',
        'This page is not compliance advice; ask your legal team for industry specifics.')
    ],
    demo: false,
    fit: [
      { title: B('可以先这样试', 'A safe first run'),
        body: B('挑一页不含敏感信息的稿，跑通写回与回读，再决定要不要放进真实项目。',
          'Take one page with no sensitive content, finish a write-back and read-back, then decide about real projects.') },
      { title: B('团队里要先定的事', 'Settle inside the team first'),
        body: B('谁能上传、谁看得到、上传后多久清，这三件先说清再开账号。',
          'Who may upload, who can see it, how soon it is purged — settle these before accounts go out.') }
    ],
    boundary: [
      B('隐私政策是准绳，本页如有出入以该页为准。', 'The privacy policy is authoritative; where this page differs, it wins.'),
      B('本页不涉及任何行业合规结论。', 'No industry compliance conclusion is offered here.'),
      B('界面为示意。', 'UI is schematic.') ],
    cta: { h: B('先拿不敏感的稿试', 'Start with a non-sensitive file'),
      p: B('跑通一页再谈范围，比一开始就担心数据更有效。', 'One page through, then scope — more useful than worrying outright.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '09', slug: 'psd-translate-tools', theme: 'wine', shape: 'compare',
    query: B('PSD翻译工具', 'PSD translation tool'),
    who: B('在几个工具之间挑的人', 'Choosing among tools'),
    pain: B('工具试了一圈，返工还在', 'Tools tried, rework still here'),
    why: B('选的词是「工具」，人在比较。这页按四类工具对比写，重点放在「选错的代价」上，因为搜索的人怕的是返工。',
      '"Tool" means the searcher is comparing. So four categories side by side, weighted towards the cost of choosing wrong, because rework is what they fear.'),
    title: B('PSD 翻译工具怎么挑：先看你怕哪一种返工', 'Choosing a PSD translation tool: start from the rework you fear'),
    desc: B('四类工具各自擅长什么、不管什么：在线图片翻译、PS 脚本、变量与数据组、写回工作台。选之前先想清楚你能接受哪种返工。',
      'What each of four tool types is good at and blind to: online image translation, PS scripts, variables and data sets, write-back workbenches.'),
    eyebrow: B('搜索承接 · 对比型', 'Search shape · Comparison'),
    h1: [B('挑工具这件事，', 'Choosing a tool starts with'), B('先看你怕哪种返工。', 'the rework you fear.')],
    sub: B('没有哪类工具全面。在线翻译快但交出的是图，脚本灵活但错在哪要自己找，变量适合模板，写回适合成品稿。',
      'No category does everything. Online translation is quick and returns images; scripts are flexible and hide their errors; variables fit templates; write-back fits finished artwork.'),
    note: B('四类按工序与交付物对比，不排快慢名次。', 'Four categories by workflow and deliverable. No speed ranking.'),
    rowLabels: [
      B('怎么用', 'How it works'),
      B('擅长什么', 'Good at'),
      B('不管什么', 'Blind to'),
      B('交付物', 'Deliverable')
    ],
    routes: [
      { name: B('在线图片翻译', 'Online image translation'), tone: 'a',
        rows: [B('上传一张图，框选位置，出译文与成品图', 'Upload an image, box the regions, get text and output'),
          B('擅长单张图、快出稿', 'Good at single images, fast output'),
          B('源文件不是它的输入，图层不会回来', 'It does not take source files; layers do not come back'),
          B('交付物是图片，改一次要重走一遍', 'Deliverables are images; every edit repeats the flow')] },
      { name: B('PS 脚本', 'PS scripts'), tone: 'b',
        rows: [B('写一段脚本批处理文字层', 'A script that batches text layers'),
          B('擅长固定结构、规则明确的稿', 'Good for fixed structures with clear rules'),
          B('异常处理靠自己写，报错说不清哪层', 'Error handling is yours to write; messages rarely say which layer'),
          B('换个人接手要先读懂脚本', 'Anyone else must read the script first')] },
      { name: B('变量 + 数据组', 'Variables + data sets'), tone: 'c',
        rows: [B('绑变量、喂数据、整批导图', 'Bind variables, feed data, export the batch'),
          B('擅长一张模板出几百张', 'Good at one template into hundreds'),
          B('只管内容，不管字体行距与语言', 'Content only; font, leading and language are not its job'),
          B('交付物是导出的图', 'Deliverables are exported images')] },
      { name: B('写回工作台', 'Write-back workbench'), tone: 'd',
        rows: [B('译文入表、选稿选语言、写回再回读', 'Translations in, pick file and languages, write back, read back'),
          B('擅长已有成品稿换语言', 'Good at finished artwork switching language'),
          B('要求文字还在可编辑的文字层里', 'Requires text still in editable text layers'),
          B('交付物是 PSD 原稿与三态报告', 'Deliverables are the PSD itself plus a report')] }
    ],
    fit: [
      { title: B('怕交出去的是图', 'You fear handing over images'),
        body: B('客户下一次还要改字，只有 PSD 原稿能救你。', 'If the client will change copy again, only the PSD rescues you.') },
      { title: B('怕错在哪不知道', 'You fear silent errors'),
        body: B('报告逐层给状态，比事后翻图找漏项踏实。', 'A per-layer report beats hunting for misses in a finished image.') },
      { title: B('怕改坏版式', 'You fear wrecking the layout'),
        body: B('位置与行距是否守住，要能一眼看出来。', 'Whether position and leading held should be visible at a glance.') }
    ],
    demo: false,
    boundary: [
      B('四类的边界按各自常见形态描述，具体产品实现可能不同。', 'Boundaries describe each type at its usual shape; implementations vary.'),
      B('不评价任何具体厂商。', 'No vendor is assessed here.'),
      B('页面里的界面为示意。', 'UI shown is schematic.') ],
    cta: { h: B('先说你怕哪种返工', 'Name the rework you fear'),
      p: B('答案会直接决定你该用哪一类，以及该问对方什么问题。', 'The answer picks the category and the questions to ask.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '10', slug: 'brand', theme: 'inkgold', shape: 'brand',
    query: B('图译工坊', 'TuYi Workshop'),
    who: B('听过名字来搜的、以及搜错的', 'People who heard the name, and people who found the wrong one'),
    pain: B('同名工具好几个，认不准是哪个', 'Several tools share this name'),
    why: B('品牌词前排被几家名字构词相近、做图片翻译的站占着，本站一条都没有。所以这页的任务是让搜到的人三句话内分清是不是你要的。',
      'Similar-sounding sites about image translation occupy the brand results; none of those results is this site. This page has to let people tell, within three lines, whether it is what they want.'),
    title: B('图译工坊：把已经翻好的字，写回 PSD 的图层', 'TuYi Workshop: finished translations, written back into PSD layers'),
    desc: B('图译工坊做一段活：把已有译文批量写进 PSD 的文字图层，保留图层与排版，写完逐层回读。单批最多 12 个语种。',
      'TuYi Workshop does one stage: batch-writing approved translations into PSD text layers, keeping layers and layout, reading every layer back. Up to 12 languages per batch.'),
    eyebrow: B('搜索承接 · 品牌澄清型', 'Search shape · Brand clarity'),
    h1: [B('你搜的「图译工坊」，', 'The TuYi Workshop you searched for'), B('是哪一个？', 'is which one?')],
    sub: B('这个名字下有几家构词相近的站，做的是图片翻译。我们在做的只有一段：把已经定稿的译文，写回 PSD 的文字图层。',
      'Several similarly named sites do image translation. What we do is one stage only: writing approved translations back into PSD text layers.'),
    note: B('品牌页只讲范围，不评比同行。', 'A brand page states scope; it does not rank competitors.'),
    neighbors: {
      title: B('搜这个名字，前排会先看到什么', 'What shows up first for this name'),
      body: B('搜索结果里前排存着几家名字构词相近的站，主打图片翻译与在线改图。如果你要的是「拍张照翻成中文」，那几家更对口。',
        'The first results include several similarly named sites focused on image translation and online retouching. If you want "photograph a sign, get Chinese back", they fit better.'),
      tail: B('这部分是检索现状的描述，随时间会变；本页不评价它们做得好不好。', 'This describes current search results and will drift; no judgement is passed on them.')
    },
    scope: [
      { step: B('进来', 'In'), body: B('你已经有定稿的译文，按语言整理在表里。', 'You already have approved translations, organised by language.') },
      { step: B('过程', 'Through'), body: B('译文与图层文字配对，写回文字图层，字体行距按语言设。', 'Translations pair with layer text, write back into text layers, font and leading set per language.') },
      { step: B('出去', 'Out'), body: B('PSD 原稿保留图层，另附逐层三态的报告。', 'The PSD keeps its layers, plus a per-layer report.') }
    ],
    wont: [
      B('我们不接机翻：译文先由你定稿，我们负责把它放回去。', 'No machine translation here: translations are approved by you first.'),
      B('我们不做图片翻译：拍照识图翻字那类活，交给专门的工具。', 'Not image translation: photo-to-text belongs with dedicated tools.'),
      B('我们不做设计：版式你自己定，字的落点回到原位。', 'Not design: the layout is yours; the text goes back where it was.')
    ],
    demo: false,
    fit: [
      { title: B('如果你要的是这些', 'If this is what you need'),
        body: B('一批成品稿要出十几个语言的版本、图层要留着、客户之后还要改。三条对上就是这里。',
          'A batch of finished artwork, a dozen languages, layers preserved, more edits coming. All three: you are in the right place.') },
      { title: B('如果你要的是这些', 'If this is what you need'),
        body: B('一张图里外文看不懂、想立刻翻成中文，那类需求用图片翻译工具更直接。',
          'Foreign text in an image you cannot read, wanting Chinese now — image translation is more direct.') }
    ],
    boundary: [
      B('品牌页只说明范围，不构成任何能力承诺。', 'This page states scope only. It makes no capability promise.'),
      B('同行描述基于检索结果的现状，非评价。', 'Competitor descriptions reflect current search results. No judgement is passed here.'),
      B('界面为示意。', 'UI is schematic.') ],
    cta: { h: B('对上了就往下看', 'If that matches, read on'),
      p: B('下一页是工序：一段一段讲清，哪步是你做、哪步是它做。', 'Next page is the workflow: stage by stage, who does what.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '11',
    uiLang: 'en', slug: 'en-psd-delivery', theme: 'slate', shape: 'landing',
    query: B('PSD 多语言交付', 'PSD multilingual delivery'),
    who: B('做多语言交付的本地化团队', 'Localization teams shipping multilingual artwork'),
    pain: B('交出去的图，下一版没人接手', 'Exports ship; the next version has no owner'),
    why: B('英文意图词，搜的人多半在本地化流程里，关注的是交付物，快慢排在后面。这页按落地页写，把交付物放在第一屏。',
      'An English intent query; searchers usually sit inside a localization workflow and care about deliverables first. So the landing page puts deliverables above the fold.'),
    title: B('PSD 多语言交付：交出去的是原稿，下一版还有人接手', 'PSD multilingual delivery: you ship the layered file'),
    desc: B('把定稿译文批量写回 PSD 的文字图层，保留每一层与版式，写完逐层回读核对。单批最多 12 个语种。',
      'Write approved translations back into PSD text layers, keep every layer and the layout, then read each layer back. Up to 12 languages per batch.'),
    eyebrow: B('搜索承接 · 落地页型', 'Search shape · Landing'),
    h1: [B('交出去的是原稿，', 'You ship the layered file,'), B('下一版还有人接手。', 'and the next version still has an owner.')],
    sub: B('本地化交付的争论常常停在「图有没有对齐」，很少有人问「下一版谁改」。原稿能留下，下一版才有人接手。',
      'Localization reviews stop at whether the image lines up, and rarely ask who edits the next version. A layered file means someone can.'),
    note: B('中英双语页；界面为示意。', 'Bilingual page; the UI is schematic.'),
    three: [
      { no: '1', title: B('按语言载入译文', 'Load translations per language'),
        body: B('每语言一张表，一行一处文字，与图层一一对上。', 'One sheet per language, one row per string, matched to layers.') },
      { no: '2', title: B('选稿与语言', 'Pick the file and languages'),
        body: B('一批最多十二种语言；字体、行距、字距可按组分设。', 'Up to twelve per batch; size, weight, leading and tracking per language.') },
      { no: '3', title: B('写回并逐层回读', 'Write back and read every layer'),
        body: B('写完读回，与表里的译文逐层对照，出三态报告。', 'After writing, each layer is read back against the sheet and rated.') }
    ],
    zoom: [
      { k: B('图层', 'Layers'), v: B('保留原名与层级，交接时还认得出来', 'Names and hierarchy kept, so handover still reads') },
      { k: B('字体', 'Fonts'), v: B('按 PostScript 脸名匹配；缺字形会标出来', 'Matched by PostScript face; missing glyphs flagged') },
      { k: B('行距与字距', 'Leading & tracking'), v: B('按语言分别设，不用一套吃到底', 'Set per language rather than one value for all') },
      { k: B('报告', 'Report'), v: B('已确认 / 待复查 / 需要你决定', 'Confirmed / review / your call') }
    ],
    states: [
      { tone: 'ok', k: B('已确认', 'Confirmed'), v: B('与表中译文一致，位置未变。', 'Matches the sheet; position unchanged.') },
      { tone: 'warn', k: B('待复查', 'Review'), v: B('长度变化超容差，行数或位置动了。', 'Length past tolerance; lines or position moved.') },
      { tone: 'blocked', k: B('需要你决定', 'Your call'), v: B('未匹配或字形缺失，需要人定。', 'No match, or glyphs missing.') }
    ],
    demo: false,
    fit: [
      { title: B('适合的稿', 'Fits'), body: B('文字在独立文字图层、源文件完好、译文已定稿。', 'Text in standalone text layers, source file intact, translations approved.') },
      { title: B('不适合的稿', 'Does not fit'), body: B('合并、描边成路径或压成位图的文字，要先恢复到可编辑状态。', 'Merged, outlined or rasterised text must be editable first.') }
    ],
    boundary: [
      B('图层文字与译文需要上传，稿子本身在你本机的 Photoshop 里跑。', 'Layer text and translations are uploaded; the file runs in your local Photoshop.'),
      B('12 是单批上限，不构成语言覆盖承诺。', 'Twelve is a per-batch cap, not a language guarantee.'),
      B('本页界面为示意。', 'The UI shown here is schematic.') ],
    cta: { h: B('先跑一页', 'Run one page first'),
      p: B('先验证位置与行距，再决定整批。', 'Verify placement and leading before committing a batch.') }
  },

  /* ------------------------------------------------------------------ */
  {
    id: '12',
    uiLang: 'en', slug: 'en-multilingual-replace', theme: 'bronze', shape: 'technical',
    query: B('多语言 PSD 文字替换', 'multilingual PSD text replacement'),
    who: B('技术侧评估可行性的团队', 'Technical teams assessing feasibility'),
    pain: B('合并层与转曲字改不动', 'Merged and outlined text will not move'),
    why: B('英文技术词，搜的人要判断「我们的稿能不能这么做」。这页按技术说明写，把可编辑性分类放前面。',
      'An English technical query: the searcher is assessing feasibility. This page leads with an editability classification.'),
    title: B('多语言 PSD 文字替换：哪些稿改得动，哪些改不动', 'Multilingual PSD text replacement: what is editable and what is not'),
    desc: B('一个 PSD 能不能换字，取决于字是怎么做进去的。文字层能写回，智能对象要打开源文件，压成位图的写不进去。',
      'Whether a PSD can take new text depends on how the text was built. Text layers write back; smart objects need their source; rasterised text cannot.'),
    eyebrow: B('搜索承接 · 技术说明型', 'Search shape · Technical'),
    h1: [B('文字进了图层，才改得动。', 'Text in a layer can change.'), B('压成像素，这条路就断了。', 'Flattened pixels cannot.')],
    sub: B('在评估任何工具之前，先把稿子归类。三类分清楚，才谈得上一批能不能跑。',
      'Before evaluating any tool, classify the file. Three categories decide whether a batch is possible at all.'),
    note: B('按 Photoshop 的可编辑性分类；界面为示意。', 'Classified by Photoshop editability; UI is schematic.'),
    mech: {
      ok: B('文字层：字体、字号、行距、字距都长在图层上', 'Text layer — font, size, leading and tracking all live on the layer'),
      bad: B('位图：颜色已经烤进像素，没有文字对象可替换', 'Raster — colour is baked into pixels; no text object remains'),
      pivot: B('智能对象：里面可能还有文字层，要在源文件里才够得着', 'Smart object — may still contain text layers, reachable only in the source')
    },
    cases: [
      { title: B('能写回', 'Writes back'), body: B('独立文字图层、字体可用。', 'Standalone text layers with a usable face.') },
      { title: B('要打开源文件', 'Needs the source'), body: B('包在智能对象里的文字，从上层够不着。', 'Text nested in a smart object is unreachable from the parent.') },
      { title: B('要人决定', 'Needs a human'), body: B('描边、做成路径、加了变形的文字，换语言形状就变。', 'Outlined, pathified or warped text changes shape per language.') },
      { title: B('写不进去', 'Cannot be written'), body: B('合并层、栅格化、文字转曲，以及整页压成一张图。', 'Merged, rasterised, outlined, or a page flattened to one image.') },
      { title: B('能写但要验', 'Written, verify'), body: B('自动换行把一行拆成两行，下面的元素要被推着走。', 'Auto-wrapped lines may become two, pushing elements below.') },
      { title: B('缺字形', 'Glyph gaps'), body: B('字体没有目标语言的字，会用 Photoshop 的替代字体，宽度跟着变。', 'Missing script coverage falls back to a substitute or boxes.') }
    ],
    demo: false,
    fit: [
      { title: B('先看图层树', 'Check the tree'), body: B('找“T”图标。有，这条路就通。', 'Look for the T icon. Present, the route is open.') },
      { title: B('再看字体', 'Check the faces'), body: B('有没有该语言的字形，决定了写回去是字还是方框。', 'Script coverage decides between letters and boxes.') }
    ],
    boundary: [
      B('可编辑性由 Photoshop 决定，本页只做解释。', 'Editability is decided by Photoshop; this page explains it.'),
      B('描边、变形、混合模式的渲染结果以你的稿为准。', 'Strokes, warps and blend modes render as your file renders.'),
      B('界面为示意。', 'UI is schematic.') ],
    cta: { h: B('先归类', 'Classify first'),
      p: B('打开图层看一眼，比读十页说明快。', 'One look at the layer tree beats ten pages of explanation.') }
  }
];

export const excluded = [
  { kw: B('多语言 PSD 设计稿', 'multilingual PSD templates'),
    why: B('实测这个词 20 条前排里 14 条是素材下载站（我图网、千图网一类），搜的人要的是能下载的模板。给它做页面等于对着错误的意图说话。',
      'Fourteen of twenty top results are template marketplaces; the searcher wants a downloadable template. Building a page for it talks to the wrong intent.') },
  { kw: B('PSD 自动翻译', 'PSD auto translate'),
    why: B('词表里这一档的问题是「PSD 能自动翻译吗」，与第 07 页同题两种问法；这个词没做过 SERP 测量。分开做会变成两页抢同一批人。',
      'Merged into page 07: same question, two phrasings. Two pages would compete for the same searcher.') }
];

export { BOUNDARY_COMMON };
