"""Tests for answer cleanup rules."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from worksheetfiller.postprocess import clean_all, clean_answer  # noqa: E402
from worksheetfiller.slots import KIND_CELL, KIND_PARA, Slot  # noqa: E402


def cell(column: str = "", label: str = "") -> Slot:
    return Slot(id="S1", kind=KIND_CELL, paragraphs=(), label=label, column=column, max_chars=220)


def paragraph() -> Slot:
    return Slot(id="S1", kind=KIND_PARA, paragraphs=())


class TestColumnConstraints:
    @pytest.mark.parametrize(
        "reply,expected",
        [
            ("Yes", "Yes"),
            ("no", "No"),
            ("Sometimes yes, sometimes no", "Yes"),
            ("No, not at the moment.", "No"),
        ],
    )
    def test_yes_no_column_is_coerced(self, reply, expected):
        slot = cell(column="Do I WANT this?  (Yes / No)")
        assert clean_answer(slot, reply, 220) == expected

    @pytest.mark.parametrize("reply,expected", [("1", "1"), ("Priority 2", "2"), ("3rd", "3")])
    def test_priority_column_keeps_only_the_digit(self, reply, expected):
        slot = cell(column="Priority (1/2/3)")
        assert clean_answer(slot, reply, 220) == expected

    @pytest.mark.parametrize(
        "reply,expected",
        [("Increasing", "Increasing"), ("It is clearly decreasing", "Decreasing")],
    )
    def test_trend_column_is_coerced(self, reply, expected):
        slot = cell(column="Increasing or decreasing?")
        assert clean_answer(slot, reply, 220) == expected

    def test_unconstrained_column_is_left_alone(self):
        slot = cell(column="Why?")
        text = "Because right understanding guides everything else."
        assert clean_answer(slot, text, 220) == text


class TestTidying:
    def test_markdown_bullets_are_stripped(self):
        assert clean_answer(paragraph(), "- Values matter.", 220) == "Values matter."

    def test_list_numbering_is_stripped(self):
        assert clean_answer(paragraph(), "1. Values matter.", 220) == "Values matter."

    def test_wrapping_quotes_are_stripped(self):
        assert clean_answer(paragraph(), '"Values matter."', 220) == "Values matter."

    def test_flattened_numbered_list_is_split_onto_lines(self):
        text = "Playing football. 2. Calling my sister. 3. Finishing a side project."

        assert clean_answer(paragraph(), text, 220).split("\n") == [
            "Playing football.",
            "Calling my sister.",
            "Finishing a side project.",
        ]

    def test_prose_with_a_stray_number_is_left_alone(self):
        text = "I scored 2. That was in my first semester and it worried me."

        assert "\n" not in clean_answer(paragraph(), text, 220)

    def test_long_prose_answers_keep_their_shape(self):
        text = "Animals live for the body. Humans need right understanding as well."

        assert clean_answer(paragraph(), text, 220) == text

    def test_paragraph_answers_are_never_truncated(self):
        long_text = "word " * 200
        assert len(clean_answer(paragraph(), long_text, 50)) > 50


class TestTruncation:
    def test_long_cell_answer_is_cut_at_a_sentence_boundary(self):
        slot = cell(column="Root cause (your view)")
        text = "First reason is clear. Second reason runs on and on and on and on and on."

        result = clean_answer(slot, text, 40)
        assert result == "First reason is clear."

    def test_cut_falls_back_to_a_word_boundary(self):
        slot = cell(column="Root cause (your view)")
        result = clean_answer(slot, "alpha beta gamma delta epsilon", 14)

        assert result == "alpha beta"

    def test_short_cell_answer_is_untouched(self):
        slot = cell(column="Problem")
        assert clean_answer(slot, "Exam stress.", 220) == "Exam stress."


class TestCleanAll:
    def test_unknown_ids_are_dropped(self):
        slots = (cell(column="Problem"),)
        assert clean_all(slots, {"S1": "Stress.", "S99": "ghost"}, 220) == {"S1": "Stress."}
