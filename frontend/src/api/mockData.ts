import type { UploadResponse, AnalysisStatus, ReportResponse } from './types';

// Two sample payloads: a "clean" startup whose documents mostly agree,
// and a "messy" startup whose pitch deck contradicts its MIS and financials.

const cleanUpload: UploadResponse = {
  session_id: 'mock-session-clean-0001',
  files: [
    { file_id: 'f1', filename: 'Northwind_PitchDeck_v3.pdf', detected_type: 'pitch_deck', status: 'validated', confidence: 0.97 },
    { file_id: 'f2', filename: 'Northwind_MIS_FY24.xlsx', detected_type: 'mis', status: 'validated', confidence: 0.95 },
    { file_id: 'f3', filename: 'Northwind_AuditedFinancials.pdf', detected_type: 'financials', status: 'validated', confidence: 0.96 },
    { file_id: 'f4', filename: 'Northwind_Projections_3yr.xlsx', detected_type: 'projections', status: 'validated', confidence: 0.92 },
    { file_id: 'f5', filename: 'Northwind_CapTable.csv', detected_type: 'cap_table', status: 'validated', confidence: 0.99 },
  ],
  missing_document_types: [],
};

const messyUpload: UploadResponse = {
  session_id: 'mock-session-messy-0002',
  files: [
    { file_id: 'f1', filename: 'Acme_PitchDeck_Final.pdf', detected_type: 'pitch_deck', status: 'validated', confidence: 0.94 },
    { file_id: 'f2', filename: 'Acme_MIS_Q4.xlsx', detected_type: 'mis', status: 'validated', confidence: 0.88 },
    { file_id: 'f3', filename: 'Acme_Financials_2024.pdf', detected_type: 'financials', status: 'validated', confidence: 0.91 },
    { file_id: 'f4', filename: 'Acme_Projections.xlsx', detected_type: 'projections', status: 'validated', confidence: 0.85 },
    { file_id: 'f5', filename: 'Acme_CapTable.csv', detected_type: 'cap_table', status: 'validated', confidence: 0.9 },
  ],
  missing_document_types: [],
};

const cleanReport: ReportResponse = {
  readiness_score: 82,
  document_completeness_pct: 100,
  top_red_flags: [
    'Projection CAGR of 3.1×/yr is well above the 1.6× MIS historical trend — assumption not substantiated.',
    'Pitch deck claims "90% repeat purchase rate"; MIS shows 61% — metric definition may differ.',
  ],
  top_strengths: [
    'Revenue figures match across pitch deck, MIS, and audited financials within rounding.',
    'Cap table sums to 100.00% with no unallocated pool.',
    'Gross margin consistent (38% deck vs. 37.8% financials) after FY→CY alignment.',
  ],
  matrix: [
    {
      metric: 'Revenue (FY24)',
      documents: {
        pitch_deck: { value: '₹2.0 Cr', confidence: 0.93, source_ref: 'Deck p.7, slide "Traction"' },
        mis: { value: '₹2.01 Cr', confidence: 0.95, source_ref: 'MIS tab "P&L", row 4' },
        financials: { value: '₹2,00,87,432', confidence: 0.97, source_ref: 'Financials p.12, Note 3', normalized_note: 'normalized from ₹ lakhs' },
        projections: { value: '₹2.0 Cr', confidence: 0.9, source_ref: 'Projections tab "Actuals base"' },
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: 'All three operating documents agree within ₹0.01 Cr after unit normalization. Flagged unresolved only because the audited figure carries four extra significant digits.',
    },
    {
      metric: 'Gross Margin',
      documents: {
        pitch_deck: { value: '38%', confidence: 0.9, source_ref: 'Deck p.9' },
        mis: { value: '37.9%', confidence: 0.92, source_ref: 'MIS tab "P&L", row 12' },
        financials: { value: '37.8%', confidence: 0.95, source_ref: 'Financials p.14', normalized_note: 'aligned FY→CY' },
        projections: null,
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: '0.2pp spread is within tolerance; consistent after fiscal alignment.',
    },
    {
      metric: 'Repeat Purchase Rate',
      documents: {
        pitch_deck: { value: '90%', confidence: 0.78, source_ref: 'Deck p.11, "Retention"', normalized_note: 'read from chart, ~90% confidence' },
        mis: { value: '61%', confidence: 0.86, source_ref: 'MIS tab "Cohorts", cell B14' },
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'verified_mismatch',
      materiality: 'material_mismatch',
      ai_reasoning: '29-point gap. Deck value was vision-extracted from a chart; MIS cohort figure is a direct cell read. Likely a definition mismatch (cumulative vs. trailing 90-day) but cannot be confirmed from documents alone.',
    },
    {
      metric: 'Projection CAGR (3yr)',
      documents: {
        pitch_deck: { value: '3.1×/yr', confidence: 0.88, source_ref: 'Deck p.16, "Outlook"' },
        mis: null,
        financials: { value: '1.6×/yr', confidence: 0.9, source_ref: 'Financials p.20, computed from 3-yr revenue' },
        projections: { value: '3.1×/yr', confidence: 0.83, source_ref: 'Projections tab "Growth"' },
        cap_table: null,
      },
      status: 'verified_mismatch',
      materiality: 'material_mismatch',
      ai_reasoning: 'Stated growth rate is ~2× the historical rate derived from audited financials. Projection assumption is not substantiated by MIS/financials.',
    },
    {
      metric: 'Founder Ownership',
      documents: {
        pitch_deck: { value: '72%', confidence: 0.85, source_ref: 'Deck p.20, "Cap Table"' },
        mis: null,
        financials: null,
        projections: null,
        cap_table: { value: '71.4%', confidence: 0.99, source_ref: 'Cap Table rows 2–4, sum' },
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: '0.6pp gap within rounding; deck rounds 71.4% to "72%".',
    },
    {
      metric: 'Cash Runway',
      documents: {
        pitch_deck: { value: '18 months', confidence: 0.8, source_ref: 'Deck p.22' },
        mis: { value: '17 months', confidence: 0.84, source_ref: 'MIS tab "Cash", row 8' },
        financials: null,
        projections: { value: '18 months', confidence: 0.82, source_ref: 'Projections tab "Burn"' },
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: 'One-month variance attributable to burn-rate rounding.',
    },
    {
      metric: 'Customer Acquisition Cost',
      documents: {
        pitch_deck: { value: '₹4,200', confidence: 0.83, source_ref: 'Deck p.13' },
        mis: { value: '₹4,180', confidence: 0.88, source_ref: 'MIS tab "Marketing", row 5' },
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: '₹20 variance within tolerance; synonym "Top Line" reconciled to Revenue.',
    },
    {
      metric: 'Total Addressable Market',
      documents: {
        pitch_deck: { value: '$12 B', confidence: 0.7, source_ref: 'Deck p.5' },
        mis: null,
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'missing_information',
      materiality: 'critical_red_flag',
      ai_reasoning: 'TAM stated only in deck; no corroborating market sizing in any other document. Cannot verify.',
    },
  ],
  follow_up_questions: [
    { question: 'How is "repeat purchase rate" defined? The deck cites 90% while MIS cohorts show 61%.', related_metric: 'Repeat Purchase Rate', severity: 'high' },
    { question: 'What drives the 3.1× projected CAGR versus the 1.6× historical rate?', related_metric: 'Projection CAGR (3yr)', severity: 'high' },
    { question: 'Can you share the methodology behind the $12B TAM figure?', related_metric: 'Total Addressable Market', severity: 'medium' },
  ],
  report_download_url: '#mock-clean-report.pdf',
};

const messyReport: ReportResponse = {
  readiness_score: 41,
  document_completeness_pct: 80,
  top_red_flags: [
    'Revenue: pitch deck claims ₹2.0 Cr vs. MIS ₹1.6 Cr — a 20% discrepancy.',
    'Cap table sums to 97% — 3% unaccounted, stake allocation incomplete.',
    'Deck claims "4,000 active customers"; MIS shows 2,100 — 48% overstatement.',
  ],
  top_strengths: [
    'Burn rate figures agree across MIS and projections (₹38L/month).',
    'Audited gross margin (34.1%) reconciles with MIS after unit normalization.',
  ],
  matrix: [
    {
      metric: 'Revenue (FY24)',
      documents: {
        pitch_deck: { value: '₹2.0 Cr', confidence: 0.93, source_ref: 'Deck p.7, "Traction"' },
        mis: { value: '₹1.6 Cr', confidence: 0.89, source_ref: 'MIS tab "P&L", row 4' },
        financials: { value: '₹1,61,20,110', confidence: 0.95, source_ref: 'Financials p.12, Note 3', normalized_note: 'normalized from ₹ lakhs' },
        projections: { value: '₹2.0 Cr', confidence: 0.87, source_ref: 'Projections tab "Base case"' },
        cap_table: null,
      },
      status: 'verified_mismatch',
      materiality: 'critical_red_flag',
      ai_reasoning: '20% gap between deck and MIS/financials. MIS and audited financials agree (₹1.6 Cr). Deck figure is unsubstantiated and repeated in projections base case.',
    },
    {
      metric: 'Active Customers',
      documents: {
        pitch_deck: { value: '4,000', confidence: 0.9, source_ref: 'Deck p.8, "Usage"' },
        mis: { value: '2,100', confidence: 0.87, source_ref: 'MIS tab "Ops", cell C3' },
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'verified_mismatch',
      materiality: 'critical_red_flag',
      ai_reasoning: '48% overstatement in deck vs. MIS. No definition nuance detected; both appear to reference "active" count.',
    },
    {
      metric: 'Cap Table Sum',
      documents: {
        pitch_deck: { value: '100%', confidence: 0.82, source_ref: 'Deck p.20, "Ownership"' },
        mis: null,
        financials: null,
        projections: null,
        cap_table: { value: '97%', confidence: 0.99, source_ref: 'Cap Table, sum of all rows' },
      },
      status: 'verified_mismatch',
      materiality: 'critical_red_flag',
      ai_reasoning: 'Cap table rows sum to 97%, leaving 3% unallocated. Deck claims 100%. Fails the 100% validation.',
    },
    {
      metric: 'Founder Ownership',
      documents: {
        pitch_deck: { value: '65%', confidence: 0.84, source_ref: 'Deck p.20' },
        mis: null,
        financials: null,
        projections: null,
        cap_table: { value: '58%', confidence: 0.98, source_ref: 'Cap Table rows 2–4' },
      },
      status: 'verified_mismatch',
      materiality: 'material_mismatch',
      ai_reasoning: '7-point gap between deck and actual cap table. May reflect an unrecorded transfer or stale deck.',
    },
    {
      metric: 'Gross Margin',
      documents: {
        pitch_deck: { value: '40%', confidence: 0.88, source_ref: 'Deck p.9' },
        mis: { value: '34.2%', confidence: 0.9, source_ref: 'MIS tab "P&L", row 12' },
        financials: { value: '34.1%', confidence: 0.94, source_ref: 'Financials p.14', normalized_note: 'aligned FY→CY' },
        projections: null,
        cap_table: null,
      },
      status: 'verified_mismatch',
      materiality: 'material_mismatch',
      ai_reasoning: '5.9pp gap between deck and audited financials. MIS and financials agree closely.',
    },
    {
      metric: 'Monthly Burn',
      documents: {
        pitch_deck: { value: '₹38L', confidence: 0.82, source_ref: 'Deck p.22' },
        mis: { value: '₹38L', confidence: 0.86, source_ref: 'MIS tab "Cash", row 8' },
        financials: null,
        projections: { value: '₹38L', confidence: 0.83, source_ref: 'Projections tab "Burn"' },
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: 'All sources agree. Verified strength.',
    },
    {
      metric: 'Cash Runway',
      documents: {
        pitch_deck: { value: '12 months', confidence: 0.78, source_ref: 'Deck p.22' },
        mis: { value: '11 months', confidence: 0.83, source_ref: 'MIS tab "Cash", row 9' },
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'unresolved_inconsistency',
      materiality: 'rounding_error',
      ai_reasoning: 'One-month variance from burn rounding.',
    },
    {
      metric: 'Marketing Expenses (Q3)',
      documents: {
        pitch_deck: null,
        mis: { value: '₹8L', confidence: 0.84, source_ref: 'MIS tab "P&L", row 18', normalized_note: 'anomaly: 80% drop vs. Q2 ₹40L' },
        financials: null,
        projections: null,
        cap_table: null,
      },
      status: 'missing_information',
      materiality: 'material_mismatch',
      ai_reasoning: 'Internal anomaly: marketing spend dropped 80% in Q3 with no explanation in MIS footnotes. Flagged for manual review.',
    },
  ],
  follow_up_questions: [
    { question: 'Revenue: deck says ₹2.0 Cr but MIS/audited financials say ₹1.6 Cr. Which is correct and why?', related_metric: 'Revenue (FY24)', severity: 'high' },
    { question: 'Active customers: deck cites 4,000 vs. MIS 2,100. What counts as "active"?', related_metric: 'Active Customers', severity: 'high' },
    { question: 'Cap table sums to 97%. Where is the remaining 3% allocated?', related_metric: 'Cap Table Sum', severity: 'high' },
    { question: 'Marketing spend fell 80% in Q3 — was this intentional or a reporting gap?', related_metric: 'Marketing Expenses (Q3)', severity: 'medium' },
    { question: 'Founder ownership: deck says 65%, cap table says 58%. Explain the 7pp gap.', related_metric: 'Founder Ownership', severity: 'medium' },
  ],
  report_download_url: '#mock-messy-report.pdf',
};

export interface MockBundle {
  upload: UploadResponse;
  report: ReportResponse;
}

export const mockBundles: Record<'clean' | 'messy', MockBundle> = {
  clean: { upload: cleanUpload, report: cleanReport },
  messy: { upload: messyUpload, report: messyReport },
};

export function mockAnalysisStage(sessionId: string): AnalysisStatus {
  const stageMap: Record<string, number> = {
    'mock-session-clean-0001': 7,
    'mock-session-messy-0002': 7,
  };
  const stage = stageMap[sessionId] ?? 7;
  return {
    stage,
    stage_name: ['Ingesting documents', 'Extracting figures & text', 'Normalizing currency & calendar', 'Mapping financial ontology', 'Cross-referencing metrics', 'Scoring materiality & confidence', 'Compiling diligence report'][stage - 1] ?? 'Compiling diligence report',
    complete: true,
  };
}

export function mockReportForSession(sessionId: string): ReportResponse {
  if (sessionId === 'mock-session-clean-0001') return cleanReport;
  if (sessionId === 'mock-session-messy-0002') return messyReport;
  // Default generic upload → messy report for ad-hoc demos
  return messyReport;
}
