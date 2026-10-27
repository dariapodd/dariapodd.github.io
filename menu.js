// "View portfolio as" dropdown, shared by every portfolio view.
// Include with: <script src="../menu.js" defer data-current="json"></script>
// The selector link (.view-select a) toggles a panel listing all styles. With data-autoopen
// (the root page) the panel rolls down on its own 300ms after load.
(() => {
  const script = document.currentScript;
  const base = new URL(".", script.src);            // site root, wherever the page lives
  const current = script.dataset.current;

  const STYLES = [
    { id: "enterprise", name: "enterprise", desc: "Normal, recommended", href: "./" },
    { id: "caveman", name: "caveman", soon: true,
      desc: 'Very succinct, inspired by <a href="https://dev.to/onsen/caveman-claude-the-token-cutting-skill-thats-changing-ai-workflows-4hmc" target="_blank" rel="noopener">this skill</a>' },
    { id: "startup", name: "startup", soon: true, desc: "The one with emojis" },
    { id: "elevator-pitch", name: "elevator pitch simulator", desc: "Imagine yourself in a lift in an endlessly tall building...", href: "elevator-pitch/" },
    { id: "json", name: "json", desc: "Works best if you’re a robot", href: "json/" },
    { id: "resume", name: "go straight to resume", desc: "View and download PDF", href: "resume-daria-podrezova.pdf", newTab: true },
  ];

  // Descriptions use Chakra Petch; load it on pages that don't already
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => l.href.includes("Chakra"))) {
    document.head.insertAdjacentHTML("beforeend",
      '<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300&display=swap" rel="stylesheet">');
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
    .view-select { position: relative; }
    .style-menu {
      position: absolute;
      z-index: 30;
      top: calc(100% + 4px);
      left: var(--menu-left, 0px);
      width: min(400px, calc(100vw - 106px));
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 32px 20px;
      border: 1px solid #4c4c4a;
      border-radius: 24px;
      background: rgba(43, 42, 40, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 72px rgba(0, 0, 0, 0.25);
      color: #dddcc8;
      text-transform: none;
      letter-spacing: normal;
      white-space: normal;
      /* closed: rolled up behind its top edge */
      clip-path: inset(0 0 100% 0 round 24px);
      opacity: 0;
      transform: translateY(-6px);
      visibility: hidden;
      transition: clip-path 0.3s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s linear 0.3s;
    }
    .style-menu.is-open {
      clip-path: inset(0 0 0 0 round 24px);
      opacity: 1;
      transform: none;
      visibility: visible;
      transition: clip-path 0.3s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s;
    }
    /* Dims the page under the open menu */
    .style-menu-dim {
      position: fixed;
      inset: 0;
      z-index: 29;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease-out, visibility 0s linear 0.3s;
    }
    .style-menu-dim.is-open {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease-out, visibility 0s;
    }
    @media (prefers-reduced-motion: reduce) {
      .style-menu, .style-menu.is-open, .style-menu-dim, .style-menu-dim.is-open { transition: none; }
    }
    /* Teal intro box above the heading */
    .style-menu .intro-box {
      margin: 0;
      padding: 8px 12px;
      border-radius: 8px;
      background: #00ffcc;
      color: #000;
      text-align: center;
    }
    .style-menu h2 {
      margin: 0;
      text-align: center;
      font: 400 16px/19.2px "Kode Mono", ui-monospace, monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .style-menu .intro-box,
    .style-menu .desc {
      margin: 0;
      font: 300 14px/19.6px "Chakra Petch", system-ui, sans-serif;
    }
    .style-menu ul { margin: 0; padding: 0; list-style: none; }
    .style-menu .item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      border-radius: 8px;
      color: inherit;
      text-decoration: none;
      white-space: normal;      /* undo the page's .view-select a { nowrap } */
      font-weight: 400;
      outline: none;
    }
    .style-menu .name {
      font: 400 16px/19.2px "Kode Mono", ui-monospace, monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .style-menu .item.is-current { background: #353330; }
    .style-menu a.item:hover,
    .style-menu a.item:focus-visible { background: #353330; font-weight: 400; }
    .style-menu a.item:hover .name,
    .style-menu a.item:focus-visible .name { font-weight: 600; }
    .style-menu .item.is-soon { opacity: 0.45; cursor: default; }
    .style-menu .desc a { color: inherit; text-decoration: underline; }
    /* 8px corners with Figma-style smoothing → 16px squircle where supported */
    @supports (corner-shape: squircle) {
      .style-menu .intro-box, .style-menu .item { border-radius: 16px; corner-shape: squircle; }
    }
  </style>`);

  const nav = document.querySelector(".view-select");
  const toggle = nav && nav.querySelector("a");
  if (!toggle) return;

  const menu = document.createElement("div");
  menu.className = "style-menu";
  menu.id = "style-menu";
  menu.innerHTML = `
    <p class="intro-box">Hey! I’ve built multiple portfolio styles for different audiences, have a look:</p>
    <h2>select style</h2>
    <ul>${STYLES.map(s => {
      const cls = `item${s.id === current ? " is-current" : ""}${s.soon ? " is-soon" : ""}`;
      const inner = `<span class="name">${s.name}</span><span class="desc">${s.desc}</span>`;
      if (s.soon) return `<li><div class="${cls}" aria-disabled="true" title="Coming soon">${inner}</div></li>`;
      const target = s.newTab ? ' target="_blank" rel="noopener"' : "";
      const currentAttr = s.id === current ? ' aria-current="page"' : "";
      return `<li><a class="${cls}" href="${new URL(s.href, base).href}"${target}${currentAttr}>${inner}</a></li>`;
    }).join("")}</ul>`;
  nav.append(menu);
  const dim = document.createElement("div");
  dim.className = "style-menu-dim";
  dim.setAttribute("aria-hidden", "true");
  document.body.append(dim);

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", menu.id);
  const links = [...menu.querySelectorAll("a.item")];

  // Line the panel up with the start of the selector link
  const place = () => menu.style.setProperty("--menu-left", Math.min(toggle.offsetLeft, Math.max(0, nav.clientWidth - menu.offsetWidth)) + "px");

  const isOpen = () => menu.classList.contains("is-open");
  function open() { place(); menu.classList.add("is-open"); dim.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); }
  function close() { menu.classList.remove("is-open"); dim.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }

  toggle.addEventListener("click", (e) => { e.preventDefault(); isOpen() ? close() : open(); });
  document.addEventListener("click", (e) => { if (isOpen() && !nav.contains(e.target)) close(); });
  addEventListener("resize", () => { if (isOpen()) place(); });

  // Keyboard: ↑/↓ move between styles, Enter opens one, Esc closes
  document.addEventListener("keydown", (e) => {
    if (!isOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Escape") { close(); toggle.focus(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = links.indexOf(document.activeElement);
    const start = links.findIndex(a => a.classList.contains("is-current"));
    const next = i === -1 ? links[Math.max(0, start)]
      : links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length];
    next.focus();
  });

  // Root page: the menu is open by default, rolling down 300ms after load
  if ("autoopen" in script.dataset) {
    if (document.readyState === "complete") setTimeout(open, 300);
    else addEventListener("load", () => setTimeout(open, 300));
  }
})();
