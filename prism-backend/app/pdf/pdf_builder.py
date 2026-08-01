"""
Renders the branded report PDF from the SAME JSON returned by
GET /api/report/{session_id} -- never a separate recomputation, so the
dashboard and the PDF can't show contradictory numbers.

- WeasyPrint renders the branded HTML/CSS (Fraunces headings, IBM Plex Mono
  numerics, paper/ink/red/green color tokens) to PDF bytes.
- A content hash of the underlying JSON is computed BEFORE rendering and
  embedded in the footer for tamper-evidence.
- pikepdf then password-locks the output against editing and embeds the
  report ID / timestamp already baked into the footer text.
"""
from __future__ import annotations

import hashlib
import io
import json
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.config import get_settings

_TEMPLATE_DIR = Path(__file__).parent
_FONTS_DIR = _TEMPLATE_DIR / "fonts"

_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)))


def _font_path(filename: str, fallback_css_family: str) -> str:
    path = _FONTS_DIR / filename
    if path.exists():
        return path.resolve().as_uri()
    # WeasyPrint will fail to load this @font-face and fall back to the
    # nearest generic family already declared for that role in the CSS.
    return ""


def _content_hash(report_json: dict) -> str:
    canonical = json.dumps(report_json, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_report_pdf(
    report_json: dict,
    *,
    startup_name: str | None,
    session_id: str,
    password: str | None = None,
) -> tuple[bytes, str, str]:
    """
    Returns (pdf_bytes, report_id, content_hash).
    """
    import weasyprint

    settings = get_settings()
    report_id = f"PRISM-{uuid.uuid4().hex[:10].upper()}"
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    content_hash = _content_hash(report_json)

    template = _env.get_template("template.html")
    html_str = template.render(
        report=report_json,
        startup_name=startup_name,
        report_id=report_id,
        generated_at=generated_at,
        content_hash=content_hash,
        content_hash_short=content_hash[:16],
        fraunces_path=_font_path("Fraunces-SemiBold.ttf", "serif"),
        plex_mono_path=_font_path("IBMPlexMono-Regular.ttf", "monospace"),
    )

    pdf_bytes = weasyprint.HTML(string=html_str, base_url=str(_TEMPLATE_DIR)).write_pdf()

    final_password = password or settings.report_pdf_password or secrets.token_urlsafe(12)
    protected_bytes = _lock_pdf(pdf_bytes, final_password)

    return protected_bytes, report_id, content_hash


def _lock_pdf(pdf_bytes: bytes, password: str) -> bytes:
    import pikepdf

    with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
        permissions = pikepdf.Permissions(
            extract=False,
            modify_annotation=False,
            modify_assembly=False,
            modify_form=False,
            modify_other=False,
            print_lowres=True,
            print_highres=False,
        )
        out = io.BytesIO()
        pdf.save(
            out,
            encryption=pikepdf.Encryption(
                owner=password,
                user="",  # anyone can open/read; only the owner password can edit
                allow=permissions,
            ),
        )
        return out.getvalue()
