"""
Quill Orchestrator — real pipeline loop.
Scans SRM for all pending sessions, fills worksheets via LLM,
uploads to Drive, and submits links back to SRM.
"""
import asyncio
import json
import os
from pathlib import Path
from typing import AsyncGenerator

from core.srm_client import SRMClient
from core.gdrive import GDriveClient
from worksheetfiller.config import load_config
from worksheetfiller.runner import Job, process_job
from worksheetfiller.llm import LLMClient


# PRACTICE_STATUS values
STATUS_NOT_SUBMITTED = 0
STATUS_PENDING_REVIEW = 1
STATUS_VERIFIED = 2
STATUS_RESUBMISSION = -1


class Orchestrator:
    def __init__(self, srm_client: SRMClient, gdrive_client: GDriveClient):
        self.srm = srm_client
        self.drive = gdrive_client
        self.config = load_config(Path("config.yaml"))
        self.llm = LLMClient(self.config)

    def _sse(self, event_type: str, data: str) -> str:
        """Format an SSE message."""
        return f"event: {event_type}\ndata: {data}\n\n"

    def _find_student(self, user_id: str):
        """Find a student in config matching the logged-in user_id."""
        for s in self.config.students:
            if getattr(s, "reg_no", None) == user_id or getattr(s, "name", "").replace(" ", "").lower() in user_id.lower():
                return s
        # Fallback — use first student
        return self.config.students[0]

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
        student = self._find_student(self.srm.user_id or "")
        limit = (scope or {}).get("limit", 999)
        filter_codes = set((scope or {}).get("courseCodes", []))

        yield self._sse("progress", f"Found {len(all_courses)} courses. Scanning for pending work...")

        jobs_done = 0
        jobs_total = 0

        # -- 2. Scan each course for pending sessions --
        for course in all_courses:
            c_code = course.get("COURSE_CODE", "")
            c_batch = course.get("BATCH_ID", "")
            c_sessions = course.get("SESSIONS", [])
            c_slo = course.get("SLO", "")

            if filter_codes and c_code not in filter_codes:
                continue

            course_info = {
                "COURSE_CODE": c_code,
                "BATCH_ID": c_batch,
                "SESSIONS": c_sessions,
                "SLO": c_slo,
            }

            yield self._sse("progress", f"[{c_code}] Scanning sessions...")
            status_data = self.srm.get_session_status(course_info)

            sessions = status_data.get("sessions", [])
            if not sessions:
                yield self._sse("skip", f"[{c_code}] No session data returned — skipping")
                continue

            for session in sessions:
                if jobs_done >= limit:
                    yield self._sse("progress", f"Reached limit of {limit} jobs — stopping")
                    break

                session_num = session.get("SESSION_NUMBER") or session.get("SESSION")
                if not session_num:
                    continue

                # Check SLO1 and SLO2
                for slo_num in (1, 2):
                    practice_key = f"{session_num}{slo_num}"
                    practice_status = session.get(f"PRACTICE_{practice_key}", {}).get("STATUS")

                    if practice_status not in (STATUS_NOT_SUBMITTED, STATUS_RESUBMISSION):
                        continue  # Already done

                    jobs_total += 1
                    label = f"[{c_code}] Session {session_num} SLO {slo_num}"
                    action = "Resubmitting" if practice_status == STATUS_RESUBMISSION else "Submitting"
                    yield self._sse("progress", f"{action}: {label}")

                    # -- 3. Find & fill worksheet template --
                    template_name = f"{c_code}_{session_num}_SLO{slo_num}.docx"
                    template_path = Path(f"templates/{template_name}")

                    if not template_path.exists():
                        # Try generic fallback
                        fallbacks = list(Path("templates").glob(f"{c_code}_*.docx")) if Path("templates").exists() else []
                        if fallbacks:
                            template_path = fallbacks[0]
                            yield self._sse("progress", f"Using fallback template: {template_path.name}")
                        else:
                            yield self._sse("skip", f"{label} — no template found, skipping")
                            continue

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

                    # -- 5. Submit link to SRM --
                    yield self._sse("progress", f"{label} — submitting link to SRM portal...")
                    submit_resp = self.srm.submit_link(course_info, session_num, slo_num, drive_link)

                    if submit_resp.get("Status") == 1:
                        jobs_done += 1
                        yield self._sse("success", f"{label} ✅ submitted — pending review")
                    else:
                        yield self._sse("error", f"{label} — SRM rejected: {submit_resp.get('Message', submit_resp)}")

        # -- Summary --
        if jobs_total == 0:
            yield self._sse("end", "✨ Nothing pending — you're all caught up!")
        else:
            yield self._sse("end", f"🏁 Done! Submitted {jobs_done}/{jobs_total} worksheets")
