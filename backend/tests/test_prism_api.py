"""Backend API tests for Prism (FastAPI). Runs against local supervisor instance."""
from __future__ import annotations

import os
import time
import uuid
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("PRISM_BASE_URL", "http://localhost:8001")
FIXTURES = Path("/tmp/fixtures")
BEARER = {"Authorization": "Bearer demo-token"}

DOC_KEYS = {"pitch_deck", "mis", "financials", "projections", "cap_table"}
DETECTED_TYPES = DOC_KEYS | {"unknown"}
STATUSES = {"verified_mismatch", "unresolved_inconsistency", "missing_information"}
MATERIALITIES = {"rounding_error", "material_mismatch", "critical_red_flag"}
SEVERITIES = {"high", "medium", "low"}

EXPECTED_STAGES = [
    "Ingesting documents",
    "Extracting figures & text",
    "Normalizing currency & calendar",
    "Mapping financial ontology",
    "Cross-referencing metrics",
    "Scoring materiality & confidence",
    "Compiling diligence report",
]


# ---------- Health ---------------------------------------------------------

def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["service"] == "prism"
    assert data["stages"] == EXPECTED_STAGES


def test_health_accepts_bearer():
    r = requests.get(f"{BASE_URL}/api/health", headers=BEARER, timeout=10)
    assert r.status_code == 200


# ---------- Upload error cases --------------------------------------------

def test_upload_no_files_400():
    # No 'files' field at all -> FastAPI returns 422 typically; sending empty multipart
    r = requests.post(f"{BASE_URL}/api/upload", timeout=10)
    assert r.status_code in (400, 422)


# ---------- Analyze/report unknown IDs ------------------------------------

def test_status_unknown_id_404():
    r = requests.get(f"{BASE_URL}/api/analyze/UNKNOWN_ID/status", timeout=10)
    assert r.status_code == 404


def test_report_unknown_id_404_or_409():
    r = requests.get(f"{BASE_URL}/api/report/UNKNOWN_ID", timeout=10)
    assert r.status_code in (404, 409)


def test_download_unknown_id_404():
    r = requests.get(f"{BASE_URL}/api/report/UNKNOWN_ID/download", timeout=10)
    assert r.status_code == 404


# ---------- Full happy path -----------------------------------------------

@pytest.fixture(scope="module")
def uploaded_session():
    fixture_files = [
        FIXTURES / "acme_pitch_deck.pdf",
        FIXTURES / "acme_mis_fy24.xlsx",
        FIXTURES / "acme_cap_table.csv",
    ]
    for f in fixture_files:
        assert f.exists(), f"Missing fixture: {f}"

    files = []
    handles = []
    for f in fixture_files:
        h = open(f, "rb")
        handles.append(h)
        files.append(("files", (f.name, h, "application/octet-stream")))
    try:
        r = requests.post(f"{BASE_URL}/api/upload", headers=BEARER, files=files, timeout=60)
    finally:
        for h in handles:
            h.close()
    assert r.status_code == 200, r.text
    data = r.json()
    return data


def test_upload_response_shape(uploaded_session):
    d = uploaded_session
    assert "session_id" in d and isinstance(d["session_id"], str)
    assert isinstance(d["files"], list) and len(d["files"]) == 3
    for f in d["files"]:
        assert set(f.keys()) >= {"file_id", "filename", "detected_type", "status", "confidence"}
        assert f["detected_type"] in DETECTED_TYPES
        assert f["status"] == "validated"
        assert 0.0 <= f["confidence"] <= 1.0

    # missing_document_types = 5 canonical minus uploaded (should be 5 - up to 3)
    assert isinstance(d["missing_document_types"], list)
    found = {f["detected_type"] for f in d["files"]}
    expected_missing = DOC_KEYS - found
    assert set(d["missing_document_types"]) == expected_missing


def test_detected_type_values_match_expected(uploaded_session):
    files_by_name = {f["filename"]: f for f in uploaded_session["files"]}
    # Verify sensible detection
    assert files_by_name["acme_pitch_deck.pdf"]["detected_type"] == "pitch_deck"
    assert files_by_name["acme_cap_table.csv"]["detected_type"] == "cap_table"
    assert files_by_name["acme_mis_fy24.xlsx"]["detected_type"] in DOC_KEYS


def test_start_analysis_and_poll(uploaded_session):
    sid = uploaded_session["session_id"]
    r = requests.post(f"{BASE_URL}/api/analyze/{sid}", headers=BEARER, timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body == {"session_id": sid, "started": True}

    seen_stages: set[str] = set()
    deadline = time.time() + 120
    last = None
    while time.time() < deadline:
        s = requests.get(f"{BASE_URL}/api/analyze/{sid}/status", timeout=10)
        assert s.status_code == 200
        last = s.json()
        assert 1 <= last["stage"] <= 7
        assert last["stage_name"] in EXPECTED_STAGES
        seen_stages.add(last["stage_name"])
        if last["complete"]:
            break
        time.sleep(1.5)
    assert last and last["complete"] is True, f"analysis did not complete: {last}"


def test_start_analysis_unknown_404():
    r = requests.post(f"{BASE_URL}/api/analyze/UNKNOWN_ID", headers=BEARER, timeout=10)
    assert r.status_code == 404


def test_report_shape_and_enums(uploaded_session):
    sid = uploaded_session["session_id"]
    # Ensure analysis has finished (previous test waits) - poll briefly again defensively
    deadline = time.time() + 30
    while time.time() < deadline:
        s = requests.get(f"{BASE_URL}/api/analyze/{sid}/status", timeout=10).json()
        if s.get("complete"):
            break
        time.sleep(1.0)

    r = requests.get(f"{BASE_URL}/api/report/{sid}", headers=BEARER, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()

    assert isinstance(data["readiness_score"], int)
    assert 0 <= data["readiness_score"] <= 100
    assert isinstance(data["document_completeness_pct"], int)
    # 3 of 5 uploaded => 60. But detection may map two files to same type; accept 20|40|60.
    assert data["document_completeness_pct"] in (20, 40, 60, 80, 100)
    assert isinstance(data["top_red_flags"], list)
    assert isinstance(data["top_strengths"], list)
    assert all(isinstance(x, str) for x in data["top_red_flags"])
    assert all(isinstance(x, str) for x in data["top_strengths"])
    assert isinstance(data["matrix"], list)
    assert data["report_download_url"] == f"/api/report/{sid}/download"

    for row in data["matrix"]:
        assert "metric" in row and isinstance(row["metric"], str)
        assert set(row["documents"].keys()) == DOC_KEYS
        for k, v in row["documents"].items():
            assert v is None or (isinstance(v, dict) and {"value", "confidence", "source_ref"} <= set(v.keys()))
        assert row["status"] in STATUSES, row["status"]
        assert row["materiality"] in MATERIALITIES, row["materiality"]
        assert isinstance(row["ai_reasoning"], str)

    for q in data["follow_up_questions"]:
        assert set(q.keys()) >= {"question", "related_metric", "severity"}
        assert q["severity"] in SEVERITIES


def test_download_pdf(uploaded_session):
    sid = uploaded_session["session_id"]
    r = requests.get(f"{BASE_URL}/api/report/{sid}/download", headers=BEARER, timeout=30)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"
