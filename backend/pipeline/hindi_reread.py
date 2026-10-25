# TAATVA Obsidian - read hidden Hindi again, from a picture.
#
# The problem: many PDFs (made by Word, browsers...) store Hindi letters in a way that
# turns into nonsense when the computer pulls the text out: joined letters become odd
# symbols ("उʃीदवार" instead of "उम्मीदवार") and sentences are cut into pieces.
# Obsidian still catches the text by HOW it is hidden, but the order checker cannot read it.
#
# The fix (plain code + Tesseract, no AI decides anything):
#   1. Find hidden pieces that look like garbled Hindi.
#   2. Join the pieces that sit on the same line into one finding.
#   3. On a throw-away copy of the page, make ALL text visible: dark ink, no pictures or
#      coloured boxes on top, no see-through, page made big enough for off-page text.
#   4. Take a sharp picture of just that spot (tiny text is zoomed up) and let Tesseract
#      read it in Hindi + English. The order checker then reads THOSE words.
# The real file is never changed. If anything here fails, the finding keeps its old text
# and its hidden points (it is still caught by how it is hidden).

import logging
import re

import pymupdf
import pytesseract
from PIL import Image

import config
from pipeline.hidden_parts import plain_letters

log = logging.getLogger("obsidian")

READ_TIMEOUT = 20        # seconds for Tesseract per spot
LETTER_PIXELS = 40       # zoom tiny text until one letter is about this many pixels tall
MAX_SPOT_PIXELS = 4_000_000

DEVANAGARI = re.compile(r"[ऀ-ॿ]")
# Signs that can never start a Hindi word (a vowel sign or virama with no letter before it)
LONELY_SIGN = re.compile(r"(^|[\s ])[ऺ-ॏ॑-ॗॢॣ]")
# Symbols that do not belong in Hindi text: Latin extended letters, phonetic signs,
# private-use shapes. Garbled Hindi is full of them.
STRANGE = re.compile(r"[Ā-˿ᴀ-ᶿ-�]")


def looks_garbled_hindi(text):
    # A short piece with Devanagari, or with a lonely vowel sign or odd symbols next to it
    if not DEVANAGARI.search(text) and not (STRANGE.search(text) and len(text.strip()) <= 3):
        return False
    return bool(LONELY_SIGN.search(text) or STRANGE.search(text) or len(text.strip()) <= 2)


def same_line(a, b):
    # Two boxes on the same line: they overlap up and down by at least half a letter
    overlap = min(a[3], b[3]) - max(a[1], b[1])
    return overlap > 0.5 * min(a[3] - a[1], b[3] - b[1])


def group_by_line(findings):
    # Garbled hidden pieces on the same page and line become one group
    groups = []
    for item in sorted(findings, key=lambda f: (f["where"]["page"], f["where"]["box"][1], f["where"]["box"][0])):
        last = groups[-1][-1] if groups else None
        if last and last["where"]["page"] == item["where"]["page"] and same_line(last["where"]["box"], item["where"]["box"]):
            groups[-1].append(item)
        else:
            groups.append([item])
    return groups


# ---------- Make all text visible on a throw-away copy ----------

STRING = re.compile(rb"(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)")   # text inside ( ) or < > is left alone
FILL_COLOUR = re.compile(rb"(?:-?[\d.]+\s+){1,4}(?:rg|g|k|sc)\b|(?:-?[\d.]+\s+){0,4}(?:/[^\s/\[\]()<>]+\s+)?scn\b")
RENDER_MODE = re.compile(rb"\b[1-7]\s+Tr\b")                        # 3 Tr = invisible text, etc.
OPACITY = re.compile(rb"/[^\s/\[\]()<>]+\s+gs\b")                   # see-through settings
PAINT_SHAPE = re.compile(rb"(?<![\w*])(?:f\*?|F|B\*?|b\*?)(?![\w*])")   # coloured boxes -> not painted
CLIP = re.compile(rb"(?<![\w*])W\*?(?![\w*])")                       # clipping (cutting text away)


def show_everything(stream, picture_names):
    parts = STRING.split(stream)
    for i in range(0, len(parts), 2):          # even parts are outside text strings
        part = FILL_COLOUR.sub(b"0 g", parts[i])
        part = RENDER_MODE.sub(b"0 Tr", part)
        part = OPACITY.sub(b"", part)
        part = PAINT_SHAPE.sub(b"n", part)
        part = CLIP.sub(b"", part)
        for name in picture_names:              # pictures on top of text are not drawn
            part = re.sub(rb"/" + re.escape(name) + rb"\s+Do\b", b"", part)
        parts[i] = part
    return b"".join(parts)


def spot_picture(pdf_bytes, page_number, box, font_size):
    # A sharp picture of one spot of the page, with every piece of text made visible.
    # box = where the text is, as the AI view gives it (in the page as people see it).
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        page = doc[page_number - 1]
        flat = pymupdf.Rect(box) * page.derotation_matrix   # the box on the page without turning
        page.set_rotation(0)
        crop = page.cropbox

        pictures = {img[7].encode() for img in page.get_images(full=True)}
        streams = list(page.get_contents()) + [xobject[0] for xobject in page.get_xobjects()]
        for xref in streams:
            doc.update_stream(xref, show_everything(doc.xref_stream(xref), pictures))

        # Make the page big enough to hold the spot (for text placed off the page)
        pad = max(font_size, 2)
        spot = pymupdf.Rect(flat.x0 - pad, flat.y0 - pad, flat.x1 + pad, flat.y1 + pad)
        in_pdf_units = pymupdf.Rect(spot.x0 + crop.x0, crop.y1 - spot.y1, spot.x1 + crop.x0, crop.y1 - spot.y0)
        bigger = page.mediabox | in_pdf_units
        page.set_mediabox(bigger)
        spot = pymupdf.Rect(in_pdf_units.x0 - bigger.x0, bigger.y1 - in_pdf_units.y1,
                            in_pdf_units.x1 - bigger.x0, bigger.y1 - in_pdf_units.y0)

        zoom = max(3.0, LETTER_PIXELS / max(font_size, 0.5))
        zoom = min(zoom, (MAX_SPOT_PIXELS / max(spot.width * spot.height, 1)) ** 0.5)
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=spot, alpha=False,
                                 colorspace=pymupdf.csGRAY)
        return Image.frombytes("L", (pixmap.width, pixmap.height), pixmap.samples)
    finally:
        doc.close()


def read_spot(picture):
    pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD
    # Forward slashes and no quote marks: on Windows the quote marks reach Tesseract as part of the name
    folder = f"--tessdata-dir {config.TESSDATA_DIR.replace(chr(92), '/')} " if config.TESSDATA_DIR else ""
    text = pytesseract.image_to_string(picture, lang="hin+eng", config=folder + "--psm 6",
                                       timeout=READ_TIMEOUT)
    return " ".join(text.split())


# ---------- Put it together ----------

def reread_garbled_hindi(compared, pdf_bytes, ai_pieces):
    # Changes compared["findings"] in place: garbled Hindi pieces on one line become one
    # finding, and its "reads_as" is what Tesseract reads from the made-visible picture.
    # Hidden pieces with Hindi (or odd symbols) in them. A line is read again only if at
    # least one of its pieces looks garbled; then ALL its Hindi pieces are read together.
    hindi = [f for f in compared["findings"] if f["where"].get("box") and f["where"].get("page")
             and (DEVANAGARI.search(f["text"]) or STRANGE.search(f["text"]))]
    if not any(looks_garbled_hindi(f["text"]) for f in hindi):
        return
    sizes = {(p["page"], tuple(p["box"])): p["size"] for p in ai_pieces}
    for group in group_by_line(hindi):
        if not any(looks_garbled_hindi(f["text"]) for f in group):
            continue
        first = group[0]
        boxes = [pymupdf.Rect(f["where"]["box"]) for f in group]
        box = boxes[0]
        for other in boxes[1:]:
            box |= other
        size = max(sizes.get((f["where"]["page"], tuple(f["where"]["box"])), 12) for f in group)
        try:
            words = read_spot(spot_picture(pdf_bytes, first["where"]["page"], box, size))
        except Exception as error:
            # Not fatal: the pieces stay caught by how they are hidden
            log.warning(f"Hindi re-read failed on page {first['where']['page']}: {type(error).__name__}")
            continue
        if not DEVANAGARI.search(words):
            continue   # Tesseract found no Hindi there: keep the pieces as they were

        # One finding for the whole line
        first["text"] = " ".join(f["text"] for f in group)
        first["reads_as"] = plain_letters(words)
        first["read_from_picture"] = True
        first["where"] = {"page": first["where"]["page"], "box": [round(v, 1) for v in box]}
        first["hidden_points"] = max(f["hidden_points"] for f in group)
        first["how_hidden"] = list(dict.fromkeys(r for f in group for r in f["how_hidden"]))
        for other in group[1:]:
            compared["findings"].remove(other)
