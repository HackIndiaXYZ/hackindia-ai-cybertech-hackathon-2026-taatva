# TAATVA Obsidian - QA: open every page at every screen size, in 3 browser engines.
# Takes screenshots (qa-screenshots/) and checks things a person might miss.
#
# Needs: the website running in developer mode (npm run dev, port 3000) and
# example results (backend\.venv\Scripts\python.exe qa\make_fixtures.py).
# Run from the Obsidian folder:
#   backend\.venv\Scripts\python.exe qa\screens.py            (all browsers, all sizes)
#   backend\.venv\Scripts\python.exe qa\screens.py --quick    (Chromium, 4 sizes)

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa-screenshots"
OUT.mkdir(exist_ok=True)
BASE = "http://localhost:3001"  # the special test build (see qa/README in QA_REPORT.md)
FIXTURES = ROOT / "frontend" / "public" / "qa"

SIZES = {
    "mobile-320x568": (320, 568), "mobile-360x800": (360, 800), "mobile-375x667": (375, 667),
    "mobile-390x844": (390, 844), "mobile-430x932": (430, 932),
    "tablet-768x1024": (768, 1024), "tablet-1024x768": (1024, 768),
    "tablet-820x1180": (820, 1180), "tablet-1180x820": (1180, 820),
    "tablet-1024x1366": (1024, 1366), "tablet-1366x1024": (1366, 1024),
    "laptop-1280x800": (1280, 800), "laptop-1366x768": (1366, 768), "laptop-1440x900": (1440, 900),
    "desktop-1920x1080": (1920, 1080), "desktop-2560x1440": (2560, 1440),
}
OTHER_BROWSER_SIZES = ["mobile-375x667", "mobile-390x844", "tablet-820x1180", "laptop-1366x768", "desktop-1920x1080"]
QUICK_SIZES = ["mobile-360x800", "tablet-820x1180", "laptop-1366x768", "desktop-1920x1080"]

PAGES = {
    "login": "/login",
    "scan-empty": "/scan?qa=1",
    "scan-white": "/scan?qa=1&id=white",
    "scan-multipage": "/scan?qa=1&id=multipage",
    "scan-xss": "/scan?qa=1&id=xss",
    "scan-email": "/scan?qa=1&id=email",
    "scan-flag": "/scan?qa=1&id=footer",
    "scan-pass": "/scan?qa=1&id=clean",
    "history": "/history?qa=1",
    "demo": "/demo?qa=1",
}

CHECKS = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  // 1. Things sticking out sideways (cause sideways scrolling)
  const wide = [...document.querySelectorAll('body *')].filter(el => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    let a = el.parentElement;   // ignore things inside a box that scrolls sideways on purpose
    while (a) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return false; a = a.parentElement; }
    return r.right > vw + 1 || r.left < -1;
  }).slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 50));
  // 2. Small tap targets (buttons, links, switches, inputs) under 44 x 44 px
  const small = [...document.querySelectorAll('button, a, [role=switch], input, textarea, select, [role=button], [role=tab]')]
    .filter(el => visible(el) && el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1)
    .filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
    .map(el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30)
         + ` (${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`);
  // 3. Smallest font used for sentences (paragraphs)
  const paras = [...document.querySelectorAll('p')].filter(visible).map(p => parseFloat(getComputedStyle(p).fontSize));
  // 4. X-Ray boxes: where they are compared with where the page picture says they should be
  const img = document.querySelector('img[alt^="Page"]');
  const boxes = [...document.querySelectorAll('[data-xray-box]')].map(b => {
    const r = b.getBoundingClientRect(); return { i: +b.dataset.xrayBox, x: r.left, y: r.top, w: r.width, h: r.height }; });
  const imgRect = img ? img.getBoundingClientRect() : null;
  return { scrollW: document.documentElement.scrollWidth, vw, wide, small: [...new Set(small)].slice(0, 12),
           minPara: paras.length ? Math.min(...paras) : null, boxes,
           img: imgRect ? { x: imgRect.left, y: imgRect.top, w: imgRect.width, h: imgRect.height } : null };
}
"""


def expected_boxes(page_key, page_number=1):
    # Where the X-Ray boxes SHOULD be, from the saved scan result (page units)
    name = PAGES[page_key].split("id=")[-1] if "id=" in PAGES[page_key] else None
    if not name:
        return None, []
    data = json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))
    size = next(p for p in data["pages"] if p["page"] == page_number)
    shown = [f for f in data["findings"] if f["danger"] >= 30 or f["hidden_points"] >= 40]
    on_page = []
    for f in shown:
        box = f["where"].get("box")
        if box and f["where"].get("page") == page_number:
            cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            if 0 <= cx <= size["width"] and 0 <= cy <= size["height"]:
                on_page.append(box)
    return size, on_page


def box_errors(found, size, wanted):
    # Compare each drawn box with where it should be (allowing 1.5 px for rounding)
    if not wanted:
        return []
    img = found["img"]
    if not img:
        return ["no page picture"]
    problems = []
    if len(found["boxes"]) != len(wanted):
        problems.append(f"{len(found['boxes'])} boxes drawn, {len(wanted)} expected")
    for drawn, box in zip(sorted(found["boxes"], key=lambda b: (b["y"], b["x"])),
                          sorted(wanted, key=lambda b: (b[1], b[0]))):
        sx, sy = img["w"] / size["width"], img["h"] / size["height"]
        want = (img["x"] + box[0] * sx, img["y"] + box[1] * sy, (box[2] - box[0]) * sx, max((box[3] - box[1]) * sy, 4))
        got = (drawn["x"], drawn["y"], drawn["w"], drawn["h"])
        if max(abs(a - b) for a, b in zip(want, got)) > 1.5:
            problems.append(f"box off by {max(abs(a - b) for a, b in zip(want, got)):.1f}px")
    return problems


def run():
    quick = "--quick" in sys.argv
    report = []
    with sync_playwright() as p:
        engines = [("chromium", p.chromium)] if quick else [("chromium", p.chromium), ("webkit", p.webkit), ("firefox", p.firefox)]
        for engine_name, engine in engines:
            try:
                browser = engine.launch()
            except Exception as error:  # e.g. Windows blocks the browser program
                print(f"COULD NOT START {engine_name}: {str(error).splitlines()[0][:120]}", flush=True)
                report.append({"engine": engine_name, "size": "-", "page": "-", "could_not_start": True,
                               "sideways": False, "wide": [], "small_targets": [], "min_paragraph_px": None,
                               "xray": [], "console": [], "alerts": []})
                continue
            sizes = QUICK_SIZES if quick else (list(SIZES) if engine_name == "chromium" else OTHER_BROWSER_SIZES)
            for size_name in sizes:
                width, height = SIZES[size_name]
                mobile = width < 768
                context = browser.new_context(viewport={"width": width, "height": height},
                                              device_scale_factor=2 if mobile else 1,
                                              has_touch=mobile and engine_name != "firefox",
                                              is_mobile=mobile and engine_name == "chromium")
                for page_key, path in PAGES.items():
                    page = context.new_page()
                    console, alerts = [], []
                    page.on("console", lambda m: console.append(f"{m.type}: {m.text[:160]}") if m.type in ("error", "warning") else None)
                    page.on("pageerror", lambda e: console.append(f"pageerror: {str(e)[:160]}"))
                    page.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
                    page.goto(BASE + path, wait_until="networkidle", timeout=60_000)
                    page.wait_for_timeout(700)
                    found = page.evaluate(CHECKS)
                    size, wanted = expected_boxes(page_key)
                    problems = box_errors(found, size, wanted) if size else []
                    shot = OUT / f"{engine_name}__{size_name}__{page_key}.png"
                    page.screenshot(path=str(shot), full_page=True)
                    report.append({"engine": engine_name, "size": size_name, "page": page_key,
                                   "sideways": found["scrollW"] > found["vw"] + 1, "wide": found["wide"],
                                   "small_targets": found["small"] if mobile else [], "min_paragraph_px": found["minPara"],
                                   "xray": problems, "console": console[:6], "alerts": alerts})
                    page.close()
                context.close()
                (OUT / "report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")  # save as we go
                print(f"done {engine_name} {size_name}", flush=True)
            browser.close()
    (OUT / "report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    bad = [r for r in report if r["sideways"] or r["xray"] or r["console"] or r["alerts"]]
    print(f"\n{len(report)} page checks, {len(bad)} with a problem (sideways scroll, X-Ray, console or alert)")
    for r in bad[:40]:
        print(f"- {r['engine']:<8} {r['size']:<18} {r['page']:<15} sideways={r['sideways']} {r['wide'][:2]} xray={r['xray']} console={r['console'][:2]} alerts={r['alerts']}")


if __name__ == "__main__":
    run()
