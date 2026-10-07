import useGame from './useGame';
import { startGame, submitGuess } from '@/app/lib/server/game/actions';

import { act, renderHook } from '@testing-library/react';

jest.mock('@/app/lib/server/game/actions', () => ({
  startGame: jest.fn(),
  submitGuess: jest.fn(),
}));

const mockStartGame = jest.mocked(startGame);
const mockSubmitGuess = jest.mocked(submitGuess);

// the game-state half of what submitGuess resolves with (the other half is { error })
type GameState = Exclude<
  Awaited<ReturnType<typeof submitGuess>>,
  { error: string }
>;

const chairResult: GameState = {
  previousGuesses: ['CHAIR'],
  colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
  answer: null,
};

// a first visit doesn't start a game on its own; the player has to choose
// (newGame is what "Play as guest" calls)
const renderReadyGame = async () => {
  const hook = renderHook(() => useGame());
  await act(async () => {
    await hook.result.current.newGame();
  });
  expect(hook.result.current.isReady).toBe(true);
  return hook;
};

const signedInGame = {
  id: 'claimed-1',
  previousGuesses: ['CHAIR'],
  colors: chairResult.colors,
  answer: null,
};

describe('useGame', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockStartGame.mockResolvedValue('game-1');
  });

  it("doesn't start a game on a first visit until the player chooses", async () => {
    const { result } = renderHook(() => useGame());

    expect(result.current.isReady).toBe(false);
    expect(result.current.previousGuesses).toEqual([]);
    expect(result.current.colors).toEqual([]);
    expect(result.current.answer).toBeNull();
    expect(mockStartGame).not.toHaveBeenCalled();
  });

  it('starts a game and is ready once newGame gets an id', async () => {
    const { result } = renderHook(() => useGame());

    await act(async () => {
      await result.current.newGame();
    });

    expect(mockStartGame).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(true);
    expect(result.current.previousGuesses).toEqual([]);
  });

  it('sends the guess with the game id and stores what the server returns', async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = await renderReadyGame();

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.makeGuess('CHAIR');
    });

    expect(mockSubmitGuess).toHaveBeenCalledWith('CHAIR', 'game-1');
    expect(saved).toBe(true);
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(result.current.colors).toEqual(chairResult.colors);
    expect(result.current.answer).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stores the answer once the server says the game is over', async () => {
    mockSubmitGuess.mockResolvedValue({
      previousGuesses: ['REACT'],
      colors: [['green', 'green', 'green', 'green', 'green']],
      answer: 'REACT',
    });
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess('REACT');
    });

    expect(result.current.answer).toBe('REACT');
  });

  it('is fetching while a guess is waiting for the server', async () => {
    let respond: (value: typeof chairResult) => void = () => {};
    mockSubmitGuess.mockReturnValue(
      new Promise((resolve) => {
        respond = resolve;
      }),
    );
    const { result } = await renderReadyGame();

    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.makeGuess('CHAIR');
    });

    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      respond(chairResult);
      await pending;
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('returns false, keeps the game, and sets an error when a guess fails', async () => {
    mockSubmitGuess
      .mockResolvedValueOnce(chairResult)
      .mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess('CHAIR');
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.makeGuess('TOWER');
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('Something went wrong. Try again.');
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(result.current.isFetching).toBe(false);
  });

  it("returns false, keeps the game, and shows the server's message for a rejected word", async () => {
    mockSubmitGuess
      .mockResolvedValueOnce(chairResult)
      .mockResolvedValueOnce({ error: 'Not in word list' });
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess('CHAIR');
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.makeGuess('TESTI');
    });

    expect(saved).toBe(false);
    expect(result.current.error).toBe('Not in word list');
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(result.current.isFetching).toBe(false);
  });

  it('clears the error when the next guess succeeds', async () => {
    mockSubmitGuess
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(chairResult);
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess('CHAIR');
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.makeGuess('CHAIR');
    });
    expect(result.current.error).toBeNull();
  });

  it('starts over with a new id and an empty game on newGame', async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = await renderReadyGame();

    await act(async () => {
      await result.current.makeGuess('CHAIR');
    });

    mockStartGame.mockResolvedValue('game-2');
    await act(async () => {
      await result.current.newGame();
    });

    expect(result.current.previousGuesses).toEqual([]);
    expect(result.current.colors).toEqual([]);
    expect(result.current.answer).toBeNull();
    expect(result.current.isReady).toBe(true);

    await act(async () => {
      await result.current.makeGuess('TOWER');
    });
    expect(mockSubmitGuess).toHaveBeenLastCalledWith('TOWER', 'game-2');
  });

  it('shows an error when newGame fails', async () => {
    const { result } = await renderReadyGame();

    mockStartGame.mockRejectedValue(new Error('offline'));
    await act(async () => {
      await result.current.newGame();
    });

    expect(result.current.error).toBe('Something went wrong. Try again.');
    expect(result.current.isReady).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });

  it('shows the game it is given on loadGame and guesses on that id', async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.loadGame(signedInGame);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(result.current.colors).toEqual(chairResult.colors);

    await act(async () => {
      await result.current.makeGuess('TOWER');
    });
    expect(mockSubmitGuess).toHaveBeenCalledWith('TOWER', 'claimed-1');
  });

  // page.tsx sends a player's or a returning guest's game with the page
  it('starts ready with the game it is given, without asking the server', async () => {
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = renderHook(() => useGame(signedInGame));

    expect(result.current.isReady).toBe(true);
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(mockStartGame).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.makeGuess('TOWER');
    });
    expect(mockSubmitGuess).toHaveBeenCalledWith('TOWER', 'claimed-1');
  });
});
