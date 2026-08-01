"""Generate the diligence PDF via reportlab."""
from __future__ import annotations

import os
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor("#1C1B1A")
INK_MUTED = colors.HexColor("#6B6862")
PAPER = colors.HexColor("#FAF8F3")
REDINK = colors.HexColor("#B23A2E")
VERIFIED = colors.HexColor("#3F5D3F")
AMBER = colors.HexColor("#A67C2E")
RULE = colors.HexColor("#D8D5CC")

_MATERIALITY_COLOR = {
    "critical_red_flag": REDINK,
    "material_mismatch": AMBER,
    "rounding_error": VERIFIED,
}


def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontName="Times-Bold", fontSize=26,
            textColor=INK, spaceAfter=6, leading=30,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"], fontName="Helvetica",
            fontSize=11, textColor=INK_MUTED, spaceAfter=18,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Times-Bold",
            fontSize=15, textColor=INK, spaceBefore=14, spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, textColor=INK, leading=15, spaceAfter=4,
        ),
        "muted": ParagraphStyle(
            "muted", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, textColor=INK_MUTED, leading=13,
        ),
        "flag": ParagraphStyle(
            "flag", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, textColor=REDINK, leading=14, spaceAfter=5,
        ),
        "strength": ParagraphStyle(
            "strength", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, textColor=VERIFIED, leading=14, spaceAfter=5,
        ),
        "score": ParagraphStyle(
            "score", parent=base["Normal"], fontName="Times-Bold",
            fontSize=48, textColor=INK, leading=52,
        ),
    }


def render_report_pdf(session_id: str, report: Dict[str, Any], out_path: str) -> str:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    styles = _styles()
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Prism Diligence Report — {session_id}",
    )
    story: List[Any] = []

    story.append(Paragraph("Prism — Diligence Report", styles["title"]))
    story.append(Paragraph(f"Session {session_id}", styles["subtitle"]))

    # Scorecard row
    score_tbl = Table(
        [[
            Paragraph(f"{report['readiness_score']}", styles["score"]),
            Paragraph(f"{report['document_completeness_pct']}%", styles["score"]),
        ], [
            Paragraph("Readiness score", styles["muted"]),
            Paragraph("Document completeness", styles["muted"]),
        ]],
        colWidths=[85 * mm, 85 * mm],
    )
    score_tbl.setStyle(TableStyle([
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, RULE),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 0), (-1, 0), 0),
    ]))
    story.append(score_tbl)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Top red flags", styles["h2"]))
    if report["top_red_flags"]:
        for f in report["top_red_flags"]:
            story.append(Paragraph(f"— {f}", styles["flag"]))
    else:
        story.append(Paragraph("None identified.", styles["muted"]))

    story.append(Paragraph("Top strengths", styles["h2"]))
    if report["top_strengths"]:
        for s in report["top_strengths"]:
            story.append(Paragraph(f"— {s}", styles["strength"]))
    else:
        story.append(Paragraph("None identified.", styles["muted"]))

    story.append(PageBreak())
    story.append(Paragraph("Cross-document consistency matrix", styles["h2"]))

    header = ["Metric", "Deck", "MIS", "Financials", "Projections", "Cap Table", "Status"]
    data: List[List[Any]] = [header]
    for row in report["matrix"]:
        docs = row["documents"]
        def _cell(k: str) -> str:
            v = docs.get(k)
            return v["value"] if v else "—"
        status_short = row["status"].replace("_", " ")
        data.append([
            Paragraph(row["metric"], styles["body"]),
            _cell("pitch_deck"), _cell("mis"), _cell("financials"),
            _cell("projections"), _cell("cap_table"),
            Paragraph(status_short, styles["body"]),
        ])
    tbl = Table(data, colWidths=[38 * mm, 22 * mm, 22 * mm, 24 * mm, 24 * mm, 20 * mm, 24 * mm])
    ts = TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9.5),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, INK),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])
    # Color rows by materiality
    for i, row in enumerate(report["matrix"], start=1):
        col = _MATERIALITY_COLOR.get(row["materiality"], INK)
        ts.add("TEXTCOLOR", (-1, i), (-1, i), col)
    tbl.setStyle(ts)
    story.append(tbl)

    if report.get("follow_up_questions"):
        story.append(Spacer(1, 14))
        story.append(Paragraph("Follow-up questions for founders", styles["h2"]))
        for q in report["follow_up_questions"]:
            severity_tag = {"high": "[HIGH]", "medium": "[MED]", "low": "[LOW]"}.get(q["severity"], "")
            story.append(Paragraph(f"{severity_tag} {q['question']}", styles["body"]))
            story.append(Paragraph(f"↳ {q['related_metric']}", styles["muted"]))

    doc.build(story)
    return out_path
