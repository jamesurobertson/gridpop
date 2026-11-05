// A daily run as a list of actions, and a replay that checks it against the game's own rules.
// The Reddit client records runs; its server replays them before a result counts.
import { GridType, Tetromino, TetrominoType } from "@/types/game";
import { TETROMINO_SHAPES } from "./tetrominoShapes";
import { checkGameOver, checkLinesToClear, clearRowsAndCols, createEmptyGrid, isValidPosition, placeTetromino } from "./gameLogic";
import { gridsMatch } from "./dailyCore";

export type RunAction = { type: "hold" } | { type: "place"; rotation: number; x: number; y: number };

/** The board after placing a piece and popping any complete lines. */
export function placeAndClear(grid: GridType, piece: Tetromino): GridType {
  const placed = placeTetromino(grid, piece);
  const { rows, cols, clearValue } = checkLinesToClear(placed);
  return clearValue > 0 ? clearRowsAndCols(placed, rows, cols) : placed;
}

export type ReplayResult = { solved: true; moves: number } | { solved: false; reason: string };

export function replayRun(pieces: TetrominoType[], target: GridType, actions: RunAction[]): ReplayResult {
  let grid = createEmptyGrid(4);
  let current: TetrominoType | undefined = pieces[0];
  let next = 1;
  let held: TetrominoType | null = null;
  let canHold = true;
  let moves = 0;
  for (const [i, action] of actions.entries()) {
    if (!current) return { solved: false, reason: "out of pieces" };
    if (action.type === "hold") {
      if (!canHold) return { solved: false, reason: "held twice in one turn" };
      if (held) [held, current] = [current, held];
      else {
        if (next >= pieces.length) return { solved: false, reason: "nothing to hold for" };
        held = current;
        current = pieces[next++];
      }
      canHold = false;
      continue;
    }
    const shape = TETROMINO_SHAPES[current];
    if (!Number.isInteger(action.rotation) || action.rotation < 0 || action.rotation >= shape.rotations.length)
      return { solved: false, reason: "bad rotation" };
    const piece: Tetromino = { shape, rotation: action.rotation, position: { x: action.x, y: action.y } };
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y) || !isValidPosition(grid, piece))
      return { solved: false, reason: "piece off the board" };
    grid = placeAndClear(grid, piece);
    moves++;
    if (gridsMatch(grid, target)) return i === actions.length - 1 ? { solved: true, moves } : { solved: false, reason: "kept playing after solving" };
    if (checkGameOver(grid)) return { solved: false, reason: "a tile reached 7" };
    current = pieces[next++];
    canHold = true;
  }
  return { solved: false, reason: "target not reached" };
}
