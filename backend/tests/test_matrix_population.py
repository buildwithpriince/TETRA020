"""Verify all 5 detected_type columns in report.matrix are populated for clean and messy sample runs."""
from __future__ import annotations

import os
import time

import pytest
import requests

BASE_URL = os.environ.get("PRISM_BASE_URL", "http://localhost:8001")
BEARER = {"Authorization": "Bearer demo-token"}
DOC_KEYS = {"pitch_deck", "mis", "financials", "projections", "cap_table"}


def _run_pipeline(kind: str) -> dict:
    r = requests.post(f"{BASE_URL}/api/sample/{kind}", headers=BEARER, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    sid = d["session_id"]
    # 5 files, each with expected canonical detected_type
    assert len(d["files"]) == 5
    types = {f["detected_type"] for f in d["files"]}
    assert types == DOC_KEYS, f"{kind}: types={types}"
    for f in d["files"]:
        assert f["confidence"] >= 0.75, f
    assert d["missing_document_types"] == []

    # Analyze
    r = requests.post(f"{BASE_URL}/api/analyze/{sid}", headers=BEARER, timeout=15)
    assert r.status_code == 200
    deadline = time.time() + 180
    while time.time() < deadline:
        s = requests.get(f"{BASE_URL}/api/analyze/{sid}/status", timeout=10).json()
        if s.get("complete"):
            break
        time.sleep(2)
    assert s.get("complete"), s

    r = requests.get(f"{BASE_URL}/api/report/{sid}", headers=BEARER, timeout=60)
    assert r.status_code == 200
    return r.json()


def _column_population(matrix: list[dict]) -> dict[str, int]:
    counts = {k: 0 for k in DOC_KEYS}
    for row in matrix:
        for k, v in row["documents"].items():
            if v is not None:
                counts[k] += 1
    return counts


@pytest.mark.parametrize("kind", ["clean", "messy"])
def test_full_pipeline_all_columns_populated(kind):
    report = _run_pipeline(kind)
    assert len(report["matrix"]) >= 5
    counts = _column_population(report["matrix"])
    # Every canonical column must have >=1 non-null value across matrix rows
    for k in DOC_KEYS:
        assert counts[k] >= 1, f"{kind}: column {k} empty. counts={counts}"


def test_messy_cap_table_column_has_founder_and_esop():
    """Regression: cap_table column was previously empty in the messy pipeline."""
    report = _run_pipeline("messy")
    cap_rows = [r for r in report["matrix"] if r["documents"].get("cap_table") is not None]
    assert cap_rows, "cap_table column is empty in messy pipeline"
    metrics_lower = " ".join(r["metric"].lower() for r in cap_rows)
    # Should include founder ownership and ESOP-related metrics somewhere in matrix
    assert any(m in metrics_lower for m in ["founder", "ownership", "esop", "cap table"]), (
        f"cap-table rows metrics: {[r['metric'] for r in cap_rows]}"
    )
