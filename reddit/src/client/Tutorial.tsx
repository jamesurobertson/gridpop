import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

// The tutorial level: two three-long pieces. The first slides down and right onto its spot; the
// second turns upright and slides into the middle, stacking a 2 where they cross.
export const TUTORIAL_PIECES: TetrominoType[] = ["I3", "I3", "T", "O", "L"];
export const TUTORIAL_TARGET: GridType = parseTarget("0000/0010/0121/0010");
const SPOTS = [
  [
    [1, 2],
    [2, 2],
    [3, 2],
  ],
  [
    [2, 1],
    [2, 2],
    [2, 3],
  ],
];

export type TutorialStep = "goal" | "move" | "place" | "rotate" | "move2" | "place2" | "done";

const cellsOf = (piece: Tetromino) =>
  getCurrentShape(piece).flatMap((row, dy) => row.flatMap((on, dx) => (on ? [[piece.position.x + dx, piece.position.y + dy]] : [])));
const sameCells = (a: number[][], b: number[][]) => a.length === b.length && a.every(([x, y]) => b.some(([bx, by]) => bx === x && by === y));

/**
 * Where the run is in the tutorial, read straight off the board, and the spot the piece should go.
 * It opens on the goal, with no spot shown, until the player has seen what they're building.
 */
export function tutorialStep(run: RunState, goalSeen: boolean): { step: TutorialStep; spot: { x: number; y: number }[] } {
  if (!goalSeen) return { step: "goal", spot: [] };
  if (run.outcome === "solved") return { step: "done", spot: [] };
  const index = Math.min(run.moves, SPOTS.length - 1);
  const spot = SPOTS[index].map(([x, y]) => ({ x, y }));
  const piece = run.current;
  if (!piece) return { step: "done", spot: [] };
  const there = sameCells(cellsOf(piece), SPOTS[index]);
  if (index === 0) return { step: there ? "place" : "move", spot };
  if (piece.rotation % 2 === 0) return { step: "rotate", spot };
  return { step: there ? "place2" : "move2", spot };
}

/** Only lets a piece down on its spot, so the tutorial can't go wrong. */
export const onSpot = (run: RunState) => {
  const { step } = tutorialStep(run, true);
  return step === "place" || step === "place2";
};

export const STEP_TEXT: Record<Exclude<TutorialStep, "done">, { title: [string, string]; line?: string; keys: string[] }> = {
  goal: { title: ["Match the target", "Match the target"], line: "Build this board", keys: [] },
  move: { title: ["Drag to move", "Arrow keys to move"], line: "Into glowing area", keys: ["←", "↑", "↓", "→"] },
  place: { title: ["Tap to place", "Space to place"], line: "Tiles go up by one", keys: ["Space"] },
  rotate: { title: ["Double-tap to rotate", "A or D to rotate"], line: "To fit the glow", keys: ["A", "D"] },
  move2: { title: ["Drag to move", "Arrow keys to move"], line: "Into glowing area", keys: ["←", "↑", "↓", "→"] },
  place2: { title: ["Tap to place", "Space to place"], line: "1 + 1 makes 2", keys: ["Space"] },
};

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
