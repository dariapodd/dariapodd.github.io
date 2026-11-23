// Two-page magazine viewer with a page-turn animation.
// Turns <div class="book-source" data-book> into an open magazine. Its children are the pages
// in order: the cover first, then page 1, 2, 3… Spreads read: [ – | cover ], [ 1 | 2 ], [ 3 | 4 ]…
// Each sheet of paper carries a right-hand page on its front and the next left-hand page on its
// back; turning forward swings the right page over the spine to become the left one.
// ⏮ ⏭ jump to the cover and the last spread. Arrows, ← → keys, clicking the left/right page, and swiping all turn pages.
(() => {
  const source = document.querySelector("[data-book]");
  if (!source) return;
  const pages = [...source.children];
  if (pages.length < 2) return;

  // Load page images on demand: only the spreads around the one in view. Without this script
  // the images load lazily in a plain list instead.
  const imgOf = (el) => (el.tagName === "IMG" ? el : el.querySelector("img"));
  pages.forEach((el, i) => {
    const img = imgOf(el);
    if (img && i > 3 && !img.complete) { img.dataset.src = img.getAttribute("src"); img.removeAttribute("src"); }
    if (img) img.removeAttribute("loading");
  });
  function loadAround(s) {
    for (let i = Math.max(0, 2 * s - 3); i <= Math.min(pages.length - 1, 2 * s + 4); i++) {
      const img = imgOf(pages[i]);
      if (img && img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
    }
  }

  // Sheet n: front = page 2n (cover, 2, 4…), back = page 2n+1 (1, 3, 5…)
  const sheets = [];
  for (let i = 0; i < pages.length; i += 2) sheets.push([pages[i], pages[i + 1] || null]);

  const book = document.createElement("section");
  book.className = "book";
  book.setAttribute("aria-roledescription", "carousel");
  book.setAttribute("aria-label", source.getAttribute("aria-label") || "Pages");
  book.innerHTML = `
    <div class="book-stage" tabindex="0"></div>
    <div class="deck-controls">
      <button class="deck-btn book-first" type="button" aria-label="First pages"><span aria-hidden="true">⏮︎</span></button>
      <button class="deck-btn book-prev" type="button" aria-label="Previous pages"><span aria-hidden="true">←</span></button>
      <p class="deck-count" aria-live="polite"></p>
      <button class="deck-btn book-next" type="button" aria-label="Next pages"><span aria-hidden="true">→</span></button>
      <button class="deck-btn book-last" type="button" aria-label="Last pages"><span aria-hidden="true">⏭︎</span></button>
    </div>`;
  const stage = book.querySelector(".book-stage");
  // Slide 0: a plain black page opposite the cover. It lies under the left-hand stack, so turned
  // pages cover it from the first turn on
  const base = document.createElement("div");
  base.className = "book-base";
  base.setAttribute("aria-hidden", "true");
  stage.append(base);
  // And a plain white back page opposite the last slide, under the right-hand stack
  const end = document.createElement("div");
  end.className = "book-base book-end";
  end.setAttribute("aria-hidden", "true");
  stage.append(end);
  const els = sheets.map(([front, back]) => {
    const sheet = document.createElement("div");
    sheet.className = "book-sheet";
    const f = document.createElement("div"); f.className = "book-face book-front";
    const b = document.createElement("div"); b.className = "book-face book-back";
    f.append(front);
    if (back) b.append(back); else b.classList.add("is-blank");
    sheet.append(f, b);
    stage.append(sheet);
    return sheet;
  });
  els[0].classList.add("is-first");
  els[els.length - 1].classList.add("is-last");
  source.replaceWith(book);

  const count = book.querySelector(".deck-count");
  const prev = book.querySelector(".book-prev"), next = book.querySelector(".book-next");
  const first = book.querySelector(".book-first"), lastBtn = book.querySelector(".book-last");
  // Spread s shows page 2s−1 on the left and page 2s on the right (cover = page 0), so the last
  // spread with anything on it is the one holding the final page
  const last = Math.ceil((pages.length - 1) / 2);
  let spread = 0;

  // Numbered like the original deck: the cover is slide 1, so spread s shows slides 2s and 2s+1
  function label(s) {
    if (s === 0) return "Cover";
    const left = 2 * s, right = 2 * s + 1;
    return right <= pages.length ? `${left}–${right}` : `${left}`;
  }

  // Turned sheets stack on the left (last turned on top), the rest on the right (next on top);
  // a sheet mid-turn rides above everything
  function stack() {
    els.forEach((sheet, k) => {
      sheet.style.zIndex = sheet.classList.contains("is-turning") ? String(els.length + 2)
        : String(sheet.classList.contains("is-turned") ? k + 1 : els.length - k);
    });
  }

  // instant: set the pages without the turn animation (used for the opening spread)
  function show(s, instant = false) {
    s = Math.max(0, Math.min(last, s));
    els.forEach((sheet, k) => {
      const turned = k < s;
      if (instant) {
        sheet.style.transition = "none";
        requestAnimationFrame(() => requestAnimationFrame(() => { sheet.style.transition = ""; }));
      } else if (sheet.classList.contains("is-turned") !== turned) {
        sheet.classList.add("is-turning");
        // Only the page leaving is shaded: the front going forward, the back going back
        sheet.classList.toggle("turn-back", !turned);
        const done = (e) => {
          if (e.target !== sheet) return;
          sheet.classList.remove("is-turning");
          sheet.removeEventListener("transitionend", done);
          stack();
        };
        sheet.addEventListener("transitionend", done);
        // Reduced motion: no transition runs, so settle straight away
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => done({ target: sheet }), 0);
      }
      sheet.classList.toggle("is-turned", turned);
      const showsFront = k === s, showsBack = k === s - 1;
      sheet.querySelector(".book-front").setAttribute("aria-hidden", String(!showsFront));
      sheet.querySelector(".book-back").setAttribute("aria-hidden", String(!showsBack));
    });
    stack();
    loadAround(s);
    spread = s;
    stage.classList.toggle("is-closed", s === 0);
    stage.classList.toggle("is-end", s === last);
    count.textContent = s === 0 ? "Cover" : `Slides ${label(s)}`;
    prev.disabled = first.disabled = s === 0;
    next.disabled = lastBtn.disabled = s === last;
  }

  prev.addEventListener("click", () => show(spread - 1));
  next.addEventListener("click", () => show(spread + 1));
  first.addEventListener("click", () => show(0));
  lastBtn.addEventListener("click", () => show(last));

  stage.addEventListener("click", (e) => {
    if (moved) return;
    const r = stage.getBoundingClientRect();
    show(spread + (e.clientX - r.left > r.width / 2 ? 1 : -1));
  });
  addEventListener("keydown", (e) => {
    const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
    if (e.altKey || e.ctrlKey || e.metaKey || typing) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); show(spread + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(spread - 1); }
    if (e.key === "Home") { e.preventDefault(); show(0); }
    if (e.key === "End") { e.preventDefault(); show(last); }
  });
  let startX = null, moved = false;
  stage.addEventListener("pointerdown", (e) => { startX = e.clientX; moved = false; });
  stage.addEventListener("pointermove", (e) => { if (startX !== null && Math.abs(e.clientX - startX) > 10) moved = true; });
  stage.addEventListener("pointerup", (e) => {
    if (startX !== null && Math.abs(e.clientX - startX) > 40) show(spread + (e.clientX < startX ? 1 : -1));
    startX = null;
    setTimeout(() => { moved = false; }, 0);
  });

  // Open on slides 2–3 rather than the closed cover
  show(Math.min(1, last), true);
})();
