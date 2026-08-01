import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ReadinessGaugeProps {
  score: number; // 0-100
}

/**
 * An animated semicircular gauge showing the overall readiness score.
 */
export function ReadinessGauge({ score }: ReadinessGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(t);
  }, [score]);

  const radius = 80;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (animatedScore / 100) * circumference;

  const tone =
    score >= 70 ? '#3F5D3F' : score >= 45 ? '#A67C2E' : '#B23A2E';
  const label =
    score >= 70 ? 'Investor-ready' : score >= 45 ? 'Needs work' : 'Major gaps';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[110px] w-[200px]">
        <svg viewBox="0 0 200 110" className="h-full w-full">
          {/* track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#D8D5CC"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* fill */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={tone}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <motion.span
            className="font-mono-num text-[36px] font-semibold leading-none text-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(animatedScore)}
          </motion.span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-1">
            / 100
          </span>
        </div>
      </div>
      <span
        className="mt-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider"
        style={{ backgroundColor: `${tone}20`, color: tone }}
      >
        {label}
      </span>
    </div>
  );
}
