import { useCallback, useState, type DragEvent } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText } from 'lucide-react';
import type { DetectedType } from '@/api/types';

export interface DroppedFile {
  file: File;
  filename: string;
}

interface DropZoneProps {
  onFiles: (files: DroppedFile[]) => void;
  disabled?: boolean;
}

const ACCEPTED = '.pdf,.pptx,.xlsx,.csv';

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = Array.from(e.dataTransfer.files).map((f) => ({ file: f, filename: f.name }));
      if (dropped.length) onFiles(dropped);
    },
    [onFiles, disabled],
  );

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      animate={dragging ? { scale: 1.01 } : { scale: 1 }}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
        dragging
          ? 'border-redink bg-redink-soft/40'
          : 'border-rule bg-paper-tint hover:border-ink/25'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <motion.div
        animate={dragging ? { y: -4 } : { y: 0 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper"
      >
        <UploadCloud size={26} className={dragging ? 'text-redink' : 'text-ink-muted'} />
      </motion.div>
      <p className="mt-4 font-display text-[20px] font-medium text-ink">
        Drop fundraising documents here
      </p>
      <p className="mt-1 text-[14px] text-ink-muted">
        Pitch deck, MIS, financials, projections, cap table
      </p>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
        PDF · PPTX · XLSX · CSV
      </p>

      <label className={`mt-6 inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-colors hover:bg-ink-soft ${disabled ? 'pointer-events-none' : ''}`}>
        <FileText size={15} />
        Select files
        <input
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).map((f) => ({ file: f, filename: f.name }));
            if (files.length) onFiles(files);
            e.target.value = '';
          }}
        />
      </label>
    </motion.div>
  );
}

const TYPE_LABELS: Record<DetectedType | 'unknown', string> = {
  pitch_deck: 'Pitch Deck',
  mis: 'MIS',
  financials: 'Financials',
  projections: 'Projections',
  cap_table: 'Cap Table',
  unknown: 'Unknown',
};

export function docTypeLabel(t: string): string {
  return TYPE_LABELS[t as DetectedType] ?? 'Unknown';
}
