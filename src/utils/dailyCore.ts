// The daily puzzle's pure helpers, shared by the web game, the Reddit app and its server.
// Nothing here touches storage or the puzzle list, so it stays small to import.
import { CellValue, GridType, TetrominoType } from "@/types/game";

export type DailyLevel = "easy" | "normal" | "hard";

export const DAILY_LEVELS: { level: DailyLevel; label: string }[] = [
  { level: "easy", label: "Easy" },
  { level: "normal", label: "Normal" },
  { level: "hard", label: "Hard" },
];

export interface DailyPuzzle {
  date: string;
  pieces: TetrominoType[];
  /** Rows top to bottom, e.g. "0010/0210/3300/2310". */
  target: string;
  par: number;
}

export interface DailyResult {
  moves: number;
  /** Runs started over after placing at least one piece; missing on results saved before they counted. */
  restarts?: number;
  /** Hints asked for before solving (Reddit only). */
  hints?: number;
  par: number;
  timeMs: number;
}

/** Like golf: every placement and every restart is a stroke. */
/** Pieces placed. Restarts don't add to it; they only break ties. */
export const dailyScore = (result: Pick<DailyResult, "moves">) => result.moves;

export const DAY_MS = 86_400_000;
export const FIRST_DAY = "2026-11-05";

export const utcDateKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const dayIndex = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / DAY_MS);

export const shiftDate = (date: string, days: number) => utcDateKey(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);

/** Puzzle #1 was the first day. */
export const puzzleNumber = (date: string) => dayIndex(date) + 1;

/** The puzzle for a date; past the end of the generated list, the puzzles come round again. */
export function pickPuzzle(list: DailyPuzzle[], date: string): DailyPuzzle {
  const index = dayIndex(date);
  return list.find((p) => p.date === date) ?? list[((index % list.length) + list.length) % list.length];
}

export const parseTarget = (target: string): GridType => target.split("/").map((row) => [...row].map(Number) as CellValue[]);

export const gridsMatch = (a: GridType, b: GridType) => a.every((row, y) => row.every((value, x) => value === b[y][x]));

export function msUntilNextPuzzle(now = Date.now()) {
  return Math.ceil(now / DAY_MS) * DAY_MS - now;
}

export function formatClock(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** 0 for par, then +1, +2 and +3 or more. */
export const overParBucket = (score: number, par: number) => Math.min(3, Math.max(0, score - par));

const TILE_EMOJI = ["⬛", "🟨", "🟦", "🟩", "🟪", "🟧", "🟥"];

export const emojiBoard = (grid: GridType) => grid.map((row) => row.map((value) => TILE_EMOJI[value] ?? "⬛").join("")).join("\n");
