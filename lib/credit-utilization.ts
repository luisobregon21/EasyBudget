export type UtilizationBand = "excellent" | "good" | "moderate" | "high" | "very_high";

/**
 * Industry-standard credit utilization buckets, drawn from FICO scoring research
 * (Bankrate, Experian, NerdWallet):
 *   excellent  0-10%   high-FICO ceiling
 *   good       10-30%  common recommended max
 *   moderate   30-50%  score begins to drop
 *   high       50-80%
 *   very_high  80-100%+
 */
export function utilizationBandFor(pct: number): UtilizationBand {
  if (pct < 10) return "excellent";
  if (pct < 30) return "good";
  if (pct < 50) return "moderate";
  if (pct < 80) return "high";
  return "very_high";
}
