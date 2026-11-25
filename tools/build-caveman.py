"""Writes caveman/index.html from the root index.html: same layout, caveman words,
reddish accent instead of teal; same fonts as enterprise.

Edit index.html (layout) or the COPY list below (words), then run:
    python tools/build-caveman.py
Every replacement must match: if the homepage copy changes, the script stops and says
which line to update here.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")

ACCENT = "#ec6039"                      # Figma 40:26
ACCENT_RGB = "236, 96, 57"

# (homepage text, caveman text). Exact matches; each must occur at least once.
COPY = [
    # ---- Head
    ("<title>Daria Podrezova: Product Designer, AI &amp; enterprise domains</title>",
     "<title>Daria Podrezova: caveman portfolio</title>"),

    # ---- Header and intro (Figma 40:2)
    ("<span>view portfolio as:</span>", "<span>see portfolio as:</span>"),
    ('title="Choose another portfolio style">enterprise portfolio<',
     'title="Choose another portfolio style">caveman portfolio<'),
    ("<h1>Hi, I’m Daria,<br>Product Designer,<br>Agentic AI &amp; enterprise<span",
     "<h1>Daria build prototype.<br>Client see, understand,<br>say yes<span"),
    ("I’m a communicator, explorer, builder and engineers’ friend with 14 years in design, a Master’s in Computer Science, and experience in project management and teaching. How I work: talk to people. Find the real problem. Map the workflow, simplify it. Prototype it so stakeholders see it, understand it, and say yes.",
     "How Daria work? Talk to people. Find real problem. Map ugly workflow, make less ugly. Build prototype. Chiefs see. Chiefs understand. Chiefs say yes. Daria talk, explore, build, friend of builders. 14 winters in design. Big brain paper in Computer Science. Also lead projects, also teach young ones."),
    ('<a class="scroll-hint" href="#project-1">scroll down for projects and recommendations ↓</a>',
     '<a class="scroll-hint" href="#project-1">see my trophies ↓</a>'),

    # ---- Projects
    ('<h2 id="project-1">4-dimensional spatial collaboration</h2>', '<h2 id="project-1">Magic 4D rail map</h2>'),
    ("<p>Immersive Spatial Collaboration Tool for railway asset management. I’ve led complex prototyping and design system development; collaborated on user research and delivery support. <strong>Result:</strong> efficient planning, less time/cost spent on field visits.</p>",
     "<p>Rail tribe. Many tracks, many tunnels, many things to fix. Daria lead big prototype and design system for magic 4D map. Talk to people. Help build. <strong>Result:</strong> fewer walks to track. Plan faster. Save time. Save shiny coins.</p>"),
    ('alt="Global EY Design Studio award, won in 2024 for Breakthrough Product"',
     'alt="Shiny trophy: Global EY Design Studio award, 2024, Breakthrough Product"'),
    ("<span>Won in 2024 for Breakthrough Product</span>",
     "<span>Big tribe give Daria trophy in 2024. New thing nobody make before.</span>"),

    ('<h2 id="project-2">Government/<wbr>health portal</h2>', '<h2 id="project-2">Chief approval cave</h2>'),
    ("<p>Audit and redesign of a complex certification/approval flow with multiple organisations and departments involved, following a recent ServiceNow implementation.</p>",
     "<p>Many tribes, many chiefs, one long path to get stamp. New ServiceNow cave already built. Daria walk whole path, find where people get lost, make path short.</p>"),
    ("<p><strong>Result: average approval time reduced from 12 months to 3 months.</strong></p>",
     "<p><strong>Result: wait for chief yes go from 12 moons to 3 moons.</strong></p>"),

    ('<h2 id="project-3">Luxury in-store retail apps</h2>', '<h2 id="project-3">Shiny shop apps</h2>'),
    ("<p>Luxury fashion retailer with department stores and multi-brand boutiques, where sales rely on personal connections between customers and style assistants. A family of iOS apps for style assistants, warehouse and delivery teams: style suggestions, stock access, indoor navigation and checkout on iOS.</p>",
     "<p>Big fancy shop, many small fancy shops. People buy shiny clothes from helper they trust. Daria make family of iOS apps for helpers, storage cave and runners: pick outfit, find stock, find way in shop, pay right there.</p>"),
    ("<p><strong>Result: +10% items sold per sales assistant year on year, 550 devices making 8,000 barcode scans a day, and the country’s first mobile checkout on iOS.</strong></p>",
     "<p><strong>Result: each helper sell 10% more every winter. 550 glass stones scan 8,000 stripes a day. First pocket pay-stone in whole land.</strong></p>"),

    ('<h2 id="project-6">Literary translation workbench</h2>', '<h2 id="project-6">Story tongue-swap stone</h2>'),
    ("<p><strong>Agent skill.</strong> Manages terminology, character names, translation rules and style controls. Makes it possible to translate a fiction novel with consistent personal style choices in about 10 hours.</p>",
     "<p><strong>Agent skill.</strong> Keep words, hero names, swap rules and style in one place. Whole story-book go to other tongue in about 10 hours. Same voice all way.</p>"),

    ('<h2 id="project-4">Social startup for the Deaf community</h2>', '<h2 id="project-4">Hand-talk tribe app</h2>'),
    ("<p>E2E Product Design – user research, focus groups, questionnaires, personas, journey mapping, data analysis, stakeholder pitches, lo-fi, hi-fi, UI and handover. iOS PoC app delivered.</p>",
     "<p><strong>Whole hunt, start to end.</strong> For Deaf tribe and Auslan hand-talkers. Ask questions, listen to groups, draw people and journeys, count data, pitch to chiefs. Draw rough screens, then pretty screens, give to builders. iOS app made.</p>"),

    ('<h2 id="project-5">Large education client</h2>', '<h2 id="project-5">Big learning cave</h2>'),
    ("<p><strong>Current-state assessment.</strong> Comprehensive experience assessment and process mapping of an internal admin role at a major education client: around 20 systems and many siloed departments, mapped end to end from the admin’s point of view for the first time.</p>",
     "<p><strong>Look at cave now.</strong> One helper run errands between many caves, 20 magic stones, many tribes who not talk. Daria walk whole path with helper, draw first full map. Big report for chiefs.</p>"),

    ('<h2 id="project-8">AI metadata and transcription automation</h2>', '<h2 id="project-8">Chief scroll keeper</h2>'),
    ("<p><strong>Government client.</strong> UX Lead: AI-driven transcription, metadata automation and document management workflow PoC prototyped and implemented.</p>",
     "<p><strong>Chief tribe. UX Lead.</strong> AI listen, write down talk, tag scrolls, file scrolls. Daria prototype it. Tribe build it.</p>"),

    ('<h2 id="project-7">Figma &amp; AI Teaching</h2>', '<h2 id="project-7">Teach tribe Figma fire</h2>'),
    ("<p>Learning sessions content and delivery, go-to prototyping support for the APAC team: 68 training sessions on advanced prototyping and automation, plus hands-on 1:1 help.</p>",
     "<p>Whole APAC tribe come to Daria for prototype help. 68 fire-teaching sessions on big prototype and automation magic. Plus help one by one.</p>"),

    ('<h2 id="project-9">Spatial digital twin</h2>', '<h2 id="project-9">Big hole magic twin</h2>'),
    ("<p><strong>UX Lead.</strong> GIS visualisations, digital twin and AI-assisted planning platform for the processing industry. Interactive prototypes for sales pitches, PoC web app delivered.</p>",
     "<p><strong>UX Lead.</strong> Mining tribe. Big hole, far away. Many rocks, many machines. Daria make magic map copy of whole hole, with AI helper for planning. Prototypes to show chiefs. Web app made.</p>"),

    # Buttons
    (">learn more ↗</a>", ">more hunt →</a>"),
    (">case study coming soon</span>", ">story come later</span>"),

    # ---- Recommendations (quotes stay in the tribe's own words)
    ('<h2 id="recs-title">recommendations</h2>', '<h2 id="recs-title">tribe say</h2>'),

    # ---- More projects
    ('<h2 id="more-title">More projects</h2>', '<h2 id="more-title">More hunts</h2>'),
    ("<h3>UJM builder skill</h3>", "<h3>Journey map maker skill</h3>"),
    ("<p>With hard styling rules</p>", "<p>Strict style rules</p>"),
    ("<h3>Illustrations and icons</h3>", "<h3>Cave paintings and icons</h3>"),
    ("<h3>Theremin glove</h3>", "<h3>Music glove</h3>"),
    ("<h3>UI Motion sickness research</h3>", "<h3>Screen make belly sick</h3>"),
    ("<p>Physical Arduino prototype</p>", "<p>Real prototype you touch, Arduino brain</p>"),
    ("<p>Local search service, 2.6M monthly visitors</p>", "<p>Find-place service, 2.6M visitors each moon</p>"),
    ("<p>Software vendor portal, 450 pages</p>", "<p>Big software tribe portal, 450 pages</p>"),
    (">view ↗</a>", ">look ↗</a>"),

    # ---- Style: reddish accent
    # Hero: the asteroid belt (lorenz.js, belt mode) instead of the fractal; the recommendations
    # keep the attractor beside them, its travelling dot in the red accent
    ('<script src="enterprise/julia.js" defer></script>\n', ""),
    ("  </header>", '    <div class="micro micro--lorenz" data-mode="belt" aria-hidden="true"></div>\n  </header>'),
    # Glass buttons in deep red-brown
    ("background: rgba(28, 71, 56, 0.78);   /* glass fill */", "background: rgba(84, 36, 24, 0.78);   /* glass fill, red-brown */"),
    (".scroll-hint { background: rgba(28, 71, 56, 0.2); }", ".scroll-hint { background: rgba(84, 36, 24, 0.2); }"),
    ("--accent: #00ffcc;", f"--accent: {ACCENT};\n    --menu-accent: {ACCENT};   /* style menu's intro box */"),
    ("--accent-bg: rgba(0, 255, 204, 0.1);", f"--accent-bg: rgba({ACCENT_RGB}, 0.1);"),
    ("background: rgba(28, 71, 56, 0.6);   /* deep green at 60% (Figma) */",
     "background: rgba(84, 36, 24, 0.6);   /* deep red-brown at 60% */"),
    ('data-current="enterprise"', 'data-current="caveman"'),
]

missing = []
for old, new in COPY:
    if old not in html:
        missing.append(old)
    html = html.replace(old, new)
if missing:
    sys.exit("build-caveman: homepage text not found, update COPY in tools/build-caveman.py:\n  "
             + "\n  ".join(m[:100] for m in missing))

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

# ---- Rocks (caveman/rocks.js): low-poly stones floating over the first project, in % of the
# block so they scale with it. Positions from Figma 40:2 (1920-wide frame, project block 973 tall).
ROCK_CSS = """
  /* ---------- Rocks: floating low-poly stones (rocks.js) ---------- */
  .rock {
    position: absolute;
    z-index: 5;               /* nearest layer: over text, screenshots and diamonds */
    aspect-ratio: 1;
    pointer-events: none;
    will-change: transform;
  }
  .rock canvas { display: block; width: 100%; height: 100%; }
  .rock--a { left: max(69.2%, 1080px); top: -88%; width: 26.7%; }   /* up in the intro, on the asteroid belt; clear of the headline */
  .rock--b { left: 79.2%; top: 53.5%; width: 34.5%; }         /* mirrored, off the bottom-right corner of project 1 */
  @media (max-width: 1279px) { .rock { display: none; } }  /* no room once projects stack */
  html.is-rock-grab, html.is-rock-grab * { cursor: grab; }   /* over a rock you can turn */
  html.is-rock-dragging, html.is-rock-dragging * { cursor: grabbing; user-select: none; }
"""
ROCKS = """
      <div class="rock rock--a" data-seed="7" data-tilt="-34" data-shape="point" data-texture="rock-texture-red.jpg" data-drag aria-hidden="true"></div>
      <div class="rock rock--b" data-seed="23" data-tilt="-45" data-shape="foliate" aria-hidden="true"></div>"""
for old, new in [
    ("</style>\n</head>", ROCK_CSS + "</style>\n</head>"),
    ('<section class="project project--black" aria-labelledby="project-1">',
     '<section class="project project--black" aria-labelledby="project-1">' + ROCKS),
    ("</body>", '<script src="rocks.js" defer></script>\n</body>'),
]:
    if html.count(old) != 1:
        sys.exit(f"build-caveman: expected one {old[:40]!r} for the rocks")
    html = html.replace(old, new)

doctype, rest = html.split("\n", 1)
banner = "<!-- Generated from /index.html by tools/build-caveman.py. Do not edit. -->"
(root / "caveman").mkdir(exist_ok=True)
(root / "caveman" / "index.html").write_text(f"{doctype}\n{banner}\n{rest}", encoding="utf-8", newline="\n")
print("caveman/index.html written")
