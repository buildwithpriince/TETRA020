"""
Stage 4 -- normalizer.py

Deterministic (non-AI) currency/unit normalization and fiscal/calendar
timeline alignment, applied BEFORE metric extraction so Stage 5 already
sees apples-to-apples numbers where possible, and so any conversions can be
surfaced later as a `normalized_note` on the extracted value.

This stage doesn't try to extract the metrics itself (that's Stage 5's
job) -- it prepares lightweight, deterministic hints that Stage 5's prompt
includes, plus a set of conversion rules Stage 5 is told to apply and
annotate.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# --- Currency / unit conventions we can detect deterministically ---------

_UNIT_MULTIPLIERS = {
    "lakh": 100_000,
    "lakhs": 100_000,
    "crore": 10_000_000,
    "crores": 10_000_000,
    "k": 1_000,
    "m": 1_000_000,
    "mn": 1_000_000,
    "million": 1_000_000,
    "bn": 1_000_000_000,
    "billion": 1_000_000_000,
}

_CURRENCY_SYMBOLS = {
    "₹": "INR",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
}

_FISCAL_YEAR_PATTERN = re.compile(r"\bFY\s?(\d{2,4})\b", re.IGNORECASE)
_MONTH_PATTERN = re.compile(
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?[\-\/']?\s?(\d{2,4})\b",
    re.IGNORECASE,
)


@dataclass
class NormalizationHints:
    detected_currencies: set[str]
    detected_scale_units: set[str]
    detected_fiscal_years: set[str]
    detected_month_periods: set[str]
    conversion_rules_note: str


def build_normalization_hints(text: str) -> NormalizationHints:
    """
    Scans a document's extracted text for currency symbols, scale words
    (lakh/crore/million/etc.), fiscal-year markers, and month-year periods.
    These are passed to the Stage 5 extraction prompt as context, and the
    prompt is instructed to normalize every locked metric to a single
    target currency/scale and ISO-ish period, annotating any value that
    required conversion with `normalized_note`.
    """
    detected_currencies = {sym_name for sym, sym_name in _CURRENCY_SYMBOLS.items() if sym in text}
    # also catch bare "INR"/"USD" mentions
    for code in ("INR", "USD", "EUR", "GBP"):
        if re.search(rf"\b{code}\b", text):
            detected_currencies.add(code)

    detected_scale_units = {
        unit for unit in _UNIT_MULTIPLIERS if re.search(rf"\b{unit}\b", text, re.IGNORECASE)
    }

    detected_fiscal_years = set(_FISCAL_YEAR_PATTERN.findall(text))
    detected_month_periods = {f"{m}{y}" for m, y in _MONTH_PATTERN.findall(text)}

    note_parts = []
    if len(detected_currencies) > 1:
        note_parts.append(
            f"Multiple currencies detected ({', '.join(sorted(detected_currencies))}); "
            "normalize all locked metrics to a single reporting currency and note the conversion."
        )
    if detected_scale_units:
        note_parts.append(
            f"Scale units detected ({', '.join(sorted(detected_scale_units))}); "
            "convert to absolute numbers and note the original scale/unit."
        )
    if detected_fiscal_years or detected_month_periods:
        note_parts.append(
            "Fiscal-year and/or month-year periods detected; align all extracted periods to a "
            "consistent calendar reference (e.g. calendar-month) and note any fiscal-to-calendar shift."
        )

    return NormalizationHints(
        detected_currencies=detected_currencies,
        detected_scale_units=detected_scale_units,
        detected_fiscal_years=detected_fiscal_years,
        detected_month_periods=detected_month_periods,
        conversion_rules_note=" ".join(note_parts) or "No obvious multi-currency/multi-scale/fiscal-shift signals detected.",
    )


def hints_as_prompt_block(hints: NormalizationHints) -> str:
    return (
        "Normalization hints (deterministic pre-scan, verify against actual content):\n"
        f"- Currencies mentioned: {sorted(hints.detected_currencies) or 'none detected'}\n"
        f"- Scale units mentioned: {sorted(hints.detected_scale_units) or 'none detected'}\n"
        f"- Fiscal year markers: {sorted(hints.detected_fiscal_years) or 'none detected'}\n"
        f"- Month-year periods: {sorted(hints.detected_month_periods) or 'none detected'}\n"
        f"- Guidance: {hints.conversion_rules_note}\n"
    )
