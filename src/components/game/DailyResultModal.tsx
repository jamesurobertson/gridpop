import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Flame, RotateCcw, Share2, Undo2 } from "lucide-react";
import { DailyOutcome } from "@/types/game";
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

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="gp-label">{label}</div>
    <div className="gp-value mt-0.5 text-xl">{value}</div>
  </div>
);

/** Label and value side by side, for the slim streak strip. */
const InlineStat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <span className="flex items-baseline gap-1.5">
    <span className="gp-label">{label}</span>
    <span className="gp-value text-lg">{value}</span>
  </span>
);

const DailyResultModal: React.FC<DailyResultModalProps> = ({ isOpen, onClose, setup, outcome, run, stats, onRestart, extra, onShare, onReplay, practice, onUndo, msUntilNext = msUntilNextPuzzle }) => {
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
            <div className="mb-3 grid grid-cols-3 gap-2 [@media(max-height:640px)]:mb-2">
              <Stat label="Time" value={formatClock(run.timeMs)} />
              <Stat label="Hints" value={run.hints ?? 0} />
              <Stat label="Restarts" value={run.restarts ?? 0} />
            </div>
          )}

          {(solved || !outcome) && (
            <>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 rounded-2xl bg-[#FBF6EE] px-3 py-2">
                <InlineStat label="Played" value={stats.played} />
                <InlineStat
                  label="Streak"
                  value={
                    <span className="inline-flex items-center gap-0.5">
                      <Flame size={16} strokeWidth={2.75} className="self-center text-[#FF7A3D]" />
                      {stats.streak}
                    </span>
                  }
                />
                <InlineStat label="Best" value={stats.bestStreak} />
              </div>
              {extra}
            </>
          )}

          {/* Kept in view at the bottom of a card that scrolls on short screens. */}
          <div className="sticky bottom-0 -mx-4 -mb-4 mt-3 flex flex-col gap-2 bg-white px-4 pb-4 pt-2 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:pb-3 [@media(max-height:640px)]:pt-1">
            {(solved || !outcome) && (
              <div className="flex items-baseline justify-center gap-2">
                <span className="gp-label">Next puzzle</span>
                <span className="gp-value text-base tabular-nums">{formatClock(msLeft)}</span>
              </div>
            )}
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
