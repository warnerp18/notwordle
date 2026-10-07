'use server';
import 'server-only';
import { validateUser } from './validateUser';
import { normalizeEmail } from './normalizeEmail';
import { hashPassword, verifyPassword } from './password';
import { findUser, saveUser } from './users';
import { createSession, deleteSession, setSessionCookie } from './sessions';
import {
  claimGame,
  createGame,
  findCurrentGame,
  GUEST_GAME_COOKIE,
  toGameState,
} from '@/app/lib/server/game/games';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const dummyHashPasswordPromise = hashPassword(randomBytes(32).toString('hex'));

interface Authentication {
  email: string;
  password: string;
}

export const signup = async ({ email, password }: Authentication) => {
  const cookieStore = await cookies();

  const { success, message } = validateUser({ email, password });
  if (!success) {
    return { error: message };
  }

  const normalizedEmail = normalizeEmail(email);

  const hashedPassword = await hashPassword(password);

  const { id, error } = await saveUser({
    email,
    emailNormalized: normalizedEmail,
    passwordHash: hashedPassword,
  });

  if (error) {
    return { error };
  }

  const gameId = cookieStore.get(GUEST_GAME_COOKIE);

  const game = (await claimGame(gameId?.value, id)) ?? (await createGame(id));

  const sessionId = await createSession(id);

  await setSessionCookie(sessionId);

  // delete so the browser doesn't treat the game as a guest
  cookieStore.delete(GUEST_GAME_COOKIE);
  return {
    game: { ...toGameState(game.guesses, game.answer), id: game.id },
    email,
  };
};

export const login = async ({ email, password }: Authentication) => {
  const cookieStore = await cookies();

  const normalizedEmail = normalizeEmail(email);

  const user = await findUser(normalizedEmail);

  const verifiedPassword = await verifyPassword(
    password,
    user?.password_hash ?? (await dummyHashPasswordPromise),
  );

  if (!user || !verifiedPassword) {
    return { error: 'Incorrect email or password' };
  }

  await deleteSession();
  const gameId = cookieStore.get(GUEST_GAME_COOKIE);

  const game =
    (await claimGame(gameId?.value, user.id)) ??
    (await findCurrentGame(user.id)) ??
    (await createGame(user.id));

  const sessionId = await createSession(user.id);

  await setSessionCookie(sessionId);

  cookieStore.delete(GUEST_GAME_COOKIE);

  return {
    email: user.email,
    game: { ...toGameState(game.guesses, game.answer), id: game.id },
  };
};

export const logout = async () => {
  await deleteSession();
};
