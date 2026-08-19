/* ============================================================
   DragonIQ.Studio — main.js
   Vanilla JS, no dependencies. Everything degrades gracefully.
   ============================================================ */
(function () {
  'use strict';

  var DISCORD = 'https://discord.gg/PPKyGfJTQ';
  var I18N = window.DIQ_I18N;

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = function () { return mqReduce.matches; };
  var fine = function () { return mqFine.matches; };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

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
    document.title = t('meta.title');

    setMeta('name', 'description', t('meta.description'));
    setMeta('property', 'og:title', t('meta.ogTitle'));
    setMeta('property', 'og:description', t('meta.ogDescription'));
    setMeta('property', 'og:locale', meta.locale);
    setMeta('name', 'twitter:title', t('meta.ogTitle'));
    setMeta('name', 'twitter:description', t('meta.ogDescription'));

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
    if (modalState.open) renderModal(modalState.key);
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
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
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

    var duration = 1500;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(frame);
    }
    el.textContent = '0';
    window.requestAnimationFrame(frame);
  }

  /* ==========================================================
     4. Tilt 3D + pointer glow
     ========================================================== */
  function initTilt() {
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

  function initBackgroundGlow() {
    var glow = $('#bgGlow');
    if (!glow || !fine() || reduced()) return;

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;
    var running = false;

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!glow.classList.contains('is-on')) glow.classList.add('is-on');
      if (!running) { running = true; window.requestAnimationFrame(loop); }
    }, { passive: true });

    function loop() {
      cx += (tx - cx) * .07;
      cy += (ty - cy) * .07;
      glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > .5 || Math.abs(ty - cy) > .5) {
        window.requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }
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
      var el = e.target.closest && e.target.closest('.btn, .card, .work, .discord');
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
      modalState.open = true;
      panel.focus({ preventScroll: true });
    }

    function closeModal() {
      if (!modalState.open) return;
      modalState.open = false;
      modal.classList.remove('is-open');

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
      card.addEventListener('click', function () {
        openModal(card.getAttribute('data-modal'), card);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var r = card.getBoundingClientRect();
          spawnRipple(card, r.left + r.width / 2, r.top + r.height / 2);
          openModal(card.getAttribute('data-modal'), card);
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
  function boot() {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    initLangUI();
    collectToneBlocks();
    applyLang(detectLang(), false);

    initScrollChrome();
    initReveals();
    initTilt();
    initBackgroundGlow();
    initCursor();
    initRipples();
    initModal();
    initNav();

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
