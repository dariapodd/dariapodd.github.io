// Floating low-poly rocks for the caveman page: flat-shaded faces, no texture.
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

  const rocks = [...document.querySelectorAll(".rock")].map(el => {
    const canvas = document.createElement("canvas");
    el.append(canvas);
    return {
      el, canvas, ctx: canvas.getContext("2d"),
      shape: rock(+el.dataset.seed || 1, +el.dataset.stretch || 1.5),
      tilt: (+el.dataset.tilt || 0) * Math.PI / 180,
      phase: (+el.dataset.seed || 0) % 7,
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
    for (const { f, k } of lit) {
      const col = STONE.map((v, i) => Math.round(SHADOW[i] + (v - SHADOW[i]) * k));
      ctx.fillStyle = ctx.strokeStyle = `rgb(${col})`;
      ctx.beginPath();
      f.forEach((i, j) => {
        const [x, y] = pts[i];
        j ? ctx.lineTo(c + x * scale, c - y * scale) : ctx.moveTo(c + x * scale, c - y * scale);
      });
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.6;   // hides hairline seams between faces
      ctx.stroke();
    }
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
  // First paint straight away, before any animation frame
  place();
  for (const r of rocks) draw(r, r.phase);
})();
