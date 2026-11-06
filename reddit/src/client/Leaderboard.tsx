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

// Ranked by moves, then hints, then restarts, then time. Hints and restarts sit under the name so
// the name gets the row's spare width; a name too long even for that wraps rather than being cut.
const Row = ({ entry, mine }: { entry: LeaderboardEntry; mine: boolean }) => (
  <li className={cn("grid items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-extrabold", COLUMNS, mine && "bg-[#EFEAFF]")}>
    <span className="text-[color:var(--gp-muted)]">{entry.rank}</span>
    <span className="min-w-0 text-left">
      <span className={cn("block leading-tight [overflow-wrap:anywhere]", nameSize(entry.username))}>{entry.username}</span>
      {(entry.hints > 0 || entry.restarts > 0) && (
        <span className="mt-0.5 flex gap-2 text-[11px] leading-none text-[color:var(--gp-muted)]">
          {entry.hints > 0 && <Count icon={<Lightbulb size={11} strokeWidth={2.75} />} value={entry.hints} label="hints" />}
          {entry.restarts > 0 && <Count icon={<RotateCcw size={10} strokeWidth={3} />} value={entry.restarts} label="restarts" />}
        </span>
      )}
    </span>
    <span className="gp-value text-right text-base">{entry.moves}</span>
    <span className="text-right text-[color:var(--gp-muted)]">{formatClock(entry.timeMs)}</span>
  </li>
);

export const Leaderboard = ({ board, username }: { board: LeaderboardResponse | null; username: string | null }) => {
  if (!board || board.total === 0) return null;
  const meShown = board.me && board.top.some((entry) => entry.rank === board.me!.rank);
  return (
    <div className="mt-4 text-left">
      <div className={cn("gp-label mb-1.5 grid gap-1.5 px-2.5", COLUMNS)}>
        <span className="col-span-2 whitespace-nowrap">Leaderboard · {board.total}</span>
        <span className="text-right">Moves</span>
        <span className="text-right">Time</span>
      </div>
      <ol className="space-y-0.5">
        {board.top.map((entry) => (
          <Row key={entry.rank} entry={entry} mine={entry.username === username} />
        ))}
        {board.me && !meShown && (
          <>
            <li className="px-2.5 text-center text-xs text-[color:var(--gp-muted)]">⋯</li>
            <Row entry={board.me} mine />
          </>
        )}
      </ol>
    </div>
  );
};
