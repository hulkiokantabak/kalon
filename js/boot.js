/* KALÓN — boot.js
 * Wires each <section data-instrument="…"> to its factory, manages the animation
 * lifecycle (start on view, stop when off-screen), handles resize, and drives the
 * header motion/sound toggles. Loads last.
 */
(function () {
  'use strict';
  var K = window.KALON;
  var factories = window.KALON_instruments || {};

  // The one system (kept in sync with kalon.css :root tokens). Instruments draw in
  // ink and tint toward gold only when a move succeeds. The finale bloom is the one
  // place full color returns (it uses core's curated palettes, seeded by the visitor).
  var SITE_PALETTE = {
    name: 'Kalon Mono', bg: '#f4efe6', paperRaised: '#efe7d9',
    ink: '#1c1a17', inkSoft: '#5b554c', gold: '#b8843f', goldHi: '#e8c874'
  };

  var instances = [];

  function initInstruments() {
    var sections = document.querySelectorAll('[data-instrument]');
    Array.prototype.forEach.call(sections, function (section) {
      var name = section.getAttribute('data-instrument');
      var factory = factories[name];
      if (!factory) return;
      var inst;
      try { inst = factory(section, SITE_PALETTE); } catch (e) { return; }
      if (!inst) return;
      var rec = { section: section, inst: inst, started: false, visible: false, reducedDone: false };
      instances.push(rec);

      // self-erasing first-touch hint
      var hint = section.querySelector('.hint');
      if (hint) {
        var hide = function () { hint.classList.add('is-hidden'); section.removeEventListener('pointerdown', hide); section.removeEventListener('input', hide); section.removeEventListener('click', hide); };
        section.addEventListener('pointerdown', hide); section.addEventListener('input', hide); section.addEventListener('click', hide);
      }

      // One lifecycle for all cases: start animation when in view IF motion is enabled;
      // otherwise render a meaningful still once. Deferring the still behind the observer
      // keeps off-screen instruments off the load critical path, and tracking visibility
      // even under reduced motion lets the Motion toggle re-enable animation later.
      K.observe(section,
        function () {
          rec.visible = true;
          if (K.Motion.enabled) {
            if (!rec.started) { try { inst.start(); rec.started = true; } catch (e) {} }
          } else if (!rec.reducedDone) {
            try { inst.reduced ? inst.reduced() : inst.start(); } catch (e) {}
            rec.reducedDone = true;
          }
        },
        function () { rec.visible = false; if (rec.started) { try { inst.stop(); } catch (e) {} rec.started = false; } });
    });
  }

  // resize: refit visible instruments (debounced)
  window.addEventListener('resize', K.debounce(function () {
    instances.forEach(function (rec) { if (rec.inst.resize) { try { rec.inst.resize(); } catch (e) {} } });
  }, 200));

  // ---- header toggles ----
  function setupToggles() {
    var motionBtn = document.querySelector('[data-toggle="motion"]');
    var soundBtn = document.querySelector('[data-toggle="sound"]');

    function reflectMotion() {
      if (!motionBtn) return;
      var on = K.Motion.enabled;
      motionBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      motionBtn.textContent = on ? 'Motion: on' : 'Motion: off';
    }
    function reflectSound() {
      if (!soundBtn) return;
      soundBtn.setAttribute('aria-pressed', K.Audio.enabled ? 'true' : 'false');
      soundBtn.textContent = K.Audio.enabled ? 'Sound: on' : 'Sound: off';
    }

    if (motionBtn) {
      motionBtn.addEventListener('click', function () {
        K.Motion.setEnabled(!K.Motion.enabled);
        reflectMotion();
        // start/stop currently visible instruments to match
        instances.forEach(function (rec) {
          if (K.Motion.enabled && rec.visible && !rec.started) { try { rec.inst.start(); rec.started = true; } catch (e) {} }
          else if (!K.Motion.enabled && rec.started) { try { rec.inst.stop(); rec.started = false; } catch (e) {} }
        });
      });
      reflectMotion();
    }
    if (soundBtn) {
      soundBtn.addEventListener('click', function () { K.Audio.toggle(); });
      K.Audio.onChange(reflectSound);   // keep masthead in sync with the in-context "Hear it" button
      reflectSound();
    }
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () { initInstruments(); setupToggles(); });
})();
