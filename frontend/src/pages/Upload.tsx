import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FlaskConical, Trash2, Zap, ArrowRight } from 'lucide-react';
import { DropZone, type DroppedFile } from '@/components/upload/DropZone';
import { FileStatusChip } from '@/components/upload/FileStatusChip';
import { MissingDocBanner } from '@/components/upload/MissingDocBanner';
import { ArrowLink } from '@/components/shared/ArrowLink';
import { PageTransition } from '@/components/layout/PageTransition';
import { useSession } from '@/context/SessionContext';
import { useAnalysisSession } from '@/hooks/useAnalysisSession';
import type { UploadResponse } from '@/api/types';

export default function Upload() {
  const navigate = useNavigate();
  const { upload, files, clearSession, setReport, setStageState } = useSession();
  const { submitFiles, beginAnalysis, error } = useAnalysisSession();
  const [busy, setBusy] = useState(false);

  const handleFiles = async (dropped: DroppedFile[]) => {
    setBusy(true);
    clearSession();
    await submitFiles(dropped, 'messy');
    setBusy(false);
  };

  const handleDemo = async (kind: 'clean' | 'messy') => {
    setBusy(true);
    clearSession();
    await submitFiles(
      kind === 'clean'
        ? [
            { filename: 'Northwind_PitchDeck_v3.pdf' },
            { filename: 'Northwind_MIS_FY24.xlsx' },
            { filename: 'Northwind_AuditedFinancials.pdf' },
            { filename: 'Northwind_Projections_3yr.xlsx' },
            { filename: 'Northwind_CapTable.csv' },
          ]
        : [
            { filename: 'Acme_PitchDeck_Final.pdf' },
            { filename: 'Acme_MIS_Q4.xlsx' },
            { filename: 'Acme_Financials_2024.pdf' },
            { filename: 'Acme_Projections.xlsx' },
            { filename: 'Acme_CapTable.csv' },
          ],
      kind,
    );
    setBusy(false);
  };

  /** One-click: load the synthetic sample company, skip processing, jump to dashboard. */
  const loadSampleInstantly = async () => {
    setBusy(true);
    clearSession();
    const uploadRes = await submitFiles(
      [
        { filename: 'Acme_PitchDeck_Final.pdf' },
        { filename: 'Acme_MIS_Q4.xlsx' },
        { filename: 'Acme_Financials_2024.pdf' },
        { filename: 'Acme_Projections.xlsx' },
        { filename: 'Acme_CapTable.csv' },
      ],
      'messy',
    );
    if (uploadRes) {
      // Simulate instant processing completion and load the report.
      setStageState('complete');
      const { mockReportForSession } = await import('@/api/mockData');
      setReport(mockReportForSession(uploadRes.session_id));
      navigate('/dashboard');
    }
    setBusy(false);
  };

  const startProcessing = async () => {
    if (!upload) return;
    await beginAnalysis(upload.session_id);
    navigate('/processing');
  };

  const currentUpload: UploadResponse | null = upload;

  return (
    <PageTransition>
      <div className="mx-auto max-w-ledger px-5 py-12 lg:px-8">
        {/* breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <span className="text-ink">Upload</span>
          <span>→</span>
          <span>Processing</span>
          <span>→</span>
          <span>Dashboard</span>
        </div>

        <h1 className="mt-4 font-display text-[36px] font-semibold leading-tight text-ink">
          Upload fundraising documents
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Drop in the startup's pitch deck, MIS, financial statements, projections, and cap
          table. Prism detects each document type and checks for missing core files.
        </p>

        {/* instant sample CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center gap-4 rounded-lg border border-redink/25 bg-gradient-to-r from-redink-soft/40 to-amber-soft/30 px-5 py-4"
        >
          <Zap size={22} className="shrink-0 text-redink" />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-ink">
              No documents handy? Load a synthetic company instantly.
            </p>
            <p className="text-[12px] text-ink-muted">
              Pre-built Acme Logistics dataset with 8 metrics, 3 red flags, cap table issues, and an internal anomaly — see the full dashboard in one click.
            </p>
          </div>
          <button
            onClick={loadSampleInstantly}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-redink px-4 py-2 text-[14px] font-medium text-paper transition-colors hover:bg-redink-dark disabled:opacity-50"
          >
            Load sample company
            <ArrowRight size={15} />
          </button>
        </motion.div>

        {/* demo buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Or try a sample upload set:
          </span>
          <button
            onClick={() => handleDemo('clean')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-verified/40 bg-verified-soft/40 px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-verified-soft disabled:opacity-50"
          >
            <Sparkles size={14} className="text-verified" />
            Clean startup
          </button>
          <button
            onClick={() => handleDemo('messy')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-redink/40 bg-redink-soft/40 px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-redink-soft disabled:opacity-50"
          >
            <FlaskConical size={14} className="text-redink" />
            Messy startup
          </button>
        </div>

        {/* drop zone */}
        <div className="mt-6">
          <DropZone onFiles={handleFiles} disabled={busy} />
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-redink/30 bg-redink-soft/30 px-4 py-2 text-[13px] text-redink-dark">
            {error}
          </p>
        )}

        {/* file list */}
        <AnimatePresence>
          {currentUpload && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[20px] font-medium text-ink">
                  {files.length} file{files.length !== 1 ? 's' : ''} ingested
                </h2>
                <button
                  onClick={() => { clearSession(); }}
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-redink"
                >
                  <Trash2 size={13} />
                  Clear all
                </button>
              </div>

              <MissingDocBanner missing={currentUpload.missing_document_types} />

              <div className="mt-4 space-y-2">
                {currentUpload.files.map((f) => (
                  <FileStatusChip
                    key={f.file_id}
                    filename={f.filename}
                    detected_type={f.detected_type}
                    status={f.status}
                    confidence={f.confidence}
                  />
                ))}
              </div>

              {/* proceed */}
              <div className="mt-6 flex items-center justify-between rounded-lg border border-rule bg-paper-tint px-5 py-4">
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    Ready to analyze
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    Start the seven-stage consistency analysis.
                  </p>
                </div>
                <button
                  onClick={startProcessing}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md bg-redink px-4 py-2 text-[14px] font-medium text-paper transition-colors hover:bg-redink-dark disabled:opacity-50"
                >
                  Start analysis
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* back link */}
        <div className="mt-10">
          <ArrowLink to="/" variant="muted">
            Back to overview
          </ArrowLink>
        </div>
      </div>
    </PageTransition>
  );
}
