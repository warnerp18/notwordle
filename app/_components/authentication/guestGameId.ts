import { GAME_ID_STORAGE_KEY } from '@/app/lib/constants';

// The guest game to claim when signing up or in, if any. Storage can be
// blocked (some private modes), so a failed read just means there's nothing
// to claim; the server finds or creates a game instead.
export const readGuestGameId = () => {
  try {
    return localStorage.getItem(GAME_ID_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};
