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

from concurrent.futures import ThreadPoolExecutor, TimeoutError
import logging
import os

import pymupdf

from pipeline.compare import scan_steps_2_to_5
from pipeline.decide import decide

log = logging.getLogger("obsidian")

MAX_BYTES = 20 * 1024 * 1024   # 20 MB
MAX_PAGES = 50
TIME_LIMIT = int(os.getenv("SCAN_TIME_LIMIT", "180"))  # seconds per file

_workers = ThreadPoolExecutor(max_workers=4)


def quarantine(reason):
    # The safe answer when something is wrong: the agent gets nothing
    return {"score": 100, "verdict": "quarantine", "reasons": [reason],
            "findings": [], "clean_copy": None, "pages": []}


def open_safely(pdf_bytes):
    # Step 1. Returns (page sizes, problem). problem = None means OK.
    if not pdf_bytes:
        return None, "The file is empty."
    if len(pdf_bytes) > MAX_BYTES:
        return None, f"The file is too big (over {MAX_BYTES // (1024 * 1024)} MB)."
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


def run_steps(pdf_bytes, private_mode):
    compared = scan_steps_2_to_5(pdf_bytes, private_mode)
    # A witness that crashed or timed out = something crashed = Quarantine
    if compared["witness_errors"]:
        return quarantine("A page reader failed, so we cannot be sure what people see: "
                          + "; ".join(compared["witness_errors"]))
    return decide(compared)


def scan_pdf(pdf_bytes, private_mode=None, file_name="file"):
    try:
        pages, problem = open_safely(pdf_bytes)
        if problem:
            result = quarantine(problem)
        else:
            job = _workers.submit(run_steps, pdf_bytes, private_mode)
            try:
                result = job.result(timeout=TIME_LIMIT)
            except TimeoutError:
                job.cancel()
                result = quarantine(f"The scan took longer than the {TIME_LIMIT} second time limit.")
            result["pages"] = pages
    except Exception as error:
        # Anything else that goes wrong also ends in Quarantine
        result = quarantine(f"The scan crashed: {type(error).__name__}: {error}")

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

    print(f"{'FILE':<28}{'SCORE':>6}  {'VERDICT':<12}TOP REASON")
    print("=" * 130)
    for file in files:
        result = scan_pdf(file.read_bytes(), private, file.name)
        top = result["reasons"][0]
        print(f"{file.name:<28}{result['score']:>6}  {result['verdict'].upper():<12}{top[:80]}")
