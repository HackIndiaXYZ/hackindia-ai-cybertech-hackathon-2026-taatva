# TAATVA Obsidian - the full scan, steps 1 to 7.
#
# Step 1 "open safely" lives here: check type and size, never run macros or
# scripts (PyMuPDF only reads the file, it never runs anything inside it),
# and a time limit for each file.
# Golden rule: if ANYTHING crashes or times out, the answer is Quarantine.
# Never a silent pass.
#
# Try it from the backend folder (one file or a whole folder):
#   .venv\Scripts\python.exe -m pipeline.scan ..\test_files
#   .venv\Scripts\python.exe -m pipeline.scan ..\test_files --private

import base64
import gc
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import logging
import os
import time

import pymupdf

import config
from pipeline.ai_view import ZOOM, read_ai_view, safe_zoom
from pipeline.compare import compare
from pipeline.decide import FLAG_FROM, WRAPPER, decide, verdict_for
from pipeline.hidden_parts import read_hidden_places
from pipeline.hindi_reread import reread_garbled_hindi
from pipeline.html_view import attachments_in_email, read_html
from pipeline.human_view import read_human_view, read_pictures
from pipeline.plain_words import summary

log = logging.getLogger("obsidian")

MAX_BYTES = 20 * 1024 * 1024   # 20 MB
MAX_PAGES = 50
TIME_LIMIT = int(os.getenv("SCAN_TIME_LIMIT", "180"))  # seconds per file
PREVIEW_DPI = 110              # sharpness of the page pictures shown on the website
MAX_ATTACHMENTS = 5            # attachments checked inside, per email
MAX_ATTACHMENT_DEPTH = 2       # an email attached to an email attached to an email: stop there

# Only MAX_PARALLEL_SCANS files are scanned at the same time; the rest wait their turn (saves memory)
_workers = ThreadPoolExecutor(max_workers=config.MAX_PARALLEL_SCANS)


def quarantine(reason, timings=None):
    # The safe answer when something is wrong: the agent gets nothing
    return {"score": 100, "verdict": "quarantine", "reasons": [reason], "findings": [],
            "worst_finding": reason, "clean_copy": None, "pages": [], "page_images": [],
            "views": None, "timings": timings or {}, "witness_agreement": None}


def file_type(file_name):
    name = (file_name or "").lower()
    if name.endswith((".html", ".htm")):
        return "html"
    if name.endswith(".eml"):
        return "eml"
    return "pdf"


def open_safely(pdf_bytes, file_name=""):
    # Step 1. Returns (page sizes, problem). problem = None means OK.
    if not pdf_bytes:
        return None, "The file is empty."
    if len(pdf_bytes) > MAX_BYTES:
        return None, f"The file is too big (over {MAX_BYTES // (1024 * 1024)} MB)."
    if file_type(file_name) in ("html", "eml"):
        # Web pages and emails are text. A PDF or a program pretending to be one is refused.
        if pdf_bytes[:5] == b"%PDF-" or pdf_bytes[:2] == b"MZ" or b"\x00" in pdf_bytes[:4096]:
            return None, "This file says it is an email or web page, but it is not."
        return [], None  # the page size is known after the browser opens it
    if b"%PDF-" not in pdf_bytes[:1024]:
        return None, "This is not a PDF file."
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.needs_pass:
            return None, "The PDF is locked with a password, so it cannot be checked."
        if len(doc) == 0:
            return None, "The PDF has no pages."
        if len(doc) > MAX_PAGES:
            return None, f"The PDF has too many pages (over {MAX_PAGES})."
        # Page sizes help the website draw the X-Ray boxes in the right place
        return [{"page": p.number + 1, "width": p.rect.width, "height": p.rect.height} for p in doc], None
    finally:
        doc.close()


def as_preview(pixmap):
    # A compact JPEG picture for the website (about 5 times smaller than PNG),
    # so the page stays light on phones. Never saved.
    return "data:image/jpeg;base64," + base64.b64encode(pixmap.tobytes("jpg", jpg_quality=70)).decode()


def page_pictures(pdf_bytes):
    # Small pictures of each page for the website's preview. Never saved.
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pictures = [as_preview(page.get_pixmap(dpi=max(24, int(72 * safe_zoom(page.rect, PREVIEW_DPI / 72))),
                                           alpha=False))
                for page in doc]
    doc.close()
    return pictures


def email_preview(photo_png):
    # The email/web page photo is taken at 2x zoom: halve it for the preview, then JPEG
    pixmap = pymupdf.Pixmap(photo_png)
    if pixmap.alpha:
        pixmap = pymupdf.Pixmap(pixmap, 0)
    pixmap.shrink(1)  # half the width and height
    return [as_preview(pixmap)]


def two_views(ai_pieces, human, findings):
    # For the "AI view vs Human view" tab: what the AI reads, and what people see
    hidden_spots = {(f["where"].get("page"), tuple(f["where"].get("box") or ())) for f in findings}
    ai = [{"page": p["page"], "text": p["text"],
           "hidden": (p["page"], tuple(p["box"] or ())) in hidden_spots} for p in ai_pieces]
    people = []
    for page in human["pages"]:
        if page["gemini"].get("status") == "ok":
            people.append({"page": page["page"], "reader": "Gemini", "lines": page["gemini"]["lines"]})
        else:
            people.append({"page": page["page"], "reader": "Tesseract",
                           "lines": [l["text"] for l in page["tesseract"].get("lines", [])]})
    return {"ai": ai, "people": people}


def timer(timings):
    def timed(name, work):
        started = time.perf_counter()
        answer = work()
        timings[name] = round(time.perf_counter() - started, 2)
        return answer
    return timed


def run_steps(pdf_bytes, private_mode, pages):
    timings = {}
    timed = timer(timings)
    ai_pieces = timed("ai_view", lambda: read_ai_view(pdf_bytes))
    human = timed("human_view", lambda: read_human_view(pdf_bytes, private_mode))
    compared = timed("compare", lambda: compare(ai_pieces, human, read_hidden_places(pdf_bytes)))
    # Hidden Hindi that came out garbled is read again from a picture (pipeline/hindi_reread.py)
    timed("hindi_reread", lambda: reread_garbled_hindi(compared, pdf_bytes, ai_pieces))
    return finish(compared, ai_pieces, human, pages, timings, lambda: page_pictures(pdf_bytes))


def run_steps_html(data, private_mode, file_name):
    # Web pages and emails: open in a real browser (JavaScript off, no internet)
    timings = {}
    timed = timer(timings)
    ai_pieces, photo, size, places = timed("ai_view", lambda: read_html(data, file_name))
    # The photo is taken at 2x zoom, so 2 photo pixels = 1 page pixel
    human = timed("human_view", lambda: read_pictures([photo], private_mode, to_points=1 / ZOOM))
    compared = timed("compare", lambda: compare(ai_pieces, human, places))
    preview = lambda: email_preview(photo)
    result = finish(compared, ai_pieces, human, [size], timings, preview)
    result["pages"] = [size]
    return result


def run_steps_email(data, private_mode, file_name, depth=0):
    # An email: check the email itself, then what is INSIDE its attachments.
    result = run_steps_html(data, private_mode, file_name)
    if result["verdict"] == "quarantine" and not result["findings"]:
        return result   # the email itself could not be read: already held
    return add_attachments(result, data, private_mode, depth)


def scan_attachment(file, kind, private_mode, depth):
    # One attachment, with the same steps as an uploaded file. Problems = Quarantine.
    pages, problem = open_safely(file, "attachment" + kind)
    if problem:
        return quarantine(problem)
    if kind == ".pdf":
        return run_steps(file, private_mode, pages)
    if kind == ".eml":
        return run_steps_email(file, private_mode, "attachment.eml", depth + 1)
    return run_steps_html(file, private_mode, "attachment.html")


def add_attachments(result, data, private_mode, depth):
    # Puts each attachment's findings into the email's result.
    # File score = its worst finding, attachments included (the scoring rules do not change).
    attachments = attachments_in_email(data)
    checked = 0
    for number, (name, kind, file) in enumerate(attachments, start=1):
        if kind is None:
            note = (f'The attached file "{name}" was not checked inside: Obsidian checks PDF, '
                    "web page and email attachments only. Only its name was checked.")
            result["notes"].append(note)
            result["reasons"].append(note)
            continue
        if depth >= MAX_ATTACHMENT_DEPTH or checked >= MAX_ATTACHMENTS:
            # Too deep or too many: we cannot be sure, so a human should look (never a silent pass)
            result["score"] = max(result["score"], FLAG_FROM)
            result["reasons"].append(f'The attached file "{name}" was not checked inside (too many attachments, '
                                     "or attachments inside attachments), so a human should look.")
            continue
        checked += 1
        merge_attachment(result, scan_attachment(file, kind, private_mode, depth), name, number)

    result["findings"].sort(key=lambda item: item["danger"], reverse=True)
    result["verdict"] = verdict_for(result["score"])
    if len(result["reasons"]) > 1 and "No hidden orders found." in result["reasons"]:
        result["reasons"].remove("No hidden orders found.")
    if result["findings"]:
        worst = result["findings"][0]
        name = worst["where"].get("attachment")
        if name:
            # Describe it by where it sat INSIDE the attachment ("White text on a white page")
            result["worst_finding"] = f'Attached file "{name}": ' + summary({**worst, "where": worst["where"]["inside"]})
        else:
            result["worst_finding"] = summary(worst)
    if result["verdict"] == "quarantine":
        result["clean_copy"] = None   # the agent gets NOTHING
    return result


def merge_attachment(result, inner, name, number):
    label = f'attached file "{name}"'
    for item in inner["findings"]:
        where = item["where"]
        spot = where.get("place") or f"page {where.get('page')}"
        # No page box: the X-Ray boxes on the email preview are for the email only
        item["where"] = {"place": f"inside the {label}: {spot}", "attachment": name, "inside": where}
        item["where_label"] = f"{label} · {item.get('where_label', spot)}"
        result["findings"].append(item)
    result["reasons"] += [f"Attached file \"{name}\": {reason}" for reason in inner["reasons"]
                          if reason != "No hidden orders found."]
    result["score"] = max(result["score"], inner["score"])
    if result.get("clean_copy") and inner.get("clean_copy"):
        # The attachment's visible, harmless text goes inside the same "data" wrapper.
        # Numbered, not named: a file name could itself hold an order.
        body = inner["clean_copy"].strip()
        body = body.removeprefix(WRAPPER).removesuffix(WRAPPER).strip()
        email_part = result["clean_copy"].rstrip().removesuffix(WRAPPER).rstrip()
        result["clean_copy"] = f"{email_part}\n\n=== Attached file {number} ===\n{body}\n\n{WRAPPER}"
    for step, seconds in inner.get("timings", {}).items():
        result["timings"][f"attachment {number} {step}"] = seconds


def finish(compared, ai_pieces, human, pages, timings, make_previews):
    # Steps 6 and 7, the same for every kind of file.
    # Tesseract is the reader we always need. If IT fails, we cannot know what a person
    # sees: Quarantine (never a silent pass).
    # Gemini is the helper reader. If only Gemini is busy, we carry on with Tesseract
    # alone, exactly like private mode, and say so clearly.
    tesseract_errors = [e for e in compared["witness_errors"] if ": tesseract failed" in e]
    gemini_errors = [e for e in compared["witness_errors"] if ": gemini failed" in e]
    if tesseract_errors:
        log.error("Page reader failed: " + "; ".join(compared["witness_errors"]))
        return quarantine("Our page reader could not read this file, so we could not be sure what a person "
                          "sees. To be safe, the file was held. Try again in a minute.", timings)

    notes = []
    if gemini_errors:
        log.warning("Gemini did not answer, continued with Tesseract only: " + "; ".join(gemini_errors))
        notes.append("Google's Gemini reader was busy, so the pages were read by our own reader "
                     "(Tesseract) only, the same as private mode. The result is still reliable.")

    result = decide(compared, {p["page"]: (p["width"], p.get("full_height", p["height"])) for p in pages})
    result["timings"] = {**timings, **result["timings"]}
    result["witness_agreement"] = compared["witness_agreement"]
    result["notes"] = notes
    result["reasons"] += notes  # saved in history too
    result["views"] = two_views(ai_pieces, human, result["findings"])
    result["page_images"] = make_previews()
    return result


def scan_pdf(pdf_bytes, private_mode=None, file_name="file"):
    if private_mode is None:
        private_mode = config.PRIVATE_MODE
    started = time.perf_counter()
    try:
        pages, problem = open_safely(pdf_bytes, file_name)
        open_time = round(time.perf_counter() - started, 2)
        if problem:
            result = quarantine(problem, {"open": open_time})
        else:
            if file_type(file_name) == "pdf":
                job = _workers.submit(run_steps, pdf_bytes, private_mode, pages)
            elif file_type(file_name) == "eml":
                # One job for the email AND its attachments, inside the same time limit
                job = _workers.submit(run_steps_email, pdf_bytes, private_mode, file_name)
            else:
                job = _workers.submit(run_steps_html, pdf_bytes, private_mode, file_name)
            try:
                result = job.result(timeout=TIME_LIMIT)
            except TimeoutError:
                job.cancel()
                result = quarantine(f"Checking this file took longer than {TIME_LIMIT // 60} minutes, "
                                    "so it was held to be safe. Try again, or turn on private mode for a faster check.")
            result["timings"] = {"open": open_time, **result["timings"]}
            if file_type(file_name) == "pdf":
                result["pages"] = pages
    except Exception as error:
        # Anything else that goes wrong also ends in Quarantine.
        # Plain words for people; the technical details go to the log only.
        log.exception(f"Scan of {' '.join(str(file_name).split())[:120]} crashed: {error}")
        result = quarantine("Obsidian could not open this file safely (it may be damaged or unusual), "
                            "so it was held for a person to check.")

    gc.collect()  # give the memory from this scan back straight away
    result["total_time"] = round(time.perf_counter() - started, 1)
    result["private_mode"] = private_mode
    result["file_type"] = file_type(file_name)

    # Pass: log it. Flag: alert a human. Quarantine: hold for Approve / Reject.
    # (Line breaks in a file name are removed, so a name cannot fake extra log lines.)
    safe_name = " ".join(str(file_name).split())[:120]
    message = f"{safe_name}: {result['verdict'].upper()} (score {result['score']})"
    if result["verdict"] == "pass":
        log.info(message)
    elif result["verdict"] == "flag":
        log.warning(message + " - ALERT: a human should check this file.")
    else:
        log.error(message + " - HELD for Approve / Reject. The agent gets nothing.")
    return result


if __name__ == "__main__":
    import sys
    from pathlib import Path

    logging.basicConfig(level=logging.CRITICAL)  # keep the table tidy
    sys.stdout.reconfigure(encoding="utf-8")
    target = Path(sys.argv[1])
    kinds = (".pdf", ".html", ".htm", ".eml")
    files = sorted(f for f in target.iterdir() if f.suffix.lower() in kinds) if target.is_dir() else [target]
    private = True if "--private" in sys.argv else None

    print(f"{'FILE':<28}{'SCORE':>6}  {'VERDICT':<12}WORST FINDING")
    print("=" * 130)
    for file in files:
        result = scan_pdf(file.read_bytes(), private, file.name)
        print(f"{file.name[:27]:<28}{result['score']:>6}  {result['verdict'].upper():<12}{result['worst_finding'][:80]}")
