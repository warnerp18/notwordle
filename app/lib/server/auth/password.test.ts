import { hashPassword, verifyPassword } from "./password";

// server-only throws outside a server build, so switch it off for tests
jest.mock("server-only", () => ({}));

describe("hashPassword", () => {
  test("returns salt:hash as two 64-character hex strings", async () => {
    const stored = await hashPassword("correct horse");

    expect(stored).toMatch(/^[0-9a-f]{64}:[0-9a-f]{64}$/);
  });

  test("never contains the password itself", async () => {
    const stored = await hashPassword("correct horse");

    expect(stored).not.toContain("correct horse");
  });

  test("gives a different result each time for the same password", async () => {
    const first = await hashPassword("correct horse");
    const second = await hashPassword("correct horse");

    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  test("returns true for the right password", async () => {
    const stored = await hashPassword("correct horse");

    expect(await verifyPassword("correct horse", stored)).toBe(true);
  });

  test.each([
    ["a different password", "wrong horse"],
    ["a different case", "Correct Horse"],
    ["an extra space", "correct horse "],
    ["an empty password", ""],
  ])("returns false for %s", async (_description, attempt) => {
    const stored = await hashPassword("correct horse");

    expect(await verifyPassword(attempt, stored)).toBe(false);
  });

  test("still works when the same password was hashed twice", async () => {
    const first = await hashPassword("correct horse");
    const second = await hashPassword("correct horse");

    expect(await verifyPassword("correct horse", first)).toBe(true);
    expect(await verifyPassword("correct horse", second)).toBe(true);
  });

  test("works with an empty password", async () => {
    const stored = await hashPassword("");

    expect(await verifyPassword("", stored)).toBe(true);
    expect(await verifyPassword("x", stored)).toBe(false);
  });
});
