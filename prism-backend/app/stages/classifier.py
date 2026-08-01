"""
Stage 7 -- classifier.py

Third of the three distinct Gemini calls. Narrow, single purpose: given
Stage 6's comparison rows (values across documents + computed
materiality), decide the tri-state status per metric:
  - verified_mismatch: documents genuinely disagree on a value that should
    be the same, and there's no obvious explanation
  - unresolved_inconsistency: values differ but there's a plausible
    definitional/timing reason that can't be confirmed from the documents
    alone
  - missing_information: not enough documents/values to compare at all

Also generates the ranked, investor-style follow-up questions here, since
they depend on the same judgment about *why* something looks off.
"""
from __future__ import annotations

from app.gemini_client import generate_json
from app.models import FollowUpQuestion, MatrixRow, MetricDocuments, MetricEntry, MetricStatus, Severity
from app.stages.comparator import ComparisonRow

_SYSTEM_PROMPT = """You are a VC diligence analyst reasoning about cross-document
financial consistency for a single metric at a time.

You will be given, for one locked metric, the values found in each
document type (or null if absent) plus a pre-computed materiality
(rounding_error / material_mismatch / critical_red_flag) and any synonym
risk notes. Decide the metric's status:

- "verified_mismatch": multiple documents report this metric with genuinely
  different values and no clear definitional/timing reason explains it
- "unresolved_inconsistency": values differ, but a plausible reason (e.g.
  different reporting periods, different metric definitions, one document
  being older) means it's unresolved rather than definitively wrong
- "missing_information": fewer than two documents report this metric, so
  there isn't enough to compare

Write ONE short, precise sentence explaining your reasoning
("ai_reasoning"). Do not give investment advice or a valuation opinion --
you are only assessing consistency and completeness.

Then generate 0-2 ranked, investor-style follow-up questions the analyst
should ask the startup about this specific metric, each with a severity
(high/medium/low) reflecting how material the gap is to fundraising
diligence. Skip follow-up questions if the metric is fully consistent.

Respond ONLY with JSON of this exact shape, no other text:
{"status": "verified_mismatch|unresolved_inconsistency|missing_information",
 "ai_reasoning": "one sentence",
 "follow_up_questions": [{"question": "...", "severity": "high|medium|low"}]}
"""


def _entry_to_metric_entry(entry: dict | None) -> MetricEntry | None:
    if not entry:
        return None
    return MetricEntry(
        value=str(entry.get("value", "")),
        confidence=float(entry.get("confidence", 0.0)),
        source_ref=str(entry.get("source_ref", "")),
        normalized_note=entry.get("normalized_note"),
    )


def classify_row(row: ComparisonRow) -> tuple[MatrixRow, list[FollowUpQuestion]]:
    documents_payload = {
        doc_type: entry for doc_type, entry in row.documents.items() if entry is not None
    }

    if row.present_doc_count == 0:
        status = MetricStatus.MISSING_INFORMATION
        reasoning = f"No document in this session reported '{row.metric}'."
        questions: list[FollowUpQuestion] = [
            FollowUpQuestion(
                question=f"Can you provide documentation showing {row.metric.replace('_', ' ')}?",
                related_metric=row.metric,
                severity=Severity.HIGH,
            )
        ]
    elif row.present_doc_count == 1:
        status = MetricStatus.MISSING_INFORMATION
        only_doc = next(dt for dt, e in row.documents.items() if e is not None)
        reasoning = f"'{row.metric}' was only found in {only_doc}; no other document to cross-check against."
        questions = [
            FollowUpQuestion(
                question=f"Can you confirm {row.metric.replace('_', ' ')} in your other fundraising documents?",
                related_metric=row.metric,
                severity=Severity.MEDIUM,
            )
        ]
    else:
        user_content = (
            f"Metric: {row.metric}\n"
            f"Values by document: {documents_payload}\n"
            f"Pre-computed materiality: {row.materiality.value}\n"
            f"Numeric spread: {row.numeric_spread_pct}%\n"
            f"Synonym risk notes: {row.synonym_notes or 'none'}\n"
        )
        result = generate_json(_SYSTEM_PROMPT, user_content)
        try:
            status = MetricStatus(result.get("status", "unresolved_inconsistency"))
        except ValueError:
            status = MetricStatus.UNRESOLVED_INCONSISTENCY
        reasoning = str(result.get("ai_reasoning", ""))
        questions = [
            FollowUpQuestion(
                question=str(q.get("question", "")),
                related_metric=row.metric,
                severity=Severity(q.get("severity", "medium")) if q.get("severity") in ("high", "medium", "low") else Severity.MEDIUM,
            )
            for q in result.get("follow_up_questions", [])
        ]

    matrix_row = MatrixRow(
        metric=row.metric,
        documents=MetricDocuments(
            pitch_deck=_entry_to_metric_entry(row.documents.get("pitch_deck")),
            mis=_entry_to_metric_entry(row.documents.get("mis")),
            financials=_entry_to_metric_entry(row.documents.get("financials")),
            projections=_entry_to_metric_entry(row.documents.get("projections")),
            cap_table=_entry_to_metric_entry(row.documents.get("cap_table")),
        ),
        status=status,
        materiality=row.materiality,
        ai_reasoning=reasoning,
    )
    return matrix_row, questions
