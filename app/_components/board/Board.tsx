import { calculateWordColors } from "@/app/lib/colors";
import { rowArray, columnArray } from "@/app/lib/constants";
import styles from "@/app/_components/board/Board.module.css";

interface BoardProps {
  previousGuesses: string[];
  currentGuess: string;
  answer: string;
  warningId: number;
  warning: string | null;
}

const Board = ({
  previousGuesses,
  currentGuess,
  answer,
  warningId,
  warning,
}: BoardProps) => {
  return (
    <div className={styles.board}>
      {rowArray.map((_row, rowIndex) => {
        const activeRow = rowIndex === previousGuesses.length;
        const rowWord = activeRow ? currentGuess : previousGuesses[rowIndex];
        const pastRow = rowIndex < previousGuesses.length;

        const bgColor = pastRow ? calculateWordColors(answer, rowWord) : null;

        return (
          <div
            key={activeRow ? `${rowIndex}-${warningId}` : rowIndex}
            className={`${styles.row} ${activeRow && warning ? styles.shake : ""}`}>
            {columnArray.map((_column, columnIndex) => {
              const color = bgColor?.[columnIndex];
              return (
                <div
                  key={columnIndex}
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
