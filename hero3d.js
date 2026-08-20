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

  /* Quality ladder for the background shader. The watchdog walks down it
     when frames get long, and the last rung switches the shader off so
     the CSS gradient takes over again. */
  var QUALITY = [
    { pr: 1.75, detail: 4 },
    { pr: 1.15, detail: 3 },
    { pr: 0.75, detail: 2 },
    { pr: 0.75, detail: 0, off: true }
  ];

  /* --------------------------------------------------------------
     Fullscreen nebula. Two domain-warp passes over 2D simplex noise,
     tinted with the section palette. The pointer pushes the field
     away locally; the scroll offset drifts it vertically.
     -------------------------------------------------------------- */
  var VERT = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform float uAspect;',
    'uniform float uDetail;',
    'uniform float uPush;',
    'uniform vec2  uMouse;',
    'uniform vec3  uA;',
    'uniform vec3  uB;',
    'uniform vec3  uC;',

    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }',

    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m; m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',

    /* uDetail drops octaves instead of resolution when the GPU is slow. */
    'float fbm(vec2 p) {',
    '  float sum = 0.0;',
    '  float amp = 0.5;',
    '  for (int i = 0; i < 4; i++) {',
    '    if (float(i) >= uDetail) break;',
    '    sum += amp * snoise(p);',
    '    p *= 2.03;',
    '    amp *= 0.5;',
    '  }',
    '  return sum;',
    '}',

    'void main() {',
    '  vec2 p = vUv - 0.5;',
    '  p.x *= uAspect;',

    /* Local pointer displacement, gaussian falloff. The offset is
       linear in md rather than normalize(md): a normalised direction
       flips through every angle at the pointer itself and leaves a
       starburst pinned under the cursor. Linear pushes the field out
       smoothly and has no singularity. */
    '  vec2 md = p - uMouse;',
    '  float d2 = dot(md, md);',
    '  float infl = exp(-d2 * 6.5) * uPush;',
    '  p += md * infl * 1.15;',

    '  float t = uTime * 0.042;',
    '  vec2 q = vec2(',
    '    fbm(p * 1.45 + vec2(0.0, t)),',
    '    fbm(p * 1.45 + vec2(3.7, -t * 0.85))',
    '  );',
    '  float f = fbm(p * 1.3 + q * 2.35 + vec2(0.0, uScroll * 0.55));',

    '  float v = clamp(f * 0.7 + 0.5, 0.0, 1.0);',
    '  vec3 col = mix(uA, uB, smoothstep(0.28, 0.88, v));',
    '  col = mix(col, uC, smoothstep(0.62, 1.05, clamp(length(q) * 0.9, 0.0, 1.0)));',

    /* Vignette, plus a wash down the reading side. The title lives on
       the left, so that half is pushed toward the deep tone whatever
       the noise happens to be doing there. */
    '  float r = length(vec2(p.x / max(uAspect, 0.001), p.y));',
    '  col *= 1.0 - smoothstep(0.26, 0.95, r) * 0.5;',
    '  float readSide = smoothstep(0.35, -0.15, vUv.x);',
    '  col = mix(col, uA, readSide * 0.55);',
    '  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.022;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function reduced() { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  /* The theme panel lets a visitor switch animation off outright; that
     has to reach the shader too, not just the CSS. */
  function motionOff() { return document.documentElement.getAttribute('data-motion') === 'off'; }
  function dead() { return reduced() || motionOff(); }
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

  /* The portfolio tone the diorama morphs toward, read the same way. */
  function mapsPalette() {
    var el = document.getElementById('portfolio');
    var cs = el ? getComputedStyle(el) : null;
    function read(name, fallback) {
      var v = cs ? (cs.getPropertyValue(name) || '').trim() : '';
      return v || fallback;
    }
    return { bg: read('--sec-bg', '#101FBE'), accent: read('--sec-accent', '#22D3EE') };
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
    var morph = new THREE.Group();      /* the map the island becomes */
    var stage = new THREE.Group();      /* holds all three, off to one side */
    stage.add(island);
    stage.add(drift);
    stage.add(morph);
    scene.add(stage);

    /* The title occupies the left third; the diorama is parked clear of
       it and pulled back. On a narrow screen there is no room to move
       sideways, so it just gets smaller and drops behind the copy. */
    var stageX = 4.6, stageY = -0.6, stageZ = 0, stageS = 0.78;
    function place() {
      var narrow = canvas.clientWidth < 760;
      /* On a phone the copy stack owns the middle of the screen, so the
         island drops below it instead of sitting behind the subtitle. */
      stageX = narrow ? 0 : 4.6;
      stageY = narrow ? -5.4 : -0.6;
      stageZ = narrow ? -6 : 0;
      stageS = narrow ? 0.5 : 0.78;
      stage.position.set(stageX, stageY, stageZ);
      stage.scale.setScalar(stageS);
    }
    place();

    /* ---- background shader ----------------------------------- */
    var level = lowPower ? 1 : 0;
    var bgScene = new THREE.Scene();
    var bgCam = new THREE.Camera();
    var uniforms = {
      uTime:   { value: 0 },
      uScroll: { value: 0 },
      uAspect: { value: 1 },
      uDetail: { value: QUALITY[level].detail },
      uPush:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uA:      { value: new THREE.Color(0x1b0140) },
      uB:      { value: new THREE.Color(0x4b1d8a) },
      uC:      { value: new THREE.Color(0x22d3ee) }
    };
    var bgMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false
    });
    var bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bgMesh.frustumCulled = false;
    bgScene.add(bgMesh);

    /* The island is drawn over the shader, so the renderer clears
       manually: colour once, then depth between the two passes. */
    renderer.autoClear = false;

    var triangles = 0;
    function tally(geo, count) {
      var n = 0;
      if (geo.index) n = geo.index.count / 3;
      else if (geo.attributes && geo.attributes.position) n = geo.attributes.position.count / 3;
      triangles += n * (count || 1);
    }

    /* Phong, not Lambert: Lambert lights per vertex and ignores
       flatShading entirely, which is exactly the faceting the whole
       low-poly look depends on. shininess stays at zero so it still
       reads as matte. */
    function mat(colour, opts) {
      var o = { color: new THREE.Color(colour), flatShading: true, shininess: 0 };
      if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
      return new THREE.MeshPhongMaterial(o);
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
      mm.scale.setScalar(useRock ? 0.42 + (i % 3) * 0.13 : 0.38);
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

    /* ---- the map the island turns into ----------------------- */
    /* A single quad. The thumbnail is a bonus: if it will not load
       (file missing, file:// with a strict browser), the plate keeps
       the section's own accent and the morph still reads. */
    var mapMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(mapsPalette().accent),
      transparent: true,
      opacity: 0
    });
    var mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 5.75), mapMat);
    mapPlane.rotation.x = -Math.PI / 2;
    mapPlane.position.y = -0.4;
    morph.add(mapPlane);
    tally(mapPlane.geometry);

    try {
      new THREE.TextureLoader().load('assets/map-1v1.png', function (tex) {
        mapMat.map = tex;
        mapMat.color.setHex(0xffffff);
        mapMat.needsUpdate = true;
      }, null, function () { /* keep the flat accent plate */ });
    } catch (e) { /* no loader, keep the plate */ }

    var mapFrame = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.09, 4, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(mapsPalette().accent), transparent: true, opacity: 0 })
    );
    mapFrame.rotation.x = -Math.PI / 2;
    mapFrame.scale.set(1, 0.63, 1);
    mapFrame.position.y = -0.38;
    morph.add(mapFrame);
    tally(mapFrame.geometry);

    /* ---- theme changes -------------------------------------- */
    function shaderColours() {
      var p = palette();
      var base = new THREE.Color(p.bg);
      var soft = new THREE.Color(p.soft);
      var acc = new THREE.Color(p.accent);
      /* Deep, mid and highlight, all three derived from the section so a
         light section reads light and a dark one stays dark. The mid
         leans on the accent rather than the soft ink: soft ink is a
         near-white on dark sections and washed the whole field out. */
      uniforms.uA.value.copy(base).multiplyScalar(0.55);
      uniforms.uB.value.copy(base).lerp(acc, 0.30).multiplyScalar(1.25);
      uniforms.uC.value.copy(base).lerp(acc, 0.72).multiplyScalar(0.9);
      /* soft only tints the very brightest filaments */
      uniforms.uC.value.lerp(soft, 0.12);
    }

    function retheme() {
      var p = palette();
      var c = new THREE.Color(p.accent);
      portalMat.color = c;
      core.material.color = c;
      portalLight.color = c;
      rim.color = c;
      shaderColours();
      var mp = new THREE.Color(mapsPalette().accent);
      if (!mapMat.map) mapMat.color.copy(mp);
      mapFrame.material.color.copy(mp);
    }
    shaderColours();

    /* ---- pointer influence ---------------------------------- */
    /* Two trackers: curX/curY tilt the island, while mx/my drive the
       shader. The shader pair carries its own inertia so the field
       keeps moving for a moment after the pointer stops. */
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var mTargetX = 0, mTargetY = 0, mx = 0, my = 0, mVel = 0, lastMoveT = 0;

    global.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      targetX = (e.clientX / global.innerWidth - 0.5);
      targetY = (e.clientY / global.innerHeight - 0.5);

      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = 0.5 - (e.clientY - rect.top) / rect.height;
      mVel = Math.min(1, mVel + Math.abs(nx - mTargetX) * 5 + Math.abs(ny - mTargetY) * 5);
      mTargetX = nx;
      mTargetY = ny;
      lastMoveT = global.performance ? performance.now() : Date.now();
    }, { passive: true });

    /* ---- scroll ---------------------------------------------- */
    /* 0 while the hero fills the screen, 1 once it has scrolled away.
       Read in the loop from a value the scroll handler caches, so no
       layout is forced inside a frame. */
    var scrollP = 0, scrollRaw = 0;
    function readScroll() {
      var hero = document.getElementById('hero');
      if (!hero) return;
      var r = hero.getBoundingClientRect();
      scrollRaw = global.pageYOffset || document.documentElement.scrollTop || 0;
      scrollP = r.height ? Math.max(0, Math.min(1, -r.top / (r.height * 0.85))) : 0;
    }
    var scrollQueued = false;
    global.addEventListener('scroll', function () {
      if (scrollQueued) return;
      scrollQueued = true;
      global.requestAnimationFrame(function () { scrollQueued = false; readScroll(); });
    }, { passive: true });
    readScroll();

    /* ---- loop ----------------------------------------------- */
    var spin = 0, raf = null, running = false, lastT = 0;
    var shaderOn = true;
    var slowFrames = 0, sampled = 0, sumDt = 0;

    function applyQuality() {
      var q = QUALITY[level];
      renderer.setPixelRatio(Math.min(q.pr, global.devicePixelRatio || 1));
      uniforms.uDetail.value = q.detail;
      shaderOn = !q.off;
      bgMesh.visible = shaderOn;
      renderer.autoClear = !shaderOn;   /* nothing under the island any more */
      resize();
    }

    /* Walk down the ladder when frames stay long. Never walks back up:
       a device that struggled once will struggle again, and hunting
       between two rungs is worse than sitting on the lower one. */
    function watch(dt) {
      sumDt += dt;
      sampled++;
      if (sampled < 45) return;
      var avg = sumDt / sampled;
      sumDt = 0;
      sampled = 0;
      if (avg > 0.0215) {              /* under ~46 fps */
        slowFrames++;
        if (slowFrames >= 2 && level < QUALITY.length - 1) {
          level++;
          slowFrames = 0;
          applyQuality();
        }
      } else {
        slowFrames = 0;
      }
    }

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uAspect.value = w / h;
      place();
    }

    /* Smootherstep — the morph must not have a visible start or stop. */
    function ease(x) { var c = Math.max(0, Math.min(1, x)); return c * c * c * (c * (c * 6 - 15) + 10); }

    function tick(now) {
      raf = null;
      var dt = lastT ? Math.min(0.06, (now - lastT) / 1000) : 0.016;
      lastT = now;
      watch(dt);

      /* Pointer slows the spin and tilts the island. */
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      var slow = 1 - Math.min(0.75, Math.abs(curX) * 1.6);
      spin += dt * 0.19 * slow;

      /* ---- shader field --------------------------------------- */
      if (shaderOn) {
        mx += (mTargetX - mx) * 0.055;   /* inertia: the field trails the pointer */
        my += (mTargetY - my) * 0.055;
        var idle = (now - lastMoveT) / 1000;
        mVel += ((lastMoveT && idle < 1.4 ? 1 : 0) - mVel) * 0.045;
        uniforms.uTime.value = now * 0.001;
        uniforms.uMouse.value.set(mx * uniforms.uAspect.value, my);
        uniforms.uPush.value = mVel * 0.9;
        uniforms.uScroll.value = scrollRaw * 0.0012;
      }

      /* ---- island → map morph --------------------------------- */
      var mp = ease(scrollP);
      island.rotation.y = spin + curX * 0.45;
      /* Tips the grass toward the camera, not away: the point of the
         morph is that the island becomes a map you look down on, and
         tipping the other way just shows the underside. */
      island.rotation.x = curY * 0.2 + mp * 1.28;
      island.rotation.z = -curX * 0.09;
      island.scale.set(1 - mp * 0.32, 1 - mp * 0.9, 1 - mp * 0.32);
      island.position.y = mp * -0.9;
      drift.rotation.y = spin * 0.4;
      drift.scale.setScalar(1 - mp);
      drift.visible = mp < 0.98;

      /* As the island becomes the map it also walks back to the middle
         of the frame — a plate that finishes its transformation half
         off the right edge is a transformation nobody sees. */
      stage.position.x = stageX * (1 - mp * 0.9);
      stage.position.y = stageY + mp * 1.5;
      stage.position.z = stageZ + mp * 2.2;
      stage.scale.setScalar(stageS * (1 + mp * 0.14));

      morph.visible = mp > 0.02;
      if (morph.visible) {
        var plate = ease((scrollP - 0.24) / 0.7);
        mapMat.opacity = plate * 0.96;
        mapFrame.material.opacity = plate;
        /* The plate rises from flat to facing the reader. */
        morph.rotation.x = 0.15 + plate * 1.12;
        morph.scale.setScalar(0.6 + plate * 0.5);
        morph.position.y = -0.2 + (1 - plate) * 1.6;
      }

      portal.rotation.z += dt * 0.55;
      core.material.opacity = (0.26 + Math.sin(now * 0.0016) * 0.09) * (1 - mp);
      portalLight.intensity = (1.35 + Math.sin(now * 0.0021) * 0.35) * (1 - mp);

      for (var i = 0; i < floaters.length; i++) {
        var f = floaters[i];
        f.ang += dt * f.speed;
        f.mesh.position.x = Math.cos(f.ang) * f.radius;
        f.mesh.position.z = Math.sin(f.ang) * f.radius;
        f.mesh.position.y += Math.sin(now * 0.001 + f.phase) * f.bob * dt;
        f.mesh.rotation.x += dt * f.speed * 2;
        f.mesh.rotation.y += dt * f.speed * 1.4;
      }

      if (shaderOn) {
        renderer.clear(true, true, true);
        renderer.render(bgScene, bgCam);
        renderer.clearDepth();
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

    global.addEventListener('resize', function () { resize(); readScroll(); });

    /* Idle whenever the hero is off screen — and while it is on screen,
       pin the canvas to the viewport. The hero can be taller than the
       viewport once the title wraps, and an unpinned canvas would carry
       the island out of sight long before the morph had finished. */
    var host = canvas.parentNode;
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { start(); if (host) host.classList.add('is-pinned'); }
          else { stop(); if (host) host.classList.remove('is-pinned'); }
        });
      }, { threshold: 0.02 }).observe(document.getElementById('hero') || canvas);
    } else {
      start();
      if (host) host.classList.add('is-pinned');
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    applyQuality();

    return {
      triangles: Math.round(triangles),
      retheme: retheme,
      start: start,
      stop: stop,
      isRunning: function () { return running; },
      quality: function () { return level; },
      shaderOn: function () { return shaderOn; },
      morphAt: function () { return scrollP; },
      /* Used by the tests and by anyone debugging a slow machine. */
      setQuality: function (n) {
        level = Math.max(0, Math.min(QUALITY.length - 1, n | 0));
        applyQuality();
      }
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

    if (dead() || !webglOK()) { fallback(); return; }

    loadThree(function (ok) {
      if (!ok) { fallback(); return; }
      try {
        var api = build(canvas);
        host.setAttribute('data-mode', 'live');
        global.DIQ_HERO3D = api;

        /* Switching animation off mid-visit parks the scene and puts the
           gradient back; switching it on again brings it round. */
        if (global.MutationObserver) {
          new MutationObserver(function () {
            if (motionOff()) {
              api.stop();
              host.setAttribute('data-mode', 'fallback');
            } else if (host.getAttribute('data-mode') !== 'live') {
              host.setAttribute('data-mode', 'live');
              api.retheme();
              api.start();
            }
          }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
        }
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
