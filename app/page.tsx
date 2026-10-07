import Game, { UserType } from '@/app/_components/game/Game';
import { getSessionUser } from '@/app/lib/server/auth/sessions';
import { getGame } from '@/app/lib/server/game/actions';
import { getPlayerGame, GUEST_GAME_COOKIE } from '@/app/lib/server/game/games';
import { cookies } from 'next/headers';

export default async function Home() {
  const user = await getSessionUser();
  const cookieStore = await cookies();
  const guestGameCookie = cookieStore.get(GUEST_GAME_COOKIE);
  const { userId, email } = user ?? {};
  const playerGame = userId
    ? await getPlayerGame(userId)
    : await getGame(guestGameCookie?.value ?? '');

  let userType: UserType = 'unknown';
  if (user?.userId) userType = 'player';
  else if (playerGame) userType = 'guest';

  return (
    <main>
      <Game initialUserType={userType} playerGame={playerGame} email={email} />
    </main>
  );
}
