"""
Stage 6 -- comparator.py

Deterministic (non-AI) cross-referencing of the metrics Stage 5 extracted
per document. Applies:
  - Financial Ontology & Synonym Mapping (app.ontology) to catch
    label-vs-canonical-key drift and flag "false friend" terms
  - the Tolerance & Materiality Matrix to classify numeric deltas as
    rounding_error / material_mismatch / critical_red_flag

Produces one row per locked metric with all documents' values side by side
and a computed materiality. Does NOT decide verified_mismatch vs.
unresolved_inconsistency vs. missing_information -- that tri-state
reasoning, plus the one-line justification, is Stage 7's job (a Gemini
call), since it requires judgment about *why* values differ, not just that
they do.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.models import ALL_DOC_TYPES, LOCKED_METRICS, Materiality
from app.ontology import synonym_risk_note

# --- Materiality thresholds (configurable) --------------------------------
# Percent relative difference between the min and max numeric values found
# for a metric across documents.
ROUNDING_ERROR_MAX_PCT = 2.0
MATERIAL_MISMATCH_MAX_PCT = 15.0
# anything above MATERIAL_MISMATCH_MAX_PCT is critical_red_flag

# Metrics where even a tiny absolute delta matters more than % (ownership
# in particular -- a 2% ownership discrepancy is not "rounding").
LOW_TOLERANCE_METRICS = {"ownership_pct"}
LOW_TOLERANCE_ROUNDING_MAX_PCT = 0.5
LOW_TOLERANCE_MATERIAL_MAX_PCT = 3.0

_NUMERIC_RE = re.compile(r"-?\d[\d,]*\.?\d*")


def _to_number(value: str) -> float | None:
    if not value:
        return None
    match = _NUMERIC_RE.search(value.replace(",", ""))
    if not match:
        return None
    try:
        return float(match.group().replace(",", ""))
    except ValueError:
        return None


@dataclass
class ComparisonRow:
    metric: str
    documents: dict[str, dict | None] = field(default_factory=dict)  # doc_type -> extracted entry
    materiality: Materiality = Materiality.ROUNDING_ERROR
    numeric_spread_pct: float | None = None
    synonym_notes: list[str] = field(default_factory=list)
    present_doc_count: int = 0


def _classify_materiality(metric: str, values: list[float]) -> tuple[Materiality, float | None]:
    if len(values) < 2:
        return Materiality.ROUNDING_ERROR, None
    lo, hi = min(values), max(values)
    if lo == 0 and hi == 0:
        return Materiality.ROUNDING_ERROR, 0.0
    denom = abs(hi) if hi != 0 else abs(lo) if lo != 0 else 1.0
    spread_pct = abs(hi - lo) / denom * 100

    if metric in LOW_TOLERANCE_METRICS:
        rounding_max, material_max = LOW_TOLERANCE_ROUNDING_MAX_PCT, LOW_TOLERANCE_MATERIAL_MAX_PCT
    else:
        rounding_max, material_max = ROUNDING_ERROR_MAX_PCT, MATERIAL_MISMATCH_MAX_PCT

    if spread_pct <= rounding_max:
        return Materiality.ROUNDING_ERROR, spread_pct
    if spread_pct <= material_max:
        return Materiality.MATERIAL_MISMATCH, spread_pct
    return Materiality.CRITICAL_RED_FLAG, spread_pct


def compare(extracted_by_doc_type: dict[str, dict]) -> list[ComparisonRow]:
    """
    extracted_by_doc_type: {doc_type: {"metrics": {metric_key: entry}}}
    for every doc_type present in the session (already resolved from
    file_id -> classified doc_type upstream).
    """
    rows: list[ComparisonRow] = []

    for metric in LOCKED_METRICS:
        row = ComparisonRow(metric=metric)
        numeric_values: list[float] = []

        for doc_type in ALL_DOC_TYPES:
            doc_data = extracted_by_doc_type.get(doc_type)
            entry = None
            if doc_data:
                entry = doc_data.get("metrics", {}).get(metric)
            row.documents[doc_type] = entry
            if entry:
                row.present_doc_count += 1
                note = synonym_risk_note(entry.get("value", ""))
                if note:
                    row.synonym_notes.append(f"{doc_type}: {note}")
                num = _to_number(str(entry.get("value", "")))
                if num is not None:
                    numeric_values.append(num)

        materiality, spread = _classify_materiality(metric, numeric_values)
        row.materiality = materiality
        row.numeric_spread_pct = spread
        rows.append(row)

    return rows
