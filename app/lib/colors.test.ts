import { calculateWordColors } from "./colors";

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
