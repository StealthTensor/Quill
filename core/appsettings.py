"""Single-user app settings, stored at ~/.quill/settings.json.

Only the knobs a real (single) user actually sets: their writing persona and
whether Quill auto-submits to SRM or stops after filling for review.
"""
import json
import os
from pathlib import Path

_PATH = Path(os.path.expanduser("~/.quill/settings.json"))

DEFAULTS = {
    "persona": "",
    "autoSubmit": False,  # safe default: fill + upload, let the user review before submitting
}


def load() -> dict:
    data = dict(DEFAULTS)
    try:
        stored = json.loads(_PATH.read_text())
        if isinstance(stored, dict):
            data.update({k: stored[k] for k in DEFAULTS if k in stored})
    except Exception:
        pass
    return data


def save(patch: dict) -> dict:
    data = load()
    for k in DEFAULTS:
        if k in patch:
            data[k] = patch[k]
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    _PATH.write_text(json.dumps(data, indent=2))
    return data
