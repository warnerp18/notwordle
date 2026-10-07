import { startGame, submitGuess } from '@/app/lib/server/game/actions';
import { useState } from 'react';
import { Game } from '@/app/lib/types';

const gameInitialValue: Game = {
  answer: null,
  previousGuesses: [],
  colors: [],
  id: '',
};

const useGame = (playerGame: Game | null = null) => {
  const [game, setGame] = useState<Game | null>(playerGame);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newGame = async () => {
    setIsFetching(true);
    setError(null);
    setGame(null);

    try {
      const id = await startGame();

      setGame({ ...gameInitialValue, id });
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const loadGame = (game: Game) => {
    setIsFetching(false);
    setError(null);
    setGame(game);
  };

  const makeGuess = async (guess: string) => {
    if (game) {
      setError(null);
      setIsFetching(true);
      try {
        const gameResults = await submitGuess(guess, game.id);
        if ('error' in gameResults) {
          setError(gameResults.error);
          return false;
        }

        setGame({ ...gameResults, id: game.id });

        return true;
      } catch {
        setError('Something went wrong. Try again.');
        return false;
      } finally {
        setIsFetching(false);
      }
    } else {
      return false;
    }
  };

  const resetGame = () => {
    setIsFetching(false);
    setError(null);
    setGame(null);
  };

  return {
    isFetching,
    ...(game ?? gameInitialValue),
    isReady: game !== null,
    newGame,
    loadGame,
    makeGuess,
    resetGame,
    error,
  };
};

export default useGame;
