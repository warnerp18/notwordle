import { validateUser } from './validateUser';

// server-only throws outside a server build, so switch it off for tests
jest.mock('server-only', () => ({}));

const GOOD_EMAIL = 'name@gmail.com';
const GOOD_PASSWORD = 'correct horse';

describe('validateUser', () => {
  test('accepts a valid email and password', () => {
    expect(
      validateUser({ email: GOOD_EMAIL, password: GOOD_PASSWORD }),
    ).toEqual({ success: true });
  });

  test('accepts a password of exactly 8 characters', () => {
    expect(validateUser({ email: GOOD_EMAIL, password: '12345678' })).toEqual({
      success: true,
    });
  });

  test('accepts an email with a +tag', () => {
    expect(
      validateUser({ email: 'name+wordle@gmail.com', password: GOOD_PASSWORD }),
    ).toEqual({ success: true });
  });

  test.each([
    ['a space after it', 'name@gmail.com '],
    ['a space before it', ' name@gmail.com'],
    ['a tab and newline around it', '\tname@gmail.com\n'],
  ])('accepts an email with %s', (_description, email) => {
    expect(validateUser({ email, password: GOOD_PASSWORD })).toEqual({
      success: true,
    });
  });

  test.each([
    ['no @', 'namegmail.com'],
    ['nothing before the @', '@gmail.com'],
    ['nothing after the @', 'name@'],
    ['two @', 'name@@gmail.com'],
    ['several @ and a +', 'w+@@@*234234234+@gmail.com'],
    ['a space inside', 'na me@gmail.com'],
    ['an empty email', ''],
  ])('rejects an email with %s', (_description, email) => {
    expect(validateUser({ email, password: GOOD_PASSWORD })).toEqual({
      success: false,
      message: 'Enter a valid email address',
    });
  });

  test.each([
    ['7 characters', '1234567'],
    ['an empty password', ''],
  ])('rejects a password of %s', (_description, password) => {
    expect(validateUser({ email: GOOD_EMAIL, password })).toEqual({
      success: false,
      message: 'Password must be at least 8 characters',
    });
  });

  test('returns only one message when both are wrong', () => {
    const result = validateUser({ email: 'nope', password: 'short' });

    expect(result.success).toBe(false);
    expect(typeof result.message).toBe('string');
  });
});
