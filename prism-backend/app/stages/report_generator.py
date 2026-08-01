"""
Stage 8 -- report_generator.py

Builds the final report JSON (exact shape of Section 1's ReportResponse)
from Stage 6/7 output, and hands that same JSON to the PDF builder so the
dashboard and the PDF can never show contradictory numbers -- the PDF is
rendered FROM this JSON, not recomputed independently.
"""
from __future__ import annotations

from app.models import FollowUpQuestion, MatrixRow, Materiality, MetricStatus, ReportResponse

_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
_MATERIALITY_WEIGHT = {
    Materiality.CRITICAL_RED_FLAG: 3,
    Materiality.MATERIAL_MISMATCH: 2,
    Materiality.ROUNDING_ERROR: 1,
}


def _compute_readiness_score(matrix: list[MatrixRow], document_completeness_pct: int) -> int:
    """
    Deterministic scorecard, not another AI call -- keeps the score
    reproducible and auditable. Starts at 100, deducts for each
    inconsistency/gap weighted by materiality and status, then blends in
    document completeness.
    """
    score = 100.0
    for row in matrix:
        weight = _MATERIALITY_WEIGHT.get(row.materiality, 1)
        if row.status == MetricStatus.VERIFIED_MISMATCH:
            score -= 8 * weight
        elif row.status == MetricStatus.UNRESOLVED_INCONSISTENCY:
            score -= 4 * weight
        elif row.status == MetricStatus.MISSING_INFORMATION:
            score -= 3
    # blend in completeness so missing whole document types also hurts
    score = 0.7 * score + 0.3 * document_completeness_pct
    return max(0, min(100, round(score)))


def _top_red_flags(matrix: list[MatrixRow], limit: int = 3) -> list[str]:
    flagged = [
        row
        for row in matrix
        if row.status in (MetricStatus.VERIFIED_MISMATCH, MetricStatus.UNRESOLVED_INCONSISTENCY)
    ]
    flagged.sort(key=lambda r: _MATERIALITY_WEIGHT.get(r.materiality, 0), reverse=True)
    return [f"{row.metric.replace('_', ' ').title()}: {row.ai_reasoning}" for row in flagged[:limit]]


def _top_strengths(matrix: list[MatrixRow], limit: int = 3) -> list[str]:
    clean = [
        row
        for row in matrix
        if row.status not in (MetricStatus.VERIFIED_MISMATCH,)
        and row.materiality == Materiality.ROUNDING_ERROR
        and row.status != MetricStatus.MISSING_INFORMATION
    ]
    return [
        f"{row.metric.replace('_', ' ').title()} is consistent across reported documents."
        for row in clean[:limit]
    ]


def _rank_follow_ups(questions: list[FollowUpQuestion], limit: int = 10) -> list[FollowUpQuestion]:
    return sorted(questions, key=lambda q: _SEVERITY_ORDER.get(q.severity.value, 3))[:limit]


def build_report(
    matrix: list[MatrixRow],
    follow_up_questions: list[FollowUpQuestion],
    document_completeness_pct: int,
    report_download_url: str,
) -> ReportResponse:
    readiness_score = _compute_readiness_score(matrix, document_completeness_pct)
    return ReportResponse(
        readiness_score=readiness_score,
        document_completeness_pct=document_completeness_pct,
        top_red_flags=_top_red_flags(matrix) or ["No material red flags found in the analyzed documents."],
        top_strengths=_top_strengths(matrix) or ["Not enough consistent multi-document metrics yet to highlight strengths."],
        matrix=matrix,
        follow_up_questions=_rank_follow_ups(follow_up_questions),
        report_download_url=report_download_url,
    )
