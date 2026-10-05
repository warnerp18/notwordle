import styles from '@/app/_components/keyboard/Keyboard.module.css';
import { Color } from '@/app/lib/colors';
const TOP_CHARACTERS = 'QWERTYUIOP';
const MIDDLE_CHARACTERS = 'ASDFGHJKL';
const BOTTOM_CHARACTERS = 'ZXCVBNM';
const ENTER = 'ENTER';

const Keyboard = ({
  buttonPress,
  disabled,
  keyColors,
}: {
  buttonPress: (key: string) => void;
  disabled: boolean;
  keyColors: Record<string, Color>;
}) => {
  return (
    <div
      className={styles.keyboard}
      role="group"
      aria-label="Keyboard"
      onMouseDown={(e) => e.preventDefault()}>
      <div className={styles.row}>
        {TOP_CHARACTERS.split('').map((c) => {
          const colorClass = keyColors[c];
          return (
            <button
              key={c}
              className={`${styles.key} ${colorClass ? styles[colorClass] : ''}`}
              disabled={disabled}
              onClick={() => {
                buttonPress(c);
              }}>
              {c}
            </button>
          );
        })}
      </div>

      <div className={styles.row}>
        <div className={styles.spacer}></div>
        {MIDDLE_CHARACTERS.split('').map((c) => {
          const colorClass = keyColors[c];
          return (
            <button
              key={c}
              className={`${styles.key} ${colorClass ? styles[colorClass] : ''}`}
              disabled={disabled}
              onClick={() => {
                buttonPress(c);
              }}>
              {c}
            </button>
          );
        })}
        <div className={styles.spacer}></div>
      </div>
      <div className={styles.row}>
        <button
          className={`${styles.key} ${styles.special}`}
          disabled={disabled}
          onClick={() => {
            buttonPress('Enter');
          }}>
          {ENTER}
        </button>
        {BOTTOM_CHARACTERS.split('').map((c) => {
          const colorClass = keyColors[c];

          return (
            <button
              key={c}
              className={`${styles.key} ${colorClass ? styles[colorClass] : ''}`}
              disabled={disabled}
              onClick={() => {
                buttonPress(c);
              }}>
              {c}
            </button>
          );
        })}
        <button
          className={`${styles.key} ${styles.special}`}
          disabled={disabled}
          aria-label="Backspace"
          onClick={() => {
            buttonPress('Backspace');
          }}>
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            height="20"
            viewBox="0 0 24 24"
            width="20"
            className="game-icon"
            data-testid="icon-backspace">
            <path
              fill="var(--color-tone-1, currentColor)"
              d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
export default Keyboard;
