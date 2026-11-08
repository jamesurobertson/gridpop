import type { DailyLevel } from "@/utils/dailyCore";

// The level picked on the post card, read by the full-screen game (both pages share storage).
const LEVEL_KEY = "gridpop-level";

export function loadLevel(): DailyLevel {
  try {
    const saved = localStorage.getItem(LEVEL_KEY);
    return saved === "easy" || saved === "hard" ? saved : "normal";
  } catch {
    return "normal";
  }
}

export function saveLevel(level: DailyLevel) {
  try {
    localStorage.setItem(LEVEL_KEY, level);
  } catch {
    // Storage blocked: the game opens on Normal.
  }
}

/** The clock for each puzzle, so a reload carries on where it was. */
export function loadClock(date: string, level: DailyLevel): number {
  try {
    return Number(localStorage.getItem(`gridpop-clock:${date}:${level}`) ?? 0);
  } catch {
    return 0;
  }
}

export function saveClock(date: string, level: DailyLevel, ms: number) {
  try {
    localStorage.setItem(`gridpop-clock:${date}:${level}`, String(Math.round(ms)));
  } catch {
    // Storage blocked: the clock restarts on reload.
  }
}
