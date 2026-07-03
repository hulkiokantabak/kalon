/* KALÓN — Instrument IV · CONTRAST (chiaroscuro)
 * A form emerges from darkness under a single light. Flat, front-on light gives no
 * modelling — the sphere reads as a disc, dead. Rake the light to the side and value
 * carves depth; at the beautiful band a gold rim-light glints. This is the darkness the
 * cabinet had been missing: beauty made by the contrast of light and shadow.
 * (After Caravaggio, La Tour, Rembrandt — the tenebrists.)
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  KALON_instruments.contrast = function (section, palette) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var slider = section.querySelector('[data-role="light"]');
    var readout = section.querySelector('[data-role="readout"]');
    var dims = K.fit(canvas), ctx = dims.ctx, W = dims.w, H = dims.h;

    var light = 0.7, targetLight = 0.7;   // 0 = flat/front, 1 = extreme raking
    var phi = -2.3;                        // light azimuth (radians); drifts slowly, draggable
    var GOLD_HI = palette.goldHi || '#e8c874';
    var lastWord = '';

    function bandOf(v) { return K.smoothstep(K.clamp(1 - Math.abs(v - 0.7) / 0.22, 0, 1)); } // raking band ~0.7

    function publish(user) {
      // publish the COMMITTED target, not the mid-ease value — so the paused / reduced-motion
      // path (where the loop never republishes) leaves the finale the value the visitor chose
      var patch = { light: targetLight, raking: bandOf(targetLight) > 0.5 };
      if (user) K.State.set('contrast', patch);
      else { K.State.contrast.light = targetLight; K.State.contrast.raking = patch.raking; }
    }

    function updateReadout() {
      var b = bandOf(light);
      var word = light < 0.22 ? 'flat' : (light > 0.92 ? 'lost in shadow' : (b > 0.55 ? 'raking' : 'modelled'));
      if (word === lastWord) return;
      lastWord = word;
      if (readout) readout.innerHTML = 'light ' + Math.round(light * 100) + ' &middot; <em>' + word + '</em>';
      canvas.setAttribute('aria-label', 'A sphere lit from the side; the light is ' + word + ' at ' + Math.round(light * 100) + ' of 100.');
      if (slider) slider.setAttribute('aria-valuetext', 'light ' + Math.round(light * 100) + ' of 100, ' + word);
    }

    function draw() {
      var cx = W / 2, cy = H * 0.44, R = Math.min(W, H) * 0.30;
      // dark ground → darker floor
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, palette.ink); bg.addColorStop(1, K.mix(palette.ink, '#000000', 0.45));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      var b = bandOf(light);
      var cosP = Math.cos(phi), sinP = Math.sin(phi);
      // cast shadow on the ground, opposite the light, longer as the light rakes
      var sx = cx - cosP * R * K.lerp(0.2, 1.1, light), sy = cy + R * 0.98;
      var sh = ctx.createRadialGradient(sx, sy, 2, sx, sy, R * K.lerp(1.0, 1.7, light));
      sh.addColorStop(0, 'rgba(0,0,0,' + K.lerp(0.18, 0.5, light).toFixed(3) + ')');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(R * K.lerp(1.0, 1.55, light), R * 0.32);
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, K.TAU); ctx.restore(); ctx.fill();   // ellipse via scaled arc — no ctx.ellipse (legacy-safe)

      // the sphere: a radial gradient whose bright point sits toward the light
      var d = R * K.lerp(0.05, 0.95, light);
      var hx = cx + cosP * d, hy = cy + sinP * d;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, K.TAU); ctx.clip();
      var g = ctx.createRadialGradient(hx, hy, R * 0.04, cx - cosP * R * 0.15, cy - sinP * R * 0.15, R * 1.55);
      g.addColorStop(0, palette.bg);
      g.addColorStop(0.32, K.mix(palette.bg, palette.ink, 0.4));
      g.addColorStop(0.72, K.mix(palette.ink, '#000000', 0.25));
      g.addColorStop(1, '#000000');
      ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      // specular
      var spec = K.lerp(0.25, 0.95, b);
      ctx.beginPath(); ctx.fillStyle = K.withAlpha('#ffffff', 0.45 * spec);
      ctx.arc(hx, hy, R * 0.07, 0, K.TAU); ctx.fill();
      ctx.restore();

      // gold rim-light on the lit silhouette — the success cue, only in the raking band
      if (b > 0.04) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, phi - Math.PI * 0.5, phi + Math.PI * 0.5);
        ctx.lineWidth = R * 0.035 * b; ctx.strokeStyle = K.withAlpha(GOLD_HI, 0.85 * b);
        ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
      }
      updateReadout();
    }

    var anim = K.loop(function (dt) {
      light += (targetLight - light) * Math.min(1, dt * 6);
      if (Math.abs(targetLight - light) < 0.001) light = targetLight;
      phi += dt * 0.05;              // the light slowly orbits — the form turns in it (ambient)
      publish(false);
      draw();
    });

    function setLight(v, user) {
      targetLight = K.clamp(v, 0, 1);
      if (slider) slider.value = String(targetLight);
      if (user) { publish(true); updateReadout(); }
      if (!anim.running) { light = targetLight; draw(); }
    }
    if (slider) slider.addEventListener('input', function () { setLight(parseFloat(slider.value), true); });

    var dragging = false, lastX = 0;
    function px(e) { return (e.touches ? e.touches[0].clientX : e.clientX); }
    canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = px(e); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (!dragging) return; if (e.cancelable) e.preventDefault(); phi += (px(e) - lastX) * 0.01; lastX = px(e); if (!anim.running) draw(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { canvas.addEventListener(ev, function () { dragging = false; }); });

    function resize() { dims = K.fit(canvas); ctx = dims.ctx; W = dims.w; H = dims.h; if (!anim.running) draw(); }

    return {
      start: function () { light = targetLight; publish(false); draw(); updateReadout(); anim.start(); },
      stop: function () { anim.stop(); },
      resize: resize,
      reduced: function () { light = targetLight = 0.72; phi = -2.3; publish(false); draw(); updateReadout(); }
    };
  };
})();
