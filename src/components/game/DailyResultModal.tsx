import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Flame, RotateCcw, Share2, Undo2 } from "lucide-react";
import { DailyOutcome } from "@/types/game";
import { DAILY_LEVELS, DailyResult, DailySetup, DailyStats, dailyScore, dailyShareText, formatClock, msUntilNextPuzzle } from "@/utils/daily";
import { cn } from "@/lib/utils";

interface DailyResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  setup: DailySetup;
  outcome: DailyOutcome | null;
  /** The finished run to show; null shows just the stats. */
  run: DailyResult | null;
  stats: DailyStats;
  onRestart: () => void;
  /** Shown under the stats, e.g. a leaderboard. */
  extra?: React.ReactNode;
  /** Replaces the browser share (the Reddit app uses its own share sheet). */
  onShare?: (text: string) => void;
  /** Keep the fewest possible secret (on Reddit the leaderboard says what's good). */
  hideGoal?: boolean;
  /** Offered once solved: another run that isn't recorded. */
  onReplay?: () => void;
  /** Offered after a tile reaches 7 or the pieces run out: take back the last placement. */
  onUndo?: () => void;
  /** The run shown was a replay after the recorded solve. */
  practice?: boolean;
}

const SITE = "https://jamesurobertson.github.io/gridpop/";
const STAT_COLUMNS: Record<number, string> = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };
const OVER_GOAL_LABELS = ["Goal", "+1", "+2", "+3"];

function useCountdown(active: boolean) {
  const [msLeft, setMsLeft] = useState(msUntilNextPuzzle);
  useEffect(() => {
    if (!active) return;
    setMsLeft(msUntilNextPuzzle());
    const id = setInterval(() => setMsLeft(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return msLeft;
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="gp-label">{label}</div>
    <div className="gp-value mt-1 text-2xl">{value}</div>
  </div>
);

const DailyResultModal: React.FC<DailyResultModalProps> = ({ isOpen, onClose, setup, outcome, run, stats, onRestart, extra, onShare, hideGoal, onReplay, practice, onUndo }) => {
  const [copied, setCopied] = useState(false);
  const msLeft = useCountdown(isOpen);
  const solved = outcome === "solved" && run;
  const score = run ? dailyScore(run) : 0;
  const overPar = solved ? Math.min(3, Math.max(0, score - run.par)) : -1;
  const puzzleName = `Daily #${setup.number} · ${DAILY_LEVELS.find((option) => option.level === setup.level)?.label}${practice ? " · Practice" : ""}`;

  const heading =
    outcome === "seven" ? "A tile reached 7" :
    outcome === "empty" ? "Out of pieces" :
    solved ? (!hideGoal && score <= run.par ? "Perfect!" : "Solved") :
    puzzleName;

  function handleShare() {
    if (!run) return;
    const text = dailyShareText(setup, run, { withGoal: !hideGoal });
    if (onShare) {
      onShare(text);
    } else if (navigator.share) {
      navigator.share({ text: `${text}\n${SITE}` }).catch(() => undefined);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(`${text}\n${SITE}`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const mostAtOneScore = Math.max(1, ...stats.overPar);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,384px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 outline-none [&>button:last-child]:text-white [&>button:last-child]:opacity-80"
        // Focusing the bottom button would scroll a tall card past its own heading.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="bg-[#3B2E5A] px-6 pb-4 pt-5 text-center text-white">
          <DialogTitle className="font-display text-[26px] font-bold tracking-tight">{heading}</DialogTitle>
          <DialogDescription className="mt-1 text-sm font-bold text-white/60">{puzzleName}</DialogDescription>
        </div>

        <div className="px-5 pb-5 pt-4 text-center">
          {solved && (
            <div className={cn("mb-4 grid gap-2", STAT_COLUMNS[3 + (hideGoal ? 0 : 1) + (run.hints !== undefined ? 1 : 0)])}>
              <Stat label="Moves" value={run.moves} />
              <Stat label="Restarts" value={run.restarts ?? 0} />
              {run.hints !== undefined && <Stat label="Hints" value={run.hints} />}
              {!hideGoal && <Stat label="Goal" value={run.par} />}
              <Stat label="Time" value={formatClock(run.timeMs)} />
            </div>
          )}

          {(solved || !outcome) && (
            <>
              <div className="flex justify-center gap-8 rounded-2xl bg-[#FBF6EE] px-4 py-3">
                <Stat label="Played" value={stats.played} />
                <Stat
                  label="Streak"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <Flame size={20} strokeWidth={2.5} className="text-[#FF7A3D]" />
                      {stats.streak}
                    </span>
                  }
                />
                <Stat label="Best" value={stats.bestStreak} />
              </div>
              <div className={cn("mt-3 space-y-1", hideGoal && "hidden")}>
                {stats.overPar.map((count, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-extrabold">
                    <span className="w-8 text-left text-[color:var(--gp-muted)]">{OVER_GOAL_LABELS[i]}</span>
                    <span className="flex-1">
                      <span
                        className={cn("block min-w-[28px] rounded-md px-2 text-right text-[13px] leading-5 text-white", i === overPar ? "bg-[#45D486]" : "bg-[#B8A3FF]")}
                        style={{ width: `${Math.max(12, (count / mostAtOneScore) * 100)}%` }}
                      >
                        {count}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {extra}
              <div className="mt-3">
                <div className="gp-label">Next puzzle</div>
                <div className="gp-value mt-1 text-xl">{formatClock(msLeft)}</div>
              </div>
            </>
          )}

          {/* Kept in view at the bottom of a card that scrolls on short screens. */}
          <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex flex-col gap-2.5 bg-white px-5 pb-5 pt-2">
            {solved ? (
              <div className="flex gap-2.5">
                {onReplay && (
                  <button className="gp-btn flex-1 whitespace-nowrap text-base" onClick={onReplay}>
                    <RotateCcw size={18} strokeWidth={3} /> Play again
                  </button>
                )}
                {!practice && (
                  <button className="gp-btn gp-btn-primary flex-1 whitespace-nowrap text-base" onClick={handleShare}>
                    <Share2 size={18} strokeWidth={2.5} /> {copied ? "Copied!" : "Share"}
                  </button>
                )}
              </div>
            ) : outcome ? (
              <div className="flex gap-2.5">
                {onUndo && (
                  <button className="gp-btn flex-1 whitespace-nowrap text-base" onClick={onUndo}>
                    <Undo2 size={18} strokeWidth={3} /> Undo
                  </button>
                )}
                <button className="gp-btn gp-btn-primary flex-1 whitespace-nowrap text-base" onClick={onRestart}>
                  <RotateCcw size={18} strokeWidth={3} /> Try again
                </button>
              </div>
            ) : (
              <button className="gp-btn gp-btn-primary w-full text-base" onClick={onClose}>
                Keep playing
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyResultModal;
