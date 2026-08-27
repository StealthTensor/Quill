"""Local web UI for the worksheet filler.

Every stage of the pipeline is streamed to the browser as it happens: the blanks
detected, the exact prompt sent, the raw model reply, retries, cache hits and the
cleanup applied before write-back. Nothing is hidden behind a spinner.
"""

from __future__ import annotations

import io
import json
import threading
import zipfile
from pathlib import Path

from docx import Document
from flask import Flask, Response, jsonify, render_template, request, send_file, stream_with_context
from werkzeug.utils import secure_filename

from worksheetfiller import events, identity, runner
from worksheetfiller.config import AppConfig, ConfigError, load_config
from worksheetfiller.slots import extract, strip_trailing_slots

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = PROJECT_ROOT / "config.yaml"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024

_run_lock = threading.Lock()


def current_config() -> AppConfig:
    """Reload config on every request so edits apply without a restart."""
    return load_config(CONFIG_PATH)


def _split(raw: str) -> list[str]:
    return [item for item in (part.strip() for part in raw.split(",")) if item]


@app.errorhandler(ConfigError)
def handle_config_error(exc: ConfigError):
    return jsonify({"error": str(exc)}), 400


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def api_state():
    config = current_config()
    documents = runner.discover_documents(config.run.input_dir)

    return jsonify(
        {
            "documents": [
                {"name": path.name, "size": path.stat().st_size} for path in documents
            ],
            "students": [
                {
                    "name": student.name,
                    "slug": student.slug,
                    "reg_no": student.reg_no,
                    "branch": student.branch_section,
                    "persona": student.persona,
                }
                for student in config.students
            ],
            "settings": {
                "base_url": config.api.base_url,
                "model": config.api.model,
                "temperature": config.api.temperature,
                "workers": config.run.workers,
                "slots_per_request": config.answers.max_slots_per_request,
                "max_cell_chars": config.answers.max_cell_chars,
                "long_answer_words": [
                    config.answers.long_answer_min_words,
                    config.answers.long_answer_max_words,
                ],
                "date": config.run.date_text,
                "input_dir": str(config.run.input_dir),
                "output_dir": str(config.run.output_dir),
            },
            "outputs": _outputs(config),
            "cached_batches": len(list(config.run.cache_dir.glob("*.json")))
            if config.run.cache_dir.is_dir()
            else 0,
        }
    )


def _outputs(config: AppConfig) -> list[dict]:
    if not config.run.output_dir.is_dir():
        return []
    return [
        {
            "student_slug": path.parent.name,
            "filename": path.name,
            "size": path.stat().st_size,
            "modified": path.stat().st_mtime,
        }
        for path in sorted(config.run.output_dir.glob("*/*.docx"))
    ]


@app.get("/api/inspect")
def api_inspect():
    """Dry-run one worksheet: what blanks exist and who answers them."""
    config = current_config()
    name = secure_filename(request.args.get("doc", ""))
    path = config.run.input_dir / name
    if not path.is_file():
        return jsonify({"error": f"No such worksheet: {name}"}), 404

    document = Document(str(path))
    extraction = extract(document, max_cell_chars=config.answers.max_cell_chars)
    slots = strip_trailing_slots(extraction)
    student = config.students[0]
    known, pending = identity.resolve(slots, student, config.run.date_text)

    groups = runner.chunk_slots(pending, config.answers.max_slots_per_request)
    return jsonify(
        {
            "document": name,
            "marked_text": extraction.text,
            "total": len(slots),
            "from_config": len(known),
            "from_model": len(pending),
            "requests": len(groups),
            "slots": [
                {
                    "id": slot.id,
                    "kind": slot.kind,
                    "label": slot.label,
                    "column": slot.column,
                    "hint": slot.hint(),
                    "source": "config" if slot.id in known else "model",
                    "preview": known.get(slot.id, ""),
                }
                for slot in slots
            ],
        }
    )


@app.post("/api/upload")
def api_upload():
    config = current_config()
    config.run.input_dir.mkdir(parents=True, exist_ok=True)

    saved: list[str] = []
    rejected: list[str] = []
    for storage in request.files.getlist("files"):
        name = secure_filename(storage.filename or "")
        if not name.lower().endswith(".docx"):
            rejected.append(storage.filename or "(unnamed)")
            continue
        storage.save(config.run.input_dir / name)
        saved.append(name)

    return jsonify({"saved": saved, "rejected": rejected})


@app.post("/api/documents/delete")
def api_delete_document():
    config = current_config()
    name = secure_filename((request.get_json(silent=True) or {}).get("name", ""))
    path = config.run.input_dir / name
    if not path.is_file():
        return jsonify({"error": f"No such worksheet: {name}"}), 404
    path.unlink()
    return jsonify({"deleted": name})


@app.post("/api/cache/clear")
def api_clear_cache():
    config = current_config()
    removed = 0
    if config.run.cache_dir.is_dir():
        for path in config.run.cache_dir.glob("*.json"):
            path.unlink()
            removed += 1
    return jsonify({"removed": removed})


@app.get("/api/run/stream")
def api_run_stream():
    """Run a batch and stream every internal step as server-sent events."""
    config = current_config()
    documents = runner.discover_documents(config.run.input_dir)

    wanted_docs = set(_split(request.args.get("docs", "")))
    wanted_students = set(_split(request.args.get("students", "")))
    use_cache = request.args.get("no_cache") != "1"

    selected_docs = tuple(path for path in documents if path.name in wanted_docs)
    selected_students = tuple(
        student for student in config.students if student.slug in wanted_students
    )
    if not selected_docs or not selected_students:
        return jsonify({"error": "Select at least one worksheet and one student"}), 400

    if not _run_lock.acquire(blocking=False):
        return jsonify({"error": "A run is already in progress"}), 409

    jobs = runner.build_jobs(selected_docs, selected_students)
    bus = events.EventQueue()

    def work() -> None:
        try:
            runner.run_jobs(jobs, config, use_cache=use_cache, emit=bus.emit)
        except Exception as exc:  # surfaced to the browser rather than swallowed
            bus.emit("batch.error", {"error": f"{type(exc).__name__}: {exc}"})
        finally:
            bus.close()
            _run_lock.release()

    threading.Thread(target=work, daemon=True).start()

    def stream():
        yield ": stream open\n\n"
        for event in bus.drain():
            yield f"data: {json.dumps(event.as_dict(), ensure_ascii=False)}\n\n"
        yield "data: {\"kind\": \"stream.closed\"}\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/download/<student_slug>/<path:filename>")
def api_download(student_slug: str, filename: str):
    config = current_config()
    path = config.run.output_dir / secure_filename(student_slug) / secure_filename(filename)
    if not path.is_file():
        return jsonify({"error": "Not found"}), 404
    return send_file(path, as_attachment=True, download_name=filename)


@app.get("/api/download-all")
def api_download_all():
    """Zip every filled worksheet, foldered by student."""
    config = current_config()
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(config.run.output_dir.glob("*/*.docx")):
            archive.write(path, arcname=f"{path.parent.name}/{path.name}")

    buffer.seek(0)
    return send_file(
        buffer, mimetype="application/zip", as_attachment=True, download_name="filled_worksheets.zip"
    )


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Serve the worksheet filler web UI.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5001)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    print(f"Worksheet filler UI: http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)


if __name__ == "__main__":
    main()
