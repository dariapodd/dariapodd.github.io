// "View portfolio as" popup, shared by every portfolio view (Figma 299:110): the styles as
// cards with previews, centred over a dimmed page.
// Include with: <script src="../menu.js" defer data-current="json"></script>
// The selector link (.view-select a) opens it. With data-autoopen (the root page) it also opens
// on its own 300ms after load, once per browser session.
// Closes on a click outside, Esc, or choosing the page you're already on.
(() => {
  const script = document.currentScript;
  const base = new URL(".", script.src);            // site root, wherever the page lives
  const current = script.dataset.current;

  const STYLES = [
    { id: "enterprise", name: "enterprise", desc: "Normal, recommended", href: "enterprise/", thumb: "enterprise.jpg" },
    { id: "caveman", name: "caveman", href: "caveman/", thumb: "caveman.jpg",
      desc: 'Very succinct, inspired by <a href="https://dev.to/onsen/caveman-claude-the-token-cutting-skill-thats-changing-ai-workflows-4hmc" target="_blank" rel="noopener">this skill</a>' },
    { id: "elevator-pitch", name: "elevator pitch", desc: "Imagine you’re in a very tall building...", href: "elevator-pitch/", thumb: "elevator.jpg" },
    { id: "json", name: "json", desc: "Works best if you’re a robot", href: "json/", thumb: "json.jpg" },
  ];

  // Descriptions use Chakra Petch; load it on pages that don't already
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => l.href.includes("Chakra"))) {
    document.head.insertAdjacentHTML("beforeend",
      '<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300&display=swap" rel="stylesheet">');
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
    /* Dims the page under the popup */
    .style-menu-dim {
      position: fixed;
      inset: 0;
      z-index: 29;
      background: rgba(0, 0, 0, 0.8);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease-out, visibility 0s linear 0.3s;
    }
    .style-menu-dim.is-open { opacity: 1; visibility: visible; transition: opacity 0.3s ease-out, visibility 0s; }
    .welcome {
      position: fixed;
      z-index: 31;
      top: 50%;
      left: 50%;
      width: min(705px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 32px 21px;
      box-sizing: border-box;
      border: 0.952px solid #4c4c4a;
      border-radius: 24px;
      background: rgba(43, 42, 40, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 72px rgba(0, 0, 0, 0.25);
      color: #dddcc8;
      text-transform: none;
      letter-spacing: normal;
      opacity: 0;
      transform: translate(-50%, calc(-50% + 12px));
      visibility: hidden;
      transition: opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s linear 0.3s;
    }
    .welcome.is-open { opacity: 1; transform: translate(-50%, -50%); visibility: visible; transition: opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s; }
    @media (prefers-reduced-motion: reduce) {
      .welcome, .welcome.is-open, .style-menu-dim, .style-menu-dim.is-open { transition: none; }
    }
    .welcome h2 {
      margin: 0;
      color: var(--menu-accent, #00ffcc);
      font: 400 16px/19.2px "Kode Mono", ui-monospace, monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
    }
    .welcome ul { display: grid; grid-template-columns: 1fr 1fr; gap: 21px; margin: 0; padding: 0; list-style: none; }
    @media (max-width: 640px) { .welcome ul { grid-template-columns: 1fr; } }
    .welcome-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 24px;
      border-radius: 8px;
      background: #353330;
    }
    .welcome-card img { display: block; width: 100%; height: auto; aspect-ratio: 273 / 180; object-fit: cover; border-radius: 6px; background: #000; }
    .welcome-text { display: flex; flex-direction: column; padding: 12px; }
    .welcome-card .name {
      color: inherit;
      text-decoration: none;
      white-space: normal;
      font: 400 16px/19.2px "Kode Mono", ui-monospace, monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      outline: none;
    }
    .welcome-card .name::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }   /* whole card is the link */
    .welcome-card .desc { font: 300 14px/19.6px "Chakra Petch", system-ui, sans-serif; }
    .welcome-card .desc a { position: relative; z-index: 1; color: inherit; text-decoration: underline; }
    .welcome-card:hover .name, .welcome-card:focus-within .name { font-weight: 600; }
    .welcome-card:hover, .welcome-card:focus-within { background: #3d3b37; }
    .welcome-card:has(.name:focus-visible) { outline: 1px solid var(--menu-accent, #00ffcc); }
    @supports (corner-shape: squircle) {
      .welcome { border-radius: 48px; corner-shape: squircle; }
      .welcome-card { border-radius: 16px; corner-shape: squircle; }
      .welcome-card img { border-radius: 12px; corner-shape: squircle; }
    }
  </style>`);

  const dim = document.createElement("div");
  dim.className = "style-menu-dim";
  dim.setAttribute("aria-hidden", "true");
  document.body.append(dim);

  const box = document.createElement("div");
  box.className = "welcome";
  box.id = "style-menu";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "welcome-title");
  box.innerHTML = `
    <h2 id="welcome-title">Hey! I’ve built multiple portfolio styles<br>for different audiences, have a look:</h2>
    <ul>${STYLES.map(s => `
      <li class="welcome-card">
        <img src="${new URL("assets/styles/" + s.thumb, base).href}" width="546" height="360" alt="" loading="lazy">
        <div class="welcome-text">
          <a class="name" href="${new URL(s.href, base).href}"${s.id === current ? ' aria-current="page"' : ""}>${s.name}</a>
          <span class="desc">${s.desc}</span>
        </div>
      </li>`).join("")}</ul>`;
  document.body.append(box);

  const nav = document.querySelector(".view-select");
  const toggle = nav && nav.querySelector("a");
  if (toggle) {
    toggle.setAttribute("aria-haspopup", "dialog");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", box.id);
  }

  let before = null;
  const isOpen = () => box.classList.contains("is-open");
  function open() {
    if (isOpen()) return;
    before = document.activeElement;
    box.querySelectorAll("img").forEach(img => { img.loading = "eager"; });
    box.classList.add("is-open");
    dim.classList.add("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    (box.querySelector('.name[aria-current="page"]') || box.querySelector(".name")).focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen()) return;
    box.classList.remove("is-open");
    dim.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (before && before.focus) before.focus({ preventScroll: true });
  }

  if (toggle) toggle.addEventListener("click", (e) => { e.preventDefault(); isOpen() ? close() : open(); });
  dim.addEventListener("click", close);
  // Choosing the page you're already on just closes the popup
  box.querySelectorAll('.name[aria-current="page"]').forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); close(); }));

  // Esc closes; Tab stays inside the popup while it's open
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    const focusable = [...box.querySelectorAll("a")];
    const i = focusable.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
    else if (!e.shiftKey && i === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
  });

  // Root page: opens on its own once per browser session
  if ("autoopen" in script.dataset) {
    let seen = false;
    try { seen = sessionStorage.getItem("welcome-seen") === "1"; sessionStorage.setItem("welcome-seen", "1"); } catch (e) {}
    if (!seen) {
      const later = () => setTimeout(open, 300);
      if (document.readyState === "complete") later();
      else addEventListener("load", later);
    }
  }
})();
