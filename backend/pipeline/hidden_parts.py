# TAATVA Obsidian - Pipeline step 4: hidden parts.
#
# An AI agent may read text from places a person never looks at:
#   - metadata (Title, Subject, Keywords... and the XMP data block)
#   - comments / sticky notes, and form fields
#   - alt text (picture descriptions) and "ActualText"
#   - bookmarks and attached file names
# We also look INSIDE all text for letter tricks:
#   - zero-width letters (take up no space, so people never see them)
#   - "tag" letters (invisible copies of normal letters, can hide a whole sentence)
#   - look-alike letters (e.g. a Russian "а" that looks exactly like an English "a")
#
# Try it from the backend folder:
#   .venv\Scripts\python.exe -m pipeline.hidden_parts ..\test_files\attacked_4_metadata.pdf

import re
import unicodedata

import pymupdf

# ---------- Letter tricks ----------

# Letters that are invisible: they take up no space on the page
ZERO_WIDTH = {
    "​": "zero-width space",
    "‌": "zero-width non-joiner",
    "‍": "zero-width joiner",
    "‎": "left-to-right mark",
    "‏": "right-to-left mark",
    "⁠": "word joiner",
    "⁡": "invisible function",
    "⁢": "invisible times",
    "⁣": "invisible separator",
    "⁤": "invisible plus",
    "﻿": "zero-width no-break space",
    "­": "soft hyphen",
    "᠎": "mongolian vowel separator",
    "‪": "direction control", "‫": "direction control", "‬": "direction control",
    "‭": "direction control", "‮": "direction control (right-to-left override)",
    "⁦": "direction control", "⁧": "direction control",
    "⁨": "direction control", "⁩": "direction control",
}

# "Tag" letters U+E0000 to U+E007F are invisible copies of normal letters.
# Attackers use them to hide a whole sentence inside normal-looking text.
TAG_START, TAG_END = 0xE0000, 0xE007F

# Common look-alike letters from other alphabets -> the English letter they copy
LOOK_ALIKES = {
    # Russian (Cyrillic)
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i",
    "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ӏ": "l", "ԛ": "q", "ԝ": "w",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P",
    "С": "C", "Т": "T", "Х": "X", "У": "Y", "І": "I", "Ј": "J", "Ѕ": "S",
    # Greek
    "α": "a", "ο": "o", "ρ": "p", "ν": "v", "ι": "i", "κ": "k", "τ": "t", "υ": "u",
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M",
    "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
}


def letter_alphabet(ch):
    # "LATIN SMALL LETTER A" -> "LATIN". Used to spot words that mix alphabets.
    try:
        return unicodedata.name(ch).split(" ")[0]
    except ValueError:
        return "UNKNOWN"


def find_letter_tricks(text):
    # Look inside one piece of text for invisible and look-alike letters.
    # Returns a list of tricks found (empty list = nothing odd).
    tricks = []

    invisible = [ZERO_WIDTH[ch] for ch in text if ch in ZERO_WIDTH]
    if invisible:
        trick = {
            "kind": "zero-width letters",
            "detail": f"{len(invisible)} invisible letters ({', '.join(sorted(set(invisible)))})",
        }
        secret = decode_zero_width(text)
        if secret:
            trick["hidden_message"] = secret
        tricks.append(trick)

    tag_letters = [ch for ch in text if TAG_START <= ord(ch) <= TAG_END]
    if tag_letters:
        hidden_message = "".join(chr(ord(ch) - TAG_START) for ch in tag_letters
                                 if 0x20 <= ord(ch) - TAG_START <= 0x7E)
        tricks.append({
            "kind": "tag letters",
            "detail": f"{len(tag_letters)} invisible tag letters",
            "hidden_message": hidden_message,
        })

    # Control characters (like \x00) never belong in normal text. They often
    # appear when invisible letters were squeezed into the file.
    control = [ch for ch in text if unicodedata.category(ch) == "Cc" and ch not in "\t\n\r"]
    if control:
        tricks.append({
            "kind": "control characters",
            "detail": f"{len(control)} invisible control characters",
        })

    # Words that mix English letters with look-alikes from another alphabet
    tricky_words = []
    for word in re.findall(r"\w+", text):
        alphabets = {letter_alphabet(ch) for ch in word if ch.isalpha()}
        mixed = "LATIN" in alphabets and alphabets & {"CYRILLIC", "GREEK"}
        fake = [ch for ch in word if ch in LOOK_ALIKES]
        fullwidth = [ch for ch in word if "！" <= ch <= "～"]
        if (mixed and fake) or fullwidth:
            tricky_words.append(word)
    if tricky_words:
        tricks.append({
            "kind": "look-alike letters",
            "detail": f"{len(tricky_words)} word(s) use letters from another alphabet: "
                      + ", ".join(f'"{plain_letters(w)}"' for w in tricky_words),
            "reads_as": plain_letters(text),
        })
    return tricks


def decode_zero_width(text):
    # A common trick: a whole sentence hidden as invisible "0" and "1" marks
    # (zero-width space = 0, zero-width non-joiner = 1, 8 marks per letter).
    # Returns the hidden sentence, or None if there is none.
    for run in re.findall(r"[​‌]{16,}", text):
        for zero, one in (("​", "‌"), ("‌", "​")):
            bits = run.replace(zero, "0").replace(one, "1")
            letters = [chr(int(bits[i:i + 8], 2)) for i in range(0, len(bits) - 7, 8)]
            message = "".join(letters)
            if message and sum(ch.isprintable() for ch in message) / len(message) > 0.9 \
                    and re.search(r"[A-Za-z]{3}", message):
                return message
    return None


def plain_letters(text):
    # Turn tricky text back into what it really says, so the order checker
    # (step 6) is not fooled: remove invisible letters, swap look-alikes,
    # decode tag letters, and turn fancy letters (like ｆｕｌｌｗｉｄｔｈ) into normal ones.
    out = []
    for ch in text:
        if ch in ZERO_WIDTH or (unicodedata.category(ch) == "Cc" and ch not in "\t\n\r"):
            continue
        if TAG_START <= ord(ch) <= TAG_END:
            code = ord(ch) - TAG_START
            if 0x20 <= code <= 0x7E:
                out.append(chr(code))
            continue
        out.append(LOOK_ALIKES.get(ch, ch))
    return unicodedata.normalize("NFKC", "".join(out))


# ---------- Hidden places in the PDF ----------

# The standard metadata fields and what we call them
METADATA_FIELDS = ["title", "author", "subject", "keywords", "creator", "producer"]


def read_hidden_places(pdf_bytes):
    # Returns a list of text found in places a person does not normally look.
    found = []
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    def add(place, kind, text, page=None):
        text = (text or "").strip()
        if text:
            found.append({"place": place, "kind": kind, "page": page, "text": text})

    # 1. Metadata (the file's "properties")
    for field in METADATA_FIELDS:
        add(f"metadata: {field}", "metadata", doc.metadata.get(field))

    # 2. XMP metadata: a second, bigger metadata block. Keep only text that
    #    is not already in the normal fields, and skip dates, IDs and tool names.
    known = {(doc.metadata.get(f) or "").strip() for f in METADATA_FIELDS}
    xmp = doc.get_xml_metadata() or ""
    for value in re.findall(r">([^<>]+)<", xmp):
        value = value.strip()
        boring = re.fullmatch(r"[\d\-:T.+Z ]+|uuid:[\w-]+|[\w.\-/ ]{0,3}", value)
        if value and value not in known and not boring:
            add("metadata: XMP", "metadata", value)
            known.add(value)

    for page in doc:
        # 3. Comments, sticky notes and other notes on the page
        for annot in page.annots() or []:
            info = annot.info
            add(f"comment ({annot.type[1]})", "comment", info.get("content"), page.number + 1)
            add(f"comment ({annot.type[1]}) title", "comment", info.get("subject"), page.number + 1)
        # 4. Form fields: their values and help tips
        for widget in page.widgets() or []:
            add(f"form field '{widget.field_name}'", "form field",
                str(widget.field_value or ""), page.number + 1)
            add(f"form field '{widget.field_name}' tooltip", "form field",
                widget.field_label, page.number + 1)

    # 5. Alt text (picture descriptions) and ActualText, found anywhere in the file
    for xref in range(1, doc.xref_length()):
        for key, kind in (("Alt", "alt text"), ("ActualText", "actual text")):
            try:
                value_type, value = doc.xref_get_key(xref, key)
            except Exception:
                continue
            if value_type == "string":
                add(f"{kind} (object {xref})", kind, value)

    # 6. Bookmarks (the side menu in PDF readers)
    for level, title, page_number, *_ in doc.get_toc(simple=False):
        add("bookmark", "bookmark", title, page_number)

    # 7. Attached files: their names and descriptions
    for name in doc.embfile_names():
        info = doc.embfile_info(name)
        add("attached file name", "attachment", info.get("filename") or name)
        add("attached file description", "attachment", info.get("description"))

    doc.close()

    # Look for letter tricks inside everything we just found
    for item in found:
        item["letter_tricks"] = find_letter_tricks(item["text"])
        item["reads_as"] = plain_letters(item["text"])
    return found


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8")  # so Windows can print any letter
    with open(sys.argv[1], "rb") as f:
        result = read_hidden_places(f.read())
    for item in result:
        page = f" (page {item['page']})" if item["page"] else ""
        print(f"{item['place']}{page}: {item['text']}")
        for trick in item["letter_tricks"]:
            print(f"    !! {trick['kind']}: {trick['detail']}")
    print(f"\n{len(result)} hidden places with text found.")
