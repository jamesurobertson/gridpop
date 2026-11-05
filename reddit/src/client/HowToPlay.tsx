import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TILES, pieceColor } from "@/utils/gameCellVisuals";
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

// Board geometry in px: four cells with gaps, inside padding.
const CELL = 36;
const GAP = 6;
const PAD = 8;
const STEP = CELL + GAP;
const BOARD_SIZE = PAD * 2 + CELL * 4 + GAP * 3;

type Action = "move" | "rotate" | "place";
type Frame = {
  board: string;
  /** The three-long piece: its 3×3 box's top-left cell and quarter turns. Absent once placed. */
  piece?: { id: number; x: number; y: number; turns: number };
  action?: Action;
  done?: boolean;
  ms: number;
};

const TARGET = "0100/1210/0100/0000";

// One piece moves and lands; the next turns, moves and lands, matching the target.
const FRAMES: Frame[] = [
  { board: "0000/0000/0000/0000", piece: { id: 1, x: 0, y: -1, turns: 0 }, ms: 700 },
  { board: "0000/0000/0000/0000", piece: { id: 1, x: 0, y: 0, turns: 0 }, action: "move", ms: 800 },
  { board: "0000/1110/0000/0000", action: "place", ms: 800 },
  { board: "0000/1110/0000/0000", piece: { id: 2, x: 0, y: -1, turns: 0 }, ms: 600 },
  { board: "0000/1110/0000/0000", piece: { id: 2, x: 0, y: -1, turns: 1 }, action: "rotate", ms: 800 },
  { board: "0000/1110/0000/0000", piece: { id: 2, x: 0, y: 0, turns: 1 }, action: "move", ms: 800 },
  { board: TARGET, action: "place", done: true, ms: 2000 },
];

const usesTouch = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

const CONTROLS: Record<Action, [touch: string, keys: string]> = {
  move: ["Drag", "← → ↑ ↓"],
  rotate: ["Double-tap", "A / D"],
  place: ["Tap", "Space"],
};

const rows = (board: string) => board.split("/").map((row) => [...row].map(Number));

const Board = ({ frame }: { frame: Frame }) => (
  <div className="relative overflow-hidden rounded-[18px] border-2 border-[#1F1633] bg-[var(--gp-board)]" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
    {rows(frame.board).flatMap((row, y) =>
      row.map((value, x) => (
        <span
          key={`${x}-${y}`}
          className={cn("font-display absolute grid place-items-center rounded-[10px] text-lg font-bold transition-all duration-200", value > 0 && "border-2 border-[#1F1633]")}
          style={{
            left: PAD + x * STEP,
            top: PAD + y * STEP,
            width: CELL,
            height: CELL,
            background: value > 0 ? TILES[value].face : "var(--gp-socket)",
            color: value > 0 ? TILES[value].text : undefined,
          }}
        >
          {value > 0 ? TILES[value].label : ""}
        </span>
      ))
    )}
    {frame.piece && (
      <div
        key={frame.piece.id}
        className="absolute transition-transform duration-300 ease-out"
        style={{
          left: PAD,
          top: PAD,
          width: CELL * 3 + GAP * 2,
          height: CELL * 3 + GAP * 2,
          transform: `translate(${frame.piece.x * STEP}px, ${frame.piece.y * STEP}px) rotate(${frame.piece.turns * 90}deg)`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-[10px] border-2 border-[#1F1633] opacity-90"
            style={{ left: i * STEP, top: STEP, width: CELL, height: CELL, background: pieceColor("I3") }}
          />
        ))}
      </div>
    )}
  </div>
);

const Demo = () => {
  const [index, setIndex] = useState(0);
  const [touch] = useState(usesTouch);
  const frame = FRAMES[index];
  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % FRAMES.length), frame.ms);
    return () => clearTimeout(id);
  }, [index, frame.ms]);
  const control = frame.action && CONTROLS[frame.action][touch ? 0 : 1];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <Board frame={frame} />
        <div className={cn("rounded-[14px] p-1 transition-colors", frame.done ? "bg-[#45D486]" : "bg-transparent")}>
          <div className="gp-target-wrap w-[64px]">
            <div className="gp-target" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {rows(TARGET).flatMap((row, y) =>
                row.map((value, x) => (
                  <span
                    key={`${x}-${y}`}
                    className={cn("gp-target-cell", value > 0 && "gp-target-tile")}
                    style={value > 0 ? { background: TILES[value].face, color: TILES[value].text } : undefined}
                  >
                    {value > 0 ? TILES[value].label : ""}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <span className={cn("rounded-full border-2 border-[#1F1633] bg-white px-3 py-1 text-sm font-extrabold transition-opacity", control ? "opacity-100" : "opacity-0")}>
        {control ?? " "}
      </span>
    </div>
  );
};

export const HowToPlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,340px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-5 outline-none"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogTitle className="sr-only">How to play</DialogTitle>
      <DialogDescription className="sr-only">Build the target board in as few pieces as you can.</DialogDescription>
      <Demo />
      <button className="gp-btn gp-btn-primary mt-4 w-full" onClick={onClose}>
        Play
      </button>
    </DialogContent>
  </Dialog>
);
