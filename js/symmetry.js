/* KALÓN — Instrument III · SYMMETRY & VARIATION
 * A rosette built the way Islamic geometers and Vera Molnár built pattern: one arm,
 * repeated by a symmetry group (here twelve-fold — twelve rotations of a self-mirrored
 * petal, a C12 rosette with a mirror line through each petal). At désordre 0 every petal
 * is identical: perfect, crystalline,
 * a little dead. A "life" slider introduces controlled deviation — each arm drifts on
 * its own — so the rosette is near-symmetric and alive in the middle band, and flies
 * apart into chaos at the top. Order perturbed on purpose.
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  KALON_instruments.symmetry = function (section, palette) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var slider = section.querySelector('[data-role="life"]');
    var readout = section.querySelector('[data-role="readout"]');
    var dims = K.fit(canvas), ctx = dims.ctx, W = dims.w, H = dims.h;

    var ARMS = 12;                       // dihedral D6 → 6 rotations, mirrored
    var life = 0.42, time = 0, lastWord = '';
    // one arm's control points, local frame: x = along the radius (0..1), y = perpendicular
    var ARM = [[0.00, 0.00], [0.22, 0.11], [0.46, 0.07], [0.68, 0.15], [0.86, 0.05], [1.00, 0.00]];

    function bandOf(v) { return K.smoothstep(K.clamp(1 - Math.abs(v - 0.42) / 0.20, 0, 1)); } // living band ~0.42

    function updateReadout() {
      if (!readout) return;
      var b = bandOf(life);
      var word = b > 0.6 ? 'alive' : life < 0.1 ? 'perfect' : life > 0.78 ? 'chaos' : 'the edge';
      readout.innerHTML = 'life ' + Math.round(life * 100) + ' &middot; <em>' + word + '</em>';
      canvas.setAttribute('aria-label', 'A twelve-fold rosette construction, ' + word + ' at life ' + Math.round(life * 100) + ' of 100.');
      if (slider) slider.setAttribute('aria-valuetext', 'life ' + Math.round(life * 100) + ' of 100, ' + word);
    }

    function draw() {
      var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);
      var b = bandOf(life);
      var stroke = K.mixAlpha(palette.ink, palette.gold, b * 0.85, K.lerp(0.55, 0.9, b));
      var ROT = ARMS, sector = K.TAU / ROT;         // 12 petals around the rosette
      // faint construction circle that fades as order dissolves
      ctx.strokeStyle = K.withAlpha(palette.ink, 0.10 * (1 - b) + 0.04);
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, 0, K.TAU); ctx.stroke();

      ctx.save(); ctx.translate(cx, cy);
      ctx.lineWidth = 1.9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = stroke;
      // one petal per rotation: an arm out (side +1) and back (side −1). At life 0 the two
      // halves mirror exactly (perfect symmetry); with life they drift apart (variation).
      function pt(i, side, rot, seed) {
        var rr = ARM[i][0], yy = ARM[i][1] * side;
        var t = i * 0.9 + seed + (side < 0 ? 11.1 : 0);
        var rad = (rr + life * 0.14 * Math.sin(t + time * 0.6)) * R;
        var ang = rot + (yy + life * 0.16 * Math.cos(t * 1.3 + time * 0.5)) * 1.4;
        return [rad * Math.cos(ang), rad * Math.sin(ang)];
      }
      for (var k = 0; k < ROT; k++) {
        var rot = k * sector, seed = k * 2.399, p;
        ctx.beginPath();
        p = pt(0, 1, rot, seed); ctx.moveTo(p[0], p[1]);
        for (var i = 1; i < ARM.length; i++) { p = pt(i, 1, rot, seed); ctx.lineTo(p[0], p[1]); }
        for (var j = ARM.length - 2; j >= 0; j--) { p = pt(j, -1, rot, seed); ctx.lineTo(p[0], p[1]); }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }

    var anim = K.loop(function (dt) { time += dt; draw(); });

    if (slider) slider.addEventListener('input', function () {
      life = K.clamp(parseFloat(slider.value), 0, 1);
      K.State.set('symmetry', { life: life, inBand: bandOf(life) > 0.5 });
      updateReadout(); if (!anim.running) draw();
    });

    function resize() { dims = K.fit(canvas); ctx = dims.ctx; W = dims.w; H = dims.h; if (!anim.running) draw(); }

    return {
      start: function () { K.State.symmetry.life = life; draw(); updateReadout(); anim.start(); },
      stop: function () { anim.stop(); },
      resize: resize,
      reduced: function () { K.State.symmetry.life = life; K.State.symmetry.inBand = bandOf(life) > 0.5; time = 0.5; draw(); updateReadout(); }
    };
  };
})();
