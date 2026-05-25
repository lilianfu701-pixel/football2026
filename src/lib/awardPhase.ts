/**
 * Award betting phase — three-tier odds system for WC 2026
 *
 * pre      : before Jun 11 2026 (tournament start)    → 20×
 * group    : Jun 11 – Jun 26 2026 (group stage)       → 10×
 * knockout : Jun 27 – Jul 19 2026 (knockout → final)  →  3×
 * closed   : after Jul 19 2026                        →  —
 *
 * Golden Boot special rule:
 *   Betting closes before the semi-finals (四强赛, Jul 12 2026).
 *   goldenBootClosed = true when now >= Jul 12 00:00 UTC
 */

export type AwardPhase = "pre" | "group" | "knockout" | "closed";

export function getBetPhase(): {
  phase: AwardPhase;
  odds: number;
  goldenBootClosed: boolean;
  deadlineLabel: string;
} {
  const now = new Date();

  // All times UTC
  const TOURNAMENT_START  = new Date("2026-06-11T00:00:00Z"); // first kick-off
  const GROUP_STAGE_END   = new Date("2026-06-27T00:00:00Z"); // day after last group game
  const SEMI_FINAL_START  = new Date("2026-07-12T00:00:00Z"); // 四强赛 — golden boot closes
  const TOURNAMENT_END    = new Date("2026-07-20T00:00:00Z"); // day after the final

  const goldenBootClosed = now >= SEMI_FINAL_START;

  if (now < TOURNAMENT_START) {
    return {
      phase:           "pre",
      odds:            20,
      goldenBootClosed,
      deadlineLabel:   "2026-06-11",
    };
  }
  if (now < GROUP_STAGE_END) {
    return {
      phase:           "group",
      odds:            10,
      goldenBootClosed,
      deadlineLabel:   "2026-06-26",
    };
  }
  if (now < TOURNAMENT_END) {
    return {
      phase:           "knockout",
      odds:            3,
      goldenBootClosed,
      deadlineLabel:   "2026-07-19",
    };
  }
  return {
    phase:           "closed",
    odds:            0,
    goldenBootClosed: true,
    deadlineLabel:   "",
  };
}
