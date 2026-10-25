# TAATVA Obsidian - QA: quick recheck of the narrowest phones, plus dark mode screenshots.
# Needs the website on port 3000 and the backend on 8000 (start.ps1). Run: backend\.venv\Scripts\python.exe qa\recheck.py
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parents[1] / "qa-screenshots"
BASE = "http://localhost:3000"  # the website (team rule: website 3000, backend 8000)
PAGES = ["/scan?qa=1&id=xss", "/scan?qa=1&id=white", "/scan?qa=1&id=footer", "/history?qa=1", "/login"]
problems = 0
with sync_playwright() as p:
    for engine in (p.chromium, p.webkit):
        browser = engine.launch()
        for scheme in ("light", "dark"):
            for width, height in [(320, 568), (360, 800), (375, 667), (1366, 768)]:
                context = browser.new_context(viewport={"width": width, "height": height}, color_scheme=scheme)
                for path in PAGES:
                    page = context.new_page()
                    page.goto(BASE + path, wait_until="networkidle")
                    page.wait_for_timeout(500)
                    sideways = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
                    dark = page.evaluate("document.documentElement.classList.contains('dark')")
                    if sideways or dark != (scheme == "dark"):
                        problems += 1
                        print(f"PROBLEM {engine.name} {scheme} {width}x{height} {path} sideways={sideways} dark={dark}")
                    if scheme == "dark" and width in (375, 1366):
                        name = path.strip("/").replace("?", "_").replace("&", "_").replace("=", "-")
                        page.screenshot(path=str(OUT / f"dark__{engine.name}__{width}x{height}__{name}.png"), full_page=True)
                    page.close()
                context.close()
        browser.close()
print("problems:", problems)
