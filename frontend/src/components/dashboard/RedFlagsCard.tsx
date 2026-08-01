import { motion } from 'framer-motion';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import { MonoNumber } from '@/components/shared/MonoNumber';

interface RedFlagsCardProps {
  redFlags: string[];
  strengths: string[];
  completeness: number;
}

export function RedFlagsCard({ redFlags, strengths, completeness }: RedFlagsCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Red flags */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-redink/30 bg-redink-soft/30 p-5"
      >
        <div className="flex items-center gap-2">
          <AlertOctagon size={18} className="text-redink" />
          <h3 className="font-display text-[16px] font-medium text-ink">Top red flags</h3>
        </div>
        <ul className="mt-3 space-y-2.5">
          {redFlags.map((flag, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-redink" />
              <p className="text-[13px] leading-relaxed text-ink-soft">{flag}</p>
            </li>
          ))}
          {!redFlags.length && (
            <li className="text-[13px] text-ink-muted">No critical flags detected.</li>
          )}
        </ul>
      </motion.div>

      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-lg border border-verified/30 bg-verified-soft/30 p-5"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-verified" />
          <h3 className="font-display text-[16px] font-medium text-ink">Verified strengths</h3>
        </div>
        <ul className="mt-3 space-y-2.5">
          {strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-verified" />
              <p className="text-[13px] leading-relaxed text-ink-soft">{s}</p>
            </li>
          ))}
          {!strengths.length && (
            <li className="text-[13px] text-ink-muted">No verified strengths recorded.</li>
          )}
        </ul>
      </motion.div>

      {/* Completeness */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="rounded-lg border border-rule bg-paper-tint p-5 md:col-span-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-[16px] font-medium text-ink">Document completeness</h3>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Share of core document types successfully ingested and parsed.
            </p>
          </div>
          <div className="text-right">
            <MonoNumber value={completeness} suffix="%" className="text-[28px] font-semibold text-ink" />
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-rule">
          <motion.div
            className="h-full rounded-full bg-verified"
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
