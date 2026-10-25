# TAATVA Obsidian - QA: how the website BEHAVES (not just how it looks).
# Needs the website running on port 3000 (start.ps1, or: npm --prefix frontend run dev)
# and the backend on port 8000. Test mode ("?qa=1") works there because it is developer mode.
# Run from the Obsidian folder:  backend\.venv\Scripts\python.exe qa\behaviour.py

import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://localhost:3000"  # the website (team rule: website 3000, backend 8000)
PDF = (ROOT / "test_files" / "attacked_1_white_text.pdf").read_bytes()
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}", flush=True)


def upload(page, name="attacked_1_white_text.pdf"):
    page.set_input_files("input[type=file] >> nth=0", files=[{"name": name, "mimeType": "application/pdf", "buffer": PDF}])


def wait_result(page, timeout=20_000):
    page.wait_for_function("() => /\\b(QUARANTINE|FLAG|PASS)\\b/.test(document.querySelector('main').innerText)"
                           " && !document.body.innerText.includes('Checking the file')", timeout=timeout)


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # 1. Logged out: real pages send you to sign in (test mode off without "?qa")
    page.goto(f"{BASE}/history", wait_until="networkidle")
    check("logged out -> sign-in page", "/login" in page.url and "next=%2Fhistory" in page.url, page.url)

    # 2. A broken email link shows a clear message
    page.goto(f"{BASE}/login?error=link", wait_until="networkidle")
    check("broken email link explained", "did not work or has expired" in page.inner_text("main"))

    # 3. Upload by TAP works on a phone (the file picker, not only drag-and-drop)
    page.goto(f"{BASE}/scan?qa=1", wait_until="networkidle")
    upload(page)
    wait_result(page)
    check("tap-upload on phone gives a verdict", "QUARANTINE" in page.inner_text("main"))
    check("no 'Copy clean text' on Quarantine", page.locator("text=Copy clean text").count() == 0)

    # 4. Double upload: only ONE scan runs
    page.goto(f"{BASE}/scan?qa=1", wait_until="networkidle")
    fixture_requests = []
    page.on("request", lambda r: fixture_requests.append(r.url) if "/qa/" in r.url and r.url.endswith("qa=1") else None)
    upload(page)
    page.set_input_files("input[type=file] >> nth=-1", files=[{"name": "second.pdf", "mimeType": "application/pdf", "buffer": PDF}])
    wait_result(page)
    page.wait_for_timeout(2500)
    scans = sum(1 for u in fixture_requests if "/qa/white.json" in u)
    check("double upload starts only one scan", scans == 1, f"{scans} scan(s)")

    # 5. X-Ray on page 3 (not only page 1), then switched 21 times quickly: no leftover boxes
    page.goto(f"{BASE}/scan?qa=1&id=multipage", wait_until="networkidle")
    page.get_by_role("button", name="Next page").click()
    page.get_by_role("button", name="Next page").click()
    on_boxes = page.locator("[data-xray-box]").count()
    switch = page.get_by_role("switch", name="X-Ray Reveal")
    for _ in range(21):          # an odd number of clicks: ends OFF
        switch.click()
    off_boxes = page.locator("[data-xray-box]").count()
    switch.click()               # back ON
    back_on = page.locator("[data-xray-box]").count()
    check("X-Ray on, page 3 = its box shows", on_boxes == 1, f"{on_boxes} boxes")
    check("X-Ray off after 21 quick clicks = no boxes", off_boxes == 0, f"{off_boxes} boxes")
    check("X-Ray on again = box comes back once", back_on == 1, f"{back_on} boxes")

    # 6. Rotating the phone and resizing the window: boxes stay on the hidden text
    page.goto(f"{BASE}/scan?qa=1&id=white", wait_until="networkidle")
    data = json.loads((ROOT / "frontend" / "public" / "qa" / "white.json").read_text(encoding="utf-8"))
    box = next(f["where"]["box"] for f in data["findings"] if f["where"].get("box") and f["hidden_points"] >= 40)
    size = data["pages"][0]

    # The red box is drawn on purpose 3px OUTSIDE the hidden text on every side
    # (so even 2pt text gets a clear box). So the drawn box starts 3px left and
    # 3px above the text, and is 6px wider than it.
    MARGIN = 3

    def box_error():
        img = page.locator('img[alt^="Page"]').bounding_box()
        drawn = page.locator("[data-xray-box]").first.bounding_box()
        sx, sy = img["width"] / size["width"], img["height"] / size["height"]
        want = (img["x"] + box[0] * sx - MARGIN, img["y"] + box[1] * sy - MARGIN, (box[2] - box[0]) * sx + 2 * MARGIN)
        return max(abs(a - b) for a, b in zip(want, (drawn["x"], drawn["y"], drawn["width"])))

    worst = 0.0
    for w, h in [(390, 844), (844, 390), (768, 1024), (1366, 768), (320, 568)]:
        page.set_viewport_size({"width": w, "height": h})
        page.wait_for_timeout(300)
        worst = max(worst, box_error())
    check("X-Ray box stays exact after rotate/resize", worst <= 1.5, f"worst {worst:.2f}px")

    # 7. Keyboard only: Tab reaches the X-Ray switch and Space turns it off
    page.set_viewport_size({"width": 1366, "height": 768})
    page.goto(f"{BASE}/scan?qa=1&id=white", wait_until="networkidle")
    reached = False
    for _ in range(60):
        page.keyboard.press("Tab")
        if page.evaluate("document.activeElement && document.activeElement.getAttribute('aria-label')") == "X-Ray Reveal":
            reached = True
            break
    if reached:
        page.keyboard.press("Space")
    check("keyboard: Tab reaches X-Ray, Space toggles it", reached and page.locator("[data-xray-box]").count() == 0)
    outline = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
    check("keyboard focus outline is visible", outline not in ("none", ""), outline)

    # 8. Internet off in the middle of a scan: clear message, then works again
    page.goto(f"{BASE}/scan?qa=1", wait_until="networkidle")
    upload(page)
    context.set_offline(True)
    page.wait_for_timeout(2500)
    waiting = "Waiting for it to be ready" in page.inner_text("main") or "stopped answering" in page.inner_text("main")
    context.set_offline(False)
    try:
        wait_result(page, timeout=40_000)
        recovered = True
    except Exception:
        recovered = "Could not check the file" in page.inner_text("main")
    check("internet off mid-scan: clear message, recovers", waiting and recovered)

    # 9. Memory: 10 scans in a row should not keep growing
    client = context.new_cdp_session(page)
    page.goto(f"{BASE}/scan?qa=1", wait_until="networkidle")
    heaps = []
    for _ in range(10):
        upload(page)
        wait_result(page)
        client.send("HeapProfiler.collectGarbage")
        heaps.append(page.evaluate("performance.memory.usedJSHeapSize") / 1e6)
    growth = heaps[-1] - heaps[2]
    check("10 scans in a row: memory does not keep growing", growth < 15, f"{heaps[0]:.1f} -> {heaps[-1]:.1f} MB")
    check("images on page after 10 scans", page.locator('img[alt^="Page"]').count() <= 3)

    # (errors caused on purpose by the "internet off" test do not count)
    real_errors = [e for e in errors if "ERR_INTERNET_DISCONNECTED" not in e and "Failed to fetch" not in e]
    check("no errors in the browser console", not real_errors, "; ".join(real_errors[:3]))
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)} of {len(results)} behaviour checks passed")
