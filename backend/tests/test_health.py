"""
test_health.py — Smoke tests for DocMind API.
Run with: python -m pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_endpoint():
    """Health check should return 200 with service name."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "DocMind"


def test_root_endpoint():
    """Root should return service info."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "DocMind" in data["service"]
    assert "docs" in data


def test_documents_list_empty():
    """GET /api/documents should return empty list on fresh DB."""
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    data = resp.json()
    assert "documents" in data
    assert isinstance(data["documents"], list)


def test_query_empty_question():
    """POST /api/query with empty question should 400."""
    resp = client.post("/api/query", json={"question": ""})
    assert resp.status_code in (400, 422)


def test_upload_wrong_file_type():
    """POST /api/upload with .txt should 400."""
    from io import BytesIO
    resp = client.post(
        "/api/upload",
        files={"file": ("test.txt", BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


def test_eval_results_empty():
    """GET /api/eval/results should return valid structure even when empty."""
    resp = client.get("/api/eval/results")
    assert resp.status_code == 200
    data = resp.json()
    assert "history" in data
    assert isinstance(data["history"], list)
