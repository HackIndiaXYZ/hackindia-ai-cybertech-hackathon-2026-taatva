# TAATVA Obsidian - shared setup for the automated tests.
# Run all tests from the backend folder:   .venv\Scripts\python.exe -m pytest
# Quick tests only (skip the slow 20-file run): .venv\Scripts\python.exe -m pytest -m "not slow"

import logging
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
TEST_FILES = BACKEND.parent / "test_files"
sys.path.insert(0, str(BACKEND))
logging.disable(logging.CRITICAL)


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: takes more than a few seconds")
    config.addinivalue_line("markers", "gemini: needs the real Gemini service (skipped if it does not answer)")


@pytest.fixture
def test_files():
    return TEST_FILES


def piece(text, page=1, box=(72, 100, 300, 112), **extra):
    # One piece of "visible" page text, the way step 5 hands it to step 7
    item = {"text": text, "where": {"page": page, "box": list(box)}, "seen_by": {"gemini": True, "tesseract": True}}
    item.update(extra)
    return item


def finding(text, hidden_points, page=1, place=None, box=(72, 400, 300, 412), how="test"):
    where = {"page": page, "place": place} if place else {"page": page, "box": list(box)}
    return {"text": text, "reads_as": text, "where": where, "how_hidden": [how],
            "hidden_points": hidden_points, "seen_by": {"gemini": False, "tesseract": False}}


def compared(findings=(), visible=(), picture_only=(), disagree=()):
    # A fake "step 5" result, so we can test the scoring on its own
    return {"findings": list(findings), "visible": list(visible), "picture_only": list(picture_only),
            "witnesses_disagree": list(disagree), "witness_errors": [], "witness_agreement": None}
