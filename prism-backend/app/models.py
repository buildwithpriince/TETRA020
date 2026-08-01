"""
Pydantic models. These mirror Section 1 of the spec exactly -- the frontend
is built against this shape, so field names/nesting must not drift.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------


class DocType(str, Enum):
    PITCH_DECK = "pitch_deck"
    MIS = "mis"
    FINANCIALS = "financials"
    PROJECTIONS = "projections"
    CAP_TABLE = "cap_table"
    UNKNOWN = "unknown"


class FileStatus(str, Enum):
    VALIDATED = "validated"
    CORRUPTED = "corrupted"
    MALWARE_FLAGGED = "malware_flagged"
    SCANNING = "scanning"


class MetricStatus(str, Enum):
    VERIFIED_MISMATCH = "verified_mismatch"
    UNRESOLVED_INCONSISTENCY = "unresolved_inconsistency"
    MISSING_INFORMATION = "missing_information"


class Materiality(str, Enum):
    ROUNDING_ERROR = "rounding_error"
    MATERIAL_MISMATCH = "material_mismatch"
    CRITICAL_RED_FLAG = "critical_red_flag"


class Severity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


LOCKED_METRICS: list[str] = [
    "revenue",
    "growth_rate",
    "customer_count",
    "cash_position_runway",
    "ownership_pct",
]

ALL_DOC_TYPES: list[str] = [
    "pitch_deck",
    "mis",
    "financials",
    "projections",
    "cap_table",
]

# ---------------------------------------------------------------------------
# Stage 1 / POST /api/upload
# ---------------------------------------------------------------------------


class UploadedFileResult(BaseModel):
    file_id: str
    filename: str
    detected_type: DocType
    status: FileStatus
    confidence: float = Field(ge=0.0, le=1.0)


class UploadResponse(BaseModel):
    session_id: str
    files: list[UploadedFileResult]
    missing_document_types: list[str]


# ---------------------------------------------------------------------------
# GET /api/analyze/{session_id}/status
# ---------------------------------------------------------------------------


class AnalyzeStatusResponse(BaseModel):
    stage: int = Field(ge=1, le=7)
    stage_name: str
    complete: bool


# ---------------------------------------------------------------------------
# Report body -- shared by POST /api/analyze and GET /api/report
# ---------------------------------------------------------------------------


class MetricEntry(BaseModel):
    value: str
    confidence: float = Field(ge=0.0, le=1.0)
    source_ref: str
    normalized_note: Optional[str] = None


class MetricDocuments(BaseModel):
    pitch_deck: Optional[MetricEntry] = None
    mis: Optional[MetricEntry] = None
    financials: Optional[MetricEntry] = None
    projections: Optional[MetricEntry] = None
    cap_table: Optional[MetricEntry] = None


class MatrixRow(BaseModel):
    metric: str
    documents: MetricDocuments
    status: MetricStatus
    materiality: Materiality
    ai_reasoning: str


class FollowUpQuestion(BaseModel):
    question: str
    related_metric: str
    severity: Severity


class ReportResponse(BaseModel):
    readiness_score: int = Field(ge=0, le=100)
    document_completeness_pct: int = Field(ge=0, le=100)
    top_red_flags: list[str]
    top_strengths: list[str]
    matrix: list[MatrixRow]
    follow_up_questions: list[FollowUpQuestion]
    report_download_url: str
