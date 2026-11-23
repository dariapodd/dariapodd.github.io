// Magazine-style slide viewer with a page-turn animation (after Jamie Coulter's
// "Pure CSS Magazine style layout with transitions").
// Turns <div class="gallery" data-deck> full of slide <img>s into a single page at a time:
// the current page lifts from its left edge (the spine) and swings away to reveal the next;
// going back, the previous page swings in again.
// Arrows, the ← → keys, clicking the left/right half of the slide, and swiping all turn pages.
// Without this script the slides simply stay in a column.
(() => {
  const gallery = document.querySelector(".gallery[data-deck]");
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll("img")];
  if (slides.length < 2) return;

  const deck = document.createElement("section");
  deck.className = "deck";
  deck.setAttribute("aria-roledescription", "carousel");
  deck.setAttribute("aria-label", "Slides");
  deck.innerHTML = `
    <div class="deck-stage" tabindex="0" aria-live="off"></div>
    <div class="deck-controls">
      <button class="deck-btn deck-prev" type="button" aria-label="Previous slide"><span aria-hidden="true">←</span></button>
      <p class="deck-count" aria-live="polite"></p>
      <button class="deck-btn deck-next" type="button" aria-label="Next slide"><span aria-hidden="true">→</span></button>
    </div>`;
  const stage = deck.querySelector(".deck-stage");
  const pages = slides.map((img, i) => {
    const page = document.createElement("div");
    page.className = "deck-page";
    page.style.zIndex = String(slides.length - i);   // earlier pages lie on top
    img.removeAttribute("loading");                    // all pages share one spot: load them
    page.append(img);
    stage.append(page);
    return page;
  });
  gallery.replaceWith(deck);

  const count = deck.querySelector(".deck-count");
  const prev = deck.querySelector(".deck-prev"), next = deck.querySelector(".deck-next");
  const pad = (n) => String(n).padStart(2, "0");
  let current = 0;

  function show(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === current && count.textContent) return;
    // Pages before the current one are turned; the current one and those after lie flat
    pages.forEach((p, k) => {
      const turned = k < i;
      if (p.classList.contains("is-turned") !== turned) {
        p.classList.add("is-turning");
        p.addEventListener("transitionend", () => p.classList.remove("is-turning"), { once: true });
      }
      p.classList.toggle("is-turned", turned);
      p.setAttribute("aria-hidden", k === i ? "false" : "true");
    });
    current = i;
    count.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  prev.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));

  // Click the right half to turn forward, the left half to go back
  stage.addEventListener("click", (e) => {
    if (moved) return;
    const r = stage.getBoundingClientRect();
    show(current + (e.clientX - r.left > r.width / 2 ? 1 : -1));
  });

  // Arrow keys anywhere on the page (unless typing somewhere)
  addEventListener("keydown", (e) => {
    const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
    if (e.altKey || e.ctrlKey || e.metaKey || typing) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); show(current + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(current - 1); }
    if (e.key === "Home") { e.preventDefault(); show(0); }
    if (e.key === "End") { e.preventDefault(); show(slides.length - 1); }
  });

  // Swipe on touch screens
  let startX = null, moved = false;
  stage.addEventListener("pointerdown", (e) => { startX = e.clientX; moved = false; });
  stage.addEventListener("pointermove", (e) => { if (startX !== null && Math.abs(e.clientX - startX) > 10) moved = true; });
  stage.addEventListener("pointerup", (e) => {
    if (startX !== null && Math.abs(e.clientX - startX) > 40) show(current + (e.clientX < startX ? 1 : -1));
    startX = null;
    setTimeout(() => { moved = false; }, 0);
  });

  show(0);
})();
