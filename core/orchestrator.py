"""
Quill Orchestrator — real pipeline loop.
Scans SRM for all pending sessions, fills worksheets via LLM,
uploads to Drive, and submits links back to SRM.
"""
import asyncio
import json
import os
import tempfile
from pathlib import Path
from typing import AsyncGenerator

from core.srm_client import SRMClient
from core.gdrive import GDriveClient
from core import appsettings, quota, reviews
from worksheetfiller.config import Student, load_config
from worksheetfiller.runner import Job, process_job
from worksheetfiller.llm import LLMClient


# getcircleinfo SLO node Status: 0 = not started, 1 = in progress, 2 = completed.
# Anything that is not completed is still pending submission.
STATUS_COMPLETED = 2


class Orchestrator:
    def __init__(self, srm_client: SRMClient, gdrive_client: GDriveClient):
        self.srm = srm_client
        self.drive = gdrive_client
        # config.yaml is user-supplied and absent in a fresh install; fall back to
        # the shipped example so the pipeline can still start and report status.
        cfg_path = Path("config.yaml")
        if not cfg_path.is_file():
            cfg_path = Path("config.example.yaml")
        self.config = load_config(cfg_path)
        self.llm = LLMClient(self.config.api)  # LLMClient wants ApiConfig, not the full AppConfig
        # Scratch dir for worksheets downloaded from SRM before filling.
        self._workdir = Path(tempfile.mkdtemp(prefix="quill_ws_"))

    def _sse(self, event_type: str, data: str) -> str:
        """Format an SSE message."""
        return f"event: {event_type}\ndata: {data}\n\n"

    def _build_student(self, persona: str) -> Student:
        """Build the (single) student straight from the SRM profile — no config."""
        u = (self.srm.get_profile() or {}).get("user", {}) or {}
        first = (u.get("FIRST_NAME") or "").strip()
        last = (u.get("LAST_NAME") or "").strip()
        name = first if (not last or last.lower() in first.lower()) else f"{first} {last}".strip()
        return Student(
            name=name or (self.srm.user_id or "Student"),
            reg_no=self.srm.user_id or "",
            branch=u.get("DEPARTMENT", "") or "",
            section="",
            persona=persona or "",
        )

    async def run_pipeline(self, scope: dict = None) -> AsyncGenerator[str, None]:
        """
        Main automation loop. Yields SSE-formatted strings.
        scope = {studentIds: [...], courseCodes: [...], limit: N}
        """
        yield self._sse("start", "🚀 Pipeline started")

        # -- 1. Get courses from SRM --
        yield self._sse("progress", "Fetching your courses from SRM portal...")
        courses_data = self.srm.get_courses()
        if courses_data.get("Status") != 1:
            yield self._sse("error", f"Could not reach SRM portal: {courses_data.get('Message', 'unknown error')}")
            return

        all_courses = courses_data.get("courses", [])
        settings = appsettings.load()
        student = self._build_student(settings.get("persona", ""))
        auto_submit = settings.get("autoSubmit", False)
        filter_codes = set((scope or {}).get("courseCodes", []))

        # Bound one run to at most a unit's worth of worksheets to fill.
        limit = min((scope or {}).get("limit", 999), quota.DAILY_LIMIT)

        yield self._sse("progress", f"Found {len(all_courses)} courses. Scanning for pending work...")

        jobs_done = 0
        jobs_total = 0

        # -- 2. Scan each course for pending SLOs (getcircleinfo — full tree) --
        for course in all_courses:
            c_code = course.get("COURSE_CODE", "")

            if filter_codes and c_code not in filter_codes:
                continue

            # course_info for submitlink is the full course object the portal
            # returned; it carries COURSE_CODE / BATCH_ID / SESSIONS / SLO.
            course_info = course

            yield self._sse("progress", f"[{c_code}] Scanning sessions...")
            circle = self.srm.get_circle_info(c_code)
            flare = circle.get("flare", {}) if isinstance(circle, dict) else {}

            # Every SLO node with Status != completed is pending submission.
            pending = []
            for unit in flare.get("children", []) or []:
                for sess in unit.get("children", []) or []:
                    for slo in sess.get("children", []) or []:
                        if slo.get("Status") == STATUS_COMPLETED:
                            continue
                        key = str(slo.get("key") or "")
                        snum = (slo.get("course") or {}).get("SESSION")
                        if not key or key[-1] not in ("1", "2"):
                            continue
                        try:
                            pending.append((int(snum), int(key[-1])))
                        except (TypeError, ValueError):
                            continue
            pending.sort()

            if not pending:
                yield self._sse("skip", f"[{c_code}] No pending worksheets")
                continue

            for session_num, slo_num in pending:
                if jobs_done >= limit:
                    yield self._sse("progress", f"Reached limit of {limit} jobs — stopping")
                    break

                jobs_total += 1
                label = f"[{c_code}] Session {session_num} SLO {slo_num}"
                yield self._sse("progress", f"Submitting: {label}")

                # -- 3. Download the blank worksheet from SRM (slp = practice) --
                yield self._sse("progress", f"{label} — downloading worksheet from SRM...")
                url = self.srm.get_worksheet_url(c_code, session_num, slo_num, "docx")
                data = self.srm.download_worksheet(url) if url else None
                if not data or data[:2] != b"PK":
                    yield self._sse("skip", f"{label} — worksheet unavailable, skipping")
                    continue
                template_path = self._workdir / f"{c_code}_{session_num}{slo_num}.docx"
                template_path.write_bytes(data)

                yield self._sse("progress", f"{label} — generating answers with AI...")
                job = Job(document=template_path, student=student)

                loop = asyncio.get_event_loop()
                try:
                    result = await loop.run_in_executor(
                        None, process_job, job, self.config, self.llm
                    )
                except Exception as e:
                    yield self._sse("error", f"{label} — AI generation crashed: {e}")
                    continue

                if result.status == "failed":
                    yield self._sse("error", f"{label} — generation failed: {result.error}")
                    continue
                if result.status == "skipped":
                    yield self._sse("skip", f"{label} — skipped (quota exhausted)")
                    continue

                yield self._sse("progress", f"{label} — filled {result.slots_written}/{result.slots_total} slots ✓")

                # -- 4. Upload to Google Drive --
                yield self._sse("progress", f"{label} — uploading to Google Drive...")
                try:
                    drive_link = await loop.run_in_executor(
                        None,
                        self.drive.upload_file,
                        str(result.output_path),
                        result.output_path.name,
                    )
                except Exception as e:
                    yield self._sse("error", f"{label} — Drive upload failed: {e}")
                    continue

                yield self._sse("progress", f"{label} — uploaded ✓")

                # -- 5. Submit to SRM, or hold for review --
                # The daily cap is on SRM submissions (the visible action). When
                # auto-submit is off, or the cap is reached, the filled worksheet
                # is parked in the Review list for the user to submit later.
                if not auto_submit:
                    reviews.add(c_code, course_info, session_num, slo_num, drive_link)
                    jobs_done += 1
                    yield self._sse("success", f"{label} ✅ filled & uploaded — saved to Review")
                    continue

                if quota.remaining_today() <= 0:
                    reviews.add(c_code, course_info, session_num, slo_num, drive_link)
                    yield self._sse("skip", f"{label} — daily submit cap reached; saved to Review")
                    continue

                yield self._sse("progress", f"{label} — submitting link to SRM portal...")
                submit_resp = self.srm.submit_link(course_info, session_num, slo_num, drive_link)

                if submit_resp.get("Status") == 1:
                    jobs_done += 1
                    quota.record(1)
                    yield self._sse("success", f"{label} ✅ submitted — pending review")
                else:
                    yield self._sse("error", f"{label} — SRM rejected: {submit_resp.get('Message', submit_resp)}")

        # -- Summary --
        if jobs_total == 0:
            yield self._sse("end", "✨ Nothing pending — you're all caught up!")
        else:
            yield self._sse("end", f"🏁 Done! Submitted {jobs_done}/{jobs_total} worksheets")
