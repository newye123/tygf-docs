/* TuYi Workshop — schematic site behaviours. No network calls. */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  html.classList.add('js');

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function isZh() { return html.getAttribute('data-lang') !== 'en'; }
  function pick(zh, en) { return isZh() ? zh : en; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmt(n) { return new Intl.NumberFormat(isZh() ? 'zh-CN' : 'en-US').format(n); }

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var refreshers = new Set();
  function onRefresh(fn) { refreshers.add(fn); return fn; }
  function refreshDynamic() {
    refreshers.forEach(function (fn) {
      try { fn(); } catch (e) { /* keep one broken widget from stopping the rest */ }
    });
  }

  /* ------------------------------------------------------------------ */
  /* language                                                            */
  /* ------------------------------------------------------------------ */
  var LANG_KEY = 'tygf.site20.lang';

  function readLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'zh') return q;
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) { /* file:// or privacy mode */ }
    return 'zh';
  }

  function applyLang(lang, persist) {
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    if (persist) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} }

    var title = doc.querySelector('title');
    if (title && title.dataset.zh) doc.title = lang === 'zh' ? title.dataset.zh : title.dataset.en;
    var desc = doc.querySelector('meta[name="description"]');
    if (desc && desc.dataset.zh) desc.setAttribute('content', lang === 'zh' ? desc.dataset.zh : desc.dataset.en);

    $$('[data-ph-zh]').forEach(function (el) {
      el.setAttribute('placeholder', lang === 'zh' ? el.dataset.phZh : el.dataset.phEn);
    });
    $$('[data-aria-zh]').forEach(function (el) {
      el.setAttribute('aria-label', lang === 'zh' ? el.dataset.ariaZh : el.dataset.ariaEn);
    });
    $$('option[data-zh]').forEach(function (el) {
      el.textContent = lang === 'zh' ? el.dataset.zh : el.dataset.en;
    });
    $$('.lang-toggle').forEach(function (btn) {
      btn.textContent = lang === 'zh' ? (btn.dataset.zhLabel || 'EN') : (btn.dataset.enLabel || '中文');
      btn.setAttribute('aria-label', lang === 'zh'
        ? (btn.dataset.ariaZh || 'Switch to English')
        : (btn.dataset.ariaEn || '切换到中文'));
    });

    refreshDynamic();
    window.setTimeout(function () { fitHeroes(); fixAllOrphans(); }, 30);
  }

  /* ------------------------------------------------------------------ */
  /* routing + nav                                                       */
  /* ------------------------------------------------------------------ */
  var ROUTES = ['home', 'demo', 'fit', 'apply'];

  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '').split('?')[0];
    return ROUTES.indexOf(h) >= 0 ? h : 'home';
  }

  function closeMenu() {
    var menu = $('.nav-links');
    var btn = $('.menu-btn');
    if (menu) menu.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function route(scroll) {
    var r = currentRoute();
    $$('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'view-' + r); });
    $$('.nav-links a[data-route]').forEach(function (a) { a.classList.toggle('active', a.dataset.route === r); });
    closeMenu();
    if (scroll !== false) window.scrollTo(0, 0);
    window.requestAnimationFrame(function () {
      revealNow();
      refreshDynamic();
      fitHeroes();
      fixAllOrphans();
    });
  }

  function setupNav() {
    $$('.lang-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(html.getAttribute('data-lang') === 'zh' ? 'en' : 'zh', true);
      });
    });
    $$('.menu-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var menu = $('.nav-links');
        if (!menu) return;
        var open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    $$('.nav-links a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('hashchange', function () { route(true); });
  }

  /* ------------------------------------------------------------------ */
  /* reveal                                                              */
  /* ------------------------------------------------------------------ */
  var revealed = false;

  function setupReveal() {
    var items = $$('.reveal');
    if (reduce.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      revealed = true;
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    items.forEach(function (el) { io.observe(el); });
    window.setTimeout(function () {
      items.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
      revealed = true;
    }, 1400);
  }

  function revealNow() {
    $$('.reveal:not(.in)').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.96) el.classList.add('in');
    });
  }

  /* ------------------------------------------------------------------ */
  /* text measurement                                                    */
  /* ------------------------------------------------------------------ */
  function textNodes(root) {
    var out = [];
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function collectChars(root) {
    var out = [];
    textNodes(root).forEach(function (node) {
      var t = node.nodeValue;
      for (var i = 0; i < t.length; i++) {
        if (/\s/.test(t.charAt(i))) continue;
        var range = doc.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        var rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) continue;
        out.push({ node: node, index: i, top: Math.round(rect.top * 10) / 10 });
      }
    });
    return out;
  }

  function lineStats(root) {
    var chars = collectChars(root);
    if (!chars.length) return { lines: 0, last: 0 };
    var lastTop = chars[chars.length - 1].top;
    var tops = [];
    chars.forEach(function (c) {
      var hit = false;
      for (var i = 0; i < tops.length; i++) {
        if (Math.abs(tops[i] - c.top) <= 5) { hit = true; break; }
      }
      if (!hit) tops.push(c.top);
    });
    var last = 0;
    chars.forEach(function (c) { if (Math.abs(c.top - lastTop) <= 5) last++; });
    return { lines: tops.length, last: last };
  }

  function unwrapNw(root) {
    $$('.nw', root).forEach(function (span) {
      var parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
      parent.normalize();
    });
  }

  function isShown(el) {
    return !!el && window.getComputedStyle(el).display !== 'none';
  }

  function lastVisibleTextRoot(el) {
    var kids = $$('.zh, .en', el).filter(function (c) {
      return isShown(c) && (c.textContent || '').trim();
    });
    if (kids.length) return kids[kids.length - 1];
    return el;
  }

  function wrapTail(root, kind) {
    var nodes = textNodes(root);
    if (!nodes.length) return null;
    var node = nodes[nodes.length - 1];
    var text = node.nodeValue;
    var start = -1;
    if (kind === 'zh') {
      if (text.length < 2) return null;
      start = text.length - 2;
    } else {
      var m = text.match(/(\S+)(\s+)(\S+)(\s*)$/);
      if (!m) return null;
      start = text.length - m[0].length;
      while (start < text.length && /\s/.test(text.charAt(start))) start++;
    }
    if (start < 0 || start >= text.length) return null;
    var span = doc.createElement('span');
    span.className = 'nw';
    var range = doc.createRange();
    try {
      range.setStart(node, start);
      range.setEnd(node, text.length);
      range.surroundContents(span);
    } catch (e) {
      return null;
    }
    return span;
  }

  function isOrphan(last, total) {
    if (last <= 0 || last >= total) return false;
    if (isZh()) return last === 1;
    return last <= 6;
  }

  function fixOne(el) {
    if (el.closest('[data-no-og]')) return;
    if (window.getComputedStyle(el).whiteSpace !== 'normal') return;
    var root = lastVisibleTextRoot(el);
    if (!root) return;
    var chars = collectChars(el);
    if (chars.length < 3) return;
    var stats = lineStats(el);
    if (!isOrphan(stats.last, chars.length)) return;

    var beforeH = el.getBoundingClientRect().height;
    var span = wrapTail(root, isZh() ? 'zh' : 'en');
    if (!span) return;
    var er = el.getBoundingClientRect();
    var sr = span.getBoundingClientRect();
    var afterH = el.getBoundingClientRect().height;
    var overflow = sr.right > er.right + 2 || sr.left < er.left - 2 || afterH > beforeH + 1.5;
    if (overflow) {
      unwrapNw(el);
      return;
    }
    el.dataset.og = 'fixed';
  }

  var OG_SELECTOR = '.og, p, li, blockquote, figcaption, dt, dd';

  function ogCandidates() {
    var active = $('.page.active') || doc.body;
    var list = $$(OG_SELECTOR, active);
    /* CJK widows are a hard rule; Latin last lines are just short, so keep the guard opt-in there */
    if (isZh()) return list;
    return list.filter(function (el) { return el.classList.contains('og'); });
  }

  function fixAllOrphans() {
    if (!doc.body) return;
    var els = ogCandidates();
    els.forEach(function (el) { unwrapNw(el); });
    els.forEach(fixOne);
  }

  /* authored hero lines must never wrap mid-line: shrink type until they fit */
  function fitHeroes() {
    if (!doc.body) return;
    var active = $('.page.active') || doc.body;
    $$('.hero h1', active).forEach(function (h1) {
      h1.style.removeProperty('font-size');
      var base = parseFloat(window.getComputedStyle(h1).fontSize) || 0;
      var avail = h1.clientWidth;
      if (!base || !avail) return;
      var lines = $$('.ln', h1);
      if (!lines.length) return;
      var maxW = 0;
      lines.forEach(function (l) {
        l.style.whiteSpace = 'nowrap';
        maxW = Math.max(maxW, l.scrollWidth);
      });
      lines.forEach(function (l) { l.style.whiteSpace = ''; });
      if (maxW > avail) {
        var size = Math.max(24, Math.floor(base * (avail / maxW) * 97) / 100);
        h1.style.setProperty('font-size', size + 'px', 'important');
      }
    });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      fitHeroes();
      refreshDynamic();
      fixAllOrphans();
    }, 180);
  });

  /* ------------------------------------------------------------------ */
  /* stage player                                                        */
  /* ------------------------------------------------------------------ */
  var STAGE_LABELS = { zh: '场景', en: 'Scene' };

  function initStages() {
    $$('[data-stage]').forEach(function (root) {
      var scenes = $$('.stage-scene', root);
      var dots = $$('[data-scene]', root);
      var bar = $('.stage-progress i', root);
      var count = $('.stage-count', root);
      var current = 0;
      var progress = 0;
      var timer = null;
      var paused = false;

      function show(n) {
        current = n % scenes.length;
        scenes.forEach(function (s, i) { s.classList.toggle('active', i === current); });
        dots.forEach(function (d, i) {
          d.classList.toggle('on', i === current);
          d.setAttribute('aria-pressed', i === current ? 'true' : 'false');
        });
        if (count) {
          count.textContent = (isZh() ? STAGE_LABELS.zh : STAGE_LABELS.en) + ' ' + (current + 1) + ' / ' + scenes.length;
        }
        progress = 0;
        if (bar) bar.style.width = '0%';
      }

      function tick() {
        if (paused) return;
        progress += 2.2;
        if (bar) bar.style.width = Math.min(100, progress) + '%';
        if (progress >= 100) show(current + 1);
      }

      function start() {
        if (reduce.matches) return;
        stop();
        timer = window.setInterval(tick, 90);
      }
      function stop() {
        if (timer) { window.clearInterval(timer); timer = null; }
      }

      dots.forEach(function (d) {
        d.addEventListener('click', function () { show(Number(d.dataset.scene) || 0); });
      });
      root.addEventListener('pointerenter', function () { paused = true; });
      root.addEventListener('pointerleave', function () { paused = false; });
      root.addEventListener('focusin', function () { paused = true; });
      root.addEventListener('focusout', function () { paused = false; });
      doc.addEventListener('visibilitychange', function () { paused = doc.hidden; });

      show(0);
      start();

      if (reduce.matches) {
        scenes.forEach(function (s, i) { s.classList.toggle('active', i === 0); });
        if (bar) bar.style.width = '100%';
      }

      onRefresh(function () { show(current); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* terminal                                                            */
  /* ------------------------------------------------------------------ */
  function initTerms() {
    $$('[data-term]').forEach(function (root) {
      var lines = $$('.term-line', root);
      if (!lines.length) return;
      if (reduce.matches) {
        lines.forEach(function (l) { l.classList.add('show'); });
        return;
      }
      var i = 0;
      var timer = window.setInterval(function () {
        if (i >= lines.length) { window.clearInterval(timer); return; }
        lines[i].classList.add('show');
        i++;
      }, 180);
    });
  }

  /* ------------------------------------------------------------------ */
  /* app window demo                                                     */
  /* ------------------------------------------------------------------ */
  function initApps() {
    $$('[data-app]').forEach(function (root) {
      var run = $('[data-app-run]', root);
      var reset = $('[data-app-reset]', root);
      var bar = $('[data-app-progress]', root);
      var lines = $$('[data-app-line]', root);
      var timer = null;

      function clear() {
        if (timer) { window.clearInterval(timer); timer = null; }
        if (bar) bar.style.width = '0%';
        lines.forEach(function (l) { l.hidden = true; });
      }
      function play() {
        clear();
        if (reduce.matches) {
          lines.forEach(function (l) { l.hidden = false; });
          if (bar) bar.style.width = '100%';
          return;
        }
        var i = 0;
        timer = window.setInterval(function () {
          if (i < lines.length) lines[i].hidden = false;
          i++;
          if (bar) bar.style.width = Math.min(100, (i / lines.length) * 100) + '%';
          if (i >= lines.length) { window.clearInterval(timer); timer = null; }
        }, 260);
      }
      if (run) run.addEventListener('click', play);
      if (reset) reset.addEventListener('click', clear);
      lines.forEach(function (l) { l.hidden = false; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* matrix                                                              */
  /* ------------------------------------------------------------------ */
  var LANG_NAMES = {
    en: { zh: '英语', en: 'English' },
    de: { zh: '德语', en: 'German' },
    fr: { zh: '法语', en: 'French' },
    es: { zh: '西班牙语', en: 'Spanish' },
    it: { zh: '意大利语', en: 'Italian' },
    pt: { zh: '葡萄牙语', en: 'Portuguese' },
    ja: { zh: '日语', en: 'Japanese' },
    ko: { zh: '韩语', en: 'Korean' },
    th: { zh: '泰语', en: 'Thai' },
    vi: { zh: '越南语', en: 'Vietnamese' },
    ar: { zh: '阿拉伯语', en: 'Arabic' },
    ru: { zh: '俄语', en: 'Russian' }
  };
  var STATUS_LABELS = {
    done: { zh: '已写入', en: 'Written' },
    review: { zh: '待复查', en: 'Review' },
    blocked: { zh: '无法处理', en: 'Unprocessable' },
    fail: { zh: '执行失败', en: 'Failed' },
    pending: { zh: '未开始', en: 'Not started' }
  };

  function langLabel(code) {
    var l = LANG_NAMES[code] || { zh: code, en: code };
    return isZh() ? l.zh : l.en;
  }
  function statusLabel(code) {
    var s = STATUS_LABELS[code] || STATUS_LABELS.pending;
    return isZh() ? s.zh : s.en;
  }

  function initMatrices() {
    $$('[data-matrix]').forEach(function (root) {
      var cells = $$('.cell', root);
      if (!cells.length) return;
      var run = $('[data-run]', root);
      var reset = $('[data-reset]', root);
      var progress = $('[data-progress]', root);
      var progressText = $('[data-progress-text]', root);
      var countDone = $('[data-count="done"]', root);
      var countReview = $('[data-count="review"]', root);
      var countIssues = $('[data-count="issues"]', root);
      var inspector = $('[data-inspector]', root);
      var filterButtons = $$('[data-filter]', root);
      var timer = null;
      var selected = null;
      var filter = 'all';

      function counts() {
        var c = { done: 0, review: 0, blocked: 0, fail: 0, pending: 0 };
        cells.forEach(function (cell) { c[cell.dataset.status] = (c[cell.dataset.status] || 0) + 1; });
        return c;
      }
      function paint() {
        var c = counts();
        var total = cells.length;
        var pct = Math.round(((total - c.pending) / total) * 100);
        if (progress) progress.style.width = pct + '%';
        if (progressText) progressText.textContent = pct + '%';
        if (countDone) countDone.textContent = fmt(c.done);
        if (countReview) countReview.textContent = fmt(c.review);
        if (countIssues) countIssues.textContent = fmt(c.blocked + c.fail);
      }
      function aria(cell) {
        return pick(
          cell.dataset.file + '，' + langLabel(cell.dataset.lang) + '，' + statusLabel(cell.dataset.status),
          cell.dataset.file + ', ' + langLabel(cell.dataset.lang) + ', ' + statusLabel(cell.dataset.status)
        );
      }
      function setStatus(cell, status) {
        cell.dataset.status = status;
        cell.setAttribute('aria-label', aria(cell));
      }
      function applyFilter() {
        cells.forEach(function (cell) {
          var st = cell.dataset.status;
          var keep = filter === 'all'
            ? true
            : (filter === 'review' ? st === 'review' : (st === 'blocked' || st === 'fail'));
          cell.classList.toggle('dim', !keep);
        });
        filterButtons.forEach(function (b) {
          var on = b.dataset.filter === filter;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      function renderInspector(cell) {
        if (!inspector) return;
        inspector.classList.add('has');
        var map = {
          object: cell.dataset.object || '—',
          file: cell.dataset.file || '—',
          language: langLabel(cell.dataset.lang),
          source: cell.dataset.sourceText || '—',
          target: cell.dataset.targetText || '—',
          planned: cell.dataset.planned || '—',
          rendered: cell.dataset.rendered || '—',
          note: pick(cell.dataset.noteZh || '—', cell.dataset.noteEn || '—')
        };
        Object.keys(map).forEach(function (k) {
          var el = $('[data-ins="' + k + '"]', inspector);
          if (el) el.textContent = map[k];
        });
        var badge = $('[data-ins="status"]', inspector);
        if (badge) {
          badge.className = 'st-badge ' + cell.dataset.status;
          badge.textContent = statusLabel(cell.dataset.status);
        }
      }
      function select(cell) {
        cells.forEach(function (c) { c.classList.toggle('sel', c === cell); });
        selected = cell;
        renderInspector(cell);
      }
      function resetAll() {
        if (timer) { window.clearInterval(timer); timer = null; }
        cells.forEach(function (cell) { setStatus(cell, 'pending'); cell.classList.remove('sel'); });
        selected = null;
        if (inspector) {
          inspector.classList.remove('has');
          var empty = $('.ins-empty', inspector);
          if (empty) empty.textContent = pick('点一个格子看详情', 'Select a cell for details');
        }
        paint();
        applyFilter();
        if (run) { run.disabled = false; run.removeAttribute('aria-busy'); }
      }
      function runAll() {
        if (timer) return;
        resetAll();
        var langs = [];
        cells.forEach(function (c) { if (langs.indexOf(c.dataset.lang) < 0) langs.push(c.dataset.lang); });
        var step = 0;
        function advance() {
          var lang = langs[step];
          cells.forEach(function (c) {
            if (c.dataset.lang !== lang) return;
            var target = c.dataset.target || 'done';
            setStatus(c, target === 'pending' ? 'done' : target);
          });
          step++;
          paint();
          applyFilter();
          if (step >= langs.length) {
            if (timer) { window.clearInterval(timer); timer = null; }
            if (run) { run.disabled = false; run.removeAttribute('aria-busy'); }
          }
        }
        if (run) { run.disabled = true; run.setAttribute('aria-busy', 'true'); }
        if (reduce.matches) {
          langs.forEach(function () { advance(); });
          return;
        }
        timer = window.setInterval(advance, 85);
      }

      cells.forEach(function (cell) {
        cell.setAttribute('aria-label', aria(cell));
        cell.addEventListener('click', function () { select(cell); });
      });
      filterButtons.forEach(function (b) {
        b.addEventListener('click', function () { filter = b.dataset.filter; applyFilter(); });
      });
      if (run) run.addEventListener('click', runAll);
      if (reset) reset.addEventListener('click', resetAll);

      paint();
      applyFilter();
      onRefresh(function () {
        cells.forEach(function (cell) { cell.setAttribute('aria-label', aria(cell)); });
        if (selected) renderInspector(selected);
        else if (inspector) {
          var empty = $('.ins-empty', inspector);
          if (empty) empty.textContent = pick('点一个格子看详情', 'Select a cell for details');
        }
        paint();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* typography lab                                                      */
  /* ------------------------------------------------------------------ */
  var LAB_SAMPLES = {
    zh: {
      title: '窄图层里的长译文',
      body: '先判断能不能放下，再决定怎么改版。放不下的位置进例外清单，不悄悄缩字号，也不把「不知道」写成「成功」。'
    },
    en: {
      title: 'Long copy in a narrow layer',
      body: 'Check whether it fits before deciding how to rework the layout. Positions that do not fit go to the exception list; type is not silently shrunk, and unknown is never written up as success.'
    },
    ja: {
      title: '狭いレイヤーに長い翻訳文',
      body: '入るかどうかを先に判断し、それから組み方を決めます。入らない箇所は例外リストに送り、文字サイズを黙って下げることはしません。'
    },
    th: {
      title: 'ข้อความยาวในเลเยอร์แคบ',
      body: 'ตรวจก่อนว่าพอดีหรือไม่ แล้วจึงตัดสินใจจัดหน้า ตำแหน่งที่ใส่ไม่ได้จะถูกส่งไปยังรายการข้อยกเว้น ไม่ลดขนาดตัวอักษรเงียบ ๆ'
    },
    ar: {
      title: 'نص طويل داخل طبقة ضيقة',
      body: 'نتحقق أولاً من إمكانية احتوائه، ثم نقرر كيفية إعادة التنسيق. المواضع غير المناسبة تذهب إلى قائمة الاستثناءات، دون تصغير حجم الخط بصمت.'
    },
    de: {
      title: 'Langer Text in einer schmalen Ebene',
      body: 'Erst prüfen, ob er passt, dann über das Layout entscheiden. Stellen, die nicht passen, wandern in die Ausnahmeliste; die Schrift wird nicht still verkleinert.'
    }
  };
  var FONT_STACKS = {
    sans: '"Source Han Sans SC","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif',
    serif: '"Source Han Serif SC","Noto Serif SC","Songti SC",SimSun,Georgia,serif',
    inter: 'Inter,"Segoe UI",system-ui,sans-serif',
    georgia: 'Georgia,"Songti SC",SimSun,serif',
    thai: '"Noto Sans Thai","Leelawadee UI",Tahoma,sans-serif',
    mono: 'Consolas,"Cascadia Mono","Microsoft YaHei",monospace'
  };
  var LAB_DEFAULTS = { font: 'sans', weight: 700, leading: 1.5, tracking: 0, sample: 'zh' };

  function initLabs() {
    $$('[data-lab]').forEach(function (root) {
      var preview = $('.lab-preview', root);
      var title = $('[data-lab-title]', root);
      var body = $('[data-lab-body]', root);
      var fontSel = $('[data-lab-font]', root);
      var weight = $('[data-lab-weight]', root);
      var leading = $('[data-lab-leading]', root);
      var tracking = $('[data-lab-tracking]', root);
      var sampleSel = $('[data-lab-sample]', root);
      var weightVal = $('[data-lab-weight-val]', root);
      var leadingVal = $('[data-lab-leading-val]', root);
      var trackingVal = $('[data-lab-tracking-val]', root);
      var applyBtn = $('[data-lab-apply]', root);
      var resetBtn = $('[data-lab-reset]', root);
      var split = $('[data-lab-split]', root);
      var applied = $('[data-lab-applied]', root);
      var readLines = $('[data-lab-lines]', root);
      var readHeight = $('[data-lab-height]', root);
      var readWidth = $('[data-lab-width]', root);
      var readState = $('[data-lab-state]', root);
      var groupRow = $('[data-group]', root);
      var appliedState = null;

      function fontLabel(key) {
        if (!fontSel) return key;
        var opt = $$('option', fontSel).filter(function (o) { return o.value === key; })[0];
        return opt ? (isZh() ? (opt.dataset.zh || opt.textContent) : (opt.dataset.en || opt.textContent)) : key;
      }
      function unitWeight() { return weight ? Number(weight.value) : LAB_DEFAULTS.weight; }
      function unitLeading() { return leading ? Number(leading.value) : LAB_DEFAULTS.leading; }
      function unitTracking() { return tracking ? Number(tracking.value) / 100 : LAB_DEFAULTS.tracking; }

      function paintVars() {
        if (!preview) return;
        var key = fontSel ? fontSel.value : LAB_DEFAULTS.font;
        preview.style.setProperty('--pv-font', FONT_STACKS[key] || FONT_STACKS.sans);
        preview.style.setProperty('--pv-weight', String(unitWeight()));
        preview.style.setProperty('--pv-leading', String(unitLeading()));
        preview.style.setProperty('--pv-tracking', unitTracking() + 'em');
      }
      function paintLabels() {
        if (weightVal) weightVal.textContent = String(unitWeight());
        if (leadingVal) leadingVal.textContent = unitLeading().toFixed(2);
        if (trackingVal) trackingVal.textContent = (unitTracking() * 1000).toFixed(0);
      }
      function paintSample() {
        var key = sampleSel ? sampleSel.value : LAB_DEFAULTS.sample;
        var sample = LAB_SAMPLES[key] || LAB_SAMPLES.zh;
        if (title) title.textContent = sample.title;
        if (body) body.textContent = sample.body;
        if (preview) {
          preview.setAttribute('dir', key === 'ar' ? 'rtl' : 'ltr');
          preview.setAttribute('lang', key);
        }
      }
      function measure() {
        if (!title || !body) return;
        var st = lineStats(title);
        var sb = lineStats(body);
        var h = Math.round(title.getBoundingClientRect().height + body.getBoundingClientRect().height);
        var w = Math.round(preview ? preview.getBoundingClientRect().width : 0);
        if (readLines) readLines.textContent = st.lines + ' + ' + sb.lines;
        if (readHeight) readHeight.textContent = h + ' px';
        if (readWidth) readWidth.textContent = w + ' px';
        if (readState) {
          var bad = st.lines > 3 || sb.lines > 7;
          readState.textContent = bad
            ? pick('超出示意范围，需人工看版面', 'Outside the schematic range; check the layout')
            : pick('在示意范围内', 'Within the schematic range');
          readState.classList.toggle('bad', bad);
        }
      }
      function paintGroupRow() {
        if (!groupRow) return;
        var map = $('[data-fg-map]', groupRow);
        var weightCell = $('[data-fg-weight]', groupRow);
        var key = fontSel ? fontSel.value : LAB_DEFAULTS.font;
        if (map) map.textContent = fontLabel(key) + ' · ' + unitWeight();
        if (weightCell) weightCell.textContent = String(unitWeight());
        groupRow.classList.add('applied');
      }
      function restoreGroupRow() {
        if (!groupRow) return;
        var map = $('[data-fg-map]', groupRow);
        var weightCell = $('[data-fg-weight]', groupRow);
        if (map) map.textContent = map.dataset.orig || map.textContent;
        if (weightCell) weightCell.textContent = weightCell.dataset.orig || weightCell.textContent;
        groupRow.classList.remove('applied');
      }

      function updateAll() {
        paintVars();
        paintLabels();
        paintSample();
        measure();
        if (appliedState) paintGroupRow();
      }

      [fontSel, weight, leading, tracking].forEach(function (el) {
        if (el) el.addEventListener('input', updateAll);
        if (el) el.addEventListener('change', updateAll);
      });
      if (sampleSel) sampleSel.addEventListener('change', updateAll);
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          appliedState = true;
          paintVars();
          paintGroupRow();
          if (applied) applied.classList.add('show');
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          appliedState = null;
          if (fontSel) fontSel.value = LAB_DEFAULTS.font;
          if (weight) weight.value = String(LAB_DEFAULTS.weight);
          if (leading) leading.value = String(LAB_DEFAULTS.leading);
          if (tracking) tracking.value = String(Math.round(LAB_DEFAULTS.tracking * 100));
          if (sampleSel) sampleSel.value = LAB_DEFAULTS.sample;
          restoreGroupRow();
          if (applied) applied.classList.remove('show');
          updateAll();
        });
      }
      if (split) {
        split.addEventListener('change', function () {
          $$('.fg-sub', root).forEach(function (row) { row.classList.toggle('show', split.checked); });
        });
      }
      if (groupRow) {
        var map = $('[data-fg-map]', groupRow);
        var weightCell = $('[data-fg-weight]', groupRow);
        if (map) map.dataset.orig = map.textContent;
        if (weightCell) weightCell.dataset.orig = weightCell.textContent;
      }

      updateAll();
      onRefresh(function () {
        paintSample();
        paintLabels();
        measure();
        if (appliedState) paintGroupRow();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* wrap + read-back demo                                               */
  /* ------------------------------------------------------------------ */
  function initWraps() {
    $$('[data-wrap]').forEach(function (root) {
      var input = $('[data-wrap-width]', root);
      var inner = $('.canvas-inner', root);
      var p = $('.canvas-inner p', root);
      var status = $('[data-rb-status]', root);
      var plannedEl = $('[data-rb-planned]', root);
      var renderedEl = $('[data-rb-rendered]', root);
      var modeButtons = $$('[data-mode]', root);
      var mode = 'paragraph';

      function measure() {
        if (!p) return;
        var rendered = lineStats(p).lines;
        var planned = mode === 'box' ? null : (p.querySelectorAll('br').length + 1);
        if (plannedEl) plannedEl.textContent = planned === null ? '—' : String(planned);
        if (renderedEl) renderedEl.textContent = String(rendered);
        if (status) {
          if (mode === 'box') {
            status.dataset.state = 'box';
            status.classList.remove('ok', 'warn');
          } else if (planned === rendered) {
            status.dataset.state = 'ok';
            status.classList.remove('warn');
            status.classList.add('ok');
          } else {
            status.dataset.state = 'warn';
            status.classList.remove('ok');
            status.classList.add('warn');
          }
        }
      }
      if (input) {
        var setWidth = function () {
          if (inner) inner.style.setProperty('--cw', input.value + 'px');
          measure();
        };
        input.addEventListener('input', setWidth);
        setWidth();
      }
      modeButtons.forEach(function (b) {
        b.addEventListener('click', function () {
          mode = b.dataset.mode || 'paragraph';
          modeButtons.forEach(function (x) {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
          measure();
        });
      });
      var read = $('[data-readback]', root);
      if (read) {
        read.addEventListener('click', function () {
          var canvas = $('.canvas', root);
          if (canvas && !reduce.matches) {
            canvas.classList.remove('reading');
            void canvas.offsetWidth;
            canvas.classList.add('reading');
            window.setTimeout(function () { canvas.classList.remove('reading'); }, 1200);
          }
          measure();
        });
      }
      measure();
      onRefresh(measure);
    });
  }

  function initOrphansDemo() {
    $$('[data-orphan]').forEach(function (root) {
      var line = $('.orphan-line', root);
      var cb = $('input[type="checkbox"]', root);
      var tag = $('.orphan-tag', root);
      var countEl = $('[data-orphan-count]', root);
      if (!line) return;

      function fix() {
        var chars = collectChars(line);
        if (!chars.length) return;
        var st = lineStats(line);
        if (st.last !== 1 || st.last >= chars.length) return;
        var span = wrapTail(line, 'zh');
        if (!span) return;
        var er = line.getBoundingClientRect();
        var sr = span.getBoundingClientRect();
        if (sr.right > er.right + 2 || sr.left < er.left - 2) unwrapNw(line);
      }

      function update() {
        unwrapNw(line);
        var allow = cb ? cb.checked : false;
        if (!allow) fix();
        var st = lineStats(line);
        var n = st.last;
        if (countEl) countEl.textContent = String(n);
        if (tag) {
          tag.textContent = pick('末行 ' + n + ' 个字', 'Last line: ' + n + (n === 1 ? ' char' : ' chars'));
          tag.classList.toggle('bad', allow && n <= 1);
          tag.classList.toggle('ok', !allow || n > 1);
        }
      }
      if (cb) cb.addEventListener('change', update);
      onRefresh(update);
      update();
    });
  }

  /* ------------------------------------------------------------------ */
  /* compare slider                                                      */
  /* ------------------------------------------------------------------ */
  function initCompares() {
    $$('[data-compare]').forEach(function (root) {
      var input = $('input[type="range"]', root);
      var after = $('.compare-after', root);
      var handle = $('.compare-handle', root);
      if (!input) return;
      function update() {
        var v = Number(input.value);
        if (after) after.style.clipPath = 'inset(0 0 0 ' + v + '%)';
        if (handle) handle.style.left = v + '%';
        input.setAttribute('aria-valuetext', pick(
          '左侧为手工逐语种示意，右侧为一次批次示意；分隔线在 ' + v + '%',
          'Left side: manual per-language schematic. Right side: one batch. Divider at ' + v + '%.'
        ));
      }
      input.addEventListener('input', update);
      update();
      onRefresh(update);
    });
  }

  /* ------------------------------------------------------------------ */
  /* fit quiz (three questions)                                          */
  /* ------------------------------------------------------------------ */
  function initQuizzes() {
    $$('[data-quiz]').forEach(function (root) {
      var result = $('[data-quiz-result]', root);
      var reset = $('[data-quiz-reset]', root);
      var questions = $$('.quiz-q', root);

      function render() {
        if (!result) return;
        var answered = 0;
        var blockers = [];
        questions.forEach(function (q) {
          var checked = $('input:checked', q);
          if (!checked) return;
          answered++;
          if (checked.value === 'no') {
            blockers.push(pick(q.dataset.noZh || '', q.dataset.noEn || ''));
          }
        });
        result.innerHTML = '';
        if (answered < questions.length) {
          result.dataset.state = 'wait';
          var b = doc.createElement('b');
          b.textContent = pick('还差 ' + (questions.length - answered) + ' 个问题', (questions.length - answered) + ' question' + (questions.length - answered === 1 ? '' : 's') + ' left');
          var p = doc.createElement('p');
          p.textContent = pick('三项都选完，才给出自查结果。自查只基于这三项输入。', 'Answer all three to get a self-check result. It reflects these three inputs only.');
          result.appendChild(b);
          result.appendChild(p);
          return;
        }
        if (!blockers.length) {
          result.dataset.state = 'fit';
          var t = doc.createElement('b');
          t.textContent = pick('可以先进入试跑确认', 'You can move to a pilot check');
          var d = doc.createElement('p');
          d.textContent = pick('三项都在示意范围内。这不是兼容性承诺；试跑前仍要核对稿件、表格与目标语种。', 'All three are within the schematic range. This is not a compatibility guarantee; the draft, table, and languages still need checking before a pilot.');
          result.appendChild(t);
          result.appendChild(d);
        } else {
          result.dataset.state = 'no';
          var t2 = doc.createElement('b');
          t2.textContent = pick('先处理这几项，再谈试跑', 'Handle these first, then talk about a pilot');
          var ul = doc.createElement('ul');
          blockers.forEach(function (text) {
            var li = doc.createElement('li');
            li.textContent = text;
            ul.appendChild(li);
          });
          result.appendChild(t2);
          result.appendChild(ul);
        }
      }
      $$('input[type="radio"]', root).forEach(function (r) { r.addEventListener('change', render); });
      if (reset) {
        reset.addEventListener('click', function () {
          $$('input[type="radio"]', root).forEach(function (r) { r.checked = false; });
          render();
        });
      }
      onRefresh(render);
      render();
    });
  }

  /* ------------------------------------------------------------------ */
  /* ROI / repeated-work calculator                                      */
  /* ------------------------------------------------------------------ */
  function initRois() {
    $$('[data-roi]').forEach(function (root) {
      var drafts = $('[data-roi-drafts]', root);
      var langs = $('[data-roi-langs]', root);
      var mins = $('[data-roi-mins]', root);
      var setup = $('[data-roi-setup]', root);
      var big = $('[data-roi-big]', root);
      var sub = $('[data-roi-sub]', root);
      var note = $('[data-roi-note]', root);
      var barManual = $('[data-roi-bar="manual"]', root);
      var barSetup = $('[data-roi-bar="setup"]', root);

      function fmtMin(m) {
        var sign = m < 0 ? '−' : '';
        var a = Math.abs(Math.round(m));
        var h = Math.floor(a / 60);
        var mm = a % 60;
        if (isZh()) {
          if (!h) return sign + mm + ' 分';
          return sign + h + ' 小时 ' + mm + ' 分';
        }
        if (!h) return sign + mm + ' min';
        return sign + h + ' h ' + mm + ' min';
      }
      function calc() {
        var d = clamp(Number(drafts && drafts.value) || 1, 1, 12);
        var l = clamp(Number(langs && langs.value) || 1, 1, 12);
        var m = clamp(Number(mins && mins.value) || 1, 1, 240);
        var s = clamp(Number(setup && setup.value) || 0, 0, 200);
        var passes = d * l;
        var manual = passes * m;
        var setupMin = s * 60;
        var net = manual - setupMin;
        if (big) {
          big.classList.toggle('neg', net < 0);
          big.textContent = fmtMin(net);
        }
        if (sub) {
          sub.textContent = pick(
            '重复 ' + fmt(passes) + ' 次 × ' + m + ' 分钟 − 一次性准备 ' + s + ' 小时',
            fmt(passes) + ' repeats × ' + m + ' min − ' + s + ' h one-off setup'
          );
        }
        if (note) {
          note.textContent = net < 0
            ? pick('按这些假设，一次性准备比重复更费时。结果照实显示。', 'Under these assumptions, one-off setup costs more than repeating. Shown as-is.')
            : pick('按这些假设，重复工时高于一次性准备。结果只算这两项。', 'Under these assumptions, repeated work costs more than one-off setup. These two items only.');
        }
        var max = Math.max(manual, setupMin, 1);
        if (barManual) barManual.style.width = (manual / max) * 100 + '%';
        if (barSetup) barSetup.style.width = (setupMin / max) * 100 + '%';
      }
      [drafts, langs, mins, setup].forEach(function (el) { if (el) el.addEventListener('input', calc); });
      onRefresh(calc);
      calc();
    });
  }

  /* ------------------------------------------------------------------ */
  /* shop language tabs                                                  */
  /* ------------------------------------------------------------------ */
  function initShops() {
    $$('[data-shop]').forEach(function (root) {
      var buttons = $$('[data-shop-lang]', root);
      var cards = $$('[data-shop-card]', root);
      var note = $('[data-shop-note]', root);
      function set(lang) {
        buttons.forEach(function (b) {
          var on = b.dataset.shopLang === lang;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        cards.forEach(function (card) {
          card.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
          var name = $('[data-shop-name]', card);
          var desc = $('[data-shop-desc]', card);
          if (name && name.dataset[lang]) name.textContent = name.dataset[lang];
          if (desc && desc.dataset[lang]) desc.textContent = desc.dataset[lang];
        });
        if (note) {
          var b = buttons.filter(function (x) { return x.dataset.shopLang === lang; })[0];
          note.textContent = pick(
            '目标语种预览：' + (b ? b.dataset.zh : lang),
            'Target-language preview: ' + (b ? b.dataset.en : lang)
          );
        }
      }
      buttons.forEach(function (b) {
        b.addEventListener('click', function () { set(b.dataset.shopLang); });
      });
      set('en');
    });
  }

  /* ------------------------------------------------------------------ */
  /* marketplace tabs (schematic)                                        */
  /* ------------------------------------------------------------------ */
  function initSites() {
    $$('[data-sites]').forEach(function (root) {
      var tabs = $$('[data-site-tab]', root);
      var panels = $$('[data-site-panel]', root);
      function set(code) {
        tabs.forEach(function (b) {
          var on = b.dataset.siteTab === code;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        panels.forEach(function (p) { p.hidden = p.dataset.sitePanel !== code; });
      }
      tabs.forEach(function (b) {
        b.addEventListener('click', function () { set(b.dataset.siteTab); });
      });
      if (tabs.length) set(tabs[0].dataset.siteTab);
    });
  }

  /* ------------------------------------------------------------------ */
  /* work-split board (schematic)                                        */
  /* ------------------------------------------------------------------ */
  function initScope() {
    $$('[data-scope]').forEach(function (root) {
      var rows = $$('[data-scope-row]', root);
      var sum = $('[data-scope-sum]', root);
      function update() {
        var c = { vendor: 0, tool: 0, you: 0 };
        rows.forEach(function (row) {
          var on = $('[data-scope-set][aria-pressed="true"]', row);
          if (on) c[on.dataset.scopeSet] = (c[on.dataset.scopeSet] || 0) + 1;
        });
        if (sum) sum.textContent = pick(
          '工具 ' + c.tool + ' 段 · 乙方 ' + c.vendor + ' 段 · 你 ' + c.you + ' 段',
          'Tool ' + c.tool + ' · Vendor ' + c.vendor + ' · You ' + c.you
        );
      }
      rows.forEach(function (row) {
        $$('[data-scope-set]', row).forEach(function (b) {
          b.addEventListener('click', function () {
            $$('[data-scope-set]', row).forEach(function (x) {
              x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
            });
            update();
          });
        });
      });
      update();
    });
  }

  /* ------------------------------------------------------------------ */
  /* apply form (local only)                                             */
  /* ------------------------------------------------------------------ */
  function initApply() {
    $$('[data-apply]').forEach(function (root) {
      var form = $('form', root);
      if (!form) return;
      var name = $('[data-apply-name]', root);
      var email = $('[data-apply-email]', root);
      var wechat = $('[data-apply-wechat]', root);
      var project = $('[data-apply-project]', root);
      var error = $('[data-apply-error]', root);
      var summary = $('[data-apply-summary]', root);
      var pre = $('[data-apply-pre]', summary || root);
      var copy = $('[data-apply-copy]', root);
      var reset = $('[data-apply-reset]', root);
      var text = '';
      var errorKind = '';

      function showError(kind) {
        errorKind = kind;
        if (!error) return;
        error.hidden = false;
        error.textContent = kind === 'empty'
          ? pick('请填写称呼、邮箱和项目情况', 'Please fill in name, email, and project details')
          : pick('邮箱格式看起来不对，请检查', 'That email does not look right');
      }
      function clearError() {
        errorKind = '';
        if (error) { error.hidden = true; error.textContent = ''; }
      }
      function build() {
        var stamp = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var when = stamp.getFullYear() + '-' + pad(stamp.getMonth() + 1) + '-' + pad(stamp.getDate()) + ' ' + pad(stamp.getHours()) + ':' + pad(stamp.getMinutes());
        text = [
          pick('图译工坊 · 试跑申请摘要（未发送）', 'TuYi Workshop · pilot request summary (not sent)'),
          pick('称呼：', 'Name: ') + (name ? name.value.trim() : ''),
          pick('邮箱：', 'Email: ') + (email ? email.value.trim() : ''),
          pick('微信：', 'WeChat: ') + (wechat && wechat.value.trim() ? wechat.value.trim() : '—'),
          pick('项目：', 'Project: ') + (project ? project.value.trim() : ''),
          pick('生成时间：', 'Generated: ') + when
        ].join('\n');
        if (pre) pre.textContent = text;
        if (summary) summary.classList.add('show');
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearError();
        var n = name ? name.value.trim() : '';
        var em = email ? email.value.trim() : '';
        var p = project ? project.value.trim() : '';
        if (!n || !em || !p) {
          showError('empty');
          if (!n && name) name.focus();
          else if (!em && email) email.focus();
          else if (project) project.focus();
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
          showError('email');
          if (email) email.focus();
          return;
        }
        build();
        if (summary) summary.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'nearest' });
      });
      if (copy) {
        function setCopyLabel(zhText, enText) {
          var zhEl = $('.zh', copy);
          var enEl = $('.en', copy);
          if (zhEl && enEl) {
            zhEl.textContent = zhText;
            enEl.textContent = enText;
            return;
          }
          copy.textContent = pick(zhText, enText);
        }
        copy.addEventListener('click', function () {
          if (!text) return;
          function done() {
            setCopyLabel('已复制', 'Copied');
            window.setTimeout(function () { setCopyLabel('复制摘要', 'Copy summary'); }, 1600);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { fallback(); });
          } else { fallback(); }
          function fallback() {
            var ta = doc.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            doc.body.appendChild(ta);
            ta.select();
            try { doc.execCommand('copy'); done(); } catch (err) { /* nothing else to do */ }
            doc.body.removeChild(ta);
          }
        });
      }
      if (reset) {
        reset.addEventListener('click', function () {
          form.reset();
          text = '';
          clearError();
          if (summary) summary.classList.remove('show');
          if (pre) pre.textContent = '';
        });
      }
      onRefresh(function () {
        if (errorKind) showError(errorKind);
        if (text && copy && !$('.zh', copy)) {
          copy.textContent = pick('复制摘要', 'Copy summary');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */
  function boot() {
    setupNav();
    initStages();
    initTerms();
    initApps();
    initMatrices();
    initLabs();
    initWraps();
    initOrphansDemo();
    initCompares();
    initQuizzes();
    initRois();
    initShops();
    initSites();
    initScope();
    initApply();
    setupReveal();
    route(false);
    applyLang(readLang(), false);
    fitHeroes();
    fixAllOrphans();
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { fitHeroes(); fixAllOrphans(); });
    }
    window.addEventListener('load', function () { fitHeroes(); fixAllOrphans(); });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
