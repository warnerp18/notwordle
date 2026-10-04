Wordle portfolio project: handoff (2026-09-29)
Sep 29, 2026 · @Boss
How we work
• I drive: I write the code and make the decisions. We're pairing, and you teach.
• Go one small step at a time, and explain terms plainly. Offer code only when I ask or I'm stuck.
• Don't edit my code unless I ask. You own the tests when I hand them over.
• You may run commits and pushes when I ask. Use my feat: / test: message style, with no Co-Authored-By lines.
• This is Next.js 16.3, which has breaking changes. Read node_modules/next/dist/docs/ before relying on memory.
Stack and database
• Next.js 16.3 (App Router), React 19, TypeScript, CSS Modules, Jest + Testing Library
• Hosted on Vercel at notwordle.app; pushes to main deploy to production. The Vercel CLI is installed (vercel ls, vercel inspect <url>). The gh CLI is not.
• Database is Neon Postgres, connected through Vercel. DATABASE_URL is in .env.local (via vercel env pull).
• Raw SQL through @neondatabase/serverless. No ORM, which was a deliberate choice to learn SQL first.
• Server Functions ('use server'), not Route Handlers
db/schema.sql:
games(id uuid PK default gen_random_uuid(), answer text, guesses text[] default '{}', created_at timestamptz default now())
What's done
Update 2026-10-04 (newest; where this differs from the older notes below, this wins)
• Auth design is finished. All five flows are drawn. Rate limiting is deferred. The decisions are the (2026-10-04) lines under the 10-03 "Decided" list below.
• db/schema.sql is written (not committed yet): users, then games (now with user_id uuid REFERENCES users(id) ON DELETE CASCADE, nullable = guest), then sessions (id uuid default gen_random_uuid(), user_id NOT NULL ON DELETE CASCADE, expires_at with no default because code sets it from a constant). Order matters, because a table must exist before another REFERENCES it.
• Migration applied to Neon production: CREATE TABLE users, CREATE TABLE sessions, DELETE FROM games (218 test games removed), ALTER TABLE games ADD COLUMN user_id. Backward compatible: the live code ignores user_id, and new games get NULL (guest).
• Lessons: plural table names (games, users, sessions); user is a reserved word in Postgres. varchar without a length = text in Postgres. The column constraint is just REFERENCES x(id); FOREIGN KEY (...) is the table-level form. Editing schema.sql doesn't change the live DB; ALTER TABLE does (a migration). DELETE with no WHERE removes every row.
• Next session: start writing auth code. Suggested order, smallest and most testable first: normalizeEmail → scrypt hash/verify helpers → signup → create session + cookie → login → session lookup + sliding expiry + ownership check in submitGuess → logout → useGame changes (see the 10-04 to-dos).

Update 2026-10-03
• Live checks for 258895a are all done. The favicon (green N tile) shows. Slow 3G shows the wave, and a normal-speed guess doesn't. A 7th guess from a stale second tab is rejected, and that tab switches to the real 6-guess game. So #3 works in production.
• #4 Auth: design only so far, no code. We're doing it as system design interview practice: Claude asks one question at a time like a friendly interviewer, I reason first, then Claude fills gaps and explains tradeoffs. I draw the board myself in Excalidraw and share screenshots. Claude doesn't update the board unless I ask.
• Decided:
  – Email + password, with database sessions (instant logout and revoking, unlike signed cookies).
  – Login is optional, so guests can play. games.user_id can be NULL, meaning a guest game. A guest game is protected only by its random uuid, which works as a bearer token for that one game.
  – Ownership rule: game has no owner → anyone with the id; owner A → only A; owner A and the caller is logged out → { error: "Log in to keep playing" } (data, since a session can expire).
  – When a guest logs in or signs up, their current game is claimed. The form sends gameId? because localStorage isn't sent automatically. Claim only if user_id has no owner yet, enforced in the UPDATE's WHERE (watch out: NULL = anything is never true). If no gameId is sent, get the last game or create one.
  – users: id, email (as typed, shown on screen), email_normalized (lowercase, +tag stripped before the @, UNIQUE), password_hash (salt stored inside), created_at. One normalizeEmail() shared by signup and login. This allows one account per normalized email. Good enough without email verification; revisit with password reset.
  – sessions: id (long random value, also the cookie value), user_id, expires_at. Sliding expiry: on use, if less than half the time is left, set expires_at = now + length and re-send the cookie. Length is a constant in constants.ts. It should be longer than a day, because people play daily. Later improvement: store a hash of the id.
  – Cookie: session=<id>; HttpOnly (JS can't read it), Secure (HTTPS only), SameSite=Lax (other sites can't use it). Set it with cookies().set(name, value, { httpOnly, secure, sameSite: 'lax' }).
  – Signup: check email format, salt and hash the password, INSERT the user. A UNIQUE violation (Postgres code 23505) becomes { error } as data; any other error throws. Then claim or create the game, then create the session.
  – Login: find the user by normalized email (one query returns the id and hash). Hash the attempt with the stored salt and compare. Use the same message for "no such email" and "wrong password". Never send password_hash to the browser.
  – (2026-10-04) Current game: localStorage holds a gameId only while you're a guest. A logged-in player's current game comes from the server (looked up by user_id), which works across two devices and a shared browser. This settles the first "Still open" item below. submitGuess still receives gameId, so the ownership check (game.user_id vs the session's user_id) is always needed: the server never trusts the id the browser sends.
  – (2026-10-04) Which game is current: the newest unfinished game from the last 24 hours. Don't delete older unfinished games; they become abandoned (#5 needs the rows). Settles the second "Still open" item.
  – (2026-10-04) Hashing: crypto.scrypt. Built into Node (no native add-on to build on Vercel), memory-hard, on OWASP's acceptable list, and you handle the salt yourself: randomBytes(16), store as salt:hash, compare with timingSafeEqual. bcrypt ignores anything past 72 bytes. Settles the hashing "Still open" item.
  – (2026-10-04) Existing games: delete all of them, as a deliberate step, ideally alongside the schema change that adds games.user_id. Can't be undone. Anyone mid-game at that moment gets "Something went wrong" once; refresh fixes it. Settles the "130+ ownerless test games" item. Only rate limiting is still open.
  – (2026-10-04) Rate limiting login attempts: deferred on purpose. Build auth without it and come back to it later.
  – (2026-10-04) Flows drawn: logged-in guess and sign out are done, so all five flows are drawn (sign in, sign up, logged-out guess, logged-in guess, sign out).
• Flows drawn so far: signin, signup, logged-out guess. Next: the logged-in guess flow (copy the logged-out flow, add the cookie → session lookup → ownership check → sliding expiry), then logout (DELETE the session row and delete the cookie).
• Still open: where a logged-in player's current game is remembered (localStorage vs asking the server; think about two devices and a shared browser); which game is "current" if a claimed game meets an existing unfinished one; the hashing library (crypto.scrypt, bcrypt or argon2); what happens to the 130+ ownerless test games; rate limiting login attempts.
• Lessons to remember: one-to-many → the column goes on the "many" side (games.user_id, sessions.user_id, never a list of ids on users). In a sequence diagram, time runs downward, so box position = order.
• After the design: write CREATE TABLE users and sessions in db/schema.sql, and add games.user_id.
• To-dos from the 2026-10-04 decision (before or during auth code):
  – Logout: after the logout call returns, the browser deletes "gameId" from localStorage. The server can't touch localStorage.
  – Login/signup: after a successful claim, the browser deletes "gameId" from localStorage.
  – New server function to get a logged-in player's current game by user_id (the latest unfinished one).
  – useGame: on load, logged in → ask the server; guest → localStorage as today. Don't write gameId to localStorage while logged in.
  – (Added 2026-10-04) Do this before testing signup: .env.local's DATABASE_URL is the production Neon database, so localhost writes to production (that's where most of the 218 test games came from). Make a Neon dev branch and point .env.local at it, so test users and sessions stay out of production. Remember the dev branch needs the same schema.

Update 2026-10-02
• Pushed: 392bf42 (#3 simultaneous guesses) and 258895a (loading wave). The latest commit is 258895a. The live check of #1 and #2 is done. The 258895a production deploy is Ready. Still to check on notwordle.app: the favicon still shows, and a normal guess doesn't flash the wave.
• #3: the UPDATE in submitGuess now also requires COALESCE(array_length(guesses, 1), 0) < ${ROWS} AND NOT(answer = ANY(guesses)) in its WHERE. If no row comes back, another request finished the game first, so it re-SELECTs as latestGame and returns that state (data, not an error). The early isGameOver check stays as the quick exit.
• Loading wave: app/_hooks/useDelayedLoading.ts takes isFetching and returns { showLoading }. It shows after SHOW_DELAY (300ms) and, once shown, stays for at least MIN_VISIBLE (600ms). Both values are in app/lib/constants.ts. Game passes showLoading to Board. The active row's tiles get styles.wave plus an inline animationDelay of columnIndex * 0.15s. The wave-bounce keyframes hop between 0% and 30% (peak at 15%) and rest for the remainder of the 1.3s cycle. Under prefers-reduced-motion, .wave switches to wave-fade (opacity 1 → 0.4) instead of turning off.
• Tests: 66 passing. New: two "too late" race tests in actions.test.ts, useDelayedLoading.test.ts (fake timers, 7 tests), and a Board test for the staggered delays.
• #4 Auth has started, with no code yet. We went over the three parts (authentication, sessions, authorization) from node_modules/next/dist/docs/01-app/02-guides/authentication.md. Open decision: how players log in. Options are email + password (Claude recommended it for learning), GitHub OAuth, or magic link. After that: database sessions (a sessions table, which fits raw SQL) or stateless signed cookies. Authorization gap: right now anyone with a game id can guess on that game.
• Possible follow-up: aria-busy isn't announced by many screen readers, so loading may need a live-region message.
• New watch-outs: npm run start serves the old .next build (it was from Sep 27) and ignores code edits. Use npm run dev on localhost. array_length returns NULL for an empty array, so use COALESCE or cardinality. In the sql tag, ${x}AND with no space is a syntax error. app/icon.svg is the favicon (App Router file convention). It was deleted by accident and restored. One localhost guess hit UND_ERR_CONNECT_TIMEOUT (Neon unreachable for 10s), which was a network blip, not code.
• How we work, added: when I ask "is it right so far", only review what I've written and give hints, not the full fix.

All of this is pushed. The latest commit is 89c5f74, which added the word-list check. Tests on localhost passed; the check on the live site is still to do.
Word-list check (#1) and errors as data (#2), new on 2026-09-29
• app/lib/answerWords.ts exports ANSWER_WORDS: 2,315 words the game can pick. It was renamed from words.ts / WORDS.
• app/lib/allowedWords.ts exports ALLOWED_WORDS: 12,972 words (10,657 guess-only + the 2,315 answers). Both files are server-only.
• The source is cfreshman's gist, downloaded from pinned commit URLs. The files were checked: plain ASCII, every line [a-z]{5}, no duplicates.
• actions.ts builds allowedWordSet = new Set(ALLOWED_WORDS) once at the top of the file. It isn't exported, because a 'use server' file may only export async functions.
• submitGuess checks the word after the a-z check and before the SELECT, and returns { error: "Not in word list" }.
• makeGuess narrows with "error" in gameResults, calls setError, and returns false. Game already shows warning || error in the status slot, and the row isn't used up.
• Rule we agreed: return { error } when a normal player can cause it and there's a message they can act on. Throw for bugs or tampering (bad id, non-letters), where the only response is "Something went wrong".
Before today
• The answer never reaches the browser. app/lib/actions.ts has startGame, submitGuess and getGame, plus the helpers isValidId, isGameOver and toGameState. toGameState only includes the answer once the game is over.
• Colors are calculated on the server on every request and not stored.
• app/\_components/game/useGame.ts holds all server state: game { previousGuesses, colors, answer }, isReady, isFetching, error, newGame, makeGuess (returns true/false).
• Resuming after refresh: the game id is kept in localStorage under "gameId". getGame returns null for invalid, missing or older-than-24h games, and the hook then starts a new one.
• Colored keyboard: getKeyColors in app/lib/colors.ts gives each key its best color so far (green > yellow > gray).
• Tests: 56 passing, covering useGame, Game, Board, Keyboard, colors, and now submitGuess (app/lib/actions.test.ts).
Next, in rough order
[x] Check #1 and #2 on the live site. On notwordle.app, TESTI should show "Not in word list", CRANE should be colored, and AAHED should be accepted. Seeing the message in production proves it arrives as data, not as a hidden thrown error.
[x] #3 Simultaneous guesses. Guard the UPDATE so two guesses arriving at once can't go past 6: add the guess-count check to the UPDATE's WHERE.
[ ] #4 Auth. I want to build it myself to learn how it works. I said no to Neon Auth.
[ ] #5 Results history per user, in the database.
  – (Added 2026-10-04) Three outcomes: won (answer in guesses), lost (6 guesses, no answer), unfinished (neither). Unfinished is its own category, not a loss. Work it out from guesses + created_at; no new column. Possible split: in progress (< 24h) vs abandoned.
[ ] #6 Optional cleanup. Delete old game rows (130+ test games). Add a retry button if the first load fails. Once old games get deleted, "Game does not exist" becomes an expected case, and the hook should start a new game instead of showing "Something went wrong".
  – (Added 2026-10-04) Lazy game creation: create the game row on the first guess, not on page load. submitGuess would accept no gameId, create the game, then apply the guess. This stops empty rows from every page load (2 per load in dev because of Strict Mode). It's separate from auth and changes code that already works.
Things to watch out for
• The live site only has pushed code. Test new work on localhost:3000 first.
• React Strict Mode runs effects twice in development, so each page load creates 2 games. This is expected.
• submitGuess now returns game state or { error }. Anything that uses its result has to narrow first. In useGame.test.ts, the GameState type uses Exclude<…, { error: string }> to get only the game-state shape.
• actions.test.ts runs in the node Jest environment and mocks server-only and ./db. Every sql query is a jest.fn that returns whatever rows each test sets up.
• The downloaded word files have no newline after the last word. Join them with awk, not cat, or two words merge into one line.
• Answers now come from 2,315 words instead of 14, so games are much harder. GAMES is no longer a possible answer, but it can still be guessed.
• In Jest, CSS Module class names aren't renamed, so tests can't catch styles["x"] vs "x" mistakes. Check in the browser.
• jsdom keeps localStorage between tests. Tests call localStorage.clear() in beforeEach.
• Database rows are loosely typed, so typos in column names (like game.guess) aren't caught by TypeScript.
