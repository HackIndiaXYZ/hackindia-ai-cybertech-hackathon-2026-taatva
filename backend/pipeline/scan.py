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
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import logging
import os
import time

import pymupdf

import config
from pipeline.ai_view import read_ai_view
from pipeline.compare import compare
from pipeline.decide import decide
from pipeline.hidden_parts import read_hidden_places
from pipeline.human_view import read_human_view

log = logging.getLogger("obsidian")

MAX_BYTES = 20 * 1024 * 1024   # 20 MB
MAX_PAGES = 50
TIME_LIMIT = int(os.getenv("SCAN_TIME_LIMIT", "180"))  # seconds per file
PREVIEW_DPI = 110              # sharpness of the page pictures shown on the website

_workers = ThreadPoolExecutor(max_workers=4)


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
        return None, ("HTML emails and .eml files cannot be checked yet (coming soon). "
                      "To be safe, the file is held.")
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


def page_pictures(pdf_bytes):
    # Small pictures of each page for the website's preview. Never saved.
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pictures = ["data:image/png;base64," + base64.b64encode(
        page.get_pixmap(dpi=PREVIEW_DPI, alpha=False).tobytes("png")).decode() for page in doc]
    doc.close()
    return pictures


def two_views(ai_pieces, human, findings):
    # For the "AI view vs Human view" tab: what the AI reads, and what people see
    hidden_spots = {(f["where"].get("page"), tuple(f["where"].get("box") or ())) for f in findings}
    ai = [{"page": p["page"], "text": p["text"],
           "hidden": (p["page"], tuple(p["box"])) in hidden_spots} for p in ai_pieces]
    people = []
    for page in human["pages"]:
        if page["gemini"].get("status") == "ok":
            people.append({"page": page["page"], "reader": "Gemini", "lines": page["gemini"]["lines"]})
        else:
            people.append({"page": page["page"], "reader": "Tesseract",
                           "lines": [l["text"] for l in page["tesseract"].get("lines", [])]})
    return {"ai": ai, "people": people}


def run_steps(pdf_bytes, private_mode, pages):
    timings = {}

    def timed(name, work):
        started = time.perf_counter()
        answer = work()
        timings[name] = round(time.perf_counter() - started, 2)
        return answer

    ai_pieces = timed("ai_view", lambda: read_ai_view(pdf_bytes))
    human = timed("human_view", lambda: read_human_view(pdf_bytes, private_mode))
    compared = timed("compare", lambda: compare(ai_pieces, human, read_hidden_places(pdf_bytes)))

    # A witness that crashed or timed out = something crashed = Quarantine
    if compared["witness_errors"]:
        return quarantine("A page reader failed, so we cannot be sure what people see: "
                          + "; ".join(compared["witness_errors"]), timings)

    result = decide(compared, {p["page"]: (p["width"], p["height"]) for p in pages})
    result["timings"] = {**timings, **result["timings"]}
    result["witness_agreement"] = compared["witness_agreement"]
    result["views"] = two_views(ai_pieces, human, result["findings"])
    result["page_images"] = page_pictures(pdf_bytes)
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
            job = _workers.submit(run_steps, pdf_bytes, private_mode, pages)
            try:
                result = job.result(timeout=TIME_LIMIT)
            except TimeoutError:
                job.cancel()
                result = quarantine(f"The scan took longer than the {TIME_LIMIT} second time limit.")
            result["timings"] = {"open": open_time, **result["timings"]}
            result["pages"] = pages
    except Exception as error:
        # Anything else that goes wrong also ends in Quarantine
        result = quarantine(f"The scan crashed: {type(error).__name__}: {error}")

    result["total_time"] = round(time.perf_counter() - started, 1)
    result["private_mode"] = private_mode
    result["file_type"] = file_type(file_name)

    # Pass: log it. Flag: alert a human. Quarantine: hold for Approve / Reject.
    message = f"{file_name}: {result['verdict'].upper()} (score {result['score']})"
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
    files = sorted(target.glob("*.pdf")) if target.is_dir() else [target]
    private = True if "--private" in sys.argv else None

    print(f"{'FILE':<28}{'SCORE':>6}  {'VERDICT':<12}WORST FINDING")
    print("=" * 130)
    for file in files:
        result = scan_pdf(file.read_bytes(), private, file.name)
        print(f"{file.name:<28}{result['score']:>6}  {result['verdict'].upper():<12}{result['worst_finding'][:80]}")
