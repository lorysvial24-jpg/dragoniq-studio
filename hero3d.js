/* ============================================================
   DragonIQ.Studio — hero3d.js
   Low-poly floating island behind the hero title.

   Strictly optional: without WebGL, with reduced motion, or if
   the CDN does not answer in time, the hero keeps the animated
   gradient it already has and a still image is shown instead.
   ============================================================ */
(function (global) {
  'use strict';

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var THREE_TIMEOUT = 7000;
  var TRI_BUDGET = 5000;

  function reduced() { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function coarse() { return global.matchMedia('(pointer: coarse)').matches; }

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(global.WebGLRenderingContext &&
                (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  /* Read the live theme straight off the cascade, so the visitor's
     customiser drives the diorama exactly like the rest of the page. */
  function palette() {
    var hero = document.getElementById('hero');
    var cs = hero ? getComputedStyle(hero) : getComputedStyle(document.documentElement);
    function read(name, fallback) {
      var v = (cs.getPropertyValue(name) || '').trim();
      return v || fallback;
    }
    return {
      bg: read('--sec-bg', '#1B0140'),
      accent: read('--sec-accent', '#22D3EE'),
      ink: read('--sec-ink', '#FFFFFF'),
      soft: read('--sec-ink-soft', '#DCC9FF')
    };
  }

  function loadThree(done) {
    if (global.THREE) { done(true); return; }
    var settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      done(ok && !!global.THREE);
    }
    var s = document.createElement('script');
    s.src = THREE_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload = function () { finish(true); };
    s.onerror = function () { finish(false); };
    document.head.appendChild(s);
    global.setTimeout(function () { finish(false); }, THREE_TIMEOUT);
  }

  /* ============================================================
     Scene
     ============================================================ */
  function build(canvas) {
    var THREE = global.THREE;
    var pal = palette();
    var lowPower = coarse();

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !lowPower,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(lowPower ? 1.5 : 2, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.5, 120);
    camera.position.set(0, 5.2, 16);
    camera.lookAt(0, 0.4, 0);

    var island = new THREE.Group();     /* everything that spins   */
    var drift = new THREE.Group();      /* rocks and motes         */
    scene.add(island);
    scene.add(drift);

    var triangles = 0;
    function tally(geo, count) {
      var n = 0;
      if (geo.index) n = geo.index.count / 3;
      else if (geo.attributes && geo.attributes.position) n = geo.attributes.position.count / 3;
      triangles += n * (count || 1);
    }

    function mat(colour, opts) {
      var o = { color: new THREE.Color(colour), flatShading: true };
      if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
      return new THREE.MeshLambertMaterial(o);
    }

    function add(parent, geo, material, x, y, z, cast) {
      var m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = cast !== false;
      m.receiveShadow = true;
      parent.add(m);
      tally(geo);
      return m;
    }

    var C = {
      grass: '#4EB65C',
      soil: '#7A4A2E',
      soilDark: '#5A3320',
      rock: '#8E949E',
      wood: '#C08A4E',
      wall: '#E8E2D6',
      roof: '#C2503A',
      leaf: '#2F8455',
      portal: pal.accent
    };

    /* ---- soil cone + grass cap ------------------------------ */
    var soilGeo = new THREE.CylinderGeometry(4.2, 0.7, 3.4, 9, 1);
    add(island, soilGeo, mat(C.soil), 0, -1.7, 0);

    var soil2 = new THREE.CylinderGeometry(3.1, 1.6, 1.4, 8, 1);
    add(island, soil2, mat(C.soilDark), 0.6, -3.4, -0.3);

    var grassGeo = new THREE.CylinderGeometry(4.25, 4.2, 0.5, 9, 1);
    add(island, grassGeo, mat(C.grass), 0, 0.25, 0);

    /* ---- hanging roots -------------------------------------- */
    var rootGeo = new THREE.ConeGeometry(0.16, 1.6, 4);
    for (var r = 0; r < 7; r++) {
      var a = (r / 7) * Math.PI * 2;
      var rad = 1.6 + (r % 3) * 0.5;
      var m = add(island, rootGeo, mat(C.soilDark), Math.cos(a) * rad, -3.4 - (r % 3) * 0.5, Math.sin(a) * rad);
      m.rotation.z = Math.PI;
      m.rotation.x = (r % 2 ? 0.12 : -0.12);
    }

    /* ---- portal at the centre ------------------------------- */
    var portalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.portal) });
    var ringGeo = new THREE.TorusGeometry(1.05, 0.13, 6, 16);
    var portal = new THREE.Mesh(ringGeo, portalMat);
    portal.position.set(0, 1.8, 0);
    island.add(portal);
    tally(ringGeo);

    var coreGeo = new THREE.CircleGeometry(0.95, 14);
    var core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
      color: new THREE.Color(C.portal), transparent: true, opacity: 0.32
    }));
    core.position.copy(portal.position);
    island.add(core);
    tally(coreGeo);

    var portalLight = new THREE.PointLight(new THREE.Color(C.portal), 1.5, 12, 2);
    portalLight.position.set(0, 1.8, 0.2);
    island.add(portalLight);

    /* ---- buildings ------------------------------------------ */
    var wallMat = mat(C.wall), roofMat = mat(C.roof);
    function house(x, z, w, h, rot) {
      var g = new THREE.BoxGeometry(w, h, w);
      var b = add(island, g, wallMat, x, 0.5 + h / 2, z);
      b.rotation.y = rot;
      var rg = new THREE.ConeGeometry(w * 0.86, h * 0.62, 4);
      var rf = add(island, rg, roofMat, x, 0.5 + h + h * 0.31, z);
      rf.rotation.y = rot + Math.PI / 4;
    }
    house(-2.35, 1.15, 1.25, 1.15, 0.3);
    house(2.15, 1.55, 1.05, 1.5, -0.5);
    house(1.5, -2.15, 1.35, 1.0, 0.9);

    /* ---- bridge --------------------------------------------- */
    var deckGeo = new THREE.BoxGeometry(2.6, 0.14, 0.7);
    var deck = add(island, deckGeo, mat(C.wood), -0.7, 0.72, 2.35);
    deck.rotation.y = 0.42;
    var postGeo = new THREE.BoxGeometry(0.14, 0.6, 0.14);
    add(island, postGeo, mat(C.wood), -1.75, 0.42, 2.75);
    add(island, postGeo, mat(C.wood), 0.35, 0.42, 1.95);

    /* ---- trees ---------------------------------------------- */
    var trunkGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.9, 5);
    var leafGeo = new THREE.IcosahedronGeometry(0.62, 0);
    function tree(x, z, s) {
      add(island, trunkGeo, mat(C.wood), x, 0.9, z);
      var l = add(island, leafGeo, mat(C.leaf), x, 1.75, z);
      l.scale.setScalar(s);
    }
    tree(-1.4, -1.75, 1);
    tree(3.05, -0.55, 0.82);
    tree(-3.1, -0.3, 0.9);

    /* ---- ground rocks --------------------------------------- */
    var rockGeo = new THREE.DodecahedronGeometry(0.34, 0);
    var rockMat = mat(C.rock);
    [[2.9, 2.05, .8], [-2.8, -2.1, 1], [0.9, 3.1, .6]].forEach(function (p) {
      var m2 = add(island, rockGeo, rockMat, p[0], 0.62, p[1]);
      m2.scale.setScalar(p[2]);
      m2.rotation.set(p[0], p[1], 0.4);
    });

    /* ---- floating debris, on their own drift layer ---------- */
    var floaters = [];
    var floatCount = lowPower ? 7 : 16;
    var moteGeo = new THREE.TetrahedronGeometry(0.17, 0);
    for (var i = 0; i < floatCount; i++) {
      var useRock = i % 3 === 0;
      var geo = useRock ? rockGeo : moteGeo;
      var mm = new THREE.Mesh(geo, useRock ? rockMat : portalMat);
      var ang = (i / floatCount) * Math.PI * 2;
      var radius = 5.4 + (i % 4) * 0.8;
      mm.position.set(Math.cos(ang) * radius, -1.6 + (i % 5) * 1.05, Math.sin(ang) * radius);
      mm.scale.setScalar(useRock ? 0.5 + (i % 3) * 0.16 : 0.7);
      mm.castShadow = false;
      drift.add(mm);
      tally(geo);
      floaters.push({
        mesh: mm, ang: ang, radius: radius,
        speed: 0.06 + (i % 5) * 0.035,       /* different planes move at different rates */
        bob: 0.25 + (i % 3) * 0.14,
        phase: i * 0.7
      });
    }

    /* ---- lighting ------------------------------------------- */
    scene.add(new THREE.HemisphereLight(0xfff0dd, 0x2a1a4a, 0.65));
    var sun = new THREE.DirectionalLight(0xffd9a8, 1.05);
    sun.position.set(6, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = lowPower ? 512 : 1024;
    sun.shadow.mapSize.height = lowPower ? 512 : 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    var rim = new THREE.DirectionalLight(new THREE.Color(pal.accent), 0.45);
    rim.position.set(-7, 3, -6);
    scene.add(rim);

    /* ---- theme changes -------------------------------------- */
    function retheme() {
      var p = palette();
      var c = new THREE.Color(p.accent);
      portalMat.color = c;
      core.material.color = c;
      portalLight.color = c;
      rim.color = c;
    }

    /* ---- pointer influence ---------------------------------- */
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    global.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      targetX = (e.clientX / global.innerWidth - 0.5);
      targetY = (e.clientY / global.innerHeight - 0.5);
    }, { passive: true });

    /* ---- loop ----------------------------------------------- */
    var spin = 0, raf = null, running = false, lastT = 0;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function tick(now) {
      raf = null;
      var dt = lastT ? Math.min(0.06, (now - lastT) / 1000) : 0.016;
      lastT = now;

      /* Pointer slows the spin and tilts the island. */
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      var slow = 1 - Math.min(0.75, Math.abs(curX) * 1.6);
      spin += dt * 0.19 * slow;

      island.rotation.y = spin + curX * 0.45;
      island.rotation.x = curY * 0.2;
      island.rotation.z = -curX * 0.09;
      drift.rotation.y = spin * 0.4;

      portal.rotation.z += dt * 0.55;
      core.material.opacity = 0.26 + Math.sin(now * 0.0016) * 0.09;
      portalLight.intensity = 1.35 + Math.sin(now * 0.0021) * 0.35;

      for (var i = 0; i < floaters.length; i++) {
        var f = floaters[i];
        f.ang += dt * f.speed;
        f.mesh.position.x = Math.cos(f.ang) * f.radius;
        f.mesh.position.z = Math.sin(f.ang) * f.radius;
        f.mesh.position.y += Math.sin(now * 0.001 + f.phase) * f.bob * dt;
        f.mesh.rotation.x += dt * f.speed * 2;
        f.mesh.rotation.y += dt * f.speed * 1.4;
      }

      renderer.render(scene, camera);
      if (running) raf = global.requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      lastT = 0;
      raf = global.requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      if (raf) { global.cancelAnimationFrame(raf); raf = null; }
    }

    resize();
    global.addEventListener('resize', resize);

    /* Idle whenever the hero is off screen. */
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.02 }).observe(canvas);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    return {
      triangles: Math.round(triangles),
      retheme: retheme,
      start: start,
      stop: stop,
      isRunning: function () { return running; }
    };
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    var host = document.getElementById('heroScene');
    if (!host) return;
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    function fallback() {
      host.setAttribute('data-mode', 'fallback');   /* CSS shows the still + gradient */
    }

    if (reduced() || !webglOK()) { fallback(); return; }

    loadThree(function (ok) {
      if (!ok) { fallback(); return; }
      try {
        var api = build(canvas);
        host.setAttribute('data-mode', 'live');
        global.DIQ_HERO3D = api;
        if (api.triangles > TRI_BUDGET && global.console && console.warn) {
          console.warn('hero3d: ' + api.triangles + ' triangles, over the ' + TRI_BUDGET + ' budget');
        }
      } catch (err) {
        if (global.console && console.error) console.error('hero3d:', err);
        fallback();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
