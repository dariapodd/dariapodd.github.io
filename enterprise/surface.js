// Project micrographic: a wireframe surface drawn with WebGL. Drag to rotate it.
// Each `.micro--surface` element is sized in % of its project block, so the whole
// graphic scales with it.
(() => {
  const VIEW_W = 663;   // Figma size of the graphic
  const VIEW_H = 330;
  const INK = [221, 220, 200];   // #dddcc8
  const ALPHA = 0.75;

  // ---- Surface geometry ----
  // A height field over a unit square (u: left → right/away, v: back → front),
  // viewed in perspective from the front-left.
  const gauss = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  function height(u, v) {
    return 0.34 * gauss(u, 0.44, 0.15)                 // main hump
         + 0.10 * gauss(u, 0.68, 0.06) * (1 - v)       // smaller back bump
         - 0.24 * gauss(u, 0.86, 0.11) * v             // valley towards the front right
         + 0.05 * (1 - v);                             // back edge sits a little higher
  }

  const WIDTH = 1.7;   // the surface is wider than it is deep
  const START = { pos: [0.25, 1.3, 2.4], target: [0.95, 0.0, 0.4], fov: 0.9 };
  const FIT = { left: -60, right: 652, top: 6, bottom: 316 };   // where the starting view lands; left end runs off, as in Figma
  const ROWS = 12, COLS = 14, STEPS = 64;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

  // Camera orbit around the target: yaw (around the vertical), pitch (up/down), distance
  const offset0 = sub(START.pos, START.target);
  const DIST = Math.hypot(...offset0);
  const YAW0 = Math.atan2(offset0[0], offset0[2]);
  const PITCH0 = Math.asin(offset0[1] / DIST);
  const PITCH_MIN = 0.12, PITCH_MAX = 1.35;      // never below the surface or straight down

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
      return [dot(p, right) * f / depth, -dot(p, up) * f / depth];   // screen y grows downwards
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

  // Fit the starting view into the frame once; rotated views reuse the same scale and
  // anchor (the target point), so the surface turns in place instead of resizing.
  const FIT_T = (() => {
    const lines = polylines(cameraFor(YAW0, PITCH0)).flat();
    const xs = lines.map(p => p[0]), ys = lines.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min((FIT.right - FIT.left) / (maxX - minX), (FIT.bottom - FIT.top) / (maxY - minY));
    const ox = FIT.right - (maxX - minX) * s - minX * s;
    const oy = FIT.top + ((FIT.bottom - FIT.top) - (maxY - minY) * s) / 2 - minY * s;
    return { s, ox, oy };
  })();

  function segments(yaw, pitch) {
    const out = [];
    const { s, ox, oy } = FIT_T;
    for (const pts of polylines(cameraFor(yaw, pitch))) {
      for (let i = 0; i < pts.length - 1; i++) {
        out.push(ox + pts[i][0] * s, oy + pts[i][1] * s, ox + pts[i + 1][0] * s, oy + pts[i + 1][1] * s);
      }
    }
    return new Float32Array(out);
  }

  // ---- WebGL ----
  const VERT = `
    attribute vec2 a_pos;            // view-box units
    uniform vec2 u_view;
    void main() {
      vec2 clip = a_pos / u_view * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    }`;
  const FRAG = `
    precision mediump float;
    uniform vec4 u_color;
    void main() { gl_FragColor = vec4(u_color.rgb * u_color.a, u_color.a); }`;

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

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(prog, "u_view"), VIEW_W, VIEW_H);
    gl.uniform4f(gl.getUniformLocation(prog, "u_color"), INK[0] / 255, INK[1] / 255, INK[2] / 255, ALPHA);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    return (segs) => {
      gl.bufferData(gl.ARRAY_BUFFER, segs, gl.DYNAMIC_DRAW);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.LINES, 0, segs.length / 2);
    };
  }

  // Same lines with canvas 2D, for browsers without WebGL
  function setup2D(canvas) {
    const ctx = canvas.getContext("2d");
    return (segs) => {
      ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.strokeStyle = `rgba(${INK.join(",")},${ALPHA})`;
      ctx.lineWidth = VIEW_W / canvas.width;   // one device pixel
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    };
  }

  for (const host of document.querySelectorAll(".micro--surface")) {
    const canvas = document.createElement("canvas");
    host.append(canvas);

    let draw;
    try { draw = setupGL(canvas); } catch (e) { draw = null; }
    if (!draw) draw = setup2D(canvas);

    let yaw = YAW0, pitch = PITCH0, queued = false;
    const render = () => { queued = false; draw(segments(yaw, pitch)); };
    const requestRender = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };

    // Keep the drawing buffer at device resolution as the block scales
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      render();
    };
    new ResizeObserver(fit).observe(canvas);
    fit();

    // ---- Drag to rotate ----
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw, pitch, touch: e.pointerType === "touch" };
      canvas.setPointerCapture(e.pointerId);
      host.classList.add("is-dragging");
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const speed = 3 / canvas.clientWidth;   // a full drag across the graphic ≈ 170°
      yaw = drag.yaw - (e.clientX - drag.x) * speed;
      if (!drag.touch) {                       // on touch, vertical drags scroll the page instead
        pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, drag.pitch + (e.clientY - drag.y) * speed));
      }
      requestRender();
    });
    const end = () => { drag = null; host.classList.remove("is-dragging"); };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }
})();
