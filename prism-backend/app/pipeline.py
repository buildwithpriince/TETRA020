"""
Orchestrates Stages 1-8 against a session's already-validated, already-
extracted files. Upload (Stages 1-2 + Stage 3 classification) happens
eagerly in the /api/upload route; this module runs Stages 4-8, updating
`SessionState.stage`/`stage_name` as it progresses so
GET /api/analyze/{id}/status reflects real progress.
"""
from __future__ import annotations

import logging

from app.models import ALL_DOC_TYPES, FollowUpQuestion, MatrixRow
from app.session_store import SessionState, session_store
from app.stages import classifier, comparator, metric_extractor
from app.stages.extractor import ExtractedDocument

logger = logging.getLogger("prism.pipeline")

_STAGE_NAMES = {
    4: "normalizer",
    5: "metric_extractor",
    6: "comparator",
    7: "classifier",
    8: "report_generator",
}


def _set_stage(state: SessionState, stage: int) -> None:
    state.stage = stage
    state.stage_name = _STAGE_NAMES.get(stage, "unknown")
    session_store.save(state)


def run_pipeline(session_id: str, base_download_url: str) -> dict:
    """
    Runs Stages 4-8 for a session and returns the final report dict
    (matches ReportResponse). Mutates and persists SessionState as it goes.
    """
    state = session_store.get_or_404(session_id)

    # Stage 4/5: normalize (folded into metric_extractor's use of
    # normalizer hints) + extract metrics, per validated file, grouped by
    # its Stage-3-classified doc_type. If two files share a doc_type, the
    # highest-classification-confidence one wins to avoid ambiguous rows.
    _set_stage(state, 4)
    _set_stage(state, 5)

    extracted_by_doc_type: dict[str, dict] = {}
    best_confidence: dict[str, float] = {}

    for file_id, file_record in state.files.items():
        doc_type = file_record.get("detected_type")
        if doc_type not in ALL_DOC_TYPES:
            continue
        if file_record.get("status") != "validated":
            continue

        extracted_doc: ExtractedDocument = file_record["_extracted_document"]
        metrics_result = metric_extractor.extract_metrics(extracted_doc)

        conf = file_record.get("confidence", 0.0)
        if doc_type not in best_confidence or conf > best_confidence[doc_type]:
            best_confidence[doc_type] = conf
            extracted_by_doc_type[doc_type] = metrics_result

    state.extracted_metrics = extracted_by_doc_type
    session_store.save(state)

    # Stage 6: deterministic comparison + ontology mapping
    _set_stage(state, 6)
    comparison_rows = comparator.compare(extracted_by_doc_type)
    state.comparison_result = {"rows": [r.metric for r in comparison_rows]}
    session_store.save(state)

    # Stage 7: tri-state reasoning + follow-up questions (one Gemini call
    # per metric row)
    _set_stage(state, 7)
    matrix_rows: list[MatrixRow] = []
    all_questions: list[FollowUpQuestion] = []
    for row in comparison_rows:
        matrix_row, questions = classifier.classify_row(row)
        matrix_rows.append(matrix_row)
        all_questions.extend(questions)

    # Stage 8: assemble report JSON + branded PDF
    _set_stage(state, 8)
    present_types = {ft.get("detected_type") for ft in state.files.values() if ft.get("status") == "validated"}
    present_types &= set(ALL_DOC_TYPES)
    document_completeness_pct = round(len(present_types) / len(ALL_DOC_TYPES) * 100)

    from app.stages.report_generator import build_report

    report = build_report(
        matrix=matrix_rows,
        follow_up_questions=all_questions,
        document_completeness_pct=document_completeness_pct,
        report_download_url=f"{base_download_url}/api/report/{session_id}/download",
    )
    report_dict = report.model_dump(mode="json")

    state.report = report_dict
    state.report_pdf = None  # invalidate any stale cached PDF; rebuilt lazily on first download
    state.stage = 8
    state.stage_name = "complete"
    state.complete = True
    session_store.save(state)

    return report_dict
