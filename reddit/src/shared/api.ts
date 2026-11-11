import type { TetrominoType } from "@/types/game";
import type { DailyLevel, DailyResult } from "@/utils/dailyCore";
import type { HintAdvice, Placement, RunAction } from "@/utils/dailyRun";

export type LevelPuzzle = { pieces: TetrominoType[]; target: string; par: number };

export type LevelStats = {
  played: number;
  streak: number;
  bestStreak: number;
};

export type SavedResult = DailyResult & { undos: number; hints: number; rank: number; total: number };

export type PuzzleResponse = {
  date: string;
  number: number;
  /** Null when logged out: the puzzle plays, but nothing is saved. */
  username: string | null;
  /** Played on the website: saved on this device, with no leaderboard, comments or login. */
  local?: boolean;
  levels: Record<DailyLevel, LevelPuzzle>;
  results: Record<DailyLevel, SavedResult | null>;
  stats: Record<DailyLevel, LevelStats>;
  /** Runs with at least one piece placed, per level; every one after the first is a restart. */
  attempts: Record<DailyLevel, number>;
  /** Undos before the solve, per level. */
  undos: Record<DailyLevel, number>;
  /** The link to the player's score comment, per level. */
  comments: Record<DailyLevel, string | null>;
  /** Time on each unsolved level so far, so a reload can't restart the clock. */
  clocks: Record<DailyLevel, number>;
  /** The unsolved run on each level, so a reload picks up where it was. */
  runs: Record<DailyLevel, SavedRun | null>;
};

/** A run's actions, stamped with when they were saved so the newest copy wins. */
export type SavedRun = { at: number; actions: RunAction[] };

export type LeaderboardEntry = { rank: number; username: string; moves: number; undos: number; hints: number; timeMs: number };

export type Distribution = { score: number; count: number }[];

export type LeaderboardResponse = { top: LeaderboardEntry[]; me: LeaderboardEntry | null; total: number; distribution: Distribution };

/** Comments the player's recorded score for a level, with an optional message of their own. */
export type CommentRequest = { level: DailyLevel; message: string };
export type CommentResponse = { ok: true; url: string } | { ok: false; reason: string };

export type HintRequest = { date: string; level: DailyLevel; actions: RunAction[] };
/** `placement` is where the piece in play should go; null means the target can't be reached from here. */
export type HintResponse = { ok: true; hint: HintAdvice | null; hints: number } | { ok: false; reason: string; waitMs?: number };

export type CountRequest = { date: string; level: DailyLevel };
export type AttemptResponse = { attempts: number };
export type UndoResponse = { undos: number };
export type ProgressRequest = { date: string; level: DailyLevel; timeMs: number; run: SavedRun };

export type SubmitRequest = { date: string; level: DailyLevel; actions: RunAction[]; timeMs: number };
export type SubmitResponse =
  | { ok: true; result: SavedResult; stats: LevelStats; leaderboard: LeaderboardResponse }
  | { ok: false; reason: string };
