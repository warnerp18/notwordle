"use server";

import { calculateWordColors } from "./colors";
import { ROWS } from "./constants";
import { sql } from "./db";
import { WORDS } from "./words";

const pickRandomWord = () => {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// unknown: callers can send anything, not just strings
const isValidId = (id: unknown) =>
  typeof id === "string" && UUID_PATTERN.test(id);

const isGameOver = (guesses: string[], answer: string) => {
  const winner = guesses[guesses.length - 1] === answer;

  return guesses.length === ROWS || winner;
};

const toGameState = (guesses: string[], answer: string) => ({
  previousGuesses: guesses,
  colors: guesses.map((guess) => calculateWordColors(answer, guess)),
  answer: isGameOver(guesses, answer) ? answer : null,
});

export async function startGame() {
  const answer = pickRandomWord();

  const [game] =
    await sql`INSERT INTO games (answer) VALUES (${answer}) RETURNING id`;

  return game.id;
}

export const submitGuess = async (guess: string, id: string) => {
  const uppercaseGuess = typeof guess === "string" ? guess.toUpperCase() : "";

  if (!isValidId(id)) {
    throw new Error("Must provide a valid game id");
  }

  if (!/^[A-Z]{5}$/.test(uppercaseGuess)) {
    throw new Error("Invalid guess. Guess should only contain characters a-z");
  }

  const [game] = await sql`SELECT * FROM games WHERE id = ${id}`;

  if (!game) {
    throw new Error("Game does not exist");
  }

  // a finished game doesn't take more guesses; just send back where it ended
  if (isGameOver(game.guesses, game.answer)) {
    return toGameState(game.guesses, game.answer);
  }

  const [updatedGame] =
    await sql`UPDATE games SET guesses = array_append(guesses, ${uppercaseGuess}) WHERE id = ${game.id} RETURNING guesses`;

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
