/* 关键词落地页交互。无网络请求。 */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function isZh() { return html.getAttribute('data-lang') !== 'en'; }
  function pick(zh, en) { return isZh() ? zh : en; }

  /* ---------------- 语言 ---------------- */
  var LANG_KEY = 'tygf.kwland.lang';

  function readLang() {
    var dflt = html.getAttribute('data-default-lang') === 'en' ? 'en' : 'zh';
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'zh') return q;
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (e) { /* file:// */ }
    return dflt;
  }

  function applyLang(lang, persist) {
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    if (persist) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} }

    var t = doc.querySelector('title');
    if (t && t.dataset.zh) doc.title = lang === 'zh' ? t.dataset.zh : t.dataset.en;
    var d = doc.querySelector('meta[name="description"]');
    if (d && d.dataset.zh) d.setAttribute('content', lang === 'zh' ? d.dataset.zh : d.dataset.en);

    $$('.lang-toggle').forEach(function (b) {
      b.textContent = lang === 'zh' ? 'EN' : '中文';
      b.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
    });

    window.setTimeout(function () { refresh(); fitHeroes(); fixAllOrphans(); }, 30);
  }

  /* ---------------- 首屏标题不折行 ---------------- */
  function fitHeroes() {
    $$('.kw-hero h1, .idx-hero h1').forEach(function (h1) {
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
        h1.style.setProperty('font-size', Math.max(28, Math.floor(base * (avail / maxW) * 97) / 100) + 'px', 'important');
      }
    });
  }

  /* ---------------- 单字不成行 ---------------- */
  function shown(el) { return !!el && window.getComputedStyle(el).display !== 'none'; }

  function textNodes(root) {
    var out = [];
    var w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || !shown(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) out.push(n);
    return out;
  }

  function collectChars(root) {
    var out = [];
    textNodes(root).forEach(function (node) {
      var t = node.nodeValue;
      for (var i = 0; i < t.length; i++) {
        if (/\s/.test(t.charAt(i))) continue;
        var r = doc.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        var rect = r.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) continue;
        out.push({ top: Math.round(rect.top * 10) / 10 });
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
      for (var i = 0; i < tops.length; i++) if (Math.abs(tops[i] - c.top) <= 5) { hit = true; break; }
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

  function lastVisibleRoot(el) {
    var kids = $$('.zh, .en', el).filter(function (c) { return shown(c) && (c.textContent || '').trim(); });
    return kids.length ? kids[kids.length - 1] : el;
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
    } catch (e) { return null; }
    return span;
  }

  function isOrphan(last, total) {
    if (last <= 0 || last >= total) return false;
    return isZh() ? last === 1 : last <= 6;
  }

  function fixOne(el) {
    if (el.closest('[data-no-og]')) return;
    if (window.getComputedStyle(el).whiteSpace !== 'normal') return;
    var root = lastVisibleRoot(el);
    if (!root) return;
    if (collectChars(el).length < 3) return;
    var stats = lineStats(el);
    if (!isOrphan(stats.last, stats.length)) return;

    var beforeH = el.getBoundingClientRect().height;
    var span = wrapTail(root, isZh() ? 'zh' : 'en');
    if (!span) return;
    var er = el.getBoundingClientRect();
    var sr = span.getBoundingClientRect();
    if (sr.right > er.right + 2 || sr.left < er.left - 2 || el.getBoundingClientRect().height > beforeH + 1.5) {
      unwrapNw(el);
      return;
    }
    el.dataset.og = 'fixed';
  }

  var SEL = '.og, p, li, blockquote, figcaption, dt, dd, .kw-head h2, .icard h3, .step h3, .idx-body .q';

  function fixAllOrphans() {
    var list = $$(SEL);
    if (!isZh()) list = list.filter(function (el) { return el.classList.contains('og'); });
    list.forEach(function (el) { unwrapNw(el); });
    list.forEach(fixOne);
  }

  /* ---------------- 12 语种写回演示 ---------------- */
  var STATUS_TEXT = {
    ok: { zh: '已确认', en: 'Confirmed' },
    warn: { zh: '待复查', en: 'Review' },
    blocked: { zh: '需要你决定', en: 'Your call' }
  };

  function initDemo() {
    $$('[data-demo]').forEach(function (box) {
      var dataEl = doc.getElementById('kw-langs');
      if (!dataEl) return;
      var langs;
      try { langs = JSON.parse(dataEl.textContent); } catch (e) { return; }

      var body = $('.ps-body', box);
      var titleEl = $('[data-slot="title"]', box);
      var subEl = $('[data-slot="sub"]', box);
      var tagEl = $('[data-slot="tag"]', box);
      var frame = $('.ps-bar .idx', box);
      var rbWrap = $('.rb', box);
      var countEl = $('[data-count]', box);
      var btns = $$('.lg', box);

      function rowsFor(code) {
        var level = code === 'ar' ? 'blocked' : (['de', 'ru', 'pt'].indexOf(code) >= 0 ? 'warn' : 'ok');
        if (level === 'blocked') return ['blocked', 'warn', 'ok'];
        if (level === 'warn') return ['warn', 'ok', 'ok'];
        return ['ok', 'ok', 'ok'];
      }

      function render(code) {
        var lang = null;
        for (var i = 0; i < langs.length; i++) if (langs[i].code === code) { lang = langs[i]; break; }
        if (!lang) return;

        btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.code === code)); });
        /* 整块跟着方向走：只翻 .ps-body 会让同一张卡里一半 ltr、一半 rtl。 */
        box.setAttribute('dir', lang.dir || 'ltr');
        body.setAttribute('dir', lang.dir || 'ltr');
        titleEl.textContent = lang.sample;
        subEl.textContent = pick('同一句话在不同语言里的长度不一样，长的会被单独标出来。',
          'The same sentence runs to different lengths per language; the long ones get flagged.');
        tagEl.textContent = lang.code.toUpperCase() + pick(' · 示意', ' · schematic');
        if (frame) titleEl.setAttribute('data-frame', frame.textContent);

        var rows = rowsFor(code);
        var names = rbWrap ? $$('.rb-item .ln', rbWrap) : [];
        var badges = rbWrap ? $$('.st-badge', rbWrap) : [];
        var done = 0;
        rows.forEach(function (r, i) {
          var b = badges[i];
          if (!b) return;
          b.className = 'st-badge ' + (r === 'ok' ? 'done' : r === 'warn' ? 'review' : 'blocked');
          b.textContent = STATUS_TEXT[r][pick('zh', 'en')];
          if (r === 'ok') done++;
        });
        if (countEl) {
          countEl.textContent = (rows.length * 1) + pick(' 层读回 · ', ' layers read · ') + done + pick(' 已确认', ' confirmed');
        }
        fixAllOrphans();
      }

      btns.forEach(function (b) {
        b.addEventListener('click', function () { render(b.dataset.code); });
      });
      box._kwRender = render;
      var first = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
      if (first) render(first.dataset.code);
    });
  }

  function tpLabel(btn) {
    var wrap = btn.closest('[data-transpose]');
    var table = wrap ? $('table', wrap) : null;
    var flipped = table && table.dataset.flipped === 'true';
    btn.textContent = flipped ? pick('按路线看', 'By route') : pick('按项目看', 'By item');
  }

  /* 语言切换后，脚本写入的文字要跟着换 */
  function refresh() {
    $$('[data-demo]').forEach(function (box) {
      if (!box._kwRender) return;
      var on = $$('.lg', box).filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
      if (on) box._kwRender(on.dataset.code);
    });
    $$('[data-tp-toggle]').forEach(tpLabel);
  }

  /* ---------------- 对比表转置 ---------------- */
  function initTranspose() {
    $$('[data-transpose]').forEach(function (wrap) {
      var btn = $('[data-tp-toggle]', wrap);
      var table = $('table', wrap);
      if (!btn || !table) return;
      /* 连 class 与 scope 一起搬：丢 class 会让 .og 断行控制与 .a 强调线一去不回。 */
      function grab(el) {
        return { html: el.innerHTML, cls: el.className || '', scope: el.getAttribute('scope') || '' };
      }
      function emit(cell, tag) {
        return '<' + tag + (cell.cls ? ' class="' + cell.cls + '"' : '') +
          (cell.scope ? ' scope="' + cell.scope + '"' : '') + '>' + cell.html + '</' + tag + '>';
      }
      var head = $$('thead th', table).map(grab);
      var rows = $$('tbody tr', table).map(function (tr) {
        var th = $('th', tr);
        return { h: th ? grab(th) : { html: '', cls: '', scope: '' }, cells: $$('td', tr).map(grab) };
      });
      var state = { flipped: false };
      function paint() {
        var out = [];
        if (!state.flipped) {
          out.push('<thead><tr>' + head.map(function (c) { return emit(c, 'th'); }).join('') + '</tr></thead>');
          out.push('<tbody>' + rows.map(function (r) {
            return '<tr>' + emit(r.h, 'th') + r.cells.map(function (c) { return emit(c, 'td'); }).join('') + '</tr>';
          }).join('') + '</tbody>');
        } else {
          out.push('<thead><tr>' + emit(head[0], 'th') + rows.map(function (r) {
            return '<th scope="col">' + r.h.html + '</th>';
          }).join('') + '</tr></thead>');
          out.push('<tbody>' + head.slice(1).map(function (h, ci) {
            return '<tr><th scope="row">' + h.html + '</th>' + rows.map(function (r) {
              return emit(r.cells[ci] || { html: '', cls: '', scope: '' }, 'td');
            }).join('') + '</tr>';
          }).join('') + '</tbody>');
        }
        table.innerHTML = out.join('');
        table.dataset.flipped = String(state.flipped);
        btn.setAttribute('aria-pressed', String(state.flipped));
        btn.textContent = state.flipped ? pick('按路线看', 'By route') : pick('按项目看', 'By item');
      }
      btn.addEventListener('click', function () {
        state.flipped = !state.flipped;
        paint();
      });
      tpLabel(btn);
    });
  }

  /* ---------------- 清单勾选 ---------------- */
  function initChecklist() {
    $$('[data-checklist]').forEach(function (wrap) {
      var key = 'tygf.kwland.chk.' + (wrap.dataset.checklist || 'x');
      var boxes = $$('input[type="checkbox"]', wrap);
      var totalEl = $('[data-total]', wrap);
      var reset = $('[data-reset]', wrap);

      function save() {
        try {
          localStorage.setItem(key, JSON.stringify(boxes.map(function (b) { return b.checked ? 1 : 0; })));
        } catch (e) { /* ignore */ }
      }
      function paint() {
        var done = boxes.filter(function (b) { return b.checked; }).length;
        if (totalEl) totalEl.textContent = done + ' / ' + boxes.length;
        $$('th[data-colhead]', wrap).forEach(function (th) {
          var col = $$('input[data-col="' + th.getAttribute('data-colhead') + '"]', wrap);
          var hit = col.filter(function (b) { return b.checked; }).length;
          var cnt = $('[data-count]', th);
          if (cnt) cnt.textContent = hit + ' / ' + col.length;
          th.classList.toggle('all', col.length > 0 && hit === col.length);
        });
      }
      try {
        var saved = JSON.parse(localStorage.getItem(key) || '[]');
        boxes.forEach(function (b, i) { if (saved[i]) b.checked = true; });
      } catch (e) { /* ignore */ }
      boxes.forEach(function (b) { b.addEventListener('change', function () { save(); paint(); }); });
      if (reset) reset.addEventListener('click', function () {
        boxes.forEach(function (b) { b.checked = false; });
        save(); paint();
      });
      paint();
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    initDemo();
    initTranspose();
    initChecklist();
    $$('.lang-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        applyLang(html.getAttribute('data-lang') === 'zh' ? 'en' : 'zh', true);
      });
    });
    applyLang(readLang(), false);
    fitHeroes();
    fixAllOrphans();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fitHeroes(); fixAllOrphans(); });
    window.addEventListener('load', function () { fitHeroes(); fixAllOrphans(); });
    var t = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(function () { fitHeroes(); fixAllOrphans(); }, 180);
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
