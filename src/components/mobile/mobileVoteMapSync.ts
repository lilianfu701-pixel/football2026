export type MobileVoteChoice = "home" | "neutral" | "away";

export type MobileVoteMapState = {
  vote: MobileVoteChoice | null;
  revision: number;
};

export function nextMobileVoteMapState(
  current: MobileVoteMapState,
  vote: MobileVoteChoice,
): MobileVoteMapState {
  return { vote, revision: current.revision + 1 };
}
