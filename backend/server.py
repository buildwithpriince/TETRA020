"""Prism FastAPI server.

Runs under supervisor on 0.0.0.0:8001. All routes are prefixed with /api.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from auth import AuthUser, get_current_user
from db import (
    AnalysisSession,
    FollowUpQuestion,
    MatrixRow,
    Report,
    UploadedFile,
    User,
    SessionLocal,
    init_db,
)
from pipeline import (
    ANALYSIS_STAGES,
    DOC_KEYS,
    run_analysis,
)
from parsers import detect_type_from_content
from sample_fixtures import ensure_fixtures, fixture_filenames

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("prism.server")

STORAGE_ROOT = os.environ.get("STORAGE_ROOT", "/app/backend/storage")
Path(STORAGE_ROOT).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Prism API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://prism-check-1.preview.emergentagent.com",
    ],
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    log.info("Prism API started; storage=%s", STORAGE_ROOT)


# ---------- helpers ---------------------------------------------------------


def _ensure_user(db, current: AuthUser) -> Optional[str]:
    if current.anonymous:
        return None
    u = db.get(User, current.uid)
    if u is None:
        u = User(uid=current.uid, email=current.email, display_name=current.display_name)
        db.add(u)
        db.commit()
    return current.uid


# ---------- routes ----------------------------------------------------------


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "service": "prism", "stages": ANALYSIS_STAGES}


@app.post("/api/upload")
async def upload(
    files: List[UploadFile] = File(...),
    current: AuthUser = Depends(get_current_user),
) -> dict:
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    session_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        user_id = _ensure_user(db, current)
        session = AnalysisSession(id=session_id, user_id=user_id, stage=0, stage_name="", complete=False)
        db.add(session)
        db.flush()

        session_dir = Path(STORAGE_ROOT) / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        uploaded_out: List[dict] = []
        for uf in files:
            file_id = str(uuid.uuid4())
            safe_name = os.path.basename(uf.filename or f"upload-{file_id}")
            dest = session_dir / safe_name
            content = await uf.read()
            with open(dest, "wb") as w:
                w.write(content)

            detected, confidence = detect_type_from_content(safe_name, str(dest))
            record = UploadedFile(
                id=file_id,
                session_id=session_id,
                filename=safe_name,
                detected_type=detected,
                status="validated",
                confidence=round(confidence, 3),
                storage_path=str(dest),
            )
            db.add(record)
            uploaded_out.append({
                "file_id": file_id,
                "filename": safe_name,
                "detected_type": detected,
                "status": "validated",
                "confidence": round(confidence, 3),
            })
        db.commit()

        found_types = {u["detected_type"] for u in uploaded_out}
        missing = [t for t in DOC_KEYS if t not in found_types]

        return {
            "session_id": session_id,
            "files": uploaded_out,
            "missing_document_types": missing,
        }
    finally:
        db.close()


@app.post("/api/sample/{kind}")
async def start_sample(
    kind: str,
    current: AuthUser = Depends(get_current_user),
) -> dict:
    """Bootstrap a session from bundled sample fixtures (kind ∈ {clean, messy})."""
    kind = "clean" if kind == "clean" else "messy"
    fixtures_dir = ensure_fixtures(kind)
    session_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        user_id = _ensure_user(db, current)
        session = AnalysisSession(id=session_id, user_id=user_id, stage=0, stage_name="", complete=False)
        db.add(session)
        db.flush()

        session_dir = Path(STORAGE_ROOT) / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        uploaded_out: List[dict] = []
        for name in fixture_filenames(kind):
            src = fixtures_dir / name
            if not src.exists():
                continue
            dest = session_dir / name
            with open(src, "rb") as r, open(dest, "wb") as w:
                w.write(r.read())

            detected, confidence = detect_type_from_content(name, str(dest))
            file_id = str(uuid.uuid4())
            db.add(UploadedFile(
                id=file_id,
                session_id=session_id,
                filename=name,
                detected_type=detected,
                status="validated",
                confidence=round(confidence, 3),
                storage_path=str(dest),
            ))
            uploaded_out.append({
                "file_id": file_id,
                "filename": name,
                "detected_type": detected,
                "status": "validated",
                "confidence": round(confidence, 3),
            })
        db.commit()

        found_types = {u["detected_type"] for u in uploaded_out}
        missing = [t for t in DOC_KEYS if t not in found_types]
        return {
            "session_id": session_id,
            "files": uploaded_out,
            "missing_document_types": missing,
        }
    finally:
        db.close()


@app.post("/api/analyze/{session_id}")
async def start_analysis(
    session_id: str,
    current: AuthUser = Depends(get_current_user),
) -> dict:
    db = SessionLocal()
    try:
        s = db.get(AnalysisSession, session_id)
        if s is None:
            raise HTTPException(status_code=404, detail="Unknown session")
        s.stage = 1
        s.stage_name = ANALYSIS_STAGES[0]
        s.complete = False
        db.commit()
    finally:
        db.close()

    # Fire and forget — do NOT await, so the response returns immediately.
    asyncio.create_task(run_analysis(session_id, STORAGE_ROOT))
    return {"session_id": session_id, "started": True}


@app.get("/api/analyze/{session_id}/status")
async def analysis_status(session_id: str) -> dict:
    db = SessionLocal()
    try:
        s = db.get(AnalysisSession, session_id)
        if s is None:
            raise HTTPException(status_code=404, detail="Unknown session")
        stage = max(1, min(int(s.stage or 1), len(ANALYSIS_STAGES)))
        return {
            "stage": stage,
            "stage_name": s.stage_name or ANALYSIS_STAGES[stage - 1],
            "complete": bool(s.complete),
        }
    finally:
        db.close()


def _build_api_url(session_id: str) -> str:
    return f"/api/report/{session_id}/download"


@app.get("/api/report/{session_id}")
async def get_report(session_id: str) -> dict:
    db = SessionLocal()
    try:
        s = db.get(AnalysisSession, session_id)
        if s is None:
            raise HTTPException(status_code=404, detail="Unknown session")
        report = db.get(Report, session_id)
        if report is None:
            raise HTTPException(status_code=409, detail="Analysis not complete")

        rows = db.query(MatrixRow).filter_by(session_id=session_id).all()
        matrix = []
        for r in rows:
            docs = r.documents_json or {}
            # Ensure all 5 keys are present, even if null.
            for k in DOC_KEYS:
                docs.setdefault(k, None)
            matrix.append({
                "metric": r.metric,
                "documents": {k: docs.get(k) for k in DOC_KEYS},
                "status": r.status,
                "materiality": r.materiality,
                "ai_reasoning": r.ai_reasoning or "",
            })

        questions = db.query(FollowUpQuestion).filter_by(session_id=session_id).all()
        follow_ups = [
            {
                "question": q.question,
                "related_metric": q.related_metric,
                "severity": q.severity,
            }
            for q in questions
        ]

        return {
            "readiness_score": int(report.readiness_score or 0),
            "document_completeness_pct": int(report.document_completeness_pct or 0),
            "top_red_flags": list(report.top_red_flags_json or []),
            "top_strengths": list(report.top_strengths_json or []),
            "matrix": matrix,
            "follow_up_questions": follow_ups,
            "report_download_url": _build_api_url(session_id),
        }
    finally:
        db.close()


@app.get("/api/report/{session_id}/download")
async def download_report(session_id: str) -> FileResponse:
    db = SessionLocal()
    try:
        report = db.get(Report, session_id)
        if report is None or not report.report_pdf_path or not os.path.exists(report.report_pdf_path):
            raise HTTPException(status_code=404, detail="Report PDF not found")
        return FileResponse(
            report.report_pdf_path,
            media_type="application/pdf",
            filename=f"prism-report-{session_id}.pdf",
        )
    finally:
        db.close()
