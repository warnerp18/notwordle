"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Keyboard from "@/app/_components/keyboard/Keyboard";
import Board from "@/app/_components/board/Board";
import StatusMessage from "@/app/_components/status-message/StatusMessage";
import { COLUMNS, ROWS } from "@/app/lib/constants";
import useGame from "./useGame";
import { getKeyColors } from "@/app/lib/colors";
import useDelayedLoading from "@/app/_hooks/useDelayedLoading";

export default function App() {
  const [currentGuess, setCurrentGuess] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [warningId, setWarningId] = useState(0);

  const {
    answer,
    previousGuesses,
    colors,
    isReady,
    newGame,
    makeGuess,
    isFetching,
    error,
  } = useGame();

  const { showLoading } = useDelayedLoading(isFetching);

  const handleReset = async () => {
    setCurrentGuess("");
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
    if (gameOver || !isReady || isFetching) return;

    if (key === "Enter") {
      if (currentGuess.length !== COLUMNS) {
        showWarning("Not enough letters");
        return;
      }
      const saved = await makeGuess(currentGuess);

      if (saved) setCurrentGuess("");
    } else if (key === "Backspace") {
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
    window.addEventListener("keydown", handleKeyBoardDown);

    return () => window.removeEventListener("keydown", handleKeyBoardDown);
  }, []);

  const keyColors = getKeyColors(previousGuesses, colors);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col justify-between px-2 py-[25px] min-[520px]:justify-start">
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
        disabled={gameOver || !isReady || isFetching}
      />
    </div>
  );
}
