import { motion } from 'framer-motion';

/**
 * The signature red circle + strike annotation drawn over mismatched figures.
 * The circle and strike animate as SVG stroke draws on mount/scroll-into-view.
 */
export function RedFlagAnnotation({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" aria-hidden>
      <motion.ellipse
        cx="60"
        cy="30"
        rx="52"
        ry="24"
        stroke="#B23A2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="280"
        strokeDashoffset="280"
        initial={{ strokeDashoffset: 280 }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
      />
      <motion.path
        d="M14 44 Q60 12 106 44"
        stroke="#B23A2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="160"
        initial={{ strokeDashoffset: 160 }}
        whileInView={{ strokeDashoffset: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.7 }}
      />
    </svg>
  );
}
