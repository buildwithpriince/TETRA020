"""Analysis pipeline: extract → reconcile → classify → summarize.

Runs as an asyncio background task, updates session stage in the DB
between phases so the frontend's status poll always has something to show.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from db import (
    AnalysisSession,
    FollowUpQuestion,
    MatrixRow,
    Report,
    UploadedFile,
    SessionLocal,
)
from gemini_client import json_call
from parsers import ParsedDocument, parse_document
from pdf_report import render_report_pdf

log = logging.getLogger("prism.pipeline")

ANALYSIS_STAGES: List[str] = [
    "Ingesting documents",
    "Extracting figures & text",
    "Normalizing currency & calendar",
    "Mapping financial ontology",
    "Cross-referencing metrics",
    "Scoring materiality & confidence",
    "Compiling diligence report",
]

DOC_KEYS = ["pitch_deck", "mis", "financials", "projections", "cap_table"]

METRIC_TAXONOMY = [
    "Revenue (FY24)",
    "Gross Margin",
    "EBITDA Margin",
    "Burn Rate",
    "Active Customers",
    "Churn %",
    "Customer Acquisition Cost",
    "LTV",
    "Cash Balance",
    "Cash Runway",
    "Founder Ownership",
    "Cap Table Sum",
    "ESOP Pool",
    "Round Size",
    "Valuation",
    "Total Addressable Market",
    "Growth Rate (CAGR)",
]

_EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "metrics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "metric": {"type": "string"},
                    "value": {"type": "string"},
                    "confidence": {"type": "number"},
                    "source_ref": {"type": "string"},
                    "normalized_note": {"type": "string"},
                },
                "required": ["metric", "value", "confidence", "source_ref"],
            },
        }
    },
    "required": ["metrics"],
}

_RECONCILE_SCHEMA = {
    "type": "object",
    "properties": {
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "metric": {"type": "string"},
                    "status": {"type": "string"},
                    "materiality": {"type": "string"},
                    "ai_reasoning": {"type": "string"},
                },
                "required": ["metric", "status", "materiality", "ai_reasoning"],
            },
        }
    },
    "required": ["rows"],
}

_SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "top_red_flags": {"type": "array", "items": {"type": "string"}},
        "top_strengths": {"type": "array", "items": {"type": "string"}},
        "follow_up_questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "related_metric": {"type": "string"},
                    "severity": {"type": "string"},
                },
                "required": ["question", "related_metric", "severity"],
            },
        },
    },
    "required": ["top_red_flags", "top_strengths", "follow_up_questions"],
}


# ---------- Stage helpers ----------------------------------------------------


def _set_stage(db: Session, session_id: str, stage_idx: int, complete: bool = False) -> None:
    """Update session stage 1-indexed; stage_idx is the current 1..7."""
    s = db.get(AnalysisSession, session_id)
    if s is None:
        return
    s.stage = stage_idx
    s.stage_name = ANALYSIS_STAGES[stage_idx - 1] if 1 <= stage_idx <= len(ANALYSIS_STAGES) else ""
    if complete:
        s.complete = True
    db.commit()


# ---------- Gemini calls ----------------------------------------------------


async def _extract_metrics_from_doc(doc: ParsedDocument) -> List[Dict[str, Any]]:
    prompt = (
        "You are extracting financial metrics from a startup fundraising document.\n"
        f"Document type: {doc.detected_type}\n"
        f"Filename: {doc.filename}\n"
        f"Metric taxonomy to extract (only include what appears in the doc): {METRIC_TAXONOMY}\n"
        "For each value found, return: metric (use taxonomy label), value (as it appears, with units), "
        "confidence 0..1, source_ref (page/slide/sheet ref from the [tags] below), and normalized_note "
        "only if you converted units/currency/period.\n"
        "Return ONLY JSON with shape {\"metrics\":[{...}]}.\n\n"
        "DOCUMENT CONTENT:\n"
        f"{doc.joined()}\n"
    )
    result = await json_call(prompt, response_schema=_EXTRACT_SCHEMA, fallback={"metrics": []})
    return result.get("metrics", []) if isinstance(result, dict) else []


async def _reconcile_rows(matrix: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Ask Gemini to classify status/materiality per matrix row."""
    slim = [{"metric": r["metric"], "documents": r["documents"]} for r in matrix]
    prompt = (
        "You are reconciling metrics found across multiple fundraising documents.\n"
        "For each row below, classify:\n"
        "- status: 'verified_mismatch' | 'unresolved_inconsistency' | 'missing_information'\n"
        "- materiality: 'rounding_error' | 'material_mismatch' | 'critical_red_flag'\n"
        "- ai_reasoning: 1-3 sentences explaining WHY, referencing values.\n\n"
        "Rules:\n"
        "- If a metric is present in ≥2 docs and values agree within ~2% (or definitional variance is plausible), "
        "status=unresolved_inconsistency + materiality=rounding_error.\n"
        "- If a metric is present in ≥2 docs and values disagree materially with no plausible unit/period explanation, "
        "status=verified_mismatch. Materiality=critical_red_flag when the gap is >15% OR the metric involves cash / "
        "ownership / cap-table sums; otherwise material_mismatch.\n"
        "- If the metric is expected but absent everywhere or only stated in one doc without corroboration, "
        "status=missing_information. Materiality=critical_red_flag for TAM/cap-table-related absences, otherwise "
        "material_mismatch.\n"
        "- Cap Table Sum MUST sum to ~100%. Anything off by >1% is a critical_red_flag verified_mismatch.\n\n"
        f"Rows:\n{json.dumps(slim, ensure_ascii=False)}\n\n"
        "Return ONLY JSON of shape {\"rows\":[{metric,status,materiality,ai_reasoning}]}."
    )
    result = await json_call(prompt, response_schema=_RECONCILE_SCHEMA, fallback={"rows": []})
    return result.get("rows", []) if isinstance(result, dict) else []


async def _summarize(matrix: List[Dict[str, Any]]) -> Dict[str, Any]:
    prompt = (
        "You are writing the executive summary of a startup due-diligence report.\n"
        "Based on the reconciled matrix below, produce:\n"
        "- top_red_flags: 3-5 short bullets (one sentence each), highest severity issues first.\n"
        "- top_strengths: 3-5 short bullets on where the story holds up.\n"
        "- follow_up_questions: one question per unresolved_inconsistency or missing_information row, "
        "each with related_metric and severity ('high'|'medium'|'low').\n\n"
        f"Matrix:\n{json.dumps(matrix, ensure_ascii=False)}\n\n"
        "Return ONLY JSON matching {top_red_flags, top_strengths, follow_up_questions}."
    )
    fallback = {"top_red_flags": [], "top_strengths": [], "follow_up_questions": []}
    return await json_call(prompt, response_schema=_SUMMARY_SCHEMA, fallback=fallback)


# ---------- Matrix assembly -------------------------------------------------


def _build_matrix(extracts_by_doc: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Combine per-document extractions into MatrixRow structure."""
    by_metric: Dict[str, Dict[str, Optional[Dict[str, Any]]]] = {}
    for doc_key, metrics in extracts_by_doc.items():
        for m in metrics:
            name = (m.get("metric") or "").strip()
            if not name:
                continue
            entry = {
                "value": str(m.get("value", "")),
                "confidence": float(m.get("confidence", 0.7) or 0.7),
                "source_ref": str(m.get("source_ref") or ""),
            }
            note = m.get("normalized_note")
            if note:
                entry["normalized_note"] = str(note)
            row = by_metric.setdefault(name, {k: None for k in DOC_KEYS})
            # If a metric appears twice in the same doc, keep the highest-confidence one.
            existing = row.get(doc_key)
            if existing is None or entry["confidence"] > (existing.get("confidence") or 0):
                row[doc_key] = entry

    rows: List[Dict[str, Any]] = []
    for metric, docs in by_metric.items():
        rows.append({
            "metric": metric,
            "documents": docs,
            "status": "unresolved_inconsistency",
            "materiality": "rounding_error",
            "ai_reasoning": "",
        })
    # Sort: rows with most doc coverage first, then alphabetical
    rows.sort(key=lambda r: (-sum(1 for v in r["documents"].values() if v), r["metric"]))
    return rows


def _score(matrix: List[Dict[str, Any]], uploaded_types: set[str]) -> tuple[int, int]:
    score = 100
    for r in matrix:
        if r["status"] == "verified_mismatch":
            score -= 8
        elif r["status"] == "unresolved_inconsistency":
            score -= 4
        elif r["status"] == "missing_information":
            score -= 2
    score = max(0, score)
    expected = {"pitch_deck", "mis", "financials", "projections", "cap_table"}
    completeness = int(100 * len(uploaded_types & expected) / len(expected))
    return score, completeness


# ---------- Main entrypoint -------------------------------------------------


async def run_analysis(session_id: str, storage_root: str) -> None:
    """Full 7-stage pipeline; each stage bumps the session row so status polls work."""
    db = SessionLocal()
    try:
        session = db.get(AnalysisSession, session_id)
        if session is None:
            log.warning("run_analysis: no session %s", session_id)
            return
        files: List[UploadedFile] = list(session.files)
        log.info("pipeline start %s (%d files)", session_id, len(files))

        # Stage 1: Ingesting documents
        _set_stage(db, session_id, 1)
        await asyncio.sleep(0.4)

        # Stage 2: Extracting figures & text (parse + Gemini per doc)
        _set_stage(db, session_id, 2)
        parsed_docs: List[ParsedDocument] = []
        for f in files:
            parsed_docs.append(parse_document(f.storage_path, f.filename, f.detected_type))
        await asyncio.sleep(0.3)

        extracts: Dict[str, List[Dict[str, Any]]] = {}
        # Batch: one Gemini call per document (spec: "one call per document for the full metric taxonomy")
        extract_tasks = []
        keys_order: List[str] = []
        for pd in parsed_docs:
            if pd.detected_type in DOC_KEYS and pd.chunks:
                extract_tasks.append(_extract_metrics_from_doc(pd))
                keys_order.append(pd.detected_type)
        results = await asyncio.gather(*extract_tasks, return_exceptions=True)
        for key, res in zip(keys_order, results):
            if isinstance(res, Exception):
                log.warning("extract failed for %s: %s", key, res)
                extracts.setdefault(key, [])
                continue
            extracts.setdefault(key, []).extend(res or [])

        # Stage 3: Normalizing (no-op quick pass, normalization already noted per-value)
        _set_stage(db, session_id, 3)
        await asyncio.sleep(0.5)

        # Stage 4: Mapping ontology (build the matrix)
        _set_stage(db, session_id, 4)
        matrix = _build_matrix(extracts)
        await asyncio.sleep(0.4)

        # Stage 5: Cross-referencing (one Gemini reconciliation call)
        _set_stage(db, session_id, 5)
        classifications: List[Dict[str, Any]] = []
        if matrix:
            classifications = await _reconcile_rows(matrix)
        cls_map = {c["metric"]: c for c in classifications}
        for row in matrix:
            c = cls_map.get(row["metric"])
            if c:
                row["status"] = _valid_status(c.get("status"))
                row["materiality"] = _valid_materiality(c.get("materiality"))
                row["ai_reasoning"] = c.get("ai_reasoning") or ""
            else:
                # Heuristic default: count docs with values
                present = [v for v in row["documents"].values() if v]
                if len(present) <= 1:
                    row["status"] = "missing_information"
                    row["materiality"] = "material_mismatch"
                    row["ai_reasoning"] = "Only one document reports this metric; not cross-verified."

        # Stage 6: Scoring
        _set_stage(db, session_id, 6)
        uploaded_types = {f.detected_type for f in files}
        readiness, completeness = _score(matrix, uploaded_types)
        await asyncio.sleep(0.3)

        # Stage 7: Compile PDF + summary
        _set_stage(db, session_id, 7)
        summary = await _summarize(matrix) if matrix else {
            "top_red_flags": [],
            "top_strengths": [],
            "follow_up_questions": [],
        }
        top_red = list(summary.get("top_red_flags", []))[:5]
        top_strengths = list(summary.get("top_strengths", []))[:5]
        follow_ups = list(summary.get("follow_up_questions", []))

        # Persist matrix + follow-ups + report
        db.query(MatrixRow).filter_by(session_id=session_id).delete()
        db.query(FollowUpQuestion).filter_by(session_id=session_id).delete()
        for row in matrix:
            db.add(MatrixRow(
                id=str(uuid.uuid4()),
                session_id=session_id,
                metric=row["metric"],
                documents_json=row["documents"],
                status=row["status"],
                materiality=row["materiality"],
                ai_reasoning=row["ai_reasoning"],
            ))
        for q in follow_ups:
            db.add(FollowUpQuestion(
                id=str(uuid.uuid4()),
                session_id=session_id,
                question=str(q.get("question", "")),
                related_metric=str(q.get("related_metric", "")),
                severity=_valid_severity(q.get("severity")),
            ))

        report_payload = {
            "readiness_score": readiness,
            "document_completeness_pct": completeness,
            "top_red_flags": top_red,
            "top_strengths": top_strengths,
            "matrix": matrix,
            "follow_up_questions": [
                {
                    "question": str(q.get("question", "")),
                    "related_metric": str(q.get("related_metric", "")),
                    "severity": _valid_severity(q.get("severity")),
                }
                for q in follow_ups
            ],
        }
        pdf_path = f"{storage_root}/{session_id}/report.pdf"
        render_report_pdf(session_id, report_payload, pdf_path)

        existing = db.get(Report, session_id)
        if existing:
            db.delete(existing)
            db.flush()
        db.add(Report(
            session_id=session_id,
            readiness_score=readiness,
            document_completeness_pct=completeness,
            top_red_flags_json=top_red,
            top_strengths_json=top_strengths,
            report_pdf_path=pdf_path,
        ))

        _set_stage(db, session_id, 7, complete=True)
        log.info("pipeline done %s", session_id)
    except Exception as e:  # noqa: BLE001
        log.exception("pipeline failed for %s: %s", session_id, e)
        try:
            _set_stage(db, session_id, 7, complete=True)
        except Exception:  # noqa: BLE001
            pass
    finally:
        db.close()


# ---------- Enum guards -----------------------------------------------------


_STATUSES = {"verified_mismatch", "unresolved_inconsistency", "missing_information"}
_MATERIALITIES = {"rounding_error", "material_mismatch", "critical_red_flag"}
_SEVERITIES = {"high", "medium", "low"}


def _valid_status(s: Any) -> str:
    return s if s in _STATUSES else "unresolved_inconsistency"


def _valid_materiality(m: Any) -> str:
    return m if m in _MATERIALITIES else "material_mismatch"


def _valid_severity(v: Any) -> str:
    return v if v in _SEVERITIES else "medium"
