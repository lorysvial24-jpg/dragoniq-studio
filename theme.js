/* ============================================================
   DragonIQ.Studio — theme.js
   Visitor-side theme customiser.

   Every colour on the site is declared as --sec-*: var(--u-…, default).
   This panel only ever writes --u-* on :root, so it never fights the
   stylesheet on specificity and a visitor who touches nothing keeps
   the original design. Everything is stored per device.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'diq-theme';

  /* Section palettes exposed to the visitor, in page order. The defaults
     here must mirror styles.css; they are what "Reset" returns to and what
     seeds each colour input. */
  var SECTIONS = [
    { id: 'hero',     label: 'theme.sec.hero',
      bg: '#1B0140', ink: '#FFFFFF', 'ink-soft': '#DCC9FF', accent: '#22D3EE', glow: '#22D3EE' },
    { id: 'services', label: 'theme.sec.services',
      bg: '#1B2CE0', ink: '#FFFFFF', 'ink-soft': '#D2DBFF', accent: '#FFD166', glow: '#FFD166' },
    { id: 'maps1',    label: 'theme.sec.maps1',
      bg: '#101FBE', 'ink-soft': '#CFD6FF', accent: '#22D3EE', glow: '#22D3EE' },
    { id: 'maps2',    label: 'theme.sec.maps2',
      bg: '#B00E2E', 'ink-soft': '#FFD3D6', accent: '#FFD166', glow: '#FFD166' },
    { id: 'versus',   label: 'theme.sec.versus',
      bg: '#FFF4E4', ink: '#180F26', 'ink-soft': '#574B67', accent: '#7C3AED', glow: '#7C3AED' },
    { id: 'process',  label: 'theme.sec.process',
      bg: '#B00E67', ink: '#FFFFFF', 'ink-soft': '#FFD9EF', accent: '#FFD166', glow: '#FFD166' },
    { id: 'builder',  label: 'theme.sec.builder',
      bg: '#130B30', ink: '#FFFFFF', 'ink-soft': '#C6BAF0', accent: '#22D3EE', glow: '#22D3EE' },
    { id: 'pricing',  label: 'theme.sec.pricing',
      bg: '#FF7A00', ink: '#2B1004', 'ink-soft': '#61300F', accent: '#2E0B63', glow: '#2E0B63' },
    { id: 'faq',      label: 'theme.sec.faq',
      bg: '#06667F', ink: '#FFFFFF', 'ink-soft': '#B4E9F7', accent: '#FFD166', glow: '#FFD166' },
    { id: 'contact',  label: 'theme.sec.contact',
      bg: '#1C0433', ink: '#FFFFFF', 'ink-soft': '#D5BEFF', accent: '#22D3EE', glow: '#22D3EE' }
  ];

  var ROLES = [
    { key: 'bg', label: 'theme.bg' },
    { key: 'ink', label: 'theme.ink' },
    { key: 'ink-soft', label: 'theme.inkSoft' },
    { key: 'accent', label: 'theme.accent' },
    { key: 'glow', label: 'theme.glow' }
  ];

  var DEFAULTS = {
    radius: 28,
    motion: 'normal',
    grain: 0.07,
    blur: 1,
    'btn-bg': '',      /* empty = keep each section's own button colour */
    'btn-ink': ''
  };

  /* One-click presets. Only the keys listed are forced; anything absent
     falls back to the stylesheet value. */
  var PRESETS = {
    default: {},
    dark: {
      radius: 18, grain: 0.05, blur: 1.1,
      'hero-bg': '#08070E', 'services-bg': '#0B1030', 'maps1-bg': '#0A1030', 'maps2-bg': '#2A0910',
      'versus-bg': '#131119', 'versus-ink': '#F2EFF7', 'versus-ink-soft': '#A79CBD',
      'process-bg': '#26091A', 'builder-bg': '#0A0718', 'pricing-bg': '#2A1503',
      'pricing-ink': '#FFE9CF', 'pricing-ink-soft': '#C79C6C',
      'faq-bg': '#07202A', 'contact-bg': '#070510'
    },
    neon: {
      radius: 6, grain: 0.11, blur: 1.35,
      'hero-bg': '#12002E', 'hero-accent': '#00F0FF', 'hero-glow': '#FF00A8',
      'services-bg': '#1B0050', 'services-accent': '#00F0FF', 'services-glow': '#00F0FF',
      'maps1-bg': '#14005C', 'maps1-accent': '#00F0FF', 'maps2-bg': '#4A0038', 'maps2-accent': '#FFE600',
      'versus-bg': '#F5E9FF', 'versus-ink': '#12002E', 'versus-ink-soft': '#5A3E7A', 'versus-accent': '#C400FF',
      'process-bg': '#7A0060', 'process-accent': '#00F0FF',
      'builder-bg': '#0D0030', 'pricing-bg': '#FF3D00', 'pricing-ink': '#20060A', 'pricing-ink-soft': '#63180C',
      'faq-bg': '#00404F', 'faq-accent': '#00F0FF', 'contact-bg': '#10002B', 'contact-accent': '#FF00A8',
      'btn-bg': '#00F0FF', 'btn-ink': '#0A0018'
    },
    pastel: {
      radius: 34, grain: 0.03, blur: .8,
      'hero-bg': '#4B3A7A', 'hero-ink': '#FFFFFF', 'hero-ink-soft': '#E4DBFF', 'hero-accent': '#9BE7DA', 'hero-glow': '#9BE7DA',
      'services-bg': '#43558F', 'services-ink-soft': '#E2E8FF', 'services-accent': '#FFD9A8', 'services-glow': '#FFD9A8',
      'maps1-bg': '#3F5590', 'maps1-ink-soft': '#E2E8FF', 'maps2-bg': '#8E5560', 'maps2-ink-soft': '#FFE2E4',
      'versus-bg': '#FFF7F0', 'versus-ink': '#3B3450', 'versus-ink-soft': '#6E6484', 'versus-accent': '#8E7BD6',
      'process-bg': '#8E5A83', 'process-ink-soft': '#FFE4F4', 'process-accent': '#FFE0A6',
      'builder-bg': '#3A3358', 'builder-ink-soft': '#DED6F5',
      'pricing-bg': '#F6C08A', 'pricing-ink': '#3A2410', 'pricing-ink-soft': '#6B4A2A', 'pricing-accent': '#4B3A7A',
      'faq-bg': '#4C7F8C', 'faq-ink-soft': '#DCF2F6', 'faq-accent': '#FFE0A6',
      'contact-bg': '#3A2F55', 'contact-ink-soft': '#E4DBFF'
    }
  };

  /* ---------------------------------------------------- helpers */
  function t(key) {
    var I = global.DIQ_I18N;
    if (!I) return key;
    var lang = document.documentElement.getAttribute('lang') || I.fallback;
    var d = I.translations[lang] || {};
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    var f = I.translations[I.fallback] || {};
    return Object.prototype.hasOwnProperty.call(f, key) ? f[key] : key;
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }
  function write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* Turn one stored entry into the CSS custom property it drives. */
  function applyEntry(root, key, value) {
    if (value === '' || value == null) { root.style.removeProperty('--u-' + key); return; }
    if (key === 'radius') { root.style.setProperty('--u-radius', value + 'px'); return; }
    if (key === 'grain') { root.style.setProperty('--u-grain', String(value)); return; }
    if (key === 'blur') { root.style.setProperty('--u-blur', String(value)); return; }
    if (key === 'motion') { root.setAttribute('data-motion', value); return; }
    if (key === 'sound') { return; }                       /* handled by main.js */
    if (/-glow$/.test(key)) {
      var rgba = hexToRgba(value, .55);
      if (rgba) root.style.setProperty('--u-' + key, rgba);
      return;
    }
    root.style.setProperty('--u-' + key, value);
  }

  function apply(state) {
    var root = document.documentElement;
    root.removeAttribute('data-motion');
    var k;
    for (k in state) {
      if (Object.prototype.hasOwnProperty.call(state, k)) applyEntry(root, k, state[k]);
    }
  }

  function clearAll() {
    var root = document.documentElement;
    root.removeAttribute('data-motion');
    var style = root.getAttribute('style') || '';
    style.split(';').forEach(function (decl) {
      var name = decl.split(':')[0].trim();
      if (name.indexOf('--u-') === 0) root.style.removeProperty(name);
    });
  }

  /* ============================================================
     Panel
     ============================================================ */
  function build() {
    var state = read();
    var panel = document.createElement('aside');
    panel.className = 'tpanel';
    panel.id = 'themePanel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'themePanelTitle');

    var html = '' +
      '<div class="tpanel__head">' +
        '<div>' +
          '<h2 class="tpanel__title" id="themePanelTitle" data-i18n="theme.title">Personnalisation</h2>' +
          '<p class="tpanel__lead" data-i18n="theme.lead"></p>' +
        '</div>' +
        '<button class="tpanel__close" type="button" id="themeClose" ' +
                'data-i18n="a11y.closeModal" data-i18n-attr="aria-label" aria-label="Fermer">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
          '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="tpanel__body" id="themeBody"></div>' +
      '<div class="tpanel__foot">' +
        '<button class="btn btn--solid btn--sm" type="button" id="themeSave" data-i18n="theme.save">Enregistrer</button>' +
        '<button class="btn btn--outline btn--sm" type="button" id="themeReset" data-i18n="theme.reset">Réinitialiser</button>' +
        '<button class="btn btn--outline btn--sm" type="button" id="themeCopy" data-i18n="theme.copy">Copier mon thème</button>' +
      '</div>' +
      '<p class="tpanel__toast" id="themeToast" role="status" aria-live="polite"></p>';
    panel.innerHTML = html;
    document.body.appendChild(panel);

    var backdrop = document.createElement('div');
    backdrop.className = 'tpanel__backdrop';
    backdrop.id = 'themeBackdrop';
    backdrop.hidden = true;
    document.body.appendChild(backdrop);

    var body = panel.querySelector('#themeBody');

    /* ---- presets */
    var presetGroup = document.createElement('section');
    presetGroup.className = 'tgroup';
    presetGroup.innerHTML = '<h3 class="tgroup__title" data-i18n="theme.presets">Thèmes prédéfinis</h3>';
    var presetRow = document.createElement('div');
    presetRow.className = 'tpresets';
    ['default', 'dark', 'neon', 'pastel'].forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tpreset';
      b.setAttribute('data-preset', id);
      b.setAttribute('data-i18n', 'theme.preset.' + id);
      b.textContent = t('theme.preset.' + id);
      presetRow.appendChild(b);
    });
    presetGroup.appendChild(presetRow);
    body.appendChild(presetGroup);

    /* ---- global settings */
    var globalGroup = document.createElement('section');
    globalGroup.className = 'tgroup';
    globalGroup.innerHTML = '<h3 class="tgroup__title" data-i18n="theme.global">Réglages généraux</h3>';

    globalGroup.appendChild(rangeRow('radius', 'theme.radius', 0, 48, 1, 'px'));
    globalGroup.appendChild(choiceRow('motion', 'theme.motion',
      [['normal', 'theme.motion.normal'], ['reduced', 'theme.motion.reduced'], ['off', 'theme.motion.off']]));
    globalGroup.appendChild(rangeRow('grain', 'theme.grain', 0, 0.2, 0.005, ''));
    globalGroup.appendChild(rangeRow('blur', 'theme.blur', 0, 2, 0.05, '×'));
    globalGroup.appendChild(choiceRow('sound', 'theme.sound', [['on', 'theme.on'], ['off', 'theme.off']]));
    body.appendChild(globalGroup);

    /* ---- buttons */
    var btnGroup = document.createElement('section');
    btnGroup.className = 'tgroup';
    btnGroup.innerHTML = '<h3 class="tgroup__title" data-i18n="theme.buttons">Boutons</h3>';
    btnGroup.appendChild(colourRow('btn-bg', 'theme.btnBg', '#FFFFFF'));
    btnGroup.appendChild(colourRow('btn-ink', 'theme.btnInk', '#1B0140'));
    body.appendChild(btnGroup);

    /* ---- one collapsible group per section */
    var sectionsHead = document.createElement('h3');
    sectionsHead.className = 'tgroup__title tgroup__title--stand';
    sectionsHead.setAttribute('data-i18n', 'theme.sections');
    sectionsHead.textContent = t('theme.sections');
    body.appendChild(sectionsHead);

    SECTIONS.forEach(function (sec) {
      var g = document.createElement('section');
      g.className = 'tgroup tgroup--fold';

      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'tfold';
      head.setAttribute('aria-expanded', 'false');
      head.id = 'tfold-' + sec.id;
      var sw = document.createElement('span');
      sw.className = 'tfold__swatch';
      sw.setAttribute('aria-hidden', 'true');
      sw.style.background = state[sec.id + '-bg'] || sec.bg;
      head.appendChild(sw);
      var nm = document.createElement('span');
      nm.setAttribute('data-i18n', sec.label);
      nm.textContent = t(sec.label);
      head.appendChild(nm);
      var chev = document.createElement('span');
      chev.className = 'tfold__chev';
      chev.setAttribute('aria-hidden', 'true');
      head.appendChild(chev);

      var inner = document.createElement('div');
      inner.className = 'tfold__body is-closed';
      inner.id = 'tfoldbody-' + sec.id;
      head.setAttribute('aria-controls', inner.id);
      head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', String(!open));
        inner.classList.toggle('is-closed', open);
      });

      ROLES.forEach(function (role) {
        if (!sec[role.key]) return;              /* not every section exposes every role */
        inner.appendChild(colourRow(sec.id + '-' + role.key, role.label, sec[role.key], sw, role.key === 'bg'));
      });

      g.appendChild(head);
      g.appendChild(inner);
      body.appendChild(g);
    });

    /* ------------------------------------------------ row builders */
    function label(forId, key) {
      var l = document.createElement('label');
      l.className = 'trow__label';
      l.setAttribute('for', forId);
      l.setAttribute('data-i18n', key);
      l.textContent = t(key);
      return l;
    }

    function colourRow(varKey, labelKey, fallback, swatch, isBg) {
      var row = document.createElement('div');
      row.className = 'trow';
      var id = 'tc-' + varKey;
      row.appendChild(label(id, labelKey));
      var input = document.createElement('input');
      input.type = 'color';
      input.className = 'trow__colour';
      input.id = id;
      input.value = state[varKey] || fallback || '#000000';
      input.addEventListener('input', function () {
        state[varKey] = input.value;
        applyEntry(document.documentElement, varKey, input.value);
        if (isBg && swatch) swatch.style.background = input.value;
      });
      row.appendChild(input);
      return row;
    }

    function rangeRow(varKey, labelKey, min, max, step, unit) {
      var row = document.createElement('div');
      row.className = 'trow';
      var id = 'tr-' + varKey;
      row.appendChild(label(id, labelKey));
      var wrap = document.createElement('span');
      wrap.className = 'trow__rangeWrap';
      var input = document.createElement('input');
      input.type = 'range';
      input.className = 'trow__range';
      input.id = id;
      input.min = String(min); input.max = String(max); input.step = String(step);
      input.value = String(state[varKey] != null ? state[varKey] : DEFAULTS[varKey]);
      var out = document.createElement('span');
      out.className = 'trow__value';
      function show() { out.textContent = (Math.round(parseFloat(input.value) * 1000) / 1000) + unit; }
      show();
      input.addEventListener('input', function () {
        var v = parseFloat(input.value);
        state[varKey] = v;
        applyEntry(document.documentElement, varKey, v);
        show();
      });
      wrap.appendChild(input);
      wrap.appendChild(out);
      row.appendChild(wrap);
      return row;
    }

    function choiceRow(varKey, labelKey, options) {
      var row = document.createElement('div');
      row.className = 'trow trow--choice';
      var l = document.createElement('span');
      l.className = 'trow__label';
      l.setAttribute('data-i18n', labelKey);
      l.textContent = t(labelKey);
      row.appendChild(l);

      var group = document.createElement('div');
      group.className = 'tchoice';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', t(labelKey));

      var current = state[varKey] != null ? state[varKey]
        : (varKey === 'sound' ? (global.DIQ && global.DIQ.getSound && global.DIQ.getSound() ? 'on' : 'off')
                              : DEFAULTS[varKey]);

      options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tchoice__btn';
        b.setAttribute('data-value', opt[0]);
        b.setAttribute('data-i18n', opt[1]);
        b.setAttribute('aria-pressed', String(current === opt[0]));
        b.textContent = t(opt[1]);
        b.addEventListener('click', function () {
          state[varKey] = opt[0];
          Array.prototype.forEach.call(group.children, function (c) {
            c.setAttribute('aria-pressed', String(c === b));
          });
          if (varKey === 'sound') {
            if (global.DIQ && global.DIQ.setSound) global.DIQ.setSound(opt[0] === 'on');
          } else {
            applyEntry(document.documentElement, varKey, opt[0]);
          }
        });
        group.appendChild(b);
      });
      row.appendChild(group);
      return row;
    }

    /* ------------------------------------------------ actions */
    var toast = panel.querySelector('#themeToast');
    var toastTimer = null;
    function say(msg) {
      toast.textContent = msg;
      toast.classList.add('is-on');
      global.clearTimeout(toastTimer);
      toastTimer = global.setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
    }

    presetRow.addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      var preset = PRESETS[b.getAttribute('data-preset')] || {};
      /* start from a clean slate so presets never inherit each other */
      Object.keys(state).forEach(function (k) { delete state[k]; });
      clearAll();
      Object.keys(preset).forEach(function (k) { state[k] = preset[k]; });
      apply(state);
      refreshInputs();
      Array.prototype.forEach.call(presetRow.children, function (c) {
        c.classList.toggle('is-active', c === b);
      });
    });

    function refreshInputs() {
      /* colour inputs */
      panel.querySelectorAll('input[type="color"]').forEach(function (input) {
        var key = input.id.replace(/^tc-/, '');
        var def = key === 'btn-bg' ? '#FFFFFF' : (key === 'btn-ink' ? '#1B0140' : null);
        if (def === null) {
          SECTIONS.forEach(function (s) {
            ROLES.forEach(function (r) { if (s.id + '-' + r.key === key) def = s[r.key]; });
          });
        }
        input.value = state[key] || def || '#000000';
      });
      /* swatches */
      SECTIONS.forEach(function (s) {
        var head = panel.querySelector('#tfold-' + s.id);
        if (head) head.querySelector('.tfold__swatch').style.background = state[s.id + '-bg'] || s.bg;
      });
      /* ranges */
      ['radius', 'grain', 'blur'].forEach(function (k) {
        var input = panel.querySelector('#tr-' + k);
        if (!input) return;
        input.value = String(state[k] != null ? state[k] : DEFAULTS[k]);
        input.dispatchEvent(new Event('input'));
      });
      /* choices */
      panel.querySelectorAll('.tchoice').forEach(function (group) {
        var isSound = group.getAttribute('aria-label') === t('theme.sound');
        var key = isSound ? 'sound' : 'motion';
        var current = state[key] != null ? state[key]
          : (isSound ? (global.DIQ && global.DIQ.getSound && global.DIQ.getSound() ? 'on' : 'off') : 'normal');
        Array.prototype.forEach.call(group.children, function (c) {
          c.setAttribute('aria-pressed', String(c.getAttribute('data-value') === current));
        });
      });
    }

    panel.querySelector('#themeSave').addEventListener('click', function () {
      write(state);
      say(t('theme.saved'));
    });

    panel.querySelector('#themeReset').addEventListener('click', function () {
      Object.keys(state).forEach(function (k) { delete state[k]; });
      clearAll();
      write({});
      if (global.DIQ && global.DIQ.setSound) global.DIQ.setSound(false);
      refreshInputs();
      Array.prototype.forEach.call(presetRow.children, function (c) { c.classList.remove('is-active'); });
      say(t('theme.resetDone'));
    });

    panel.querySelector('#themeCopy').addEventListener('click', function () {
      var code = 'DIQ-THEME:' + JSON.stringify(state);
      var done = function () { say(t('theme.copied')); };
      if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done, function () { fallbackCopy(code, done); });
      } else {
        fallbackCopy(code, done);
      }
    });

    function fallbackCopy(text, done) {
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

    return { panel: panel, backdrop: backdrop, refreshInputs: refreshInputs };
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    apply(read());

    var trigger = document.getElementById('themeToggle');
    if (!trigger) return;

    var ui = build();
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      ui.panel.hidden = false;
      ui.backdrop.hidden = false;
      ui.refreshInputs();
      global.requestAnimationFrame(function () {
        ui.panel.classList.add('is-open');
        ui.backdrop.classList.add('is-open');
      });
      document.documentElement.classList.add('theming');
      trigger.setAttribute('aria-expanded', 'true');
      var close = ui.panel.querySelector('#themeClose');
      if (close) close.focus();
    }

    function close() {
      ui.panel.classList.remove('is-open');
      ui.backdrop.classList.remove('is-open');
      document.documentElement.classList.remove('theming');
      trigger.setAttribute('aria-expanded', 'false');
      global.setTimeout(function () {
        ui.panel.hidden = true;
        ui.backdrop.hidden = true;
      }, 380);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    trigger.addEventListener('click', function () {
      if (ui.panel.hidden) open(); else close();
    });
    ui.panel.querySelector('#themeClose').addEventListener('click', close);
    ui.backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !ui.panel.hidden) { e.preventDefault(); close(); }
    });
  }

  global.DIQ_THEME = { apply: apply, read: read, PRESETS: PRESETS, SECTIONS: SECTIONS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
