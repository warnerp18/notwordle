import { Color } from "@/app/lib/colors";
import { ROW_ARRAY, COLUMN_ARRAY } from "@/app/lib/constants";
import styles from "@/app/_components/board/Board.module.css";

// what each tile color means, read out by screen readers
const colorMeanings: Record<Color, string> = {
  green: "correct",
  yellow: "present",
  gray: "absent",
};

const getTileLabel = (letter?: string, color?: Color) => {
  if (!letter) return "Empty";
  if (!color) return letter;
  return `${letter}, ${colorMeanings[color]}`;
};

interface BoardProps {
  previousGuesses: string[];
  currentGuess: string;
  warningId: number;
  warning: string | null;
  gameOver: boolean;
  isFetching: boolean;
  colors: Color[][];
}

const Board = ({
  previousGuesses,
  currentGuess,
  isFetching,
  warningId,
  warning,
  gameOver,
  colors,
}: BoardProps) => {
  return (
    <div
      className={styles.board}
      role="group"
      aria-label="Game board"
      aria-busy={isFetching}>
      {ROW_ARRAY.map((_row, rowIndex) => {
        const activeRow = rowIndex === previousGuesses.length;
        const rowWord = activeRow ? currentGuess : previousGuesses[rowIndex];
        const pastRow = rowIndex < previousGuesses.length;

        const bgColors = pastRow ? colors[rowIndex] : null;

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
            {COLUMN_ARRAY.map((_column, columnIndex) => {
              const color = bgColors?.[columnIndex];
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
