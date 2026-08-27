"""Fill name / registration / branch / date cells from config instead of the model.

These fields are facts, not answers. Resolving them locally keeps them exact and
removes them from the prompt so the model never invents a registration number.
"""

from __future__ import annotations

import re

from .config import Student
from .slots import KIND_CELL, Slot

_FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("name", "student name", "name of student", "student"),
    "reg_no": (
        "reg no",
        "regd no",
        "reg number",
        "registration no",
        "registration number",
        "roll no",
        "roll number",
        "enrollment no",
        "enrolment no",
        "univ roll no",
        "hall ticket no",
    ),
    "branch": (
        "branch",
        "branch sec",
        "branch section",
        "branch and section",
        "department",
        "dept",
        "course",
    ),
    "section": ("section", "sec", "class", "class section"),
    "date": ("date", "date of session", "submission date"),
}


def normalise(label: str) -> str:
    """Lowercase a cell label and drop punctuation so aliases match reliably."""
    cleaned = re.sub(r"[^a-z0-9]+", " ", label.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def field_for_label(label: str) -> str | None:
    """Return the identity field a cell label refers to, or None."""
    key = normalise(label)
    if not key:
        return None
    for field, aliases in _FIELD_ALIASES.items():
        if key in aliases:
            return field
    return None


def value_for_field(field: str, student: Student, date_text: str) -> str:
    if field == "name":
        return student.name
    if field == "reg_no":
        return student.reg_no
    if field == "branch":
        return student.branch_section
    if field == "section":
        return student.section
    if field == "date":
        return date_text
    return ""


def resolve(
    slots: tuple[Slot, ...], student: Student, date_text: str
) -> tuple[dict[str, str], tuple[Slot, ...]]:
    """Split slots into locally-answered identity fields and the rest.

    Returns (answers, remaining_slots).
    """
    answers: dict[str, str] = {}
    remaining: list[Slot] = []

    for slot in slots:
        field = field_for_label(slot.label) if slot.kind == KIND_CELL else None
        if field is None:
            remaining.append(slot)
            continue
        value = value_for_field(field, student, date_text)
        if not value:
            remaining.append(slot)
            continue
        answers[slot.id] = value

    return answers, tuple(remaining)
