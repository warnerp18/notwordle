import { normalizeEmail } from "./normalizeEmail";

// server-only throws outside a server build, so switch it off for tests
jest.mock("server-only", () => ({}));

describe("normalizeEmail", () => {
  test.each([
    [
      "leaves an already-normal email unchanged",
      "name@gmail.com",
      "name@gmail.com",
    ],
    ["lowercases the whole email", "Name@GMAIL.com", "name@gmail.com"],
    [
      "trims spaces, tabs and newlines",
      "  \tname@gmail.com\n",
      "name@gmail.com",
    ],
    ["removes a +tag before the @", "name+wordle@gmail.com", "name@gmail.com"],
    [
      "trims, lowercases and removes the +tag together",
      "  Name+Wordle@Gmail.com ",
      "name@gmail.com",
    ],
    ["removes a + with nothing after it", "name+@gmail.com", "name@gmail.com"],
    [
      "removes everything from the first + when there are several",
      "name+a+b@gmail.com",
      "name@gmail.com",
    ],
    [
      "leaves a + that only appears in the domain",
      "name@x+y.com",
      "name@x+y.com",
    ],
    ["leaves a + when there is no @ at all", "name+tag", "name+tag"],
    [
      "leaves a + that comes after the last @",
      "name@gmail.com+tag",
      "name@gmail.com+tag",
    ],
    [
      "returns an empty name when the email starts with +",
      "+tag@gmail.com",
      "@gmail.com",
    ],
    ["returns an empty string for an empty email", "", ""],
    ["returns an empty string for a blank email", "   ", ""],
  ])("%s", (_description, input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  // Not valid emails. Sign up's validation rejects these first; these tests
  // pin down what normalize does if one reaches it anyway (e.g. at sign in).
  describe("malformed emails with several @", () => {
    test.each([
      [
        "removes from the first + up to the last @",
        "w+@@@*234234234+@gmail.com",
        "w@gmail.com",
      ],
      [
        "removes a whole middle section, including an @",
        "a+b@c+d@e.com",
        "a@e.com",
      ],
      ["leaves several @ alone when there is no +", "a@@b.com", "a@@b.com"],
    ])("%s", (_description, input, expected) => {
      expect(normalizeEmail(input)).toBe(expected);
    });
  });
});
