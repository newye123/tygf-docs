// Self-implemented GEO audit against GEO Optimizer rubric v2 weights (spec borrowed, code is ours).
// Input: locally downloaded public assets in a directory (no network, no third-party execution).
// Honesty: every check is labelled mechanical | proxy | not_assessed. Score is NOT comparable to
// the upstream tool because we parse static HTML (no JS-rendered DOM) and use proxies for judgment items.
//
// 每日基线行（S1）：
//   node 交付档案/GEO测量/geo-audit-fetch.mjs tmp/geo-assets-YYYYMMDD
//   node 交付档案/GEO测量/geo-audit-self.mjs tmp/geo-assets-YYYYMMDD --record=交付档案/GEO测量/geo-audit-daily.jsonl
//   录行前提＝同目录 manifest.json 存在且 7 件全部 http=200（fetch 脚本已闸）；缺 manifest 时只出报告、不录行。
import fs from 'node:fs';
import path from 'node:path';
import { sha16, normSha, buildNormSha, buildFp, buildIdOf, contactEmailSha, localDay, dayOfStamp } from './geo-audit-lib.mjs';

const DIR = process.argv[2];
// 单钟源：日跑器把它的 dateLocal 传下来（--date=YYYY-MM-DD），避免"抓取算今天、录行算明天"的跨零点错位。
// 缺省仍自算（单独手工跑时不需要额外参数）。
const dateLocal = (process.argv.find((a) => a.startsWith('--date='))?.split('=')[1] || '').trim() || localDay();
const THRESHOLD = Number(process.argv.find((a) => a.startsWith('--threshold='))?.split('=')[1] ?? 0);
const RECORD = process.argv.find((a) => a.startsWith('--record='))?.split('=')[1] || '';
if (!DIR) { console.error('用法: node geo-audit-self.mjs <资产目录> [--threshold=N] [--record=<jsonl>]'); process.exit(2); }
const rd = (n) => { const p = path.join(DIR, n + '.txt'); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const home = rd('home'), dl = rd('download'), en = rd('en'), robots = rd('robots'), sitemap = rd('sitemap'), llms = rd('llms'), llmsfull = rd('llmsfull');
const body = (h) => (h || '').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
const text = (h) => body(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const count = (h, re) => ((h || '').match(re) || []).length;

const rows = [];
function chk(cat, id, max, kind, pass, note) { rows.push({ cat, id, max, kind, earned: pass === null ? 0 : pass ? max : 0, note, state: pass === null ? 'NOT_ASSESSED' : pass ? 'PASS' : 'FAIL' }); }

// ── google_ai (20) ───────────────────────────────────────────────────────────
const metaRobots = (home || '').match(/<meta name="robots" content="([^"]*)"/i);
chk('google_ai', 'G-INDEX', 5, 'mechanical', home !== null && !/noindex/i.test(metaRobots ? metaRobots[1] : ''), `home 200=${home !== null}; meta robots="${metaRobots ? metaRobots[1] : '(none)'}"；X-Robots-Tag 头未取（本轮只判 meta 层）`);
const snippetBad = /nosnippet|max-snippet:(0|([1-9]|[1-4][0-9])(;|$))/i.test(metaRobots ? metaRobots[1] : '');
chk('google_ai', 'G-SNIPPET', 5, 'mechanical', !snippetBad, `meta robots=${metaRobots ? metaRobots[1] : '(none)'}（max-snippet:-1＝不限，判通过）`);
const canon = [...(home || '').matchAll(/<link rel="canonical" href="([^"]+)"/gi)].map((m) => m[1]);
chk('google_ai', 'G-CANONICAL', 3, 'mechanical', canon.length === 1 && /^https:\/\/tuyigf\.com\/?$/.test(canon[0]), `canonical ${count(home, /rel="canonical"/gi)} 枚 = ${canon.join(' , ') || '(none)'}`);
const hasDateSchema = /datePublished|dateModified/.test(home || '');
const visDate = /20\d\d[-/年]\s?\d{1,2}[-/月]\s?\d{1,2}/.test(text(home));
chk('google_ai', 'G-DATES', 2, 'mechanical', hasDateSchema || visDate, `JSON-LD 日期=${hasDateSchema}; 可见日期串=${visDate}`);
chk('google_ai', 'G-BYLINE', 2, 'mechanical', /<meta name="author"/i.test(home || '') || /"@type":\s*"Person"/.test(home || ''), '查 author meta 或 Person 节点');
const hashRoutes = count(home, /href="#\//g);
chk('google_ai', 'G-LINKS', 1, 'mechanical', count(home, /href="\/[a-z]/gi) > 3 && hashRoutes === 0, `内链 <a href="/..."> ${count(home, /href="\/[a-z]/gi)} 条，#/ 路由 ${hashRoutes} 条`);
chk('google_ai', 'G-VIEWPORT', 1, 'mechanical', /<meta name="viewport"/i.test(home || ''), '');
chk('google_ai', 'G-SITEMAP', 1, 'mechanical', /(^|\n)\s*Sitemap:\s*https?:/im.test(robots || ''), `robots.txt 内 Sitemap 行=${count(robots, /Sitemap:/gi)}`);
chk('google_ai', 'G-GENAI-CONTROL', 0, 'not_assessed', null, '需登录 Search Console 人工核对，分值本就为 0');

// ── robots (14) ──────────────────────────────────────────────────────────────
chk('robots', 'robots_found', 3, 'mechanical', robots !== null && robots.length > 20, `${robots ? robots.length : 0} B`);
const CITATION = ['OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot'];
const named = CITATION.filter((b) => new RegExp('user-agent:\\s*' + b + '\\b', 'i').test(robots || ''));
const wildcardAllows = /user-agent:\s*\*[\s\S]{0,120}?allow:\s*\//i.test(robots || '');
chk('robots', 'robots_citation_ok', 11, 'mechanical', named.length === 4 || (wildcardAllows && named.length >= 3), `具名放行 ${named.length}/4 [${named.join(',')}]；* 组 allow:/ = ${wildcardAllows}`);

// ── schema (14) ──────────────────────────────────────────────────────────────
const ld = (home || '').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let graph = [];
if (ld) { try { const j = JSON.parse(ld[1].replace(/\\u003c/g, '<')); graph = j['@graph'] || (Array.isArray(j) ? j : [j]); } catch (e) { graph = []; } }
const types = graph.map((g) => g['@type']);
chk('schema', 'schema_any_valid', 2, 'mechanical', graph.length > 0, `JSON-LD @graph ${graph.length} 节点，类型 [${types.join(',')}]`);
const org = graph.find((g) => g['@type'] === 'Organization') || {};
chk('schema', 'schema_richness', 2, 'mechanical', Object.keys(org).length >= 5, `Organization 属性 ${Object.keys(org).length} 个`);
chk('schema', 'schema_faq', 2, 'mechanical', types.includes('FAQPage'), '');
chk('schema', 'schema_article', 2, 'mechanical', types.includes('Article') || types.includes('BlogPosting'), '全站无 Article/BlogPosting（我们没有任何内容页可标）');
chk('schema', 'schema_organization', 3, 'mechanical', types.includes('Organization'), '');
chk('schema', 'schema_website', 1, 'mechanical', types.includes('WebSite'), '');
const visibleNameMatch = /图译工坊/.test(text(home).slice(0, 1200));
chk('schema', 'G-SD-VISIBLE', 2, 'mechanical', visibleNameMatch, '首屏可见文本含 schema name');

// ── content (14) ─────────────────────────────────────────────────────────────
const t = text(home);
chk('content', 'content_h1', 2, 'mechanical', count(home, /<h1[\s>]/gi) >= 1, `H1 ${count(home, /<h1[\s>]/gi)} 枚`);
chk('content', 'content_numbers', 1, 'mechanical', /\d[\d.,]*\s*(%|分钟|语种|层|行|次|天|秒|个|字)/.test(t), `命中文本片段示例 ${(t.match(/\d[\d.,]*\s*(%|分钟|语种|层|行|次|天|秒|个|字)/g) || []).slice(0, 4).join(' / ')}`);
const extLinks = [...new Set([...(home || '').matchAll(/href="(https?:\/\/(?!tuyigf\.com)[^"]+)"/g)].map((m) => m[1]))];
chk('content', 'content_links', 1, 'mechanical', extLinks.length >= 1, `站外引用链接 ${extLinks.length} 条`);
const words = t.split(/\s+/).filter(Boolean).length + count(home, /[\u4e00-\u9fa5]/g);
chk('content', 'content_word_count', 1, 'proxy', words >= 300, `中英混合计量 ${words}（中文按字计，属代理判据）`);
chk('content', 'content_heading_hierarchy', 3, 'mechanical', count(home, /<h2[\s>]/gi) >= 2 && count(home, /<h3[\s>]/gi) >= 1, `H2 ${count(home, /<h2[\s>]/gi)} / H3 ${count(home, /<h3[\s>]/gi)}`);
chk('content', 'content_lists_or_tables', 2, 'mechanical', count(home, /<(ul|ol|table)[\s>]/gi) >= 1, '');
chk('content', 'content_front_loading', 2, 'proxy', /译文|PSD|图层/.test(t.slice(0, Math.floor(t.length * 0.3))), '前 30% 是否含核心事实（关键词代理）');
const imgs = count(home, /<img[\s>]/gi); const alts = count(home, /<img[^>]+alt="[^"]+"/gi);
chk('content', 'content_image_alt', 2, 'mechanical', imgs > 0 ? alts === imgs : null, `img ${imgs} 枚，带 alt ${alts} 枚（0 枚图＝未评）`);

// ── brand_entity (12) ────────────────────────────────────────────────────────
const ogTitle = (home || '').match(/property="og:title" content="([^"]*)"/i)?.[1] || '';
chk('brand_entity', 'brand_coherence', 3, 'proxy', /图译工坊/.test(ogTitle) && /图译工坊/.test((home || '').match(/<title[^>]*>([^<]*)/i)?.[1] || ''), 'title／og:title／schema name 三处品牌名一致');
const sameAs = /"sameAs"/.test(home || '');
chk('brand_entity', 'brand_kg_readiness', 4, 'mechanical', sameAs, 'schema 无 sameAs（外部主体页尚不存在，见 #179 关联记录）');
const cpContact = /"@type":\s*"ContactPoint"|"contactPoint"/.test(home || '');
const visibleEmail = /tuyi@tuyigf\.com|联系作者/.test(t);
chk('brand_entity', 'about_contact', 3, 'mechanical', cpContact || visibleEmail, `schema contactPoint=${cpContact}; 正文可见邮箱／联系作者=${visibleEmail}（首轮只查 mailto: 锚点，属假阴性，已修）`);
chk('brand_entity', 'geo_identity', 1, 'mechanical', false, '无地址／主体所在地信息（无主体是既成事实，见项目记忆）');
chk('brand_entity', 'topic_authority', 1, 'not_assessed', null, '需外部语料与引用数据，本机不可判');

// ── meta (11) ────────────────────────────────────────────────────────────────
chk('meta', 'meta_title', 5, 'mechanical', /<title[^>]*>[^<]{6,}/i.test(home || ''), (home || '').match(/<title[^>]*>([^<]*)/i)?.[1]?.slice(0, 50) || '');
chk('meta', 'meta_description', 2, 'mechanical', /<meta name="description" content=".{20,}"/i.test(home || ''), '');
chk('meta', 'meta_og', 4, 'mechanical', /property="og:title"/.test(home || '') && /property="og:description"/.test(home || ''), '');

// ── llms (6) ─────────────────────────────────────────────────────────────────
chk('llms', 'llms_found', 3, 'mechanical', llms !== null && llms.length > 100, `${llms ? llms.length : 0} B`);
chk('llms', 'llms_sections', 1, 'mechanical', count(llms, /^## /gm) >= 1, `H2 ${count(llms, /^## /gm)} 节`);
chk('llms', 'llms_links', 1, 'mechanical', count(llms, /https?:\/\//g) >= 1, `链接 ${count(llms, /https?:\/\//g)} 条`);
chk('llms', 'llms_full', 1, 'mechanical', llmsfull !== null && llmsfull.length > 100, `llms-full.txt ${llmsfull ? llmsfull.length : 'MISSING'} B`);

// ── signals (6) ──────────────────────────────────────────────────────────────
chk('signals', 'signals_lang', 3, 'mechanical', /<html[^>]+\blang="[^"]+"/i.test(home || ''), (home || '').match(/<html[^>]*lang="([^"]*)"/i)?.[1] || '');
chk('signals', 'signals_rss', 1, 'mechanical', /type="application\/(rss|atom)\+xml"/.test(home || ''), '首页无 RSS/Atom link；feed.xml 线上 404');
chk('signals', 'signals_freshness', 2, 'mechanical', hasDateSchema, '无 datePublished/dateModified ⇒ 新鲜度不可证');

// ── ai_discovery (3) ─────────────────────────────────────────────────────────
chk('ai_discovery', 'ai_txt', 1, 'mechanical', false, 'https://tuyigf.com/ai.txt 线上 404（本轮 curl 实测）');
chk('ai_discovery', 'summary_json', 1, 'not_assessed', null, 'curl 超时（rc=28），读数无效，不记 0');
chk('ai_discovery', 'markdown_negotiation', 1, 'not_assessed', null, '需发 Accept: text/markdown 探针，本轮未做');

// ── 全资产视图（10-21 加；**不进评分**，保持 87.4 趋势线可比）────────────────
// 病根：G-DATES／schema_article／signals_freshness 三判原来只解析首页，于是"站点没有内容页标记"
// 是把"首页没有文章标记"错读成全局结论——教程页其实有 TechArticle＋日期。这里跨件重算一次，只作旁证列。
const VIEW_KEYS = ['home', 'download', 'en', 'guide'];
const viewTypes = new Set(); let viewDates = false, viewGuideSeen = false
for (const k of VIEW_KEYS) {
  const h = rd(k); if (h === null) continue
  if (k === 'guide') viewGuideSeen = true
  for (const m of h.matchAll(/"@type":\s*"([A-Za-z]+)"/g)) viewTypes.add(m[1])
  if (/datePublished|dateModified/.test(h)) viewDates = true
}
const site_wide = {
  keys_seen: VIEW_KEYS.filter((k) => rd(k) !== null),
  guide_present: viewGuideSeen,
  types: [...viewTypes].sort(),
  has_article_like: [...viewTypes].some((t) => /Article|BlogPosting|TechArticle|HowTo/.test(t)),
  has_dates: viewDates,
  note: '旁证列，不参与 normalized_100；首页单面判定的两条红（schema_article／signals_freshness）要按本列重读',
};

// ── rollup ───────────────────────────────────────────────────────────────────
const byCat = {};
for (const r of rows) { byCat[r.cat] = byCat[r.cat] || { max: 0, earned: 0, assessedMax: 0, na: 0 }; byCat[r.cat].max += r.max; byCat[r.cat].earned += r.earned; if (r.state !== 'NOT_ASSESSED') byCat[r.cat].assessedMax += r.max; else byCat[r.cat].na++; }
const totalMax = rows.reduce((a, r) => a + r.max, 0);
const assessedMax = rows.filter((r) => r.state !== 'NOT_ASSESSED').reduce((a, r) => a + r.max, 0);
const earned = rows.filter((r) => r.state === 'PASS').reduce((a, r) => a + r.max, 0);
const fails = rows.filter((r) => r.state === 'FAIL');
const proxies = rows.filter((r) => r.kind === 'proxy').map((r) => r.id);
const na = rows.filter((r) => r.state === 'NOT_ASSESSED').map((r) => r.id);

console.log('=== 逐类（earned/assessedMax，括号内为该类满分）===');
for (const [c, v] of Object.entries(byCat)) console.log(`${c.padEnd(13)} ${String(v.earned).padStart(3)}/${String(v.assessedMax).padStart(3)}  (类满分 ${v.max}, 未评 ${v.na})`);
console.log(`\nTOTAL_EARNED=${earned}  ASSESSED_MAX=${assessedMax}  RUBRIC_MAX=${totalMax}`);
console.log(`NORMALIZED_100=${(earned * 100 / assessedMax).toFixed(1)}  ← 只可同脚本前后比，不可与上游工具比`);
console.log(`BAND(upstream)=${earned * 100 / assessedMax >= 86 ? 'Excellent' : earned * 100 / assessedMax >= 68 ? 'Good' : earned * 100 / assessedMax >= 36 ? 'Foundation' : 'Critical'}`);
console.log(`FAILS=${fails.length}`);
for (const f of fails) console.log(`  [FAIL] ${f.cat}/${f.id} -${f.max}  ${f.note}`);
console.log(`PROXY_CHECKS=${proxies.join(',')}`);
console.log(`NOT_ASSESSED=${na.join(',')}`);
const norm = earned * 100 / assessedMax;
console.log(`全资产视图（不进评分）：看过 [${site_wide.keys_seen.join(',')}]｜教程页在场=${site_wide.guide_present}｜文章类标记=${site_wide.has_article_like}［${site_wide.types.join(',') || '无'}］｜日期字段=${site_wide.has_dates}`);
console.log(`  ⇒ 首页单面判的两条红要按本列重读：schema_article 与 signals_freshness 说的是"首页"，不是"全站"。`);

// ── 每日基线行（S1）：只在取数闸全绿时录行 ──────────────────────────────────
// 反假锚：资产缺一件，审计会把 20 条判成 FAIL、分数暴跌——那是取数失败，不是站点退步。
// 因此录行前提＝manifest.json 存在且 7 件全部 http=200 且 bytes>200；否则拒录并 exit 3。
if (RECORD) {
  const manifestPath = path.join(DIR, 'manifest.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) { try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { manifest = null; } }
  const assets = (manifest && Array.isArray(manifest.assets)) ? manifest.assets : [];
  // 只把「影响评分」的 4 件当录行闸：home／robots／llms／llmsfull。
  const CORE = ['home', 'robots', 'llms', 'llmsfull'];
  const byKey = Object.fromEntries(assets.map((a) => [a.key, a]));
  // 四条件与抓取端一致（AR-6）：200 ＋ 够长 ＋ 形态合格 ＋ 今天真抓到过。
  // 旧 manifest（无 shape_ok/fetched_at 字段）一律视为不可信 ⇒ 拒录，逼当天重抓。
  const allFetched = CORE.every((k) => {
    const a = byKey[k]
    return a && a.http === 200 && Number(a.bytes) > (k === 'home' ? 10000 : 100)
      && a.shape_ok === true && dayOfStamp(a.fetched_at) === dateLocal
  });
  if (!allFetched) {
    console.log(`RECORD_SKIPPED 资产不齐或 manifest 缺失（${manifestPath}）⇒ 拒录，避免把取数失败记成分数下跌`);
    process.exitCode = 3;
  } else {
    const inputs = {};
    for (const a of assets) {
      const p = path.join(DIR, a.key + '.txt');
      if (!fs.existsSync(p)) { inputs[a.key] = { bytes: null, sha256: null, sha256_norm: null, sha256_build_norm: null, build_fp: null, build_id: null, cache: null, smaxage: null }; continue }
      const buf = fs.readFileSync(p);
      // sha256＝原始（每次请求都可能因 CF 混淆而变，只作当日留底）；
      // sha256_norm＝归一后（跨日"版面内容变没变"只认这一枚）；
      // fetched_at/stale 让行本身就能看出内容是新抓还是沿用（AR-6③）。
      inputs[a.key] = {
        bytes: buf.length, sha256: sha16(buf), sha256_norm: normSha(buf.toString('utf8')),
        sha256_build_norm: buildNormSha(buf.toString('utf8')), build_fp: buildFp(buf.toString('utf8')),
        build_id: buildIdOf(buf.toString('utf8')),
        // 缓存证据从 manifest 透传（#269）：这一份是谁供的、能存多久，决定跨日指纹差能不能读成内容差。
        cache: a.cache || null, smaxage: typeof a.smaxage === 'number' ? a.smaxage : null,
        fetched_at: a.fetched_at || null, shape_ok: a.shape_ok === true,
        stale: a.fetched_at ? dayOfStamp(a.fetched_at) !== dateLocal : true,
      };
    }
    const pct = earned * 100 / assessedMax;
    // 邮箱敏感度补回（AR-7）：归一只抹 CF 混淆串，"真把对外邮箱改了"由这一列点名（取 JSON-LD contactPoint 明文）。
    const homePath = path.join(DIR, 'home.txt');
    const contact_email_sha = fs.existsSync(homePath) ? contactEmailSha(fs.readFileSync(homePath, 'utf8')) : null;
    const row = {
      as_of: new Date().toISOString(),
      date_local: dateLocal,
      rubric: 'geo-optimizer-v2-20261018',
      dir: path.relative(process.cwd(), DIR).split(path.sep).join('/'),
      earned, assessed_max: assessedMax, normalized_100: Number(pct.toFixed(1)),
      band: pct >= 86 ? 'Excellent' : pct >= 68 ? 'Good' : pct >= 36 ? 'Foundation' : 'Critical',
      fails: fails.map((f) => f.cat + '/' + f.id),
      not_assessed: na,
      proxy_checks: proxies,
      contact_email_sha,
      site_wide,
      inputs,
    };
    fs.mkdirSync(path.dirname(path.resolve(RECORD)), { recursive: true });
    fs.appendFileSync(RECORD, JSON.stringify(row) + '\n', 'utf8');
    console.log(`RECORDED ${RECORD} ${row.date_local} normalized=${row.normalized_100} fails=${row.fails.length}`);
  }
}
if (THRESHOLD && norm < THRESHOLD) { console.log(`BELOW_THRESHOLD ${THRESHOLD} ⇒ exit 1（CI 门槛形状）`); process.exit(1); }
