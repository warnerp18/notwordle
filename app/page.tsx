import Game from '@/app/_components/game/Game';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  return (
    <main>
      <Game authenticated={Boolean(session?.value)} />
    </main>
  );
}
