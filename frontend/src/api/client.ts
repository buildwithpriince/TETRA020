import { IS_MOCK, API_BASE_URL } from '@/config';
import type { UploadResponse, AnalysisStatus, ReportResponse, DetectedType } from './types';
import { mockBundles, mockAnalysisStage, mockReportForSession } from './mockData';

export interface AnalysisProgress {
  stage: number;
  stage_name: string;
  complete: boolean;
}

export interface UploadedFileLite {
  filename: string;
  file?: File;
  detected_type?: DetectedType | 'unknown';
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getAuthToken(): string | null {
  // Auth token stored by AuthContext; attached as Bearer on real calls.
  return sessionStorage.getItem('prism_auth_token');
}

async function realRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return (await res.json()) as T;
}

// --- Mock implementations -------------------------------------------------

async function mockUpload(
  files: UploadedFileLite[],
  kind: 'clean' | 'messy',
): Promise<UploadResponse> {
  await delay(700);
  const bundle = mockBundles[kind];
  // Map the provided filenames onto the bundle's file list when possible.
  const mapped = bundle.upload.files.map((f, i) =>
    files[i] ? { ...f, filename: files[i].filename } : f,
  );
  return { ...bundle.upload, files: mapped };
}

async function mockStatus(sessionId: string): Promise<AnalysisStatus> {
  await delay(200);
  return mockAnalysisStage(sessionId);
}

async function mockStart(sessionId: string): Promise<{ session_id: string; started: boolean }> {
  await delay(300);
  return { session_id: sessionId, started: true };
}

async function mockReport(sessionId: string): Promise<ReportResponse> {
  await delay(500);
  return mockReportForSession(sessionId);
}

// --- Public API -----------------------------------------------------------

export async function uploadDocuments(
  files: UploadedFileLite[],
  kind: 'clean' | 'messy' = 'messy',
): Promise<UploadResponse> {
  if (IS_MOCK) return mockUpload(files, kind);
  const hasRealFiles = files.some((f) => f.file);
  if (!hasRealFiles) {
    // One-click sample bootstrap: backend has fixture files bundled.
    return realRequest<UploadResponse>(`/api/sample/${kind}`, { method: 'POST' });
  }
  const formData = new FormData();
  for (const f of files) {
    if (f.file) formData.append('files', f.file, f.filename);
  }
  return realRequest<UploadResponse>('/api/upload', { method: 'POST', body: formData });
}

export async function getAnalysisStatus(sessionId: string): Promise<AnalysisStatus> {
  if (IS_MOCK) return mockStatus(sessionId);
  return realRequest<AnalysisStatus>(`/api/analyze/${sessionId}/status`);
}

export async function startAnalysis(sessionId: string): Promise<{ session_id: string; started: boolean }> {
  if (IS_MOCK) return mockStart(sessionId);
  return realRequest(`/api/analyze/${sessionId}`, { method: 'POST' });
}

export async function getReport(sessionId: string): Promise<ReportResponse> {
  if (IS_MOCK) return mockReport(sessionId);
  return realRequest<ReportResponse>(`/api/report/${sessionId}`);
}

export async function getReportDownloadUrl(sessionId: string): Promise<string> {
  if (IS_MOCK) return mockReportForSession(sessionId).report_download_url;
  if (API_BASE_URL) return `${API_BASE_URL}/api/report/${sessionId}/download`;
  return '#';
}

export { IS_MOCK };
