// Lorenz attractor point cloud for the hero (settings tuned in /lab/lorenz.html).
// A teal dot with a fading tail travels the path; drag to rotate.
// Transparent background; pauses only while off-screen. The dot is slow and small enough
// to keep moving even with reduced motion on.
(() => {
  const host = document.querySelector(".micro--lorenz");
  if (!host) return;

  // Attractor
  const SIGMA = 8.8, RHO = 25.4, BETA = 1.07, DT = 0.006;
  const POINTS = 40000, STRAY = 0.04, SEED = 7;
  const X0 = -1.8, Z0 = 3.2;
  // Camera
  const YAW = 107.4, PITCH = 43.1, ROLL = -43, DIST = 70, FOV = 70;
  const ZOOM = 3.5;   // scales with the canvas width: the attractor fills about ¾ of it
  const DRAG_DEG_PER_PX = 0.3;
  // Points
  const SIZE = 1, ALPHA = 0.46, FADE = 0.47, RADIUS = 30;
  const INK = [221 / 255, 220 / 255, 200 / 255];   // #dddcc8, as the wireframe
  const TEAL = [0, 1, 204 / 255];                   // #00ffcc
  // Dot
  const DOT_TIME = 3600;   // seconds from the start of the path to its end
  const DOT_SIZE = 3, TAIL = 50;

  // ---- Points: one RK4 path, then a few stray points around it ----
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const rand = rng(SEED);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

  const strays = Math.round(POINTS * STRAY);
  const traced = POINTS - strays;
  const cloud = new Float32Array(POINTS * 3);
  {
    const f = (x, y, z) => [SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z];
    let x = X0, y = 0, z = Z0;
    for (let k = 0; k < traced * 3; ) {
      const a = f(x, y, z);
      const b = f(x + a[0] * DT / 2, y + a[1] * DT / 2, z + a[2] * DT / 2);
      const c = f(x + b[0] * DT / 2, y + b[1] * DT / 2, z + b[2] * DT / 2);
      const d = f(x + c[0] * DT, y + c[1] * DT, z + c[2] * DT);
      x += DT / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]);
      y += DT / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]);
      z += DT / 6 * (a[2] + 2 * b[2] + 2 * c[2] + d[2]);
      // Centred between the two wings, at (0, 0, ρ − 1)
      cloud[k++] = x; cloud[k++] = y; cloud[k++] = z - (RHO - 1);
    }
    let r = 0;
    for (let k = 0; k < traced * 3; k += 3) r = Math.max(r, Math.hypot(cloud[k], cloud[k + 1], cloud[k + 2]));
    for (let s = 0, k = traced * 3; s < strays; s++) {
      const src = (rand() * traced | 0) * 3;
      const spread = r * 0.35 * Math.pow(rand(), 2);
      cloud[k++] = cloud[src] + gauss() * spread;
      cloud[k++] = cloud[src + 1] + gauss() * spread;
      cloud[k++] = cloud[src + 2] + gauss() * spread;
    }
  }

  // ---- WebGL ----
  const canvas = document.createElement("canvas");
  host.append(canvas);
  const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false, alpha: true });
  if (!gl) { host.remove(); return; }

  const VS = `
    attribute vec3 a_pos;
    uniform mat3 u_rot;
    uniform float u_dist, u_focal, u_aspect, u_size, u_radius;
    varying float v_depth;
    void main() {
      // Lorenz z is up: (x, y, z) → right, forward, up, then the camera rotation
      vec3 p = u_rot * vec3(a_pos.x, a_pos.z, a_pos.y);
      float z = p.z + u_dist;
      if (z < 0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      gl_Position = vec4(p.x * u_focal / z, p.y * u_focal / z * u_aspect, 0.0, 1.0);
      gl_PointSize = u_size * u_dist / z;
      v_depth = clamp((p.z / u_radius) * 0.5 + 0.5, 0.0, 1.0);   // 0 nearest, 1 farthest
    }`;
  const FS = `
    precision mediump float;
    uniform vec3 u_ink;
    uniform float u_alpha, u_fade;
    varying float v_depth;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      if (dot(c, c) > 0.25) discard;   // round points
      gl_FragColor = vec4(u_ink, u_alpha * (1.0 - u_fade * v_depth));
    }`;
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { host.remove(); return; }
  gl.useProgram(prog);
  const u = Object.fromEntries(["u_rot", "u_dist", "u_focal", "u_aspect", "u_size", "u_radius", "u_ink", "u_alpha", "u_fade"]
    .map(n => [n, gl.getUniformLocation(prog, n)]));

  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  const cloudBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cloud, gl.STATIC_DRAW);
  const dotBuf = gl.createBuffer();
  const dotPos = new Float32Array((TAIL + 1) * 3);

  gl.enable(gl.BLEND);
  // Colour blends as usual; alpha accumulates, so the transparent canvas composites correctly
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // Yaw about the up axis, then pitch about the right axis, then roll about the view axis
  function rotation(yawDeg, pitchDeg, rollDeg) {
    const r = Math.PI / 180;
    const cy = Math.cos(yawDeg * r), sy = Math.sin(yawDeg * r);
    const cp = Math.cos(pitchDeg * r), sp = Math.sin(pitchDeg * r);
    const cr = Math.cos(rollDeg * r), sr = Math.sin(rollDeg * r);
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
    const Rp = [1, 0, 0, 0, cp, sp, 0, -sp, cp];
    const Rr = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
    const mul = (A, B) => {   // column-major 3×3
      const C = new Array(9);
      for (let c = 0; c < 3; c++) for (let rr = 0; rr < 3; rr++)
        C[c * 3 + rr] = A[rr] * B[c * 3] + A[3 + rr] * B[c * 3 + 1] + A[6 + rr] * B[c * 3 + 2];
      return C;
    };
    return new Float32Array(mul(Rr, mul(Rp, Ry)));
  }

  let yaw = YAW, pitch = PITCH;
  let phase = 0, last = 0, visible = true, running = false;

  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    phase = (phase + dt / DOT_TIME) % 1;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) { running = false; return; }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniformMatrix3fv(u.u_rot, false, rotation(yaw, pitch, ROLL));
    gl.uniform1f(u.u_dist, DIST);
    gl.uniform1f(u.u_focal, ZOOM / Math.tan(FOV * Math.PI / 360));
    gl.uniform1f(u.u_aspect, w / h);
    gl.uniform1f(u.u_radius, RADIUS);

    // The cloud
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuf);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.u_size, SIZE * dpr);
    gl.uniform3fv(u.u_ink, INK);
    gl.uniform1f(u.u_alpha, ALPHA);
    gl.uniform1f(u.u_fade, FADE);
    gl.drawArrays(gl.POINTS, 0, POINTS);

    // The dot and its fading tail: the path positions it just passed
    const f = phase * (traced - 1), i = Math.floor(f), t = f - i;
    for (let a = 0; a < 3; a++) dotPos[a] = cloud[i * 3 + a] * (1 - t) + cloud[(i + 1) * 3 + a] * t;
    const tail = Math.min(TAIL, i + 1);
    for (let n = 0; n < tail; n++) dotPos.set(cloud.subarray((i - n) * 3, (i - n) * 3 + 3), (n + 1) * 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dotPos.subarray(0, (tail + 1) * 3), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.u_size, DOT_SIZE * dpr);
    gl.uniform3fv(u.u_ink, TEAL);
    gl.uniform1f(u.u_fade, 0);
    for (let n = tail; n >= 0; n--) {   // oldest first, so the head draws on top
      gl.uniform1f(u.u_alpha, 1 - n / (tail + 1));
      gl.drawArrays(gl.POINTS, n, 1);
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

  // Only animate while on screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(host);
  addEventListener("resize", start);

  // Drag to rotate (vertical page scrolling still works on touch)
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    yaw -= (e.clientX - drag.x) * DRAG_DEG_PER_PX;
    pitch = Math.max(-90, Math.min(90, pitch + (e.clientY - drag.y) * DRAG_DEG_PER_PX));
    drag = { x: e.clientX, y: e.clientY };
    start();
  });
  const end = () => { drag = null; canvas.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
})();
