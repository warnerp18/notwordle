import useGame from "./useGame";
import { startGame, submitGuess } from "@/app/lib/actions";

import { act, renderHook, waitFor } from "@testing-library/react";

jest.mock("@/app/lib/actions", () => ({
  startGame: jest.fn(),
  submitGuess: jest.fn(),
}));

const mockStartGame = jest.mocked(startGame);
const mockSubmitGuess = jest.mocked(submitGuess);

const chairResult = {
  previousGuesses: ["CHAIR"],
  colors: [["yellow", "gray", "green", "gray", "yellow"]],
  answer: null,
};

const renderReadyGame = async () => {
  const hook = renderHook(() => useGame());
  await waitFor(() => expect(hook.result.current.isReady).toBe(true));
  return hook;
};

describe("useGame", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockStartGame.mockResolvedValue("game-1");
  });

  it("starts a game on mount and is ready once the id arrives", async () => {
    const { result } = renderHook(() => useGame());

    expect(result.current.isReady).toBe(false);
    expect(result.current.previousGuesses).toEqual([]);
    expect(result.current.colors).toEqual([]);
    expect(result.current.answer).toBeNull();

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(mockStartGame).toHaveBeenCalledTimes(1);
  });

  it("shows an error and stays not ready when starting a game fails", async () => {
    mockStartGame.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useGame());

    await waitFor(() =>
      expect(result.current.error).toBe("Something went wrong. Try again."),
    );
    expect(result.current.isReady).toBe(false);
  });

  it("sends the guess with the game id and stores what the server returns", async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = await renderReadyGame();

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.makeGuess("CHAIR");
    });

    expect(mockSubmitGuess).toHaveBeenCalledWith("CHAIR", "game-1");
    expect(saved).toBe(true);
    expect(result.current.previousGuesses).toEqual(["CHAIR"]);
    expect(result.current.colors).toEqual(chairResult.colors);
    expect(result.current.answer).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("stores the answer once the server says the game is over", async () => {
    mockSubmitGuess.mockResolvedValue({
      previousGuesses: ["REACT"],
      colors: [["green", "green", "green", "green", "green"]],
      answer: "REACT",
    });
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess("REACT");
    });

    expect(result.current.answer).toBe("REACT");
  });

  it("is fetching while a guess is waiting for the server", async () => {
    let respond: (value: typeof chairResult) => void = () => {};
    mockSubmitGuess.mockReturnValue(
      new Promise((resolve) => {
        respond = resolve;
      }),
    );
    const { result } = await renderReadyGame();

    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.makeGuess("CHAIR");
    });

    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      respond(chairResult);
      await pending;
    });

    expect(result.current.isFetching).toBe(false);
  });

  it("returns false, keeps the game, and sets an error when a guess fails", async () => {
    mockSubmitGuess
      .mockResolvedValueOnce(chairResult)
      .mockRejectedValueOnce(new Error("offline"));
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess("CHAIR");
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.makeGuess("TOWER");
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe("Something went wrong. Try again.");
    expect(result.current.previousGuesses).toEqual(["CHAIR"]);
    expect(result.current.isFetching).toBe(false);
  });

  it("clears the error when the next guess succeeds", async () => {
    mockSubmitGuess
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(chairResult);
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess("CHAIR");
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.makeGuess("CHAIR");
    });
    expect(result.current.error).toBeNull();
  });

  it("starts over with a new id and an empty game on newGame", async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess("CHAIR");
    });

    mockStartGame.mockResolvedValue("game-2");
    await act(async () => {
      await result.current.newGame();
    });

    expect(result.current.previousGuesses).toEqual([]);
    expect(result.current.colors).toEqual([]);
    expect(result.current.answer).toBeNull();
    expect(result.current.isReady).toBe(true);

    await act(async () => {
      await result.current.makeGuess("TOWER");
    });
    expect(mockSubmitGuess).toHaveBeenLastCalledWith("TOWER", "game-2");
  });

  it("shows an error when newGame fails", async () => {
    const { result } = await renderReadyGame();

    mockStartGame.mockRejectedValue(new Error("offline"));
    await act(async () => {
      await result.current.newGame();
    });

    expect(result.current.error).toBe("Something went wrong. Try again.");
    expect(result.current.isReady).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});
