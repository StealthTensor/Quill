#!/usr/bin/env python3
"""CLI for the worksheet filler.

    python fill.py                      fill every worksheet for every student
    python fill.py --dry-run            list the blanks found, no API calls
    python fill.py --docs 1011          only these worksheets (match on filename)
    python fill.py --students ravi      only these students (match on name or slug)
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import replace
from pathlib import Path

from docx import Document

from worksheetfiller import identity, runner
from worksheetfiller.config import AppConfig, ConfigError, Student, load_config
from worksheetfiller.slots import extract, strip_trailing_slots


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="fill.py",
        description="Fill .docx worksheets with AI-generated answers, one copy per student.",
    )
    parser.add_argument("--config", default="config.yaml", help="path to config.yaml")
    parser.add_argument("--docs", default="", help="comma-separated filename fragments to include")
    parser.add_argument("--students", default="", help="comma-separated student names or slugs")
    parser.add_argument("--limit", type=int, default=0, help="process at most N worksheets")
    parser.add_argument(
        "--offset", type=int, default=0, help="skip the first N worksheets (use with --limit)"
    )
    parser.add_argument("--workers", type=int, default=0, help="override worker count")
    parser.add_argument("--no-cache", action="store_true", help="ignore cached answers")
    parser.add_argument(
        "--dry-run", action="store_true", help="report the blanks found without calling the API"
    )
    parser.add_argument(
        "--show-text", action="store_true", help="with --dry-run, print the marked-up worksheet text"
    )
    return parser.parse_args(argv)


def _filter_documents(documents: tuple[Path, ...], patterns: str) -> tuple[Path, ...]:
    wanted = [item.strip().lower() for item in patterns.split(",") if item.strip()]
    if not wanted:
        return documents
    return tuple(doc for doc in documents if any(item in doc.name.lower() for item in wanted))


def _filter_students(students: tuple[Student, ...], patterns: str) -> tuple[Student, ...]:
    wanted = [item.strip().lower() for item in patterns.split(",") if item.strip()]
    if not wanted:
        return students
    return tuple(
        student
        for student in students
        if any(item in student.name.lower() or item in student.slug for item in wanted)
    )


def _dry_run(documents: tuple[Path, ...], config: AppConfig, show_text: bool) -> int:
    student = config.students[0]
    for path in documents:
        document = Document(str(path))
        extraction = extract(document, max_cell_chars=config.answers.max_cell_chars)
        slots = strip_trailing_slots(extraction)
        known, pending = identity.resolve(slots, student, config.run.date_text)

        print(f"\n{path.name}: {len(slots)} blanks "
              f"({len(known)} filled from config, {len(pending)} need the model)")
        for slot in pending:
            print(f"  {slot.id:>5}  {slot.hint()}")
        if show_text:
            print("\n--- marked-up text ---")
            print(extraction.text)
    print(f"\nDry run only. {len(documents)} worksheet(s) inspected, no API calls made.")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        config = load_config(Path(args.config))
    except ConfigError as exc:
        print(f"Config error: {exc}", file=sys.stderr)
        return 2

    if args.workers > 0:
        config = replace(config, run=replace(config.run, workers=args.workers))

    try:
        documents = runner.discover_documents(config.run.input_dir)
    except FileNotFoundError as exc:
        print(f"{exc}", file=sys.stderr)
        return 2

    documents = _filter_documents(documents, args.docs)
    if args.offset > 0:
        documents = documents[args.offset :]
    if args.limit > 0:
        documents = documents[: args.limit]
    students = _filter_students(config.students, args.students)

    if not documents:
        print(f"No .docx worksheets matched in {config.run.input_dir}", file=sys.stderr)
        return 1
    if not students:
        print("No students matched the --students filter", file=sys.stderr)
        return 1

    if args.dry_run:
        return _dry_run(documents, config, args.show_text)

    jobs = runner.build_jobs(documents, students)
    print(
        f"{len(documents)} worksheet(s) x {len(students)} student(s) = {len(jobs)} file(s) "
        f"| model={config.api.model} workers={config.run.workers}"
    )

    done = 0

    def report(result: runner.JobResult) -> None:
        nonlocal done
        done += 1
        prefix = f"[{done}/{len(jobs)}]"
        if result.status == "failed":
            print(f"{prefix} FAILED  {result.job.describe()} :: {result.error}", file=sys.stderr)
            return
        if result.status == "skipped":
            print(f"{prefix} skipped {result.job.describe()} :: {result.error}", file=sys.stderr)
            return
        tag = "cached" if result.status == "cached" else "filled"
        print(
            f"{prefix} {tag:>6}  {result.job.describe()} "
            f"({result.slots_written}/{result.slots_total} blanks) -> {result.output_path}"
        )

    results = runner.run_jobs(jobs, config, use_cache=not args.no_cache, on_result=report)

    failures = [result for result in results if result.status == "failed"]
    skipped = [result for result in results if result.status == "skipped"]
    succeeded = len(results) - len(failures) - len(skipped)

    print(f"\nDone. {succeeded} succeeded, {len(failures)} failed, {len(skipped)} skipped.")
    if skipped:
        print(
            "The gateway ran out of upstream capacity, so the rest were not attempted.\n"
            "Add more keys to freellmapi or wait for the reset, then re-run: finished\n"
            "worksheets are cached and will not be regenerated."
        )
    elif failures:
        print("Re-run to retry only the failures (successful answers are cached).")
    return 1 if failures or skipped else 0


if __name__ == "__main__":
    raise SystemExit(main())
