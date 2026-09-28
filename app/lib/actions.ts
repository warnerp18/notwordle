"use server";

import { calculateWordColors } from "./colors";
import { ROWS } from "./constants";
import { sql } from "./db";
import { WORDS } from "./words";

const pickRandomWord = () => {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
};

export async function startGame() {
  const answer = pickRandomWord();

  const [game] =
    await sql`INSERT INTO games (answer) VALUES (${answer}) RETURNING id`;

  return game.id;
}

export const submitGuess = async (guess: string, id: string) => {
  const idString = typeof id === "string" ? id : "";

  const validId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idString,
    );
  const uppercaseGuess = typeof guess === "string" ? guess.toUpperCase() : "";

  const guessIsValid = /^[A-Z]{5}$/.test(uppercaseGuess);
  console.log({ guess });

  if (!validId) {
    throw new Error("Must provide a valid game id");
  }

  if (!guessIsValid) {
    throw new Error("Invalid guess. Guess should only contain characters a-z");
  }

  const games = await sql`SELECT * FROM games WHERE id = ${id}`;
  console.log({ games });
  const game = games[0];

  if (!game) {
    throw new Error("Game does not exist");
  }
  const answer = game.answer;
  const guessesLength = game.guesses.length;
  const gameOver = guessesLength === ROWS;
  const previousWinner = game.guesses[guessesLength - 1] === answer;

  const previousGuessColors = game.guesses.map((savedGuesses: string) => {
    return calculateWordColors(answer, savedGuesses);
  });

  if (gameOver || previousWinner) {
    return {
      answer,
      colors: previousGuessColors,
      previousGuesses: game.guesses,
    };
  }

  const colors = [
    ...previousGuessColors,
    calculateWordColors(answer, uppercaseGuess),
  ];

  const newWinner = uppercaseGuess === answer;

  const [updatedGame] =
    await sql`UPDATE games SET guesses = array_append(guesses, ${uppercaseGuess}) WHERE id = ${game.id} RETURNING guesses`;

  const previousGuesses = updatedGame.guesses;

  console.log({ previousGuesses });

  return {
    previousGuesses,
    answer: newWinner || previousGuesses.length === ROWS ? answer : null,
    colors,
  };
};
