import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import GameBoard from "@/components/game/GameBoard";
import TargetGrid from "@/components/game/TargetGrid";
import { getCurrentShape } from "@/utils/gameLogic";
import { parseTarget } from "@/utils/dailyCore";
import type { TetrominoType } from "@/types/game";
import { cn } from "@/lib/utils";
import { useDailyRun } from "./useDailyRun";

const SEEN_KEY = "gridpop-how-to-play-seen";

/** True until the rules have been shown once in this browser. */
export function firstVisit() {
  try {
    return localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the rules open again next time, which is harmless.
  }
}

// A two-piece puzzle played by script on the real board and rules: the first piece lands where it
// spawns; the second turns, slides one column left and lands, matching the target.
const PIECES: TetrominoType[] = ["I3", "I3"];
const TARGET = parseTarget("1000/2110/1000/0000");

type Input = "place" | "rotate" | "move";
const STEPS: { input: Input; wait: number }[] = [
  { input: "place", wait: 1100 },
  { input: "rotate", wait: 900 },
  { input: "move", wait: 900 },
  { input: "place", wait: 800 },
];
// The gesture or key shows first; the board reacts at the moment of the press.
const PRESS_DELAY = 380;
const SOLVED_HOLD = 2200;

const usesTouch = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

const KEYS: Record<Input, string> = { place: "Space", rotate: "D", move: "←" };
const GESTURES: Record<Input, string> = { place: "Tap", rotate: "Double-tap", move: "Drag" };

/** A fingertip on the board: a tap, a double tap, or a one-column drag to the left. */
const Fingertip = ({ input, at }: { input: Input; at: { x: number; y: number } }) => {
  const press = { scale: [1.5, 1, 0.82, 1], opacity: [0, 0.95, 0.95, 0] };
  const twice = { scale: [1.5, 1, 0.82, 1, 0.82, 1], opacity: [0, 0.95, 0.95, 0.95, 0.95, 0] };
  const drag = { left: [`${at.x}%`, `${at.x}%`, `${at.x - 25}%`, `${at.x - 25}%`], scale: [1.4, 0.85, 0.85, 1], opacity: [0, 0.95, 0.95, 0] };
  return (
    <motion.span
      className="pointer-events-none absolute z-40 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white/60 shadow-[0_0_0_3px_#1F1633,0_6px_14px_rgba(31,22,51,0.35)]"
      style={{ left: `${at.x}%`, top: `${at.y}%` }}
      initial={{ opacity: 0 }}
      animate={input === "move" ? drag : input === "rotate" ? twice : press}
      transition={{ duration: input === "rotate" ? 0.85 : 0.75, ease: "easeInOut" }}
    />
  );
};

const Keycap = ({ label, pressing }: { label: string; pressing: boolean }) => (
  <motion.span
    className="font-display inline-grid h-11 min-w-[44px] place-items-center rounded-xl border-[2.5px] border-[#1F1633] bg-white px-3 text-lg font-bold"
    animate={pressing ? { y: [0, 3, 0], boxShadow: ["0 4px 0 #1F1633", "0 1px 0 #1F1633", "0 4px 0 #1F1633"] } : { y: 0, boxShadow: "0 4px 0 #1F1633" }}
    transition={{ duration: 0.4 }}
  >
    {label}
  </motion.span>
);

const Tutorial = () => {
  const [run, dispatch] = useDailyRun();
  const [touch] = useState(usesTouch);
  const [input, setInput] = useState<Input | null>(null);
  const [cue, setCue] = useState(0);
  const [loop, setLoop] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;

  // Play the script; start over a moment after the target is matched.
  useEffect(() => {
    dispatch({ type: "start", pieces: PIECES });
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    for (const step of STEPS) {
      at += step.wait;
      timers.push(
        setTimeout(() => {
          setInput(step.input);
          setCue((n) => n + 1);
        }, at)
      );
      timers.push(
        setTimeout(() => {
          const piece = runRef.current.current;
          if (step.input === "place") dispatch({ type: "place" });
          else if (step.input === "rotate") dispatch({ type: "rotate", direction: "clockwise" });
          else if (piece) dispatch({ type: "move", position: { x: piece.position.x - 1, y: piece.position.y } });
        }, at + PRESS_DELAY)
      );
    }
    timers.push(setTimeout(() => setInput(null), at + 900));
    timers.push(setTimeout(() => setLoop((n) => n + 1), at + PRESS_DELAY + SOLVED_HOLD));
    return () => timers.forEach(clearTimeout);
  }, [loop, dispatch]);

  // Same beat as the game between a piece landing and its lines popping.
  useEffect(() => {
    if (!run.pendingClear) return;
    const id = setTimeout(() => dispatch({ type: "clear", target: TARGET }), 200);
    return () => clearTimeout(id);
  }, [run.pendingClear, dispatch]);

  // Where the fingertip goes: the middle of the current piece, in % of the board.
  const piece = run.current;
  let at = { x: 50, y: 50 };
  if (piece) {
    const cells = getCurrentShape(piece).flatMap((row, y) => row.flatMap((on, x) => (on ? [[piece.position.x + x, piece.position.y + y]] : [])));
    const mean = (i: number) => cells.reduce((sum, cell) => sum + cell[i], 0) / cells.length;
    at = { x: ((mean(0) + 0.5) / 4) * 100, y: ((mean(1) + 0.5) / 4) * 100 };
  }

  const solved = run.outcome === "solved";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="pointer-events-none relative w-[208px]">
          <GameBoard
            className="gp-board-wrap aspect-square w-full"
            grid={run.grid}
            currentPiece={run.current}
            pieceKey={`${loop}-${run.moves}`}
            pendingClear={run.pendingClear}
            bumpKey={0}
            scoreAnimations={[]}
            onPieceMove={() => undefined}
            onPiecePlace={() => undefined}
            onPieceRotate={() => undefined}
            gameOver={false}
            showPoints={false}
          />
          {touch && input && <Fingertip key={cue} input={input} at={at} />}
        </div>
        <motion.div
          className={cn("rounded-[16px] p-1", solved ? "bg-[#45D486]" : "bg-transparent")}
          animate={solved ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          <TargetGrid grid={TARGET} className="w-[72px]" />
        </motion.div>
      </div>
      <div className="flex h-11 items-center gap-2">
        {touch ? (
          <span className={cn("rounded-full border-2 border-[#1F1633] bg-white px-3 py-1 text-sm font-extrabold transition-opacity", input ? "opacity-100" : "opacity-0")}>
            {input ? GESTURES[input] : " "}
          </span>
        ) : (
          (["move", "rotate", "place"] as Input[]).map((key) => (
            <div key={key} className={cn("transition-opacity", input === key ? "opacity-100" : "opacity-35")}>
              <Keycap key={input === key ? cue : key} label={KEYS[key]} pressing={input === key} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const HowToPlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,340px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-[#FFF6EA] p-5 outline-none"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogTitle className="sr-only">How to play</DialogTitle>
      <DialogDescription className="sr-only">Build the target board in as few pieces as you can.</DialogDescription>
      {isOpen && <Tutorial />}
      <button className="gp-btn gp-btn-primary mt-4 w-full" onClick={onClose}>
        Play
      </button>
    </DialogContent>
  </Dialog>
);
