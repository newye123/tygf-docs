export const OFFICIAL = {
  home: 'https://tuyigf.com/',
  privacy: 'https://tuyigf.com/privacy',
  subprocessors: 'https://tuyigf.com/privacy/subprocessors',
  download: 'https://tuyigf.com/download',
  wechat: 'tuyigf',
  email: 'tuyi@tuyigf.com'
};

export const LANGS = [
  { code: 'en', zh: '英语', en: 'English', rtl: false },
  { code: 'de', zh: '德语', en: 'German', rtl: false },
  { code: 'fr', zh: '法语', en: 'French', rtl: false },
  { code: 'es', zh: '西班牙语', en: 'Spanish', rtl: false },
  { code: 'it', zh: '意大利语', en: 'Italian', rtl: false },
  { code: 'pt', zh: '葡萄牙语', en: 'Portuguese', rtl: false },
  { code: 'ja', zh: '日语', en: 'Japanese', rtl: false },
  { code: 'ko', zh: '韩语', en: 'Korean', rtl: false },
  { code: 'th', zh: '泰语', en: 'Thai', rtl: false },
  { code: 'vi', zh: '越南语', en: 'Vietnamese', rtl: false },
  { code: 'ar', zh: '阿拉伯语', en: 'Arabic', rtl: true },
  { code: 'ru', zh: '俄语', en: 'Russian', rtl: false }
];

export const FILES = [
  'A+_01_hero.psd',
  'A+_02_lifestyle.psd',
  'A+_03_compare.psd',
  'A+_04_detail.psd',
  'Main_01.psd',
  'Main_02.psd',
  'Detail_01.psd',
  'Detail_02.psd',
  'Banner_01.psd',
  'Banner_02.psd',
  'Insert_01.psd',
  'Insert_02.psd'
];

export const STATUS = {
  done: { zh: '已写入', en: 'Written', key: 'done' },
  review: { zh: '待复查', en: 'Review', key: 'review' },
  blocked: { zh: '无法处理', en: 'Unprocessable', key: 'blocked' },
  fail: { zh: '执行失败', en: 'Failed', key: 'fail' },
  pending: { zh: '未开始', en: 'Not started', key: 'pending' }
};

const s = (zh, en) => ({ zh, en });

export const S = {
  brand: s('图译工坊', 'TuYi Workshop'),
  brandSub: s('PSD 多语言交付工作台', 'Multilingual PSD delivery workbench'),
  beta: s('内测中', 'In beta'),
  nav: {
    home: s('首页', 'Home'),
    demo: s('演示', 'Demo'),
    fit: s('适配', 'Fit'),
    apply: s('申请', 'Apply')
  },
  navCta: s('申请内测', 'Request access'),
  langButton: s('EN', '中文'),
  langNote: s('本页提供中文与英文两个版本', 'This page is available in Chinese and English'),
  chips: [
    s('已有确认译文', 'Approved copy ready'),
    s('可编辑文字图层', 'Editable text layers'),
    s('单批 ≤12 语种', '≤12 languages per batch'),
    s('写入后回读', 'Read-back after write')
  ],
  cta: {
    primary: s('申请真实项目试跑', 'Request a real-project pilot'),
    secondary: s('看它怎么工作', 'See how it works'),
    demo: s('看交互示意', 'See the interactive demo'),
    micro: s('申请阶段不需要上传 PSD 或译文表', 'No PSD or translation table needed to apply'),
    apply: s('去申请试跑', 'Request a pilot'),
    download: s('查看下载与环境要求', 'Download and requirements')
  },
  workflow: {
    kicker: s('标准流程', 'The workflow'),
    title: s('四步，把重复收进批次。', 'Four steps. Batch the repetition.'),
    lead: s('速度来自批量执行，必要检查不会因此省掉。确定的先走，拿不准的先停。', 'Speed comes from batch execution. Necessary checks stay. Clear items run first; uncertain ones stop.'),
    steps: [
      {
        num: '01',
        title: s('导入译文表', 'Import translation tables'),
        desc: s('整张多语言表，或多张单语言表一次选中自动合并；执行前先查空译文、重复原文、同源不同译。', 'Use one multilingual sheet or several single-language sheets at once. Empty cells, duplicate sources, and conflicting translations are surfaced before execution.')
      },
      {
        num: '02',
        title: s('选稿与语言', 'Choose drafts and languages'),
        desc: s('一次最多导入 12 份设计稿；每份稿按自己的表与目标语种执行，单批最多 12 个语种。', 'Import up to 12 drafts at once. Each draft runs against its own table and target languages, with up to 12 languages per batch.')
      },
      {
        num: '03',
        title: s('批量写入', 'Write in batch'),
        desc: s('本地助手通过 Photoshop 写入，保留可编辑文字图层；拿不准的位置停下来等你确认。', 'The local assistant writes through Photoshop and keeps text editable. Ambiguous matches stop for your decision.')
      },
      {
        num: '04',
        title: s('回读与交付', 'Read back and hand off'),
        desc: s('重开文件回读文字与渲染行数，把待复查、未覆盖、执行失败分开列，最终视觉由你确认。', 'Reopen the file to read back text and rendered line counts. Review, uncovered, and failed items are listed separately. Final visual QA stays with you.')
      }
    ]
  },
  features: {
    kicker: s('这一版真正多出来的能力', 'What this version actually adds'),
    title: s('把「按语种重做」拆成可批量的步骤。', 'Per-language redo, split into steps that batch.'),
    lead: s('一次导入 12 份稿；单批 12 个语种；字体、字重、行距、字距按组配；换行写回后再回读。', 'Import 12 drafts at once; run up to 12 languages per batch; set font, weight, leading, and tracking by group; write line breaks and read them back.'),
    items: [
      {
        icon: 'drafts',
        title: s('12 份稿，一次准备', '12 drafts, one setup'),
        desc: s('一次最多导入 12 份 PSD/PSB，逐稿配对译文表；每份稿仍是独立批次，状态不混。', 'Import up to 12 PSD/PSB drafts and pair each with its own table. Each draft remains a separate batch, so statuses never blur.')
      },
      {
        icon: 'langs',
        title: s('单批最多 12 个语种', 'Up to 12 languages per batch'),
        desc: s('同一套稿的多门语言一起处理，不再按语种把「找层、对译、写入、保存」重做一遍。', 'Process multiple languages for one draft together instead of repeating find-match-write-save for every language.')
      },
      {
        icon: 'type',
        title: s('按源稿分组配字体', 'Fonts grouped by source face'),
        desc: s('默认按源稿脸名分组，再按字重或读数拆组；不同字体可以配不同字体与字重。', 'Group by source face name by default, then split by weight or readout. Each group can map to its own font and weight.')
      },
      {
        icon: 'spacing',
        title: s('行距与字距按组调', 'Leading and tracking by group'),
        desc: s('排版面板里按组调整行距、字距与自动间距，写入前先看样例。', 'Adjust leading, tracking, and auto spacing per group in the typography panel, with a live sample before writing.')
      },
      {
        icon: 'wrap',
        title: s('换行写回，再回读', 'Line breaks written back, then measured'),
        desc: s('行分隔符按段落回车写回；重开 Photoshop 后实测渲染行数，计划与实测不符就标出来。', 'Paragraph breaks are written back; after reopening Photoshop, rendered lines are measured. A mismatch is flagged.')
      },
      {
        icon: 'queue',
        title: s('例外集中处理', 'Exceptions in one queue'),
        desc: s('待复查、无法处理、执行失败分开列，不把「不知道」写成「成功」。', 'Review, unprocessable, and failed items are listed separately. Unknown is never written up as success.')
      }
    ],
    caveat: s('换行只处理可确定的行结构。设计稿只有一行而译文更宽时，不自动加行、不悄悄缩字号；位置会进例外清单等人工处理。', 'Line handling covers determinable structure only. If a single-line design is narrower than its translation, the tool does not add lines or silently shrink type; those positions go to the exception list.')
  },
  typography: {
    kicker: s('排版面板', 'Typography panel'),
    title: s('换一套字体，等于重新配平。', 'A font swap is a rebalance.'),
    lead: s('同一句译文，换一套字体，字面高度和字宽就变了。按源稿分组配字体，再调行距与字距，最后逐语种看版面。', 'The same line changes cap height and width when the face changes. Group by source face, map font and weight, adjust leading and tracking, then inspect every language.'),
    controls: {
      font: s('字体', 'Font'),
      weight: s('字重', 'Weight'),
      leading: s('行距', 'Leading'),
      tracking: s('字距', 'Tracking'),
      sample: s('样例语种', 'Sample language'),
      apply: s('套用到整组', 'Apply to group')
    },
    fonts: {
      sans: s('思源黑体 / 系统无衬线', 'Source Han Sans / system sans'),
      serif: s('思源宋体 / 系统衬线', 'Source Han Serif / system serif'),
      inter: s('Inter / Segoe UI', 'Inter / Segoe UI'),
      georgia: s('Georgia / 宋体', 'Georgia / Songti'),
      thai: s('Noto Sans Thai / 泰文回退', 'Noto Sans Thai / Thai fallback'),
      mono: s('等宽 / Consolas', 'Monospace / Consolas')
    },
    sampleTitle: s('窄图层里的长译文', 'Long copy in a narrow layer'),
    sampleBody: s('先判断能不能放下，再决定怎么改版。放不下的位置进例外清单，不悄悄缩字号，也不把「不知道」写成「成功」。', 'Check whether it fits before deciding how to rework the layout. Positions that do not fit go to the exception list; type is not silently shrunk, and unknown is never written up as success.'),
    sampleCaption: s('示意排版 · 字体来自本机已安装字体', 'Schematic typography · fonts come from this machine'),
    sampleNote: s('样例在浏览器里渲染；Photoshop 的最终字面高度以实际字体文件为准。', 'The sample renders in your browser; final cap height in Photoshop depends on the actual font file.'),
    groupsKicker: s('分组', 'Grouping'),
    groupsTitle: s('分组从源稿脸名开始，再按读数拆。', 'Groups start from the source face, then split by readout.'),
    groupsLead: s('默认按源稿脸名分组；同一脸名跨字号或字重时，可按读数再拆。', 'The default groups by source face name; when one face spans sizes or weights, split further by readout.'),
    groupToggle: s('按读数再拆', 'Split by readout'),
    groups: [
      { src: 'SourceHanSansSC-Bold', map: s('思源黑体 · 700', 'Source Han Sans · 700'), size: '32 / 18 / 14', weight: '700 / 500 / 400' },
      { src: 'SourceHanSerifSC-Medium', map: s('思源宋体 · 500', 'Source Han Serif · 500'), size: '28 / 16', weight: '500 / 400' },
      { src: 'ProductSans-Regular', map: s('Inter · 400', 'Inter · 400'), size: '22 / 13', weight: '400 / 400' },
      { src: 'NotoSansThai-Regular', map: s('Noto Sans Thai · 400', 'Noto Sans Thai · 400'), size: '18 / 13', weight: '400 / 400' }
    ]
  },
  matrix: {
    kicker: s('批量总表', 'Batch table'),
    title: s('12 份稿，12 门语言，一张总表。', 'Twelve drafts, twelve languages, one table.'),
    lead: s('每份稿按自己的译文表执行；状态分开，先看需要你的格子。', 'Each draft runs against its own table. Statuses stay separate; start with the cells that need you.'),
    note: s('示意界面 · 模拟数据 · 不代表真实任务或成功率', 'Schematic UI · simulated data · not a real task or success rate'),
    legend: [s('已写入', 'Written'), s('待复查', 'Review'), s('无法处理', 'Unprocessable'), s('执行失败', 'Failed'), s('未开始', 'Not started')],
    filterAll: s('全部', 'All'),
    filterReview: s('待复查', 'Review'),
    filterIssues: s('异常', 'Issues'),
    run: s('开始示意执行', 'Run demo'),
    reset: s('重置', 'Reset'),
    progress: s('进度', 'Progress'),
    runNote: s('每份稿是独立批次；这里把 12 份稿的结果放在同一张表里看。', 'Each draft is its own batch; this table puts all 12 results in one view.'),
    counts: s('已完成', 'written'),
    countsReview: s('待复查', 'review'),
    countsIssues: s('异常', 'issues'),
    inspectorEmpty: s('点一个格子看详情', 'Select a cell for details'),
    obj: s('对象', 'Object'),
    source: s('原文', 'Source'),
    target: s('译文', 'Target'),
    planned: s('计划行数', 'Planned lines'),
    rendered: s('实测行数', 'Rendered lines'),
    noteLabel: s('备注', 'Note'),
    lang: s('语言', 'Language'),
    file: s('设计稿', 'Draft'),
    cellAria: s('查看这个对象的状态', 'Inspect this object')
  },
  wrap: {
    kicker: s('换行回读', 'Line-break read-back'),
    title: s('写进去了，还要看它怎么折行。', 'Write it in, then look at how it wraps.'),
    lead: s('段落回车写回后，重开文件实测渲染行数；计划与实测不一致就标出来。', 'After paragraph breaks are written, reopen the file and measure rendered lines. A mismatch is flagged.'),
    modeParagraph: s('段落回车写回', 'Paragraph breaks'),
    modeBox: s('文本框由 PS 折行', 'Box text wraps in PS'),
    button: s('重开 PS 回读', 'Reopen and read back'),
    planned: s('计划行数', 'Planned'),
    rendered: s('实测行数', 'Rendered'),
    status: s('状态', 'Status'),
    ok: s('一致', 'Match'),
    warn: s('换行未在 Photoshop 生效，需人工检查', 'Line break did not take effect in Photoshop — manual check required'),
    note: s('单行设计放不下更宽的译文时，不自动加行、不悄悄缩字号；位置会进例外清单。', 'When a single-line design cannot fit a wider translation, the tool does not add lines or silently shrink type; the position goes to exceptions.'),
    orphanTitle: s('单字不成行', 'No one-character last line'),
    orphanNote: s('这是本页的排版规则，也是交付前的自查项：标题或短行末尾只剩一个字，就回看断点。', 'This is a typography rule for these pages, and a pre-delivery check: if a heading or short line ends with a single character, revisit the break.'),
    orphanAllow: s('允许单字成行', 'Allow orphan'),
    orphanFix: s('不留单字', 'No orphan'),
    orphanLast: s('末行', 'Last line'),
    orphanChars: s('个字', 'chars'),
    orphanOk: s('已收回', 'Pulled back'),
    orphanBad: s('出现单字', 'Orphan found')
  },
  proof: {
    kicker: s('执行报告', 'Execution report'),
    title: s('报告按行列账，每一行都能复查。', 'A report reads line by line, and every line can be checked.'),
    lead: s('计划行数、实测渲染行数、待复查、未覆盖、执行失败分开写；文字回读不等于视觉或语义验收。', 'Planned lines, measured lines, review items, uncovered items, and failures are recorded separately. Text read-back is not visual or semantic QA.'),
    headers: [s('对象', 'Object'), s('语言', 'Language'), s('计划行数', 'Planned'), s('实测行数', 'Rendered'), s('状态', 'Status'), s('备注', 'Note')],
    rows: [
      ['A+_01 / t-headline', 'de', '3', '3', 'done', s('段落回车一致', 'Paragraph breaks match')],
      ['A+_01 / t-body', 'de', '4', '5', 'review', s('实测多一行，需看版面', 'One extra rendered line; check layout')],
      ['A+_02 / t-badge', 'ja', '1', '—', 'blocked', s('图层已栅格化', 'Layer is rasterized')],
      ['A+_03 / t-price', 'th', '2', '2', 'review', s('组合符号落位需人工确认', 'Combining marks need a visual check')],
      ['A+_04 / t-cta', 'ar', '1', '—', 'fail', s('执行失败，文件未写入', 'Execution failed; file not written')]
    ],
    note: s('示意报告 · 非真实项目数据', 'Schematic report · not real project data'),
    guideTitle: s('怎么读', 'How to read'),
    guide: [
      s('先看状态列：完成、待复查、无法处理、执行失败分开。', 'Start with status: written, review, unprocessable, and failed are separate.'),
      s('再对齐计划行数与实测行数：不一致就回到 Photoshop 看折行。', 'Compare planned and rendered lines; if they differ, inspect the wrap in Photoshop.'),
      s('最后逐语种看版面：回读只管文字，语义和美观仍在人这边。', 'Finally, inspect each language: read-back covers text only; meaning and visual quality stay with you.')
    ],
    statusLegend: s('状态说明', 'Status legend')
  },
  fit: {
    kicker: s('适用与边界', 'Fit and boundaries'),
    title: s('先说清楚，哪些稿适合，哪些不适合。', 'First, which drafts fit — and which do not.'),
    lead: s('产品处理已经确定的文字替换；它不是翻译工具，也不替代最终视觉验收。', 'The product handles text replacements that are already decided. It is not a translation tool, and it does not replace final visual QA.'),
    suitableTitle: s('适合试跑', 'A good fit'),
    suitable: [
      s('已有确认译文，只需要写回设计稿。', 'Approved translations already exist; you only need write-back.'),
      s('PSD/PSB 里的文字仍是可编辑文字图层。', 'Text remains editable in the PSD/PSB.'),
      s('每份稿能对上自己的译文表。', 'Each draft has a table that belongs to it.'),
      s('单批目标语种在 12 个以内。', 'Up to 12 target languages per batch.'),
      s('你愿意逐语种看最终版面。', 'You will review the final layout language by language.')
    ],
    notTitle: s('不适合直接批量跑', 'Not a direct fit'),
    not: [
      s('需要机器翻译或 OCR 生成译文。', 'You need machine translation or OCR to produce copy.'),
      s('文字已经栅格化、并层或无法直接替换。', 'Text is rasterized, flattened, or otherwise not directly replaceable.'),
      s('希望完全无人值守、不做最终检查。', 'You expect fully unattended output with no final check.'),
      s('要求所有 Photoshop 版本、所有复杂结构都保证可用。', 'You need every Photoshop version and every complex structure guaranteed.'),
      s('把文字回读当成视觉或语义验收。', 'You treat text read-back as visual or semantic QA.')
    ],
    compatTitle: s('环境与兼容', 'Environment and compatibility'),
    compat: [
      s('Windows 10 / 11 64 位。', 'Windows 10 / 11, 64-bit.'),
      s('Adobe Photoshop 2021（22.0）实机验证。', 'Adobe Photoshop 2021 (22.0) verified on real machines.'),
      s('其他 Photoshop 版本未逐项验证。', 'Other Photoshop versions are not individually verified.'),
      s('智能对象里的文字可能需要先处理。', 'Text inside smart objects may need preparation.'),
      s('从右向左语言、泰文和长译文需要人工看版面。', 'RTL languages, Thai, and long copy need a human layout check.')
    ],
    checklistTitle: s('开工前 6 件事', 'Six checks before you start'),
    checklist: [
      s('文字还是可编辑的文字图层吗？', 'Is the text still editable?'),
      s('译文表和这份稿对得上吗？', 'Does the table belong to this draft?'),
      s('一个设计稿对象占一行了吗？', 'Is there one object per row?'),
      s('先检查译文，再开始写回了吗？', 'Did you review translations before writing?'),
      s('单批语种在 12 个以内吗？', 'Are you within 12 languages per batch?'),
      s('写完逐语种看版面了吗？', 'Did you inspect every language afterwards?')
    ]
  },
  data: {
    kicker: s('数据处理', 'Data handling'),
    title: s('哪些留在本机，哪些会离开。', 'What stays local, what leaves.'),
    lead: s('文件本体留在本机，不等于所有数据都不出本机。把边界逐项说清楚。', 'File bytes staying local does not mean all data stays local. Here is the boundary, item by item.'),
    headers: [s('数据', 'Data'), s('去向', 'Where it goes')],
    rows: [
      [s('PSD/PSB 文件本体与替换后导出的图像', 'PSD/PSB file bytes and exported images'), s('本机处理，不上传服务器', 'Processed locally; not uploaded')],
      [s('图层原文、表格原文与译文、设计稿和输出目录路径', 'Layer text, table text and translations, draft and output paths'), s('上传，用于报价、绑定、执行、结算', 'Uploaded for quoting, binding, execution, and settlement')],
      [s('智能检测使用的原文与当前译文', 'Source and current translation used by smart checks'), s('交给第三方 AI 模型服务', 'Sent to third-party AI model services')],
      [s('核心业务数据', 'Core business data'), s('当前部署在新加坡', 'Currently hosted in Singapore')],
      [s('最终视觉与语义验收', 'Final visual and semantic acceptance'), s('设计师在 Photoshop 中确认', 'Confirmed by the designer in Photoshop')]
    ],
    note: s('以正式隐私政策与第三方处理方清单为准。', 'The official privacy policy and subprocessor list govern.'),
    privacy: s('正式隐私政策', 'Privacy policy'),
    subprocessors: s('第三方处理方清单', 'Subprocessor list')
  },
  faq: {
    kicker: s('常见问题', 'FAQ'),
    title: s('先把最容易误会的几件事说清楚。', 'A few things worth clearing up first.'),
    items: [
      {
        q: s('它会替我翻译吗？', 'Does it translate for me?'),
        a: s('不会。需要你提供已经确认的译文；产品负责把译文写回对应的文字图层。', 'No. You provide approved translations; the product writes them into the matching text layers.')
      },
      {
        q: s('12 份稿是一次跑完吗？', 'Do 12 drafts run in one go?'),
        a: s('一次可以准备最多 12 份稿，但每份稿按自己的表和语言分别执行；单批语言上限是 12。', 'Up to 12 drafts can be prepared together, but each runs as its own batch against its own table. Languages per batch are capped at 12.')
      },
      {
        q: s('写完就不用看了吗？', 'Is review unnecessary after writing?'),
        a: s('需要。回读核对文字与渲染行数；语义和美观要在 Photoshop 里逐语种看。', 'Yes, review is needed. Read-back covers text and rendered lines; meaning and visual quality are checked per language in Photoshop.')
      },
      {
        q: s('长译文撑版怎么办？', 'What happens when long copy overflows?'),
        a: s('可能撑版。放不下的位置进例外清单，不自动缩字号或加行；改版判断留给你。', 'It may overflow. Positions that do not fit go to the exception list; type is not auto-shrunk or re-lined. The layout decision stays with you.')
      },
      {
        q: s('哪些文件不适合？', 'Which files are a poor fit?'),
        a: s('文字已栅格化或并层、文字在无法处理的智能对象里、结构复杂且未验证的稿，先别批量跑。', 'Rasterized or flattened text, text in unsupported smart objects, and unverified complex structures should not be batched.')
      },
      {
        q: s('数据安全怎么理解？', 'How should data handling be understood?'),
        a: s('文件本体留在本机；图层文字、译文和路径会上传；智能检测会调用第三方模型。以正式政策为准。', 'File bytes stay local; layer text, translations, and paths are uploaded; smart checks call third-party models. The official policy governs.')
      }
    ]
  },
  apply: {
    kicker: s('内测申请', 'Beta access'),
    title: s('拿一套正在改语言的项目试跑。', 'Pilot it on a project you are already localizing.'),
    lead: s('申请阶段不需要上传 PSD 或译文表。先说清项目规模、目标语种和现在的做法。', 'No PSD or translation table is needed at this stage. Tell us the scope, target languages, and how you handle it today.'),
    name: s('你的称呼', 'Your name'),
    namePh: s('如：小李', 'e.g. Alex'),
    email: s('邮箱', 'Email'),
    emailPh: s('用于试跑联系', 'For pilot follow-up'),
    wechat: s('微信号（选填）', 'WeChat (optional)'),
    wechatPh: s('填写你的微信号', 'Your WeChat ID'),
    project: s('项目情况', 'Project'),
    projectPh: s('例如：1 套 PSD / 6 个目标语种 / 约 48 个文字位置', 'e.g. 1 PSD / 6 target languages / about 48 text objects'),
    submit: s('生成本地摘要', 'Build local summary'),
    reset: s('清空', 'Clear'),
    note: s('本页为概念原型：表单只在浏览器本地生成摘要，不会提交到服务器。', 'Concept prototype: the form builds a summary in your browser only. Nothing is submitted.'),
    localTitle: s('本地摘要已生成（未发送）', 'Local summary ready (not sent)'),
    localDesc: s('复制这段摘要，通过正式站或邮箱联系我们。', 'Copy this summary and reach us through the official site or email.'),
    copy: s('复制摘要', 'Copy summary'),
    copied: s('已复制', 'Copied'),
    invalid: s('请填写称呼、邮箱和项目情况', 'Please fill in name, email, and project details'),
    nextTitle: s('试跑会发生什么', 'What a pilot looks like'),
    next: [
      s('先确认稿件、译文表和目标语种是否在适用范围内。', 'First we confirm the draft, table, and target languages are in scope.'),
      s('用同一套稿、同一份译文、同一套最终检查标准跑一次。', 'We run the same draft, the same translations, and the same final QA standard.'),
      s('把准备、确认、例外处理和最终 QA 都算进去，再谈是否继续。', 'We count preparation, confirmation, exception handling, and final QA before discussing next steps.')
    ],
    contactTitle: s('也可以直接联系', 'Or reach us directly'),
    wechatLabel: s('微信', 'WeChat'),
    emailLabel: s('邮箱', 'Email')
  },
  footer: {
    blurb: s('图译工坊 · PSD 多语言交付工作台', 'TuYi Workshop · multilingual PSD delivery workbench'),
    disclaimer: s('概念原型 · 界面与数据为示意 · 功能、兼容范围与数据流以正式站为准', 'Concept prototype. UI and data are illustrative. Capabilities, compatibility, and data flows are governed by the official site.'),
    official: s('正式站', 'Official site'),
    privacy: s('隐私', 'Privacy'),
    subprocessors: s('第三方', 'Subprocessors'),
    download: s('下载', 'Download'),
    all: s('22 套方向', 'All 22 directions'),
    langNote: s('本页提供中文与英文两个版本', 'This page is available in Chinese and English')
  },
  views: {
    demo: {
      kicker: s('交互演示', 'Interactive demo'),
      title: s('把 12 份稿放进同一张表。', 'Put twelve drafts in one view.'),
      lead: s('下面所有状态都是模拟；真正的执行需要本地助手与 Photoshop。先把流程和边界看清楚。', 'Every status below is simulated. Real execution requires the local assistant and Photoshop. Use this to understand the flow and the boundaries.')
    },
    fit: {
      kicker: s('适配与边界', 'Fit and boundaries'),
      title: s('先判断适不适合，再谈省不省。', 'First, is it a fit? Then talk about savings.'),
      lead: s('把输入条件、兼容范围和数据边界放在同一页，避免试跑到一半才发现不合适。', 'Input requirements, compatibility, and data boundaries on one page — so a pilot does not stall on a mismatch.')
    },
    apply: {
      kicker: s('申请试跑', 'Request a pilot'),
      title: s('用真实项目跑一次，再决定。', 'Run it on a real project, then decide.')
    }
  },
  misc: {
    schematic: s('示意', 'Schematic'),
    simulated: s('模拟数据', 'Simulated data'),
    notReal: s('非真实项目数据', 'Not real project data'),
    demoTag: s('示意界面', 'Schematic UI'),
    scrollHint: s('向下看', 'Scroll'),
    readMore: s('展开', 'Open'),
    close: s('关闭', 'Close'),
    back: s('返回', 'Back'),
    openDemo: s('打开演示', 'Open demo'),
    openSite: s('打开这一套', 'Open this direction'),
    next: s('下一套', 'Next'),
    prev: s('上一套', 'Previous')
  }
};

export const variants = [
  {
    id: '01',
    slug: 'cinema',
    zh: '首屏即电影',
    en: 'Cinema first',
    angle: 'video',
    angleZh: '视频展示',
    angleEn: 'Video-led',
    theme: 'cinema',
    layout: 'center',
    visual: 'stage',
    eyebrow: s('已有译文的多语言 PSD / PSB · 单批最多 12 个语种', 'Approved copy · multilingual PSD / PSB · up to 12 languages per batch'),
    lines: {
      zh: ['十二个语种，', '不该是十二遍', '同样的活。'],
      en: ['Twelve languages.', 'Not twelve repeats', 'of the same work.']
    },
    accent: 1,
    sub: s('你已经有确认译文，也有可编辑的文字图层。剩下的批量写入、回读核对和例外整理，交给它；最终版面仍由你看。', 'You already have approved copy and editable text layers. Hand off the batch write-back, the read-back checks, and the exception queue. The final layout call stays with you.'),
    note: s('示意动画 · 非真实录屏', 'Schematic animation, not a real screen recording'),
    modules: ['stage', 'pain', 'workflow', 'features', 'typography', 'proof', 'fit', 'faq'],
    bestFor: s('第一次接触产品、需要 10 秒看懂「它到底替掉了哪一段重复」的人。', 'First-time visitors who need to understand, in ten seconds, which repetitive stretch the product removes.'),
    watch: s('视频位必须是真录屏或明确标「示意」；否则会被当成能力证据。', 'The video slot must be a real recording or clearly labelled schematic; otherwise it becomes false evidence.')
  },
  {
    id: '02',
    slug: 'features-bento',
    zh: '能力全景',
    en: 'Feature bento',
    angle: 'features',
    angleZh: '功能展示',
    angleEn: 'Feature-led',
    theme: 'bento',
    layout: 'center',
    visual: 'bento',
    eyebrow: s('这一版多出来的六件事', 'Six things this version adds'),
    lines: {
      zh: ['一套 PSD，', '十二种语言，', '一次准备。'],
      en: ['One PSD.', 'Twelve languages.', 'One setup.']
    },
    accent: 1,
    sub: s('从 12 份稿的批量准备，到按源稿分组配字体、行距字距调整、换行回读——能力摊开看，边界也一起说。', 'From preparing 12 drafts at once to font grouping, leading and tracking, and line-break read-back — the whole toolset, boundaries included.'),
    note: s('能力卡为示意界面 · 数据为模拟', 'Capability cards are schematic; data is simulated'),
    modules: ['bento', 'matrix', 'typography', 'workflow', 'wrap', 'proof', 'fit', 'faq'],
    bestFor: s('已经知道要解决什么问题、想逐项核对能力的评估者。', 'Evaluators who know the problem and want to check capabilities item by item.'),
    watch: s('六张卡容易变成「功能墙」；每张卡必须配一个可玩的演示，否则只剩形容词。', 'Six cards can turn into a feature wall; each needs a playable demo or it is just adjectives.')
  },
  {
    id: '03',
    slug: 'pain-editorial',
    zh: '痛点长文',
    en: 'Pain editorial',
    angle: 'pain',
    angleZh: '痛点出发',
    angleEn: 'Pain-led',
    theme: 'editorial',
    layout: 'split',
    visual: 'pain',
    eyebrow: s('写给还在按语种重复的人', 'For teams still repeating by language'),
    lines: {
      zh: ['每一版语言，', '都要把同一套动作', '再做一遍。'],
      en: ['Every language version', 'runs the same routine', 'again from scratch.']
    },
    accent: 1,
    sub: s('找图层、对译文、粘贴、核对、保存——同一套动作，按语种重复。把重复收进批次，把判断留给你。', 'Find the layer, match the string, paste, check, save — the same routine, once per language. Batch the repetition; keep the judgment.'),
    note: s('长文排版示意 · 数字为流程次数，不是效率承诺', 'Editorial layout · numbers are step counts, not efficiency claims'),
    modules: ['pain', 'manifesto', 'workflow', 'features', 'proof', 'fit', 'faq'],
    bestFor: s('被多语言排期拖住、需要先被说中痛点再听方案的设计负责人。', 'Design leads who feel the multilingual schedule drag and want the problem named before the pitch.'),
    watch: s('痛点写得越顺，越容易滑向「卖惨」；每一段都要落到一个可验证的步骤。', 'The smoother the pain copy, the easier it slides into melodrama; every paragraph must land on a checkable step.')
  },
  {
    id: '04',
    slug: 'launch-promo',
    zh: '内测发布',
    en: 'Beta launch',
    angle: 'promo',
    angleZh: '发布宣传',
    angleEn: 'Promo-led',
    theme: 'promo',
    layout: 'center',
    visual: 'promo',
    eyebrow: s('小范围邀请制 · 内测开放', 'Invite-only beta · now open'),
    lines: {
      zh: ['内测开放：', '把重复的落版', '交出去。'],
      en: ['Beta open:', 'hand off', 'the repetitive layout.']
    },
    accent: 1,
    sub: s('拿一套真实的多语言 PSD，按你现在的最终检查标准跑一次，再决定要不要继续。不先听「能省多少」。', 'Run one real multilingual PSD against your current QA standard, then decide whether it earns a place in your workflow. No savings pitch first.'),
    note: s('发布海报示意 · 不构成价格或名额承诺', 'Launch poster · not a price or availability commitment'),
    modules: ['promo', 'matrix', 'workflow', 'features', 'apply-cta', 'faq'],
    bestFor: s('已有明确项目、需要一条强行动号召把试用推起来的人。', 'Teams with a live project who need a strong call to action to start a trial.'),
    watch: s('发布页最容易编名额、倒计时和折扣；这里一律不写。', 'Launch pages invite fake seat counts, countdowns, and discounts; none are used here.')
  },
  {
    id: '05',
    slug: 'invite-ticket',
    zh: '邀请函',
    en: 'Invitation',
    angle: 'invite',
    angleZh: '邀请出发',
    angleEn: 'Invite-led',
    theme: 'invite',
    layout: 'split',
    visual: 'ticket',
    eyebrow: s('给有真实项目的团队', 'For teams with a live project'),
    lines: {
      zh: ['你收到一张邀请：', '把下一套多语言稿，', '交给它。'],
      en: ['You are invited:', 'hand your next', 'multilingual set to it.']
    },
    accent: 1,
    sub: s('不先听「能省多少」。用同一套稿、同一份译文、同一套最终检查标准，跑完再算。', 'No savings pitch first. Same draft, same translations, same final QA standard — run it, then do the math.'),
    note: s('概念邀请函 · 非正式凭证', 'Concept invitation · not a real credential'),
    modules: ['ticket', 'workflow', 'features', 'typography', 'proof', 'apply-cta', 'faq'],
    bestFor: s('看重「被邀请」多过「被推销」的成熟设计团队。', 'Mature design teams who prefer an invitation to a sales pitch.'),
    watch: s('仪式感不能盖过产品边界；邀请函旁边必须能直接看到适用条件。', 'Ceremony must not bury the boundaries; the fit conditions must sit beside the invitation.')
  },
  {
    id: '06',
    slug: 'product-story',
    zh: '产品叙事',
    en: 'Product story',
    angle: 'product',
    angleZh: '产品展示',
    angleEn: 'Product-led',
    theme: 'apple',
    layout: 'center',
    visual: 'app',
    eyebrow: s('写入 · 回读 · 判断', 'Write · read back · decide'),
    lines: {
      zh: ['写进去，', '读回来，', '再交给你判断。'],
      en: ['Write.', 'Read back.', 'Then you decide.']
    },
    accent: 2,
    sub: s('产品帮你把重复的写入与核对收进来。设计仍然在你手上，每一步都留下可复查的记录。', 'The product absorbs the repetitive write-and-check work. Design stays with you, and every step leaves a reviewable record.'),
    note: s('产品界面为示意 · 非真实截图', 'Product UI is schematic, not a real screenshot'),
    modules: ['app', 'workflow', 'features', 'wrap', 'typography', 'proof', 'fit'],
    bestFor: s('想先看产品本身、再听价值主张的设计工具用户。', 'Design-tool users who want to see the product before hearing the pitch.'),
    watch: s('越像苹果，越容易被当成已上线成品；示意标签不能藏。', 'The more Apple-like the page, the more it reads as shipped product; the schematic label must stay visible.')
  },
  {
    id: '07',
    slug: 'swiss-grid',
    zh: '瑞士网格',
    en: 'Swiss grid',
    angle: 'system',
    angleZh: '系统展示',
    angleEn: 'System-led',
    theme: 'swiss',
    layout: 'grid',
    visual: 'grid',
    eyebrow: s('输入 · 配对 · 写入 · 回读', 'Input · pair · write · read back'),
    lines: {
      zh: ['多语言 PSD 交付，', '应该像一条', '流水线。'],
      en: ['Multilingual PSD', 'delivery should run', 'like a line.']
    },
    accent: 1,
    sub: s('输入检查、按稿配对、批量写入、回读核对。四个环节，各自有明确的输入、输出和失败状态。', 'Input checks, draft-table pairing, batch write-back, read-back verification. Four stages, each with explicit inputs, outputs, and failure states.'),
    note: s('网格中的数字是结构计数，不是业绩', 'Numbers in the grid are structural counts, not performance claims'),
    modules: ['grid', 'workflow', 'features', 'matrix', 'proof', 'fit', 'faq'],
    bestFor: s('偏工程思维的评审者，喜欢先看清系统边界和失败状态。', 'Engineering-minded reviewers who want the system boundary and failure states first.'),
    watch: s('网格很容易变成装饰；每一格都要有信息量。', 'Grids easily become decoration; every cell needs information.')
  },
  {
    id: '08',
    slug: 'terminal',
    zh: '终端日志',
    en: 'Terminal log',
    angle: 'demo',
    angleZh: '演示优先',
    angleEn: 'Demo-led',
    theme: 'terminal',
    layout: 'split',
    visual: 'terminal',
    eyebrow: s('确定的先走，拿不准的停下', 'Clear items run; uncertain ones stop'),
    lines: {
      zh: ['一次准备，', '逐稿执行，', '逐处回读。'],
      en: ['Prepare once.', 'Run per draft.', 'Read back per object.']
    },
    accent: 2,
    sub: s('确定的先走，拿不准的停下；失败与未覆盖不会被写成成功。', 'Clear items run; ambiguous ones stop. Failures and uncovered items are never written up as success.'),
    note: s('日志示意 · 非真实命令行工具', 'Log schematic · not a real CLI'),
    modules: ['terminal', 'workflow', 'features', 'matrix', 'wrap', 'proof', 'fit'],
    bestFor: s('喜欢看真实日志、状态和失败路径的技术型买家。', 'Technical buyers who want to see logs, states, and failure paths.'),
    watch: s('终端美学容易暗示存在 CLI；必须明确这是日志示意。', 'Terminal aesthetics imply a CLI; label it clearly as a schematic log.')
  },
  {
    id: '09',
    slug: 'timeline',
    zh: '流程时间轴',
    en: 'Timeline',
    angle: 'workflow',
    angleZh: '流程展示',
    angleEn: 'Workflow-led',
    theme: 'timeline',
    layout: 'center',
    visual: 'timeline',
    eyebrow: s('从译文表到交付件', 'From table to deliverable'),
    lines: {
      zh: ['从译文表到交付件，', '四步，', '都有据可查。'],
      en: ['From table to deliverable:', 'four steps,', 'all on record.']
    },
    accent: 1,
    sub: s('每一步都能回到输入与结果：用了哪张表、跑了哪些语言、哪一处需要你、哪一处没覆盖。', 'Every step traces back to its input and result: which table, which languages, what needs you, what was not covered.'),
    note: s('时间轴为流程示意 · 不承诺固定耗时', 'Timeline is a process schematic; no fixed duration is promised'),
    modules: ['timeline', 'workflow', 'matrix', 'proof', 'typography', 'fit', 'faq'],
    bestFor: s('需要把工具塞进现有交付流程、先看阶段衔接的人。', 'Teams that need to slot the tool into an existing delivery process.'),
    watch: s('时间轴容易写成「三步搞定」；这里只描述阶段，不承诺时长。', 'Timelines drift into “done in three steps”; this one describes stages, not durations.')
  },
  {
    id: '10',
    slug: 'compare',
    zh: '对比擂台',
    en: 'Comparison',
    angle: 'compare',
    angleZh: '对比展示',
    angleEn: 'Comparison-led',
    theme: 'compare',
    layout: 'center',
    visual: 'compare',
    eyebrow: s('左边手工，右边一次批次', 'Manual on the left, one batch on the right'),
    lines: {
      zh: ['左边是重复十二遍，', '右边是把重复', '收进一次批次。'],
      en: ['Twelve repeats on the left.', 'One batch', 'on the right.']
    },
    accent: 1,
    sub: s('先把可以确定的重复收走。剩下的判断、例外和最终版面，仍然归你。', 'The determinable repetition goes first. Judgment, exceptions, and the final layout still belong to you.'),
    note: s('对比为流程示意 · 两侧数据均为模拟', 'Comparison is a process schematic; both sides are simulated'),
    modules: ['compare', 'pain', 'workflow', 'features', 'proof', 'fit'],
    bestFor: s('需要向团队解释「到底变了什么」的推动者。', 'Champions who need to explain to a team what actually changes.'),
    watch: s('对比图最容易被做成「人工 vs 全自动」；这里明确不是。', 'Comparison graphics slide into “manual vs fully automatic”; this one explicitly is not that.')
  },
  {
    id: '11',
    slug: 'typography-craft',
    zh: '排版工艺',
    en: 'Typography craft',
    angle: 'craft',
    angleZh: '排版工艺',
    angleEn: 'Craft-led',
    theme: 'craft',
    layout: 'split',
    visual: 'typography',
    eyebrow: s('字体 · 字重 · 行距 · 字距', 'Font · weight · leading · tracking'),
    lines: {
      zh: ['换一套字体，', '等于重新配平。'],
      en: ['A new typeface', 'rebalances the page.']
    },
    accent: 1,
    sub: s('不同字体、不同字重，字面高度和字宽都不同。按源稿分组配字体，再调行距与字距，最后逐语种看版面。', 'Different faces and weights change cap height and width. Group by source face, map font and weight, adjust leading and tracking, then inspect every language.'),
    note: s('可操作的排版实验室 · 字体来自本机', 'Playable typography lab · fonts come from this machine'),
    modules: ['typography', 'wrap', 'features', 'workflow', 'proof', 'fit', 'faq'],
    bestFor: s('对版式敏感、只想知道「换字体后会不会崩」的设计师。', 'Designers who care about layout and want to know whether a font swap will break it.'),
    watch: s('排版实验室必须真的能调；做成静态截图就失去意义。', 'The lab must actually adjust; a static screenshot defeats the purpose.')
  },
  {
    id: '12',
    slug: 'batch-ops',
    zh: '批量作战室',
    en: 'Batch ops',
    angle: 'scale',
    angleZh: '规模展示',
    angleEn: 'Scale-led',
    theme: 'batch',
    layout: 'split',
    visual: 'matrix',
    eyebrow: s('12 份稿 · 12 门语言 · 一张表', '12 drafts · 12 languages · one table'),
    lines: {
      zh: ['十二份稿，', '十二门语言，', '一张总表。'],
      en: ['Twelve drafts.', 'Twelve languages.', 'One control table.']
    },
    accent: 2,
    sub: s('每份稿按自己的表执行，状态分开；先看需要你决定的格子。', 'Each draft runs against its own table with separate statuses. Start where your decision is needed.'),
    note: s('作战室为示意界面 · 模拟数据', 'Ops room is a schematic UI; simulated data'),
    modules: ['matrix', 'features', 'workflow', 'typography', 'proof', 'fit'],
    bestFor: s('一次要处理多份稿、多个站点的代运营与设计服务团队。', 'Agencies and ops teams handling multiple drafts and storefronts at once.'),
    watch: s('12×12 容易被读成「一次跑 144 份」；必须写清按稿分批。', '12×12 can read as “144 deliverables in one run”; state clearly that drafts are batched separately.')
  },
  {
    id: '13',
    slug: 'ecommerce',
    zh: '电商视觉',
    en: 'E-commerce visuals',
    angle: 'vertical',
    angleZh: '行业场景',
    angleEn: 'Vertical-led',
    theme: 'ecommerce',
    layout: 'split',
    visual: 'ecommerce',
    eyebrow: s('A+ · 主图 · 详情页', 'A+ · hero · detail pages'),
    lines: {
      zh: ['A+ 图、主图、详情页，', '一套素材', '走完十二个站点。'],
      en: ['A+ modules, hero images,', 'detail pages —', 'one set, twelve storefronts.']
    },
    accent: 1,
    sub: s('电商稿做语言版本，换完文字只算开头。撑版、字体、行距和平台规格，得逐语种看。', 'Localized e-commerce visuals start with swapped strings and go further. Overflow, fonts, leading, and marketplace specs need a language-by-language look.'),
    note: s('商品素材为 CSS 示意 · 非客户案例', 'Product visuals are CSS schematics; not client work'),
    modules: ['ecommerce', 'pain', 'workflow', 'features', 'matrix', 'fit'],
    bestFor: s('跨境电商、A+ 与详情页团队，能把产品价值直接映射到日常稿件。', 'Cross-border e-commerce and A+ teams who can map the value to daily assets.'),
    watch: s('行业页最容易借用客户素材和销量；这里只用 CSS 示意。', 'Vertical pages invite borrowed client assets and sales numbers; this one uses CSS schematics only.')
  },
  {
    id: '14',
    slug: 'agency',
    zh: '设计服务商',
    en: 'Agency handoff',
    angle: 'agency',
    angleZh: '服务商场景',
    angleEn: 'Agency-led',
    theme: 'agency',
    layout: 'split',
    visual: 'agency',
    eyebrow: s('多稿 · 多语言 · 可交接', 'Many drafts · many languages · handoff-ready'),
    lines: {
      zh: ['把重复留给工具，', '把签字留给你。'],
      en: ['Leave repetition to the tool.', 'Keep the sign-off.']
    },
    accent: 1,
    sub: s('设计服务商和代运营团队，一套流程接多份稿、多门语言；例外集中，交接有据。', 'For studios and agency teams: one process across drafts and languages, exceptions in one queue, and a handoff record.'),
    note: s('角色与交接为示意 · 不代表真实组织', 'Roles and handoff are schematic; not a real organization'),
    modules: ['agency', 'matrix', 'workflow', 'features', 'proof', 'fit'],
    bestFor: s('需要把内部产能和交接责任讲清楚的乙方团队。', 'Agencies that need to explain capacity and handoff responsibility.'),
    watch: s('「白牌交付」不能暗示可以隐藏数据流；边界仍要露出。', 'White-label language must not hide the data flow; the boundary still shows.')
  },
  {
    id: '15',
    slug: 'evidence',
    zh: '证据档案',
    en: 'Evidence file',
    angle: 'trust',
    angleZh: '证据与信任',
    angleEn: 'Evidence-led',
    theme: 'evidence',
    layout: 'split',
    visual: 'evidence',
    eyebrow: s('可复查 · 可回到原件', 'Reviewable · traceable to the source'),
    lines: {
      zh: ['别信一个大数字。', '看报告里的', '每一行。'],
      en: ['Do not trust one big number.', 'Read every line', 'of the report.']
    },
    accent: 1,
    sub: s('计划行数、实测渲染行数、待复查、未覆盖、执行失败——分开写，才叫可复查。', 'Planned lines, measured rendered lines, review items, uncovered items, failures — recorded separately, so the work can be checked.'),
    note: s('档案为示意 · 报告数据为模拟', 'Dossier is schematic; report data is simulated'),
    modules: ['evidence', 'proof', 'workflow', 'features', 'data', 'fit', 'faq'],
    bestFor: s('审慎型企业客户、需要向采购或安全解释证据边界的人。', 'Cautious enterprise buyers who must explain evidence boundaries to procurement or security.'),
    watch: s('档案感容易伪造权威；每一页都要标「示意」并给出可核对的字段。', 'Dossier styling can fake authority; label every page schematic and show checkable fields.')
  },
  {
    id: '16',
    slug: 'fit-check',
    zh: '适配自查',
    en: 'Fit check',
    angle: 'fit',
    angleZh: '适配筛选',
    angleEn: 'Fit-led',
    theme: 'fit',
    layout: 'split',
    visual: 'fitquiz',
    eyebrow: s('三个问题，先筛掉不合适', 'Three questions to screen out a mismatch'),
    lines: {
      zh: ['先判断适不适合，', '再谈省不省。'],
      en: ['First, is it a fit?', 'Then talk about savings.']
    },
    accent: 0,
    sub: s('三个问题，先看你的稿、译文和语种是否在适用范围内。不适合就直说，不浪费试跑。', 'Three questions to check whether your draft, translations, and language count fit. If it does not, we say so before a pilot.'),
    note: s('自查结果只基于三项输入 · 不代表兼容性承诺', 'The result reflects three inputs only; it is not a compatibility guarantee'),
    modules: ['fitquiz', 'fit', 'data', 'workflow', 'features', 'faq'],
    bestFor: s('还不确定自己的稿能不能跑、希望先自我筛选的访客。', 'Visitors who are unsure whether their draft qualifies and want to self-screen.'),
    watch: s('自查不能变成「算命」；结果要给出具体理由和下一步。', 'A fit check must not become a fortune teller; give reasons and a next step.')
  },
  {
    id: '17',
    slug: 'roi-lab',
    zh: '工时实验室',
    en: 'ROI lab',
    angle: 'roi',
    angleZh: '成本论证',
    angleEn: 'ROI-led',
    theme: 'roi',
    layout: 'split',
    visual: 'roi',
    eyebrow: s('把准备、确认、例外、QA 都算进去', 'Count preparation, confirmation, exceptions, and QA'),
    lines: {
      zh: ['省了多少，', '不该由', '宣传页说了算。'],
      en: ['Savings should not be', 'decided by', 'a landing page.']
    },
    accent: 2,
    sub: s('输入你自己的假设，结果为 0 或负数也照实显示。默认值只是示例，不是实测。', 'Enter your own assumptions. Zero or negative results are shown as they are. Defaults are examples, not measurements.'),
    note: s('计算器为示意 · 默认假设非实测', 'Calculator is schematic; defaults are not measurements'),
    modules: ['roi', 'pain', 'workflow', 'features', 'proof', 'fit', 'faq'],
    bestFor: s('要向老板或财务解释投入产出的人。', 'People who must explain the economics to a manager or finance.'),
    watch: s('计算器最容易被截图当成承诺；默认值必须标「示例」且允许负结果。', 'Calculators get screenshotted as promises; label defaults and allow negative results.')
  },
  {
    id: '18',
    slug: 'lookbook',
    zh: '品牌画册',
    en: 'Lookbook',
    angle: 'brand',
    angleZh: '品牌视觉',
    angleEn: 'Brand-led',
    theme: 'lookbook',
    layout: 'overlay',
    visual: 'lookbook',
    eyebrow: s('一条视觉，多种语言', 'One visual, many languages'),
    lines: {
      zh: ['同一条视觉，', '走到十二种语言里。'],
      en: ['One visual language,', 'carried into twelve.']
    },
    accent: 1,
    sub: s('版式先立住，文字再落位。字体、字重、行距、字距，逐组配平。', 'Establish the layout first, then place the words. Fonts, weights, leading, and tracking, balanced group by group.'),
    note: s('排版拼贴为示意 · 非客户作品', 'Typography collage is schematic; not client work'),
    modules: ['lookbook', 'typography', 'workflow', 'features', 'matrix', 'fit'],
    bestFor: s('品牌方与创意团队，先被视觉说服、再愿意读边界。', 'Brand and creative teams who are persuaded by visuals first, then read the boundaries.'),
    watch: s('画册页不能只有氛围；必须有可操作的排版面板接住。', 'A lookbook cannot be atmosphere alone; a playable typography panel must catch it.')
  },
  {
    id: '19',
    slug: 'manifesto',
    zh: '产品宣言',
    en: 'Manifesto',
    angle: 'brand',
    angleZh: '品牌宣言',
    angleEn: 'Brand-led',
    theme: 'manifesto',
    layout: 'center',
    visual: 'manifesto',
    eyebrow: s('把重复交出去，把判断留下来', 'Hand off repetition. Keep judgment.'),
    lines: {
      zh: ['把繁复的工作交给我，', '把最终判断', '留在你手里。'],
      en: ['Hand me the repetition.', 'Keep the final call', 'in your hands.']
    },
    accent: 1,
    sub: s('图译工坊处理已经明确的文字替换；撑版、换行、字体和拿不准的地方，集中留给你。', 'TuYi Workshop handles the text replacements that are already decided. Overflow, line breaks, fonts, and anything uncertain are gathered for you.'),
    note: s('宣言页为品牌示意 · 功能以产品为准', 'Manifesto is brand schematic; capabilities follow the product'),
    modules: ['manifesto', 'workflow', 'features', 'typography', 'proof', 'data', 'apply-cta'],
    bestFor: s('品牌型创始人或设计负责人，先认同立场再了解功能。', 'Brand-minded founders or design leads who buy the stance before the feature list.'),
    watch: s('宣言越大，越需要具体步骤兜底；否则只是口号。', 'The bigger the manifesto, the more it needs concrete steps underneath.')
  },
  {
    id: '20',
    slug: 'minimal',
    zh: '极简留白',
    en: 'Minimal',
    angle: 'minimal',
    angleZh: '极简克制',
    angleEn: 'Minimal-led',
    theme: 'minimal',
    layout: 'center',
    visual: 'minimal',
    eyebrow: s('工具型官网 · 不喧哗', 'A quiet product site'),
    lines: {
      zh: ['少做一点重复。', '多看一点版面。'],
      en: ['Less repetition.', 'More looking', 'at the work.']
    },
    accent: 1,
    sub: s('一套安静的工具：批量写入、回读核对、例外集中。没有烟花，只有可复查的步骤。', 'A quiet tool: batch write-back, read-back checks, exceptions in one place. No fireworks — just steps you can check.'),
    note: s('极简排版示意 · 数据为模拟', 'Minimal layout schematic; data is simulated'),
    modules: ['minimal', 'workflow', 'features', 'typography', 'fit', 'faq'],
    bestFor: s('讨厌营销噪音、只想快速判断「这工具靠不靠谱」的人。', 'People who dislike marketing noise and want to judge reliability quickly.'),
    watch: s('留白不等于没信息；关键边界和实测标签仍要在第一屏之后出现。', 'Whitespace is not missing information; boundaries and schematic labels still appear after the first screen.')
  },
  {
    id: '21',
    slug: 'amazon-pain',
    zh: '亚马逊卖家痛点',
    en: 'Amazon seller pain',
    angle: 'amazon',
    angleZh: '分人群 · 亚马逊',
    angleEn: 'Segment · Amazon',
    theme: 'marketplace',
    layout: 'split',
    visual: 'marketplace',
    eyebrow: s('亚马逊卖家 · 主图 / A+ / 详情图 · 多站点', 'Amazon sellers · hero / A+ / detail · multi-marketplace'),
    lines: {
      zh: ['一个站点一版，', '同一套 A+ 图', '改到第几遍了？'],
      en: ['One version per marketplace.', 'How many passes', 'on the same A+ set?']
    },
    accent: 1,
    sub: s('主图、A+ 模块、详情图各自带着文字层。每开一个站点，找层、对译、写入、回读都要再来一遍。这一段可以收进批次；逐语种的版面判断仍然归你。', 'Hero images, A+ modules, and detail shots each carry their own text layers. Every new marketplace means finding layers, matching strings, writing, and reading back again. Batch that stretch; the per-language layout call stays yours.'),
    note: s('页面版式为示意 · 非亚马逊官方页面 · 商品图为 CSS 示意', 'Layout is schematic · not an official Amazon page · product art is CSS'),
    modules: ['marketplace', 'sites', 'pain', 'preflight', 'matrix', 'wrap', 'proof', 'fit', 'faq'],
    bestFor: s('在多站点铺货、手上已有各语种确认译文的电商设计与运营团队。', 'E-commerce design and ops teams selling across marketplaces with approved copy per language.'),
    watch: s('平台规则读者会自己去核；这一页只讲流程，不替平台下结论，也不使用平台商标与页面样式。', 'Readers will check platform rules themselves; this page covers process only, states no platform policy, and uses no platform marks.')
  },
  {
    id: '22',
    slug: 'outsource',
    zh: '外包分工页',
    en: 'Outsourcing split',
    angle: 'outsource',
    angleZh: '分人群 · 外包',
    angleEn: 'Segment · Outsourcing',
    theme: 'docket',
    layout: 'split',
    visual: 'docket',
    eyebrow: s('写给已经把图片本地化外包出去的团队', 'For teams already outsourcing image localization'),
    lines: {
      zh: ['外包买到了人手，', '重复的活儿', '还留在流程里。'],
      en: ['Outsourcing buys hands.', 'The repetitive work', 'stays in the process.']
    },
    accent: 1,
    sub: s('供应商接走了排期和人力。找层、对译、写入、回读这一段仍在流程里重复，每次返修还要再走一遍。把这层收进工具，判断、例外和最终版面留给你和乙方。', 'A vendor takes on scheduling and hands. Finding layers, matching strings, writing, and reading back still repeat inside the process, and every revision runs them again. Batch that layer; judgment, exceptions, and final layout stay with you and the vendor.'),
    note: s('分工单为示意 · 非真实报价与服务条款', 'The docket is schematic · no real pricing or service terms'),
    modules: ['docket', 'scope', 'pain', 'workflow', 'features', 'proof', 'fit', 'faq'],
    bestFor: s('已经在付外包费、想把「哪一段由谁做」写清楚的品牌与电商团队。', 'Brand and e-commerce teams already paying for outsourcing who want to write down who does which part.'),
    watch: s('对照页最容易滑成贬低外包；这一页写分工，不写替代，也不摆价格。', 'A compare page slides into disparaging vendors; this one writes a split of work, makes no replacement claim, and shows no prices.')
  }
];

export const themes = {
  cinema: {
    vars: {
      '--bg': '#0a0a0b', '--ink': '#f4f1ea', '--muted': '#a7a29a', '--line': '#2a2824',
      '--panel': '#131313', '--soft': '#1b1916', '--accent': '#e8b06a', '--accent-2': '#f5d9ae',
      '--accent-ink': '#1a1208', '--radius': '14px', '--radius-sm': '8px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1240px', '--display-weight': '500', '--display-tracking': '-.035em',
      '--section-pad': '104px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-cinema{min-height:92vh;display:flex;align-items:center;padding:120px 0 40px;background:
radial-gradient(1200px 600px at 50% -10%, #2a2115 0%, transparent 60%),
linear-gradient(180deg,#0a0a0b 0%,#0d0c0a 70%,#0a0a0b 100%)}
.hero-cinema:after{content:"";position:absolute;inset:0;pointer-events:none;background:
linear-gradient(90deg,transparent 49.8%,#ffffff08 50%,transparent 50.2%),
linear-gradient(0deg,transparent 49.8%,#ffffff08 50%,transparent 50.2%);background-size:120px 120px;mask-image:radial-gradient(circle at 50% 40%,#000 0%,transparent 70%)}
.hero-cinema h1{font-size:clamp(44px,7.2vw,104px);line-height:.98}
.hero-cinema .hero-sub{max-width:660px}
.hero-cinema .stage{margin-top:44px}
.film-meta{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;color:#8f8a80;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.section.dark{background:#0d0d0e}
`
  },
  bento: {
    vars: {
      '--bg': '#f5f7f3', '--ink': '#0f1712', '--muted': '#5f6b63', '--line': '#dbe3da',
      '--panel': '#ffffff', '--soft': '#eaf1e9', '--accent': '#2457ff', '--accent-2': '#9db6ff',
      '--accent-ink': '#ffffff', '--radius': '22px', '--radius-sm': '12px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1200px', '--display-weight': '750', '--display-tracking': '-.05em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Segoe UI",Inter,Arial,sans-serif' },
    css: `
.hero-bento{padding:116px 0 40px}
.hero-bento h1{font-size:clamp(42px,6.6vw,90px)}
.bento-hero{display:grid;grid-template-columns:1.3fr .7fr .7fr;grid-template-rows:180px 180px;gap:12px;margin-top:40px}
.bento-hero .b-card{border:1px solid var(--line);background:var(--panel);border-radius:18px;padding:18px;overflow:hidden;position:relative}
.bento-hero .b-card:nth-child(1){grid-row:span 2;background:linear-gradient(160deg,#fff,#eef3ff 70%)}
.bento-hero .b-card:nth-child(2){background:#101b14;color:#eaf3ec}
.bento-hero .b-card:nth-child(3){background:#e8f0ff}
.bento-hero .b-card:nth-child(4){grid-column:span 2;background:linear-gradient(90deg,#fff,#f3f7ff)}
.bento-hero h3{font-size:19px;margin:0 0 6px;letter-spacing:-.02em}
.bento-hero p{font-size:12px;color:inherit;opacity:.72;margin:0;line-height:1.7}
.bento-hero .mini-grid{position:absolute;inset:auto 14px 14px 14px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.bento-hero .mini-grid i{height:14px;border-radius:3px;background:#cfdcff}
.bento-hero .b-card:nth-child(2) .mini-grid i{background:#2b4a37}
.bento-hero .b-card:nth-child(3) .mini-grid i{background:#9db6ff}
.section.bento .bento{grid-template-columns:repeat(3,1fr)}
.section.bento .bento .card:nth-child(1),.section.bento .bento .card:nth-child(6){grid-column:span 2}
@media(max-width:820px){.bento-hero{grid-template-columns:1fr 1fr;grid-template-rows:auto}.bento-hero .b-card:nth-child(1),.bento-hero .b-card:nth-child(4){grid-column:span 2;grid-row:auto}}
`
  },
  editorial: {
    vars: {
      '--bg': '#f7f2e7', '--ink': '#1b1a17', '--muted': '#6b655b', '--line': '#d8cfbd',
      '--panel': '#fbf7ee', '--soft': '#efe7d7', '--accent': '#b23a2b', '--accent-2': '#d9a58f',
      '--accent-ink': '#fff8ef', '--radius': '3px', '--radius-sm': '2px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1180px', '--display-weight': '500', '--display-tracking': '-.04em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-editorial{padding:110px 0 30px;border-bottom:1px solid var(--line)}
.hero-editorial .hero-grid{display:grid;grid-template-columns:1.15fr .55fr;gap:60px;align-items:end}
.hero-editorial h1{font-size:clamp(46px,7vw,104px);line-height:.98}
.hero-editorial .marginal{border-left:1px solid var(--line);padding-left:24px;color:var(--muted);font-size:13px;line-height:1.9}
.hero-editorial .marginal b{display:block;color:var(--ink);font-family:var(--display);font-size:20px;font-weight:500;margin-bottom:8px}
.hero-editorial .drop{float:left;font-family:var(--display);font-size:76px;line-height:.8;padding:6px 10px 0 0;color:var(--accent)}
.rule{border:0;border-top:1px solid var(--line);margin:0}
.pull{font-family:var(--display);font-size:clamp(30px,4.2vw,58px);line-height:1.1;letter-spacing:-.03em;margin:0;max-width:900px}
.pull em{color:var(--accent);font-style:normal}
.section.editorial .lead{font-size:16px;line-height:1.95}
.pain-cols{display:grid;grid-template-columns:1fr 1fr;gap:44px}
.pain-cols h3{font-family:var(--display);font-weight:500;font-size:28px;margin:0 0 16px}
.pain-step{display:flex;gap:14px;padding:12px 0;border-bottom:1px dashed var(--line);font-size:14px}
.pain-step b{font-family:var(--mono);font-size:11px;color:var(--accent);min-width:28px}
@media(max-width:860px){.hero-editorial .hero-grid,.pain-cols{grid-template-columns:1fr;gap:28px}}
`
  },
  promo: {
    vars: {
      '--bg': '#d9ff3f', '--ink': '#0b0b0b', '--muted': '#2f3517', '--line': '#0b0b0b',
      '--panel': '#f1ff9e', '--soft': '#c7ef22', '--accent': '#0b0b0b', '--accent-2': '#ff4d2e',
      '--accent-ink': '#d9ff3f', '--radius': '0px', '--radius-sm': '0px',
      '--font': 'Arial,"Microsoft YaHei",sans-serif',
      '--display': '"Arial Black",Arial,"Microsoft YaHei",sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1280px', '--display-weight': '900', '--display-tracking': '-.06em',
      '--section-pad': '86px'
    },
    en: { '--display': '"Arial Black",Arial,sans-serif' },
    css: `
.hero-promo{padding:112px 0 50px;border-bottom:6px solid var(--ink)}
.hero-promo h1{font-size:clamp(54px,10vw,150px);line-height:.84;text-transform:uppercase}
.hero-promo .eyebrow{border:2px solid var(--ink);background:var(--panel);border-radius:0;font-size:11px;padding:8px 12px}
.hero-promo .btn{border-radius:0;border-width:2px}
.hero-promo .hero-sub{max-width:720px;font-weight:700;font-size:clamp(16px,1.8vw,22px);line-height:1.4}
.marquee{border-top:2px solid var(--ink);border-bottom:2px solid var(--ink);background:var(--ink);color:var(--bg);overflow:hidden;padding:12px 0;white-space:nowrap;font-weight:900;letter-spacing:.02em}
.marquee span{display:inline-block;padding-right:38px;font-size:15px}
.promo-box{border:3px solid var(--ink);background:var(--panel);padding:26px;box-shadow:10px 10px 0 var(--ink)}
.promo-box h3,.promo-box .pb-h{font-size:26px;margin:0 0 8px}
.promo-stamp{display:inline-block;border:2px solid var(--ink);padding:7px 10px;font-weight:900;font-size:11px;letter-spacing:.12em;transform:rotate(-2deg);background:var(--bg)}
.section.promo .card{border:2px solid var(--ink);box-shadow:6px 6px 0 var(--ink);border-radius:0}
`
  },
  invite: {
    vars: {
      '--bg': '#0d241d', '--ink': '#f3ead9', '--muted': '#b9ad95', '--line': '#2e4a3e',
      '--panel': '#123027', '--soft': '#193a2f', '--accent': '#d7bd86', '--accent-2': '#f0dfbb',
      '--accent-ink': '#14251d', '--radius': '4px', '--radius-sm': '3px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1140px', '--display-weight': '500', '--display-tracking': '-.035em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-invite{padding:120px 0 50px;background:radial-gradient(900px 500px at 80% 0%,#1d4737 0%,transparent 60%)}
.hero-invite h1{font-size:clamp(42px,6vw,86px)}
.ticket{border:1px solid #4b6a5c;background:linear-gradient(135deg,#173c30,#102a22);padding:26px;position:relative;box-shadow:0 30px 80px #0006}
.ticket:before,.ticket:after{content:"";position:absolute;width:22px;height:22px;border-radius:50%;background:var(--bg);top:50%;transform:translateY(-50%)}
.ticket:before{left:-11px}.ticket:after{right:-11px}
.ticket .perf{border-top:1px dashed #557668;margin:18px -26px;position:relative}
.ticket .perf:before,.ticket .perf:after{content:"";position:absolute;top:-6px;width:12px;height:12px;border-radius:50%;background:var(--bg)}
.ticket .perf:before{left:-6px}.ticket .perf:after{right:-6px}
.ticket-row{display:flex;justify-content:space-between;gap:14px;font-size:12px;color:#c9bda6;padding:7px 0;border-bottom:1px dotted #3d5a4d}
.ticket-row b{color:#f3ead9;font-weight:600}
.ticket-code{font-family:var(--mono);letter-spacing:.22em;font-size:12px;color:var(--accent)}
.section.invite .card{background:#123027;border-color:#2e4a3e}
`
  },
  apple: {
    vars: {
      '--bg': '#000000', '--ink': '#f5f5f7', '--muted': '#a1a1a6', '--line': '#2a2a2c',
      '--panel': '#101012', '--soft': '#17171a', '--accent': '#2997ff', '--accent-2': '#7cc4ff',
      '--accent-ink': '#06121f', '--radius': '18px', '--radius-sm': '10px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1180px', '--display-weight': '700', '--display-tracking': '-.055em',
      '--section-pad': '120px'
    },
    en: { '--display': '"Segoe UI",Inter,Arial,sans-serif' },
    css: `
.hero-apple{padding:130px 0 30px;text-align:center}
.hero-apple h1{font-size:clamp(46px,7.4vw,104px);line-height:.96}
.hero-apple .hero-sub{font-size:clamp(17px,1.7vw,22px);line-height:1.5;max-width:680px}
.hero-apple .app{margin-top:52px;text-align:left;box-shadow:0 40px 120px #000c}
.product-sticky{position:relative}
.product-sticky .sticky-copy{position:sticky;top:90px}
.gradient-text{background:linear-gradient(90deg,#2997ff,#7cc4ff,#f5f5f7);-webkit-background-clip:text;background-clip:text;color:transparent}
.section.apple{padding-top:80px;padding-bottom:80px}
.section.apple h2{font-size:clamp(32px,4.6vw,64px)}
`
  },
  swiss: {
    vars: {
      '--bg': '#ffffff', '--ink': '#000000', '--muted': '#555555', '--line': '#d4d4d4',
      '--panel': '#ffffff', '--soft': '#f2f2f2', '--accent': '#c71f17', '--accent-2': '#ff6a60',
      '--accent-ink': '#ffffff', '--radius': '0px', '--radius-sm': '0px',
      '--font': 'Arial,Helvetica,"Microsoft YaHei",sans-serif',
      '--display': 'Arial,Helvetica,"Microsoft YaHei",sans-serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1260px', '--display-weight': '700', '--display-tracking': '-.05em',
      '--section-pad': '84px'
    },
    en: { '--display': 'Helvetica,Arial,sans-serif' },
    css: `
.hero-swiss{padding:110px 0 0;border-bottom:1px solid var(--ink)}
.hero-swiss .hero-grid{display:grid;grid-template-columns:repeat(12,1fr);border-top:1px solid var(--ink)}
.hero-swiss .hero-main{grid-column:1/9;padding:36px 30px 36px 0;border-right:1px solid var(--ink)}
.hero-swiss .hero-side{grid-column:9/13;padding:36px 0 36px 30px;font-size:12px;line-height:1.8}
.hero-swiss h1{font-size:clamp(44px,7vw,100px);line-height:.92}
.swiss-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.swiss-cell{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:20px;min-height:150px}
.swiss-cell .num{font-family:var(--mono);font-size:11px;color:var(--accent);display:block;margin-bottom:22px}
.swiss-cell strong{display:block;font-size:clamp(30px,4vw,54px);letter-spacing:-.05em;line-height:1}
.swiss-cell span{font-size:12px;color:var(--muted)}
.section.swiss .card{border:1px solid var(--ink);border-radius:0}
@media(max-width:820px){.hero-swiss .hero-main,.hero-swiss .hero-side{grid-column:1/13;border-right:0;padding:24px 0}.swiss-grid{grid-template-columns:1fr 1fr}}
`
  },
  terminal: {
    vars: {
      '--bg': '#080d0a', '--ink': '#d8ffe4', '--muted': '#78a98a', '--line': '#1d3a2a',
      '--panel': '#0b140f', '--soft': '#102019', '--accent': '#6ef59a', '--accent-2': '#b6ffcf',
      '--accent-ink': '#04140a', '--radius': '4px', '--radius-sm': '2px',
      '--font': 'Consolas,"Courier New","Microsoft YaHei",monospace',
      '--display': 'Consolas,"Courier New","Microsoft YaHei",monospace',
      '--mono': 'Consolas,"Courier New","Microsoft YaHei",monospace',
      '--max': '1160px', '--display-weight': '700', '--display-tracking': '-.03em',
      '--section-pad': '90px'
    },
    en: { '--display': 'Consolas,"Courier New",monospace' },
    css: `
.hero-terminal{padding:110px 0 40px}
.hero-terminal h1{font-size:clamp(40px,6vw,84px);line-height:1}
.term{border:1px solid #244a33;background:#07100b;box-shadow:0 30px 80px #000a;position:relative;overflow:hidden}
.term:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(180deg,transparent 0 3px,#00000040 3px 4px);opacity:.35}
.term-bar{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #1d3a2a;background:#0c1811;position:relative;z-index:1}
.term-bar i{width:8px;height:8px;border-radius:50%;background:#2d5a3e}
.term-bar span{font-size:11px;color:#78a98a;margin-left:8px}
.term-body{padding:16px;font-size:12px;line-height:1.9;color:#a9d8b8;position:relative;z-index:1;min-height:300px}
.term-body .ok{color:#6ef59a}.term-body .warn{color:#ffd36e}.term-body .err{color:#ff7b6b}.term-body .dim{color:#4f7a5f}
.term-line{white-space:pre-wrap}
.term-cursor{display:inline-block;width:7px;height:13px;background:#6ef59a;vertical-align:-2px;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.section.terminal .card{background:#0b140f;border-color:#1d3a2a}
`
  },
  timeline: {
    vars: {
      '--bg': '#f4f1ea', '--ink': '#172622', '--muted': '#5a6761', '--line': '#d5d0c4',
      '--panel': '#fbf9f4', '--soft': '#e9e4d8', '--accent': '#1e5a4c', '--accent-2': '#c97b4a',
      '--accent-ink': '#ffffff', '--radius': '10px', '--radius-sm': '6px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Trebuchet MS","Microsoft YaHei",sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1200px', '--display-weight': '700', '--display-tracking': '-.04em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Trebuchet MS",Verdana,sans-serif' },
    css: `
.hero-timeline{padding:112px 0 30px}
.hero-timeline h1{font-size:clamp(42px,6.4vw,90px)}
.timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:2px solid var(--ink);margin-top:36px}
.tl-step{padding:20px 20px 20px 0;border-right:1px solid var(--line);position:relative}
.tl-step:last-child{border-right:0}
.tl-step:before{content:"";position:absolute;top:-7px;left:0;width:12px;height:12px;border-radius:50%;background:var(--accent);border:3px solid var(--bg)}
.tl-step .t{font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:.1em}
.tl-step h3{font-size:18px;margin:10px 0 8px}
.tl-step p{font-size:12px;color:var(--muted);line-height:1.75;margin:0}
.section.timeline .card{background:var(--panel)}
@media(max-width:820px){.timeline{grid-template-columns:1fr;border-top:0;border-left:2px solid var(--ink);margin-left:6px}.tl-step{border-right:0;border-bottom:1px solid var(--line);padding:16px 0 16px 22px}.tl-step:before{top:22px;left:-7px}}
`
  },
  compare: {
    vars: {
      '--bg': '#0e0f10', '--ink': '#f2f2f0', '--muted': '#a0a3a1', '--line': '#2b2d2e',
      '--panel': '#17191a', '--soft': '#1e2122', '--accent': '#38b27a', '--accent-2': '#ff5a3c',
      '--accent-ink': '#04140c', '--radius': '8px', '--radius-sm': '4px',
      '--font': 'Arial,"Microsoft YaHei",sans-serif',
      '--display': '"Arial Black",Arial,"Microsoft YaHei",sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1320px', '--display-weight': '900', '--display-tracking': '-.05em',
      '--section-pad': '96px'
    },
    en: { '--display': '"Arial Black",Arial,sans-serif' },
    css: `
.hero-compare{padding:104px 0 20px}
.hero-compare h1{font-size:clamp(40px,6.4vw,94px);line-height:.94}
.compare-duo{display:grid;grid-template-columns:1fr 1px 1fr;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#111;margin-top:8px}
.cd-pane{padding:26px 26px 20px;min-width:0}
.cd-before{background:linear-gradient(160deg,#241413,#17100f)}
.cd-after{background:linear-gradient(160deg,#0d2720,#0b1512)}
.cd-mid{background:var(--line);position:relative}
.cd-mid span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:var(--ink);color:#06120c;display:grid;place-items:center;font-size:11px;font-weight:800;letter-spacing:.06em}
.cd-foot{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;padding:10px 26px;border-top:1px solid var(--line);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:#0b0c0c}
@media(max-width:860px){.compare-duo{grid-template-columns:1fr}.cd-mid{height:1px}.cd-mid span{width:34px;height:34px;font-size:9px}.cd-foot{flex-direction:column;padding:10px 18px}}
`
  },
  craft: {
    vars: {
      '--bg': '#f3ece2', '--ink': '#2a211b', '--muted': '#6c5e53', '--line': '#d6c9b8',
      '--panel': '#faf5ec', '--soft': '#e9dece', '--accent': '#a34723', '--accent-2': '#d99a6c',
      '--accent-ink': '#fff8ef', '--radius': '6px', '--radius-sm': '3px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1180px', '--display-weight': '500', '--display-tracking': '-.035em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-craft{padding:110px 0 36px;background:
radial-gradient(700px 400px at 85% 10%,#e7d3bb 0%,transparent 60%),
linear-gradient(180deg,#f3ece2,#efe6d9)}
.hero-craft h1{font-size:clamp(44px,6.6vw,92px)}
.paper{background:linear-gradient(180deg,#fbf7ef,#f4ecdf);border:1px solid var(--line);box-shadow:0 18px 50px #6b53351a;position:relative}
.paper:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;background-image:radial-gradient(#8a6f5210 1px,transparent 1px);background-size:4px 4px}
.lab-preview{background:#fffdf8;border:1px solid var(--line);padding:24px;min-height:230px}
.lab-preview h3,.lab-preview .lp-h{font-size:clamp(22px,2.6vw,34px);line-height:1.15;margin:0 0 12px}
.lab-preview p{font-size:15px;line-height:1.85;margin:0 0 10px}
.lab-preview .cap{font-size:11px;color:var(--muted);letter-spacing:.08em}
.section.craft .card{background:var(--panel);border-color:var(--line)}
`
  },
  batch: {
    vars: {
      '--bg': '#0d1117', '--ink': '#e6f1f7', '--muted': '#8aa0ad', '--line': '#22303a',
      '--panel': '#121a22', '--soft': '#182430', '--accent': '#4dd6ff', '--accent-2': '#8be6ff',
      '--accent-ink': '#04141b', '--radius': '8px', '--radius-sm': '4px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1320px', '--display-weight': '750', '--display-tracking': '-.045em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Segoe UI",Inter,Arial,sans-serif' },
    css: `
.hero-batch{padding:112px 0 36px;background:radial-gradient(900px 500px at 80% 0%,#123041 0%,transparent 60%)}
.hero-batch h1{font-size:clamp(40px,6vw,84px)}
.matrix-wrap{border:1px solid var(--line);background:#0a0f14;border-radius:10px;overflow:hidden}
.matrix-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line);background:#0f161d;flex-wrap:wrap}
.matrix-scroll{overflow:auto;max-height:520px}
.matrix-grid{display:grid;grid-template-columns:170px repeat(12,minmax(58px,1fr));min-width:1000px;font-size:10px}
.matrix-grid .mh{position:sticky;top:0;z-index:2;background:#0f161d;border-bottom:1px solid var(--line);padding:9px 6px;color:#8aa0ad;font-weight:700;text-align:center;white-space:nowrap}
.matrix-grid .mh:first-child{left:0;z-index:3;text-align:left;padding-left:12px}
.matrix-grid .mf{position:sticky;left:0;z-index:1;background:#0d141a;border-right:1px solid var(--line);border-bottom:1px solid #182430;padding:8px 10px;font-family:var(--mono);font-size:9px;color:#9fb3c0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.matrix-grid .cell{border:0;border-right:1px solid #16232d;border-bottom:1px solid #16232d;height:32px;background:transparent;cursor:pointer;position:relative}
.matrix-grid .cell:after{content:"";position:absolute;inset:8px;border-radius:3px;background:#24323d}
.matrix-grid .cell[data-status=done]:after{background:#2e8f68}
.matrix-grid .cell[data-status=review]:after{background:#c99a3f}
.matrix-grid .cell[data-status=blocked]:after{background:#7a6a9a}
.matrix-grid .cell[data-status=fail]:after{background:#b04b4b}
.matrix-grid .cell[data-status=pending]:after{background:#2a3843}
.matrix-grid .cell:hover:after{outline:2px solid #4dd6ff}
.matrix-grid .cell.sel:after{outline:2px solid #fff}
.section.batch .card{background:#121a22;border-color:#22303a}
`
  },
  ecommerce: {
    vars: {
      '--bg': '#fff4ee', '--ink': '#2b1a14', '--muted': '#7a5f54', '--line': '#ecd7cb',
      '--panel': '#ffffff', '--soft': '#ffe6d9', '--accent': '#c1361b', '--accent-2': '#ffb39e',
      '--accent-ink': '#ffffff', '--radius': '18px', '--radius-sm': '10px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Trebuchet MS","Microsoft YaHei",sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1200px', '--display-weight': '700', '--display-tracking': '-.04em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Trebuchet MS",Verdana,sans-serif' },
    css: `
.hero-ecommerce{padding:110px 0 36px;background:
radial-gradient(700px 400px at 90% 0%,#ffd9c8 0%,transparent 60%),
linear-gradient(180deg,#fff4ee,#fff9f6)}
.hero-ecommerce h1{font-size:clamp(40px,6vw,86px)}
.shop-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.shop-card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.shop-art{height:120px;position:relative;overflow:hidden;background:#ffe2d4}
.shop-art i{position:absolute;display:block;border-radius:40% 60% 55% 45%/50% 45% 55% 50%;background:#ff8a6b}
.shop-art i:nth-child(1){width:90px;height:90px;left:20px;top:20px;background:#ff6b4a}
.shop-art i:nth-child(2){width:60px;height:60px;right:26px;top:34px;background:#ffb39e}
.shop-art i:nth-child(3){width:44px;height:44px;left:78px;bottom:14px;background:#ffe0d2}
.shop-body{padding:12px 14px}
.shop-body .shop-name{font-size:14px;margin:0 0 4px}
.shop-body p{font-size:11px;color:var(--muted);margin:0;line-height:1.6}
.lang-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0}
.lang-tabs button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 9px;font-size:10px;cursor:pointer}
.lang-tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.section.ecommerce .card{background:#fff}
`
  },
  agency: {
    vars: {
      '--bg': '#0c1824', '--ink': '#f2eee5', '--muted': '#a7a092', '--line': '#24384a',
      '--panel': '#112131', '--soft': '#172b3d', '--accent': '#c8a96b', '--accent-2': '#e5d3ab',
      '--accent-ink': '#1b160d', '--radius': '6px', '--radius-sm': '3px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1180px', '--display-weight': '500', '--display-tracking': '-.035em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-agency{padding:116px 0 40px;background:
linear-gradient(90deg,#0c1824 0 66%,#0a1420 66% 100%)}
.hero-agency h1{font-size:clamp(42px,6vw,88px)}
.role-list{border-top:1px solid #2f465a}
.role{padding:18px 0;border-bottom:1px solid #2f465a;display:grid;grid-template-columns:90px 1fr;gap:16px}
.role b{font-size:11px;letter-spacing:.12em;color:var(--accent);text-transform:uppercase}
.role h4{margin:0 0 4px;font-size:16px}
.role p{margin:0;font-size:12px;color:var(--muted);line-height:1.7}
.section.agency .card{background:#112131;border-color:#24384a}
`
  },
  evidence: {
    vars: {
      '--bg': '#e8e3d8', '--ink': '#1f2320', '--muted': '#545b54', '--line': '#c9c1b2',
      '--panel': '#f4f0e6', '--soft': '#ddd6c7', '--accent': '#9b2c2c', '--accent-2': '#c46a5a',
      '--accent-ink': '#fff8ef', '--radius': '2px', '--radius-sm': '1px',
      '--font': '"Courier New","Microsoft YaHei",monospace',
      '--display': '"Courier New","Microsoft YaHei",monospace',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1160px', '--display-weight': '700', '--display-tracking': '-.02em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Courier New",Courier,monospace' },
    css: `
.hero-evidence{padding:104px 0 36px;background:
linear-gradient(180deg,#e8e3d8,#efeade)}
.hero-evidence h1{font-size:clamp(38px,5.6vw,80px);line-height:1.02;letter-spacing:-.04em}
.dossier{background:#f4f0e6;border:1px solid #bdb3a2;box-shadow:0 20px 50px #3a2f1f1f;padding:20px;position:relative}
.dossier:before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:repeating-linear-gradient(90deg,#9b2c2c 0 18px,transparent 18px 26px)}
.stamp{display:inline-block;border:2px solid var(--accent);color:var(--accent);padding:6px 10px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;transform:rotate(-4deg);font-weight:700}
.folder-tab{display:inline-block;background:#d8cfbd;border:1px solid #bdb3a2;border-bottom:0;padding:6px 14px;font-size:10px;letter-spacing:.12em}
.report-table{width:100%;border-collapse:collapse;font-size:11px}
.report-table th{text-align:left;border-bottom:2px solid #1f2320;padding:8px 6px;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
.report-table td{border-bottom:1px solid #c9c1b2;padding:9px 6px;vertical-align:top}
.report-table .st{font-size:9px;padding:2px 6px;border:1px solid currentColor;display:inline-block}
.st.done{color:#2f6b4f}.st.review{color:#8a6418}.st.blocked{color:#5b4a78}.st.fail{color:#9b2c2c}
.section.evidence .card{background:#f4f0e6;border-color:#c9c1b2;border-radius:0}
`
  },
  fit: {
    vars: {
      '--bg': '#eef4f0', '--ink': '#10352a', '--muted': '#586d64', '--line': '#cfded7',
      '--panel': '#ffffff', '--soft': '#e2eee8', '--accent': '#2b7455', '--accent-2': '#7bb79b',
      '--accent-ink': '#ffffff', '--radius': '16px', '--radius-sm': '9px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1160px', '--display-weight': '750', '--display-tracking': '-.045em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Segoe UI",Inter,Arial,sans-serif' },
    css: `
.hero-fit{padding:110px 0 36px;background:
radial-gradient(600px 400px at 90% 0%,#d9ebe2 0%,transparent 60%),
linear-gradient(180deg,#eef4f0,#f6faf7)}
.hero-fit h1{font-size:clamp(42px,6.2vw,88px)}
.quiz{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 16px 40px #2f7d5b14}
.quiz-q{padding:12px 0;border-bottom:1px solid #e6efea}
.quiz-q:last-of-type{border-bottom:0}
.quiz-q p{font-size:13px;font-weight:700;margin:0 0 8px}
.quiz-opts{display:flex;gap:6px;flex-wrap:wrap}
.quiz-opts label{border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:11px;cursor:pointer;background:#f7fbf8}
.quiz-opts input{position:absolute;opacity:0;pointer-events:none}
.quiz-opts label:has(input:checked){background:var(--ink);color:#fff;border-color:var(--ink)}
.quiz-result{background:var(--soft);border-radius:12px;padding:14px;margin-top:14px;font-size:12px;line-height:1.7}
.quiz-result b{display:block;font-size:16px;margin-bottom:4px}
.section.fit .card{background:#fff}
`
  },
  roi: {
    vars: {
      '--bg': '#f5f7fb', '--ink': '#111827', '--muted': '#5f6b7c', '--line': '#dde3ec',
      '--panel': '#ffffff', '--soft': '#e9edf7', '--accent': '#4f46e5', '--accent-2': '#a5b4fc',
      '--accent-ink': '#ffffff', '--radius': '14px', '--radius-sm': '8px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1180px', '--display-weight': '750', '--display-tracking': '-.045em',
      '--section-pad': '92px'
    },
    en: { '--display': '"Segoe UI",Inter,Arial,sans-serif' },
    css: `
.hero-roi{padding:110px 0 36px}
.hero-roi h1{font-size:clamp(42px,6.2vw,88px)}
.roi-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 18px 50px #11182712}
.roi-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.roi-inputs label{font-size:11px;color:var(--muted);display:grid;gap:4px}
.roi-inputs input{width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;background:#fbfcfe}
.roi-out{margin-top:14px;padding:14px;border-radius:10px;background:var(--soft)}
.roi-big{font-size:clamp(28px,4vw,46px);letter-spacing:-.04em;font-weight:800;line-height:1.1}
.roi-big.neg{color:#b42318}
.roi-bars{display:grid;gap:8px;margin-top:12px}
.roi-bar{height:14px;border-radius:7px;background:#e3e7ef;position:relative;overflow:hidden}
.roi-bar i{position:absolute;inset:0 auto 0 0;border-radius:7px;background:var(--accent);transition:width .3s}
.roi-bar.alt i{background:#94a3b8}
.section.roi .card{background:#fff}
`
  },
  lookbook: {
    vars: {
      '--bg': '#efe6da', '--ink': '#1d1a18', '--muted': '#695b51', '--line': '#d5c6b5',
      '--panel': '#faf4ea', '--soft': '#e6d8c7', '--accent': '#7d523f', '--accent-2': '#c98f6b',
      '--accent-ink': '#fff8ef', '--radius': '4px', '--radius-sm': '2px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1220px', '--display-weight': '500', '--display-tracking': '-.04em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-lookbook{padding:100px 0 30px;background:
radial-gradient(800px 500px at 20% 0%,#f7ecdd 0%,transparent 60%),
linear-gradient(180deg,#efe6da,#e9ddcd)}
.hero-lookbook h1{font-size:clamp(46px,7vw,106px);line-height:.94}
.collage{display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:120px 120px;gap:10px;margin-top:30px}
.tile{border:1px solid var(--line);overflow:hidden;position:relative;display:flex;align-items:flex-end;padding:12px;font-family:var(--display);font-size:20px;background:#faf4ea}
.tile:nth-child(1){grid-column:span 2;grid-row:span 2;font-size:40px;background:linear-gradient(145deg,#e7cfb8,#f6eadb)}
.tile:nth-child(2){grid-column:span 2;background:#1d1a18;color:#efe6da}
.tile:nth-child(3){grid-column:span 2;background:#d9a88a}
.tile:nth-child(4){grid-column:span 3;background:#c9d2c0}
.tile:nth-child(5){grid-column:span 3;background:linear-gradient(90deg,#8a5a44,#c98f6b);color:#fff}
.tile i{position:absolute;border-radius:50%;background:#ffffff30;display:block}
.section.lookbook .card{background:#faf4ea;border-color:#d5c6b5}
`
  },
  manifesto: {
    vars: {
      '--bg': '#050505', '--ink': '#ffffff', '--muted': '#9a9a9a', '--line': '#262626',
      '--panel': '#101010', '--soft': '#161616', '--accent': '#ff4d2e', '--accent-2': '#ff8a73',
      '--accent-ink': '#0a0a0a', '--radius': '0px', '--radius-sm': '0px',
      '--font': 'Arial,"Microsoft YaHei",sans-serif',
      '--display': '"Arial Black",Arial,"Microsoft YaHei",sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1300px', '--display-weight': '900', '--display-tracking': '-.06em',
      '--section-pad': '110px'
    },
    en: { '--display': '"Arial Black",Arial,sans-serif' },
    css: `
.hero-manifesto{min-height:94vh;display:flex;align-items:center;padding:120px 0 40px}
.hero-manifesto h1{font-size:clamp(52px,10.5vw,168px);line-height:.84;text-transform:none}
.hero-manifesto .hero-sub{max-width:680px;font-size:15px;line-height:1.9}
.manifesto-list{counter-reset:m;border-top:1px solid var(--line)}
.manifesto-item{counter-increment:m;display:grid;grid-template-columns:70px 1fr;gap:20px;padding:24px 0;border-bottom:1px solid var(--line)}
.manifesto-item > *{grid-column:2;min-width:0}
.manifesto-item:before{content:"0" counter(m);font-family:var(--mono);font-size:11px;color:var(--accent)}
.manifesto-item h3,.manifesto-item .m-h{margin:0 0 6px;font-size:clamp(20px,2.4vw,30px)}
.manifesto-item p{margin:0;color:var(--muted);font-size:13px;line-height:1.8;max-width:700px}
.big-marquee{overflow:hidden;white-space:nowrap;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;font-family:var(--display);font-size:clamp(32px,5vw,72px);color:#1a1a1a;-webkit-text-stroke:1px #4a4a4a}
.big-marquee span{display:inline-block;padding-right:40px}
`
  },
  minimal: {
    vars: {
      '--bg': '#faf9f6', '--ink': '#181818', '--muted': '#6d6d6d', '--line': '#e2e0da',
      '--panel': '#ffffff', '--soft': '#f2f1ec', '--accent': '#3d6b52', '--accent-2': '#9dbbaa',
      '--accent-ink': '#ffffff', '--radius': '2px', '--radius-sm': '1px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1040px', '--display-weight': '400', '--display-tracking': '-.035em',
      '--section-pad': '120px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-minimal{min-height:88vh;display:flex;align-items:center;padding:120px 0 40px;text-align:center}
.hero-minimal h1{font-size:clamp(44px,7vw,100px);line-height:1.02}
.hero-minimal .hero-sub{max-width:600px;margin-left:auto;margin-right:auto}
.hero-minimal .hero-ctas{justify-content:center}
.minimal-rule{width:1px;height:70px;background:var(--line);margin:34px auto 0}
.section.minimal{padding-top:90px;padding-bottom:90px}
.section.minimal h2{font-size:clamp(28px,3.6vw,48px)}
.section.minimal .card{background:transparent;border:0;border-top:1px solid var(--line);border-radius:0;padding:22px 0}
`
  },
  marketplace: {
    vars: {
      '--bg': '#f7f7f5', '--ink': '#16202e', '--muted': '#5d6a78', '--line': '#dde2e7',
      '--panel': '#ffffff', '--soft': '#eef1f4', '--accent': '#a34d08', '--accent-2': '#f2c08a',
      '--accent-ink': '#ffffff', '--radius': '10px', '--radius-sm': '5px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': '"Segoe UI Semibold","Microsoft YaHei",Arial,sans-serif',
      '--mono': 'Consolas,"Microsoft YaHei",monospace',
      '--max': '1160px', '--display-weight': '700', '--display-tracking': '-.025em',
      '--section-pad': '86px'
    },
    en: { '--display': '"Segoe UI",Arial,sans-serif' },
    css: `
.hero-marketplace{padding:104px 0 30px;background:linear-gradient(180deg,#eaeef2,#f7f7f5)}
.hero-marketplace h1{font-size:clamp(38px,5.6vw,78px)}
.mk{border:1px solid var(--line);border-radius:12px;background:#fff;overflow:hidden;box-shadow:0 22px 46px -36px #16202e}
.mk-top{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--line);background:#fbfbfa;font-family:var(--mono);font-size:9px;color:var(--muted);letter-spacing:.08em}
.mk-sites{display:flex;gap:4px;flex-wrap:wrap}
.mk-sites span{border:1px solid var(--line);border-radius:4px;padding:2px 5px}
.mk-sites span.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.mk-main{display:grid;grid-template-columns:148px 1fr;gap:14px;padding:14px}
.mk-shot{position:relative;aspect-ratio:1;border-radius:8px;background:linear-gradient(145deg,#dfe6ec,#c6d1db);overflow:hidden}
.mk-shot i{position:absolute;display:block;border-radius:50%;background:#ffffff8c}
.mk-shot i:nth-child(1){width:72px;height:72px;left:22px;top:28px}
.mk-shot i:nth-child(2){width:38px;height:38px;right:20px;top:50px;background:#ffffff5c}
.mk-shot i:nth-child(3){width:92px;height:24px;left:18px;bottom:20px;border-radius:6px;background:#ffffffd0}
.mk-shot b{position:absolute;left:7px;top:7px;font-family:var(--mono);font-size:8px;font-weight:400;color:#16202e99}
.mk-t{margin:0 0 6px;font-size:13px;font-weight:700;line-height:1.45}
.mk-info ul{margin:0;padding-left:15px;font-size:10px;line-height:1.8;color:var(--muted)}
.mk-rows{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;font-family:var(--mono);font-size:9px;color:var(--muted)}
.mk-aplus{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:0 12px 10px}
.mk-aplus span{border:1px dashed var(--line);border-radius:6px;padding:12px 4px;text-align:center;font-family:var(--mono);font-size:8px;color:var(--muted);background:#fbfbfa}
.mk-foot{margin:0;padding:0 12px 11px;font-size:8px;color:var(--muted)}
.section.marketplace .card{background:#fff;border-color:var(--line)}
.site-tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}
.site-tabs button{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 11px;font-size:11px;color:var(--muted);cursor:pointer;min-height:26px}
.site-tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.site-panels{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:16px 18px}
.site-panel[hidden]{display:none}
.site-panel dl{margin:0;display:grid;grid-template-columns:92px 1fr;gap:9px 14px;font-size:13px}
.site-panel dt{font-family:var(--mono);font-size:10px;color:var(--accent);letter-spacing:.08em;padding-top:3px}
.site-panel dd{margin:0;color:var(--muted);line-height:1.8}
.preflight{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.preflight li{display:grid;grid-template-columns:38px 1fr auto;gap:14px;align-items:start;padding:15px 0;border-bottom:1px solid var(--line)}
.preflight li>b{font-family:var(--mono);font-size:10px;font-weight:400;color:var(--accent);padding-top:4px}
.preflight .pf-t{font-size:14px;line-height:1.65}
.preflight .pf-t .muted{font-size:12px;line-height:1.75}
.preflight .pf-who{font-family:var(--mono);font-size:9px;border:1px solid var(--line);border-radius:999px;padding:4px 9px;color:var(--muted);white-space:nowrap}
@media(max-width:600px){
.mk-main{grid-template-columns:1fr}
.site-panel dl{grid-template-columns:1fr;gap:3px 0}
.site-panel dd{margin-bottom:9px}
.preflight li{grid-template-columns:30px 1fr}
.preflight .pf-who{grid-column:2;justify-self:start}
}
`
  },
  docket: {
    vars: {
      '--bg': '#f7f5f0', '--ink': '#1c1a17', '--muted': '#6b655c', '--line': '#d6cfc2',
      '--panel': '#fffdf8', '--soft': '#efeae0', '--accent': '#a83a2c', '--accent-2': '#c9a08f',
      '--accent-ink': '#ffffff', '--radius': '3px', '--radius-sm': '2px',
      '--font': '"Segoe UI","Microsoft YaHei",Arial,sans-serif',
      '--display': 'Georgia,"Songti SC",SimSun,serif',
      '--mono': '"Courier New","Microsoft YaHei",monospace',
      '--max': '1120px', '--display-weight': '500', '--display-tracking': '-.03em',
      '--section-pad': '96px'
    },
    en: { '--display': 'Georgia,"Times New Roman",serif' },
    css: `
.hero-docket{padding:112px 0 34px;background:linear-gradient(180deg,#f1ece3,#f7f5f0)}
.hero-docket h1{font-size:clamp(38px,5.4vw,76px)}
.dk-sheet{position:relative;border:1px solid var(--line);background:var(--panel);padding:14px 16px 12px;box-shadow:7px 7px 0 #e7e0d3}
.dk-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:9px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.dk-lane{display:grid;grid-template-columns:16px 54px 1fr;gap:8px;align-items:center;padding:8px 0;border-bottom:1px dotted var(--line)}
.dk-lane:last-of-type{border-bottom:0}
.dk-lane>b{font-family:var(--mono);font-size:8px;font-weight:400;color:var(--accent)}
.dk-lane>em{font-style:normal;font-size:10px;color:var(--muted)}
.dk-bars{display:flex;gap:3px}
.dk-bars i{display:block;height:8px;border-radius:1px;background:#ddd6c8;flex:1}
.dk-bars i.hot{background:var(--accent)}
.dk-bars i.mid{background:var(--accent-2)}
.dk-note{margin:10px 0 0;font-size:8px;line-height:1.7;color:var(--muted);max-width:88%}
.dk-stamp{position:absolute;right:14px;bottom:10px;border:1px solid var(--accent);color:var(--accent);font-size:8px;letter-spacing:.2em;padding:3px 6px;transform:rotate(-6deg);opacity:.85}
.scope-board{border:1px solid var(--line);background:var(--panel)}
.scope-legend{padding:9px 12px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:9px;color:var(--muted);letter-spacing:.05em}
.scope-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
.scope-name{font-size:13px;line-height:1.5}
.scope-name small{display:block;margin-top:2px;font-size:10px;color:var(--muted);line-height:1.6}
.scope-opts{display:flex;gap:4px}
.scope-opts button{border:1px solid var(--line);background:transparent;border-radius:2px;padding:5px 9px;font-size:11px;color:var(--muted);cursor:pointer;min-height:26px}
.scope-opts button[aria-pressed="true"]{background:var(--ink);color:#fff;border-color:var(--ink)}
.scope-sum{margin:0;padding:11px 12px;border-top:1px solid var(--line);background:var(--soft);font-family:var(--mono);font-size:10px;color:var(--ink);letter-spacing:.03em}
.section.docket .card{background:var(--panel);border-color:var(--line)}
@media(max-width:600px){
.scope-row{grid-template-columns:1fr}
.scope-opts{justify-content:flex-start;flex-wrap:wrap}
}
`
  }
};

export const MARQUEE_WORDS = {
  zh: ['批量写入', '回读核对', '12 份稿', '12 门语言', '按源稿配字体', '行距字距', '换行回读', '例外集中', '最终判断归你'],
  en: ['Batch write-back', 'Read-back checks', '12 drafts', '12 languages', 'Fonts by source face', 'Leading and tracking', 'Line-break read-back', 'One exception queue', 'Final call stays with you']
};
