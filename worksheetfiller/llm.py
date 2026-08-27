"""Minimal OpenAI-compatible client for the local freellmapi gateway."""

from __future__ import annotations

import json
import random
import re
import time
from dataclasses import dataclass

import requests

from . import events
from .config import ApiConfig

RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}

# The gateway says this when every upstream key is rate-limited. Retrying is
# pointless — the reset is hours away, not seconds.
QUOTA_MARKERS = ("all models exhausted", "no usable key configured", "rate limits to reset")


class LLMError(Exception):
    """Raised when the gateway cannot produce a usable completion."""


class QuotaExhaustedError(LLMError):
    """Raised when the gateway has no upstream capacity left."""


def _is_quota_exhausted(status_code: int, body: str) -> bool:
    if status_code not in (402, 429):
        return False
    lowered = body.lower()
    return any(marker in lowered for marker in QUOTA_MARKERS)


# e.g. "Soonest cooldown reset ~2m." / "Soonest reset ~4h." / "reset in 45s"
_RESET_HINT = re.compile(r"reset[^0-9]{0,12}(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|hour)", re.IGNORECASE)
_UNIT_SECONDS = {"s": 1, "sec": 1, "m": 60, "min": 60, "h": 3600, "hour": 3600}


def parse_reset_seconds(body: str) -> float | None:
    """Read the gateway's own "soonest reset" hint, in seconds."""
    match = _RESET_HINT.search(body)
    if not match:
        return None
    return float(match.group(1)) * _UNIT_SECONDS[match.group(2).lower()]


def _backoff_seconds(attempt: int, reset_hint: float | None, cap: float) -> float:
    """Wait long enough to matter: the gateway's hint if it gave one, else exponential."""
    exponential = 2.0**attempt + random.uniform(0, 1)
    if reset_hint is None:
        return min(cap, exponential)
    return min(cap, max(exponential, reset_hint + 5.0))


@dataclass(frozen=True)
class Completion:
    """One assistant reply plus the metadata worth showing the operator."""

    text: str
    upstream_model: str
    provider: str
    latency_seconds: float
    attempts: int
    usage: dict


@dataclass(frozen=True)
class LLMClient:
    config: ApiConfig

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float | None = None,
        emit: events.Emit = events.null_emit,
        context: dict | None = None,
    ) -> Completion:
        """Send one chat completion and return the assistant reply."""
        base = dict(context or {})
        payload = {
            "model": self.config.model,
            "temperature": self.config.temperature if temperature is None else temperature,
            "max_tokens": self.config.max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.config.base_url}/chat/completions"

        cap = float(self.config.retry_max_sleep_seconds)
        last_error = "unknown error"

        emit(
            events.REQUEST_SENT,
            {
                **base,
                "model": self.config.model,
                "temperature": payload["temperature"],
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
                "prompt_chars": len(system_prompt) + len(user_prompt),
            },
        )

        for attempt in range(1, self.config.max_retries + 1):
            reset_hint: float | None = None
            started = time.monotonic()
            try:
                response = requests.post(
                    url, json=payload, headers=headers, timeout=self.config.timeout_seconds
                )
            except requests.RequestException as exc:
                last_error = f"request failed: {exc}"
            else:
                if response.status_code == 200:
                    content = _extract_content(response)
                    if content:
                        body = _safe_json(response.text)
                        completion = Completion(
                            text=content,
                            upstream_model=str(body.get("model", "")),
                            provider=str(body.get("provider", "")),
                            latency_seconds=round(time.monotonic() - started, 2),
                            attempts=attempt,
                            usage=body.get("usage") or {},
                        )
                        emit(
                            events.RESPONSE_RECEIVED,
                            {
                                **base,
                                "upstream_model": completion.upstream_model,
                                "provider": completion.provider,
                                "latency_seconds": completion.latency_seconds,
                                "attempts": attempt,
                                "usage": completion.usage,
                                "reply": completion.text,
                                "reply_chars": len(completion.text),
                            },
                        )
                        return completion
                    last_error = "gateway returned an empty completion"
                elif response.status_code in RETRYABLE_STATUS:
                    body = response.text
                    reset_hint = parse_reset_seconds(body)
                    fatal = _is_quota_exhausted(response.status_code, body)
                    # A cooldown longer than we are willing to sleep is not worth
                    # retrying in-process: report it so the batch can stop.
                    if fatal or (reset_hint is not None and reset_hint > cap):
                        raise QuotaExhaustedError(_quota_message(body))
                    last_error = f"HTTP {response.status_code}: {body[:200]}"
                else:
                    raise LLMError(f"HTTP {response.status_code}: {response.text[:400]}")

            if attempt < self.config.max_retries:
                sleep_seconds = _backoff_seconds(attempt, reset_hint, cap)
                emit(
                    events.REQUEST_RETRY,
                    {
                        **base,
                        "attempt": attempt,
                        "of": self.config.max_retries,
                        "error": last_error,
                        "reset_hint_seconds": reset_hint,
                        "sleeping_seconds": round(sleep_seconds, 1),
                    },
                )
                time.sleep(sleep_seconds)

        raise LLMError(f"Gave up after {self.config.max_retries} attempts. Last error: {last_error}")


def _safe_json(body: str) -> dict:
    try:
        parsed = json.loads(body)
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _quota_message(body: str) -> str:
    """Pull the gateway's own explanation out of its error envelope."""
    try:
        detail = (json.loads(body).get("error") or {}).get("message", "")
    except (ValueError, AttributeError):
        detail = ""
    return detail.strip() or body[:300].strip()


def _extract_content(response: requests.Response) -> str:
    try:
        body = response.json()
    except ValueError as exc:
        raise LLMError(f"Gateway returned non-JSON body: {exc}") from exc

    choices = body.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    return (message.get("content") or "").strip()


def parse_json_object(text: str) -> dict:
    """Pull a JSON object out of a model reply that may be fenced or padded."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip().rstrip("`").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = json.loads(_first_balanced_object(cleaned))

    if not isinstance(parsed, dict):
        raise LLMError("Model reply parsed to a non-object JSON value")
    return parsed


def _first_balanced_object(text: str) -> str:
    start = text.find("{")
    if start == -1:
        raise LLMError(f"No JSON object found in model reply: {text[:200]}")

    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]

    raise LLMError(f"Unterminated JSON object in model reply: {text[:200]}")
