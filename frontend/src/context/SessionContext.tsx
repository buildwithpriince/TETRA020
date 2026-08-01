import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { UploadResponse, ReportResponse, AnalysisStatus } from '@/api/types';

export type AnalysisStageState = 'idle' | 'queued' | 'active' | 'complete';

export interface SessionState {
  session_id: string | null;
  upload: UploadResponse | null;
  files: { filename: string; detected_type: string }[];
  status: AnalysisStatus | null;
  report: ReportResponse | null;
  stageState: AnalysisStageState;
  activeMetric: string | null;
}

interface SessionContextValue extends SessionState {
  setUpload: (upload: UploadResponse, files: { filename: string; detected_type: string }[]) => void;
  setStatus: (status: AnalysisStatus) => void;
  setReport: (report: ReportResponse) => void;
  setStageState: (s: AnalysisStageState) => void;
  setActiveMetric: (m: string | null) => void;
  clearSession: () => void;
}

const STORAGE_KEY = 'prism_session_v1';

const empty: SessionState = {
  session_id: null,
  upload: null,
  files: [],
  status: null,
  report: null,
  stageState: 'idle',
  activeMetric: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function loadFromStorage(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return { ...empty, ...parsed, activeMetric: null };
  } catch {
    return empty;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(empty);
  const hydratedRef = useRef(false);

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setState(loadFromStorage());
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const { activeMetric, ...persistable } = state;
    void activeMetric;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      setUpload: (upload, files) =>
        setState((s) => ({ ...s, session_id: upload.session_id, upload, files, stageState: 'queued' })),
      setStatus: (status) => setState((s) => ({ ...s, status })),
      setReport: (report) => setState((s) => ({ ...s, report })),
      setStageState: (stageState) => setState((s) => ({ ...s, stageState })),
      setActiveMetric: (activeMetric) => setState((s) => ({ ...s, activeMetric })),
      clearSession: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        setState(empty);
      },
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
