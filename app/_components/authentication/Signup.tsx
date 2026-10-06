import { startTransition, useActionState, useRef } from 'react';
import styles from './Authentication.module.css';
import { signup } from '@/app/lib/server/auth/actions';
import { Game } from '@/app/lib/types';
import { readGuestGameId } from './guestGameId';

interface State {
  error: string | null;
}

const Signup = ({
  onSuccess,
  onGuest,
  onSwitch,
}: {
  onSuccess: (game: Game) => void;
  onGuest: () => void;
  onSwitch: () => void;
}) => {
  // so the action can clear the inputs after a success
  const formRef = useRef<HTMLFormElement>(null);

  const updateFormValues = async (_prev: State, formData: FormData) => {
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const verifyPassword = String(formData.get('verifyPassword') ?? '');
    const misMatch = password !== verifyPassword;

    if (misMatch) {
      return { error: 'Passwords must match' };
    }

    const status = await signup({ email, password, gameId: readGuestGameId() });

    if (status.error || !status.game) {
      return { error: status.error ?? 'Something went wrong. Try again.' };
    }

    onSuccess(status.game);
    // don't leave their email and password sitting in the closed modal
    formRef.current?.reset();
    return { error: null };
  };

  const [{ error }, formAction, pending] = useActionState(updateFormValues, {
    error: null,
  });

  return (
    <>
      <h1>Create an account</h1>
      <p>Keep your game going on any device</p>

      {error ? <p className={styles.misMatch}>{error}</p> : null}

      {/* onSubmit, not action={formAction}: with action, React clears every
          field after each submit, even when we only return an error.
          startTransition is what keeps `pending` working this way. */}
      <form
        ref={formRef}
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
        <button type="button" onClick={onGuest}>
          Play as guest
        </button>
        <p className={styles.switchForm}>
          Have an account?{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={onSwitch}>
            Sign in
          </button>
        </p>
      </form>
    </>
  );
};

export default Signup;
