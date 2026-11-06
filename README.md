# GridPop

![GridPop](public/og-image.png)

Stack pieces, match the numbers, and pop the lines before a tile hits 7.
**Play it at https://jamesurobertson.github.io/gridpop/**

![GridPop on desktop](docs/screenshot.png)


## Daily puzzle

The game opens on the daily puzzle: everyone gets the same pieces in the same order and tries to
build the target board in as few placements as possible, with fewer restarts and then time breaking ties. The
fewest possible is shown as the goal. A new puzzle
starts at midnight UTC. Unlimited and Timed are the endless modes.

Puzzles live in `src/data/dailyPuzzles.json`, made ahead of time by

```bash
node scripts/generate-daily.mjs 2027-05-04 60   # first date, number of days
```

which builds each day's target from its seeded pieces and searches every line of play for the fewest placements that reach it (the goal). Days
already in the file are kept, so it only adds new ones. Each day has three puzzles: Easy, Normal and
Hard are built from 3, 4 and 5 pieces (`LEVELS` in the script), each with its own streak.
Like Wordle, each puzzle is played once: after solving it you see your result until the next day.

## Reddit (r/gridpop)

`reddit/` is a [Devvit](https://developers.reddit.com/) app that runs the daily puzzle inside Reddit
posts, reusing the board, rules and puzzles from `src/`. Every day at midnight Eastern it posts and pins
that day's puzzle; mods can also use "Post today's GridPop" from the subreddit menu. The server
replays each submitted run against the day's pieces before it counts, then keeps results, streaks
and a leaderboard (score, then time) in Redis per Reddit user.

```bash
npm install                 # in the repo root first: the app uses its React and UI libraries
cd reddit && npm install
npx devvit login            # once
npm run deploy              # build and upload a new version
npx devvit install gridpop  # install or update it on r/gridpop
npm run dev                 # playtest: live-reloads on r/gridpop while you edit
```

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Run the development server with `npm run dev`

## Development

The project is built with:

- React
- TypeScript
- Tailwind CSS
- Vite

## Building for Production

To build the project for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploying

Every push to `master` builds the game and publishes it to GitHub Pages at
https://jamesurobertson.github.io/gridpop/ (`.github/workflows/deploy.yml`). The site is served from
`/gridpop/`, which `vite.config.ts` sets as the base path.

## Credits

Sound effects: [Interface Sounds](https://kenney.nl/assets/interface-sounds) and
[Music Jingles](https://kenney.nl/assets/music-jingles) by Kenney (CC0). Fonts: Fredoka and Nunito (Google Fonts, OFL).
