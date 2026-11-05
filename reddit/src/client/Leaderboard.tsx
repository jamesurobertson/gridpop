import { formatClock } from "@/utils/dailyCore";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, LeaderboardResponse } from "../shared/api";

const Row = ({ entry, mine }: { entry: LeaderboardEntry; mine: boolean }) => (
  <li className={cn("grid grid-cols-[2rem_1fr_auto_3.5rem] items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-extrabold", mine && "bg-[#EFEAFF]")}>
    <span className="text-[color:var(--gp-muted)]">{entry.rank}</span>
    <span className="truncate text-left">{entry.username}</span>
    <span className="gp-value text-base">{entry.score}</span>
    <span className="text-right text-[color:var(--gp-muted)]">{formatClock(entry.timeMs)}</span>
  </li>
);

export const Leaderboard = ({ board, username }: { board: LeaderboardResponse | null; username: string | null }) => {
  if (!board || board.total === 0) return null;
  const meShown = board.me && board.top.some((entry) => entry.rank === board.me!.rank);
  return (
    <div className="mt-4 text-left">
      <div className="gp-label mb-1.5 flex justify-between px-2.5">
        <span>Leaderboard</span>
        <span>{board.total}</span>
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
