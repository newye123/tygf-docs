import { S, FILES, LANGS, OFFICIAL } from './data.mjs';

/* ------------------------------------------------------------------ */
/* text helpers                                                        */
/* ------------------------------------------------------------------ */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const bi = (o, cls) => {
  const c = cls ? ' ' + cls : '';
  return `<span class="zh${c}">${esc(o.zh)}</span><span class="en${c}">${esc(o.en)}</span>`;
};

const og = (tag, o, cls) => `<${tag} class="og${cls ? ' ' + cls : ''}">${bi(o)}</${tag}>`;

/* Same as bi(), but explicit <br> line breaks in the source strings survive escaping. */
const biBr = (o, cls) => {
  const c = cls ? ' ' + cls : '';
  const keep = (s) => esc(s).replace(/&lt;br\s*\/?&gt;/g, '<br>');
  return `<span class="zh${c}">${keep(o.zh)}</span><span class="en${c}">${keep(o.en)}</span>`;
};

const LANG_ZH = {
  en: '英语', de: '德语', fr: '法语', es: '西班牙语', it: '意大利语', pt: '葡萄牙语',
  ja: '日语', ko: '韩语', th: '泰语', vi: '越南语', ar: '阿拉伯语', ru: '俄语'
};
const LANG_EN = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese',
  ja: 'Japanese', ko: 'Korean', th: 'Thai', vi: 'Vietnamese', ar: 'Arabic', ru: 'Russian'
};

const TARGET_TEXT = {
  en: 'Long copy in a narrow layer',
  de: 'Langer Text in einer schmalen Ebene',
  fr: 'Texte long dans un calque étroit',
  es: 'Texto largo en una capa estrecha',
  it: 'Testo lungo in un livello stretto',
  pt: 'Texto longo em uma camada estreita',
  ja: '狭いレイヤーに長い翻訳文',
  ko: '좁은 레이어의 긴 번역문',
  th: 'ข้อความยาวในเลเยอร์แคบ',
  vi: 'Văn bản dài trong lớp hẹp',
  ar: 'نص طويل داخل طبقة ضيقة',
  ru: 'Длинный текст в узком слое'
};
const SOURCE_TEXT = 'Long copy in a narrow layer';

const STATUS_ZH = { done: '已写入', review: '待复查', blocked: '无法处理', fail: '执行失败', pending: '未开始' };
const STATUS_EN = { done: 'Written', review: 'Review', blocked: 'Unprocessable', fail: 'Failed', pending: 'Not started' };

/* ------------------------------------------------------------------ */
/* nav + footer                                                        */
/* ------------------------------------------------------------------ */
export function nav() {
  return `<a class="skip" href="#main">${bi({ zh: '跳到主内容', en: 'Skip to content' })}</a>
<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="#/home" aria-label="TuYi Workshop">
      <span class="mark">译</span>
      <span class="brand-txt"><b>${bi(S.brand)}</b><small>${bi(S.brandSub)}</small></span>
    </a>
    <nav class="nav-links" aria-label="${esc('主导航 Main navigation')}">
      <a href="#/home" data-route="home">${bi(S.nav.home)}</a>
      <a href="#/demo" data-route="demo">${bi(S.nav.demo)}</a>
      <a href="#/fit" data-route="fit">${bi(S.nav.fit)}</a>
      <a href="#/apply" data-route="apply">${bi(S.nav.apply)}</a>
    </nav>
    <div class="nav-actions">
      <button type="button" class="lang-toggle" data-aria-zh="Switch to English" data-aria-en="切换到中文" aria-label="Switch to English">EN</button>
      <a class="btn btn-primary btn-sm" href="#/apply">${bi(S.navCta)}</a>
      <button type="button" class="menu-btn" aria-expanded="false" aria-controls="navmenu" aria-label="Menu"><span></span></button>
    </div>
  </div>
</header>`;
}

export function footer(root) {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="mark">译</span>
        <div>
          <b>${bi(S.brand)}</b>
          <p class="footer-blurb">${bi(S.footer.blurb)}</p>
        </div>
      </div>
      <div class="footer-col">
        <h4>${bi({ zh: '本页', en: 'This page' })}</h4>
        <a href="#/home">${bi(S.nav.home)}</a>
        <a href="#/demo">${bi(S.nav.demo)}</a>
        <a href="#/fit">${bi(S.nav.fit)}</a>
        <a href="#/apply">${bi(S.nav.apply)}</a>
      </div>
      <div class="footer-col">
        <h4>${bi({ zh: '正式站', en: 'Official' })}</h4>
        <a href="${OFFICIAL.home}" target="_blank" rel="noopener">${bi(S.footer.official)}</a>
        <a href="${OFFICIAL.privacy}" target="_blank" rel="noopener">${bi(S.footer.privacy)}</a>
        <a href="${OFFICIAL.subprocessors}" target="_blank" rel="noopener">${bi(S.footer.subprocessors)}</a>
        <a href="${OFFICIAL.download}" target="_blank" rel="noopener">${bi(S.footer.download)}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="lang-note">${bi(S.footer.disclaimer)}</span>
      <span><a href="${root}index.html">${bi(S.footer.all)}</a> · ${bi(S.footer.langNote)}</span>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */
const note = (o, cls) => `<p class="section-note og${cls ? ' ' + cls : ''}">${bi(o)}</p>`;
const schematic = (o) => `<span class="schematic schematic-note">${bi(o)}</span>`;

function secHead(kicker, title, lead) {
  return `<div class="section-head reveal">
    <div>
      <div class="kicker">${bi(kicker)}</div>
      ${og('h2', title, 'h2')}
    </div>
    ${lead ? `<p class="lead og">${bi(lead)}</p>` : ''}
  </div>`;
}

function heroLines(v) {
  const zh = v.lines.zh, en = v.lines.en;
  const n = Math.max(zh.length, en.length);
  return Array.from({ length: n }, (_, i) => `<span class="ln">${bi({ zh: zh[i] || '', en: en[i] || '' })}</span>`).join('');
}

function heroCopy(v) {
  return `<div class="hero-copy">
    <span class="eyebrow"><i></i>${bi(v.eyebrow)}</span>
    <h1 class="og">${heroLines(v)}</h1>
    <p class="hero-sub og">${bi(v.sub)}</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="#/apply">${bi(S.cta.primary)}</a>
      <a class="btn btn-ghost" href="#/demo">${bi(S.cta.secondary)}</a>
    </div>
    <div class="hero-note"><span class="dot"></span>${bi(S.cta.micro)}</div>
    <div class="chips">${S.chips.map((c) => `<span class="chip">${bi(c)}</span>`).join('')}</div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* hero visuals                                                        */
/* ------------------------------------------------------------------ */
function stageVisual(v) {
  const files = FILES.slice(0, 6);
  const cells = [];
  for (let i = 0; i < 48; i++) {
    const st = i % 11 === 3 ? 'review' : (i % 17 === 5 ? 'blocked' : 'done');
    cells.push(`<i class="${st}"></i>`);
  }
  return `<div class="stage" data-stage>
    <div class="stage-frame">
      <div class="stage-bar"><span class="app-title">tygf · batch 12 × 12</span>${schematic(S.misc.schematic)}</div>
      <div class="stage-screen">
        <div class="stage-scene active">
          <div class="scene-head"><span>01 · ${bi({ zh: '导入译文表', en: 'Import tables' })}</span>${schematic(S.misc.simulated)}</div>
          <div class="scene-split">
            <div class="scene-files">
              ${files.map((f, i) => `<div class="scene-file"><i></i>${esc(f)}</div>`).join('')}
              <div class="scene-file"><i></i>Detail_01.psd</div>
              <div class="scene-file"><i></i>Banner_01.psd</div>
            </div>
            <div class="scene-table">
              <div class="st-row head"><span>${bi({ zh: '原文', en: 'Source' })}</span><span>${bi({ zh: '译文', en: 'Target' })}</span><span>lang</span></div>
              <div class="st-row"><span>${esc(SOURCE_TEXT)}</span><span>Langer Text in einer schmalen Ebene</span><span>de</span></div>
              <div class="st-row"><span>${esc(SOURCE_TEXT)}</span><span>Texte long dans un calque étroit</span><span>fr</span></div>
              <div class="st-row"><span>${esc(SOURCE_TEXT)}</span><span>狭いレイヤーに長い翻訳文</span><span>ja</span></div>
              <div class="st-row"><span>${esc(SOURCE_TEXT)}</span><span>نص طويل داخل طبقة ضيقة</span><span>ar</span></div>
            </div>
          </div>
          <div class="scene-foot"><span>12 drafts · 12 languages</span><span>${bi({ zh: '按稿分批', en: 'batched per draft' })}</span></div>
        </div>
        <div class="stage-scene">
          <div class="scene-head"><span>02 · ${bi({ zh: '逐稿写入', en: 'Write per draft' })}</span>${schematic(S.misc.demoTag)}</div>
          <div class="scene-matrix">${cells.join('')}</div>
          <div class="scene-foot"><span>${bi({ zh: '确定的先走', en: 'Clear items run' })}</span><span>${bi({ zh: '拿不准的停下', en: 'uncertain ones stop' })}</span></div>
        </div>
        <div class="stage-scene">
          <div class="scene-head"><span>03 · ${bi({ zh: '逐处回读', en: 'Read back per object' })}</span>${schematic(S.misc.notReal)}</div>
          <div class="scene-report">
            <div class="sr-row head"><span>${bi({ zh: '对象', en: 'Object' })}</span><span>lang</span><span>${bi({ zh: '计划', en: 'Plan' })}</span><span>${bi({ zh: '实测', en: 'Real' })}</span><span>${bi({ zh: '状态', en: 'Status' })}</span></div>
            <div class="sr-row"><span>A+_01 / t-headline</span><span>de</span><span>3</span><span>3</span><span class="g">${bi({ zh: '已写入', en: 'Written' })}</span></div>
            <div class="sr-row"><span>A+_01 / t-body</span><span>de</span><span>4</span><span>5</span><span class="y">${bi({ zh: '待复查', en: 'Review' })}</span></div>
            <div class="sr-row"><span>A+_02 / t-badge</span><span>ja</span><span>1</span><span>—</span><span class="p">${bi({ zh: '无法处理', en: 'Blocked' })}</span></div>
            <div class="sr-row"><span>A+_04 / t-cta</span><span>ar</span><span>1</span><span>—</span><span class="r">${bi({ zh: '执行失败', en: 'Failed' })}</span></div>
          </div>
          <div class="scene-foot"><span>${bi({ zh: '文字回读 ≠ 视觉验收', en: 'Read-back is not visual QA' })}</span></div>
        </div>
      </div>
      <div class="stage-controls">
        <button type="button" class="stage-dot on" data-scene="0" aria-pressed="true">01</button>
        <button type="button" class="stage-dot" data-scene="1" aria-pressed="false">02</button>
        <button type="button" class="stage-dot" data-scene="2" aria-pressed="false">03</button>
        <span class="stage-progress"><i></i></span>
        <span class="stage-count">${bi({ zh: '场景 1 / 3', en: 'Scene 1 / 3' })}</span>
      </div>
    </div>
    <div class="film-meta"><span>${bi(v.note)}</span></div>
  </div>`;
}

function bentoVisual() {
  const grid = (n) => Array.from({ length: n }, () => '<i></i>').join('');
  return `<div class="bento-hero">
    <div class="b-card"><span class="b-tag">01</span><div class="b-body"><div class="b-h">${bi({ zh: '12 份稿', en: '12 drafts' })}</div><p>${bi({ zh: '一次准备，逐稿配对译文表。', en: 'One setup, one table per draft.' })}</p><div class="type-spec">Aa 12×</div><div class="mini-grid">${grid(18)}</div></div></div>
    <div class="b-card"><span class="b-tag">02</span><div class="b-body"><div class="b-h">${bi({ zh: '12 个语种', en: '12 languages' })}</div><p>${bi({ zh: '单批上限，不混批次。', en: 'Per-batch limit; batches stay separate.' })}</p><div class="mini-grid">${grid(12)}</div></div></div>
    <div class="b-card"><span class="b-tag">03</span><div class="b-body"><div class="b-h">${bi({ zh: '字体配平', en: 'Font balance' })}</div><p>${bi({ zh: '按源稿脸名分组映射。', en: 'Group by source face, then map.' })}</p><div class="mini-grid">${grid(12)}</div></div></div>
    <div class="b-card"><span class="b-tag">04</span><div class="b-body"><div class="b-h">${bi({ zh: '写入后回读', en: 'Write, then read back' })}</div><p>${bi({ zh: '计划行数与实测行数分开记。', en: 'Planned and rendered lines recorded separately.' })}</p><div class="mini-grid">${grid(24)}</div></div></div>
  </div>
  <p class="small muted" style="margin-top:12px">${schematic(v0note())}</p>`;
}

function v0note() {
  return { zh: '能力卡为示意界面 · 数据为模拟', en: 'Capability cards are schematic; data is simulated' };
}

function editorialHero(v) {
  const rows = [
    ['01', { zh: '找图层', en: 'Find layer' }],
    ['02', { zh: '对译文', en: 'Match string' }],
    ['03', { zh: '粘贴写入', en: 'Paste' }],
    ['04', { zh: '核对折行', en: 'Check wrap' }],
    ['05', { zh: '另存一版', en: 'Save a version' }]
  ];
  return `<div class="wrap hero-grid">
    <div class="hero-main">
      ${heroCopy(v)}
    </div>
    <aside class="hero-side">
      <div class="ed-side-block"><b>12 × 12</b><p>${bi({ zh: '一份稿，按目标语种把同一套动作重复一遍。', en: 'One draft, the same routine repeated once per target language.' })}</p></div>
      <div class="ed-side-list">
        ${rows.map(([n, t]) => `<span><em>${n}</em>${bi(t)}<b>× 12</b></span>`).join('')}
      </div>
      <div class="ed-side-block">${schematic({ zh: '流程次数示意 · 不是效率承诺', en: 'Step counts, not efficiency claims' })}</div>
    </aside>
  </div>
  <div class="wrap"><div class="pull-wrap"><p class="pull og">${bi({ zh: '把重复收进批次，', en: 'Batch the repetition,' })}<em>${bi({ zh: '把判断留给你。', en: 'keep the judgment.' })}</em></p></div></div>`;
}

function promoVisual() {
  const rows = [
    [{ zh: '一次准备', en: 'One setup' }, '12 PSD / PSB'],
    [{ zh: '单批语种', en: 'Per batch' }, '≤ 12'],
    [{ zh: '字体 · 字重', en: 'Font · weight' }, { zh: '按组映射', en: 'By group' }],
    [{ zh: '行距 · 字距', en: 'Leading · tracking' }, { zh: '按组调整', en: 'By group' }],
    [{ zh: '写入之后', en: 'After write' }, { zh: '逐处回读', en: 'Read back' }]
  ];
  return `<div class="promo-box">
    <span class="promo-stamp">${bi({ zh: '内测 · 邀请制', en: 'Beta · invite only' })}</span>
    <div class="pb-h">${bi({ zh: '拿一套真稿跑一次', en: 'Run one real draft' })}</div>
    <div class="promo-list">
      ${rows.map(([k, val]) => `<div class="promo-row"><span>${bi(k)}</span><b>${typeof val === 'string' ? esc(val) : bi(val)}</b></div>`).join('')}
    </div>
    <div class="hero-ctas"><a class="btn btn-primary" href="#/apply">${bi(S.cta.apply)}</a><a class="btn btn-ghost" href="#/demo">${bi(S.cta.demo)}</a></div>
    <p class="tiny muted" style="margin-top:10px">${bi({ zh: '海报为版面示意 · 不构成价格、名额或时间承诺', en: 'Poster is a layout schematic; no price, seat, or timing commitment.' })}</p>
  </div>`;
}

function ticketVisual(v) {
  const rows = [
    [{ zh: '稿件', en: 'Draft' }, { zh: '1 套 PSD / PSB', en: '1 PSD / PSB set' }],
    [{ zh: '译文', en: 'Copy' }, { zh: '你已确认', en: 'Approved by you' }],
    [{ zh: '语种', en: 'Languages' }, { zh: '单批 ≤ 12', en: '≤ 12 per batch' }],
    [{ zh: '检查', en: 'QA' }, { zh: '同一套标准', en: 'Same standard' }]
  ];
  return `<div class="ticket">
    <div class="ticket-head">
      <div><span class="mono">invitation · beta</span><div class="ticket-title">${bi({ zh: '试跑邀请', en: 'Pilot invitation' })}</div></div>
      <div class="ticket-qr" aria-hidden="true"></div>
    </div>
    ${rows.map(([k, val]) => `<div class="ticket-row"><span>${bi(k)}</span><b>${bi(val)}</b></div>`).join('')}
    <div class="perf"></div>
    <div class="ticket-row"><span>${bi({ zh: '有效期', en: 'Valid' })}</span><b>${bi({ zh: '直到你决定', en: 'Until you decide' })}</b></div>
    <div class="ticket-row"><span>${bi({ zh: '适用', en: 'For' })}</span><b>${bi({ zh: '已有确认译文', en: 'Approved copy ready' })}</b></div>
    <div class="ticket-foot"><span>${bi(v.note)}</span><span class="ticket-code">TUYI-BETA-12</span></div>
  </div>`;
}

function appVisual(v) {
  const logs = [
    ['ok', 'import tables · 3 files · 12 languages'],
    ['ok', 'pair drafts · 12 drafts · 12 tables'],
    ['ok', 'write A+_01 · de · 86 objects'],
    ['warn', 'review A+_01 / t-body · rendered 5 / planned 4'],
    ['dim', 'skip A+_02 / t-badge · rasterized layer'],
    ['err', 'fail A+_04 / t-cta · ar · not written'],
    ['ok', 'read back · 1,032 objects · 5 exceptions']
  ];
  return `<div class="app" data-app>
    <div class="app-bar"><i></i><i></i><i></i><span class="app-title">${bi({ zh: '批量工作台 · 示意', en: 'Batch workbench · schematic' })}</span><span class="app-tag">${bi(S.misc.demoTag)}</span></div>
    <div class="app-body">
      <div class="app-side">
        <div class="side-label">${bi({ zh: '步骤', en: 'Steps' })}</div>
        <div class="side-step done"><b>01</b>${bi({ zh: '导入译文表', en: 'Import tables' })}</div>
        <div class="side-step done"><b>02</b>${bi({ zh: '选稿与语言', en: 'Drafts + languages' })}</div>
        <div class="side-step on"><b>03</b>${bi({ zh: '批量写入', en: 'Write in batch' })}</div>
        <div class="side-step"><b>04</b>${bi({ zh: '回读与交付', en: 'Read back' })}</div>
      </div>
      <div class="app-main">
        <div class="app-top">
          <div><div class="ap-h">${bi({ zh: '12 份稿 · 12 个语种', en: '12 drafts · 12 languages' })}</div><div class="sub">${bi({ zh: '每份稿是独立批次', en: 'Each draft is its own batch' })}</div></div>
          <div class="app-actions"><button type="button" class="mini-btn primary" data-app-run>${bi({ zh: '运行示意', en: 'Run demo' })}</button><button type="button" class="mini-btn" data-app-reset>${bi({ zh: '重置', en: 'Reset' })}</button></div>
        </div>
        <div class="progress"><i data-app-progress></i></div>
        <div class="files">
          ${FILES.slice(0, 4).map((f, i) => `<div class="file"><div class="thumb"></div><div class="name">${esc(f)}</div><span class="st ${i === 2 ? 'blocked' : 'done'}"></span></div>`).join('')}
        </div>
        <div class="log">${logs.map(([cls, text]) => `<div data-app-line class="${cls}">${esc(text)}</div>`).join('')}</div>
        <div class="app-foot"><span>${bi({ zh: '示意界面 · 非真实截图', en: 'Schematic UI · not a screenshot' })}</span><span>86 / 86 objects</span></div>
      </div>
    </div>
  </div>
  <p class="app-note">${bi(v.note)}</p>`;
}

function swissHero(v) {
  const cells = [
    ['01', '12 × 12', { zh: '份稿 × 语种（按稿分批）', en: 'drafts × languages, batched per draft' }],
    ['02', '4', { zh: '环节：导入、配对、写入、回读', en: 'stages: input, pair, write, read back' }],
    ['03', '5', { zh: '状态：写入、复查、无法处理、失败、未开始', en: 'states: written, review, blocked, failed, pending' }],
    ['04', '3', { zh: '待复查、未覆盖、执行失败分开列', en: 'review, uncovered, failed listed apart' }],
    ['05', '1', { zh: '一张总表看 12 份稿', en: 'one table across 12 drafts' }],
    ['06', '0', { zh: '自动加行与静默缩字号的次数', en: 'auto line adds and silent type shrinking' }]
  ];
  return `<div class="wrap hero-grid">
    <div class="hero-main">${heroCopy(v)}</div>
    <div class="hero-side">
      <p class="small">${bi({ zh: '输入 · 配对 · 写入 · 回读', en: 'Input · pair · write · read back' })}</p>
      <p class="small muted" style="margin-top:10px">${bi({ zh: '四个环节，各有明确的输入、输出和失败状态。网格里的数字是结构计数，不是业绩。', en: 'Four stages, each with explicit inputs, outputs, and failure states. The numbers are structural counts, not performance claims.' })}</p>
      ${schematic(S.misc.schematic)}
    </div>
  </div>
  <div class="wrap"><div class="swiss-grid">
    ${cells.map(([n, big, label]) => `<div class="swiss-cell"><span class="num">${n}</span><strong>${esc(big)}</strong><span>${bi(label)}</span><em>${bi({ zh: '结构计数', en: 'Structural count' })}</em></div>`).join('')}
  </div></div>`;
}

function termVisual(v) {
  const lines = [
    ['dim', '$ tygf run --drafts 12 --langs 12 --dry-run'],
    ['', 'prepare · import 12 drafts · 12 tables'],
    ['ok', 'prepare · empty cells 0 · duplicate sources 2'],
    ['', 'draft A+_01 · de · write 86 objects'],
    ['ok', 'draft A+_01 · de · written 84'],
    ['warn', 'draft A+_01 · t-body · rendered 5 / planned 4 · review'],
    ['dim', 'draft A+_02 · ja · t-badge · rasterized · stop'],
    ['err', 'draft A+_04 · ar · t-cta · failed · not written'],
    ['ok', 'read back · 1,032 objects · 5 exceptions · done'],
    ['dim', '$ ']
  ];
  return `<div class="term" data-term>
    <div class="term-bar"><i></i><i></i><i></i><span>tygf-run.log</span></div>
    <div class="term-body">${lines.map(([cls, text]) => `<div class="term-line ${cls}">${esc(text)}</div>`).join('')}</div>
    <div class="term-note">${bi(v.note)}</div>
  </div>`;
}

function timelineVisual() {
  const steps = [
    ['01', { zh: '导入译文表', en: 'Import tables' }, { zh: '输入：一张表或多张单语表', en: 'Input: one table or several' }],
    ['02', { zh: '选稿与语言', en: 'Drafts + languages' }, { zh: '输出：逐稿批次与语种', en: 'Output: per-draft batches' }],
    ['03', { zh: '批量写入', en: 'Write in batch' }, { zh: '失败状态：无法处理 / 执行失败', en: 'Failure: blocked / failed' }],
    ['04', { zh: '回读与交付', en: 'Read back' }, { zh: '输出：计划与实测分开记', en: 'Output: planned vs rendered' }]
  ];
  return `<div class="timeline">
    ${steps.map(([n, t, io]) => `<div class="tl-step"><span class="t">${n}</span><div class="tl-h">${bi(t)}</div><p>${bi(io)}</p><span class="tl-io">${bi({ zh: '有据可查', en: 'on record' })}</span></div>`).join('')}
  </div>`;
}

function compareVisual() {
  return `<div class="compare-duo">
    <div class="cd-pane cd-before">
      <div class="cp-head"><span class="cp-title">${bi({ zh: '手工逐语种', en: 'Manual, per language' })}</span><span class="cp-sub">× 12</span></div>
      <div class="manual-list">${LANGS.map((l) => `<div>${esc(l.en)} · find · paste · save</div>`).join('')}</div>
      <p class="cp-note">${bi({ zh: '同一套动作，按语种重复。示意图，不是耗时承诺。', en: 'The same routine, once per language. Schematic, not a time claim.' })}</p>
    </div>
    <div class="cd-mid" aria-hidden="true"><span>VS</span></div>
    <div class="cd-pane cd-after">
      <div class="cp-head"><span class="cp-title">${bi({ zh: '一次批次', en: 'One batch' })}</span><span class="cp-sub">12 / 12</span></div>
      <div class="batch-list">
        <div class="bl-row"><span>${bi({ zh: '准备', en: 'Prepare' })}</span><b>12 drafts</b></div>
        <div class="bl-row"><span>${bi({ zh: '写入', en: 'Write' })}</span><b>1 run</b></div>
        <div class="bl-row"><span>${bi({ zh: '回读', en: 'Read back' })}</span><b>per object</b></div>
        <div class="bl-row"><span>${bi({ zh: '例外', en: 'Exceptions' })}</span><b>1 queue</b></div>
        <div class="bl-row"><span>${bi({ zh: '最终版面', en: 'Final layout' })}</span><b>${bi({ zh: '设计师', en: 'Designer' })}</b></div>
      </div>
      <p class="cp-note">${bi({ zh: '先把可以确定的重复收走，人工留到最后签字。', en: 'Determinable repetition goes first; the human signs off last.' })}</p>
    </div>
    <div class="cd-foot"><span>${bi({ zh: '左侧：流程示意', en: 'Left: process schematic' })}</span><span>${bi({ zh: '右侧：结构示意 · 非耗时对比', en: 'Right: structure schematic, not a speed comparison' })}</span></div>
  </div>`;
}

function craftVisual() {
  return `<div class="paper" style="padding:22px">
    <div class="lab-preview">
      <div class="pv-cap"><span>${bi({ zh: '示意排版', en: 'Typography sample' })}</span><span>${bi({ zh: '浏览器实测', en: 'Measured in browser' })}</span></div>
      <div class="lp-h" style="font-family:var(--display);font-weight:500;line-height:1.16">${bi({ zh: '窄图层里的长译文', en: 'Long copy in a narrow layer' })}</div>
      <p style="font-size:14px;line-height:1.85;max-width:54ch">${bi({ zh: '换字体等于重新配平：字面高度、字宽和行距一起变。', en: 'A font swap is a rebalance: cap height, width, and leading move together.' })}</p>
      <div class="cap">${bi({ zh: '字体来自本机已安装字体 · 不是 PS 渲染结果', en: 'Fonts come from this machine; not a Photoshop render' })}</div>
      <div class="spec-row"><span>${bi({ zh: '字体', en: 'Font' })} <b>Source Han Sans</b></span><span>${bi({ zh: '字重', en: 'Weight' })} <b>700</b></span><span>${bi({ zh: '行距', en: 'Leading' })} <b>1.50</b></span><span>${bi({ zh: '字距', en: 'Tracking' })} <b>0</b></span></div>
    </div>
  </div>`;
}

function miniMatrixVisual() {
  const rows = FILES.slice(0, 6);
  const statuses = ['done', 'done', 'review', 'done', 'done', 'blocked'];
  return `<div class="matrix" role="img" aria-label="${esc('示意矩阵：6 份稿 × 12 语种')}">
    <div class="matrix-top"><div class="matrix-title">${bi({ zh: '6 × 12 示意', en: '6 × 12 schematic' })} <small>${bi(S.misc.simulated)}</small></div><div class="matrix-tools"><span class="st-badge done">${bi({ zh: '已写入', en: 'Written' })}</span><span class="st-badge review">${bi({ zh: '待复查', en: 'Review' })}</span><span class="st-badge blocked">${bi({ zh: '无法处理', en: 'Blocked' })}</span></div></div>
    <div class="matrix-scroll"><div class="matrix-grid">
      <div class="mh">${bi({ zh: '设计稿', en: 'Draft' })}</div>${LANGS.map((l) => `<div class="mh">${esc(l.code)}</div>`).join('')}
      ${rows.map((f, fi) => `<div class="mf">${esc(f)}</div>${LANGS.map((l, li) => `<div class="cell" data-status="${li === 7 && fi === 3 ? 'fail' : (li === 2 && fi === 4 ? 'blocked' : (li === 5 && fi === 1 ? 'review' : 'done'))}"></div>`).join('')}`).join('')}
    </div></div>
    <div class="matrix-foot"><span>${bi({ zh: '每份稿是独立批次', en: 'Each draft is its own batch' })}</span><span>${bi(S.misc.notReal)}</span></div>
  </div>`;
}

const SHOP_NAMES = [
  { en: 'Hero image', de: 'Hero-Bild', fr: 'Visuel principal', es: 'Imagen principal', ja: 'メインビジュアル', ar: 'الصورة الرئيسية', th: 'ภาพหลัก' },
  { en: 'Detail page', de: 'Detailseite', fr: 'Page détail', es: 'Página de detalle', ja: '詳細ページ', ar: 'صفحة التفاصيل', th: 'หน้ารายละเอียด' }
];
const SHOP_DESCS = [
  { en: 'Headline + badge · 3 lines', de: 'Titel + Badge · 3 Zeilen', fr: 'Titre + badge · 3 lignes', es: 'Titular + insignia · 3 líneas', ja: '見出し＋バッジ・3行', ar: 'عنوان وشارة · 3 أسطر', th: 'หัวเรื่องและป้าย · 3 บรรทัด' },
  { en: 'Body + spec list · 5 lines', de: 'Text + Specs · 5 Zeilen', fr: 'Texte + specs · 5 lignes', es: 'Cuerpo + specs · 5 líneas', ja: '本文＋仕様・5行', ar: 'نص ومواصفات · 5 أسطر', th: 'เนื้อหาและสเปก · 5 บรรทัด' }
];

function shopVisual() {
  const langs = ['en', 'de', 'fr', 'es', 'ja', 'ar', 'th'];
  const cards = SHOP_NAMES.map((name, i) => `<div class="shop-card" data-shop-card>
    <div class="shop-art"><i></i><i></i><i></i></div>
    <div class="shop-body">
      <div class="shop-name" data-shop-name data-en="${esc(name.en)}" data-de="${esc(name.de)}" data-fr="${esc(name.fr)}" data-es="${esc(name.es)}" data-ja="${esc(name.ja)}" data-ar="${esc(name.ar)}" data-th="${esc(name.th)}">${esc(name.en)}</div>
      <p data-shop-desc data-en="${esc(SHOP_DESCS[i].en)}" data-de="${esc(SHOP_DESCS[i].de)}" data-fr="${esc(SHOP_DESCS[i].fr)}" data-es="${esc(SHOP_DESCS[i].es)}" data-ja="${esc(SHOP_DESCS[i].ja)}" data-ar="${esc(SHOP_DESCS[i].ar)}" data-th="${esc(SHOP_DESCS[i].th)}">${esc(SHOP_DESCS[i].en)}</p>
      <div class="shop-spec">3 lines · 5 lines</div>
    </div>
  </div>`).join('');
  return `<div data-shop>
    <div class="shop-tabs"><span class="label">${bi({ zh: '目标语种预览', en: 'Target preview' })}</span><div class="lang-tabs">${langs.map((l) => `<button type="button" data-shop-lang="${l}" data-zh="${esc(LANG_ZH[l])}" data-en="${esc(LANG_EN[l])}" aria-pressed="${l === 'en' ? 'true' : 'false'}" class="${l === 'en' ? 'on' : ''}">${esc(l.toUpperCase())}</button>`).join('')}</div></div>
    <div class="shop-grid">${cards}</div>
    <p class="shop-note" data-shop-note>${esc('Target-language preview: English')}</p>
    <p class="tiny muted" style="margin-top:8px">${bi({ zh: '商品素材为 CSS 示意 · 非客户案例 · 非真实商品', en: 'Product visuals are CSS schematics; not client work or real products.' })}</p>
  </div>`;
}

function agencyVisual() {
  const roles = [
    ['01', { zh: '客户经理', en: 'Account' }, { zh: '确认稿件、译文表与目标语种。', en: 'Confirms draft, table, and target languages.' }],
    ['02', { zh: '设计执行', en: 'Design' }, { zh: '按组配字体、字重、行距与字距。', en: 'Maps font, weight, leading, and tracking by group.' }],
    ['03', { zh: '质检', en: 'QA' }, { zh: '逐语种看版面，处理例外队列。', en: 'Inspects each language; works the exception queue.' }],
    ['04', { zh: '交接', en: 'Handoff' }, { zh: '交付件带执行记录，责任可回到行。', en: 'Deliverables carry a record back to the line.' }]
  ];
  return `<div class="role-list">
    ${roles.map(([n, t, d]) => `<div class="role"><b>${n}</b><div><h2>${bi(t)}</h2><p>${bi(d)}</p></div></div>`).join('')}
  </div>
  <p class="tiny muted" style="margin-top:12px">${bi({ zh: '角色与交接为示意 · 不代表真实组织', en: 'Roles and handoff are schematic; not a real organization.' })}</p>`;
}

const MK_SITES = ['US', 'DE', 'JP', 'UK', 'FR', 'IT'];
function marketplaceVisual() {
  return `<div class="mk">
    <div class="mk-top">
      <span>${bi({ zh: 'A+ · 详情图 · 示意', en: 'A+ · detail · schematic' })}</span>
      <div class="mk-sites">${MK_SITES.map((c, i) => `<span class="${i === 1 ? 'on' : ''}">${c}</span>`).join('')}</div>
    </div>
    <div class="mk-main">
      <div class="mk-shot"><b>CSS 示意</b><i></i><i></i><i></i></div>
      <div class="mk-info">
        <p class="mk-t">${bi({ zh: '示例标题层 · 德语待写入', en: 'Sample headline · German pending' })}</p>
        <ul>
          <li>${bi({ zh: '五点描述 · 五行，逐行对译文', en: 'Bullet copy · five lines, matched line by line' })}</li>
          <li>${bi({ zh: '主图层 · 已确认译文，文字可编辑', en: 'Hero layer · approved copy, editable text' })}</li>
          <li>${bi({ zh: 'A+ 模块 · 四张，按站点各一套', en: 'A+ modules · four per marketplace' })}</li>
        </ul>
        <div class="mk-rows"><span>${bi({ zh: '层 9 · 站点 6 · 待复查 2', en: '9 layers · 6 markets · 2 to review' })}</span></div>
      </div>
    </div>
    <div class="mk-aplus"><span>A+ 01</span><span>A+ 02</span><span>A+ 03</span><span>A+ 04</span></div>
    <p class="mk-foot">${bi({ zh: '示意界面 · 数字为结构计数', en: 'Schematic view · numbers are structural counts' })}</p>
  </div>`;
}

const DK_CELLS = [
  { zh: '找层', en: 'Find' }, { zh: '对译', en: 'Match' }, { zh: '写入', en: 'Write' },
  { zh: '回读', en: 'Read back' }, { zh: '例外', en: 'Except' }, { zh: '版面', en: 'Layout' }
];
function docketVisual() {
  const rounds = [
    { zh: '首轮', en: 'First pass' },
    { zh: '返修', en: 'Revision' },
    { zh: '新站点', en: 'New market' }
  ];
  return `<div class="dk-sheet">
    <div class="dk-head"><span>${bi({ zh: '分工单 · 示意', en: 'Split sheet · schematic' })}</span><span>${bi({ zh: '六段', en: 'Six stages' })}</span></div>
    ${rounds.map((r, i) => `<div class="dk-lane"><b>${String(i + 1).padStart(2, '0')}</b><em>${bi(r)}</em><div class="dk-bars" aria-hidden="true">${DK_CELLS.map((c, ci) => `<i class="${ci < 4 ? 'hot' : 'mid'}" title="${esc(c.en)}"></i>`).join('')}</div></div>`).join('')}
    <p class="dk-note">${bi({ zh: '橙色格＝每轮都要重走的四段：找层、对译、写入、回读。返修和新站点都会回到这四段。', en: 'Orange cells mark the four stages every round repeats: find, match, write, read back. Revisions and new markets both return to them.' })}</p>
    <span class="dk-stamp">${bi({ zh: '示意', en: 'Schematic' })}</span>
  </div>`;
}

function evidenceVisual() {
  return `<div class="dossier">
    <div class="dossier-head">
      <div><span class="folder-tab">execution-report · 示意</span><div class="dossier-title" style="margin-top:8px">A+_01 · de · 2026-10</div></div>
      <span class="stamp">${bi({ zh: '示意', en: 'Schematic' })}</span>
    </div>
    <table class="report-table">
      <tr><th>${bi({ zh: '对象', en: 'Object' })}</th><th>${bi({ zh: '计划', en: 'Plan' })}</th><th>${bi({ zh: '实测', en: 'Real' })}</th><th>${bi({ zh: '状态', en: 'Status' })}</th></tr>
      <tr><td>t-headline</td><td>3</td><td>3</td><td><span class="st done">${bi({ zh: '已写入', en: 'Written' })}</span></td></tr>
      <tr><td>t-body</td><td>4</td><td>5</td><td><span class="st review">${bi({ zh: '待复查', en: 'Review' })}</span></td></tr>
      <tr><td>t-badge</td><td>1</td><td>—</td><td><span class="st blocked">${bi({ zh: '无法处理', en: 'Blocked' })}</span></td></tr>
      <tr><td>t-cta</td><td>1</td><td>—</td><td><span class="st fail">${bi({ zh: '执行失败', en: 'Failed' })}</span></td></tr>
    </table>
    <div class="dossier-meta"><span>${bi({ zh: '未覆盖：0', en: 'Uncovered: 0' })}</span><span>${bi({ zh: '待复查：1', en: 'Review: 1' })}</span><span>${bi({ zh: '失败：1', en: 'Failed: 1' })}</span></div>
    <div class="dossier-note">${bi({ zh: '档案为示意 · 数据为模拟 · 文字回读不等于视觉或语义验收', en: 'Schematic dossier · simulated data · read-back is not visual or semantic QA.' })}</div>
  </div>`;
}

function quizBlock(idp, compact) {
  const qs = [
    {
      q: { zh: '译文已经确认，只需要写回？', en: 'Is the copy already approved, so you only need write-back?' },
      no: { zh: '需要机器翻译或 OCR 生成译文', en: 'You need translation or OCR to produce copy' }
    },
    {
      q: { zh: '文字仍是可编辑的文字图层？', en: 'Is the text still an editable text layer?' },
      no: { zh: '文字已栅格化或无法直接替换', en: 'Text is rasterized or not directly replaceable' }
    },
    {
      q: { zh: '单批目标语种在 12 个以内？', en: 'Are you within 12 target languages per batch?' },
      no: { zh: '单批语种超过 12 个', en: 'More than 12 languages in one batch' }
    }
  ];
  return `<div class="quiz" data-quiz>
    ${qs.map((x, i) => `<div class="quiz-q" data-no-zh="${esc(x.no.zh)}" data-no-en="${esc(x.no.en)}">
      <p>${bi(x.q)}</p>
      <div class="quiz-opts">
        <label><input type="radio" name="${idp}q${i}" value="yes">${bi({ zh: '是', en: 'Yes' })}</label>
        <label><input type="radio" name="${idp}q${i}" value="no">${bi({ zh: '否', en: 'No' })}</label>
      </div>
    </div>`).join('')}
    <div class="quiz-result" data-quiz-result data-state="wait">
      <b>${bi({ zh: '三项都选完，才给结果', en: 'Answer all three for a result' })}</b>
      <p>${bi({ zh: '自查只基于这三项输入，不是兼容性承诺。', en: 'The self-check reflects these three inputs only; it is not a compatibility guarantee.' })}</p>
    </div>
    <div class="quiz-actions"><button type="button" class="mini-btn" data-quiz-reset>${bi({ zh: '重新选', en: 'Reset' })}</button>${compact ? '' : `<a class="mini-btn" href="#/fit">${bi({ zh: '看完整边界', en: 'See all boundaries' })}</a>`}</div>
  </div>`;
}

function roiBlock() {
  return `<div class="roi" data-roi>
    <div class="roi-inputs">
      <label>${bi({ zh: '设计稿数量', en: 'Drafts' })}<input type="number" data-roi-drafts min="1" max="12" value="3"></label>
      <label>${bi({ zh: '单批语种', en: 'Languages' })}<input type="number" data-roi-langs min="1" max="12" value="6"></label>
      <label>${bi({ zh: '每遍人工分钟', en: 'Minutes per pass' })}<input type="number" data-roi-mins min="1" max="240" value="20"></label>
      <label>${bi({ zh: '一次性准备小时', en: 'One-off setup (h)' })}<input type="number" data-roi-setup min="0" max="200" value="2"></label>
    </div>
    <div class="roi-out">
      <div class="roi-big" data-roi-big>—</div>
      <div class="roi-legend" data-roi-sub>—</div>
      <div class="roi-bars">
        <div class="roi-bar"><i data-roi-bar="manual"></i></div>
        <div class="roi-bar alt"><i data-roi-bar="setup"></i></div>
      </div>
      <div class="roi-legend"><span><i></i>${bi({ zh: '重复工时', en: 'Repeated work' })}</span><span class="alt"><i></i>${bi({ zh: '一次性准备', en: 'One-off setup' })}</span></div>
      <p class="roi-note" data-roi-note>${bi({ zh: '默认值只是示例，不是实测。结果可以为 0 或负数。', en: 'Defaults are examples, not measurements. Results may be zero or negative.' })}</p>
    </div>
  </div>`;
}

function lookbookVisual() {
  const tiles = [
    ['多语言', '12'], ['Multilingual', ''], ['Aa', ''], ['字距', ''], ['Leading', ''], ['字体', ''], ['Aa · 12', '']
  ];
  return `<div class="collage">
    ${tiles.map(([w, cap], i) => `<div class="tile" ${i === 4 ? 'dir="rtl"' : ''}><i style="width:${40 + i * 9}px;height:${40 + i * 9}px;right:-8px;top:-8px"></i><span class="tile-word">${esc(w)}</span>${cap ? `<span class="tile-cap">${esc(cap)}</span>` : ''}</div>`).join('')}
  </div>
  <p class="tiny muted" style="margin-top:12px">${bi({ zh: '排版拼贴为示意 · 非客户作品', en: 'Typography collage is schematic; not client work.' })}</p>`;
}

function manifestoVisual() {
  const items = [
    [{ zh: '写入', en: 'Write' }, { zh: '已经确定的文字替换，交给批次。', en: 'Text replacements that are already decided go to the batch.' }],
    [{ zh: '回读', en: 'Read back' }, { zh: '写完重开文件，逐处把文字读回来。', en: 'Reopen the file and read every object back.' }],
    [{ zh: '例外', en: 'Exceptions' }, { zh: '撑版、换行、拿不准的位置，集中列出。', en: 'Overflow, line breaks, uncertain spots — gathered in one list.' }],
    [{ zh: '判断', en: 'Decide' }, { zh: '最终版面与签字，仍在设计师手里。', en: 'The final layout and sign-off stay with the designer.' }]
  ];
  return `<div class="manifesto-list">
    ${items.map(([t, d]) => `<div class="manifesto-item"><div class="m-h">${bi(t)}</div><p>${bi(d)}</p></div>`).join('')}
  </div>`;
}

function minimalVisual() {
  const cells = [
    [{ zh: '份稿', en: 'Drafts' }, '12'],
    [{ zh: '语种', en: 'Languages' }, '12'],
    [{ zh: '环节', en: 'Stages' }, '4'],
    [{ zh: '总表', en: 'Table' }, '1']
  ];
  return `<div class="minimal-figure">
    ${cells.map(([k, v]) => `<div><b>${esc(v)}</b>${bi(k)}</div>`).join('')}
  </div>
  <div class="minimal-meta"><span>12 × 12</span><span>write · read back · decide</span><span>${bi({ zh: '示意', en: 'Schematic' })}</span></div>`;
}

function heroVisual(v) {
  switch (v.visual) {
    case 'stage': return stageVisual(v);
    case 'bento': return bentoVisual();
    case 'pain': return '';
    case 'promo': return promoVisual();
    case 'ticket': return ticketVisual(v);
    case 'app': return appVisual(v);
    case 'grid': return '';
    case 'terminal': return termVisual(v);
    case 'timeline': return timelineVisual();
    case 'compare': return compareVisual();
    case 'typography': return craftVisual();
    case 'matrix': return miniMatrixVisual();
    case 'ecommerce': return shopVisual();
    case 'agency': return agencyVisual();
    case 'evidence': return evidenceVisual();
    case 'fitquiz': return quizBlock('qz-h', true);
    case 'roi': return roiBlock();
    case 'lookbook': return lookbookVisual();
    case 'manifesto': return manifestoVisual();
    case 'minimal': return minimalVisual();
    case 'marketplace': return marketplaceVisual();
    case 'docket': return docketVisual();
    default: return '';
  }
}

/* ------------------------------------------------------------------ */
/* hero                                                                */
/* ------------------------------------------------------------------ */
export function hero(v) {
  const visual = heroVisual(v);
  if (v.theme === 'editorial') {
    return `<section class="hero hero-editorial">${editorialHero(v)}</section>`;
  }
  if (v.theme === 'swiss') {
    return `<section class="hero hero-swiss">${swissHero(v)}</section>`;
  }
  const layout = v.layout === 'split' ? 'hero-split' : (v.layout === 'wide' ? 'hero-wide' : (v.layout === 'overlay' ? 'hero-overlay' : ''));
  const cls = `hero hero-${v.theme}${v.layout === 'wide' ? ' hero-wide' : ''}${v.layout === 'overlay' ? ' hero-overlay' : ''}${v.layout === 'center' ? ' hero-center' : ''}`;
  const tight = ['promo', 'manifesto', 'lookbook', 'compare', 'cinema'].indexOf(v.theme) >= 0 ? ' h1-tight' : '';
  const body = `<div class="wrap hero-inner${layout === 'hero-split' || v.layout === 'wide' ? ' hero-split' : ''}">
      ${heroCopy(v).replace('<h1 class="og">', `<h1 class="og${tight}">`)}
      ${visual ? `<div class="hero-visual" data-no-og>${visual}</div>` : ''}
    </div>`;
  const marquee = v.theme === 'manifesto' ? `<div class="marquee" aria-hidden="true"><div class="marquee-track">${S.chips.concat(S.chips).map((c) => `<span>${esc(c.zh)} · ${esc(c.en)}</span>`).join('')}</div></div>` : '';
  return `<section class="${cls}">${body}</section>${marquee}`;
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */
function secPain() {
  const steps = [
    { zh: '找图层', en: 'Find the layer' },
    { zh: '对译文', en: 'Match the string' },
    { zh: '粘贴写入', en: 'Paste the text' },
    { zh: '核对折行', en: 'Check the wrap' },
    { zh: '另存一版', en: 'Save a version' }
  ];
  return `<section class="section">
    <div class="wrap">
      ${secHead(
        { zh: '痛点', en: 'The drag' },
        { zh: '每一版语言，都要把同一套动作再做一遍。', en: 'Every language version runs the same routine again.' },
        { zh: '同一套动作，按语种重复。把重复收进批次，把判断留给你。', en: 'The same routine, once per language. Batch the repetition; keep the judgment.' }
      )}
      <div class="pain-cols reveal">
        <div>
          <h3>${bi({ zh: '一套动作，按语种重复', en: 'One routine, repeated per language' })}</h3>
          ${steps.map((s, i) => `<div class="pain-step"><b>${String(i + 1).padStart(2, '0')}</b><span>${bi(s)}<span class="muted"> · × 12</span></span></div>`).join('')}
          <p class="section-note">${bi({ zh: '这里的 × 12 是流程次数，不是耗时或效率承诺。', en: '× 12 is a step count, not a time or efficiency claim.' })}</p>
        </div>
        <div>
          <h3>${bi({ zh: '真正花时间的，是判断被埋进重复里', en: 'What actually costs time is judgment buried in repetition' })}</h3>
          <p class="og" style="color:var(--muted);font-size:14px;line-height:1.95">${bi({ zh: '撑版要不要改版、换行要不要手动断、字体换了字面高度对不对——这些需要人看。工具能收走的是可以确定的重复写入与核对，不能替你签最终版面。', en: 'Whether overflow needs a layout change, where a line should break, whether a swapped font still balances — those need eyes. A tool can absorb the deterministic write-and-check work; it cannot sign the final layout for you.' })}</p>
          <blockquote class="pull og" style="margin-top:22px">${bi({ zh: '确定的先走，', en: 'Clear items run;' })}<em>${bi({ zh: '拿不准的停下。', en: 'uncertain ones stop.' })}</em></blockquote>
          <a class="link-arrow" href="#/demo">${bi({ zh: '看它怎么工作', en: 'See how it works' })}</a>
        </div>
      </div>
    </div>
  </section>`;
}

function secManifesto() {
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(
        { zh: '立场', en: 'Stance' },
        { zh: '把重复交出去，把判断留下来。', en: 'Hand off repetition. Keep judgment.' },
        { zh: '工具处理已经明确的文字替换；撑版、换行、字体和拿不准的地方，集中留给你。', en: 'The tool handles text replacements that are already decided. Overflow, line breaks, fonts, and anything uncertain are gathered for you.' }
      )}
      <div class="manifesto-list reveal">${manifestoVisual()}</div>
    </div>
  </section>`;
}

function secWorkflow() {
  return `<section class="section">
    <div class="wrap">
      ${secHead(S.workflow.kicker, S.workflow.title, S.workflow.lead)}
      <div class="grid-4 reveal">
        ${S.workflow.steps.map((st) => `<article class="card"><span class="card-num">${esc(st.num)}</span><h3>${bi(st.title)}</h3><p>${bi(st.desc)}</p></article>`).join('')}
      </div>
    </div>
  </section>`;
}

function secFeatures() {
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(S.features.kicker, S.features.title, S.features.lead)}
      <div class="grid-3 reveal">
        ${S.features.items.map((f, i) => `<article class="card"><span class="card-num">${String(i + 1).padStart(2, '0')}</span><h3>${bi(f.title)}</h3><p>${bi(f.desc)}</p></article>`).join('')}
      </div>
      <div class="callout og reveal" style="margin-top:16px"><b>${bi({ zh: '边界', en: 'Boundary' })}</b> · ${bi(S.features.caveat)}</div>
    </div>
  </section>`;
}

function secTypography() {
  const t = S.typography;
  const fontOpts = Object.keys(t.fonts).map((k) => `<option value="${k}" data-zh="${esc(t.fonts[k].zh)}" data-en="${esc(t.fonts[k].en)}">${esc(t.fonts[k].zh)}</option>`).join('');
  const sampleOpts = [
    ['zh', '中文', 'Chinese'], ['en', 'English', 'English'], ['ja', '日本語', 'Japanese'],
    ['th', 'ไทย', 'Thai'], ['ar', 'العربية', 'Arabic'], ['de', 'Deutsch', 'German']
  ].map(([v, zh, en]) => `<option value="${v}" data-zh="${esc(zh)}" data-en="${esc(en)}">${esc(zh)}</option>`).join('');
  const groups = t.groups.map((g, i) => {
    const row = `<div class="fg-row"${i === 0 ? ' data-group' : ''}>
      <span><code>${esc(g.src)}</code></span>
      <span class="fg-map"${i === 0 ? ' data-fg-map' : ''}>${bi(g.map)}</span>
      <span>${esc(g.size)}</span>
      <span${i === 0 ? ' data-fg-weight' : ''}>${esc(g.weight)}</span>
    </div>`;
    if (i !== 0) return row;
    const subs = [
      ['32px · 标题', 'Source Han Sans · 700', '32', '700'],
      ['18px · 正文', 'Source Han Sans · 500', '18', '500'],
      ['14px · 注释', 'Source Han Sans · 400', '14', '400']
    ].map(([a, b, c, d]) => `<div class="fg-row fg-sub"><span>${esc(a)}</span><span>${esc(b)}</span><span>${esc(c)}</span><span>${esc(d)}</span></div>`).join('');
    return row + subs;
  }).join('');
  return `<section class="section" data-lab>
    <div class="wrap">
      ${secHead(t.kicker, t.title, t.lead)}
      <div class="lab reveal">
        <div class="lab-controls">
          <label>${bi(t.controls.font)}<select data-lab-font>${fontOpts}</select></label>
          <div class="ctl-row">
            <label>${bi(t.controls.weight)}<div class="lab-val"><span data-lab-weight-val>700</span></div><input type="range" data-lab-weight min="300" max="900" step="100" value="700" aria-label="Weight"></label>
            <label>${bi(t.controls.leading)}<div class="lab-val"><span data-lab-leading-val>1.50</span></div><input type="range" data-lab-leading min="1" max="2.2" step="0.05" value="1.5" aria-label="Leading"></label>
          </div>
          <label>${bi(t.controls.tracking)}<div class="lab-val"><span data-lab-tracking-val>0</span></div><input type="range" data-lab-tracking min="-50" max="200" step="10" value="0" aria-label="Tracking"></label>
          <label>${bi(t.controls.sample)}<select data-lab-sample>${sampleOpts}</select></label>
          <div class="lab-btn-row">
            <button type="button" class="mini-btn primary" data-lab-apply>${bi(t.controls.apply)}</button>
            <button type="button" class="mini-btn" data-lab-reset>${bi({ zh: '重置', en: 'Reset' })}</button>
          </div>
          <div class="lab-applied" data-lab-applied>${bi({ zh: '已套用到 SourceHanSansSC-Bold 组（示意）', en: 'Applied to the SourceHanSansSC-Bold group (schematic)' })}</div>
        </div>
        <div class="lab-preview">
          <div class="pv-cap"><span>${bi({ zh: '示意排版', en: 'Typography sample' })}</span><span>${bi({ zh: '浏览器实测', en: 'Measured in browser' })}</span></div>
          <h3 data-lab-title>${esc(t.sampleTitle.zh)}</h3>
          <p data-lab-body>${esc(t.sampleBody.zh)}</p>
          <div class="cap">${bi(t.sampleCaption)}</div>
          <div class="lab-readout">
            <span>${bi({ zh: '行数', en: 'Lines' })} <b data-lab-lines>—</b></span>
            <span>${bi({ zh: '高度', en: 'Height' })} <b data-lab-height>—</b></span>
            <span>${bi({ zh: '宽度', en: 'Width' })} <b data-lab-width>—</b></span>
            <span>${bi({ zh: '状态', en: 'State' })} <b data-lab-state>—</b></span>
          </div>
          <div class="spec-row"><span>${bi({ zh: '字体', en: 'Font' })} <b>Source Han Sans</b></span><span>${bi({ zh: '字重', en: 'Weight' })} <b>700</b></span><span>${bi({ zh: '行距', en: 'Leading' })} <b>1.50</b></span><span>${bi({ zh: '字距', en: 'Tracking' })} <b>0</b></span></div>
        </div>
      </div>
      <div class="font-groups reveal">
        <div class="row-between">
          <div>
            <div class="kicker">${bi(t.groupsKicker)}</div>
            <h3 style="margin:6px 0 4px">${bi(t.groupsTitle)}</h3>
            <p class="small muted" style="max-width:620px">${bi(t.groupsLead)}</p>
          </div>
          <label class="switch" style="font-size:10px;color:var(--muted);display:inline-flex;gap:6px;align-items:center"><input type="checkbox" data-lab-split> ${bi(t.groupToggle)}</label>
        </div>
        <div class="fg-row head"><span>${bi({ zh: '源稿脸名', en: 'Source face' })}</span><span>${bi({ zh: '映射', en: 'Mapped to' })}</span><span>${bi({ zh: '字号', en: 'Sizes' })}</span><span>${bi({ zh: '字重', en: 'Weights' })}</span></div>
        ${groups}
      </div>
      <p class="note og">${bi(t.sampleNote)}</p>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* matrix data                                                         */
/* ------------------------------------------------------------------ */
const MATRIX_EXCEPTIONS = {
  '0-1': { status: 'review', planned: 4, rendered: 5, note: { zh: '实测多一行，需看版面', en: 'One extra rendered line; check layout' } },
  '1-6': { status: 'blocked', planned: 1, rendered: '—', note: { zh: '图层已栅格化', en: 'Layer is rasterized' } },
  '3-10': { status: 'fail', planned: 1, rendered: '—', note: { zh: '执行失败，文件未写入', en: 'Execution failed; file not written' } },
  '5-8': { status: 'review', planned: 2, rendered: 3, note: { zh: '泰文组合符号需人工确认', en: 'Thai combining marks need a visual check' } },
  '8-2': { status: 'review', planned: 3, rendered: 2, note: { zh: '实测少一行，需看断点', en: 'One fewer rendered line; check the break' } },
  '10-11': { status: 'blocked', planned: 2, rendered: '—', note: { zh: '智能对象内文字，需先处理', en: 'Text inside a smart object needs preparation' } }
};
const OBJECTS = ['t-headline', 't-body', 't-price', 't-badge', 't-cta', 't-caption'];

function matrixCell(fi, li, lang, opts) {
  const key = fi + '-' + li;
  const ex = MATRIX_EXCEPTIONS[key];
  const status = opts && opts.initial ? 'pending' : (ex ? ex.status : 'done');
  const target = ex ? ex.status : 'done';
  const object = OBJECTS[fi % OBJECTS.length];
  const planned = ex ? ex.planned : 2 + ((fi + li) % 3);
  const rendered = ex ? ex.rendered : planned;
  const note = ex ? ex.note : ((opts && opts.initial) ? { zh: '未开始', en: 'Not started' } : { zh: '段落回车一致', en: 'Paragraph breaks match' });
  return `<button type="button" class="cell" data-status="${status}" data-target="${target}" data-file="${esc(FILES[fi])}" data-lang="${lang}" data-object="${object}" data-source-text="${esc(SOURCE_TEXT)}" data-target-text="${esc(TARGET_TEXT[lang] || SOURCE_TEXT)}" data-planned="${planned}" data-rendered="${esc(rendered)}" data-note-zh="${esc(note.zh)}" data-note-en="${esc(note.en)}" aria-label="${esc(FILES[fi] + '，' + LANG_ZH[lang] + '，' + STATUS_ZH[status])}"></button>`;
}

function secMatrix() {
  const m = S.matrix;
  const header = `<div class="mh">${bi(m.file)}</div>` + LANGS.map((l) => `<div class="mh">${esc(l.code)}</div>`).join('');
  const rows = FILES.map((f, fi) => `<div class="mf" title="${esc(f)}">${esc(f)}</div>` + LANGS.map((l, li) => matrixCell(fi, li, l.code, { initial: true })).join('')).join('');
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(m.kicker, m.title, m.lead)}
      <div class="matrix reveal" data-matrix>
        <div class="matrix-top">
          <div>
            <div class="matrix-title">${bi({ zh: '12 份稿 × 12 个语种', en: '12 drafts × 12 languages' })} <small>${bi(S.misc.simulated)}</small></div>
            <div class="progress" style="max-width:220px"><i data-progress></i></div>
            <span class="tiny muted"><span data-progress-text>0%</span></span>
          </div>
          <div class="matrix-tools">
            <div class="seg">
              <button type="button" data-filter="all" class="on">${bi(m.filterAll)}</button>
              <button type="button" data-filter="review">${bi(m.filterReview)}</button>
              <button type="button" data-filter="issues">${bi(m.filterIssues)}</button>
            </div>
            <button type="button" class="mini-btn primary" data-run>${bi(m.run)}</button>
            <button type="button" class="mini-btn" data-reset>${bi(m.reset)}</button>
          </div>
        </div>
        <div class="matrix-scroll"><div class="matrix-grid">${header}${rows}</div></div>
        <div class="matrix-foot">
          <div class="legend">${S.matrix.legend.map((x, i) => `<span><i class="dot ${['done', 'review', 'blocked', 'fail', 'pending'][i]}"></i>${bi(x)}</span>`).join('')}</div>
          <div class="counts">
            <span>${bi(m.counts)} <b data-count="done">0</b></span>
            <span>${bi(m.countsReview)} <b data-count="review">0</b></span>
            <span>${bi(m.countsIssues)} <b data-count="issues">0</b></span>
          </div>
        </div>
        <div class="inspector" data-inspector>
          <div class="ins-empty">${bi(m.inspectorEmpty)}</div>
          <div class="ins-grid">
            <div><small>${bi(m.obj)}</small><b data-ins="object">—</b></div>
            <div><small>${bi(m.file)}</small><b data-ins="file">—</b></div>
            <div><small>${bi(m.lang)}</small><b data-ins="language">—</b></div>
            <div><small>${bi(m.source)}</small><b data-ins="source">—</b></div>
            <div><small>${bi(m.target)}</small><b data-ins="target">—</b></div>
            <div><small>${bi(m.planned)}</small><b data-ins="planned">—</b></div>
            <div><small>${bi(m.rendered)}</small><b data-ins="rendered">—</b></div>
            <div><small>${bi(m.noteLabel)}</small><b data-ins="note">—</b></div>
            <div><small>${bi({ zh: '状态', en: 'Status' })}</small><span class="st-badge" data-ins="status">—</span></div>
          </div>
        </div>
        <div class="matrix-note">${bi(m.runNote)} · ${bi(m.note)}</div>
      </div>
    </div>
  </section>`;
}

function secWrap() {
  const w = S.wrap;
  return `<section class="section">
    <div class="wrap">
      ${secHead(w.kicker, w.title, w.lead)}
      <div class="wrap-demo reveal" data-wrap>
        <div class="canvas">
          <span class="scan"></span>
          <div class="canvas-inner">
            <div class="ps-label">${bi({ zh: '示意图层 · 宽度可调', en: 'Schematic layer · adjustable width' })}</div>
            <div class="canvas-h">${bi({ zh: '窄图层里的长译文', en: 'Long copy in a narrow layer' })}</div>
            <p>${biBr({ zh: '先判断能不能放下，<br>再决定怎么改版。<br>放不下的位置进例外清单，<br>不悄悄缩字号，<br>也不把「不知道」写成「成功」。', en: 'Check whether it fits,<br>then decide how to rework.<br>What does not fit goes to exceptions;<br>type is not silently shrunk,<br>and unknown is never written up as success.' })}</p>
          </div>
        </div>
        <div class="readback">
          <label class="small">${bi({ zh: '图层宽度', en: 'Layer width' })}<input type="range" data-wrap-width min="220" max="520" step="10" value="300" aria-label="Layer width" style="width:100%"></label>
          <div class="canvas-mode">
            <button type="button" class="mini-btn on" data-mode="paragraph" aria-pressed="true">${bi(w.modeParagraph)}</button>
            <button type="button" class="mini-btn" data-mode="box" aria-pressed="false">${bi(w.modeBox)}</button>
          </div>
          <div class="rb-row"><span>${bi(w.planned)}</span><b data-rb-planned>—</b></div>
          <div class="rb-row"><span>${bi(w.rendered)}</span><b data-rb-rendered>—</b></div>
          <div class="rb-status" data-rb-status data-state="ok">
            <span class="ok-txt">${bi(w.ok)}</span>
            <span class="warn-txt">${bi(w.warn)}</span>
            <span class="box-txt">${bi({ zh: '由 Photoshop 折行；这里只显示实测行数', en: 'Photoshop wraps the box; only rendered lines are shown' })}</span>
          </div>
          <button type="button" class="mini-btn btn-block" data-readback style="margin-top:10px">${bi(w.button)}</button>
          <p class="tiny muted" style="margin-top:8px">${bi({ zh: '示意动画 · 不做真实回读', en: 'Schematic animation; no real read-back' })}</p>
        </div>
      </div>
      <div class="orphan-demo reveal" data-orphan>
        <div class="orphan-head">
          <span class="mono small">${bi(w.orphanTitle)}</span>
          <label class="switch"><input type="checkbox"> ${bi(w.orphanAllow)}</label>
        </div>
        <div class="orphan-line demo">${esc('单字不能成行这是排版的规则')}</div>
        <div class="orphan-tag">${bi(w.orphanLast)} <b data-orphan-count>1</b> ${bi(w.orphanChars)}</div>
        <p class="orphan-caption">${bi(w.orphanNote)}</p>
      </div>
      <p class="note og">${bi(w.note)}</p>
    </div>
  </section>`;
}

function secProof() {
  const p = S.proof;
  const statusClass = { done: 'done', review: 'review', blocked: 'blocked', fail: 'fail', pending: 'pending' };
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(p.kicker, p.title, p.lead)}
      <div class="report reveal">
        <div class="report-head">
          <span class="mono small">A+_01 · de · execution-report</span>
          ${schematic(p.note)}
        </div>
        <div class="report-table-wrap">
          <table class="report-table">
            <thead><tr>${p.headers.map((h) => `<th>${bi(h)}</th>`).join('')}</tr></thead>
            <tbody>${p.rows.map((r) => `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td><span class="st-badge ${statusClass[r[4]] || ''}">${bi({ zh: STATUS_ZH[r[4]] || r[4], en: STATUS_EN[r[4]] || r[4] })}</span></td><td>${bi(r[5])}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="report-note"><span>${bi({ zh: '示意报告 · 非真实项目数据', en: 'Schematic report · not real project data' })}</span><span>${bi({ zh: '文字回读 ≠ 视觉或语义验收', en: 'Read-back ≠ visual or semantic QA' })}</span></div>
      </div>
      <div class="grid-3 reveal" style="margin-top:16px">
        ${p.guide.map((g, i) => `<article class="card"><span class="card-num">0${i + 1}</span><p>${bi(g)}</p></article>`).join('')}
      </div>
    </div>
  </section>`;
}

function secFit() {
  const f = S.fit;
  return `<section class="section">
    <div class="wrap">
      ${secHead(f.kicker, f.title, f.lead)}
      <div class="fit-grid reveal">
        <article class="card">
          <h3>${bi(f.suitableTitle)}</h3>
          <ul class="fit-list yes">${f.suitable.map((x) => `<li><span>${bi(x)}</span></li>`).join('')}</ul>
        </article>
        <article class="card">
          <h3>${bi(f.notTitle)}</h3>
          <ul class="fit-list no">${f.not.map((x) => `<li><span>${bi(x)}</span></li>`).join('')}</ul>
        </article>
      </div>
      <div class="grid-2 reveal" style="margin-top:16px">
        <article class="card">
          <h3>${bi(f.compatTitle)}</h3>
          <div class="compat-list">${f.compat.map((x) => `<div>${bi(x)}</div>`).join('')}</div>
        </article>
        <article class="card">
          <h3>${bi(f.checklistTitle)}</h3>
          <ol class="checklist">${f.checklist.map((x) => `<li>${bi(x)}</li>`).join('')}</ol>
        </article>
      </div>
    </div>
  </section>`;
}

function secData() {
  const d = S.data;
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(d.kicker, d.title, d.lead)}
      <div class="reveal">
        <table class="data-table">
          <thead><tr>${d.headers.map((h) => `<th>${bi(h)}</th>`).join('')}</tr></thead>
          <tbody>${d.rows.map((r) => `<tr><td>${bi(r[0])}</td><td>${bi(r[1])}</td></tr>`).join('')}</tbody>
        </table>
        <p class="small muted" style="margin-top:10px">${bi(d.note)}
          <a class="link-arrow" href="${OFFICIAL.privacy}" target="_blank" rel="noopener">${bi(d.privacy)}</a>
          <a class="link-arrow" href="${OFFICIAL.subprocessors}" target="_blank" rel="noopener">${bi(d.subprocessors)}</a>
        </p>
      </div>
    </div>
  </section>`;
}

function secFaq() {
  return `<section class="section">
    <div class="wrap">
      ${secHead(S.faq.kicker, S.faq.title)}
      <div class="faq reveal">
        ${S.faq.items.map((x) => `<details><summary class="og">${bi(x.q)}</summary><p class="og">${bi(x.a)}</p></details>`).join('')}
      </div>
    </div>
  </section>`;
}

function secCta() {
  return `<section class="section">
    <div class="wrap">
      <div class="cta-band reveal">
        <div>
          <h2 class="og">${bi({ zh: '拿一套正在改语言的稿，跑一次。', en: 'Run one draft you are already localizing.' })}</h2>
          <p class="og">${bi({ zh: '申请阶段不需要上传 PSD 或译文表。用同一套稿、同一份译文、同一套最终检查标准，跑完再谈是否继续。', en: 'No PSD or table needed to apply. Same draft, same copy, same final QA standard — run it, then decide.' })}</p>
          <div class="hero-note" style="margin-top:12px"><span class="dot"></span>${bi(S.cta.micro)}</div>
        </div>
        <div class="cta-actions">
          <a class="btn btn-primary" href="#/apply">${bi(S.cta.apply)}</a>
          <a class="btn btn-ghost" href="#/demo">${bi(S.cta.demo)}</a>
        </div>
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* page views                                                          */
/* ------------------------------------------------------------------ */
const SITE_PANELS = [
  {
    code: 'de', zh: '德语', en: 'German',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '复合词连成一片，同一句译文在标题里占的宽度会变。', en: 'Compounds run together, so the same sentence takes a different width in a headline.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '折行位置跟着变，行距和段距要再看一遍。', en: 'Line breaks move, so leading and paragraph spacing need another look.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '标题层有没有留出第二行的位置。', en: 'Whether the headline layer has room for a second line.' } }
    ]
  },
  {
    code: 'fr', zh: '法语', en: 'French',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '译文常比英文长，短标题也会被撑开。', en: 'Copy often runs longer than the English, and short headlines stretch too.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '折行位置前移，段距观感会变松或变紧。', en: 'Breaks move forward, so paragraph rhythm reads looser or tighter.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '五点描述的每一行是否已经定稿。', en: 'Whether every bullet line is final.' } }
    ]
  },
  {
    code: 'es', zh: '西语', en: 'Spanish',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '句子偏长，同一句在窄栏里会多占半行。', en: 'Sentences run long, so the same line takes extra room in a narrow column.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '五点描述容易挤出一行，A+ 里的短句也可能顶边。', en: 'Bullets can spill onto another line, and short A+ lines can reach the edge.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '窄栏里那句是否必须整句放下。', en: 'Whether that narrow-column sentence has to fit in one piece.' } }
    ]
  },
  {
    code: 'ja', zh: '日语', en: 'Japanese',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '字形宽度和拉丁字母不同，同一字号观感会变。', en: 'Glyph width differs from Latin, so the same point size reads differently.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '按字符折行，标点会落在行首或行尾。', en: 'Lines break per character, so punctuation can land at a line start or end.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '标点禁则需不需要人工过一眼。', en: 'Whether line-start punctuation rules need a human pass.' } }
    ]
  },
  {
    code: 'ar', zh: '阿语', en: 'Arabic',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '从右往左排，标点、括号和单位的方向要单独看。', en: 'Text runs right to left, so punctuation, brackets, and units need their own check.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '数字仍从左往右读，和周围文字混排时容易错位。', en: 'Digits still read left to right and can misalign against the surrounding text.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '手上有没有对应的 RTL 版式稿。', en: 'Whether you have an RTL layout to write into.' } }
    ]
  },
  {
    code: 'th', zh: '泰语', en: 'Thai',
    rows: [
      { k: { zh: '文字侧', en: 'Type' }, v: { zh: '元音和声调落在基字上下，行距太紧会挤在一起。', en: 'Vowels and tone marks sit above and below the base, and tight leading crowds them.' } },
      { k: { zh: '版面侧', en: 'Layout' }, v: { zh: '词间没有空格，折行按音节，行尾会断开一个词。', en: 'There are no spaces between words; lines break by syllable and cut words at the end.' } },
      { k: { zh: '先核这个', en: 'Check first' }, v: { zh: '目标字体是否覆盖泰文。', en: 'Whether the target font covers Thai.' } }
    ]
  }
];

function secSites() {
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(
        { zh: '逐站点', en: 'By marketplace' },
        { zh: '换一个站点，变的不只是文字。', en: 'A new marketplace changes more than the words.' },
        { zh: '同一张 A+ 图放到不同站点，字宽、折行、行距和三行标题的呼吸都不一样。点开看这一个站点先变什么。', en: 'The same A+ image lands differently in each marketplace: width, breaks, leading, and the room a headline needs. Open one to see what shifts first.' }
      )}
      <div class="site-board" data-sites>
        <div class="site-tabs">${SITE_PANELS.map((p, i) => `<button type="button" data-site-tab="${p.code}" aria-pressed="${i === 0 ? 'true' : 'false'}" class="${i === 0 ? 'on' : ''}">${bi({ zh: p.zh, en: p.en })}</button>`).join('')}</div>
        <div class="site-panels">${SITE_PANELS.map((p, i) => `<div class="site-panel" data-site-panel="${p.code}"${i === 0 ? '' : ' hidden'}>
          <dl>${p.rows.map((r) => `<dt>${bi(r.k)}</dt><dd>${bi(r.v)}</dd>`).join('')}</dl>
        </div>`).join('')}</div>
        <p class="tiny muted" style="margin-top:10px">${bi({ zh: '排版差异为通用经验 · 平台规则与尺寸以各站点后台为准', en: 'Typographic notes are general; platform rules and specs follow each marketplace’s own backend.' })}</p>
      </div>
    </div>
  </section>`;
}

const PREFLIGHT = [
  { t: { zh: '译文已确认', en: 'Copy approved' }, d: { zh: '术语、口径、语气已经定稿，工具只负责写入。', en: 'Terms, tone, and wording are final; the tool only writes them in.' }, who: { zh: '你确认', en: 'You' } },
  { t: { zh: '文字层可编辑', en: 'Text layers editable' }, d: { zh: '要改的字仍是文字，没有被栅格化成图。', en: 'The text to change lives in editable text layers.' }, who: { zh: '你确认', en: 'You' } },
  { t: { zh: '每个站点有自己的表', en: 'A table per marketplace' }, d: { zh: '一份多语言总表，或几份单语言表，执行前先对齐。', en: 'One multilingual sheet or several single-language sheets, aligned before the run.' }, who: { zh: '你确认', en: 'You' } },
  { t: { zh: '主图与 A+ 的规则', en: 'Hero and A+ rules' }, d: { zh: '按卖家后台当期规则执行，这一页不替平台下结论。', en: 'Follow the current rules in your seller backend; this page states no platform policy.' }, who: { zh: '平台后台', en: 'Backend' } },
  { t: { zh: '字体授权覆盖', en: 'Font licensing' }, d: { zh: '目标语言的字体要在授权范围内，否则照样要换。', en: 'Target-language fonts must be licensed, or they still have to be swapped.' }, who: { zh: '你或乙方', en: 'You or vendor' } },
  { t: { zh: '最终版面逐语种看', en: 'Look at every language' }, d: { zh: '回读只管文字与行数，版面和语义仍要人确认。', en: 'Read-back covers text and line counts; layout and meaning still need a person.' }, who: { zh: '你确认', en: 'You' } }
];

function secPreflight() {
  return `<section class="section">
    <div class="wrap">
      ${secHead(
        { zh: '上线前', en: 'Before publishing' },
        { zh: '这六件事，仍然要你确认。', en: 'Six things still need you.' },
        { zh: '工具负责写入与回读。下面六件在工具之外，逐条核一遍再上架。', en: 'The tool handles writing and read-back. These six sit outside it; check each before the listing goes live.' }
      )}
      <ol class="preflight reveal">${PREFLIGHT.map((p, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span class="pf-t">${bi(p.t)}<br><span class="muted">${bi(p.d)}</span></span><span class="pf-who">${bi(p.who)}</span></li>`).join('')}</ol>
    </div>
  </section>`;
}

const SCOPE_ROWS = [
  { name: { zh: '译文审校', en: 'Copy review' }, sub: { zh: '术语、口径、语气由人定，工具不碰译文内容。', en: 'Terms, tone, and word choice are human calls; the tool leaves copy alone.' }, who: 'vendor' },
  { name: { zh: '找文字层', en: 'Find layers' }, sub: { zh: '哪一层放哪一句，按命名或位置对上。', en: 'Which layer holds which string, matched by name or position.' }, who: 'tool' },
  { name: { zh: '对译匹配', en: 'Match strings' }, sub: { zh: '原文与译文一一对应，重复原文单独列出。', en: 'Source and translation paired one to one; duplicate sources listed apart.' }, who: 'tool' },
  { name: { zh: '批量写入', en: 'Batch write' }, sub: { zh: '12 份稿跨多个语种，一次准备。', en: 'Twelve drafts across languages, prepared in one pass.' }, who: 'tool' },
  { name: { zh: '回读行数', en: 'Read back lines' }, sub: { zh: '写入后量渲染行数，计划与实测分开写。', en: 'Rendered lines measured after writing; planned and measured kept apart.' }, who: 'tool' },
  { name: { zh: '例外判断', en: 'Exceptions' }, sub: { zh: '撑版、歧义、栅格化的位置停下来等人。', en: 'Overflow, ambiguity, and rasterized layers stop for a person.' }, who: 'you' },
  { name: { zh: '最终版面', en: 'Final layout' }, sub: { zh: '逐语种目视，签字仍然归人。', en: 'Seen language by language; the sign-off stays human.' }, who: 'you' }
];
const SCOPE_LANES = [
  ['vendor', { zh: '乙方', en: 'Vendor' }],
  ['tool', { zh: '工具', en: 'Tool' }],
  ['you', { zh: '你', en: 'You' }]
];

function secScope() {
  return `<section class="section" style="background:var(--soft)">
    <div class="wrap">
      ${secHead(
        { zh: '分工', en: 'Split the work' },
        { zh: '七段活，先看谁在做。', en: 'Seven stages. Who owns which?' },
        { zh: '摆开看，重复的是中间那四段。点一下可以换人做，再看一眼你团队现在是怎么分的。', en: 'Laid out, the middle four are the ones that repeat. Click to reassign and compare that with how your team splits it today.' }
      )}
      <div class="scope-board reveal" data-scope>
        <div class="scope-legend">${bi({ zh: '点一下换人做 · 分工为示意，实际按你们的合同', en: 'Click to reassign · schematic only; your contract decides in practice' })}</div>
        ${SCOPE_ROWS.map((r, i) => `<div class="scope-row" data-scope-row="${i}">
          <span class="scope-name">${bi(r.name)}<small>${bi(r.sub)}</small></span>
          <div class="scope-opts" role="group">${SCOPE_LANES.map(([key, label]) => `<button type="button" data-scope-set="${key}" aria-pressed="${r.who === key ? 'true' : 'false'}">${bi(label)}</button>`).join('')}</div>
        </div>`).join('')}
        <p class="scope-sum" data-scope-sum></p>
      </div>
      <p class="tiny muted" style="margin-top:10px">${bi({ zh: '这里的分工是示意。每家合同不一样，工具接手哪几段，要在你们自己的流程里定。', en: 'This split is schematic. Contracts differ; which stages the tool takes is your call inside your own process.' })}</p>
    </div>
  </section>`;
}

const SECTION_MAP = {
  pain: secPain,
  manifesto: secManifesto,
  workflow: secWorkflow,
  features: secFeatures,
  typography: secTypography,
  matrix: secMatrix,
  wrap: secWrap,
  proof: secProof,
  fit: secFit,
  data: secData,
  faq: secFaq,
  sites: secSites,
  preflight: secPreflight,
  scope: secScope,
  'apply-cta': secCta
};

export function homePage(v) {
  const mods = v.modules.slice();
  if (mods[0] === v.visual) mods.shift();
  const sections = mods.map((m) => (SECTION_MAP[m] ? SECTION_MAP[m]() : '')).join('');
  const hasCta = v.modules.indexOf('apply-cta') >= 0;
  return `<div class="page" id="view-home">${hero(v)}${sections}${hasCta ? '' : secCta()}</div>`;
}

function pageHead(kicker, title, lead) {
  return `<div class="page-head"><div class="wrap">
    <div class="kicker">${bi(kicker)}</div>
    <h1 class="og">${bi(title)}</h1>
    <p class="og">${bi(lead)}</p>
  </div></div>`;
}

export function demoPage() {
  return `<div class="page" id="view-demo">
    ${pageHead(S.views.demo.kicker, S.views.demo.title, S.views.demo.lead)}
    ${secMatrix()}
    ${secTypography()}
    ${secWrap()}
  </div>`;
}

export function fitPage(v) {
  return `<div class="page" id="view-fit">
    ${pageHead(S.views.fit.kicker, S.views.fit.title, S.views.fit.lead)}
    ${secFit()}
    <section class="section section-tight"><div class="wrap">
      <div class="grid-1-2">
        <div>
          <div class="kicker">${bi({ zh: '三项自查', en: 'Three checks' })}</div>
          <h2 class="h2 og" style="margin:10px 0 8px">${bi({ zh: '先判断适不适合，再谈省不省。', en: 'First, is it a fit? Then talk about savings.' })}</h2>
          <p class="lead og">${bi({ zh: '三项都在示意范围内，仍然只是可以进入试跑确认；不是兼容性承诺。', en: 'All three within the schematic range only means you can move to a pilot check. It is not a compatibility guarantee.' })}</p>
        </div>
        ${quizBlock('qz-f', false)}
      </div>
    </div></section>
    ${secData()}
  </div>`;
}

export function applyPage() {
  const a = S.apply;
  return `<div class="page" id="view-apply">
    ${pageHead(a.kicker, a.title, a.lead)}
    <section class="section">
      <div class="wrap">
        <div class="grid-2-1">
          <div class="reveal" data-apply>
            <form novalidate>
              <div class="form-grid">
                <div class="field"><label for="ap-name">${bi(a.name)}</label><input id="ap-name" name="name" data-apply-name data-ph-zh="${esc(a.namePh.zh)}" data-ph-en="${esc(a.namePh.en)}" placeholder="${esc(a.namePh.zh)}" autocomplete="name"></div>
                <div class="field"><label for="ap-email">${bi(a.email)}</label><input id="ap-email" name="email" type="email" data-apply-email data-ph-zh="${esc(a.emailPh.zh)}" data-ph-en="${esc(a.emailPh.en)}" placeholder="${esc(a.emailPh.zh)}" autocomplete="email"></div>
                <div class="field full"><label for="ap-wechat">${bi(a.wechat)}</label><input id="ap-wechat" name="wechat" data-apply-wechat data-ph-zh="${esc(a.wechatPh.zh)}" data-ph-en="${esc(a.wechatPh.en)}" placeholder="${esc(a.wechatPh.zh)}"></div>
                <div class="field full"><label for="ap-project">${bi(a.project)}</label><textarea id="ap-project" name="project" data-apply-project data-ph-zh="${esc(a.projectPh.zh)}" data-ph-en="${esc(a.projectPh.en)}" placeholder="${esc(a.projectPh.zh)}"></textarea></div>
              </div>
              <div class="form-note" data-apply-error hidden style="color:#b42318"></div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">${bi(a.submit)}</button>
                <button type="button" class="btn btn-ghost" data-apply-reset>${bi(a.reset)}</button>
              </div>
              <p class="form-note">${bi(a.note)}</p>
            </form>
            <div class="local-summary" data-apply-summary>
              <b>${bi(a.localTitle)}</b>
              <p class="small muted">${bi(a.localDesc)}</p>
              <pre data-apply-pre></pre>
              <div class="copy-row"><button type="button" class="mini-btn" data-apply-copy>${bi(a.copy)}</button></div>
            </div>
          </div>
          <div>
            <div class="contact-card reveal" style="margin-bottom:14px">
              <h3 style="margin:0 0 10px;font-size:15px">${bi(a.nextTitle)}</h3>
              <ol class="checklist" style="grid-template-columns:1fr">${a.next.map((x) => `<li>${bi(x)}</li>`).join('')}</ol>
            </div>
            <div class="contact-card reveal">
              <h3 style="margin:0 0 8px;font-size:15px">${bi(a.contactTitle)}</h3>
              <div class="cr"><span>${bi(a.wechatLabel)}</span><b>${esc(OFFICIAL.wechat)}</b></div>
              <div class="cr"><span>${bi(a.emailLabel)}</span><b>${esc(OFFICIAL.email)}</b></div>
              <div class="cr"><span>${bi({ zh: '正式站', en: 'Official site' })}</span><b><a href="${OFFICIAL.home}" target="_blank" rel="noopener">tuyigf.com</a></b></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

export function strip(v) {
  const chips = S.chips.map((c) => `<span>${esc(c.zh)} · ${esc(c.en)}</span>`).join('');
  if (v.theme === 'promo' || v.theme === 'manifesto' || v.theme === 'lookbook') {
    return `<div class="marquee" aria-hidden="true"><div class="marquee-track">${chips}${chips}</div></div>`;
  }
  return '';
}

export { bi, esc };
