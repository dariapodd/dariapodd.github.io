"""Writes fintech/index.html from the root index.html: same layout and words, fintech skin
(from fintech-portfolio.html): navy and mint, glass buttons, same fonts and sizes as enterprise, and a
live quaternion Julia set behind the hero (fintech/julia.js) instead of the Lorenz attractor.

Edit index.html (layout, words) or the SKIN list below, then run:
    python tools/build-fintech.py
Every replacement must match: if the homepage changes, the script stops and says which line
to update here.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")


# (homepage text, fintech text). Exact matches; each must occur at least once.
SKIN = [
    # ---- Head and header
    ("<title>Daria Podrezova: Product Designer, AI &amp; enterprise domains</title>",
     "<title>Daria Podrezova: fintech portfolio</title>"),
    ('title="Choose another portfolio style">enterprise portfolio<',
     'title="Choose another portfolio style">fintech portfolio<'),
    ('data-current="enterprise"', 'data-current="fintech"'),

    # ---- Colour: navy sections, mint-teal key colour
    ("background: rgba(28, 71, 56, 0.6);   /* deep green at 60% (Figma) */",
     "background: rgba(12, 58, 48, 0.85);   /* deep mint pill */"),

    # ---- Hero: the Julia set replaces the Lorenz attractor
    ('    <div class="micro micro--lorenz" aria-hidden="true"></div>\n', ""),
    # ---- The Lorenz attractor from the enterprise hero, beside the recommendations
    ('<section class="recs" id="recommendations" aria-labelledby="recs-title">',
     '<section class="recs" id="recommendations" aria-labelledby="recs-title">\n      <div class="micro micro--lorenz" aria-hidden="true"></div>'),
    ('<script src="enterprise/lorenz.js" defer></script>',
     '<script src="fintech/julia.js" defer></script>\n<script src="enterprise/lorenz.js" defer></script>'),


]

missing = []
for old, new in SKIN:
    if old not in html:
        missing.append(old)
    html = html.replace(old, new)
if missing:
    sys.exit("build-fintech: homepage text not found, update SKIN in tools/build-fintech.py:\n  "
             + "\n  ".join(m[:100] for m in missing))

SKIN_CSS = """
  /* ---------- Fintech skin ---------- */
  /* Hero, back to front: navy gradient (the fractal's own background colours), veil, the headline's
     ruled lines, then the Julia set (julia.js), which is transparent around the object and fades
     out towards the text */
  .hero { isolation: isolate; }   /* background: the page gradient, as in enterprise */
  .hero .julia-veil {
    position: absolute; z-index: -5; inset: 0; pointer-events: none;
    background: linear-gradient(90deg, rgba(30, 29, 25, 0.92) 0%, rgba(30, 29, 25, 0.7) 63%, rgba(30, 29, 25, 0) 70%);   /* in the enterprise background colour */
  }
  .hero .julia-stars { position: absolute; z-index: -4; inset: 0; width: 100%; height: 100%; pointer-events: none; }   /* stars: over the veil, under the ruled lines and the fractal */
  .hero h1::before { z-index: -4; }
  .hero .julia {
    position: absolute; z-index: -3; inset: 0; width: 100%; height: 100%; display: block;
    -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 38%, #000 70%);
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 38%, #000 70%);
  }
  @media (max-width: 760px) {
    .hero .julia-veil { background: rgba(30, 29, 25, 0.6); }
    .hero .julia {
      -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.18) 55%, rgba(0, 0, 0, 0.08));
      mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.18) 55%, rgba(0, 0, 0, 0.08));
    }
  }
  .hero h1 .dot { background: var(--accent); }
  /* Recommendations: a narrower column, with the Lorenz attractor (enterprise/lorenz.js) to its
     right; drag it to turn it. Narrow screens: full width, no attractor (as in the hero) */
  .recs { position: relative; isolation: isolate; }
  .recs.is-lorenz-grab { cursor: grab; }
  .recs.is-lorenz-dragging { cursor: grabbing; user-select: none; }
  @media (min-width: 1200px) {
    .recs > h2, .recs-grid { max-width: 760px; }
    /* same box as in the enterprise hero, so the attractor is the same size; centred vertically */
    .recs .micro--lorenz { top: calc(50% - 283px); height: 566px; left: max(59.5%, 880px); right: 0; }
  }
  /* #adjust: fine-tuning the fractal's position (julia.js) */
  .hero .julia-grab { position: absolute; z-index: 20; inset: 0; cursor: grab; touch-action: none; outline: 2px dashed var(--accent); outline-offset: -8px; }
  .hero .julia-grab:active { cursor: grabbing; }
  /* Dragging the hero morphs the fractal (julia.js) */
  .hero .julia-drag { position: absolute; z-index: 10; inset: 0; cursor: grab; touch-action: pan-y; }
  .hero.is-morphing, .hero.is-morphing * { cursor: grabbing; user-select: none; }
  .hero { -webkit-user-select: none; user-select: none; }   /* hero text can't be selected (double-click, drag) */
  .hero img { -webkit-user-drag: none; }
  .hero .view-select { position: relative; z-index: 11; }   /* the style menu stays clickable */
  .hero .scroll-hint { z-index: 11; }
  .hero .logos { position: relative; z-index: 11; }   /* logo hints show on hover */
  .julia-adjust {
    position: fixed; z-index: 40; left: 16px; bottom: 16px; width: min(360px, calc(100vw - 32px));
    display: grid; gap: 8px; padding: 14px 16px; border-radius: 12px;
    background: rgba(10, 20, 25, 0.94); border: 1px solid var(--rule); color: var(--ink);
    font: 300 14px/1.4 "Chakra Petch", system-ui, sans-serif;
  }
  .julia-adjust b { font: 400 14px/1.2 "Kode Mono", ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
  .julia-adjust output { font-variant-numeric: tabular-nums; color: #fff; }
  .julia-adjust div { display: flex; gap: 8px; }
  .julia-adjust button { font: inherit; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--rule); background: none; color: var(--ink); cursor: pointer; }
  .julia-adjust button[data-a="copy"] { margin-left: auto; background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }
  .julia-adjust small { min-height: 1.2em; color: var(--accent); word-break: break-all; }
  /* Glass buttons (Figma 387:1964): deep green fill, 40px background blur, a light top edge, a soft
     inner glow from below (inset shadows, so the buttons keep their size);
     the floating ones (resume, scroll hint) also cast a shadow */
  .resume, .button, .scroll-hint {
    background: rgba(28, 71, 56, 0.78);   /* deep green (Figma 387:1964) */
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.10),
      inset 0 -10px 18px rgba(255, 255, 255, 0.03);
  }
  .resume, .scroll-hint {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.10),
      inset 0 -10px 18px rgba(255, 255, 255, 0.03),
      0 8px 32px rgba(0, 0, 0, 0.35);
  }
  .scroll-hint { background: rgba(28, 71, 56, 0.2); }   /* lighter: 20% fill */
  /* "Coming soon" keeps the enterprise look: amber, square-ish corners, no glass */
  .button.button--soon {
    border-radius: 12px; background: rgba(255, 166, 0, 0.1); box-shadow: none;
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  @supports (corner-shape: squircle) { .button.button--soon { border-radius: 24px; corner-shape: squircle; } }
"""
if html.count("</style>\n</head>") != 1:
    sys.exit("build-fintech: expected one </style></head>")
html = html.replace("</style>\n</head>", SKIN_CSS + "</style>\n</head>")

# Page lives one folder down: point relative paths back at the site root
def up(m):
    attr, path = m.group(1), m.group(2)
    if re.match(r"(https?:|#|/|\.\./|data:|mailto:)", path):
        return m.group(0)
    if path == "./":
        path = ""
    return f'{attr}="../{path}"'

html = re.sub(r'\b(href|src|srcset)="([^"]*)"', up, html)   # srcset: single-URL ones only
html = html.replace('url("fonts/', 'url("../fonts/')
html = html.replace(" data-autoopen", "")

doctype, rest = html.split("\n", 1)
banner = "<!-- Generated from /index.html by tools/build-fintech.py. Do not edit. -->"
(root / "fintech").mkdir(exist_ok=True)
(root / "fintech" / "index.html").write_text(f"{doctype}\n{banner}\n{rest}", encoding="utf-8", newline="\n")
print("fintech/index.html written")
