import { cookies } from 'next/headers';
import { createSession, setSessionCookie, SESSION_LENGTH_MS } from './sessions';
import { sql } from '@/app/lib/server/db';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// no real database: each test says what the query returns
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));

// cookies() only works inside a real Next.js request, so swap in a fake
// cookie store whose set() just records what it was called with
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const mockSql = jest.mocked(sql);
const mockCookies = jest.mocked(cookies);

const USER_ID = '8a1c2e4f-6b3d-4e5a-9c7f-1d2e3f4a5b6c';
const SESSION_ID = 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const NOW = new Date('2026-10-05T12:00:00Z');

// sql is a tagged template, so it's called as sql(textParts, ...values).
// This pulls out the values the query sent: [userId, expiresAt].
const sentValues = () => mockSql.mock.calls[0].slice(1);

describe('createSession', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // freeze the clock so "now + 7 days" is an exact time
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns the new session's id", async () => {
    mockSql.mockResolvedValueOnce([{ id: SESSION_ID }]);

    expect(await createSession(USER_ID)).toBe(SESSION_ID);
  });

  test('runs one query', async () => {
    mockSql.mockResolvedValueOnce([{ id: SESSION_ID }]);

    await createSession(USER_ID);

    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  test('saves the session for the given user', async () => {
    mockSql.mockResolvedValueOnce([{ id: SESSION_ID }]);

    await createSession(USER_ID);

    expect(sentValues()[0]).toBe(USER_ID);
  });

  test('sets expires_at to exactly 7 days from now, as a Date', async () => {
    mockSql.mockResolvedValueOnce([{ id: SESSION_ID }]);

    await createSession(USER_ID);

    const expiresAt = sentValues()[1];
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt).toEqual(new Date('2026-10-12T12:00:00Z'));
    expect((expiresAt as Date).getTime() - NOW.getTime()).toBe(
      SESSION_LENGTH_MS,
    );
  });

  test('passes a database error on to the caller', async () => {
    mockSql.mockRejectedValueOnce(new Error('connection lost'));

    await expect(createSession(USER_ID)).rejects.toThrow('connection lost');
  });
});

describe('setSessionCookie', () => {
  const mockSet = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    mockCookies.mockResolvedValue({ set: mockSet } as unknown as Awaited<
      ReturnType<typeof cookies>
    >);
  });

  test('sets one cookie called session, holding the session id', async () => {
    await setSessionCookie(SESSION_ID);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      'session',
      SESSION_ID,
      expect.anything(),
    );
  });

  test('passes all the security options', async () => {
    await setSessionCookie(SESSION_ID);

    const options = mockSet.mock.calls[0][2];
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    );
  });

  test('keeps the cookie for 7 days, in seconds', async () => {
    await setSessionCookie(SESSION_ID);

    const options = mockSet.mock.calls[0][2];
    expect(options.maxAge).toBe(7 * 24 * 60 * 60);
    expect(options.maxAge).toBe(SESSION_LENGTH_MS / 1000);
  });
});
