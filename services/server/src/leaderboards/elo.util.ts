const kFactor = 80;
export const initialEloRating = 1000;

function getExpectedScore(challenger: number, challenged: number): number {
  return 1 / (1 + 10 ** ((challenged - challenger) / 400));
}

function getNewRating(challenger: number, challenged: number, score: number): number {
  return Math.round(
    challenger + kFactor * (score - getExpectedScore(challenger, challenged)),
  );
}

function getNewRatings(
  challenger: number,
  challenged: number,
  result: 'win' | 'loss' | 'draw',
): [number, number] {
  switch (result) {
    case 'win':
      return [
        getNewRating(challenger, challenged, 1),
        getNewRating(challenged, challenger, 0),
      ];
    case 'loss':
      return [
        getNewRating(challenger, challenged, 0),
        getNewRating(challenged, challenger, 1),
      ];
    case 'draw':
      return [
        getNewRating(challenger, challenged, 0.5),
        getNewRating(challenged, challenger, 0.5),
      ];
    default:
      throw new Error(`Invalid result: ${result}`);
  }
}

export function calculateEloChange(
  challengerRating: number,
  opponentRating: number,
  challengerWon: boolean,
): { challengerEloChange: number; opponentEloChange: number } {
  const [newChallengerRating, newOpponentRating] = getNewRatings(
    challengerRating,
    opponentRating,
    challengerWon ? 'win' : 'loss',
  );

  return {
    challengerEloChange: newChallengerRating - challengerRating,
    opponentEloChange: newOpponentRating - opponentRating,
  };
}
