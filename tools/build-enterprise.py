"""Writes enterprise/index.html from the root index.html.

The root page is the enterprise view with the style menu open by default;
/enterprise/ is the same view with the menu closed. Edit index.html only,
then run: python tools/build-enterprise.py
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")

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
html = html.replace(" data-autoopen", "")   # menu stays closed here

# Banner after the doctype, so the page stays in standards mode
doctype, rest = html.split("\n", 1)
banner = "<!-- Generated from /index.html by tools/build-enterprise.py. Do not edit. -->"
(root / "enterprise" / "index.html").write_text(f"{doctype}\n{banner}\n{rest}", encoding="utf-8", newline="\n")
