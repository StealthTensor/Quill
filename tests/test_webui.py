"""Tests for the web UI routes. No model calls are made."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from webui.app import app  # noqa: E402


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


class TestPages:
    def test_index_renders(self, client):
        response = client.get("/")

        assert response.status_code == 200
        assert b"Worksheet Filler" in response.data


class TestState:
    def test_state_lists_documents_students_and_settings(self, client):
        payload = client.get("/api/state").get_json()

        assert {"documents", "students", "settings", "outputs"} <= payload.keys()
        assert payload["settings"]["model"]
        assert all("slug" in student for student in payload["students"])


class TestInspect:
    def test_inspect_reports_where_each_blank_comes_from(self, client):
        payload = client.get("/api/inspect?doc=1011.docx").get_json()

        assert payload["total"] == payload["from_config"] + payload["from_model"]
        assert payload["from_config"] > 0
        assert "<<S1>>" in payload["marked_text"]
        assert {slot["source"] for slot in payload["slots"]} <= {"config", "model"}

    def test_unknown_document_is_a_404(self, client):
        assert client.get("/api/inspect?doc=nope.docx").status_code == 404

    def test_path_traversal_is_rejected(self, client):
        assert client.get("/api/inspect?doc=../config.yaml").status_code == 404


class TestUpload:
    def test_non_docx_uploads_are_rejected(self, client):
        data = {"files": (io.BytesIO(b"not a docx"), "notes.txt")}
        payload = client.post(
            "/api/upload", data=data, content_type="multipart/form-data"
        ).get_json()

        assert payload["saved"] == []
        assert payload["rejected"] == ["notes.txt"]


class TestRunValidation:
    def test_empty_selection_is_rejected_without_calling_the_model(self, client):
        response = client.get("/api/run/stream?docs=&students=")

        assert response.status_code == 400
        assert "Select at least one" in response.get_json()["error"]

    def test_unknown_names_are_rejected(self, client):
        response = client.get("/api/run/stream?docs=ghost.docx&students=nobody")

        assert response.status_code == 400


class TestDownload:
    def test_missing_output_is_a_404(self, client):
        assert client.get("/api/download/nobody/1011.docx").status_code == 404

    def test_zip_bundle_is_served(self, client):
        response = client.get("/api/download-all")

        assert response.status_code == 200
        assert response.mimetype == "application/zip"
