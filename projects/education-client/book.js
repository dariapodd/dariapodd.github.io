// Two-page magazine viewer with a page-turn animation.
// Turns <div class="book-source" data-book> into an open magazine. Its children are the pages
// in order: the cover first, then page 1, 2, 3… Spreads read: [ – | cover ], [ 1 | 2 ], [ 3 | 4 ]…
// Each sheet of paper carries a right-hand page on its front and the next left-hand page on its
// back; turning forward swings the right page over the spine to become the left one.
// Arrows, ← → keys, clicking the left/right page, and swiping all turn pages.
(() => {
  const source = document.querySelector("[data-book]");
  if (!source) return;
  const pages = [...source.children];
  if (pages.length < 2) return;

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
      <button class="deck-btn book-prev" type="button" aria-label="Previous pages"><span aria-hidden="true">←</span></button>
      <p class="deck-count" aria-live="polite"></p>
      <button class="deck-btn book-next" type="button" aria-label="Next pages"><span aria-hidden="true">→</span></button>
    </div>`;
  const stage = book.querySelector(".book-stage");
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
  source.replaceWith(book);

  const count = book.querySelector(".deck-count");
  const prev = book.querySelector(".book-prev"), next = book.querySelector(".book-next");
  // Spread s shows page 2s−1 on the left and page 2s on the right (cover = page 0), so the last
  // spread with anything on it is the one holding the final page
  const last = Math.ceil((pages.length - 1) / 2);
  let spread = 0;

  function label(s) {
    if (s === 0) return "Cover";
    const left = 2 * s - 1, right = 2 * s;
    return right < pages.length ? `${left}–${right}` : `${left}`;
  }

  // Turned sheets stack on the left (last turned on top), the rest on the right (next on top);
  // a sheet mid-turn rides above everything
  function stack() {
    els.forEach((sheet, k) => {
      sheet.style.zIndex = sheet.classList.contains("is-turning") ? String(els.length + 2)
        : String(sheet.classList.contains("is-turned") ? k + 1 : els.length - k);
    });
  }

  function show(s) {
    s = Math.max(0, Math.min(last, s));
    els.forEach((sheet, k) => {
      const turned = k < s;
      if (sheet.classList.contains("is-turned") !== turned) {
        sheet.classList.add("is-turning");
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
    spread = s;
    stage.classList.toggle("is-closed", s === 0);
    stage.classList.toggle("is-end", s === last);
    count.textContent = s === 0 ? "Cover" : `Pages ${label(s)}`;
    prev.disabled = s === 0;
    next.disabled = s === last;
  }

  prev.addEventListener("click", () => show(spread - 1));
  next.addEventListener("click", () => show(spread + 1));
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

  show(0);
})();
