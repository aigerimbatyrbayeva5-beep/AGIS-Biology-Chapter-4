/* =====================================================================
   Chapter 4 spatial presentation engine (offline, no dependencies)
   - Continuous world canvas; each .step is a 1600x900 scene placed at
     data-x / data-y (centre, world units) with data-s (scale).
   - Camera flies between scenes on a smooth zoom-and-pan path
     (van Wijk & Nuij "optimal" path, as used by d3.interpolateZoom).
   - Teacher-paced builds, answer reveals, notes, reset, reduced motion.
   ===================================================================== */
(function () {
  'use strict';
  var D = document, W = window;
  var root = D.querySelector('.prezi');
  var viewport = root.querySelector('.viewport');
  var world = root.querySelector('.world');
  var steps = [].slice.call(world.querySelectorAll('.step'));
  var lessonId = root.getAttribute('data-lesson') || 'lesson';
  var RHO = parseFloat(root.getAttribute('data-rho')) || 1.3;
  var cam = { x: 0, y: 0, k: 1 };
  var cur = -1, anim = null, listeners = { change: [], enter: {}, reset: {} };

  var PHASES = {
    title: 'Opening', engage: 'Engage · 0–4 min', vocab: 'Vocabulary · 4–9 min',
    explore: 'Explore & Explain · 9–18 min', activity: 'Main activity · 18–30 min',
    apply: 'Apply · 30–37 min', exit: 'Exit ticket · 37–40 min'
  };

  /* ---------- preferences ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var savedMotion = store('ch4-reduced-motion');
  var reduced = savedMotion === null ? mq.matches : savedMotion === '1';
  root.classList.toggle('reduced', reduced);

  /* ---------- place steps ---------- */
  steps.forEach(function (s, i) {
    var x = +s.getAttribute('data-x') || 0, y = +s.getAttribute('data-y') || 0, sc = +s.getAttribute('data-s') || 1;
    s._x = x; s._y = y; s._s = sc; s._i = i;
    s.style.left = (x - 800) + 'px'; s.style.top = (y - 450) + 'px';
    s.style.transform = 'scale(' + sc + ')';
    var groups = {};
    [].forEach.call(s.querySelectorAll('[data-build]'), function (el) { groups[el.getAttribute('data-build')] = 1; });
    s._builds = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
    s._bi = 0;
    if (!s.id) s.id = 'scene-' + (i + 1);
  });

  /* ---------- journey path (dotted route that fills as the lesson moves on) ---------- */
  var journey = null;
  if (root.hasAttribute('data-journey')) {
    var NS = 'http://www.w3.org/2000/svg';
    var pts = steps.filter(function (s) { return !s.hasAttribute('data-overview') && !s.hasAttribute('data-nested') && !s.hasAttribute('data-nojourney'); });
    var svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'journey'); svg.setAttribute('width', '1'); svg.setAttribute('height', '1');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    var dFor = function (list) {
      var d = 'M' + list[0]._x + ' ' + list[0]._y;
      for (var i = 0; i < list.length - 1; i++) {
        var p0 = list[i - 1] || list[i], p1 = list[i], p2 = list[i + 1], p3 = list[i + 2] || p2, t = 0.5 / 3 * 2;
        d += ' C' + (p1._x + (p2._x - p0._x) * t / 2) + ' ' + (p1._y + (p2._y - p0._y) * t / 2) + ' ' +
          (p2._x - (p3._x - p1._x) * t / 2) + ' ' + (p2._y - (p3._y - p1._y) * t / 2) + ' ' + p2._x + ' ' + p2._y;
      }
      return d;
    };
    if (pts.length > 1) {
      var base = D.createElementNS(NS, 'path'), prog = D.createElementNS(NS, 'path');
      var dd = dFor(pts);
      base.setAttribute('d', dd); prog.setAttribute('d', dd);
      base.setAttribute('class', 'jp-base'); prog.setAttribute('class', 'jp-prog');
      svg.appendChild(base); svg.appendChild(prog);
      var art = world.querySelector('.world-art');
      world.insertBefore(svg, art ? art.nextSibling : world.firstChild);
      var total = prog.getTotalLength(), cum = {};
      var tmp = D.createElementNS(NS, 'path'); svg.appendChild(tmp);
      pts.forEach(function (s, i) { if (i === 0) { cum[s.id] = 0; return; } tmp.setAttribute('d', dFor(pts.slice(0, i + 1))); cum[s.id] = tmp.getTotalLength(); });
      svg.removeChild(tmp);
      prog.style.strokeDasharray = total + ' ' + total; prog.style.strokeDashoffset = total;
      journey = function (s) {
        var L = cum[s.id];
        if (L === undefined) { // nested scene: keep the parent's progress
          var best = 0; pts.forEach(function (p) { if (p._i < s._i) best = cum[p.id]; }); L = s.hasAttribute('data-overview') ? 0 : best;
        }
        prog.style.strokeDashoffset = total - L;
      };
    }
  }

  /* ---------- keep the viewport unscrolled ----------
     Opening a lesson at #scene makes the browser jump to that element, which scrolls even an
     overflow:hidden container and shifts every camera stop. The camera does all the moving. */
  function unscroll() { if (viewport.scrollLeft || viewport.scrollTop) { viewport.scrollLeft = 0; viewport.scrollTop = 0; } }
  viewport.addEventListener('scroll', unscroll);
  W.addEventListener('hashchange', unscroll);

  /* ---------- camera ---------- */
  function vw() { return viewport.clientWidth; }
  function vh() { return viewport.clientHeight; }
  function targetFor(s) {
    var k = Math.min(vw() / (1600 * s._s), vh() / (900 * s._s));
    return { x: s._x, y: s._y, k: k };
  }
  function apply(c) {
    cam = c;
    var tx = vw() / 2 - c.k * c.x, ty = vh() / 2 - c.k * c.y;
    world.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + c.k.toFixed(6) + ')';
  }
  function zoomInterp(p0, p1, rho) {
    var r2 = rho * rho, r4 = r2 * r2;
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, f, S;
    if (d2 < 1e-9) {
      S = Math.log(w1 / w0) / rho;
      f = function (t) { return [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)]; };
    } else {
      var d1 = Math.sqrt(d2),
        b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1),
        b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1),
        rr0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
        rr1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (rr1 - rr0) / rho;
      f = function (t) {
        var s = t * S, c0 = Math.cosh(rr0),
          u = w0 / (r2 * d1) * (c0 * Math.tanh(rho * s + rr0) - Math.sinh(rr0));
        return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / Math.cosh(rho * s + rr0)];
      };
    }
    f.S = Math.abs(S);
    return f;
  }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var fader = D.createElement('div'); fader.className = 'fader'; D.body.appendChild(fader);

  function fly(to, instant) {
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    if (instant) { world.classList.remove('moving'); apply(to); return; }
    if (reduced) {
      fader.classList.add('on');
      setTimeout(function () { apply(to); fader.classList.remove('on'); }, 170);
      return;
    }
    var w = vw(), I = zoomInterp([cam.x, cam.y, w / cam.k], [to.x, to.y, w / to.k], RHO);
    var dur = Math.max(750, Math.min(2300, 520 + I.S * 620));
    var t0 = performance.now();
    world.classList.add('moving');
    anim = {};
    (function frame(now) {
      var t = Math.min(1, (now - t0) / dur), p = I(ease(t));
      apply({ x: p[0], y: p[1], k: w / p[2] });
      if (t < 1) anim.raf = requestAnimationFrame(frame);
      else { anim = null; apply(to); world.classList.remove('moving'); }
    })(t0);
  }

  /* ---------- builds ---------- */
  function setBuild(s, n) {
    s._bi = n;
    var shown = s._builds.slice(0, n);
    [].forEach.call(s.querySelectorAll('[data-build]'), function (el) {
      el.classList.toggle('built', shown.indexOf(+el.getAttribute('data-build')) > -1);
    });
  }

  /* ---------- navigation ---------- */
  function goTo(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(steps.length - 1, i));
    var prev = steps[cur], s = steps[i];
    if (prev && prev !== s) prev.classList.remove('active');
    var changed = cur !== i;
    cur = i;
    s.classList.add('active');
    if (changed) setBuild(s, opts.fromEnd ? s._builds.length : 0);
    root.classList.toggle('is-overview', s.hasAttribute('data-overview'));
    fly(targetFor(s), !!opts.instant);
    try { history.replaceState(null, '', '#' + s.id); } catch (e) { location.hash = s.id; }
    updateHud();
    if (journey) journey(s);
    if (changed) {
      (listeners.enter[s.id] || []).forEach(function (fn) { fn(s); });
      listeners.change.forEach(function (fn) { fn(i, s); });
    }
  }
  function next() {
    var s = steps[cur];
    if (s._bi < s._builds.length) { setBuild(s, s._bi + 1); updateHud(); return; }
    if (cur < steps.length - 1) goTo(cur + 1);
  }
  function prev() {
    var s = steps[cur];
    if (s._bi > 0) { setBuild(s, s._bi - 1); updateHud(); return; }
    if (cur > 0) goTo(cur - 1, { fromEnd: true });
  }
  function overview() {
    for (var i = 0; i < steps.length; i++) if (steps[i].hasAttribute('data-overview')) return goTo(i);
    goTo(0);
  }

  /* ---------- answers & reset ---------- */
  function toggleAnswers(scope, force) {
    var ans = scope.querySelectorAll('.answer');
    if (!ans.length) return false;
    var show = force !== undefined ? force : ![].some.call(ans, function (a) { return a.classList.contains('shown'); });
    [].forEach.call(ans, function (a) { a.classList.toggle('shown', show); });
    [].forEach.call(scope.querySelectorAll('.reveal-btn'), function (b) { b.classList.toggle('on', show); syncRevealLabel(b); });
    return true;
  }
  function syncRevealLabel(b) {
    var on = b.classList.contains('on');
    b.innerHTML = on ? '&#10003; Hide answer' : '&#128065; Reveal answer';
  }
  function resetStep(s) {
    toggleAnswers(s, false);
    (listeners.reset[s.id] || []).forEach(function (fn) { fn(s); });
    [].forEach.call(s.querySelectorAll('.match-zone'), function (z) { if (z._reset) z._reset(); });
    setBuild(s, 0);
    toast('Scene reset');
    updateHud();
  }

  D.addEventListener('click', function (e) {
    var b = e.target.closest('.reveal-btn');
    if (b) {
      var scope = b.closest('.qa') || b.closest('.qcard') || b.parentNode;
      var show = !b.classList.contains('on');
      [].forEach.call(scope.querySelectorAll('.answer'), function (a) { a.classList.toggle('shown', show); });
      b.classList.toggle('on', show); syncRevealLabel(b);
      e.stopPropagation();
    }
  }, true);

  /* ---------- click a scene to fly to it ---------- */
  var down = null;
  viewport.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
  viewport.addEventListener('click', function (e) {
    if (!down || Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 8) return;
    if (e.target.closest('button, input, textarea, select, a, .chip, .slot, [data-interactive]')) return;
    var s = e.target.closest('.step');
    if (s && !s.classList.contains('active') && !s.hasAttribute('data-noclick')) goTo(s._i);
  });

  /* ---------- HUD ---------- */
  var ICON = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/>',
    motion: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7"/><path d="M12 17h.01"/>'
  };
  function btn(name, title, fn) {
    var b = D.createElement('button'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
    b.innerHTML = '<svg viewBox="0 0 24 24">' + ICON[name] + '</svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); b.blur(); });
    return b;
  }
  var hud = D.createElement('nav'); hud.className = 'hud'; hud.setAttribute('aria-label', 'Presentation controls');
  var count = D.createElement('span'); count.className = 'count';
  var phase = D.createElement('span'); phase.className = 'phase';
  var track = D.createElement('span'); track.className = 'track';
  var bMotion = btn('motion', 'Reduced motion on/off (M)', toggleMotion);
  var bNotes = btn('notes', 'Teacher notes (T)', toggleNotes);
  var sep = function () { var s = D.createElement('span'); s.className = 'sep'; return s; };
  hud.appendChild(btn('home', 'Overview (Home / O)', overview));
  hud.appendChild(btn('prev', 'Previous (← / PageUp)', prev));
  hud.appendChild(count);
  hud.appendChild(btn('next', 'Next (→ / Space / PageDown)', next));
  hud.appendChild(sep()); hud.appendChild(phase); hud.appendChild(track); hud.appendChild(sep());
  hud.appendChild(btn('eye', 'Reveal / hide answers in this scene (A)', function () {
    if (!toggleAnswers(steps[cur])) toast('No answers in this scene');
  }));
  hud.appendChild(btn('reset', 'Reset this scene (R)', function () { resetStep(steps[cur]); }));
  hud.appendChild(bNotes); hud.appendChild(bMotion);
  hud.appendChild(btn('full', 'Full screen (F)', toggleFull));
  hud.appendChild(btn('help', 'Keyboard help (H / ?)', toggleHelp));
  root.appendChild(hud);
  steps.forEach(function (s, i) {
    var dot = D.createElement('i'); dot.title = (i + 1) + '. ' + (s.getAttribute('data-title') || '');
    dot.addEventListener('click', function (e) { e.stopPropagation(); goTo(i); });
    track.appendChild(dot);
  });
  var line = D.createElement('div'); line.className = 'progress-line'; root.appendChild(line);

  function updateHud() {
    var s = steps[cur];
    count.textContent = (cur + 1) + ' / ' + steps.length;
    phase.textContent = PHASES[s.getAttribute('data-phase')] || '';
    [].forEach.call(track.children, function (d, i) { d.className = i === cur ? 'cur' : (i < cur ? 'done' : ''); });
    line.style.width = (steps.length > 1 ? (cur / (steps.length - 1)) * 100 : 0) + '%';
    bMotion.classList.toggle('on', reduced);
    if (drawer.classList.contains('open')) fillNotes();
  }
  var idleT;
  function wake() { hud.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(function () { hud.classList.add('idle'); }, 3500); }
  D.addEventListener('mousemove', wake); wake();

  /* ---------- notes drawer (teacher only, closed by default) ---------- */
  var drawer = D.createElement('aside'); drawer.className = 'notes-drawer'; drawer.setAttribute('aria-label', 'Teacher notes');
  root.appendChild(drawer);
  function fillNotes() {
    var s = steps[cur], n = s.querySelector('.notes');
    drawer.innerHTML = '<h4>Teacher notes · scene ' + (cur + 1) + ' of ' + steps.length + ' · ' + (PHASES[s.getAttribute('data-phase')] || '') +
      '</h4><h3>' + (s.getAttribute('data-title') || '') + '</h3>' + (n ? n.innerHTML : '<p>No notes for this scene.</p>');
  }
  function toggleNotes() { var o = !drawer.classList.contains('open'); if (o) fillNotes(); drawer.classList.toggle('open', o); bNotes.classList.toggle('on', o); }

  /* ---------- help ---------- */
  var help = D.createElement('div'); help.className = 'help';
  help.innerHTML = '<div class="box"><h3>Teacher controls</h3><table>' +
    '<tr><td><kbd>→</kbd> <kbd>Space</kbd> <kbd>PgDn</kbd></td><td>Next reveal / next scene</td></tr>' +
    '<tr><td><kbd>←</kbd> <kbd>PgUp</kbd></td><td>Back</td></tr>' +
    '<tr><td><kbd>Home</kbd> <kbd>O</kbd></td><td>Overview of the whole lesson map</td></tr>' +
    '<tr><td><kbd>End</kbd></td><td>Last scene (exit ticket)</td></tr>' +
    '<tr><td><kbd>A</kbd></td><td>Reveal / hide answers in this scene</td></tr>' +
    '<tr><td><kbd>R</kbd></td><td>Reset this scene (activities, answers, reveals)</td></tr>' +
    '<tr><td><kbd>T</kbd></td><td>Teacher notes drawer (hidden by default)</td></tr>' +
    '<tr><td><kbd>M</kbd></td><td>Reduced motion on / off</td></tr>' +
    '<tr><td><kbd>F</kbd></td><td>Full screen</td></tr>' +
    '<tr><td>Click a scene</td><td>Fly to that scene</td></tr>' +
    '</table><p style="margin:14px 0 0;color:#5b6576">Press any key or click to close.</p></div>';
  root.appendChild(help);
  function toggleHelp() { help.classList.toggle('open'); }
  help.addEventListener('click', function () { help.classList.remove('open'); });

  function toggleMotion() {
    reduced = !reduced; store('ch4-reduced-motion', reduced ? '1' : '0');
    root.classList.toggle('reduced', reduced); updateHud();
    toast(reduced ? 'Reduced motion: ON (camera cuts, no ambient animation)' : 'Reduced motion: OFF');
  }
  function toggleFull() {
    if (!D.fullscreenElement) { (D.documentElement.requestFullscreen || function () {}).call(D.documentElement); }
    else { D.exitFullscreen(); }
  }
  var toastEl = D.createElement('div'); toastEl.className = 'toast'; root.appendChild(toastEl); var toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 1800); }

  /* ---------- keyboard ---------- */
  D.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (help.classList.contains('open')) { help.classList.remove('open'); e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home' || k === 'o' || k === 'O') { e.preventDefault(); overview(); }
    else if (k === 'End') { e.preventDefault(); goTo(steps.length - 1); }
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'm' || k === 'M') toggleMotion();
    else if (k === 't' || k === 'T') toggleNotes();
    else if (k === 'a' || k === 'A') { if (!toggleAnswers(steps[cur])) toast('No answers in this scene'); }
    else if (k === 'r' || k === 'R') resetStep(steps[cur]);
    else if (k === 'h' || k === 'H' || k === '?') toggleHelp();
    else if (k === 'Escape') { drawer.classList.remove('open'); bNotes.classList.remove('on'); }
  });

  var rT;
  W.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { fly(targetFor(steps[cur]), true); }, 60); });

  /* =====================================================================
     Matching / sorting component
     <div class="match-zone"> .pool with .chip[data-k]   .slot[data-k][data-max]
     [data-check] button marks chips; [data-reset] restores. Drag or click-click.
     ===================================================================== */
  function initMatch(zone) {
    var chips = [].slice.call(zone.querySelectorAll('.chip'));
    var pool = zone.querySelector('.pool');
    var home = chips.map(function (c) { return { c: c, p: c.parentNode, n: c.nextSibling }; });
    var selected = null;
    function k() { return cam.k * (zone.closest('.step')._s || 1); }
    function slots() { return [].slice.call(zone.querySelectorAll('.slot')); }
    function clearMarks() { chips.forEach(function (c) { c.classList.remove('ok', 'no'); }); var sc = zone.querySelector('.score'); if (sc) sc.textContent = ''; }
    function place(chip, slot) {
      var max = +slot.getAttribute('data-max') || 99;
      var inside = slot.querySelectorAll('.chip');
      if (inside.length >= max) { (pool || zone).appendChild(inside[0]); }
      slot.appendChild(chip);
      clearMarks();
      if (zone._onchange) zone._onchange();
    }
    function select(c) {
      if (selected) selected.classList.remove('sel');
      selected = c === selected ? null : c;
      if (selected) selected.classList.add('sel');
      slots().forEach(function (s) { s.classList.toggle('target', !!selected); });
    }
    chips.forEach(function (chip) {
      chip.addEventListener('pointerdown', function (e) {
        if (!chip.closest('.step').classList.contains('active')) return;
        e.preventDefault(); e.stopPropagation();
        var r = chip.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, moved = false, ghost = null, over = null;
        function mv(ev) {
          var dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.abs(dx) + Math.abs(dy) > 6) {
            moved = true;
            ghost = chip.cloneNode(true); ghost.classList.add('ghost-chip'); ghost.classList.remove('sel', 'ok', 'no');
            ghost.style.width = chip.offsetWidth + 'px'; ghost.style.transform = 'scale(' + k() + ')';
            D.body.appendChild(ghost); chip.classList.add('dragging');
          }
          if (moved) {
            ghost.style.left = (r.left + dx) + 'px'; ghost.style.top = (r.top + dy) + 'px';
            var hit = null;
            slots().forEach(function (s) { var b = s.getBoundingClientRect(); if (ev.clientX > b.left && ev.clientX < b.right && ev.clientY > b.top && ev.clientY < b.bottom) hit = s; });
            if (over && over !== hit) over.classList.remove('hover');
            over = hit; if (over) over.classList.add('hover');
          }
        }
        function up() {
          D.removeEventListener('pointermove', mv); D.removeEventListener('pointerup', up);
          if (moved) {
            ghost.remove(); chip.classList.remove('dragging');
            if (over) { over.classList.remove('hover'); place(chip, over); }
            else if (pool) { var b = pool.getBoundingClientRect(); pool.appendChild(chip); clearMarks(); }
            if (selected) select(selected);
          } else { select(chip); }
        }
        D.addEventListener('pointermove', mv); D.addEventListener('pointerup', up);
      });
    });
    slots().forEach(function (s) {
      s.addEventListener('click', function (e) {
        if (selected && !e.target.closest('.chip')) { var c = selected; select(c); place(c, s); }
      });
    });
    if (pool) pool.addEventListener('click', function (e) { if (selected && !e.target.closest('.chip')) { var c = selected; select(c); pool.appendChild(c); clearMarks(); } });
    var chk = zone.querySelector('[data-check]');
    if (chk) chk.addEventListener('click', function () {
      var right = 0, total = 0;
      chips.forEach(function (c) {
        var s = c.closest('.slot'); var keys = (c.getAttribute('data-k') || '').split(' ');
        c.classList.remove('ok', 'no');
        if (s) { total++; var ok = keys.indexOf(s.getAttribute('data-k')) > -1; c.classList.add(ok ? 'ok' : 'no'); if (ok) right++; }
      });
      var sc = zone.querySelector('.score'); if (sc) sc.textContent = right + ' / ' + chips.length + ' correct';
    });
    zone._reset = function () {
      // chips return to their starting container in their original order
      home.forEach(function (h) { h.p.appendChild(h.c); });
      if (selected) select(selected); clearMarks();
      if (zone._onrest) zone._onrest();
    };
    var rb = zone.querySelector('[data-reset]');
    if (rb) rb.addEventListener('click', function () { zone._reset(); });
  }
  [].forEach.call(D.querySelectorAll('.match-zone'), initMatch);

  /* ---------- public API ---------- */
  W.Prezi = {
    goTo: function (id) { var i = typeof id === 'number' ? id : steps.indexOf(D.getElementById(id)); if (i > -1) goTo(i); },
    next: next, prev: prev, overview: overview, toast: toast,
    onEnter: function (id, fn) { (listeners.enter[id] = listeners.enter[id] || []).push(fn); },
    onReset: function (id, fn) { (listeners.reset[id] = listeners.reset[id] || []).push(fn); },
    onChange: function (fn) { listeners.change.push(fn); },
    get index() { return cur; }, get count() { return steps.length; },
    get reduced() { return reduced; }, lesson: lessonId, steps: steps
  };

  /* ---------- start (respect #hash after refresh) ---------- */
  var startId = (location.hash || '').slice(1), start = 0;
  steps.forEach(function (s, i) { if (s.id === startId) start = i; });
  function boot() { unscroll(); goTo(start, { instant: true }); root.classList.add('ready'); }
  if (D.fonts && D.fonts.ready) { D.fonts.ready.then(boot); setTimeout(function () { if (cur < 0) boot(); }, 1200); } else boot();
})();
