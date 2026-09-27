# Not Wordle

A Wordle-style word game built with Next.js. Guess the hidden five-letter word in six tries — a new random word every game.

**Play it:** [notwordle.app](https://notwordle.app)

![Not Wordle](public/screenshot.png)

## Features

- Type with your physical keyboard or the on-screen keyboard
- Tile colors handle repeated letters the same way Wordle does
- "Not enough letters" warning with a row shake when you submit early
- Win and lose messages, with a button to start a new game
- Current row is highlighted, and tiles pop as you type
- Animations turn off for people with "Reduce motion" enabled
- Link-preview image and app icons when the link is shared

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router)
- React 19.2 with the [React Compiler](https://react.dev/learn/react-compiler)
- TypeScript (strict mode)
- Tailwind CSS v4 for page layout, CSS Modules for component styles
- Deployed on [Vercel](https://vercel.com)

## How it works

### Coloring tiles in two passes

The tricky part of Wordle is repeated letters. Each letter in the answer can only be "used" once, and green matches get first pick.

For example, with the answer `REACT` and the guess `EERIE`:

| E    | E     | R      | I    | E    |
| ---- | ----- | ------ | ---- | ---- |
| gray | green | yellow | gray | gray |

The second E is green, so it claims REACT's only E. The first E is gray, even though it comes earlier.

[`calculateWordColors`](app/lib/colors.ts) handles this by counting each letter in the answer, then making two passes over the guess:

1. **Greens first:** mark every letter in the right spot, and use up one of that letter's count.
2. **Then the rest:** a letter is yellow only if its count still has some left; otherwise it's gray.

Each pass is a single loop, so it stays linear rather than comparing every letter against every other letter.

### Derived state

The game stores only three things: the answer, the submitted guesses, and the guess being typed. Everything else — whether you've won, whether the game is over, and each tile's color — is calculated from those on every render. There's no separate `winner` or `colors` state that could fall out of sync.

### One handler for both keyboards

The physical keyboard and the on-screen keyboard both call the same `handleKey(key)` function, so they can't behave differently. The physical keyboard listener uses React's [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent), so it's added once when the game loads but always sees the latest state.

## Project structure

```
app/
  _components/
    game/            Game state and key handling
    board/           The 6×5 grid of tiles
    keyboard/        On-screen keyboard
    status-message/  Title, warnings and win/lose message
  lib/
    colors.ts        Tile color logic
    constants.ts     Board size and word list
  layout.tsx         Page metadata
  icon.svg, apple-icon.tsx, opengraph-image.tsx   Icons and share image
```

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Roadmap

- Check guesses on the server, so the answer never reaches the browser
- Save game results to a database
- Accounts, with stats like win rate and streaks
- Color the on-screen keyboard keys as letters are revealed
- Flip animation when a guess is submitted

## Disclaimer

Not affiliated with The New York Times. Wordle is a trademark of The New York Times Company.
