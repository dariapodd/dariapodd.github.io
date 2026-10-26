// Project micrographic: a static wireframe surface drawn with WebGL, plus the dashed
// frame, "expand" icon and axis gizmo as crisp SVG on top. Each `.micro--surface`
// element is sized in % of its project block, so the whole graphic scales with it.
(() => {
  const VIEW_W = 663;   // Figma size of the graphic
  const VIEW_H = 330;
  const INK = [221, 220, 200];   // #dddcc8
  const ALPHA = 0.75;

  // ---- Surface geometry ----
  // A height field over a unit square (u: left → right/away, v: back → front),
  // viewed in perspective from the front-left, then fitted into the dashed frame.
  const gauss = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
  function height(u, v) {
    return 0.34 * gauss(u, 0.44, 0.15)                 // main hump
         + 0.10 * gauss(u, 0.68, 0.06) * (1 - v)       // smaller back bump
         - 0.24 * gauss(u, 0.86, 0.11) * v             // valley towards the front right
         + 0.05 * (1 - v);                             // back edge sits a little higher
  }

  const WIDTH = 1.7;   // the surface is wider than it is deep
  const CAMERA = { pos: [0.25, 1.3, 2.4], target: [0.95, 0.0, 0.4], fov: 0.9 };
  const FIT = { left: -60, right: 652, top: 6, bottom: 316 };   // left end runs off the frame, as in Figma   // where the surface lands in the view box

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

  // Camera basis (look-at)
  const fwd = norm(sub(CAMERA.target, CAMERA.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  function project(u, v) {
    const p = sub([u * WIDTH, height(u, v), v], CAMERA.pos);
    const depth = dot(p, fwd);
    const f = 1 / Math.tan(CAMERA.fov / 2);
    return [dot(p, right) * f / depth, -dot(p, up) * f / depth];   // screen y grows downwards
  }

  function buildSegments() {
    const ROWS = 12, COLS = 14, STEPS = 64;
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
    // Fit the projected surface into the frame, keeping its proportions
    const all = lines.flat();
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min((FIT.right - FIT.left) / (maxX - minX), (FIT.bottom - FIT.top) / (maxY - minY));
    const ox = FIT.right - (maxX - minX) * s;      // align to the right edge, like the Figma graphic
    const oy = FIT.top + ((FIT.bottom - FIT.top) - (maxY - minY) * s) / 2;
    const out = [];
    for (const pts of lines) {
      for (let i = 0; i < pts.length - 1; i++) {
        out.push(ox + (pts[i][0] - minX) * s, oy + (pts[i][1] - minY) * s,
                 ox + (pts[i + 1][0] - minX) * s, oy + (pts[i + 1][1] - minY) * s);
      }
    }
    return new Float32Array(out);
  }
  const SEGMENTS = buildSegments();

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
    gl.bufferData(gl.ARRAY_BUFFER, SEGMENTS, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(prog, "u_view"), VIEW_W, VIEW_H);
    gl.uniform4f(gl.getUniformLocation(prog, "u_color"), INK[0] / 255, INK[1] / 255, INK[2] / 255, ALPHA);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    return () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.LINES, 0, SEGMENTS.length / 2);
    };
  }

  // Same lines with canvas 2D, for browsers without WebGL
  function setup2D(canvas) {
    const ctx = canvas.getContext("2d");
    return () => {
      ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.strokeStyle = `rgba(${INK.join(",")},${ALPHA})`;
      ctx.lineWidth = VIEW_W / canvas.width;   // one device pixel
      ctx.beginPath();
      for (let i = 0; i < SEGMENTS.length; i += 4) {
        ctx.moveTo(SEGMENTS[i], SEGMENTS[i + 1]);
        ctx.lineTo(SEGMENTS[i + 2], SEGMENTS[i + 3]);
      }
      ctx.stroke();
    };
  }

  // ---- Dashed frame, expand icon, axis gizmo (SVG) ----
  const SVG = `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" fill="none" stroke="rgb(${INK.join(",")})" stroke-opacity="${ALPHA}"
         stroke-width="1" vector-effect="non-scaling-stroke" xmlns="http://www.w3.org/2000/svg">
      <rect x="12.5" y="17.5" width="643" height="301" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
      <g vector-effect="non-scaling-stroke">
        <circle cx="608" cy="58" r="13" vector-effect="non-scaling-stroke"/>
        <path d="M594 44 L587 37 M587 37 h6 M587 37 v6
                 M622 44 L629 37 M629 37 h-6 M629 37 v6
                 M594 72 L587 79 M587 79 h6 M587 79 v-6
                 M622 72 L629 79 M629 79 h-6 M629 79 v-6" vector-effect="non-scaling-stroke"/>
      </g>
      <g vector-effect="non-scaling-stroke">
        <path d="M298 270 L336 255 L374 270 L336 285 Z" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
        <path d="M336 270 V226 M331 232 L336 226 L341 232" vector-effect="non-scaling-stroke"/>
        <path d="M336 270 V318 M258 285.5 H408" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
      </g>
    </svg>`;

  for (const host of document.querySelectorAll(".micro--surface")) {
    const canvas = document.createElement("canvas");
    host.append(canvas);
    host.insertAdjacentHTML("beforeend", SVG);

    let draw;
    try { draw = setupGL(canvas); } catch (e) { draw = null; }
    if (!draw) draw = setup2D(canvas);

    // Keep the drawing buffer at device resolution as the block scales
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw();
    };
    new ResizeObserver(fit).observe(canvas);
    fit();
  }
})();
