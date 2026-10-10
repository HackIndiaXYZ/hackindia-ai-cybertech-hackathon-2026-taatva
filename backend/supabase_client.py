# TAATVA Obsidian - talking to Supabase from the backend.
#
# 1. who_is_this(token): asks Supabase Auth "who owns this sign-in token?"
#    so only signed-in TAATVA users can scan.
# 2. save_scan(result, user): saves the scan RESULT in the "scans" table.
#    Never the file itself. Uses the service_role key, which lives only here
#    in the backend (see backend/.env). Row level security in the database
#    makes sure each person can only read their own scans.

import hashlib
import time

import httpx

import config

# Remember checked tokens for 60 seconds, so we don't ask Supabase every time
_known_tokens = {}
TOKEN_MEMORY = 60


class NotAllowed(Exception):
    pass


def who_is_this(token):
    # Returns {"id": ..., "email": ...} for a valid sign-in token, or raises NotAllowed
    if not token:
        raise NotAllowed("Please sign in first.")
    key = hashlib.sha256(token.encode()).hexdigest()
    remembered = _known_tokens.get(key)
    if remembered and remembered[0] > time.time():
        return remembered[1]

    response = httpx.get(f"{config.SUPABASE_URL}/auth/v1/user",
                         headers={"apikey": config.SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
                         timeout=15)
    if response.status_code != 200:
        raise NotAllowed("Your sign-in has expired. Please sign in again.")
    data = response.json()
    user = {"id": data["id"], "email": (data.get("email") or "").lower()}

    # Extra lock: if ALLOWED_EMAILS is set, only those people may scan
    if config.ALLOWED_EMAILS and user["email"] not in config.ALLOWED_EMAILS:
        raise NotAllowed("This account is not on the TAATVA team list.")

    _known_tokens[key] = (time.time() + TOKEN_MEMORY, user)
    return user


# The columns we save (results only)
COLUMNS = ["file_name", "file_type", "score", "verdict", "reasons", "findings", "worst_finding",
           "pages", "timings", "total_time", "witness_agreement", "private_mode"]


def save_scan(result, user):
    # Save one scan result for this user. Returns the saved row (with its id and date).
    row = {column: result.get(column) for column in COLUMNS}
    row["user_id"] = user["id"]
    row["user_email"] = user["email"]
    # Quarantine waits for a person. Pass and Flag were sent automatically.
    row["decision"] = "waiting" if result["verdict"] == "quarantine" else "sent"

    response = httpx.post(
        f"{config.SUPABASE_URL}/rest/v1/scans",
        headers={
            "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json=row,
        timeout=20,
    )
    if response.status_code >= 300:
        raise RuntimeError(f"Could not save the scan in Supabase ({response.status_code}): {response.text[:200]}")
    return response.json()[0]
