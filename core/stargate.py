"""
Star-gate: checks if user has starred the GitHub repo.
2-day grace period from first launch before enforcement.
"""
import json
import os
import time
from pathlib import Path

REPO = "StealthTensor/Quill"
STATE_FILE = Path(os.path.expanduser("~/.quill_state.json"))
GRACE_PERIOD_SECS = 48 * 60 * 60  # 48 hours


def _load() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {}


def _save(data: dict):
    STATE_FILE.write_text(json.dumps(data, indent=2))


def record_first_launch():
    """Call once on app start to record first-launch timestamp."""
    data = _load()
    if "first_launch" not in data:
        data["first_launch"] = time.time()
        _save(data)


def grace_period_expired() -> bool:
    data = _load()
    first = data.get("first_launch", time.time())
    return (time.time() - first) >= GRACE_PERIOD_SECS


def check_starred(github_username: str) -> bool:
    """Check if github_username has starred the repo via public API (no auth needed)."""
    import requests
    try:
        # GitHub API: check if user starred a repo
        url = f"https://api.github.com/repos/{REPO}/stargazers"
        # Paginate up to 5 pages (500 stars per check — good enough for now)
        for page in range(1, 6):
            r = requests.get(
                url,
                params={"per_page": 100, "page": page},
                headers={"Accept": "application/vnd.github.v3+json"},
                timeout=8,
            )
            if r.status_code != 200:
                return True  # Don't block on API failure
            stargazers = r.json()
            if not stargazers:
                break
            logins = {u["login"].lower() for u in stargazers}
            if github_username.lower() in logins:
                return True
        return False
    except Exception:
        return True  # Don't block on network failure


def save_github_username(username: str):
    data = _load()
    data["github_username"] = username
    _save(data)


def get_github_username() -> str | None:
    return _load().get("github_username")


def mark_starred():
    """Cache that this user has already been verified as a stargazer."""
    data = _load()
    data["starred_verified"] = True
    data["starred_at"] = time.time()
    _save(data)


def is_verified_stargazer() -> bool:
    """Returns True if we've already confirmed this user starred (cached)."""
    return _load().get("starred_verified", False)


def gate_check(github_username: str | None) -> dict:
    """
    Full gate check. Returns:
      {"allowed": True}  — proceed
      {"allowed": False, "reason": "grace" | "star_needed", "hours_left": N}
    """
    # Already verified once — always allow
    if is_verified_stargazer():
        return {"allowed": True}

    # Within grace period — allow
    if not grace_period_expired():
        data = _load()
        first = data.get("first_launch", time.time())
        hours_left = max(0, round((GRACE_PERIOD_SECS - (time.time() - first)) / 3600, 1))
        return {"allowed": True, "grace": True, "hours_left": hours_left}

    # Grace expired — need to check star
    if not github_username:
        return {"allowed": False, "reason": "star_needed", "hours_left": 0}

    if check_starred(github_username):
        mark_starred()
        return {"allowed": True}

    return {"allowed": False, "reason": "star_needed", "hours_left": 0}
