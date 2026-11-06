import { motion } from "framer-motion";
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

/** The tutorial's instruction as a tooltip just above the piece, so the eye stays on the board. */
export const PieceTip = ({ piece, text }: { piece: Tetromino; text: string }) => {
  const cells = getCurrentShape(piece).flatMap((row, y) => row.flatMap((on, x) => (on ? [[piece.position.x + x, piece.position.y + y]] : [])));
  const top = (Math.min(...cells.map((cell) => cell[1])) / 4) * 100;
  // Kept off the board's side edges, where a centred pill would hang out of the frame.
  const left = Math.min(78, Math.max(22, pieceCenter(piece).x));
  return (
    <div className="pointer-events-none absolute z-40 transition-[left,top] duration-300 ease-out" style={{ left: `${left}%`, top: `${top}%` }}>
      <motion.div
        key={text}
        className="absolute bottom-1.5 left-0 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#1F1633] bg-[#7C5CFF] px-3.5 py-1.5 text-[15px] font-extrabold text-white shadow-[0_3px_0_#1F1633]"
        initial={{ opacity: 0, y: 6, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.3, bounce: 0.25 }}
      >
        {text}
        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#1F1633] bg-[#7C5CFF]" />
      </motion.div>
    </div>
  );
};

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
      <HandIcon />
    </motion.div>
  </div>
);

// One closed outline, so the white fill covers the whole hand; the knuckle lines are drawn on top.
const HandIcon = () => (
  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#1F1633" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_3px_4px_rgba(31,22,51,0.45)]" aria-hidden>
    <path
      fill="#FFFFFF"
      d="M6 14V4a2 2 0 0 1 4 0v5a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15Z"
    />
    <path d="M10 9v2.5M14 10v2M18 11v1.5" />
  </svg>
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

type Point = { x: number; y: number };

/** A tap (or double tap) on the spot, over and over: "place here" / "rotate it". */
export const TapHand = ({ at, taps = 1 }: { at: Point; taps?: 1 | 2 }) => (
  <div className="pointer-events-none absolute z-40 transition-[left,top] duration-300 ease-out" style={{ left: `${at.x}%`, top: `${at.y}%` }}>
    <motion.span
      className="absolute -left-5 -top-5 h-10 w-10 rounded-full border-[3px] border-white"
      animate={{ scale: [0.3, 1.6], opacity: [0.9, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: taps === 2 ? 0.15 : 0.9 }}
    />
    <motion.div
      className="-translate-x-[30%] -translate-y-[8%]"
      animate={{ scale: taps === 2 ? [1, 0.8, 1, 0.8, 1] : [1, 0.8, 1] }}
      transition={{ duration: taps === 2 ? 0.6 : 0.35, repeat: Infinity, repeatDelay: taps === 2 ? 0.75 : 1.05 }}
    >
      <HandIcon />
    </motion.div>
  </div>
);

/**
 * A drag, so it can't be mistaken for a tap: the hand presses on the piece, slides along a dashed
 * path to where it should go, lifts, and goes again.
 */
export const DragHand = ({ from, to }: { from: Point; to: Point }) => (
  <>
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="white" strokeOpacity={0.85} strokeWidth={1.6} strokeDasharray="3 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    <motion.div
      key={`${from.x},${from.y}->${to.x},${to.y}`}
      className="pointer-events-none absolute z-40"
      initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0 }}
      animate={{
        left: [`${from.x}%`, `${from.x}%`, `${to.x}%`, `${to.x}%`],
        top: [`${from.y}%`, `${from.y}%`, `${to.y}%`, `${to.y}%`],
        opacity: [0, 1, 1, 0],
        scale: [1.1, 0.88, 0.88, 1],
      }}
      transition={{ duration: 1.8, times: [0, 0.18, 0.75, 1], repeat: Infinity, repeatDelay: 0.35, ease: "easeInOut" }}
    >
      <div className="-translate-x-[30%] -translate-y-[8%]">
        <HandIcon />
      </div>
    </motion.div>
  </>
);
