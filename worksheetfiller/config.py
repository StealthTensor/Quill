"""Configuration loading for the worksheet filler.

Secrets come from the environment (.env); everything else from config.yaml.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

DEFAULT_BASE_URL = "http://localhost:3001/v1"
API_KEY_ENV = "FREELLMAPI_API_KEY"
BASE_URL_ENV = "FREELLMAPI_BASE_URL"


class ConfigError(Exception):
    """Raised when the configuration is missing or invalid."""


@dataclass(frozen=True)
class ApiConfig:
    base_url: str
    api_key: str
    model: str
    temperature: float
    max_tokens: int
    timeout_seconds: int
    max_retries: int
    retry_max_sleep_seconds: int


@dataclass(frozen=True)
class RunConfig:
    input_dir: Path
    output_dir: Path
    cache_dir: Path
    workers: int
    date_text: str


@dataclass(frozen=True)
class AnswerConfig:
    language: str
    tone: str
    long_answer_min_words: int
    long_answer_max_words: int
    max_cell_chars: int
    max_slots_per_request: int


@dataclass(frozen=True)
class Student:
    name: str
    reg_no: str
    branch: str
    section: str
    persona: str

    @property
    def slug(self) -> str:
        cleaned = re.sub(r"[^a-z0-9]+", "_", self.name.lower()).strip("_")
        return cleaned or "student"

    @property
    def branch_section(self) -> str:
        if self.section and self.section not in self.branch:
            return f"{self.branch} / {self.section}"
        return self.branch

    def profile_text(self) -> str:
        lines = [
            f"Name: {self.name}",
            f"Registration number: {self.reg_no}",
            f"Branch / Section: {self.branch_section}",
        ]
        if self.persona:
            lines.append(f"Background and personality: {self.persona}")
        return "\n".join(lines)


@dataclass(frozen=True)
class AppConfig:
    api: ApiConfig
    run: RunConfig
    answers: AnswerConfig
    students: tuple[Student, ...]


def _require(mapping: dict[str, Any], key: str, where: str) -> Any:
    if key not in mapping or mapping[key] in (None, ""):
        raise ConfigError(f"Missing required field '{key}' in {where}")
    return mapping[key]


def _section(raw: dict[str, Any], name: str) -> dict[str, Any]:
    value = raw.get(name) or {}
    if not isinstance(value, dict):
        raise ConfigError(f"Section '{name}' must be a mapping in config.yaml")
    return value


def _load_students(raw: Any) -> tuple[Student, ...]:
    if not isinstance(raw, list) or not raw:
        raise ConfigError("config.yaml needs a non-empty 'students' list")

    students: list[Student] = []
    for index, entry in enumerate(raw, start=1):
        if not isinstance(entry, dict):
            raise ConfigError(f"students[{index}] must be a mapping")
        where = f"students[{index}]"
        students.append(
            Student(
                name=str(_require(entry, "name", where)).strip(),
                reg_no=str(entry.get("reg_no", "") or "").strip(),
                branch=str(entry.get("branch", "") or "").strip(),
                section=str(entry.get("section", "") or "").strip(),
                persona=str(entry.get("persona", "") or "").strip(),
            )
        )

    slugs = [student.slug for student in students]
    duplicates = {slug for slug in slugs if slugs.count(slug) > 1}
    if duplicates:
        raise ConfigError(f"Student names collide after slugging: {sorted(duplicates)}")
    return tuple(students)


def _resolve_dir(root: Path, value: str) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else (root / path)


def load_config(config_path: Path) -> AppConfig:
    """Read config.yaml plus .env and return a validated AppConfig."""
    config_path = config_path.expanduser().resolve()
    if not config_path.is_file():
        raise ConfigError(f"Config file not found: {config_path}")

    root = config_path.parent
    load_dotenv(root / ".env")

    raw = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ConfigError("config.yaml must contain a top-level mapping")

    api_raw = _section(raw, "api")
    run_raw = _section(raw, "run")
    answers_raw = _section(raw, "answers")

    api_key = os.getenv(API_KEY_ENV, "").strip()
    if not api_key:
        raise ConfigError(
            f"{API_KEY_ENV} is not set. Copy .env.example to .env and put the key there."
        )

    base_url = (os.getenv(BASE_URL_ENV) or api_raw.get("base_url") or DEFAULT_BASE_URL).strip()

    words = answers_raw.get("long_answer_words", [150, 250])
    if not isinstance(words, list) or len(words) != 2:
        raise ConfigError("answers.long_answer_words must be a two-item list, e.g. [150, 250]")

    date_text = str(run_raw.get("date", "") or "").strip()
    if not date_text:
        date_text = date.today().strftime("%d-%m-%Y")

    return AppConfig(
        api=ApiConfig(
            base_url=base_url.rstrip("/"),
            api_key=api_key,
            model=str(api_raw.get("model", "auto")),
            temperature=float(api_raw.get("temperature", 0.85)),
            max_tokens=int(api_raw.get("max_tokens", 16000)),
            timeout_seconds=int(api_raw.get("timeout_seconds", 240)),
            max_retries=int(api_raw.get("max_retries", 4)),
            retry_max_sleep_seconds=int(api_raw.get("retry_max_sleep_seconds", 180)),
        ),
        run=RunConfig(
            input_dir=_resolve_dir(root, str(run_raw.get("input_dir", "input"))),
            output_dir=_resolve_dir(root, str(run_raw.get("output_dir", "output"))),
            cache_dir=_resolve_dir(root, str(run_raw.get("cache_dir", ".cache"))),
            workers=max(1, int(run_raw.get("workers", 4))),
            date_text=date_text,
        ),
        answers=AnswerConfig(
            language=str(answers_raw.get("language", "English")),
            tone=str(answers_raw.get("tone", "a first-year engineering student")),
            long_answer_min_words=int(words[0]),
            long_answer_max_words=int(words[1]),
            max_cell_chars=int(answers_raw.get("max_cell_chars", 220)),
            max_slots_per_request=int(answers_raw.get("max_slots_per_request", 20)),
        ),
        students=_load_students(raw.get("students")),
    )
