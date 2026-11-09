import { context } from "@devvit/web/client";
import { easternDateKey } from "@/utils/dailyCore";
import type { PuzzleResponse } from "../shared/api";

/** The date this post's puzzle is for (today's, outside a post). */
export const postDate = () => {
  const date = (context as { postData?: { date?: unknown } } | undefined)?.postData?.date;
  return typeof date === "string" ? date : easternDateKey();
};

// The last answer for this post, so the post's cards and the game draw at once while a fresh one loads.
const cacheKey = (date: string) => `gridpop-splash:${date}`;

export function cachedPuzzle(date: string): PuzzleResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(date));
    return raw ? (JSON.parse(raw) as PuzzleResponse) : null;
  } catch {
    return null;
  }
}

export function cachePuzzle(puzzle: PuzzleResponse) {
  try {
    localStorage.setItem(cacheKey(puzzle.date), JSON.stringify(puzzle));
  } catch {
    // Storage blocked or full: the next load waits for the server instead.
  }
}
