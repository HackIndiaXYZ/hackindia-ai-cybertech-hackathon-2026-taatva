# TAATVA Obsidian - Attack Lab counter: "N tried, X caught, Y escaped".
#
# Every try is saved as ONE small row: trick, score, verdict, caught, time.
# The sentence is NEVER saved (there is not even a place for it).
#
# Where the rows go:
#   1. Supabase table "lab_attempts", if it exists (made by supabase/lab_attempts.sql).
#      Only the backend can use it (service_role key from backend/.env).
#   2. Otherwise a local file: backend/data/lab_attempts.jsonl (kept off GitHub).
#      On the free live server this file starts empty again after every restart.
# As soon as the Supabase table is made, the backend uses it by itself.

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

import httpx

import config

log = logging.getLogger("obsidian")

FILE = Path(__file__).parent / "data" / "lab_attempts.jsonl"
TABLE = "lab_attempts"
TABLE_MISSING = "PGRST205"   # Supabase's code for "this table does not exist"
_lock = threading.Lock()


def supabase_ready():
    return bool(config.SUPABASE_URL and config.SUPABASE_SERVICE_ROLE_KEY)


def headers(extra=None):
    key = config.SUPABASE_SERVICE_ROLE_KEY
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", **(extra or {})}


def make_row(trick, score, verdict, caught):
    # Only these 5 things. Never the sentence.
    return {"trick": str(trick), "score": int(score), "verdict": str(verdict), "caught": bool(caught),
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}


def save_to_file(row):
    with _lock:
        FILE.parent.mkdir(parents=True, exist_ok=True)
        with FILE.open("a", encoding="utf-8") as out:
            out.write(json.dumps(row) + "\n")


def save_attempt(trick, score, verdict, caught):
    # Save one try. Never raises: a problem here must not change the scan answer.
    row = make_row(trick, score, verdict, caught)
    try:
        if supabase_ready():
            answer = httpx.post(f"{config.SUPABASE_URL}/rest/v1/{TABLE}", headers=headers(), json=row, timeout=10)
            if answer.status_code < 300:
                return "supabase"
            if TABLE_MISSING not in answer.text:
                log.warning(f"Attack Lab counter: Supabase said {answer.status_code}, saved to the local file instead")
        save_to_file(row)
        return "local file"
    except Exception as error:
        log.error(f"Attack Lab counter could not save a try: {type(error).__name__}")
        try:
            save_to_file(row)
            return "local file"
        except Exception:
            return None


def count_in_supabase(only_caught=False):
    # Ask Supabase for the number of rows only (no rows are downloaded)
    query = "select=id" + ("&caught=eq.true" if only_caught else "")
    answer = httpx.head(f"{config.SUPABASE_URL}/rest/v1/{TABLE}?{query}",
                        headers=headers({"Prefer": "count=exact", "Range": "0-0"}), timeout=10)
    if answer.status_code >= 300:
        raise LookupError(answer.status_code)
    return int(answer.headers.get("content-range", "*/0").split("/")[-1])


def count_in_file():
    rows = []
    with _lock:
        if FILE.exists():
            for line in FILE.read_text(encoding="utf-8").splitlines():
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    continue   # a broken line is skipped, never a crash
    return len(rows), sum(1 for row in rows if row.get("caught") is True), (rows[0]["created_at"] if rows else None)


def counter():
    # {"tried": N, "caught": X, "escaped": Y, "saved_in": ..., "since": ...}
    if supabase_ready():
        try:
            tried, caught = count_in_supabase(), count_in_supabase(only_caught=True)
            return {"tried": tried, "caught": caught, "escaped": tried - caught, "saved_in": "supabase", "since": None}
        except Exception:
            pass   # table not made yet, or Supabase did not answer: use the local file
    tried, caught, since = count_in_file()
    return {"tried": tried, "caught": caught, "escaped": tried - caught, "saved_in": "local file", "since": since}
