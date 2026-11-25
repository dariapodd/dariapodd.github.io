"""Writes fintech/index.html from the root index.html: same layout and words, fintech skin
(from fintech-portfolio.html): navy and mint, pill buttons, same fonts and sizes as enterprise, and a
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

ACCENT = "#3ff0b4"            # mint signal colour
ACCENT_RGB = "63, 240, 180"

# (homepage text, fintech text). Exact matches; each must occur at least once.
SKIN = [
    # ---- Head and header
    ("<title>Daria Podrezova: Product Designer, AI &amp; enterprise domains</title>",
     "<title>Daria Podrezova: fintech portfolio</title>"),
    ('title="Choose another portfolio style">enterprise portfolio<',
     'title="Choose another portfolio style">fintech portfolio<'),
    ('data-current="enterprise"', 'data-current="fintech"'),

    # ---- Colour: navy sections, mint signal, cream titles
    ("--bg: #1e1d19;", "--bg: #121a1c;\n    --hero-bg: #0d1920;\n    --cream: #e7e2c9;"),
    ("--bg-glow: #393938;", "--bg-glow: #121a1c;"),
    ("--ink: #dddcc8;", "--ink: #ecebe4;"),
    ("--accent: #00ffcc;", f"--accent: {ACCENT};\n    --menu-accent: {ACCENT};   /* style menu's intro box */"),
    ("--accent-bg: rgba(0, 255, 204, 0.1);", f"--accent-bg: rgba({ACCENT_RGB}, 0.1);"),
    ("--body-black: #191613;", "--body-black: #121a1c;"),
    ("--body-grey: #3a3938;", "--body-grey: #1b2629;"),
    ("--body-light: #21201d;", "--body-light: #0f1d22;"),
    ("--tab: rgba(217, 217, 217, 0.15);", "--tab: rgba(167, 177, 179, 0.12);"),
    ("--rule: #3d414a;", "--rule: #23302f;"),
    ("background: rgba(28, 71, 56, 0.6);   /* deep green at 60% (Figma) */",
     "background: rgba(12, 58, 48, 0.85);   /* deep mint pill */"),
    ("background: rgba(25, 22, 19, 0.92);", "background: rgba(10, 20, 25, 0.94);"),

    # ---- Hero: the Julia set replaces the Lorenz attractor
    ('    <div class="micro micro--lorenz" aria-hidden="true"></div>\n', ""),
    ('<script src="enterprise/lorenz.js" defer></script>', '<script src="fintech/julia.js" defer></script>'),
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
  /* Hero: navy, with the Julia set (julia.js) behind the text and a veil so the text stays readable */
  .hero { background: var(--hero-bg); isolation: isolate; }
  .hero .julia { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; display: block; }
  .hero .julia-veil {
    position: absolute; z-index: -2; inset: 0; pointer-events: none;
    background: linear-gradient(90deg, rgba(13, 25, 32, 0.92) 0%, rgba(13, 25, 32, 0.7) 38%, rgba(13, 25, 32, 0) 70%);
  }
  @media (max-width: 760px) {
    .hero .julia-veil { background: linear-gradient(180deg, rgba(13, 25, 32, 0.55), rgba(13, 25, 32, 0.82) 55%, rgba(13, 25, 32, 0.92)); }
  }
  .hero h1 .dot { background: var(--accent); }
  .hero h1::before { display: none; }   /* no ruled lines under the headline */
  .intro, .project-desc, .project-quote, .rec { color: #d6dadb; }
  .project h2, .recs h2, .more h2, .more-card h3 { color: var(--cream); }
  /* Pill buttons */
  .resume, .button, .scroll-hint { border-radius: 999px; }
  .scroll-hint { background: rgba(8, 16, 20, 0.85); }
  @supports (corner-shape: squircle) {
    .resume, .button, .scroll-hint { border-radius: 999px; corner-shape: round; }
  }
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
