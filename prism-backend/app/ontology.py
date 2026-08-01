"""
Financial Ontology & Synonym Mapping.

A lookup table recognizing that different documents describe the same
locked metric with different vocabulary (e.g. a pitch deck says "Top Line",
a financial statement says "Income from Operations"). Stage 5 extraction
prompts ask Gemini to map to a canonical metric key directly; this table is
the deterministic backstop used by Stage 6 (comparator) to (a) catch cases
where the extraction step used a raw label instead of the canonical key,
and (b) flag terms that *look* synonymous but carry a real risk of meaning
something different (e.g. "Revenue" vs "Bookings" are commonly conflated
but are not the same thing) so the tri-state classifier can call that out
rather than silently equating them.
"""
from __future__ import annotations

# canonical_metric_key -> set of accepted synonyms (lowercased)
SYNONYMS: dict[str, set[str]] = {
    "revenue": {
        "revenue",
        "top line",
        "topline",
        "sales",
        "net sales",
        "income from operations",
        "operating income (revenue sense)",
        "total revenue",
    },
    "growth_rate": {
        "growth rate",
        "mom growth",
        "qoq growth",
        "month over month growth",
        "quarter over quarter growth",
        "revenue growth",
        "growth %",
    },
    "customer_count": {
        "customer count",
        "user count",
        "active users",
        "customers",
        "total customers",
        "subscriber count",
        "mau",
        "dau",
        "user base",
    },
    "cash_position_runway": {
        "cash position",
        "cash balance",
        "runway",
        "cash runway",
        "months of runway",
        "bank balance",
        "cash in bank",
    },
    "ownership_pct": {
        "ownership %",
        "ownership percentage",
        "equity stake",
        "shareholding %",
        "cap table ownership",
        "founder ownership",
        "stake",
    },
}

# Terms that are frequently confused with a locked metric but are NOT
# reliably equivalent -- if extraction lands on one of these, Stage 6 should
# raise a synonym-risk note rather than silently treating it as a match.
FALSE_FRIENDS: dict[str, set[str]] = {
    "revenue": {"bookings", "gmv", "gross merchandise value", "contracted revenue", "arr booked"},
    "growth_rate": {"projected growth", "target growth", "cagr (multi-year)"},
    "customer_count": {"leads", "signups", "trial users", "waitlist"},
    "cash_position_runway": {"revenue run rate", "arr"},
    "ownership_pct": {"valuation share", "option pool size"},
}


def canonicalize(label: str) -> str | None:
    """Map a free-text label to a canonical locked-metric key, if possible."""
    normalized = label.strip().lower()
    for canonical, synonyms in SYNONYMS.items():
        if normalized in synonyms or normalized == canonical:
            return canonical
    return None


def synonym_risk_note(label: str) -> str | None:
    """
    If a label matches a known false-friend for some canonical metric,
    return a warning string; otherwise None.
    """
    normalized = label.strip().lower()
    for canonical, false_friends in FALSE_FRIENDS.items():
        if normalized in false_friends:
            return (
                f"Term '{label}' resembles '{canonical}' but is not reliably "
                f"the same measure -- treat any cross-document match with caution."
            )
    return None
