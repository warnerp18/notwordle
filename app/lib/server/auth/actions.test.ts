import { login, signup } from './actions';
import { hashPassword, verifyPassword } from './password';
import { findUser, saveUser } from './users';
import { createSession, deleteSession, setSessionCookie } from './sessions';
import {
  claimGame,
  createGame,
  findCurrentGame,
} from '@/app/lib/server/game/games';
import { cookies } from 'next/headers';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

// validateUser and normalizeEmail are real (plain functions, no database).
// Everything slow or with side effects is faked, so each test says what
// it returns and can check whether it was called at all.
jest.mock('./password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));
jest.mock('./users', () => ({ saveUser: jest.fn(), findUser: jest.fn() }));
jest.mock('./sessions', () => ({
  createSession: jest.fn(),
  setSessionCookie: jest.fn(),
  deleteSession: jest.fn(),
}));
// games.ts loads the database connection, so fake that too
jest.mock('@/app/lib/server/db', () => ({ sql: jest.fn() }));
// claimGame and createGame are faked; toGameState stays real so the tests
// check what the browser actually receives
jest.mock('@/app/lib/server/game/games', () => ({
  ...jest.requireActual('@/app/lib/server/game/games'),
  claimGame: jest.fn(),
  createGame: jest.fn(),
  findCurrentGame: jest.fn(),
}));
// cookies() only works in a real request, so each test fills a fake jar
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const mockHashPassword = jest.mocked(hashPassword);
const mockSaveUser = jest.mocked(saveUser);
const mockCreateSession = jest.mocked(createSession);
const mockSetSessionCookie = jest.mocked(setSessionCookie);
const mockClaimGame = jest.mocked(claimGame);
const mockCreateGame = jest.mocked(createGame);
const mockVerifyPassword = jest.mocked(verifyPassword);
const mockFindUser = jest.mocked(findUser);
const mockDeleteSession = jest.mocked(deleteSession);
const mockFindCurrentGame = jest.mocked(findCurrentGame);
const mockCookies = jest.mocked(cookies);
const mockCookieDelete = jest.fn();

// the browser's cookies for this request, e.g. { guestGame: '...' }
const mockCookieJar = (jar: Record<string, string> = {}) => {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name in jar ? { name, value: jar[name] } : undefined,
    delete: mockCookieDelete,
  } as never);
};

// `const [row] = await sql...` is undefined when nothing matches, but the
// loose row types say it's always a row, so tests need a cast to say "no row"
const NO_ROW = undefined as never;

const USER_ID = '8a1c2e4f-6b3d-4e5a-9c7f-1d2e3f4a5b6c';
const SESSION_ID = 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const PASSWORD_HASH = 'aa11:bb22';
const GUEST_GAME_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';
const NEW_GAME_ID = '7e8f9a0b-1c2d-4e3f-8a4b-5c6d7e8f9a0b';
// the guest was one guess into this game before signing up
const GUEST_GAME = { id: GUEST_GAME_ID, answer: 'REACT', guesses: ['CRANE'] };
const NEW_GAME = { id: NEW_GAME_ID, answer: 'SLATE', guesses: [] };
const GOOD_INPUT = {
  email: 'Name+Wordle@Gmail.com',
  password: 'correct horse',
};

// the happy path: hash works, user is new, no guest game to claim,
// a new game is created, session is created
const mockEverythingWorks = () => {
  mockHashPassword.mockResolvedValueOnce(PASSWORD_HASH);
  mockSaveUser.mockResolvedValueOnce({ id: USER_ID });
  mockClaimGame.mockResolvedValueOnce(null);
  mockCreateGame.mockResolvedValueOnce(NEW_GAME);
  mockCreateSession.mockResolvedValueOnce(SESSION_ID);
};

describe('signup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCookieJar();
  });

  describe('when it works', () => {
    test('returns the email as typed', async () => {
      mockEverythingWorks();

      const result = await signup(GOOD_INPUT);

      expect(result).toMatchObject({ email: 'Name+Wordle@Gmail.com' });
      expect(result).not.toHaveProperty('error');
    });

    test('hashes the password as typed', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(mockHashPassword).toHaveBeenCalledWith('correct horse');
    });

    test('saves the typed email, the normalized email and the hash', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(mockSaveUser).toHaveBeenCalledWith({
        email: 'Name+Wordle@Gmail.com',
        emailNormalized: 'name@gmail.com',
        passwordHash: PASSWORD_HASH,
      });
    });

    test('never saves the raw password', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(JSON.stringify(mockSaveUser.mock.calls)).not.toContain(
        'correct horse',
      );
    });

    test('creates a session for the new user', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(mockCreateSession).toHaveBeenCalledWith(USER_ID);
    });

    test('puts the new session id in the cookie', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(mockSetSessionCookie).toHaveBeenCalledWith(SESSION_ID);
    });

    test('does the steps in order: hash, save, game, session, cookie', async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      const order = [
        mockHashPassword,
        mockSaveUser,
        mockCreateGame,
        mockCreateSession,
        mockSetSessionCookie,
      ].map((mock) => mock.mock.invocationCallOrder[0]);
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });
  });

  describe('the game', () => {
    test("claims the game in the guest's cookie", async () => {
      mockEverythingWorks();
      mockClaimGame.mockReset().mockResolvedValueOnce(GUEST_GAME);
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      const result = await signup(GOOD_INPUT);

      expect(mockClaimGame).toHaveBeenCalledWith(GUEST_GAME_ID, USER_ID);
      expect(mockCreateGame).not.toHaveBeenCalled();
      expect(result).toMatchObject({ game: { id: GUEST_GAME_ID } });
    });

    test('creates a new game for the user when nothing was claimed', async () => {
      mockEverythingWorks();
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      const result = await signup(GOOD_INPUT);

      expect(mockCreateGame).toHaveBeenCalledWith(USER_ID);
      expect(result).toMatchObject({ game: { id: NEW_GAME_ID } });
    });

    test("creates a new game when there's no guest cookie", async () => {
      mockEverythingWorks();

      await signup(GOOD_INPUT);

      expect(mockClaimGame).toHaveBeenCalledWith(undefined, USER_ID);
      expect(mockCreateGame).toHaveBeenCalledWith(USER_ID);
    });

    test('deletes the guest cookie, since they are a player now', async () => {
      mockEverythingWorks();
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      await signup(GOOD_INPUT);

      expect(mockCookieDelete).toHaveBeenCalledWith('guestGame');
    });

    test('sends the game state with colors, and hides the answer mid-game', async () => {
      mockEverythingWorks();
      mockClaimGame.mockReset().mockResolvedValueOnce(GUEST_GAME);

      mockCookieJar({ guestGame: GUEST_GAME_ID });

      const result = await signup(GOOD_INPUT);

      expect(result).toEqual({
        email: 'Name+Wordle@Gmail.com',
        game: {
          id: GUEST_GAME_ID,
          previousGuesses: ['CRANE'],
          colors: [['yellow', 'yellow', 'green', 'gray', 'yellow']],
          answer: null,
        },
      });
      expect(JSON.stringify(result)).not.toContain('REACT');
    });

    test('shows the answer once the claimed game is over', async () => {
      mockEverythingWorks();
      mockClaimGame
        .mockReset()
        .mockResolvedValueOnce({ ...GUEST_GAME, guesses: ['CRANE', 'REACT'] });
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      const result = await signup(GOOD_INPUT);

      expect(result).toMatchObject({ game: { answer: 'REACT' } });
    });
  });

  describe('when the input is bad', () => {
    test.each([
      [
        'a bad email',
        { email: 'nope', password: 'correct horse' },
        'Enter a valid email address',
      ],
      [
        'a short password',
        { email: 'name@gmail.com', password: 'short' },
        'Password must be at least 8 characters',
      ],
    ])('returns the message for %s', async (_description, input, message) => {
      expect(await signup(input)).toEqual({ error: message });
    });

    test('stops before hashing, saving or logging in', async () => {
      await signup({ email: 'nope', password: 'correct horse' });

      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockSaveUser).not.toHaveBeenCalled();
      expect(mockClaimGame).not.toHaveBeenCalled();
      expect(mockCreateGame).not.toHaveBeenCalled();
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetSessionCookie).not.toHaveBeenCalled();
    });
  });

  describe('when the email is already taken', () => {
    const TAKEN = 'An account with that email already exists. Try signing in.';

    beforeEach(() => {
      mockHashPassword.mockResolvedValueOnce(PASSWORD_HASH);
      mockSaveUser.mockResolvedValueOnce({ error: TAKEN });
    });

    test('returns the error from saveUser', async () => {
      expect(await signup(GOOD_INPUT)).toEqual({ error: TAKEN });
    });

    test('does not touch any game, create a session or set a cookie', async () => {
      await signup(GOOD_INPUT);

      expect(mockClaimGame).not.toHaveBeenCalled();
      expect(mockCreateGame).not.toHaveBeenCalled();
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetSessionCookie).not.toHaveBeenCalled();
    });

    test('keeps the guest cookie, so they can still play or sign in', async () => {
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      await signup(GOOD_INPUT);

      expect(mockCookieDelete).not.toHaveBeenCalled();
    });
  });

  describe('when something unexpected fails', () => {
    test('passes a database error on to the caller', async () => {
      mockHashPassword.mockResolvedValueOnce(PASSWORD_HASH);
      mockSaveUser.mockRejectedValueOnce(new Error('connection lost'));

      await expect(signup(GOOD_INPUT)).rejects.toThrow('connection lost');
      expect(mockCreateSession).not.toHaveBeenCalled();
    });
  });
});

describe('login', () => {
  const STORED_USER = {
    id: USER_ID,
    email: 'Name+Wordle@Gmail.com',
    password_hash: PASSWORD_HASH,
  };
  const LOGIN_INPUT = { email: ' name@gmail.com ', password: 'correct horse' };
  const CURRENT_GAME = { id: NEW_GAME_ID, answer: 'SLATE', guesses: ['CRANE'] };

  // right email and password, no guest game, they have a current game
  const mockGoodLogin = () => {
    mockFindUser.mockResolvedValueOnce(STORED_USER);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockClaimGame.mockResolvedValueOnce(null);
    mockFindCurrentGame.mockResolvedValueOnce(CURRENT_GAME);
    mockCreateSession.mockResolvedValueOnce(SESSION_ID);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockCookieJar();
  });

  describe('when it fails', () => {
    test('rejects an unknown email', async () => {
      mockFindUser.mockResolvedValueOnce(NO_ROW);
      mockVerifyPassword.mockResolvedValueOnce(false);

      expect(await login(LOGIN_INPUT)).toEqual({
        error: 'Incorrect email or password',
      });
    });

    test('still checks a password for an unknown email, so it takes as long', async () => {
      mockFindUser.mockResolvedValueOnce(NO_ROW);
      mockVerifyPassword.mockResolvedValueOnce(false);

      await login(LOGIN_INPUT);

      expect(mockVerifyPassword).toHaveBeenCalledTimes(1);
    });

    test('rejects a wrong password with the same message', async () => {
      mockFindUser.mockResolvedValueOnce(STORED_USER);
      mockVerifyPassword.mockResolvedValueOnce(false);

      expect(await login(LOGIN_INPUT)).toEqual({
        error: 'Incorrect email or password',
      });
    });

    test("doesn't touch sessions or games", async () => {
      mockFindUser.mockResolvedValueOnce(STORED_USER);
      mockVerifyPassword.mockResolvedValueOnce(false);

      await login(LOGIN_INPUT);

      expect(mockDeleteSession).not.toHaveBeenCalled();
      expect(mockCreateSession).not.toHaveBeenCalled();
      expect(mockSetSessionCookie).not.toHaveBeenCalled();
      expect(mockClaimGame).not.toHaveBeenCalled();
    });

    test('keeps the guest cookie', async () => {
      mockFindUser.mockResolvedValueOnce(STORED_USER);
      mockVerifyPassword.mockResolvedValueOnce(false);
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      await login(LOGIN_INPUT);

      expect(mockCookieDelete).not.toHaveBeenCalled();
    });
  });

  describe('when it works', () => {
    test('looks the user up by the normalized email', async () => {
      mockGoodLogin();

      await login(LOGIN_INPUT);

      expect(mockFindUser).toHaveBeenCalledWith('name@gmail.com');
    });

    test('checks the password as typed against the stored hash', async () => {
      mockGoodLogin();

      await login(LOGIN_INPUT);

      expect(mockVerifyPassword).toHaveBeenCalledWith(
        'correct horse',
        PASSWORD_HASH,
      );
    });

    test('returns the email as stored and their current game, answer hidden', async () => {
      mockGoodLogin();

      expect(await login(LOGIN_INPUT)).toEqual({
        email: 'Name+Wordle@Gmail.com',
        game: {
          id: NEW_GAME_ID,
          previousGuesses: ['CRANE'],
          colors: [['gray', 'gray', 'green', 'gray', 'green']],
          answer: null,
        },
      });
    });

    test("ends this browser's old session, then starts a new one and sets the cookie", async () => {
      mockGoodLogin();

      await login(LOGIN_INPUT);

      expect(mockDeleteSession).toHaveBeenCalledTimes(1);
      expect(mockCreateSession).toHaveBeenCalledWith(USER_ID);
      expect(mockSetSessionCookie).toHaveBeenCalledWith(SESSION_ID);
      expect(mockDeleteSession.mock.invocationCallOrder[0]).toBeLessThan(
        mockCreateSession.mock.invocationCallOrder[0],
      );
    });

    test("claims the game in the guest's cookie first", async () => {
      mockFindUser.mockResolvedValueOnce(STORED_USER);
      mockVerifyPassword.mockResolvedValueOnce(true);
      mockClaimGame.mockResolvedValueOnce(GUEST_GAME);
      mockCreateSession.mockResolvedValueOnce(SESSION_ID);
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      const result = await login(LOGIN_INPUT);

      expect(mockClaimGame).toHaveBeenCalledWith(GUEST_GAME_ID, USER_ID);
      expect(mockFindCurrentGame).not.toHaveBeenCalled();
      expect(result).toMatchObject({ game: { id: GUEST_GAME_ID } });
    });

    test('deletes the guest cookie', async () => {
      mockGoodLogin();
      mockCookieJar({ guestGame: GUEST_GAME_ID });

      await login(LOGIN_INPUT);

      expect(mockCookieDelete).toHaveBeenCalledWith('guestGame');
    });

    test('creates a game when there is nothing to claim and no current game', async () => {
      mockFindUser.mockResolvedValueOnce(STORED_USER);
      mockVerifyPassword.mockResolvedValueOnce(true);
      mockClaimGame.mockResolvedValueOnce(null);
      mockFindCurrentGame.mockResolvedValueOnce(NO_ROW);
      mockCreateGame.mockResolvedValueOnce(NEW_GAME);
      mockCreateSession.mockResolvedValueOnce(SESSION_ID);

      const result = await login(LOGIN_INPUT);

      expect(mockCreateGame).toHaveBeenCalledWith(USER_ID);
      expect(result).toMatchObject({ game: { id: NEW_GAME_ID } });
    });
  });
});
