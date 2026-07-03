/* KALÓN — Instrument I · PROPORTION
 * Phyllotaxis (Vogel's model): the nth floret at angle n·θ, radius c·√n. Only near
 * the golden angle (≈137.508°) do the florets pack with no gaps and no spokes — φ is
 * the "most irrational" number, so its fraction of a turn avoids every simple ratio.
 * The visitor drags θ (or uses the slider) and watches order appear and dissolve.
 * Colour is the readout of the argument: ink when scattered, gold as order arrives.
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  KALON_instruments.proportion = function (section, palette) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var slider = section.querySelector('[data-role="theta"]');
    var goldenBtn = section.querySelector('[data-role="golden"]');
    var readout = section.querySelector('[data-role="readout"]');
    var dims = K.fit(canvas), ctx = dims.ctx, W = dims.w, H = dims.h;

    var GOLD = K.GOLDEN_ANGLE_DEG;
    var thetaDeg = GOLD, targetDeg = GOLD, spin = 0;
    var settleStart = -1, lastOrder = 1, wasSettled = true;

    function count() { return Math.round(K.clamp((W * H) / 260, 260, 1500)); }
    var N = count();

    function orderOf(deg) { return K.smoothstep(1 - K.clamp(Math.abs(deg - GOLD) / 2.2, 0, 1)); }

    function publish(user) {
      var near = Math.abs(targetDeg - GOLD) < 0.06;
      if (user) K.State.set('proportion', { theta: targetDeg, nearGolden: near });
      else { K.State.proportion.theta = targetDeg; K.State.proportion.nearGolden = near; }
    }

    function updateReadout() {
      var d = Math.abs(thetaDeg - GOLD), near = d < 0.06;
      if (readout) {
        readout.innerHTML = near
          ? thetaDeg.toFixed(2) + '° &middot; <em>the golden angle — spirals in Fibonacci numbers</em>'
          : thetaDeg.toFixed(2) + '° &middot; Δ ' + d.toFixed(2) + '° from golden';
      }
      if (slider) slider.setAttribute('aria-valuetext', thetaDeg.toFixed(2) + ' degrees' + (near ? ', the golden angle' : ''));
      canvas.setAttribute('aria-label', near
        ? 'Phyllotaxis at the golden angle: florets pack smoothly with no gaps or spokes.'
        : 'Phyllotaxis at ' + thetaDeg.toFixed(1) + ' degrees: florets fall into visible spiral spokes.');
    }

    function draw(elapsed) {
      var thetaRad = thetaDeg * Math.PI / 180, cx = W / 2, cy = H / 2;
      var c = Math.min(W, H) * 0.5 / Math.sqrt(N) * 0.92;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);

      var order = orderOf(thetaDeg);
      // one-shot "settle" breath when order arrives
      var settle = 1;
      if (settleStart >= 0 && elapsed != null) {
        var e = elapsed - settleStart;
        if (e >= 0 && e < 0.5) settle = 1 + 0.06 * Math.sin(Math.PI * (e / 0.5));
        else settleStart = -1;
      }
      for (var n = 1; n <= N; n++) {
        var a = n * thetaRad + spin, r = c * Math.sqrt(n), t = n / N;
        var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        var rad = K.lerp(1.0, 3.4, t) * (0.7 + 0.5 * order) * settle;
        var alpha = K.lerp(0.26, 0.92, order) * K.lerp(0.55, 1, t);
        ctx.beginPath();
        ctx.fillStyle = K.mixAlpha(palette.ink, palette.gold, order * 0.92, alpha);
        ctx.arc(x, y, Math.max(0.4, rad), 0, K.TAU);
        ctx.fill();
      }
    }

    var anim = K.loop(function (dt, elapsed) {
      thetaDeg += (targetDeg - thetaDeg) * Math.min(1, dt * 6);
      if (Math.abs(targetDeg - thetaDeg) < 0.001) thetaDeg = targetDeg;
      var o = orderOf(thetaDeg);
      if (o >= 0.9 && lastOrder < 0.9) settleStart = elapsed; // crossed into order
      lastOrder = o;
      spin += dt * 0.05;
      draw(elapsed);
      var settled = (thetaDeg === targetDeg);
      if (settled && !wasSettled) updateReadout();   // announce once, on settle — not every frame
      wasSettled = settled;
    });

    function setTheta(v, user) {
      targetDeg = K.clamp(v, 120, 150);
      if (slider) slider.value = String(targetDeg);
      publish(user);
      if (user) updateReadout();                      // immediate feedback on user input
      if (!anim.running) { thetaDeg = targetDeg; draw(); }
    }
    if (slider) slider.addEventListener('input', function () { setTheta(parseFloat(slider.value), true); });
    if (goldenBtn) goldenBtn.addEventListener('click', function () { setTheta(GOLD, true); K.Audio.note({ kind: 'chime', ratio: 1.5 }); });

    var dragging = false, lastX = 0;
    function px(e) { return (e.touches ? e.touches[0].clientX : e.clientX); }
    canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = px(e); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      var dx = px(e) - lastX; lastX = px(e);
      setTheta(targetDeg + dx * 0.03, true);   // eases (chase the sweet spot)
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { canvas.addEventListener(ev, function () { dragging = false; }); });

    function resize() { dims = K.fit(canvas); ctx = dims.ctx; W = dims.w; H = dims.h; N = count(); if (!anim.running) draw(); }

    return {
      // Start OFF the golden angle (visible spiral spokes) so "Find the golden angle" heals it —
      // the teaching moment. Reduced-motion shows the resolved golden state (the answer) statically.
      start: function () { thetaDeg = targetDeg = 144; publish(false); draw(0); updateReadout(); anim.start(); },
      stop: function () { anim.stop(); },
      resize: resize,
      reduced: function () { thetaDeg = targetDeg = GOLD; publish(false); draw(); updateReadout(); }
    };
  };
})();
