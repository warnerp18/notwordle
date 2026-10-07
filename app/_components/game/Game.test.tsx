import Game from './Game';
import { startGame, submitGuess } from '@/app/lib/server/game/actions';
import { login, logout, signup } from '@/app/lib/server/auth/actions';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockAnswer = 'REACT';
let mockGuesses: string[] = [];

jest.mock('@/app/lib/server/game/actions', () => {
  const { calculateWordColors } = jest.requireActual('@/app/lib/colors');

  const mockState = () => ({
    previousGuesses: mockGuesses,
    colors: mockGuesses.map((g: string) => calculateWordColors(mockAnswer, g)),
    answer:
      mockGuesses.includes(mockAnswer) || mockGuesses.length === 6
        ? mockAnswer
        : null,
  });

  return {
    startGame: jest.fn(async () => {
      mockGuesses = [];
      return 'test-game-id';
    }),
    submitGuess: jest.fn(async (guess: string) => {
      mockGuesses = [...mockGuesses, guess];
      return mockState();
    }),
  };
});

// the real file is server-only (database, cookies), so Jest gets a stand-in
jest.mock('@/app/lib/server/auth/actions', () => ({
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
}));

const getRowLetters = (rowNumber: number) =>
  within(screen.getByRole('group', { name: `Row ${rowNumber}` }))
    .getAllByRole('img')
    .map((tile) => tile.textContent);

const getRowLabels = (rowNumber: number) =>
  within(screen.getByRole('group', { name: `Row ${rowNumber}` }))
    .getAllByRole('img')
    .map((tile) => tile.getAttribute('aria-label'));

const waitForGameReady = () =>
  waitFor(() =>
    expect(screen.getByRole('button', { name: 'T' })).toBeEnabled(),
  );

// a first visit: the modal asks, and the player picks "Play as guest"
const renderGame = async (user = userEvent.setup()) => {
  render(<Game initialUserType="unknown" />);
  await user.click(screen.getByRole('button', { name: 'Play as guest' }));
  await waitForGameReady();
};

const getModal = () => screen.getByRole('dialog', { hidden: true });

const fillSignup = async (
  user: ReturnType<typeof userEvent.setup>,
  password = 'hunter22',
  confirm = password,
) => {
  // the modal opens on sign in; switch to the sign-up form
  await user.click(screen.getByRole('button', { name: 'Create an account' }));
  await user.type(screen.getByLabelText('Email'), 'a@b.com');
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
};

describe('<Game />', () => {
  beforeEach(() => {
    mockAnswer = 'REACT';
    mockGuesses = [];
    jest.mocked(startGame).mockClear();
    jest.mocked(signup).mockReset();
    jest.mocked(login).mockReset();
    jest.mocked(logout).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // if a fake-timer test fails early, don't leave fake timers for the rest
    jest.useRealTimers();
  });

  it('shows the title and instructions before the first guess', async () => {
    await renderGame();

    expect(
      screen.getByRole('heading', { name: 'Not Wordle' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Guess the 5-letter word in 6 tries'),
    ).toBeInTheDocument();
  });

  it('types letters from the physical keyboard in uppercase', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('tow');

    expect(getRowLetters(1)).toEqual(['T', 'O', 'W', '', '']);
  });

  it('types letters from the on-screen keyboard', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.click(screen.getByRole('button', { name: 'T' }));
    await user.click(screen.getByRole('button', { name: 'O' }));

    expect(getRowLetters(1)).toEqual(['T', 'O', '', '', '']);
  });

  it('removes the last letter on Backspace', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('tow{Backspace}');

    expect(getRowLetters(1)).toEqual(['T', 'O', '', '', '']);
  });

  it('ignores letters after the row is full', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('chairs');

    expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    expect(getRowLetters(2)).toEqual(['', '', '', '', '']);
  });

  it('ignores numbers and shortcuts like ctrl+r', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('1{Control>}r{/Control}');

    expect(getRowLetters(1)).toEqual(['', '', '', '', '']);
  });

  it('warns about a short guess and hides the warning after 1.5s', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderGame(user);

    await user.keyboard('tow{Enter}');

    expect(screen.getByText('Not enough letters')).toBeInTheDocument();

    expect(getRowLetters(1)).toEqual(['T', 'O', 'W', '', '']);

    act(() => jest.advanceTimersByTime(1500));

    expect(screen.queryByText('Not enough letters')).toBeNull();
    jest.useRealTimers();
  });

  it('submits a full guess, colors it, and moves to the next row', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('chair{Enter}');

    expect(getRowLabels(1)).toEqual([
      'C, present',
      'H, absent',
      'A, correct',
      'I, absent',
      'R, present',
    ]);
    expect(screen.getByRole('group', { current: true })).toHaveAccessibleName(
      'Row 2',
    );

    expect(screen.queryByText(/Guess the 5-letter word/)).toBeNull();
  });

  it('shows a win message and stops input after guessing the answer', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('react{Enter}');

    expect(screen.getByText('Brilliant!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();

    await user.keyboard('chair');

    expect(getRowLetters(2)).toEqual(['', '', '', '', '']);
  });

  it('shows the answer after 6 wrong guesses', async () => {
    const user = userEvent.setup();
    await renderGame();

    for (let i = 0; i < 6; i++) {
      await user.keyboard('chair{Enter}');
    }

    expect(screen.getByText('REACT')).toBeInTheDocument();
    expect(screen.queryByText('Brilliant!')).toBeNull();
    expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
  });

  it('starts a new game when TRY AGAIN is clicked', async () => {
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('react{Enter}');

    await screen.findByText('Brilliant!');
    mockAnswer = 'QUEEN';

    await user.click(screen.getByRole('button', { name: 'TRY AGAIN' }));
    await waitForGameReady();

    expect(screen.getAllByRole('img', { name: 'Empty' })).toHaveLength(30);
    expect(
      screen.getByText('Guess the 5-letter word in 6 tries'),
    ).toBeInTheDocument();

    await user.keyboard('queen{Enter}');
    expect(screen.getByText('Brilliant!')).toBeInTheDocument();
  });

  it('shows an error and keeps the guess when the server fails', async () => {
    jest.mocked(submitGuess).mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('chair{Enter}');

    expect(
      await screen.findByText('Something went wrong. Try again.'),
    ).toBeInTheDocument();

    expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    expect(getRowLabels(1)).toEqual(['C', 'H', 'A', 'I', 'R']);

    await user.keyboard('{Enter}');

    expect(getRowLabels(1)).toEqual([
      'C, present',
      'H, absent',
      'A, correct',
      'I, absent',
      'R, present',
    ]);
    expect(screen.queryByText('Something went wrong. Try again.')).toBeNull();
  });

  it("warns about a word that isn't in the list and keeps the row", async () => {
    jest
      .mocked(submitGuess)
      .mockResolvedValueOnce({ error: 'Not in word list' });
    const user = userEvent.setup();
    await renderGame();

    await user.keyboard('testi{Enter}');

    expect(await screen.findByText('Not in word list')).toBeInTheDocument();
    expect(getRowLetters(1)).toEqual(['T', 'E', 'S', 'T', 'I']);
    expect(screen.getByRole('group', { current: true })).toHaveAccessibleName(
      'Row 1',
    );
  });

  describe('sign up modal', () => {
    it('asks on a first visit and keeps the game locked', async () => {
      render(<Game initialUserType="unknown" />);

      expect(getModal()).toHaveAttribute('open');
      expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
      expect(startGame).not.toHaveBeenCalled();
    });

    it('closes and starts a game when they play as a guest', async () => {
      await renderGame();

      expect(getModal()).not.toHaveAttribute('open');
      expect(startGame).toHaveBeenCalledTimes(1);
    });

    // page.tsx found their guest cookie and sent their game with the page
    it("doesn't ask a returning guest, and shows the game the server sent", async () => {
      render(
        <Game
          initialUserType="guest"
          playerGame={{
            id: 'guest-1',
            previousGuesses: ['CHAIR'],
            colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
            answer: null,
          }}
        />,
      );

      await waitForGameReady();
      expect(getModal()).not.toHaveAttribute('open');
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
      expect(startGame).not.toHaveBeenCalled();
    });

    it('shows a signed-in player the game the server sent, with no modal', async () => {
      render(
        <Game
          initialUserType="player"
          playerGame={{
            id: 'player-1',
            previousGuesses: ['CHAIR'],
            colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
            answer: null,
          }}
        />,
      );

      await waitForGameReady();
      expect(getModal()).not.toHaveAttribute('open');
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    });

    it('keeps what they typed when the passwords differ', async () => {
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignup(user, 'hunter22', 'hunter23');
      await screen.findByText('Passwords must match');

      expect(screen.getByLabelText('Email')).toHaveValue('a@b.com');
      expect(screen.getByLabelText('Password')).toHaveValue('hunter22');
      expect(screen.getByLabelText('Confirm password')).toHaveValue('hunter23');
    });

    it("shows a message and doesn't sign up when the passwords differ", async () => {
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignup(user, 'hunter22', 'hunter23');

      expect(
        await screen.findByText('Passwords must match'),
      ).toBeInTheDocument();
      expect(signup).not.toHaveBeenCalled();
      expect(getModal()).toHaveAttribute('open');
    });

    it("shows the server's message and stays open when sign up fails", async () => {
      jest.mocked(signup).mockResolvedValue({
        error: 'An account with that email already exists. Try signing in.',
      });
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignup(user);

      expect(
        await screen.findByText(
          'An account with that email already exists. Try signing in.',
        ),
      ).toBeInTheDocument();
      expect(getModal()).toHaveAttribute('open');
      expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
    });

    it('closes, shows the returned game, and unlocks after signing up', async () => {
      jest.mocked(signup).mockResolvedValue({
        email: 'a@b.com',
        game: {
          id: 'claimed-1',
          previousGuesses: ['CHAIR'],
          colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
          answer: null,
        },
      });
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignup(user);

      await waitForGameReady();
      expect(signup).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'hunter22',
      });
      expect(getModal()).not.toHaveAttribute('open');
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    });
  });
  describe('sign in', () => {
    const fillSignin = async (
      user: ReturnType<typeof userEvent.setup>,
      password = 'hunter22',
    ) => {
      await user.type(screen.getByLabelText('Email'), 'a@b.com');
      await user.type(screen.getByLabelText('Password'), password);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
    };

    it('is the form the modal opens on', () => {
      render(<Game initialUserType="unknown" />);

      expect(
        screen.getByRole('heading', { name: 'Sign in', hidden: true }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText('Confirm password')).toBeNull();
    });

    it('shows and hides the password with the eye button', async () => {
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);
      const password = screen.getByLabelText('Password');

      expect(password).toHaveAttribute('type', 'password');

      await user.click(screen.getByRole('button', { name: 'Show password' }));
      expect(password).toHaveAttribute('type', 'text');

      await user.click(screen.getByRole('button', { name: 'Hide password' }));
      expect(password).toHaveAttribute('type', 'password');
    });

    it('lets each sign-up password field be shown on its own', async () => {
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);
      await user.click(
        screen.getByRole('button', { name: 'Create an account' }),
      );

      const [first] = screen.getAllByRole('button', { name: 'Show password' });
      await user.click(first);

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
        'type',
        'password',
      );
    });

    it('switches to sign up and back', async () => {
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await user.click(
        screen.getByRole('button', { name: 'Create an account' }),
      );
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(screen.queryByLabelText('Confirm password')).toBeNull();
    });

    it('shows the message, keeps what they typed, and stays open on a wrong password', async () => {
      jest
        .mocked(login)
        .mockResolvedValue({ error: 'Incorrect email or password' });
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignin(user, 'wrong-one');

      expect(
        await screen.findByText('Incorrect email or password'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveValue('a@b.com');
      expect(getModal()).toHaveAttribute('open');
      expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
    });

    it('closes, shows their game, and unlocks after signing in', async () => {
      jest.mocked(login).mockResolvedValue({
        email: 'a@b.com',
        game: {
          id: 'player-1',
          previousGuesses: ['CHAIR'],
          colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
          answer: null,
        },
      });
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignin(user);

      await waitForGameReady();
      expect(login).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'hunter22',
      });
      expect(getModal()).not.toHaveAttribute('open');
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    });

    it('clears what they typed after signing in', async () => {
      jest.mocked(login).mockResolvedValue({
        email: 'a@b.com',
        game: { id: 'player-1', previousGuesses: [], colors: [], answer: null },
      });
      const user = userEvent.setup();
      render(<Game initialUserType="unknown" />);

      await fillSignin(user);
      await waitForGameReady();

      // still in the page, just inside the closed modal
      expect(screen.getByLabelText('Email')).toHaveValue('');
      expect(screen.getByLabelText('Password')).toHaveValue('');
    });

    it('lets a guest open it later, and locks the board while it is open', async () => {
      const user = userEvent.setup();
      await renderGame(user);

      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(getModal()).toHaveAttribute('open');
      expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
    });

    it('keeps the current game when a guest closes it with "Play as guest"', async () => {
      const user = userEvent.setup();
      await renderGame(user);
      await user.keyboard('chair{Enter}');
      await waitFor(() => expect(getRowLabels(1)[0]).toBe('C, present'));

      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await user.click(screen.getByRole('button', { name: 'Play as guest' }));

      expect(getModal()).not.toHaveAttribute('open');
      expect(startGame).toHaveBeenCalledTimes(1);
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
    });

    it("doesn't show the guest button to a signed-in player", async () => {
      render(
        <Game
          initialUserType="player"
          playerGame={{
            id: 'player-1',
            previousGuesses: [],
            colors: [],
            answer: null,
          }}
        />,
      );
      await waitForGameReady();

      expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    });
  });

  describe('sign out', () => {
    const renderPlayer = () =>
      render(
        <Game
          initialUserType="player"
          playerGame={{
            id: 'player-1',
            previousGuesses: ['CHAIR'],
            colors: [['yellow', 'gray', 'green', 'gray', 'yellow']],
            answer: null,
          }}
        />,
      );

    it('is only shown to a signed-in player', async () => {
      const user = userEvent.setup();
      await renderGame(user);

      expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    });

    it('clears the board and typed letters, and asks again like a first visit', async () => {
      jest.mocked(logout).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderPlayer();
      await waitForGameReady();
      await user.keyboard('to');

      await user.click(screen.getByRole('button', { name: 'Sign out' }));

      await waitFor(() => expect(getModal()).toHaveAttribute('open'));
      expect(logout).toHaveBeenCalledTimes(1);
      expect(getRowLetters(1)).toEqual(['', '', '', '', '']);
      expect(screen.getByRole('button', { name: 'T' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    });

    it('keeps them signed in, with a message, when signing out fails', async () => {
      jest.mocked(logout).mockRejectedValue(new Error('offline'));
      const user = userEvent.setup();
      renderPlayer();
      await waitForGameReady();

      await user.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(
        await screen.findByText('Something went wrong. Try again.'),
      ).toBeInTheDocument();
      expect(getModal()).not.toHaveAttribute('open');
      expect(getRowLetters(1)).toEqual(['C', 'H', 'A', 'I', 'R']);
      expect(
        screen.getByRole('button', { name: 'Sign out' }),
      ).toBeInTheDocument();
    });
  });
});
