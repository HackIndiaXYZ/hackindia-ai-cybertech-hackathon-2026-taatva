# TAATVA Obsidian - tests that keep the code itself safe and tidy.

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CODE = [p for p in list((ROOT / "backend").rglob("*.py")) + list((ROOT / "frontend").glob("[acl]*/**/*.ts*"))
        + list((ROOT / "test_files").glob("*.py"))
        if ".venv" not in p.parts and "node_modules" not in p.parts]

INVISIBLE = set(range(0x200B, 0x2010)) | set(range(0x2060, 0x2065)) | {0xFEFF, 0xAD} \
    | set(range(0x202A, 0x202F)) | set(range(0x2066, 0x206A))


def test_no_invisible_characters_typed_into_our_code():
    # Bug QA-02: invisible letters must be written as codes like \u200b, never typed in.
    # Typed-in invisible letters can be removed by an editor without anyone noticing.
    problems = []
    for path in CODE:
        for n, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if any(ord(c) in INVISIBLE for c in line):
                problems.append(f"{path.relative_to(ROOT)}:{n}")
    assert problems == []


def test_no_dangerous_python_calls():
    # No eval/exec, no shell commands, nothing that runs code from a file
    pattern = re.compile(r"\b(eval|exec)\(|shell=True|os\.system|subprocess|pickle\.loads?\(")
    hits = []
    for path in CODE:
        if path.suffix != ".py" or path.name == Path(__file__).name:
            continue
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if pattern.search(line) and "_model.eval()" not in line:
                hits.append(f"{path.relative_to(ROOT)}:{n}")
    assert hits == []


def test_frontend_never_holds_secret_keys():
    # The service_role key, Gemini key and Hugging Face token are backend-only
    bad = re.compile(r"SERVICE_ROLE|GEMINI_API_KEY|HF_TOKEN", re.IGNORECASE)
    hits = [str(p.relative_to(ROOT)) for p in CODE
            if "frontend" in p.parts and bad.search(p.read_text(encoding="utf-8"))]
    assert hits == []


def test_env_files_are_ignored_by_git():
    ignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    assert ".env" in ignore
    assert ".env*.local" in (ROOT / "frontend" / ".gitignore").read_text(encoding="utf-8")
