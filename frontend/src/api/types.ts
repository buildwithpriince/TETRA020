// TypeScript interfaces matching the backend API contract exactly.

export type DetectedType =
  | 'pitch_deck'
  | 'mis'
  | 'financials'
  | 'projections'
  | 'cap_table'
  | 'unknown';

export type FileStatus = 'validated' | 'corrupted' | 'malware_flagged' | 'scanning';

export interface UploadedFile {
  file_id: string;
  filename: string;
  detected_type: DetectedType;
  status: FileStatus;
  confidence: number;
}

export interface UploadResponse {
  session_id: string;
  files: UploadedFile[];
  missing_document_types: string[];
}

export interface AnalysisStatus {
  stage: number; // 1-7
  stage_name: string;
  complete: boolean;
}

export interface MetricEntry {
  value: string;
  confidence: number;
  source_ref: string;
  normalized_note?: string;
}

export type DocKey = 'pitch_deck' | 'mis' | 'financials' | 'projections' | 'cap_table';

export interface MatrixRow {
  metric: string;
  documents: Record<DocKey, MetricEntry | null>;
  status: 'verified_mismatch' | 'unresolved_inconsistency' | 'missing_information';
  materiality: 'rounding_error' | 'material_mismatch' | 'critical_red_flag';
  ai_reasoning: string;
}

export type Severity = 'high' | 'medium' | 'low';

export interface FollowUpQuestion {
  question: string;
  related_metric: string;
  severity: Severity;
}

export interface ReportResponse {
  readiness_score: number;
  document_completeness_pct: number;
  top_red_flags: string[];
  top_strengths: string[];
  matrix: MatrixRow[];
  follow_up_questions: FollowUpQuestion[];
  report_download_url: string;
}

export const ANALYSIS_STAGES: string[] = [
  'Ingesting documents',
  'Extracting figures & text',
  'Normalizing currency & calendar',
  'Mapping financial ontology',
  'Cross-referencing metrics',
  'Scoring materiality & confidence',
  'Compiling diligence report',
];
