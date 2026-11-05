import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import GameBoard from "@/components/game/GameBoard";
import TargetGrid from "@/components/game/TargetGrid";
import { parseTarget } from "@/utils/dailyCore";
import type { GridType, TetrominoType } from "@/types/game";
import { cn } from "@/lib/utils";
import { useDailyRun } from "./useDailyRun";
import { Hand, Keycap, pieceCenter, usesTouch } from "./Coach";

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

type Input = "place" | "rotate" | "left" | "right" | "up" | "down";

type Step = {
  /** [touch screens, keyboards] */
  title: [string, string];
  line?: string;
  pieces: TetrominoType[];
  board?: string;
  target?: string;
  script: { input: Input; wait: number }[];
  /** How long the end state stays up before the step plays again. */
  hold: number;
};

// Each step plays a few real moves on the real board, then repeats.
const STEPS: Step[] = [
  {
    title: ["Match the target", "Match the target"],
    line: "Fewest pieces wins.",
    pieces: ["I3", "I3"],
    target: "1000/2110/1000/0000",
    script: [
      { input: "place", wait: 1000 },
      { input: "rotate", wait: 900 },
      { input: "left", wait: 800 },
      { input: "place", wait: 800 },
    ],
    hold: 2200,
  },
  {
    title: ["Tap to place", "Space to place"],
    line: "Tiles under it go up by one.",
    pieces: ["T"],
    board: "0000/0100/0000/0000",
    script: [{ input: "place", wait: 1100 }],
    hold: 1700,
  },
  {
    title: ["Double-tap to rotate", "A or D to rotate"],
    pieces: ["L"],
    script: [
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
    ],
    hold: 400,
  },
  {
    title: ["Drag to move", "Arrow keys to move"],
    pieces: ["O"],
    script: [
      { input: "down", wait: 800 },
      { input: "left", wait: 650 },
      { input: "down", wait: 650 },
      { input: "right", wait: 650 },
      { input: "right", wait: 650 },
      { input: "up", wait: 650 },
      { input: "up", wait: 650 },
      { input: "left", wait: 650 },
    ],
    hold: 400,
  },
  {
    title: ["Fill a line to pop it", "Fill a line to pop it"],
    line: "Same number across a row or column.",
    pieces: ["I3"],
    board: "0000/0000/1110/0000",
    script: [
      { input: "rotate", wait: 900 },
      { input: "right", wait: 750 },
      { input: "right", wait: 650 },
      { input: "place", wait: 750 },
    ],
    hold: 1900,
  },
  {
    title: ["Don't reach 7", "Don't reach 7"],
    pieces: ["I3"],
    board: "0000/0600/0000/0000",
    script: [{ input: "place", wait: 1200 }],
    hold: 1900,
  },
];

const KEY_LABEL: Record<Input, string> = { place: "Space", rotate: "D", left: "←", right: "→", up: "↑", down: "↓" };
const STEP_DELTA: Partial<Record<Input, [number, number]>> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
// Never matched, so only the first step ever "solves".
const NO_TARGET: GridType = parseTarget("5555/5555/5555/5555");
// The hand or key goes down first; the board reacts a beat later, as if pressed.
const PRESS_DELAY = 320;

const StepBoard = ({ step, touch }: { step: Step; touch: boolean }) => {
  const [run, dispatch] = useDailyRun();
  const [input, setInput] = useState<Input | null>(null);
  const [press, setPress] = useState(0);
  const [loop, setLoop] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;
  const target = step.target ? parseTarget(step.target) : NO_TARGET;

  useEffect(() => {
    dispatch({ type: "start", pieces: step.pieces, grid: step.board ? parseTarget(step.board) : undefined });
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    for (const { input: next, wait } of step.script) {
      at += wait;
      timers.push(
        setTimeout(() => {
          setInput(next);
          setPress((n) => n + 1);
        }, at)
      );
      timers.push(
        setTimeout(() => {
          const piece = runRef.current.current;
          const delta = STEP_DELTA[next];
          if (next === "place") dispatch({ type: "place" });
          else if (next === "rotate") dispatch({ type: "rotate", direction: "clockwise" });
          else if (piece && delta) dispatch({ type: "move", position: { x: piece.position.x + delta[0], y: piece.position.y + delta[1] } });
        }, at + PRESS_DELAY)
      );
    }
    timers.push(setTimeout(() => setLoop((n) => n + 1), at + PRESS_DELAY + step.hold));
    return () => timers.forEach(clearTimeout);
  }, [loop, step, dispatch]);

  useEffect(() => {
    if (!run.pendingClear) return;
    const id = setTimeout(() => dispatch({ type: "clear", target }), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.pendingClear]);

  const solved = run.outcome === "solved";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="pointer-events-none relative w-[216px]">
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
          {touch && run.current && <Hand at={pieceCenter(run.current)} press={press} taps={input === "rotate" ? 2 : 1} />}
        </div>
        {step.target && (
          <motion.div
            className={cn("rounded-[16px] p-1 transition-colors", solved ? "bg-[#45D486]" : "bg-transparent")}
            animate={solved ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
          >
            <TargetGrid grid={target} className="w-[72px]" />
          </motion.div>
        )}
      </div>
      {!touch && <div className="flex h-11 items-center">{input && <Keycap label={KEY_LABEL[input]} press={press} />}</div>}
    </div>
  );
};

export const HowToPlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const [touch] = useState(usesTouch);
  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,360px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-[#FFF6EA] p-5 outline-none [&>button:last-child]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogDescription className="sr-only">Build the target board in as few pieces as you can.</DialogDescription>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-2 rounded-full transition-all", i === index ? "w-5 bg-[#7C5CFF]" : "w-2 bg-[#D9CCE9]")} />
            ))}
          </div>
          <button className="text-sm font-extrabold text-[color:var(--gp-muted)] hover:text-[color:var(--gp-ink)]" onClick={onClose}>
            Skip
          </button>
        </div>

        <div className="mt-3 min-h-[58px] text-center">
          <DialogTitle className="font-display text-[22px] font-bold leading-tight">{step.title[touch ? 0 : 1]}</DialogTitle>
          {step.line && <p className="mt-1 text-sm font-bold text-[color:var(--gp-muted)]">{step.line}</p>}
        </div>

        <div className="mt-3">
          <StepBoard key={index} step={step} touch={touch} />
        </div>

        <div className="mt-4 flex gap-2.5">
          {index > 0 && (
            <button className="gp-btn flex-1" onClick={() => setIndex(index - 1)}>
              Back
            </button>
          )}
          <button className="gp-btn gp-btn-primary flex-[1.6]" onClick={() => (last ? onClose() : setIndex(index + 1))}>
            {last ? "Play" : "Next"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
