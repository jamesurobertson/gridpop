import type { TetrominoType } from "@/types/game";
import type { DailyLevel, DailyResult } from "@/utils/dailyCore";
import type { HintAdvice, Placement, RunAction } from "@/utils/dailyRun";

export type LevelPuzzle = { pieces: TetrominoType[]; target: string; par: number };

export type LevelStats = {
  played: number;
  streak: number;
  bestStreak: number;
  /** Solves at par, +1, +2 and +3 or more. */
  overPar: [number, number, number, number];
};

export type SavedResult = DailyResult & { restarts: number; hints: number; rank: number; total: number };

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
};

export type LeaderboardEntry = { rank: number; username: string; score: number; moves: number; restarts: number; hints: number; timeMs: number };

export type Distribution = { score: number; count: number }[];

export type LeaderboardResponse = { top: LeaderboardEntry[]; me: LeaderboardEntry | null; total: number; distribution: Distribution };

export type CommentRequest = { text: string };
export type CommentResponse = { ok: true } | { ok: false; reason: string };

export type HintRequest = { date: string; level: DailyLevel; actions: RunAction[] };
/** `placement` is where the piece in play should go; null means the target can't be reached from here. */
export type HintResponse = { ok: true; hint: HintAdvice | null; hints: number } | { ok: false; reason: string; waitMs?: number };

export type AttemptRequest = { date: string; level: DailyLevel };
export type AttemptResponse = { attempts: number };

export type SubmitRequest = { date: string; level: DailyLevel; actions: RunAction[]; timeMs: number };
export type SubmitResponse =
  | { ok: true; result: SavedResult; stats: LevelStats; leaderboard: LeaderboardResponse }
  | { ok: false; reason: string };
