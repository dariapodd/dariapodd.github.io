// Floating low-poly rocks for the caveman page: faceted, with a sand texture on each face.
// Each .rock element gets a canvas. The rock turns slowly and drifts with the scroll faster
// than the page (parallax), as if it floats in a layer nearer to the viewer.
//   data-seed    shape (same seed, same rock)
//   data-tilt    in-plane angle in degrees (Figma rotation)
//   data-stretch how much longer than wide
(() => {
  const PARALLAX = 0.25;            // extra drift per px from the viewport centre
  const TURN = 2 * Math.PI / 120;   // radians per second: one slow turn every 2 minutes
  const STONE = [148, 128, 104];    // warm grey-brown, lit
  const SHADOW = [46, 40, 34];      // colour of faces turned fully away from the light
  const LIGHT = norm([-0.45, 0.7, 0.55]);   // from the top left, in front
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // Icosahedron, split once (80 faces), corners pushed in and out at random, then stretched:
  // a chunky, faceted stone
  function rock(seed, stretch) {
    const rand = rng(seed);
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2],
      [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11],
      [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const mid = new Map();
    const middle = (a, b) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!mid.has(key)) { verts.push(norm(verts[a].map((v, k) => v + verts[b][k]))); mid.set(key, verts.length - 1); }
      return mid.get(key);
    };
    faces = faces.flatMap(([a, b, c]) => {
      const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
    // A few big flat cuts make it read as split stone rather than a lumpy ball
    const cuts = Array.from({ length: 4 }, () => ({ n: norm([rand() - 0.5, rand() - 0.5, rand() - 0.5]), d: 0.55 + rand() * 0.25 }));
    verts = verts.map(v => {
      let p = v.map(x => x * (0.86 + rand() * 0.26));
      for (const { n, d } of cuts) {
        const over = dot(p, n) - d;
        if (over > 0) p = p.map((x, k) => x - n[k] * over);
      }
      return [p[0] * 0.62, p[1] * 0.62 * stretch, p[2] * 0.5];
    });
    // Fit inside the unit circle whatever way it turns
    const r = Math.max(...verts.map(v => Math.hypot(...v)));
    return { verts: verts.map(v => v.map(x => x / r)), faces };
  }

  // Sand texture (photo: paulo costa, Unsplash). Each face takes the patch of the photo
  // under it, projected flat along the axis it faces most, so it isn't stretched.
  const TEXTURE = new Image();
  TEXTURE.src = new URL("assets/rock-texture.jpg", document.currentScript.src).href;
  function faceUVs(shape, seed) {
    const W = 576, H = 768, s = Math.min(W, H) * 0.45;   // texture size; how much of it a rock spans
    const shift = [[0.5, 0.5], [0.35, 0.6], [0.6, 0.4]].map(([a, b]) => [a * W + (seed % 5) * 9, b * H - (seed % 3) * 11]);
    const map = new Map();
    for (const f of shape.faces) {
      const [a, b, d] = f.map(i => shape.verts[i]);
      const n = cross(sub(b, a), sub(d, a)).map(Math.abs);
      const axis = n.indexOf(Math.max(...n));                 // 0: x, 1: y, 2: z
      const [i, j] = [[1, 2], [0, 2], [0, 1]][axis];
      map.set(f, f.map(k => { const v = shape.verts[k]; return [shift[axis][0] + v[i] * s, shift[axis][1] - v[j] * s]; }));
    }
    return map;
  }

  const rocks = [...document.querySelectorAll(".rock")].map(el => {
    const canvas = document.createElement("canvas");
    el.append(canvas);
    const seed = +el.dataset.seed || 1, shape = rock(seed, +el.dataset.stretch || 1.5);
    return {
      el, canvas, ctx: canvas.getContext("2d"), shape,
      uv: faceUVs(shape, seed),
      tilt: (+el.dataset.tilt || 0) * Math.PI / 180,
      phase: seed % 7,
      visible: true,
    };
  });
  if (!rocks.length) return;

  function draw(r, angle) {
    const size = r.el.clientWidth;
    if (!size) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (r.canvas.width !== Math.round(size * dpr)) r.canvas.width = r.canvas.height = Math.round(size * dpr);
    const { ctx } = r;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2, scale = size / 2 - 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);          // turn about the rock's long axis
    const cb = Math.cos(0.35), sb = Math.sin(0.35);            // tipped a little towards the viewer
    const ct = Math.cos(r.tilt), st = Math.sin(r.tilt);        // then leaned in the picture plane
    const pts = r.shape.verts.map(([x, y, z]) => {
      let x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      let y1 = y * cb - z1 * sb; z1 = y * sb + z1 * cb;
      return [x1 * ct - y1 * st, x1 * st + y1 * ct, z1];
    });
    const lit = [];
    for (const f of r.shape.faces) {
      const [a, b, d] = f.map(i => pts[i]);
      const n = norm(cross(sub(b, a), sub(d, a)));
      if (n[2] <= 0) continue;                                   // facing away
      const k = Math.max(0, dot(n, LIGHT));
      lit.push({ f, z: a[2] + b[2] + d[2], k: 0.18 + 0.82 * k });
    }
    lit.sort((p, q) => p.z - q.z);                               // far faces first
    const textured = TEXTURE.complete && TEXTURE.naturalWidth > 0;
    for (const { f, k } of lit) {
      const scr = f.map(i => [c + pts[i][0] * scale, c - pts[i][1] * scale]);
      const path = (grow) => {
        // Grown a little from its middle so neighbouring faces overlap: no hairline seams
        const mx = (scr[0][0] + scr[1][0] + scr[2][0]) / 3, my = (scr[0][1] + scr[1][1] + scr[2][1]) / 3;
        ctx.beginPath();
        scr.forEach(([x, y], j) => {
          const dx = x - mx, dy = y - my, l = Math.hypot(dx, dy) || 1;
          const px = x + dx / l * grow, py = y + dy / l * grow;
          j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.closePath();
      };
      if (textured) {
        // Texture: the face's patch of the photo, mapped onto the face as it turns
        const uv = r.uv.get(f);
        ctx.save();
        path(0.6);
        ctx.clip();
        ctx.transform(...affine(uv, scr));
        ctx.drawImage(TEXTURE, 0, 0);
        ctx.restore();
        // Light: darken faces turned from the light
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = `rgba(${SHADOW}, ${((1 - k) * 0.85).toFixed(3)})`;
        path(0.6);
        ctx.fill();
      } else {
        const col = STONE.map((v, i) => Math.round(SHADOW[i] + (v - SHADOW[i]) * k));
        ctx.fillStyle = `rgb(${col})`;
        path(0.6);
        ctx.fill();
      }
    }
  }

  // Matrix taking texture points (u, v) to screen points (x, y) for one triangle
  function affine([[u0, v0], [u1, v1], [u2, v2]], [[x0, y0], [x1, y1], [x2, y2]]) {
    const det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1) || 1e-6;
    return [
      (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det,
      (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det,
      (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / det,
      (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / det,
      (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / det,
      (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / det,
    ];
  }

  // Parallax: offset from where the rock sits in the page, so it moves faster than the content
  function place() {
    const mid = innerHeight / 2;
    for (const r of rocks) {
      if (still.matches) { r.el.style.transform = ""; continue; }
      const box = r.el.parentElement.getBoundingClientRect();
      const centre = box.top + r.el.offsetTop + r.el.offsetHeight / 2;
      r.el.style.transform = `translateY(${((centre - mid) * PARALLAX).toFixed(1)}px)`;
    }
  }

  let time = 0, last = 0, running = false;
  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!still.matches) time += dt;
    place();
    for (const r of rocks) if (r.visible) draw(r, r.phase + time * TURN);
    if (rocks.some(r => r.visible) && !still.matches) requestAnimationFrame(frame);
    else running = false;
  }
  function start() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) rocks.find(r => r.el === e.target).visible = e.isIntersecting;
    start();
  }, { rootMargin: "300px 0px" });
  rocks.forEach(r => io.observe(r.el));
  addEventListener("scroll", () => { place(); start(); }, { passive: true });
  addEventListener("resize", () => { for (const r of rocks) draw(r, r.phase + time * TURN); place(); start(); });
  still.addEventListener("change", start);
  // First paint straight away, before any animation frame; again once the texture arrives
  place();
  for (const r of rocks) draw(r, r.phase);
  TEXTURE.addEventListener("load", () => { for (const r of rocks) draw(r, r.phase + time * TURN); });
})();
