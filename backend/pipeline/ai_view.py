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

import config

# Read text with PyMuPDF's normal settings, MINUS the setting that cuts off
# text outside the page. Attackers hide text off the page, so we must see it.
READ_FLAGS = pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_MEDIABOX_CLIP

# How sharp the page picture is when we look for background colours.
# 2 = twice normal size, enough to see even tiny text boxes.
ZOOM = 2


def safe_zoom(rect, wanted=ZOOM):
    # Make the page picture as sharp as wanted, but never bigger than
    # MAX_PAGE_PIXELS (giant pages like posters would use too much memory)
    area = max(rect.width * rect.height, 1)
    return min(wanted, (config.MAX_PAGE_PIXELS / area) ** 0.5)


def to_hex(rgb):
    # (255, 255, 255) -> "#ffffff"
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def int_to_rgb(color_int):
    # PyMuPDF stores colour as one number, e.g. 16777215 -> (255, 255, 255)
    return ((color_int >> 16) & 255, (color_int >> 8) & 255, color_int & 255)


def render_without_text(pdf_bytes, page_number, zoom=ZOOM):
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
    picture = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False,
                              colorspace=pymupdf.csRGB)
    copy.close()
    return picture


def render_normal(page, zoom=ZOOM):
    # A picture of the page exactly as a person sees it
    return page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False,
                           colorspace=pymupdf.csRGB)


def look_behind(no_text, normal, box, page_rect, zoom=ZOOM):
    # Compare the two page pictures inside this text's box.
    # Returns (background colour, ink):
    #   background = most common colour in the picture WITHOUT text
    #   ink = share of pixels that change when the text is drawn (0 to 1).
    #         Ink 0 means the text is in the file but leaves no mark a person
    #         could see (for example it is covered by an image).
    # Returns (None, None) if the box is off the page.
    visible_part = box & page_rect
    if visible_part.is_empty:
        return None, None

    x0 = max(int(visible_part.x0 * zoom), 0)
    y0 = max(int(visible_part.y0 * zoom), 0)
    x1 = min(max(int(visible_part.x1 * zoom), x0 + 1), no_text.width)
    y1 = min(max(int(visible_part.y1 * zoom), y0 + 1), no_text.height)

    # For big boxes, check every few pixels instead of all of them (faster)
    step = max(1, int(((x1 - x0) * (y1 - y0) / 4000) ** 0.5))

    before, after = no_text.samples, normal.samples
    counts = Counter()
    changed = total = 0
    for y in range(y0, y1, step):
        row = y * no_text.stride
        for x in range(x0, x1, step):
            i = row + x * 3
            counts[(before[i], before[i + 1], before[i + 2])] += 1
            difference = (abs(before[i] - after[i]) + abs(before[i + 1] - after[i + 1])
                          + abs(before[i + 2] - after[i + 2]))
            changed += difference > 30
            total += 1
    if not total:
        return None, None
    return counts.most_common(1)[0][0], changed / total


def read_ai_view(pdf_bytes):
    # Returns a list with one entry per piece of text in the PDF.
    pieces = []
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    for page in doc:
        page_rect = page.rect
        zoom = safe_zoom(page_rect)
        no_text = render_without_text(pdf_bytes, page.number, zoom)
        normal = render_normal(page, zoom)
        # PyMuPDF gives text and picture boxes as if the page were NOT rotated. The page
        # picture and the website show the page as people see it (rotated), so we turn
        # every box the same way (bug QA-07).
        turn = page.rotation_matrix
        page_image_boxes = [[round(v, 1) for v in (pymupdf.Rect(info["bbox"]) * turn)]
                            for info in page.get_image_info()]
        content = page.get_text("dict", flags=READ_FLAGS, clip=pymupdf.INFINITE_RECT())

        for block in content["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    if not span["text"].strip():
                        continue  # skip empty spaces
                    box = pymupdf.Rect(span["bbox"]) * turn
                    color = int_to_rgb(span["color"])
                    background, ink = look_behind(no_text, normal, box, page_rect, zoom)
                    on_page_part = box & page_rect
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
                        # How much of the box is on the page (1 = all of it, 0 = none)
                        "on_page_share": round(on_page_part.get_area() / box.get_area(), 2)
                                         if box.get_area() and not on_page_part.is_empty else 0.0,
                        "ink": None if ink is None else round(ink, 3),
                        # Pictures on this page, so step 5 can tell "covered by an image"
                        "page_images": page_image_boxes,
                    })
    doc.close()
    return pieces


if __name__ == "__main__":
    # Print a simple table so the team can look at the result
    import sys

    with open(sys.argv[1], "rb") as f:
        result = read_ai_view(f.read())

    print(f"{'pg':<3}{'size':>5}  {'colour':<8}{'backgrnd':<9}{'opac':>5}{'ink':>6}  {'on page':<8}{'box (x0, y0, x1, y1)':<28}text")
    print("-" * 126)
    for p in result:
        box = "(" + ", ".join(f"{v:.0f}" for v in p["box"]) + ")"
        print(f"{p['page']:<3}{p['size']:>5}  {p['color']:<8}{str(p['background']):<9}{p['opacity']:>5}"
              f"{str(p['ink']):>6}  {'yes' if p['on_page'] else 'NO':<8}{box:<28}{p['text']}")
    print(f"\n{len(result)} pieces of text found.")
