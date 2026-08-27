"""Tests for gateway error classification."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from worksheetfiller.llm import (  # noqa: E402
    _backoff_seconds,
    _is_quota_exhausted,
    _quota_message,
    parse_reset_seconds,
)

EXHAUSTED_BODY = json.dumps(
    {
        "error": {
            "message": (
                "All models exhausted: 104 routes checked (103 no usable key configured, "
                "1 prompt too large for the model). Add more API keys or wait for rate "
                "limits to reset. Soonest reset ~4h."
            )
        }
    }
)


class TestQuotaDetection:
    def test_exhausted_gateway_is_recognised(self):
        assert _is_quota_exhausted(429, EXHAUSTED_BODY)

    def test_payment_required_is_recognised(self):
        assert _is_quota_exhausted(402, EXHAUSTED_BODY)

    def test_ordinary_rate_limit_stays_retryable(self):
        body = json.dumps({"error": {"message": "Too many requests, slow down."}})
        assert not _is_quota_exhausted(429, body)

    @pytest.mark.parametrize("status", [400, 500, 503])
    def test_other_statuses_are_not_quota_errors(self, status):
        assert not _is_quota_exhausted(status, EXHAUSTED_BODY)


class TestResetHint:
    @pytest.mark.parametrize(
        "body,expected",
        [
            ("Soonest cooldown reset ~2m.", 120.0),
            ("Soonest reset ~4h.", 14400.0),
            ("reset in 45s", 45.0),
            ("Soonest reset ~1.5h.", 5400.0),
        ],
    )
    def test_hint_is_parsed(self, body, expected):
        assert parse_reset_seconds(body) == expected

    def test_missing_hint_returns_none(self):
        assert parse_reset_seconds("Too many requests.") is None


class TestBackoff:
    def test_gateway_hint_is_honoured_over_exponential(self):
        assert _backoff_seconds(attempt=1, reset_hint=120.0, cap=180.0) == 125.0

    def test_hint_is_capped(self):
        assert _backoff_seconds(attempt=1, reset_hint=14400.0, cap=180.0) == 180.0

    def test_without_a_hint_it_backs_off_exponentially(self):
        first = _backoff_seconds(attempt=1, reset_hint=None, cap=180.0)
        later = _backoff_seconds(attempt=4, reset_hint=None, cap=180.0)

        assert 2.0 <= first <= 3.0
        assert later > first


class TestQuotaMessage:
    def test_gateway_explanation_is_extracted(self):
        assert _quota_message(EXHAUSTED_BODY).startswith("All models exhausted")

    def test_non_json_body_falls_back_to_raw_text(self):
        assert _quota_message("upstream is down") == "upstream is down"
