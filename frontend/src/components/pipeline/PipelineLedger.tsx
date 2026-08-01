import { motion } from 'framer-motion';
import { TickStamp } from '@/components/shared/TickStamp';
import type { ReactNode } from 'react';

interface StageItemProps {
  index: number;
  title: string;
  description: string;
  detail: ReactNode;
  isLast: boolean;
}

export function StageItem({ index, title, description, detail, isLast }: StageItemProps) {
  return (
    <div className="relative grid grid-cols-[auto_1fr] gap-5 pb-12 last:pb-0">
      {/* tick + connecting rule */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          whileInView={{ scale: [0, 1.2, 1], rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 380, damping: 13 }}
          className="z-10"
        >
          <TickStamp variant="verified" size="lg" />
        </motion.div>

        {/* progressive connecting rule */}
        {!isLast && (
          <div className="absolute top-7 h-[calc(100%-1.75rem)] w-px bg-rule">
            <motion.div
              className="absolute left-0 top-0 w-px bg-verified"
              initial={{ height: 0 }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        )}
      </div>

      {/* content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="pt-0.5"
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-ink-muted">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display text-[20px] font-medium text-ink">{title}</h3>
        </div>
        <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-soft">{description}</p>
        <div className="mt-3">{detail}</div>
      </motion.div>
    </div>
  );
}

interface PipelineStage {
  title: string;
  description: string;
  detail: ReactNode;
}

export function PipelineLedger({ stages }: { stages: PipelineStage[] }) {
  return (
    <div>
      {stages.map((stage, i) => (
        <StageItem
          key={i}
          index={i}
          title={stage.title}
          description={stage.description}
          detail={stage.detail}
          isLast={i === stages.length - 1}
        />
      ))}
    </div>
  );
}
