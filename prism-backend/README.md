# Prism — Backend

Cross-document financial consistency checker for investor/VC diligence.
API-only (a separate frontend team builds the React app against the
contract below). Validates uploaded fundraising documents, extracts a
locked set of financial metrics, cross-checks them across documents,
classifies discrepancies, and generates a branded, password-protected PDF
report — all via direct calls to the Gemini API (no LLM-orchestration
layer in between).

## What Prism does — and doesn't do

Prism assesses **consistency and completeness** across a startup's own
fundraising documents. It does **not** value the company, assess market
opportunity, or give investment advice. Every generated report repeats
this disclaimer.

## Setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GEMINI_API_KEY, Firebase creds, etc.
```

You'll also need two font files for the branded PDF — see
`app/pdf/fonts/README.md`.

If you want a real malware scan (rather than the honest integrity-only
fallback — see Security notes below), run a ClamAV daemon reachable at the
default Unix socket `pyclamd` expects.

Run locally:

```bash
uvicorn app.main:app --reload --port 8000
```

## Architecture

```
app/
  main.py              FastAPI routes — the exact API contract, nothing else
  config.py            env-var-backed settings, never hardcoded secrets
  auth.py              Firebase ID token verification (Depends() on every route)
  session_store.py     session state, keyed by session_id, TTL-based
                        (Redis if REDIS_URL set, else in-process dict)
  models.py             Pydantic models mirroring the API contract exactly
  ontology.py           Financial Ontology & Synonym Mapping (Stage 6)
  gemini_client.py      thin, direct google-genai wrapper — no proxy layer
  pipeline.py            orchestrates Stages 4-8 for POST /api/analyze
  pdf/
    template.html        Jinja2 template, branded per the design system
    pdf_builder.py        WeasyPrint render + pikepdf password-lock + content hash
    fonts/                Fraunces + IBM Plex Mono go here (not bundled)
  stages/
    validator.py         Stage 1 — signature/type/corruption/malware checks
    extractor.py          Stage 2 — raw text/table parsing per file type
    doc_classifier.py     Stage 3 — Gemini call: which doc type is this file?
    normalizer.py          Stage 4 — deterministic currency/unit/fiscal hints
    metric_extractor.py    Stage 5 — Gemini call: extract the 5 locked metrics
    comparator.py           Stage 6 — deterministic cross-doc comparison + materiality
    classifier.py            Stage 7 — Gemini call: tri-state reasoning + follow-ups
    report_generator.py       Stage 8 — assemble the final report JSON
```

**Three distinct Gemini calls, on purpose:** Stage 3 (classify a file),
Stage 5 (extract metrics from one file), and Stage 7 (reason about one
metric's cross-document consistency) each have their own narrow system
prompt in their own module. They are never combined into a single prompt,
so each stage's output stays independently debuggable.

**Session state, not a database:** nothing about an upload persists past
its TTL (default 1 hour, `SESSION_TTL_SECONDS`). `GET /api/report/{id}`
can be called repeatedly within that window and always returns the exact
same JSON that was computed once, at `POST /api/analyze/{id}` time — nothing
is recomputed per-read. The downloaded PDF is rendered from that same
JSON and cached alongside it, so the dashboard and the PDF can never show
contradictory numbers.

## Security & privacy notes

- File signatures are checked with `python-magic` against the actual bytes,
  not the filename extension.
- Malware scanning uses a real ClamAV daemon (`pyclamd`) when one is
  reachable. **When it isn't, Prism does not fake a clean scan result** —
  the file only gets marked `validated` after signature + corruption checks,
  and the PDF report / API responses never claim a malware scan ran when it
  didn't (see `validator.ValidationResult.malware_scan_method`).
- `GEMINI_API_KEY` and Firebase Admin credentials are read from environment
  variables only, never returned in any response body or logged.
- CORS is restricted to `ALLOWED_ORIGINS` (comma-separated) — no `*` in
  production.
- Basic rate limiting is applied to `/api/upload` and `/api/analyze/*` via
  `slowapi` (`UPLOAD_RATE_LIMIT` / `ANALYZE_RATE_LIMIT` in `.env`).
- No uploaded files or extracted data are persisted beyond the session TTL.

## Deployment (Render)

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add a Redis instance and set `REDIS_URL` if you're running more than one
  instance (the in-process fallback store only works for a single instance).
- Set all variables from `.env.example` in Render's environment settings —
  particularly `FIREBASE_CREDENTIALS_JSON` (paste the service account JSON
  directly, since Render env vars are simpler to manage than mounted files).
- WeasyPrint needs system libraries (Pango, cairo, etc.) — Render's Python
  runtime does not include these by default. Use a `render.yaml` /
  Dockerfile that installs them (e.g. `apt-get install -y libpango-1.0-0
  libpangocairo-1.0-0 libcairo2 libgdk-pixbuf2.0-0 libffi-dev`) or switch to
  a Docker-based Render service.

## Known gaps / honest limitations

- **Advanced differentiators and polish features** (Section 5 of the spec)
  are not implemented in this pass — the spec explicitly orders "core
  first," and the core pipeline (Stages 1-8, the exact API contract, the
  branded PDF) is what's built here. Semantic Claim Substantiation, Cap
  Table Math Validator, Assumption Stress-Tester, Chart-to-Data Reverse
  Engineering, and the Polish-tier items are natural next additions —
  each slots into an existing stage (mostly Stage 5 extraction prompts and
  Stage 7 reasoning) without changing the API contract.
- Chart-to-Data Reverse Engineering has a vision-capable call already
  available in `gemini_client.generate_json_with_image`, but nothing in
  the pipeline invokes it yet — wiring it up means rasterizing pitch-deck
  pages/slides to images in Stage 2 first.
- The readiness score formula in `report_generator._compute_readiness_score`
  is a deliberately simple, deterministic, auditable heuristic, not a
  separate AI judgment call — tune the weights there as real usage
  surfaces better calibration data.
