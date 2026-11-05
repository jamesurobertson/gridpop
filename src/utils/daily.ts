import { CellValue, GridType, TetrominoType } from "@/types/game";
import puzzles from "@/data/dailyPuzzles.json";

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

export interface DailyResult {
  moves: number;
  par: number;
  timeMs: number;
}

type DailyResults = Record<DailyLevel, Record<string, DailyResult>>;

const DAY_MS = 86_400_000;
const FIRST_DAY = "2026-11-05";
const RESULTS_KEY = "gridpop-daily-results-v2";
const CLOCK_KEY = "gridpop-daily-clock-v2";
const LEVEL_KEY = "gridpop-daily-level";

export const utcDateKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

const dayIndex = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / DAY_MS);

const shiftDate = (date: string, days: number) => utcDateKey(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);

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
  // Past the end of the generated list, the puzzles come round again rather than stop.
  const index = dayIndex(date);
  const puzzle = list.find((p) => p.date === date) ?? list[((index % list.length) + list.length) % list.length];
  return {
    date,
    level,
    number: index + 1,
    pieces: puzzle.pieces,
    target: puzzle.target.split("/").map((row) => [...row].map(Number) as CellValue[]),
    par: puzzle.par,
    showSolved: !!loadDailyResults()[level][date],
  };
}

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
  for (const result of Object.values(results)) overPar[Math.min(3, Math.max(0, result.moves - result.par))]++;
  return { played: dates.length, streak, bestStreak, overPar };
}

// ---------- the clock: one running total per puzzle, kept across restarts and reloads ----------

const clockId = (setup: Pick<DailySetup, "date" | "level">) => `${setup.date}/${setup.level}`;

export function loadDailyClock(setup: Pick<DailySetup, "date" | "level">): number {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOCK_KEY) ?? "{}");
    return saved[clockId(setup)] ?? 0;
  } catch {
    return 0;
  }
}

export function saveDailyClock(setup: Pick<DailySetup, "date" | "level">, elapsedMs: number) {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOCK_KEY) ?? "{}");
    // Only today's clocks are worth keeping.
    const kept = Object.fromEntries(Object.entries(saved).filter(([id]) => id.startsWith(setup.date)));
    localStorage.setItem(CLOCK_KEY, JSON.stringify({ ...kept, [clockId(setup)]: elapsedMs }));
  } catch {
    // Private mode: the clock just starts over on reload.
  }
}

// ---------- sharing ----------

const TILE_EMOJI = ["⬛", "🟨", "🟦", "🟩", "🟪", "🟧", "🟥"];

export function dailyShareText(setup: DailySetup, result: DailyResult) {
  const label = DAILY_LEVELS.find((option) => option.level === setup.level)?.label;
  const board = setup.target.map((row) => row.map((value) => TILE_EMOJI[value] ?? "⬛").join("")).join("\n");
  return `GridPop #${setup.number} ${label} ⛳ ${result.moves} (par ${result.par}) ⏱ ${formatClock(result.timeMs)}\n${board}`;
}
