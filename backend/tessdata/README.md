# Tesseract language packs (TAATVA Obsidian)

Used to read hidden Hindi again from a picture (`pipeline/hindi_reread.py`).

- `hin.traineddata` = Hindi, `eng.traineddata` = English.
- From Tesseract's official "fast" packs: https://github.com/tesseract-ocr/tessdata_fast (Apache 2.0 licence).
- They live here because adding a language to `C:\Program Files\Tesseract-OCR` needs admin rights.
  Obsidian finds this folder by itself (`config.py`, `TESSDATA_DIR`).
