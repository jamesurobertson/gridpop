import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import TargetGrid from "@/components/game/TargetGrid";
import type { GridType, Tetromino, TetrominoType } from "@/types/game";
import { getCurrentShape } from "@/utils/gameLogic";
import { parseTarget } from "@/utils/dailyCore";
import { TILES } from "@/utils/gameCellVisuals";
import type { RunState } from "./useDailyRun";

const SEEN_KEY = "gridpop-how-to-play-seen";

/** True until the tutorial has been played (or skipped) once in this browser. */
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
    // Storage blocked: the tutorial opens again next time, which is harmless.
  }
}

// The tutorial level: two different pieces. The square drops into the middle; the J turns twice
// and slides over it, stacking two 2s.
export const TUTORIAL_PIECES: TetrominoType[] = ["O", "J", "T", "S", "L"];
export const TUTORIAL_TARGET: GridType = parseTarget("0000/0221/0111/0000");
const SPOTS = [
  [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ],
  [
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 2],
  ],
];

export type TutorialStep = "goal" | "move" | "place" | "rotate" | "move2" | "place2" | "done";

const cellsOf = (piece: Tetromino) =>
  getCurrentShape(piece).flatMap((row, dy) => row.flatMap((on, dx) => (on ? [[piece.position.x + dx, piece.position.y + dy]] : [])));
const sameCells = (a: number[][], b: number[][]) => a.length === b.length && a.every(([x, y]) => b.some(([bx, by]) => bx === x && by === y));
/** The same shape facing the same way, wherever it sits: moving alone can take one onto the other. */
const sameShape = (a: number[][], b: number[][]) => {
  const shift = (cells: number[][]) => {
    const [minX, minY] = [Math.min(...cells.map((c) => c[0])), Math.min(...cells.map((c) => c[1]))];
    return cells.map(([x, y]) => [x - minX, y - minY]);
  };
  return sameCells(shift(a), shift(b));
};

/**
 * Where the run is in the tutorial, read straight off the board, and the spot the piece should go.
 * It opens on the goal, with no spot shown, until the player has seen what they're building.
 */
export function tutorialStep(run: RunState, goalSeen: boolean): { step: TutorialStep; spot: { x: number; y: number }[]; turn?: boolean } {
  if (!goalSeen) return { step: "goal", spot: [] };
  if (run.outcome === "solved") return { step: "done", spot: [] };
  const index = Math.min(run.moves, SPOTS.length - 1);
  const spot = SPOTS[index].map(([x, y]) => ({ x, y }));
  const piece = run.current;
  if (!piece) return { step: "done", spot: [] };
  const there = sameCells(cellsOf(piece), SPOTS[index]);
  const facing = sameShape(cellsOf(piece), SPOTS[index]);
  // Turned by accident on the first piece: still the move step, but it needs turning back first.
  if (index === 0) return { step: there ? "place" : "move", spot, turn: !facing };
  if (!facing) return { step: "rotate", spot };
  return { step: there ? "place2" : "move2", spot };
}

/** Only lets a piece down on its spot, so the tutorial can't go wrong. */
export const onSpot = (run: RunState) => {
  const { step } = tutorialStep(run, true);
  return step === "place" || step === "place2";
};

export const TUTORIAL_STEPS: Exclude<TutorialStep, "done">[] = ["goal", "move", "place", "rotate", "move2", "place2"];

/** The tip over the piece, in the words of the player's own controls. */
export const stepTitle = (step: Exclude<TutorialStep, "done">, words: { move: string; place: string; rotate: string }) =>
  step === "goal" ? "Match the target" : step === "move" || step === "move2" ? words.move : step === "rotate" ? words.rotate : words.place;

const Chip = ({ value }: { value: number }) => (
  <span
    className="font-display relative inline-grid h-8 w-8 place-items-center overflow-hidden rounded-[9px] text-[15px] font-bold"
    style={{ background: TILES[value].face, color: TILES[value].text, border: "2.5px solid #1F1633" }}
  >
    {TILES[value].label}
  </span>
);

const Lesson = ({ chips, children }: { chips: (number | "→")[]; children: React.ReactNode }) => (
  <li className="flex items-center gap-3">
    <span className="flex w-[118px] shrink-0 items-center gap-1">
      {chips.map((chip, i) => (chip === "→" ? <span key={i} className="font-extrabold text-[color:var(--gp-muted)]">→</span> : <Chip key={i} value={chip} />))}
    </span>
    <span className="font-display text-lg font-bold">{children}</span>
  </li>
);

/** The card at the end of the tutorial, then into the day's puzzle. */
/**
 * The tutorial's first beat: the target shown big over a dimmed board, then, on Next, shrunk into
 * its Target card, so the small card reads as "the board you're copying" from then on.
 */
export const TutorialIntro = ({ docking, slot, onNext, onDocked }: { docking: boolean; slot: RefObject<HTMLDivElement>; onNext: () => void; onDocked: () => void }) => {
  const bigRef = useRef<HTMLDivElement>(null);
  const [dock, setDock] = useState<{ x: number; y: number; scale: number } | null>(null);

  useLayoutEffect(() => {
    if (!docking) return;
    const big = bigRef.current;
    const card = slot.current;
    if (!big || !card) return onDocked();
    // Scaled from the top-left corner, so the corner's on-screen spot is the layout spot plus x/y.
    const from = big.getBoundingClientRect();
    const to = card.getBoundingClientRect();
    setDock({ x: to.left - from.left, y: to.top - from.top, scale: to.width / big.offsetWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docking]);

  // The words clear out fast so the eye follows only the board; the board itself rides a spring.
  const clear = dock ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 1, transition: { duration: 0.25 } };
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6">
      <motion.div className="absolute inset-0 bg-[#FFF6EA]/95" initial={{ opacity: 0 }} animate={{ opacity: dock ? 0 : 1 }} transition={{ duration: dock ? 0.45 : 0.25 }} />
      <motion.h2 className="font-display relative text-[30px] font-bold leading-tight" initial={{ opacity: 0, y: 8 }} animate={{ ...clear, y: dock ? -6 : 0 }}>
        Match this board
      </motion.h2>
      <motion.div
        ref={bigRef}
        className="relative w-[min(66vw,300px)] [&_.gp-target]:transition-[border-width] [&_.gp-target]:duration-500"
        // Scaling thins the outline; thicken it as it shrinks so it lands at the card's own 2px.
        style={{ originX: 0, originY: 0, ["--gp-target-border" as string]: dock ? `${2 / dock.scale}px` : undefined }}
        initial={{ opacity: 0, y: 12 }}
        animate={dock ? { opacity: 1, x: dock.x, y: dock.y, scale: dock.scale } : { opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={dock ? { type: "spring", visualDuration: 0.5, bounce: 0.12 } : { duration: 0.3 }}
        onAnimationComplete={() => dock && onDocked()}
      >
        <TargetGrid grid={TUTORIAL_TARGET} reveal className="w-full" />
      </motion.div>
      <motion.button className="gp-btn gp-btn-primary relative w-full max-w-[220px]" initial={{ opacity: 0 }} animate={clear} onClick={onNext} disabled={docking}>
        Next
      </motion.button>
    </div>
  );
};

export const TutorialDone = ({ isOpen, onPlay }: { isOpen: boolean; onPlay: () => void }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onPlay()}>
    <DialogContent
      className="max-w-[min(92vw,360px)] gap-0 rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 outline-none [&>button:last-child]:hidden"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <div className="rounded-t-[26px] bg-[#3B2E5A] px-6 pb-4 pt-5 text-center text-white">
        <DialogTitle className="font-display text-[26px] font-bold">Tutorial complete</DialogTitle>
        <DialogDescription className="mt-1 text-sm font-bold text-white/60">Match the target in as few moves as you can.</DialogDescription>
      </div>
      <ul className="space-y-3 px-6 pb-2 pt-5">
        <Lesson chips={[1, "→", 2]}>Tiles stack up</Lesson>
        <Lesson chips={[3, 3, 3]}>Full lines pop</Lesson>
        <Lesson chips={[6, "→", 7]}>Don't reach 7</Lesson>
      </ul>
      <div className="p-5 pt-4">
        <button className="gp-btn gp-btn-primary w-full text-base" onClick={onPlay}>
          Play
        </button>
      </div>
    </DialogContent>
  </Dialog>
);
