import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface TickStampProps {
  variant?: 'verified' | 'flag' | 'missing' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  delay?: number;
}

const palette = {
  verified: { ring: 'bg-verified', text: 'text-paper', border: 'border-verified' },
  flag: { ring: 'bg-redink', text: 'text-paper', border: 'border-redink' },
  missing: { ring: 'bg-rule', text: 'text-ink-muted', border: 'border-rule' },
  amber: { ring: 'bg-amber', text: 'text-paper', border: 'border-amber' },
};

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function TickStamp({ variant = 'verified', size = 'md', animate = false, delay = 0 }: TickStampProps) {
  const c = palette[variant];
  const initial = animate ? { scale: 0, rotate: -12 } : false;
  const animateObj = animate
    ? { scale: [0, 1.18, 1], rotate: 0 }
    : undefined;

  return (
    <motion.span
      initial={initial}
      whileInView={animate ? animateObj : undefined}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.45, delay, type: 'spring', stiffness: 420, damping: 14 }}
      className={`inline-flex ${sizes[size]} items-center justify-center rounded-full ${c.ring} ${c.text} shrink-0`}
      aria-label={variant === 'verified' ? 'verified' : variant === 'flag' ? 'flagged mismatch' : 'missing'}
    >
      {variant === 'verified' && <Check size={size === 'lg' ? 16 : size === 'sm' ? 10 : 12} strokeWidth={3.5} />}
      {variant === 'flag' && (
        <svg width={size === 'lg' ? 16 : size === 'sm' ? 9 : 11} height={size === 'lg' ? 16 : size === 'sm' ? 9 : 11} viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {variant === 'missing' && (
        <span className="block h-[3px] w-[7px] rounded-full bg-current opacity-60" />
      )}
      {variant === 'amber' && (
        <span className="font-mono text-[8px] font-semibold leading-none">?</span>
      )}
    </motion.span>
  );
}
