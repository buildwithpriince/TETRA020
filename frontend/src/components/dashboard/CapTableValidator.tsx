import { motion } from 'framer-motion';
import { Check, AlertTriangle, X } from 'lucide-react';
import type { MatrixRow } from '@/api/types';
import { TickStamp } from '@/components/shared/TickStamp';

interface CapTableValidatorProps {
  matrix: MatrixRow[];
}

function findRow(matrix: MatrixRow[], metric: string): MatrixRow | undefined {
  return matrix.find((r) => r.metric === metric);
}

function parsePct(value: string): number | null {
  const match = value.replace(/%/g, '').trim();
  const n = parseFloat(match);
  return Number.isFinite(n) ? n : null;
}

/**
 * Cap Table Math Validator — checks whether stakeholder percentages sum to 100%
 * and whether founder ownership is consistent between deck and cap table.
 */
export function CapTableValidator({ matrix }: CapTableValidatorProps) {
  const sumRow = findRow(matrix, 'Cap Table Sum');
  const founderRow = findRow(matrix, 'Founder Ownership');

  const capTableSum = sumRow?.documents.cap_table ? parsePct(sumRow.documents.cap_table.value) : null;
  const deckClaim = sumRow?.documents.pitch_deck ? parsePct(sumRow.documents.pitch_deck.value) : null;
  const capFounder = founderRow?.documents.cap_table ? parsePct(founderRow.documents.cap_table.value) : null;
  const deckFounder = founderRow?.documents.pitch_deck ? parsePct(founderRow.documents.pitch_deck.value) : null;

  const sumPass = capTableSum !== null && Math.abs(capTableSum - 100) < 0.5;
  const sumFail = capTableSum !== null && Math.abs(capTableSum - 100) >= 0.5;
  const founderGap = capFounder !== null && deckFounder !== null ? Math.abs(capFounder - deckFounder) : null;
  const founderMismatch = founderGap !== null && founderGap >= 2;

  return (
    <div className="rounded-lg border border-rule bg-paper-tint p-5 shadow-card">
      <h3 className="font-display text-[17px] font-medium text-ink">Cap table math validator</h3>
      <p className="mt-0.5 text-[13px] text-ink-muted">
        Checks whether ownership percentages sum to 100% and deck claims match the actual cap table.
      </p>

      <div className="mt-4 space-y-3">
        {/* Sum check */}
        <div className="flex items-center gap-3 rounded-md border border-rule bg-paper px-3 py-2.5">
          {sumPass ? (
            <>
              <TickStamp variant="verified" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">Stakeholder sum = 100%</p>
                <p className="font-mono text-[10px] text-ink-muted">
                  Cap table rows sum to {capTableSum?.toFixed(1)}% — passes validation.
                </p>
              </div>
            </>
          ) : sumFail ? (
            <>
              <TickStamp variant="flag" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-redink-dark">
                  Stakeholder sum = {capTableSum?.toFixed(0)}% — fails validation
                </p>
                <p className="font-mono text-[10px] text-ink-muted">
                  {(100 - (capTableSum ?? 0)).toFixed(0)}% unaccounted. {deckClaim !== null ? `Deck claims ${deckClaim}%.` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <TickStamp variant="missing" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink-muted">Cap table sum not available</p>
                <p className="font-mono text-[10px] text-ink-muted">No cap table document detected.</p>
              </div>
            </>
          )}
        </div>

        {/* Founder cross-check */}
        <div className="flex items-center gap-3 rounded-md border border-rule bg-paper px-3 py-2.5">
          {founderMismatch ? (
            <>
              <TickStamp variant="flag" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-redink-dark">
                  Founder ownership gap: {founderGap?.toFixed(1)}pp
                </p>
                <p className="font-mono text-[10px] text-ink-muted">
                  Deck claims {deckFounder}%, cap table shows {capFounder}%.
                </p>
              </div>
            </>
          ) : founderGap !== null ? (
            <>
              <TickStamp variant="verified" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">Founder ownership consistent</p>
                <p className="font-mono text-[10px] text-ink-muted">
                  Deck {deckFounder}% vs cap table {capFounder}% — within {founderGap.toFixed(1)}pp.
                </p>
              </div>
            </>
          ) : (
            <>
              <TickStamp variant="missing" size="md" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink-muted">Founder ownership not cross-checkable</p>
                <p className="font-mono text-[10px] text-ink-muted">
                  Missing from deck or cap table.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
