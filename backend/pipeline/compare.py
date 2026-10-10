# TAATVA Obsidian - Pipeline step 5: compare the AI view and the human view.
#
# Way 1 (computer-only text): for every piece of text the computer reads,
#   ask "could a human even see this?" (our Delta 4 question). We check the
#   hidden rules in CLAUDE.md, then ask our two witnesses (Gemini, Tesseract)
#   if they saw it near the same spot, using RapidFuzz to allow small reading mistakes.
# Way 2 (picture-only text): text a person CAN see that the computer did not
#   read as text (for example words inside a picture). Also passed on to be checked.
#
# Every finding gets "How Hidden" points (CLAUDE.md scoring):
#   visible 0, metadata/comments 25, tiny or off-page 40,
#   same colour as background or invisible letters 50.
#
# Try it from the backend folder (one file, or a whole folder):
#   .venv\Scripts\python.exe -m pipeline.compare ..\test_files

import re

from rapidfuzz import fuzz

from pipeline.hidden_parts import find_letter_tricks, plain_letters

# ---------- The hidden rules ----------
TINY_FONT = 4             # under 4 pt = too small to read
NEAR_ZERO_CONTRAST = 1.5  # colour contrast under 1.5 = blends into background (21 = black on white)
SEE_THROUGH = 0.1         # opacity under 10% = basically invisible
NO_INK = 0.005            # under 0.5% of pixels change = leaves no visible mark
OFF_PAGE_SHARE = 0.5      # less than half the text box on the page = off the page

# How Hidden points
POINTS_VISIBLE = 0
POINTS_HIDDEN_PLACE = 25  # metadata, comments, alt text...
POINTS_TINY_OR_OFF = 40   # tiny, off the page, or no witness could see it
POINTS_INVISIBLE = 50     # same colour as background, see-through, covered, invisible letters

# ---------- Witness matching ----------
SEEN_SCORE = 80           # RapidFuzz similarity (0-100) needed to say "a witness saw it"
NEARBY = 6                # points of wiggle room when matching Tesseract positions
WITNESS_AGREE = 70        # Gemini and Tesseract page similarity under this = they disagree


def hex_to_rgb(color):
    return tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))


def contrast_ratio(color_a, color_b):
    # Standard web contrast ratio: 1 = same colour, 21 = black on white
    def brightness(color):
        values = []
        for v in hex_to_rgb(color):
            v = v / 255
            values.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
        r, g, b = values
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    light, dark = sorted((brightness(color_a), brightness(color_b)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def has_words(text):
    # At least 3 letters or numbers (skips lines like "|" or "-")
    return len(re.findall(r"\w", text)) >= 3


def simple(text):
    # Lower case, no extra spaces: makes matching fairer
    return " ".join(plain_letters(text).lower().split())


def gemini_saw(text, gemini_lines):
    # Did Gemini copy this text? (Gemini gives lines, but no positions)
    target = simple(text)
    return max((fuzz.partial_ratio(target, simple(line)) for line in gemini_lines), default=0) >= SEEN_SCORE


def tesseract_saw(text, box, tesseract_lines):
    # Did Tesseract read this text at about the same height on the page?
    if not box:
        return False  # the text has no place on the page at all
    target = simple(text)
    best = 0
    for line in tesseract_lines:
        top, bottom = line["box"][1], line["box"][3]
        if bottom + NEARBY >= box[1] and top - NEARBY <= box[3]:
            best = max(best, fuzz.partial_ratio(target, simple(line["text"])))
    return best >= SEEN_SCORE


def boxes_overlap(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def why_hidden(piece):
    # Check one piece of page text against the hidden rules.
    # Returns a list of (reason, points). Empty list = looks visible.
    reasons = []
    # Web pages and emails: the browser told us the page's code hides this text
    if piece.get("code_hidden"):
        reasons.append((f"hidden by page code ({', '.join(piece['code_hidden'])})", POINTS_INVISIBLE))
        return reasons
    if piece["on_page_share"] < OFF_PAGE_SHARE:
        reasons.append(("off the page", POINTS_TINY_OR_OFF))
        return reasons  # nothing else to check: it is not on the page at all
    if piece["size"] < TINY_FONT:
        reasons.append((f"tiny font ({piece['size']} pt)", POINTS_TINY_OR_OFF))

    blends_in = False
    if piece["background"]:
        ratio = contrast_ratio(piece["color"], piece["background"])
        if ratio < NEAR_ZERO_CONTRAST:
            reasons.append((f"same colour as background ({piece['color']} on {piece['background']})",
                            POINTS_INVISIBLE))
            blends_in = True
    if piece["opacity"] < SEE_THROUGH:
        reasons.append((f"see-through (opacity {piece['opacity']})", POINTS_INVISIBLE))
        blends_in = True

    # Text that changes no pixels at all, for no reason above, is covered up
    if not blends_in and piece["ink"] is not None and piece["ink"] < NO_INK:
        if any(boxes_overlap(piece["box"], image) for image in piece["page_images"]):
            reasons.append(("covered by an image", POINTS_INVISIBLE))
        else:
            reasons.append(("leaves no visible mark (invisible or covered)", POINTS_INVISIBLE))
    return reasons


def compare(ai_pieces, human, hidden_places):
    # ai_pieces = step 2, human = step 3, hidden_places = step 4.
    findings = []      # text a person cannot see (or that hides a trick)
    visible = []       # text a person can see
    picture_only = []  # text a person can see, but the computer did not read as text
    pages = {p["page"]: p for p in human["pages"]}
    witness_problems = []
    agreements = []

    # ----- Way 1: everything the computer reads on the pages -----
    for piece in ai_pieces:
        page = pages.get(piece["page"], {})
        gemini = page.get("gemini", {})
        tesseract = page.get("tesseract", {})

        seen_by = {
            "gemini": gemini_saw(piece["text"], gemini["lines"]) if gemini.get("status") == "ok" else None,
            "tesseract": (tesseract_saw(piece["text"], piece["box"], tesseract["lines"])
                          if tesseract.get("status") == "ok" else None),
        }
        reasons = why_hidden(piece)

        # No rule fired, but every working witness missed it: computer-only text.
        # Only when Gemini could look too: Tesseract alone (private mode) often
        # misses faint small print that a person can still read.
        answers = [v for v in seen_by.values() if v is not None]
        if (not reasons and seen_by["gemini"] is False and not any(answers)
                and has_words(piece["text"])):
            reasons.append(("no witness could see it", POINTS_TINY_OR_OFF))

        where = {"page": piece["page"], "box": piece["box"]}
        if reasons:
            findings.append({
                "text": piece["text"],
                "reads_as": plain_letters(piece["text"]),
                "where": where,
                "how_hidden": [r for r, _ in reasons],
                "hidden_points": max(p for _, p in reasons),
                "seen_by": seen_by,
            })
        else:
            visible.append({"text": piece["text"], "where": where, "seen_by": seen_by})

        # Letter tricks hide INSIDE text, even text that is otherwise visible
        for trick in find_letter_tricks(piece["text"]):
            findings.append({
                "text": trick.get("hidden_message") or trick.get("reads_as") or piece["text"],
                # Check the DECODED secret for orders, not just the visible words around it
                "reads_as": trick.get("hidden_message") or plain_letters(piece["text"]),
                "where": where,
                "how_hidden": [f"{trick['kind']}: {trick['detail']}"],
                "hidden_points": POINTS_INVISIBLE,
                "seen_by": seen_by,
            })

    # ----- Hidden places (metadata, comments, alt text...) -----
    for item in hidden_places:
        tricks = item["letter_tricks"]
        findings.append({
            "text": item["text"],
            "reads_as": item["reads_as"],
            "where": {"page": item["page"], "place": item["place"]},
            "how_hidden": [f"hidden place: {item['place']}"]
                          + [f"{t['kind']}: {t['detail']}" for t in tricks],
            "hidden_points": POINTS_INVISIBLE if tricks else POINTS_HIDDEN_PLACE,
            "seen_by": {"gemini": False, "tesseract": False},
        })

    # ----- Way 2: what people see that the computer did not read as text -----
    for number, page in pages.items():
        page_text = simple(" ".join(p["text"] for p in ai_pieces if p["page"] == number))
        gemini, tesseract = page["gemini"], page["tesseract"]
        # Prefer Gemini's lines. In private mode use Tesseract's sure readings.
        if gemini.get("status") == "ok":
            lines, witness = gemini["lines"], "gemini"
        else:
            lines = [l["text"] for l in tesseract.get("lines", []) if l["confidence"] >= 60]
            witness = "tesseract"
        for line in lines:
            if has_words(line) and fuzz.partial_ratio(simple(line), page_text) < SEEN_SCORE:
                picture_only.append({"text": line, "where": {"page": number}, "seen_by": witness})

        # Do the two witnesses mostly agree about this page?
        if gemini.get("status") == "ok" and tesseract.get("status") == "ok":
            agreement = fuzz.token_set_ratio(simple(" ".join(gemini["lines"])),
                                             simple(" ".join(l["text"] for l in tesseract["lines"])))
            agreements.append(agreement)
            if agreement < WITNESS_AGREE:
                witness_problems.append({"page": number, "agreement": round(agreement)})

    errors = [f"page {n}: {name} failed ({page[name].get('error')})"
              for n, page in pages.items() for name in ("gemini", "tesseract")
              if page[name].get("status") == "error"]

    return {
        "findings": findings,
        "visible": visible,
        "picture_only": picture_only,
        "witnesses_disagree": witness_problems,
        "witness_errors": errors,
        # How much Gemini and Tesseract agree, on average (None in private mode)
        "witness_agreement": round(sum(agreements) / len(agreements)) if agreements else None,
    }


def scan_steps_2_to_5(pdf_bytes, private_mode=None):
    # Run steps 2, 3, 4 and 5 on one PDF
    from pipeline.ai_view import read_ai_view
    from pipeline.hidden_parts import read_hidden_places
    from pipeline.human_view import read_human_view

    return compare(read_ai_view(pdf_bytes),
                   read_human_view(pdf_bytes, private_mode),
                   read_hidden_places(pdf_bytes))


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.stdout.reconfigure(encoding="utf-8")  # so Windows can print any letter
    target = Path(sys.argv[1])
    files = sorted(target.glob("*.pdf")) if target.is_dir() else [target]
    private = True if "--private" in sys.argv else None

    def short(text, size):
        return text if len(text) <= size else text[: size - 3] + "..."

    print(f"{'FILE':<28}{'HIDDEN TEXT FOUND':<52}{'WHY IT IS HIDDEN'}")
    print("=" * 140)
    for file in files:
        result = scan_steps_2_to_5(file.read_bytes(), private)
        rows = [(short(f["text"], 50), "; ".join(f["how_hidden"]) + f"  [{f['hidden_points']} pts]")
                for f in result["findings"]]
        rows += [(short(p["text"], 50), f"picture-only: seen by {p['seen_by']}, not in the text layer")
                 for p in result["picture_only"]]
        rows += [("(witness check)", f"Gemini and Tesseract disagree on page {w['page']} "
                                     f"({w['agreement']}% alike)") for w in result["witnesses_disagree"]]
        rows += [("(error)", e) for e in result["witness_errors"]]
        if not rows:
            rows = [("-", "nothing hidden")]
        for i, (text, why) in enumerate(rows):
            print(f"{file.name if i == 0 else '':<28}{text:<52}{why}")
        print("-" * 140)
