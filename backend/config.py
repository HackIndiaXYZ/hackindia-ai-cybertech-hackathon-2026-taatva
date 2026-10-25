# TAATVA Obsidian - reads our settings from backend/.env (keys never live in code).

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")  # backend only!
# Optional extra lock: only these emails may scan (comma separated). Empty = any signed-in user.
ALLOWED_EMAILS = {e.strip().lower() for e in os.getenv("ALLOWED_EMAILS", "").split(",") if e.strip()}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
# Used for the last try if the main model is too busy
GEMINI_BACKUP_MODEL = os.getenv("GEMINI_BACKUP_MODEL", "gemini-3.1-flash-lite")
# The pretend "AI recruiter" in the Demo plays a typical low-cost screening tool, so it uses the
# light model first. Measured 24 Oct 2026: the light model followed the hidden order 4 of 4 times;
# the main model 0 of 4 (so with it, Button A would not show the danger). Main model = its backup.
DEMO_RECRUITER_MODEL = os.getenv("DEMO_RECRUITER_MODEL", GEMINI_BACKUP_MODEL)
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")
# Where Tesseract's language packs are, for reading hidden Hindi again (pipeline/hindi_reread.py).
# The laptop keeps eng + hin in backend/tessdata (Program Files needs admin rights to add Hindi).
# Empty = Tesseract's own folder (Render installs Hindi there, see the Dockerfile).
_LOCAL_TESSDATA = Path(__file__).parent / "tessdata"
TESSDATA_DIR = os.getenv("TESSDATA_DIR", str(_LOCAL_TESSDATA) if (_LOCAL_TESSDATA / "hin.traineddata").exists() else "")

# Which installed browser Playwright uses to open emails and web pages
# ("msedge" = Microsoft Edge, already on Windows; empty = Playwright's own Chromium, used on Render)
BROWSER_CHANNEL = os.getenv("BROWSER_CHANNEL", "msedge").strip()

# Memory savers (important on small servers, like Render's 512 MB plans):
#   SCAN_WORKERS: how many page-reading jobs run at the same time inside one scan
#   MAX_PARALLEL_SCANS: how many files are scanned at the same time (others wait their turn)
SCAN_WORKERS = max(1, int(os.getenv("SCAN_WORKERS", "8")))
#   MAX_PAGE_PIXELS: the biggest picture we make of one page. Normal A4/Letter pages are
#   below this, so they are not affected; huge pages (posters) get a smaller picture.
MAX_PAGE_PIXELS = int(os.getenv("MAX_PAGE_PIXELS", "4000000"))
MAX_PARALLEL_SCANS = max(1, int(os.getenv("MAX_PARALLEL_SCANS", "2")))

# Websites allowed to talk to this backend (comma separated).
# On this computer: http://localhost:3000. On Render: add your Vercel address.
FRONTEND_URLS = [u.strip().rstrip("/") for u in
                 os.getenv("FRONTEND_URLS", "http://localhost:3000").split(",") if u.strip()]

# Prompt Guard: the order checker's second opinion (runs on this computer)
PROMPT_GUARD = os.getenv("PROMPT_GUARD", "true").strip().lower() in ("1", "true", "yes", "on")
PROMPT_GUARD_MODEL = os.getenv("PROMPT_GUARD_MODEL", "meta-llama/Llama-Prompt-Guard-2-22M")
HF_TOKEN = os.getenv("HF_TOKEN", "")

# Private mode ON = Tesseract only, no page pictures are sent to Gemini
PRIVATE_MODE = os.getenv("PRIVATE_MODE", "false").strip().lower() in ("1", "true", "yes", "on")
