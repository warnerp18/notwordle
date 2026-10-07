/**
 * @jest-environment node
 */
import { startGame, submitGuess } from './actions';
import { sql } from '@/app/lib/server/db';
import { getSessionUserId } from '@/app/lib/server/auth/sessions';
import { cookies } from 'next/headers';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// no real database: each test says what the queries return
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));

// who's signed in: each test decides (cookies only work in a real request)
jest.mock('@/app/lib/server/auth/sessions', () => ({
  getSessionUserId: jest.fn(),
}));

// cookies() only works in a real request; tests check what gets set
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const mockSql = jest.mocked(sql);
const mockGetSessionUserId = jest.mocked(getSessionUserId);
const mockCookies = jest.mocked(cookies);
const mockCookieSet = jest.fn();

const GAME_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

// SELECT returns the game, then UPDATE returns the new guesses
const mockGameWithNewGuess = (guess: string) => {
  mockSql
    .mockResolvedValueOnce([{ id: GAME_ID, answer: 'REACT', guesses: [] }])
    .mockResolvedValueOnce([{ guesses: [guess] }]);
};

describe('submitGuess', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns an error for a word that isn't in the list, without touching the database", async () => {
    const result = await submitGuess('TESTI', GAME_ID);

    expect(result).toEqual({ error: 'Not in word list' });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('accepts an answer word, ignoring case', async () => {
    mockGameWithNewGuess('CHAIR');

    const result = await submitGuess('chair', GAME_ID);

    expect(result).toEqual({
      previousGuesses: ['CHAIR'],
      colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
      answer: null,
    });
  });

  it('accepts a word that can be guessed but is never an answer', async () => {
    mockGameWithNewGuess('AAHED');

    const result = await submitGuess('AAHED', GAME_ID);

    expect(result).not.toHaveProperty('error');
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  // another request filled the game between our SELECT and UPDATE,
  // so the UPDATE matches no row and we send back the fresh state
  it('returns the final game when another guess used up the last row first', async () => {
    const fiveGuesses = ['CRANE', 'SLATE', 'TOUCH', 'MIGHT', 'BLUNT'];
    const sixGuesses = [...fiveGuesses, 'FROWN'];
    mockSql
      .mockResolvedValueOnce([
        { id: GAME_ID, answer: 'REACT', guesses: fiveGuesses },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: GAME_ID, answer: 'REACT', guesses: sixGuesses },
      ]);

    const result = await submitGuess('CHAIR', GAME_ID);

    expect(result).toMatchObject({
      previousGuesses: sixGuesses,
      answer: 'REACT',
    });
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it('returns the won game when another request guessed the answer first', async () => {
    mockSql
      .mockResolvedValueOnce([
        { id: GAME_ID, answer: 'REACT', guesses: ['CRANE'] },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: GAME_ID, answer: 'REACT', guesses: ['CRANE', 'REACT'] },
      ]);

    const result = await submitGuess('CHAIR', GAME_ID);

    expect(result).toMatchObject({
      previousGuesses: ['CRANE', 'REACT'],
      answer: 'REACT',
    });
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it("still throws for a guess that isn't 5 letters", async () => {
    await expect(submitGuess('AB1', GAME_ID)).rejects.toThrow();
  });
});

describe('startGame', () => {
  const USER_ID = '8a1c2e4f-6b3d-4e5a-9c7f-1d2e3f4a5b6c';

  beforeEach(() => {
    jest.resetAllMocks();
    mockSql.mockResolvedValue([{ id: GAME_ID }]);
    mockCookies.mockResolvedValue({ set: mockCookieSet } as never);
  });

  it("makes a signed-in player's new game theirs", async () => {
    mockGetSessionUserId.mockResolvedValue(USER_ID);

    expect(await startGame()).toBe(GAME_ID);
    // sql(textParts, answer, userId)
    expect(mockSql.mock.calls[0][2]).toBe(USER_ID);
  });

  it("leaves a guest's new game without an owner", async () => {
    mockGetSessionUserId.mockResolvedValue(null);

    await startGame();

    expect(mockSql.mock.calls[0][2]).toBeNull();
  });

  it("remembers a guest's game in an httpOnly cookie", async () => {
    mockGetSessionUserId.mockResolvedValue(null);

    await startGame();

    expect(mockCookieSet).toHaveBeenCalledWith(
      'guestGame',
      GAME_ID,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        // a guest game only lasts a day, so the cookie does too
        maxAge: 24 * 60 * 60,
      }),
    );
  });

  it("doesn't give a signed-in player the guest cookie", async () => {
    mockGetSessionUserId.mockResolvedValue(USER_ID);

    await startGame();

    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
