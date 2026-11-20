// Floating low-poly stone tools for the caveman page: faceted, with a sand texture on each face.
// Each .rock element gets a canvas. The rock turns slowly and drifts with the scroll faster
// than the page (parallax), as if it floats in a layer nearer to the viewer.
//   data-seed    shape (same seed, same rock)
//   data-tilt    in-plane angle in degrees (Figma rotation)
//   data-shape   point or foliate (stone tool shapes)
//   data-drag    drag over the rock to turn it (yaw and pitch)
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

  // Knapped stone tool, built as rings of points from the base to the tip, every point nudged
  // at random so the faces read as flake scars.
  //   point    (Palaeolithic point) narrow, sharp tip, ridged front, flatter back
  //   foliate  (foliate point) leaf-shaped, thin, lens-shaped cross-section, rounded base
  function tool(seed, kind) {
    const rand = rng(seed);
    const jit = (a) => (rand() - 0.5) * 2 * a;
    const foliate = kind === "foliate";
    const ROWS = foliate ? 9 : 8;
    // Half-width along the length (t: 0 base, 1 tip)
    const width = foliate
      ? (t) => 0.62 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.5) * (1 - 0.5 * t)
      : (t) => 0.46 * Math.pow(Math.sin(Math.PI * (0.18 + 0.82 * t)), 0.9) * (1 - 0.35 * t);
    // Thickness, front and back, as a share of the width
    const front = foliate ? 0.32 : 0.62, back = foliate ? 0.3 : 0.2;
    // Cross-section: sharp edges at the sides, a ridge down the front
    const ring = [[1, 0], [0.5, 0.82], [0, 1], [-0.5, 0.82], [-1, 0], [-0.5, -0.82], [0, -1], [0.5, -0.82]];
    const verts = [], rows = [];
    for (let r = 1; r < ROWS; r++) {
      const t = r / ROWS, y = -1 + 2 * t, w = width(t), row = [];
      for (const [cx, cz] of ring) {
        const thick = cz >= 0 ? front : back;
        row.push(verts.length);
        verts.push([cx * w * (1 + jit(0.12)), y + jit(0.06), cz * w * thick * (1 + jit(0.3))]);
      }
      rows.push(row);
    }
    const base = verts.push([jit(0.05), -1, jit(0.03)]) - 1;
    const tip = verts.push([jit(0.03), 1.04, 0]) - 1;
    const faces = [];
    const n = ring.length;
    for (let r = 0; r + 1 < rows.length; r++) {
      for (let i = 0; i < n; i++) {
        const a = rows[r][i], b = rows[r][(i + 1) % n], c = rows[r + 1][(i + 1) % n], d = rows[r + 1][i];
        // Split each quad along a random diagonal: less regular, more like chipped stone
        if (rand() < 0.5) faces.push([a, b, c], [a, c, d]); else faces.push([a, b, d], [b, c, d]);
      }
    }
    for (let i = 0; i < n; i++) {
      faces.push([base, rows[0][(i + 1) % n], rows[0][i]]);
      faces.push([tip, rows[rows.length - 1][i], rows[rows.length - 1][(i + 1) % n]]);
    }
    // Wind every face outward (away from the long axis), so the far side can be skipped
    for (const f of faces) {
      const [p, q, s] = f.map(i => verts[i]);
      const nrm = cross(sub(q, p), sub(s, p));
      const mid = [(p[0] + q[0] + s[0]) / 3, 0, (p[2] + q[2] + s[2]) / 3];
      const yMid = (p[1] + q[1] + s[1]) / 3;
      const out = Math.abs(mid[0]) + Math.abs(mid[2]) < 1e-3 ? [0, Math.sign(yMid), 0] : mid;
      if (dot(nrm, out) < 0) f.reverse();
    }
    // Fit inside the unit circle whatever way it turns
    const r = Math.max(...verts.map(v => Math.hypot(...v)));
    return { verts: verts.map(v => v.map(x => x / r)), faces };
  }

  // Sand texture (photo: paulo costa, Unsplash). Each face takes the patch of the photo
  // under it, projected flat along the axis it faces most, so it isn't stretched.
  // data-texture picks another photo (same 576×768 size), e.g. red sandstone by Matt Artz, Unsplash
  const here = document.currentScript.src, textures = new Map();
  function texture(name) {
    const src = new URL(`assets/${name || "rock-texture.jpg"}`, here).href;
    if (!textures.has(src)) { const img = new Image(); img.src = src; textures.set(src, img); }
    return textures.get(src);
  }
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
    const seed = +el.dataset.seed || 1, shape = tool(seed, el.dataset.shape);
    return {
      el, canvas, ctx: canvas.getContext("2d"), shape,
      uv: faceUVs(shape, seed),
      texture: texture(el.dataset.texture),
      tilt: (+el.dataset.tilt || 0) * Math.PI / 180,
      phase: seed % 7,
      yaw: 0, pitch: 0,              // added by dragging
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
    const tip = 0.35 + r.pitch;                                // tipped a little towards the viewer
    const cb = Math.cos(tip), sb = Math.sin(tip);
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
    const TEXTURE = r.texture, textured = TEXTURE.complete && TEXTURE.naturalWidth > 0;
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
    for (const r of rocks) if (r.visible) draw(r, r.phase + r.yaw + time * TURN);
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
  addEventListener("resize", () => { for (const r of rocks) draw(r, r.phase + r.yaw + time * TURN); place(); start(); });

  // Drag to turn: press over a data-drag rock (its box, a little enlarged) and move. The rock
  // ignores the pointer itself, so the page listens; links and buttons keep their clicks.
  const DRAG_RAD_PER_PX = 0.01;
  let held = null;
  const rockAt = (e) => rocks.find(r => {
    if (!("drag" in r.el.dataset) || e.target.closest("a, button, [tabindex], .style-menu, .welcome")) return false;
    const b = r.el.getBoundingClientRect(), pad = 24;
    return b.width && e.clientX >= b.left - pad && e.clientX <= b.right + pad && e.clientY >= b.top - pad && e.clientY <= b.bottom + pad;
  });
  addEventListener("pointermove", (e) => {
    if (held) {
      held.rock.yaw += (e.clientX - held.x) * DRAG_RAD_PER_PX;
      held.rock.pitch = Math.max(-1.2, Math.min(1.2, held.rock.pitch + (e.clientY - held.y) * DRAG_RAD_PER_PX));
      held.x = e.clientX; held.y = e.clientY;
      draw(held.rock, held.rock.phase + held.rock.yaw + time * TURN);
      start();
    } else if (e.pointerType !== "touch") {
      document.documentElement.classList.toggle("is-rock-grab", !!rockAt(e));
    }
  });
  addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    const rock = rockAt(e);
    if (!rock) return;
    e.preventDefault();   // no text selection while turning
    held = { rock, x: e.clientX, y: e.clientY };
    document.documentElement.classList.add("is-rock-dragging");
  });
  const letGo = () => { held = null; document.documentElement.classList.remove("is-rock-dragging"); };
  addEventListener("pointerup", letGo);
  addEventListener("pointercancel", letGo);
  still.addEventListener("change", start);
  // First paint straight away, before any animation frame; again once the texture arrives
  place();
  for (const r of rocks) draw(r, r.phase);
  for (const r of rocks) r.texture.addEventListener("load", () => draw(r, r.phase + r.yaw + time * TURN));
})();
