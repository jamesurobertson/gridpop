import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, RotateCcw } from "lucide-react";
import GameBoard from "@/components/game/GameBoard";
import TargetGrid from "@/components/game/TargetGrid";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { GridType, TetrominoType } from "@/types/game";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import { useDailyRun } from "./useDailyRun";
import type { ReplayStep } from "./replayLog";

// At normal speed a placement takes under a second: the piece glides to its spot, lands, and the
// board settles before the next one.
const PACE = { intro: 600, aim: 380, land: 200, settle: 260, undo: 520, restart: 900, caption: 700 };

const noop = () => undefined;

/** Plays back every placement, undo and restart on the way to a solve, on a board of its own. */
export const Replay = ({ open, onClose, pieces, target, steps }: { open: boolean; onClose: () => void; pieces: TetrominoType[]; target: GridType; steps: ReplayStep[] }) => {
  const [run, dispatch] = useDailyRun();
  const [playId, setPlayId] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [undos, setUndos] = useState(0);
  const [caption, setCaption] = useState<{ id: number; text: string } | null>(null);
  const [fast, setFast] = useState(false);
  const speed = useRef(1);
  speed.current = fast ? 2.5 : 1;
  const done = stepIndex >= steps.length && run.outcome === "solved";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise<boolean>((resolve) => setTimeout(() => resolve(!cancelled), ms / speed.current));
    const say = (text: string) => setCaption({ id: Date.now(), text });

    dispatch({ type: "start", pieces });
    setStepIndex(0);
    setPlaced(0);
    setUndos(0);
    setCaption(null);

    void (async () => {
      if (!(await wait(PACE.intro))) return;
      for (const [index, step] of steps.entries()) {
        if (step.type === "place") {
          dispatch({ type: "aim", rotation: step.rotation, position: { x: step.x, y: step.y } });
          if (!(await wait(PACE.aim))) return;
          sfx.play("place", { jitter: 0.06 });
          dispatch({ type: "place" });
          if (!(await wait(PACE.land))) return;
          dispatch({ type: "clear", target });
          setPlaced((n) => n + 1);
          if (!(await wait(PACE.settle))) return;
        } else if (step.type === "undo") {
          sfx.play("hold");
          dispatch({ type: "undo" });
          setUndos((n) => n + 1);
          say("Undo");
          if (!(await wait(PACE.undo))) return;
        } else {
          say("Restart");
          if (!(await wait(PACE.caption / 2))) return;
          sfx.play("click");
          dispatch({ type: "start", pieces });
          setUndos((n) => n + 1);
          if (!(await wait(PACE.restart))) return;
        }
        setStepIndex(index + 1);
      }
      say("Solved");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playId]);

  useEffect(() => {
    if (!caption || caption.text === "Solved") return;
    const timeout = setTimeout(() => setCaption(null), PACE.caption / speed.current);
    return () => clearTimeout(timeout);
  }, [caption]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[min(92vw,400px)] gap-3 rounded-[28px] border-[2.5px] border-[#1F1633] bg-[color:var(--gp-bg)] p-4 outline-none" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-3 pr-8">
          <TargetGrid grid={target} className="w-12 shrink-0" />
          <div className="min-w-0">
            <DialogTitle className="font-display text-[22px] font-bold leading-tight">Replay</DialogTitle>
            <DialogDescription className="text-sm font-extrabold text-[color:var(--gp-muted)]">
              Placed {placed} · Undos {undos}
            </DialogDescription>
          </div>
        </div>

        <div className="relative">
          <GameBoard
            className="gp-board-wrap aspect-square w-full"
            grid={run.grid}
            currentPiece={run.current}
            pieceKey={`${playId}-${run.moves}-${run.history.length}-${run.current?.shape.type}`}
            pendingClear={run.pendingClear}
            bumpKey={0}
            scoreAnimations={run.scoreAnimations}
            onPieceMove={noop}
            onPiecePlace={noop}
            onPieceRotate={noop}
            gameOver={!!run.outcome && run.outcome !== "solved"}
            showPoints={false}
            tapAction="none"
          />
          <AnimatePresence>
            {caption && (
              <motion.div
                key={caption.id}
                className={cn(
                  "font-display pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-[#1F1633] px-5 py-1.5 text-2xl font-bold shadow-[0_3px_0_#1F1633]",
                  caption.text === "Solved" ? "bg-[#45D486] text-[#1F1633]" : caption.text === "Restart" ? "bg-[#FF6B7A] text-white" : "bg-white text-[#1F1633]"
                )}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26, opacity: { duration: 0.15 } }}
              >
                {caption.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--gp-line)]" aria-hidden>
          <div className="h-full rounded-full bg-[color:var(--gp-accent)] transition-[width] duration-300" style={{ width: `${steps.length ? (stepIndex / steps.length) * 100 : 0}%` }} />
        </div>

        <div className="flex gap-2">
          <button className={cn("gp-btn flex-1 text-base", fast && "bg-[#EFEAFF] text-[color:var(--gp-accent-edge)]")} onClick={() => setFast((value) => !value)} aria-pressed={fast}>
            <Gauge size={18} strokeWidth={2.75} /> {fast ? "Fast" : "Normal"}
          </button>
          <button className="gp-btn flex-1 text-base" onClick={() => setPlayId((n) => n + 1)} disabled={!done && stepIndex === 0}>
            <RotateCcw size={18} strokeWidth={3} /> Watch again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
