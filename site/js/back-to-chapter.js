/* Small "Back to Chapter 4" control added to each presentation in the website copy.
   It sits bottom-left beside the presentation's control bar (scene titles use the
   top edge), fades like the HUD, and never takes keyboard shortcuts away from the
   presentation. */
(function () {
  'use strict';
  var D = document;
  var css = D.createElement('style');
  css.textContent =
    '.ch4-back{position:fixed;left:14px;bottom:19px;z-index:65;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px 0 12px;' +
    'border-radius:999px;background:rgba(255,255,255,.94);color:#13234a;text-decoration:none;font:700 14px/1 "Nunito","Segoe UI",system-ui,sans-serif;' +
    'box-shadow:0 8px 22px -10px rgba(0,0,0,.55);transition:opacity .4s,transform .2s}' +
    '.ch4-back svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.ch4-back:hover{transform:translateY(-1px)}' +
    '.ch4-back:focus-visible{outline:3px solid #66b3ff;outline-offset:2px;opacity:1}' +
    '.ch4-back.idle{opacity:.22}.ch4-back.idle:hover{opacity:1}' +
    '@media (max-width:1180px){.ch4-back{width:44px;height:44px;padding:0;justify-content:center;bottom:17px}.ch4-back span{display:none}}' +
    '@media print{.ch4-back{display:none}}';
  D.head.appendChild(css);

  var a = D.createElement('a');
  a.className = 'ch4-back';
  a.href = '../../index.html#lessons';
  a.title = 'Back to the Chapter 4 website';
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>Chapter 4</span>';
  a.setAttribute('aria-label', 'Back to Chapter 4 website');
  // the presentation treats Enter / Space as "next scene"; keep them for the link while it has focus
  a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
  a.addEventListener('click', function (e) { e.stopPropagation(); });
  D.body.appendChild(a);

  var t;
  function wake() { a.classList.remove('idle'); clearTimeout(t); t = setTimeout(function () { a.classList.add('idle'); }, 3500); }
  D.addEventListener('mousemove', wake, { passive: true });
  D.addEventListener('touchstart', wake, { passive: true });
  wake();
})();
