// "View portfolio as" dropdown, shared by every portfolio view.
// Include with: <script src="../menu.js" defer data-current="json"></script>
// The selector link (.view-select a) toggles a panel listing all styles. With data-autoopen
// (the root page) a welcome popup with style previews opens 300ms after load, once per session.
(() => {
  const script = document.currentScript;
  const base = new URL(".", script.src);            // site root, wherever the page lives
  const current = script.dataset.current;

  const STYLES = [
    { id: "enterprise", name: "enterprise", desc: "Normal, recommended", href: "enterprise/" },
    { id: "caveman", name: "caveman", href: "caveman/",
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
      background: rgba(0, 0, 0, 0.8);
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
      background: var(--menu-accent, #00ffcc);   /* pages can recolour it */
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
    .style-menu ul { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }   /* a little air between highlighted items */
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
    /* An item whose description has its own link: the name is the item's link, stretched over
       the whole item, and the description's link sits above it */
    .style-menu .item.has-links { position: relative; }
    .style-menu .item-link { color: inherit; text-decoration: none; outline: none; }
    .style-menu .item-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
    .style-menu .item.has-links .desc a { position: relative; z-index: 1; }
    .style-menu .item.has-links:hover,
    .style-menu .item.has-links:focus-within { background: #353330; }
    .style-menu .item.has-links:hover .name,
    .style-menu .item.has-links:focus-within .name { font-weight: 600; }
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
      const href = new URL(s.href, base).href;
      // A link can't hold another link: when the description has one, only the name links
      if (s.desc.includes("<a ")) {
        return `<li><div class="${cls} has-links"><a class="name item-link" href="${href}"${target}${currentAttr}>${s.name}</a><span class="desc">${s.desc}</span></div></li>`;
      }
      return `<li><a class="${cls}" href="${href}"${target}${currentAttr}>${inner}</a></li>`;
    }).join("")}</ul>`;
  nav.append(menu);
  const dim = document.createElement("div");
  dim.className = "style-menu-dim";
  dim.setAttribute("aria-hidden", "true");
  document.body.append(dim);

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", menu.id);
  const links = [...menu.querySelectorAll("a.item, a.item-link")];

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
    const start = links.findIndex(a => a.closest(".item").classList.contains("is-current"));
    const next = i === -1 ? links[Math.max(0, start)]
      : links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length];
    next.focus();
  });

  // ---- Welcome popup (root page, Figma 299:110): the styles as cards with previews ----
  // Shown once per browser session, 300ms after the root page loads. Closes on a click outside,
  // Esc, or choosing enterprise (the page you're on).
  const WELCOME = [
    { id: "enterprise", name: "enterprise", desc: "Normal, recommended", href: "enterprise/", thumb: "enterprise.jpg" },
    { id: "caveman", name: "caveman", href: "caveman/", thumb: "caveman.jpg",
      desc: 'Very succinct, inspired by <a href="https://dev.to/onsen/caveman-claude-the-token-cutting-skill-thats-changing-ai-workflows-4hmc" target="_blank" rel="noopener">this skill</a>' },
    { id: "elevator-pitch", name: "elevator pitch", desc: "Imagine you’re in a very tall building...", href: "elevator-pitch/", thumb: "elevator.jpg" },
    { id: "json", name: "json", desc: "Works best if you’re a robot", href: "json/", thumb: "json.jpg" },
  ];
  function welcome() {
    document.head.insertAdjacentHTML("beforeend", `<style>
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
        opacity: 0;
        transform: translate(-50%, calc(-50% + 12px));
        visibility: hidden;
        transition: opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s linear 0.3s;
      }
      .welcome.is-open { opacity: 1; transform: translate(-50%, -50%); visibility: visible; transition: opacity 0.3s ease-out, transform 0.3s ease-out, visibility 0s; }
      @media (prefers-reduced-motion: reduce) { .welcome, .welcome.is-open { transition: none; } }
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
    const box = document.createElement("div");
    box.className = "welcome";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "welcome-title");
    box.innerHTML = `
      <h2 id="welcome-title">Hey! I’ve built multiple portfolio styles<br>for different audiences, have a look:</h2>
      <ul>${WELCOME.map(s => `
        <li class="welcome-card">
          <img src="${new URL("assets/styles/" + s.thumb, base).href}" width="546" height="360" alt="">
          <div class="welcome-text">
            <a class="name" href="${new URL(s.href, base).href}"${s.id === current ? ' aria-current="page"' : ""}>${s.name}</a>
            <span class="desc">${s.desc}</span>
          </div>
        </li>`).join("")}</ul>`;
    document.body.append(box);
    const before = document.activeElement;
    // Esc closes; Tab stays inside the popup while it's open
    const keys = (e) => {
      if (e.key === "Escape") { hide(); return; }
      if (e.key !== "Tab") return;
      const focusable = [...box.querySelectorAll("a")];
      const i = focusable.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!e.shiftKey && i === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
    };
    const show = () => { box.classList.add("is-open"); dim.classList.add("is-open"); box.querySelector(".name").focus({ preventScroll: true }); };
    function hide() {
      box.classList.remove("is-open");
      dim.classList.remove("is-open");
      document.removeEventListener("keydown", keys);
      if (before && before.focus) before.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", keys);
    dim.addEventListener("click", () => { if (box.classList.contains("is-open")) hide(); });
    // Choosing the page you're already on just closes the popup
    box.querySelectorAll('.name[aria-current="page"]').forEach(a => a.addEventListener("click", (e) => { e.preventDefault(); hide(); }));
    setTimeout(show, 300);
  }

  // Root page: welcome popup once per browser session
  if ("autoopen" in script.dataset) {
    let seen = false;
    try { seen = sessionStorage.getItem("welcome-seen") === "1"; sessionStorage.setItem("welcome-seen", "1"); } catch (e) {}
    if (!seen) {
      if (document.readyState === "complete") welcome();
      else addEventListener("load", welcome);
    }
  }
})();
