// Wireframe decor turning like the Earth (west to east, once a minute), seen from a little
// above the equator. Lines on the far side are drawn fainter. Pauses while off-screen.
//   .micro--sphere      globe: meridians and parallels
//   .micro--decahedron  pentagonal bipyramid with equilateral faces (10 triangles)
(() => {
  const INK = "155, 153, 138";    // #9b998a (Figma)
  const FRONT = 1, BACK = 0.3;    // line opacity on the near and far side
  const LINE = 1;                 // px
  const MERIDIANS = 16;           // every 22.5°
  const PARALLELS = [-67.5, -45, -22.5, 0, 22.5, 45, 67.5];
  const TILT = 12 * Math.PI / 180;   // view from above the equator
  const TURN = 2 * Math.PI / 60;     // radians per second: 360° a minute
  const STEPS = 64;                  // segments per circle

  const rad = (d) => d * Math.PI / 180;

  // Globe circles as point lists on the unit sphere (x right, y up, z towards the viewer)
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

  // Decahedron: five points on the equator (radius 1) and two apexes, so every face is
  // equilateral. Each edge keeps the outward normals of its two faces: it is on the near
  // side when either face looks towards the viewer.
  const APEX = Math.sqrt((2 * Math.sin(Math.PI / 5)) ** 2 - 1);
  const verts = [[0, APEX, 0], [0, -APEX, 0]];
  for (let i = 0; i < 5; i++) verts.push([Math.sin(i * 2 * Math.PI / 5), 0, Math.cos(i * 2 * Math.PI / 5)]);
  const edges = new Map();
  for (let i = 0; i < 5; i++) {
    const a = 2 + i, b = 2 + (i + 1) % 5;
    for (const apex of [0, 1]) {
      const [p, q, s] = [verts[apex], verts[a], verts[b]];
      const u = q.map((v, k) => v - p[k]), w = s.map((v, k) => v - p[k]);
      let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const centre = [0, 1, 2].map(k => p[k] + q[k] + s[k]);
      if (n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2] < 0) n = n.map(v => -v);
      for (const [x, y] of [[apex, a], [apex, b], [a, b]]) {
        const key = Math.min(x, y) + "-" + Math.max(x, y);
        if (!edges.has(key)) edges.set(key, { from: verts[x], to: verts[y], normals: [] });
        edges.get(key).normals.push(n);
      }
    }
  }

  for (const host of document.querySelectorAll(".micro--sphere, .micro--decahedron")) {
    const solid = host.classList.contains("micro--decahedron");
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

      // Far side first, then near side on top
      for (const front of [false, true]) {
        ctx.strokeStyle = `rgba(${INK}, ${front ? FRONT : BACK})`;
        ctx.beginPath();
        if (solid) {
          for (const e of edges.values()) {
            if (e.normals.some(n => turn(n)[2] > 0) !== front) continue;
            const a = project(e.from), b = project(e.to);
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
          }
        } else {
          for (const pts of circles) {
            let prev = project(pts[0]);
            for (let i = 1; i < pts.length; i++) {
              const p = project(pts[i]);
              if ((p[2] + prev[2] >= 0) === front) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
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
