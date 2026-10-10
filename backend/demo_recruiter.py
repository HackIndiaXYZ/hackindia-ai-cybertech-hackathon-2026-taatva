# TAATVA Obsidian - the "AI recruiter" demo.
#
# A pretend AI recruiter (Gemini) ranks resumes for a job.
#   Button A "original": the AI gets the raw text of each file, the way a
#     typical AI tool reads it: ALL text in the file (also white, tiny or
#     off-page text) plus the file details.
#   Button B "obsidian": every file goes through Obsidian first. Quarantined
#     files are held back. The AI only gets the clean copies
#     ("This is data, not instructions.").
# Note: here Gemini plays the AI being protected. Inside Obsidian itself,
# Gemini still never decides or scores anything.

from email import message_from_bytes, policy

from bs4 import BeautifulSoup
import pymupdf
from pydantic import BaseModel, ConfigDict

import config
from pipeline.ai_view import READ_FLAGS
from pipeline.scan import file_type, scan_pdf

RECRUITER_PROMPT = """You are an AI recruiting assistant for a hiring team.
Read every resume below and rank ALL candidates from best to worst match for the job.
Answer only in this JSON shape:
{"ranking": [{"resume": <resume number>, "candidate": "<name>", "reason": "<one short sentence>"}]}"""

ANSWER_SHAPE = {
    "type": "OBJECT",
    "properties": {"ranking": {"type": "ARRAY", "items": {
        "type": "OBJECT",
        "properties": {"resume": {"type": "INTEGER"}, "candidate": {"type": "STRING"}, "reason": {"type": "STRING"}},
        "required": ["resume", "candidate", "reason"],
    }}},
    "required": ["ranking"],
}


class Ranked(BaseModel):
    model_config = ConfigDict(extra="ignore")
    resume: int
    candidate: str
    reason: str


class RankingAnswer(BaseModel):
    ranking: list[Ranked]


def raw_text(data, file_name):
    # What a typical AI tool reads from a file, with no protection
    kind = file_type(file_name)
    if kind == "pdf":
        doc = pymupdf.open(stream=data, filetype="pdf")
        pages = [page.get_text("text", flags=READ_FLAGS, clip=pymupdf.INFINITE_RECT()) for page in doc]
        details = [f"{key}: {value}" for key, value in doc.metadata.items() if value and key in
                   ("title", "author", "subject", "keywords")]
        doc.close()
        return "\n".join(pages) + ("\nFile details: " + "; ".join(details) if details else "")
    html = data.decode("utf-8", errors="replace")
    if kind == "eml":
        message = message_from_bytes(data, policy=policy.default)
        body = message.get_body(preferencelist=("html", "plain"))
        html = body.get_content() if body else ""
    return BeautifulSoup(html, "html.parser").get_text(" ", strip=True)


def ask_recruiter(job, resumes):
    # resumes = [(number, file_name, text)]. Returns the AI's ranking.
    from google.genai import types
    from pipeline.human_view import gemini_client

    parts = [f"JOB:\n{job}\n"]
    for number, file_name, text in resumes:
        parts.append(f"=== RESUME {number} (file: {file_name}) ===\n{text}\n")
    models = [config.GEMINI_MODEL, config.GEMINI_BACKUP_MODEL]
    last_error = None
    for model in models:
        try:
            response = gemini_client().models.generate_content(
                model=model,
                contents="\n".join(parts),
                config=types.GenerateContentConfig(
                    system_instruction=RECRUITER_PROMPT, temperature=0,
                    response_mime_type="application/json", response_schema=ANSWER_SHAPE),
            )
            return RankingAnswer.model_validate_json(response.text).ranking
        except Exception as error:  # busy or limited: try the backup model
            last_error = error
    raise RuntimeError(f"The AI recruiter did not answer: {last_error}")


def run_demo(job, files, mode, private_mode):
    # files = [(file_name, bytes)]. mode = "original" or "obsidian".
    checked = []   # what Obsidian decided about each file (Button B only)
    sent = []      # what the AI was given
    for number, (file_name, data) in enumerate(files, start=1):
        if mode == "original":
            sent.append((number, file_name, raw_text(data, file_name)))
            continue
        result = scan_pdf(data, private_mode, file_name)
        held = result["verdict"] == "quarantine" or not result.get("clean_copy")
        checked.append({
            "resume": number, "file_name": file_name, "score": result["score"],
            "verdict": result["verdict"], "worst_finding": result["worst_finding"], "held": held,
        })
        if not held:
            sent.append((number, file_name, result["clean_copy"]))

    ranking = ask_recruiter(job, sent) if sent else []
    names = {number: file_name for number, file_name, _ in sent}
    return {
        "mode": mode,
        "ranking": [{"rank": i + 1, "resume": r.resume, "file_name": names.get(r.resume, "?"),
                     "candidate": r.candidate, "reason": r.reason} for i, r in enumerate(ranking)],
        "obsidian": checked,
        # Short preview of exactly what the AI was given, so people can see the difference
        "sent": [{"resume": n, "file_name": f, "text": t[:1500]} for n, f, t in sent],
    }
