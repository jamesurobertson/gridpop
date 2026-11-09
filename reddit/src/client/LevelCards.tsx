import { Timer } from "lucide-react";
import TargetGrid from "@/components/game/TargetGrid";
import { DAILY_LEVELS, DailyLevel, formatClock, parseTarget } from "@/utils/dailyCore";
import { createEmptyGrid } from "@/utils/gameLogic";
import { cn } from "@/lib/utils";
import type { PuzzleResponse } from "../shared/api";

const EMPTY_TARGET = createEmptyGrid(4);

/** Easy, Normal and Hard side by side: each target, and the time once it's solved. */
export const LevelCards = ({
  puzzle,
  onPick,
  ready = true,
  reveal,
  shimmer,
}: {
  puzzle: PuzzleResponse | null;
  onPick: (event: React.MouseEvent, level: DailyLevel) => void;
  /** False while loading: blank targets, no results. */
  ready?: boolean;
  /** Pops the target tiles in. */
  reveal?: boolean;
  /** Shimmers the blank targets, once loading is slow enough to notice. */
  shimmer?: boolean;
}) => (
  <div className="grid w-full max-w-[420px] grid-cols-3 gap-2.5">
    {DAILY_LEVELS.map(({ level, label }) => {
      const result = ready ? puzzle?.results[level] : null;
      return (
        <button key={level} className="gp-card flex flex-col items-center gap-2 p-2.5 transition-transform active:scale-95" onClick={(e) => onPick(e, level)}>
          <span className="font-display text-base font-bold">{label}</span>
          {puzzle && ready ? (
            <TargetGrid grid={parseTarget(puzzle.levels[level].target)} reveal={reveal} className="w-full" />
          ) : (
            <TargetGrid grid={EMPTY_TARGET} shimmer={shimmer} className="w-full" />
          )}
          {!ready ? (
            // Until it loads, neither Play nor a time: either could be wrong for this player.
            <span className={cn("block h-[32px] w-full rounded-full bg-[#F1E9DD]", shimmer && "animate-pulse")} aria-hidden />
          ) : result ? (
            <span className="flex min-h-[32px] flex-col items-center justify-center text-sm font-extrabold leading-tight tabular-nums">
              {result.rank > 0 && <span className="whitespace-nowrap text-[color:var(--gp-muted)]">#{result.rank}</span>}
              <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                <Timer size={14} strokeWidth={2.75} className="text-[color:var(--gp-muted)]" />
                {formatClock(result.timeMs)}
              </span>
            </span>
          ) : (
            <span className="gp-btn gp-btn-primary pointer-events-none !min-h-[32px] w-full !px-2 text-sm">Play</span>
          )}
        </button>
      );
    })}
  </div>
);
