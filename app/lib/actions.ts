"use server";

import { WORDS } from "./constants";
import { sql } from "./db";

const pickRandomWord = () => {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
};

export async function startGame() {
  const answer = pickRandomWord();

  const [game] =
    await sql`INSERT INTO games (answer) VALUES (${answer}) RETURNING id`;

  return game.id;
}
