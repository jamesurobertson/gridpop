import { GridType, TetrominoType } from "@/types/game";
import puzzles from "@/data/dailyPuzzles.json";
import {
  DAILY_LEVELS,
  DailyLevel,
  DailyPuzzle,
  DailyResult,
  dailyScore,
  dayIndex,
  emojiBoard,
  formatClock,
  overParBucket,
  parseTarget,
  pickPuzzle,
  shiftDate,
  utcDateKey,
} from "./dailyCore";

export * from "./dailyCore";


export interface DailySetup {
  date: string;
  level: DailyLevel;
  number: number;
  pieces: TetrominoType[];
  target: GridType;
  par: number;
  /** This puzzle's result is already in: show the finished board instead of a fresh run. */
  showSolved: boolean;
}


type DailyResults = Record<DailyLevel, Record<string, DailyResult>>;

const RESULTS_KEY = "gridpop-daily-results-v2";
const PROGRESS_KEY = "gridpop-daily-progress";
const LEVEL_KEY = "gridpop-daily-level";


export const isToday = (date: string) => date === utcDateKey();

export function loadDailyLevel(): DailyLevel {
  try {
    const saved = localStorage.getItem(LEVEL_KEY);
    return DAILY_LEVELS.some((option) => option.level === saved) ? (saved as DailyLevel) : "normal";
  } catch {
    return "normal";
  }
}

export function saveDailyLevel(level: DailyLevel) {
  try {
    localStorage.setItem(LEVEL_KEY, level);
  } catch {
    // Private mode: Normal again next visit.
  }
}

export function dailySetup(date: string, level: DailyLevel): DailySetup {
  const list = (puzzles as unknown as Record<DailyLevel, DailyPuzzle[]>)[level];
  const puzzle = pickPuzzle(list, date);
  return {
    date,
    level,
    number: dayIndex(date) + 1,
    pieces: puzzle.pieces,
    target: parseTarget(puzzle.target),
    par: puzzle.par,
    showSolved: !!loadDailyResults()[level][date],
  };
}


// ---------- results and streaks ----------

export function loadDailyResults(): DailyResults {
  const empty: DailyResults = { easy: {}, normal: {}, hard: {} };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "{}") };
  } catch {
    return empty;
  }
}

/** Keeps the first result for a puzzle; replays don't replace it. */
export function saveDailyResult(level: DailyLevel, date: string, result: DailyResult) {
  const results = loadDailyResults();
  if (results[level][date]) return results;
  results[level] = { ...results[level], [date]: result };
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch {
    // Storage blocked (private mode): the result still shows for this visit.
  }
  return results;
}

export interface DailyStats {
  played: number;
  streak: number;
  bestStreak: number;
  /** Solves at par, +1, +2 and +3 or more. */
  overPar: [number, number, number, number];
}

export function dailyStats(results: Record<string, DailyResult>, today = utcDateKey()): DailyStats {
  const dates = Object.keys(results).sort();
  let bestStreak = 0;
  let run = 0;
  dates.forEach((date, i) => {
    run = i > 0 && shiftDate(dates[i - 1], 1) === date ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });
  // A streak stays alive through today until today's puzzle is done.
  let cursor = results[today] ? today : shiftDate(today, -1);
  let streak = 0;
  while (results[cursor]) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  const overPar: DailyStats["overPar"] = [0, 0, 0, 0];
  for (const result of Object.values(results)) overPar[overParBucket(dailyScore(result), result.par)]++;
  return { played: dates.length, streak, bestStreak, overPar };
}

// ---------- progress: the running clock and run count per puzzle, kept across restarts and reloads ----------

export interface DailyProgress {
  elapsedMs: number;
  /** Runs where at least one piece was placed; every one after the first is a restart. */
  attempts: number;
}

const progressId = (setup: Pick<DailySetup, "date" | "level">) => `${setup.date}/${setup.level}`;

export function loadDailyProgress(setup: Pick<DailySetup, "date" | "level">): DailyProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    return { elapsedMs: 0, attempts: 0, ...saved[progressId(setup)] };
  } catch {
    return { elapsedMs: 0, attempts: 0 };
  }
}

export function saveDailyProgress(setup: Pick<DailySetup, "date" | "level">, progress: DailyProgress) {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    // Only today's progress is worth keeping.
    const kept = Object.fromEntries(Object.entries(saved).filter(([id]) => id.startsWith(setup.date)));
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...kept, [progressId(setup)]: progress }));
  } catch {
    // Private mode: the clock and restarts just start over on reload.
  }
}

// ---------- sharing ----------


export function dailyShareText(setup: DailySetup, result: DailyResult, { withGoal = true } = {}) {
  const label = DAILY_LEVELS.find((option) => option.level === setup.level)?.label;
  const board = emojiBoard(setup.target);
  const goal = withGoal ? ` · Goal ${result.par}` : "";
  return `GridPop #${setup.number} ${label} · Score ${dailyScore(result)}${goal} · ${formatClock(result.timeMs)}\n${board}`;
}
