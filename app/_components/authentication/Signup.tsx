import { RefObject, startTransition, useActionState } from 'react';
import styles from './Authentication.module.css';
import { signup } from '@/app/lib/server/auth/actions';
import { GAME_ID_STORAGE_KEY } from '@/app/lib/constants';
import { Game } from '@/app/lib/types';
import { UserType } from '@/app/_components/game/Game';

interface State {
  error: string | undefined;
  game: Game | undefined;
  email: string | undefined;
}

const Signup = ({
  ref,
  setUserType,
  loadGame,
  newGame,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  setUserType: (value: UserType) => void;
  loadGame: (value: Game) => void;
  newGame: () => void;
}) => {
  const updateFormValues = async (_prev: State, formData: FormData) => {
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const verifyPassword = String(formData.get('verifyPassword') ?? '');
    const misMatch = password !== verifyPassword;

    if (misMatch) {
      return {
        error: 'Passwords must match',
        game: undefined,
        email: undefined,
      };
    }

    // the guest game to claim, if any. Storage can be blocked (some private
    // modes), so a failed read just means there's nothing to claim.
    let gameId = '';
    try {
      gameId = localStorage.getItem(GAME_ID_STORAGE_KEY) ?? '';
    } catch {
      // nothing to claim; the server finds or creates a game instead
    }
    const status = await signup({ email, password, gameId });

    if (status.error) {
      setUserType('unknown');
      return { error: status.error, game: undefined, email: undefined };
    }

    if (ref.current) {
      ref?.current.close();
    }

    if (status.game) {
      setUserType('player');
      loadGame(status.game);
    }

    return {
      error: undefined,
      game: status.game,
      email: status.email,
    };
  };

  const [{ error, game, email }, formAction, pending] = useActionState(
    updateFormValues,
    {
      error: undefined,
      game: undefined,
      email: undefined,
    },
  );

  return (
    <dialog ref={ref} className={styles.authentication}>
      <div className={styles.formContainer}>
        <h1>Create an account</h1>
        <p>Keep your game going on any device</p>

        {error ? <p className={styles.misMatch}>{error}</p> : null}

        {/* onSubmit, not action={formAction}: with action, React clears every
            field after each submit, even when we only return an error.
            startTransition is what keeps `pending` working this way. */}
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => formAction(formData));
          }}>
          <label htmlFor="email">Email </label>
          <input
            type="email"
            id="email"
            className={styles.input}
            name="email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            className={styles.input}
            name="password"
            autoComplete="new-password"
            required
          />
          <p>At least 8 characters</p>
          <label htmlFor="verifyPassword">Confirm password </label>
          <input
            type="password"
            id="verifyPassword"
            className={styles.input}
            name="verifyPassword"
            autoComplete="new-password"
            required
          />

          <button disabled={pending}>Create account</button>
          <div className={styles.divider}>or</div>
          <button
            type="button"
            onClick={(e) => {
              // e.preventDefault();
              ref.current?.close();
              setUserType('guest');
              newGame();
            }}>
            Play as guest
          </button>
          <p className={styles.switchForm}>
            Have an account?{' '}
            <button
              type="button"
              className={styles.linkButton}
              onClick={(e) => {
                // e.preventDefault();
                // thinking of good design? rotate card 180?
              }}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </dialog>
  );
};

export default Signup;
