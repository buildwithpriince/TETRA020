import { motion } from 'framer-motion';
import { Info, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { MatrixRow, MetricEntry, DocKey } from '@/api/types';
import { TickStamp } from '@/components/shared/TickStamp';
import { reclassifyMateriality, rowVariance } from '@/utils/materiality';
import { AnomalyBadge } from '@/components/dashboard/AnomalyBadge';

export const DOC_COLUMNS: { key: DocKey; label: string; abbr: string }[] = [
  { key: 'pitch_deck', label: 'Pitch Deck', abbr: 'Deck' },
  { key: 'mis', label: 'MIS', abbr: 'MIS' },
  { key: 'financials', label: 'Financials', abbr: 'Fin.' },
  { key: 'projections', label: 'Projections', abbr: 'Proj.' },
  { key: 'cap_table', label: 'Cap Table', abbr: 'Cap' },
];

const MATERIALITY_LABEL: Record<MatrixRow['materiality'], string> = {
  rounding_error: 'Rounding',
  material_mismatch: 'Material',
  critical_red_flag: 'Critical',
};

const STATUS_VARIANT: Record<MatrixRow['status'], 'verified' | 'flag' | 'missing' | 'amber'> = {
  verified_mismatch: 'flag',
  unresolved_inconsistency: 'amber',
  missing_information: 'missing',
};

interface MatrixCellProps {
  entry: MetricEntry | null;
  onClick?: () => void;
  active?: boolean;
  tolerancePct: number;
}

function isLowConfidence(c: number): boolean {
  return c < 0.85;
}

function isChartExtracted(note?: string): boolean {
  return !!note && note.toLowerCase().includes('chart');
}

/** A single document×metric cell showing the value, confidence, and normalized note. */
export function MatrixCell({ entry, onClick, active }: MatrixCellProps) {
  if (!entry) {
    return (
      <td className="border-b border-l border-rule p-0">
        <button
          onClick={onClick}
          className={`flex h-full min-h-[64px] w-full flex-col items-center justify-center gap-1 px-2 py-2 transition-colors ${
            active ? 'bg-paper-shade' : 'hover:bg-paper-shade/60'
          }`}
        >
          <TickStamp variant="missing" size="sm" />
          <span className="font-mono text-[9px] text-ink-muted">—</span>
        </button>
      </td>
    );
  }

  const low = isLowConfidence(entry.confidence);
  const fromChart = isChartExtracted(entry.normalized_note);

  return (
    <td className="border-b border-l border-rule p-0">
      <button
        onClick={onClick}
        className={`flex h-full min-h-[64px] w-full flex-col items-center justify-center gap-1 px-2 py-2 transition-colors ${
          active ? 'bg-paper-shade' : 'hover:bg-paper-shade/60'
        }`}
      >
        <div className="flex items-center gap-1">
          <span className={`font-mono-num text-[13px] font-medium ${low ? 'text-redink' : 'text-ink'}`}>
            {entry.value}
          </span>
          {fromChart && (
            <span title="Value read from a chart via vision extraction" className="inline-flex">
              <BarChart3 size={11} className="text-amber" />
            </span>
          )}
        </div>
        <span className={`font-mono text-[9px] ${low ? 'text-redink' : 'text-ink-muted'}`}>
          {entry.confidence.toFixed(2)}
          {low && ' · low'}
        </span>
        {entry.normalized_note && (
          <span className={`font-mono text-[8px] leading-tight text-center max-w-[80px] ${
            fromChart ? 'text-amber' : 'text-ink-muted'
          }`}>
            {entry.normalized_note}
          </span>
        )}
      </button>
    </td>
  );
}

interface MetricMatrixProps {
  rows: MatrixRow[];
  activeMetric: string | null;
  onSelectMetric: (metric: string) => void;
  tolerancePct: number;
  flaggedCount: number;
}

export function MetricMatrix({ rows, activeMetric, onSelectMetric, tolerancePct, flaggedCount }: MetricMatrixProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-rule bg-paper-tint shadow-card">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-rule bg-paper-tint px-4 py-3 text-left">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Metric</span>
            </th>
            {DOC_COLUMNS.map((col) => (
              <th key={col.key} className="border-b border-l border-rule px-2 py-3 text-center">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{col.abbr}</span>
              </th>
            ))}
            <th className="border-b border-l border-rule px-3 py-3 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Status</span>
            </th>
            <th className="border-b border-l border-rule px-3 py-3 text-center">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">Var.</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const variant = STATUS_VARIANT[row.status];
            const isActive = activeMetric === row.metric;
            const liveMateriality = reclassifyMateriality(row, tolerancePct);
            const variance = rowVariance(row);
            const hasAnomaly = row.ai_reasoning.includes('anomaly') || row.ai_reasoning.includes('Internal anomaly');
            return (
              <motion.tr
                key={row.metric}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={isActive ? 'bg-paper-shade/50' : ''}
              >
                <td className="sticky left-0 z-10 border-b border-rule bg-paper-tint px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <MetricLabel metric={row.metric} />
                    {hasAnomaly && <AnomalyBadge />}
                  </div>
                  <motion.span
                    key={liveMateriality}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                      liveMateriality === 'critical_red_flag'
                        ? 'bg-redink-soft text-redink-dark'
                        : liveMateriality === 'material_mismatch'
                        ? 'bg-amber-soft text-amber'
                        : 'bg-rule/40 text-ink-muted'
                    }`}
                  >
                    {MATERIALITY_LABEL[liveMateriality]}
                  </motion.span>
                </td>
                {DOC_COLUMNS.map((col) => (
                  <MatrixCell
                    key={col.key}
                    entry={row.documents[col.key]}
                    onClick={() => onSelectMetric(row.metric)}
                    active={isActive}
                    tolerancePct={tolerancePct}
                  />
                ))}
                <td className="border-b border-l border-rule px-3 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <TickStamp variant={variant} size="md" />
                  </div>
                </td>
                <td className="border-b border-l border-rule px-3 py-2 text-center">
                  {variance > 0 ? (
                    <span className={`font-mono-num text-[12px] font-medium ${
                      variance >= tolerancePct ? 'text-redink' : variance >= tolerancePct * 0.4 ? 'text-amber' : 'text-ink-muted'
                    }`}>
                      {variance}%
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-ink-muted">—</span>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-rule px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {rows.length} metrics · {flaggedCount} flagged at {tolerancePct}%
        </span>
        <span className="font-mono text-[10px] text-ink-muted">
          Adjust tolerance above to reclassify
        </span>
      </div>
    </div>
  );
}

function MetricLabel({ metric }: { metric: string }) {
  const [showGlossary, setShowGlossary] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setShowGlossary(true)}
      onMouseLeave={() => setShowGlossary(false)}
    >
      <span className="text-[13px] font-medium text-ink">{metric}</span>
      <Info size={12} className="text-ink-muted/60" />
      {showGlossary && (
        <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-md border border-rule bg-paper-tint p-2.5 shadow-page">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Definition</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            {glossary[metric] ?? 'Auto-extracted from uploaded documents and cross-referenced for consistency.'}
          </p>
        </div>
      )}
    </span>
  );
}

const glossary: Record<string, string> = {
  'Revenue (FY24)': 'Total income from operations for fiscal year 2024, before costs. Reconciled across deck, MIS, and audited financials.',
  'Gross Margin': 'Revenue minus cost of goods sold, as a percentage of revenue.',
  'Repeat Purchase Rate': 'Share of customers making a repeat purchase within the measured window.',
  'Projection CAGR (3yr)': 'Compound annual growth rate implied by 3-year revenue projections.',
  'Founder Ownership': 'Combined equity stake held by listed founders.',
  'Cash Runway': 'Months of operating cash remaining at current burn rate.',
  'Customer Acquisition Cost': 'Total sales & marketing spend divided by new customers acquired.',
  'Total Addressable Market': 'Total revenue opportunity if 100% market share were achieved.',
  'Active Customers': 'Customers meeting the activity threshold in the reporting period.',
  'Cap Table Sum': 'Sum of all equity holder percentages; must equal 100%.',
  'Monthly Burn': 'Average monthly cash consumption (operating expenses minus revenue).',
  'Marketing Expenses (Q3)': 'Marketing line-item spend for the third quarter.',
};
