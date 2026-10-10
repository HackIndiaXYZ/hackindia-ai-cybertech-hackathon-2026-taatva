# TAATVA Obsidian - plain words for the dashboard.
# Turns technical findings into short sentences an HR person understands.
# ("metadata" becomes "file details", and so on.)

ORDER_FROM = 0.5  # order score from 0.5 = "gives the AI an order"

# Names people understand for the hidden places
PLACE_NAMES = {
    "metadata": "file details",
    "comment": "a hidden comment",
    "form field": "a form field",
    "alt text": "a picture description",
    "actual text": "a hidden text label",
    "bookmark": "a bookmark",
    "attachment": "an attached file",
}


def kind_of(item):
    # Which kind of hiding is this? Looks at the first reason.
    first = (item.get("how_hidden") or [""])[0]
    place = item["where"].get("place", "")
    if place:
        for key in PLACE_NAMES:
            if place.startswith(key) or key in place:
                return key
        return "place"
    for key in ("same colour", "tiny font", "off the page", "covered by an image",
                "leaves no visible mark", "see-through", "no witness", "zero-width",
                "tag letters", "control characters", "look-alike", "visible text inside a picture"):
        if first.startswith(key):
            return key
    return "visible"


def title(item):
    kind = kind_of(item)
    if kind == "same colour":
        white = "#ffffff" in item["how_hidden"][0] or "#fefefe" in item["how_hidden"][0]
        return "White text on a white page" if white else "Text the same colour as the page"
    if kind == "tiny font":
        size = float(item["how_hidden"][0].split("(")[-1].split(" ")[0])
        return f"Text in {size:g}-point size (too small to read)"
    if kind == "metadata":
        return "Order in the file details" if item["bossy_score"] >= ORDER_FROM else "Normal file details"
    return {
        "off the page": "Text placed outside the page",
        "covered by an image": "Text hidden under a picture",
        "leaves no visible mark": "Invisible text",
        "see-through": "See-through text",
        "no witness": "Text no person could see",
        "zero-width": "Invisible letters inside text",
        "tag letters": "Invisible letters inside text",
        "control characters": "Invisible letters inside text",
        "look-alike": "Letters in disguise (look-alikes)",
        "visible text inside a picture": "Text inside a picture",
        "comment": "Hidden comment",
        "form field": "Hidden form field",
        "alt text": "Hidden picture description",
        "actual text": "Hidden text label",
        "bookmark": "Bookmark text",
        "attachment": "Attached file",
        "place": "Hidden part of the file",
        "visible": "Visible order to the AI" if item["bossy_score"] >= ORDER_FROM else "Visible text",
    }[kind]


def how_label(item):
    # A very short tag, like "same colour as page"
    kind = kind_of(item)
    return {
        "same colour": "same colour as page",
        "tiny font": "font under 4 pt",
        "off the page": "off the page",
        "covered by an image": "under a picture",
        "leaves no visible mark": "invisible",
        "see-through": "see-through",
        "no witness": "nobody could see it",
        "zero-width": "invisible letters",
        "tag letters": "invisible letters",
        "control characters": "invisible letters",
        "look-alike": "look-alike letters",
        "visible text inside a picture": "inside a picture",
        "visible": "visible",
    }.get(kind, "hidden part of file")


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
        return f"page {page}"
    width, height = page_sizes.get(page) or (612, 792)
    middle = (box[1] + box[3]) / 2
    center = (box[0] + box[2]) / 2
    if not (0 <= middle <= height and 0 <= center <= width):
        return f"page {page} · outside the page"
    spot = "top" if middle < height / 3 else "middle" if middle < 2 * height / 3 else "bottom"
    return f"page {page} · near the {spot}"


def explain(item):
    kind = kind_of(item)
    how = {
        "same colour": "Same colour as the page, so a person sees blank space.",
        "tiny font": "Far too small for a person to read.",
        "off the page": "Placed outside the edge of the page, so it is never shown.",
        "covered by an image": "Covered by a picture, so a person cannot see it.",
        "leaves no visible mark": "Drawn invisibly, so a person cannot see it.",
        "see-through": "Almost fully see-through, so a person cannot see it.",
        "no witness": "Neither of our two page readers could see it.",
        "zero-width": "Contains invisible letters that people cannot notice.",
        "tag letters": "Contains invisible letters that hide a message.",
        "control characters": "Contains invisible letters that people cannot notice.",
        "look-alike": "Uses letters from another alphabet that look the same, to trick word filters.",
        "visible text inside a picture": "Shown inside a picture on the page.",
        "metadata": "Stored in the file details. Nobody opens these, but the AI reads them.",
        "comment": "Stored as a hidden comment. The AI reads it.",
        "alt text": "Stored as a picture description that is not shown on the page.",
        "visible": "Anyone can see this on the page.",
    }.get(kind, "Stored in a hidden part of the file. The AI reads it.")

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
