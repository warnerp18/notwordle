import Game from '@/app/_components/game/Game';
import { getSessionUserId } from '@/app/lib/server/auth/sessions';
import { getPlayerGame } from '@/app/lib/server/game/games';

export default async function Home() {
  // runs on the server before the page is sent, so a signed-in player's game
  // is already there on the first paint (guests load theirs in the browser)
  const userId = await getSessionUserId();
  const playerGame = userId ? await getPlayerGame(userId) : null;

  return (
    <main>
      <Game authenticated={userId !== null} playerGame={playerGame} />
    </main>
  );
}
