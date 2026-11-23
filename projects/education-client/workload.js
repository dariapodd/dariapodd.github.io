// Workload modelling: a 6-week timeline of up to five overlapping projects (Figma 335:1406).
// Each project runs through five phases; under its phase bars, every week lists the tasks the
// admin has for that project that week. Overlap reads from the bars stacking up.
// The model generates daily to-do items from a lifecycle curve (scaled by LOAD):
// a baseline peaking mid-cycle, with spikes at kick-off, the materials deadline, the mid-cycle
// review, the review window and results. Seeded, so the picture is the same on every load.
(() => {
  const root = document.querySelector("[data-workload]");
  if (!root) return;

  // ---------- Model ----------
  const DAY = 86400000;
  const utc = (y, m, d) => Date.UTC(y, m - 1, d);
  const WEEK1 = utc(2025, 12, 29);            // Monday of the week holding 1 January 2026
  const HOME = utc(2026, 9, 28);              // first Monday shown: the week holding 1 October
  const VIEW_WEEKS = 6, CAP = 10;
  const LOAD = 0.12;                          // overall scale: about 2–3 tasks per project per week

  const PROJECTS = [
    { name: "Project A", start: utc(2026, 8, 3),   weeks: 16 },
    { name: "Project B", start: utc(2026, 8, 31),  weeks: 14 },
    { name: "Project C", start: utc(2026, 9, 21),  weeks: 12 },
    { name: "Project D", start: utc(2026, 10, 5),  weeks: 10 },
    { name: "Project E", start: utc(2026, 10, 19), weeks: 13 },
  ].map((p, i) => ({ ...p, i, color: `var(--p${i + 1})`, on: true, end: p.start + p.weeks * 7 * DAY }));

  const PHASES = [
    { name: "Plan",    to: 0.15, cats: { design: 4, staff: 3, timetable: 3 } },
    { name: "Prepare", to: 0.30, cats: { materials: 4, timetable: 2, staff: 2, design: 1 } },
    { name: "Deliver", to: 0.75, cats: { progress: 3, adjust: 3, reviews: 2, materials: 1, staff: 1 } },
    { name: "Review",  to: 0.90, cats: { reviews: 4, results: 3, adjust: 2 } },
    { name: "Close",   to: 1.00, cats: { results: 5, design: 2, progress: 1 } },
  ];
  const CATS = {
    design:    ["Update process outline", "Submit changes for approval", "Review last cycle’s feedback"],
    staff:     ["Request staff allocation", "Confirm rosters", "Onboard casual staff"],
    timetable: ["Submit timetable requirements", "Check room allocation", "Respond to room change"],
    materials: ["Publish materials", "Update links in content portal", "Check materials are current"],
    progress:  ["Check progress dashboard", "Follow up users at risk", "Export progress data"],
    reviews:   ["Prepare review materials", "Submit review for approval", "Coordinate reviewers"],
    adjust:    ["Action adjustment request", "Update individual deadline", "Check accessibility plan"],
    results:   ["Collect results from systems", "Transfer results manually", "Submit results for release"],
  };
  const SPIKES = [
    { t: 0.03, w: 0.035, amp: 7 },   // cycle kick-off
    { t: 0.25, w: 0.030, amp: 4 },   // materials deadline
    { t: 0.50, w: 0.030, amp: 3 },   // mid-cycle review
    { t: 0.82, w: 0.035, amp: 7 },   // review window opens
    { t: 0.96, w: 0.025, amp: 6 },   // results due
  ];

  const gauss = (t, mu, s) => Math.exp(-0.5 * ((t - mu) / s) ** 2);
  function rng(seed) {                         // mulberry32
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (weights, r) => {
    const keys = Object.keys(weights), sum = keys.reduce((a, k) => a + weights[k], 0);
    let x = r * sum;
    for (const k of keys) { x -= weights[k]; if (x <= 0) return k; }
    return keys[keys.length - 1];
  };
  const phaseAt = (t) => PHASES.find((ph) => t < ph.to) || PHASES[PHASES.length - 1];

  // The to-do items (task titles) one project generates on one day
  const cache = new Map();
  function itemsFor(p, day) {
    const key = p.i + ":" + day;
    if (cache.has(key)) return cache.get(key);
    const out = [];
    if (day >= p.start && day < p.end) {
      const t = (day - p.start) / (p.end - p.start);
      const r = rng(p.i * 100003 + Math.round(day / DAY));
      let f = 1.5 + 2 * gauss(t, 0.5, 0.3) + SPIKES.reduce((a, s) => a + s.amp * gauss(t, s.t, s.w), 0);
      const dow = new Date(day).getUTCDay();
      if (dow === 0 || dow === 6) f *= 0.15;
      f *= LOAD;
      const n = Math.max(0, Math.min(CAP, Math.round(f + (r() - 0.5) * 1.6)));
      const ph = phaseAt(t);
      for (let k = 0; k < n; k++) {
        const list = CATS[pick(ph.cats, r())];
        out.push(list[Math.floor(r() * list.length)]);
      }
    }
    cache.set(key, out);
    return out;
  }

  // ---------- Markup ----------
  const fmt = (d, o) => new Date(d).toLocaleDateString("en-AU", { timeZone: "UTC", ...o });
  const weekNo = (monday) => Math.floor((monday - WEEK1) / (7 * DAY)) + 1;
  let first = HOME;

  root.innerHTML = `
    <div class="wl-top">
      <dl class="wl-stats"></dl>
      <div class="wl-nav">
        <button class="wl-btn wl-prev" type="button" aria-label="Previous week">←</button>
        <p class="wl-range" aria-live="polite"></p>
        <button class="wl-btn wl-next" type="button" aria-label="Next week">→</button>
        <button class="wl-btn wl-home" type="button">Oct 2026</button>
      </div>
    </div>
    <div class="wl-scroll">
      <div class="wl-cal">
        <div class="wl-head"><div>Wk</div></div>
        <div class="wl-body">
          <fieldset class="wl-projects"><legend>Projects in the model</legend></fieldset>
          <div class="wl-lanes"></div>
        </div>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);

  PROJECTS.forEach((p) => {
    const l = document.createElement("label");
    l.className = "wl-project";
    l.style.setProperty("--c", p.color);
    l.innerHTML = `<input type="checkbox" checked><span class="wl-check" aria-hidden="true"></span><span>${p.name}</span>
      <small>${fmt(p.start, { day: "numeric", month: "short" })}–${fmt(p.end - DAY, { day: "numeric", month: "short" })}</small>`;
    l.querySelector("input").addEventListener("change", (e) => { p.on = e.target.checked; render(); });
    $(".wl-projects").append(l);
  });

  function render() {
    const span = VIEW_WEEKS * 7 * DAY, last = first + span - DAY;
    $(".wl-range").innerHTML = `W${weekNo(first)}–W${weekNo(first) + VIEW_WEEKS - 1}<span>${fmt(first, { day: "numeric", month: "short" })} – ${fmt(last, { day: "numeric", month: "short", year: "numeric" })}</span>`;
    $(".wl-head").innerHTML = `<div>Wk</div>` + Array.from({ length: VIEW_WEEKS }, (_, w) => `<div>${weekNo(first + w * 7 * DAY)}</div>`).join("");

    let items = 0, tasks = 0, peak = { n: -1, day: first };
    for (let d = 0; d < VIEW_WEEKS * 7; d++) {
      const day = first + d * DAY;
      const n = PROJECTS.filter((p) => p.on).reduce((a, p) => a + itemsFor(p, day).length, 0);
      items += n;
      if (n > peak.n) peak = { n, day };
    }

    const lanes = PROJECTS.filter((p) => p.on && p.start <= last && p.end > first).map((p) => {
      const letter = p.name.replace("Project ", "");
      // Phase bars, clipped to the view
      let from = p.start, bars = "";
      PHASES.forEach((ph) => {
        const to = p.start + Math.round(ph.to * (p.end - p.start) / DAY) * DAY;
        const a = Math.max(from, first), b = Math.min(to, last + DAY);
        if (b > a) {
          bars += `<div class="wl-phase" style="--c:${p.color};left:calc(${(a - first) / span * 100}% + 2px);width:calc(${(b - a) / span * 100}% - 4px)"
            title="${p.name}: ${ph.name}, ${fmt(from, { day: "numeric", month: "short" })}–${fmt(to - DAY, { day: "numeric", month: "short" })}"><b>${letter}</b>${ph.name}</div>`;
        }
        from = to;
      });
      // Every task this project has in each week, most frequent first
      const weeks = Array.from({ length: VIEW_WEEKS }, (_, w) => {
        const count = new Map();
        for (let d = 0; d < 7; d++) for (const t of itemsFor(p, first + (w * 7 + d) * DAY)) count.set(t, (count.get(t) || 0) + 1);
        const list = [...count].sort((x, y) => y[1] - x[1]);
        tasks += list.length;
        return `<ul aria-label="${p.name}, week ${weekNo(first + w * 7 * DAY)}">${list.map(([t]) => `<li>${t}</li>`).join("")}</ul>`;
      }).join("");
      return `<div class="wl-lane"><div class="wl-bars">${bars}</div><div class="wl-weeks">${weeks}</div></div>`;
    }).join("");
    $(".wl-lanes").innerHTML = lanes || `<p class="wl-empty">Tick a project to see its tasks.</p>`;

    $(".wl-stats").innerHTML = [
      [tasks, "Max tasks per calendar view"],
      [peak.n > 0 ? fmt(peak.day, { day: "numeric", month: "short" }) : "–", "Busiest day"],
      [items, "Items in 6 weeks"],
    ].map(([v, k]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  }

  const move = (weeks) => { first += weeks * 7 * DAY; render(); };
  $(".wl-prev").addEventListener("click", () => move(-1));
  $(".wl-next").addEventListener("click", () => move(1));
  $(".wl-home").addEventListener("click", () => { first = HOME; render(); });
  render();
})();
