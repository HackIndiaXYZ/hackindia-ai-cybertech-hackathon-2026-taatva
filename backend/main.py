# TAATVA Obsidian - backend (the "engine room").
#   GET  /health                  -> says the backend is alive
#   GET  /status                  -> which readers are switched on (for the website header)
#   POST /scan                    -> checks a file: score, verdict, reasons, findings, clean copy
#   GET  /history                 -> all past scan results (results only, never the files)
#   GET  /history/{id}            -> one past scan result
#   POST /history/{id}/decision   -> a person approves or rejects a quarantined file

import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import history_store
from pipeline.prompt_guard import status as prompt_guard_status
from pipeline.scan import MAX_BYTES, scan_pdf

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Obsidian by TAATVA")

# Let our website (on port 3000) talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
def scan(file: UploadFile = File(...), private_mode: bool | None = Form(None)):
    # The file is only kept in memory, never saved to disk, so it is gone
    # as soon as the scan ends. Only the results are kept.
    # Read one byte more than the limit, so "too big" files are caught.
    pdf_bytes = file.file.read(MAX_BYTES + 1)
    result = scan_pdf(pdf_bytes, private_mode, file.filename or "file")
    del pdf_bytes
    result["file_name"] = file.filename
    result["id"] = history_store.save(result)
    result["decision"] = "waiting" if result["verdict"] == "quarantine" else "sent"
    return result


@app.get("/history")
def history():
    return history_store.list_all()


@app.get("/history/{scan_id}")
def history_item(scan_id: str):
    row = history_store.get(scan_id)
    if not row:
        raise HTTPException(404, "Scan not found.")
    return row


class Decision(BaseModel):
    decision: str  # "approved" or "rejected"


@app.post("/history/{scan_id}/decision")
def decide(scan_id: str, body: Decision):
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(400, 'Decision must be "approved" or "rejected".')
    row, problem = history_store.decide(scan_id, body.decision)
    if problem:
        raise HTTPException(404 if "not found" in problem else 400, problem)
    return row
