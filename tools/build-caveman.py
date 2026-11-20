"""Writes caveman/index.html from the root index.html: same layout, caveman words,
reddish accent instead of teal, Space Grotesk for body text.

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
# Words follow the caveman skill (github.com/JuliusBrussee/caveman): short words, no filler,
# every fact and number kept, no performed caveman talk. The headline and the start of the
# intro are Daria's own wording.
COPY = [
    # ---- Head
    ("<title>Daria Podrezova: Product Designer, AI &amp; enterprise domains</title>",
     "<title>Daria Podrezova: caveman portfolio</title>"),

    # ---- Header and intro
    ('title="Choose another portfolio style">enterprise portfolio<',
     'title="Choose another portfolio style">caveman portfolio<'),
    ("<h1>Hi, I’m Daria,<br>Product Designer,<br>Agentic AI &amp; enterprise<span",
     "<h1>Daria build prototype.<br>Client see, understand,<br>say yes<span"),
    ("How I work: talk to people. Find the real problem. Map the workflow, simplify it. Prototype it so stakeholders see it, understand it, and say yes. I’m a communicator, explorer, builder and engineers’ friend. 14 years in design, a Master’s in Computer Science, and experience in project management and teaching.",
     "How Daria work? Talk to people. Find real problem. Map ugly workflow, make less ugly. Prototype so stakeholders see, understand, say yes. Communicator, explorer, builder, engineers’ friend. 14 years in design. Master’s in Computer Science. Project management and teaching experience."),
    ('<a class="scroll-hint" href="#project-1">scroll down for projects and recommendations ↓</a>',
     '<a class="scroll-hint" href="#project-1">projects and recommendations ↓</a>'),

    # ---- Projects
    ('<h2 id="project-1">4-dimensional spatial collaboration</h2>', '<h2 id="project-1">4D spatial collaboration</h2>'),
    ("<p>Immersive Spatial Collaboration Tool for railway asset management. I’ve led complex prototyping and design system development; collaborated on user research, workshops and delivery support.</p>",
     "<p>Immersive spatial collaboration tool for railway asset management. Daria led complex prototyping and design system. Helped with user research, workshops, delivery.</p>"),
    ("<p><strong>Result:</strong> faster asset inspections and planning, and less time/cost spent on field visits.</p>",
     "<p><strong>Result:</strong> faster inspections and planning. Less time and cost on field visits.</p>"),

    ("<p>Audit and redesign of a complex certification/approval flow with multiple organisations and departments involved, following a recent ServiceNow implementation.</p>",
     "<p>Complex certification flow: many organisations, many departments. Audit and redesign after ServiceNow rollout.</p>"),
    ("<p><strong>Result: average approval time reduced from 12 months to 3 months.</strong></p>",
     "<p><strong>Result: average approval time cut from 12 months to 3.</strong></p>"),

    ("<p>Luxury fashion retailer with department stores and multi-brand boutiques, where sales rely on personal connections between customers and style assistants. A family of iOS apps for style assistants, warehouse and delivery teams: style suggestions, stock access, indoor navigation and checkout on iOS.</p>",
     "<p>Luxury fashion retailer: department stores, multi-brand boutiques. Sales depend on trust between customer and style assistant. iOS app family for assistants, warehouse, delivery: style suggestions, stock, indoor navigation, checkout.</p>"),
    ("<p><strong>Result: +10% items sold per sales assistant year on year, 550 devices making 8,000 barcode scans a day, and the country’s first mobile checkout on iOS.</strong></p>",
     "<p><strong>Result: +10% items sold per assistant, year on year. 550 devices, 8,000 barcode scans a day. Country’s first mobile checkout on iOS.</strong></p>"),

    ("<p><strong>Agent skill.</strong> Manages terminology, character names, translation rules and style controls. Makes it possible to translate a fiction novel with consistent personal style choices in about 10 hours.</p>",
     "<p><strong>Agent skill.</strong> Keeps terminology, character names, translation rules, style. Fiction novel translated in about 10 hours, personal style consistent.</p>"),

    ("<p><strong>E2E Product Design.</strong> For the Deaf community and Auslan interpreters: user research, focus groups, questionnaires, personas, journey mapping, data analysis, stakeholder pitches, lo-fi, hi-fi, UI and handover. iOS PoC app delivered.</p>",
     "<p><strong>E2E product design.</strong> For Deaf community and Auslan interpreters. User research, focus groups, questionnaires, personas, journey maps, data analysis, stakeholder pitches, lo-fi, hi-fi, UI, handover. iOS PoC app delivered.</p>"),

    ("<p><strong>UX/BA.</strong> Led current-state assessments, workshops, workflow mapping, prototyping, and prepared comprehensive strategic reports and maps used to inform major transformation initiatives.</p>",
     "<p><strong>UX/BA.</strong> Led current-state assessments, workshops, workflow maps, prototypes. Strategic reports and maps shaped major transformation.</p>"),

    ("<p><strong>UX Lead.</strong> AI-driven transcription, metadata automation and document management workflow PoC prototyped and implemented.</p>",
     "<p><strong>UX Lead.</strong> AI transcription, metadata automation, document management workflow. PoC prototyped and built.</p>"),

    ("<p>Go-to prototyping support for the APAC team: 68 training sessions on advanced prototyping and automation, plus hands-on 1:1 help.</p>",
     "<p>Go-to prototyping help for APAC team. 68 training sessions on advanced prototyping and automation. Plus 1:1 help.</p>"),

    ("<p><strong>UX Lead.</strong> GIS visualisations, digital twin and AI-assisted planning platform for the processing industry. Interactive prototypes for sales pitches, PoC web app delivered.</p>",
     "<p><strong>UX Lead.</strong> GIS visualisations, digital twin, AI-assisted planning for processing industry. Interactive prototypes for sales pitches. PoC web app delivered.</p>"),

    # Buttons
    (">learn more ↗</a>", ">more ↗</a>"),
    (">case study coming soon</span>", ">case study soon</span>"),

    # ---- More projects (recommendations stay in the authors' own words)
    ("<p>With hard styling rules</p>", "<p>Hard styling rules</p>"),
    ("<p>Local search service, 2.6M monthly visitors</p>", "<p>Local search, 2.6M visitors a month</p>"),

    # ---- Style: reddish accent, Space Grotesk body text
    ("--accent: #00ffcc;", f"--accent: {ACCENT};\n    --menu-accent: {ACCENT};   /* style menu's intro box */"),
    ("--accent-bg: rgba(0, 255, 204, 0.1);", f"--accent-bg: rgba({ACCENT_RGB}, 0.1);"),
    ("background: rgba(28, 71, 56, 0.6);   /* deep green at 60% (Figma) */",
     "background: rgba(84, 36, 24, 0.6);   /* deep red-brown at 60% */"),
    ("family=Chakra+Petch:wght@300;600", "family=Space+Grotesk:wght@300;600"),
    ('"Chakra Petch"', '"Space Grotesk"'),
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

html = re.sub(r'\b(href|src)="([^"]*)"', up, html)
html = html.replace('url("fonts/', 'url("../fonts/')
html = html.replace(" data-autoopen", "")

doctype, rest = html.split("\n", 1)
banner = "<!-- Generated from /index.html by tools/build-caveman.py. Do not edit. -->"
(root / "caveman").mkdir(exist_ok=True)
(root / "caveman" / "index.html").write_text(f"{doctype}\n{banner}\n{rest}", encoding="utf-8", newline="\n")
print("caveman/index.html written")
