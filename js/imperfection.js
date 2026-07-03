/* KALÓN — Instrument IV · IMPERFECTION
 * Kintsugi (金継ぎ, "golden joinery"): a clean vessel is fractured; the visitor mends
 * it, and the breaks fill with gold — dusted onto lacquer, in the real craft. Wabi-sabi
 * proposes that the mended vessel is more itself for its history, not less. It lands
 * broken; the mending is yours to perform. (After Sōetsu Yanagi and Leonard Koren.)
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  KALON_instruments.imperfection = function (section, palette) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var breakBtn = section.querySelector('[data-role="break"]');
    var mendBtn = section.querySelector('[data-role="mend"]');
    var brokenSlider = section.querySelector('[data-role="broken"]');
    var readout = section.querySelector('[data-role="readout"]');
    var dims = K.fit(canvas), ctx = dims.ctx, W = dims.w, H = dims.h;

    var GOLD = palette.gold, GOLD_HI = palette.goldHi || '#e8c874';
    var cracks = [], progress = 0, target = 0, seed = K.newSeed(), brokenness = 3;
    var glowStart = -1, wasComplete = false, lastWord = '';

    function center() { return { cx: W / 2, cy: H / 2, R: Math.min(W, H) * 0.38 }; }
    function rimPoint(a, c) { return { x: c.cx + Math.cos(a) * c.R, y: c.cy + Math.sin(a) * c.R }; }
    function jag(p0, p1, rough, depth, out, r) {
      if (depth <= 0) { out.push(p1); return; }
      var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1;
      var mid = { x: mx + (-dy / len) * (r() - 0.5) * rough * len, y: my + (dx / len) * (r() - 0.5) * rough * len };
      jag(p0, mid, rough * 0.62, depth - 1, out, r); jag(mid, p1, rough * 0.62, depth - 1, out, r);
    }
    function plLen(pl) { var L = 0; for (var j = 1; j < pl.length; j++) L += Math.hypot(pl[j].x - pl[j - 1].x, pl[j].y - pl[j - 1].y); return L; }

    function generate() {
      var r = K.rng(seed), c = center(); cracks = [];
      var mains = Math.max(1, Math.round(brokenness));
      for (var i = 0; i < mains; i++) {
        var a0 = r() * K.TAU, a1 = a0 + Math.PI * (0.55 + r() * 0.7) * (r() < 0.5 ? 1 : -1);
        var p0 = rimPoint(a0, c), p1 = rimPoint(a1, c);
        var pull = { x: c.cx + (r() - 0.5) * c.R * 0.5, y: c.cy + (r() - 0.5) * c.R * 0.5 };
        var pathA = [p0]; jag(p0, pull, 0.5, 5, pathA, r);
        var pathB = [pull]; jag(pull, p1, 0.5, 5, pathB, r);
        cracks.push(pathA.concat(pathB.slice(1)));
        var branches = Math.round(r() * 2) + 1;
        for (var b = 0; b < branches; b++) {
          var main = cracks[cracks.length - 1], idx = 1 + Math.floor(r() * (main.length - 2)), start = main[idx];
          var ba = r() * K.TAU, blen = c.R * (0.25 + r() * 0.45);
          var end = { x: start.x + Math.cos(ba) * blen, y: start.y + Math.sin(ba) * blen };
          var dd = Math.hypot(end.x - c.cx, end.y - c.cy);
          if (dd > c.R * 0.95) { var s = (c.R * 0.95) / dd; end.x = c.cx + (end.x - c.cx) * s; end.y = c.cy + (end.y - c.cy) * s; }
          var br = [start]; jag(start, end, 0.55, 4, br, r); cracks.push(br);
        }
      }
      // stagger: each crack starts gilding a little after the previous (gold "flows")
      for (var k = 0; k < cracks.length; k++) cracks[k]._off = (k / Math.max(1, cracks.length)) * 0.35;
    }

    function drawVessel(c) {
      var g = ctx.createRadialGradient(c.cx - c.R * 0.3, c.cy - c.R * 0.3, c.R * 0.1, c.cx, c.cy, c.R);
      g.addColorStop(0, K.withAlpha(palette.inkSoft, 0.16)); g.addColorStop(1, K.withAlpha(palette.ink, 0.10));
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R, 0, K.TAU); ctx.fillStyle = palette.bg; ctx.fill(); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = K.withAlpha(palette.ink, 0.5); ctx.stroke();
    }
    function strokeUpto(pl, upto, style, width) {
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = style; ctx.beginPath();
      var acc = 0; ctx.moveTo(pl[0].x, pl[0].y);
      for (var j = 1; j < pl.length; j++) {
        var segLen = Math.hypot(pl[j].x - pl[j - 1].x, pl[j].y - pl[j - 1].y);
        if (acc + segLen <= upto) { ctx.lineTo(pl[j].x, pl[j].y); acc += segLen; }
        else { var t = (upto - acc) / segLen; if (t > 0) ctx.lineTo(pl[j - 1].x + (pl[j].x - pl[j - 1].x) * t, pl[j - 1].y + (pl[j].y - pl[j - 1].y) * t); break; }
      }
      ctx.stroke();
    }
    function draw(elapsed) {
      var c = center();
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R, 0, K.TAU); ctx.clip();
      drawVessel(c);
      cracks.forEach(function (pl) { strokeUpto(pl, 1e9, K.withAlpha(palette.ink, 0.5), 1.4); });      // the raw breaks
      cracks.forEach(function (pl) {
        var eff = K.clamp((progress - pl._off) / (1 - pl._off), 0, 1), L = plLen(pl) * eff;
        strokeUpto(pl, L, GOLD, 3.2);
        strokeUpto(pl, L, K.withAlpha(GOLD_HI, 0.7), 1.2);                                              // travelling highlight tip
      });
      // one-shot completion glow
      if (glowStart >= 0 && elapsed != null) {
        var e = elapsed - glowStart;
        if (e >= 0 && e < 0.6) { ctx.beginPath(); ctx.arc(c.cx, c.cy, c.R, 0, K.TAU); ctx.fillStyle = K.withAlpha(GOLD_HI, 0.18 * (1 - e / 0.6)); ctx.fill(); }
        else glowStart = -1;
      }
      ctx.restore();
      var word = progress < 0.02 ? 'broken' : progress > 0.98 ? 'mended' : 'mending';
      if (word !== lastWord) {                          // only touch aria-live on state change, not every frame
        lastWord = word;
        if (readout) readout.innerHTML = word === 'broken' ? '<em>broken</em>' : word === 'mended' ? '<em>mended — its history kept, not hidden</em>' : '<em>mending…</em>';
        canvas.setAttribute('aria-label', word === 'mended' ? 'A ceramic vessel mended with gold along its cracks.' : word === 'broken' ? 'A fractured ceramic vessel with dark cracks, not yet mended.' : 'A vessel being mended, gold filling its cracks.');
      }
    }

    var anim = K.loop(function (dt, elapsed) {
      if (Math.abs(target - progress) > 0.001) { progress += (target - progress) * Math.min(1, dt * 2.0); draw(elapsed); }
      else if (progress !== target) { progress = target; draw(elapsed); }
      var complete = progress > 0.98 && target >= 1;
      if (complete && !wasComplete) { glowStart = elapsed; K.Audio.note({ kind: 'chime', ratio: 1.5 }); K.State.set('imperfection', { seed: seed, brokenness: brokenness, mended: true }); }
      wasComplete = complete;
    });

    function doBreak() { seed = K.newSeed(); generate(); progress = target = 0; wasComplete = false; K.State.set('imperfection', { seed: seed, brokenness: brokenness, mended: false }); draw(0); }
    function doMend() { target = 1; if (!anim.running) { progress = 1; wasComplete = true; K.State.set('imperfection', { seed: seed, brokenness: brokenness, mended: true }); draw(); } }
    if (breakBtn) breakBtn.addEventListener('click', doBreak);
    if (mendBtn) mendBtn.addEventListener('click', doMend);
    if (brokenSlider) brokenSlider.addEventListener('change', function () {   // on release, not every tick
      brokenness = K.clamp(parseFloat(brokenSlider.value), 1, 5); generate();
      progress = target = 0; wasComplete = false;
      K.State.set('imperfection', { seed: seed, brokenness: brokenness, mended: false }); draw();
    });

    function resize() { dims = K.fit(canvas); ctx = dims.ctx; W = dims.w; H = dims.h; generate(); draw(); }

    return {
      start: function () { generate(); progress = target = 0; wasComplete = false; K.State.imperfection.seed = seed; K.State.imperfection.brokenness = brokenness; draw(0); anim.start(); }, // lands broken
      stop: function () { anim.stop(); },
      resize: resize,
      reduced: function () { generate(); progress = target = 1; wasComplete = true; var im = K.State.imperfection; im.seed = seed; im.brokenness = brokenness; im.mended = true; draw(); } // static still, but not a "touched" choice
    };
  };
})();
