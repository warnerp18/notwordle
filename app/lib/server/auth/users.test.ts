import { saveUser } from './users';
import { sql } from '@/app/lib/server/db';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// no real database: each test says what the query returns
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));

const mockSql = jest.mocked(sql);

const USER_ID = '8a1c2e4f-6b3d-4e5a-9c7f-1d2e3f4a5b6c';
const NEW_USER = {
  email: 'Name+Wordle@Gmail.com',
  emailNormalized: 'name@gmail.com',
  passwordHash: 'aa11:bb22',
};

// sql is a tagged template, so it's called as sql(textParts, ...values).
// This pulls out the values the query sent.
const sentValues = () => mockSql.mock.calls[0].slice(1);

describe('saveUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns the new user's id", async () => {
    mockSql.mockResolvedValueOnce([{ id: USER_ID }]);

    expect(await saveUser(NEW_USER)).toEqual({ id: USER_ID });
  });

  test('sends the email as typed, the normalized email and the hash, in that order', async () => {
    mockSql.mockResolvedValueOnce([{ id: USER_ID }]);

    await saveUser(NEW_USER);

    expect(sentValues()).toEqual([
      'Name+Wordle@Gmail.com',
      'name@gmail.com',
      'aa11:bb22',
    ]);
  });

  // ON CONFLICT DO NOTHING inserts nothing, so RETURNING gives back no rows
  test('returns an error when the email is already taken', async () => {
    mockSql.mockResolvedValueOnce([]);

    expect(await saveUser(NEW_USER)).toEqual({
      error: 'An account with that email already exists. Try signing in.',
    });
  });

  test('runs one query', async () => {
    mockSql.mockResolvedValueOnce([{ id: USER_ID }]);

    await saveUser(NEW_USER);

    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  test('passes any other database error on to the caller', async () => {
    mockSql.mockRejectedValueOnce(new Error('connection lost'));

    await expect(saveUser(NEW_USER)).rejects.toThrow('connection lost');
  });
});
