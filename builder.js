/* ============================================================
   DragonIQ.Studio — builder.js
   Isometric map sketcher. Canvas 2D only, no dependencies.

   Loaded on both pages: renders the animated preview on the home
   page, and boots the full editor when builder.html is open.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------- geometry */
  var GRID = 24;      /* 24 x 24 tiles                    */
  var LEVELS = 6;     /* stackable height levels          */
  var TW = 64;        /* tile width in world pixels       */
  var TH = 32;        /* tile height (2:1 isometric)      */
  var LH = 30;        /* one height level in world pixels */

  var DISCORD = 'https://discord.gg/PPKyGfJTQ';
  var STORE = 'diq-builder';

  /* Linear, so fractional grid coordinates project correctly too —
     that is what lets one primitive draw whole tiles and stair steps. */
  function project(x, y, z) {
    return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) - z * LH };
  }

  /* Inverse projection onto the horizontal plane at height z. */
  function unproject(wx, wy, z) {
    var a = wx / (TW / 2);
    var b = (wy + z * LH) / (TH / 2);
    return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) };
  }

  /* ------------------------------------------------------ colour */
  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(hex, amount) {
    var c = hexToRgb(hex);
    return 'rgb(' + c.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
    }).join(',') + ')';
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* ---------------------------------------------------- elements */
  var ELEMENTS = [
    { id: 'floor',     cat: 'terrain',    role: 'ground',    h: .28, shape: 'box' },
    { id: 'water',     cat: 'terrain',    role: 'water',     h: .16, shape: 'box', ripple: true, alpha: .92 },
    { id: 'lava',      cat: 'terrain',    role: 'danger',    h: .16, shape: 'box', glow: true },
    { id: 'ramp',      cat: 'terrain',    role: 'stone',     h: 1,   shape: 'ramp', rotates: true },

    { id: 'wall',      cat: 'structures', role: 'wall',      h: 1,   shape: 'box' },
    { id: 'stairs',    cat: 'structures', role: 'wood',      h: 1,   shape: 'stairs', rotates: true },
    { id: 'bridge',    cat: 'structures', role: 'wood',      h: .2,  shape: 'bridge' },
    { id: 'building',  cat: 'structures', role: 'structure', h: 2.2, shape: 'box', windows: true },

    { id: 'crate',     cat: 'decor',      role: 'wood',      h: .68, shape: 'crate', inset: .12 },
    { id: 'tree',      cat: 'decor',      role: 'foliage',   h: 1.7, shape: 'tree' },

    { id: 'spawn',     cat: 'gameplay',   role: 'spawn',     h: .06, shape: 'marker', icon: 'spawn' },
    { id: 'loot',      cat: 'gameplay',   role: 'loot',      h: .06, shape: 'marker', icon: 'loot' },
    { id: 'objective', cat: 'gameplay',   role: 'objective', h: .06, shape: 'marker', icon: 'flag' }
  ];

  var CATEGORIES = ['terrain', 'structures', 'decor', 'gameplay'];
  var BY_ID = {};
  ELEMENTS.forEach(function (e) { BY_ID[e.id] = e; });

  /* ------------------------------------------------------ themes */
  var THEMES = {
    fortnite: {
      bg: ['#1C3E7A', '#0C1730'], grid: '#8FD8FF',
      ground: '#4EB65C', wall: '#B0764C', wood: '#D09A56', stone: '#8E949E',
      structure: '#D2604A', foliage: '#2F8455', water: '#2E9BE6', danger: '#FF6A26',
      spawn: '#22D3EE', loot: '#FFD166', objective: '#E0117A'
    },
    desert: {
      bg: ['#8A4A1E', '#2B1408'], grid: '#FFD9A0',
      ground: '#E0AC63', wall: '#B9793E', wood: '#C98F4F', stone: '#A98457',
      structure: '#C2603A', foliage: '#8AA05A', water: '#3FB6C4', danger: '#FF7A00',
      spawn: '#22D3EE', loot: '#FFE08A', objective: '#E0117A'
    },
    snow: {
      bg: ['#4B6CA8', '#131E38'], grid: '#DCEBFF',
      ground: '#E8F1FA', wall: '#9DB2CC', wood: '#B78E63', stone: '#8FA2B8',
      structure: '#6E86A6', foliage: '#3E7C63', water: '#63C6E8', danger: '#FF6A26',
      spawn: '#0EA5E9', loot: '#E0A020', objective: '#D6117A'
    },
    neon: {
      bg: ['#2B0A56', '#08021A'], grid: '#B98CFF',
      ground: '#3B1E7A', wall: '#7C3AED', wood: '#C026D3', stone: '#4C2A8A',
      structure: '#1B2CE0', foliage: '#22D3EE', water: '#0EA5E9', danger: '#FF2D78',
      spawn: '#22D3EE', loot: '#FFD166', objective: '#FF2D78'
    },
    horror: {
      bg: ['#2A1220', '#07040A'], grid: '#8A6A7A',
      ground: '#3B3A33', wall: '#544A45', wood: '#6B5138', stone: '#4A4A50',
      structure: '#5A3444', foliage: '#2F4436', water: '#2C4A52', danger: '#B4122B',
      spawn: '#7FD4C1', loot: '#C8A24A', objective: '#D42A46'
    }
  };

  /* ============================================================
     Drawing primitives
     ============================================================ */

  function quad(ctx, pts, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  /* One box spanning the grid rectangle [gx0,gx1] x [gy0,gy1],
     standing from height z0 up to z0 + h. The two faces that can
     face the viewer in this projection are south (+y) and east (+x). */
  function box(ctx, gx0, gy0, gx1, gy1, z0, h, base, opts) {
    opts = opts || {};
    var zt = z0 + h;
    var P = project;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;

    var tNW = P(gx0, gy0, zt), tNE = P(gx1, gy0, zt);
    var tSE = P(gx1, gy1, zt), tSW = P(gx0, gy1, zt);
    var bSE = P(gx1, gy1, z0), bSW = P(gx0, gy1, z0), bNE = P(gx1, gy0, z0);

    quad(ctx, [tSW, tSE, bSE, bSW], opts.left || shade(base, -.2));   /* south */
    quad(ctx, [tNE, tSE, bSE, bNE], opts.right || shade(base, -.44)); /* east  */
    quad(ctx, [tNW, tNE, tSE, tSW], opts.top || shade(base, .22));    /* top   */

    ctx.globalAlpha = 1;
    return { tNW: tNW, tNE: tNE, tSE: tSE, tSW: tSW, bSW: bSW, bSE: bSE, bNE: bNE };
  }

  function markerIcon(ctx, cx, cy, kind, colour) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (kind === 'spawn') {
      ctx.fillStyle = shade(colour, .45);
      ctx.beginPath();
      ctx.moveTo(cx, cy - 27);
      ctx.bezierCurveTo(cx + 12, cy - 27, cx + 12, cy - 11, cx, cy - 1);
      ctx.bezierCurveTo(cx - 12, cy - 11, cx - 12, cy - 27, cx, cy - 27);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(colour, -.6);
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 4.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'loot') {
      ctx.fillStyle = shade(colour, .3);
      ctx.fillRect(cx - 12, cy - 19, 24, 14);
      ctx.fillStyle = shade(colour, -.28);
      ctx.fillRect(cx - 12, cy - 24, 24, 6);
      ctx.fillStyle = shade(colour, -.6);
      ctx.fillRect(cx - 2.4, cy - 19, 4.8, 9);
    } else {
      ctx.strokeStyle = shade(colour, -.55);
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 1);
      ctx.lineTo(cx - 8, cy - 29);
      ctx.stroke();
      ctx.fillStyle = shade(colour, .35);
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 29);
      ctx.lineTo(cx + 14, cy - 23);
      ctx.lineTo(cx - 8, cy - 17);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---- one placed cell ---------------------------------------- */
  function drawCell(ctx, cell, theme) {
    var def = BY_ID[cell.t];
    if (!def) return;
    var base = theme[def.role] || '#8A8A8A';
    var x = cell.x, y = cell.y, z = cell.z;
    var rot = (cell.r || 0) % 4;

    if (def.shape === 'marker') {
      var top = project(x + .5, y + .5, z + def.h);
      var c = [project(x, y, z + def.h), project(x + 1, y, z + def.h),
               project(x + 1, y + 1, z + def.h), project(x, y + 1, z + def.h)];
      ctx.globalAlpha = .55;
      quad(ctx, c, rgba(base, .75));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = shade(base, .3);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      for (var i = 1; i < 4; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.closePath();
      ctx.stroke();
      markerIcon(ctx, top.x, top.y, def.icon, base);
      return;
    }

    if (def.shape === 'stairs') {
      /* Four risers climbing along the facing direction. Rotation just
         picks which axis the slices run along and in which order. */
      var steps = 4;
      for (var s = 0; s < steps; s++) {
        var a = s / steps, b = (s + 1) / steps;
        var hgt = (s + 1) / steps;
        var r0, r1;
        if (rot === 0)      r0 = [0, a, 1, b];
        else if (rot === 1) r0 = [1 - b, 0, 1 - a, 1];
        else if (rot === 2) r0 = [0, 1 - b, 1, 1 - a];
        else                r0 = [a, 0, b, 1];
        r1 = r0;
        box(ctx, x + r1[0], y + r1[1], x + r1[2], y + r1[3], z, hgt, base);
      }
      return;
    }

    if (def.shape === 'ramp') { drawRamp(ctx, x, y, z, base, rot); return; }

    if (def.shape === 'tree') {
      box(ctx, x + .42, y + .42, x + .58, y + .58, z, 1.2, theme.wood);
      var crown = project(x + .5, y + .5, z + def.h);
      ctx.fillStyle = shade(base, .2);
      ctx.beginPath();
      ctx.ellipse(crown.x, crown.y, 27, 21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(base, -.22);
      ctx.beginPath();
      ctx.ellipse(crown.x + 8, crown.y + 8, 17, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (def.shape === 'bridge') {
      box(ctx, x, y + .16, x + 1, y + .84, z + .55, def.h, base);
      /* two posts */
      box(ctx, x + .08, y + .18, x + .2, y + .3, z, .6, shade(theme.wood, -.25));
      box(ctx, x + .8, y + .7, x + .92, y + .82, z, .6, shade(theme.wood, -.25));
      return;
    }

    var inset = def.inset || 0;
    var g = box(ctx, x + inset, y + inset, x + 1 - inset, y + 1 - inset, z, def.h, base,
                { alpha: def.alpha });

    if (def.shape === 'crate') {
      ctx.strokeStyle = shade(base, -.6);
      ctx.lineWidth = 1.6;
      var mid = { x: (g.tSW.x + g.bSW.x) / 2, y: (g.tSW.y + g.bSW.y) / 2 };
      var mid2 = { x: (g.tSE.x + g.bSE.x) / 2, y: (g.tSE.y + g.bSE.y) / 2 };
      var mid3 = { x: (g.tNE.x + g.bNE.x) / 2, y: (g.tNE.y + g.bNE.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y); ctx.lineTo(mid2.x, mid2.y); ctx.lineTo(mid3.x, mid3.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(g.tSE.x, g.tSE.y); ctx.lineTo(g.bSE.x, g.bSE.y);
      ctx.stroke();
    }

    if (def.windows) {
      ctx.fillStyle = rgba(theme.spawn, .5);
      for (var row = 0; row < 4; row++) {
        var fz = z + .35 + row * (def.h - .5) / 4;
        var w0 = project(x + .18, y + 1, fz), w1 = project(x + .46, y + 1, fz);
        var w2 = project(x + .46, y + 1, fz + .22), w3 = project(x + .18, y + 1, fz + .22);
        quad(ctx, [w3, w2, w1, w0], rgba(theme.spawn, .5));
      }
    }

    if (def.ripple) {
      ctx.strokeStyle = rgba('#FFFFFF', .4);
      ctx.lineWidth = 1.5;
      var m = project(x + .5, y + .5, z + def.h);
      ctx.beginPath();
      ctx.moveTo(m.x - 15, m.y + 1);
      ctx.quadraticCurveTo(m.x - 4, m.y - 6, m.x + 8, m.y + 1);
      ctx.stroke();
    }

    if (def.glow) {
      var l = project(x + .5, y + .5, z + def.h);
      ctx.strokeStyle = rgba('#FFE08A', .8);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(l.x - 16, l.y + 3);
      ctx.lineTo(l.x - 3, l.y - 4);
      ctx.lineTo(l.x + 11, l.y + 4);
      ctx.stroke();
    }
  }

  function drawRamp(ctx, x, y, z, base, rot) {
    var P = project;
    /* corners in grid order NW, NE, SE, SW */
    var g = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    var hi = [], lo = [];
    for (var i = 0; i < 4; i++) {
      hi.push(P(g[i][0], g[i][1], z + 1));
      lo.push(P(g[i][0], g[i][1], z));
    }
    var i0 = rot % 4, i1 = (rot + 1) % 4, i2 = (rot + 2) % 4, i3 = (rot + 3) % 4;

    quad(ctx, [hi[i0], hi[i1], lo[i2], lo[i3]], shade(base, .26));          /* slope   */
    quad(ctx, [hi[i1], lo[i1], lo[i2]], shade(base, -.24));                 /* side A  */
    quad(ctx, [hi[i0], lo[i0], lo[i3], hi[i3]], shade(base, -.48));         /* side B  */
    quad(ctx, [hi[i0], hi[i1], lo[i1], lo[i0]], shade(base, -.34));         /* back    */
  }

  function sortCells(list) {
    return list.slice().sort(function (a, b) {
      var da = a.x + a.y, db = b.x + b.y;
      if (da !== db) return da - db;
      return a.z - b.z;
    });
  }

  function drawScene(ctx, cells, theme) {
    sortCells(cells).forEach(function (c) { drawCell(ctx, c, theme); });
  }

  function sceneBounds(cells) {
    if (!cells.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(function (c) {
      var def = BY_ID[c.t] || { h: 1 };
      var t = project(c.x + .5, c.y + .5, c.z + def.h);
      var w = project(c.x, c.y + 1, c.z + def.h);
      var e = project(c.x + 1, c.y, c.z + def.h);
      var s = project(c.x + 1, c.y + 1, c.z);
      var n = project(c.x, c.y, c.z + def.h);
      minX = Math.min(minX, w.x - 30);
      maxX = Math.max(maxX, e.x + 30);
      minY = Math.min(minY, n.y - 34, t.y - 34);
      maxY = Math.max(maxY, s.y + 8);
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  global.DIQ_BUILDER = {
    ELEMENTS: ELEMENTS, CATEGORIES: CATEGORIES, THEMES: THEMES, BY_ID: BY_ID,
    project: project, unproject: unproject, box: box,
    drawScene: drawScene, drawCell: drawCell, sceneBounds: sceneBounds,
    shade: shade, rgba: rgba,
    GRID: GRID, LEVELS: LEVELS, TW: TW, TH: TH, LH: LH, STORE: STORE, DISCORD: DISCORD
  };
})(window);


/* ============================================================
   DragonIQ.Studio — builder editor + home-page preview
   ============================================================ */
(function (global) {
  'use strict';

  var B = global.DIQ_BUILDER;
  if (!B) return;

  var GRID = B.GRID, LEVELS = B.LEVELS, TW = B.TW, TH = B.TH, LH = B.LH;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var reduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* Read the active language straight off <html lang>, which main.js keeps
     in sync — no extra wiring between the two files. */
  function t(key) {
    var I = global.DIQ_I18N;
    if (!I) return key;
    var lang = document.documentElement.getAttribute('lang') || I.fallback;
    var d = I.translations[lang] || {};
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    var f = I.translations[I.fallback] || {};
    return Object.prototype.hasOwnProperty.call(f, key) ? f[key] : key;
  }

  /* ==========================================================
     Small isometric icon for a palette entry
     ========================================================== */
  function iconFor(elId, theme, size) {
    var w = size || 54, h = Math.round(w * .82);
    var c = document.createElement('canvas');
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    var g = c.getContext('2d');
    g.scale(dpr, dpr);

    var cell = { x: 0, y: 0, z: 0, t: elId, r: 0 };
    var b = B.sceneBounds([cell]);
    var scale = Math.min((w - 6) / b.w, (h - 6) / b.h);
    g.translate(w / 2, h / 2);
    g.scale(scale, scale);
    g.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    B.drawCell(g, cell, theme);
    return c;
  }

  /* ==========================================================
     Home-page preview
     ========================================================== */
  var DEMO = (function () {
    var out = [];
    var i, j;
    for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) out.push({ x: i, y: j, z: 0, t: 'floor', r: 0 });
    for (i = 0; i < 6; i++) out.push({ x: i, y: 6, z: 0, t: 'water', r: 0 });
    for (i = 0; i < 6; i++) out.push({ x: i, y: 7, z: 0, t: 'water', r: 0 });
    out.push({ x: 0, y: 0, z: 1, t: 'wall', r: 0 });
    out.push({ x: 1, y: 0, z: 1, t: 'wall', r: 0 });
    out.push({ x: 2, y: 0, z: 1, t: 'building', r: 0 });
    out.push({ x: 0, y: 1, z: 1, t: 'wall', r: 0 });
    out.push({ x: 4, y: 1, z: 1, t: 'stairs', r: 0 });
    out.push({ x: 4, y: 2, z: 1, t: 'floor', r: 0 });
    out.push({ x: 5, y: 2, z: 1, t: 'floor', r: 0 });
    out.push({ x: 5, y: 4, z: 1, t: 'crate', r: 0 });
    out.push({ x: 1, y: 4, z: 1, t: 'tree', r: 0 });
    out.push({ x: 3, y: 5, z: 1, t: 'crate', r: 0 });
    out.push({ x: 2, y: 3, z: 1, t: 'spawn', r: 0 });
    out.push({ x: 5, y: 0, z: 1, t: 'loot', r: 0 });
    out.push({ x: 0, y: 5, z: 1, t: 'objective', r: 0 });
    return out;
  })();

  function initPreview() {
    var canvas = $('#builderPreview');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var theme = B.THEMES.fortnite;
    var shown = DEMO.length;
    var raf = null, last = 0, running = false;

    function size() {
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function paint() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var dpr = Math.min(2, global.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var visible = DEMO.slice(0, Math.floor(shown));
      var b = B.sceneBounds(DEMO);
      var scale = Math.min(w / (b.w + 60), h / (b.h + 60));
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
      B.drawScene(ctx, visible, theme);
      ctx.restore();
    }

    function loop(now) {
      raf = null;
      var dt = Math.min(.1, (now - last) / 1000);
      last = now;
      shown += dt * 22;
      if (shown > DEMO.length + 26) shown = 0;
      paint();
      if (running) raf = global.requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduced()) { shown = DEMO.length; paint(); return; }
      running = true;
      last = (global.performance && performance.now) ? performance.now() : Date.now();
      shown = 0;
      raf = global.requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (raf) { global.cancelAnimationFrame(raf); raf = null; }
    }

    if (!size()) {
      global.requestAnimationFrame(function () { if (size()) paint(); });
    } else {
      paint();
    }

    global.addEventListener('resize', function () { if (size()) paint(); });

    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: .25 }).observe(canvas);
    } else {
      start();
    }
  }

  /* ==========================================================
     Editor
     ========================================================== */
  function initEditor() {
    var canvas = $('#builderCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var state = {
      cells: {},
      name: '',
      themeId: 'fortnite',
      tool: 'floor',
      rot: 0,
      level: 0,
      eraser: false
    };
    var cam = { x: 0, y: -90, z: .9 };
    var hover = null;
    var needsPaint = true;
    var dpr = 1;

    var history = [], hIndex = -1, stroke = null;
    var HISTORY_MAX = 60;

    function theme() { return B.THEMES[state.themeId] || B.THEMES.fortnite; }

    /* The cell list is rebuilt only when the map actually changes, not on
       every frame: at a few thousand blocks that allocation is not free. */
    var listCache = null;
    function list() {
      if (listCache) return listCache;
      var out = [], k;
      for (k in state.cells) if (Object.prototype.hasOwnProperty.call(state.cells, k)) out.push(state.cells[k]);
      listCache = out;
      return out;
    }
    function invalidate() { listCache = null; needsPaint = true; }
    function dirty() { needsPaint = true; }

    /* ---------------------------------------------- canvas size */
    function resize() {
      dpr = Math.min(2, global.devicePixelRatio || 1);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      dirty();
    }

    /* --------------------------------------------------- render */
    function paint() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var th = theme();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, th.bg[0]);
      g.addColorStop(1, th.bg[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
      ctx.scale(cam.z, cam.z);

      /* Lattice. The bright one sits on the plane currently being painted,
         so what you aim at is what you get; ground stays faintly visible
         underneath for reference once you climb. */
      function lattice(z, alpha) {
        ctx.strokeStyle = B.rgba(th.grid, alpha);
        ctx.lineWidth = 1 / cam.z;
        ctx.beginPath();
        for (var i = 0; i <= GRID; i++) {
          var a = B.project(i, 0, z), b = B.project(i, GRID, z);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          var c = B.project(0, i, z), d = B.project(GRID, i, z);
          ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y);
        }
        ctx.stroke();
      }
      if (state.level > 0) lattice(0, .07);
      lattice(state.level, .18);

      ctx.strokeStyle = B.rgba(th.grid, .4);
      ctx.lineWidth = 1.5 / cam.z;
      var e0 = B.project(0, 0, state.level), e1 = B.project(GRID, 0, state.level);
      var e2 = B.project(GRID, GRID, state.level), e3 = B.project(0, GRID, state.level);
      ctx.beginPath();
      ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y);
      ctx.lineTo(e2.x, e2.y); ctx.lineTo(e3.x, e3.y);
      ctx.closePath();
      ctx.stroke();

      B.drawScene(ctx, list(), th);

      /* hovered cell preview */
      if (hover && inBounds(hover.x, hover.y)) {
        var def = B.BY_ID[state.tool];
        if (state.eraser) {
          ctx.strokeStyle = 'rgba(255,90,120,.95)';
          ctx.lineWidth = 2.5 / cam.z;
          outlineTile(hover.x, hover.y, state.level);
          ctx.stroke();
        } else if (def) {
          ctx.globalAlpha = .55;
          B.drawCell(ctx, { x: hover.x, y: hover.y, z: state.level, t: state.tool, r: state.rot }, th);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = B.rgba(th.grid, .9);
          ctx.lineWidth = 2 / cam.z;
          outlineTile(hover.x, hover.y, state.level);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function outlineTile(x, y, z) {
      var p = [B.project(x, y, z), B.project(x + 1, y, z), B.project(x + 1, y + 1, z), B.project(x, y + 1, z)];
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (var i = 1; i < 4; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.closePath();
    }

    function frame() {
      if (needsPaint) { needsPaint = false; paint(); }
      global.requestAnimationFrame(frame);
    }

    /* ------------------------------------------------- picking */
    function inBounds(x, y) { return x >= 0 && y >= 0 && x < GRID && y < GRID; }

    function pick(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      var wx = (clientX - r.left - (r.width / 2 + cam.x)) / cam.z;
      var wy = (clientY - r.top - (r.height / 2 + cam.y)) / cam.z;
      return B.unproject(wx, wy, state.level);
    }

    /* ------------------------------------------------- history */
    function begin() { stroke = []; }
    function record(key, before, after) { if (stroke) stroke.push({ k: key, b: before, a: after }); }
    function commit() {
      if (!stroke || !stroke.length) { stroke = null; return; }
      history = history.slice(0, hIndex + 1);
      history.push(stroke);
      while (history.length > HISTORY_MAX) history.shift();
      hIndex = history.length - 1;
      stroke = null;
      save();
      refreshUI();
    }
    function undo() {
      if (hIndex < 0) return;
      history[hIndex].forEach(function (op) {
        if (op.b) state.cells[op.k] = op.b; else delete state.cells[op.k];
      });
      hIndex--;
      invalidate(); save(); refreshUI();
    }
    function redo() {
      if (hIndex >= history.length - 1) return;
      hIndex++;
      history[hIndex].forEach(function (op) {
        if (op.a) state.cells[op.k] = op.a; else delete state.cells[op.k];
      });
      invalidate(); save(); refreshUI();
    }

    /* --------------------------------------------- place / erase */
    function place(x, y) {
      if (!inBounds(x, y)) return;
      var key = x + ',' + y + ',' + state.level;
      var before = state.cells[key] || null;
      var after = { x: x, y: y, z: state.level, t: state.tool, r: state.rot };
      if (before && before.t === after.t && before.r === after.r) return;
      state.cells[key] = after;
      record(key, before, after);
      invalidate();
    }

    function erase(x, y) {
      if (!inBounds(x, y)) return;
      var key = x + ',' + y + ',' + state.level;
      if (!state.cells[key]) {
        for (var z = LEVELS - 1; z >= 0; z--) {
          var k2 = x + ',' + y + ',' + z;
          if (state.cells[k2]) { key = k2; break; }
        }
      }
      var before = state.cells[key];
      if (!before) return;
      delete state.cells[key];
      record(key, before, null);
      invalidate();
    }

    function clearAll() {
      var keys = Object.keys(state.cells);
      if (!keys.length) return;
      begin();
      keys.forEach(function (k) {
        record(k, state.cells[k], null);
        delete state.cells[k];
      });
      commit();
      invalidate();
    }

    /* -------------------------------------------------- storage */
    var saveTimer = null;
    function save() {
      global.clearTimeout(saveTimer);
      saveTimer = global.setTimeout(function () {
        try {
          var packed = list().map(function (c) { return [c.x, c.y, c.z, c.t, c.r || 0]; });
          localStorage.setItem(B.STORE, JSON.stringify({
            v: 1, name: state.name, theme: state.themeId, level: state.level, cells: packed
          }));
        } catch (e) { /* private mode or quota: not fatal */ }
      }, 400);
    }

    function load() {
      var raw = null;
      try { raw = localStorage.getItem(B.STORE); } catch (e) { return; }
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (!data || !Array.isArray(data.cells)) return;
      state.name = data.name || '';
      if (B.THEMES[data.theme]) state.themeId = data.theme;
      state.level = Math.max(0, Math.min(LEVELS - 1, data.level || 0));
      data.cells.forEach(function (c) {
        if (!B.BY_ID[c[3]]) return;
        var x = c[0], y = c[1], z = c[2];
        if (!inBounds(x, y) || z < 0 || z >= LEVELS) return;
        state.cells[x + ',' + y + ',' + z] = { x: x, y: y, z: z, t: c[3], r: c[4] || 0 };
      });
      invalidate();
    }

    /* ------------------------------------------------------- UI */
    var elCount = $('#builderCount');
    var elLevel = $('#builderLevel');
    var elUndo = $('#builderUndo');
    var elRedo = $('#builderRedo');
    var elName = $('#builderName');
    var elTheme = $('#builderTheme');
    var elEraser = $('#builderEraser');
    var elToast = $('#builderToast');

    function refreshUI() {
      if (elCount) elCount.textContent = String(Object.keys(state.cells).length);
      if (elLevel) elLevel.textContent = String(state.level + 1);
      if (elUndo) elUndo.disabled = hIndex < 0;
      if (elRedo) elRedo.disabled = hIndex >= history.length - 1;
      if (elEraser) elEraser.setAttribute('aria-pressed', String(state.eraser));
      $$('.tool').forEach(function (btn) {
        var on = !state.eraser && btn.getAttribute('data-el') === state.tool;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }

    var toastTimer = null;
    function toast(msg) {
      if (!elToast) return;
      elToast.textContent = msg;
      elToast.classList.add('is-on');
      global.clearTimeout(toastTimer);
      toastTimer = global.setTimeout(function () { elToast.classList.remove('is-on'); }, 3200);
    }

    /* ------------------------------------------------- palette */
    function buildPalette() {
      var host = $('#builderPalette');
      if (!host) return;
      host.innerHTML = '';
      B.CATEGORIES.forEach(function (cat, ci) {
        var group = document.createElement('div');
        group.className = 'palette__group';

        var head = document.createElement('button');
        head.type = 'button';
        head.className = 'palette__head';
        head.setAttribute('aria-expanded', 'true');
        head.id = 'palcat-' + cat;
        var label = document.createElement('span');
        label.setAttribute('data-i18n', 'builder.cat.' + cat);
        label.textContent = t('builder.cat.' + cat);
        head.appendChild(label);
        var chev = document.createElement('span');
        chev.className = 'palette__chev';
        chev.setAttribute('aria-hidden', 'true');
        head.appendChild(chev);

        var body = document.createElement('div');
        body.className = 'palette__body';
        body.id = 'palbody-' + cat;
        head.setAttribute('aria-controls', body.id);

        head.addEventListener('click', function () {
          var open = head.getAttribute('aria-expanded') === 'true';
          head.setAttribute('aria-expanded', String(!open));
          body.classList.toggle('is-closed', open);
        });

        B.ELEMENTS.filter(function (e) { return e.cat === cat; }).forEach(function (el) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tool';
          btn.setAttribute('data-el', el.id);
          btn.setAttribute('aria-pressed', String(el.id === state.tool));
          btn.appendChild(iconFor(el.id, theme()));
          var nm = document.createElement('span');
          nm.className = 'tool__name';
          nm.setAttribute('data-i18n', 'builder.el.' + el.id);
          nm.textContent = t('builder.el.' + el.id);
          btn.appendChild(nm);
          if (el.rotates) {
            var r = document.createElement('span');
            r.className = 'tool__rot';
            r.setAttribute('aria-hidden', 'true');
            r.textContent = 'R';
            btn.appendChild(r);
          }
          btn.addEventListener('click', function () {
            state.tool = el.id;
            state.eraser = false;
            refreshUI();
            dirty();
          });
          body.appendChild(btn);
        });

        group.appendChild(head);
        group.appendChild(body);
        host.appendChild(group);
        void ci;
      });
      refreshUI();
    }

    function refreshIcons() {
      $$('.tool').forEach(function (btn) {
        var id = btn.getAttribute('data-el');
        var old = btn.querySelector('canvas');
        if (old) btn.replaceChild(iconFor(id, theme()), old);
      });
    }

    /* -------------------------------------------- interactions */
    var painting = false, erasing = false, panning = false;
    var lastCell = null, panFrom = null, spaceDown = false;
    var pointers = {}, pinchDist = 0, pinchZoom = 1, longPress = null, moved = false;

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    canvas.addEventListener('pointerdown', function (e) {
      /* Capture keeps a drag alive outside the canvas; it throws for
         synthetic events, which must not abort the placement below. */
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      moved = false;

      if (e.pointerType === 'touch' && Object.keys(pointers).length === 2) {
        painting = erasing = false;
        var p = Object.keys(pointers).map(function (k) { return pointers[k]; });
        pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchZoom = cam.z;
        panning = true;
        panFrom = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, cx: cam.x, cy: cam.y };
        return;
      }

      if (e.button === 1 || spaceDown) {
        panning = true;
        panFrom = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
        return;
      }

      var c = pick(e.clientX, e.clientY);
      lastCell = c;

      if (e.button === 2 || state.eraser) {
        erasing = true;
        begin();
        erase(c.x, c.y);
        return;
      }

      if (e.pointerType === 'touch') {
        /* long press erases */
        longPress = global.setTimeout(function () {
          longPress = null;
          if (moved) return;
          painting = false;
          erasing = true;
          begin();
          erase(c.x, c.y);
        }, 480);
      }

      painting = true;
      begin();
      place(c.x, c.y);
    });

    canvas.addEventListener('pointermove', function (e) {
      if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);

      if (ids.length === 2 && e.pointerType === 'touch') {
        var p = ids.map(function (k) { return pointers[k]; });
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDist > 0) {
          cam.z = Math.max(.35, Math.min(2.4, pinchZoom * (d / pinchDist)));
        }
        var mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
        if (panFrom) {
          cam.x = panFrom.cx + (mid.x - panFrom.x);
          cam.y = panFrom.cy + (mid.y - panFrom.y);
        }
        dirty();
        return;
      }

      if (panning && panFrom) {
        cam.x = panFrom.cx + (e.clientX - panFrom.x);
        cam.y = panFrom.cy + (e.clientY - panFrom.y);
        dirty();
        return;
      }

      var c = pick(e.clientX, e.clientY);
      if (!hover || hover.x !== c.x || hover.y !== c.y) { hover = c; dirty(); }
      if (lastCell && (lastCell.x !== c.x || lastCell.y !== c.y)) {
        moved = true;
        if (longPress) { global.clearTimeout(longPress); longPress = null; }
      }
      if (painting) { place(c.x, c.y); lastCell = c; }
      else if (erasing) { erase(c.x, c.y); lastCell = c; }
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      if (longPress) { global.clearTimeout(longPress); longPress = null; }
      if (painting || erasing) commit();
      painting = erasing = false;
      if (Object.keys(pointers).length === 0) { panning = false; panFrom = null; pinchDist = 0; }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', function (e) {
      hover = null; dirty();
      endPointer(e);
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left - r.width / 2;
      var my = e.clientY - r.top - r.height / 2;
      var before = cam.z;
      var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      cam.z = Math.max(.35, Math.min(2.4, cam.z * factor));
      /* keep the point under the cursor anchored */
      cam.x = mx - (mx - cam.x) * (cam.z / before);
      cam.y = my - (my - cam.y) * (cam.z / before);
      dirty();
    }, { passive: false });

    /* ---------------------------------------------- keyboard */
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.getElementById('modal') && !document.getElementById('modal').hidden) return;

      var k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
        return;
      }
      if (k === ' ') { spaceDown = true; canvas.classList.add('is-panning'); e.preventDefault(); return; }
      if (k === 'r') { state.rot = (state.rot + 1) % 4; dirty(); return; }
      if (k === 'e') { state.eraser = !state.eraser; refreshUI(); dirty(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setLevel(state.level + 1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setLevel(state.level - 1); return; }
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === ' ') { spaceDown = false; canvas.classList.remove('is-panning'); }
    });

    function setLevel(v) {
      state.level = Math.max(0, Math.min(LEVELS - 1, v));
      refreshUI();
      dirty();
      save();
    }

    /* ------------------------------------------------- export */
    function usedElements() {
      var seen = {}, out = [];
      list().forEach(function (c) { if (!seen[c.t]) { seen[c.t] = 1; out.push(c.t); } });
      return out;
    }

    function renderExport(withLogo, logoImg) {
      var cells = list();
      var b = B.sceneBounds(cells);
      var th = theme();
      var used = usedElements();
      var S = 2;
      var pad = 56;
      var titleH = 112;
      var perRow = 4;
      var rows = Math.ceil(used.length / perRow);
      var legendH = 54 + rows * 34 + 30;
      var W = Math.max(820, Math.ceil(b.w) + pad * 2);
      var H = Math.ceil(titleH + b.h + legendH);

      var c = document.createElement('canvas');
      c.width = W * S;
      c.height = H * S;
      var g = c.getContext('2d');
      g.scale(S, S);

      var bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, th.bg[0]);
      bg.addColorStop(1, th.bg[1]);
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      /* title */
      var name = (state.name || t('builder.projectPlaceholder')).trim();
      g.fillStyle = '#FFFFFF';
      g.font = '700 40px "Space Grotesk", system-ui, sans-serif';
      g.textBaseline = 'alphabetic';
      g.fillText(name, pad, 62);
      g.fillStyle = B.rgba(th.grid, .75);
      g.font = '600 17px Inter, system-ui, sans-serif';
      g.fillText(GRID + '×' + GRID + '  ·  ' + cells.length + ' ' + t('builder.blocks'), pad, 88);

      /* scene */
      g.save();
      g.translate(W / 2 - (b.x + b.w / 2), titleH - b.y);
      B.drawScene(g, cells, th);
      g.restore();

      /* legend */
      var ly = titleH + b.h + 26;
      g.fillStyle = B.rgba(th.grid, .85);
      g.font = '700 13px "Space Grotesk", system-ui, sans-serif';
      g.fillText(t('builder.legend').toUpperCase(), pad, ly);
      ly += 24;
      var colW = (W - pad * 2) / perRow;
      used.forEach(function (id, i) {
        var def = B.BY_ID[id];
        var cx = pad + (i % perRow) * colW;
        var cy = ly + Math.floor(i / perRow) * 34;
        g.fillStyle = B.shade(th[def.role] || '#888', .1);
        g.beginPath();
        g.arc(cx + 8, cy - 4, 8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#FFFFFF';
        g.font = '500 15px Inter, system-ui, sans-serif';
        g.fillText(t('builder.el.' + id), cx + 24, cy);
      });

      /* discreet signature */
      var sy = H - 26;
      if (withLogo && logoImg) {
        try { g.drawImage(logoImg, W - pad - 34, sy - 26, 34, 34); } catch (e) { /* ignore */ }
      }
      g.fillStyle = B.rgba(th.grid, .8);
      g.font = '600 15px "Space Grotesk", system-ui, sans-serif';
      g.textAlign = 'right';
      g.fillText('DragonIQ.Studio', W - pad - (withLogo && logoImg ? 46 : 0), sy - 4);
      g.textAlign = 'left';

      return c;
    }

    var logoImage = null;
    (function preloadLogo() {
      var img = new Image();
      img.onload = function () { logoImage = img; };
      img.onerror = function () { logoImage = null; };
      img.src = 'assets/logo.png';
    })();

    function slug(value) {
      var s = String(value || '').toLowerCase();
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      return s || 'map';
    }

    function exportPNG() {
      if (!Object.keys(state.cells).length) { toast(t('builder.exportEmpty')); return; }
      var url;
      try {
        url = renderExport(true, logoImage).toDataURL('image/png');
      } catch (err) {
        /* A logo loaded over file:// taints the canvas; redraw without it. */
        try {
          url = renderExport(false, null).toDataURL('image/png');
        } catch (err2) {
          toast(t('builder.exportEmpty'));
          return;
        }
      }
      var a = document.createElement('a');
      a.href = url;
      a.download = 'map-' + slug(state.name) + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    /* --------------------------------------------------- wiring */
    if (elName) {
      elName.value = state.name;
      elName.addEventListener('input', function () { state.name = elName.value; save(); });
    }
    if (elTheme) {
      elTheme.value = state.themeId;
      elTheme.addEventListener('change', function () {
        state.themeId = elTheme.value;
        refreshIcons();
        dirty();
        save();
      });
    }
    if (elUndo) elUndo.addEventListener('click', undo);
    if (elRedo) elRedo.addEventListener('click', redo);
    if (elEraser) elEraser.addEventListener('click', function () {
      state.eraser = !state.eraser;
      refreshUI();
      dirty();
    });
    var elRotate = $('#builderRotate');
    if (elRotate) elRotate.addEventListener('click', function () { state.rot = (state.rot + 1) % 4; dirty(); });
    var elClear = $('#builderClear');
    if (elClear) elClear.addEventListener('click', function () {
      if (!Object.keys(state.cells).length) return;
      if (global.confirm(t('builder.clearConfirm'))) clearAll();
    });
    var elExport = $('#builderExport');
    if (elExport) elExport.addEventListener('click', exportPNG);
    var up = $('#builderLevelUp'), down = $('#builderLevelDown');
    if (up) up.addEventListener('click', function () { setLevel(state.level + 1); });
    if (down) down.addEventListener('click', function () { setLevel(state.level - 1); });

    var paletteToggle = $('#builderPaletteToggle');
    var paletteWrap = $('#builderPaletteWrap');
    if (paletteToggle && paletteWrap) {
      paletteToggle.addEventListener('click', function () {
        var open = paletteWrap.classList.toggle('is-open');
        paletteToggle.setAttribute('aria-expanded', String(open));
      });
    }

    var notice = $('#builderNotice');
    if (notice) {
      if (global.innerWidth < 760) notice.hidden = false;
      var dismiss = $('#builderNoticeClose');
      if (dismiss) dismiss.addEventListener('click', function () { notice.hidden = true; });
    }

    /* ----------------------------------------------------- boot */
    load();
    if (elName) elName.value = state.name;
    if (elTheme) elTheme.value = state.themeId;
    buildPalette();

    if ('ResizeObserver' in global) {
      new ResizeObserver(resize).observe(canvas.parentNode || canvas);
    }
    global.addEventListener('resize', resize);
    resize();
    refreshUI();
    global.requestAnimationFrame(frame);
  }

  function boot() {
    initPreview();
    initEditor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
