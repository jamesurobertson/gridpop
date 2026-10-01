import { motion } from "framer-motion";
import { Tetromino } from "@/types/game";
import { getCurrentShape } from "@/utils/gameLogic";
import { pieceColor } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";

interface PieceDisplayProps {
  piece: Tetromino | null;
  /** Fade it out (e.g. hold is used up this turn). */
  dim?: boolean;
  className?: string;
}

/** The piece's shape with empty rows and columns trimmed off, so every piece sits centred. */
function trimmed(piece: Tetromino): boolean[][] {
  const shape = getCurrentShape(piece);
  const rows = shape.filter((r) => r.some(Boolean));
  const cols = shape[0].map((_, x) => shape.some((r) => r[x]));
  return rows.map((r) => r.filter((_, x) => cols[x]));
}

/** A small preview of a piece (Hold and Next), always on a 4-wide frame so sizes stay consistent. */
const PieceDisplay = ({ piece, dim, className }: PieceDisplayProps) => {
  if (!piece) return <div className={cn("aspect-square w-full", className)} />;
  const shape = trimmed(piece);
  const w = shape[0].length;
  const h = shape.length;
  const color = pieceColor(piece.shape.type);
  return (
    <motion.div
      key={`${piece.shape.type}-${piece.rotation}`}
      className={cn("flex aspect-square w-full items-center justify-center transition-opacity", dim && "opacity-35", className)}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: dim ? 0.35 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
    >
      <div className="grid gap-[6%]" style={{ width: `${(w / 4) * 100}%`, gridTemplateColumns: `repeat(${w}, 1fr)`, gridTemplateRows: `repeat(${h}, 1fr)` }}>
        {shape.flatMap((row, y) =>
          row.map((on, x) => (
            <div key={`${x}-${y}`} className={cn("aspect-square rounded-[28%]", on && "gp-mini")} style={on ? { ["--pc" as string]: color } : undefined} />
          ))
        )}
      </div>
    </motion.div>
  );
};

export default PieceDisplay;
