import { context } from "@devvit/web/client";
import { useState } from "react";
import { formatClock } from "@/utils/dailyCore";
import { Lightbulb, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardResponse } from "../shared/api";

const COLUMNS = "grid-cols-[1.25rem_minmax(0,1fr)_1.75rem_1.75rem_3.25rem]";

// Reddit names run to 20 characters; longer ones step down a size so they fit a phone row whole.
const nameSize = (name: string) => (name.length > 17 ? "text-[12px] tracking-[-0.01em]" : name.length > 14 ? "text-[13px]" : undefined);

// Ranked by time; hints and undos get their own columns but don't rank. A long name wraps rather
// than being cut.
const Row = ({ entry, mine, placeholder }: { entry: LeaderboardEntry; mine: boolean; placeholder?: boolean }) => {
  // A placeholder draws the same text, invisible on a soft bar, so it takes exactly a real row's size.
  const bar = placeholder ? "rounded-md bg-[#F1E9DD] text-transparent" : undefined;
  return (
    <li className={cn("grid items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm font-extrabold", COLUMNS, mine && !placeholder && "bg-[#EFEAFF]")} aria-hidden={placeholder}>
      <span className={cn("text-[color:var(--gp-muted)]", bar)}>{entry.rank}</span>
      <span className={cn("min-w-0 text-left leading-tight [overflow-wrap:anywhere]", nameSize(entry.username), bar)}>{entry.username}</span>
      <span className={cn("text-center tabular-nums text-[color:var(--gp-muted)]", entry.hints === 0 && "opacity-40", bar)} aria-label={`${entry.hints} hints`}>
        {entry.hints}
      </span>
      <span className={cn("text-center tabular-nums text-[color:var(--gp-muted)]", entry.undos === 0 && "opacity-40", bar)} aria-label={`${entry.undos} undos`}>
        {entry.undos}
      </span>
      <span className={cn("gp-value justify-self-end text-base", bar)}>{formatClock(entry.timeMs)}</span>
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
    <span className="flex justify-center" title="Hints" aria-label="Hints">
      <Lightbulb size={13} strokeWidth={2.75} />
    </span>
    <span className="flex justify-center" title="Undos" aria-label="Undos">
      <Undo2 size={13} strokeWidth={3} />
    </span>
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

const SAMPLE: LeaderboardEntry = { rank: 1, username: "placeholder_name", moves: 3, undos: 0, hints: 0, timeMs: 30_000 };

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
