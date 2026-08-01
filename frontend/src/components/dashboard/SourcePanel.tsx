import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MatrixRow, DocKey, MetricEntry } from '@/api/types';
import { TickStamp } from '@/components/shared/TickStamp';
import { DOC_COLUMNS } from './MetricMatrix';
import { reclassifyMateriality, rowVariance } from '@/utils/materiality';

interface SourcePanelProps {
  row: MatrixRow | null;
  onClose: () => void;
  tolerancePct: number;
}

export function SourcePanel({ row, onClose, tolerancePct }: SourcePanelProps) {
  return (
    <AnimatePresence>
      {row && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/20"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[440px] overflow-y-auto border-l border-rule bg-paper-tint shadow-page"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-rule bg-paper-tint px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Source audit trail</p>
                <h3 className="font-display text-[18px] font-medium text-ink">{row.metric}</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-rule p-1.5 text-ink-muted transition-colors hover:bg-paper-shade"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              {/* status + live materiality */}
              <div className="flex items-center gap-2">
                <TickStamp
                  variant={
                    row.status === 'verified_mismatch'
                      ? 'flag'
                      : row.status === 'missing_information'
                      ? 'missing'
                      : 'amber'
                  }
                  size="md"
                />
                <span className="text-[13px] font-medium text-ink">
                  {row.status === 'verified_mismatch'
                    ? 'Verified mismatch'
                    : row.status === 'missing_information'
                    ? 'Missing information'
                    : 'Unresolved inconsistency'}
                </span>
                <motion.span
                  key={tolerancePct + row.metric}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`ml-auto rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    reclassifyMateriality(row, tolerancePct) === 'critical_red_flag'
                      ? 'bg-redink-soft text-redink-dark'
                      : reclassifyMateriality(row, tolerancePct) === 'material_mismatch'
                      ? 'bg-amber-soft text-amber'
                      : 'bg-rule/40 text-ink-muted'
                  }`}
                >
                  {reclassifyMateriality(row, tolerancePct).replace(/_/g, ' ')}
                </motion.span>
              </div>

              {/* variance indicator */}
              {row.status !== 'missing_information' && (
                <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-ink-muted">
                  <span>Variance:</span>
                  <span className={`font-medium ${
                    rowVariance(row) >= tolerancePct ? 'text-redink' : rowVariance(row) >= tolerancePct * 0.4 ? 'text-amber' : 'text-ink'
                  }`}>
                    {rowVariance(row)}%
                  </span>
                  <span>at {tolerancePct}% tolerance</span>
                </div>
              )}

              {/* split source comparison */}
              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mb-2">
                  Document comparison
                </p>
                <div className="space-y-2">
                  {DOC_COLUMNS.map((col) => {
                    const entry = row.documents[col.key as DocKey];
                    return (
                      <SourceRow
                        key={col.key}
                        docLabel={col.label}
                        entry={entry}
                      />
                    );
                  })}
                </div>
              </div>

              {/* AI reasoning */}
              <div className="mt-5 rounded-lg border border-rule bg-paper p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">AI reasoning</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{row.ai_reasoning}</p>
              </div>

              {/* back link */}
              <div className="mt-6 border-t border-rule pt-4">
                <Link
                  to="/dashboard"
                  onClick={onClose}
                  className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
                  Back to dashboard
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SourceRow({
  docLabel,
  entry,
}: {
  docLabel: string;
  entry: MetricEntry | null;
}) {
  const fromChart = entry?.normalized_note?.toLowerCase().includes('chart');
  return (
    <div className="flex items-start gap-3 rounded-md border border-rule bg-paper-tint px-3 py-2.5">
      <div className="w-24 shrink-0">
        <p className="text-[12px] font-medium text-ink">{docLabel}</p>
      </div>
      {entry ? (
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-num text-[15px] font-medium text-ink">{entry.value}</span>
            <span
              className={`font-mono text-[10px] ${entry.confidence < 0.85 ? 'text-redink' : 'text-ink-muted'}`}
            >
              conf {entry.confidence.toFixed(2)}
              {entry.confidence < 0.85 && ' · low'}
            </span>
            {fromChart && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-soft px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-amber" title="Value extracted from a chart via vision">
                <BarChart3 size={9} />
                Chart
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-ink-muted">{entry.source_ref}</p>
          {entry.normalized_note && (
            <p className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[9px] ${
              fromChart ? 'bg-amber-soft text-amber' : 'bg-paper-shade text-ink-muted'
            }`}>
              {entry.normalized_note}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-2 py-1">
          <TickStamp variant="missing" size="sm" />
          <span className="font-mono text-[11px] text-ink-muted">Not present in this document</span>
        </div>
      )}
    </div>
  );
}
