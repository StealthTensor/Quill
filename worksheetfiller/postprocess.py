"""Clean up model answers before they are written into the document.

The prompt already asks for constrained answers, but models drift. These rules
enforce the constraints the worksheet itself implies, so a Yes/No column always
gets Yes or No and no table cell overflows its box.
"""

from __future__ import annotations

import re

from .slots import KIND_CELL, Slot

_BULLET_PREFIX = re.compile(r"^\s*(?:[-*•●]|\d+\s*[.)])\s+")

# "one thing. 2. another thing. 3. a third" — a list the model flattened into
# one line. Splitting it back out lets each item land on its own worksheet line.
_INLINE_ITEM = re.compile(r"(?<=[.!?])\s+(?=\d{1,2}[.)]\s+\S)")
MIN_INLINE_ITEMS = 2
_YES_NO = re.compile(r"\b(yes|no)\b", re.IGNORECASE)
_TREND = re.compile(r"\b(increasing|decreasing)\b", re.IGNORECASE)
_DIGIT = re.compile(r"\d+")


def _tidy(text: str) -> str:
    cleaned = text.strip().strip("`")
    cleaned = _BULLET_PREFIX.sub("", cleaned)
    if len(cleaned) > 1 and cleaned[0] == cleaned[-1] and cleaned[0] in "\"'":
        cleaned = cleaned[1:-1].strip()
    return re.sub(r"[ \t]+", " ", cleaned)


def _unflatten_list(text: str) -> str:
    """Put a run-on numbered list back onto separate lines."""
    parts = _INLINE_ITEM.split(text)
    if len(parts) < MIN_INLINE_ITEMS + 1:
        return text
    return "\n".join(_BULLET_PREFIX.sub("", part).strip() for part in parts)


def _column_key(slot: Slot) -> str:
    return re.sub(r"[^a-z0-9]+", " ", slot.column.lower()).strip()


def _wants_yes_no(column: str) -> bool:
    return "yes" in column.split() and "no" in column.split()


def _wants_rank(column: str) -> bool:
    return "priority" in column or "rank" in column or "1 2 3" in column


def _wants_trend(column: str) -> bool:
    return "increasing" in column and "decreasing" in column


def _truncate(text: str, limit: int) -> str:
    """Shorten to `limit` chars, preferring a sentence break then a word break."""
    if len(text) <= limit:
        return text

    window = text[:limit]
    sentence_end = max(window.rfind(". "), window.rfind("! "), window.rfind("? "))
    if sentence_end >= limit // 2:
        return window[: sentence_end + 1].strip()

    word_end = window.rfind(" ")
    return (window[:word_end] if word_end > 0 else window).strip()


def clean_answer(slot: Slot, text: str, max_cell_chars: int) -> str:
    """Apply the constraints implied by this slot's column header."""
    cleaned = _tidy(text)
    if not cleaned:
        return cleaned
    if slot.kind != KIND_CELL:
        return _unflatten_list(cleaned)

    column = _column_key(slot)

    if _wants_yes_no(column):
        match = _YES_NO.search(cleaned)
        return match.group(1).capitalize() if match else cleaned

    if _wants_trend(column):
        match = _TREND.search(cleaned)
        return match.group(1).capitalize() if match else cleaned

    if _wants_rank(column):
        match = _DIGIT.search(cleaned)
        return match.group(0) if match else cleaned

    return _truncate(cleaned, max_cell_chars)


def clean_all(
    slots: tuple[Slot, ...], answers: dict[str, str], max_cell_chars: int
) -> dict[str, str]:
    """Return a new answer map with every answer cleaned for its slot."""
    by_id = {slot.id: slot for slot in slots}
    return {
        key: clean_answer(by_id[key], value, max_cell_chars)
        for key, value in answers.items()
        if key in by_id
    }
