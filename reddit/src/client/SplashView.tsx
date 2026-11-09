import { useEffect, useState } from "react";
import { context, requestExpandedMode } from "@devvit/web/client";
import { DailyLevel, puzzleNumber, easternDateKey } from "@/utils/dailyCore";
import type { PuzzleResponse } from "../shared/api";
import { fetchPuzzle } from "./api";
import { saveLevel } from "./storage";
import { usePatientLoading } from "./Loader";
import { LevelCards } from "./LevelCards";

const postDate = () => {
  const date = (context?.postData as { date?: unknown } | undefined)?.date;
  return typeof date === "string" ? date : easternDateKey();
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

const dayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/** The wordmark, animated in plain CSS (the game's version would pull the animation library into the feed). */
const Wordmark = () => (
  <h1 className="gp-logo text-[34px]" aria-label="GridPop">
    <span className="gp-logo-mark gp-logo-mark-in" aria-hidden>
      {["#FFD45E", "#7CCBFF", "#7BDEA3", "#FF5A6E"].map((color, i) => (
        <i key={color} style={{ background: color }} className={i === 3 ? "gp-logo-mark-pop" : undefined} />
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
        <span key={i} className="gp-logo-drop" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
          <span
            className="gp-logo-tile"
            style={{
              ["--f" as string]: face,
              ["--e" as string]: edge,
              ["--t" as string]: text,
              ["--r" as string]: `${tilt}deg`,
              ["--d" as string]: `${1.2 + i * 0.12}s`,
            }}
          >
            {letter}
          </span>
        </span>
      ))}
    </span>
  </h1>
);

export const Splash = () => {
  const date = postDate();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(() => cachedPuzzle(date));
  // A cached card draws at once; only one that waited on the network gets the tiles popping in.
  const [waited] = useState(() => puzzle === null);
  const { showLoader, ready } = usePatientLoading(!puzzle);

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
      <LevelCards puzzle={puzzle} onPick={play} ready={ready} reveal={waited} shimmer={showLoader} />
    </div>
  );
};
