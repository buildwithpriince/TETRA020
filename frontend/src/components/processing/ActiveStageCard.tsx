import { motion } from 'framer-motion';
import { FileStack } from 'lucide-react';

interface ActiveStageCardProps {
  stageName: string;
  stageNumber: number;
  total: number;
}

export function ActiveStageCard({ stageName, stageNumber, total }: ActiveStageCardProps) {
  const pct = Math.round((stageNumber / total) * 100);
  return (
    <motion.div
      key={stageName}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-rule bg-paper-tint p-5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-paper">
          <FileStack size={20} className="text-redink" />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Stage {stageNumber} of {total}
          </p>
          <p className="font-display text-[18px] font-medium text-ink">{stageName}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-muted">Progress</span>
          <span className="font-mono-num text-[12px] font-medium text-ink">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rule">
          <motion.div
            className="h-full rounded-full bg-redink"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
