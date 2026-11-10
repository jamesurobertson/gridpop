import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Flame, RotateCcw, Share2, Undo2 } from "lucide-react";
import { DailyOutcome } from "@/types/game";
import { cn } from "@/lib/utils";
import { SteadyDigits } from "@/components/game/SteadyDigits";
import { DAILY_LEVELS, DailyResult, DailySetup, DailyStats, dailyShareText, formatClock, msUntilNextPuzzle } from "@/utils/daily";

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
  /** Offered once solved: another run that isn't recorded. */
  onReplay?: () => void;
  /** Offered once solved, while another level is still unsolved today. */
  onOtherLevel?: () => void;
  /** Where this result stands on the leaderboard (Reddit only). */
  rank?: { rank: number; total: number };
  /** The comment-your-score button (Reddit only), beside Share. */
  comment?: React.ReactNode;
  /** Offered after a tile reaches 7 or the pieces run out: take back the last placement. */
  onUndo?: () => void;
  /** The run shown was a replay after the recorded solve. */
  practice?: boolean;
  /** Defaults to midnight UTC; the Reddit app's day ends at midnight Eastern. */
  msUntilNext?: (now?: number) => number;
}

const SITE = "https://jamesurobertson.github.io/gridpop/";

function useCountdown(active: boolean, msUntilNext: () => number) {
  const [msLeft, setMsLeft] = useState(msUntilNext);
  useEffect(() => {
    if (!active) return;
    setMsLeft(msUntilNext());
    const id = setInterval(() => setMsLeft(msUntilNext()), 1000);
    return () => clearInterval(id);
  }, [active, msUntilNext]);
  return msLeft;
}

const Stat = ({ label, value, big }: { label: string; value: React.ReactNode; big?: boolean }) => (
  <div>
    <div className="gp-label">{label}</div>
    <div className={cn("gp-value mt-0.5", big ? "text-[28px]" : "text-xl")}>{value}</div>
  </div>
);

const DailyResultModal: React.FC<DailyResultModalProps> = ({ isOpen, onClose, setup, outcome, run, stats, onRestart, extra, onShare, onReplay, onOtherLevel, rank, comment, practice, onUndo, msUntilNext = msUntilNextPuzzle }) => {
  const [copied, setCopied] = useState(false);
  const msLeft = useCountdown(isOpen, msUntilNext);
  const solved = outcome === "solved" && run;
  const puzzleName = `Daily #${setup.number} · ${DAILY_LEVELS.find((option) => option.level === setup.level)?.label}${practice ? " · Practice" : ""}`;

  const heading =
    outcome === "seven" ? "A tile reached 7" :
    outcome === "empty" ? "Out of pieces" :
    solved ? "Solved" :
    puzzleName;

  function handleShare() {
    if (!run) return;
    const text = dailyShareText(setup, run);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,384px)] gap-0 overflow-y-auto overscroll-none rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 outline-none [&>button:last-child]:text-white [&>button:last-child]:opacity-80"
        // Focusing the bottom button would scroll a tall card past its own heading.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="bg-[#3B2E5A] px-10 pb-3 pt-3.5 text-center text-white [@media(max-height:640px)]:pb-2 [@media(max-height:640px)]:pt-2.5">
          <DialogTitle className="font-display text-[22px] font-bold leading-tight tracking-tight">{heading}</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] font-bold text-white/60">{puzzleName}</DialogDescription>
        </div>

        <div className="px-4 pb-4 pt-3 text-center [@media(max-height:640px)]:pt-2">
          {solved && (
            <div className={cn("mb-2 grid gap-2", rank ? "grid-cols-2" : "grid-cols-3")}>
              <Stat label="Time" value={formatClock(run.timeMs)} big />
              {rank ? (
                <Stat
                  label="Rank"
                  value={
                    <>
                      #{rank.rank} <span className="text-base text-[color:var(--gp-muted)]">of {rank.total}</span>
                    </>
                  }
                  big
                />
              ) : (
                <>
                  <Stat label="Hints" value={run.hints ?? 0} big />
                  <Stat label="Undos" value={run.undos ?? 0} big />
                </>
              )}
            </div>
          )}

          {(solved || !outcome) && (
            <>
              {stats.streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF6EE] px-3.5 py-1 text-sm font-extrabold">
                  <Flame size={16} strokeWidth={2.75} className="text-[#FF7A3D]" />
                  {stats.streak}-day streak
                </span>
              )}
              {extra}
            </>
          )}

          {/* Kept in view at the bottom of a card that scrolls on short screens. */}
          <div className="sticky bottom-0 -mx-4 -mb-4 mt-3 flex flex-col gap-2 bg-white px-4 pb-3 pt-2 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:pt-1">
            {solved ? (
              <>
                {(comment || !practice) && (
                  <div className="flex gap-2.5">
                    {comment}
                    {!practice && (
                      <button className="gp-btn flex-1 whitespace-nowrap text-base" onClick={handleShare}>
                        <Share2 size={18} strokeWidth={2.5} /> {copied ? "Copied!" : "Share"}
                      </button>
                    )}
                  </div>
                )}
                {onOtherLevel && (
                  <button className="gp-btn gp-btn-primary w-full whitespace-nowrap text-base" onClick={onOtherLevel}>
                    Play another difficulty
                  </button>
                )}
                <div className="flex items-center justify-between gap-2">
                  {onReplay ? (
                    <button className="inline-flex items-center gap-1.5 py-1.5 text-sm font-extrabold text-[color:var(--gp-accent-edge)]" onClick={onReplay}>
                      <RotateCcw size={16} strokeWidth={3} /> Play again
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-baseline gap-2">
                    <span className="gp-label">Next puzzle</span>
                    <span className="gp-value text-base"><SteadyDigits text={formatClock(msLeft)} /></span>
                  </span>
                </div>
              </>
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
              <>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="gp-label">Next puzzle</span>
                  <span className="gp-value text-base"><SteadyDigits text={formatClock(msLeft)} /></span>
                </div>
                <button className="gp-btn gp-btn-primary w-full text-base" onClick={onClose}>
                  Keep playing
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyResultModal;
