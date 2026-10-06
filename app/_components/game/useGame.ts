import { getGame, startGame, submitGuess } from '@/app/lib/server/game/actions';
import { useEffect, useState } from 'react';
import { GAME_ID_STORAGE_KEY } from '@/app/lib/constants';
import { Game } from '@/app/lib/types';

const gameInitialValue: Game = {
  answer: null,
  previousGuesses: [],
  colors: [],
  id: '',
};

// playerGame: a signed-in player's game, sent by the server with the page.
// Guests get null and load theirs from localStorage below.
const useGame = (playerGame: Game | null = null) => {
  const [game, setGame] = useState<Game | null>(playerGame);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIdFromLocalStorage = () => {
    try {
      return localStorage.getItem(GAME_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  };
  const deleteIdFromLocalStorage = () => {
    try {
      if (game) localStorage.removeItem(GAME_ID_STORAGE_KEY);
    } catch {
      // storage blocked: game still works, just can't resume
    }
  };

  const setIdInLocalStorage = (id: string) => {
    try {
      localStorage.setItem(GAME_ID_STORAGE_KEY, id);
    } catch {
      return null;
    }
  };

  const newGame = async () => {
    deleteIdFromLocalStorage();
    setIsFetching(true);
    setError(null);
    setGame(null);

    try {
      const id = await startGame();

      setGame({ ...gameInitialValue, id });
      setIdInLocalStorage(id);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const loadGame = (game: Game) => {
    deleteIdFromLocalStorage();
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

  // first load: no isFetching needed, isReady stays false until the id arrives
  useEffect(() => {
    let ignore = false;

    const beginGame = async () => {
      // signed in: the server already gave us the game
      if (playerGame) return;

      try {
        const savedId = getIdFromLocalStorage();

        if (savedId) {
          const saved = await getGame(savedId);

          if (ignore) return;

          if (saved) {
            setGame({ ...saved, id: savedId });
            return;
          }
          const id = await startGame();
          if (!ignore) {
            setGame({ ...gameInitialValue, id });
            setIdInLocalStorage(id);
          }
        }
      } catch {
        setError('Something went wrong. Try again.');
      }
    };

    beginGame();

    return () => {
      ignore = true;
    };
    // playerGame comes from the server with the page and never changes after,
    // so this still runs once
  }, [playerGame]);

  return {
    isFetching,
    ...(game ?? gameInitialValue),
    isReady: game !== null,
    newGame,
    loadGame,
    makeGuess,
    error,
  };
};

export default useGame;
