import 'server-only';
import { BinaryLike, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// scrypt is old-school Node: it takes a callback instead of returning a promise.
// promisify wraps it so I can just `await` it.
// I'm using the async version, not scryptSync, because scrypt is slow on purpose
// (~100ms), and the sync one would freeze the whole server while it hashes.
//
// The `as (...)` part is only for TypeScript. scrypt has two versions (with and
// without options), so promisify can't work out the return type and calls it
// `unknown`. This tells TS it gives back a Buffer (raw bytes).
// BinaryLike = Node's name for "a string or bytes".
const scryptAsync = promisify(scrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
) => Promise<Buffer>;

export const hashPassword = async (password: string) => {
  // Salt = random bytes, different for every user. If two people pick the same
  // password, their hashes still come out different, so cracking one doesn't
  // give away the other.
  const salt = randomBytes(32);

  // 32 = how many bytes of hash I want back (keylen)
  const hashedPassword = await scryptAsync(password, salt, 32);

  // Both are raw bytes, and the database column is text. Hex writes each byte as
  // 2 characters, and it can always be turned back into the exact same bytes.
  // The default .toString() garbles random bytes, so never use that here.
  const hash = hashedPassword.toString('hex');

  // The salt gets stored next to the hash because I need the same salt again
  // at login to check the password.
  // Heads up for verifyPassword: I hashed with the salt as BYTES, so at login
  // turn the stored hex back into bytes first: Buffer.from(salt, "hex").
  return `${salt.toString('hex')}:${hash}`;
};

// At login: does the password they typed match the "salt:hash" I stored?
// I can't "unhash" the stored one, so I hash the attempt the exact same way
// (same salt, same length) and check if the two hashes match.

// storedPassword = users.password_hash from the database, the string
//                  hashPassword made at sign up, e.g. "9f00e2...:7c21ab..."
//                  (64 hex characters, a colon, 64 more)
// Returns true or false (a Promise, so await it).
export const verifyPassword = async (
  password: string,
  storedPassword: string,
) => {
  // Split "salt:hash" back into its two halves
  const [saltHex, hashHex] = storedPassword.split(':');

  // Both halves are hex text in the database. Turn them back into the raw
  // bytes they started as. The salt has to be bytes because that's what
  // hashPassword used; a different salt would give a different hash.
  const saltBytes = Buffer.from(saltHex, 'hex');
  // storedPasswordHash = the hash saved at sign up
  const storedPasswordHash = Buffer.from(hashHex, 'hex');

  // attemptPasswordHash = the hash of what they just typed
  const attemptPasswordHash = await scryptAsync(password, saltBytes, 32);

  return timingSafeEqual(storedPasswordHash, attemptPasswordHash);
};
