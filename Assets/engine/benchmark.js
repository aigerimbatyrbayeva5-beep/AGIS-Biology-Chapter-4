/* =====================================================================
   Chapter 4 · benchmark scenes (Lesson 4.1)
   - Surface tension: pre-rendered 3D water strider. Revealing the quick-
     check answer plays the "much heavier strider" sequence (45 frames).
   - Ice floats: pre-rendered 3D frozen-lake cut-away with live fish
     (sprite sheets), falling snow and drifting particles.
   Everything is local. Animation runs only in the active scene and
   never in reduced-motion mode (a still frame is shown instead).
   ===================================================================== */
(function () {
  'use strict';
  var D = document, W = window;
  var root = D.querySelector('.prezi');
  function reduced() { return root.classList.contains('reduced'); }
  function watch(el, fn, attrs) { new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: attrs || ['class'] }); }

  /* ---------------- surface tension: water strider ---------------- */
  function strider() {
    var step = D.getElementById('tension'); if (!step) return;
    var win = step.querySelector('.bx-window'), press = win.querySelector('.bx-press');
    var cv = win.querySelector('.bx-seq'), ctx = cv.getContext('2d');
    var ans = step.querySelector('.answer');
    var weight = win.querySelector('[data-part="weight"]'), resist = win.querySelector('[data-part="resist"]');
    var shaft = weight.querySelector('.shaft'), head = weight.querySelector('.head');
    var weightLabel = win.querySelector('[data-part="weightLabel"]'), resistLabel = win.querySelector('[data-part="resistLabel"]'), lens = win.querySelector('[data-part="lens"]');
    var N = 45, FPS = 15, SRC = '../../Assets/art/benchmark/strider/sink_';
    // thorax-top height (design px) in each frame, from the renderer's camera projection
    var BODY_Y = [153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 153.9, 154.5, 156.2, 158.9, 162.5, 166.9, 172.1, 178.0, 184.4, 191.3, 198.5, 206.0, 213.7, 221.6, 229.5, 237.3, 245.0, 252.6, 259.8, 266.8, 273.3, 279.3, 284.9, 289.8, 294.1, 297.6, 300.4, 302.3, 303.3, 303.4, 303.4];
    var frames = [], shown = -1, playing = false, t0 = 0, last = 0;

    function preload() {
      if (frames.length) return;
      for (var i = 0; i < N; i++) { var im = new Image(); im.decoding = 'async'; im.src = SRC + (i < 10 ? '0' : '') + i + '.jpg'; frames.push(im); }
    }
    function ready(i) { var im = frames[i]; return im && im.complete && im.naturalWidth > 0; }
    function overlay(i) {
      // heavier: the weight arrow grows; the surface can only resist so much, then those arrows fade
      var heavy = Math.min(1, i / 14), y = BODY_Y[i];
      var tip = Math.min(y - 8, 146 + (y - 153.9));
      shaft.setAttribute('d', 'M484 30V' + (tip - 22).toFixed(1));
      shaft.style.strokeWidth = (8 + 7 * heavy).toFixed(1);
      head.setAttribute('d', 'M' + (484 - 14 - 6 * heavy) + ' ' + (tip - 24) + 'L484 ' + tip + 'L' + (484 + 14 + 6 * heavy) + ' ' + (tip - 24) + 'Z');
      var r = i <= 14 ? 1 : Math.max(0, 1 - (i - 14) / 5), w = i < 30 ? 1 : Math.max(0, 1 - (i - 30) / 8);
      resist.style.opacity = r; resistLabel.style.opacity = r; lens.style.opacity = r;   // the surface gave way: nothing left to resist
      weight.style.opacity = w; weightLabel.style.opacity = w;
    }
    function draw(i) {
      if (i === shown) return true;
      if (!ready(i)) return false;
      ctx.drawImage(frames[i], 0, 0, cv.width, cv.height); shown = i; overlay(i); return true;
    }
    function loop(now) {
      if (!playing) return;
      var dt = now - last; last = now;
      if (!step.classList.contains('active')) { t0 += dt; requestAnimationFrame(loop); return; }
      var i = Math.min(N - 1, Math.floor((now - t0) / 1000 * FPS));
      if (!draw(i)) t0 += dt;                                   // wait for a frame that is still loading
      if (shown < N - 1) requestAnimationFrame(loop); else playing = false;
    }
    function play() {
      preload();
      cv.classList.remove('bx-hidden'); press.classList.add('bx-hidden');
      if (reduced()) {                                          // no animation: show the result
        var tryEnd = function () { if (!draw(N - 1)) setTimeout(tryEnd, 60); };
        tryEnd(); return;
      }
      shown = -1; playing = true; t0 = last = performance.now();
      requestAnimationFrame(loop);
    }
    function stop() {
      playing = false; shown = -1; ctx.clearRect(0, 0, cv.width, cv.height);
      cv.classList.add('bx-hidden'); press.classList.remove('bx-hidden'); overlay(0);
    }
    watch(ans, function () { if (ans.classList.contains('shown')) { if (!playing && shown < 0) play(); } else stop(); });
    watch(step, function () { if (step.classList.contains('active')) preload(); });
    overlay(0);
  }

  /* ---------------- ice floats: frozen lake ---------------- */
  function lake() {
    var step = D.getElementById('ice'); if (!step) return;
    var win = step.querySelector('.bx-window'), cv = win.querySelector('.bx-fx'), ctx = cv.getContext('2d');
    var VW = 866, VH = 576, S = cv.width / VW;                 // canvas px per design px
    var SNOW_Y = 158, WATER_TOP = 254, WATER_BOT = 538;        // design px, from the camera projection
    var META = {                                               // sprite placement (design px) from the renderer
      perchA: { x: 371.33, y: 323.33, w: 106.0, h: 48.0 },
      perchB: { x: 392.67, y: 380.67, w: 70.67, h: 34.67 },
      roach: { x: 408.67, y: 300.67, w: 41.33, h: 20.0 }
    };
    var sheets = {};
    Object.keys(META).forEach(function (k) { var im = new Image(); im.src = '../../Assets/art/benchmark/lake/' + k + '_sheet.webp'; im.onload = function () { if (!running) drawFrame(0); }; sheets[k] = im; });
    // fish: x = offset from the sprite's rendered position; dir 1 = swims right (the way it was rendered)
    var fish = [
      { k: 'roach', x: -250, dy: 6, dir: 1, v: 8, fps: 9, a: 0.62, ph: 0.0, wait: 0 },
      { k: 'roach', x: -282, dy: -9, dir: 1, v: 8, fps: 9.4, a: 0.58, ph: 0.4, wait: 0 },
      { k: 'roach', x: -300, dy: 15, dir: 1, v: 8, fps: 8.7, a: 0.55, ph: 0.8, wait: 0 },
      { k: 'roach', x: -326, dy: 0, dir: 1, v: 8, fps: 9.1, a: 0.52, ph: 1.3, wait: 0 },
      { k: 'perchB', x: 230, dy: 0, dir: -1, v: 12, fps: 6.5, a: 0.95, ph: 2.1, wait: 0 },
      { k: 'perchA', x: -190, dy: 0, dir: 1, v: 15, fps: 6, a: 1, ph: 0.7, wait: 0 }
    ];
    function rnd(a, b) { return a + Math.random() * (b - a); }
    var flakes = [], specks = [];
    for (var i = 0; i < 70; i++) flakes.push({ x: rnd(0, VW), y: rnd(-10, SNOW_Y), r: rnd(0.7, 2.2), vy: rnd(10, 22), vx: rnd(-4, 4), ph: rnd(0, 6.28) });
    for (var j = 0; j < 46; j++) specks.push({ x: rnd(0, VW), y: rnd(WATER_TOP + 6, WATER_BOT - 6), r: rnd(0.5, 1.5), vy: rnd(-1.5, 1.5), vx: rnd(-2, 2), ph: rnd(0, 6.28) });

    function drawFish(f, t) {
      var m = META[f.k], im = sheets[f.k]; if (!im.complete || !im.naturalWidth) return;
      var fw = im.naturalWidth / 16, fh = im.naturalHeight;
      var fr = Math.floor(t * f.fps + f.ph * 16) % 16;
      var x = (m.x + f.x) * S, y = (m.y + f.dy + Math.sin(t * 0.55 + f.ph * 3) * 2.2) * S, w = m.w * S, h = m.h * S;
      ctx.save(); ctx.globalAlpha = f.a;
      if (f.dir < 0) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(im, fr * fw, 0, fw, fh, 0, 0, w, h); }
      else ctx.drawImage(im, fr * fw, 0, fw, fh, x, y, w, h);
      ctx.restore();
    }
    function drawFrame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      // tiny particles drifting in the still water
      ctx.fillStyle = '#d8f6ff';
      specks.forEach(function (p) { ctx.globalAlpha = 0.10 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.8 + p.ph)); ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.r * S, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = 1;
      fish.forEach(function (f) { drawFish(f, t); });
      // falling snow above the lake
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cv.width, SNOW_Y * S); ctx.clip();
      ctx.fillStyle = '#ffffff';
      flakes.forEach(function (p) { ctx.globalAlpha = 0.55 + 0.35 * (p.r / 2.2); ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.r * S, 0, 6.283); ctx.fill(); });
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function update(dt, t) {
      fish.forEach(function (f) {
        var m = META[f.k];
        if (f.wait > 0) { f.wait -= dt; return; }
        f.x += f.dir * f.v * dt;
        var left = m.x + f.x, right = left + m.w;
        if ((f.dir > 0 && left > VW + 30) || (f.dir < 0 && right < -30)) {   // out of view: turn round off-screen, then come back
          f.dir = -f.dir;
          f.wait = f.k === 'roach' ? 4 : rnd(2, 6);
          if (f.k === 'roach') fish.forEach(function (g) { if (g.k === 'roach' && g !== f && g.dir !== f.dir) { g.dir = f.dir; g.wait = f.wait + rnd(0, 0.6); } });
        }
      });
      flakes.forEach(function (p) { p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.9 + p.ph) * 6) * dt; if (p.y > SNOW_Y + 4) { p.y = -4; p.x = rnd(0, VW); } if (p.x < -4) p.x = VW + 4; if (p.x > VW + 4) p.x = -4; });
      specks.forEach(function (p) { p.y += p.vy * dt; p.x += p.vx * dt; if (p.y < WATER_TOP + 4 || p.y > WATER_BOT - 4) p.vy = -p.vy; if (p.x < 0) p.x = VW; if (p.x > VW) p.x = 0; });
    }
    var running = false, last = 0, time = 0;
    function tick(now) {
      if (!step.classList.contains('active') || reduced() || D.hidden) { running = false; drawFrame(time); return; }
      var dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
      update(dt, time); drawFrame(time);
      requestAnimationFrame(tick);
    }
    function wake() { if (!running && step.classList.contains('active') && !reduced()) { running = true; last = performance.now(); requestAnimationFrame(tick); } }
    watch(step, wake); watch(root, function () { if (reduced()) drawFrame(time); else wake(); });
    D.addEventListener('visibilitychange', wake);
    drawFrame(0); wake();
  }

  strider(); lake();
})();
