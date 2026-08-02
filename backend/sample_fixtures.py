"""Sample fixture generation for /api/sample/{kind}.

Produces small but realistic pitch deck / MIS / financials / projections /
cap table files for two synthetic companies:

- clean    → Northwind: numbers mostly agree across docs
- messy    → Acme:     deck vs MIS/cap-table conflicts (revenue, customers, cap-table sum)

Files are cached under /app/backend/sample_fixtures/{kind}/ after first run.
"""
from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Dict, List, Tuple

_FIXTURES_ROOT = Path(__file__).parent / "sample_fixtures"


CLEAN_FILES = [
    "Northwind_PitchDeck_v3.pdf",
    "Northwind_MIS_FY24.xlsx",
    "Northwind_AuditedFinancials.pdf",
    "Northwind_Projections_3yr.xlsx",
    "Northwind_CapTable.csv",
]

MESSY_FILES = [
    "Acme_PitchDeck_Final.pdf",
    "Acme_MIS_Q4.xlsx",
    "Acme_Financials_2024.pdf",
    "Acme_Projections.xlsx",
    "Acme_CapTable.csv",
]


def _draw_pdf(path: Path, title: str, pages: List[Tuple[str, List[str]]]) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(str(path), pagesize=A4)
    _w, h = A4
    for section, lines in pages:
        c.setFont("Helvetica-Bold", 22)
        c.drawString(60, h - 90, section)
        c.setFont("Helvetica", 12)
        for i, ln in enumerate(lines):
            c.drawString(60, h - 130 - 18 * i, ln)
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(60, 40, title)
        c.showPage()
    c.save()


def _write_xlsx(path: Path, sheets: Dict[str, List[List[object]]]) -> None:
    from openpyxl import Workbook

    wb = Workbook()
    wb.remove(wb.active)  # type: ignore[arg-type]
    for name, rows in sheets.items():
        ws = wb.create_sheet(name)
        for r in rows:
            ws.append(r)
    wb.save(str(path))


def _write_csv(path: Path, rows: List[List[object]]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow(r)


# --- CLEAN (Northwind) -----------------------------------------------------


def _build_clean(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)

    _draw_pdf(
        out / CLEAN_FILES[0],
        "Northwind Series A Pitch Deck",
        [
            ("Northwind — Series A", ["Founders: Alice & Bob", "Cross-border logistics SaaS"]),
            ("Traction (FY24)", ["Revenue: ₹2.0 Cr", "Gross Margin: 38%", "Active Customers: 1,200"]),
            ("Unit economics", ["CAC: ₹4,200", "LTV: ₹28,000", "Churn: 3.5%/mo"]),
            ("Cap table", ["Founder Ownership: 72%", "ESOP Pool: 10%"]),
            ("Market", ["TAM: $12 B", "Growth Rate (CAGR): 1.6×/yr projected"]),
            ("Ask", ["Round Size: $6 M", "Valuation: $30 M pre-money", "Cash Runway: 18 months"]),
        ],
    )

    _write_xlsx(
        out / CLEAN_FILES[1],
        {
            "P&L": [
                ["Month", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                ["Revenue (₹ Lakhs)", 15, 16, 16, 17, 17, 17, 18, 17, 16, 16, 17, 18],
                ["COGS (₹ Lakhs)", 9, 10, 10, 11, 10, 10, 11, 11, 10, 10, 11, 11],
                ["Gross Margin %", "37.9%", "", "", "", "", "", "", "", "", "", "", ""],
                ["Monthly Burn (₹L)", 25, 25, 26, 25, 25, 26, 25, 25, 26, 25, 25, 25],
                ["Active Customers", 950, 1000, 1050, 1100, 1120, 1150, 1180, 1180, 1180, 1200, 1200, 1200],
            ],
            "Cash": [
                ["Metric", "Value"],
                ["Cash Balance (₹Cr)", 4.5],
                ["Cash Runway (months)", 17],
            ],
        },
    )

    _draw_pdf(
        out / CLEAN_FILES[2],
        "Northwind Audited Financials FY24",
        [
            ("P&L Summary", ["Revenue: ₹2,00,87,432", "COGS: ₹1,24,54,321", "Gross Margin: 37.8%"]),
            ("Balance Sheet", ["Cash: ₹4.5 Cr", "Total Assets: ₹9.8 Cr", "Total Liabilities: ₹1.2 Cr"]),
            ("Notes", ["Note 3: Revenue recognized on delivery.", "Auditor: XYZ & Co."]),
        ],
    )

    _write_xlsx(
        out / CLEAN_FILES[3],
        {
            "Growth": [
                ["Year", "FY25", "FY26", "FY27"],
                ["Revenue (₹ Cr)", 3.2, 5.1, 8.2],
                ["CAGR (x/yr)", "1.6", "", ""],
            ],
            "Burn": [
                ["Month", "Value (₹L)"],
                ["Burn", 25],
                ["Runway (months)", 18],
            ],
        },
    )

    _write_csv(
        out / CLEAN_FILES[4],
        [
            ["Shareholder", "Shares", "Ownership %"],
            ["Alice Founder", 5_000_000, "36.0%"],
            ["Bob Founder", 5_000_000, "36.0%"],
            ["Seed Fund", 2_400_000, "17.28%"],
            ["Angel Syndicate", 200_000, "1.44%"],
            ["ESOP Pool (allocated)", 1_400_000, "9.28%"],
        ],
    )


# --- MESSY (Acme) ----------------------------------------------------------


def _build_messy(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)

    _draw_pdf(
        out / MESSY_FILES[0],
        "Acme Corp Pitch Deck",
        [
            ("Acme Corp — Series A", ["Founders: Priya & Rahul"]),
            ("Traction (FY24)", ["Revenue: ₹2.0 Cr", "Gross Margin: 40%", "Active Customers: 4,000"]),
            ("Unit economics", ["CAC: ₹4,200", "LTV: ₹30,000"]),
            ("Cap table", ["Founder Ownership: 65%", "ESOP Pool: 12%", "Sums to 100%"]),
            ("Market", ["TAM: $12 B", "Growth Rate (CAGR): 3.1×/yr"]),
            ("Ask", ["Round Size: $6 M", "Valuation: $30 M pre-money", "Cash Runway: 12 months"]),
        ],
    )

    _write_xlsx(
        out / MESSY_FILES[1],
        {
            "P&L": [
                ["Month", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                ["Revenue (₹ Lakhs)", 12, 13, 13, 14, 14, 15, 15, 14, 13, 13, 14, 10],
                ["COGS (₹ Lakhs)", 8, 8, 9, 9, 9, 10, 10, 9, 8, 8, 9, 7],
                ["Gross Margin %", "34.2%", "", "", "", "", "", "", "", "", "", "", ""],
                ["Marketing Spend (₹L)", 40, 40, 40, 40, 40, 40, 40, 8, 40, 40, 40, 40],
            ],
            "Ops": [
                ["Metric", "Value"],
                ["Active Customers", 2100],
            ],
            "Cash": [
                ["Metric", "Value"],
                ["Cash Balance (₹Cr)", 4.2],
                ["Monthly Burn (₹L)", 38],
                ["Cash Runway (months)", 11],
            ],
        },
    )

    _draw_pdf(
        out / MESSY_FILES[2],
        "Acme Financials FY24",
        [
            ("P&L Summary", ["Revenue: ₹1,61,20,110", "COGS: ₹1,06,15,244", "Gross Margin: 34.1%"]),
            ("Balance Sheet", ["Cash: ₹4.2 Cr", "Total Assets: ₹7.1 Cr", "Total Liabilities: ₹0.8 Cr"]),
            ("Notes", ["Note 3: FY→CY alignment applied.", "Auditor: XYZ & Co."]),
        ],
    )

    _write_xlsx(
        out / MESSY_FILES[3],
        {
            "Base case": [
                ["Year", "FY25", "FY26", "FY27"],
                ["Revenue (₹ Cr)", 2.0, 6.2, 19.2],
                ["Growth Rate (CAGR)", "3.1x/yr", "", ""],
            ],
            "Burn": [
                ["Month", "Value (₹L)"],
                ["Burn", 38],
                ["Runway (months)", 12],
            ],
        },
    )

    _write_csv(
        out / MESSY_FILES[4],
        [
            ["Shareholder", "Shares", "Ownership %"],
            ["Priya Founder", 3_500_000, "35.0%"],
            ["Rahul Founder", 2_300_000, "23.0%"],
            ["Angel Investors", 1_500_000, "15.0%"],
            ["Seed Fund", 2_400_000, "24.0%"],
            ["ESOP (allocated)", 0, "0%"],
        ],
    )


def ensure_fixtures(kind: str) -> Path:
    kind = "clean" if kind == "clean" else "messy"
    out = _FIXTURES_ROOT / kind
    marker = out / ".built"
    if marker.exists():
        return out
    out.mkdir(parents=True, exist_ok=True)
    if kind == "clean":
        _build_clean(out)
    else:
        _build_messy(out)
    marker.touch()
    return out


def fixture_filenames(kind: str) -> List[str]:
    return CLEAN_FILES if kind == "clean" else MESSY_FILES
