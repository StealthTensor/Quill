from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import sys
import os

# Add parent directory to path to import core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.srm_client import SRMClient

from core.gdrive import GDriveClient

app = FastAPI()
srm_client = SRMClient()
gdrive_client = GDriveClient()

class LoginRequest(BaseModel):
    username: str
    password: str

class MCQSubmitRequest(BaseModel):
    course_info: str
    slot: str
    session_num: int
    score_pct: float

@app.get("/api/state")
def get_state():
    return {
        "courses": [],
        "students": [],
        "drive_connected": gdrive_client.is_authenticated()
    }

@app.get("/api/drive/auth")
def drive_auth():
    try:
        gdrive_client.authenticate()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/login")
def login(request: LoginRequest):
    try:
        response = srm_client.login(request.username, request.password)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from core.orchestrator import Orchestrator

@app.get("/api/run/stream")
async def run_stream():
    orchestrator = Orchestrator(srm_client, gdrive_client)
    return StreamingResponse(orchestrator.run_pipeline(), media_type="text/event-stream")

@app.post("/api/mcq/submit")
def submit_mcq(request: MCQSubmitRequest):
    try:
        response = srm_client.submit_mcq(
            request.course_info,
            request.slot,
            request.session_num,
            request.score_pct
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
