import { useEffect, useState } from "react";
import { context, requestExpandedMode } from "@devvit/web/client";
import TargetGrid from "@/components/game/TargetGrid";
import { DAILY_LEVELS, DailyLevel, dailyScore, parseTarget, puzzleNumber, utcDateKey } from "@/utils/dailyCore";
import type { PuzzleResponse } from "../shared/api";
import { fetchPuzzle, saveLevel } from "./api";

const postDate = () => {
  const date = (context?.postData as { date?: unknown } | undefined)?.date;
  return typeof date === "string" ? date : utcDateKey();
};

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

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
        <span key={i} className="gp-logo-tile" style={{ ["--f" as string]: face, ["--e" as string]: edge, ["--t" as string]: text, ["--r" as string]: `${tilt}deg` }}>
          {letter}
        </span>
      ))}
    </span>
  </h1>
);

export const Splash = () => {
  const date = postDate();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);

  useEffect(() => {
    fetchPuzzle().then(setPuzzle).catch(() => undefined);
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
      <div className="grid w-full max-w-[420px] grid-cols-3 gap-2.5">
        {DAILY_LEVELS.map(({ level, label }) => {
          const levelPuzzle = puzzle?.levels[level];
          const result = puzzle?.results[level];
          const streak = puzzle?.stats[level].streak ?? 0;
          return (
            <button key={level} className="gp-card flex flex-col items-center gap-2 p-2.5 transition-transform active:scale-95" onClick={(e) => play(e, level)}>
              <span className="font-display text-base font-bold">{label}</span>
              {levelPuzzle ? <TargetGrid grid={parseTarget(levelPuzzle.target)} className="w-full" /> : <span className="aspect-square w-full rounded-2xl bg-[#F1E7DA]" />}
              <span className="text-xs font-extrabold text-[color:var(--gp-muted)]">
                {result ? `Score ${dailyScore(result)}` : " "}
              </span>
              {streak > 0 && <span className="text-xs font-extrabold">🔥 {streak}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
