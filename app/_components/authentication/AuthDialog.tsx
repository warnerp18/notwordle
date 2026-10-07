import { RefObject, useState } from 'react';
import styles from './Authentication.module.css';
import Signin from './Signin';
import Signup from './Signup';
import { Game } from '@/app/lib/types';

// The modal that holds both forms. Game decides when it's open; this only
// decides which form is showing. Sign in is the default.
const AuthDialog = ({
  ref,
  onSuccess,
  onGuest,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  onSuccess: (game: Game, email: string) => void;
  onGuest: () => void;
}) => {
  // thinking of good design? rotate card 180? (switching between the forms)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <dialog ref={ref} className={styles.authentication}>
      <div className={styles.formContainer}>
        {mode === 'signin' ? (
          <Signin
            onSuccess={onSuccess}
            onGuest={onGuest}
            onSwitch={() => setMode('signup')}
          />
        ) : (
          <Signup
            onSuccess={onSuccess}
            onGuest={onGuest}
            onSwitch={() => setMode('signin')}
          />
        )}
      </div>
    </dialog>
  );
};

export default AuthDialog;
