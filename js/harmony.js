/* KALÓN — Instrument II · HARMONY
 * A harmonograph. One pendulum per axis; the frequency ratio is the visitor's to set.
 * A simple ratio — the octave 2:1, the fifth 3:2, the fourth 4:3 — traces a closed,
 * repeating figure, and tints gold. Ratios with no simple form never exactly repeat;
 * they stay ink. These are the pure just-intonation ratios (a piano rounds them off).
 * You can hear the interval you see.
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  KALON_instruments.harmony = function (section, palette) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var slider = section.querySelector('[data-role="ratio"]');
    var readout = section.querySelector('[data-role="readout"]');
    var hearBtn = section.querySelector('[data-role="hear"]');
    var buttons = Array.prototype.slice.call(section.querySelectorAll('[data-role="interval"]'));
    var dims = K.fit(canvas), ctx = dims.ctx, W = dims.w, H = dims.h;

    var ratio = 1.5, targetRatio = 1.5, phase = 0, p1 = 0.6;
    var lockPulse = -1, wasLocked = true, lastLabelKey = '';

    var INTERVALS = [
      { name: 'Unison', p: 1, q: 1 }, { name: 'Octave', p: 2, q: 1 },
      { name: 'Perfect fifth', p: 3, q: 2 }, { name: 'Perfect fourth', p: 4, q: 3 },
      { name: 'Major third', p: 5, q: 4 }, { name: 'Major sixth', p: 5, q: 3 },
      { name: 'Minor third', p: 6, q: 5 }
    ];
    function nearest(r) { var best = null, bd = 1e9; INTERVALS.forEach(function (iv) { var d = Math.abs(r - iv.p / iv.q); if (d < bd) { bd = d; best = iv; } }); return { iv: best, d: bd }; }

    function label() {
      var ni = nearest(ratio), locked = ni.d < 0.012;
      var key = locked ? 'L' + ni.iv.p + ':' + ni.iv.q : 'U' + ratio.toFixed(3);
      if (key !== lastLabelKey) {                       // only touch the DOM / aria-live when it changes
        lastLabelKey = key;
        if (readout) readout.innerHTML = locked
          ? '<strong>' + ni.iv.name + '</strong> &middot; ' + ni.iv.p + ':' + ni.iv.q + ' &middot; <em>a closed loop it keeps retracing</em>'
          : ratio.toFixed(3) + ' : 1 &middot; <em>no simple ratio — the curve never exactly repeats</em>';
        buttons.forEach(function (b) {
          var on = locked && (parseInt(b.getAttribute('data-p'), 10) / parseInt(b.getAttribute('data-q'), 10)).toFixed(3) === (ni.iv.p / ni.iv.q).toFixed(3);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        canvas.setAttribute('aria-label', locked
          ? 'A harmonograph at the ' + ni.iv.name + ', ' + ni.iv.p + ':' + ni.iv.q + ' — a closed loop it keeps retracing.'
          : 'A harmonograph at ratio ' + ratio.toFixed(2) + ' to 1 — a curve that never exactly repeats.');
        if (slider) slider.setAttribute('aria-valuetext', locked ? ni.iv.name + ', ' + ni.iv.p + ' to ' + ni.iv.q : 'ratio ' + ratio.toFixed(2) + ' to 1, no simple ratio');
      }
      return { locked: locked, iv: ni.iv };
    }

    function draw(elapsed) {
      var cx = W / 2, cy = H / 2, A = Math.min(W, H) * 0.40;
      var d = 0.0011, L = Math.min(2600, Math.round(4.2 / d)), ds = L / 1500;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);

      var st = label();
      var stroke = st.locked ? palette.gold : palette.ink;
      var lw = 1.1;
      if (lockPulse >= 0 && elapsed != null) { var e = elapsed - lockPulse; if (e >= 0 && e < 0.5) lw = 1.1 + 1.0 * (1 - e / 0.5); else lockPulse = -1; }

      ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); var first = true;
      for (var s = 0; s <= L; s += ds) {
        var env = Math.exp(-d * s);
        var x = cx + A * Math.sin(1.0 * s * 0.06 + phase + p1) * env;
        var y = cy + A * Math.sin(ratio * s * 0.06) * env;
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = K.withAlpha(stroke, 0.85); ctx.stroke();

      ctx.beginPath(); first = true; ctx.lineWidth = Math.max(0.8, lw - 0.3);
      for (var s2 = 0; s2 <= L; s2 += ds) {
        var env2 = Math.exp(-d * s2);
        var x2 = cx + A * Math.sin(1.0 * s2 * 0.06 + phase + p1 + 0.05) * env2;
        var y2 = cy + A * Math.sin(ratio * s2 * 0.06 + 0.05) * env2;
        if (first) { ctx.moveTo(x2, y2); first = false; } else ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = K.mixAlpha(palette.ink, palette.gold, st.locked ? 0.85 : 0, 0.28); ctx.stroke();
    }

    function publish(user) {
      var ni = nearest(targetRatio), locked = ni.d < 0.012;  // committed target, not mid-ease value (paused-path safe)
      var patch = { ratio: targetRatio, p: locked ? ni.iv.p : 0, q: locked ? ni.iv.q : 0, locked: locked };
      if (user) K.State.set('harmony', patch);         // only real interaction marks "touched"
      else { var h = K.State.harmony; h.ratio = patch.ratio; h.p = patch.p; h.q = patch.q; h.locked = patch.locked; }
    }

    var anim = K.loop(function (dt, elapsed) {
      ratio += (targetRatio - ratio) * Math.min(1, dt * 8);
      if (Math.abs(targetRatio - ratio) < 0.0002) ratio = targetRatio;
      phase += dt * 0.25;
      var lk = nearest(ratio).d < 0.012;
      if (lk && !wasLocked) { lockPulse = elapsed; K.Audio.note(lockInfo()); }
      wasLocked = lk;
      draw(elapsed);
    });

    function lockInfo() { var ni = nearest(ratio); return { kind: 'interval', p: ni.iv.p, q: ni.iv.q }; }

    function setRatio(r, user) {
      targetRatio = K.clamp(r, 1, 3);
      if (slider) slider.value = String(targetRatio);
      if (user) publish(true);
      if (!anim.running) { ratio = targetRatio; draw(); }
    }
    if (slider) {
      slider.addEventListener('input', function () { setRatio(parseFloat(slider.value), true); });
      slider.addEventListener('change', function () {           // magnetic detent on release
        var ni = nearest(targetRatio); if (ni.d < 0.03) { targetRatio = ni.iv.p / ni.iv.q; if (slider) slider.value = String(targetRatio); publish(true); }
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = parseInt(b.getAttribute('data-p'), 10), q = parseInt(b.getAttribute('data-q'), 10);
        setRatio(p / q, true); K.Audio.note({ kind: 'interval', p: p, q: q });
      });
    });
    if (hearBtn) hearBtn.addEventListener('click', function () {
      if (!K.Audio.enabled) K.Audio.toggle();                  // enable audio in context
      var ni = nearest(ratio); K.Audio.note({ kind: 'interval', p: ni.iv.p, q: ni.iv.q });
    });

    function resize() { dims = K.fit(canvas); ctx = dims.ctx; W = dims.w; H = dims.h; if (!anim.running) draw(); }

    return {
      start: function () { publish(); draw(0); anim.start(); },
      stop: function () { anim.stop(); },
      resize: resize,
      reduced: function () { phase = 0.5; ratio = targetRatio; publish(); draw(); }
    };
  };
})();
