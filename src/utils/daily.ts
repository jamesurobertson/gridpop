import { GridType, TetrominoType } from "@/types/game";
import { DAILY_LEVELS, DailyLevel, DailyResult, emojiBoard, formatClock, shiftDate, utcDateKey } from "./dailyCore";

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
  return { played: dates.length, streak, bestStreak };
}

// ---------- sharing ----------


export function dailyShareText(setup: DailySetup, result: DailyResult) {
  const label = DAILY_LEVELS.find((option) => option.level === setup.level)?.label;
  return `GridPop #${setup.number} ${label} · ${formatClock(result.timeMs)}\n${emojiBoard(setup.target)}`;
}
