/* ============================================================
   DragonIQ.Studio — builder3d.js
   Real 3D map builder on three.js (loaded from the CDN as a
   classic script, so no build step).

   If three.js is unavailable the file does nothing: builder.js
   has already booted its isometric editor on the same canvas,
   and we only surface a notice.
   ============================================================ */
(function (global) {
  'use strict';

  var B = global.DIQ_BUILDER;
  if (!B) return;

  var GRID = B.GRID;          /* 24 x 24 */
  var LEVELS = B.LEVELS;      /* 6 stacked levels */
  var STORE = B.STORE;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function reduced() { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function t(k) { return B.t ? B.t(k) : k; }

  /* ============================================================
     Editor
     ============================================================ */
  function Editor(canvas) {
    var THREE = global.THREE;

    var state = { cells: {}, name: '', themeId: 'fortnite', tool: 'floor', rot: 0, level: 0, eraser: false };
    var history = [], hIndex = -1, stroke = null, HISTORY_MAX = 60;
    var meshes = {};                                  /* cell key -> Object3D */

    /* ---------------------------------------------------- scene */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);

    var hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 0.75);
    scene.add(hemi);

    var sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(18, 26, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0008;
    scene.add(sun);
    scene.add(sun.target);
    sun.target.position.set(GRID / 2, 0, GRID / 2);

    /* ground */
    var groundMat = new THREE.MeshLambertMaterial({ color: 0x2b2b3a });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GRID / 2, 0, GRID / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    var grid = new THREE.GridHelper(GRID, GRID, 0xffffff, 0xffffff);
    grid.position.set(GRID / 2, 0.002, GRID / 2);
    grid.material.opacity = 0.16;
    grid.material.transparent = true;
    scene.add(grid);

    /* placement cursor */
    var cursorGeo = new THREE.BoxGeometry(1, 0.02, 1);
    var cursorMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 });
    var cursor = new THREE.Mesh(cursorGeo, cursorMat);
    cursor.visible = false;
    scene.add(cursor);

    var cursorEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.02, 1)),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    cursorEdge.visible = false;
    scene.add(cursorEdge);

    /* ---------------------------------------------------- camera */
    var orbit = { target: new THREE.Vector3(GRID / 2, 0, GRID / 2), radius: 34, theta: Math.PI * 0.25, phi: Math.PI * 0.32 };

    function applyCamera() {
      orbit.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, orbit.phi));
      orbit.radius = Math.max(8, Math.min(90, orbit.radius));
      var s = Math.sin(orbit.phi);
      camera.position.set(
        orbit.target.x + orbit.radius * s * Math.sin(orbit.theta),
        orbit.target.y + orbit.radius * Math.cos(orbit.phi),
        orbit.target.z + orbit.radius * s * Math.cos(orbit.theta)
      );
      camera.lookAt(orbit.target);
      needsRender = true;
    }

    /* ---------------------------------------------------- themes */
    function theme() { return B.THEMES[state.themeId] || B.THEMES.fortnite; }

    var matCache = {};
    function materialFor(def) {
      var th = theme();
      var key = state.themeId + ':' + def.role + ':' + def.id;
      if (matCache[key]) return matCache[key];
      var colour = new THREE.Color(th[def.role] || '#888888');
      var opts = { color: colour };
      if (def.id === 'water') { opts.transparent = true; opts.opacity = 0.62; }
      if (def.id === 'lava') { opts.emissive = new THREE.Color(th.danger); opts.emissiveIntensity = 0.9; }
      var m = new THREE.MeshLambertMaterial(opts);
      matCache[key] = m;
      return m;
    }

    function skyTexture() {
      var th = theme();
      var c = document.createElement('canvas');
      c.width = 8; c.height = 256;
      var g = c.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, th.bg[0]);
      grad.addColorStop(1, th.bg[1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, 8, 256);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function applyTheme() {
      matCache = {};
      scene.background = skyTexture();
      var th = theme();
      groundMat.color = new THREE.Color(th.bg[1]);
      groundMat.needsUpdate = true;
      grid.material.color = new THREE.Color(th.grid);
      cursorMat.color = new THREE.Color(th.spawn);
      rebuildAll();
      needsRender = true;
    }

    /* ============================================================
       Element geometry
       ============================================================ */
    function wedgeGeometry() {
      /* Unit ramp: rises along +z, 1 x 1 x 1. */
      var g = new THREE.BufferGeometry();
      var v = new Float32Array([
        /* slope */
        0, 0, 0,  1, 0, 0,  1, 1, 1,
        0, 0, 0,  1, 1, 1,  0, 1, 1,
        /* back wall (high side) */
        0, 1, 1,  1, 1, 1,  1, 0, 1,
        0, 1, 1,  1, 0, 1,  0, 0, 1,
        /* bottom */
        0, 0, 0,  0, 0, 1,  1, 0, 1,
        0, 0, 0,  1, 0, 1,  1, 0, 0,
        /* left side */
        0, 0, 0,  0, 1, 1,  0, 0, 1,
        /* right side */
        1, 0, 0,  1, 0, 1,  1, 1, 1
      ]);
      g.setAttribute('position', new THREE.BufferAttribute(v, 3));
      g.computeVertexNormals();
      g.translate(-0.5, 0, -0.5);
      return g;
    }
    var WEDGE = null;

    function buildMesh(cell) {
      var def = B.BY_ID[cell.t];
      if (!def) return null;
      var th = theme();
      var mat = materialFor(def);
      var group = new THREE.Group();
      var x = cell.x + 0.5, z = cell.y + 0.5, base = cell.z;

      function add(geo, material, px, py, pz) {
        var m = new THREE.Mesh(geo, material || mat);
        m.position.set(px, py, pz);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        return m;
      }

      if (def.shape === 'stairs') {
        var steps = 4;
        for (var s = 0; s < steps; s++) {
          var hgt = (s + 1) / steps;
          var depth = 1 / steps;
          var off = (s + 0.5) / steps - 0.5;
          var m = add(new THREE.BoxGeometry(1, hgt, depth), mat, x, base + hgt / 2, z + off);
          void m;
        }
      } else if (def.shape === 'ramp') {
        if (!WEDGE) WEDGE = wedgeGeometry();
        add(WEDGE, mat, x, base, z);
      } else if (def.shape === 'tree') {
        add(new THREE.CylinderGeometry(0.09, 0.13, 1.1, 8),
            new THREE.MeshLambertMaterial({ color: new THREE.Color(th.wood) }), x, base + 0.55, z);
        add(new THREE.IcosahedronGeometry(0.46, 0), mat, x, base + 1.4, z);
        add(new THREE.IcosahedronGeometry(0.3, 0), mat, x + 0.18, base + 1.05, z + 0.12);
      } else if (def.shape === 'bridge') {
        add(new THREE.BoxGeometry(1, 0.14, 0.7), mat, x, base + 0.58, z);
        var post = new THREE.BoxGeometry(0.12, 0.55, 0.12);
        add(post, mat, x - 0.4, base + 0.28, z - 0.28);
        add(post, mat, x + 0.4, base + 0.28, z + 0.28);
      } else if (def.shape === 'crate') {
        var box = add(new THREE.BoxGeometry(0.76, def.h, 0.76), mat, x, base + def.h / 2, z);
        var edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(box.geometry),
          new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
        );
        edges.position.copy(box.position);
        group.add(edges);
      } else if (def.shape === 'marker') {
        var colour = new THREE.Color(th[def.role]);
        var flat = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.4 });
        var pad = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.03, 0.96), flat);
        pad.position.set(x, base + 0.015, z);
        group.add(pad);
        var solid = new THREE.MeshLambertMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.35 });

        if (def.icon === 'spawn') {
          var pin = add(new THREE.ConeGeometry(0.26, 0.5, 12), solid, x, base + 0.55, z);
          pin.rotation.x = Math.PI;
          add(new THREE.SphereGeometry(0.16, 12, 10), solid, x, base + 0.86, z);
        } else if (def.icon === 'loot') {
          add(new THREE.BoxGeometry(0.6, 0.32, 0.44), solid, x, base + 0.16, z);
          add(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12, 1, false, 0, Math.PI), solid, x, base + 0.32, z)
            .rotation.z = Math.PI / 2;
        } else {
          add(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), solid, x - 0.18, base + 0.5, z);
          var flag = add(new THREE.BoxGeometry(0.5, 0.3, 0.03), solid, x + 0.07, base + 0.82, z);
          void flag;
        }
      } else {
        var inset = def.inset || 0;
        var w = 1 - inset * 2;
        add(new THREE.BoxGeometry(w, def.h, w), mat, x, base + def.h / 2, z);

        if (def.windows) {
          var winMat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(th.spawn),
            emissive: new THREE.Color(th.spawn),
            emissiveIntensity: 0.5
          });
          for (var r = 0; r < 4; r++) {
            var wy = base + 0.42 + r * (def.h - 0.7) / 3;
            add(new THREE.BoxGeometry(0.42, 0.18, 0.03), winMat, x, wy, z + 0.5 + 0.005);
            add(new THREE.BoxGeometry(0.03, 0.18, 0.42), winMat, x + 0.5 + 0.005, wy, z);
          }
        }
      }

      /* Water should not cast a hard shadow on itself. */
      if (def.id === 'water') {
        group.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
      }

      /* Rotation about the tile centre, for the shapes that support it. */
      if (def.rotates && cell.r) {
        group.position.set(x, 0, z);
        group.children.forEach(function (child) { child.position.sub(new THREE.Vector3(x, 0, z)); });
        group.rotation.y = -(cell.r % 4) * Math.PI / 2;
      }
      return group;
    }

    function addCell(cell) {
      var key = cell.x + ',' + cell.y + ',' + cell.z;
      removeCell(key);
      var m = buildMesh(cell);
      if (!m) return;
      meshes[key] = m;
      scene.add(m);
    }

    function removeCell(key) {
      var m = meshes[key];
      if (!m) return;
      scene.remove(m);
      m.traverse(function (o) {
        if (o.geometry && o.geometry !== WEDGE) o.geometry.dispose();
      });
      delete meshes[key];
    }

    function rebuildAll() {
      Object.keys(meshes).forEach(removeCell);
      Object.keys(state.cells).forEach(function (k) { addCell(state.cells[k]); });
    }

    /* ============================================================
       Editing
       ============================================================ */
    function inBounds(x, y) { return x >= 0 && y >= 0 && x < GRID && y < GRID; }

    function begin() { stroke = []; }
    function record(k, before, after) { if (stroke) stroke.push({ k: k, b: before, a: after }); }
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

    function place(x, y) {
      if (!inBounds(x, y)) return;
      var key = x + ',' + y + ',' + state.level;
      var before = state.cells[key] || null;
      var after = { x: x, y: y, z: state.level, t: state.tool, r: state.rot };
      if (before && before.t === after.t && before.r === after.r) return;
      state.cells[key] = after;
      record(key, before, after);
      addCell(after);
      needsRender = true;
    }

    function eraseAt(x, y, z) {
      var key = x + ',' + y + ',' + (z == null ? state.level : z);
      if (!state.cells[key]) {
        for (var i = LEVELS - 1; i >= 0; i--) {
          var k2 = x + ',' + y + ',' + i;
          if (state.cells[k2]) { key = k2; break; }
        }
      }
      var before = state.cells[key];
      if (!before) return;
      delete state.cells[key];
      record(key, before, null);
      removeCell(key);
      needsRender = true;
    }

    function undo() {
      if (hIndex < 0) return;
      history[hIndex].forEach(function (op) {
        if (op.b) { state.cells[op.k] = op.b; addCell(op.b); }
        else { delete state.cells[op.k]; removeCell(op.k); }
      });
      hIndex--;
      save(); refreshUI(); needsRender = true;
    }
    function redo() {
      if (hIndex >= history.length - 1) return;
      hIndex++;
      history[hIndex].forEach(function (op) {
        if (op.a) { state.cells[op.k] = op.a; addCell(op.a); }
        else { delete state.cells[op.k]; removeCell(op.k); }
      });
      save(); refreshUI(); needsRender = true;
    }
    function clearAll() {
      var keys = Object.keys(state.cells);
      if (!keys.length) return;
      begin();
      keys.forEach(function (k) {
        record(k, state.cells[k], null);
        delete state.cells[k];
        removeCell(k);
      });
      commit();
      needsRender = true;
    }

    /* -------------------------------------------------- storage */
    var saveTimer = null;
    function save() {
      global.clearTimeout(saveTimer);
      saveTimer = global.setTimeout(function () {
        try {
          var packed = Object.keys(state.cells).map(function (k) {
            var c = state.cells[k];
            return [c.x, c.y, c.z, c.t, c.r || 0];
          });
          localStorage.setItem(STORE, JSON.stringify({
            v: 1, name: state.name, theme: state.themeId, level: state.level, cells: packed
          }));
        } catch (e) { /* quota or private mode */ }
      }, 400);
    }
    function load() {
      var raw = null;
      try { raw = localStorage.getItem(STORE); } catch (e) { return; }
      if (!raw) return;
      var d;
      try { d = JSON.parse(raw); } catch (e) { return; }
      if (!d || !Array.isArray(d.cells)) return;
      state.name = d.name || '';
      if (B.THEMES[d.theme]) state.themeId = d.theme;
      state.level = Math.max(0, Math.min(LEVELS - 1, d.level || 0));
      d.cells.forEach(function (c) {
        if (!B.BY_ID[c[3]] || !inBounds(c[0], c[1])) return;
        if (c[2] < 0 || c[2] >= LEVELS) return;
        state.cells[c[0] + ',' + c[1] + ',' + c[2]] = { x: c[0], y: c[1], z: c[2], t: c[3], r: c[4] || 0 };
      });
    }

    /* ============================================================
       Picking
       ============================================================ */
    var raycaster = new THREE.Raycaster();
    var pointerNDC = new THREE.Vector2();
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var hit = new THREE.Vector3();

    function toNDC(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      pointerNDC.x = ((clientX - r.left) / r.width) * 2 - 1;
      pointerNDC.y = -((clientY - r.top) / r.height) * 2 + 1;
    }

    function pickCell(clientX, clientY) {
      toNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      plane.constant = -state.level;                 /* plane y = level */
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { x: Math.floor(hit.x), y: Math.floor(hit.z) };
    }

    function pickBlock(clientX, clientY) {
      toNDC(clientX, clientY);
      raycaster.setFromCamera(pointerNDC, camera);
      var list = [];
      Object.keys(meshes).forEach(function (k) { meshes[k].traverse(function (o) { if (o.isMesh) { o.userData.cellKey = k; list.push(o); } }); });
      var hits = raycaster.intersectObjects(list, false);
      return hits.length ? hits[0].object.userData.cellKey : null;
    }

    function updateCursor(clientX, clientY) {
      var c = pickCell(clientX, clientY);
      if (!c || !inBounds(c.x, c.y)) {
        cursor.visible = cursorEdge.visible = false;
        needsRender = true;
        return null;
      }
      cursor.position.set(c.x + 0.5, state.level + 0.01, c.y + 0.5);
      cursorEdge.position.copy(cursor.position);
      cursor.visible = cursorEdge.visible = true;
      needsRender = true;
      return c;
    }

    /* ============================================================
       Input
       ============================================================ */
    var pointers = {}, mode = null, last = null, painting = false, erasing = false;
    var pinchDist = 0, pinchRadius = 0, longPress = null, moved = false;

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    canvas.addEventListener('pointerdown', function (e) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      last = { x: e.clientX, y: e.clientY };
      moved = false;

      var ids = Object.keys(pointers);
      if (e.pointerType === 'touch' && ids.length === 2) {
        mode = 'pinch';
        painting = erasing = false;
        if (longPress) { global.clearTimeout(longPress); longPress = null; }
        var p = ids.map(function (k) { return pointers[k]; });
        pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pinchRadius = orbit.radius;
        return;
      }

      if (e.button === 2) {
        var key = pickBlock(e.clientX, e.clientY);
        begin();
        if (key) {
          var parts = key.split(',');
          eraseAt(+parts[0], +parts[1], +parts[2]);
        }
        commit();
        mode = 'orbit-right';
        return;
      }

      if (e.button === 1) { mode = 'pan'; return; }

      if (e.pointerType === 'touch') {
        longPress = global.setTimeout(function () {
          longPress = null;
          if (moved) return;
          painting = false;
          var k = pickBlock(e.clientX, e.clientY);
          begin();
          if (k) { var q = k.split(','); eraseAt(+q[0], +q[1], +q[2]); }
          commit();
        }, 480);
        mode = 'orbit';
        return;
      }

      if (state.eraser) {
        var kk = pickBlock(e.clientX, e.clientY);
        begin();
        if (kk) { var pp = kk.split(','); eraseAt(+pp[0], +pp[1], +pp[2]); }
        else { var cc = pickCell(e.clientX, e.clientY); if (cc) eraseAt(cc.x, cc.y); }
        commit();
        mode = 'orbit';
        return;
      }

      /* Left button: a click places, a drag orbits. Decided on move. */
      mode = 'maybe-place';
    });

    canvas.addEventListener('pointermove', function (e) {
      if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var dx = last ? e.clientX - last.x : 0;
      var dy = last ? e.clientY - last.y : 0;
      var ids = Object.keys(pointers);

      if (mode === 'pinch' && ids.length === 2) {
        var p = ids.map(function (k) { return pointers[k]; });
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDist > 0) orbit.radius = Math.max(8, Math.min(90, pinchRadius * (pinchDist / d)));
        applyCamera();
        last = { x: e.clientX, y: e.clientY };
        return;
      }

      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (moved && longPress) { global.clearTimeout(longPress); longPress = null; }

      if (mode === 'maybe-place' && moved) mode = 'orbit';

      if (mode === 'orbit' || mode === 'orbit-right') {
        orbit.theta -= dx * 0.006;
        orbit.phi -= dy * 0.006;
        applyCamera();
      } else if (mode === 'pan') {
        panBy(dx, dy);
      } else if (painting) {
        var c = updateCursor(e.clientX, e.clientY);
        if (c) place(c.x, c.y);
      } else {
        updateCursor(e.clientX, e.clientY);
      }
      last = { x: e.clientX, y: e.clientY };
    });

    function panBy(dx, dy) {
      var scale = orbit.radius * 0.0018;
      var right = new THREE.Vector3(Math.cos(orbit.theta), 0, -Math.sin(orbit.theta));
      var fwd = new THREE.Vector3(Math.sin(orbit.theta), 0, Math.cos(orbit.theta));
      orbit.target.addScaledVector(right, -dx * scale);
      orbit.target.addScaledVector(fwd, -dy * scale);
      applyCamera();
    }

    function endPointer(e) {
      if (longPress) { global.clearTimeout(longPress); longPress = null; }
      if (mode === 'maybe-place' && !moved) {
        var c = pickCell(e.clientX, e.clientY);
        if (c && inBounds(c.x, c.y)) { begin(); place(c.x, c.y); commit(); }
      }
      if (painting || erasing) commit();
      painting = erasing = false;
      delete pointers[e.pointerId];
      if (!Object.keys(pointers).length) { mode = null; last = null; pinchDist = 0; }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', function (e) {
      cursor.visible = cursorEdge.visible = false;
      needsRender = true;
      endPointer(e);
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      orbit.radius *= e.deltaY < 0 ? 0.9 : 1.11;
      applyCamera();
    }, { passive: false });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var modal = document.getElementById('modal');
      if (modal && !modal.hidden) return;
      var panel = document.getElementById('themePanel');
      if (panel && !panel.hidden) return;

      var k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        return;
      }
      if (k === 'r') { state.rot = (state.rot + 1) % 4; needsRender = true; return; }
      if (k === 'e') { state.eraser = !state.eraser; refreshUI(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setLevel(state.level + 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setLevel(state.level - 1); }
    });

    function setLevel(v) {
      state.level = Math.max(0, Math.min(LEVELS - 1, v));
      refreshUI();
      save();
      needsRender = true;
    }

    /* ============================================================
       UI wiring
       ============================================================ */
    var elCount = $('#builderCount'), elLevel = $('#builderLevel');
    var elUndo = $('#builderUndo'), elRedo = $('#builderRedo');
    var elName = $('#builderName'), elTheme = $('#builderTheme');
    var elEraser = $('#builderEraser'), elToast = $('#builderToast');

    function refreshUI() {
      if (elCount) elCount.textContent = String(Object.keys(state.cells).length);
      if (elLevel) elLevel.textContent = String(state.level + 1);
      if (elUndo) elUndo.disabled = hIndex < 0;
      if (elRedo) elRedo.disabled = hIndex >= history.length - 1;
      if (elEraser) elEraser.setAttribute('aria-pressed', String(state.eraser));
      $$('.tool').forEach(function (b) {
        var on = !state.eraser && b.getAttribute('data-el') === state.tool;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
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

    function buildPalette() {
      var host = $('#builderPalette');
      if (!host) return;
      host.innerHTML = '';
      B.CATEGORIES.forEach(function (cat) {
        var group = document.createElement('div');
        group.className = 'palette__group';

        var head = document.createElement('button');
        head.type = 'button';
        head.className = 'palette__head';
        head.setAttribute('aria-expanded', 'true');
        var lab = document.createElement('span');
        lab.setAttribute('data-i18n', 'builder.cat.' + cat);
        lab.textContent = t('builder.cat.' + cat);
        head.appendChild(lab);
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
          if (B.iconFor) btn.appendChild(B.iconFor(el.id, theme()));
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
          });
          body.appendChild(btn);
        });

        group.appendChild(head);
        group.appendChild(body);
        host.appendChild(group);
      });
      refreshUI();
    }

    function refreshIcons() {
      if (!B.iconFor) return;
      $$('.tool').forEach(function (btn) {
        var old = btn.querySelector('canvas');
        if (old) btn.replaceChild(B.iconFor(btn.getAttribute('data-el'), theme()), old);
      });
    }

    /* ============================================================
       Export
       ============================================================ */
    var logoImage = null;
    (function () {
      var img = new Image();
      img.onload = function () { logoImage = img; };
      img.onerror = function () { logoImage = null; };
      img.src = 'assets/logo.png';
    })();

    function topView() {
      orbit.theta = Math.PI * 0.25;
      orbit.phi = 0.09;
      orbit.radius = 40;
      orbit.target.set(GRID / 2, 0, GRID / 2);
      applyCamera();
    }

    function slug(v) {
      var s = String(v || '').toLowerCase();
      if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      return s || 'map';
    }

    function usedElements() {
      var seen = {}, out = [];
      Object.keys(state.cells).forEach(function (k) {
        var id = state.cells[k].t;
        if (!seen[id]) { seen[id] = 1; out.push(id); }
      });
      return out;
    }

    function exportPNG() {
      if (!Object.keys(state.cells).length) { toast(t('builder.exportEmpty')); return; }

      var w = canvas.clientWidth, h = canvas.clientHeight;
      var S = 2;

      /* Render the scene once at double resolution. */
      cursor.visible = cursorEdge.visible = false;
      var prevRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(S);
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);

      var used = usedElements();
      var perRow = 4;
      var rows = Math.ceil(used.length / perRow);
      var titleH = 112, legendH = 54 + rows * 34 + 26;
      var out = document.createElement('canvas');
      out.width = w * S;
      out.height = (h + titleH + legendH) * S;
      var g = out.getContext('2d');
      g.scale(S, S);

      var th = theme();
      var bg = g.createLinearGradient(0, 0, 0, h + titleH + legendH);
      bg.addColorStop(0, th.bg[0]);
      bg.addColorStop(1, th.bg[1]);
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h + titleH + legendH);

      var pad = 48;
      var name = (state.name || t('builder.projectPlaceholder')).trim();
      g.fillStyle = '#FFFFFF';
      g.font = '700 38px "Space Grotesk", system-ui, sans-serif';
      g.fillText(name, pad, 60);
      g.fillStyle = 'rgba(255,255,255,.72)';
      g.font = '600 16px Inter, system-ui, sans-serif';
      g.fillText(GRID + '×' + GRID + '  ·  ' + Object.keys(state.cells).length + ' ' + t('builder.blocks'), pad, 86);

      g.drawImage(renderer.domElement, 0, titleH, w, h);

      var ly = titleH + h + 30;
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.font = '700 13px "Space Grotesk", system-ui, sans-serif';
      g.fillText(t('builder.legend').toUpperCase(), pad, ly);
      ly += 24;
      var colW = (w - pad * 2) / perRow;
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

      /* watermark */
      var sy = h + titleH + legendH - 24;
      g.globalAlpha = .75;
      if (logoImage) {
        try { g.drawImage(logoImage, w - pad - 30, sy - 24, 30, 30); } catch (e) { /* tainted */ }
      }
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.font = '600 15px "Space Grotesk", system-ui, sans-serif';
      g.textAlign = 'right';
      g.fillText('DragonIQ.Studio', w - pad - (logoImage ? 40 : 0), sy - 4);
      g.textAlign = 'left';
      g.globalAlpha = 1;

      var url;
      try {
        url = out.toDataURL('image/png');
      } catch (err) {
        /* logo drawn from file:// taints the canvas: redo without it */
        logoImage = null;
        renderer.setPixelRatio(prevRatio);
        resize();
        return exportPNG();
      }

      renderer.setPixelRatio(prevRatio);
      resize();

      var a = document.createElement('a');
      a.href = url;
      a.download = 'map-' + slug(state.name) + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    /* ============================================================
       Loop and boot
       ============================================================ */
    var needsRender = true;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      needsRender = true;
    }

    function frame() {
      if (needsRender) { needsRender = false; renderer.render(scene, camera); }
      global.requestAnimationFrame(frame);
    }

    if (elName) {
      elName.addEventListener('input', function () { state.name = elName.value; save(); });
    }
    if (elTheme) {
      elTheme.addEventListener('change', function () {
        state.themeId = elTheme.value;
        applyTheme();
        refreshIcons();
        save();
      });
    }
    if (elUndo) elUndo.addEventListener('click', undo);
    if (elRedo) elRedo.addEventListener('click', redo);
    if (elEraser) elEraser.addEventListener('click', function () {
      state.eraser = !state.eraser;
      refreshUI();
    });
    var elRotate = $('#builderRotate');
    if (elRotate) elRotate.addEventListener('click', function () { state.rot = (state.rot + 1) % 4; });
    var elClear = $('#builderClear');
    if (elClear) elClear.addEventListener('click', function () {
      if (!Object.keys(state.cells).length) return;
      if (global.confirm(t('builder.clearConfirm'))) clearAll();
    });
    var elExport = $('#builderExport');
    if (elExport) elExport.addEventListener('click', exportPNG);
    var elTop = $('#builderTopView');
    if (elTop) elTop.addEventListener('click', topView);
    var up = $('#builderLevelUp'), down = $('#builderLevelDown');
    if (up) up.addEventListener('click', function () { setLevel(state.level + 1); });
    if (down) down.addEventListener('click', function () { setLevel(state.level - 1); });

    var paletteToggle = $('#builderPaletteToggle'), paletteWrap = $('#builderPaletteWrap');
    if (paletteToggle && paletteWrap) {
      paletteToggle.addEventListener('click', function () {
        var open = paletteWrap.classList.toggle('is-open');
        paletteToggle.setAttribute('aria-expanded', String(open));
      });
    }

    var notice = $('#builderNotice');
    if (notice && global.innerWidth < 760) notice.hidden = false;
    var dismiss = $('#builderNoticeClose');
    if (dismiss) dismiss.addEventListener('click', function () { notice.hidden = true; });

    load();
    if (elName) elName.value = state.name;
    if (elTheme) elTheme.value = state.themeId;
    buildPalette();
    applyTheme();
    applyCamera();

    if ('ResizeObserver' in global) new ResizeObserver(resize).observe(canvas.parentNode || canvas);
    global.addEventListener('resize', resize);
    resize();
    refreshUI();
    global.requestAnimationFrame(frame);

    /* Exposed for tests and for the console. These wrap the stroke
       lifecycle so a scripted call is one undoable step, unlike the raw
       internals the pointer handlers drive. */
    return {
      state: state, scene: scene, camera: camera, orbit: orbit,
      place: function (x, y) { begin(); place(x, y); commit(); },
      erase: function (x, y, z) { begin(); eraseAt(x, y, z); commit(); },
      undo: undo, redo: redo, clearAll: clearAll,
      topView: topView, exportPNG: exportPNG, applyTheme: applyTheme, meshCount: function () { return Object.keys(meshes).length; }
    };
  }

  /* ============================================================
     Boot

     three.js is fetched asynchronously with a deadline rather than
     through a blocking <script>: a CDN that is slow, blocked or down
     must never leave the page without a usable builder.
     ============================================================ */
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var THREE_TIMEOUT = 7000;

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

  function fallback2D() {
    if (B.start2D) B.start2D();
    var toast = document.getElementById('builderToast');
    if (toast) {
      toast.textContent = t('builder.no3d');
      toast.classList.add('is-on');
      global.setTimeout(function () { toast.classList.remove('is-on'); }, 5000);
    }
  }

  function boot() {
    var canvas = document.getElementById('builderCanvas');
    if (!canvas) return;

    loadThree(function (ok) {
      if (!ok) { fallback2D(); return; }
      try {
        global.DIQ_BUILDER3D = Editor(canvas);
      } catch (err) {
        if (global.console && console.error) console.error('builder3d:', err);
        fallback2D();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
