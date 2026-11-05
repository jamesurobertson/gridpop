import { motion } from "framer-motion";
import { Pointer } from "lucide-react";
import type { Tetromino } from "@/types/game";
import { getCurrentShape } from "@/utils/gameLogic";

export const usesTouch = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

/** The middle of a piece's blocks, as a percentage of a 4×4 board. */
export function pieceCenter(piece: Tetromino | null) {
  if (!piece) return { x: 50, y: 50 };
  const cells = getCurrentShape(piece).flatMap((row, y) => row.flatMap((on, x) => (on ? [[piece.position.x + x, piece.position.y + y]] : [])));
  const mean = (i: number) => cells.reduce((sum, cell) => sum + cell[i], 0) / cells.length;
  return { x: ((mean(0) + 0.5) / 4) * 100, y: ((mean(1) + 0.5) / 4) * 100 };
}

/**
 * A hand over the board that follows the piece. Each new `press` taps once (or twice), with a
 * ripple at the fingertip; with no presses it bobs gently, as a "do this" hint.
 */
export const Hand = ({ at, press, taps = 1 }: { at: { x: number; y: number }; press: number; taps?: 1 | 2 }) => (
  <div className="pointer-events-none absolute z-40 transition-[left,top] duration-300 ease-out" style={{ left: `${at.x}%`, top: `${at.y}%` }}>
    {press > 0 && (
      <motion.span
        key={`ripple-${press}`}
        className="absolute -left-5 -top-5 h-10 w-10 rounded-full border-[3px] border-white"
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.5, repeat: taps - 1, repeatDelay: 0.05 }}
      />
    )}
    <motion.div
      key={`hand-${press}`}
      // The icon's fingertip sits near its top-left; shift it so the tip is on the point.
      className="-translate-x-[30%] -translate-y-[8%]"
      animate={press > 0 ? { scale: taps === 2 ? [1, 0.8, 1, 0.8, 1] : [1, 0.8, 1] } : { y: [0, 6, 0] }}
      transition={press > 0 ? { duration: taps === 2 ? 0.6 : 0.35 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    >
      <Pointer size={40} strokeWidth={1.75} fill="#FFFFFF" color="#1F1633" className="drop-shadow-[0_3px_4px_rgba(31,22,51,0.45)]" />
    </motion.div>
  </div>
);

/** A keyboard key that dips each time `press` changes. */
export const Keycap = ({ label, press }: { label: string; press: number }) => (
  <motion.span
    key={press}
    className="font-display inline-grid h-10 min-w-[40px] place-items-center rounded-xl border-[2.5px] border-[#1F1633] bg-white px-3 text-base font-bold"
    initial={{ y: 0, boxShadow: "0 4px 0 #1F1633" }}
    animate={press > 0 ? { y: [0, 3, 0], boxShadow: ["0 4px 0 #1F1633", "0 1px 0 #1F1633", "0 4px 0 #1F1633"] } : {}}
    transition={{ duration: 0.35 }}
  >
    {label}
  </motion.span>
);
