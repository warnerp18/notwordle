import { COLUMNS, ROWS } from '@/app/lib/constants';
import styles from '@/app/_components/status-message/StatusMessage.module.css';

interface StatusMessageProps {
  gameOver: boolean;
  winner: boolean;
  warning: string | null;
  answer: string | null;
  // true before the first guess is submitted
  showInstructions: boolean;
  onReset: () => void;
}

// fills the reserved space above the board: result at game over, else a warning, else the title
const StatusMessage = ({
  gameOver,
  winner,
  warning,
  answer,
  showInstructions,
  onReset,
}: StatusMessageProps) => {
  return (
    <div className={styles.container} aria-live="polite">
      {gameOver ? (
        <>
          {!winner ? <p className={styles.message}>{answer}</p> : null}
          {winner ? (
            <p className={`${styles.message} ${styles.winner}`}>Brilliant!</p>
          ) : null}

          <button className={styles.reset} onClick={onReset}>
            TRY AGAIN
          </button>
        </>
      ) : warning ? (
        <p className={styles.message}>{warning}</p>
      ) : (
        <>
          <h1 className={styles.title}>Not Wordle</h1>
          {showInstructions ? (
            <p className={styles.subtitle}>
              Guess the {COLUMNS}-letter word in {ROWS} tries
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};

export default StatusMessage;
