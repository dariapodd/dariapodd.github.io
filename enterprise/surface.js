// Project micrographic: a wireframe surface drawn with WebGL. Hovering a cell of the
// surface slowly fills it with the accent teal; it fades back out when the pointer leaves.
// Each `.micro--surface` element is sized in % of its project block, so the whole
// graphic scales with it.
(() => {
  const VIEW_W = 663;   // Figma size of the graphic
  const VIEW_H = 330;
  const INK = [221, 220, 200];     // #dddcc8, wireframe lines
  const INK_ALPHA = 0.75;
  const TEAL = [0, 255, 204];      // #00ffcc, hover fill
  const TEAL_ALPHA = 0.5;          // fully lit cell
  const FADE_IN = 0.6;             // seconds to light up
  const FADE_OUT = 2.0;            // seconds to fade back

  // ---- Surface geometry ----
  // A height field over a unit square (u: left → right, v: back → front).
  const gauss = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  function height(u, v) {
    return 0.34 * gauss(u, 0.44, 0.15)                 // main hump
         + 0.10 * gauss(u, 0.68, 0.06) * (1 - v)       // smaller back bump
         - 0.24 * gauss(u, 0.86, 0.11) * v             // valley towards the front right
         + 0.05 * (1 - v);                             // back edge sits a little higher
  }

  const WIDTH = 1.7;   // the surface is wider than it is deep
  const START = { pos: [0.25, 1.3, 2.4], target: [0.95, 0.0, 0.4], fov: 0.9 };
  const FIT = { left: -60, right: 652, top: 6, bottom: 316 };   // where the reference view lands
  const VIEW_TURN = 0.28, VIEW_TILT = 0.08;   // fixed viewing angle, relative to the reference view
  const ROWS = 12, COLS = 14, STEPS = 64;
  const SUB = 6;   // each cell is filled as a SUB×SUB mesh so it follows the curved lines

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

  // Camera on an orbit around the target
  const offset0 = sub(START.pos, START.target);
  const DIST = Math.hypot(...offset0);
  const YAW0 = Math.atan2(offset0[0], offset0[2]);
  const PITCH0 = Math.asin(offset0[1] / DIST);

  function cameraFor(yaw, pitch) {
    const pos = [
      START.target[0] + DIST * Math.cos(pitch) * Math.sin(yaw),
      START.target[1] + DIST * Math.sin(pitch),
      START.target[2] + DIST * Math.cos(pitch) * Math.cos(yaw),
    ];
    const fwd = norm(sub(START.target, pos));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const f = 1 / Math.tan(START.fov / 2);
    return (u, v) => {
      const p = sub([u * WIDTH, height(u, v), v], pos);
      const depth = dot(p, fwd);
      return [dot(p, right) * f / depth, -dot(p, up) * f / depth, depth];   // screen y grows downwards
    };
  }

  function polylines(project) {
    const lines = [];
    for (let r = 0; r < ROWS; r++) {               // curves along u (one per row)
      const v = r / (ROWS - 1), pts = [];
      for (let i = 0; i <= STEPS; i++) pts.push(project(i / STEPS, v));
      lines.push(pts);
    }
    for (let c = 0; c < COLS; c++) {               // curves along v (one per column)
      const u = c / (COLS - 1), pts = [];
      for (let i = 0; i <= STEPS; i++) pts.push(project(u, i / STEPS));
      lines.push(pts);
    }
    return lines;
  }

  // Scale and position come from the reference view, so the fixed angle keeps the same size
  const FIT_T = (() => {
    const pts = polylines(cameraFor(YAW0, PITCH0)).flat();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min((FIT.right - FIT.left) / (maxX - minX), (FIT.bottom - FIT.top) / (maxY - minY));
    const ox = FIT.right - (maxX - minX) * s - minX * s;
    const oy = FIT.top + ((FIT.bottom - FIT.top) - (maxY - minY) * s) / 2 - minY * s;
    return { s, ox, oy };
  })();

  const project = cameraFor(YAW0 + VIEW_TURN, PITCH0 + VIEW_TILT);

  // At this angle the hilltop rises above the 330px Figma box: add headroom at the top
  // (the canvas grows upwards by the same amount, so nothing else moves on the page)
  const HEADROOM = (() => {
    let minY = Infinity;
    for (const pts of polylines(project)) for (const p of pts) minY = Math.min(minY, FIT_T.oy + p[1] * FIT_T.s);
    return Math.max(0, Math.ceil(8 - minY));   // keep 8 units clear above the highest point
  })();
  const DRAW_H = VIEW_H + HEADROOM;
  const toView = (p) => [FIT_T.ox + p[0] * FIT_T.s, FIT_T.oy + p[1] * FIT_T.s + HEADROOM, p[2]];

  // Wireframe lines (view-box units)
  const LINES = (() => {
    const out = [];
    for (const pts of polylines(project)) {
      const v = pts.map(toView);
      for (let i = 0; i < v.length - 1; i++) out.push(v[i][0], v[i][1], v[i + 1][0], v[i + 1][1]);
    }
    return new Float32Array(out);
  })();

  // Cells: triangles for filling + data for hit-testing
  const CELLS = [];
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const grid = [];
      for (let j = 0; j <= SUB; j++) {
        const row = [];
        for (let i = 0; i <= SUB; i++) {
          row.push(toView(project((c + i / SUB) / (COLS - 1), (r + j / SUB) / (ROWS - 1))));
        }
        grid.push(row);
      }
      const tris = [];
      for (let j = 0; j < SUB; j++) {
        for (let i = 0; i < SUB; i++) {
          const a = grid[j][i], b = grid[j][i + 1], c2 = grid[j + 1][i], d = grid[j + 1][i + 1];
          tris.push(a, b, d, a, d, c2);
        }
      }
      const xs = tris.map(p => p[0]), ys = tris.map(p => p[1]);
      CELLS.push({
        tris,
        depth: tris.reduce((s, p) => s + p[2], 0) / tris.length,   // nearer cells win overlaps
        box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      });
    }
  }

  const inTri = (p, a, b, c) => {
    const s = (q, r, t) => (q[0] - t[0]) * (r[1] - t[1]) - (r[0] - t[0]) * (q[1] - t[1]);
    const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  function cellAt(x, y) {
    let best = -1, bestDepth = Infinity;
    CELLS.forEach((cell, k) => {
      const [x0, y0, x1, y1] = cell.box;
      if (x < x0 || x > x1 || y < y0 || y > y1 || cell.depth >= bestDepth) return;
      for (let t = 0; t < cell.tris.length; t += 3) {
        if (inTri([x, y], cell.tris[t], cell.tris[t + 1], cell.tris[t + 2])) { best = k; bestDepth = cell.depth; return; }
      }
    });
    return best;
  }

  function fillVertices(levels) {
    const out = [];
    levels.forEach((level, k) => {
      if (level <= 0) return;
      for (const p of CELLS[k].tris) out.push(p[0], p[1], level);
    });
    return new Float32Array(out);
  }

  // ---- WebGL ----
  const VERT = `
    attribute vec2 a_pos;            // view-box units
    attribute float a_level;         // 0..1 per vertex (fills); constant 1 for lines
    uniform vec2 u_view;
    varying float v_level;
    void main() {
      vec2 clip = a_pos / u_view * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      v_level = a_level;
    }`;
  const FRAG = `
    precision mediump float;
    uniform vec4 u_color;
    varying float v_level;
    void main() {
      float a = u_color.a * v_level;
      gl_FragColor = vec4(u_color.rgb * a, a);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function setupGL(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aLevel = gl.getAttribLocation(prog, "a_level");
    const uColor = gl.getUniformLocation(prog, "u_color");
    gl.uniform2f(gl.getUniformLocation(prog, "u_view"), VIEW_W, DRAW_H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, LINES, gl.STATIC_DRAW);
    const fillBuf = gl.createBuffer();

    return (levels) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Lit cells first, so the lines stay on top
      const fills = fillVertices(levels);
      if (fills.length) {
        gl.bindBuffer(gl.ARRAY_BUFFER, fillBuf);
        gl.bufferData(gl.ARRAY_BUFFER, fills, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(aLevel);
        gl.vertexAttribPointer(aLevel, 1, gl.FLOAT, false, 12, 8);
        gl.uniform4f(uColor, TEAL[0] / 255, TEAL[1] / 255, TEAL[2] / 255, TEAL_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, fills.length / 3);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.disableVertexAttribArray(aLevel);
      gl.vertexAttrib1f(aLevel, 1);
      gl.uniform4f(uColor, INK[0] / 255, INK[1] / 255, INK[2] / 255, INK_ALPHA);
      gl.drawArrays(gl.LINES, 0, LINES.length / 2);
    };
  }

  // Same drawing with canvas 2D, for browsers without WebGL
  function setup2D(canvas) {
    const ctx = canvas.getContext("2d");
    return (levels) => {
      ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / DRAW_H, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, DRAW_H);
      levels.forEach((level, k) => {
        if (level <= 0) return;
        ctx.fillStyle = `rgba(${TEAL.join(",")},${TEAL_ALPHA * level})`;
        ctx.beginPath();
        const t = CELLS[k].tris;
        for (let i = 0; i < t.length; i += 3) {
          ctx.moveTo(t[i][0], t[i][1]); ctx.lineTo(t[i + 1][0], t[i + 1][1]); ctx.lineTo(t[i + 2][0], t[i + 2][1]); ctx.closePath();
        }
        ctx.fill();
      });
      ctx.strokeStyle = `rgba(${INK.join(",")},${INK_ALPHA})`;
      ctx.lineWidth = VIEW_W / canvas.width;   // one device pixel
      ctx.beginPath();
      for (let i = 0; i < LINES.length; i += 4) {
        ctx.moveTo(LINES[i], LINES[i + 1]);
        ctx.lineTo(LINES[i + 2], LINES[i + 3]);
      }
      ctx.stroke();
    };
  }

  for (const host of document.querySelectorAll(".micro--surface")) {
    // Grow the box upwards by the headroom; % margins resolve against the project's width,
    // and the box is 34.53% of it, so this keeps the Figma position of the original 330px box
    host.style.aspectRatio = `${VIEW_W} / ${DRAW_H}`;
    host.style.marginTop = `calc(${-HEADROOM / VIEW_W} * 34.53% + var(--micro-nudge, 0px))`;
    const canvas = document.createElement("canvas");
    host.append(canvas);

    let draw;
    try { draw = setupGL(canvas); } catch (e) { draw = null; }
    if (!draw) draw = setup2D(canvas);

    const levels = new Float32Array(CELLS.length);   // 0 = empty, 1 = fully lit
    let hovered = -1, running = false, last = 0;

    const tick = (now) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      let active = false;
      for (let k = 0; k < levels.length; k++) {
        const target = k === hovered ? 1 : 0;
        if (levels[k] < target) levels[k] = Math.min(target, levels[k] + dt / FADE_IN);
        else if (levels[k] > target) levels[k] = Math.max(target, levels[k] - dt / FADE_OUT);
        if (levels[k] !== target) active = true;   // still fading
      }
      draw(levels);
      if (active) requestAnimationFrame(tick);
      else { running = false; last = 0; }
    };
    const animate = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

    // Keep the drawing buffer at device resolution as the block scales
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw(levels);
    };
    new ResizeObserver(fit).observe(canvas);
    fit();

    // ---- Hover ----
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      const cell = cellAt((e.clientX - r.left) / r.width * VIEW_W, (e.clientY - r.top) / r.height * DRAW_H);
      if (cell !== hovered) { hovered = cell; animate(); }
    });
    canvas.addEventListener("pointerleave", () => { hovered = -1; animate(); });
  }
})();
