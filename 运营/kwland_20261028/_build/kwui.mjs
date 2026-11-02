/* 渲染层：7 种承接形态 → 区块。
   约定：kw.css 出样式，client.js 出交互钩子（data-demo / data-transpose / data-checklist）。
   钩子与 client.js 里的选择器必须对齐，改一边就要改另一边。 */

import { themes, LANGS, pages, excluded, BOUNDARY_COMMON } from './kwdata.mjs';

export const SHAPE = {
  tutorial: { zh: '教程型', en: 'Tutorial' },
  compare: { zh: '对比型', en: 'Comparison' },
  checklist: { zh: '清单型', en: 'Checklist' },
  landing: { zh: '落地页型', en: 'Landing' },
  technical: { zh: '技术说明型', en: 'Technical' },
  qa: { zh: '问答型', en: 'Q&A' },
  brand: { zh: '品牌澄清型', en: 'Brand clarity' }
};

const PRIMARY = {
  tutorial: { id: 'steps', zh: '看工序', en: 'See the stages' },
  compare: { id: 'cmp', zh: '看几条路', en: 'See the routes' },
  checklist: { id: 'chk', zh: '拿清单', en: 'Take the checklist' },
  landing: { id: 'steps', zh: '看三步', en: 'See the steps' },
  technical: { id: 'mech', zh: '看分类', en: 'See the classes' },
  qa: { id: 'qa', zh: '看问答', en: 'See the answers' },
  brand: { id: 'scope', zh: '看范围', en: 'See the scope' }
};

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const bi = (o, cls) => {
  const c = cls ? ' ' + cls : '';
  return `<span class="zh${c}">${esc(o.zh)}</span><span class="en${c}">${esc(o.en)}</span>`;
};

export const siteFileName = (v) => `${v.id}-${v.slug}.html`;

/* ---------------- 通用块 ---------------- */

function sec(id, kicker, h2, lead, body, label, cls) {
  return {
    id, label,
    html: `<section class="kw-sec${cls ? ' ' + cls : ''}" id="${id}"><div class="wrap">
      <div class="kw-head"><div>${kicker ? `<div class="kicker">${bi(kicker)}</div>` : ''}<h2 class="og">${bi(h2)}</h2></div>${lead ? `<p class="og">${bi(lead)}</p>` : ''}</div>
      ${body}
    </div></section>`
  };
}

function cards(items, cls) {
  return `<div class="${cls || 'cards3'}">${items.map((c) => `<article class="icard">${c.k || ''}<h3 class="og">${bi(c.title)}</h3>${c.body ? `<p class="og">${bi(c.body)}</p>` : ''}</article>`).join('')}</div>`;
}

function stepsBlock(items) {
  return `<div class="steps3">${items.map((s) => `<article class="step"><span class="n">${s.no}</span><h3 class="og">${bi(s.title)}</h3><p class="og">${bi(s.body)}</p></article>`).join('')}</div>`;
}

function wontBlock(items) {
  return `<ul class="wont">${items.map((t) => `<li class="og">${bi(t)}</li>`).join('')}</ul>`;
}

/* ---------------- 各形态 ---------------- */

function tutorial(v) {
  const S = [];
  S.push(sec('steps',
    { zh: '工序', en: 'Stages' },
    { zh: '这活分三段', en: 'The job splits into three stages' },
    { zh: '顺序不能反：先找、再写、最后读一遍。', en: 'The order does not reverse: find, write, then read once more.' },
    stepsBlock(v.steps),
    { zh: '工序', en: 'Stages' }));
  S.push(sec('pains',
    { zh: '卡点', en: 'Snags' },
    { zh: '卡住的地方通常在这三处', en: 'It usually snags in three places' },
    { zh: '三处都不在打字速度上。', en: 'None of them is typing speed.' },
    cards(v.pains, 'cards3'),
    { zh: '卡点', en: 'Snags' }));
  return S;
}

function compare(v) {
  const labels = v.rowLabels || [];
  const n = v.routes[0].rows.length;
  if (labels.length !== n) throw new Error(`rowLabels ${labels.length} ≠ rows ${n}（${v.slug}）`);
  v.routes.forEach((r) => {
    if (r.rows.length !== n) throw new Error(`route rows 不一致：${v.slug}/${r.name.zh}`);
  });

  const head = `<tr><th>${bi({ zh: '项目', en: 'Item' })}</th>${v.routes.map((r) => `<th class="a">${bi(r.name)}</th>`).join('')}</tr>`;
  const body = labels.map((l, i) => `<tr><th>${bi(l)}</th>${v.routes.map((r) => `<td class="og">${bi(r.rows[i])}</td>`).join('')}</tr>`).join('');

  const table = `<div class="tp-wrap" data-transpose>
    <div class="swipe-hint og">${bi({ zh: '窄屏：这张表可以左右滑', en: 'Narrow screen: slide this table sideways' })}</div>
    <div class="tp-bar">
      <span class="hint og">${bi({ zh: '同一件事，按路线看或按项目看。', en: 'The same thing, read by route or by item.' })}</span>
      <button class="btn btn-sm" type="button" data-tp-toggle aria-pressed="false">按项目看</button>
    </div>
    <div class="tp-scroll" tabindex="0" role="region" aria-label="${bi({ zh: '对比表，窄屏下可左右滑', en: 'Comparison table, slides sideways when narrow' })}"><table class="tp"><thead>${head}</thead><tbody>${body}</tbody></table></div>
  </div>`;

  return [sec('cmp',
    { zh: '对比', en: 'Compare' },
    { zh: '摆在一起看', en: 'Side by side' },
    { zh: '切换在右上角，两种读法对同一张表。', en: 'Switch in the corner; both readings share one table.' },
    table,
    { zh: '对比', en: 'Compare' })];
}

function checklist(v) {
  const colHead = LANGS.map((lg) => `<th scope="col" data-colhead="${attr(lg.code)}" title="${attr(lg.name)}"><b>${lg.code.toUpperCase()}</b><span data-count>— / ${v.checks.length}</span></th>`).join('');
  const rowsHtml = v.checks.map((c, i) => {
    const cells = LANGS.map((lg) => {
      const id = `${v.id}-${lg.code}-${i}`;
      return `<td><label class="chk-cell" for="${id}"><input type="checkbox" id="${id}" data-col="${attr(lg.code)}"><span class="box" aria-hidden="true">✓</span><span class="sr">${bi({ zh: lg.name, en: lg.en })} · ${bi(c)}</span></label></td>`;
    }).join('');
    return `<tr><th scope="row">${bi(c)}</th>${cells}</tr>`;
  }).join('');

  const box = `<div data-checklist="${attr(v.id)}">
    <div class="chk-scroll" tabindex="0" role="region" aria-label="${bi({ zh: '交付清单十二列，窄屏下可左右滑', en: 'Twelve-column checklist, slides sideways when narrow' })}">
      <table class="chk-mx">
        <caption class="sr">${bi({ zh: '六项交付检查 × 十二个语种，共 ' + (LANGS.length * v.checks.length) + ' 格',
          en: 'Six delivery checks × twelve languages, ' + (LANGS.length * v.checks.length) + ' cells' })}</caption>
        <thead><tr><th scope="col">${bi({ zh: '检查项', en: 'Check' })}</th>${colHead}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="swipe-hint og">${bi({ zh: '窄屏：这张表可以左右滑', en: 'Narrow screen: slide this table sideways' })}</div>
    <div class="chk-foot">
      <span class="og">${bi({ zh: '整批勾完是 ' + (LANGS.length * v.checks.length) + ' 项。勾选只存在你这台机器的浏览器里。',
        en: 'The full batch is ' + (LANGS.length * v.checks.length) + ' ticks. Ticks stay in this browser only.' })}</span>
      <span><b data-total aria-live="polite">— / ${LANGS.length * v.checks.length}</b><button class="btn btn-sm" type="button" data-reset style="margin-left:12px">${bi({ zh: '清空', en: 'Reset' })}</button></span>
    </div>
  </div>`;

  const S = [sec('chk',
    { zh: '清单', en: 'Checklist' },
    { zh: '六项 × 十二语种，一张表勾完', en: 'Six checks × twelve languages, one sheet' },
    { zh: '勾的是「能不能交」，翻译对不对另说。', en: 'You are ticking shippability. Accuracy is a different question.' },
    box,
    { zh: '清单', en: 'Checklist' })];

  if (v.after) {
    S.push(sec('after',
      { zh: '提醒', en: 'Note' },
      { zh: '勾满不等于对', en: 'All ticked is not all right' },
      null,
      `<p class="section-note og">${bi(v.after)}</p>`,
      { zh: '提醒', en: 'Note' }));
  }
  return S;
}

function landing(v) {
  const S = [];
  S.push(sec('steps',
    { zh: '三步', en: 'Three steps' },
    { zh: '三步，每步都能停', en: 'Three steps, and you can stop at any of them' },
    { zh: '停在第一步也是一个结果，至少知道差什么。', en: 'Stopping at step one is still a result: you know what is missing.' },
    stepsBlock(v.three),
    { zh: '三步', en: 'Three steps' }));

  if (v.zoom) {
    S.push(sec('zoom',
      { zh: '细节', en: 'Detail' },
      { zh: '写回去的时候，这些跟着走', en: 'What travels with the text' },
      { zh: '它们在「写回去」这个词的范围之内，属于必需件。', en: 'Writing back means these, by definition.' },
      cards(v.zoom.map((z) => ({ k: `<span class="k">${bi(z.k)}</span>`, title: z.v })), 'cards2'),
      { zh: '细节', en: 'Detail' }));
  }

  if (v.states) {
    const st = v.states.map((s) => `<article class="icard"><span class="st-badge ${s.tone === 'ok' ? 'done' : s.tone === 'warn' ? 'review' : 'blocked'}">${bi(s.k)}</span><p class="og" style="margin-top:10px">${bi(s.v)}</p></article>`).join('');
    S.push(sec('states',
      { zh: '回读', en: 'Read-back' },
      { zh: '写完读回来，只有三种结果', en: 'Reading back gives three outcomes' },
      { zh: '三态分不清，报告就没有用。', en: 'If the three are not distinct, the report is useless.' },
      `<div class="cards3">${st}</div>`,
      { zh: '回读', en: 'Read-back' }));
  }
  return S;
}

function technical(v) {
  const m = v.mech;
  const mech = `<div class="mech">
    <article class="mech-card ok"><span class="tag">${bi({ zh: '可编辑', en: 'Editable' })}</span><div class="mech-tree"><b>T</b> ${bi({ zh: '标题 / 副标题 / 角标', en: 'headline / subhead / corner mark' })}<br><b>T</b> ${bi({ zh: '正文', en: 'body copy' })}<br><span>${bi({ zh: '组 · 图 · 蒙版', en: 'groups, images, masks' })}</span></div><p class="og">${bi(m.ok)}</p></article>
    <article class="mech-card"><span class="tag">${bi({ zh: '够不着', en: 'Out of reach' })}</span><div class="mech-tree"><b>◇</b> ${bi({ zh: '智能对象', en: 'smart object' })}<br><span>└ ${bi({ zh: '要打开源文件', en: 'open the source' })}</span></div><p class="og">${bi(m.pivot)}</p></article>
    <article class="mech-card"><span class="tag">${bi({ zh: '不可编辑', en: 'Not editable' })}</span><div class="mech-tree"><span>▨ ${bi({ zh: '像素', en: 'pixels' })}</span><br><span>▨ ${bi({ zh: '合并层', en: 'merged' })}</span><br><span>▨ ${bi({ zh: '文字转曲', en: 'outlined' })}</span></div><p class="og">${bi(m.bad)}</p></article>
  </div>`;

  const cases = `<div class="cards3">${v.cases.map((c, i) => `<article class="icard"><span class="k">${String(i + 1).padStart(2, '0')}</span><h3 class="og">${bi(c.title)}</h3><p class="og">${bi(c.body)}</p></article>`).join('')}</div>`;

  return [
    sec('mech',
      { zh: '机制', en: 'Mechanism' },
      { zh: '三种文字，三种命运', en: 'Three kinds of text, three outcomes' },
      { zh: '先看稿子属于哪一种，再谈工具。', en: 'Classify the file before talking tools.' },
      mech,
      { zh: '机制', en: 'Mechanism' }),
    sec('cases',
      { zh: '六种情况', en: 'Six cases' },
      { zh: '对照着看你的稿', en: 'Check your file against the list' },
      { zh: '从上往下走一遍，哪一条对上就用哪一条的结论。', en: 'Go down the list; the first line that matches gives you the answer.' },
      cases,
      { zh: '六种情况', en: 'Six cases' })
  ];
}

function qa(v) {
  const list = `<div class="faq">${v.questions.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary class="og">${bi(q.q)}</summary><p class="og">${bi(q.a)}</p></details>`).join('')}</div>`;
  return [
    sec('qa',
      { zh: '问答', en: 'Q&A' },
      { zh: '逐条答', en: 'Answered one by one' },
      { zh: '答案按能兑现的口径写，不含承诺。', en: 'Answers stay within what we can back up; no promises.' },
      list,
      { zh: '问答', en: 'Q&A' }),
    sec('hard',
      { zh: '硬边界', en: 'Hard limits' },
      { zh: '这几处一定要人', en: 'These spots always need a person' },
      { zh: '机器可以标出来，但拍板的是你。', en: 'A machine can flag them; you decide.' },
      wontBlock(v.hard),
      { zh: '硬边界', en: 'Hard limits' })
  ];
}

function brand(v) {
  const neigh = `<div class="callout"><b>${bi(v.neighbors.title)}</b><p class="og" style="margin:8px 0 0">${bi(v.neighbors.body)}</p><p class="og small" style="margin:8px 0 0;color:var(--muted)">${bi(v.neighbors.tail)}</p></div>`;

  const scope = `<div class="scope-flow">${v.scope.map((s) => `<div class="sf"><span class="lbl">${bi(s.step)}</span><p class="og">${bi(s.body)}</p></div>`).join('')}</div>`;

  return [
    sec('neigh',
      { zh: '同名', en: 'Same name' },
      { zh: '先分清你搜到的是哪一个', en: 'First, which one did you find' },
      null,
      neigh,
      { zh: '同名', en: 'Same name' }),
    sec('scope',
      { zh: '范围', en: 'Scope' },
      { zh: '我们只做中间这一段', en: 'We do the middle stage only' },
      { zh: '进来、过程、出去，三段里我们管中间。', en: 'In, through, out — the middle stage is ours.' },
      scope,
      { zh: '范围', en: 'Scope' }),
    sec('wonts',
      { zh: '不做', en: 'Not doing' },
      { zh: '不做的三件', en: 'Three things we do not do' },
      { zh: '说清不做什么，比列一堆能做什么有用。', en: 'Saying what we skip tells you more than a feature list.' },
      wontBlock(v.wont),
      { zh: '不做', en: 'Not doing' })
  ];
}

const SHAPES = { tutorial, compare, checklist, landing, technical, qa, brand };

/* ---------------- 演示台 ---------------- */

function demoSection(v) {
  const langBtns = LANGS.map((lg, i) => `<button class="lg" type="button" data-code="${lg.code}" aria-pressed="${i === 0 ? 'true' : 'false'}"><span>${bi({ zh: lg.name, en: lg.en })}</span><span class="code">${lg.code.toUpperCase()}</span></button>`).join('');

  const box = `<div class="demo" data-demo>
    <div class="demo-top">
      <span class="t"><i></i>${bi({ zh: '写回演示 · 选一种语言', en: 'Write-back demo · pick a language' })}</span>
      <span class="s">${bi({ zh: '界面示意，读数是演示值', en: 'Schematic UI, demonstration values' })}</span>
    </div>
    <div class="demo-grid">
      <div class="demo-langs" role="group" tabindex="0" aria-label="${bi({ zh: '选择演示语言', en: 'Demo language' })}">${langBtns}</div>
      <div class="demo-stage">
        <div class="ps">
          <div class="ps-bar"><span class="dots"><i></i><i></i><i></i></span><span class="idx">SY-BANNER-01.psd</span><span>${bi({ zh: '示意', en: 'mock' })}</span></div>
          <div class="ps-body">
            <span class="lbl">${bi({ zh: '① 主标题 · 文字图层', en: '① headline · text layer' })}</span>
            <h3 class="ps-title og" data-slot="title">这一版改好了</h3>
            <p class="ps-sub og" data-slot="sub">${bi({ zh: '同一句话在不同语言里的长度不一样，长的会被单独标出来。', en: 'The same sentence runs to different lengths per language; the long ones get flagged.' })}</p>
            <span class="ps-tag" data-slot="tag">ZH · 示意</span>
          </div>
        </div>
        <div class="rb">
          <div class="rb-item"><span class="ln">① ${bi({ zh: '主标题', en: 'headline' })}</span><span class="st-badge">—</span></div>
          <div class="rb-item"><span class="ln">② ${bi({ zh: '副标题', en: 'subhead' })}</span><span class="st-badge">—</span></div>
          <div class="rb-item"><span class="ln">③ ${bi({ zh: '角标', en: 'corner mark' })}</span><span class="st-badge">—</span></div>
        </div>
        <div class="demo-foot"><span data-count aria-live="polite">— 层读回 · — 已确认</span><span>${bi({ zh: '不是真实截图，也不是实测读数', en: 'Not a real screenshot, not measured values' })}</span></div>
      </div>
    </div>
  </div>`;

  const json = JSON.stringify(LANGS.map((l) => ({ code: l.code, dir: l.dir, sample: l.sample }))).replace(/</g, '\\u003c');

  return {
    ...sec('demo',
      { zh: '演示', en: 'Demo' },
      { zh: '写回演示', en: 'Write-back demo' },
      { zh: '点一种语言，看这一层怎么写回去、怎么读回来。阿拉伯语会右对齐。', en: 'Pick a language to see the layer written and read back. Arabic flips to the right.' },
      box,
      { zh: '演示', en: 'Demo' }),
    json
  };
}

/* ---------------- 全页 ---------------- */

function nav(v, anchors) {
  const links = anchors.slice(0, 4).map((a) => `<a href="#${a.id}">${bi(a.label)}</a>`).join('');
  return `<header class="nav"><div class="wrap nav-inner">
    <a class="brand" href="index.html"><span class="mark">图</span><span class="brand-txt"><b>图译工坊</b><small>${bi({ zh: '关键词承接页 · 示意', en: 'Keyword page · mock' })}</small></span></a>
    <nav class="nav-links" aria-label="section">${links}<a href="index.html">${bi({ zh: '全部关键词', en: 'All keywords' })}</a></nav>
    <div class="nav-actions"><button class="lang-toggle" type="button" aria-label="Switch to English">EN</button></div>
  </div></header>`;
}

function hero(v) {
  const t = themes[v.theme];
  const p = PRIMARY[v.shape];
  const [a, b] = v.h1;
  return `<section class="kw-hero"><div class="wrap hero-inner">
    <span class="eyebrow"><i></i>${bi(v.eyebrow)}</span>
    <h1 class="og"><span class="ln">${bi(a)}</span><span class="ln">${bi(b)}</span></h1>
    <p class="hero-sub og">${bi(v.sub)}</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="#${p.id}">${bi({ zh: p.zh, en: p.en })}</a>
      <a class="btn btn-ghost" href="#edge">${bi({ zh: '边界与不适合', en: 'Boundaries' })}</a>
    </div>
    <div class="hero-note"><span class="dot"></span><span class="og">${bi(v.note)}</span></div>
    <dl class="qbar">
      <div><dt>${bi({ zh: '搜索词', en: 'Query' })}</dt><dd>${bi(v.query)}</dd></div>
      <div><dt>${bi({ zh: '谁在搜', en: 'Who searches' })}</dt><dd>${bi(v.who)}</dd></div>
      <div><dt>${bi({ zh: '此刻的痛点', en: 'Pain right now' })}</dt><dd>${bi(painOf(v))}</dd></div>
      <div><dt>${bi({ zh: '形态与色调', en: 'Shape & tone' })}</dt><dd>${bi({ zh: SHAPE[v.shape].zh + ' · ' + t.label.zh, en: SHAPE[v.shape].en + ' · ' + t.label.en })}</dd></div>
    </dl>
    <p class="section-note og"><b>${bi({ zh: '为什么这页长这样：', en: 'Why this shape: ' })}</b>${bi(v.why)}</p>
  </div></section>`;
}

function tail(v) {
  const fit = sec('fit',
    { zh: '适合', en: 'Fit' },
    { zh: '对得上，还是对不上', en: 'Fits, or does not fit' },
    { zh: '这页给你判断用，说服留给别的页面。', en: 'A page built for judging. Convincing happens elsewhere.' },
    cards(v.fit, v.fit.length > 2 ? 'cards3' : 'cards2'),
    { zh: '适合', en: 'Fit' });

  const edge = sec('edge',
    { zh: '边界', en: 'Boundaries' },
    { zh: '边界', en: 'Boundaries' },
    { zh: '写清这些，是为了让你少走一趟弯路。', en: 'These are here so you waste fewer trips.' },
    `${wontBlock(v.boundary)}<p class="section-note og small">${bi(BOUNDARY_COMMON)}</p>`,
    { zh: '边界', en: 'Boundaries' });

  const cta = `<section class="kw-cta"><div class="wrap"><div class="bx">
    <div><h2 class="og">${bi(v.cta.h)}</h2><p class="og">${bi(v.cta.p)}</p></div>
    <a class="btn btn-primary" href="#${v.demo ? 'demo' : 'fit'}">${bi(v.demo ? { zh: '去演示台', en: 'Open the demo' } : { zh: '看适不适合', en: 'See the fit' })}</a>
  </div></div></section>`;

  return { fit, edge, cta };
}

function footer(v) {
  const idx = pages.findIndex((p) => p.id === v.id);
  const sib = pages.slice(idx + 1).concat(pages.slice(0, idx)).slice(0, 4);
  return `<footer class="kw-foot"><div class="wrap">
    <div class="cols">
      <div><b>图译工坊</b><p class="og small" style="margin:0 0 10px">${bi({ zh: '把已经定稿的译文，批量写回 PSD 的文字图层；写完逐层回读。单批最多 12 个语种。', en: 'Approved translations, batch-written into PSD text layers, then read back layer by layer. Up to 12 languages per batch.' })}</p><span class="pill">${bi(SHAPE[v.shape])} · ${bi(themes[v.theme].label)}</span></div>
      <div><b>${bi({ zh: '别的搜索词', en: 'Other queries' })}</b><ul>${sib.map((s) => `<li><a href="${siteFileName(s)}">${bi(s.query)}</a></li>`).join('')}<li><a href="index.html">${bi({ zh: '全部 12 个关键词', en: 'All 12 keywords' })}</a></li></ul></div>
      <div><b>${bi({ zh: '这页的边界', en: 'This page' })}</b><ul>
        <li>${bi({ zh: '模拟件：版面与交互为真，产品界面为示意', en: 'Mock: layout and interaction are real, product UI is schematic' })}</li>
        <li>${bi({ zh: '不承诺翻译质量，译文由你方定稿', en: 'No translation quality promised; you approve the text' })}</li>
        <li><a href="#edge">${bi({ zh: '回到边界一节', en: 'Back to boundaries' })}</a></li>
      </ul></div>
    </div>
    <div class="edge"><span>${bi({ zh: '关键词承接页 · 2026-10-28 模拟件', en: 'Keyword page · mock, 2026-10-28' })}</span><span>${bi({ zh: '本页不索引：仅供内部评审', en: 'Not indexed: internal review only' })}</span></div>
  </div></footer>`;
}

export function renderPage(v) {
  const body = SHAPES[v.shape](v);
  const demo = v.demo ? demoSection(v) : null;
  const { fit, edge, cta } = tail(v);

  const sections = body.concat(demo ? [demo] : [], [fit, edge]);
  const anchors = sections.map((s) => ({ id: s.id, label: s.label }));

  const main = `<main id="main">
${hero(v)}
${sections.map((s) => s.html).join('\n')}
${cta}
</main>`;

  return {
    nav: nav(v, anchors),
    main,
    footer: footer(v),
    json: demo ? demo.json : null,
    title: v.title,
    desc: v.desc
  };
}

/* ---------------- 索引页 ---------------- */

export function renderIndex() {
  const swatches = (v) => {
    const t = themes[v.theme];
    return `<span class="sw"><i style="background:${attr(t.vars['--bg'])}"></i><i style="background:${attr(t.vars['--panel'])}"></i><i style="background:${attr(t.vars['--accent'])}"></i></span>`;
  };

  const cardsHtml = pages.map((v) => `<a class="idx-card" href="${siteFileName(v)}">
    <div class="idx-top"><span class="id">${v.id}</span>${swatches(v)}</div>
    <div class="idx-body">
      <span class="q og">${bi(v.query)}</span>
      <span class="row"><b>${bi({ zh: '谁', en: 'Who' })}</b>${bi(v.who)}</span>
      <span class="row"><b>${bi({ zh: '形态', en: 'Shape' })}</b>${bi(SHAPE[v.shape])} · ${bi(themes[v.theme].label)}</span>
      <span class="row"><b>${bi({ zh: '痛点', en: 'Pain' })}</b>${bi(painOf(v))}</span>
      <span class="idx-foot"><span class="pill">${v.demo ? bi({ zh: '可点演示', en: 'demo' }) : bi({ zh: '阅读页', en: 'read' })}</span><span class="link-arrow">${bi({ zh: '打开', en: 'Open' })}</span></span>
    </div>
  </a>`).join('');

  const legend = Object.keys(themes).map((k) => `<span><i style="background:${attr(themes[k].vars['--accent'])}"></i>${bi(themes[k].label)}</span>`).join('');

  const fam = [
    { name: { zh: '冷调 · 工具感', en: 'Cool · tool-like' },
      body: { zh: '墨蓝、蓝灰、青绿、松绿。用在做判断的词上：交付、清单、技术说明。搜的人在看条件，不在被打动。',
        en: 'Marine, slate, teal, pine. For judging queries: delivery, checklists, technical notes. The searcher reads conditions and decides on their own.' } },
    { name: { zh: '暖调 · 手边感', en: 'Warm · close at hand' },
      body: { zh: '暖琥珀、暖橙、米白。用在手忙脚乱的词上：批量改字、电商、问答。这是最接近「深夜改稿」的一组。',
        en: 'Amber, ember, sand. For hands-full queries: batch edits, commerce, Q&A. This is the family closest to a late night of edits.' } },
    { name: { zh: '深调 · 品牌感', en: 'Deep · brand' },
      body: { zh: '墨黑金、青铜、石墨、酒红、靛紫。用在讲身份与对比的页上：品牌词、工具对比、可编辑性说明。深底是为了和同行拉开，不是为了好看。',
        en: 'Ink & gold, bronze, graphite, wine, violet. For identity and comparison pages: brand term, tool comparisons, editability. The dark ground separates us from look-alikes.' } }
  ].map((f) => `<article class="icard"><span class="k">${bi({ zh: '色调族', en: 'Palette family' })}</span><h3 class="og">${bi(f.name)}</h3><p class="og">${bi(f.body)}</p></article>`).join('');

  const ex = excluded.map((e) => `<li class="og"><b>${bi(e.kw)}</b> — ${bi(e.why)}</li>`).join('');

  return `<main id="main">
    <section class="idx-hero"><div class="wrap">
      <span class="eyebrow"><i></i>${bi({ zh: '关键词承接矩阵 · 12 页', en: 'Keyword matrix · 12 pages' })}</span>
      <h1 class="og"><span class="ln">${bi({ zh: '一个词一页。', en: 'One query, one page.' })}</span><span class="ln">${bi({ zh: '痛点不同，色调也不同。', en: 'A different pain, a different tone.' })}</span></h1>
      <p class="og">${bi({ zh: '这 12 页不是 12 套皮肤。每页先定「搜这个词的人此刻在干什么」，再定承接形态（教程 / 对比 / 清单 / 落地 / 技术 / 问答 / 品牌），最后才配色。形态依据里，只有四个中文词的前排形态是本仓库 10-17 实测的（测量记录在 交付档案/GEO测量/）；其余各页的词未单独测过，形态按 10-14 关键词自查表的档位与搜索意图推定——凡是引了数字的页，都在「为什么这页长这样」里写清了数字来自哪几个词、本页的词测没测过。',
        en: 'These twelve pages are not twelve skins. Each one starts from what the searcher is doing right now, then picks a shape (tutorial / comparison / checklist / landing / technical / Q&A / brand), and only then a palette. Only four Chinese queries had their first-page shapes measured (10-17, under 交付档案/GEO测量/); the rest were not measured individually, and their shape is inferred from the tier in the 10-14 keyword table plus search intent. Every page that quotes a number says which queries it came from and whether the query on this page was measured on its own.' })}</p>
      <div class="legend-row">${legend}</div>
      <p class="section-note og">${bi({ zh: '这里没有搜索量数据，所以我不按量排序，也不写「哪个词最值钱」。排序只是页面编号。',
        en: 'There is no search-volume data here, so nothing is ranked by volume and no query is called the most valuable. The numbers are just page order.' })}</p>
    </div></section>

    <section class="kw-sec"><div class="wrap">
      <div class="kw-head"><div><div class="kicker">${bi({ zh: '矩阵', en: 'Matrix' })}</div><h2 class="og">${bi({ zh: '12 个词，12 种接法', en: 'Twelve queries, twelve ways to answer' })}</h2></div>
      <p class="og">${bi({ zh: '每张卡片左上角是页面编号，右上角是这一页的底色 / 面板 / 强调色。', en: 'Each card shows the page number top-left and its ground, panel and accent top-right.' })}</p></div>
      <div class="idx-grid">${cardsHtml}</div>
    </div></section>

    <section class="kw-sec"><div class="wrap">
      <div class="kw-head"><div><div class="kicker">${bi({ zh: '色调', en: 'Palette' })}</div><h2 class="og">${bi({ zh: '色调按痛点分族', en: 'Palettes group by pain' })}</h2></div>
      <p class="og">${bi({ zh: '12 套配色全部过了 4.5:1 对比度（正文与强调色），深色三套单独回调了状态色。', en: 'All twelve palettes clear 4.5:1 contrast for body text and accents; the three dark ones re-tune status colours separately.' })}</p></div>
      <div class="cards3">${fam}</div>
      <p class="section-note og"><b>${bi({ zh: '如果只做一页：', en: 'If only one page ships: ' })}</b>${bi({ zh: '做 01（PSD 批量改文字）配暖琥珀。它是最像「正在发生的事」的一个词，那组词的前排本来就是教程形态在承接（测量里产品落地页只有 1 条），暖色和深夜改稿的场景也对得上。其余 11 页跟着它排队。',
        en: 'Page 01 (batch text edits) in amber. It is the query that sounds most like something happening right now, the tutorial shape is already proven on that SERP, and the warm ground matches a late night of edits. The other eleven queue behind it.' })}</p>
    </div></section>

    <section class="kw-sec"><div class="wrap">
      <div class="kw-head"><div><div class="kicker">${bi({ zh: '没做的词', en: 'Not built' })}</div><h2 class="og">${bi({ zh: '两个词，主动放弃', en: 'Two queries, dropped on purpose' })}</h2></div>
      <p class="og">${bi({ zh: '给错意图的词做页，等于把预算花在不会转化的人身上。', en: 'Building for the wrong intent spends the budget on people who will not convert.' })}</p></div>
      <ul class="wont">${ex}</ul>
    </div></section>
  </main>`;
}

function painOf(v) {
  if (v.pain) return v.pain;
  if (v.pains) return v.pains[0].title;
  if (v.questions) return v.questions[0].q;
  if (v.routes) return v.routes[1].name;
  if (v.hard) return v.hard[0];
  if (v.cases) return v.cases[0].title;
  if (v.three) return v.three[0].title;
  if (v.checks) return v.checks[0];
  if (v.neighbors) return v.neighbors.title;
  return v.sub;
}

export function navForIndex() {
  return `<header class="nav"><div class="wrap nav-inner">
    <a class="brand" href="index.html"><span class="mark">图</span><span class="brand-txt"><b>图译工坊</b><small>${bi({ zh: '关键词承接矩阵', en: 'Keyword matrix' })}</small></span></a>
    <nav class="nav-links" aria-label="section"><a href="#main">${bi({ zh: '矩阵', en: 'Matrix' })}</a><a href="01-psd-batch-edit.html">${bi({ zh: '第 01 页', en: 'Page 01' })}</a></nav>
    <div class="nav-actions"><button class="lang-toggle" type="button" aria-label="Switch to English">EN</button></div>
  </div></header>`;
}

export function footerForIndex() {
  return `<footer class="kw-foot"><div class="wrap">
    <div class="cols">
      <div><b>图译工坊</b><p class="og small" style="margin:0">${bi({ zh: '把已经定稿的译文，批量写回 PSD 的文字图层；写完逐层回读。', en: 'Approved translations, batch-written into PSD text layers, then read back.' })}</p></div>
      <div><b>${bi({ zh: '依据', en: 'Basis' })}</b><ul><li>${bi({ zh: '词表：10-14 关键词自查表', en: 'Queries: 10-14 keyword table' })}</li><li>${bi({ zh: '形态：10-17 中文 SERP 测量', en: 'Shapes: 10-17 Chinese SERP measurement' })}</li></ul></div>
      <div><b>${bi({ zh: '说明', en: 'Note' })}</b><ul><li>${bi({ zh: '模拟件，仅供内部评审', en: 'Mock, internal review only' })}</li><li>${bi({ zh: '本页不上传、不统计', en: 'This page uploads nothing, tracks nothing' })}</li></ul></div>
    </div>
    <div class="edge"><span>${bi({ zh: '关键词承接矩阵 · 2026-10-28', en: 'Keyword matrix · 2026-10-28' })}</span><span>${bi({ zh: '本页不索引', en: 'Not indexed' })}</span></div>
  </div></footer>`;
}

export const indexMeta = {
  title: { zh: '关键词承接矩阵 · 图译工坊', en: 'Keyword matrix · TuYi Workshop' },
  desc: { zh: '12 个搜索词，12 种承接形态与色调：每页先定搜索者此刻在干什么，再定版式与配色。',
    en: 'Twelve queries, twelve shapes and palettes: what the searcher is doing first, layout and colour second.' }
};
