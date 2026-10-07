import 'server-only';

import { calculateWordColors } from '@/app/lib/colors';
import { ROWS } from '@/app/lib/constants';
import { sql } from '@/app/lib/server/db';
import { ANSWER_WORDS } from './answerWords';
import { Game, GameState } from '@/app/lib/types';

// cookie holding a guest's current game id
export const GUEST_GAME_COOKIE = 'guestGame';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// unknown: callers can send anything, not just strings
export const isValidId = (id: unknown) =>
  typeof id === 'string' && UUID_PATTERN.test(id);

export const isGameOver = (guesses: string[], answer: string) => {
  const winner = guesses[guesses.length - 1] === answer;

  return guesses.length === ROWS || winner;
};

export const toGameState = (guesses: string[], answer: string): GameState => ({
  previousGuesses: guesses,
  colors: guesses.map((guess) => calculateWordColors(answer, guess)),
  answer: isGameOver(guesses, answer) ? answer : null,
});

export const pickRandomWord = () => {
  return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
};

export const claimGame = async (gameId: string | undefined, userId: string) => {
  const gameIdIsValid = isValidId(gameId);

  if (!gameIdIsValid) return null;

  const [game] = await sql`
  UPDATE games
  SET user_id = ${userId}
  WHERE id = ${gameId}
    AND user_id IS NULL
    AND created_at > now() - interval '24 hours'
RETURNING guesses, answer, id
  `;

  return game ?? null;
};

export const createGame = async (userId: string) => {
  const answer = pickRandomWord();

  const [game] =
    await sql`INSERT INTO games (answer, user_id) VALUES (${answer}, ${userId}) RETURNING id, answer, guesses`;

  return game;
};

export const findCurrentGame = async (userId: string) => {
  const [game] = await sql`
    SELECT guesses, answer, id FROM games
    WHERE user_id = ${userId}
      AND created_at > now() - interval '24 hours'
      AND COALESCE(array_length(guesses, 1), 0) < ${ROWS}
      AND NOT(answer = ANY(guesses))
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return game ?? null;
};

// A signed-in player's game for the page: their newest unfinished one, or a
// new one. Shaped for the browser (answer hidden until the game is over).
export const getPlayerGame = async (userId: string): Promise<Game> => {
  const game = (await findCurrentGame(userId)) ?? (await createGame(userId));

  return { ...toGameState(game.guesses, game.answer), id: game.id };
};
