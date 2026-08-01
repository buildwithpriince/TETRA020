import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export function MissingDocBanner({ missing }: { missing: string[] }) {
  if (!missing.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-lg border border-amber/40 bg-amber-soft px-4 py-3"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber" />
      <div>
        <p className="text-[14px] font-medium text-ink">
          Missing core document{missing.length > 1 ? 's' : ''}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          The following were not detected and may limit the analysis:{' '}
          <span className="font-mono text-[12px] text-amber">
            {missing.join(', ')}
          </span>
          . Upload them for a complete cross-reference.
        </p>
      </div>
    </motion.div>
  );
}
