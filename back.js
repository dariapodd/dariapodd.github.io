// Article pages: "Back to projects" returns to the portfolio style you came from.
// menu.js saves the style of each portfolio page for the browser session; if it was the caveman
// or fintech view, the back link points at the same spot on that homepage instead of enterprise.
// Include at the end of the body: <script src="../../back.js"></script>
(() => {
  let style = null;
  try { style = sessionStorage.getItem("portfolio-style"); } catch (e) {}
  if (style !== "caveman" && style !== "fintech") return;
  for (const a of document.querySelectorAll('a.back[href*="enterprise/"]')) {
    a.setAttribute("href", a.getAttribute("href").replace("enterprise/", style + "/"));
  }
})();
