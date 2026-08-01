"""
Prism backend -- FastAPI app wiring the API contract in Section 1 to the
Stage 1-8 pipeline. API-only: no frontend is served from here.
"""


import logging
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.auth import verify_firebase_token
from app.config import get_settings
from app.models import (
    ALL_DOC_TYPES,
    AnalyzeStatusResponse,
    DocType,
    FileStatus,
    ReportResponse,
    UploadedFileResult,
    UploadResponse,
)
from app.pdf.pdf_builder import build_report_pdf
from app.pipeline import run_pipeline
from app.rate_limit import limiter
from app.session_store import SessionState, session_store
from app.stages import doc_classifier, extractor, validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prism.main")

settings = get_settings()

app = FastAPI(title="Prism API", version="1.0.0")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return Response(content='{"detail":"Rate limit exceeded. Please slow down."}', status_code=429, media_type="application/json")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/upload
# ---------------------------------------------------------------------------


@app.post("/api/upload", response_model=UploadResponse)
@limiter.limit(settings.upload_rate_limit)
async def upload_documents(
    request: Request,
    files: list[UploadFile] = File(...),
    uid: str = Depends(verify_firebase_token),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    if len(files) > settings.max_files_per_upload:
        raise HTTPException(
            status_code=400, detail=f"Too many files; max {settings.max_files_per_upload} per upload."
        )

    session_id = str(uuid.uuid4())
    state = SessionState(session_id=session_id, uid=uid)

    results: list[UploadedFileResult] = []
    detected_types_present: set[str] = set()

    for upload in files:
        data = await upload.read()
        filename = upload.filename or "unnamed"
        file_id = str(uuid.uuid4())

        validation = validator.validate_file(filename, data)

        detected_type = DocType.UNKNOWN
        confidence = 0.0
        extracted_doc = None

        if validation.status == FileStatus.VALIDATED:
            extracted_doc = extractor.extract(filename, data)
            try:
                detected_type, confidence, _reasoning = doc_classifier.classify_document(extracted_doc)
            except Exception:
                logger.exception("Stage 3 classification failed for %s", filename)
                detected_type, confidence = DocType.UNKNOWN, 0.0

        state.files[file_id] = {
            "filename": filename,
            "detected_type": detected_type.value,
            "status": validation.status.value,
            "confidence": confidence,
            "_extracted_document": extracted_doc,
        }

        if detected_type != DocType.UNKNOWN and validation.status == FileStatus.VALIDATED:
            detected_types_present.add(detected_type.value)

        results.append(
            UploadedFileResult(
                file_id=file_id,
                filename=filename,
                detected_type=detected_type,
                status=validation.status,
                confidence=confidence,
            )
        )

    missing = [dt for dt in ALL_DOC_TYPES if dt not in detected_types_present]
    state.missing_document_types = missing
    state.stage = 3
    state.stage_name = "doc_classifier"
    session_store.save(state)

    return UploadResponse(session_id=session_id, files=results, missing_document_types=missing)


# ---------------------------------------------------------------------------
# GET /api/analyze/{session_id}/status
# ---------------------------------------------------------------------------


@app.get("/api/analyze/{session_id}/status", response_model=AnalyzeStatusResponse)
async def analyze_status(session_id: str, uid: str = Depends(verify_firebase_token)):
    state = session_store.get_or_404(session_id)
    _assert_owner(state, uid)
    return AnalyzeStatusResponse(
        stage=max(1, min(7, state.stage)),
        stage_name=state.stage_name,
        complete=state.complete,
    )


# ---------------------------------------------------------------------------
# POST /api/analyze/{session_id}
# ---------------------------------------------------------------------------


@app.post("/api/analyze/{session_id}", response_model=ReportResponse)
@limiter.limit(settings.analyze_rate_limit)
async def analyze_session(request: Request, session_id: str, uid: str = Depends(verify_firebase_token)):
    state = session_store.get_or_404(session_id)
    _assert_owner(state, uid)

    base_url = str(request.base_url).rstrip("/")
    try:
        report_dict = run_pipeline(session_id, base_download_url=base_url)
    except RuntimeError as exc:
        # e.g. GEMINI_API_KEY not configured -- surface honestly, don't fabricate a report
        raise HTTPException(status_code=503, detail=str(exc))
    return ReportResponse(**report_dict)


# ---------------------------------------------------------------------------
# GET /api/report/{session_id}
# ---------------------------------------------------------------------------


@app.get("/api/report/{session_id}", response_model=ReportResponse)
async def get_report(session_id: str, uid: str = Depends(verify_firebase_token)):
    state = session_store.get_or_404(session_id)
    _assert_owner(state, uid)
    if not state.report:
        raise HTTPException(
            status_code=409,
            detail="Analysis has not been run for this session yet. Call POST /api/analyze/{session_id} first.",
        )
    return ReportResponse(**state.report)


# ---------------------------------------------------------------------------
# GET /api/report/{session_id}/download
# ---------------------------------------------------------------------------


@app.get("/api/report/{session_id}/download")
async def download_report(session_id: str, uid: str = Depends(verify_firebase_token)):
    state = session_store.get_or_404(session_id)
    _assert_owner(state, uid)
    if not state.report:
        raise HTTPException(
            status_code=409,
            detail="Analysis has not been run for this session yet. Call POST /api/analyze/{session_id} first.",
        )

    if state.report_pdf is None:
        startup_name = _guess_startup_name(state)
        pdf_bytes, report_id, content_hash = build_report_pdf(
            state.report,
            startup_name=startup_name,
            session_id=session_id,
        )
        state.report_pdf = pdf_bytes
        session_store.save(state)

    return Response(
        content=state.report_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="prism-report-{session_id[:8]}.pdf"'},
    )


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _assert_owner(state: SessionState, uid: str) -> None:
    if state.uid != uid:
        # Same 404 as "not found" -- don't leak that the session exists but
        # belongs to someone else.
        raise HTTPException(status_code=404, detail="Session not found or expired.")


def _guess_startup_name(state: SessionState) -> str | None:
    """Best-effort only; the PDF template already handles None gracefully."""
    for file_record in state.files.values():
        extracted = file_record.get("_extracted_document")
        if extracted and file_record.get("detected_type") == "pitch_deck" and extracted.units:
            first_unit_text = extracted.units[0].text.strip()
            if first_unit_text:
                return first_unit_text.splitlines()[0][:80]
    return None
