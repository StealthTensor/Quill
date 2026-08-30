"""Daily worksheet quota — hard cap so a user can't fire an entire semester of
submissions in one click. One unit = 9 sessions x 2 SLOs = 18 worksheets/day.

Enforced server-side in the orchestrator; no UI slider can exceed it.
"""
import json
import os
from datetime import date
from pathlib import Path

DAILY_LIMIT = 18  # worksheets processed per calendar day (~one unit)

_PATH = Path(os.path.expanduser("~/.quill/quota.json"))


def _today() -> str:
    return date.today().isoformat()


def _load() -> dict:
    try:
        d = json.loads(_PATH.read_text())
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def done_today() -> int:
    return int(_load().get(_today(), 0))


def remaining_today() -> int:
    return max(0, DAILY_LIMIT - done_today())


def record(n: int = 1) -> None:
    """Add n to today's count (and drop stale days)."""
    today = _today()
    data = {today: int(_load().get(today, 0)) + n}
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    _PATH.write_text(json.dumps(data))
