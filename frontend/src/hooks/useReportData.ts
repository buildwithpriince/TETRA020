import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { getReport } from '@/api/client';
import type { ReportResponse } from '@/api/types';

/**
 * Fetches the report for the current session_id, caching it in SessionContext
 * so navigation between routes doesn't refetch.
 */
export function useReportData() {
  const { session_id, report, setReport } = useSession();
  const [loading, setLoading] = useState(!report && !!session_id);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (sid: string): Promise<ReportResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const r = await getReport(sid);
        setReport(r);
        return r;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setReport],
  );

  useEffect(() => {
    if (!session_id || report) return;
    void fetchReport(session_id);
  }, [session_id, report, fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
