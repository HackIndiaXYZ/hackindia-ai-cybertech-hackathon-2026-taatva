# TAATVA Obsidian - reads our settings from backend/.env (keys never live in code).

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
# Used for the last try if the main model is too busy
GEMINI_BACKUP_MODEL = os.getenv("GEMINI_BACKUP_MODEL", "gemini-3.1-flash-lite")
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")

# Prompt Guard: the order checker's second opinion (runs on this computer)
PROMPT_GUARD = os.getenv("PROMPT_GUARD", "true").strip().lower() in ("1", "true", "yes", "on")
PROMPT_GUARD_MODEL = os.getenv("PROMPT_GUARD_MODEL", "meta-llama/Llama-Prompt-Guard-2-22M")
HF_TOKEN = os.getenv("HF_TOKEN", "")

# Private mode ON = Tesseract only, no page pictures are sent to Gemini
PRIVATE_MODE = os.getenv("PRIVATE_MODE", "false").strip().lower() in ("1", "true", "yes", "on")
