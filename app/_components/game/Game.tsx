'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Keyboard from '@/app/_components/keyboard/Keyboard';
import Board from '@/app/_components/board/Board';
import StatusMessage from '@/app/_components/status-message/StatusMessage';
import { COLUMNS, GAME_ID_STORAGE_KEY, ROWS } from '@/app/lib/constants';
import useGame from './useGame';
import { getKeyColors } from '@/app/lib/colors';
import useDelayedLoading from '@/app/_hooks/useDelayedLoading';
import Signup from '@/app/_components/authentication/Signup';
import { Game as GameData } from '@/app/lib/types';

export type UserType = 'unknown' | 'guest' | 'player';

export default function App({
  authenticated,
  playerGame = null,
}: {
  authenticated: boolean;
  playerGame?: GameData | null;
}) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [warningId, setWarningId] = useState(0);
  // runs once, on first render. A saved game id means they've played here
  // before, so let them keep playing as a guest instead of asking again.
  // On the server there's no localStorage, so it lands in catch -> 'unknown'.
  const [userType, setUserType] = useState<UserType>(() => {
    if (authenticated) return 'player';
    try {
      return localStorage.getItem(GAME_ID_STORAGE_KEY) ? 'guest' : 'unknown';
    } catch {
      return 'unknown';
    }
  });

  const modelRef = useRef<HTMLDialogElement>(null);

  const {
    answer,
    previousGuesses,
    colors,
    isReady,
    newGame,
    loadGame,
    makeGuess,
    isFetching,
    error,
  } = useGame(playerGame);

  const { showLoading } = useDelayedLoading(isFetching);

  const handleReset = async () => {
    setCurrentGuess('');
    await newGame();
    setWarning(null);
  };

  const showWarning = (text: string) => {
    setWarning(text);
    setWarningId((id) => id + 1);
  };

  useEffect(() => {
    if (warningId === 0) return;
    // Generally frown on using setTimeout but feels appropriate here.
    // hides the warning after 1.5s
    const timer = setTimeout(() => setWarning(null), 1500);
    return () => clearTimeout(timer);
  }, [warningId]);

  const winner = answer === previousGuesses[previousGuesses.length - 1];
  const gameOver = previousGuesses.length === ROWS || winner;

  const handleKey = async (key: string) => {
    if (
      gameOver ||
      !isReady ||
      isFetching ||
      (!authenticated && userType === 'unknown')
    )
      return;

    if (key === 'Enter') {
      if (currentGuess.length !== COLUMNS) {
        showWarning('Not enough letters');
        return;
      }
      const saved = await makeGuess(currentGuess);

      if (saved) setCurrentGuess('');
    } else if (key === 'Backspace') {
      setCurrentGuess((prev) => prev.slice(0, prev.length - 1));
    } else {
      if (/^[a-z]$/i.test(key) && currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key.toUpperCase());
      }
    }
  };

  const handleKeyBoardDown = useEffectEvent((e: KeyboardEvent) => {
    // ignore shortcuts like cmd+r / ctrl+c
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    handleKey(e.key);
  });

  useEffect(() => {
    // need to check if user is logged in or has a session?
    // we can't check cookies so we need to call BE
    // if no session then show sign in/signup
    // disable keyboard and game so typing doesn't effect board
    if (!authenticated && userType === 'unknown') modelRef.current?.show();
  }, [authenticated, userType]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyBoardDown);

    return () => window.removeEventListener('keydown', handleKeyBoardDown);
  }, []);

  const keyColors = getKeyColors(previousGuesses, colors);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col justify-between px-2 py-[25px] min-[520px]:justify-start">
      <Signup
        ref={modelRef}
        setUserType={setUserType}
        newGame={newGame}
        loadGame={loadGame}
      />
      <StatusMessage
        gameOver={gameOver}
        winner={winner}
        warning={warning || error}
        answer={answer}
        showInstructions={previousGuesses.length === 0}
        onReset={handleReset}
      />
      <Board
        previousGuesses={previousGuesses}
        currentGuess={currentGuess}
        colors={colors}
        warningId={warningId}
        warning={warning || error}
        gameOver={gameOver}
        isFetching={isFetching}
        showLoading={showLoading}
      />
      <Keyboard
        buttonPress={handleKey}
        keyColors={keyColors}
        disabled={
          gameOver ||
          !isReady ||
          isFetching ||
          (!authenticated && userType === 'unknown')
        }
      />
    </div>
  );
}
