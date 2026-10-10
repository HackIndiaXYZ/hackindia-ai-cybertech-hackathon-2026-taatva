# TAATVA Obsidian - backend in a box (Docker), for Render.
# It contains: Python, Tesseract OCR, a Chromium browser (for emails and web pages),
# and all our libraries. Secret keys are NOT inside; Render gives them at start-up.
#
# Prompt Guard is big (about 1 GB memory). It is OFF by default.
# To turn it on, set the Render build setting  PROMPT_GUARD_BUILD=true
# (and the environment settings PROMPT_GUARD=true and HF_TOKEN=...).

FROM python:3.12-slim

ARG PROMPT_GUARD_BUILD=false

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TESSERACT_CMD=tesseract \
    BROWSER_CHANNEL= \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Tesseract OCR (English + Hindi) from the official Debian packages
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Libraries first (so rebuilds are faster when only our code changes)
COPY requirements.txt requirements-promptguard.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
 && if [ "$PROMPT_GUARD_BUILD" = "true" ]; then \
      pip install --no-cache-dir -r requirements-promptguard.txt --extra-index-url https://download.pytorch.org/whl/cpu; \
    fi

# The Chromium browser that Playwright uses, plus the system parts it needs
RUN playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*

# Our code (the .dockerignore file keeps .env and other secrets out)
COPY . .

# Run as a normal user, not as the all-powerful "root" user
RUN useradd --create-home obsidian && chown -R obsidian /app /ms-playwright
USER obsidian

# Render tells us which port to use in $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
