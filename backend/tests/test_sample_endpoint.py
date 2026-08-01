"""Tests for new POST /api/sample/{kind} endpoint (iteration_3)."""
from __future__ import annotations

import os
import time

import pytest
import requests

BASE_URL = os.environ.get("PRISM_BASE_URL", "http://localhost:8001")
BEARER = {"Authorization": "Bearer demo-token"}
DOC_KEYS = {"pitch_deck", "mis", "financials", "projections", "cap_table"}


def _validate_sample_response(data: dict, expected_count: int = 5) -> None:
    assert "session_id" in data and isinstance(data["session_id"], str)
    assert isinstance(data["files"], list)
    assert len(data["files"]) == expected_count, f"expected {expected_count} files, got {len(data['files'])}"
    for f in data["files"]:
        assert set(f.keys()) >= {"file_id", "filename", "detected_type", "status", "confidence"}
        assert f["status"] == "validated"
        assert 0.0 < f["confidence"] <= 1.0
    assert isinstance(data["missing_document_types"], list)


def test_sample_messy_bearer():
    r = requests.post(f"{BASE_URL}/api/sample/messy", headers=BEARER, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    _validate_sample_response(data)
    found = {f["detected_type"] for f in data["files"]}
    # Backend guarantees all 5 canonical types are present in the messy fixture set.
    assert DOC_KEYS.issubset(found), f"missing types in messy: {DOC_KEYS - found}"
    assert data["missing_document_types"] == []


def test_sample_clean_bearer():
    r = requests.post(f"{BASE_URL}/api/sample/clean", headers=BEARER, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    _validate_sample_response(data)
    found = {f["detected_type"] for f in data["files"]}
    assert DOC_KEYS.issubset(found), f"missing types in clean: {DOC_KEYS - found}"
    assert data["missing_document_types"] == []


def test_sample_unknown_kind_defaults_to_messy_no_500():
    r = requests.post(f"{BASE_URL}/api/sample/unknown_kind", headers=BEARER, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    _validate_sample_response(data)


def test_sample_anonymous_also_works():
    r = requests.post(f"{BASE_URL}/api/sample/clean", timeout=60)
    assert r.status_code == 200, r.text
    _validate_sample_response(r.json())


@pytest.fixture(scope="module")
def messy_session_id() -> str:
    r = requests.post(f"{BASE_URL}/api/sample/messy", headers=BEARER, timeout=60)
    assert r.status_code == 200
    return r.json()["session_id"]


def test_messy_analyze_and_report(messy_session_id):
    sid = messy_session_id
    r = requests.post(f"{BASE_URL}/api/analyze/{sid}", headers=BEARER, timeout=15)
    assert r.status_code == 200
    # Poll status
    deadline = time.time() + 180
    last = None
    while time.time() < deadline:
        s = requests.get(f"{BASE_URL}/api/analyze/{sid}/status", timeout=10)
        assert s.status_code == 200
        last = s.json()
        if last.get("complete"):
            break
        time.sleep(2)
    assert last and last.get("complete") is True, f"analysis did not complete: {last}"

    r = requests.get(f"{BASE_URL}/api/report/{sid}", headers=BEARER, timeout=30)
    assert r.status_code == 200, r.text
    report = r.json()
    assert isinstance(report["matrix"], list)
    assert len(report["matrix"]) >= 1, "expected at least one matrix row"
    # Expect >=1 critical_red_flag row for the messy dataset
    materialities = [row["materiality"] for row in report["matrix"]]
    print("Materialities in messy report:", materialities)
    assert "critical_red_flag" in materialities or "material_mismatch" in materialities, (
        f"expected some material/critical mismatch row, got: {materialities}"
    )
