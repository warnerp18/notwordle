import { Color } from '@/app/lib/colors';

// What the browser is allowed to see of a game.
// answer stays null until the game is over.
export interface GameState {
  previousGuesses: string[];
  colors: Color[][];
  answer: string | null;
}

// A game plus its id, as signup and login send it back.
export interface Game extends GameState {
  id: string;
}
