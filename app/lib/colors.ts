export type Color = "green" | "yellow" | "gray";

export const COLORS = {
  yellow: "yellow",
  green: "green",
  gray: "gray",
} as const;

export const calculateWordColors = (answer: string, guess: string): Color[] => {
  if (!guess) return [];
  const result: Color[] = [];

  const answerMap = new Map();

  for (let i = 0; i < answer.length; i++) {
    const value = answerMap.get(answer[i]);
    if (!!value) {
      answerMap.set(answer[i], value + 1);
    } else {
      answerMap.set(answer[i], 1);
    }
  }

  for (let i = 0; i < guess.length; i++) {
    const mapResult = answerMap.get(guess[i]);
    if (mapResult) {
      if (guess[i] === answer[i]) {
        result[i] = COLORS.green;
        if (mapResult === 1) {
          answerMap.delete(guess[i]);
        } else {
          answerMap.set(guess[i], mapResult - 1);
        }
      }
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === COLORS.green) continue;
    const mapResult = answerMap.get(guess[i]);
    if (mapResult) {
      result[i] = COLORS.yellow;

      if (mapResult === 1) {
        answerMap.delete(guess[i]);
      } else {
        answerMap.set(guess[i], mapResult - 1);
      }
    } else {
      result[i] = COLORS.gray;
    }
  }

  return result;
};
