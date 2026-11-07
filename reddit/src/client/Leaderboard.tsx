import { context } from "@devvit/web/client";
import { useState } from "react";
import { formatClock } from "@/utils/dailyCore";
import { Lightbulb, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardResponse } from "../shared/api";

const Count = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <span className="inline-flex items-center gap-0.5 tabular-nums" title={label} aria-label={`${value} ${label}`}>
    {icon}
    {value}
  </span>
);

const COLUMNS = "grid-cols-[1.25rem_minmax(0,1fr)_2.25rem_2.75rem]";

// Reddit names run to 20 characters; longer ones step down a size so they fit a phone row whole.
const nameSize = (name: string) => (name.length > 17 ? "text-[12px] tracking-[-0.01em]" : name.length > 14 ? "text-[13px]" : undefined);

// Ranked by moves, then time; hints and restarts are shown, not ranked. They follow the name on its
// line; a name too long for both wraps rather than being cut.
const Row = ({ entry, mine, placeholder }: { entry: LeaderboardEntry; mine: boolean; placeholder?: boolean }) => {
  // A placeholder draws the same text, invisible on a soft bar, so it takes exactly a real row's size.
  const bar = placeholder ? "rounded-md bg-[#F1E9DD] text-transparent" : undefined;
  return (
    <li className={cn("grid items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-extrabold", COLUMNS, mine && !placeholder && "bg-[#EFEAFF]")} aria-hidden={placeholder}>
      <span className={cn("text-[color:var(--gp-muted)]", bar)}>{entry.rank}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-left leading-tight">
        <span className={cn("[overflow-wrap:anywhere]", nameSize(entry.username), bar)}>{entry.username}</span>
        {!placeholder && (entry.hints > 0 || entry.restarts > 0) && (
          <span className="flex gap-2 text-[11px] leading-none text-[color:var(--gp-muted)]">
            {entry.hints > 0 && <Count icon={<Lightbulb size={11} strokeWidth={2.75} />} value={entry.hints} label="hints" />}
            {entry.restarts > 0 && <Count icon={<RotateCcw size={10} strokeWidth={3} />} value={entry.restarts} label="restarts" />}
          </span>
        )}
      </span>
      <span className={cn("gp-value justify-self-end text-base", bar)}>{entry.moves}</span>
      <span className={cn("justify-self-end text-[color:var(--gp-muted)]", bar)}>{formatClock(entry.timeMs)}</span>
    </li>
  );
};

// Each install keeps its own data, so the board is this subreddit's.
const subreddit = (() => {
  try {
    return context?.subredditName || null;
  } catch {
    return null;
  }
})();

const Header = ({ total }: { total: number }) => (
  <div className={cn("gp-label mb-1.5 grid gap-1.5 px-2.5", COLUMNS)}>
    <span className="col-span-2 truncate">
      {subreddit ? <span className="normal-case tracking-normal">r/{subreddit}</span> : "Leaderboard"} · {total}
    </span>
    <span className="text-right">Moves</span>
    <span className="text-right">Time</span>
  </div>
);

/** The top few on the results card, so it fits a phone without scrolling; "Show more" opens the rest. */
const FOLDED_ROWS = 3;

export const Leaderboard = ({ board, username }: { board: LeaderboardResponse | null; username: string | null }) => {
  const [expanded, setExpanded] = useState(false);
  if (!board || board.total === 0) return null;
  const shown = expanded ? board.top : board.top.slice(0, FOLDED_ROWS);
  const meShown = board.me && shown.some((entry) => entry.rank === board.me!.rank);
  return (
    <div className="mt-3 text-left [@media(max-height:640px)]:mt-2">
      <Header total={board.total} />
      <ol className="space-y-0.5">
        {shown.map((entry) => (
          <Row key={entry.rank} entry={entry} mine={entry.username === username} />
        ))}
        {board.me && !meShown && (
          <>
            <li className="px-2.5 text-center text-xs text-[color:var(--gp-muted)]">⋯</li>
            <Row entry={board.me} mine />
          </>
        )}
      </ol>
      {shown.length < board.top.length && (
        <button className="mx-auto mt-1 block px-3 py-1 text-xs font-extrabold text-[color:var(--gp-accent)] [@media(max-height:640px)]:mt-0 [@media(max-height:640px)]:py-0.5" onClick={() => setExpanded(true)}>
          Show more
        </button>
      )}
    </div>
  );
};

const SAMPLE: LeaderboardEntry = { rank: 1, username: "placeholder_name", score: 3, moves: 3, restarts: 0, hints: 0, timeMs: 30_000 };

/**
 * The leaderboard's shape while it loads, sized from the player's saved rank and the day's count,
 * so nothing moves when the real rows arrive. `pulse` starts once loading is slow enough to notice.
 */
export const LeaderboardSkeleton = ({ rank, total, pulse }: { rank: number; total: number; pulse: boolean }) => {
  const top = Math.min(FOLDED_ROWS, total);
  return (
    <div className={cn("mt-3 text-left [@media(max-height:640px)]:mt-2", pulse && "animate-pulse")} role="status" aria-label="Loading leaderboard">
      <Header total={total} />
      <ol className="space-y-0.5">
        {Array.from({ length: top }, (_, i) => (
          <Row key={i} entry={{ ...SAMPLE, rank: i + 1, username: SAMPLE.username.slice(0, 16 - (i % 3) * 3) }} mine={false} placeholder />
        ))}
        {rank > top && (
          <>
            <li className="px-2.5 text-center text-xs text-[color:var(--gp-muted)]">⋯</li>
            <Row entry={{ ...SAMPLE, rank }} mine={false} placeholder />
          </>
        )}
      </ol>
      {total > FOLDED_ROWS && <span className="mx-auto mt-1 block px-3 py-1 text-xs font-extrabold text-transparent [@media(max-height:640px)]:mt-0 [@media(max-height:640px)]:py-0.5">Show more</span>}
    </div>
  );
};
