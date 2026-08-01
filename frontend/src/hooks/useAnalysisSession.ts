import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import {
  uploadDocuments,
  startAnalysis,
  getAnalysisStatus,
  type UploadedFileLite,
} from '@/api/client';
import { ANALYSIS_STAGES } from '@/api/types';

/**
 * Orchestrates the upload → analyze → status polling lifecycle,
 * writing results into the shared SessionContext.
 */
export function useAnalysisSession() {
  const { setUpload, setStatus, setStageState, session_id, stageState } = useSession();
  const [error, setError] = useState<string | null>(null);

  const submitFiles = useCallback(
    async (files: UploadedFileLite[], kind: 'clean' | 'messy' = 'messy') => {
      setError(null);
      try {
        const upload = await uploadDocuments(files, kind);
        setUpload(upload, upload.files.map((f) => ({ filename: f.filename, detected_type: f.detected_type })));
        return upload;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
        return null;
      }
    },
    [setUpload],
  );

  const beginAnalysis = useCallback(
    async (sid: string) => {
      setError(null);
      setStageState('active');
      try {
        await startAnalysis(sid);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start analysis');
      }
    },
    [setStageState],
  );

  const pollStatus = useCallback(
    async (_sid: string) => {
      try {
        const status = await getAnalysisStatus(_sid);
        setStatus(status);
        if (status.complete) setStageState('complete');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Status check failed');
      }
    },
    [setStatus, setStageState],
  );

  // Auto-poll when active
  useEffect(() => {
    if (!session_id || stageState !== 'active') return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      const status = await getAnalysisStatus(session_id);
      if (!active) return;
      setStatus(status);
      if (status.complete) {
        setStageState('complete');
        clearInterval(interval);
      }
    }, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session_id, stageState, setStatus, setStageState]);

  return { submitFiles, beginAnalysis, pollStatus, error, ANALYSIS_STAGES };
}
