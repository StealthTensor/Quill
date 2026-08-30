from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# --- HARDCODED DEFAULTS FOR PRODUCTION ---
# If students don't have a .env file, it falls back to these keys baked into the app.
os.environ.setdefault("FREELLMAPI_API_KEY", "freellmapi-113579cfc5e86a346c9003e3fe10922674bc8a23ac9c8ea7")
os.environ.setdefault("FREELLMAPI_BASE_URL", "http://localhost:3001/v1")
# -----------------------------------------

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.srm_client import SRMClient
from core.gdrive import GDriveClient
from core.orchestrator import Orchestrator

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


# ── State helpers ───────────────────────────────────────────────────────────────

# getsessionstatus returns result.SLOSTATUS, a map of "<session><slo>" → code.
# Observed against the live portal: 1 = released but not submitted (pending),
# 2 = submitted (counts toward course completion). -1 = flagged for resubmission.
# An absent SLO key means that half of the session is not released → treat as
# done so it never shows as phantom pending work.
_SLO_STATUS = {1: "not_started", 2: "verified", -1: "resubmission"}


def _full_name(u: dict) -> str:
    """SRM often returns the full name in both FIRST_NAME and LAST_NAME. Join
    them without duplicating when one already contains the other."""
    first = (u.get("FIRST_NAME") or "").strip()
    last = (u.get("LAST_NAME") or "").strip()
    if not last or last.lower() in first.lower():
        return first
    if first.lower() in last.lower():
        return last
    return f"{first} {last}".strip()


def _unit_for_session(num: int) -> int:
    return (num - 101) // 9 + 1


def _slo_state(raw) -> str:
    try:
        return _SLO_STATUS.get(int(raw), "not_started")
    except (TypeError, ValueError):
        return "verified"  # SLO not released for this session → not pending


def _slo_link(slolink: dict, key: str):
    v = slolink.get(key)
    if isinstance(v, dict):
        return v.get("view") or v.get("download") or None
    if isinstance(v, str):
        return v or None
    return None


def _fetch_sessions(course: dict) -> list[dict]:
    """Scan one course's released worksheets from SRM's getsessionstatus and map
    to the frontend Session shape. Sessions appear only once released, so this is
    the real list of worksheets the student can act on."""
    data = srm_client.get_session_status(course)
    result = data.get("result", {}) if isinstance(data, dict) else {}
    slostatus = result.get("SLOSTATUS") or {}
    slolink = result.get("SLOLINK") or {}
    mcq = result.get("MCQ") or {}

    # Keys are "<session><slo>" with the SLO as the trailing digit. Strip it and
    # keep only real session numbers (>= 101); the portal emits "undefined1" and
    # other noise keys we must ignore.
    nums = set()
    for k in slostatus:
        sess = k[:-1]
        if sess.isdigit() and int(sess) >= 101:
            nums.add(int(sess))

    out = []
    for num in sorted(nums):
        mcq_raw = mcq.get(str(num))
        out.append({
            "number": num,
            "unit": _unit_for_session(num),
            "mcqScore": mcq_raw if isinstance(mcq_raw, (int, float)) else None,
            "slo1": _slo_state(slostatus.get(f"{num}1")),
            "slo2": _slo_state(slostatus.get(f"{num}2")),
            "slo1Link": _slo_link(slolink, f"{num}1"),
            "slo2Link": _slo_link(slolink, f"{num}2"),
            "slo1Desc": "",
            "slo2Desc": "",
            "mcqs": [],
            "shortQuestions": [],
            "longQuestions": [],
        })
    return out


# ── State ─────────────────────────────────────────────────────────────────────

@app.get("/api/state")
def get_state():
    """Returns logged-in user's real courses (with scanned sessions) + connection states."""
    courses = []
    students = []

    if srm_client.auth_token and srm_client.user_id:
        # Profile first — gives us the per-course semester map and the student.
        sem_by_code: dict[str, str] = {}
        profile = srm_client.get_profile()
        if profile.get("Status") == 1:
            u = profile.get("user", {})
            for slot in u.get("SLOT", []) or []:
                sem_by_code[slot.get("COURSE_CODE", "")] = slot.get("SEMESTER", "")
            students = [{
                "id": srm_client.user_id,
                "name": _full_name(u),
                "regNo": srm_client.user_id,
                "department": u.get("DEPARTMENT", ""),
                "semester": next(iter(sem_by_code.values()), ""),
                "section": u.get("SECTION", ""),
                "branch": u.get("DEPARTMENT", ""),
            }]

        raw = srm_client.get_courses()
        if raw.get("Status") == 1:
            for c in raw.get("courses", []):
                code = c.get("COURSE_CODE", "")
                courses.append({
                    "code": code,
                    "name": c.get("COURSE_NAME", ""),
                    "faculty": c.get("FACULTY_NAME", ""),
                    "batch": c.get("BATCH_NAME", ""),
                    "batchId": c.get("BATCH_ID", ""),
                    "semester": sem_by_code.get(code, ""),
                    "completion": c.get("completion", 0),
                    "sessions": _fetch_sessions(c),
                })

    return {
        "courses": courses,
        "students": students,
        "srm": "connected" if srm_client.auth_token else "disconnected",
        "drive": "connected" if gdrive_client.is_authenticated() else "disconnected",
        "gateway": "connected" if os.environ.get("FREELLMAPI_API_KEY") else "disconnected",
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


# ── Pipeline ──────────────────────────────────────────────────────────────────

async def _pipeline_events(scope: dict):
    """Construct the orchestrator and stream its events. Constructing it can fail
    (missing config, etc.); surface that as an SSE error event instead of a 500
    that the browser only sees as 'Connection to pipeline lost'."""
    try:
        orchestrator = Orchestrator(srm_client, gdrive_client)
    except Exception as e:
        yield f"event: error\ndata: Pipeline unavailable — {e}\n\n"
        yield "event: end\ndata: Pipeline stopped\n\n"
        return
    async for chunk in orchestrator.run_pipeline(scope=scope):
        yield chunk


@app.post("/api/run/stream")
async def run_stream(scope: PipelineScopeRequest):
    return StreamingResponse(
        _pipeline_events(scope.model_dump()),
        media_type="text/event-stream",
    )


# Also support GET for EventSource (browser EventSource only does GET)
@app.get("/api/run/stream")
async def run_stream_get(limit: int = 999):
    return StreamingResponse(
        _pipeline_events({"limit": limit}),
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
