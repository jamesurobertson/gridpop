import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Tetromino } from "@/types/game";
import { getCurrentShape } from "@/utils/gameLogic";
import { pieceColor } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";

interface PieceDisplayProps {
  piece: Tetromino | null;
  /** Fade it out (e.g. hold is used up this turn). */
  dim?: boolean;
  /** "wide" fits the frame to a lying-down piece (two rows of four), for the Next queue. */
  frame?: "square" | "wide";
  /** A white ring round each block, like the piece in play on the board. */
  ring?: boolean;
  className?: string;
}

/** The piece's shape with empty rows and columns trimmed off, so every piece sits centred. */
function trimmed(piece: Tetromino): boolean[][] {
  const shape = getCurrentShape(piece);
  const rows = shape.filter((r) => r.some(Boolean));
  const cols = shape[0].map((_, x) => shape.some((r) => r[x]));
  return rows.map((r) => r.filter((_, x) => cols[x]));
}

/** A small preview of a piece (Hold and Next), on a frame four cells wide so sizes stay consistent. */
const PieceDisplay = ({ piece, dim, frame = "square", ring, className }: PieceDisplayProps) => {
  const aspect = frame === "wide" ? "aspect-[2/1]" : "aspect-square";
  // Pops in when a new piece arrives here, but not on the first draw: a board that just opened
  // shows its queue already in place.
  const shown = useRef(false);
  useEffect(() => {
    if (piece) shown.current = true;
  }, [piece]);
  if (!piece) return <div className={cn(aspect, "w-full", className)} />;
  const shape = trimmed(piece);
  const w = shape[0].length;
  const h = shape.length;
  const color = pieceColor(piece.shape.type);
  // Cells are a quarter of the width, unless the piece is too tall for the frame.
  const rowsFit = frame === "wide" ? 2 : 4;
  const width = (w / Math.max(4, (h * 4) / rowsFit)) * 100;
  // Optical centring: a lopsided piece (a J's lone corner block) looks off-centre when its box is
  // centred, so nudge it sideways halfway toward centring its blocks. Not up or down: a two-row
  // piece already fills a wide frame's height and would be pushed out of it.
  const blocks = shape.flatMap((row, y) => row.flatMap((on, x) => (on ? [{ x, y }] : [])));
  const nudge = (size: number, mean: number) => ((size / 2 - (mean + 0.5)) / size) * 50;
  const nudgeX = nudge(w, blocks.reduce((sum, block) => sum + block.x, 0) / blocks.length);
  return (
    <motion.div
      key={`${piece.shape.type}-${piece.rotation}`}
      className={cn("flex w-full items-center justify-center", aspect, dim && "opacity-35", className)}
      // Scale only: framer hands opacity springs to the browser, which shows the start value for a
      // frame as the animation ends, so the piece blinked out just as it settled.
      initial={shown.current ? { scale: 0.6 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
    >
      <div
        className="grid gap-[6%]"
        style={{ width: `${width}%`, gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)`, transform: `translateX(${nudgeX}%)` }}
      >
        {shape.flatMap((row, y) =>
          row.map((on, x) => (
            <div key={`${x}-${y}`} className={cn("aspect-square rounded-[28%]", on && "gp-mini", on && ring && "gp-mini-ring")} style={on ? { ["--pc" as string]: color } : undefined} />
          ))
        )}
      </div>
    </motion.div>
  );
};

export default PieceDisplay;
