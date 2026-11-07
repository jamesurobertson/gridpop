# GridPop

GridPop is a daily number puzzle that runs inside a subreddit. Every day the app posts a new puzzle in three levels, Easy, Normal and Hard. Players open the post, build the target board in as few pieces as they can, and compare their result with everyone else who played that day.

It's made for puzzle fans who like a short daily challenge, and for the community that gathers around it in the comments.

## How to play

- The board is 4×4. Each day's pieces come in a fixed order, the same for everyone.
- Every tile under a placed piece goes up by one.
- A row or column filled with the same number pops and goes back to empty.
- A tile that reaches 7 ends the run.
- The goal is to make the board match the target in as few pieces as possible.

Controls:

- **Touch:** drag to move, double-tap to rotate, tap to place.
- **Keyboard:** arrow keys to move, A or D to rotate, Space to place, Z to undo, H for a hint.

First-time players get a short tutorial on a practice board before their first puzzle.

## Scoring

- **Score:** the number of pieces placed. Fewer is better.
- **Ties:** the faster time wins. Hints and restarts are shown but don't change the ranking.
- **Undo:** free, all the way back to the start. Starting over after a failed run counts as a restart.
- **Hints:** a hint shows where the next piece should go. If the run can no longer reach the best finish, the hint only says how many pieces to undo; once they're undone, another hint shows where to go. Hints are counted, and there's a short wait between them.
- **Recorded result:** only a player's first solve of each level counts toward the leaderboard and streaks. After that, "Play again" starts a practice run that isn't recorded.

Difficulty follows the fewest pieces each puzzle can be solved in: Easy 3, Normal 4 to 5, Hard 6 to 7. About one Hard puzzle in three is shorter (5 pieces) but can only be solved by popping one line on the way.

## What players see

- **The post:** the day's three target boards, with each player's score and streak.
- **The game:** opens full screen with the board, the target, the next four pieces, moves and time. Hints and undo sit on the board's corners.
- **Results:** moves, restarts, hints and time, the player's streak, the leaderboard, and a button to post their score as a comment, with an optional message.

## For moderators

- **Install:** the app posts today's puzzle as soon as it's installed.
- **Daily posts:** a new post goes up at midnight Eastern every day. It's pinned, and the previous day's post is unpinned.
- **Manual post:** if a day's post is missing, moderators can use **Post today's GridPop** from the subreddit menu. It creates the post (or finds the existing one) and opens it.
- **Upgrades:** recent daily posts get the GridPop share image, which shows when a post link is shared outside Reddit.

There's nothing to configure. Each day's puzzle is the same for every subreddit that runs the app.

## Permissions and data

- **Redis:** stores each player's results, streaks, attempt and hint counts, the daily leaderboards and score counts, and the ID of each day's post. Results are keyed by Reddit user ID; usernames are stored only for the leaderboard.
- **Reddit API:** creates, pins and unpins the daily posts, and reads the current player's username.
- **Comments as the player (`SUBMIT_COMMENT`):** after solving, a player can press **Post score** to post their score (and an optional message) on the day's puzzle from their own account. Nothing is ever posted without that button press, and commenting is never needed to play.
- **Media:** uploads the share image once, to Reddit's image host, so it can be used as the post's link preview.
- **No outside requests:** the app makes none. Puzzles ship with the app, and the server checks every result by replaying the moves before it counts.

## Development

From this folder:

```bash
npm install
npx devvit login      # once
npm run dev           # playtest on the dev subreddit
npm run deploy        # build and upload a new version
```

The game code lives in `../src`, shared with the web version. Puzzles are built ahead of time by `../scripts/generate-daily.mjs` into `../src/data/dailyPuzzles.json`, and their solutions into `../src/data/dailySolutions.json`, which only the server reads.
