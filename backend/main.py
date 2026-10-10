# TAATVA Obsidian - backend (the "engine room").
#   GET  /health  -> says the backend is alive
#   POST /scan    -> checks a PDF and returns score, verdict, reasons, findings, clean copy

import logging

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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


@app.post("/scan")
def scan(file: UploadFile = File(...), private_mode: bool | None = Form(None)):
    # The file is only kept in memory, never saved to disk, so it is gone
    # as soon as the scan ends. Only the results are kept.
    # Read one byte more than the limit, so "too big" files are caught.
    pdf_bytes = file.file.read(MAX_BYTES + 1)
    result = scan_pdf(pdf_bytes, private_mode, file.filename or "file")
    del pdf_bytes
    return {"file_name": file.filename, **result}
