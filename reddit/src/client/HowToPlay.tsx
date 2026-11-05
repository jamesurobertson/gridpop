import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TILES } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";

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

type Cell = [x: number, y: number];
type Frame = {
  board: string;
  /** Where the next piece is about to land. */
  ghost?: Cell[];
  /** Cells lit white as their line pops. */
  flash?: Cell[];
  done?: boolean;
  ms: number;
};

const rows = (board: string) => board.split("/").map((row) => [...row].map(Number));
const line = (cells: string) => cells.split(" ").map((cell) => [Number(cell[0]), Number(cell[1])] as Cell);

// Two pieces build the target.
const BUILD_TARGET = "0100/1210/0100/0000";
const BUILD: Frame[] = [
  { board: "0000/0000/0000/0000", ms: 700 },
  { board: "0000/0000/0000/0000", ghost: line("01 11 21"), ms: 900 },
  { board: "0000/1110/0000/0000", ms: 600 },
  { board: "0000/1110/0000/0000", ghost: line("10 11 12"), ms: 900 },
  { board: BUILD_TARGET, done: true, ms: 1800 },
];

// Completing a row of 1s pops it.
const POP: Frame[] = [
  { board: "0000/1110/0000/0000", ms: 700 },
  { board: "0000/1110/0000/0000", ghost: line("30 31 32"), ms: 900 },
  { board: "0001/1111/0001/0000", flash: line("01 11 21 31"), ms: 500 },
  { board: "0001/0000/0001/0000", ms: 1600 },
];

// A tile reaching 7 ends the run.
const SEVEN: Frame[] = [
  { board: "0000/0600/0000/0000", ms: 700 },
  { board: "0000/0600/0000/0000", ghost: line("01 11 21"), ms: 900 },
  { board: "0000/1710/0000/0000", ms: 1800 },
];

function useFrame(frames: Frame[]) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % frames.length), frames[index].ms);
    return () => clearTimeout(id);
  }, [index, frames]);
  return frames[index];
}

const has = (cells: Cell[] | undefined, x: number, y: number) => !!cells?.some(([cx, cy]) => cx === x && cy === y);

const MiniBoard = ({ board, ghost, flash, done, className }: Omit<Frame, "ms"> & { className?: string }) => (
  <div className={cn("gp-target-wrap", className)}>
    <div className={cn("gp-target transition-shadow", done && "ring-4 ring-[#45D486]")} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
      {rows(board).flatMap((row, y) =>
        row.map((value, x) => {
          const lit = has(flash, x, y);
          const aiming = has(ghost, x, y);
          return (
            <span
              key={`${x}-${y}`}
              className={cn("gp-target-cell transition-colors duration-200", value > 0 && "gp-target-tile")}
              style={{
                background: lit ? "#FFFFFF" : value > 0 ? TILES[value].face : aiming ? "#7C5CFF66" : undefined,
                color: value > 0 ? TILES[value].text : undefined,
                outline: aiming ? "2px dashed #B8A3FF" : undefined,
                outlineOffset: -2,
              }}
            >
              {value > 0 ? TILES[value].label : ""}
            </span>
          );
        })
      )}
    </div>
  </div>
);

const Demo = ({ frames, children }: { frames: Frame[]; children?: (frame: Frame) => React.ReactNode }) => {
  const frame = useFrame(frames);
  return (
    <div className="relative flex items-center justify-center gap-3 rounded-2xl bg-[#FBF6EE] p-3">
      <MiniBoard {...frame} className="w-[108px]" />
      {children?.(frame)}
    </div>
  );
};

export const HowToPlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,360px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-4 outline-none"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogTitle className="sr-only">How to play</DialogTitle>
      <DialogDescription className="sr-only">Build the target board in as few pieces as you can.</DialogDescription>

      <Demo frames={BUILD}>
        {(frame: Frame) => (
          <>
            <span className={cn("font-display text-2xl font-bold transition-colors", frame.done ? "text-[#45D486]" : "text-[color:var(--gp-muted)]")}>
              {frame.done ? "✓" : "→"}
            </span>
            <MiniBoard board={BUILD_TARGET} done={frame.done} className="w-[72px]" />
          </>
        )}
      </Demo>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Demo frames={POP} />
        <Demo frames={SEVEN} />
      </div>

      <div className="mt-3 text-center text-[13px] font-bold text-[color:var(--gp-muted)]">
        <div>Drag to move · Tap to place · Double-tap to rotate</div>
        <div className="mt-0.5">Arrows · A / D · Space</div>
      </div>

      <button className="gp-btn gp-btn-primary mt-3 w-full" onClick={onClose}>
        Play
      </button>
    </DialogContent>
  </Dialog>
);
