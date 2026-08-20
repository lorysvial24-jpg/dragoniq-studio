/* ============================================================
   DragonIQ.Studio — fx.js
   The motion layer: cinematic typography, magnetism, specular
   cards, shockwaves, particles, parallax and cursor states.

   Two rules hold everywhere in this file:
     1. One rAF. Every effect is a job on the same conductor, so
        the page never runs six loops that each read layout.
     2. Frames only ever write transform, opacity and filter.
        Anything that would force a reflow is measured once, on
        scroll or resize, and cached.
   ============================================================ */
(function (global) {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var mqReduce = global.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = global.matchMedia('(hover: hover) and (pointer: fine)');
  function reduced() { return mqReduce.matches; }
  function fine() { return mqFine.matches; }
  function motionOff() {
    return document.documentElement.getAttribute('data-motion') === 'off';
  }
  function dead() { return reduced() || motionOff(); }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ==========================================================
     Conductor — one loop, one layout read per frame
     ========================================================== */
  var Frame = (function () {
    var jobs = [];
    var raf = null;
    var last = 0;

    /* Everything a job might want to know about the viewport, read
       once at the top of the frame and handed out as plain numbers. */
    var state = { y: 0, dy: 0, vel: 0, w: 0, h: 0, t: 0, dt: 0.016, raw: 0.016 };

    function run(now) {
      raf = null;
      /* dt is clamped so that coming back to a backgrounded tab does not
         teleport every effect; raw is the honest number, which is what
         the frame-rate guard has to judge on. */
      state.raw = last ? (now - last) / 1000 : 0.016;
      state.dt = Math.min(0.05, state.raw);
      state.t = now;
      last = now;

      var y = global.pageYOffset || document.documentElement.scrollTop || 0;
      state.dy = y - state.y;
      state.y = y;
      /* Velocity in "screens per second", smoothed so one jumpy wheel
         tick does not spike every effect that reads it. */
      var inst = state.dt > 0 ? state.dy / state.dt / Math.max(1, state.h) : 0;
      state.vel += (inst - state.vel) * 0.18;

      for (var i = 0; i < jobs.length; i++) {
        try { jobs[i](state); } catch (e) { /* one broken effect must not stop the rest */ }
      }
      if (jobs.length) raf = global.requestAnimationFrame(run);
    }

    function measure() {
      state.w = global.innerWidth;
      state.h = global.innerHeight;
    }
    measure();
    global.addEventListener('resize', measure, { passive: true });

    return {
      add: function (fn) {
        jobs.push(fn);
        if (!raf) { last = 0; raf = global.requestAnimationFrame(run); }
      },
      state: state,
      stop: function () { if (raf) { global.cancelAnimationFrame(raf); raf = null; } jobs.length = 0; },
      running: function () { return !!raf; }
    };
  })();

  /* Layout reads live here and nowhere else.

     The important part is that measuring does NOT happen on scroll.
     Every subscriber records positions in *document* space, and the
     frame loop converts to viewport space by subtracting the scroll
     offset — arithmetic, not layout. Scrolling therefore costs zero
     forced reflows however many effects are running.

     A measure still happens on resize, on a language switch, and once
     after scrolling settles, because reveals and lazy images change
     the page height as you go. */
  var Metrics = (function () {
    var subs = [];
    var queued = false;
    var settle = null;

    function flush() {
      queued = false;
      for (var i = 0; i < subs.length; i++) { try { subs[i](); } catch (e) { /* keep going */ } }
    }
    function invalidate() {
      if (queued) return;
      queued = true;
      global.requestAnimationFrame(flush);
    }
    /* Re-measure once the page has stopped moving, never during. */
    function afterScroll() {
      global.clearTimeout(settle);
      settle = global.setTimeout(invalidate, 140);
    }

    global.addEventListener('scroll', afterScroll, { passive: true });
    global.addEventListener('resize', invalidate, { passive: true });
    document.addEventListener('diq:lang', function () { global.setTimeout(invalidate, 80); });
    /* Sections fading in change heights; catch those too. */
    global.addEventListener('load', invalidate);

    return {
      on: function (fn) { subs.push(fn); fn(); },
      invalidate: invalidate,
      /* Document-space top of an element, measured now. */
      docTop: function (el) {
        var r = el.getBoundingClientRect();
        var y = global.pageYOffset || document.documentElement.scrollTop || 0;
        return { top: r.top + y, left: r.left, width: r.width, height: r.height };
      }
    };
  })();

  /* ==========================================================
     Frame-rate guard
     ==========================================================
     The decorative layer leans on very large filter: blur() areas.
     A desktop GPU composites those for free; a weak mobile GPU does
     not. Rather than guess by user-agent, watch the actual frame
     times and trim in two steps: first the blur radius and the
     particle count, then the decorative layers altogether. It never
     climbs back — a device that struggled once will struggle again,
     and oscillating between two looks is worse than either. */
  var Perf = (function () {
    var level = 0;
    var sum = 0, n = 0, bad = 0, warm = 0;
    var LEVELS = ['', 'lite', 'min'];

    /* A backgrounded tab is throttled to about one frame a second, and
       the first moments after load are busy with parsing and fonts.
       Neither says anything about the device, so neither is measured. */
    function reset() { sum = 0; n = 0; bad = 0; warm = 0; }
    document.addEventListener('visibilitychange', reset);
    global.addEventListener('pageshow', reset);

    function apply() {
      var name = LEVELS[level];
      if (name) document.documentElement.setAttribute('data-perf', name);
      else document.documentElement.removeAttribute('data-perf');
    }

    Frame.add(function (st) {
      if (level >= LEVELS.length - 1) return;
      if (document.hidden) { reset(); return; }
      if (warm < 1.5) { warm += st.raw; return; }
      /* A single enormous gap is a stall, not a slow device. */
      if (st.raw > 0.5) { reset(); warm = 1.5; return; }
      sum += st.raw;
      n++;
      /* The window is a stretch of wall clock, not a frame count: on
         the device this exists to rescue, sixty frames could take
         twenty seconds, and the trim has to land long before that. */
      if (sum < 1.2) return;
      var avg = sum / n;
      sum = 0;
      n = 0;
      /* ~24 ms is the point where 60 fps is already lost and 30 is at
         risk; two windows in a row before acting, so one stalled frame
         from a garbage collection never triggers it. */
      if (avg > 0.045) {
        /* Not marginal — well under 25 fps. Trim now, do not wait for
           a second window to confirm what is already obvious. */
        bad = 0;
        level++;
        apply();
      } else if (avg > 0.024) {
        if (++bad >= 2) { bad = 0; level++; apply(); }
      } else {
        bad = 0;
      }
    });

    return {
      level: function () { return level; },
      name: function () { return LEVELS[level]; },
      set: function (n2) { level = Math.max(0, Math.min(LEVELS.length - 1, n2 | 0)); apply(); }
    };
  })();

  function sound(name, arg) {
    var api = global.DIQ;
    if (api && typeof api[name] === 'function') api[name](arg);
  }

  /* ==========================================================
     1. Cinematic typography
     ========================================================== */

  /* Split a node's text into word and letter spans, keeping real
     spaces between the words so wrapping and selection still work. */
  function splitLetters(el, letterClass, wordClass) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    var letters = [];
    el.textContent = '';
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span');
      w.className = wordClass;
      for (var i = 0; i < word.length; i++) {
        var l = document.createElement('span');
        l.className = letterClass;
        l.textContent = word.charAt(i);
        w.appendChild(l);
        letters.push(l);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return letters;
  }

  /* ---- hero title: each letter from its own depth ---------- */
  function initHeroLetters() {
    var el = $('.hero__title');
    if (!el) return;

    function build() {
      var letters = splitLetters(el, 'ltr', 'wd');
      if (!letters.length) return;
      el.setAttribute('data-split', 'letters');
      var n = letters.length;
      letters.forEach(function (l, i) {
        if (dead()) return;
        /* Depth alternates so the line reads as a shoal arriving,
           not as a single sheet tipping forward. */
        var depth = -260 - ((i * 137) % 520);
        l.style.setProperty('--lz', depth + 'px');
        l.style.setProperty('--lb', (6 + (i % 5) * 2.6).toFixed(1) + 'px');
        l.style.setProperty('--ld', Math.round(i * (n > 26 ? 22 : 34)) + 'ms');
        l.style.setProperty('--lr', ((i % 2 ? 1 : -1) * (12 + (i % 4) * 6)) + 'deg');
      });
      /* main.js owns the .is-in flag; if it already fired, honour it. */
      if (dead()) el.classList.add('is-in');
    }

    build();
    /* A language switch rebuilds the words in main.js — re-split after. */
    document.addEventListener('diq:lang', function () {
      global.requestAnimationFrame(function () {
        build();
        el.classList.add('is-in');
      });
    });
  }

  /* ---- section titles: line-by-line mask ------------------- */
  var lineTargets = [];

  function splitLines(el) {
    /* Measure the natural line breaks by laying the words out first,
       grouping them by offsetTop, then rebuilding as masked lines. */
    var text = el.getAttribute('data-raw');
    if (text == null) {
      text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      el.setAttribute('data-raw', text);
    }
    if (!text) return;

    el.textContent = '';
    var probes = text.split(' ').map(function (word, i, arr) {
      var s = document.createElement('span');
      s.className = 'lnprobe';
      s.textContent = word;
      el.appendChild(s);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });

    var rows = [];
    var currentTop = null;
    probes.forEach(function (p) {
      var top = p.offsetTop;
      if (currentTop === null || Math.abs(top - currentTop) > 2) {
        currentTop = top;
        rows.push([]);
      }
      rows[rows.length - 1].push(p.textContent);
    });

    el.textContent = '';
    rows.forEach(function (words, i) {
      var line = document.createElement('span');
      line.className = 'ln';
      var inner = document.createElement('span');
      inner.className = 'ln__in';
      inner.textContent = words.join(' ');
      inner.style.setProperty('--lnd', (i * 105) + 'ms');
      line.appendChild(inner);
      el.appendChild(line);
    });
    el.setAttribute('data-split', 'lines');
  }

  function initTitleMasks() {
    lineTargets = $$('.sectionTitle, .contact__title, .quote__title, .homebuilder__title');
    if (!lineTargets.length) return;

    lineTargets.forEach(function (el) {
      /* Keep the element inside the existing reveal observer — it is
         what flips .is-visible — but drop its own slide so the mask
         is the only motion. */
      if (el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'none');
      splitLines(el);
    });

    var timer = null;
    function relayout() {
      global.clearTimeout(timer);
      timer = global.setTimeout(function () {
        lineTargets.forEach(function (el) {
          var wasVisible = el.classList.contains('is-visible');
          splitLines(el);
          if (wasVisible) el.classList.add('is-visible');
        });
        Metrics.invalidate();
      }, 180);
    }
    global.addEventListener('resize', relayout, { passive: true });
    document.addEventListener('diq:lang', relayout);
  }

  /* ---- 3D cylinder word ------------------------------------ */
  function initRotator() {
    var host = $('#rotator');
    if (!host) return;

    var words = (host.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;

    var step = 360 / words.length;
    var radius = 0;
    var index = 0;

    host.innerHTML = '';
    var cage = document.createElement('span');
    cage.className = 'rotator__cage';
    var faces = words.map(function (w, i) {
      var f = document.createElement('span');
      f.className = 'rotator__face';
      f.textContent = w;
      f.style.setProperty('--a', (i * step) + 'deg');
      cage.appendChild(f);
      return f;
    });
    host.appendChild(cage);

    /* A screen-reader reads the list once; the spin is decoration. */
    host.setAttribute('aria-label', words.join(', '));
    host.setAttribute('role', 'text');

    Metrics.on(function () {
      var h = host.offsetHeight || 0;
      if (!h) return;
      /* Radius of the cylinder that puts each face on its own facet. */
      radius = (h / 2) / Math.tan(Math.PI / words.length);
      cage.style.setProperty('--r', radius.toFixed(2) + 'px');
      faces.forEach(function (f) { f.style.setProperty('--r', radius.toFixed(2) + 'px'); });
    });

    function show(i) {
      index = i;
      cage.style.setProperty('--turn', (-i * step) + 'deg');
      faces.forEach(function (f, n) {
        f.classList.toggle('is-front', n === ((i % words.length) + words.length) % words.length);
      });
    }
    show(0);

    if (dead()) return;
    global.setInterval(function () {
      if (document.hidden) return;
      show(index + 1);
    }, 2600);
  }

  /* ---- magnetic letters on the big titles ------------------ */
  function initTextMagnet() {
    if (!fine() || dead()) return;

    var titles = $$('.hero__title, .sectionTitle, .contact__title, .quote__title');
    titles.forEach(function (title) {
      var boxes = null;
      var px = 0, py = 0, active = false;
      var settled = true;

      /* Section titles are re-split into lines on every resize and on a
         language switch, which throws away whatever letter spans were
         there. So the split and the letter list are both rebuilt at the
         moment the pointer arrives, never cached across a relayout. */
      function ensureLetters() {
        if (title.getAttribute('data-split') === 'lines') {
          $$('.ln__in', title).forEach(function (inner) {
            if (!inner.querySelector('.ltr')) splitLetters(inner, 'ltr ltr--plain', 'wd');
          });
        }
        return $$('.ltr', title);
      }

      function measure() {
        boxes = ensureLetters().map(function (l) {
          var r = l.getBoundingClientRect();
          return { el: l, cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: 0, y: 0, tx: 0, ty: 0 };
        });
      }

      title.addEventListener('pointerenter', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        measure();
        active = true;
        settled = false;
      });
      title.addEventListener('pointermove', function (e) {
        if (!active) return;
        px = e.clientX;
        py = e.clientY;
      }, { passive: true });
      title.addEventListener('pointerleave', function () {
        active = false;
        settled = false;
      });

      var RANGE = 130;
      Frame.add(function () {
        if (settled || !boxes || !boxes.length) return;
        var moving = false;
        for (var i = 0; i < boxes.length; i++) {
          var b = boxes[i];
          if (active) {
            var dx = b.cx - px;
            var dy = b.cy - py;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < RANGE) {
              /* Push away, strongest at the centre of the field. */
              var f = (1 - d / RANGE);
              f = f * f * 26;
              b.tx = (dx / (d || 1)) * f;
              b.ty = (dy / (d || 1)) * f * 0.6;
            } else { b.tx = 0; b.ty = 0; }
          } else { b.tx = 0; b.ty = 0; }

          b.x += (b.tx - b.x) * 0.16;
          b.y += (b.ty - b.y) * 0.16;
          if (Math.abs(b.x) > 0.05 || Math.abs(b.y) > 0.05) moving = true;
          b.el.style.setProperty('--mx', b.x.toFixed(2) + 'px');
          b.el.style.setProperty('--my', b.y.toFixed(2) + 'px');
        }
        if (!moving && !active) {
          settled = true;
          boxes.forEach(function (b) {
            b.el.style.removeProperty('--mx');
            b.el.style.removeProperty('--my');
          });
        }
      });
    });
  }

  /* ==========================================================
     2. Magnetic buttons
     ========================================================== */
  function initMagnets() {
    if (!fine() || dead()) return;

    var SEL = '.btn, .themebtn, .sound, .totop, .tmn__arrow, .maps__dot, .burger, .lang__button, .brief__close';
    var magnets = $$(SEL).map(function (el) {
      return { el: el, cx: 0, cy: 0, w: 0, h: 0, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, on: false };
    });
    if (!magnets.length) return;

    Metrics.on(function () {
      magnets.forEach(function (m) {
        var r = Metrics.docTop(m.el);
        m.cx = r.left + r.width / 2;
        m.cy = r.top + r.height / 2;    /* document space */
        m.w = r.width;
        m.h = r.height;
      });
    });

    var px = -9999, py = -9999;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
    }, { passive: true });

    /* Spring: stiff enough to feel alive, damped enough not to wobble.
       CAP is the important number — without a ceiling, two buttons
       sitting side by side both slide toward the pointer and overlap. */
    var K = 0.14, DAMP = 0.76, PULL = 0.3, CAP = 14;

    Frame.add(function (st) {
      for (var i = 0; i < magnets.length; i++) {
        var m = magnets[i];
        if (!m.w) continue;
        var reach = Math.max(m.w, m.h) * 0.85 + 26;
        var dx = px - m.cx;
        var dy = py - (m.cy - st.y);    /* doc space -> viewport, no layout */
        var d = Math.sqrt(dx * dx + dy * dy);

        if (d < reach) {
          var pull = Math.min(CAP, d * PULL) / (d || 1);
          m.tx = dx * pull;
          m.ty = dy * pull * 0.75;
          if (!m.on) { m.on = true; m.el.classList.add('is-magnet'); }
        } else {
          m.tx = 0;
          m.ty = 0;
          if (m.on) { m.on = false; m.el.classList.remove('is-magnet'); }
        }

        /* Skip the maths entirely once a button is home and idle. */
        if (!m.tx && !m.ty && Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05 && Math.abs(m.vx) < 0.05) {
          if (m.x || m.y) {
            m.x = m.y = m.vx = m.vy = 0;
            m.el.style.removeProperty('--mgx');
            m.el.style.removeProperty('--mgy');
          }
          continue;
        }

        m.vx = (m.vx + (m.tx - m.x) * K) * DAMP;
        m.vy = (m.vy + (m.ty - m.y) * K) * DAMP;
        m.x += m.vx;
        m.y += m.vy;
        m.el.style.setProperty('--mgx', m.x.toFixed(2) + 'px');
        m.el.style.setProperty('--mgy', m.y.toFixed(2) + 'px');
      }
    });
  }

  /* ==========================================================
     3. Specular cards
     ========================================================== */
  function initSpecular() {
    if (!fine() || dead()) return;

    $$('.tilt, .pay__card, .tmn').forEach(function (card) {
      var spec = card.querySelector('.spec');
      if (!spec) {
        spec = document.createElement('span');
        spec.className = 'spec';
        spec.setAttribute('aria-hidden', 'true');
        card.appendChild(spec);
      }

      var rect = null, raf = null;
      var tx = 0, ty = 0, sx = 0, sy = 0, live = false;

      card.addEventListener('pointerenter', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        rect = card.getBoundingClientRect();
        live = true;
        card.classList.add('is-spec');
      });
      card.addEventListener('pointermove', function (e) {
        if (!live || !rect) return;
        tx = (e.clientX - rect.left) / rect.width;
        ty = (e.clientY - rect.top) / rect.height;
        if (!raf) raf = global.requestAnimationFrame(paint);
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        live = false;
        card.classList.remove('is-spec');
        rect = null;
        if (raf) { global.cancelAnimationFrame(raf); raf = null; }
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });

      function paint() {
        raf = null;
        sx += (tx - sx) * 0.2;
        sy += (ty - sy) * 0.2;
        /* The sheen travels twice as far as the pointer, which is what
           makes it read as a reflection rather than a follower. */
        card.style.setProperty('--sx', ((sx - 0.5) * 220).toFixed(1) + 'px');
        card.style.setProperty('--sy', ((sy - 0.5) * 220).toFixed(1) + 'px');
        card.style.setProperty('--ry', ((sx - 0.5) * 15).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - sy) * 13).toFixed(2) + 'deg');
        /* The soft glow rides along, as an offset from the centre so it
           moves on the compositor instead of relaying out. */
        card.style.setProperty('--gx', ((sx - 0.5) * 340).toFixed(1) + 'px');
        card.style.setProperty('--gy', ((sy - 0.5) * 260).toFixed(1) + 'px');
        if (live && (Math.abs(tx - sx) > 0.002 || Math.abs(ty - sy) > 0.002)) {
          raf = global.requestAnimationFrame(paint);
        }
      }
    });
  }

  /* ==========================================================
     4. Click shockwave
     ========================================================== */
  function initShockwave() {
    if (dead()) return;

    document.addEventListener('pointerdown', function (e) {
      var host = e.target.closest && e.target.closest('.sec, .proofband, .marquee, .footer');
      if (!host) return;
      /* Not on scroll bars, not on the modal chrome. */
      if (e.target.closest('.modal, .brief, .tpanel')) return;

      var r = host.getBoundingClientRect();
      var wave = document.createElement('span');
      wave.className = 'shock';
      wave.style.setProperty('--wx', (e.clientX - r.left) + 'px');
      wave.style.setProperty('--wy', (e.clientY - r.top) + 'px');
      /* Big enough to cross the section from any corner. */
      wave.style.setProperty('--wr', Math.ceil(Math.max(r.width, r.height) * 1.35) + 'px');
      host.appendChild(wave);
      sound('tone', 'impact');
      wave.addEventListener('animationend', function () { wave.remove(); });
      global.setTimeout(function () { if (wave.parentNode) wave.remove(); }, 1400);
    }, { passive: true });
  }

  /* ==========================================================
     5. Reactive particles
     ========================================================== */
  function initParticles() {
    var canvas = $('#particles');
    if (!canvas || dead()) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var coarse = global.matchMedia('(pointer: coarse)').matches;
    var COUNT = coarse ? 22 : 58;
    var wanted = COUNT;
    var DPR = Math.min(coarse ? 1 : 1.5, global.devicePixelRatio || 1);
    var w = 0, h = 0;
    var parts = [];
    var hotspots = [];
    var px = -9999, py = -9999;
    var ink = 'rgba(255,255,255,';
    var accent = 'rgba(34,211,238,';

    function size() {
      w = global.innerWidth;
      h = global.innerHeight;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seed() {
      parts = [];
      for (var i = 0; i < COUNT; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 4,
          r: 0.8 + Math.random() * 1.8,
          a: 0.16 + Math.random() * 0.3,
          hot: 0
        });
      }
    }

    /* Interactive elements pull a little extra density around them.
       The node list is collected once; only the rects are refreshed,
       and they are kept in document space so the frame loop never has
       to ask the layout engine anything. */
    var hotNodes = $$('.btn, .card, .map__media, .chip, .opt, .tmn__arrow, .faq__btn');
    Metrics.on(function () {
      hotspots = [];
      for (var i = 0; i < hotNodes.length; i++) {
        var r = Metrics.docTop(hotNodes[i]);
        if (!r.width) continue;
        hotspots.push({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,                    /* document space */
          r: Math.max(r.width, r.height) * 0.7 + 40
        });
      }
    });

    /* Colour follows the section under the middle of the viewport.
       The section ranges are cached in document space too, so picking
       one is a comparison rather than an elementFromPoint hit test
       (which would force layout on every frame it ran). */
    var sections = [];
    Metrics.on(function () {
      sections = $$('.sec, .proofband').map(function (el) {
        var r = Metrics.docTop(el);
        var cs = getComputedStyle(el);
        return {
          top: r.top,
          bottom: r.top + r.height,
          accent: toRgbaHead(cs.getPropertyValue('--sec-accent').trim())
        };
      });
    });

    function readColour(st) {
      var header = $('#header');
      var light = header && header.getAttribute('data-tone') === 'light';
      ink = light ? 'rgba(24,15,38,' : 'rgba(255,255,255,';
      var mid = st.y + h * 0.5;
      var found = null;
      for (var i = 0; i < sections.length; i++) {
        if (mid >= sections[i].top && mid < sections[i].bottom) { found = sections[i].accent; break; }
      }
      accent = found || (light ? 'rgba(124,58,237,' : 'rgba(34,211,238,');
    }

    function toRgbaHead(hex) {
      var m = String(hex).trim();
      if (!m) return null;
      if (m.charAt(0) !== '#') {
        var p = m.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        return p ? 'rgba(' + p[1] + ',' + p[2] + ',' + p[3] + ',' : null;
      }
      m = m.slice(1);
      if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
      if (m.length < 6) return null;
      return 'rgba(' + parseInt(m.slice(0, 2), 16) + ',' + parseInt(m.slice(2, 4), 16) + ',' + parseInt(m.slice(4, 6), 16) + ',';
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { px = py = -9999; });

    size();
    seed();
    global.addEventListener('resize', function () { size(); seed(); }, { passive: true });

    var visible = true;
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; });

    var colourTick = 0;
    Frame.add(function (st) {
      if (!visible) return;

      /* Follow the frame-rate guard: fewer motes, then none. */
      var lvl = Perf.level();
      var target = lvl === 0 ? wanted : (lvl === 1 ? Math.round(wanted * 0.45) : 0);
      if (target !== COUNT) {
        COUNT = target;
        if (parts.length > COUNT) parts.length = COUNT;
        else if (parts.length < COUNT) seed();
      }
      if (!COUNT) { ctx.clearRect(0, 0, w, h); return; }

      /* The accent only has to be right a few times a second. */
      if (--colourTick <= 0) { colourTick = 10; readColour(st); }
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];

        /* Cursor pushes them out of the way. */
        var dx = p.x - px, dy = p.y - py;
        var d2 = dx * dx + dy * dy;
        if (d2 < 19600) {
          var d = Math.sqrt(d2) || 1;
          var push = (1 - d / 140) * 220;
          p.vx += (dx / d) * push * st.dt;
          p.vy += (dy / d) * push * st.dt;
        }

        /* And interactive elements gather them in. */
        var near = 0;
        for (var j = 0; j < hotspots.length; j++) {
          var hs = hotspots[j];
          var hsy = hs.y - st.y;                     /* doc space -> viewport */
          if (hsy < -200 || hsy > h + 200) continue;
          var hx = hs.x - p.x, hy = hsy - p.y;
          var hd = Math.sqrt(hx * hx + hy * hy) || 1;
          if (hd < hs.r) {
            var g = (1 - hd / hs.r);
            p.vx += (hx / hd) * g * 16 * st.dt;
            p.vy += (hy / hd) * g * 16 * st.dt;
            near = Math.max(near, g);
          }
        }
        p.hot += (near - p.hot) * 0.1;

        /* Slow drift, plus a nudge from the page's own scrolling. */
        p.vy -= st.vel * 26 * st.dt;
        p.vx *= 0.965;
        p.vy *= 0.965;
        p.x += p.vx * st.dt * 60 * 0.5;
        p.y += p.vy * st.dt * 60 * 0.5;

        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

        var alpha = p.a * (0.55 + p.hot * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.hot * 0.7), 0, 6.2832);
        ctx.fillStyle = (p.hot > 0.25 ? accent : ink) + alpha.toFixed(3) + ')';
        ctx.fill();
      }
    });
  }

  /* ==========================================================
     6. Scroll orchestration
     ========================================================== */

  /* Every section arrives in planes: decor, then title, then the
     content, then the small print. */
  function initPlanes() {
    $$('.sec, .proofband').forEach(function (sec) {
      var fx = sec.querySelector('.sec__fx');
      if (fx) fx.setAttribute('data-plane', '0');
      var head = sec.querySelector('.sectionHead, .contact__inner, .quote');
      if (head) head.setAttribute('data-plane', '1');
      $$('.grid, .est, .tmn__wrap, .maps__stage, .versus, .steps, .faq__list, .pay, .proofband__inner', sec)
        .forEach(function (el) { el.setAttribute('data-plane', '2'); });
      $$('.note, .contact__note, .quote__note, .paymarks, .maps__hint, .est__note', sec)
        .forEach(function (el) { el.setAttribute('data-plane', '3'); });
    });
  }

  /* ---- multi-layer parallax on the portfolio ---------------- */
  function initParallax() {
    if (dead()) return;
    var layers = [];

    $$('.map').forEach(function (map) {
      var items = [
        { el: map.querySelector('.map__media img'), depth: 0.16 },
        { el: map.querySelector('.map__glow'), depth: -0.09 },
        { el: map.querySelector('.map__index'), depth: 0.3 },
        { el: map.querySelector('.map__body'), depth: 0.07 }
      ];
      items.forEach(function (it) {
        if (it.el) layers.push({ el: it.el, depth: it.depth, host: map, top: 0, h: 1, on: false });
      });
    });
    if (!layers.length) return;

    Metrics.on(function () {
      for (var i = 0; i < layers.length; i++) {
        var r = Metrics.docTop(layers[i].host);
        layers[i].top = r.top;                          /* document space */
        layers[i].h = r.height || 1;
      }
    });

    Frame.add(function (st) {
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        var top = l.top - st.y;                         /* viewport, no layout */
        var rel = (top + l.h / 2 - st.h / 2) / st.h;    /* -1 above, +1 below */
        if (rel < -1.6 || rel > 1.6) {
          if (l.on) { l.el.style.removeProperty('--py'); l.on = false; }
          continue;
        }
        l.on = true;
        l.el.style.setProperty('--py', (rel * l.depth * 100).toFixed(1) + 'px');
      }
    });
  }

  /* ---- marquee driven by scroll velocity -------------------- */
  function initMarqueeDrive() {
    var rows = $$('.marquee__row');
    if (!rows.length || dead()) return;

    var tracks = rows.map(function (row) {
      row.classList.add('is-driven');       /* CSS drops its own animation */
      return {
        row: row,
        dir: row.classList.contains('marquee__row--reverse') ? 1 : -1,
        x: 0,
        width: 1,
        marquee: row.closest('.marquee'),
        top: 0, h: 0,
        skew: 0
      };
    });

    Metrics.on(function () {
      tracks.forEach(function (t) {
        var seed = t.row.querySelector('[data-marquee]');
        t.width = seed ? seed.getBoundingClientRect().width : 1;
        if (t.marquee) {
          var r = Metrics.docTop(t.marquee);
          t.top = r.top;                                /* document space */
          t.h = r.height;
        }
      });
    });

    Frame.add(function (st) {
      var boost = Math.min(3.4, Math.abs(st.vel) * 2.6);
      for (var i = 0; i < tracks.length; i++) {
        var t = tracks[i];
        var top = t.top - st.y;                         /* viewport, no layout */
        if (!t.h || top > st.h + 60 || top + t.h < -60) continue;

        var speed = (54 + boost * 260) * st.dt * t.dir;
        t.x += speed;
        if (t.width > 0) {
          while (t.x <= -t.width) t.x += t.width;
          while (t.x > 0) t.x -= t.width;
        }
        /* A touch of shear in the direction of travel. */
        var target = clamp(st.vel * -5.5, -7, 7);
        t.skew += (target - t.skew) * 0.12;
        t.row.style.transform =
          'translate3d(' + t.x.toFixed(1) + 'px,0,0) skewX(' + t.skew.toFixed(2) + 'deg)';
      }
    });
  }

  /* ==========================================================
     7. Finishing touches
     ========================================================== */

  /* ---- cursor states --------------------------------------- */
  function initCursorStates() {
    var cursor = $('#cursor');
    if (!cursor || !fine() || dead()) return;

    var label = cursor.querySelector('.cursor__label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'cursor__label';
      cursor.appendChild(label);
    }

    var MAP = [
      { sel: '.map__media, .card[data-modal], .homebuilder__stage', state: 'view', key: 'cursor.view' },
      { sel: '.tmn__arrow, .maps__dot', state: 'arrow', key: null },
      { sel: 'input, textarea, select, .brief__out', state: 'text', key: null },
      { sel: 'a, button, [role="button"], .chip, .opt, summary', state: 'dot', key: null }
    ];

    function label_for(key) {
      var api = global.DIQ;
      return key && api && api.t ? api.t(key) : '';
    }

    var current = '';
    function setState(state, key) {
      if (state === current) return;
      current = state;
      cursor.setAttribute('data-state', state || 'default');
      label.textContent = state === 'view' ? label_for(key) : '';
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var t = e.target;
      if (!t || !t.closest) return;
      for (var i = 0; i < MAP.length; i++) {
        if (t.closest(MAP[i].sel)) { setState(MAP[i].state, MAP[i].key); return; }
      }
      setState('default', null);
    }, { passive: true });

    document.addEventListener('diq:lang', function () {
      if (current === 'view') label.textContent = label_for('cursor.view');
    });
  }

  /* ---- hero scroll indicator ------------------------------- */
  function initScrollHint() {
    var hint = $('#scrollHint');
    if (!hint) return;
    var gone = false;
    function hide() {
      if (gone) return;
      gone = true;
      hint.classList.add('is-gone');
    }
    global.addEventListener('scroll', function () {
      if ((global.pageYOffset || 0) > 40) hide();
    }, { passive: true });
    /* If nobody scrolls, it stays — that is the whole point of a hint. */
  }

  /* ---- progressive blur-up on images ----------------------- */
  function initBlurUp() {
    $$('img[loading], .map__media img, .homebuilder img').forEach(function (img) {
      if (img.dataset.blurup === '1') return;
      img.dataset.blurup = '1';
      var host = img.closest('.map__media') || img.parentElement;
      if (host) host.classList.add('lqip');

      function done() {
        img.classList.add('is-sharp');
        if (host) host.classList.remove('lqip');
      }
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  }

  /* ==========================================================
     Boot
     ========================================================== */
  function boot() {
    initHeroLetters();
    initTitleMasks();
    initRotator();
    initPlanes();
    initBlurUp();
    initScrollHint();
    initShockwave();

    /* Anything that runs a frame budget stays off under reduced
       motion or when the visitor picked "animations: off". */
    if (!dead()) {
      initTextMagnet();
      initMagnets();
      initSpecular();
      initParticles();
      initParallax();
      initMarqueeDrive();
      initCursorStates();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.DIQ_FX = { frame: Frame, metrics: Metrics, splitLetters: splitLetters, perf: Perf };
})(window);
