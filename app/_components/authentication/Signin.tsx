import { startTransition, useActionState, useRef } from 'react';
import styles from './Authentication.module.css';
import { login } from '@/app/lib/server/auth/actions';
import { Game } from '@/app/lib/types';

interface State {
  error: string | null;
}

const Signin = ({
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

  const signIn = async (_prev: State, formData: FormData) => {
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    const status = await login({ email, password });

    if (status.error || !status.game) {
      return { error: status.error ?? 'Something went wrong. Try again.' };
    }

    onSuccess(status.game);
    // don't leave their email and password sitting in the closed modal
    formRef.current?.reset();
    return { error: null };
  };

  const [{ error }, formAction, pending] = useActionState(signIn, {
    error: null,
  });

  return (
    <>
      <h1>Sign in</h1>
      <p>Keep your game going on any device</p>

      {error ? <p className={styles.misMatch}>{error}</p> : null}

      {/* onSubmit, not action={formAction}, so a wrong password doesn't
          clear what they typed (see Signup) */}
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
          autoComplete="current-password"
          required
        />

        <button disabled={pending}>Sign in</button>
        <div className={styles.divider}>or</div>
        <button type="button" onClick={onGuest}>
          Play as guest
        </button>
        <p className={styles.switchForm}>
          New here?{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={onSwitch}>
            Create an account
          </button>
        </p>
      </form>
    </>
  );
};

export default Signin;
