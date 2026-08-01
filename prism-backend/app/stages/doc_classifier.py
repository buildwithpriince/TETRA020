"""
Stage 3 -- doc_classifier.py

First of the three distinct Gemini calls. Narrow, single purpose: given the
extracted text/table preview of one file, decide which of the five
document types it is (or unknown), with a confidence score. Does NOT do
metric extraction or cross-checking -- that's Stages 5 and 7.
"""
from __future__ import annotations

from app.gemini_client import generate_json
from app.models import DocType
from app.stages.extractor import ExtractedDocument

_SYSTEM_PROMPT = """You are a document classifier for startup fundraising materials.

Given a text/table preview of a single uploaded file, classify it into
EXACTLY ONE of these types:
- "pitch_deck": investor presentation / slide deck, narrative + highlights
- "mis": Management Information System report, recurring internal
  operating metrics (usually monthly), e.g. monthly revenue, burn, users
- "financials": formal financial statements (P&L, balance sheet, cash flow)
- "projections": forward-looking financial model / forecast
- "cap_table": capitalization table listing shareholders and ownership %

If the content does not clearly match any of these, classify it as
"unknown". Do not guess confidently when the evidence is thin -- reflect
your uncertainty in the confidence score.

Respond ONLY with JSON of this exact shape, no other text:
{"detected_type": "pitch_deck|mis|financials|projections|cap_table|unknown",
 "confidence": 0.0-1.0,
 "reasoning": "one short sentence"}
"""


def classify_document(doc: ExtractedDocument, max_chars: int = 12000) -> tuple[DocType, float, str]:
    if doc.parse_error:
        return DocType.UNKNOWN, 0.0, f"Could not parse file: {doc.parse_error}"

    preview = doc.full_text()
    if not preview.strip():
        # text-light doc (e.g. a table-only xlsx) -- fall back to table preview
        table_preview_parts = []
        for unit in doc.units[:5]:
            for table in unit.tables[:2]:
                rows_preview = table[:15]
                table_preview_parts.append(f"[{unit.locator}]\n" + "\n".join(" | ".join(r) for r in rows_preview))
        preview = "\n\n".join(table_preview_parts)

    preview = preview[:max_chars]
    if not preview.strip():
        return DocType.UNKNOWN, 0.0, "No extractable text or tables found."

    user_content = f"Filename: {doc.filename}\n\nContent preview:\n{preview}"

    result = generate_json(_SYSTEM_PROMPT, user_content)
    detected = result.get("detected_type", "unknown")
    try:
        doc_type = DocType(detected)
    except ValueError:
        doc_type = DocType.UNKNOWN
    confidence = float(result.get("confidence", 0.0))
    reasoning = str(result.get("reasoning", ""))
    return doc_type, max(0.0, min(1.0, confidence)), reasoning
