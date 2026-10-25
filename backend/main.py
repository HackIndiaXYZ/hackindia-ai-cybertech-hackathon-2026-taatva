# TAATVA Obsidian - backend (the "engine room").
#   GET  /health  -> says the backend is alive
#   GET  /status  -> which readers are switched on (for the website header)
#   POST /scan    -> checks a file: score, verdict, reasons, findings, clean copy.
#                    Only for signed-in TAATVA users. The result is saved in Supabase.
#   POST /demo/rank -> the "AI recruiter" demo (original files vs Obsidian clean copies)
#   POST /lab/try -> Attack Lab: hide a sentence in a made-up resume, then scan it live.
#                    No file upload, never sent to any AI agent. Only trick, score,
#                    verdict, caught and time are counted (never the sentence).
#   GET  /lab/counter -> "N tried, X caught, Y escaped"
# The History page reads past scans straight from Supabase. Row level security
# there makes sure each person only sees their own scans.

from collections import defaultdict, deque
from contextlib import asynccontextmanager
import logging
import threading
import time

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, ConfigDict, Field

import config
from attack_lab import TRICKS, BadAttack, run_attack
from lab_store import counter as lab_counter, save_attempt
from demo_recruiter import BadDemoFile, RecruiterUnavailable, run_demo
from pipeline.prompt_guard import load as load_prompt_guard, status as prompt_guard_status
from pipeline.scan import MAX_BYTES, scan_pdf
from supabase_client import NotAllowed, save_scan, who_is_this

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("obsidian")

@asynccontextmanager
async def lifespan(app):
    # When the backend starts: load Prompt Guard in the background,
    # so the first scan does not have to wait for it.
    threading.Thread(target=load_prompt_guard, daemon=True).start()
    yield


app = FastAPI(title="Obsidian by TAATVA", lifespan=lifespan)

# Let our website talk to this backend (addresses come from FRONTEND_URLS in the settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_URLS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Bug QA-10: refuse very big uploads BEFORE receiving them (the 20 MB check came too late:
# the whole upload was received first). A little room is left for the form around the file.
MAX_UPLOAD = MAX_BYTES * 5 + 1024 * 1024   # the demo can send up to 5 files


@app.middleware("http")
async def refuse_huge_uploads(request: Request, call_next):
    size = request.headers.get("content-length")
    if request.method == "POST" and size and size.isdigit() and int(size) > MAX_UPLOAD:
        return JSONResponse({"detail": "This upload is too big. Each file can be up to 20 MB."}, status_code=413)
    return await call_next(request)


# Bug QA-10: a fair-use limit per person, so one account cannot overload the scanner
LIMITS = {"scan": (30, 600), "demo": (10, 600),   # (how many, per how many seconds)
          # Attack Lab: 10 tries per person, and 60 for everyone together,
          # every 10 minutes (so a busy room cannot use up the free Gemini requests)
          "lab": (10, 600), "lab_everyone": (60, 600)}
EVERYONE = {"id": "everyone"}
_recent = defaultdict(deque)
_recent_lock = threading.Lock()


def fair_use(user, action):
    most, seconds = LIMITS[action]
    now = time.time()
    with _recent_lock:
        times = _recent[(user["id"], action)]
        while times and now - times[0] > seconds:
            times.popleft()
        if len(times) >= most:
            wait = int(seconds - (now - times[0])) + 1
            who = "Lots of people have" if user is EVERYONE else "You have"
            raise HTTPException(429, f"{who} done a lot of scans in a short time. Please wait about "
                                     f"{max(1, wait // 60)} minute(s) and try again.")
        times.append(now)


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


def check_sign_in(token):
    # Who is this? Always gives the website a clear answer (never a broken connection).
    try:
        return who_is_this(token)
    except NotAllowed as problem:
        raise HTTPException(401, str(problem))
    except Exception as error:
        log.error(f"Checking the sign-in failed: {error}")
        raise HTTPException(503, "We could not check your sign-in just now. Please try again in a moment.")


def read_and_close(upload):
    # Read the uploaded file into memory, then close it straight away. For big uploads
    # the web server keeps a temporary copy on disk; closing deletes that copy.
    # So the file itself is never kept: only the results are (our project privacy rule).
    try:
        return upload.file.read(MAX_BYTES + 1)
    finally:
        upload.file.close()


@app.post("/scan")
def scan(
    file: UploadFile = File(...),
    private_mode: bool | None = Form(None),
    authorization: str | None = Header(None),
):
    # 1. Only signed-in TAATVA users may scan
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = check_sign_in(token)
    fair_use(user, "scan")

    # 2. Scan. The file is only kept in memory, never saved to disk or to the
    #    database, so it is gone as soon as the scan ends. Only results are kept.
    #    Read one byte more than the limit, so "too big" files are caught.
    pdf_bytes = read_and_close(file)
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
    fair_use(check_sign_in(token), "demo")
    if mode not in ("original", "obsidian"):
        raise HTTPException(400, 'Mode must be "original" or "obsidian".')
    if not 1 <= len(files) <= 5:
        raise HTTPException(400, "Send between 1 and 5 resumes.")

    resumes = [(f.filename or f"resume_{i + 1}", read_and_close(f)) for i, f in enumerate(files)]
    try:
        return run_demo(job[:2000], resumes, mode, private_mode)
    except BadDemoFile as problem:
        raise HTTPException(400, str(problem))
    except RecruiterUnavailable as error:
        log.error(f"Demo AI recruiter failed: {error}")
        raise HTTPException(503, "The AI recruiter did not answer just now. Please try again in a minute.")
    except Exception as error:
        # A broken or unusual file: a clear message, never a crash (details only in the log)
        log.exception(f"Demo failed: {error}")
        raise HTTPException(400, "One of the files could not be read. Please use a normal PDF, "
                                 "web page (.html) or email (.eml), up to 20 MB.")


class LabTry(BaseModel):
    # Attack Lab input: JSON only (there is no file upload at all)
    model_config = ConfigDict(extra="forbid")
    sentence: str = Field(max_length=1000)   # the 200-letter rule is checked after cleaning
    trick: str = Field(max_length=20)
    private_mode: bool | None = None


@app.post("/lab/try")
def lab_try(body: LabTry, authorization: str | None = Header(None)):
    # Attack Lab. Only for signed-in TAATVA users. Never saved to history,
    # the sentence is never logged, and nothing is sent to the demo recruiter.
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = check_sign_in(token)
    fair_use(user, "lab")
    fair_use(EVERYONE, "lab_everyone")
    try:
        answer = run_attack(body.sentence, body.trick, body.private_mode)
    except BadAttack as problem:
        raise HTTPException(400, str(problem))   # wrong input is not a try, so it is not counted
    except Exception as error:
        # Even making the resume failed: still Quarantine, never a silent pass.
        # It still counts as a try that was NOT caught (escapes are never hidden).
        log.error(f"Attack Lab failed: {type(error).__name__}")
        save_attempt(body.trick if body.trick in TRICKS else "unknown", 100, "quarantine", False)
        raise HTTPException(500, "Something went wrong, so nothing was sent to the AI agent "
                                 "(Quarantine). Please try again.")
    # Count this try: trick, score, verdict, caught and the time. Never the sentence.
    o = answer["obsidian"]
    save_attempt(answer["answer_key"]["trick"], o["score"], o["verdict"], answer["caught"])
    answer["counter"] = lab_counter_numbers()
    return answer


def lab_counter_numbers():
    try:
        return lab_counter()
    except Exception as error:
        log.error(f"Attack Lab counter failed: {type(error).__name__}")
        return None


@app.get("/lab/counter")
def lab_counter_now(authorization: str | None = Header(None)):
    # "N tried, X caught, Y escaped" for everyone together. Numbers only.
    check_sign_in((authorization or "").removeprefix("Bearer ").strip())
    numbers = lab_counter_numbers()
    if numbers is None:
        raise HTTPException(503, "The counter is not available just now.")
    return numbers
