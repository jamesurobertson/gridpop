// The website's stand-in for the Reddit app's server (reddit/src/client/api.ts): the same calls,
// answered in the browser and saved to this device. Swapped in by vite.config.ts.
import puzzles from "@/data/dailyPuzzles.json";
import { DAILY_LEVELS, DailyLevel, DailyPuzzle, DailyResult, easternDateKey, parseTarget, pickPuzzle, puzzleNumber } from "@/utils/dailyCore";
import { dailyStats, loadDailyResults, saveDailyResult } from "@/utils/daily";
import { hintFor, replayRun, replayTo, type RunAction } from "@/utils/dailyRun";
import type { AttemptResponse, CommentResponse, HintResponse, LeaderboardResponse, PuzzleResponse, SavedResult, SubmitResponse, UndoResponse } from "../../reddit/src/shared/api";

const PUZZLES = puzzles as unknown as Record<DailyLevel, DailyPuzzle[]>;
const NO_BOARD: LeaderboardResponse = { top: [], me: null, total: 0, distribution: [] };

const attemptsKey = (date: string, level: DailyLevel) => `gridpop-attempts:${date}:${level}`;
const undosKey = (date: string, level: DailyLevel) => `gridpop-undos:${date}:${level}`;
const hintsKey = (date: string, level: DailyLevel) => `gridpop-hints:${date}:${level}`;

function readCount(key: string) {
  try {
    return Number(localStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

function bumpCount(key: string) {
  const count = readCount(key) + 1;
  try {
    localStorage.setItem(key, String(count));
  } catch {
    // Storage blocked: the count only lasts this visit.
  }
  return count;
}

const perLevel = <T>(make: (level: DailyLevel) => T) => Object.fromEntries(DAILY_LEVELS.map(({ level }) => [level, make(level)])) as Record<DailyLevel, T>;

// `restarts` is the older name for `undos`, from before undos counted.
const saved = (result: DailyResult & { restarts?: number }): SavedResult => ({ ...result, undos: result.undos ?? result.restarts ?? 0, hints: result.hints ?? 0, rank: 0, total: 0 });

export async function fetchPuzzle(): Promise<PuzzleResponse> {
  const date = easternDateKey();
  const results = loadDailyResults();
  return {
    date,
    number: puzzleNumber(date),
    username: null,
    local: true,
    levels: perLevel((level) => {
      const { pieces, target, par } = pickPuzzle(PUZZLES[level], date);
      return { pieces, target, par };
    }),
    results: perLevel((level) => (results[level][date] ? saved(results[level][date]) : null)),
    stats: perLevel((level) => dailyStats(results[level], date)),
    attempts: perLevel((level) => readCount(attemptsKey(date, level))),
    undos: perLevel((level) => readCount(undosKey(date, level))),
    comments: perLevel(() => null),
  };
}

export async function recordAttempt(date: string, level: DailyLevel): Promise<AttemptResponse> {
  return { attempts: bumpCount(attemptsKey(date, level)) };
}

export async function recordUndo(date: string, level: DailyLevel): Promise<UndoResponse> {
  return { undos: bumpCount(undosKey(date, level)) };
}

export async function submitRun(date: string, level: DailyLevel, actions: RunAction[], timeMs: number): Promise<SubmitResponse> {
  const puzzle = pickPuzzle(PUZZLES[level], date);
  const replay = replayRun(puzzle.pieces, parseTarget(puzzle.target), actions);
  if (!("moves" in replay)) return { ok: false, reason: replay.reason };
  const result: DailyResult = {
    moves: replay.moves,
    undos: Math.max(0, readCount(attemptsKey(date, level)) - 1) + readCount(undosKey(date, level)),
    hints: readCount(hintsKey(date, level)),
    par: puzzle.par,
    timeMs: Math.round(timeMs),
  };
  // Only the first solve counts; replays keep the result already in.
  const results = saveDailyResult(level, date, result);
  return { ok: true, result: saved(results[level][date]), stats: dailyStats(results[level], date), leaderboard: NO_BOARD };
}

export async function requestHint(date: string, level: DailyLevel, actions: RunAction[]): Promise<HintResponse> {
  const puzzle = pickPuzzle(PUZZLES[level], date);
  const target = parseTarget(puzzle.target);
  const cursor = replayTo(puzzle.pieces, target, actions);
  if (typeof cursor === "string" || cursor.solved) return { ok: false, reason: typeof cursor === "string" ? cursor : "already solved" };
  // The search can take a moment; let the button's cooldown paint first.
  await new Promise((resolve) => setTimeout(resolve, 0));
  // The par solutions stay off the public site, so there's no fallback when the search runs out of time.
  const hint = hintFor(puzzle.pieces, target, actions, puzzle.par);
  // Only hints before the first solve count; replays afterwards are practice.
  const counted = !!hint && !loadDailyResults()[level][date];
  return { ok: true, hint, hints: counted ? bumpCount(hintsKey(date, level)) : 0 };
}

export const fetchLeaderboard = async (): Promise<LeaderboardResponse> => NO_BOARD;

export const postComment = async (): Promise<CommentResponse> => ({ ok: false, reason: "not on Reddit" });
