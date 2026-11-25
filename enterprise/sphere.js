// Wireframe decor turning like the Earth (west to east, once a minute), seen from a little
// above the equator. Lines on the far side are drawn fainter. Pauses while off-screen.
//   .micro--sphere                      globe: meridians and parallels
//   .micro--solid[data-shape="…"]       low-poly solids, one per project:
//     diamond   gem like the Sketch logo: flat top, crown, pointed base (retail)
//     cross     health cross (government/health portal)
//     book      open book (translation workbench)
//     cap       graduation cap (education)
//     temple    portico with columns and pediment (government)
//     sparkle   four-pointed AI sparkle (Figma & AI enablement)
//     tesseract cube within a cube (spatial digital twin)
//     hand      open hand, palm to the viewer (Deaf community)
(() => {
  // Line colour: #9b998a (Figma), or the page's --micro-ink ("r, g, b") where a style sets one
  const INK = getComputedStyle(document.documentElement).getPropertyValue("--micro-ink").trim() || "155, 153, 138";
  const FRONT = 1, BACK = 0.3;    // line opacity on the near and far side
  const LINE = 1;                 // px
  const MERIDIANS = 16;           // every 22.5°
  const PARALLELS = [-67.5, -45, -22.5, 0, 22.5, 45, 67.5];
  const TILT = 12 * Math.PI / 180;   // view from above the equator
  const TURN = 2 * Math.PI / 60;     // radians per second: 360° a minute
  const STEPS = 64;                  // segments per circle

  const rad = (d) => d * Math.PI / 180;

  // ---------- Globe: circles as point lists on the unit sphere (x right, y up, z to the viewer)
  const circles = [];
  for (let m = 0; m < MERIDIANS; m++) {
    const lon = (m / MERIDIANS) * 2 * Math.PI, pts = [];
    for (let i = 0; i <= STEPS / 2; i++) {
      const lat = -Math.PI / 2 + (i / (STEPS / 2)) * Math.PI;
      pts.push([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]);
    }
    circles.push(pts);
  }
  for (const latDeg of PARALLELS) {
    const lat = rad(latDeg), pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 2 * Math.PI;
      pts.push([Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]);
    }
    circles.push(pts);
  }

  // ---------- Solids: faces with outward normals, plus loose lines
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, s) => a.map(v => v * s);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mean = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
  const rotX = (a) => ([x, y, z]) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const rotY = (a) => ([x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  const rotZ = (a) => ([x, y, z]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];

  // A face's normal (Newell's method, fine for concave outlines), flipped to agree with `hint`
  function face(pts, hint) {
    const n = [0, 0, 0];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      n[0] += (p[1] - q[1]) * (p[2] + q[2]);
      n[1] += (p[2] - q[2]) * (p[0] + q[0]);
      n[2] += (p[0] - q[0]) * (p[1] + q[1]);
    });
    return { pts, n: dot(n, hint) < 0 ? mul(n, -1) : n };
  }
  // A convex part: every face points away from the part's centre
  const convex = (polys) => {
    const c = mean(polys.flat());
    return polys.map(p => face(p, sub(mean(p), c)));
  };
  // Move faces: rotate points and normals, then shift points
  const place = (faces, rot = (v) => v, shift = [0, 0, 0]) =>
    faces.map(f => ({ pts: f.pts.map(p => add(rot(p), shift)), n: rot(f.n) }));
  // Ring of points around the y axis
  const ring = (sides, radius, y, offset = 0) => Array.from({ length: sides }, (_, i) => {
    const a = (i + offset) * 2 * Math.PI / sides;
    return [radius * Math.sin(a), y, radius * Math.cos(a)];
  });
  // Box between corners
  const box = ([x0, y0, z0], [x1, y1, z1]) => {
    const v = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
    return convex([[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]
      .map(q => q.map(v)));
  };
  // Prism along y between two rings (a frustum when the radii differ)
  const frustum = (sides, r0, y0, r1, y1, offset = 0) => {
    const a = ring(sides, r0, y0, offset), b = ring(sides, r1, y1, offset);
    return convex([a, b, ...a.map((p, i) => [p, a[(i + 1) % sides], b[(i + 1) % sides], b[i]])]);
  };
  // Flat outline in the xy plane, extruded from z0 to z1
  const extrude = (outline, z0, z1) => {
    let poly = outline;
    const area = poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
    if (area < 0) poly = [...poly].reverse();
    const lo = poly.map(([x, y]) => [x, y, z0]), hi = poly.map(([x, y]) => [x, y, z1]);
    const faces = [face(hi, [0, 0, 1]), face(lo, [0, 0, -1])];
    poly.forEach((p, i) => {
      const j = (i + 1) % poly.length, q = poly[j];
      faces.push(face([lo[i], lo[j], hi[j], hi[i]], [q[1] - p[1], p[0] - q[0], 0]));
    });
    return faces;
  };
  // Square-section segment from centre b to centre t (both in the xy plane), half-widths w0 → w1
  const segment = (b, t, w0, w1, depth = 0.85) => {
    const d = sub(t, b), len = Math.hypot(d[0], d[1]), u = [d[1] / len, -d[0] / len, 0];
    const square = (c, w) => [[-1, -1], [1, -1], [1, 1], [-1, 1]]
      .map(([s, k]) => add(add(c, mul(u, s * w)), [0, 0, k * w * depth]));
    const B = square(b, w0), T = square(t, w1);
    return convex([B, T, ...B.map((p, i) => [p, B[(i + 1) % 4], T[(i + 1) % 4], T[i]])]);
  };

  const SHAPES = {
    diamond() {
      // Six-sided table on top, a crown of triangles alternating up and down to the wider
      // girdle, and a pavilion meeting at the point below
      const SIDES = 6, table = ring(SIDES, 0.55, 0.55, 0.5), girdle = ring(SIDES, 1, 0.25), point = [0, -0.65, 0];
      const polys = [table];
      for (let i = 0; i < SIDES; i++) {
        const j = (i + 1) % SIDES;
        polys.push([girdle[i], girdle[j], table[i]], [table[i], table[j], girdle[j]], [girdle[i], girdle[j], point]);
      }
      return { faces: convex(polys) };
    },
    cross() {
      const a = 0.32, L = 1;
      return { faces: extrude([[a, -L], [a, -a], [L, -a], [L, a], [a, a], [a, L], [-a, L], [-a, a], [-L, a], [-L, -a], [-a, -a], [-a, -L]], -0.3, 0.3) };
    },
    book() {
      // Open book, spine running front to back: each half is a block of pages whose top curves
      // up from the spine and flattens out, on a thin cover
      const profile = [[0, 0], [1, 0], [1, 0.2], [0.75, 0.27], [0.45, 0.28], [0.2, 0.22], [0.06, 0.1]];
      const pages = place(extrude(profile, -0.68, 0.68), undefined, [0, 0.03, 0]);
      const cover = box([0, -0.03, -0.74], [1.06, 0.03, 0.74]);
      const half = [...pages, ...cover];
      // Tipped 50° about x so the pages face the viewer more
      return { faces: place([
        ...place(half, rotZ(rad(8))),
        ...place(half, (v) => rotZ(rad(-8))([-v[0], v[1], v[2]])),   // mirrored
      ], rotX(rad(50))) };
    },
    cap() {
      // Square board on an eight-sided cap, with a tassel off one corner
      const board = box([-0.85, -0.03, -0.85], [0.85, 0.03, 0.85]);
      return {
        faces: [...place(board, rotY(rad(45))), ...frustum(8, 0.48, -0.03, 0.42, -0.42, 0.5)],
        lines: [[[0, 0.03, 0], [0, 0.03, 1.2]], [[0, 0.03, 1.2], [0, -0.45, 1.2]]],
      };
    },
    temple() {
      const faces = [
        ...box([-1, -0.78, -0.48], [1, -0.66, 0.48]),         // base
        ...box([-0.9, -0.66, -0.4], [0.9, -0.58, 0.4]),       // step
        ...box([-0.92, 0.28, -0.4], [0.92, 0.4, 0.4]),        // entablature
        ...extrude([[-0.98, 0.4], [0.98, 0.4], [0, 0.78]], -0.4, 0.4),   // pediment
      ];
      for (const x of [-0.66, -0.22, 0.22, 0.66]) faces.push(...place(frustum(6, 0.1, -0.58, 0.085, 0.28), undefined, [x, 0, 0.12]));
      return { faces };
    },
    sparkle() {
      // Four-pointed star, its outline pulled out to a point in front and behind,
      // with a second, small star to the south-east
      const w = 0.22, faces = [];
      const star = (cx, cy, s) => {
        const outline = [[0, 1], [-w, w], [-1, 0], [-w, -w], [0, -1], [w, -w], [1, 0], [w, w]]
          .map(([x, y]) => [cx + x * s, cy + y * s]);
        const front = [cx, cy, 0.3 * s], back = [cx, cy, -0.3 * s];
        outline.forEach((p, i) => {
          const q = outline[(i + 1) % outline.length], out = [q[1] - p[1], p[0] - q[0]];
          const P = [p[0], p[1], 0], Q = [q[0], q[1], 0];
          faces.push(face([P, Q, front], [out[0], out[1], 1]), face([Q, P, back], [out[0], out[1], -1]));
        });
      };
      star(0, 0, 1);
      star(0.82, -0.82, 0.36);
      return { faces };
    },
    tesseract() {
      // Two nested cubes joined corner to corner. Each cube is solid for visibility (an edge is
      // near when one of its faces looks at the viewer, so the outline always stays bright);
      // a joining line takes the faces of the outer corner it starts from.
      const corner = (s, i) => [i & 1 ? s : -s, i & 2 ? s : -s, i & 4 ? s : -s];
      const lines = [];
      for (let i = 0; i < 8; i++) {
        const [x, y, z] = corner(1, i);
        lines.push([corner(1, i), corner(0.45, i), [[x, 0, 0], [0, y, 0], [0, 0, z]]]);
      }
      return { faces: [...box([-1, -1, -1], [1, 1, 1]), ...box([-0.45, -0.45, -0.45], [0.45, 0.45, 0.45])], lines };
    },
    hand() {
      // Open hand, palm to the viewer, thumb out to the right. Fingers are square-section
      // segments with a small gap at each knuckle.
      const faces = [...extrude([[-0.4, -0.6], [0.34, -0.6], [0.46, -0.08], [0.45, 0.42], [-0.45, 0.42], [-0.47, -0.15]], -0.13, 0.13)];
      const fingers = [   // base x, length, lean (degrees, + leans left)
        [-0.335, 0.6, 9], [-0.11, 0.8, 3], [0.115, 0.86, -1], [0.34, 0.76, -6],
      ];
      for (const [x, len, lean] of fingers) {
        const dir = [-Math.sin(rad(lean)), Math.cos(rad(lean)), 0];
        let at = [x, 0.45, 0], w = 0.1;
        for (const part of [0.45, 0.32, 0.23]) {
          const to = add(at, mul(dir, len * part - 0.025)), w1 = w * 0.88;
          faces.push(...segment(at, to, w, w1));
          at = add(to, mul(dir, 0.025));
          w = w1;
        }
      }
      // Thumb: rooted in the lower palm, curving up and out to the right
      let at = [0.26, -0.45, 0.06], w = 0.12;
      for (const [len, angle] of [[0.36, 42], [0.28, 30], [0.2, 18]]) {
        const to = add(at, mul([Math.sin(rad(angle)), Math.cos(rad(angle)), 0], len)), w1 = w * 0.85;
        faces.push(...place(segment([0, 0, 0], sub(to, at), w, w1), undefined, at));
        at = add(to, mul([Math.sin(rad(angle)), Math.cos(rad(angle)), 0], 0.025));
        w = w1;
      }
      return { faces };
    },
  };

  // Turn a shape into edges (each with the normals of the faces that share it) and loose lines,
  // centred and scaled to fit the unit sphere so it never leaves its box while turning
  function build(name) {
    const { faces, lines = [] } = SHAPES[name]();
    const all = [...faces.flatMap(f => f.pts), ...lines.flatMap(([a, b]) => [a, b])];
    const lo = [0, 1, 2].map(k => Math.min(...all.map(p => p[k])));
    const hi = [0, 1, 2].map(k => Math.max(...all.map(p => p[k])));
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const s = 1 / Math.max(...all.map(p => Math.hypot(...sub(p, c))));
    const fit = (p) => mul(sub(p, c), s);
    const edges = new Map();
    for (const f of faces) {
      f.pts.forEach((a, i) => {
        const b = f.pts[(i + 1) % f.pts.length];
        const key = [a, b].map(v => v.map(x => x.toFixed(4)).join()).sort().join("|");
        if (!edges.has(key)) edges.set(key, { from: fit(a), to: fit(b), normals: [] });
        edges.get(key).normals.push(f.n);
      });
    }
    // A loose line that brings its own face normals is judged like an edge
    for (const [a, b, normals] of lines) if (normals) edges.set(`line${edges.size}`, { from: fit(a), to: fit(b), normals });
    return {
      edges: [...edges.values()],
      lines: lines.filter(l => !l[2]).map(([a, b]) => ({ from: fit(a), to: fit(b) })),
    };
  }

  for (const host of document.querySelectorAll(".micro--sphere, .micro--solid")) {
    const solid = host.classList.contains("micro--solid") && SHAPES[host.dataset.shape] ? build(host.dataset.shape) : null;
    const canvas = document.createElement("canvas");
    host.append(canvas);
    const ctx = canvas.getContext("2d");
    let angle = 0, last = 0, visible = true, running = false;

    function frame(now) {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      angle = (angle + dt * TURN) % (2 * Math.PI);

      const dpr = Math.min(devicePixelRatio || 1, 2);
      const size = host.clientWidth;
      if (!size) { running = false; return; }
      if (canvas.width !== Math.round(size * dpr)) canvas.width = canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineWidth = LINE;
      ctx.lineJoin = "round";
      const r = size / 2 - LINE, c = size / 2;
      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(TILT), st = Math.sin(TILT);

      // Spin about the axis, then tilt towards the viewer
      const turn = ([x, y, z]) => {
        const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
        return [x1, y * ct - z1 * st, y * st + z1 * ct];
      };
      // Screen x, y and depth
      const project = (v) => {
        const [x, y, z] = turn(v);
        return [c + x * r, c - y * r, z];
      };
      const segment = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };

      // Far side first, then near side on top
      for (const front of [false, true]) {
        ctx.strokeStyle = `rgba(${INK}, ${front ? FRONT : BACK})`;
        ctx.beginPath();
        if (solid) {
          // An edge is on the near side when any face it belongs to looks at the viewer
          for (const e of solid.edges) {
            if (e.normals.some(n => turn(n)[2] > 0) === front) segment(project(e.from), project(e.to));
          }
          // Loose lines: by the depth of their middle
          for (const l of solid.lines) {
            const a = project(l.from), b = project(l.to);
            if ((a[2] + b[2] >= 0) === front) segment(a, b);
          }
        } else {
          for (const pts of circles) {
            let prev = project(pts[0]);
            for (let i = 1; i < pts.length; i++) {
              const p = project(pts[i]);
              if ((p[2] + prev[2] >= 0) === front) segment(prev, p);
              prev = p;
            }
          }
        }
        ctx.stroke();
      }
      // Globe outline
      if (!solid) {
        ctx.strokeStyle = `rgba(${INK}, ${FRONT})`;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      if (visible) requestAnimationFrame(frame);
      else running = false;
    }
    function start() {
      if (running) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(host);
    addEventListener("resize", start);
  }
})();
