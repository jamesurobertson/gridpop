import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Share2 } from "lucide-react";
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
}

const SITE = "https://jamesurobertson.github.io/gridpop/";
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

const DailyResultModal: React.FC<DailyResultModalProps> = ({ isOpen, onClose, setup, outcome, run, stats, onRestart, extra, onShare }) => {
  const [copied, setCopied] = useState(false);
  const msLeft = useCountdown(isOpen);
  const solved = outcome === "solved" && run;
  const score = run ? dailyScore(run) : 0;
  const overPar = solved ? Math.min(3, Math.max(0, score - run.par)) : -1;
  const puzzleName = `Daily #${setup.number} · ${DAILY_LEVELS.find((option) => option.level === setup.level)?.label}`;

  const heading =
    outcome === "seven" ? { emoji: "💀", title: "A tile reached 7" } :
    outcome === "empty" ? { emoji: "🫙", title: "Out of pieces" } :
    solved ? { emoji: score <= run.par ? "🎯" : "🎉", title: score <= run.par ? "Perfect!" : "Solved" } :
    { emoji: "📅", title: puzzleName };

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

  const mostAtOneScore = Math.max(1, ...stats.overPar);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,384px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 outline-none [&>button:last-child]:text-white [&>button:last-child]:opacity-80"
        // Focusing the bottom button would scroll a tall card past its own heading.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="bg-[#3B2E5A] px-6 pb-4 pt-5 text-center text-white">
          <motion.div
            key={heading.emoji}
            className="text-4xl"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
          >
            {heading.emoji}
          </motion.div>
          <DialogTitle className="font-display mt-1 text-[26px] font-bold tracking-tight">{heading.title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm font-bold text-white/60">{puzzleName}</DialogDescription>
        </div>

        <div className="px-5 pb-5 pt-4 text-center">
          {solved && (
            <div className="mb-4 grid grid-cols-4 gap-2">
              <Stat label="Moves" value={run.moves} />
              <Stat label="Restarts" value={run.restarts ?? 0} />
              <Stat label="Goal" value={run.par} />
              <Stat label="Time" value={formatClock(run.timeMs)} />
            </div>
          )}

          {(solved || !outcome) && (
            <>
              <div className="flex justify-center gap-8 rounded-2xl bg-[#FBF6EE] px-4 py-3">
                <Stat label="Played" value={stats.played} />
                <Stat label="Streak" value={`🔥 ${stats.streak}`} />
                <Stat label="Best" value={stats.bestStreak} />
              </div>
              <div className="mt-3 space-y-1">
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
              <button className="gp-btn gp-btn-primary w-full text-base" onClick={handleShare}>
                <Share2 size={18} strokeWidth={2.5} /> {copied ? "Copied!" : "Share"}
              </button>
            ) : outcome ? (
              <button className="gp-btn gp-btn-primary w-full text-base" onClick={onRestart}>
                <RotateCcw size={18} strokeWidth={3} /> Try again
              </button>
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
