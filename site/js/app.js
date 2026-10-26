/* Chapter 4 website — menu, search, resource filters, Teacher Zone link. No dependencies. */
(function () {
  'use strict';
  var D = document;
  var DATA = window.SITE_DATA || { lessons: [], resources: [], teacher: [], categories: {}, packs: {} };
  var CONFIG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || D).querySelectorAll(s)); };

  /* ---------- mobile menu ---------- */
  var menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- search ---------- */
  var lessonById = {};
  DATA.lessons.forEach(function (l) { lessonById[l.id] = l; });
  var CAT_LABEL = { guides: 'Teacher Guides', 'answer-keys': 'Answer Keys', 'lesson-plans': 'Lesson Plans', assessment: 'Assessment' };
  var index = [];
  DATA.lessons.forEach(function (l) {
    index.push({ kind: 'Lesson ' + l.id, accent: l.accent, title: l.id + ' ' + l.title, sub: l.objective + ' · Textbook ' + l.pages,
      href: l.presentation, text: [l.id, 'lesson ' + l.id, 'topic ' + l.id, l.title, l.objective, l.keywords, 'presentation'].join(' ') });
    index.push({ kind: 'Materials', accent: l.accent, title: 'Student materials for ' + l.id + ' ' + l.title, sub: 'Worksheets, vocabulary, lab sheets and exit tickets',
      href: 'resources.html?lesson=' + l.id, text: [l.id, l.title, 'student materials resources worksheets'].join(' ') });
  });
  DATA.resources.forEach(function (r) {
    var l = lessonById[r.lesson] || {};
    index.push({ kind: DATA.categories[r.category] || 'Resource', accent: l.accent, title: r.title + ' — ' + r.lesson, sub: r.type + ' · Lesson ' + r.lesson + ' ' + (l.title || '') + (r.pdf ? ' · PDF' : '') + (r.docx ? ' + DOCX' : ''),
      href: r.pdf || r.docx, external: !!r.pdf, text: [r.title, r.type, r.lesson, l.title, DATA.categories[r.category], r.category, r.pdf ? 'pdf' : '', r.docx ? 'docx word' : ''].join(' ') });
  });
  Object.keys(DATA.categories).forEach(function (k) {
    index.push({ kind: 'Category', title: DATA.categories[k], sub: 'All ' + DATA.categories[k].toLowerCase() + ' for Chapter 4', href: 'resources.html?type=' + k, text: DATA.categories[k] + ' ' + k + ' category student resources' });
  });
  Object.keys(CAT_LABEL).forEach(function (k) {
    index.push({ kind: 'Teacher', title: CAT_LABEL[k], sub: 'Teacher Zone · kept in private storage', href: 'teacher-zone.html#' + k, text: CAT_LABEL[k] + ' teacher zone ' + k });
  });
  if (DATA.packs.studentPdf) index.push({ kind: 'Download', title: 'Student Pack (PDF)', sub: 'All student sheets in one PDF', href: DATA.packs.studentPdf.href, external: true, text: 'student pack pdf download all materials print' });
  if (DATA.packs.editableDocx) index.push({ kind: 'Download', title: 'Editable Files (DOCX)', sub: 'ZIP of all student Word files', href: DATA.packs.editableDocx.href, text: 'editable files docx word zip download all materials' });
  index.push({ kind: 'Page', title: 'Statement of Inquiry', sub: DATA.statementOfInquiry || '', href: 'index.html#hero-title', text: 'statement of inquiry soi unit ' + (DATA.statementOfInquiry || '') });
  index.push({ kind: 'Page', title: 'About this website', sub: 'What the Chapter 4 site contains', href: 'about.html', text: 'about help credits devices ipad' });
  index.forEach(function (it) { it.hay = norm(it.title + ' ' + it.text + ' ' + (it.sub || '')); it.t = norm(it.title); });

  function norm(s) { return String(s || '').toLowerCase().replace(/[–—-]/g, ' ').replace(/\s+/g, ' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mark(s, terms) {
    var out = esc(s);
    terms.forEach(function (t) { if (t.length > 1) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  }
  function search(q) {
    var terms = norm(q).trim().split(' ').filter(Boolean);
    if (!terms.length) return [];
    return index.map(function (it) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (it.hay.indexOf(t) < 0) return null;
        score += it.t.indexOf(t) >= 0 ? 3 : 1;
        if (it.t.indexOf(t) === 0) score += 2;
      }
      if (/^lesson|^\d/.test(it.kind) || it.kind.indexOf('Lesson') === 0) score += 1;
      return { it: it, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 14).map(function (r) { return r.it; });
  }

  var dlg = $('#search'), input = $('#q'), list = $('#results'), sel = -1;
  function render() {
    var q = input.value, items;
    sel = -1;
    if (!q.trim()) {
      list.innerHTML = '<li class="hint">Lessons</li>' + DATA.lessons.map(function (l) {
        return '<li><a href="' + esc(l.presentation) + '" class="' + l.accent + '"><span class="k">Lesson ' + l.id + '</span><span><span class="t">' + esc(l.title) + '</span><br><span class="s">' + esc(l.objective) + '</span></span></a></li>';
      }).join('') + '<li class="hint">Try: vocabulary, 4.3, iodine, surface tension, exit ticket</li>';
      return;
    }
    items = search(q);
    var terms = norm(q).trim().split(' ');
    list.innerHTML = items.length ? items.map(function (it) {
      return '<li><a href="' + esc(it.href) + '"' + (it.external ? ' target="_blank" rel="noopener"' : '') + ' class="' + (it.accent || '') + '"><span class="k">' + esc(it.kind) + '</span><span><span class="t">' + mark(it.title, terms) + '</span><br><span class="s">' + mark(it.sub || '', terms) + '</span></span></a></li>';
    }).join('') : '<li class="none">No results for “' + esc(q) + '”. Try a lesson number (4.1–4.4), a topic such as “protein”, or a type such as “vocabulary”.</li>';
  }
  function openSearch() {
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    input.value = ''; render(); setTimeout(function () { input.focus(); }, 30);
  }
  if (dlg && input) {
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', openSearch); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      var links = $$('a', list);
      // a search field would only clear itself on the first Escape; close the dialog instead
      if (e.key === 'Escape') { e.preventDefault(); dlg.close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = Math.max(0, Math.min(links.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
        links.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
        if (links[sel]) links[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var a = links[sel >= 0 ? sel : 0];
        if (a) a.click();
      }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(function () { if (dlg.open) dlg.close(); }, 0); });
    D.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); openSearch(); }
    });
  }

  /* ---------- resources page filters ---------- */
  var grid = $('#res-grid');
  if (grid) {
    var cards = $$('.res', grid), countEl = $('#count'), empty = $('#empty');
    var params = new URLSearchParams(location.search);
    var state = { lesson: params.get('lesson') || '', type: params.get('type') || '' };
    if (state.lesson && !lessonById[state.lesson]) state.lesson = '';
    if (state.type && !DATA.categories[state.type]) state.type = '';
    var apply = function (push) {
      $$('.chip[data-f]').forEach(function (c) { c.setAttribute('aria-pressed', String(state[c.getAttribute('data-f')] === c.getAttribute('data-v'))); });
      var n = 0;
      cards.forEach(function (c) {
        var ok = (!state.lesson || c.getAttribute('data-lesson') === state.lesson) && (!state.type || c.getAttribute('data-type') === state.type);
        c.hidden = !ok; if (ok) n++;
      });
      var bits = [];
      if (state.lesson) bits.push('Lesson ' + state.lesson + ' ' + lessonById[state.lesson].title);
      if (state.type) bits.push(DATA.categories[state.type]);
      countEl.textContent = n + (n === 1 ? ' resource' : ' resources') + (bits.length ? ' · ' + bits.join(' · ') : '');
      empty.hidden = n > 0;
      if (push) {
        var p = new URLSearchParams();
        if (state.lesson) p.set('lesson', state.lesson);
        if (state.type) p.set('type', state.type);
        try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash); } catch (err) { /* file:// in some browsers */ }
      }
    };
    $$('.chip[data-f]').forEach(function (c) {
      c.addEventListener('click', function () { state[c.getAttribute('data-f')] = c.getAttribute('data-v'); apply(true); });
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () { state.lesson = ''; state.type = ''; apply(true); });
    apply(false);
  }

  /* ---------- Teacher Zone: link to private storage when one is configured ---------- */
  var storage = $('#storage');
  if (storage) {
    if (CONFIG.teacherStorageUrl && /^https:\/\//.test(CONFIG.teacherStorageUrl)) {
      storage.innerHTML = '<a class="btn solid green" style="display:inline-flex;padding:0 22px" href="' + esc(CONFIG.teacherStorageUrl) + '" target="_blank" rel="noopener">' +
        esc(CONFIG.teacherStorageLabel || 'Open teacher folder') + '</a> <span class="count" style="margin-left:10px">Staff sign-in is handled by the school storage service, not by this website.</span>';
    } else {
      storage.innerHTML = '<div class="notice info"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg><div>No staff-only storage link has been added yet. Teachers: ask the Grade 7 Biology teacher for access to the Chapter 4 teacher folder.</div></div>';
    }
  }
})();
