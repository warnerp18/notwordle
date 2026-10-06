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

export const deleteSession = async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

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
