/**
 * Pure ranked-ladder reorder after an upset win.
 *
 * Ladder order is best-first: index 0 = rank #1 (highest rankScore).
 *
 * Spec (equivalent formulations):
 * - Winner takes the loser's spot; loser and everyone strictly between the two old positions shift down one.
 * - Implementation: remove winner from their index, insert at the loser's index, then reassign rankScores.
 *
 * Example A — #10 beats #1: winner moves to position 0; former ranks 1–9 each move down one.
 * Example B — #8 beats #2: winner moves to index 1; former ranks 2–7 each shift down one.
 *
 * If the winner was already above the loser (favorite wins), return null (no order change).
 */
export function reorderRankedUserIdsAfterUpset(
  userIdsOrderedBestFirst: string[],
  winnerId: string,
  loserId: string,
): string[] | null {
  const wIdx = userIdsOrderedBestFirst.indexOf(winnerId);
  const lIdx = userIdsOrderedBestFirst.indexOf(loserId);
  if (wIdx === -1 || lIdx === -1) {
    return null;
  }
  // Winner has a better (smaller) index = higher on ladder — favorite; no rank movement.
  if (wIdx < lIdx) {
    return null;
  }
  const reordered = [...userIdsOrderedBestFirst];
  reordered.splice(wIdx, 1);
  reordered.splice(lIdx, 0, winnerId);
  return reordered;
}

/** Rank r (1 = best) => rankScore; must stay in sync with updateRanks(). */
export function rankScoreForLadderRank(rankOneBased: number): number {
  return 100000 - (rankOneBased - 1) * 1000;
}
