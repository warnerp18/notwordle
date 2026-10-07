'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Keyboard from '@/app/_components/keyboard/Keyboard';
import Board from '@/app/_components/board/Board';
import StatusMessage from '@/app/_components/status-message/StatusMessage';
import { COLUMNS, ROWS } from '@/app/lib/constants';
import useGame from './useGame';
import { getKeyColors } from '@/app/lib/colors';
import useDelayedLoading from '@/app/_hooks/useDelayedLoading';
import AuthDialog from '@/app/_components/authentication/AuthDialog';
import { Game as GameData } from '@/app/lib/types';
import { logout } from '@/app/lib/server/auth/actions';

export type UserType = 'unknown' | 'guest' | 'player';

export default function App({
  initialUserType,
  playerGame = null,
  email,
}: {
  initialUserType: UserType;
  playerGame?: GameData | null;
  email?: string;
}) {
  const [currentGuess, setCurrentGuess] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(email ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [warningId, setWarningId] = useState(0);
  const [userType, setUserType] = useState<UserType>(initialUserType);

  // whether the sign in / sign up modal is showing. A first visit opens with
  // it; a guest can open it later from the "Sign in" button.
  const [authOpen, setAuthOpen] = useState(() => userType === 'unknown');
  // the board and keyboard ignore input until they've chosen, and while the
  // modal is open (so typing an email doesn't type into the board)
  const locked = userType === 'unknown' || authOpen;

  const modelRef = useRef<HTMLDialogElement>(null);

  const {
    answer,
    previousGuesses,
    colors,
    isReady,
    newGame,
    loadGame,
    makeGuess,
    resetGame,
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
    if (gameOver || !isReady || isFetching || locked) return;

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
    if (authOpen) {
      modelRef.current?.show();
    } else {
      modelRef.current?.close();
    }
  }, [authOpen]);

  const handleAuthSuccess = (game: GameData, email: string) => {
    setAuthOpen(false);
    setUserType('player');
    loadGame(game);
    setUserEmail(email);
  };

  const handleGuest = () => {
    setAuthOpen(false);
    // a guest who reopened the modal keeps the game they're playing
    if (userType === 'unknown') {
      setUserType('guest');
      newGame();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      resetGame();
      setCurrentGuess('');
      setUserType('unknown');
      setAuthOpen(true);
      setUserEmail(null);
    } catch {
      showWarning('Something went wrong. Try again.');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyBoardDown);

    return () => window.removeEventListener('keydown', handleKeyBoardDown);
  }, []);

  const keyColors = getKeyColors(previousGuesses, colors);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col justify-between px-2 py-[25px] short-phone:py-[10px] min-[520px]:justify-start">
      <AuthDialog
        ref={modelRef}
        onSuccess={handleAuthSuccess}
        onGuest={handleGuest}
      />
      {userType === 'guest' && !authOpen ? (
        <button
          type="button"
          className="absolute top-1 right-1 cursor-pointer p-2 text-base font-bold hover:underline sm:text-sm"
          onClick={() => setAuthOpen(true)}>
          Sign in
        </button>
      ) : null}
      {userType === 'player' && !authOpen ? (
        <div className="absolute top-1 right-1 flex items-center gap-1 text-base sm:text-sm">
          {userEmail ? (
            <p className="max-w-[45vw] truncate text-muted">{userEmail}</p>
          ) : null}
          <button
            type="button"
            className="cursor-pointer p-2 font-bold hover:underline"
            onClick={handleLogout}>
            Sign out
          </button>
        </div>
      ) : null}
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
        disabled={gameOver || !isReady || isFetching || locked}
      />
    </div>
  );
}
