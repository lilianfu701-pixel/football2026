export function nextExpandedMatchId(currentId: number | null, tappedId: number): number | null {
  return currentId === tappedId ? null : tappedId;
}
