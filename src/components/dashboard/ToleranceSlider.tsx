import { motion } from 'framer-motion';

interface ToleranceSliderProps {
  value: number; // percentage 0-100 that counts as "critical"
  onChange: (v: number) => void;
}

const ZONES = [
  { label: 'Rounding Error', range: '0–10%', color: '#6B6862' },
  { label: 'Material Mismatch', range: '10–25%', color: '#A67C2E' },
  { label: 'Critical Red Flag', range: '> 25%', color: '#B23A2E' },
];

export function ToleranceSlider({ value, onChange }: ToleranceSliderProps) {
  return (
    <div className="rounded-lg border border-rule bg-paper-tint p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-[17px] font-medium text-ink">Tolerance &amp; Materiality</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Adjust the threshold above which a mismatch is flagged as critical.
          </p>
        </div>
        <span className="font-mono-num text-[20px] font-semibold text-redink">{value}%</span>
      </div>

      <div className="mt-4">
        <div className="relative">
          {/* zone track */}
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="flex-[10] bg-rule" />
            <div className="flex-[15] bg-amber/50" />
            <div className="flex-[75] bg-redink/30" />
          </div>
          <input
            type="range"
            min={5}
            max={50}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper-tint [&::-webkit-slider-thumb]:bg-redink [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-paper-tint [&::-moz-range-thumb]:bg-redink"
          />
        </div>
        <div className="mt-3 flex justify-between">
          {ZONES.map((z) => (
            <div key={z.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: z.color }} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                {z.label} · {z.range}
              </span>
            </div>
          ))}
        </div>
      </div>

      <motion.p
        key={value}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-3 font-mono text-[11px] text-ink-muted"
      >
        Mismatches exceeding {value}% variance are flagged as critical red flags below.
      </motion.p>
    </div>
  );
}
