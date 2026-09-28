import Board from "./Board";

import { render, screen, within } from "@testing-library/react";

describe("<Board />", () => {
  it("renders an empty board with 6 rows of empty tiles", () => {
    render(
      <Board
        previousGuesses={[]}
        currentGuess={""}
        answer={""}
        warningId={0}
        warning={null}
        gameOver={false}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Game board" }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("group", { name: /Row/i })).toHaveLength(6);
    expect(screen.getAllByRole("img", { name: "Empty" })).toHaveLength(30);
  });

  it("shows past and current guesses in their own rows", () => {
    render(
      <Board
        previousGuesses={["CHAIR"]}
        currentGuess={"TOW"}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={false}
      />,
    );
    const row1 = screen.getByRole("group", { name: "Row 1" });
    const row2 = screen.getByRole("group", { name: "Row 2" });

    const row3 = screen.getByRole("group", { name: "Row 3" });

    const row1Letters = within(row1)
      .getAllByRole("img")
      .map((tile) => tile.textContent);
    expect(row1Letters).toEqual(["C", "H", "A", "I", "R"]);

    for (const letter of ["T", "O", "W"]) {
      expect(
        within(row2).getByRole("img", { name: letter }),
      ).toBeInTheDocument();
    }
    expect(within(row2).getAllByRole("img", { name: "Empty" })).toHaveLength(2);
    expect(within(row3).getAllByRole("img", { name: "Empty" })).toHaveLength(5);

    expect(screen.getAllByRole("img", { name: "Empty" })).toHaveLength(22);
  });

  it("labels past guesses as correct, present or absent", () => {
    render(
      <Board
        previousGuesses={["CHAIR"]}
        currentGuess={""}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={false}
      />,
    );
    const row1 = screen.getByRole("group", { name: "Row 1" });

    const row1Labels = within(row1)
      .getAllByRole("img")
      .map((tile) => tile.getAttribute("aria-label"));
    expect(row1Labels).toEqual([
      "C, present",
      "H, absent",
      "A, correct",
      "I, absent",
      "R, present",
    ]);
  });

  it("marks the row being typed as the current row", () => {
    render(
      <Board
        previousGuesses={["CHAIR"]}
        currentGuess={"TOW"}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={false}
      />,
    );

    expect(screen.getByRole("group", { current: true })).toHaveAccessibleName(
      "Row 2",
    );
  });

  it("marks no row as current once the game is over", () => {
    render(
      <Board
        previousGuesses={["REACT"]}
        currentGuess={""}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={true}
      />,
    );

    expect(screen.queryByRole("group", { current: true })).toBeNull();
  });

  it("labels every tile correct when the guess matches the answer", () => {
    render(
      <Board
        previousGuesses={["REACT"]}
        currentGuess={""}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={true}
      />,
    );
    const row1 = screen.getByRole("group", { name: "Row 1" });

    const row1Labels = within(row1)
      .getAllByRole("img")
      .map((tile) => tile.getAttribute("aria-label"));
    expect(row1Labels).toEqual([
      "R, correct",
      "E, correct",
      "A, correct",
      "C, correct",
      "T, correct",
    ]);
  });

  it("colors every row and leaves no empty tiles when all 6 guesses are used", () => {
    const guesses = ["CHAIR", "TOWNS", "PLUMB", "FIGHT", "BRAKE", "TRACE"];
    render(
      <Board
        previousGuesses={guesses}
        currentGuess={""}
        answer={"REACT"}
        warningId={0}
        warning={null}
        gameOver={true}
      />,
    );

    guesses.forEach((guess, index) => {
      const row = screen.getByRole("group", { name: `Row ${index + 1}` });
      const tiles = within(row).getAllByRole("img");

      expect(tiles.map((tile) => tile.textContent)).toEqual(guess.split(""));
      // every label has a meaning after the letter, like "C, present"
      for (const tile of tiles) {
        expect(tile).toHaveAccessibleName(/^[A-Z], (correct|present|absent)$/);
      }
    });

    expect(screen.queryAllByRole("img", { name: "Empty" })).toHaveLength(0);
    expect(screen.queryByRole("group", { current: true })).toBeNull();
  });
});
