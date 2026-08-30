"""Filled-but-not-submitted worksheets, waiting for the user to review and submit.

Populated by the orchestrator when auto-submit is off (or the daily submit cap is
hit): the worksheet is already filled and uploaded to Drive, only the final SRM
submit is deferred. Stored at ~/.quill/reviews.json.
"""
import json
import os
import time
import uuid
from pathlib import Path

_PATH = Path(os.path.expanduser("~/.quill/reviews.json"))


def _load() -> list:
    try:
        d = json.loads(_PATH.read_text())
        return d if isinstance(d, list) else []
    except Exception:
        return []


def _save(items: list) -> None:
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    _PATH.write_text(json.dumps(items, indent=2))


def add(course_code: str, course_info: dict, session: int, slo: int, drive_link: str) -> None:
    items = [
        x for x in _load()
        if not (x.get("courseCode") == course_code and x.get("session") == session and x.get("slo") == slo)
    ]
    items.append({
        "id": uuid.uuid4().hex[:12],
        "courseCode": course_code,
        "courseInfo": course_info,
        "session": session,
        "slo": slo,
        "driveLink": drive_link,
        "ts": time.time(),
    })
    _save(items)


def list_public() -> list:
    """Review items without the bulky courseInfo payload."""
    return [{k: v for k, v in x.items() if k != "courseInfo"} for x in _load()]


def get(item_id: str) -> dict | None:
    for x in _load():
        if x.get("id") == item_id:
            return x
    return None


def remove(item_id: str) -> None:
    _save([x for x in _load() if x.get("id") != item_id])
