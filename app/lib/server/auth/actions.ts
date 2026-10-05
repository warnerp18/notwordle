'use server';
import 'server-only';
import { validateUser } from './validateUser';
import { normalizeEmail } from './normalizeEmail';
import { hashPassword } from './password';
import { saveUser } from './users';
import { createSession, setSessionCookie } from './sessions';
import {
  claimGame,
  createGame,
  toGameState,
} from '@/app/lib/server/game/games';

interface Signup {
  email: string;
  password: string;
  gameId?: string;
}
export const signup = async ({ email, password, gameId }: Signup) => {
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

  const game = (await claimGame(gameId, id)) ?? (await createGame(id));

  const sessionId = await createSession(id);

  await setSessionCookie(sessionId);

  return {
    game: { ...toGameState(game.guesses, game.answer), id: game.id },
    email,
  };
};
