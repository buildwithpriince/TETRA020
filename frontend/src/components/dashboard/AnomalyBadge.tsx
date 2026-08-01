import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/** Small inline badge indicating an internal single-document anomaly (not a cross-doc mismatch). */
export function AnomalyBadge() {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="inline-flex items-center gap-0.5 rounded-full bg-amber-soft px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-amber"
      title="Internal anomaly detected within a single document"
    >
      <Zap size={9} />
      Anomaly
    </motion.span>
  );
}
