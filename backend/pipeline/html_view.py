# TAATVA Obsidian - HTML emails (.eml) and web pages (.html).
#
# Same idea as for PDFs (Delta 4: "could a human even see this?"):
#   AI view    = every bit of text in the raw code (BeautifulSoup + the page's text).
#   Human view = the page opened in a REAL browser (Playwright + Microsoft Edge),
#                then photographed, and read by Gemini + Tesseract.
# The browser also tells us, for every piece of text, if the page's code hides
# it (display:none, visibility:hidden, squeezed to zero size...).
# Hidden places: HTML comments, alt text, hover tips, screen-reader labels,
# page details (meta), page code (script), hidden form fields, email headers,
# attachment names, and a plain-text copy of the email that differs from what is shown.
#
# Safety ("open safely"): the browser runs with JavaScript OFF, no internet,
# every outside request blocked, pictures replaced by grey boxes, and a time limit.
# Nothing in the email or page can run.
#
# Try it from the backend folder:
#   .venv\Scripts\python.exe -m pipeline.html_view ..\test_files\email_1_hidden_display_none.eml

import base64
from email import message_from_bytes, policy
import html as html_tools
import re

from bs4 import BeautifulSoup, Comment
import pymupdf
from rapidfuzz import fuzz

import config
from pipeline.ai_view import ZOOM, look_behind, to_hex
from pipeline.hidden_parts import find_letter_tricks, plain_letters

VIEWPORT_WIDTH = 900          # like an email window
MAX_HEIGHT = 8000             # longest page we photograph (in page pixels)
PAGE_TIME_LIMIT = 30_000      # milliseconds to open the page
PX_TO_PT = 0.75               # 1 page pixel = 0.75 point (so "under 4 pt" works the same)

# Browser settings that use much less memory (small servers have only 512 MB):
# no shared-memory area (Docker has a tiny one), no graphics card, one page process,
# and a small memory budget for the page.
LOW_MEMORY = [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--renderer-process-limit=1",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-features=site-per-process,Translate,MediaRouter",
    "--js-flags=--max-old-space-size=96",
]

# A tiny grey picture used instead of every real picture (no internet, no tracking)
GREY_PIXEL = ("data:image/png;base64," + base64.b64encode(
    pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 1, 1), False).tobytes("png")).decode())


# ---------- 1. Open the file ----------

def open_email_or_page(data, file_name):
    # Returns (html, hidden_places_from_the_email, plain_text_copy)
    if not file_name.lower().endswith(".eml"):
        return data.decode("utf-8", errors="replace"), [], ""

    message = message_from_bytes(data, policy=policy.default)
    places = []

    # The body a person sees: the HTML part (or plain text, shown as-is)
    body_part = message.get_body(preferencelist=("html", "plain"))
    body = body_part.get_content() if body_part else ""
    if body_part is not None and body_part.get_content_type() == "text/plain":
        body = f"<pre style='white-space:pre-wrap;font-family:sans-serif'>{html_tools.escape(body)}</pre>"

    # A plain-text copy: some AI tools read this instead of the HTML
    plain_part = message.get_body(preferencelist=("plain",))
    plain = plain_part.get_content() if plain_part is not None and plain_part is not body_part else ""

    # Show the main email details at the top, like an email program does
    header = "".join(
        f"<div><b>{name}:</b> {html_tools.escape(str(message.get(name, '')))}</div>"
        for name in ("From", "To", "Subject", "Date") if message.get(name)
    )
    page = (f"<div style='font-family:sans-serif;font-size:14px;padding:12px;border-bottom:1px solid #ddd;"
            f"margin-bottom:12px'>{header}</div>{body}")

    # Unusual email headers (X-...) are never shown, but an AI may read them
    for name, value in message.items():
        if name.lower().startswith("x-") and str(value).strip():
            places.append(("email header", f"email header {name}", str(value)))
    # Attachments: we note their names (their contents are not checked yet)
    for part in message.iter_attachments():
        places.append(("attachment", "attached file name", part.get_filename() or "unnamed attachment"))
    return page, places, plain


# ---------- 2. Hidden places in the raw code (BeautifulSoup) ----------

def hidden_places_in_code(html):
    soup = BeautifulSoup(html, "html.parser")
    found = []

    def add(kind, place, text):
        text = " ".join(str(text or "").split())
        if text:
            found.append((kind, place, text))

    for comment in soup.find_all(string=lambda s: isinstance(s, Comment)):
        add("html comment", "hidden code comment", comment)
    for tag in soup.find_all(True):
        add("alt text", f"picture description (alt) on <{tag.name}>", tag.get("alt"))
        add("hover tip", f"hover tip (title) on <{tag.name}>", tag.get("title"))
        add("screen-reader label", f"screen-reader label on <{tag.name}>",
            tag.get("aria-label") or tag.get("aria-description"))
        if tag.name == "input" and (tag.get("type") or "").lower() == "hidden":
            add("hidden input", "hidden form field", tag.get("value"))
    for meta in soup.find_all("meta"):
        add("meta", f"page details (meta {meta.get('name') or meta.get('property') or meta.get('http-equiv') or ''})".strip(),
            meta.get("content"))
    if soup.title:
        add("page title", "page title", soup.title.get_text())
    for tag in soup.find_all(["script", "noscript", "template"]):
        add("script", f"page code (<{tag.name}>)", tag.get_text())
    return found


def make_safe_for_browser(html):
    # Remove everything that could run or reach the internet, before the browser sees it
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["script", "iframe", "frame", "object", "embed", "base", "link"]):
        tag.decompose()
    for meta in soup.find_all("meta"):
        if (meta.get("http-equiv") or "").lower() == "refresh":
            meta.decompose()
    for tag in soup.find_all(True):
        for attribute in list(tag.attrs):
            if attribute.lower().startswith("on"):   # onclick, onload...
                del tag[attribute]
    for image in soup.find_all("img"):
        image["src"] = GREY_PIXEL                     # grey box instead of the real picture
        image.attrs.pop("srcset", None)
    return str(soup)


# ---------- 3. Open in a real browser ----------

# Runs inside the browser: for every piece of text, where is it and can people see it?
LOOK_AT_EVERY_TEXT = r"""
() => {
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE']);
  const out = [];
  const root = document.body || document.documentElement;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el) continue;
    let inside = false;
    for (let a = el; a; a = a.parentElement) if (skip.has(a.tagName)) { inside = true; break; }
    if (inside) continue;

    const reasons = [];
    let opacity = 1;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const name = a.tagName.toLowerCase();
      if (cs.display === 'none') reasons.push(`display:none on <${name}>`);
      opacity *= parseFloat(cs.opacity || '1');
      if (cs.clipPath && cs.clipPath !== 'none' && /inset\(\s*50%|circle\(\s*0/.test(cs.clipPath)) reasons.push(`clipped away on <${name}>`);
      if (cs.clip && cs.clip !== 'auto' && /rect\(\s*0(px)?[ ,]+0(px)?[ ,]+0/.test(cs.clip)) reasons.push(`clipped away on <${name}>`);
      if (cs.overflow === 'hidden' && cs.display !== 'none' && (a.offsetWidth <= 1 || a.offsetHeight <= 1)) reasons.push(`squeezed to zero size on <${name}>`);
    }
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.visibility === 'collapse') reasons.push('visibility:hidden');
    const fontPx = parseFloat(style.fontSize) || 0;
    if (fontPx === 0) reasons.push('font size 0');

    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    let box = null;
    if (rects.length) {
      const x0 = Math.min(...rects.map(r => r.left)) + window.scrollX;
      const y0 = Math.min(...rects.map(r => r.top)) + window.scrollY;
      const x1 = Math.max(...rects.map(r => r.right)) + window.scrollX;
      const y1 = Math.max(...rects.map(r => r.bottom)) + window.scrollY;
      box = [x0, y0, x1, y1];
    } else if (!reasons.length) {
      reasons.push('takes up no space');
    }
    const c = (style.color.match(/[\d.]+/g) || ['0', '0', '0', '1']).map(Number);
    opacity *= (c.length > 3 ? c[3] : 1);
    out.push({ text, box, fontPx, color: c.slice(0, 3), opacity, reasons: [...new Set(reasons)] });
  }
  const images = [...document.images].map(i => {
    const r = i.getBoundingClientRect();
    return [r.left + window.scrollX, r.top + window.scrollY, r.right + window.scrollX, r.bottom + window.scrollY];
  });
  return {
    pieces: out,
    images,
    width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0),
    height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
  };
}
"""

# Makes all text see-through, so a second photo shows only the background
HIDE_ALL_TEXT = """
* , *::before, *::after, *::marker {
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  text-shadow: none !important; text-decoration-color: transparent !important;
}"""


def open_in_browser(safe_html):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = None
        if config.BROWSER_CHANNEL:
            try:
                browser = playwright.chromium.launch(channel=config.BROWSER_CHANNEL, headless=True, args=LOW_MEMORY)
            except Exception:
                browser = None
        if browser is None:
            # Playwright's own Chromium (used on Render)
            browser = playwright.chromium.launch(headless=True, args=LOW_MEMORY)
        try:
            context = browser.new_context(
                java_script_enabled=False,         # nothing in the page can run
                offline=True,                      # no internet
                device_scale_factor=ZOOM,          # sharp photos (same zoom as the PDF background check)
                viewport={"width": VIEWPORT_WIDTH, "height": 800},
                accept_downloads=False,
            )
            page = context.new_page()
            page.route("**/*", lambda route: route.abort())  # block every outside request
            page.set_content(safe_html, wait_until="load", timeout=PAGE_TIME_LIMIT)

            facts = page.evaluate(LOOK_AT_EVERY_TEXT)
            height = min(max(facts["height"], 1), MAX_HEIGHT)
            width = max(facts["width"], VIEWPORT_WIDTH)
            area = {"x": 0, "y": 0, "width": width, "height": height}

            normal = page.screenshot(full_page=True, clip=area, timeout=PAGE_TIME_LIMIT)
            # Add the "hide all text" style directly (Playwright's add_style_tag waits
            # forever when the page's own scripts are switched off)
            page.evaluate("""css => { const s = document.createElement('style');
                                      s.textContent = css; document.head.appendChild(s); }""", HIDE_ALL_TEXT)
            no_text = page.screenshot(full_page=True, clip=area, timeout=PAGE_TIME_LIMIT)
        finally:
            browser.close()
    facts.update(width=width, height=height)
    return facts, normal, no_text


# ---------- Put it all together ----------

def read_html(data, file_name):
    # Returns (ai_pieces, page photo PNG, page size, hidden places) in the same
    # shapes the PDF steps use, so steps 3 to 7 work exactly the same.
    html, email_places, plain_copy = open_email_or_page(data, file_name)
    facts, normal_png, no_text_png = open_in_browser(make_safe_for_browser(html))

    normal = pymupdf.Pixmap(normal_png)
    no_text = pymupdf.Pixmap(no_text_png)
    if normal.alpha:
        normal = pymupdf.Pixmap(normal, 0)    # drop the see-through layer
    if no_text.alpha:
        no_text = pymupdf.Pixmap(no_text, 0)
    page_rect = pymupdf.Rect(0, 0, facts["width"], facts["height"])

    pieces = []
    for item in facts["pieces"]:
        box = pymupdf.Rect(item["box"]) if item["box"] else None
        background, ink, share = None, None, 0.0
        if box is not None and not box.is_empty:
            background, ink = look_behind(no_text, normal, box, page_rect)
            visible_part = box & page_rect
            share = 0.0 if visible_part.is_empty else round(visible_part.get_area() / box.get_area(), 2)
        pieces.append({
            "page": 1,
            "text": item["text"],
            "box": [round(v, 1) for v in box] if box is not None else None,
            "font": "web",
            "size": round(item["fontPx"] * PX_TO_PT, 1),
            "color": to_hex([round(v) for v in item["color"]]),
            "opacity": round(item["opacity"], 2),
            "background": to_hex(background) if background else None,
            "on_page": share == 1.0,
            "on_page_share": share,
            "ink": None if ink is None else round(ink, 3),
            "page_images": [[round(v, 1) for v in image] for image in facts["images"]],
            "code_hidden": item["reasons"],   # the browser says the code hides it
        })

    # Hidden places: from the raw code, from the email, and plain-text lines that differ
    places = hidden_places_in_code(html) + email_places
    all_page_text = " ".join(p["text"] for p in pieces).lower()
    for line in plain_copy.splitlines():
        line = line.strip()
        if len(re.findall(r"\w", line)) >= 3 and fuzz.partial_ratio(line.lower(), all_page_text) < 80:
            places.append(("plain copy", "plain-text copy of the email (not shown)", line))

    hidden_places = [{
        "place": place, "kind": kind, "page": None, "text": text,
        "letter_tricks": find_letter_tricks(text), "reads_as": plain_letters(text),
    } for kind, place, text in places]

    size = {"page": 1, "width": facts["width"], "height": facts["height"]}
    return pieces, normal_png, size, hidden_places


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.stdout.reconfigure(encoding="utf-8")
    file = Path(sys.argv[1])
    pieces, _, size, places = read_html(file.read_bytes(), file.name)
    print(f"Page size: {size['width']} x {size['height']} page pixels\n")
    for p in pieces:
        flag = f"  <-- CODE HIDES IT: {', '.join(p['code_hidden'])}" if p["code_hidden"] else ""
        print(f"{p['size']:>5}pt {p['color']} on {p['background']} ink={p['ink']} share={p['on_page_share']}  {p['text'][:60]}{flag}")
    print("\nHidden places:")
    for place in places:
        print(f"  {place['place']}: {place['text'][:80]}")
