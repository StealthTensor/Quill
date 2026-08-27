"""Orchestration: discover worksheets, answer them per student, save the results."""

from __future__ import annotations

import hashlib
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from docx import Document

from . import events, identity, postprocess, prompts, writer
from .config import AppConfig, Student
from .llm import LLMClient, LLMError, QuotaExhaustedError, parse_json_object
from .slots import Extraction, Slot, extract, strip_trailing_slots

MAX_REPAIR_ROUNDS = 2
MAX_JSON_ATTEMPTS = 3


@dataclass(frozen=True)
class Job:
    document: Path
    student: Student

    def describe(self) -> str:
        return f"{self.document.name} -> {self.student.name}"


@dataclass(frozen=True)
class JobResult:
    job: Job
    status: str  # "ok" | "cached" | "failed" | "skipped"
    output_path: Path | None = None
    slots_total: int = 0
    slots_written: int = 0
    error: str = ""


def discover_documents(input_dir: Path) -> tuple[Path, ...]:
    """All .docx worksheets in `input_dir`, ignoring Word lock files."""
    if not input_dir.is_dir():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")
    found = sorted(
        path
        for path in input_dir.glob("*.docx")
        if not path.name.startswith(("~$", "."))
    )
    return tuple(found)


def _fingerprint(document: Path, student: Student, config: AppConfig) -> str:
    hasher = hashlib.sha1()
    hasher.update(document.read_bytes())
    hasher.update(student.profile_text().encode("utf-8"))
    hasher.update(config.api.model.encode("utf-8"))
    hasher.update(prompts.PROMPT_VERSION.encode("utf-8"))
    hasher.update(repr(config.answers).encode("utf-8"))
    return hasher.hexdigest()[:12]


def _cache_path(job: Job, config: AppConfig, chunk_index: int) -> Path:
    digest = _fingerprint(job.document, job.student, config)
    name = f"{job.document.stem}__{job.student.slug}__{digest}__c{chunk_index}.json"
    return config.run.cache_dir / name


def chunk_slots(slots: tuple[Slot, ...], size: int) -> tuple[tuple[Slot, ...], ...]:
    """Split slots into request-sized groups, preserving document order.

    Smaller requests finish well inside the gateway's upstream timeout, and a
    failure only costs one group instead of the whole worksheet.
    """
    if size <= 0 or len(slots) <= size:
        return (slots,) if slots else ()
    return tuple(tuple(slots[start : start + size]) for start in range(0, len(slots), size))


def _read_cache(path: Path) -> dict[str, str] | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _write_cache(path: Path, answers: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(answers, indent=2, ensure_ascii=False), encoding="utf-8")


def _missing_ids(slots: tuple[Slot, ...], answers: dict[str, str]) -> tuple[str, ...]:
    return tuple(slot.id for slot in slots if slot.id not in answers)


def request_json(
    client: LLMClient,
    prompt: str,
    temperature: float,
    emit: events.Emit = events.null_emit,
    context: dict | None = None,
) -> dict[str, str]:
    """Ask for a JSON object, re-asking with a stricter reminder if prose comes back.

    Reasoning models sometimes narrate instead of answering. Lowering the
    temperature on each retry pushes them toward the requested format.
    """
    last_error: LLMError | None = None

    for attempt in range(MAX_JSON_ATTEMPTS):
        text = prompt if attempt == 0 else prompt + prompts.STRICT_JSON_SUFFIX
        completion = client.complete(
            prompts.SYSTEM_PROMPT,
            text,
            temperature=max(0.1, temperature - 0.3 * attempt),
            emit=emit,
            context=context,
        )
        try:
            parsed = parse_json_object(completion.text)
        except LLMError as exc:
            last_error = exc
            emit(
                events.PARSE_FAILED,
                {
                    **(context or {}),
                    "attempt": attempt + 1,
                    "of": MAX_JSON_ATTEMPTS,
                    "error": str(exc),
                    "reply": completion.text,
                },
            )
            continue
        return {key: str(value) for key, value in parsed.items() if isinstance(key, str)}

    raise LLMError(f"No JSON after {MAX_JSON_ATTEMPTS} attempts. Last error: {last_error}")


def generate_chunk(
    extraction: Extraction,
    slots: tuple[Slot, ...],
    job: Job,
    config: AppConfig,
    client: LLMClient,
    emit: events.Emit = events.null_emit,
    context: dict | None = None,
) -> dict[str, str]:
    """Ask the model for one group of slots, re-asking for any it skips."""
    base_prompt = prompts.build_user_prompt(
        document_text=extraction.text,
        slots=slots,
        student=job.student,
        answers_config=config.answers,
        filename=job.document.name,
    )

    answers = request_json(client, base_prompt, config.api.temperature, emit, context)

    for round_number in range(1, MAX_REPAIR_ROUNDS + 1):
        missing = _missing_ids(slots, answers)
        if not missing:
            break
        emit(
            events.REPAIR_ROUND,
            {**(context or {}), "round": round_number, "missing": list(missing)},
        )
        repair_prompt = prompts.build_repair_prompt(base_prompt, missing, slots)
        repaired = request_json(client, repair_prompt, config.api.temperature, emit, context)
        for key, value in repaired.items():
            if key not in answers:
                answers[key] = value

    return answers


def generate_answers(
    extraction: Extraction,
    pending: tuple[Slot, ...],
    job: Job,
    config: AppConfig,
    client: LLMClient,
    use_cache: bool,
    emit: events.Emit = events.null_emit,
) -> tuple[dict[str, str], bool]:
    """Answer every pending slot, one cached request group at a time.

    Returns (answers, everything_came_from_cache). Groups that succeed are
    cached immediately, so a later failure never discards finished work.
    """
    answers: dict[str, str] = {}
    all_cached = True
    groups = chunk_slots(pending, config.answers.max_slots_per_request)

    for index, group in enumerate(groups):
        cache_file = _cache_path(job, config, index)
        cached = _read_cache(cache_file) if use_cache else None
        context = {
            "job": job.describe(),
            "chunk": index + 1,
            "chunks": len(groups),
            "slot_ids": [slot.id for slot in group],
        }

        if cached is not None:
            answers.update(cached)
            emit(events.CHUNK_CACHED, {**context, "cache_file": cache_file.name, "answers": cached})
            continue

        all_cached = False
        emit(events.CHUNK_START, context)
        generated = generate_chunk(extraction, group, job, config, client, emit, context)
        _write_cache(cache_file, generated)
        answers.update(generated)
        emit(
            events.CHUNK_DONE,
            {**context, "cache_file": cache_file.name, "answers": generated},
        )

    return answers, all_cached


def process_job(
    job: Job,
    config: AppConfig,
    client: LLMClient,
    use_cache: bool = True,
    quota_dead: threading.Event | None = None,
    emit: events.Emit = events.null_emit,
) -> JobResult:
    """Fill one worksheet for one student and write the output .docx.

    `quota_dead` is a shared circuit breaker: once the gateway reports that it
    has no capacity left, remaining jobs are skipped instead of each burning
    their own round of retries.
    """
    label = job.describe()
    if quota_dead is not None and quota_dead.is_set():
        emit(events.JOB_SKIPPED, {"job": label, "reason": "gateway quota exhausted"})
        return JobResult(job=job, status="skipped", error="gateway quota exhausted")

    emit(
        events.JOB_START,
        {"job": label, "document": job.document.name, "student": job.student.name},
    )
    try:
        document = Document(str(job.document))
        extraction = extract(document, max_cell_chars=config.answers.max_cell_chars)
        slots = strip_trailing_slots(extraction)

        known, pending = identity.resolve(slots, job.student, config.run.date_text)
        emit(
            events.SLOTS_DETECTED,
            {
                "job": label,
                "total": len(slots),
                "marked_text": extraction.text,
                "slots": [
                    {"id": slot.id, "kind": slot.kind, "hint": slot.hint()} for slot in slots
                ],
            },
        )
        emit(events.IDENTITY_RESOLVED, {"job": label, "answers": known, "pending": len(pending)})

        generated, all_cached = generate_answers(
            extraction, pending, job, config, client, use_cache, emit
        )
        status = "cached" if all_cached and pending else "ok"

        cleaned = postprocess.clean_all(slots, generated, config.answers.max_cell_chars)
        changes = {
            key: {"before": generated[key], "after": cleaned[key]}
            for key in cleaned
            if cleaned[key] != generated.get(key)
        }
        if changes:
            emit(events.ANSWER_CLEANED, {"job": label, "changes": changes})

        answers = {**cleaned, **known}
        written = writer.apply_answers(slots, answers)

        output_path = config.run.output_dir / job.student.slug / job.document.name
        output_path.parent.mkdir(parents=True, exist_ok=True)
        document.save(str(output_path))
        emit(
            events.DOCUMENT_WRITTEN,
            {
                "job": label,
                "path": str(output_path),
                "student_slug": job.student.slug,
                "filename": job.document.name,
                "written": written,
                "total": len(slots),
                "answers": answers,
            },
        )

        result = JobResult(
            job=job,
            status=status,
            output_path=output_path,
            slots_total=len(slots),
            slots_written=written,
        )
        emit(
            events.JOB_DONE,
            {
                "job": label,
                "status": status,
                "written": written,
                "total": len(slots),
                "path": str(output_path),
            },
        )
        return result
    except QuotaExhaustedError as exc:
        if quota_dead is not None:
            quota_dead.set()
        message = f"gateway out of capacity: {exc}"
        emit(events.JOB_FAILED, {"job": label, "error": message, "fatal": True})
        return JobResult(job=job, status="failed", error=message)
    except (LLMError, OSError, ValueError, KeyError) as exc:
        message = f"{type(exc).__name__}: {exc}"
        emit(events.JOB_FAILED, {"job": label, "error": message, "fatal": False})
        return JobResult(job=job, status="failed", error=message)


def build_jobs(documents: Iterable[Path], students: Iterable[Student]) -> tuple[Job, ...]:
    return tuple(Job(document=doc, student=student) for doc in documents for student in students)


def run_jobs(
    jobs: tuple[Job, ...],
    config: AppConfig,
    use_cache: bool = True,
    on_result: Callable[[JobResult], None] | None = None,
    emit: events.Emit = events.null_emit,
) -> tuple[JobResult, ...]:
    """Run every job across a thread pool, reporting each result as it lands."""
    client = LLMClient(config=config.api)
    quota_dead = threading.Event()
    results: list[JobResult] = []

    emit(
        events.BATCH_START,
        {
            "jobs": len(jobs),
            "model": config.api.model,
            "workers": config.run.workers,
            "use_cache": use_cache,
            "slots_per_request": config.answers.max_slots_per_request,
        },
    )

    with ThreadPoolExecutor(max_workers=config.run.workers) as pool:
        futures = {
            pool.submit(process_job, job, config, client, use_cache, quota_dead, emit): job
            for job in jobs
        }
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if on_result is not None:
                on_result(result)

    order = {job: index for index, job in enumerate(jobs)}
    ordered = tuple(sorted(results, key=lambda item: order[item.job]))
    emit(
        events.BATCH_DONE,
        {
            "succeeded": sum(1 for item in ordered if item.status in ("ok", "cached")),
            "failed": sum(1 for item in ordered if item.status == "failed"),
            "skipped": sum(1 for item in ordered if item.status == "skipped"),
        },
    )
    return ordered
