// Project micrographic: a wireframe surface drawn with WebGL that drifts very slowly
// around all three axes. Hovering a cell slowly fills it with the accent teal; it fades
// back out when the pointer leaves. Each `.micro--surface` element is sized in % of its
// project block, so the whole graphic scales with it.
(() => {
  const VIEW_W = 663;   // Figma size of the graphic
  const VIEW_H = 330;
  const INK = [221, 220, 200];     // #dddcc8, wireframe lines
  const INK_ALPHA = 0.75;
  const TEAL = [0, 255, 204];      // #00ffcc, hover fill
  const TEAL_ALPHA = 0.5;          // fully lit cell
  const FADE_IN = 0.6;             // seconds to light up
  const FADE_OUT = 2.0;            // seconds to fade back

  // ---- Surface ----
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
  const VIEW_TURN = 0.28, VIEW_TILT = 0.08;   // resting angle, relative to the reference view
  const ROWS = 12, COLS = 14;      // wireframe lines
  const SUB = 6;                   // samples per cell edge (curves + cell fills)
  const GU = (COLS - 1) * SUB + 1, GV = (ROWS - 1) * SUB + 1;   // fine grid size

  // Slow drift around the resting angle: two sines per axis, periods in seconds
  const DRIFT = {
    turn: { amp: 0.35, periods: [47, 29] },
    tilt: { amp: 0.12, periods: [53, 31] },
    roll: { amp: 0.08, periods: [61, 37] },
  };

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

  const offset0 = sub(START.pos, START.target);
  const DIST = Math.hypot(...offset0);
  const YAW0 = Math.atan2(offset0[0], offset0[2]);
  const PITCH0 = Math.asin(offset0[1] / DIST);

  // Camera on an orbit around the target; roll spins the picture around the view axis
  function cameraFor(yaw, pitch, roll = 0) {
    const pos = [
      START.target[0] + DIST * Math.cos(pitch) * Math.sin(yaw),
      START.target[1] + DIST * Math.sin(pitch),
      START.target[2] + DIST * Math.cos(pitch) * Math.cos(yaw),
    ];
    const fwd = norm(sub(START.target, pos));
    const r0 = norm(cross(fwd, [0, 1, 0]));
    const u0 = cross(r0, fwd);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const right = [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr];
    const up = [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr];
    const f = 1 / Math.tan(START.fov / 2);
    return (u, v) => {
      const p = sub([u * WIDTH, height(u, v), v], pos);
      const depth = dot(p, fwd);
      return [dot(p, right) * f / depth, -dot(p, up) * f / depth, depth];   // screen y grows downwards
    };
  }

  // Scale and anchor come from the reference view, so every angle keeps the same size
  const FIT_T = (() => {
    const pr = cameraFor(YAW0, PITCH0);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let j = 0; j < GV; j++) for (let i = 0; i < GU; i++) {
      const p = pr(i / (GU - 1), j / (GV - 1));
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    const s = Math.min((FIT.right - FIT.left) / (maxX - minX), (FIT.bottom - FIT.top) / (maxY - minY));
    return { s, ox: FIT.right - (maxX - minX) * s - minX * s, oy: FIT.top + ((FIT.bottom - FIT.top) - (maxY - minY) * s) / 2 - minY * s };
  })();

  // Room above and below the 330px Figma box for every angle the drift can reach,
  // so the hilltop and front edge are never clipped
  const ROOM = (() => {
    let minY = Infinity, maxY = -Infinity;
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) {
      const pr = cameraFor(YAW0 + VIEW_TURN + a * DRIFT.turn.amp, PITCH0 + VIEW_TILT + b * DRIFT.tilt.amp, c * DRIFT.roll.amp);
      for (let j = 0; j < GV; j += 2) for (let i = 0; i < GU; i += 2) {
        const y = FIT_T.oy + pr(i / (GU - 1), j / (GV - 1))[1] * FIT_T.s;
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    return { top: Math.max(0, Math.ceil(8 - minY)), bottom: Math.max(0, Math.ceil(maxY - (VIEW_H - 8))) };
  })();
  const DRAW_H = ROOM.top + VIEW_H + ROOM.bottom;

  // ---- Per-frame geometry: one fine grid of projected points ----
  const grid = new Float32Array(GU * GV * 3);   // x, y (view units), depth
  function projectGrid(yaw, pitch, roll, flip) {
    const pr = cameraFor(yaw, pitch, roll);
    for (let j = 0, k = 0; j < GV; j++) {
      for (let i = 0; i < GU; i++, k += 3) {
        const p = pr(i / (GU - 1), j / (GV - 1));
        const x = FIT_T.ox + p[0] * FIT_T.s;
        grid[k] = flip ? VIEW_W - x : x;   // mirrored here, not in CSS, so hover still lines up
        grid[k + 1] = FIT_T.oy + p[1] * FIT_T.s + ROOM.top;
        grid[k + 2] = p[2];
      }
    }
  }
  const at = (i, j) => (j * GU + i) * 3;

  const lineData = new Float32Array((ROWS * (GU - 1) + COLS * (GV - 1)) * 4);
  function buildLines() {
    let n = 0;
    const seg = (a, b) => { lineData[n++] = grid[a]; lineData[n++] = grid[a + 1]; lineData[n++] = grid[b]; lineData[n++] = grid[b + 1]; };
    for (let r = 0; r < ROWS; r++) for (let i = 0; i < GU - 1; i++) seg(at(i, r * SUB), at(i + 1, r * SUB));
    for (let c = 0; c < COLS; c++) for (let j = 0; j < GV - 1; j++) seg(at(c * SUB, j), at(c * SUB, j + 1));
    return lineData;
  }

  const CELLS = (ROWS - 1) * (COLS - 1);
  const cellOf = (k) => [k % (COLS - 1), Math.floor(k / (COLS - 1))];   // [column, row]

  function forEachTri(k, fn) {
    const [c, r] = cellOf(k);
    for (let j = r * SUB; j < (r + 1) * SUB; j++) {
      for (let i = c * SUB; i < (c + 1) * SUB; i++) {
        const a = at(i, j), b = at(i + 1, j), d = at(i + 1, j + 1), e = at(i, j + 1);
        fn(a, b, d); fn(a, d, e);
      }
    }
  }

  const inTri = (x, y, a, b, c) => {
    const s = (p, q) => (x - grid[q]) * (grid[p + 1] - grid[q + 1]) - (grid[p] - grid[q]) * (y - grid[q + 1]);
    const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  function cellAt(x, y) {
    let best = -1, bestDepth = Infinity;
    for (let k = 0; k < CELLS; k++) {
      const [c, r] = cellOf(k);
      const depth = grid[at(c * SUB + SUB / 2, r * SUB + SUB / 2) + 2];   // nearer cells win overlaps
      if (depth >= bestDepth) continue;
      let hit = false;
      forEachTri(k, (a, b, d) => { if (!hit && inTri(x, y, a, b, d)) hit = true; });
      if (hit) { best = k; bestDepth = depth; }
    }
    return best;
  }

  function buildFills(levels) {
    const out = [];
    levels.forEach((level, k) => {
      if (level <= 0) return;
      forEachTri(k, (a, b, d) => {
        out.push(grid[a], grid[a + 1], level, grid[b], grid[b + 1], level, grid[d], grid[d + 1], level);
      });
    });
    return new Float32Array(out);
  }

  // ---- WebGL ----
  const VERT = `
    attribute vec2 a_pos;            // view units
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
    const fillBuf = gl.createBuffer();

    return (lines, fills) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (fills.length) {                            // lit cells first, so the lines stay on top
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
      gl.bufferData(gl.ARRAY_BUFFER, lines, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.disableVertexAttribArray(aLevel);
      gl.vertexAttrib1f(aLevel, 1);
      gl.uniform4f(uColor, INK[0] / 255, INK[1] / 255, INK[2] / 255, INK_ALPHA);
      gl.drawArrays(gl.LINES, 0, lines.length / 2);
    };
  }

  // Same drawing with canvas 2D, for browsers without WebGL
  function setup2D(canvas) {
    const ctx = canvas.getContext("2d");
    return (lines, fills) => {
      ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / DRAW_H, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, DRAW_H);
      for (let i = 0; i < fills.length; i += 9) {
        ctx.fillStyle = `rgba(${TEAL.join(",")},${TEAL_ALPHA * fills[i + 2]})`;
        ctx.beginPath();
        ctx.moveTo(fills[i], fills[i + 1]); ctx.lineTo(fills[i + 3], fills[i + 4]); ctx.lineTo(fills[i + 6], fills[i + 7]);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${INK.join(",")},${INK_ALPHA})`;
      ctx.lineWidth = VIEW_W / canvas.width;   // one device pixel
      ctx.beginPath();
      for (let i = 0; i < lines.length; i += 4) { ctx.moveTo(lines[i], lines[i + 1]); ctx.lineTo(lines[i + 2], lines[i + 3]); }
      ctx.stroke();
    };
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  for (const host of document.querySelectorAll(".micro--surface")) {
    // Grow the box by the extra room; % margins resolve against the project's width, and
    // the box is 34.53% of it, so this keeps the original 330px box at its Figma position
    host.style.aspectRatio = `${VIEW_W} / ${DRAW_H}`;
    host.style.marginTop = `calc(${-ROOM.top / VIEW_W} * 34.53% + var(--micro-nudge, 0px))`;
    const canvas = document.createElement("canvas");
    host.append(canvas);
    const flip = host.classList.contains("is-flipped");

    let draw;
    try { draw = setupGL(canvas); } catch (e) { draw = null; }
    if (!draw) draw = setup2D(canvas);

    // Random phases per graphic, so each project drifts differently
    const phases = Object.fromEntries(Object.keys(DRIFT).map(k => [k, DRIFT[k].periods.map(() => Math.random() * Math.PI * 2)]));
    const wave = (axis, t) => {
      const { amp, periods } = DRIFT[axis];
      return amp * periods.reduce((s, p, i) => s + Math.sin((2 * Math.PI * t) / p + phases[axis][i]), 0) / periods.length;
    };

    const levels = new Float32Array(CELLS);   // 0 = empty, 1 = fully lit
    let pointer = null;                       // last pointer position in view units, or null
    let hovered = -1, t = 0, last = 0, visible = true, running = false;

    function frame(now) {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (!reduceMotion.matches) t += dt;

      projectGrid(
        YAW0 + VIEW_TURN + wave("turn", t),
        PITCH0 + VIEW_TILT + wave("tilt", t),
        wave("roll", t),
        flip,
      );
      hovered = pointer ? cellAt(pointer[0], pointer[1]) : -1;   // the surface moves under a still pointer

      let fading = false;
      for (let k = 0; k < CELLS; k++) {
        const target = k === hovered ? 1 : 0;
        if (levels[k] < target) levels[k] = Math.min(target, levels[k] + dt / FADE_IN);
        else if (levels[k] > target) levels[k] = Math.max(target, levels[k] - dt / FADE_OUT);
        if (levels[k] !== target) fading = true;
      }
      draw(buildLines(), buildFills(levels));

      // Keep animating while drifting and on screen, or while a cell is still fading
      if ((visible && !reduceMotion.matches && !document.hidden) || fading) requestAnimationFrame(frame);
      else { running = false; last = 0; }
    }
    const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

    // Keep the drawing buffer at device resolution as the block scales
    new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      start();
    }).observe(canvas);

    // Only animate while the graphic is on screen and the tab is visible
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); }).observe(host);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });

    // ---- Hover ----
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer = [(e.clientX - r.left) / r.width * VIEW_W, (e.clientY - r.top) / r.height * DRAW_H];
      start();
    });
    canvas.addEventListener("pointerleave", () => { pointer = null; start(); });

    start();
  }
})();
