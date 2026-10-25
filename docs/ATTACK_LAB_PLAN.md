# Attack Lab - the plan (team TAATVA)

A judge types a sentence. Obsidian hides it inside a made-up resume with one of
3 tricks, then scans that resume live. The screen shows two answers side by side:
the **Old Way** (reads the words only) and **Obsidian** (first asks "could a human
even see this?"). That gap is our Delta 4: 4/10 vs 8/10.

No feature code is written yet. This file says what exists, what we add, and where.

---

## 1. Checked first: the existing demo works (25 Oct 2026)

We sent 4 test resumes through the real `POST /scan` (real FastAPI app, real
pipeline, real Gemini from `backend/.env`). Only sign-in and saving to history
were stood in for, so no test rows landed in the real History.

| File | Score | Verdict | Who read the page | Worst finding |
|---|---|---|---|---|
| clean_1_resume.pdf | 25 | Pass | Gemini (100% agree with Tesseract) | Normal file details |
| attacked_1_white_text.pdf | 100 | Quarantine | Gemini (100%) | White text on a white page |
| attacked_2_tiny_font.pdf | 90 | Quarantine | Gemini (99%) | Text in 2-point size |
| attacked_3_off_page.pdf | 90 | Quarantine | Gemini (99%) | Text placed outside the page |

Each scan took about 3 to 6 seconds. No "Gemini was busy" note appeared.
The real sign-in check also worked: a fake token got "401 - please sign in again".

---

### Prompt Guard on the laptop (checked 25 Oct 2026)
`backend/.env` has `PROMPT_GUARD=true`. The model loaded from this laptop (status
"ready"). In a real scan of attacked_1_white_text.pdf the phrase list said 1.0 and
Prompt Guard said 0.98. On the clean resume both said 0.0.

---

## 2. What already exists (and Attack Lab will reuse, not change)

### Backend (`/backend`)
| File | What it does | Attack Lab uses it for |
|---|---|---|
| `main.py` | `/scan`, `/demo/rank`, sign-in check, size limit, `fair_use()` rate limit | Add one new address next to these. Reuse `check_sign_in()` and `fair_use()`. |
| `pipeline/scan.py` | `scan_pdf()` = the full 7-step scan. Any crash or timeout = Quarantine. | **Right side ("Obsidian")**, called exactly as `/scan` calls it. |
| `pipeline/ai_view.py` | `READ_FLAGS`: reads text even when it sits off the page | Old Way reads text with the same flags, so it also "sees" off-page words (like real AI tools do). |
| `pipeline/order_checker.py` | Phrase list. `check_together()` gives a 0-1 "sounds like an order" score | **Left side ("Old Way")**: phrase list only, on plain text. |
| `pipeline/decide.py` | Scoring rules, `verdict_for()`, Pass/Flag/Quarantine limits | Both sides use the same limits. **Not changed.** |
| `pipeline/plain_words.py` | Fixed sentence templates (no AI): `title`, `explain`, `where_label` | The one plain-English line under each finding. |
| `pipeline/compare.py` | Uses RapidFuzz to compare what the AI reads and what people see | Attack Lab uses RapidFuzz the same way for "Caught?". |
| `demo_recruiter.py` | Sends resumes to a pretend AI recruiter (Gemini) | **Not used. Attack Lab never imports or calls it.** |
| `supabase_client.py` | Sign-in check and saving scans to History | Sign-in only. **Attack Lab runs are never saved to History.** |
| `test_files/make_test_files.py` | Makes our made-up test resumes (white, tiny, off-page) | Copy its resume style for the Attack Lab maker. |

### Frontend (`/frontend`)
| File | What it does | Attack Lab uses it for |
|---|---|---|
| `components/header.tsx` | Tabs: Scan / History / Demo | Add an "Attack Lab" tab. |
| `lib/api.ts` | Talks to the backend, adds the sign-in token | Add `tryAttack()`. |
| `lib/verdict.ts` | Pass/Flag/Quarantine limits and colours | Same limits on both sides. |
| `components/shared.tsx` | `VerdictPill`, `ScoreRing`, `DangerBar`, `onPage()` | Reuse in both panels. |
| `components/scan/document-viewer.tsx` | Page picture with X-Ray red boxes | Copy the box drawing idea; Attack Lab gets its own small preview with the page-edge marker (so the Scan page is not changed). |
| `components/update-check.tsx` | `pageIsOutdated()` and the "Refresh now" bar | Check before every try: no attack from an old page. |
| `middleware.ts` | Sends signed-out people to sign-in | Attack Lab is behind sign-in too. |

---

## 3. What we will add

### 3a. Backend: `backend/attack_lab.py` (new file)
1. **`make_resume(sentence, trick)`** - builds a made-up resume PDF **in memory**
   (never saved to disk) and an **answer key**: `trick, page, sentence, box`.
   - `white`: the sentence in white (1,1,1) on the white page, normal size.
   - `tiny`: the sentence in 2 pt black text.
   - `offpage`: the sentence placed past the right edge of the page.
   - No metadata trick (rule).
   - A long sentence (up to 200 letters) is wrapped onto several lines. The answer
     key box is the box around all those lines, measured by PyMuPDF after writing
     (not guessed).
2. **`old_way(pdf_bytes)`** - "Old Way: words only".
   - Pulls plain text (same `READ_FLAGS`, whole page, so off-page words are read too).
   - Runs our phrase list `check_together()` on it. **Phrase list only** - Prompt
     Guard is NOT used here, so the left side is the same on the laptop and on the
     live server, and it is never called Lakera or Prompt Guard.
   - Score = highest order score x 50. Verdict = `verdict_for(score)`. Highest
     possible is 50, so the left side can only be Pass or Flag, never red.
3. **`was_caught(answer_key, findings)`** - plain code:
   - take the Obsidian findings on the answer-key page whose boxes sit inside the
     answer-key box (with a small margin),
   - join their text in reading order,
   - Caught = RapidFuzz `partial_ratio` of the sentence vs that text is **85 or more**.
   - Otherwise = **Escaped**. Escapes are shown, never hidden.
4. **`run_attack(sentence, trick, private_mode)`** - makes the resume, runs the Old Way,
   runs the normal `scan_pdf()` unchanged, checks Caught, counts it.
   Any crash here (maker, Old Way, or check) = Quarantine answer, never a pass.
5. **Counter** - "N tried, X caught, Y escaped". Kept as plain numbers in backend
   memory (all visitors share it; it starts again at 0 when the server restarts,
   and the screen says "since <time>"). Only numbers are kept, never the sentence.

### 3b. Backend: `backend/main.py` (small change)
- `POST /lab/try` (built in step 2) - takes **JSON only**: `{"sentence": "...", "trick": "white" | "tiny" | "offpage", "private_mode": false}`.
  - No file upload field at all.
  - Sign-in required (`check_sign_in`).
  - Sentence: 1 to 200 letters, otherwise a clear error. Invisible/control letters are removed first.
  - Rate limit: `LIMITS["lab"]` = 10 tries per person per 10 minutes, plus
    `LIMITS["lab_everyone"]` = 60 for everyone together, so a busy room cannot use up the free Gemini quota.
  - Never calls `save_scan` (not saved to History), never calls the demo recruiter,
    never writes the sentence to the log (the log line uses a fixed file name, e.g.
    `attack_lab_resume.pdf`).
- `GET /lab/counter` (later step) - the N / X / Y numbers.
- The answer sends back: Old Way result, the full Obsidian result (same shape as
  `/scan`: score, verdict, findings, clean copy, page pictures), the answer key,
  Caught or Escaped, and the counter.

### 3c. Frontend (new files)
| File | What it shows |
|---|---|
| `app/attack-lab/page.tsx` | The page. Dark metallic look, neon green / yellow / red, never purple. |
| `components/attack-lab/attack-form.tsx` | Sentence box with a live "N / 200 letters" count, 3 trick buttons (White text, Tiny 2 pt, Off the page), "Hide it and scan" button. Checks `pageIsOutdated()` first. |
| `components/attack-lab/split-screen.tsx` | LEFT "Old Way: words only" and RIGHT "Obsidian", side by side (stacked on a phone). Each shows score ring, verdict pill. |
| `components/attack-lab/agent-receives.tsx` | "The agent would receive:" the clean copy, or **"NOTHING - file held for a human"** for Quarantine. No "Copy clean text" button on Quarantine. |
| `components/attack-lab/attack-preview.tsx` | The resume page picture with X-Ray red boxes. Off-page text gets a **red marker at the page edge: "Text hidden off the page"**. |
| `components/attack-lab/counter.tsx` | "N tried, X caught, Y escaped" - escapes always shown. |
| `components/attack-lab/caught-badge.tsx` | Big CAUGHT (green) or ESCAPED (red) result. |
| `lib/api.ts` (change) | `tryAttack()` and `getAttackCounter()`. |
| `components/header.tsx` (change) | New "Attack Lab" tab (fits on a phone too). |
| `app/globals.css` (change) | Attack Lab neon colour tokens, scoped to the Attack Lab page only. |

The one plain-English line under each finding comes from `plain_words.py` (the
`explain` field, fixed templates, no AI). Example: "Same colour as the page, so a
person sees blank space. The AI reads an order: ...".

### 3d. Must work on the laptop's local server, with Prompt Guard ON
The team will run Attack Lab on the laptop: `.\start.ps1` (backend on port 8000,
website on port 3000), with `PROMPT_GUARD=true` in `backend/.env`.
- **Right side ("Obsidian") uses Prompt Guard on the laptop.** It calls the normal
  `scan_pdf()`, and that already asks Prompt Guard for a second opinion. We add no
  extra switch and change no scoring rules.
- **The Obsidian panel shows if Prompt Guard was used**, from the real scan answer
  (`prompt_guard` = "ready" or the reason it is off). For example: "Second opinion:
  Prompt Guard ON (runs on this laptop)". Under each finding we show both numbers,
  like the laptop demo guide does: "Phrase list 1.00 · Prompt Guard 0.98".
- **If Prompt Guard is not ready** (still loading or not installed), the panel says so
  plainly: "Prompt Guard is off, phrase list only". It never pretends it was used.
  The backend already starts loading Prompt Guard when it starts, so the first
  attack does not have to wait long.
- **Left side ("Old Way") stays phrase list only, on the laptop too.** Our rules say the
  left side is our order checker on plain text, and it must never be called Prompt
  Guard. Keeping Prompt Guard only on the right means the gap between the two sides
  shows what Obsidian adds.
- **The live server works too**, but there Prompt Guard is off (it needs about 1 GB),
  and the panel says so.
- The website's `.env.local` already points to `http://localhost:8000` on the laptop.
  The backend allows `http://localhost:3000`. Nothing new is needed for the laptop.

### 3e. Tests: `backend/tests/test_attack_lab.py` (new)
- The maker's answer key matches where PyMuPDF really put the text (all 3 tricks).
- Each trick is **Caught** by the real scan with a bossy sentence and a harmless one.
- The Old Way can never score 70 or more.
- 201 letters = refused. A file upload = refused. Wrong trick name = refused.
- The sentence is never in the log, never sent to `save_scan`, never to the demo recruiter.
- A crash inside the maker or the scan = Quarantine.
- Rate limit works.
- With Prompt Guard ready (laptop): the Obsidian side really has a Prompt Guard score
  on its findings, and the Old Way side has none. Skipped (and says why) on a computer
  without the model.
- Scoring rules unchanged: all existing tests still pass.

---

## 4. Rules we will keep (from CLAUDE.md)
- Scoring rules are not changed. Attack Lab only calls the existing scanner.
- Nothing is faked or hardcoded: every number comes from a real scan of the PDF made a moment before.
- No file uploads. Max 200 letters. Rate limited. Sentence never saved.
- Never sent to the demo recruiter or any real agent.
- Any crash or timeout = Quarantine.
- If only Gemini is busy, the scan goes on with Tesseract and the note says so (same as today).

## 5. Order of work (one step at a time, a checkpoint after each)
1. `attack_lab.py`: maker + answer key + tests.
2. Old Way + Caught check + tests.
3. `/lab/try` + safety tests (done in step 2), then `/lab/counter`.
4. Frontend page, form and split screen.
5. Preview with X-Ray boxes and the off-page edge marker; counter; phone layout.
6. Full test run. Then a live check on the laptop: `.\start.ps1`, Prompt Guard "ready",
   all 3 tricks tried in the browser (computer and phone size). Then push to both repos.
