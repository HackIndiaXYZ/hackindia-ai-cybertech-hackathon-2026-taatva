# TAATVA Obsidian - backend (the "engine room").
#   GET  /health  -> says the backend is alive
#   GET  /status  -> which readers are switched on (for the website header)
#   POST /scan    -> checks a file: score, verdict, reasons, findings, clean copy.
#                    Only for signed-in TAATVA users. The result is saved in Supabase.
#   POST /demo/rank -> the "AI recruiter" demo (original files vs Obsidian clean copies)
# The History page reads past scans straight from Supabase. Row level security
# there makes sure each person only sees their own scans.

import logging
import threading

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import config
from demo_recruiter import run_demo
from pipeline.prompt_guard import load as load_prompt_guard, status as prompt_guard_status
from pipeline.scan import MAX_BYTES, scan_pdf
from supabase_client import NotAllowed, save_scan, who_is_this

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("obsidian")

app = FastAPI(title="Obsidian by TAATVA")

# Let our website talk to this backend (addresses come from FRONTEND_URLS in the settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_URLS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def warm_up():
    # Load Prompt Guard in the background when the backend starts,
    # so the first scan does not have to wait for it.
    threading.Thread(target=load_prompt_guard, daemon=True).start()


@app.get("/health")
def health():
    # If you can see this, the backend is running
    return {"status": "ok", "app": "Obsidian", "team": "TAATVA"}


@app.get("/status")
def status():
    return {
        "gemini": bool(config.GEMINI_API_KEY),
        "private_mode_default": config.PRIVATE_MODE,
        "prompt_guard": prompt_guard_status(),
    }


@app.post("/scan")
def scan(
    file: UploadFile = File(...),
    private_mode: bool | None = Form(None),
    authorization: str | None = Header(None),
):
    # 1. Only signed-in TAATVA users may scan
    token = (authorization or "").removeprefix("Bearer ").strip()
    try:
        user = who_is_this(token)
    except NotAllowed as problem:
        raise HTTPException(401, str(problem))

    # 2. Scan. The file is only kept in memory, never saved to disk or to the
    #    database, so it is gone as soon as the scan ends. Only results are kept.
    #    Read one byte more than the limit, so "too big" files are caught.
    pdf_bytes = file.file.read(MAX_BYTES + 1)
    result = scan_pdf(pdf_bytes, private_mode, file.filename or "file")
    del pdf_bytes
    result["file_name"] = file.filename or "file"

    # 3. Save the result in Supabase (who, file name, score, verdict, reasons, findings, date)
    try:
        saved = save_scan(result, user)
        result.update(id=saved["id"], scanned_at=saved["scanned_at"], decision=saved["decision"])
    except Exception as error:
        # The verdict still stands. We only tell the website it was not saved.
        log.error(f"Saving the scan failed: {error}")
        result.update(id=None, decision="waiting" if result["verdict"] == "quarantine" else "sent",
                      save_error="This result could not be saved to history.")
    return result


@app.post("/demo/rank")
def demo_rank(
    files: list[UploadFile] = File(...),
    mode: str = Form(...),
    job: str = Form(...),
    private_mode: bool | None = Form(None),
    authorization: str | None = Header(None),
):
    # The "AI recruiter" demo. Only for signed-in TAATVA users.
    # Demo runs are not saved to history.
    token = (authorization or "").removeprefix("Bearer ").strip()
    try:
        who_is_this(token)
    except NotAllowed as problem:
        raise HTTPException(401, str(problem))
    if mode not in ("original", "obsidian"):
        raise HTTPException(400, 'Mode must be "original" or "obsidian".')
    if not 1 <= len(files) <= 5:
        raise HTTPException(400, "Send between 1 and 5 resumes.")

    resumes = [(f.filename or f"resume_{i + 1}", f.file.read(MAX_BYTES + 1)) for i, f in enumerate(files)]
    try:
        return run_demo(job[:2000], resumes, mode, private_mode)
    except RuntimeError as error:
        raise HTTPException(503, str(error))
