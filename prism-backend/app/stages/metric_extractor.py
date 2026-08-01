"""
Stage 5 -- metric_extractor.py

Second of the three distinct Gemini calls. Narrow, single purpose: given
one document's extracted content plus Stage 4's normalization hints,
extract ONLY the five locked metrics into structured JSON, each with a
confidence score, a precise source_ref, and a normalized_note when a value
required currency/unit/fiscal conversion. Does not compare across
documents or reason about mismatches -- that's Stages 6 and 7.
"""
from __future__ import annotations

from app.gemini_client import generate_json
from app.models import LOCKED_METRICS
from app.stages.extractor import ExtractedDocument
from app.stages.normalizer import build_normalization_hints, hints_as_prompt_block

_SYSTEM_PROMPT = f"""You are a financial metric extractor for startup fundraising documents.

Extract ONLY these five locked metrics, if present, from the given document.
Do not extract anything else, and do not comment on other documents --
you only see this one document.

Locked metrics (canonical keys):
{LOCKED_METRICS}

For each metric found, provide:
- "value": the extracted value as a string, normalized to a single
  reporting currency/scale where the document mixes units (state the
  normalized value, not the raw one)
- "confidence": 0.0-1.0, your genuine confidence this value is correct and
  correctly attributed to this metric
- "source_ref": precise locator, e.g. "slide 8", "sheet 'MIS Jun-25', row 12",
  "page 3, table 2" -- must be precise enough for a human to jump straight
  to the value in the source document
- "normalized_note": a short string ONLY if you converted currency, scale
  (e.g. lakhs/crores/millions), or a fiscal period to align it -- e.g.
  "converted from ₹12L to absolute INR", "converted FY24-Q4 to calendar
  Jan-Mar 2024". Omit (use null) if no conversion was needed.

If a locked metric is not present in this document, omit it entirely
(do not fabricate a value).

Respond ONLY with JSON of this exact shape, no other text:
{{"metrics": {{
    "revenue": {{"value": "...", "confidence": 0.0, "source_ref": "...", "normalized_note": null}},
    "growth_rate": {{...}} ,
    "customer_count": {{...}},
    "cash_position_runway": {{...}},
    "ownership_pct": {{...}}
  }}
}}
Only include keys for metrics actually found.
"""


def extract_metrics(doc: ExtractedDocument, max_chars: int = 20000) -> dict:
    """
    Returns {"metrics": {metric_key: {value, confidence, source_ref,
    normalized_note}}}. Returns {"metrics": {}} for unparseable documents
    rather than raising, so one bad file doesn't abort the whole pipeline.
    """
    if doc.parse_error:
        return {"metrics": {}}

    text_preview = doc.full_text()
    hints = build_normalization_hints(text_preview)

    table_preview_parts = []
    for unit in doc.units:
        for table in unit.tables[:3]:
            rows_preview = table[:40]
            table_preview_parts.append(f"[{unit.locator}]\n" + "\n".join(" | ".join(r) for r in rows_preview))
    table_preview = "\n\n".join(table_preview_parts)

    combined = (text_preview + "\n\n" + table_preview)[:max_chars]
    if not combined.strip():
        return {"metrics": {}}

    user_content = (
        f"Filename: {doc.filename}\n\n"
        f"{hints_as_prompt_block(hints)}\n"
        f"Document content:\n{combined}"
    )

    result = generate_json(_SYSTEM_PROMPT, user_content)
    metrics = result.get("metrics", {})
    # defensive: drop anything not in the locked list
    return {"metrics": {k: v for k, v in metrics.items() if k in LOCKED_METRICS}}
