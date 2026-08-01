import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { FollowUpQuestion } from '@/api/types';

interface FollowUpQuestionsListProps {
  questions: FollowUpQuestion[];
  onSelectMetric: (metric: string) => void;
}

const SEVERITY_STYLES: Record<FollowUpQuestion['severity'], { label: string; cls: string }> = {
  high: { label: 'High', cls: 'bg-redink-soft text-redink-dark' },
  medium: { label: 'Medium', cls: 'bg-amber-soft text-amber' },
  low: { label: 'Low', cls: 'bg-rule/50 text-ink-muted' },
};

export function FollowUpQuestionsList({ questions, onSelectMetric }: FollowUpQuestionsListProps) {
  const ranked = [...questions].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="rounded-lg border border-rule bg-paper-tint p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[17px] font-medium text-ink">Diligence follow-up questions</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Ranked · most material first
        </span>
      </div>
      <p className="mt-0.5 text-[13px] text-ink-muted">
        Investor-style questions generated per discrepancy. Click to jump to the related matrix cell.
      </p>

      <ol className="mt-4 space-y-2">
        {ranked.map((q, i) => {
          const sev = SEVERITY_STYLES[q.severity];
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <button
                onClick={() => onSelectMetric(q.related_metric)}
                className="group flex w-full items-start gap-3 rounded-md border border-rule bg-paper px-3.5 py-3 text-left transition-colors hover:border-ink/20 hover:bg-paper-shade"
              >
                <span className="font-mono-num text-[12px] font-medium text-ink-muted mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <p className="text-[13.5px] leading-relaxed text-ink">{q.question}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${sev.cls}`}>
                      {sev.label}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">
                      See flagged metric
                    </span>
                    <ArrowRight
                      size={13}
                      className="text-ink-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
