/**
 * @jest-environment node
 */
import { submitGuess } from './actions';
import { sql } from '@/app/lib/server/db';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// no real database: each test says what the queries return
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));

const mockSql = jest.mocked(sql);

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
