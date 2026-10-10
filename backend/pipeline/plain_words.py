# TAATVA Obsidian - plain words for the dashboard.
# Turns technical findings into short sentences an HR person understands.
# ("metadata" becomes "file details", and so on.)

ORDER_FROM = 0.5  # order score from 0.5 = "gives the AI an order"

# Hidden PLACES (not on the page). Matched by words in the place name, top to bottom.
#   key: (title, short tag, explanation)
PLACES = {
    "metadata":            ("File details", "file details",
                            "Stored in the file details. Nobody opens these, but the AI reads them."),
    "code comment":        ("Hidden code comment", "code comment",
                            "Written as a comment in the page's code. Never shown, but the AI reads it."),
    "picture description": ("Hidden picture description", "picture description",
                            "Stored as the description of a picture. Not shown, but the AI reads it."),
    "alt text":            ("Hidden picture description", "picture description",
                            "Stored as a picture description that is not shown on the page."),
    "hover tip":           ("Hidden hover tip", "hover tip",
                            "Only appears if you hover the mouse over something. The AI always reads it."),
    "screen-reader label": ("Hidden screen-reader label", "screen-reader label",
                            "A label meant for screen readers. Not shown on the page, but the AI reads it."),
    "hidden form field":   ("Hidden form field", "hidden form field",
                            "Stored in a hidden form field. Never shown, but the AI reads it."),
    "form field":          ("Form field", "form field", "Stored in a form field. The AI reads it."),
    "page details":        ("Hidden page details", "page details",
                            "Stored in the page's hidden details (meta). Never shown, but the AI reads it."),
    "page title":          ("Page title", "page title", "The page's title. The AI reads it."),
    "page code":           ("Text inside page code", "page code",
                            "Written inside the page's code, which we never run. The AI may read it."),
    "email header":        ("Hidden email header", "email header",
                            "Stored in a hidden email header. Email programs do not show it."),
    "plain-text copy":     ("Hidden plain-text copy", "plain-text copy",
                            "Only in the plain-text copy of the email, which is not shown. Some AI tools read that copy."),
    "attached file":       ("Attached file", "attachment", "The name of an attached file."),
    "comment":             ("Hidden comment", "comment", "Stored as a hidden comment. The AI reads it."),
    "actual text":         ("Hidden text label", "text label", "A hidden text label inside the file. The AI reads it."),
    "bookmark":            ("Bookmark text", "bookmark", "Text in the file's bookmarks. The AI reads it."),
}

# Ways text is hidden ON the page. Matched by how the first reason starts.
#   key: (title, short tag, explanation)
ON_PAGE = {
    "hidden by page code":   ("Text hidden by the page's code", "hidden by code",
                              "The page's code hides it, so a person never sees it."),
    "same colour":           ("Text the same colour as the page", "same colour as page",
                              "Same colour as the page, so a person sees blank space."),
    "tiny font":             ("Text too small to read", "font under 4 pt", "Far too small for a person to read."),
    "off the page":          ("Text placed outside the page", "off the page",
                              "Placed outside the edge of the page, so it is never shown."),
    "covered by an image":   ("Text hidden under a picture", "under a picture",
                              "Covered by a picture, so a person cannot see it."),
    "leaves no visible mark": ("Invisible text", "invisible", "Drawn invisibly, so a person cannot see it."),
    "see-through":           ("See-through text", "see-through", "Almost fully see-through, so a person cannot see it."),
    "no witness":            ("Text no person could see", "nobody could see it",
                              "Neither of our two page readers could see it."),
    "zero-width":            ("Invisible letters inside text", "invisible letters",
                              "Contains invisible letters that people cannot notice."),
    "tag letters":           ("Invisible letters inside text", "invisible letters",
                              "Contains invisible letters that hide a message."),
    "control characters":    ("Invisible letters inside text", "invisible letters",
                              "Contains invisible letters that people cannot notice."),
    "look-alike":            ("Letters in disguise (look-alikes)", "look-alike letters",
                              "Uses letters from another alphabet that look the same, to trick word filters."),
    "visible text inside a picture": ("Text inside a picture", "inside a picture", "Shown inside a picture on the page."),
}

VISIBLE = ("Visible text", "visible", "Anyone can see this on the page.")


def kind_of(item):
    # Returns the key from PLACES or ON_PAGE, or "visible"
    place = item["where"].get("place", "")
    if place:
        return next((key for key in PLACES if key in place), "place")
    first = (item.get("how_hidden") or [""])[0]
    return next((key for key in ON_PAGE if first.startswith(key)), "visible")


def words_for(item):
    kind = kind_of(item)
    if kind in PLACES:
        return PLACES[kind]
    if kind in ON_PAGE:
        return ON_PAGE[kind]
    if kind == "place":
        return ("Hidden part of the file", "hidden part of file",
                "Stored in a hidden part of the file. The AI reads it.")
    return VISIBLE


def title(item):
    kind = kind_of(item)
    reason = (item.get("how_hidden") or [""])[0]
    if kind == "same colour" and ("#ffffff" in reason or "#fefefe" in reason):
        return "White text on a white page"
    if kind == "tiny font":
        size = float(reason.split("(")[-1].split(" ")[0])
        return f"Text in {size:g}-point size (too small to read)"
    if kind == "metadata":
        return "Order in the file details" if item["bossy_score"] >= ORDER_FROM else "Normal file details"
    if kind == "visible":
        return "Visible order to the AI" if item["bossy_score"] >= ORDER_FROM else "Visible text"
    return words_for(item)[0]


def how_label(item):
    # A very short tag, like "same colour as page" or "display:none block"
    reason = (item.get("how_hidden") or [""])[0]
    if kind_of(item) == "hidden by page code":
        if "display:none" in reason:
            return "display:none block"
        if "visibility:hidden" in reason:
            return "visibility:hidden"
    return words_for(item)[1]


def where_label(item, page_sizes):
    where = item["where"]
    place = where.get("place")
    if place:
        if place.startswith("metadata"):
            field = place.split(":", 1)[-1].strip()
            return f"file details · {field} field"
        return place
    page = where.get("page")
    box = where.get("box")
    if not box:
        return f"page {page} · not shown anywhere"
    width, height = page_sizes.get(page) or (612, 792)
    middle = (box[1] + box[3]) / 2
    center = (box[0] + box[2]) / 2
    if not (0 <= middle <= height and 0 <= center <= width):
        return f"page {page} · outside the page"
    spot = "top" if middle < height / 3 else "middle" if middle < 2 * height / 3 else "bottom"
    return f"page {page} · near the {spot}"


def explain(item):
    how = words_for(item)[2]
    words = item.get("reads_as") or item["text"]
    if item["bossy_score"] >= ORDER_FROM:
        return f'{how} The AI reads an order: "{short(words, 120)}"'
    if item["hidden_points"] >= 40:
        return f"{how} Not an order, but hidden on purpose."
    return f"{how} Harmless."


def summary(item):
    # One line for the history table's "Worst finding"
    if item is None:
        return "No hidden text found."
    words = item.get("reads_as") or item["text"]
    if item["bossy_score"] >= ORDER_FROM:
        return f'{title(item)}: "{short(words, 70)}"'
    if item["hidden_points"] >= 40:
        return f"{title(item)}. Not an order, but hidden on purpose."
    if kind_of(item) == "metadata":
        return "Only normal file details. Harmless."
    return f"{title(item)}. Harmless."


def short(text, size):
    text = " ".join(text.split())
    return text if len(text) <= size else text[: size - 1] + "…"


def add_plain_words(findings, page_sizes):
    # page_sizes = {page number: (width, height)}
    for item in findings:
        item["title"] = title(item)
        item["explain"] = explain(item)
        item["how_label"] = how_label(item)
        item["where_label"] = where_label(item, page_sizes)
