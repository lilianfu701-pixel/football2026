/**
 * Rating cap helpers — shared by API route (server) and RatingModal (client).
 *
 * Cap rule: the maximum GC amount per transaction is ~10 % of the recipient's
 * current wealth level upper bound (see table below).
 */

export function getMaxAmount(balance: number): number {
  if (balance < 0)                   return 100_000;
  if (balance < 99_000_000)          return 9_900_000;
  if (balance < 372_000_000)         return 37_200_000;
  if (balance < 1_100_000_000)       return 110_000_000;
  if (balance < 2_300_000_000)       return 230_000_000;
  if (balance < 5_250_000_000)       return 525_000_000;
  if (balance < 11_900_000_000)      return 1_190_000_000;
  if (balance < 29_000_000_000)      return 2_900_000_000;
  if (balance < 500_000_000_000)     return 50_000_000_000;
  return 100_000_000_000;
}

/** Generate 5 evenly-spread preset buttons for a given max, rounded to 2 sig-figs. */
export function makePresets(max: number): number[] {
  const fracs = [0.01, 0.05, 0.10, 0.50, 1.00];
  const seen = new Set<number>();
  const result: number[] = [];

  for (const f of fracs) {
    const raw = max * f;
    if (raw <= 0) { result.push(1); continue; }
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const rounded = Math.min(max, Math.round(raw / mag) * mag);
    const v = Math.max(1, rounded);
    if (!seen.has(v)) { seen.add(v); result.push(v); }
  }

  return result;
}

/** Human-friendly label for large GC amounts: 1K / 1M / 1B etc. */
export function fmtGC(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toLocaleString();
}
