/* KALÓN — audio.js
 * A synthesized, asset-free sound layer: a soft drone tuned to a perfect fifth,
 * plus short consonant tones when an interval is chosen or a form is mended.
 * OFF by default. The AudioContext is created only after a user gesture (the
 * sound toggle). The whole site is complete in silence; sound is a garnish.
 *
 * Mobile note: iOS/Android require the context to be unlocked *inside* a user
 * gesture (resume + a 1-sample silent buffer), and iOS suspends it on background —
 * so we unlock on start(), re-resume in note(), and resume on visibilitychange.
 */
(function () {
  'use strict';
  var K = window.KALON;
  var ctx = null, master = null, drone = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
    return ctx;
  }

  // Must run inside a user gesture. Resume the (often suspended) context and play a
  // 1-sample silent buffer — the reliable unlock for iOS Safari and mobile Chrome.
  function resume() { if (ctx && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) {} } }
  function unlock() {
    if (!ctx) return;
    resume();
    try {
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) {}
  }

  function startDrone() {
    if (!ctx || drone) return;
    var g = ctx.createGain(); g.gain.value = 0.05;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;   // A2
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 165;   // E3 (3:2)
    var o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110 * 2; o3.detune.value = 4;
    var o3g = ctx.createGain(); o3g.gain.value = 0.35;
    o1.connect(g); o2.connect(g); o3.connect(o3g); o3g.connect(g);
    g.connect(lp); lp.connect(master);
    var breatheLFO = ctx.createOscillator(); breatheLFO.type = 'sine'; breatheLFO.frequency.value = 0.06;
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.02;
    breatheLFO.connect(lfoGain); lfoGain.connect(g.gain);
    [o1, o2, o3, breatheLFO].forEach(function (o) { o.start(); });
    drone = { g: g, oscs: [o1, o2, o3, breatheLFO] };
  }

  var impl = {
    start: function () {
      if (!ensure()) return;
      unlock();                 // iOS/Android: resume + silent-buffer, in-gesture
      startDrone();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    },
    stop: function () {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(0.0, ctx.currentTime, 0.4);
    },
    note: function (info) {
      if (!ctx || !K.Audio.enabled) return;
      resume();                 // in case iOS suspended it since the last gesture
      var base = 220, freqs = [base];
      if (info && info.p && info.q) freqs = [base, base * info.p / info.q];
      else if (info && info.ratio) freqs = [base, base * info.ratio];
      var t = ctx.currentTime;
      freqs.forEach(function (f, i) {
        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        var g = ctx.createGain();
        var peak = 0.16 / (i + 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 1.5);
      });
    }
  };

  // iOS suspends the context when the tab is backgrounded — resume when it returns.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && K.Audio.enabled) resume();
  });

  if (K && K.Audio) K.Audio.register(impl);
})();
