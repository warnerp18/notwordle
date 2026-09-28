import { calculateWordColors } from "@/app/lib/colors";
import { rowArray, columnArray } from "@/app/lib/constants";
import styles from "@/app/_components/board/Board.module.css";

// what each tile color means, read out by screen readers
const colorMeanings: Record<string, string> = {
  green: "correct",
  yellow: "present",
  gray: "absent",
};

const getTileLabel = (letter?: string, color?: string) => {
  if (!letter) return "Empty";
  if (!color) return letter;
  return `${letter}, ${colorMeanings[color]}`;
};

interface BoardProps {
  previousGuesses: string[];
  currentGuess: string;
  answer: string;
  warningId: number;
  warning: string | null;
  gameOver: boolean;
}

const Board = ({
  previousGuesses,
  currentGuess,
  answer,
  warningId,
  warning,
  gameOver,
}: BoardProps) => {
  return (
    <div className={styles.board} role="group" aria-label="Game board">
      {rowArray.map((_row, rowIndex) => {
        const activeRow = rowIndex === previousGuesses.length;
        const rowWord = activeRow ? currentGuess : previousGuesses[rowIndex];
        const pastRow = rowIndex < previousGuesses.length;

        const bgColor = pastRow ? calculateWordColors(answer, rowWord) : null;

        return (
          <div
            key={activeRow ? `${rowIndex}-${warningId}` : rowIndex}
            role="group"
            aria-label={`Row ${rowIndex + 1}`}
            aria-current={activeRow && !gameOver ? "true" : undefined}
            className={`
              ${styles.row} 
              ${activeRow && warning ? styles.shake : ""}
              ${activeRow && !gameOver ? styles.active : ""}
            `}>
            {columnArray.map((_column, columnIndex) => {
              const color = bgColor?.[columnIndex];
              const letter = rowWord?.[columnIndex];
              const label = getTileLabel(letter, color);
              return (
                <div
                  key={columnIndex}
                  role="img"
                  aria-label={label}
                  className={`
                    ${styles.tile}
                  
                    ${activeRow && rowWord?.[columnIndex] ? styles.filled : ""}
                    ${color ? styles[color] : ""}
                    `}>
                  {rowWord?.[columnIndex]}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
