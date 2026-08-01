import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, FileX, BarChart3, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReadinessGauge } from '@/components/dashboard/ReadinessGauge';
import { MetricMatrix } from '@/components/dashboard/MetricMatrix';
import { SourcePanel } from '@/components/dashboard/SourcePanel';
import { ToleranceSlider } from '@/components/dashboard/ToleranceSlider';
import { FollowUpQuestionsList } from '@/components/dashboard/FollowUpQuestionsList';
import { RedFlagsCard } from '@/components/dashboard/RedFlagsCard';
import { CapTableValidator } from '@/components/dashboard/CapTableValidator';
import { AnomalyStrip } from '@/components/dashboard/AnomalyStrip';
import { ArrowLink } from '@/components/shared/ArrowLink';
import { PageTransition } from '@/components/layout/PageTransition';
import { useSession } from '@/context/SessionContext';
import { useReportData } from '@/hooks/useReportData';
import { getReportDownloadUrl } from '@/api/client';
import { reclassifyMateriality } from '@/utils/materiality';

export default function Dashboard() {
  const navigate = useNavigate();
  const { session_id, report, activeMetric, setActiveMetric, clearSession, upload, setUpload, setStageState, setReport } = useSession();
  const { loading, error } = useReportData();
  const [tolerance, setTolerance] = useState(25);

  const flaggedCount = useMemo(
    () =>
      report?.matrix.filter((r) => {
        if (r.status === 'missing_information') return false;
        return reclassifyMateriality(r, tolerance) !== 'rounding_error';
      }).length ?? 0,
    [report, tolerance],
  );

  const activeRow = useMemo(
    () => report?.matrix.find((r) => r.metric === activeMetric) ?? null,
    [report, activeMetric],
  );

  const handleDownload = async () => {
    if (!session_id) return;
    const url = await getReportDownloadUrl(session_id);
    window.open(url, '_blank');
  };

  const loadSampleInstantly = async () => {
    clearSession();
    const { uploadDocuments } = await import('@/api/client');
    const { mockReportForSession } = await import('@/api/mockData');
    const uploadRes = await uploadDocuments(
      [
        { filename: 'Acme_PitchDeck_Final.pdf' },
        { filename: 'Acme_MIS_Q4.xlsx' },
        { filename: 'Acme_Financials_2024.pdf' },
        { filename: 'Acme_Projections.xlsx' },
        { filename: 'Acme_CapTable.csv' },
      ],
      'messy',
    );
    setUpload(uploadRes, uploadRes.files.map((f) => ({ filename: f.filename, detected_type: f.detected_type })));
    setStageState('complete');
    setReport(mockReportForSession(uploadRes.session_id));
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-ledger flex-col items-center justify-center px-5 py-32 lg:px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            className="h-8 w-8 rounded-full border-2 border-rule border-t-redink"
          />
          <p className="mt-4 font-mono text-[12px] uppercase tracking-wider text-ink-muted">
            Compiling report…
          </p>
        </div>
      </PageTransition>
    );
  }

  if (error || (!report && !loading)) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-ledger px-5 py-24 text-center lg:px-8">
          <FileX size={36} className="mx-auto text-ink-muted" />
          <h1 className="mt-4 font-display text-[24px] font-medium text-ink">No report yet</h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            {error ?? 'Upload documents and run an analysis to see the dashboard.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ArrowLink to="/upload" variant="red">
              Go to upload
            </ArrowLink>
            <button
              onClick={loadSampleInstantly}
              className="inline-flex items-center gap-2 rounded-md border border-rule bg-paper-tint px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-paper-shade"
            >
              <Zap size={15} className="text-redink" />
              Load sample company instantly
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!report) return null;

  return (
    <PageTransition>
      <div className="mx-auto max-w-ledger px-5 py-10 lg:px-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              <span>Upload</span>
              <span>→</span>
              <span>Processing</span>
              <span>→</span>
              <span className="text-ink">Dashboard</span>
            </div>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink">
              Diligence report
            </h1>
            {upload && (
              <p className="mt-1 font-mono text-[11px] text-ink-muted">
                Session {upload.session_id} · {upload.files.length} documents
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearSession(); navigate('/upload'); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper-tint px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-paper-shade"
            >
              <RotateCcw size={14} />
              New check
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              <Download size={14} />
              Download report
            </button>
          </div>
        </div>

        {/* scorecard */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[300px_1fr]">
          {/* gauge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center rounded-lg border border-rule bg-paper-tint p-6 shadow-card"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Overall readiness
            </p>
            <div className="mt-3">
              <ReadinessGauge score={report.readiness_score} />
            </div>
          </motion.div>

          {/* flags + strengths + completeness */}
          <RedFlagsCard
            redFlags={report.top_red_flags}
            strengths={report.top_strengths}
            completeness={report.document_completeness_pct}
          />
        </div>

        {/* tolerance slider */}
        <div className="mt-6">
          <ToleranceSlider value={tolerance} onChange={setTolerance} />
        </div>

        {/* matrix */}
        <div className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[22px] font-medium text-ink">
              Document × metric matrix
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Click any cell for the source audit trail
            </span>
          </div>
          <MetricMatrix
            rows={report.matrix}
            activeMetric={activeMetric}
            onSelectMetric={setActiveMetric}
            tolerancePct={tolerance}
            flaggedCount={flaggedCount}
          />
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-5 rounded-lg border border-rule bg-paper-tint px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Legend:</span>
          <LegendItem variant="flag" label="Verified mismatch" />
          <LegendItem variant="amber" label="Unresolved inconsistency" />
          <LegendItem variant="missing" label="Missing information" />
          <div className="flex items-center gap-1.5">
            <BarChart3 size={13} className="text-amber" />
            <span className="text-[12px] text-ink-soft">Read from chart</span>
          </div>
          <span className="ml-auto font-mono text-[10px] text-ink-muted">
            Low confidence (&lt;0.85) shown in red
          </span>
        </div>

        {/* cap table validator + anomaly detection */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <CapTableValidator matrix={report.matrix} />
          <div className="space-y-5">
            <AnomalyStrip matrix={report.matrix} onSelectMetric={setActiveMetric} />
          </div>
        </div>

        {/* follow-up questions */}
        <div className="mt-8">
          <FollowUpQuestionsList
            questions={report.follow_up_questions}
            onSelectMetric={setActiveMetric}
          />
        </div>

        {/* back link */}
        <div className="mt-10">
          <ArrowLink to="/upload" variant="muted">
            Run another check
          </ArrowLink>
        </div>
      </div>

      {/* source side panel */}
      <SourcePanel row={activeRow} onClose={() => setActiveMetric(null)} tolerancePct={tolerance} />
    </PageTransition>
  );
}

function LegendItem({ variant, label }: { variant: 'flag' | 'amber' | 'missing'; label: string }) {
  const dot =
    variant === 'flag' ? 'bg-redink' : variant === 'amber' ? 'bg-amber' : 'bg-rule';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className="text-[12px] text-ink-soft">{label}</span>
    </div>
  );
}
