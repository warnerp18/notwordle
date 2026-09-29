import { calculateWordColors, Color, getKeyColors } from "./colors";

describe("calculateWordColors", () => {
  it("returns an empty array when the guess is empty", () => {
    expect(calculateWordColors("apple", "")).toEqual([]);
  });

  it("marks every letter green for a correct guess", () => {
    expect(calculateWordColors("apple", "apple")).toEqual([
      "green",
      "green",
      "green",
      "green",
      "green",
    ]);
  });

  it("marks every letter gray when nothing matches", () => {
    expect(calculateWordColors("apple", "moody")).toEqual([
      "gray",
      "gray",
      "gray",
      "gray",
      "gray",
    ]);
  });

  it("marks letters in the wrong spot yellow", () => {
    expect(calculateWordColors("apple", "leapt")).toEqual([
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "gray",
    ]);
  });

  it("does not color a repeated letter more times than it appears in the answer", () => {
    // "apple" has one "e", so only one "e" in "eeeee" gets a color
    expect(calculateWordColors("apple", "eeeee")).toEqual([
      "gray",
      "gray",
      "gray",
      "gray",
      "green",
    ]);
  });

  it("gives green priority over an earlier yellow for the same letter", () => {
    // the "l" at index 3 is green, so the earlier "l" has none left to be yellow
    expect(calculateWordColors("apple", "lolly")).toEqual([
      "gray",
      "gray",
      "gray",
      "green",
      "gray",
    ]);
  });

  it("colors both copies when the answer has the letter twice", () => {
    expect(calculateWordColors("apple", "paper")).toEqual([
      "yellow",
      "yellow",
      "green",
      "yellow",
      "gray",
    ]);
  });
});

describe("getKeyColors", () => {
  it("returns no colors before any guesses", () => {
    expect(getKeyColors([], [])).toEqual({});
  });

  it("keeps the best color each letter has had: green, then yellow, then gray", () => {
    // answer is REACT
    const guesses = ["CHAIR", "EERIE", "TRACE"];
    const colors: Color[][] = [
      ["yellow", "gray", "green", "gray", "yellow"], // C H A I R
      ["gray", "green", "yellow", "gray", "gray"], // E E R I E
      ["yellow", "yellow", "green", "green", "yellow"], // T R A C E
    ];

    expect(getKeyColors(guesses, colors)).toEqual({
      C: "green", // yellow, then green
      H: "gray",
      A: "green",
      I: "gray",
      R: "yellow",
      E: "green", // gray, green, gray, then yellow
      T: "yellow",
    });
  });

  it("never downgrades a letter that was already green", () => {
    const colors: Color[][] = [
      ["green", "gray", "gray", "gray", "gray"],
      ["yellow", "gray", "gray", "gray", "gray"],
    ];

    expect(getKeyColors(["ABCDE", "AFGHI"], colors).A).toBe("green");
  });
});
