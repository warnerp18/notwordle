"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Keyboard from "@/app/_components/keyboard/Keyboard";
import Board from "@/app/_components/board/Board";
import StatusMessage from "@/app/_components/status-message/StatusMessage";
import { columns, rows, WORDS } from "@/app/lib/constants";

const wordsLength = WORDS.length;

const pickRandomWord = () => {
  return WORDS[Math.floor(Math.random() * wordsLength)];
};

export default function App() {
  const [answer, setAnswer] = useState(pickRandomWord);
  const [previousGuesses, setPreviousGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");

  const [warning, setWarning] = useState<string | null>(null);
  const [warningId, setWarningId] = useState(0);

  const handleReset = () => {
    setCurrentGuess("");
    setPreviousGuesses([]);
    setAnswer(pickRandomWord());
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
  const gameOver = previousGuesses.length === rows || winner;

  const handleKey = (key: string) => {
    if (gameOver) return;

    if (key === "Enter") {
      if (currentGuess.length !== columns) {
        showWarning("Not enough letters");
        return;
      }
      setPreviousGuesses((prev) => [...prev, currentGuess]);
      setCurrentGuess("");
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

  return (
    <div className="mx-auto flex h-dvh w-full max-w-(--app-max-width) flex-col justify-between px-2 py-[25px] min-[520px]:justify-start">
      <StatusMessage
        gameOver={gameOver}
        winner={winner}
        warning={warning}
        answer={answer}
        showInstructions={previousGuesses.length === 0}
        onReset={handleReset}
      />
      <Board
        previousGuesses={previousGuesses}
        currentGuess={currentGuess}
        answer={answer}
        warningId={warningId}
        warning={warning}
        gameOver={gameOver}
      />
      <Keyboard buttonPress={handleKey} disabled={gameOver} />
    </div>
  );
}
