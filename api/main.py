from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.srm_client import SRMClient
from core.gdrive import GDriveClient
from core.orchestrator import Orchestrator
from core.stargate import record_first_launch, gate_check, save_github_username, get_github_username

app = FastAPI()

# Allow frontend dev server to call API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

srm_client = SRMClient()
gdrive_client = GDriveClient()

# Record first launch for star-gate grace period
record_first_launch()


# ── Models ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class MCQSubmitRequest(BaseModel):
    course_info: dict
    session_num: int
    score_pct: float

class PipelineScopeRequest(BaseModel):
    studentIds: list[str] = []
    courseCodes: list[str] = []
    limit: int = 999

class GithubUsernameRequest(BaseModel):
    username: str


# ── State ─────────────────────────────────────────────────────────────────────

@app.get("/api/state")
def get_state():
    """Returns logged-in user's real courses + connection states."""
    courses = []
    students = []

    if srm_client.auth_token and srm_client.user_id:
        raw = srm_client.get_courses()
        if raw.get("Status") == 1:
            raw_courses = raw.get("courses", [])
            courses = [
                {
                    "code": c.get("COURSE_CODE", ""),
                    "name": c.get("COURSE_NAME", ""),
                    "faculty": c.get("FACULTY_NAME", ""),
                    "batch": c.get("BATCH_NAME", ""),
                    "batchId": c.get("BATCH_ID", ""),
                    "completion": c.get("completion", 0),
                    "sessions": [],  # lazy-loaded per course
                }
                for c in raw_courses
            ]
            # Build student object from profile
            profile = srm_client.get_profile()
            if profile.get("Status") == 1:
                u = profile.get("user", {})
                students = [{
                    "id": srm_client.user_id,
                    "name": f"{u.get('FIRST_NAME', '')} {u.get('LAST_NAME', '')}".strip(),
                    "regNo": srm_client.user_id,
                    "department": u.get("DEPARTMENT", ""),
                    "semester": u.get("SEMESTER", ""),
                    "section": u.get("SECTION", ""),
                    "branch": u.get("DEPARTMENT", ""),
                }]

    # Star-gate status
    github_user = get_github_username()
    gate = gate_check(github_user)

    return {
        "courses": courses,
        "students": students,
        "srm": "connected" if srm_client.auth_token else "disconnected",
        "drive": "connected" if gdrive_client.is_authenticated() else "disconnected",
        "stargate": gate,
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/login")
def login(request: LoginRequest):
    response = srm_client.login(request.username, request.password)
    if response.get("Status") != 1:
        raise HTTPException(status_code=401, detail=response.get("Message", "Login failed"))
    return {"ok": True, "user_id": srm_client.user_id}


@app.get("/api/drive/auth")
def drive_auth():
    try:
        gdrive_client.authenticate()
        return {"status": "ok"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Star-gate ─────────────────────────────────────────────────────────────────

@app.get("/api/stargate")
def stargate_status():
    github_user = get_github_username()
    return gate_check(github_user)


@app.post("/api/stargate/username")
def set_github_username(req: GithubUsernameRequest):
    save_github_username(req.username)
    github_user = req.username
    gate = gate_check(github_user)
    return gate


# ── Pipeline ──────────────────────────────────────────────────────────────────

@app.post("/api/run/stream")
async def run_stream(scope: PipelineScopeRequest):
    # Gate check before running
    github_user = get_github_username()
    gate = gate_check(github_user)
    if not gate.get("allowed"):
        async def blocked():
            yield f"event: gate_blocked\ndata: star_needed\n\n"
        return StreamingResponse(blocked(), media_type="text/event-stream")

    orchestrator = Orchestrator(srm_client, gdrive_client)
    return StreamingResponse(
        orchestrator.run_pipeline(scope=scope.model_dump()),
        media_type="text/event-stream",
    )

# Also support GET for EventSource (browser EventSource only does GET)
@app.get("/api/run/stream")
async def run_stream_get(limit: int = 999):
    github_user = get_github_username()
    gate = gate_check(github_user)
    if not gate.get("allowed"):
        async def blocked():
            yield f"event: gate_blocked\ndata: star_needed\n\n"
        return StreamingResponse(blocked(), media_type="text/event-stream")

    orchestrator = Orchestrator(srm_client, gdrive_client)
    return StreamingResponse(
        orchestrator.run_pipeline(scope={"limit": limit}),
        media_type="text/event-stream",
    )


# ── MCQ ───────────────────────────────────────────────────────────────────────

@app.post("/api/mcq/submit")
def submit_mcq(request: MCQSubmitRequest):
    response = srm_client.submit_mcq(
        request.course_info,
        request.session_num,
        request.score_pct,
    )
    if response.get("Status") != 1:
        raise HTTPException(status_code=400, detail=str(response))
    return response
