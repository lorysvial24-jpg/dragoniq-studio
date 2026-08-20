/* ============================================================
   DragonIQ.Studio — tools.js
   Three visitor tools that sit on top of main.js:
     1. price estimator      (reads DIQ.PRICING)
     2. brief generator      (guided modal, one question at a time)
     3. testimonials carousel
   No dependencies. Every string goes through the i18n dictionary.
   ============================================================ */
(function (global) {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* main.js owns the dictionary, the sound engine and the clipboard
     helper; read them lazily so load order never matters. */
  function api() { return global.DIQ || {}; }
  function t(key) {
    var fn = api().t;
    return fn ? fn(key) : key;
  }
  function fill(key, vars) {
    return String(t(key)).replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : m;
    });
  }
  function reduced() {
    var fn = api().reduced;
    return fn ? fn() : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function copy(text, done) {
    var fn = api().copy;
    if (fn) fn(text, done); else done && done();
  }

  /* Flash a "Copied!" state on a button without losing its label key. */
  function flash(btn, key) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    var original = btn.getAttribute('data-i18n');
    btn.textContent = t(key);
    btn.classList.add('is-copied');
    window.setTimeout(function () {
      btn.dataset.busy = '0';
      btn.classList.remove('is-copied');
      btn.textContent = t(original);
    }, 1800);
  }

  /* ==========================================================
     1. Price estimator
     ========================================================== */
  function initEstimator() {
    var form = $('#estForm');
    if (!form) return;

    var lowEl = $('#estLow');
    var highEl = $('#estHigh');
    var curEl = $('#estCur');
    var live = $('#estLive');
    if (!lowEl || !highEl) return;

    var shown = { low: 0, high: 0 };
    var frame = null;
    var settle = null;

    function table() {
      return api().PRICING || { base: {}, size: {}, options: {}, rush: 1, spread: .35, currency: '€' };
    }

    function compute() {
      var P = table();
      var type = (form.querySelector('input[name="est-type"]:checked') || {}).value || '1v1';
      var size = (form.querySelector('input[name="est-size"]:checked') || {}).value || 'medium';
      var rush = !!(form.querySelector('input[name="est-delay"]:checked') || {}).value &&
                 (form.querySelector('input[name="est-delay"]:checked') || {}).value === 'rush';

      var base = P.base[type];
      if (typeof base !== 'number') base = P.base.other || 60;
      var mult = P.size[size];
      if (typeof mult !== 'number') mult = 1;

      var total = base * mult;
      $$('input[name="est-opt"]:checked', form).forEach(function (box) {
        var add = P.options[box.value];
        if (typeof add === 'number') total += add;
      });
      if (rush) total *= (typeof P.rush === 'number' ? P.rush : 1);

      var spread = typeof P.spread === 'number' ? P.spread : .35;
      return { low: round5(total), high: round5(total * (1 + spread)) };
    }

    /* Round figures read as a quote, not as a computation. */
    function round5(v) { return Math.max(5, Math.round(v / 5) * 5); }

    function paint(low, high) {
      lowEl.textContent = String(low);
      highEl.textContent = String(high);
    }

    function announce(low, high) {
      if (!live) return;
      window.clearTimeout(settle);
      settle = window.setTimeout(function () {
        live.textContent = fill('est.live', { low: low, high: high, cur: table().currency || '€' });
      }, 700);
    }

    /* Digits roll from the previous figure to the new one. */
    function rollTo(target) {
      var from = { low: shown.low, high: shown.high };
      shown = { low: target.low, high: target.high };
      announce(target.low, target.high);

      if (reduced() || (from.low === target.low && from.high === target.high)) {
        paint(target.low, target.high);
        return;
      }

      if (frame) window.cancelAnimationFrame(frame);
      var start = null;
      var duration = 620;

      lowEl.parentNode.classList.add('is-rolling');
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        paint(
          Math.round(from.low + (target.low - from.low) * eased),
          Math.round(from.high + (target.high - from.high) * eased)
        );
        if (p < 1) {
          frame = window.requestAnimationFrame(step);
        } else {
          frame = null;
          lowEl.parentNode.classList.remove('is-rolling');
        }
      }
      frame = window.requestAnimationFrame(step);
    }

    function update() { rollTo(compute()); }

    form.addEventListener('change', update);
    document.addEventListener('diq:lang', function () { announce(shown.low, shown.high); });

    if (curEl) curEl.textContent = table().currency || '€';

    /* Seed without an animation so the section never flashes 0. */
    var first = compute();
    shown = first;
    paint(first.low, first.high);
    announce(first.low, first.high);

    /* Route the two CTAs through the same constants as the contact
       section, so a single edit at the top of main.js moves both. */
    var stripe = $('#estStripe');
    if (stripe) stripe.href = api().STRIPE_LINK || '#contact';
    var discord = $('#estDiscord');
    if (discord) discord.href = api().DISCORD || '#contact';
  }

  /* ==========================================================
     2. Brief generator
     ========================================================== */
  var QUESTIONS = [
    { q: 'brief.q1', hint: 'brief.h1', label: 'brief.l1' },
    { q: 'brief.q2', hint: 'brief.h2', label: 'brief.l2' },
    { q: 'brief.q3', hint: 'brief.h3', label: 'brief.l3' },
    { q: 'brief.q4', hint: 'brief.h4', label: 'brief.l4' },
    { q: 'brief.q5', hint: 'brief.h5', label: 'brief.l5' },
    { q: 'brief.q6', hint: 'brief.h6', label: 'brief.l6' },
    { q: 'brief.q7', hint: 'brief.h7', label: 'brief.l7' }
  ];

  function initBrief() {
    var root = $('#brief');
    var panel = $('#briefPanel');
    if (!root || !panel) return;

    var stepView = $('#briefStep');
    var resultView = $('#briefResult');
    var progress = $('#briefProgress');
    var bar = $('#briefBar');
    var qEl = $('#briefQ');
    var hintEl = $('#briefHint');
    var input = $('#briefInput');
    var prevBtn = $('#briefPrev');
    var nextBtn = $('#briefNext');
    var skipBtn = $('#briefSkip');
    var out = $('#briefOut');
    var copyBtn = $('#briefCopy');
    var restartBtn = $('#briefRestart');
    var discordBtn = $('#briefDiscord');

    var answers = QUESTIONS.map(function () { return ''; });
    var index = 0;
    var open = false;
    var lastFocus = null;

    if (discordBtn) discordBtn.href = api().DISCORD || '#contact';

    function renderStep() {
      var item = QUESTIONS[index];
      progress.textContent = fill('brief.progress', { n: index + 1, total: QUESTIONS.length });
      bar.style.setProperty('--p', ((index + 1) / QUESTIONS.length * 100).toFixed(1) + '%');
      qEl.textContent = t(item.q);
      hintEl.textContent = t(item.hint);
      input.value = answers[index];
      input.setAttribute('aria-label', t(item.q));
      prevBtn.disabled = index === 0;
      nextBtn.textContent = t(index === QUESTIONS.length - 1 ? 'brief.finish' : 'brief.next');
      nextBtn.setAttribute('data-i18n', index === QUESTIONS.length - 1 ? 'brief.finish' : 'brief.next');

      /* Re-run the entrance on every question so the step reads as a move. */
      if (!reduced()) {
        stepView.classList.remove('is-in');
        void stepView.offsetWidth;
        stepView.classList.add('is-in');
      }
    }

    function store() { answers[index] = input.value.trim(); }

    function go(delta) {
      store();
      var next = index + delta;
      if (next < 0) return;
      if (next >= QUESTIONS.length) { finish(); return; }
      index = next;
      renderStep();
      input.focus();
    }

    function compose() {
      var lines = [t('brief.header'), ''];
      QUESTIONS.forEach(function (item, i) {
        var value = answers[i] ? answers[i] : t('brief.empty');
        /* Keep multi-line answers readable once pasted in Discord. */
        value = value.split(/\r?\n/).join('\n   ');
        lines.push((i + 1) + '. ' + t(item.label) + ' : ' + value);
      });
      lines.push('');
      lines.push('— ' + (document.title || 'DragonIQ.Studio'));
      return lines.join('\n');
    }

    function finish() {
      store();
      out.textContent = compose();
      stepView.hidden = true;
      resultView.hidden = false;
      if (!reduced()) {
        resultView.classList.remove('is-in');
        void resultView.offsetWidth;
        resultView.classList.add('is-in');
      }
      copyBtn.focus();
    }

    function restart() {
      answers = QUESTIONS.map(function () { return ''; });
      index = 0;
      resultView.hidden = true;
      stepView.hidden = false;
      renderStep();
      input.focus();
    }

    /* ------------------------------------------- open / close */
    function focusables() {
      return $$('a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];

      /* Focus can end up outside the panel — a language switch moves it
         back to the header button. Pull it in rather than letting Tab
         walk off into the page behind the scrim. */
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function openBrief(origin) {
      if (open) return;
      open = true;
      lastFocus = origin || document.activeElement;
      root.hidden = false;
      document.body.classList.add('is-locked');
      void root.offsetWidth;
      root.classList.add('is-open');
      if (api().whoosh) api().whoosh(true);
      renderStep();
      window.setTimeout(function () { input.focus(); }, reduced() ? 0 : 220);
      document.addEventListener('keydown', onKey, true);
    }

    function close() {
      if (!open) return;
      open = false;
      store();
      root.classList.remove('is-open');
      document.removeEventListener('keydown', onKey, true);
      document.body.classList.remove('is-locked');
      if (api().whoosh) api().whoosh(false);
      var done = function () { root.hidden = true; };
      if (reduced()) done(); else window.setTimeout(done, 260);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$('[data-brief-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openBrief(btn); });
    });
    $$('[data-brief-close]', root).forEach(function (el) {
      el.addEventListener('click', close);
    });

    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
    skipBtn.addEventListener('click', function () { input.value = ''; go(1); });

    /* Enter moves on; Shift+Enter keeps a line break in the answer. */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(1); }
    });

    copyBtn.addEventListener('click', function () {
      copy(out.textContent, function () { flash(copyBtn, 'brief.copied'); });
    });
    restartBtn.addEventListener('click', restart);

    /* A language switch mid-questionnaire keeps the answers. */
    document.addEventListener('diq:lang', function () {
      if (!open) return;
      if (resultView.hidden) renderStep();
      else out.textContent = compose();
    });
  }

  /* ==========================================================
     3. Testimonials carousel
     ========================================================== */
  function initTestimonials() {
    var root = $('#proofCarousel');
    if (!root) return;

    var slides = $$('.tmn', root);
    var dots = $$('.tmn__dot', root);
    var prev = $('#tmnPrev');
    var next = $('#tmnNext');
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var DELAY = 7000;

    function show(i, focusSlide) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (slide, n) {
        var on = n === index;
        slide.classList.toggle('is-active', on);
        slide.setAttribute('aria-hidden', String(!on));
        /* Hidden slides must not be reachable by keyboard. */
        $$('a, button', slide).forEach(function (el) {
          if (on) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', '-1');
        });
      });
      dots.forEach(function (dot, n) {
        dot.setAttribute('aria-selected', String(n === index));
        dot.tabIndex = n === index ? 0 : -1;
      });
      if (focusSlide && dots[index]) dots[index].focus();
    }

    function step(delta) { show(index + delta); restart(); }

    function restart() {
      window.clearInterval(timer);
      if (reduced()) return;
      timer = window.setInterval(function () { show(index + 1); }, DELAY);
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    dots.forEach(function (dot, n) {
      dot.addEventListener('click', function () { show(n); restart(); });
      dot.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, true); restart(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, true); restart(); }
      });
    });

    /* Pause while the visitor is reading or the tab is hidden. */
    root.addEventListener('pointerenter', function () { window.clearInterval(timer); });
    root.addEventListener('pointerleave', restart);
    root.addEventListener('focusin', function () { window.clearInterval(timer); });
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) restart();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearInterval(timer); else restart();
    });

    show(0);
    restart();
  }

  /* ==========================================================
     boot
     ========================================================== */
  function boot() {
    initEstimator();
    initBrief();
    initTestimonials();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
