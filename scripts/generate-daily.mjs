#!/usr/bin/env node
// Builds the daily puzzles: a seeded piece order per UTC day, a target reached by playing it, and
// par (the fewest placements that reach the target) found by an exhaustive search.
//
//   node scripts/generate-daily.mjs 2026-11-05 14   # start date, number of days
//
// Writes src/data/dailyPuzzles.json, keeping any days already in it.
import fs from "node:fs";

const SIZE = 4;
const CELLS = SIZE * SIZE;
const QUEUE_LENGTH = 30;
const OUT = process.env.DAILY_OUT ? new URL(`file://${process.env.DAILY_OUT}`) : new URL("../src/data/dailyPuzzles.json", import.meta.url);

// Same pieces as src/utils/tetrominoShapes.ts on a 4×4 board (the I is left out there too).
// Only the footprints matter, so each orientation is written trimmed.
const SHAPES = {
  O: [[[1, 1], [1, 1]]],
  T: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
  S: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]],
  Z: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
  L: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]],
  J: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
  I3: [[[1, 1, 1]], [[1], [1], [1]]],
  LJ2: [[[1, 1], [1, 0]], [[1, 1], [0, 1]], [[0, 1], [1, 1]], [[1, 0], [1, 1]]],
};
const TYPES = Object.keys(SHAPES);
const PIECE_SIZE = Object.fromEntries(TYPES.map((type) => [type, SHAPES[type][0].flat().filter(Boolean).length]));

/** Every distinct set of cells each piece can cover. */
const FOOTPRINTS = Object.fromEntries(
  TYPES.map((type) => {
    const byKey = new Map();
    for (const orientation of SHAPES[type])
      for (let oy = 0; oy + orientation.length <= SIZE; oy++)
        for (let ox = 0; ox + orientation[0].length <= SIZE; ox++) {
          const cells = [];
          orientation.forEach((row, y) => row.forEach((on, x) => on && cells.push((oy + y) * SIZE + ox + x)));
          byKey.set(cells.join(","), cells);
        }
    return [type, [...byKey.values()]];
  })
);

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The game's placement rule: +1 under the piece, then matching rows/columns pop. Null if a 7 is left. */
function place(grid, cells, { allowPops = true } = {}) {
  const next = grid.slice();
  for (const cell of cells) next[cell]++;
  const popped = [];
  for (let line = 0; line < SIZE; line++) {
    const row = Array.from({ length: SIZE }, (_, x) => line * SIZE + x);
    const col = Array.from({ length: SIZE }, (_, y) => y * SIZE + line);
    for (const cellsInLine of [row, col]) {
      const value = next[cellsInLine[0]];
      if (value > 0 && cellsInLine.every((cell) => next[cell] === value)) popped.push(...cellsInLine);
    }
  }
  if (popped.length && !allowPops) return null;
  for (const cell of popped) next[cell] = 0;
  return next.some((value) => value >= 7) ? null : next;
}

const sum = (grid) => grid.reduce((a, b) => a + b, 0);

/** Fewest moves left that could possibly turn `grid` into `target` (an underestimate, never over). */
function movesNeeded(grid, target, allowPops) {
  let needed = Math.ceil((sum(target) - sum(grid)) / 4);
  for (let cell = 0; cell < CELLS; cell++) {
    const have = grid[cell];
    const want = target[cell];
    // A cell only climbs one per move; one that is too high has to pop first, then climb again.
    if (have < want) needed = Math.max(needed, want - have);
    else if (have > want) {
      if (!allowPops) return Infinity;
      needed = Math.max(needed, want + 1);
    }
  }
  return needed;
}

/** Breadth-first over (board, place in queue, held piece); returns the fewest placements, or null. */
function solvePar(queue, target, maxMoves, options = { allowPops: true }) {
  const encode = (grid) => grid.reduce((code, value) => code * 7 + value, 0);
  const targetCode = encode(target);
  const typeIndex = Object.fromEntries(TYPES.map((type, i) => [type, i + 1]));
  let layer = [{ grid: Array(CELLS).fill(0), next: 0, held: null }];
  for (let moves = 1; moves <= maxMoves; moves++) {
    const seen = new Set();
    const nextLayer = [];
    for (const state of layer) {
      // Play the current piece, or the one Hold gives instead (the held piece, or the next if Hold is empty).
      const choices = [[queue[state.next], state.next + 1, state.held]];
      if (state.held) choices.push([state.held, state.next + 1, queue[state.next]]);
      else choices.push([queue[state.next + 1], state.next + 2, queue[state.next]]);
      for (const [type, next, held] of choices)
        for (const cells of FOOTPRINTS[type]) {
          const grid = place(state.grid, cells, options);
          if (!grid) continue;
          const code = encode(grid);
          if (code === targetCode) return moves;
          if (movesNeeded(grid, target, options.allowPops) > maxMoves - moves) continue;
          const key = code * 256 + next * 16 + (held ? typeIndex[held] : 0);
          if (seen.has(key)) continue;
          seen.add(key);
          nextLayer.push({ grid, next, held });
        }
    }
    layer = nextLayer;
  }
  return null;
}

// [pieces used to build the target, clears it must include]. Kept gentle while the daily is new.
const DIFFICULTY_BY_WEEKDAY = { 1: [4, 0], 2: [4, 0], 3: [4, 0], 4: [4, 0], 5: [4, 0], 6: [4, 0], 0: [4, 0] };

function makePuzzle(date) {
  const [buildLength, clearsWanted] = DIFFICULTY_BY_WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const daySeed = Number(date.replaceAll("-", ""));
  for (let attempt = 0; ; attempt++) {
    const random = mulberry32(daySeed * 1000 + attempt);
    const queue = Array.from({ length: QUEUE_LENGTH }, () => TYPES[Math.floor(random() * TYPES.length)]);
    let grid = Array(CELLS).fill(0);
    let clears = 0;
    for (let i = 0; i < buildLength; i++) {
      const options = FOOTPRINTS[queue[i]].map((cells) => place(grid, cells)).filter(Boolean);
      const before = sum(grid);
      grid = options[Math.floor(random() * options.length)];
      if (sum(grid) < before + PIECE_SIZE[queue[i]]) clears++;
    }
    if (clears < clearsWanted || (clearsWanted === 0 && clears > 0)) continue;
    // Skip boards that are nearly empty or have a single obvious stack.
    if (grid.filter(Boolean).length < 6 || sum(grid) === 0) continue;
    // Hard days only count if the target can't be reached without popping a line.
    if (clearsWanted > 0 && solvePar(queue, grid, buildLength + 1, { allowPops: false }) !== null) continue;
    const par = solvePar(queue, grid, buildLength);
    if (par === null || par < 3) continue;
    const target = Array.from({ length: SIZE }, (_, y) => grid.slice(y * SIZE, (y + 1) * SIZE).join("")).join("/");
    return { date, pieces: queue, target, par, built: buildLength };
  }
}

const [start = new Date().toISOString().slice(0, 10), days = "14"] = process.argv.slice(2);
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
const byDate = new Map(existing.map((puzzle) => [puzzle.date, puzzle]));
const save = () => {
  const puzzles = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  fs.mkdirSync(new URL(".", OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(puzzles, null, 1) + "\n");
};
for (let d = 0; d < Number(days); d++) {
  const date = new Date(Date.parse(`${start}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
  if (byDate.has(date)) continue;
  const startedAt = Date.now();
  const puzzle = makePuzzle(date);
  byDate.set(date, puzzle);
  // Saved as it goes: hard days can take a while to solve.
  save();
  console.log(`${date}  built ${puzzle.built}  par ${puzzle.par}  ${puzzle.target}  (${Date.now() - startedAt}ms)`);
}
