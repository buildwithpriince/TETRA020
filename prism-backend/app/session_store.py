"""
Session state storage, keyed by session_id, with a TTL.

No persistent database of uploaded documents or extracted data. This is
intentionally the *only* place pipeline state lives -- GET /api/report can
be called repeatedly during the TTL window and must return identical data
without recomputing anything, so every stage writes its output back here
and every read comes from here.

Backend selection:
- REDIS_URL set -> Redis (safe for multi-instance deployments on Render)
- otherwise     -> in-process dict (fine for a single instance; state is
                    lost on restart, which is acceptable since nothing here
                    is meant to be persistent anyway)
"""
from __future__ import annotations

import json
import pickle
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from app.config import get_settings

_settings = get_settings()


@dataclass
class SessionState:
    session_id: str
    uid: str
    created_at: float = field(default_factory=time.time)

    # Stage 1/2 output: file_id -> {filename, detected_type, status,
    # confidence, raw_text/tables, file_bytes-derived metadata}
    files: dict[str, dict[str, Any]] = field(default_factory=dict)

    missing_document_types: list[str] = field(default_factory=list)

    # Pipeline progress, surfaced by GET /api/analyze/{id}/status
    stage: int = 0
    stage_name: str = "not_started"
    complete: bool = False

    # Stage 4-7 intermediate + final output
    normalized_documents: dict[str, Any] = field(default_factory=dict)
    extracted_metrics: dict[str, Any] = field(default_factory=dict)
    comparison_result: dict[str, Any] = field(default_factory=dict)
    report: Optional[dict[str, Any]] = None  # matches ReportResponse.model_dump()

    # Cached rendered PDF bytes so /download doesn't regenerate (and can't
    # drift from the JSON that produced it) on every call within the TTL.
    report_pdf: Optional[bytes] = None
    report_pdf_password: Optional[str] = None


class _InMemoryStore:
    def __init__(self, ttl_seconds: int):
        self._ttl = ttl_seconds
        self._data: dict[str, tuple[float, SessionState]] = {}
        self._lock = threading.Lock()

    def _purge_expired(self) -> None:
        now = time.time()
        expired = [k for k, (exp, _) in self._data.items() if exp < now]
        for k in expired:
            self._data.pop(k, None)

    def get(self, session_id: str) -> Optional[SessionState]:
        with self._lock:
            self._purge_expired()
            entry = self._data.get(session_id)
            return entry[1] if entry else None

    def set(self, session_id: str, state: SessionState) -> None:
        with self._lock:
            self._data[session_id] = (time.time() + self._ttl, state)

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._data.pop(session_id, None)


class _RedisStore:
    def __init__(self, url: str, ttl_seconds: int):
        import redis  # local import so redis is only required if used

        self._ttl = ttl_seconds
        self._client = redis.Redis.from_url(url)

    @staticmethod
    def _key(session_id: str) -> str:
        return f"prism:session:{session_id}"

    def get(self, session_id: str) -> Optional[SessionState]:
        raw = self._client.get(self._key(session_id))
        if raw is None:
            return None
        return pickle.loads(raw)

    def set(self, session_id: str, state: SessionState) -> None:
        self._client.set(self._key(session_id), pickle.dumps(state), ex=self._ttl)

    def delete(self, session_id: str) -> None:
        self._client.delete(self._key(session_id))


class SessionStore:
    """Thin facade so callers don't care which backend is active."""

    def __init__(self):
        if _settings.redis_url:
            self._backend = _RedisStore(_settings.redis_url, _settings.session_ttl_seconds)
        else:
            self._backend = _InMemoryStore(_settings.session_ttl_seconds)

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._backend.get(session_id)

    def get_or_404(self, session_id: str) -> SessionState:
        state = self.get(session_id)
        if state is None:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=404,
                detail="Session not found or expired. Upload documents again to start a new session.",
            )
        return state

    def save(self, state: SessionState) -> None:
        self._backend.set(state.session_id, state)

    def delete(self, session_id: str) -> None:
        self._backend.delete(session_id)


# Module-level singleton used by routes.
session_store = SessionStore()
