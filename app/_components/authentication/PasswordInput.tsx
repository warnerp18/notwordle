import { useState } from 'react';
import styles from './Authentication.module.css';
import EyeIcon from './EyeIcon';

// A password input with a show/hide button inside its right edge. Each one
// keeps its own state, so showing one field doesn't show the others.
const PasswordInput = ({
  id,
  autoComplete,
}: {
  id: string;
  autoComplete: 'current-password' | 'new-password';
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.passwordField}>
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        className={styles.input}
        name={id}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        className={styles.showPassword}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword(!showPassword)}>
        <EyeIcon crossed={showPassword} />
      </button>
    </div>
  );
};

export default PasswordInput;
