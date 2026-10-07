import 'server-only';
import { sql } from '@/app/lib/server/db';
import { cookies } from 'next/headers';
import { isValidId } from '@/app/lib/server/game/games';

export const SESSION_LENGTH_DAYS = 7;
export const SESSION_LENGTH_MS = SESSION_LENGTH_DAYS * 24 * 60 * 60 * 1000;

export const createSession = async (userId: string) => {
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_MS);
  const [session] = await sql`
    INSERT INTO sessions (user_id, expires_at) VALUES (${userId}, ${expiresAt}) RETURNING id
  `;

  return session.id;
};

// Who is signed in on this request? The user's id, or null when there's no
// cookie, the cookie isn't a real id, or the session is unknown or expired.
export const getSessionUserId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (!isValidId(sessionId)) return null;

  const [session] = await sql`
    SELECT user_id FROM sessions
    WHERE id = ${sessionId} AND expires_at > now()
  `;

  return session?.user_id ?? null;
};

export const getSessionUser = async (): Promise<{
  userId: string;
  email: string;
} | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;

  if (!isValidId(sessionId)) return null;

  const [user] = await sql`
    SELECT users.id, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ${sessionId} AND sessions.expires_at > now()
  `;

  return user
    ? {
        userId: user.id,
        email: user.email,
      }
    : null;
};

export const deleteSession = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  cookieStore.delete('session');

  if (!sessionCookie || !isValidId(sessionCookie.value)) return;

  await sql`
    DELETE FROM sessions
    WHERE ${sessionCookie.value} = id
  `;
};

export const setSessionCookie = async (sessionId: string) => {
  const cookieStore = await cookies();

  cookieStore.set('session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_LENGTH_MS / 1000,
  });
};
