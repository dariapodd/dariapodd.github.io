// Wireframe globe for .micro--sphere: meridians and parallels, turning like the Earth
// (west to east, once a minute), seen from a little above the equator.
// Lines on the far side are drawn fainter. Pauses while off-screen.
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

  // Circles as point lists on the unit sphere (x right, y up, z towards the viewer)
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

  for (const host of document.querySelectorAll(".micro--sphere")) {
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

      // Spin about the axis, then tilt towards the viewer; returns screen x, y and depth
      const project = ([x, y, z]) => {
        const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
        const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        return [c + x1 * r, c - y2 * r, z2];
      };

      // Far side first, then near side on top
      for (const front of [false, true]) {
        ctx.strokeStyle = `rgba(${INK}, ${front ? FRONT : BACK})`;
        ctx.beginPath();
        for (const pts of circles) {
          let prev = project(pts[0]);
          for (let i = 1; i < pts.length; i++) {
            const p = project(pts[i]);
            if ((p[2] + prev[2] >= 0) === front) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
            prev = p;
          }
        }
        ctx.stroke();
      }
      // Outline
      ctx.strokeStyle = `rgba(${INK}, ${FRONT})`;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, 2 * Math.PI);
      ctx.stroke();

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
