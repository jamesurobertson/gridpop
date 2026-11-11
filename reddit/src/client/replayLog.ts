import type { DailyLevel } from "@/utils/dailyCore";
import type { Placement, RunAction } from "@/utils/dailyRun";

/** Everything done on the way to a solve, undos and restarts included, for the replay. */
export type ReplayStep = ({ type: "place" } & Placement) | { type: "undo" } | { type: "restart" };

const replayKey = (date: string, level: DailyLevel) => `gridpop-replay:${date}:${level}`;

export function loadReplay(date: string, level: DailyLevel): ReplayStep[] {
  try {
    const raw = localStorage.getItem(replayKey(date, level));
    return raw ? (JSON.parse(raw) as ReplayStep[]) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a step. A run started before the log existed (picked up after a reload) is seeded with the
 * placements already on the board, so the replay starts from an empty board too.
 */
export function recordStep(date: string, level: DailyLevel, step: ReplayStep, runSoFar: RunAction[]) {
  const steps = loadReplay(date, level);
  const seeded: ReplayStep[] =
    steps.length > 0 ? steps : runSoFar.flatMap((action) => (action.type === "place" ? [{ type: "place", rotation: action.rotation, x: action.x, y: action.y }] : []));
  try {
    localStorage.setItem(replayKey(date, level), JSON.stringify([...seeded, step]));
  } catch {
    // Storage blocked: there's no replay for this puzzle.
  }
}
