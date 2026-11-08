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
