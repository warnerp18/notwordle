import useGame from './useGame';
import { getGame, startGame, submitGuess } from '@/app/lib/server/game/actions';

import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/app/lib/server/game/actions', () => ({
  getGame: jest.fn(),
  startGame: jest.fn(),
  submitGuess: jest.fn(),
}));

const mockGetGame = jest.mocked(getGame);
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
    // jsdom keeps localStorage between tests, so start each one empty
    localStorage.clear();
    mockStartGame.mockResolvedValue('game-1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("doesn't start a game on a first visit until the player chooses", async () => {
    const { result } = renderHook(() => useGame());

    // let the first-load effect finish
    await act(async () => {});

    expect(result.current.isReady).toBe(false);
    expect(result.current.previousGuesses).toEqual([]);
    expect(result.current.colors).toEqual([]);
    expect(result.current.answer).toBeNull();
    expect(mockStartGame).not.toHaveBeenCalled();
    expect(mockGetGame).not.toHaveBeenCalled();
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

  it('shows an error when resuming a saved game fails', async () => {
    localStorage.setItem('gameId', 'saved-1');
    mockGetGame.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useGame());

    await waitFor(() =>
      expect(result.current.error).toBe('Something went wrong. Try again.'),
    );
    expect(result.current.isReady).toBe(false);
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

  it("saves the new game's id so it can be resumed", async () => {
    await renderReadyGame();

    expect(localStorage.getItem('gameId')).toBe('game-1');
    expect(mockGetGame).not.toHaveBeenCalled();
  });

  it('resumes a saved game instead of starting a new one', async () => {
    localStorage.setItem('gameId', 'saved-1');
    mockGetGame.mockResolvedValue(chairResult);
    mockSubmitGuess.mockResolvedValue(chairResult);

    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(mockGetGame).toHaveBeenCalledWith('saved-1');
    expect(mockStartGame).not.toHaveBeenCalled();
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    expect(result.current.colors).toEqual(chairResult.colors);

    await act(async () => {
      await result.current.makeGuess('TOWER');
    });
    expect(mockSubmitGuess).toHaveBeenCalledWith('TOWER', 'saved-1');
  });

  it('starts a new game when the saved one is gone or expired', async () => {
    localStorage.setItem('gameId', 'old-1');
    mockGetGame.mockResolvedValue(null);

    // they chose to play before, so they get a fresh game without being asked
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(mockStartGame).toHaveBeenCalledTimes(1);
    expect(result.current.previousGuesses).toEqual([]);
    expect(localStorage.getItem('gameId')).toBe('game-1');
  });

  it('saves the new id when starting over', async () => {
    const { result } = await renderReadyGame();

    mockStartGame.mockResolvedValue('game-2');
    await act(async () => {
      await result.current.newGame();
    });

    expect(localStorage.getItem('gameId')).toBe('game-2');
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

  it("forgets the guest's saved id on loadGame", async () => {
    await renderReadyGame();
    expect(localStorage.getItem('gameId')).toBe('game-1');

    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.loadGame(signedInGame);
    });

    // a signed-in player's game comes from the server, not localStorage
    expect(localStorage.getItem('gameId')).toBeNull();
  });

  it('still plays when localStorage is blocked', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = await renderReadyGame();

    expect(result.current.error).toBeNull();

    mockStartGame.mockResolvedValue('game-2');
    await act(async () => {
      await result.current.newGame();
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("starts ready with a signed-in player's game, without asking the server", async () => {
    localStorage.setItem('gameId', 'old-guest-1');
    mockSubmitGuess.mockResolvedValue(chairResult);
    const { result } = renderHook(() => useGame(signedInGame));

    await act(async () => {});

    expect(result.current.isReady).toBe(true);
    expect(result.current.previousGuesses).toEqual(['CHAIR']);
    // the server already sent it, so no resume or new game
    expect(mockGetGame).not.toHaveBeenCalled();
    expect(mockStartGame).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.makeGuess('TOWER');
    });
    expect(mockSubmitGuess).toHaveBeenCalledWith('TOWER', 'claimed-1');
  });
});
