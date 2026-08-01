import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { TickStamp } from '@/components/shared/TickStamp';
import type { FileStatus, DetectedType } from '@/api/types';
import { docTypeLabel } from './DropZone';

interface FileStatusChipProps {
  filename: string;
  detected_type: DetectedType;
  status: FileStatus;
  confidence: number;
}

const STATUS_CONFIG: Record<
  FileStatus,
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  scanning: { label: 'Scanning', icon: Loader2, tone: 'text-ink-muted' },
  validated: { label: 'Ready', icon: CheckCircle2, tone: 'text-verified' },
  corrupted: { label: 'Corrupted', icon: AlertTriangle, tone: 'text-redink' },
  malware_flagged: { label: 'Flagged', icon: ShieldAlert, tone: 'text-redink' },
};

export function FileStatusChip({ filename, detected_type, status, confidence }: FileStatusChipProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const spin = status === 'scanning';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 rounded-lg border border-rule bg-paper-tint px-4 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rule bg-paper">
        <Icon
          size={17}
          className={`${cfg.tone} ${spin ? 'animate-spin' : ''}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">{filename}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider rounded-full border border-rule px-2 py-0.5 text-ink-muted">
            {docTypeLabel(detected_type)}
          </span>
          {status === 'validated' && (
            <span className="font-mono text-[10px] text-ink-muted">
              conf {confidence.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === 'validated' && <TickStamp variant="verified" size="sm" />}
        {status === 'corrupted' && <TickStamp variant="flag" size="sm" />}
        {status === 'malware_flagged' && <TickStamp variant="flag" size="sm" />}
        <span className={`text-[12px] font-medium ${cfg.tone}`}>{cfg.label}</span>
      </div>
    </motion.div>
  );
}
