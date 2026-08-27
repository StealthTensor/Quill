import asyncio
import os
from pathlib import Path
from core.srm_client import SRMClient
from core.gdrive import GDriveClient
from worksheetfiller.config import load_config
from worksheetfiller.runner import Job, process_job
from worksheetfiller.llm import LLMClient

class Orchestrator:
    def __init__(self, srm_client: SRMClient, gdrive_client: GDriveClient):
        self.srm = srm_client
        self.drive = gdrive_client
        self.config = load_config(Path("config.yaml"))
        self.llm = LLMClient(self.config)

    def emit(self, event_type: str, data: str):
        """Return SSE formatted events for the frontend"""
        return f"event: {event_type}\ndata: {data}\n\n"

    async def run_pipeline(self):
        """Main automation loop"""
        yield self.emit("start", "Starting pipeline...")
        
        # 1. Fetch user courses
        yield self.emit("progress", "Fetching courses from SRM...")
        courses_data = self.srm.get_courses()
        if courses_data.get("Status") != 1:
            yield self.emit("error", "Failed to fetch courses.")
            return

        courses = courses_data.get("courses", [])
        
        # We assume the user config has one main student for now
        student = self.config.students[0]
        
        for course in courses:
            c_code = course.get("COURSE_CODE")
            c_info = course  # The whole object is often needed
            yield self.emit("progress", f"Scanning {c_code}...")
            
            # Fetch sessions
            # In a real scenario, we might loop through semesters or session IDs.
            # For this MVP, we simulate processing a pending session.
            session_status = self.srm.get_session_status(c_info)
            
            # Pretend we parse it and find session 104 is pending
            session_num = 104
            slo_num = 1
            
            template_name = f"{c_code}_{session_num}_SLO{slo_num}.docx"
            template_path = Path(f"templates/{template_name}")
            
            if not template_path.exists():
                yield self.emit("skip", f"No template found for {template_name}")
                continue
                
            # 2. Fill Document
            yield self.emit("progress", f"Generating answers for {template_name}...")
            job = Job(document=template_path, student=student)
            
            # Run the heavy LLM filler in a thread so we don't block asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, process_job, job, self.config, self.llm)
            
            if result.status == "failed":
                yield self.emit("error", f"Generation failed: {result.error}")
                continue
                
            yield self.emit("progress", f"Filled {result.slots_written} slots. Saved to {result.output_path}")
            
            # 3. Upload to Google Drive
            yield self.emit("progress", f"Uploading {result.output_path.name} to Drive...")
            try:
                drive_link = await loop.run_in_executor(None, self.drive.upload_file, str(result.output_path), result.output_path.name)
                yield self.emit("progress", f"Uploaded successfully. Link: {drive_link}")
            except Exception as e:
                yield self.emit("error", f"Drive upload failed: {str(e)}")
                continue
                
            # 4. Submit to SRM
            yield self.emit("progress", f"Submitting link to SRM...")
            submit_resp = self.srm.submit_link(c_info, session_num, slo_num, drive_link)
            
            if submit_resp.get("Status") == 1:
                yield self.emit("success", f"Successfully submitted {c_code} Session {session_num} SLO {slo_num}!")
            else:
                yield self.emit("error", f"SRM submission rejected: {submit_resp}")

        yield self.emit("end", "Pipeline complete!")
