'use server';

import { ROWS } from '@/app/lib/constants';
import { sql } from '@/app/lib/server/db';
import {
  isGameOver,
  isValidId,
  pickRandomWord,
  toGameState,
} from '@/app/lib/server/game/games';
import { ALLOWED_WORDS } from './allowedWords';
import { getSessionUserId } from '@/app/lib/server/auth/sessions';

const allowedWordSet = new Set(ALLOWED_WORDS);

export async function startGame() {
  const answer = pickRandomWord();
  // signed in: the new game is theirs. Guest: null, an ownerless game.
  // Read from the session, never from an argument the browser could fake.
  const userId = await getSessionUserId();

  const [game] =
    await sql`INSERT INTO games (answer, user_id) VALUES (${answer}, ${userId}) RETURNING id`;

  return game.id;
}

export const submitGuess = async (guess: string, id: string) => {
  const uppercaseGuess = typeof guess === 'string' ? guess.toUpperCase() : '';
  if (!isValidId(id)) {
    throw new Error('Must provide a valid game id');
  }

  if (!/^[A-Z]{5}$/.test(uppercaseGuess)) {
    throw new Error('Invalid guess. Guess should only contain characters a-z');
  }

  if (!allowedWordSet.has(uppercaseGuess)) {
    return { error: 'Not in word list' };
  }

  const [game] = await sql`SELECT * FROM games WHERE id = ${id}`;

  if (!game) {
    throw new Error('Game does not exist');
  }

  // a finished game doesn't take more guesses; just send back where it ended
  if (isGameOver(game.guesses, game.answer)) {
    return toGameState(game.guesses, game.answer);
  }

  const [updatedGame] = await sql`
      UPDATE games
      SET guesses = array_append(guesses, ${uppercaseGuess})
      WHERE id = ${game.id}
        AND COALESCE(array_length(guesses, 1), 0) < ${ROWS}
        AND NOT(answer = ANY(guesses))
      RETURNING guesses `;

  if (!updatedGame) {
    const [latestGame] = await sql`SELECT * FROM games WHERE id = ${id}`;
    return toGameState(latestGame.guesses, latestGame.answer);
  }

  return toGameState(updatedGame.guesses, game.answer);
};

// games older than 24 hours count as gone, so the browser starts a new one
export const getGame = async (id: string) => {
  if (!isValidId(id)) return null;

  const [game] = await sql`
    SELECT * FROM games
    WHERE id = ${id} AND created_at > now() - interval '24 hours'
  `;

  return game ? toGameState(game.guesses, game.answer) : null;
};
