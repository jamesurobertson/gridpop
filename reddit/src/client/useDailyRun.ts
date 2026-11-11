import { useReducer } from "react";
import type { CellValue, DailyOutcome, GridType, Position, ScoreAnimation, Tetromino, TetrominoType } from "@/types/game";
import {
  calculateLineClearScore,
  checkGameOver,
  checkGridCleared,
  checkLinesToClear,
  clearRowsAndCols,
  createEmptyGrid,
  createTetromino,
  isValidPosition,
  placeTetromino,
  tryWallKick,
} from "@/utils/gameLogic";
import { TETROMINO_SHAPES } from "@/utils/tetrominoShapes";
import { gridsMatch } from "@/utils/dailyCore";
import type { RunAction } from "@/utils/dailyRun";

export type RunState = {
  grid: GridType;
  current: Tetromino | null;
  queue: Tetromino[];
  moves: number;
  /** The piece is down and complete lines are about to pop. */
  pendingClear: boolean;
  outcome: DailyOutcome | null;
  /** Everything done this run, for the server to replay. */
  actions: RunAction[];
  scoreAnimations: ScoreAnimation[];
  /** The run as it was before each placement, latest last, for undo. */
  history: Omit<RunState, "history" | "scoreAnimations">[];
};

type RunEvent =
  /** A fresh run; the tutorial can start it from tiles on the board and the first piece elsewhere. */
  | { type: "start"; pieces: TetrominoType[]; grid?: GridType; at?: Position }
  | { type: "showSolved"; target: GridType }
  | { type: "move"; position: Position }
  /** Put the piece straight on a spot it was placed on before (for the replay). */
  | { type: "aim"; rotation: number; position: Position }
  | { type: "rotate"; direction: "clockwise" | "counterclockwise" }
  | { type: "place" }
  | { type: "clear"; target: GridType }
  | { type: "removeAnimation"; id: number }
  /** Take back the last placement (not once the target is matched). */
  | { type: "undo" }
  /** Put back a run set aside (for the tutorial), exactly as it was. */
  | { type: "restore"; run: RunState }
  /** Rebuild a saved run from its actions, undo history and all, stopping at any that no longer fit. */
  | { type: "resume"; pieces: TetrominoType[]; actions: RunAction[]; target: GridType };

let animationId = 0;

const fresh = (pieces: TetrominoType[]): RunState => {
  const queue = pieces.map((type) => createTetromino(TETROMINO_SHAPES[type], 4));
  return {
    grid: createEmptyGrid(4),
    current: queue[0] ?? null,
    queue: queue.slice(1),
    moves: 0,
    pendingClear: false,
    outcome: null,
    actions: [],
    scoreAnimations: [],
    history: [],
  };
};

function reduce(state: RunState, event: RunEvent): RunState {
  const playable = state.current && !state.outcome && !state.pendingClear;
  switch (event.type) {
    case "start": {
      const run = fresh(event.pieces);
      return {
        ...run,
        grid: event.grid ? event.grid.map((row) => [...row]) : createEmptyGrid(4),
        current: run.current && event.at ? { ...run.current, position: event.at } : run.current,
      };
    }
    case "showSolved":
      return { ...fresh([]), grid: event.target.map((row) => [...row]), outcome: "solved" };
    case "move": {
      if (!playable) return state;
      const moved = { ...state.current!, position: event.position };
      return isValidPosition(state.grid, moved) ? { ...state, current: moved } : state;
    }
    case "aim":
      return playable ? { ...state, current: { ...state.current!, rotation: event.rotation, position: event.position } } : state;
    case "rotate": {
      if (!playable) return state;
      const piece = state.current!;
      const count = piece.shape.rotations.length;
      const rotation = (piece.rotation + (event.direction === "clockwise" ? 1 : -1) + count) % count;
      const position = tryWallKick(state.grid, { ...piece, rotation }, rotation);
      return position ? { ...state, current: { ...piece, rotation, position } } : state;
    }
    case "place": {
      if (!playable) return state;
      const { history, scoreAnimations, ...before } = state;
      const { rotation, position } = state.current!;
      return {
        ...state,
        grid: placeTetromino(state.grid, state.current!),
        pendingClear: true,
        history: [...history, before],
        actions: [...state.actions, { type: "place", rotation, x: position.x, y: position.y }],
      };
    }
    case "clear": {
      if (!state.pendingClear) return state;
      const { rows, cols, clearValue } = checkLinesToClear(state.grid);
      const lines = rows.length + cols.length;
      let grid = state.grid;
      const scoreAnimations = [...state.scoreAnimations];
      if (clearValue > 0) {
        grid = clearRowsAndCols(state.grid, rows, cols);
        const boardCleared = checkGridCleared(grid);
        const center = { x: 2, y: 2 };
        scoreAnimations.push({ id: animationId++, value: calculateLineClearScore(clearValue as CellValue, lines), position: center, clearValue, lines });
        if (boardCleared) scoreAnimations.push({ id: animationId++, value: 5000, position: center, clearValue: 7, bonus: true });
      }
      const next = state.queue[0] ?? null;
      const outcome: DailyOutcome | null = gridsMatch(grid, event.target) ? "solved" : checkGameOver(grid) ? "seven" : next ? null : "empty";
      return {
        ...state,
        grid,
        current: outcome ? null : next,
        queue: state.queue.slice(1),
        moves: state.moves + 1,
        pendingClear: false,
        outcome,
        scoreAnimations,
      };
    }
    case "undo": {
      const previous = state.history.at(-1);
      if (!previous || state.pendingClear || state.outcome === "solved") return state;
      return { ...previous, history: state.history.slice(0, -1), scoreAnimations: [] };
    }
    case "removeAnimation":
      return { ...state, scoreAnimations: state.scoreAnimations.filter((a) => a.id !== event.id) };
    case "restore":
      return { ...event.run, scoreAnimations: [] };
    case "resume": {
      let run = fresh(event.pieces);
      for (const action of event.actions) {
        if (action.type !== "place" || !run.current || run.outcome) break;
        const piece = { ...run.current, rotation: action.rotation, position: { x: action.x, y: action.y } };
        if (!isValidPosition(run.grid, piece)) break;
        run = reduce(reduce({ ...run, current: piece }, { type: "place" }), { type: "clear", target: event.target });
      }
      return { ...run, scoreAnimations: [] };
    }
  }
}

export function useDailyRun() {
  return useReducer(reduce, [], fresh);
}
