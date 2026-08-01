# Prism — AI cross-document financial consistency checker

Prism cross-references financial metrics across a startup's fundraising documents
(pitch deck, MIS, audited financials, projections, cap table) and flags where the
story doesn't add up — before the diligence call.

The stack is a **FastAPI + SQLAlchemy** backend and a **Vite + React + TypeScript**
frontend. LLM extraction is powered by **Google Gemini** via the `google-genai` SDK.

## Running (this hosted environment)

Both services are managed by supervisor and start automatically:

- Frontend: `http://localhost:3000` (Vite dev server, `yarn start`)
- Backend:  `http://localhost:8001` (uvicorn on `server:app`)
- Public preview URL routes `/*` → frontend, `/api/*` → backend via ingress.

```bash
# Health check
curl http://localhost:8001/api/health
# Restart either service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

## Running locally (no supervisor)

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env             # edit values
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn dev                          # http://localhost:3000
```

## Docker Compose (alternate)

```bash
docker compose up --build
# frontend on :3000, backend on :8001, both on the shared prism-net
```

## Env vars

**backend/.env** (see `backend/.env.example`)

| Name | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `GEMINI_MODEL` | Model to use for extraction | `gemini-flash-lite-latest` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Path to Firebase admin key | `/app/backend/firebase-service-account.json` |
| `DATABASE_URL` | SQLAlchemy DB URL | `sqlite:///./prism.db` |

**frontend/.env.local**

| Name | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL for backend (leave unset to run on mock data) |
| `VITE_FIREBASE_*`   | Firebase Web SDK config (auth) |

## API contract

All routes are prefixed with `/api`. TypeScript types in
`frontend/src/api/types.ts` are the source of truth.

- `POST /api/upload` — multipart file upload (`files=`); returns
  `{session_id, files[], missing_document_types[]}`.
- `POST /api/analyze/{session_id}` — kicks off the 7-stage async pipeline.
- `GET  /api/analyze/{session_id}/status` — poll `{stage, stage_name, complete}`.
- `GET  /api/report/{session_id}` — final report JSON with cross-doc matrix,
  follow-up questions, readiness score, and a `report_download_url`.
- `GET  /api/report/{session_id}/download` — the generated PDF.

## Auth

Send `Authorization: Bearer <token>` where `<token>` is either a real Firebase
ID token or the literal `demo-token` (mapped to a stub `demo-analyst` user for
frontend demo mode). Anonymous requests without any header are also accepted.

## Pipeline stages

`Ingesting → Extracting → Normalizing → Mapping ontology → Cross-referencing →
Scoring materiality → Compiling report` — each stage updates the session row
so the frontend's 1.5s status poll always has something fresh to render.
