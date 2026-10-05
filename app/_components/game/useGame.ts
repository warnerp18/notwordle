import { getGame, startGame, submitGuess } from "@/app/lib/server/actions";
import { Color } from "@/app/lib/colors";
import { useEffect, useState } from "react";

interface GameShape {
  answer: string | null;
  previousGuesses: string[];
  colors: Color[][];
}
const gameInitialValue = {
  answer: null,
  previousGuesses: [],
  colors: [],
};
const STORAGE_KEY = "gameId";

const useGame = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [game, setGame] = useState<GameShape>(gameInitialValue);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIdFromLocalStorage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };
  const deleteIdFromLocalStorage = () => {
    try {
      if (gameId) localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage blocked: game still works, just can't resume
    }
  };

  const setIdInLocalStorage = (id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      return null;
    }
  };

  const newGame = async () => {
    deleteIdFromLocalStorage();
    setIsFetching(true);
    setGameId(null);
    setError(null);
    setGame(gameInitialValue);

    try {
      const id = await startGame();

      setGameId(id);
      setIdInLocalStorage(id);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const makeGuess = async (guess: string) => {
    if (gameId) {
      setError(null);
      setIsFetching(true);
      try {
        const gameResults = await submitGuess(guess, gameId);
        if ("error" in gameResults) {
          setError(gameResults.error);
          return false;
        }

        setGame(gameResults);

        return true;
      } catch {
        setError("Something went wrong. Try again.");
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
      try {
        const savedId = getIdFromLocalStorage();

        if (savedId) {
          const saved = await getGame(savedId);

          if (ignore) return;

          if (saved) {
            setGameId(savedId);
            setGame(saved);
            return;
          }
        }

        const id = await startGame();
        if (!ignore) {
          setGameId(id);
          setIdInLocalStorage(id);
        }
      } catch {
        setError("Something went wrong. Try again.");
      }
    };

    beginGame();

    return () => {
      ignore = true;
    };
  }, []);

  return {
    isFetching,
    ...game,
    isReady: !!gameId,
    newGame,
    makeGuess,
    error,
  };
};

export default useGame;
