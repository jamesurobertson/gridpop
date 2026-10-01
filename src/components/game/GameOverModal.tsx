import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Share2 } from "lucide-react";

interface GameOverModalProps {
  score: number;
  level: number;
  linesCleared: number;
  isNewBest: boolean;
  onRestart: () => void;
  onClose: () => void;
}

const SITE = "https://jamesurobertson.github.io/gridpop/";

const GameOverModal: React.FC<GameOverModalProps> = ({ score, level, linesCleared, isNewBest, onRestart, onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(0);

  // The final score counts up as the card lands.
  useEffect(() => {
    const start = performance.now() + 250;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / 900));
      setShown(Math.round(score * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  function handleShare() {
    const text = `I scored ${score.toLocaleString()} points in GridPop! Can you beat it?`;
    if (navigator.share) {
      navigator.share({ title: "GridPop", text, url: SITE }).catch(() => undefined);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(`${text} ${SITE}`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[88vw] overflow-hidden rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 sm:max-w-sm">
        <div className="relative bg-[#3B2E5A] px-6 pb-7 pt-8 text-center text-white">
          <motion.div
            className="text-5xl"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.1 }}
          >
            💀
          </motion.div>
          <DialogTitle className="font-display mt-2 text-[28px] font-bold tracking-tight">Game Over</DialogTitle>
          <DialogDescription className="mt-1 text-sm font-bold text-white/60">A tile reached 7</DialogDescription>
          {isNewBest && (
            <motion.span
              className="gp-pop-label absolute right-4 top-4 !m-0 bg-[#FFD45E] text-[#6E4300]"
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: 1, rotate: 8 }}
              transition={{ type: "spring", stiffness: 500, damping: 12, delay: 1.1 }}
            >
              New best!
            </motion.span>
          )}
        </div>

        <div className="px-6 pb-6 pt-5 text-center">
          <div className="gp-label">Score</div>
          <div className="gp-value mt-1 text-[52px]">{shown.toLocaleString()}</div>
          <div className="mt-3 flex justify-center gap-6">
            <div>
              <div className="gp-label">Level</div>
              <div className="gp-value text-2xl">{level}</div>
            </div>
            <div>
              <div className="gp-label">Lines</div>
              <div className="gp-value text-2xl">{linesCleared}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button className="gp-btn gp-btn-primary w-full text-base" onClick={onRestart} autoFocus>
              <RotateCcw size={18} strokeWidth={3} /> Play Again
            </button>
            <button className="gp-btn w-full" onClick={handleShare}>
              <Share2 size={17} strokeWidth={2.5} /> {copied ? "Link copied!" : "Challenge a friend"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameOverModal;
