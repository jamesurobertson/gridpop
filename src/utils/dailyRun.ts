// A daily run as a list of actions, replayed against the game's own rules. The Reddit client
// records runs; its server replays them before a result counts, and to work out hints.
import { GridType, Tetromino, TetrominoType } from "@/types/game";
import { TETROMINO_SHAPES } from "./tetrominoShapes";
import { MAX_CELL_VALUE, checkGameOver, checkLinesToClear, clearRowsAndCols, createEmptyGrid, isValidPosition, placeTetromino } from "./gameLogic";
import { gridsMatch } from "./dailyCore";

export type RunAction = { type: "hold" } | { type: "place"; rotation: number; x: number; y: number };
export type Placement = { rotation: number; x: number; y: number };

/** The board after placing a piece and popping any complete lines. */
export function placeAndClear(grid: GridType, piece: Tetromino): GridType {
  const placed = placeTetromino(grid, piece);
  const { rows, cols, clearValue } = checkLinesToClear(placed);
  return clearValue > 0 ? clearRowsAndCols(placed, rows, cols) : placed;
}

/** Where a run stands: the board, the piece in play (an index into the day's pieces) and Hold. */
export type RunCursor = { grid: GridType; current: number; next: number; held: number | null; canHold: boolean; moves: number; solved: boolean };

const start = (): RunCursor => ({ grid: createEmptyGrid(4), current: 0, next: 1, held: null, canHold: true, moves: 0, solved: false });

/** One action on from `cursor`, or the reason it isn't allowed. */
function step(pieces: TetrominoType[], target: GridType, cursor: RunCursor, action: RunAction): RunCursor | string {
  if (cursor.solved) return "kept playing after solving";
  if (cursor.current >= pieces.length) return "out of pieces";
  if (action.type === "hold") {
    if (!cursor.canHold) return "held twice in one turn";
    if (cursor.held !== null) return { ...cursor, current: cursor.held, held: cursor.current, canHold: false };
    if (cursor.next >= pieces.length) return "nothing to hold for";
    return { ...cursor, current: cursor.next, next: cursor.next + 1, held: cursor.current, canHold: false };
  }
  const shape = TETROMINO_SHAPES[pieces[cursor.current]];
  if (!Number.isInteger(action.rotation) || action.rotation < 0 || action.rotation >= shape.rotations.length) return "bad rotation";
  const piece: Tetromino = { shape, rotation: action.rotation, position: { x: action.x, y: action.y } };
  if (!Number.isInteger(action.x) || !Number.isInteger(action.y) || !isValidPosition(cursor.grid, piece)) return "piece off the board";
  const grid = placeAndClear(cursor.grid, piece);
  const solved = gridsMatch(grid, target);
  if (!solved && checkGameOver(grid)) return "a tile reached 7";
  return { grid, current: cursor.next, next: cursor.next + 1, held: cursor.held, canHold: true, moves: cursor.moves + 1, solved };
}

/** Plays `actions` from the start; the cursor where they leave off, or why they're not a legal run. */
export function replayTo(pieces: TetrominoType[], target: GridType, actions: RunAction[]): RunCursor | string {
  let cursor = start();
  for (const action of actions) {
    const stepped = step(pieces, target, cursor, action);
    if (typeof stepped === "string") return stepped;
    cursor = stepped;
  }
  return cursor;
}

export type ReplayResult = { solved: true; moves: number } | { solved: false; reason: string };

export function replayRun(pieces: TetrominoType[], target: GridType, actions: RunAction[]): ReplayResult {
  const cursor = replayTo(pieces, target, actions);
  if (typeof cursor === "string") return { solved: false, reason: cursor };
  return cursor.solved ? { solved: true, moves: cursor.moves } : { solved: false, reason: "target not reached" };
}

// ---------- hints: the first placement of a shortest way from here to the target ----------

// The search works on flat boards (16 numbers) for speed; the rules match placeAndClear and
// checkGameOver: +1 under the piece (capped at 7), full same-number lines pop, a 7 left ends the run.
type Flat = number[];
type Footprint = { cells: number[]; placement: Placement };

const flatten = (grid: GridType): Flat => grid.flat();
const sameBoard = (a: Flat, b: Flat) => a.every((value, i) => value === b[i]);
const boardKey = (board: Flat) => board.reduce((key, value) => key * 8 + value, 0);

const footprintCache = new Map<TetrominoType, Footprint[]>();
/** Every distinct set of cells a piece can cover, with one placement that covers it. */
function footprints(type: TetrominoType): Footprint[] {
  const cached = footprintCache.get(type);
  if (cached) return cached;
  const seen = new Set<string>();
  const out: Footprint[] = [];
  TETROMINO_SHAPES[type].rotations.forEach((shape, rotation) => {
    for (let y = -3; y < 4; y++)
      for (let x = -3; x < 4; x++) {
        const cells = shape.flatMap((row, dy) => row.flatMap((on, dx) => (on ? [[x + dx, y + dy]] : [])));
        if (cells.some(([cx, cy]) => cx < 0 || cx > 3 || cy < 0 || cy > 3)) continue;
        const flatCells = cells.map(([cx, cy]) => cy * 4 + cx);
        const key = flatCells.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ cells: flatCells, placement: { rotation, x, y } });
      }
  });
  footprintCache.set(type, out);
  return out;
}

/** The board after a placement and its pops, or null if it leaves a 7. */
function placeFlat(board: Flat, cells: number[]): Flat | null {
  const next = board.slice();
  for (const cell of cells) next[cell] = Math.min(next[cell] + 1, MAX_CELL_VALUE);
  const popped: number[] = [];
  for (let line = 0; line < 4; line++) {
    const row = [line * 4, line * 4 + 1, line * 4 + 2, line * 4 + 3];
    const col = [line, line + 4, line + 8, line + 12];
    for (const cellsInLine of [row, col]) {
      const value = next[cellsInLine[0]];
      if (value > 0 && cellsInLine.every((cell) => next[cell] === value)) popped.push(...cellsInLine);
    }
  }
  for (const cell of popped) next[cell] = 0;
  return next.includes(MAX_CELL_VALUE) ? null : next;
}

const total = (board: Flat) => board.reduce((a, b) => a + b, 0);

/** Fewest more pieces that could possibly turn `board` into `target` (never an overestimate). */
function movesNeeded(board: Flat, target: Flat) {
  let needed = Math.ceil((total(target) - total(board)) / 4);
  board.forEach((have, i) => {
    const want = target[i];
    // A tile only climbs one per piece; one that's too high has to pop first, then climb again.
    if (have < want) needed = Math.max(needed, want - have);
    else if (have > want) needed = Math.max(needed, want + 1);
  });
  return needed;
}

/** The first placement of a way to reach `target` within `limit` more pieces, or why there's none. */
function searchWithin(pieces: TetrominoType[], targetGrid: GridType, cursor: RunCursor, limit: number, budget: { left: number }): Placement | "none" | "gave up" {
  const target = flatten(targetGrid);
  type Node = { board: Flat; first: Placement | null };
  let layer: Node[] = [{ board: flatten(cursor.grid), first: null }];
  for (let depth = 1; depth <= limit && layer.length; depth++) {
    const index = cursor.current + depth - 1;
    if (index >= pieces.length) break;
    // No Hold on this path, so every node in a layer plays the same piece; boards alone dedupe.
    const seen = new Set<number>();
    const nextLayer: Node[] = [];
    for (const node of layer) {
      for (const { cells, placement } of footprints(pieces[index])) {
        if (--budget.left < 0) return "gave up";
        const board = placeFlat(node.board, cells);
        if (!board) continue;
        const first = node.first ?? placement;
        if (sameBoard(board, target)) return first;
        if (movesNeeded(board, target) > limit - depth) continue;
        const key = boardKey(board);
        if (seen.has(key)) continue;
        seen.add(key);
        nextLayer.push({ board, first });
      }
    }
    layer = nextLayer;
  }
  return "none";
}

/** Undo this many placements, then put the piece in play here. */
export type HintAdvice = { undo: number; placement: Placement };

/**
 * The first step of the shortest way to finish, counting the whole run. Undoing is free and a
 * restart counts, so a dead end (or a detour) becomes "undo this many, then place here". Tries the
 * best finish, then one piece worse, and so on; for each, the fewest undos that still make it.
 * When the search runs out of time it falls back on `solution` (a known par line, as the cells each
 * piece covers): undo to the latest point the run is still on it, then take its next step.
 */
export function hintFor(pieces: TetrominoType[], target: GridType, actions: RunAction[], par: number, solution?: number[][], slack = 4): HintAdvice | null {
  const budget = { left: 3_000_000 };
  const placeAt = actions.flatMap((action, i) => (action.type === "place" ? [i] : []));
  const placed = placeAt.length;
  const cursors = new Map<number, RunCursor | null>();
  const cursorAfterUndo = (undo: number) => {
    if (!cursors.has(undo)) {
      const cursor = replayTo(pieces, target, undo === 0 ? actions : actions.slice(0, placeAt[placed - undo]));
      cursors.set(undo, typeof cursor === "string" || cursor.solved ? null : cursor);
    }
    return cursors.get(undo)!;
  };
  // Per undo level, the longest finish already ruled out, so each total only searches what's new.
  const ruledOut = new Map<number, number>();
  // `par` is how many pieces the target was built with, so the best finish may be fewer: start from
  // the fewest any undo level could possibly finish in.
  let fewest = par;
  for (let undo = 0; undo <= placed; undo++) {
    const cursor = cursorAfterUndo(undo);
    if (cursor) fewest = Math.min(fewest, placed - undo + movesNeeded(flatten(cursor.grid), flatten(target)));
  }
  for (let total = Math.max(1, fewest); total <= par + slack; total++) {
    for (let undo = 0; undo <= placed; undo++) {
      const cursor = cursorAfterUndo(undo);
      const limit = Math.min(total - (placed - undo), pieces.length - (cursor?.current ?? pieces.length));
      if (!cursor || limit < 1) continue;
      for (let more = (ruledOut.get(undo) ?? 0) + 1; more <= limit; more++) {
        if (movesNeeded(flatten(cursor.grid), flatten(target)) > more) continue;
        const found = searchWithin(pieces, target, cursor, more, budget);
        if (found === "gave up") return solution ? alongSolution(pieces, solution, placed, cursorAfterUndo) : null;
        if (found !== "none") return { undo, placement: found };
      }
      ruledOut.set(undo, Math.max(ruledOut.get(undo) ?? 0, limit));
    }
  }
  return solution ? alongSolution(pieces, solution, placed, cursorAfterUndo) : null;
}

/** The next step of `solution` from the latest point in the run that's still on it (the start always is). */
function alongSolution(pieces: TetrominoType[], solution: number[][], placed: number, cursorAfterUndo: (undo: number) => RunCursor | null): HintAdvice | null {
  const boards: Flat[] = [Array(16).fill(0)];
  for (const cells of solution) {
    const board = placeFlat(boards[boards.length - 1], cells);
    if (!board) return null;
    boards.push(board);
  }
  for (let undo = 0; undo <= placed; undo++) {
    const step = placed - undo;
    const cursor = cursorAfterUndo(undo);
    if (!cursor || step >= solution.length || cursor.current !== step || !sameBoard(flatten(cursor.grid), boards[step])) continue;
    const key = [...solution[step]].sort((a, b) => a - b).join(",");
    const footprint = footprints(pieces[step]).find(({ cells }) => [...cells].sort((a, b) => a - b).join(",") === key);
    if (footprint) return { undo, placement: footprint.placement };
  }
  return null;
}
