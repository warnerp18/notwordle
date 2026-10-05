import 'server-only';
import { sql } from '@/app/lib/server/db';

interface SaveUser {
  email: string;
  emailNormalized: string;
  passwordHash: string;
}
export const saveUser = async ({
  email,
  emailNormalized,
  passwordHash,
}: SaveUser) => {
  const [user] = await sql`
    INSERT INTO users (email, email_normalized, password_hash) 
    VALUES (${email}, ${emailNormalized}, ${passwordHash}) 
    ON CONFLICT (email_normalized) DO NOTHING
    RETURNING id
  `;

  if (!user) {
    return {
      error: 'An account with that email already exists. Try signing in.',
    };
  }
  return { id: user.id };
};
