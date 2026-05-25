/**
 * Score Prediction Odds — Poisson Model
 *
 * Uses independent Poisson distributions for home and away goals.
 * World Cup average: λ_home ≈ 1.4, λ_away ≈ 1.1
 * House margin: 15% (industry standard for correct-score markets)
 * Max odds capped at 500× to keep payouts manageable.
 */

const LAMBDA_HOME  = 1.4;
const LAMBDA_AWAY  = 1.1;
const HOUSE_MARGIN = 1.15;   // bookmaker overround
const MAX_ODDS     = 500;    // cap for very rare scores
const MIN_ODDS     = 1.5;

/** Payout: floor(betAmount × odds) */
export function netPayout(betAmount: number, odds: number): number {
  return Math.floor(betAmount * odds);
}

/** Poisson probability P(X = k) using log-space for numerical stability */
function poissonProb(lambda: number, k: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  // log P = -λ + k·ln(λ) - ln(k!)
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Returns the quoted odds (multiplier) for a given correct-score prediction.
 * Rounded to 1 decimal place. Capped between MIN_ODDS and MAX_ODDS.
 */
export function calcScoreOdds(scoreHome: number, scoreAway: number): number {
  const prob = poissonProb(LAMBDA_HOME, scoreHome) * poissonProb(LAMBDA_AWAY, scoreAway);
  if (prob <= 0) return MAX_ODDS;
  const quoted = 1 / prob / HOUSE_MARGIN;
  const rounded = Math.round(quoted * 10) / 10;
  return Math.min(MAX_ODDS, Math.max(MIN_ODDS, rounded));
}

/** Pre-computed reference table for common scores (for documentation / UI hints) */
export const COMMON_SCORE_ODDS: Record<string, number> = Object.fromEntries(
  [
    [1,0],[2,0],[2,1],[3,0],[3,1],[3,2],
    [0,0],[1,1],[2,2],[3,3],
    [0,1],[0,2],[1,2],[0,3],[1,3],[2,3],
  ].map(([h, a]) => [`${h}:${a}`, calcScoreOdds(h, a)])
);
