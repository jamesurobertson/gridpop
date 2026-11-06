#!/usr/bin/env node
// Builds the daily puzzles: a seeded piece order per UTC day and a target reached by playing it.
// `par` is how many pieces the build took; a search only checks the target can't be made in fewer
// than the level's minimum, which keeps the difficulty honest without proving the exact best.
// No target repeats: each is new against every earlier day, on every level.
//
//   node scripts/generate-daily.mjs 2026-11-05 14   # start date, number of days
//   node scripts/generate-daily.mjs 2026-11-07 363 --replace   # rebuild those days even if present
//   node scripts/generate-daily.mjs 2026-11-07 363 --replace --level hard   # only one difficulty
//
// Writes src/data/dailyPuzzles.json (one list per difficulty), keeping any days already in it, and
// src/data/dailySolutions.json: a par solution per day (the cells each piece covers, in order),
// kept apart because only the Reddit server reads it, to fall back on when a live hint search is
// too slow.
import fs from "node:fs";

const SIZE = 4;
const CELLS = SIZE * SIZE;
const QUEUE_LENGTH = 30;
const OUT = process.env.DAILY_OUT ? new URL(`file://${process.env.DAILY_OUT}`) : new URL("../src/data/dailyPuzzles.json", import.meta.url);
const SOLUTIONS_OUT = new URL(OUT.href.replace(/dailyPuzzles\.json$|\.json$/, (m) => (m === ".json" ? ".solutions.json" : "dailySolutions.json")));

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

/** How many rows and columns a placement completes (each pops). */
function linesCompleted(grid, cells) {
  const next = grid.slice();
  for (const cell of cells) next[cell]++;
  let lines = 0;
  for (let line = 0; line < SIZE; line++) {
    const row = Array.from({ length: SIZE }, (_, x) => line * SIZE + x);
    const col = Array.from({ length: SIZE }, (_, y) => y * SIZE + line);
    for (const cellsInLine of [row, col]) if (next[cellsInLine[0]] > 0 && cellsInLine.every((cell) => next[cell] === next[cellsInLine[0]])) lines++;
  }
  return lines;
}

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

/**
 * Breadth-first over (board, place in queue, held piece): the fewest placements and the cells each
 * covers, or null. `hold: false` plays the queue strictly in order, as the Reddit game does.
 */
function solve(queue, target, maxMoves, options = { allowPops: true, hold: false }) {
  const encode = (grid) => grid.reduce((code, value) => code * 7 + value, 0);
  const targetCode = encode(target);
  const typeIndex = Object.fromEntries(TYPES.map((type, i) => [type, i + 1]));
  let layer = [{ grid: Array(CELLS).fill(0), next: 0, held: null, path: [] }];
  for (let moves = 1; moves <= maxMoves; moves++) {
    const seen = new Set();
    const nextLayer = [];
    for (const state of layer) {
      // Play the current piece, or the one Hold gives instead (the held piece, or the next if Hold is empty).
      const choices = [[queue[state.next], state.next + 1, state.held]];
      if (options.hold && state.held) choices.push([state.held, state.next + 1, queue[state.next]]);
      else if (options.hold) choices.push([queue[state.next + 1], state.next + 2, queue[state.next]]);
      for (const [type, next, held] of choices)
        for (const cells of FOOTPRINTS[type]) {
          const grid = place(state.grid, cells, options);
          if (!grid) continue;
          const code = encode(grid);
          const path = [...state.path, cells];
          if (code === targetCode) return { moves, path };
          if (movesNeeded(grid, target, options.allowPops) > maxMoves - moves) continue;
          const key = code * 256 + next * 16 + (held ? typeIndex[held] : 0);
          if (seen.has(key)) continue;
          seen.add(key);
          nextLayer.push({ grid, next, held, path });
        }
    }
    layer = nextLayer;
  }
  return null;
}

const solvePar = (queue, target, maxMoves, options) => solve(queue, target, maxMoves, options)?.moves ?? null;

// How many pieces each difficulty's target is built with, picked at random within the range each
// day (played in order, no Hold, as on Reddit), and the chance a day's build must pop a line. A pop
// day pops exactly one line, once, with fewer pieces (`popPieces`): the hidden line is the hard
// part. Its target is only accepted if no pop-free line reaches it. Each day draws on its own, so
// pop days can run together or not come for a while.
const LEVELS = {
  easy: { pieces: [3, 3], popChance: 0, seed: 7919 },
  normal: { pieces: [4, 5], popChance: 0, seed: 0 },
  hard: { pieces: [6, 7], popPieces: [5, 5], popChance: 0.33, seed: 104729 },
};

function makePuzzle(date, level, usedTargets) {
  const { popChance, seed } = LEVELS[level];
  const daySeed = Number(date.replaceAll("-", ""));
  const popsWanted = mulberry32(daySeed + seed + 1)() < popChance ? 1 : 0;
  const [fewest, most] = popsWanted ? LEVELS[level].popPieces : LEVELS[level].pieces;
  const buildLength = fewest + Math.floor(mulberry32(daySeed + seed)() * (most - fewest + 1));
  for (let attempt = 0; ; attempt++) {
    const random = mulberry32(daySeed * 1000 + attempt + seed);
    const queue = Array.from({ length: QUEUE_LENGTH }, () => TYPES[Math.floor(random() * TYPES.length)]);
    let grid = Array(CELLS).fill(0);
    let pops = 0;
    const path = [];
    for (let i = 0; i < buildLength; i++) {
      const options = FOOTPRINTS[queue[i]].map((cells) => ({ cells, grid: place(grid, cells) })).filter((option) => option.grid);
      const picked = options[Math.floor(random() * options.length)];
      pops += linesCompleted(grid, picked.cells);
      grid = picked.grid;
      path.push(picked.cells);
    }
    if (pops !== popsWanted) continue;
    // Skip boards that are nearly empty.
    if (grid.filter(Boolean).length < Math.min(6, buildLength * 2)) continue;
    if (popsWanted > 0 && solvePar(queue, grid, buildLength + 1, { allowPops: false, hold: false }) !== null) continue;
    const target = Array.from({ length: SIZE }, (_, y) => grid.slice(y * SIZE, (y + 1) * SIZE).join("")).join("/");
    if (usedTargets.has(target)) continue;
    // Too easy if it can be made in fewer pieces than the level's minimum.
    if (fewest > 1 && solve(queue, grid, fewest - 1, { allowPops: true, hold: false }) !== null) continue;
    return { puzzle: { date, pieces: queue, target, par: buildLength }, solution: path, pops: popsWanted };
  }
}

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const onlyLevel = args.includes("--level") ? args[args.indexOf("--level") + 1] : null;
const [start = new Date().toISOString().slice(0, 10), days = "14"] = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--level");
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const solutions = fs.existsSync(SOLUTIONS_OUT) ? JSON.parse(fs.readFileSync(SOLUTIONS_OUT, "utf8")) : {};
for (const level of Object.keys(LEVELS)) solutions[level] ??= {};
const byLevel = Object.fromEntries(
  Object.keys(LEVELS).map((level) => [level, new Map((Array.isArray(existing[level]) ? existing[level] : []).map((p) => [p.date, p]))])
);
const save = () => {
  const out = Object.fromEntries(Object.entries(byLevel).map(([level, byDate]) => [level, [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))]));
  fs.mkdirSync(new URL(".", OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  const sortedSolutions = Object.fromEntries(Object.entries(solutions).map(([level, byDate]) => [level, Object.fromEntries(Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)))]));
  fs.writeFileSync(SOLUTIONS_OUT, JSON.stringify(sortedSolutions) + "\n");
};
const parseGrid = (target) => target.split("/").flatMap((row) => [...row].map(Number));

// The days this run builds; with --replace, those already present are rebuilt rather than kept.
const runDates = new Set(Array.from({ length: Number(days) }, (_, d) => new Date(Date.parse(`${start}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10)));

// Days kept from before solutions were saved get one now (played in order, so it may be over par).
for (const [level, byDate] of Object.entries(byLevel))
  for (const [date, puzzle] of byDate) {
    if (solutions[level][date] || (replace && runDates.has(date))) continue;
    const solved = solve(puzzle.pieces, parseGrid(puzzle.target), puzzle.par + 3, { allowPops: true, hold: false });
    if (solved) solutions[level][date] = solved.path;
    else console.warn(`${date} ${level}: no in-order solution within par + 3`);
  }
// Every target in use: kept days now, and each new one as it's made, so none repeats.
const usedTargets = new Set();
for (const byDate of Object.values(byLevel))
  for (const [date, puzzle] of byDate) if (!(replace && runDates.has(date) && (!onlyLevel || byDate === byLevel[onlyLevel]))) usedTargets.add(puzzle.target);

for (let d = 0; d < Number(days); d++) {
  const date = new Date(Date.parse(`${start}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
  for (const level of Object.keys(LEVELS)) {
    if (onlyLevel && level !== onlyLevel) continue;
    if (byLevel[level].has(date) && !replace) continue;
    const startedAt = Date.now();
    const { puzzle, solution, pops } = makePuzzle(date, level, usedTargets);
    usedTargets.add(puzzle.target);
    byLevel[level].set(date, puzzle);
    solutions[level][date] = solution;
    console.log(`${date}  ${level.padEnd(6)}  par ${puzzle.par}  ${puzzle.target}${pops ? "  pop" : ""}  (${Date.now() - startedAt}ms)`);
  }
}
// Written once at the end, so a running playtest rebuilds once rather than after every puzzle.
save();
