import { useEffect, useState } from "react";
import { context, requestExpandedMode } from "@devvit/web/client";
import { Flame } from "lucide-react";
import TargetGrid from "@/components/game/TargetGrid";
import { DAILY_LEVELS, DailyLevel, dailyScore, parseTarget, puzzleNumber, utcDateKey } from "@/utils/dailyCore";
import type { PuzzleResponse } from "../shared/api";
import { fetchPuzzle, saveLevel } from "./api";
import { cn } from "@/lib/utils";
import { createEmptyGrid } from "@/utils/gameLogic";

const postDate = () => {
  const date = (context?.postData as { date?: unknown } | undefined)?.date;
  return typeof date === "string" ? date : utcDateKey();
};

// The last answer for this post, so a reload draws the cards at once while a fresh one loads.
const cacheKey = (date: string) => `gridpop-splash:${date}`;

function cachedPuzzle(date: string): PuzzleResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(date));
    return raw ? (JSON.parse(raw) as PuzzleResponse) : null;
  } catch {
    return null;
  }
}

function cachePuzzle(puzzle: PuzzleResponse) {
  try {
    localStorage.setItem(cacheKey(puzzle.date), JSON.stringify(puzzle));
  } catch {
    // Storage blocked or full: the next load waits for the server instead.
  }
}

// Holds the cards' space until the puzzle arrives, so nothing shifts when they fade in.
const BLANK = createEmptyGrid(4);

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/** The static wordmark (the animated one would pull the animation library into the feed). */
const Wordmark = () => (
  <h1 className="gp-logo text-[34px]" aria-label="GridPop">
    <span className="gp-logo-mark" aria-hidden>
      {["#FFD45E", "#7CCBFF", "#7BDEA3", "#FF5A6E"].map((color) => (
        <i key={color} style={{ background: color }} />
      ))}
    </span>
    <span className="gp-logo-word">Grid</span>
    <span className="gp-logo-pop" aria-hidden>
      {(
        [
          ["P", "#FFD45E", "#D9A12A", "#6E4300", -7],
          ["O", "#7CCBFF", "#3A93D2", "#08436B", 4],
          ["P", "#FF5A6E", "#C92841", "#FFFFFF", -3],
        ] as const
      ).map(([letter, face, edge, text, tilt], i) => (
        <span
          key={i}
          className="gp-logo-tile"
          style={{
            ["--f" as string]: face,
            ["--e" as string]: edge,
            ["--t" as string]: text,
            ["--r" as string]: `${tilt}deg`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  </h1>
);

export const Splash = () => {
  const date = postDate();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(() => cachedPuzzle(date));

  useEffect(() => {
    fetchPuzzle()
      .then((fresh) => {
        setPuzzle(fresh);
        cachePuzzle(fresh);
      })
      .catch(() => undefined);
  }, []);

  const play = (event: React.MouseEvent, level: DailyLevel) => {
    saveLevel(level);
    requestExpandedMode(event.nativeEvent, "game");
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-5">
      <Wordmark />
      <div className="text-center">
        <div className="gp-value text-xl">Daily #{puzzleNumber(date)}</div>
        <div className="text-sm font-bold text-[color:var(--gp-muted)]">{dayName(date)}</div>
      </div>
      <div className={cn("grid w-full max-w-[420px] grid-cols-3 gap-2.5 transition-opacity duration-200", puzzle ? "opacity-100" : "opacity-0")}>
        {DAILY_LEVELS.map(({ level, label }) => {
          const result = puzzle?.results[level];
          const streak = puzzle?.stats[level].streak ?? 0;
          return (
            <button key={level} className="gp-card flex flex-col items-center gap-2 p-2.5 transition-transform active:scale-95" onClick={(e) => play(e, level)}>
              <span className="font-display text-base font-bold">{label}</span>
              <TargetGrid grid={puzzle ? parseTarget(puzzle.levels[level].target) : BLANK} className="w-full" />
              {result ? (
                <span className="flex min-h-[32px] items-center gap-2 text-sm font-extrabold">
                  <span className="text-[color:var(--gp-muted)]">Score {dailyScore(result)}</span>
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Flame size={14} strokeWidth={2.75} className="text-[#FF7A3D]" />
                      {streak}
                    </span>
                  )}
                </span>
              ) : (
                <span className="gp-btn gp-btn-primary pointer-events-none !min-h-[32px] w-full !px-2 text-sm">Play</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
