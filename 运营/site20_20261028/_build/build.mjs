import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { variants } from './data.mjs';
import { renderSite, siteFileName } from './page.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const SITES = path.join(OUT, 'sites');

const RANK = [
  '03-pain-editorial', '12-batch-ops', '01-cinema', '17-roi-lab', '16-fit-check',
  '05-invite-ticket', '10-compare', '11-typography-craft', '15-evidence', '02-features-bento',
  '13-ecommerce', '14-agency', '21-amazon-pain', '22-outsource', '19-manifesto', '06-product-story', '07-swiss-grid',
  '04-launch-promo', '09-timeline', '08-terminal', '18-lookbook', '20-minimal'
];

const GROUP = {
  video: 'showcase', product: 'showcase', demo: 'showcase', brand: 'showcase', minimal: 'showcase',
  features: 'feature', workflow: 'feature', system: 'feature', scale: 'feature', craft: 'feature',
  pain: 'scene', vertical: 'scene', agency: 'scene', compare: 'scene',
  amazon: 'scene', outsource: 'scene',
  trust: 'trust', fit: 'trust', roi: 'trust',
  promo: 'campaign', invite: 'campaign'
};

const GROUP_LABEL = {
  all: { zh: '全部 22 套', en: 'All 22' },
  showcase: { zh: '首屏展示', en: 'Hero-first' },
  feature: { zh: '功能与流程', en: 'Features & workflow' },
  scene: { zh: '场景与对比', en: 'Scenarios & compare' },
  trust: { zh: '证据与筛选', en: 'Evidence & fit' },
  campaign: { zh: '发布与邀请', en: 'Launch & invite' }
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const bi = (o) => `<span class="zh">${esc(o.zh)}</span><span class="en">${esc(o.en)}</span>`;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeSites() {
  ensureDir(SITES);
  const files = [];
  for (const v of variants) {
    const html = renderSite(v, '../');
    const name = siteFileName(v);
    fs.writeFileSync(path.join(SITES, name), html, 'utf8');
    files.push({ v, name, bytes: Buffer.byteLength(html, 'utf8') });
  }
  return files;
}

function indexHtml(files) {
  const rankOf = (v) => {
    const i = RANK.indexOf(`${v.id}-${v.slug}`);
    return i >= 0 ? i + 1 : 99;
  };
  const ordered = files.slice().sort((a, b) => rankOf(a.v) - rankOf(b.v));

  const cards = ordered.map(({ v, name, bytes }) => {
    const slug = `${v.id}-${v.slug}`;
    const r = rankOf(v);
    const group = GROUP[v.angle] || 'showcase';
    return `<article class="card" data-group="${group}" data-angle="${esc(v.angle)}">
      <a class="thumb" href="sites/${esc(name)}" aria-label="${esc(v.zh)}">
        <iframe src="sites/${esc(name)}" title="${esc(v.zh)}" loading="lazy" tabindex="-1" scrolling="no"></iframe>
        ${r <= 3 ? `<span class="star">${bi({ zh: '首选 ' + r, en: 'Top ' + r })}</span>` : ''}
      </a>
      <div class="meta">
        <div class="row"><span class="num">${esc(v.id)}</span><span class="angle">${bi({ zh: v.angleZh, en: v.angleEn })}</span></div>
        <h3>${bi({ zh: v.zh, en: v.en })}</h3>
        <p class="best">${bi(v.bestFor)}</p>
        <div class="actions">
          <a class="open" href="sites/${esc(name)}">${bi({ zh: '打开整套', en: 'Open site' })} <span aria-hidden="true">↗</span></a>
          <span class="size">${(bytes / 1024).toFixed(0)} KB</span>
        </div>
      </div>
    </article>`;
  }).join('\n');

  const chips = Object.keys(GROUP_LABEL).map((k, i) =>
    `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-filter="${k}" aria-pressed="${i === 0}">${bi(GROUP_LABEL[k])}</button>`
  ).join('');

  return `<!doctype html>
<html lang="zh-CN" data-lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title data-zh="图译工坊 · 22 套官网方向模拟" data-en="TuYi Workshop · 22 landing-page directions">图译工坊 · 22 套官网方向模拟</title>
<meta name="robots" content="noindex,nofollow">
<style>
*,*::before,*::after{box-sizing:border-box}
html[data-lang="zh"] .en{display:none}
html[data-lang="en"] .zh{display:none}
:root{--bg:#0c0c0d;--ink:#f2efe9;--muted:#9c978e;--line:#26262a;--panel:#141416;--accent:#e8b06a;--accent-ink:#1a1208;--font:"Segoe UI","Microsoft YaHei",Arial,sans-serif;--display:Georgia,"Songti SC",SimSun,serif;--mono:Consolas,"Microsoft YaHei",monospace}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:15px;line-height:1.7}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;cursor:pointer}
.wrap{width:min(1400px,calc(100% - 48px));margin-inline:auto}
header.top{padding:54px 0 30px;border-bottom:1px solid var(--line)}
.top-row{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;flex-wrap:wrap}
.kicker{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
h1{font-family:var(--display);font-weight:500;font-size:clamp(38px,6vw,76px);line-height:1.02;letter-spacing:-.035em;margin:16px 0 14px;max-width:900px}
.lead{max-width:820px;color:var(--muted);font-size:15px;line-height:1.9;margin:0}
.top-actions{display:flex;gap:8px;align-items:center}
.lang{border:1px solid var(--line);background:var(--panel);padding:8px 12px;border-radius:999px;font-size:12px}
.note{margin-top:18px;border-left:2px solid var(--accent);padding-left:12px;font-size:12px;color:var(--muted);max-width:900px}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:22px 0 6px}
.chip{border:1px solid var(--line);background:transparent;padding:7px 12px;border-radius:999px;font-size:12px;color:var(--muted)}
.chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.count{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px;padding:22px 0 70px}
.card{border:1px solid var(--line);background:var(--panel);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s ease,transform .2s ease}
.card:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--line));transform:translateY(-2px)}
.card.hide{display:none}
.thumb{position:relative;display:block;aspect-ratio:16/10;overflow:hidden;background:#000;border-bottom:1px solid var(--line)}
.thumb iframe{position:absolute;inset:0;width:1280px;height:800px;border:0;transform-origin:top left;pointer-events:none}
.star{position:absolute;top:10px;left:10px;z-index:2;background:var(--accent);color:var(--accent-ink);font-size:10px;font-weight:700;padding:4px 9px;border-radius:999px;letter-spacing:.06em}
.meta{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.num{font-family:var(--mono);font-size:11px;color:var(--accent);border:1px solid var(--line);padding:2px 6px;border-radius:4px}
.angle{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
h3{margin:0;font-family:var(--display);font-weight:500;font-size:22px;letter-spacing:-.02em;line-height:1.25}
.best{margin:0;color:var(--muted);font-size:12px;line-height:1.75;flex:1}
.actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:4px}
.open{font-size:12px;font-weight:700;border-bottom:1px solid var(--accent);padding-bottom:2px}
.size{font-family:var(--mono);font-size:10px;color:var(--muted)}
footer{border-top:1px solid var(--line);padding:26px 0 44px;font-size:11px;color:var(--muted);line-height:1.9}
footer b{color:var(--ink);font-weight:600}
@media(max-width:560px){
  .wrap{width:calc(100% - 28px)}
  header.top{padding:36px 0 20px}
  .grid{grid-template-columns:1fr;gap:14px}
  .count{margin-left:0;width:100%}
}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="top-row">
    <div>
      <div class="kicker">TuYi Workshop · Landing directions 2026-10-28</div>
      <h1>${bi({ zh: '二十二套方向，同一件产品。', en: 'Twenty-two directions. One product.' })}</h1>
      <p class="lead">${bi({ zh: '每套都是可以直接打开的完整模拟官网：四个视图（首页、交互示意、适配自查、申请），中英双语，离线单文件。界面里的数据、报告和进度都是示意，用来讨论版式与叙事，不是能力证据。', en: 'Every entry is a complete, openable mock site: four views (home, interactive demo, fit check, apply), bilingual, offline and self-contained. All numbers, reports and progress inside are schematic material for discussing layout and narrative, not evidence of capability.' })}</p>
    </div>
    <div class="top-actions"><button type="button" class="lang" id="lang">EN</button></div>
  </div>
  <p class="note">${bi({ zh: '共同事实边界：单批最多 12 个语种；12 份稿一次准备但逐稿成批；不自动加行、不静默缩字号；文字回读不等于视觉或语义验收；已在 Photoshop 2021（22.0）验证。', en: 'Shared boundaries: up to 12 languages per batch; 12 drafts prepared together, batched per draft; no automatic line adding and no silent type shrinking; text read-back is not visual or semantic QA; verified on Photoshop 2021 (22.0).' })}</p>
</div></header>
<div class="wrap">
  <div class="filters">${chips}<span class="count" id="count"></span></div>
  <div class="grid" id="grid">
${cards}
  </div>
</div>
<footer><div class="wrap">
  <p><b>${bi({ zh: '怎么看这批件', en: 'How to read this set' })}</b> · ${bi({ zh: '先按方向筛，再打开两三套对比首屏、演示深度和申请路径。首选三套是按“十秒看懂 + 能马上玩 + 能接申请”排的，只作阅读顺序建议。', en: 'Filter by direction, then open two or three to compare the first screen, demo depth and apply path. The top three are ordered by “ten-second clarity, immediately playable, leads to an application”; read the order as a suggestion only.' })}</p>
  <p><b>${bi({ zh: '正式站', en: 'Official site' })}</b> · <a href="https://tuyigf.com/" target="_blank" rel="noopener">tuyigf.com</a> · ${bi({ zh: '本目录只作内部评审，不对外发布。', en: 'This folder is for internal review only; it is not published.' })}</p>
</div></footer>
<script>
(function () {
  var KEY = 'tygf.site20.index.lang';
  var html = document.documentElement;
  var btn = document.getElementById('lang');
  function pick(zh, en) { return html.getAttribute('data-lang') === 'zh' ? zh : en; }
  function apply(lang, save) {
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    var t = document.querySelector('title');
    if (t) document.title = lang === 'zh' ? t.dataset.zh : t.dataset.en;
    if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中文';
    if (save) { try { localStorage.setItem(KEY, lang); } catch (e) {} }
    updateCount();
    fitThumbs();
  }
  function fitThumbs() {
    document.querySelectorAll('.thumb').forEach(function (b) {
      var f = b.querySelector('iframe');
      if (!f) return;
      var s = b.clientWidth / 1280;
      f.style.transform = 'scale(' + s + ')';
    });
  }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var count = document.getElementById('count');
  function updateCount() {
    var shown = cards.filter(function (c) { return !c.classList.contains('hide'); }).length;
    if (count) count.textContent = shown + ' / ' + cards.length + pick(' 套', ' sites');
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('on');
      chip.setAttribute('aria-pressed', 'true');
      var f = chip.dataset.filter;
      cards.forEach(function (c) { c.classList.toggle('hide', f !== 'all' && c.dataset.group !== f); });
      updateCount();
      fitThumbs();
    });
  });
  if (btn) btn.addEventListener('click', function () {
    var next = html.getAttribute('data-lang') === 'zh' ? 'en' : 'zh';
    apply(next, true);
  });
  var saved = 'zh';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    saved = q === 'en' || q === 'zh' ? q : (localStorage.getItem(KEY) || 'zh');
  } catch (e) {}
  apply(saved, false);
  window.addEventListener('resize', fitThumbs);
  window.addEventListener('load', fitThumbs);
})();
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* static audit                                                        */
/* ------------------------------------------------------------------ */
const CLAIMS = [
  '40 秒', '越用越准', '及以上', '100%', '零失误', '零错误', '完全自动', '全自动',
  '提升效率', '节省', '真实录屏', '真实客户', '保证', '永久', '秒完成', '一键搞定',
  'guarantee', 'seconds', 'fully automatic', 'proven'
];

function audit(files) {
  const report = { generatedAt: new Date().toISOString(), files: [], totals: { sites: files.length, bytes: 0 }, problems: [] };
  for (const { v, name, bytes } of files) {
    const html = fs.readFileSync(path.join(SITES, name), 'utf8');
    const zhCount = (html.match(/class="zh/g) || []).length;
    const enCount = (html.match(/class="en/g) || []).length;
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    const views = (html.match(/id="view-(home|demo|fit|apply)"/g) || []).length;
    const active = (html.match(/class="page active"/g) || []).length;
    const remote = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    const hosts = [...new Set(remote.map((u) => {
      try { return new URL(u).host; } catch (e) { return u; }
    }))];
    const badHosts = hosts.filter((h) => h !== 'tuyigf.com');
    const textOnly = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const claimHits = CLAIMS.filter((c) => textOnly.indexOf(c) >= 0);
    const externalSrc = [...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="(?!https?:\/\/|#|data:)([^"]+)"/g)].map((m) => m[1]);

    const item = { name, theme: v.theme, view: v.visual, bytes, zhCount, enCount, dupIds, views, active, hosts, badHosts, claimHits, externalSrc };
    report.files.push(item);
    report.totals.bytes += bytes;

    if (zhCount !== enCount) report.problems.push(`${name}: zh/en span mismatch ${zhCount}/${enCount}`);
    if (dupIds.length) report.problems.push(`${name}: duplicate ids ${dupIds.join(',')}`);
    if (views !== 4) report.problems.push(`${name}: expected 4 views, found ${views}`);
    if (active !== 1) report.problems.push(`${name}: expected exactly 1 active page, found ${active}`);
    if (badHosts.length) report.problems.push(`${name}: external hosts ${badHosts.join(',')}`);
    if (externalSrc.length) report.problems.push(`${name}: local asset references ${externalSrc.join(',')}`);
  }

  // JS syntax (shared runtime, inlined once per page)
  try {
    new Function(fs.readFileSync(path.join(HERE, 'assets', 'client.js'), 'utf8'));
  } catch (e) {
    report.problems.push(`client.js syntax: ${e.message}`);
  }

  const claimSummary = {};
  for (const f of report.files) {
    for (const c of f.claimHits) claimSummary[c] = (claimSummary[c] || 0) + 1;
  }
  report.claims = claimSummary;
  return report;
}

function printAudit(report) {
  console.log(`\nGenerated ${report.totals.sites} sites · ${(report.totals.bytes / 1024 / 1024).toFixed(2)} MB`);
  for (const f of report.files) {
    console.log(`  ${f.name.padEnd(26)} ${String(Math.round(f.bytes / 1024)).padStart(4)} KB  zh/en ${f.zhCount}/${f.enCount}  views ${f.views}  hosts ${f.hosts.join(',') || '-'}`);
  }
  console.log('\nClaim scan (hits per phrase):');
  const entries = Object.entries(report.claims);
  if (!entries.length) console.log('  none');
  entries.forEach(([k, n]) => console.log(`  ${k} × ${n}`));
  console.log('\nProblems:');
  if (!report.problems.length) console.log('  none');
  report.problems.forEach((p) => console.log(`  - ${p}`));
}

const files = writeSites();
fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml(files), 'utf8');
const report = audit(files);
fs.writeFileSync(path.join(HERE, 'audit.json'), JSON.stringify(report, null, 2), 'utf8');
printAudit(report);
