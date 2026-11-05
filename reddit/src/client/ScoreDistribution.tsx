import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Distribution } from "../shared/api";

// Past this many bars the tail folds into one "N+" bar, so bars stay wide enough to tap.
const MAX_BARS = 12;
const PLOT_HEIGHT = 84;

type Bar = { label: string; low: number; high: number; count: number };

function toBars(distribution: Distribution): Bar[] {
  const low = distribution[0].score;
  const high = distribution[distribution.length - 1].score;
  const last = Math.min(high, low + MAX_BARS - 1);
  const bars: Bar[] = [];
  for (let score = low; score <= last; score++) {
    const folded = score === last && last < high;
    const inBar = distribution.filter((d) => (folded ? d.score >= score : d.score === score));
    bars.push({ label: folded ? `${score}+` : String(score), low: score, high: folded ? high : score, count: inBar.reduce((sum, d) => sum + d.count, 0) });
  }
  return bars;
}

/** Today's solves by score, with the player's own bar picked out. */
export const ScoreDistribution = ({ distribution, myScore, rank, total }: { distribution: Distribution; myScore: number | null; rank: number | null; total: number }) => {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  if (distribution.length === 0 || total === 0) return null;
  const bars = toBars(distribution);
  const tallest = Math.max(...bars.map((bar) => bar.count));
  const tallestIndex = bars.findIndex((bar) => bar.count === tallest);
  const myIndex = myScore === null ? -1 : bars.findIndex((bar) => myScore >= bar.low && myScore <= bar.high);
  const topPercent = rank ? Math.max(1, Math.ceil((rank / total) * 100)) : null;

  return (
    <div className="mt-4 text-left">
      <div className="gp-label mb-2 flex justify-between px-2.5">
        <span>Today</span>
        {topPercent !== null && <span className="text-[color:var(--gp-ink)]">Top {topPercent}%</span>}
      </div>
      <div className="rounded-2xl bg-[#FBF6EE] px-3 pb-2 pt-3" role="img" aria-label={bars.map((bar) => `Score ${bar.label}: ${bar.count}`).join(", ")}>
        <div className="flex items-end gap-[2px]" style={{ height: PLOT_HEIGHT + 18 }}>
          {bars.map((bar, i) => {
            const mine = i === myIndex;
            const labelled = mine || i === tallestIndex || i === selectedBar;
            return (
              <button
                key={bar.label}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none"
                onClick={() => setSelectedBar(selectedBar === i ? null : i)}
                onMouseEnter={() => setSelectedBar(i)}
                onMouseLeave={() => setSelectedBar(null)}
                aria-label={`Score ${bar.label}: ${bar.count}`}
              >
                <span className={cn("mb-0.5 text-[11px] font-extrabold leading-none tabular-nums", mine ? "text-[#5B3FE0]" : "text-[color:var(--gp-muted)]", !labelled && "invisible")}>{bar.count}</span>
                <span
                  className={cn("w-full max-w-[28px] rounded-t-[4px] transition-colors", mine ? "bg-[#5B3FE0]" : i === selectedBar ? "bg-[#75679C]" : "bg-[#8F80B3]")}
                  style={{ height: Math.max(3, (bar.count / tallest) * PLOT_HEIGHT) }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[2px] border-t-2 border-[#E6DCCD] pt-1">
          {bars.map((bar, i) => (
            <span key={bar.label} className={cn("min-w-0 flex-1 text-center text-[11px] font-extrabold tabular-nums", i === myIndex ? "text-[#5B3FE0]" : "text-[color:var(--gp-muted)]")}>
              {bar.label}
            </span>
          ))}
        </div>
        {myIndex >= 0 && (
          <div className="flex gap-[2px]">
            {bars.map((bar, i) => (
              <span key={bar.label} className="min-w-0 flex-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-[#5B3FE0]">
                {i === myIndex ? "You" : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
