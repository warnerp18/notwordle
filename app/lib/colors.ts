export type Color = 'green' | 'yellow' | 'gray';

export const COLORS = {
  yellow: 'yellow',
  green: 'green',
  gray: 'gray',
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

const RANK: Record<Color, number> = { gray: 0, yellow: 1, green: 2 };

export const getKeyColors = (guesses: string[], colors: Color[][]) => {
  const result: Record<string, Color> = {};

  for (let wordI = 0; wordI < guesses.length; wordI++) {
    const word = guesses[wordI];
    for (let letterI = 0; letterI < word.length; letterI++) {
      const letter = word[letterI];
      const color = colors[wordI][letterI];
      const current = result[letter];

      if (!current || RANK[color] > RANK[current]) {
        result[letter] = color;
      }
    }
  }
  return result;
};
