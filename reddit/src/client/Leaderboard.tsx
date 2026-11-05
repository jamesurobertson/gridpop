import { formatClock } from "@/utils/dailyCore";
import { Lightbulb, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardResponse } from "../shared/api";

const Count = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <span className={cn("inline-flex items-center justify-end gap-0.5 tabular-nums", value === 0 && "opacity-35")} title={label} aria-label={`${value} ${label}`}>
    {icon}
    {value}
  </span>
);

// Ranked by moves, then hints, then restarts, then time.
const Row = ({ entry, mine }: { entry: LeaderboardEntry; mine: boolean }) => (
  <li className={cn("grid grid-cols-[1.75rem_1fr_2rem_2.25rem_2.25rem_3.25rem] items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-extrabold", mine && "bg-[#EFEAFF]")}>
    <span className="text-[color:var(--gp-muted)]">{entry.rank}</span>
    <span className="truncate text-left">{entry.username}</span>
    <span className="gp-value text-right text-base">{entry.moves}</span>
    <Count icon={<Lightbulb size={13} strokeWidth={2.75} />} value={entry.hints} label="hints" />
    <Count icon={<RotateCcw size={12} strokeWidth={3} />} value={entry.restarts} label="restarts" />
    <span className="text-right text-[color:var(--gp-muted)]">{formatClock(entry.timeMs)}</span>
  </li>
);

export const Leaderboard = ({ board, username }: { board: LeaderboardResponse | null; username: string | null }) => {
  if (!board || board.total === 0) return null;
  const meShown = board.me && board.top.some((entry) => entry.rank === board.me!.rank);
  return (
    <div className="mt-4 text-left">
      <div className="gp-label mb-1.5 grid grid-cols-[1.75rem_1fr_2rem_2.25rem_2.25rem_3.25rem] gap-1.5 px-2.5">
        <span className="col-span-2 truncate whitespace-nowrap">Leaderboard · {board.total}</span>
        <span className="text-right">Moves</span>
        <Lightbulb size={12} strokeWidth={3} className="justify-self-end" aria-label="Hints" />
        <RotateCcw size={11} strokeWidth={3} className="justify-self-end" aria-label="Restarts" />
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
