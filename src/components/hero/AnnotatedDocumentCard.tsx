import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { TickStamp } from '@/components/shared/TickStamp';
import { RedFlagAnnotation } from '@/components/shared/RedFlagAnnotation';

/**
 * A column of small tick-mark circles down the left margin of the document card,
 * stamping into place one at a time, top to bottom.
 */
export function TickMarginRail({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col items-center gap-3 pt-6">
      {Array.from({ length: count }).map((_, i) => (
        <TickStamp
          key={i}
          variant={i === 3 ? 'flag' : i === 5 ? 'missing' : 'verified'}
          size="sm"
          animate
          delay={0.8 + i * 0.12}
        />
      ))}
    </div>
  );
}

interface Row {
  label: string;
  value: string;
  source: string;
  confidence: number;
  state: 'verified' | 'mismatch';
}

const rows: Row[] = [
  { label: 'Revenue (FY24)', value: '₹2.0 Cr', source: 'Deck p.7 · "Traction"', confidence: 0.93, state: 'mismatch' },
  { label: 'Revenue (FY24)', value: '₹1.6 Cr', source: 'MIS · P&L row 4', confidence: 0.89, state: 'mismatch' },
  { label: 'Gross Margin', value: '38%', source: 'Deck p.9', confidence: 0.9, state: 'verified' },
  { label: 'Gross Margin', value: '37.8%', source: 'Financials p.14', confidence: 0.95, state: 'verified' },
  { label: 'Active Customers', value: '4,000', source: 'Deck p.8', confidence: 0.9, state: 'mismatch' },
  { label: 'Active Customers', value: '2,100', source: 'MIS · Ops C3', confidence: 0.87, state: 'mismatch' },
];

/**
 * The angled "page on a desk" card showing a real claim-vs-claim comparison
 * with a red circle/strike annotation drawing over the mismatched rows.
 */
export function AnnotatedDocumentCard() {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -7, y: 40 }}
      animate={{ opacity: 1, rotate: -3.5, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="relative"
    >
      {/* desk shadow */}
      <div className="absolute -inset-x-6 -bottom-6 top-2 -z-10 rotate-[-2deg] rounded-lg bg-ink/5 blur-2xl" />

      <div className="flex gap-3 rounded-lg border border-rule bg-paper-tint p-5 shadow-page">
        <TickMarginRail count={6} />

        <div className="flex-1">
          {/* document header */}
          <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-3">
            <div>
              <p className="font-display text-[15px] font-medium text-ink">Acme — Diligence Worksheet</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-0.5">
                Cross-document comparison · auto-extracted
              </p>
            </div>
            <span className="font-mono text-[10px] text-ink-muted">REF · 2024-Q4</span>
          </div>

          {/* rows */}
          <div className="space-y-0">
            {rows.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="relative grid grid-cols-[1fr_auto] items-center gap-4 border-b border-rule/60 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{row.label}</p>
                  <p className="font-mono text-[10px] text-ink-muted mt-0.5 truncate">
                    {row.source} · conf {row.confidence.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono-num text-[16px] font-medium ${row.state === 'mismatch' ? 'text-redink' : 'text-ink'}`}>
                    {row.value}
                  </span>
                  {row.state === 'verified' ? (
                    <Check size={14} strokeWidth={3} className="text-verified shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-redink shrink-0" />
                  )}
                </div>

                {/* red annotation overlay for mismatched rows */}
                {i === 1 && (
                  <div className="pointer-events-none absolute -right-3 -top-1 bottom-0 right-0 flex items-center">
                    <RedFlagAnnotation className="h-12 w-[140px]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* footer note */}
          <div className="mt-4 flex items-center justify-between">
            <span className="font-mono text-[10px] text-ink-muted">
              2 verified · 4 flagged · 0 missing
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider rounded-full bg-redink-soft px-2 py-0.5 text-redink-dark">
              Critical mismatch
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
