/* KALÓN — core.js
 * Shared foundation for every instrument: seeded PRNG, math helpers, curated
 * palettes, the motion/visibility governor (photosensitivity + performance safety),
 * DPR-aware canvas fitting, a governed animation loop, and a section lifecycle
 * observer so at most a couple of canvases ever animate at once.
 *
 * No dependencies. No network. Attaches a single global: window.KALON.
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var PHI = (1 + Math.sqrt(5)) / 2;                 // golden ratio  ≈ 1.618033…
  var GOLDEN_ANGLE_DEG = 360 / (PHI * PHI);         // ≈ 137.50776…°  (360·(2−φ))

  /* ---------- math helpers ---------- */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function map(v, a, b, c, d) { return c + (d - c) * ((v - a) / (b - a)); }
  function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------- seeded PRNG (mulberry32) ---------- */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    str = String(str);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // A fresh session seed. crypto if available, else time-based. (Browser code may
  // use Date/Math.random freely; the Workflow-script restriction does not apply here.)
  function newSeed() {
    try {
      if (global.crypto && global.crypto.getRandomValues) {
        var u = new Uint32Array(1); global.crypto.getRandomValues(u); return u[0] >>> 0;
      }
    } catch (e) { /* fall through */ }
    return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }

  /* ---------- curated palettes ----------
   * Every generator draws from THESE, never from raw random hues, so the whole
   * output space is at least pleasant (the "ugly-output floor"). Each palette is
   * hand-chosen: a paper (bg), an ink (primary marks), and 2–4 harmonious tones.
   * (Finalized after the Beauty Council design review.)
   */
  var PALETTES = [
    { name: 'Vellum',   bg: '#f4efe6', ink: '#2b2723', tones: ['#b8843f', '#7c9a92', '#a34e3b', '#3f4a54'] },
    { name: 'Nightfall',bg: '#161a22', ink: '#e9e4d8', tones: ['#d9a441', '#6f97b7', '#c1655a', '#8a9b8e'] },
    { name: 'Blush',    bg: '#f3e7e4', ink: '#3a2a2c', tones: ['#c56b6b', '#d9a15b', '#7f8aa3', '#6a8a72'] },
    { name: 'Sea-glass',bg: '#eaf0ee', ink: '#22322f', tones: ['#4f8a7d', '#c9a24a', '#c76a56', '#5a7791'] },
    { name: 'Ink-wash', bg: '#eceae4', ink: '#20242a', tones: ['#525c66', '#9c8250', '#7a8b86', '#a75b4c'] },
    { name: 'Ember',    bg: '#1a1614', ink: '#efe6d6', tones: ['#e0913f', '#c85b45', '#6d8a86', '#caa96b'] }
  ];
  function pickPalette(r) {
    var f = typeof r === 'function' ? r : Math.random;
    return PALETTES[Math.floor(f() * PALETTES.length) % PALETTES.length];
  }
  function withAlpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function _ch(hex) { var h = hex.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  // linear-ish interpolation between two hex colors → 'rgb(...)' (t: 0=A, 1=B)
  function mix(hexA, hexB, t) {
    t = clamp(t, 0, 1); var a = _ch(hexA), b = _ch(hexB);
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
  }
  function mixAlpha(hexA, hexB, t, alpha) {
    t = clamp(t, 0, 1); var a = _ch(hexA), b = _ch(hexB);
    return 'rgba(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ',' + alpha + ')';
  }

  /* ---------- shared session state ----------
   * Each instrument publishes where the visitor left it; the finale ("The Beholder")
   * reads this to compose an artifact that is a portrait of THIS visit — so
   * "you completed it" is true, not an RNG. `touched` flags real interaction.
   */
  var State = {
    proportion: { theta: GOLDEN_ANGLE_DEG, nearGolden: true, touched: false },
    harmony: { ratio: 1.5, p: 3, q: 2, locked: true, touched: false },
    symmetry: { life: 0.42, inBand: true, touched: false },
    contrast: { light: 0.7, raking: true, touched: false },
    imperfection: { seed: 1, brokenness: 3, mended: false, touched: false },
    set: function (key, patch) { var o = this[key]; if (o) { for (var k in patch) o[k] = patch[k]; o.touched = true; } }
  };

  /* ---------- motion / visibility governor ----------
   * Central authority on whether anything animates. Respects prefers-reduced-motion
   * and a user toggle; pauses when the tab is hidden. Instruments must consult this.
   */
  var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var Motion = {
    reduced: !!(mq && mq.matches),
    enabled: !(mq && mq.matches),   // motion ON unless the OS asks for reduced
    tabHidden: false,
    _listeners: [],
    shouldAnimate: function () { return this.enabled && !this.tabHidden; },
    setEnabled: function (on) {
      this.enabled = !!on;
      this._listeners.forEach(function (fn) { try { fn(!!on); } catch (e) {} });
    },
    onChange: function (fn) { this._listeners.push(fn); }
  };
  document.addEventListener('visibilitychange', function () { Motion.tabHidden = document.hidden; });
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) {
    Motion.reduced = e.matches; Motion.setEnabled(!e.matches);
  });

  /* ---------- audio governor (audio.js provides the synth) ---------- */
  var Audio = {
    enabled: false,       // OFF by default; opt-in behind a user gesture
    _impl: null,
    _listeners: [],
    register: function (impl) { this._impl = impl; },
    onChange: function (fn) { this._listeners.push(fn); },
    _notify: function () { var e = this.enabled, L = this._listeners; for (var i = 0; i < L.length; i++) { try { L[i](e); } catch (x) {} } },
    toggle: function () {
      this.enabled = !this.enabled;
      if (this._impl) { this.enabled ? this._impl.start() : this._impl.stop(); }
      this._notify();      // keep every sound control (masthead + in-context "hear it") in sync
      return this.enabled;
    },
    note: function (info) { if (this.enabled && this._impl && this._impl.note) this._impl.note(info); }
  };

  /* ---------- DPR-aware canvas fitting ---------- */
  function fit(canvas, cap) {
    cap = cap || 2;
    var dpr = Math.min(global.devicePixelRatio || 1, cap);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  /* ---------- governed animation loop ----------
   * loop(step) calls step(dtSeconds, elapsedSeconds) each frame while allowed to
   * animate; auto-pauses via the governor. Returns { stop, running }.
   */
  function loop(step) {
    var raf = 0, last = 0, elapsed = 0, running = false;
    function frame(ts) {
      if (!running) return;
      if (!Motion.shouldAnimate()) { last = ts; raf = requestAnimationFrame(frame); return; }
      var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0; // clamp big gaps
      last = ts; elapsed += dt;
      try { step(dt, elapsed); } catch (e) { /* never let one bad frame kill the page */ }
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
      stop: function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      get running() { return running; }
    };
  }

  /* ---------- section lifecycle observer ----------
   * observe(el, onEnter, onLeave) fires when a section scrolls in/out of view.
   */
  function observe(el, onEnter, onLeave) {
    if (!global.IntersectionObserver) { onEnter && onEnter(); return { disconnect: function () {} }; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { onEnter && onEnter(); }
        else { onLeave && onLeave(); }
      });
    }, { root: null, threshold: 0.15 });
    io.observe(el);
    return io;
  }

  /* debounce for resize */
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  global.KALON = {
    TAU: TAU, PHI: PHI, GOLDEN_ANGLE_DEG: GOLDEN_ANGLE_DEG,
    clamp: clamp, lerp: lerp, map: map, smoothstep: smoothstep, mod: mod,
    rng: rng, hashSeed: hashSeed, newSeed: newSeed,
    palettes: PALETTES, pickPalette: pickPalette, withAlpha: withAlpha, mix: mix, mixAlpha: mixAlpha,
    Motion: Motion, Audio: Audio, State: State,
    fit: fit, loop: loop, observe: observe, debounce: debounce
  };
})(window);
