"""Tests for job planning and request chunking."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from worksheetfiller.config import Student  # noqa: E402
from worksheetfiller.runner import build_jobs, chunk_slots, discover_documents  # noqa: E402
from worksheetfiller.slots import KIND_CELL, Slot  # noqa: E402


def slots(count: int) -> tuple[Slot, ...]:
    return tuple(Slot(id=f"S{i}", kind=KIND_CELL, paragraphs=()) for i in range(1, count + 1))


class TestChunking:
    def test_small_worksheets_stay_in_one_request(self):
        assert chunk_slots(slots(5), 20) == (slots(5),)

    def test_large_worksheets_are_split(self):
        groups = chunk_slots(slots(55), 20)

        assert [len(group) for group in groups] == [20, 20, 15]

    def test_order_is_preserved_across_groups(self):
        flattened = [slot.id for group in chunk_slots(slots(55), 20) for slot in group]

        assert flattened == [slot.id for slot in slots(55)]

    def test_no_slots_means_no_requests(self):
        assert chunk_slots((), 20) == ()

    @pytest.mark.parametrize("size", [0, -1])
    def test_non_positive_size_disables_chunking(self, size):
        assert chunk_slots(slots(55), size) == (slots(55),)


class TestJobPlanning:
    def test_every_student_gets_every_worksheet(self):
        documents = (Path("1011.docx"), Path("1012.docx"))
        students = (
            Student(name="Asha", reg_no="1", branch="CSE", section="A", persona=""),
            Student(name="Bala", reg_no="2", branch="CSE", section="A", persona=""),
        )

        jobs = build_jobs(documents, students)

        assert len(jobs) == 4
        assert {job.document for job in jobs} == set(documents)
        assert {job.student for job in jobs} == set(students)


class TestDiscovery:
    def test_word_lock_files_are_ignored(self, tmp_path):
        (tmp_path / "1011.docx").write_bytes(b"x")
        (tmp_path / "~$1011.docx").write_bytes(b"x")
        (tmp_path / "notes.txt").write_text("x")

        assert discover_documents(tmp_path) == (tmp_path / "1011.docx",)

    def test_missing_directory_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            discover_documents(tmp_path / "nope")
