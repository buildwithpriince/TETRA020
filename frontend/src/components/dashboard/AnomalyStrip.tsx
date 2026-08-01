import { motion } from 'framer-motion';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';
import type { MatrixRow } from '@/api/types';

interface AnomalyStripProps {
  matrix: MatrixRow[];
  onSelectMetric: (metric: string) => void;
}

interface AnomalyItem {
  metric: string;
  note: string;
  reasoning: string;
  direction: 'down' | 'up';
}

function extractAnomalies(matrix: MatrixRow[]): AnomalyItem[] {
  return matrix
    .filter((row) => {
      const reasoning = row.ai_reasoning.toLowerCase();
      return reasoning.includes('anomaly') || reasoning.includes('spike') || reasoning.includes('drop');
    })
    .map((row) => {
      const note = Object.values(row.documents).find((e) => e?.normalized_note?.toLowerCase().includes('anomaly'))?.normalized_note ?? '';
      const reasoning = row.ai_reasoning;
      const direction: 'down' | 'up' = reasoning.toLowerCase().includes('drop') || reasoning.toLowerCase().includes('down') ? 'down' : 'up';
      return { metric: row.metric, note, reasoning, direction };
    });
}

export function AnomalyStrip({ matrix, onSelectMetric }: AnomalyStripProps) {
  const anomalies = extractAnomalies(matrix);

  if (!anomalies.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-amber/40 bg-amber-soft/30 p-5"
    >
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-amber" />
        <h3 className="font-display text-[17px] font-medium text-ink">Data anomaly detection</h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-amber">
          {anomalies.length} internal anomaly{anomalies.length !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-ink-muted">
        Unusual spikes or drops within a single document&apos;s own historical trend — distinct from cross-document mismatches.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {anomalies.map((a, i) => {
          const Icon = a.direction === 'down' ? TrendingDown : TrendingUp;
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelectMetric(a.metric)}
              className="group flex items-start gap-2.5 rounded-md border border-amber/30 bg-paper px-3 py-2.5 text-left transition-colors hover:border-amber/60 hover:bg-amber-soft/20 sm:flex-1"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${a.direction === 'down' ? 'text-redink' : 'text-amber'}`} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-ink">{a.metric}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-muted line-clamp-2">
                  {a.note || a.reasoning}
                </p>
                <span className="mt-1 inline-block font-mono text-[9px] uppercase tracking-wider text-amber group-hover:underline">
                  See flagged metric →
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
