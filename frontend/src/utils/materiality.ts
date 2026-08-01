import type { MatrixRow, MetricEntry } from '@/api/types';

/**
 * Extracts a numeric value from a string like "₹2.0 Cr", "38%", "4,000", "3.1×/yr".
 * Returns null if no number can be parsed.
 */
function parseNumeric(value: string): number | null {
  // Strip currency symbols, units, and whitespace
  const cleaned = value.replace(/[₹$,%\s]/g, '').replace(/[a-zA-Z/×·-]+/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Computes the maximum percentage variance between any two non-null entries
 * in a matrix row. Returns 0 if fewer than two entries exist.
 */
function maxVariance(entries: (MetricEntry | null)[]): number {
  const nums = entries
    .filter((e): e is MetricEntry => e !== null)
    .map((e) => parseNumeric(e.value))
    .filter((n): n is number => n !== null);
  if (nums.length < 2) return 0;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === 0) return max > 0 ? 100 : 0;
  return Math.abs((max - min) / min) * 100;
}

/**
 * Reclassifies a row's materiality based on the user-selected tolerance threshold.
 * - Below 10% of threshold → rounding_error
 * - Between 10% and threshold → material_mismatch
 * - Above threshold → critical_red_flag
 *
 * Missing-information rows keep their original materiality since variance is undefined.
 */
export function reclassifyMateriality(
  row: MatrixRow,
  tolerancePct: number,
): MatrixRow['materiality'] {
  if (row.status === 'missing_information') return row.materiality;

  const variance = maxVariance(Object.values(row.documents));
  const materialThreshold = tolerancePct * 0.4; // 40% of critical threshold = "material"
  const roundingThreshold = materialThreshold * 0.25; // 10% of critical threshold = "rounding"

  if (variance >= tolerancePct) return 'critical_red_flag';
  if (variance >= materialThreshold) return 'material_mismatch';
  if (variance >= roundingThreshold) return 'rounding_error';
  return 'rounding_error';
}

/**
 * Returns the computed variance percentage for a row, for display purposes.
 */
export function rowVariance(row: MatrixRow): number {
  return Math.round(maxVariance(Object.values(row.documents)));
}
