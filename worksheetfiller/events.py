"""A tiny event bus so callers can watch the pipeline from the inside.

The CLI ignores these; the web UI streams them to the browser so every prompt,
raw reply, retry and cache hit is visible while a batch runs.
"""

from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Iterator

# Lifecycle
JOB_START = "job.start"
JOB_DONE = "job.done"
JOB_FAILED = "job.failed"
JOB_SKIPPED = "job.skipped"

# Document analysis
SLOTS_DETECTED = "slots.detected"
IDENTITY_RESOLVED = "identity.resolved"

# Model traffic
CHUNK_START = "chunk.start"
CHUNK_CACHED = "chunk.cached"
CHUNK_DONE = "chunk.done"
REQUEST_SENT = "request.sent"
RESPONSE_RECEIVED = "response.received"
REQUEST_RETRY = "request.retry"
PARSE_FAILED = "parse.failed"
REPAIR_ROUND = "repair.round"

# Write-back
ANSWER_CLEANED = "answer.cleaned"
DOCUMENT_WRITTEN = "document.written"

# Batch level
BATCH_START = "batch.start"
BATCH_DONE = "batch.done"

Emit = Callable[[str, dict[str, Any]], None]


def null_emit(kind: str, payload: dict[str, Any]) -> None:
    """Default emitter: discard everything."""


@dataclass(frozen=True)
class Event:
    kind: str
    payload: dict[str, Any]
    at: float = field(default_factory=time.time)

    def as_dict(self) -> dict[str, Any]:
        return {"kind": self.kind, "at": self.at, **self.payload}


class EventQueue:
    """Thread-safe collector that a streaming response can drain.

    Worker threads call `emit`; the request thread iterates `drain` until
    `close` is called and the backlog is empty.
    """

    def __init__(self) -> None:
        self._queue: queue.Queue[Event | None] = queue.Queue()
        self._closed = threading.Event()

    def emit(self, kind: str, payload: dict[str, Any]) -> None:
        if self._closed.is_set():
            return
        self._queue.put(Event(kind=kind, payload=payload))

    def close(self) -> None:
        if self._closed.is_set():
            return
        self._closed.set()
        self._queue.put(None)

    def drain(self, poll_seconds: float = 0.5) -> Iterator[Event]:
        """Yield events until the queue is closed and drained."""
        while True:
            try:
                event = self._queue.get(timeout=poll_seconds)
            except queue.Empty:
                if self._closed.is_set():
                    return
                continue
            if event is None:
                return
            yield event
