import { motion, AnimatePresence } from 'framer-motion';
import { TickStamp } from '@/components/shared/TickStamp';

type StageState = 'queued' | 'active' | 'complete';

interface StageProgressProps {
  stages: string[];
  currentStage: number; // 1-indexed
}

export function StageProgress({ stages, currentStage }: StageProgressProps) {
  return (
    <div className="space-y-0">
      {stages.map((name, i) => {
        const stageNum = i + 1;
        let state: StageState = 'queued';
        if (stageNum < currentStage) state = 'complete';
        else if (stageNum === currentStage) state = 'active';

        const isLast = i === stages.length - 1;

        return (
          <div key={name} className="relative grid grid-cols-[auto_1fr] gap-4 pb-6 last:pb-0">
            {/* node + connecting line */}
            <div className="relative flex flex-col items-center">
              <div className="z-10 flex h-7 w-7 items-center justify-center">
                {state === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: [0, 1.22, 1], rotate: 0 }}
                    transition={{ duration: 0.45, type: 'spring', stiffness: 400, damping: 13 }}
                  >
                    <TickStamp variant="verified" size="md" />
                  </motion.div>
                )}
                {state === 'active' && (
                  <motion.span
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-redink"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-redink" />
                  </motion.span>
                )}
                {state === 'queued' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-rule">
                    <span className="font-mono text-[9px] text-ink-muted">{stageNum}</span>
                  </span>
                )}
              </div>
              {!isLast && (
                <div className="absolute top-7 h-[calc(100%-1.75rem)] w-px bg-rule">
                  <motion.div
                    className="absolute left-0 top-0 w-px bg-verified"
                    initial={{ height: 0 }}
                    animate={{ height: state === 'complete' ? '100%' : 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>

            {/* label */}
            <div className="pt-0.5">
              <p
                className={`text-[14px] font-medium ${
                  state === 'active' ? 'text-ink' : state === 'complete' ? 'text-ink-soft' : 'text-ink-muted'
                }`}
              >
                {name}
              </p>
              <AnimatePresence>
                {state === 'active' && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 font-mono text-[11px] text-redink"
                  >
                    processing…
                  </motion.p>
                )}
                {state === 'complete' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1 font-mono text-[11px] text-verified"
                  >
                    done
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
