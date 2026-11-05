// A daily run as a list of actions, replayed against the game's own rules. The Reddit client
// records runs; its server replays them before a result counts, and to work out hints.
import { GridType, Tetromino, TetrominoType } from "@/types/game";
import { TETROMINO_SHAPES } from "./tetrominoShapes";
import { checkGameOver, checkLinesToClear, clearRowsAndCols, createEmptyGrid, isValidPosition, placeTetromino } from "./gameLogic";
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

/** Every distinct way to set a piece down on `grid`, one per set of covered cells. */
function placements(grid: GridType, type: TetrominoType): { placement: Placement; piece: Tetromino }[] {
  const shape = TETROMINO_SHAPES[type];
  const seen = new Set<string>();
  const out: { placement: Placement; piece: Tetromino }[] = [];
  shape.rotations.forEach((cells, rotation) => {
    for (let y = -3; y < 4; y++)
      for (let x = -3; x < 4; x++) {
        const piece: Tetromino = { shape, rotation, position: { x, y } };
        if (!isValidPosition(grid, piece)) continue;
        const key = cells.flatMap((row, dy) => row.flatMap((on, dx) => (on ? [(y + dy) * 4 + x + dx] : []))).join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ placement: { rotation, x, y }, piece });
      }
  });
  return out;
}

const total = (grid: GridType) => grid.flat().reduce((a, b) => a + b, 0);

/** Fewest more pieces that could possibly turn `grid` into `target` (never an overestimate). */
function movesNeeded(grid: GridType, target: GridType) {
  let needed = Math.ceil((total(target) - total(grid)) / 4);
  grid.forEach((row, y) =>
    row.forEach((have, x) => {
      const want = target[y][x];
      // A tile only climbs one per piece; one that's too high has to pop first, then climb again.
      if (have < want) needed = Math.max(needed, want - have);
      else if (have > want) needed = Math.max(needed, want + 1);
    })
  );
  return needed;
}

/** The first placement of a way to reach `target` in exactly `limit` more pieces, if there is one. */
function searchWithin(pieces: TetrominoType[], target: GridType, cursor: RunCursor, limit: number, budget: { left: number }): Placement | null {
  type Node = { grid: GridType; index: number; first: Placement | null };
  let layer: Node[] = [{ grid: cursor.grid, index: cursor.current, first: null }];
  for (let depth = 1; depth <= limit && layer.length; depth++) {
    const seen = new Set<string>();
    const nextLayer: Node[] = [];
    for (const node of layer) {
      if (node.index >= pieces.length) continue;
      for (const { placement, piece } of placements(node.grid, pieces[node.index])) {
        if (--budget.left < 0) return null;
        const grid = placeAndClear(node.grid, piece);
        const first = node.first ?? placement;
        if (gridsMatch(grid, target)) return first;
        if (checkGameOver(grid) || movesNeeded(grid, target) > limit - depth) continue;
        const key = grid.flat().join("");
        if (seen.has(key)) continue;
        seen.add(key);
        nextLayer.push({ grid, index: node.index + 1, first });
      }
    }
    layer = nextLayer;
  }
  return null;
}

/**
 * Where to put the piece in play so the target is reached in as few more pieces as possible (Hold
 * aside). Tries the fewest that could work, then one more, up to `maxMoves`; each pass prunes hard
 * against its own limit. Null when the target can't be reached from here (or the search gives up).
 */
export function hintFrom(pieces: TetrominoType[], target: GridType, cursor: RunCursor, maxMoves = 8): Placement | null {
  const budget = { left: 1_500_000 };
  for (let limit = Math.max(1, movesNeeded(cursor.grid, target)); limit <= maxMoves; limit++) {
    const found = searchWithin(pieces, target, cursor, limit, budget);
    if (found || budget.left < 0) return found;
  }
  return null;
}
