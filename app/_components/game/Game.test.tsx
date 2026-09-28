import Game from "./Game";
import { submitGuess } from "@/app/lib/actions";

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockAnswer = "REACT";
let mockGuesses: string[] = [];

jest.mock("@/app/lib/actions", () => {
  const { calculateWordColors } = jest.requireActual("@/app/lib/colors");

  return {
    startGame: jest.fn(async () => {
      mockGuesses = [];
      return "test-game-id";
    }),
    submitGuess: jest.fn(async (guess: string) => {
      mockGuesses = [...mockGuesses, guess];
      const over = guess === mockAnswer || mockGuesses.length === 6;

      return {
        previousGuesses: mockGuesses,
        colors: mockGuesses.map((g) => calculateWordColors(mockAnswer, g)),
        answer: over ? mockAnswer : null,
      };
    }),
  };
});

const getRowLetters = (rowNumber: number) =>
  within(screen.getByRole("group", { name: `Row ${rowNumber}` }))
    .getAllByRole("img")
    .map((tile) => tile.textContent);

const getRowLabels = (rowNumber: number) =>
  within(screen.getByRole("group", { name: `Row ${rowNumber}` }))
    .getAllByRole("img")
    .map((tile) => tile.getAttribute("aria-label"));

const waitForGameReady = () =>
  waitFor(() =>
    expect(screen.getByRole("button", { name: "T" })).toBeEnabled(),
  );

const renderGame = async () => {
  render(<Game />);
  await waitForGameReady();
};

describe("<Game />", () => {
  beforeEach(() => {
    mockAnswer = "REACT";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the title and instructions before the first guess", async () => {
    await renderGame();

    expect(
      screen.getByRole("heading", { name: "Not Wordle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Guess the 5-letter word in 6 tries"),
    ).toBeInTheDocument();
  });

  it("types letters from the physical keyboard in uppercase", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("tow");

    expect(getRowLetters(1)).toEqual(["T", "O", "W", "", ""]);
  });

  it("types letters from the on-screen keyboard", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.click(screen.getByRole("button", { name: "T" }));
    await user.click(screen.getByRole("button", { name: "O" }));

    expect(getRowLetters(1)).toEqual(["T", "O", "", "", ""]);
  });

  it("removes the last letter on Backspace", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("tow{Backspace}");

    expect(getRowLetters(1)).toEqual(["T", "O", "", "", ""]);
  });

  it("ignores letters after the row is full", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("chairs");

    expect(getRowLetters(1)).toEqual(["C", "H", "A", "I", "R"]);
    expect(getRowLetters(2)).toEqual(["", "", "", "", ""]);
  });

  it("ignores numbers and shortcuts like ctrl+r", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("1{Control>}r{/Control}");

    expect(getRowLetters(1)).toEqual(["", "", "", "", ""]);
  });

  it("warns about a short guess and hides the warning after 1.5s", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderGame();

    await user.keyboard("tow{Enter}");

    expect(screen.getByText("Not enough letters")).toBeInTheDocument();

    expect(getRowLetters(1)).toEqual(["T", "O", "W", "", ""]);

    act(() => jest.advanceTimersByTime(1500));

    expect(screen.queryByText("Not enough letters")).toBeNull();
    jest.useRealTimers();
  });

  it("submits a full guess, colors it, and moves to the next row", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("chair{Enter}");

    expect(getRowLabels(1)).toEqual([
      "C, present",
      "H, absent",
      "A, correct",
      "I, absent",
      "R, present",
    ]);
    expect(screen.getByRole("group", { current: true })).toHaveAccessibleName(
      "Row 2",
    );

    expect(screen.queryByText(/Guess the 5-letter word/)).toBeNull();
  });

  it("shows a win message and stops input after guessing the answer", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("react{Enter}");

    expect(screen.getByText("Brilliant!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "T" })).toBeDisabled();

    await user.keyboard("chair");

    expect(getRowLetters(2)).toEqual(["", "", "", "", ""]);
  });

  it("shows the answer after 6 wrong guesses", async () => {
    const user = userEvent.setup();
    await renderGame();

    for (let i = 0; i < 6; i++) {
      await user.keyboard("chair{Enter}");
    }

    expect(screen.getByText("REACT")).toBeInTheDocument();
    expect(screen.queryByText("Brilliant!")).toBeNull();
    expect(screen.getByRole("button", { name: "T" })).toBeDisabled();
  });

  it("starts a new game when TRY AGAIN is clicked", async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("react{Enter}");

    await screen.findByText("Brilliant!");
    mockAnswer = "QUEEN";

    await user.click(screen.getByRole("button", { name: "TRY AGAIN" }));
    await waitForGameReady();

    expect(screen.getAllByRole("img", { name: "Empty" })).toHaveLength(30);
    expect(
      screen.getByText("Guess the 5-letter word in 6 tries"),
    ).toBeInTheDocument();

    await user.keyboard("queen{Enter}");
    expect(screen.getByText("Brilliant!")).toBeInTheDocument();
  });

  it("shows an error and keeps the guess when the server fails", async () => {
    jest.mocked(submitGuess).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard("chair{Enter}");

    expect(
      await screen.findByText("Something went wrong. Try again."),
    ).toBeInTheDocument();

    expect(getRowLetters(1)).toEqual(["C", "H", "A", "I", "R"]);
    expect(getRowLabels(1)).toEqual(["C", "H", "A", "I", "R"]);

    await user.keyboard("{Enter}");

    expect(getRowLabels(1)).toEqual([
      "C, present",
      "H, absent",
      "A, correct",
      "I, absent",
      "R, present",
    ]);
    expect(screen.queryByText("Something went wrong. Try again.")).toBeNull();
  });
});
