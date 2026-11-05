import type { DailyLevel } from "@/utils/dailyCore";
import type { RunAction } from "@/utils/dailyRun";
import type { AttemptResponse, CommentResponse, HintResponse, LeaderboardResponse, PuzzleResponse, SubmitResponse } from "../shared/api";

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json()) as T;
  if (!res.ok && !(data && typeof data === "object" && "ok" in data)) throw new Error(`${path}: HTTP ${res.status}`);
  return data;
}

export const fetchPuzzle = () => call<PuzzleResponse>("/api/puzzle");
export const recordAttempt = (date: string, level: DailyLevel) => call<AttemptResponse>("/api/attempt", { date, level });
export const submitRun = (date: string, level: DailyLevel, actions: RunAction[], timeMs: number) =>
  call<SubmitResponse>("/api/submit", { date, level, actions, timeMs });
export const fetchLeaderboard = (level: DailyLevel) => call<LeaderboardResponse>(`/api/leaderboard?level=${level}`);
export const postComment = (text: string) => call<CommentResponse>("/api/comment", { text });
export const requestHint = (date: string, level: DailyLevel, actions: RunAction[]) => call<HintResponse>("/api/hint", { date, level, actions });

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
