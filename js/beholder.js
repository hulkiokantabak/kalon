/* KALÓN — Finale · THE BEHOLDER
 * The last move of beauty belongs to the one who looks. This does not roll dice: it
 * COMPOSES a portrait of THIS visit from where the visitor left the five instruments —
 * their divergence angle, the interval they locked, the "life" they found, the light they
 * raked, the vessel they mended. The aphorism is chosen by the move they engaged with most. The result
 * exists only because they were here to make it. It can be renamed and downloaded.
 * Nothing leaves the browser. (This is the one place full colour returns — theirs.)
 */
(function () {
  'use strict';
  var K = window.KALON;
  window.KALON_instruments = window.KALON_instruments || {};

  // Aphorisms clustered by move; the finale selects from the move the visitor engaged most.
  var LINES = {
    proportion: [
      'What is proportioned rests; and what rests, we call beautiful.',
      'The golden angle is how a flower refuses to repeat itself.',
      'Beauty is proportion remembering it was once a living thing.',
      'Order is the angle at which a thing stops wasting itself.',
      'A sunflower solves a problem it was never handed.',
      'Growth turns by a single constant and never once repeats.'
    ],
    harmony: [
      'A closed curve is a resolved chord you can hold in your hand.',
      'Every consonance is a small argument that the world coheres.',
      'A ratio you can sing is a shape you can trust.',
      'The simplest numbers make the steadiest sound.',
      'Two lengths in a plain ratio, and the ear stops searching.',
      'What resolves in the ear will also close on the page.'
    ],
    symmetry: [
      'Nothing symmetrical is alive until it dares one asymmetry.',
      'A pattern lives only where it almost fails.',
      'Between the sterile and the wild lies the narrow country of grace.',
      'Symmetry is a promise; variation is the keeping of it.',
      'Perfect repetition is a kind of sleep.',
      'The living forms stand just short of order.'
    ],
    contrast: [
      'Light means nothing until something stands in its way.',
      'A form is only the argument between a light and a shadow.',
      'Rake the light, and the flat thing remembers it has depth.',
      'We see the round of the world by how the dark falls off it.',
      'Beauty needs a little darkness to have somewhere to arrive.',
      'The shadow is not the absence of the form; it is its proof.'
    ],
    imperfection: [
      'We do not mend to hide the break. We mend to keep it.',
      'Imperfection is how the made thing confesses it was loved.',
      'A seam of gold says: this was broken, and is dearer for it.',
      'The vessel that has been mended has, at last, a history.',
      'What was whole asked nothing of us; what was mended asks to be seen.',
      'The crack is not the flaw. Hiding it would have been.'
    ],
    general: [
      'Beauty is the moment a thing agrees to be seen.',
      'Beauty is not owned. It is completed, once, by a witness.',
      'To behold is to lend a thing your one irreplaceable attention.',
      'The last brushstroke of any beautiful thing is the seeing of it.',
      'Nothing here was beautiful until you were here to find it so.',
      'The stone holds the pattern; you hold the beauty.'
    ]
  };
  var ADJ = ['Quiet', 'Golden', 'Ninth', 'Late', 'First', 'Slow', 'Bright', 'Hidden', 'Certain', 'Wandering', 'Patient', 'Distant', 'Tender', 'Unnamed'];
  var NOUN = ['Meridian', 'Lull', 'Bloom', 'Consonance', 'Threshold', 'Vellum', 'Ember', 'Cadence', 'Reliquary', 'Solstice', 'Aperture', 'Interval', 'Filament', 'Recurrence'];
  // The bloom's COLOUR is earned by the move the visitor engaged most — not an arbitrary pick.
  var DOM_PAL = { proportion: 'Vellum', harmony: 'Sea-glass', symmetry: 'Ink-wash', contrast: 'Nightfall', imperfection: 'Ember', general: 'Blush' };

  KALON_instruments.beholder = function (section) {
    var canvas = section.querySelector('[data-role="canvas"]');
    var nameEl = section.querySelector('[data-role="name"]');
    var lineEl = section.querySelector('[data-role="line"]');
    var sigEl = section.querySelector('[data-role="signature"]');
    var nameInput = section.querySelector('[data-role="rename"]');
    var againBtn = section.querySelector('[data-role="again"]');
    var dlBtn = section.querySelector('[data-role="download"]');
    var st = null, assemble = null, dims = null;

    function pick(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }
    function bandOf(v) { return K.smoothstep(K.clamp(1 - Math.abs(v - 0.42) / 0.20, 0, 1)); } // peak at the living band, like symmetry.js
    function cband(v) { return K.smoothstep(K.clamp(1 - Math.abs(v - 0.7) / 0.22, 0, 1)); }   // peak at the raking band, like contrast.js

    function readPlay() {
      var S = K.State;
      var scores = {
        proportion: S.proportion.touched ? (S.proportion.nearGolden ? 1.0 : 0.6) : 0,
        harmony: S.harmony.touched ? (S.harmony.locked ? 1.0 : 0.6) : 0,
        symmetry: S.symmetry.touched ? (0.6 + 0.4 * bandOf(S.symmetry.life)) : 0,   // reward finding the living band, not leaving it
        contrast: S.contrast.touched ? (0.6 + 0.4 * cband(S.contrast.light)) : 0,   // reward the raking band
        imperfection: S.imperfection.touched ? (S.imperfection.mended ? 1.0 : 0.7) : 0
      };
      var best = 'general', bestv = 0.001;
      for (var k in scores) if (scores[k] > bestv) { bestv = scores[k]; best = k; }
      return {
        theta: S.proportion.theta, nearGolden: S.proportion.nearGolden,
        ratioVal: S.harmony.ratio, p: S.harmony.p, q: S.harmony.q, locked: S.harmony.locked,
        life: S.symmetry.life, contrastLight: S.contrast.light,
        crackSeed: S.imperfection.seed, brokenness: S.imperfection.brokenness,
        mended: S.imperfection.mended, brokeTouched: S.imperfection.touched,
        anyTouched: S.proportion.touched || S.harmony.touched || S.symmetry.touched || S.contrast.touched || S.imperfection.touched,
        dominant: best
      };
    }

    function paletteByName(n) { for (var i = 0; i < K.palettes.length; i++) if (K.palettes[i].name === n) return K.palettes[i]; return K.palettes[0]; }
    function compose(deco) {
      var play = readPlay();
      var sigSeed = K.hashSeed([play.theta.toFixed(2), play.p, play.q, play.ratioVal.toFixed(2), play.life.toFixed(2), play.contrastLight.toFixed(2), play.crackSeed, play.mended].join('|'));
      var r = K.rng((sigSeed ^ (deco >>> 0)) >>> 0);
      var palette = paletteByName(DOM_PAL[play.dominant] || 'Blush'); // colour earned by the dominant move; "Again" keeps it
      var cluster = LINES[play.dominant] || LINES.general;
      var line = cluster[Math.floor(r() * cluster.length) % cluster.length];
      var name = pick(ADJ, r) + ' ' + pick(NOUN, r);
      return { play: play, palette: palette, line: line, name: name, deco: deco };
    }

    function signatureText(p, forExport) {
      if (!p.anyTouched && !forExport) return 'the defaults — play the instruments to compose your own';
      var parts = ['θ ' + p.theta.toFixed(1) + '°' + (p.nearGolden ? ' · golden' : '')];
      parts.push(p.locked ? (p.p + ':' + p.q) : (p.ratioVal.toFixed(2) + ':1'));
      parts.push('life ' + Math.round(p.life * 100));
      parts.push('light ' + Math.round(p.contrastLight * 100));
      parts.push(p.mended ? 'mended' : (p.brokeTouched ? 'broken' : 'whole'));
      return parts.join('  ·  ') + (p.anyTouched ? '' : '  ·  defaults');
    }

    // crack veining generator (gold if mended, ink if broken) scaled to the bloom
    function jag(p0, p1, rough, depth, out, r) {
      if (depth <= 0) { out.push(p1); return; }
      var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy) || 1;
      var mid = { x: mx + (-dy / len) * (r() - 0.5) * rough * len, y: my + (dx / len) * (r() - 0.5) * rough * len };
      jag(p0, mid, rough * 0.62, depth - 1, out, r); jag(mid, p1, rough * 0.62, depth - 1, out, r);
    }

    // draw into any context/rect (screen + export). nMax limits florets for assembly.
    function paint(g, x, y, w, h, s, nMax) {
      var pal = s.palette, play = s.play, r = K.rng(s.play.crackSeed ^ 0x9e37);
      var cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.5, scale = Math.min(w, h) / 380;
      var dom = play.dominant;
      var N = dom === 'proportion' ? 1100 : 900;                    // proportion-dominant → a denser pack
      var thetaRad = play.theta * Math.PI / 180, c = R / Math.sqrt(N) * 0.94, spin = r() * K.TAU;
      var jitterAmp = play.life * R * 0.05 * (dom === 'symmetry' ? 1.9 : 1);  // symmetry-dominant → more variation
      var upto = nMax == null ? N : nMax;
      for (var n = 1; n <= upto; n++) {
        var a = n * thetaRad + spin, rr = c * Math.sqrt(n), t = n / N;
        var jx = (r() - 0.5) * jitterAmp * t, jy = (r() - 0.5) * jitterAmp * t;
        var tone = pal.tones[n % pal.tones.length], rad = K.lerp(1.0, 3.6, t) * scale;
        g.beginPath(); g.fillStyle = K.withAlpha(tone, K.lerp(0.5, 0.95, t));
        g.arc(cx + rr * Math.cos(a) + jx, cy + rr * Math.sin(a) + jy, Math.max(0.5, rad), 0, K.TAU); g.fill();
      }
      if (nMax != null && nMax < N) return; // still assembling; overlays come at the end
      // consonant/played harmonograph overlay, faint
      var A = R * 0.92, ratio = play.locked ? play.p / play.q : play.ratioVal, ph = r() * K.TAU;
      var overlayAlpha = dom === 'harmony' ? 0.5 : dom === 'proportion' ? 0.14 : 0.24; // harmony-dominant → the consonance sings louder
      g.beginPath(); g.lineWidth = Math.max(0.8, scale * (dom === 'harmony' ? 1.6 : 0.9)); var first = true;
      for (var sm = 0; sm <= 1700; sm += 1.2) {
        var env = Math.exp(-0.0016 * sm);
        var px = cx + A * Math.sin(sm * 0.06 + ph) * env, py = cy + A * Math.sin(ratio * sm * 0.06) * env;
        if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
      }
      g.strokeStyle = K.withAlpha(pal.ink, overlayAlpha); g.stroke();
      // veining: the vessel they left — gold if mended, ink if they broke it and left it
      if (play.mended || play.brokeTouched) {
        var vr = K.rng(play.crackSeed), mains = Math.max(1, Math.round(play.brokenness)) + (dom === 'imperfection' ? 1 : 0); // imperfection-dominant → the gold is the story
        for (var i = 0; i < mains; i++) {
          var a0 = vr() * K.TAU, a1 = a0 + Math.PI * (0.5 + vr() * 0.7) * (vr() < 0.5 ? 1 : -1);
          var p0 = { x: cx + Math.cos(a0) * R * 0.96, y: cy + Math.sin(a0) * R * 0.96 };
          var p1 = { x: cx + Math.cos(a1) * R * 0.96, y: cy + Math.sin(a1) * R * 0.96 };
          var pull = { x: cx + (vr() - 0.5) * R * 0.5, y: cy + (vr() - 0.5) * R * 0.5 };
          var path = [p0]; jag(p0, pull, 0.5, 5, path, vr); jag(pull, p1, 0.5, 5, path, vr);
          g.save(); g.beginPath(); g.arc(cx, cy, R, 0, K.TAU); g.clip();   // keep veining within the bloom disc
          g.beginPath(); g.moveTo(path[0].x, path[0].y);
          for (var j = 1; j < path.length; j++) g.lineTo(path[j].x, path[j].y);
          g.lineWidth = (play.mended ? 2.4 * scale : 1.3 * scale) * (dom === 'imperfection' ? 1.4 : 1); g.lineCap = 'round';
          g.strokeStyle = play.mended ? '#c69a3e' : K.withAlpha(pal.ink, 0.5); g.stroke(); g.restore();
        }
      }
    }

    function ensureFit() { dims = K.fit(canvas); }
    function paintCanvas(nMax) {
      if (!dims) ensureFit();
      var g = dims.ctx, W = dims.w, Hh = dims.h;
      g.fillStyle = st.palette.bg; g.fillRect(0, 0, W, Hh);
      paint(g, 0, 0, W, Hh, st, nMax);
    }
    function setLabel() { canvas.setAttribute('aria-label', 'A bloom named ' + st.name + ', composed from your play. ' + st.line); }
    function setText() {                                // written once per compose, not per frame
      if (nameEl) nameEl.textContent = st.name;
      if (lineEl) lineEl.textContent = '“' + st.line + '”';
      if (sigEl) sigEl.textContent = signatureText(st.play);
      if (nameInput) nameInput.value = st.name;
      setLabel();
    }
    function startAssembly() {
      if (assemble) assemble.stop();
      ensureFit();                                      // fit once, not every frame
      if (!K.Motion.shouldAnimate()) { paintCanvas(null); return; }
      var t0 = -1;
      assemble = K.loop(function (dt, elapsed) {
        if (t0 < 0) t0 = elapsed;
        var full = st.play.dominant === 'proportion' ? 1100 : 900;   // match paint()'s N so none pop in at the end
        var p = K.smoothstep(K.clamp((elapsed - t0) / 1.0, 0, 1)), n = Math.round(p * full);
        paintCanvas(p >= 1 ? null : n);
        if (p >= 1) { assemble.stop(); }
      });
      assemble.start();
    }

    function wrap(g, text, maxW) {
      var words = text.split(' '), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) { var test = cur ? cur + ' ' + words[i] : words[i]; if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test; }
      if (cur) lines.push(cur); return lines;
    }
    function download() {
      var scale = 2, w = 1080, h = 1350;
      var off = document.createElement('canvas'); off.width = w * scale; off.height = h * scale;
      var g = off.getContext('2d'); g.scale(scale, scale);
      var pal = st.palette;
      g.fillStyle = pal.bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = K.withAlpha(pal.ink, 0.5); g.lineWidth = 1.5; g.strokeRect(48, 48, w - 96, h - 96);
      paint(g, 90, 118, w - 180, w - 180, st, null);
      var top = 118 + (w - 180) + 44;
      g.textAlign = 'center'; g.fillStyle = pal.ink;
      g.font = '600 40px Georgia, "Times New Roman", serif'; g.fillText(st.name, w / 2, top);
      g.font = 'italic 26px Georgia, "Times New Roman", serif';
      wrap(g, '“' + st.line + '”', w - 260).forEach(function (ln, i) { g.fillText(ln, w / 2, top + 52 + i * 36); });
      g.font = '400 17px Georgia, serif'; g.fillStyle = K.withAlpha(pal.ink, 0.62);
      g.fillText(signatureText(st.play, true), w / 2, h - 116);
      g.font = '500 18px Georgia, serif'; g.fillStyle = K.withAlpha(pal.ink, 0.72);
      g.fillText('KALÓN · Instruments of Beauty', w / 2, h - 82);
      g.font = '400 14px Georgia, serif'; g.fillStyle = K.withAlpha(pal.ink, 0.55);
      g.fillText('composed by its beholder', w / 2, h - 60);
      var fname = 'kalon-' + st.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      function trigger(href, revoke) {
        var a = document.createElement('a'); a.href = href; a.download = fname;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if (revoke) setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
      }
      if (off.toBlob) {
        off.toBlob(function (blob) {
          if (!blob) { trigger(off.toDataURL('image/png'), false); return; }   // fallback if toBlob yields null
          trigger(URL.createObjectURL(blob), true);
        }, 'image/png');
      } else { trigger(off.toDataURL('image/png'), false); }                    // older iOS Safari path
    }

    if (againBtn) againBtn.addEventListener('click', function () { st = compose(K.newSeed()); setText(); startAssembly(); }); // reroll decor only; structure stays theirs
    if (dlBtn) dlBtn.addEventListener('click', download);
    if (nameInput) nameInput.addEventListener('input', function () { st.name = nameInput.value.slice(0, 40) || st.name; if (nameEl) nameEl.textContent = st.name; setLabel(); });

    return {
      start: function () { st = compose(1); setText(); startAssembly(); },
      stop: function () { if (assemble) assemble.stop(); },
      resize: function () { dims = null; if (st) paintCanvas(null); },
      reduced: function () { st = compose(1); setText(); paintCanvas(null); }
    };
  };
})();
