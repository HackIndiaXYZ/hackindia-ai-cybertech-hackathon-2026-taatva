# TAATVA Obsidian - scan history (results only, never the files).
#
# For now the history is saved in backend/data/history.json on this computer.
# Later this moves to Supabase (the database in our tech stack).
# We keep ONLY results: score, verdict, reasons, findings, timings.
# We never keep the uploaded file, the page pictures, or the clean copy.

from datetime import datetime, timezone
import json
from pathlib import Path
import threading
import uuid

FILE = Path(__file__).parent / "data" / "history.json"
_lock = threading.Lock()

# What we keep from a scan result (everything else is thrown away)
KEEP = ["file_name", "file_type", "score", "verdict", "reasons", "findings", "worst_finding",
        "pages", "timings", "total_time", "witness_agreement", "private_mode"]


def _read():
    if not FILE.exists():
        return []
    return json.loads(FILE.read_text(encoding="utf-8"))


def _write(rows):
    FILE.parent.mkdir(exist_ok=True)
    FILE.write_text(json.dumps(rows, indent=1), encoding="utf-8")


def save(result):
    # Save one scan result. Returns its new id.
    row = {key: result.get(key) for key in KEEP}
    row["id"] = uuid.uuid4().hex[:12]
    row["scanned_at"] = datetime.now(timezone.utc).isoformat()
    # Quarantine waits for a person. Pass and Flag were sent automatically.
    row["decision"] = "waiting" if result["verdict"] == "quarantine" else "sent"
    row["decided_at"] = None
    with _lock:
        rows = _read()
        rows.insert(0, row)
        _write(rows)
    return row["id"]


def list_all():
    with _lock:
        return _read()


def get(scan_id):
    return next((row for row in list_all() if row["id"] == scan_id), None)


def decide(scan_id, decision):
    # A person approves or rejects a quarantined file
    with _lock:
        rows = _read()
        for row in rows:
            if row["id"] == scan_id:
                if row["verdict"] != "quarantine":
                    return None, "Only quarantined files need a decision."
                row["decision"] = decision
                row["decided_at"] = datetime.now(timezone.utc).isoformat()
                _write(rows)
                return row, None
    return None, "Scan not found."
