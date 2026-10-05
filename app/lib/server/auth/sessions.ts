import "server-only";
import { sql } from "../db";
import { cookies } from "next/headers";

export const SESSION_LENGTH_DAYS = 7;
export const SESSION_LENGTH_MS = SESSION_LENGTH_DAYS * 24 * 60 * 60 * 1000;

export const createSession = async (userId: string) => {
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_MS);
  const [session] = await sql`
    INSERT INTO sessions (user_id, expires_at) VALUES (${userId}, ${expiresAt}) RETURNING id
  `;

  return session.id;
};

export const setSessionCookie = async (sessionId: string) => {
  const cookieStore = await cookies();

  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_LENGTH_MS / 1000,
  });
};
