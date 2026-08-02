# Prism — PRD

## Problem
Build a full-stack app that cross-references financial metrics across a
startup's fundraising documents (pitch deck, MIS, audited financials,
projections, cap table) and flags inconsistencies before diligence.

## Users
- Analysts / investors who receive several docs per startup and need a fast
  reconciliation pass and a downloadable diligence report.
- Founders who want to sanity-check their own numbers before sending them out.

## Stack
- **Frontend** (existing, uploaded): Vite + React + TypeScript + Tailwind,
  paper-ledger / red-ink-annotation aesthetic (Fraunces + Inter + IBM Plex
  Mono). Not restyled. Only env wiring touched.
- **Backend** (built): FastAPI + SQLAlchemy (SQLite) + Pydantic v2. Google
  Gemini via `google-genai` (`GEMINI_MODEL=gemini-flash-lite-latest` since
  `gemini-2.5-flash-lite` is no longer available to new API keys). Firebase
  ID-token verification with `demo-token` fallback.

## Delivered (Aug 2026)
- `POST /api/upload` — multipart upload + type detection (pdf/pptx/xlsx/csv).
- `POST /api/analyze/{id}` — async 7-stage pipeline background task.
- `GET /api/analyze/{id}/status` — 1.5s-poll friendly.
- `GET /api/report/{id}` — matrix + follow-ups + score.
- `GET /api/report/{id}/download` — reportlab PDF.
- SQLAlchemy schema: users, sessions, uploaded_files, matrix_rows,
  follow_up_questions, reports. `Base.metadata.create_all` on startup.
- Files on disk under `/app/backend/storage/{session_id}/`.
- CORS for `localhost:3000`, `localhost:5173`, and preview subdomain.
- Root `README.md`, `docker-compose.yml`, `frontend/Dockerfile`,
  `backend/Dockerfile`, `.env.example`.

## Backlog (P1/P2)
- P1: unit tests for the reconciliation classifier (rounding vs. material vs.
  critical) and for cap-table sum validation.
- P1: replace fire-and-forget `asyncio.create_task` with a durable job queue
  (RQ / Celery) for pipeline restarts.
- P2: swap SQLite → Postgres for prod (already SQLAlchemy-abstracted).
- P2: shareable read-only report URLs and email export.
- P2: ingestion of large decks via Gemini multimodal (attach PDFs directly).
