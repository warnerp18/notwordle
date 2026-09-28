import Game from "./Game";
import { WORDS } from "@/app/lib/constants";

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// fake server: startGame resolves with an id instead of hitting the database
jest.mock("@/app/lib/actions", () => ({
  startGame: async () => "test-game-id",
}));

// makes pickRandomWord choose this word, so every test knows the answer
const useAnswer = (word: string) => {
  const index = WORDS.indexOf(word);
  jest.spyOn(Math, "random").mockReturnValue((index + 0.5) / WORDS.length);
};

const getRowLetters = (rowNumber: number) =>
  within(screen.getByRole("group", { name: `Row ${rowNumber}` }))
    .getAllByRole("img")
    .map((tile) => tile.textContent);

const getRowLabels = (rowNumber: number) =>
  within(screen.getByRole("group", { name: `Row ${rowNumber}` }))
    .getAllByRole("img")
    .map((tile) => tile.getAttribute("aria-label"));

// the keyboard is disabled until startGame has returned an id
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
    useAnswer("REACT");
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
    // the short guess stays on the current row
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
    // instructions only show before the first guess
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

    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: "Empty" })[0],
      ).not.toBeDisabled(),
    );
    useAnswer("QUEEN");

    await user.click(screen.getByRole("button", { name: "TRY AGAIN" }));
    await waitForGameReady();

    expect(screen.getAllByRole("img", { name: "Empty" })).toHaveLength(30);
    expect(
      screen.getByText("Guess the 5-letter word in 6 tries"),
    ).toBeInTheDocument();

    // the new answer is used: QUEEN now wins
    await user.keyboard("queen{Enter}");
    expect(screen.getByText("Brilliant!")).toBeInTheDocument();
  });
});
