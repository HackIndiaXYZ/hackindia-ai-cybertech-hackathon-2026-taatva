# TAATVA Obsidian — QA Report

Full audit of the whole codebase and website, done before Demo Day.
Safety checkpoint: git tag `before-full-audit` (to go back: `git checkout before-full-audit`).

## How the app was started for testing

| Part | Command (run from the `Obsidian` folder) | Address |
|---|---|---|
| Backend | `backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --reload-dir backend --reload-exclude "*.venv*" --port 8000` | http://localhost:8000 |
| Frontend | `npm --prefix frontend run dev` | http://localhost:3000 |

(Both are also in `.claude/launch.json`, and `start.ps1` starts both in two windows.)

## Severity words

- **Critical**: unsafe (an attack gets through, secrets leak, or a crash gives a silent Pass).
- **High**: a main feature breaks for normal users.
- **Medium**: wrong or confusing in some cases, there is a work-around.
- **Low**: small polish problem.

## Bugs

| ID | Where | What breaks | How to repeat | Severity | Status |
|---|---|---|---|---|---|
| QA-01 | `backend/pipeline/decide.py` line 65 (clean copy) | Visible text that carries a hidden message in invisible "tag letters" put the **decoded hidden message into the clean copy** the AI agent receives. Breaks "clean copy has ZERO hidden text". | Visible line "Thanks for reading." + hidden tag letters "python java aws" → the clean copy contained "python java aws". Test: `test_clean_copy_never_contains_invisible_letters_or_their_hidden_message` | **Critical** | **Fixed**: new `visible_letters()` throws invisible letters away instead of decoding them; clean copy uses it. |
| QA-02 | `backend/pipeline/hidden_parts.py` lines 25–41, 128–129 | The list of invisible letters was typed into the code **as real invisible characters** (some are right-to-left override marks). An editor or copy-paste could delete them silently and the detector would go blind with no warning. | Open the file: the list looks like empty strings `"": "zero-width space"`. | Medium | **Fixed**: written as visible codes (`​` …). Test `test_no_invisible_characters_typed_into_our_code` stops it coming back. |

## Proof numbers

(filled in during Phase 2)
