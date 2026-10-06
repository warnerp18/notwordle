/**
 * @jest-environment node
 */
import { getPlayerGame } from './games';
import { sql } from '@/app/lib/server/db';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// no real database: each test says what the queries return
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));

const mockSql = jest.mocked(sql);

const USER_ID = '8a1c2e4f-6b3d-4e5a-9c7f-1d2e3f4a5b6c';
const GAME_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

describe('getPlayerGame', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns their unfinished game, shaped for the browser', async () => {
    // findCurrentGame's SELECT finds one
    mockSql.mockResolvedValueOnce([
      { id: GAME_ID, answer: 'REACT', guesses: ['CHAIR'] },
    ]);

    expect(await getPlayerGame(USER_ID)).toEqual({
      id: GAME_ID,
      previousGuesses: ['CHAIR'],
      colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
      answer: null,
    });
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('creates a game for them when there is none', async () => {
    mockSql
      .mockResolvedValueOnce([]) // findCurrentGame: nothing unfinished
      .mockResolvedValueOnce([{ id: GAME_ID, answer: 'REACT', guesses: [] }]);

    const game = await getPlayerGame(USER_ID);

    expect(mockSql).toHaveBeenCalledTimes(2);
    // the INSERT gets the user id, so the new game is theirs
    expect(mockSql.mock.calls[1].slice(1)).toContain(USER_ID);
    expect(game).toEqual({
      id: GAME_ID,
      previousGuesses: [],
      colors: [],
      answer: null,
    });
  });

  it('never sends the answer of an unfinished game', async () => {
    mockSql.mockResolvedValueOnce([
      { id: GAME_ID, answer: 'REACT', guesses: [] },
    ]);

    expect((await getPlayerGame(USER_ID)).answer).toBeNull();
  });
});
