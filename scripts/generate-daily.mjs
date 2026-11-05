#!/usr/bin/env node
// Builds the daily puzzles: a seeded piece order per UTC day, a target reached by playing it, and
// par (the fewest placements that reach the target) found by an exhaustive search.
//
//   node scripts/generate-daily.mjs 2026-11-05 14   # start date, number of days
//
// Writes src/data/dailyPuzzles.json (one list per difficulty), keeping any days already in it.
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

// How many pieces build each difficulty's target, and how many line pops that build must include
// (a target that needs a pop is only accepted if no pop-free line reaches it).
const LEVELS = {
  easy: { pieces: 3, pops: 0, seed: 7919 },
  normal: { pieces: 4, pops: 0, seed: 0 },
  hard: { pieces: 5, pops: 0, seed: 104729 },
};

function makePuzzle(date, level) {
  const { pieces: buildLength, pops: popsWanted, seed } = LEVELS[level];
  const daySeed = Number(date.replaceAll("-", ""));
  for (let attempt = 0; ; attempt++) {
    const random = mulberry32(daySeed * 1000 + attempt + seed);
    const queue = Array.from({ length: QUEUE_LENGTH }, () => TYPES[Math.floor(random() * TYPES.length)]);
    let grid = Array(CELLS).fill(0);
    let pops = 0;
    for (let i = 0; i < buildLength; i++) {
      const options = FOOTPRINTS[queue[i]].map((cells) => place(grid, cells)).filter(Boolean);
      const before = sum(grid);
      grid = options[Math.floor(random() * options.length)];
      if (sum(grid) < before + PIECE_SIZE[queue[i]]) pops++;
    }
    if (pops < popsWanted || (popsWanted === 0 && pops > 0)) continue;
    // Skip boards that are nearly empty.
    if (grid.filter(Boolean).length < Math.min(6, buildLength * 2)) continue;
    if (popsWanted > 0 && solvePar(queue, grid, buildLength + 1, { allowPops: false }) !== null) continue;
    const par = solvePar(queue, grid, buildLength);
    if (par === null || par < 3) continue;
    const target = Array.from({ length: SIZE }, (_, y) => grid.slice(y * SIZE, (y + 1) * SIZE).join("")).join("/");
    return { date, pieces: queue, target, par };
  }
}

const [start = new Date().toISOString().slice(0, 10), days = "14"] = process.argv.slice(2);
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const byLevel = Object.fromEntries(
  Object.keys(LEVELS).map((level) => [level, new Map((Array.isArray(existing[level]) ? existing[level] : []).map((p) => [p.date, p]))])
);
const save = () => {
  const out = Object.fromEntries(Object.entries(byLevel).map(([level, byDate]) => [level, [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))]));
  fs.mkdirSync(new URL(".", OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
};
for (let d = 0; d < Number(days); d++) {
  const date = new Date(Date.parse(`${start}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
  for (const level of Object.keys(LEVELS)) {
    if (byLevel[level].has(date)) continue;
    const startedAt = Date.now();
    const puzzle = makePuzzle(date, level);
    byLevel[level].set(date, puzzle);
    // Saved as it goes: longer puzzles can take a while to solve.
    save();
    console.log(`${date}  ${level.padEnd(6)}  par ${puzzle.par}  ${puzzle.target}  (${Date.now() - startedAt}ms)`);
  }
}
