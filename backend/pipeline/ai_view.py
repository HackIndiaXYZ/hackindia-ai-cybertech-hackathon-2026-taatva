# TAATVA Obsidian - Pipeline step 2: the "AI view".
#
# This is everything an AI agent would read from the PDF: every piece of text,
# with its page, position box, font size, colour and opacity.
# We also find the BACKGROUND colour behind each piece, so later steps can ask
# "could a human even see this?" (that question is our Delta 4).
#
# Try it from the backend folder:
#   .venv\Scripts\python.exe -m pipeline.ai_view ..\test_files\attacked_1_white_text.pdf

from collections import Counter

import pymupdf

# Read text with PyMuPDF's normal settings, MINUS the setting that cuts off
# text outside the page. Attackers hide text off the page, so we must see it.
READ_FLAGS = pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_MEDIABOX_CLIP

# How sharp the page picture is when we look for background colours.
# 2 = twice normal size, enough to see even tiny text boxes.
ZOOM = 2


def to_hex(rgb):
    # (255, 255, 255) -> "#ffffff"
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def int_to_rgb(color_int):
    # PyMuPDF stores colour as one number, e.g. 16777215 -> (255, 255, 255)
    return ((color_int >> 16) & 255, (color_int >> 8) & 255, color_int & 255)


def render_without_text(pdf_bytes, page_number):
    # Make a picture of the page with ALL text taken away.
    # What is left (white paper, coloured boxes, images) is the background.
    # We work on a throw-away copy, so the real file is never changed.
    copy = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    page = copy[page_number]
    page.add_redact_annot(page.rect, fill=False)
    page.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,      # keep images
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,  # keep boxes and lines
        text=pymupdf.PDF_REDACT_TEXT_REMOVE,        # remove text only
    )
    picture = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False,
                              colorspace=pymupdf.csRGB)
    copy.close()
    return picture


def background_color(picture, box, page_rect):
    # Look at the page picture (with no text) inside this text's box and
    # return the most common colour there. None if the box is off the page.
    visible_part = box & page_rect
    if visible_part.is_empty:
        return None

    x0 = max(int(visible_part.x0 * ZOOM), 0)
    y0 = max(int(visible_part.y0 * ZOOM), 0)
    x1 = min(max(int(visible_part.x1 * ZOOM), x0 + 1), picture.width)
    y1 = min(max(int(visible_part.y1 * ZOOM), y0 + 1), picture.height)

    # For big boxes, check every few pixels instead of all of them (faster)
    step = max(1, int(((x1 - x0) * (y1 - y0) / 4000) ** 0.5))

    data = picture.samples
    counts = Counter()
    for y in range(y0, y1, step):
        row = y * picture.stride
        for x in range(x0, x1, step):
            i = row + x * 3
            counts[(data[i], data[i + 1], data[i + 2])] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def read_ai_view(pdf_bytes):
    # Returns a list with one entry per piece of text in the PDF.
    pieces = []
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    for page in doc:
        page_rect = page.rect
        picture = render_without_text(pdf_bytes, page.number)
        content = page.get_text("dict", flags=READ_FLAGS, clip=pymupdf.INFINITE_RECT())

        for block in content["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    if not span["text"].strip():
                        continue  # skip empty spaces
                    box = pymupdf.Rect(span["bbox"])
                    color = int_to_rgb(span["color"])
                    background = background_color(picture, box, page_rect)
                    pieces.append({
                        "page": page.number + 1,  # people count pages from 1
                        "text": span["text"],
                        "box": [round(v, 1) for v in box],  # x0, y0, x1, y1 in points
                        "font": span["font"],
                        "size": round(span["size"], 1),
                        "color": to_hex(color),
                        "opacity": round(span.get("alpha", 255) / 255, 2),  # 1 = solid, 0 = see-through
                        "background": to_hex(background) if background else None,
                        "on_page": page_rect.contains(box),
                    })
    doc.close()
    return pieces


if __name__ == "__main__":
    # Print a simple table so the team can look at the result
    import sys

    with open(sys.argv[1], "rb") as f:
        result = read_ai_view(f.read())

    print(f"{'pg':<3}{'size':>5}  {'colour':<8}{'backgrnd':<9}{'opac':>5}  {'on page':<8}{'box (x0, y0, x1, y1)':<28}text")
    print("-" * 120)
    for p in result:
        box = "(" + ", ".join(f"{v:.0f}" for v in p["box"]) + ")"
        print(f"{p['page']:<3}{p['size']:>5}  {p['color']:<8}{str(p['background']):<9}{p['opacity']:>5}  "
              f"{'yes' if p['on_page'] else 'NO':<8}{box:<28}{p['text']}")
    print(f"\n{len(result)} pieces of text found.")
