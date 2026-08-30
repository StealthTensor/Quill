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
from core import appsettings, stargate, quota, reviews

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

class SettingsRequest(BaseModel):
    persona: str | None = None
    autoSubmit: bool | None = None

class StargateRequest(BaseModel):
    username: str


# ── Settings (single user) ──────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    return appsettings.load()

@app.post("/api/settings")
def save_settings(req: SettingsRequest):
    return appsettings.save(req.model_dump(exclude_none=True))


# ── Star gate ───────────────────────────────────────────────────────────────────

@app.get("/api/stargate/status")
def stargate_status():
    return stargate.gate_check(stargate.get_github_username())

@app.post("/api/stargate/username")
def stargate_username(req: StargateRequest):
    stargate.save_github_username(req.username)
    return stargate.gate_check(req.username)


# ── State helpers ───────────────────────────────────────────────────────────────

# getcircleinfo SLO node Status (decoded from the live portal / sunburst):
#   0 = not started, 1 = in progress, 2 = completed.
# Anything that is not 2 is still pending submission → the student must act on it.
def _slo_state(status) -> str:
    return "verified" if status == 2 else "not_started"


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


def _fetch_sessions(course: dict) -> list[dict]:
    """Scan a course's full worksheet tree from SRM's getcircleinfo and map to the
    frontend Session shape. This is the real, complete list of worksheets — every
    unit and session — with per-SLO completion status."""
    data = srm_client.get_circle_info(course.get("COURSE_CODE", ""))
    flare = data.get("flare", {}) if isinstance(data, dict) else {}

    out = []
    for unit in flare.get("children", []) or []:
        for sess in unit.get("children", []) or []:
            slos = sess.get("children", []) or []
            if not slos:
                continue
            num = (slos[0].get("course") or {}).get("SESSION")
            try:
                num = int(num)
            except (TypeError, ValueError):
                continue
            # SLO node key ends with the SLO number ("1031" → SLO 1).
            by_slo = {}
            for c in slos:
                key = str(c.get("key") or "")
                if key and key[-1] in ("1", "2"):
                    by_slo[int(key[-1])] = c.get("Status")
            out.append({
                "number": num,
                "unit": num // 100,           # session number = unit*100 + index
                "mcqScore": None,
                "slo1": _slo_state(by_slo.get(1)),
                "slo2": _slo_state(by_slo.get(2)),
                "slo1Link": None,
                "slo2Link": None,
                "slo1Desc": "",
                "slo2Desc": "",
                "mcqs": [],
                "shortQuestions": [],
                "longQuestions": [],
            })
    out.sort(key=lambda s: s["number"])
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
        "dailyLimit": quota.DAILY_LIMIT,
        "dailyRemaining": quota.remaining_today(),
    }


# ── Review queue (filled, awaiting submit) ──────────────────────────────────────

class ReviewSubmitRequest(BaseModel):
    id: str


def _submit_review(item: dict) -> dict:
    """Submit one review item's Drive link to SRM. Returns a result dict."""
    resp = srm_client.submit_link(
        item["courseInfo"], item["session"], item["slo"], item["driveLink"]
    )
    if resp.get("Status") == 1:
        reviews.remove(item["id"])
        quota.record(1)
        return {"ok": True}
    return {"ok": False, "error": str(resp.get("Message", resp))}


@app.get("/api/reviews")
def get_reviews():
    return {
        "items": reviews.list_public(),
        "dailyLimit": quota.DAILY_LIMIT,
        "dailyRemaining": quota.remaining_today(),
    }


@app.post("/api/reviews/submit")
def submit_review(req: ReviewSubmitRequest):
    if quota.remaining_today() <= 0:
        raise HTTPException(status_code=429, detail="Daily submit limit reached — try again tomorrow")
    item = reviews.get(req.id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    return _submit_review(item)


@app.post("/api/reviews/submit_all")
def submit_all_reviews():
    """Submit as many held worksheets as today's remaining cap allows."""
    submitted, failed, skipped = 0, 0, 0
    for item in reviews.list_public():
        if quota.remaining_today() <= 0:
            skipped += 1
            continue
        full = reviews.get(item["id"])
        if not full:
            continue
        res = _submit_review(full)
        if res["ok"]:
            submitted += 1
        else:
            failed += 1
    return {"submitted": submitted, "failed": failed, "skipped": skipped,
            "dailyRemaining": quota.remaining_today()}


@app.get("/api/circle/{course_code}")
def get_circle(course_code: str):
    """Raw learning-session tree (sunburst) for one course."""
    if not (srm_client.auth_token and srm_client.user_id):
        raise HTTPException(status_code=401, detail="Not logged in")
    data = srm_client.get_circle_info(course_code)
    if data.get("Status") != 1:
        raise HTTPException(status_code=502, detail="Could not fetch course tree")
    return {"flare": data.get("flare", {})}


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
async def run_stream_get(limit: int = 999, courses: str = ""):
    codes = [c for c in courses.split(",") if c]
    return StreamingResponse(
        _pipeline_events({"limit": limit, "courseCodes": codes}),
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
