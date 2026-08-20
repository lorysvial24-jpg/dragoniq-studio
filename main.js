/* ============================================================
   DragonIQ.Studio — main.js
   Vanilla JS, no dependencies. Everything degrades gracefully.
   ============================================================ */
(function (global) {
  'use strict';

  var DISCORD = 'https://discord.gg/PPKyGfJTQ';

  /* Replace with the real Stripe payment link once it exists. */
  var STRIPE_LINK = 'https://buy.stripe.com/REMPLACER';

  /* ==========================================================
     TUNABLES — the three tables below are meant to be edited by
     hand. Nothing else in the codebase hardcodes these numbers.
     ========================================================== */

  /* Price estimator, in euros.
       base      starting price per map type
       size      multiplier applied to the base
       options   flat supplement per checked option
       rush      multiplier when the deadline is urgent
       spread    upper bound = lower bound x (1 + spread)        */
  var PRICING = {
    base: {
      '1v1': 30,
      boxfight: 40,
      tycoon: 60,
      rp: 60,
      zonewars: 60,
      other: 60
    },
    size: {
      small: 1,
      medium: 1.6,
      large: 2.4
    },
    options: {
      verse: 25,     /* custom Verse systems       */
      decor: 20,     /* detailed scenery           */
      multi: 30,     /* advanced multiplayer mode  */
      hud: 15,       /* custom HUD                 */
      shop: 20       /* in-game shop               */
    },
    rush: 1.35,
    spread: 0.35,
    currency: '€'
  };

  /* Animated counters in the social-proof band. Placeholders: set the
     real figures before going live. */
  var STATS = {
    maps: 12,
    clients: 10,
    years: 3
  };

  /* Header availability badge: 'open' or 'full'. */
  var AVAILABILITY = 'open';
  var I18N = window.DIQ_I18N;

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = function () { return mqReduce.matches; };
  var fine = function () { return mqFine.matches; };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* The loader paints before boot() runs; lock scrolling straight away
     so the page cannot be scrolled behind it in the meantime. */
  if (document.body && document.getElementById('loader')) {
    document.body.classList.add('is-loading');
  }

  /* ==========================================================
     1. i18n
     ========================================================== */
  var STORAGE_KEY = 'diq-lang';
  var currentLang = 'en';

  function supported(code) {
    for (var i = 0; i < I18N.LANGS.length; i++) {
      if (I18N.LANGS[i].code === code) return true;
    }
    return false;
  }

  function langMeta(code) {
    for (var i = 0; i < I18N.LANGS.length; i++) {
      if (I18N.LANGS[i].code === code) return I18N.LANGS[i];
    }
    return I18N.LANGS[1];
  }

  function detectLang() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    if (stored && supported(stored)) return stored;

    var candidates = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || ''];

    for (var i = 0; i < candidates.length; i++) {
      var base = String(candidates[i]).toLowerCase().split('-')[0];
      if (supported(base)) return base;
    }
    return I18N.fallback;
  }

  function t(key, lang) {
    var dict = I18N.translations[lang || currentLang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    var fb = I18N.translations[I18N.fallback] || {};
    return Object.prototype.hasOwnProperty.call(fb, key) ? fb[key] : key;
  }

  function applyLang(code, persist) {
    if (!supported(code)) code = I18N.fallback;
    currentLang = code;
    var meta = langMeta(code);

    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var value = t(key);
      if (attr) el.setAttribute(attr, value);
      else el.textContent = value;
    });

    document.documentElement.setAttribute('lang', code);

    /* Each page names its own metadata keys via <html data-meta="…">. */
    var mk = document.documentElement.getAttribute('data-meta') || 'meta';
    var titleKey = mk + '.title';
    var descKey = mk + '.description';
    var ogTitleKey = has(mk + '.ogTitle') ? mk + '.ogTitle' : titleKey;
    var ogDescKey = has(mk + '.ogDescription') ? mk + '.ogDescription' : descKey;

    document.title = t(titleKey);
    setMeta('name', 'description', t(descKey));
    setMeta('property', 'og:title', t(ogTitleKey));
    setMeta('property', 'og:description', t(ogDescKey));
    setMeta('property', 'og:locale', meta.locale);
    setMeta('name', 'twitter:title', t(ogTitleKey));
    setMeta('name', 'twitter:description', t(ogDescKey));

    var soundBtn = $('#soundToggle');
    if (soundBtn) soundBtn.setAttribute('aria-label', t(soundBtn.getAttribute('data-i18n') || 'a11y.soundOn'));

    var current = $('#langCurrent');
    if (current) current.textContent = meta.label;

    $$('.lang__option').forEach(function (opt) {
      opt.setAttribute('aria-selected', String(opt.dataset.lang === code));
    });
    var select = $('#footerLang');
    if (select) select.value = code;

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
    }

    renderMarquees();
    splitHeroTitle();
    if (modalState.open) renderModal(modalState.key);

    /* Anything rendered in JS (estimator readout, brief questions) listens
       for this instead of re-reading the DOM on a timer. */
    try {
      document.dispatchEvent(new CustomEvent('diq:lang', { detail: { lang: code } }));
    } catch (e) {
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('diq:lang', false, false, { lang: code });
      document.dispatchEvent(ev);
    }
  }

  function has(key) {
    var dict = I18N.translations[currentLang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return true;
    var fb = I18N.translations[I18N.fallback] || {};
    return Object.prototype.hasOwnProperty.call(fb, key);
  }

  function setMeta(attr, name, value) {
    var el = document.head.querySelector('meta[' + attr + '="' + name + '"]');
    if (el) el.setAttribute('content', value);
  }

  /* ---------------------------------------- Language dropdown */
  function initLangUI() {
    var wrap = $('#lang');
    var button = $('#langButton');
    var list = $('#langList');
    var select = $('#footerLang');
    if (!wrap || !button || !list) return;

    I18N.LANGS.forEach(function (lang, i) {
      var li = document.createElement('li');
      li.className = 'lang__option';
      li.id = 'lang-opt-' + lang.code;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.lang = lang.code;
      li.innerHTML = '<span>' + lang.name + '</span><span class="lang__code">' + lang.label + '</span>';
      li.addEventListener('click', function () {
        applyLang(lang.code, true);
        closeLang(true);
      });
      list.appendChild(li);

      if (select) {
        var opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        select.appendChild(opt);
      }
      void i;
    });

    if (select) {
      select.addEventListener('change', function () { applyLang(select.value, true); });
    }

    var options = $$('.lang__option', list);
    var activeIndex = 0;

    function setActive(index) {
      activeIndex = (index + options.length) % options.length;
      options.forEach(function (o, i) { o.classList.toggle('is-focused', i === activeIndex); });
      list.setAttribute('aria-activedescendant', options[activeIndex].id);
    }

    function openLang() {
      wrap.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      var idx = options.findIndex(function (o) { return o.dataset.lang === currentLang; });
      setActive(idx < 0 ? 0 : idx);
      list.focus();
    }

    function closeLang(focusButton) {
      wrap.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      list.removeAttribute('aria-activedescendant');
      options.forEach(function (o) { o.classList.remove('is-focused'); });
      if (focusButton) button.focus();
    }
    window.__closeLang = closeLang;

    button.addEventListener('click', function () {
      if (wrap.classList.contains('is-open')) closeLang(false);
      else openLang();
    });

    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLang();
      }
    });

    list.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); setActive(activeIndex + 1); break;
        case 'ArrowUp': e.preventDefault(); setActive(activeIndex - 1); break;
        case 'Home': e.preventDefault(); setActive(0); break;
        case 'End': e.preventDefault(); setActive(options.length - 1); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          applyLang(options[activeIndex].dataset.lang, true);
          closeLang(true);
          break;
        case 'Escape': e.preventDefault(); closeLang(true); break;
        case 'Tab': closeLang(false); break;
      }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && wrap.classList.contains('is-open')) closeLang(false);
    });
  }




  /* ==========================================================
     Hero — the title arrives word by word, and the colour
     clouds shift by different amounts so the backdrop reads
     as depth rather than one flat plane.
     ========================================================== */
  var heroPlayed = false;

  function splitHeroTitle() {
    var el = $('.hero__title');
    if (!el) return;
    var text = (el.textContent || '').trim();
    if (!text) return;

    var words = text.split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var mask = document.createElement('span');
      mask.className = 'word';
      var inner = document.createElement('span');
      inner.className = 'word__in';
      inner.textContent = w;
      inner.style.setProperty('--wd', (i * 85) + 'ms');
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });

    /* A language switch re-splits the title; if it has already played,
       show the new words straight away instead of replaying. */
    if (heroPlayed || reduced()) el.classList.add('is-in');
  }

  function playHeroTitle() {
    heroPlayed = true;
    var el = $('.hero__title');
    if (el) el.classList.add('is-in');
  }

  function initHeroDepth() {
    var hero = $('#hero');
    if (!hero || reduced()) return;

    var layers = $$('[data-depth]', hero).map(function (el) {
      return { el: el, depth: parseFloat(el.getAttribute('data-depth')) || .5 };
    });
    if (!layers.length) return;

    var pointerX = 0, pointerY = 0;   /* -0.5 .. 0.5 */
    var curX = 0, curY = 0;
    var scrollY = 0;
    var raf = null;

    function render() {
      raf = null;
      curX += (pointerX - curX) * .06;
      curY += (pointerY - curY) * .06;

      layers.forEach(function (l) {
        /* Nearer layers travel further: that difference is the depth cue. */
        var px = curX * 90 * l.depth;
        var py = curY * 70 * l.depth + scrollY * .18 * l.depth;
        l.el.style.setProperty('--px', px.toFixed(1) + 'px');
        l.el.style.setProperty('--py', py.toFixed(1) + 'px');
      });

      if (Math.abs(pointerX - curX) > .001 || Math.abs(pointerY - curY) > .001) {
        raf = window.requestAnimationFrame(render);
      }
    }

    function kick() { if (!raf) raf = window.requestAnimationFrame(render); }

    if (fine()) {
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        pointerX = e.clientX / window.innerWidth - .5;
        pointerY = e.clientY / window.innerHeight - .5;
        kick();
      }, { passive: true });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var top = hero.getBoundingClientRect().top;
        if (top > 0) { scrollY = 0; return; }
        scrollY = Math.min(-top, hero.offsetHeight);
        kick();
        render();
      });
    }, { passive: true });
  }

  function initHeroGlow() {
    var glow = $('#heroGlow');
    if (!glow || !fine() || reduced()) return;

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;
    var running = false;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!glow.classList.contains('is-on')) glow.classList.add('is-on');
      if (!running) { running = true; window.requestAnimationFrame(loop); }
    }, { passive: true });

    function loop() {
      cx += (tx - cx) * .08;
      cy += (ty - cy) * .08;
      glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > .5 || Math.abs(ty - cy) > .5) {
        window.requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }
  }

  /* ==========================================================
     Sound — every effect is synthesised with the Web Audio API,
     so there is nothing to download. Muted until the visitor
     turns it on, and it can never fire before a real gesture
     (browsers block audio started without one).
     ========================================================== */
  var Sound = (function () {
    var KEY = 'diq-sound';
    var enabled = false;
    var unlocked = false;
    var ctx = null;
    var master = null;
    var lastPop = 0;

    function available() {
      return !!(window.AudioContext || window.webkitAudioContext) && !reduced();
    }

    function ensure() {
      if (ctx || !available()) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = 0.13;
      master.connect(ctx.destination);
      return ctx;
    }

    /* Called from the first real gesture anywhere on the page. */
    function unlock() {
      if (unlocked || !available()) return;
      if (!ensure()) return;
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      unlocked = true;
    }

    function live() {
      return enabled && unlocked && available() && ctx && ctx.state === 'running';
    }

    function blip(o) {
      var t0 = ctx.currentTime + (o.delay || 0);
      var dur = o.dur || .12;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      gain.gain.setValueAtTime(.0001, t0);
      gain.gain.exponentialRampToValueAtTime(o.vol || .5, t0 + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + .03);
    }

    function breath(dur, from, to, vol) {
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

      var src = ctx.createBufferSource();
      src.buffer = buf;
      var band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = .8;
      var t0 = ctx.currentTime;
      band.frequency.setValueAtTime(from, t0);
      band.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      src.connect(band); band.connect(gain); gain.connect(master);
      src.start(t0);
      src.stop(t0 + dur + .03);
    }

    /* ---- one key for the whole page -------------------------
       Every sound is a degree of the same C major pentatonic, two
       octaves of it. Nothing can land on a note that clashes with
       whatever else happens to be ringing, so a fast run of hovers
       and clicks reads as an arpeggio rather than as beeping. */
    var ROOT = 261.63;                                  /* C4 */
    var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];  /* semitones */
    function note(degree) {
      var i = Math.max(0, Math.min(SCALE.length - 1, degree | 0));
      return ROOT * Math.pow(2, SCALE[i] / 12);
    }

    /* Hovers walk up the scale and settle back down, so sweeping a
       grid of cards plays a phrase instead of the same pip. */
    var hoverStep = 0;
    var hoverRest = 0;

    var TONES = {
      hover:  { deg: 5, dur: .075, vol: .15, type: 'sine' },
      tap:    { deg: 3, dur: .1,   vol: .24, type: 'triangle' },
      impact: { deg: 0, dur: .16,  vol: .16, type: 'sine' },
      lift:   { deg: 7, dur: .2,   vol: .13, type: 'sine' },
      done:   { deg: 9, dur: .26,  vol: .15, type: 'sine' }
    };

    var api = {
      /* Named notes for anything outside this file (fx.js uses them). */
      tone: function (name) {
        if (!live()) return;
        var spec = TONES[name] || TONES.tap;
        blip({ freq: note(spec.deg), dur: spec.dur, vol: spec.vol, type: spec.type });
      },
      pop: function () {
        if (!live()) return;
        var now = Date.now();
        if (now - lastPop < 70) return;      /* hovering a grid must not machine-gun */
        if (now - lastPop > 900) hoverStep = 0;
        lastPop = now;
        window.clearTimeout(hoverRest);
        hoverRest = window.setTimeout(function () { hoverStep = 0; }, 1100);
        var deg = 4 + (hoverStep % 4);
        hoverStep++;
        blip({ freq: note(deg), to: note(deg + 2), dur: .075, vol: .15, type: 'sine' });
      },
      click: function () {
        if (!live()) return;
        /* Root plus its fifth: a small, closed sound that never sours
           whatever hover note is still decaying. */
        blip({ freq: note(3), to: note(0), dur: .09, vol: .26, type: 'triangle' });
        blip({ freq: note(8), dur: .06, vol: .1, type: 'sine', delay: .012 });
      },
      whoosh: function (up) {
        if (!live()) return;
        if (up) breath(.26, note(2), note(10) * 2, .15);
        else breath(.22, note(10) * 2, note(1), .13);
      },
      chord: function () {
        if (!live()) return;
        [0, 2, 4, 7].forEach(function (deg, i) {
          blip({ freq: note(deg + 5), dur: .5, vol: .07, type: 'sine', delay: i * .05 });
        });
      },
      isOn: function () { return enabled; },
      unlock: unlock,
      set: function (on, announce) {
        enabled = !!on && available();
        try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
        var btn = $('#soundToggle');
        if (btn) {
          btn.setAttribute('aria-pressed', String(enabled));
          btn.setAttribute('aria-label', t(enabled ? 'a11y.soundOff' : 'a11y.soundOn'));
          btn.setAttribute('data-i18n', enabled ? 'a11y.soundOff' : 'a11y.soundOn');
        }
        if (enabled && announce) { unlock(); api.click(); }
      },
      restore: function () {
        var stored = null;
        try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
        api.set(stored === 'on', false);
      }
    };
    return api;
  })(window);

  function initSound() {
    var btn = $('#soundToggle');
    if (!btn) return;

    /* Hide the control entirely when the platform cannot play anything. */
    if (!(window.AudioContext || window.webkitAudioContext) || reduced()) {
      btn.hidden = true;
      return;
    }

    Sound.restore();
    btn.addEventListener('click', function () { Sound.set(!Sound.isOn(), true); });

    /* Browsers refuse audio started outside a gesture: arm on the first one. */
    var arm = function () { Sound.unlock(); };
    document.addEventListener('pointerdown', arm, { once: true });
    document.addEventListener('keydown', arm, { once: true });

    var HOVER = '.btn, .card, .map__media, .faq__btn, .maps__dot, .discord, .nav__link, .lang__option, .step';
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.target.closest && e.target.closest(HOVER)) Sound.pop();
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest(HOVER + ', .sound, .lang__button, .burger')) {
        Sound.click();
        buzz();
      }
    });
  }

  /* A single very short tick on touch, and only when the visitor has
     already opted into feedback by turning the sound on. */
  function buzz() {
    if (reduced() || fine() || !Sound.isOn()) return;
    if (navigator.vibrate) { try { navigator.vibrate(7); } catch (e) { /* denied */ } }
  }

  /* ==========================================================
     Loader — the percentage tracks real image decoding, not a
     timer. It eases toward the true figure but never past it.
     ========================================================== */
  function initLoader(done) {
    var loader = $('#loader');
    if (!loader) { done(); return; }

    var pctEl = $('#loaderPct');
    var barEl = $('#loaderBar');
    var ringEl = $('#loaderRing');
    var CIRC = 2 * Math.PI * 54;
    document.body.classList.add('is-loading');

    var urls = [];
    $$('img').forEach(function (im) {
      var u = im.getAttribute('src');
      if (u && urls.indexOf(u) === -1) urls.push(u);
    });

    var total = urls.length + 1;   /* + the webfonts */
    var loaded = 0;
    var shown = 0;
    var settled = false;
    var raf = null;

    function bump() { loaded++; }

    /* A detached Image() loads even when the markup says loading="lazy". */
    urls.forEach(function (u) {
      var im = new Image();
      im.onload = im.onerror = bump;
      im.src = u;
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bump, bump);
    else bump();

    /* Safety net: never trap the visitor behind a stalled request. */
    var giveUp = window.setTimeout(function () { loaded = total; }, 8000);

    function paint(v) {
      var r = Math.round(v);
      if (pctEl) pctEl.textContent = String(r);
      loader.setAttribute('aria-valuenow', String(r));
      if (barEl) barEl.style.transform = 'scaleX(' + (v / 100).toFixed(4) + ')';
      if (ringEl) ringEl.style.strokeDashoffset = String(CIRC * (1 - v / 100));
    }

    function finish() {
      if (settled) return;
      settled = true;
      window.clearTimeout(giveUp);
      paint(100);
      window.setTimeout(function () {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        done();
        window.setTimeout(function () { loader.hidden = true; }, 1100);
      }, 320);
    }

    /* Ease toward the real figure on a wall-clock curve rather than a
       per-frame one: on a device running at 10fps a per-frame factor
       would stretch the same catch-up over several seconds. */
    var last = (window.performance && performance.now) ? performance.now() : Date.now();

    function tick(now) {
      var t = now || ((window.performance && performance.now) ? performance.now() : Date.now());
      var dt = Math.min(.25, Math.max(0, (t - last) / 1000));
      last = t;

      var real = (loaded / total) * 100;
      shown += (real - shown) * (1 - Math.pow(.006, dt));
      if (real - shown < .5) shown = real;
      paint(shown);
      if (loaded >= total && shown >= 99.5) { finish(); return; }
      raf = window.requestAnimationFrame(tick);
    }

    paint(0);
    raf = window.requestAnimationFrame(tick);
  }

  /* ==========================================================
     Portfolio — one map per screen, the section repaints itself
     in that map's colour, with side dots to jump between them.
     ========================================================== */
  function initMaps() {
    var section = $('#portfolio');
    var track = $('.maps__track');
    var slides = $$('.map');
    var dots = $$('.maps__dot');
    var dotsNav = $('#mapsDots');
    var hint = $('#mapsHint');
    if (!section || !slides.length) return;

    function activate(slide) {
      var tone = slide.getAttribute('data-tone') || '1';
      if (!section.classList.contains('tone-' + tone)) {
        section.classList.remove('tone-1', 'tone-2');
        section.classList.add('tone-' + tone);
      }
      dots.forEach(function (d) {
        var on = d.getAttribute('data-goto') === slide.id;
        d.classList.toggle('is-active', on);
        if (on) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      slides.forEach(function (s) { io.observe(s); });

      if (dotsNav && track) {
        var vis = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { dotsNav.classList.toggle('is-visible', e.isIntersecting); });
        }, { rootMargin: '-10% 0px -10% 0px', threshold: 0 });
        vis.observe(track);
      }

      if (hint) {
        var hi = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) hint.classList.add('is-gone'); });
        }, { threshold: .25 });
        hi.observe(slides[0]);
      }
    } else if (dotsNav) {
      dotsNav.classList.add('is-visible');
    }

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        var el = document.getElementById(d.getAttribute('data-goto'));
        if (!el) return;
        var top = el.getBoundingClientRect().top + window.pageYOffset + 4;
        window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
      });
    });
  }

  /* ==========================================================
     FAQ accordion
     ========================================================== */
  function initFaq() {
    $$('.faq__btn').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var item = btn.closest('.faq__item');
      if (!panel) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
        if (item) item.classList.toggle('is-open', !open);
      });
    });
  }

  /* ==========================================================
     Marquee bands — text comes from i18n, duplicated so the
     -50% translate loops seamlessly at any viewport width.
     ========================================================== */
  function renderMarquees() {
    $$('.marquee__row').forEach(function (row) {
      var tracks = $$('[data-marquee]', row);
      if (!tracks.length) return;
      for (var i = tracks.length - 1; i > 0; i--) tracks[i].remove();

      var seed = tracks[0];
      var unit = t('marquee.text');

      /* Measure one repetition, then repeat just enough to overflow the
         viewport — a track much wider than that is wasted paint work. */
      seed.textContent = unit;
      var unitWidth = seed.getBoundingClientRect().width || 400;
      var reps = Math.max(2, Math.ceil(window.innerWidth / unitWidth) + 1);
      var text = '';
      for (var j = 0; j < reps; j++) text += unit;
      seed.textContent = text;

      var clone = seed.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
    });
  }

  /* ==========================================================
     Header tone — the header floats over sections of very
     different lightness, so it flips its own ink to keep
     contrast wherever it happens to be.
     ========================================================== */
  var toneBlocks = [];

  function collectToneBlocks() {
    toneBlocks = $$('.sec, .marquee, .footer').map(function (el) {
      var light = el.classList.contains('sec--cream') ||
                  el.classList.contains('sec--orange') ||
                  el.classList.contains('marquee--cyan');
      return { el: el, tone: light ? 'light' : 'dark' };
    });
  }

  function updateHeaderTone(header) {
    if (!header || !toneBlocks.length) return;
    var probe = header.offsetHeight * 0.55;
    for (var i = 0; i < toneBlocks.length; i++) {
      var r = toneBlocks[i].el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        if (header.dataset.tone !== toneBlocks[i].tone) header.dataset.tone = toneBlocks[i].tone;
        return;
      }
    }
  }

  /* ==========================================================
     2. Header, progress bar, active section
     ========================================================== */
  function initScrollChrome() {
    var header = $('#header');
    var bar = $('#progressBar');
    var ticking = false;

    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (header) {
        header.classList.toggle('is-scrolled', y > 12);
        updateHeaderTone(header);
      }

      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    update();

    /* Active nav link */
    var links = $$('.nav__link[href^="#"]');
    var sections = links
      .map(function (link) { return document.querySelector(link.getAttribute('href')); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var lastSection = null;
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
          if (lastSection && lastSection !== entry.target.id) Sound.chord();
          lastSection = entry.target.id;
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ==========================================================
     3. Scroll reveals + counters
     ========================================================== */
  function initReveals() {
    var items = $$('[data-reveal]');
    items.forEach(function (el) {
      var d = el.getAttribute('data-reveal-delay');
      if (d) el.style.setProperty('--d', d);
    });

    if (reduced() || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
        $$('[data-count]', entry.target).forEach(countUp);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .12 });

    items.forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    if (el.dataset.done === '1') return;
    el.dataset.done = '1';
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduced()) { el.textContent = String(target); return; }

    var duration = 1650;
    var start = null;

    /* Elastic-out: overshoots the target and springs back onto it,
       so the figure lands rather than glides to a stop. */
    function elastic(p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      return Math.pow(2, -10.5 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    }

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var v = Math.round(target * elastic(p));
      /* The overshoot must stay a number the visitor can read. */
      el.textContent = String(Math.max(0, v));
      if (p < 1) window.requestAnimationFrame(frame);
      else el.textContent = String(target);
    }
    el.textContent = '0';
    window.requestAnimationFrame(frame);
  }

  /* ==========================================================
     4. Tilt 3D + pointer glow
     ========================================================== */
  function initTilt() {
    /* fx.js does tilt and specular in one pass; two handlers writing
       --rx on the same card would fight. */
    if (global.DIQ_FX) return;
    if (!fine() || reduced()) return;
    var MAX = 5.5;  /* x2 below -> 11deg of tilt from edge to edge */

    $$('.tilt').forEach(function (card) {
      var frame = null;
      var rect = null;

      function onMove(e) {
        if (!rect) rect = card.getBoundingClientRect();
        var box = rect;
        var x = e.clientX - box.left;
        var y = e.clientY - box.top;
        if (frame) return;
        frame = window.requestAnimationFrame(function () {
          frame = null;
          var px = x / box.width - .5;
          var py = y / box.height - .5;
          card.style.setProperty('--ry', (px * MAX * 2).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-py * MAX * 2).toFixed(2) + 'deg');
          card.style.setProperty('--gx', x.toFixed(1) + 'px');
          card.style.setProperty('--gy', y.toFixed(1) + 'px');
        });
      }

      card.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', function () {
        if (frame) { window.cancelAnimationFrame(frame); frame = null; }
        rect = null;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }


  /* ==========================================================
     5. Custom cursor
     ========================================================== */
  function initCursor() {
    var cursor = $('#cursor');
    if (!cursor || !fine() || reduced()) return;

    var dot = $('.cursor__dot', cursor);
    var ring = $('.cursor__ring', cursor);
    var mx = -100, my = -100, rx = -100, ry = -100;
    var raf = null;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      cursor.classList.add('is-active');
      if (!raf) raf = window.requestAnimationFrame(loop);
    }, { passive: true });

    document.addEventListener('pointerdown', function () { cursor.classList.add('is-press'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-press'); });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-active'); });

    function loop() {
      raf = null;
      rx += (mx - rx) * .18;
      ry += (my - ry) * .18;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0) translate(-50%,-50%)';
      if (Math.abs(mx - rx) > .1 || Math.abs(my - ry) > .1) raf = window.requestAnimationFrame(loop);
    }

    var interactive = 'a, button, [role="button"], select, summary, input, textarea';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(interactive)) cursor.classList.add('is-hover');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(interactive)) cursor.classList.remove('is-hover');
    });
  }

  /* ==========================================================
     6. Ripple
     ========================================================== */
  function spawnRipple(el, clientX, clientY) {
    if (reduced()) return;
    var rect = el.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var size = Math.max(rect.width, rect.height) * 2.4;

    var span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = x + 'px';
    span.style.top = y + 'px';
    el.appendChild(span);
    span.addEventListener('animationend', function () { span.remove(); });
  }

  function initRipples() {
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest && e.target.closest('.btn, .card, .map__media, .discord, .faq__btn');
      if (!el) return;
      spawnRipple(el, e.clientX, e.clientY);
    });
  }

  /* ==========================================================
     7. Modal (FLIP from the card)
     ========================================================== */
  var MODALS = {
    s1: { kicker: 'services.kicker', title: 'services.s1.title', desc: 'services.s1.long', list: ['services.s1.f1', 'services.s1.f2', 'services.s1.f3'] },
    s2: { kicker: 'services.kicker', title: 'services.s2.title', desc: 'services.s2.long', list: ['services.s2.f1', 'services.s2.f2', 'services.s2.f3'] },
    s3: { kicker: 'services.kicker', title: 'services.s3.title', desc: 'services.s3.long', list: ['services.s3.f1', 'services.s3.f2', 'services.s3.f3'] },
    s4: { kicker: 'services.kicker', title: 'services.s4.title', desc: 'services.s4.long', list: ['services.s4.f1', 'services.s4.f2', 'services.s4.f3'] },
    s5: { kicker: 'services.kicker', title: 'services.s5.title', desc: 'services.s5.long', list: ['services.s5.f1', 'services.s5.f2', 'services.s5.f3'] },
    p1: {
      kicker: 'portfolio.p1.tag', title: 'portfolio.p1.title', desc: 'portfolio.p1.long',
      list: ['portfolio.p1.f1', 'portfolio.p1.f2', 'portfolio.p1.f3'],
      media: 'assets/map-1v1.png',
      actions: [
        { key: 'common.playCta', href: 'https://fortnite.gg/island/1445-1331-8129', variant: 'solid' },
        { key: 'common.orderCta', href: DISCORD, variant: 'outline' }
      ]
    },
    help: {
      kicker: 'builder.help', title: 'builder.help.title', desc: 'builder.help.intro',
      list: ['builder.help.k1', 'builder.help.k2', 'builder.help.k3', 'builder.help.k4',
             'builder.help.k5', 'builder.help.k6', 'builder.help.k7', 'builder.help.k8',
             'builder.help.k9'],
      actions: []
    },
    p2: {
      kicker: 'portfolio.p2.tag', title: 'portfolio.p2.title', desc: 'portfolio.p2.long',
      list: ['portfolio.p2.f1', 'portfolio.p2.f2', 'portfolio.p2.f3', 'portfolio.p2.f4'],
      media: 'assets/map-redblue.png',
      actions: [
        { key: 'common.playCta', href: 'https://fortnite.gg/island/7410-8193-7803', variant: 'solid' },
        { key: 'common.orderCta', href: DISCORD, variant: 'outline' }
      ]
    }
  };

  var modalState = { open: false, key: null, origin: null, lastFocus: null };

  function renderModal(key) {
    var data = MODALS[key];
    if (!data) return;

    $('#modalKicker').textContent = t(data.kicker);
    $('#modalTitle').textContent = t(data.title);
    $('#modalDesc').textContent = t(data.desc);

    var list = $('#modalList');
    list.innerHTML = '';
    (data.list || []).forEach(function (k) {
      var li = document.createElement('li');
      li.textContent = t(k);
      list.appendChild(li);
    });
    list.hidden = !(data.list && data.list.length);

    var media = $('#modalMedia');
    if (data.media) {
      media.hidden = false;
      media.style.setProperty('--thumb', "url('" + data.media + "')");
    } else {
      media.hidden = true;
    }

    var actions = $('#modalActions');
    actions.innerHTML = '';
    var list2 = data.actions || [{ key: 'common.orderCta', href: DISCORD, variant: 'solid' }];
    list2.forEach(function (a) {
      var link = document.createElement('a');
      link.className = 'btn btn--' + a.variant;
      link.href = a.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = t(a.key);
      actions.appendChild(link);
    });
  }

  function initModal() {
    var modal = $('#modal');
    var panel = $('#modalPanel');
    if (!modal || !panel) return;

    function openModal(key, originEl) {
      if (!MODALS[key]) return;
      modalState.key = key;
      modalState.origin = originEl;
      modalState.lastFocus = document.activeElement;

      renderModal(key);
      modal.hidden = false;
      document.body.classList.add('is-locked');

      // FLIP: animate the panel out of the card it came from.
      if (!reduced() && originEl) {
        var from = originEl.getBoundingClientRect();
        panel.style.transition = 'none';
        panel.style.opacity = '0';
        var to = panel.getBoundingClientRect();
        var sx = Math.max(.2, from.width / to.width);
        var sy = Math.max(.2, from.height / to.height);
        panel.style.transform =
          'translate3d(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px,0) scale(' + sx + ',' + sy + ')';

        window.requestAnimationFrame(function () {
          panel.style.transition = 'transform .62s cubic-bezier(.16,1,.3,1), opacity .34s cubic-bezier(.22,.61,.36,1)';
          panel.style.transform = 'none';
          panel.style.opacity = '1';
        });
      } else {
        panel.style.transition = 'none';
        panel.style.transform = 'none';
        panel.style.opacity = '1';
      }

      window.requestAnimationFrame(function () { modal.classList.add('is-open'); });
      Sound.whoosh(true);
      modalState.open = true;
      panel.focus({ preventScroll: true });
    }

    function closeModal() {
      if (!modalState.open) return;
      modalState.open = false;
      modal.classList.remove('is-open');
      Sound.whoosh(false);

      var origin = modalState.origin;
      var done = function () {
        modal.hidden = true;
        panel.style.transition = 'none';
        panel.style.transform = 'none';
        panel.style.opacity = '1';
        document.body.classList.remove('is-locked');
        if (modalState.lastFocus && modalState.lastFocus.focus) {
          modalState.lastFocus.focus({ preventScroll: true });
        }
      };

      if (!reduced() && origin) {
        var to = panel.getBoundingClientRect();
        var from = origin.getBoundingClientRect();
        var sx = Math.max(.2, from.width / to.width);
        var sy = Math.max(.2, from.height / to.height);
        panel.style.transition = 'transform .45s cubic-bezier(.65,.05,.36,1), opacity .3s ease-out .12s';
        panel.style.transform =
          'translate3d(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px,0) scale(' + sx + ',' + sy + ')';
        panel.style.opacity = '0';
        window.setTimeout(done, 450);
      } else {
        done();
      }
    }

    /* Triggers */
    $$('[data-modal]').forEach(function (card) {
      /* A detail button sits next to the image it describes: fly the panel
         out of that image rather than out of the small button. */
      var slide = card.closest('.map');
      var origin = slide ? slide.querySelector('.map__media') : card;

      card.addEventListener('click', function () {
        openModal(card.getAttribute('data-modal'), origin);
      });

      /* Buttons already turn Enter/Space into a click; binding keydown on
         them as well would open the modal twice. */
      if (card.tagName === 'BUTTON') return;
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var r = card.getBoundingClientRect();
          spawnRipple(card, r.left + r.width / 2, r.top + r.height / 2);
          openModal(card.getAttribute('data-modal'), origin);
        }
      });
    });

    $$('[data-modal-close]', modal).forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    /* Escape + focus trap */
    document.addEventListener('keydown', function (e) {
      if (!modalState.open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;

      var focusables = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (modalState.open) {
        panel.style.transition = 'none';
        panel.style.transform = 'none';
      }
    });
  }


  /* ==========================================================
     Small touches: back to top, copyable island codes, image
     skeletons, page transition, konami easter egg.
     ========================================================== */
  function initBackToTop() {
    var btn = $('#toTop');
    if (!btn) return;
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        btn.classList.toggle('is-on', (window.pageYOffset || 0) > window.innerHeight * .9);
      });
    }, { passive: true });
  }

  function initCopyCodes() {
    $$('[data-copy]').forEach(function (btn) {
      var code = btn.getAttribute('data-copy');
      var labelEl = btn.querySelector('.copycode__text');
      var original = labelEl ? labelEl.textContent : code;
      var timer = null;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var done = function () {
          btn.classList.add('is-copied');
          if (labelEl) labelEl.textContent = t('common.copied');
          Sound.click();
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            btn.classList.remove('is-copied');
            if (labelEl) labelEl.textContent = original;
          }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done, function () { legacyCopy(code, done); });
        } else {
          legacyCopy(code, done);
        }
      });
    });
  }

  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* nothing else to try */ }
    document.body.removeChild(ta);
  }

  function initImageSkeletons() {
    $$('.map__media').forEach(function (holder) {
      var img = holder.querySelector('img');
      if (!img) return;
      var reveal = function () {
        img.classList.add('is-loaded');
        holder.classList.remove('is-skeleton');
      };
      holder.classList.add('is-skeleton');
      if (img.complete && img.naturalWidth) reveal();
      else {
        img.addEventListener('load', reveal);
        img.addEventListener('error', reveal);
      }
    });
  }

  /* The page folds away like a card being turned, and the next one
     unfolds behind it. Where the View Transitions API exists the
     browser does the cross-fade of the two snapshots for us; where it
     does not, the same fold is played on a veil before navigating. */
  function initPageTransition() {
    var fade = $('#pageFade');
    if (!fade) return;

    /* Cross-document View Transitions are what this effect actually
       needs: the browser keeps a snapshot of the page you are leaving
       and of the one you arrive on, and animates between them across
       the navigation. The CSS @view-transition rule opts in; nothing
       here has to intercept the click at all.

       document.startViewTransition only does same-document updates —
       using it here would fold the page away and unfold the very same
       page, then navigate. pagereveal exists exactly when the
       cross-document version does, so that is the feature to detect. */
    var hasVT = 'onpagereveal' in window;
    document.documentElement.classList.toggle('has-vt', hasVT);

    /* An entry fold on arrival, for the browsers doing it by hand. */
    if (!reduced() && !hasVT) {
      var came = false;
      try { came = sessionStorage.getItem('diq-turn') === '1'; } catch (e) { /* private mode */ }
      if (came) {
        document.documentElement.classList.add('is-unfolding');
        window.setTimeout(function () {
          document.documentElement.classList.remove('is-unfolding');
        }, 760);
      }
      try { sessionStorage.removeItem('diq-turn'); } catch (e) { /* ignore */ }
    }

    $$('a[href$=".html"], a[href="index.html"]').forEach(function (link) {
      if (link.target === '_blank' || link.hasAttribute('download')) return;
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;
        if (reduced()) return;                     /* let the browser navigate plainly */

        /* The browser is already animating this one. */
        if (hasVT) { Sound.whoosh(true); return; }

        e.preventDefault();
        Sound.whoosh(true);
        try { sessionStorage.setItem('diq-turn', '1'); } catch (err) { /* ignore */ }
        document.documentElement.classList.add('is-folding');
        fade.classList.add('is-on');
        window.setTimeout(function () { window.location.href = href; }, 460);
      });
    });

    /* Coming back via the bfcache must not leave the veil or the fold up. */
    window.addEventListener('pageshow', function () {
      fade.classList.remove('is-on');
      document.documentElement.classList.remove('is-folding');
    });
  }

  function initKonami() {
    var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
               'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;

    document.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === SEQ[pos]) {
        pos++;
        if (pos === SEQ.length) { pos = 0; party(); }
      } else {
        pos = (k === SEQ[0]) ? 1 : 0;
      }
    });

    function party() {
      var host = $('#konami');
      if (!host || host.classList.contains('is-on')) return;
      var note = host.querySelector('.konami__note');
      if (note) note.textContent = t('konami.msg');
      host.classList.add('is-on');
      Sound.chord();

      if (!reduced()) {
        var colours = ['#7C3AED', '#22D3EE', '#E0117A', '#FF7A00', '#FFD166'];
        for (var i = 0; i < 44; i++) spark(host, colours[i % colours.length], i);
      }
      window.setTimeout(function () {
        host.classList.remove('is-on');
        while (host.children.length > 1) host.removeChild(host.lastChild);
      }, 3200);
    }

    function spark(host, colour, i) {
      var el = document.createElement('span');
      el.className = 'konami__spark';
      el.style.background = colour;
      el.style.left = (8 + Math.random() * 84) + 'vw';
      el.style.top = '-30px';
      el.style.opacity = '0';
      host.appendChild(el);

      var drift = (Math.random() - .5) * 260;
      var spin = (Math.random() - .5) * 720;
      var dur = 1800 + Math.random() * 1400;
      var delay = i * 26;

      if (el.animate) {
        el.animate([
          { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate3d(' + drift + 'px,' + (window.innerHeight + 80) + 'px,0) rotate(' + spin + 'deg)', opacity: 0 }
        ], { duration: dur, delay: delay, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' });
      } else {
        el.style.opacity = '1';
      }
    }
  }


  /* ==========================================================
     Availability badge
     ========================================================== */
  function initAvailability() {
    var badge = $('#availability');
    if (!badge) return;
    var open = AVAILABILITY !== 'full';
    badge.setAttribute('data-state', open ? 'open' : 'full');
    var label = badge.querySelector('.avail__text');
    if (label) {
      label.setAttribute('data-i18n', open ? 'avail.open' : 'avail.full');
      label.textContent = t(open ? 'avail.open' : 'avail.full');
    }
  }

  /* Social-proof counters read their target from STATS. */
  function initProofCounters() {
    $$('[data-stat]').forEach(function (el) {
      var key = el.getAttribute('data-stat');
      if (STATS[key] == null) return;
      el.setAttribute('data-count', String(STATS[key]));
      el.textContent = reduced() ? String(STATS[key]) : '0';
    });
  }

  /* ==========================================================
     8. Mobile navigation
     ========================================================== */
  function initNav() {
    var burger = $('#burger');
    var nav = $('#nav');
    if (!burger || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    }

    burger.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    $$('.nav__link', nav).forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        burger.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) setOpen(false);
    });

    /* Smooth anchor scrolling with header offset (fallback when
       CSS scroll-behavior is unavailable). */
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 88;
        window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  }

  /* ==========================================================
     Boot
     ========================================================== */
  function wireStripeLinks() {
    $$('[data-stripe]').forEach(function (el) { el.setAttribute('href', STRIPE_LINK); });
  }

  function boot() {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    initLangUI();
    collectToneBlocks();
    initAvailability();
    applyLang(detectLang(), false);
    initSound();

    initScrollChrome();
    initTilt();
    initHeroGlow();
    initHeroDepth();
    initCursor();
    initRipples();
    initModal();
    initNav();
    initMaps();
    initFaq();
    initBackToTop();
    initCopyCodes();
    initImageSkeletons();
    initPageTransition();
    initKonami();
    wireStripeLinks();
    initProofCounters();

    /* Reveals wait for the loader so the hero actually animates in
       behind the sweep instead of having played out of sight. */
    initLoader(function () {
      initReveals();
      playHeroTitle();
    });

    /* Webfonts change the marquee's natural width, so size it again
       once they are in — otherwise the track is measured against the
       fallback face and ends up far longer than it needs to be. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(renderMarquees);
    }

    /* SMIL blob morphing cannot be stopped from CSS */
    if (reduced()) $$('svg.morph').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        collectToneBlocks();
        renderMarquees();
      }, 180);
    });
  }

  /* Surface just enough for theme.js to drive the sound setting. */
  global.DIQ = global.DIQ || {};
  global.DIQ.setSound = function (on) { Sound.set(on, !!on); };
  global.DIQ.getSound = function () { return Sound.isOn(); };
  global.DIQ.t = t;
  global.DIQ.STRIPE_LINK = STRIPE_LINK;
  global.DIQ.DISCORD = DISCORD;
  global.DIQ.PRICING = PRICING;
  global.DIQ.STATS = STATS;
  global.DIQ.AVAILABILITY = AVAILABILITY;
  global.DIQ.reduced = reduced;
  global.DIQ.countUp = countUp;
  global.DIQ.whoosh = function (up) { Sound.whoosh(!!up); };
  global.DIQ.tone = function (name) { Sound.tone(name); };
  global.DIQ.buzz = buzz;
  global.DIQ.copy = function (text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
