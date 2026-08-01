import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StageProgress } from '@/components/processing/StageProgress';
import { ActiveStageCard } from '@/components/processing/ActiveStageCard';
import { ArrowLink } from '@/components/shared/ArrowLink';
import { PageTransition } from '@/components/layout/PageTransition';
import { useSession } from '@/context/SessionContext';
import { useAnalysisSession } from '@/hooks/useAnalysisSession';
import { useReportData } from '@/hooks/useReportData';

export default function Processing() {
  const navigate = useNavigate();
  const { session_id, status, stageState, upload } = useSession();
  const { ANALYSIS_STAGES, beginAnalysis } = useAnalysisSession();
  const { report } = useReportData();

  // Kick off analysis if we have a session but haven't started
  useEffect(() => {
    if (!session_id) {
      navigate('/upload');
      return;
    }
    if (stageState === 'queued' && session_id) {
      void beginAnalysis(session_id);
    }
  }, [session_id, stageState, beginAnalysis, navigate]);

  // Redirect to dashboard once complete + report ready
  useEffect(() => {
    if (stageState === 'complete' || (status?.complete && report)) {
      const t = setTimeout(() => navigate('/dashboard'), 800);
      return () => clearTimeout(t);
    }
  }, [stageState, status, report, navigate]);

  const currentStage = status?.stage ?? 1;
  const stageName = status?.stage_name ?? ANALYSIS_STAGES[0];

  return (
    <PageTransition>
      <div className="mx-auto max-w-ledger px-5 py-12 lg:px-8">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <span>Upload</span>
          <span>→</span>
          <span className="text-ink">Processing</span>
          <span>→</span>
          <span>Dashboard</span>
        </div>

        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* left: active stage card */}
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-ink">
              Analyzing documents
            </h1>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              Prism is running a seven-stage consistency audit across your uploaded documents.
              Each stage stamps its tick mark when complete.
            </p>

            <div className="mt-6">
              <ActiveStageCard
                stageName={stageName}
                stageNumber={currentStage}
                total={ANALYSIS_STAGES.length}
              />
            </div>

            {upload && (
              <div className="mt-4 rounded-lg border border-rule bg-paper-tint p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Session
                </p>
                <p className="mt-1 font-mono text-[12px] text-ink-muted truncate">
                  {upload.session_id}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {upload.files.length} documents
                </p>
              </div>
            )}

            <div className="mt-6">
              <ArrowLink to="/upload" variant="muted">
                Back to upload
              </ArrowLink>
            </div>
          </div>

          {/* right: stage progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-rule bg-paper-tint p-6 shadow-card"
          >
            <p className="mb-5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Pipeline progress
            </p>
            <StageProgress stages={ANALYSIS_STAGES} currentStage={currentStage} />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
