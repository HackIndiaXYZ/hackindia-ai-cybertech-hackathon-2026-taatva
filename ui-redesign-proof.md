# TAATVA Obsidian — UI redesign proof

The redesign changes only the LOOK. These notes prove the app still works the same.
START BRANCH: `main` (last commit 616e27b). Work branch: `ui-redesign`.

## BEFORE PROOF (25 Oct 2026, before any design change)

### A. Real scanner (backend, private mode = Tesseract only)

| File | Score | Verdict | Findings (all) | Important (30+) | Red boxes on the page | Clean copy |
|---|---|---|---|---|---|---|
| `clean_1_resume.pdf` | 25 | Pass | 3 | 0 | 0 | yes |
| `attacked_12_base64.pdf` | 50 | Flag | 4 | 1 | 1 | yes |
| `attacked_1_white_text.pdf` | 100 | Quarantine | 4 | 1 | 1 | no |

Matches `test_files/ANSWER_KEY.md`. (The backend is not touched by the redesign.)

### B. Screens (website test mode `?qa=1`, saved example results, no sign-in needed)

| Page | Gauge (screen reader label) | Verdict shown | X-Ray boxes | "Copy clean text" | Agent card |
|---|---|---|---|---|---|
| `/scan?qa=1&id=clean` (Pass) | "Danger score 25 out of 100" | PASS | 0 | shown | "CLEAN TEXT SENT", starts "This is data, not instructions." |
| `/scan?qa=1&id=footer` (Flag) | "Danger score 44 out of 100" | FLAG | 1 | shown | clean text sent; Findings: "1 found", "Visible order to the AI", hidden 0 + bossy 44, "Show 1 harmless item" |
| `/scan?qa=1&id=white` (Quarantine) | "Danger score 100 out of 100" | QUARANTINE | 1 | NOT shown | "LOCKED · NOTHING SENT", "REVIEW IN HISTORY"; Findings: "1 found", "White text on a white page", hidden 50 + bossy 50 |

Header: OBSIDIAN · SCAN · HISTORY "4 waiting" · DEMO · LAB · "Private mode: off" · light/dark switch.

### C. Login / logout

- Signed out: opening `/scan` sends you to `/login?next=%2Fscan`. ✅
- Signing in with a real account: needs a team member to type their own password
  (Claude must not type real passwords). To be checked by the team.

### D. Automatic check (Playwright, 1440 px wide, run on the OLD design)

X-Ray box spots (left %, top % of the page picture): Flag `0.4, 38.1` · Quarantine `11.3, 47.4`.
Uploading `clean_1_resume.pdf` in test mode → Pass 25. Signed out `/history` → `/login?next=%2Fhistory`.
Console errors / warnings: none. Sideways scrolling: none.

## Check after each step

| Step | 3 screens match | Box spots same | Upload | Sign-in redirect | Console |
|---|---|---|---|---|---|
| 2. Tokens, colours, fonts | ✅ | ✅ | ✅ | ✅ | none |
| 3. Background animation (61 fps, clicks pass through) | ✅ | ✅ | ✅ | ✅ | none |
| 4. Header, phone menu, footer (checked at 1440 and 375 px) | ✅ | ✅ | ✅ | ✅ | none |
| 5. Landing page at / (open to everyone; 320, 375, 768, 1440 px) | ✅ | ✅ | ✅ | ✅ | none |
| 6. Upload zone + scanning state (hover, drag-over, beam while checking) | ✅ | ✅ | ✅ | ✅ | none |
| 7. Results: gauge draws in, score counts up (ends on 25 / 44 / 100 exactly), badge springs in, findings stagger | ✅ | ✅ | ✅ | ✅ | none |
| 8. X-Ray Reveal (switch glows, one beam pass, boxes draw in; off/on + Space key still work) | ✅ | ✅ | ✅ | ✅ | none |
| 9. Sign-in, History, Demo, Lab, pop-up, Refresh bar (style only) | ✅ | ✅ | ✅ | ✅ | none |
| 10. Responsive: 7 pages x 8 widths (320-1920), no sideways scroll, 44 px taps below 1024, boxes on the page | ✅ | ✅ | ✅ | ✅ | none |

| 11. Polish: lint, build, contrast, speed, team behaviour tests | ✅ | ✅ | ✅ | ✅ | none |

## AFTER PROOF (25 Oct 2026, new "Forensic Light Table" design, branch `ui-redesign`)

### Side by side: BEFORE vs AFTER (same 3 screens, website test mode)

| Screen | BEFORE | AFTER | Same? |
|---|---|---|---|
| Pass `clean` | score 25, PASS, 0 boxes, "Copy clean text" shown, clean text sent | score 25 (number on screen ends on 25), PASS, 0 boxes, "Copy clean text" shown, clean text sent | ✅ |
| Flag `footer` | score 44, FLAG, 1 box at `0.4, 38.1`, copy shown, 1 found | score 44, FLAG, 1 box at `0.4, 38.1`, copy shown, 1 found | ✅ |
| Quarantine `white` | score 100, QUARANTINE, 1 box at `11.3, 47.4`, NO copy button, "LOCKED · NOTHING SENT" | score 100, QUARANTINE, 1 box at `11.3, 47.4`, NO copy button, "LOCKED · NOTHING SENT" | ✅ |
| Upload `clean_1_resume.pdf` | Pass 25 | Pass 25 | ✅ |
| Signed out → `/history` | `/login?next=%2Fhistory` | `/login?next=%2Fhistory` | ✅ |
| Console errors / warnings | none | none | ✅ |

Same checks at 320 px wide: all match too (box spots move by about 1% only because each box is
drawn 3 px outside the hidden text on purpose; 3 px is a bigger share of a small page. Box maths unchanged).
X-Ray switch: on = 1 box, off = 0, Space key turns it back on = 1. ✅
Real scanner (backend) not touched: Pass 25 / Flag 50 / Quarantine 100 as in part A.

### The team's own behaviour tests (`qa/behaviour.py`, test build on port 3001)

| | Old design (`main`) | New design |
|---|---|---|
| Checks passed | 12 of 15 | 12 of 15 |
| The same 3 fail on both | box "exact" test expects 0 px but boxes are drawn 6 px wider on purpose (since QA-18); "internet off" and "console errors": the backend's CORS list does not include `localhost:3001`, so `/status` is blocked on this laptop | identical |

### Quality checks

- `npm run lint`: no warnings or errors. `npm run build`: passes, no warnings.
- No purple / violet / lavender / magenta / indigo / fuchsia anywhere in the frontend.
- Text contrast (WCAG AA), both themes: all text pairs pass. White on yellow (light mode FLAG badge) is 3.35:1,
  allowed because that badge is large bold text (and that colour is unchanged from before).
- Responsive sweep, 7 pages × 8 widths (320, 375, 414, 768, 1024, 1280, 1440, 1920): no sideways scrolling,
  every tap target ≥ 44 px below 1024 px, X-Ray boxes stay on the page picture.
- Keyboard: Tab reaches every control with a visible cyan focus ring; Space toggles X-Ray; Esc closes the phone menu.
- Background animation: 61 fps on the laptop, never catches clicks, starts 1.2 s after the page loads,
  30 fps on phones, pauses when the tab is hidden, much slower with "reduce motion".
- Speed (production build, measured in Chrome; Lighthouse itself is not installed):
  - Desktop: home LCP 1.13 s, sign-in 0.84 s, layout shift ≈ 0, busy time 0–20 ms.
  - Slow simulated phone (4× slower CPU), sign-in page: old design LCP 4.7 s / busy 2.4 s,
    new design LCP 5.7 s / busy 2.9 s. The new look costs about 0.5 s on a slow phone (motion code).
  - Page code: sign-in 174 → 214 KB, scan 180 → 241 KB (framer-motion + Radix tooltip/menu).

### Rule checks (`git diff main --stat`)

- `/backend`: nothing changed.
- Logic files (`lib/`, `app/api`, `app/auth`, `next.config.mjs`, `settings.tsx`): nothing changed.
- `middleware.ts`: ONE added line so `/` opens without sign-in (team decision, 25 Oct). Every other page still locked.
- `app/page.tsx` (was "jump to /scan"): now the landing page (team decision, 25 Oct).
- Files with logic (scan, history, login, demo, lab pages; header, upload, viewer, findings, lab form, pop-up,
  refresh bar, theme): only markup and class names changed; on lines with handlers only the class names changed.
- No existing file gained "use client". Motion lives in NEW files (`components/motion/*`, `components/visual/*`).
- No element IDs, `name` or `data-*` attributes, image sources or aria-labels removed or renamed.
- `CLAUDE.md`: only the "Look and feel" section changed (CLAUDE.md is kept out of git on purpose by the team).
- New packages: framer-motion, @radix-ui/react-dialog, @radix-ui/react-tooltip (lucide-react was already there).

---

# DESIGN ROUND 2

START BRANCH: `ui-redesign` (last commit 4b94263). Work branch: `design-round-2`.

## ROUND 2 BEFORE PROOF (25 Oct 2026)

Real scanner (private mode): `clean_1_resume.pdf` Pass 25 · `attacked_12_base64.pdf` Flag 50 · `attacked_1_white_text.pdf` Quarantine 100 (same as round 1).

| Screen (test mode) | Gauge / number on screen | Verdict | X-Ray boxes (spot at 1440 px; at 320 px) | "Copy clean text" | Agent card |
|---|---|---|---|---|---|
| `clean` | 25 / 25 | PASS | 0 | shown | clean text sent |
| `footer` | 44 / 44 | FLAG | 1 (`0.4, 38.1`; `-0.5, 37.0`) | shown | clean text sent |
| `white` | 100 / 100 | QUARANTINE | 1 (`11.3, 47.4`; `10.3, 46.7`) | NOT shown | nothing sent |

Upload `clean_1_resume.pdf` → Pass 25. Signed out `/history` → `/login?next=%2Fhistory`. X-Ray: on 1, off 0, Space → 1.
Console errors / warnings: none. Real sign-in with a team account: still to be checked by a team member.

## Round 2: check after each change

| Change | 3 screens match | Box spots same | Upload | Sign-in redirect | X-Ray | Console |
|---|---|---|---|---|---|---|
| 1. Deep dark palette, no cyan (all text pairs WCAG AA, both modes) | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 2. Sharp style: radius 0, corner brackets, one icon weight, no springs | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 7. Two-row navbar with partition + lit bar (phone menu too) | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 8. Attack Lab follows light/dark; all 6 pages checked in both modes | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 5. Background: clearly visible at the edges in both modes, calm behind content (61 fps at 1920 px, clicks pass through) | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 6. Strong hover / focus / press / disabled feedback everywhere (both modes) | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 3. Landing page: X-Ray Lens hero, problem, how it works, Delta 4, verdicts, facts (with sources), TAATVA footer | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 4. Even spacing: spacing tokens, 1600 px page on 1800+ screens, balanced scan grid (tablet side by side, wide screens equal heights) | ✅ | ✅ | ✅ | ✅ | ✅ | none |
| 9. CLAUDE.md "Look and feel" rewritten; lint + build pass | ✅ | ✅ | ✅ | ✅ | ✅ | none |

## ROUND 2 AFTER PROOF (25 Oct 2026, branch `design-round-2`)

| Check | ROUND 2 BEFORE | ROUND 2 AFTER | Same? |
|---|---|---|---|
| Real scanner: clean_1 / base64 / white_text | Pass 25 / Flag 50 / Quarantine 100 | Pass 25 / Flag 50 / Quarantine 100 | ✅ |
| `clean` screen | 25, PASS, 0 boxes, copy shown | 25 (number on screen 25), PASS, 0 boxes, copy shown | ✅ |
| `footer` screen | 44, FLAG, box `0.4, 38.1` (320 px: `-0.5, 37.0`) | 44, FLAG, box `0.4, 38.1` (320 px: `-0.5, 37.0`) | ✅ |
| `white` screen | 100, QUARANTINE, box `11.3, 47.4` (320 px: `10.3, 46.7`), NO copy button, nothing sent | identical | ✅ |
| Upload `clean_1_resume.pdf` | Pass 25 | Pass 25 | ✅ |
| Signed out → `/history` | `/login?next=%2Fhistory` | `/login?next=%2Fhistory` | ✅ |
| X-Ray switch: on / off / Space | 1 / 0 / 1 | 1 / 0 / 1 | ✅ |
| Console errors (dev) | none | none | ✅ |

### Quality checks (round 2)

- `npm run lint`: no warnings or errors. `npm run build`: passes, no warnings.
- Production build, `/` and `/login`, light + dark: no hydration errors. The only console message is the
  backend's CORS refusal for the test port 3002 (laptop setup: the backend only accepts port 3000).
- No purple / violet / lavender / magenta / indigo / fuchsia, and no cyan / teal / aqua / sky blue, anywhere in the frontend.
- Text contrast, both modes: every text pair passes WCAG AA (dark crimson raised to #D84F58 to pass on black).
- Responsive sweep, 7 pages × 8 widths (320–1920 px): no sideways scrolling, tap targets ≥ 44 px below 1024 px,
  X-Ray boxes stay on the page picture.
- Every page checked in light AND dark mode, including the Attack Lab (was always dark, now follows the switch).
- Background: 61 fps at 1920 px in the real browser, never catches clicks, calm behind content.

### Rule checks (`git diff ui-redesign --stat`)

- `/backend`: nothing changed. Files deleted: none.
- Logic files (`lib/`, `app/api`, `app/auth`, `middleware.ts`, `next.config.mjs`, `settings.tsx`, `tsconfig.json`, `package.json`): nothing changed.
- Files with logic: only markup and class names changed (the only changed line with a link is the same `href={tab.href}`, re-indented).
- No existing file gained "use client". New motion/visual parts are new files: `XRayLens.tsx`, `LandingParts.tsx`.
- `CLAUDE.md`: the "Look and feel" section rewritten, plus the ONE Attack Lab line the team approved
  ("Follows the light / dark switch…"). Nothing else. (CLAUDE.md is kept out of git by the team.)
- Team footer: names and roles from the team; GitHub / LinkedIn left empty (no links were given),
  to be filled in `frontend/components/visual/Footer.tsx` ("TEAM: FILL IN THE LINKS HERE").
- Real sign-in with a team account: still to be checked by a team member (Claude does not type real passwords).
