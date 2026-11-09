import { useEffect, useState, type ReactNode, type RefObject } from "react";
import PieceDisplay from "@/components/game/PieceDisplay";
import TargetGrid from "@/components/game/TargetGrid";
import { RotateCcw, RotateCw } from "lucide-react";
import { Logo } from "@/components/game/Logo";
import type { GridType, Tetromino } from "@/types/game";
import { cn } from "@/lib/utils";
import { keyLabel } from "@/utils/controls";

// Wide views lay out a fixed "stage" (board, Next column, side panel) and scale it as one piece,
// so the parts keep their proportions from a small desktop modal up to fullscreen.
const STAGE = { width: 900, height: 468, margin: 24 };
const BOARD = 468;

export function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const landscape = size.width >= 600 && size.width > size.height * 1.15;
  return { landscape, ...size };
}

const stageScale = (viewport: Viewport, stageHeight: number) =>
  Math.min((viewport.width - STAGE.margin * 2) / STAGE.width, (viewport.height - STAGE.margin * 2) / stageHeight);

export type Viewport = ReturnType<typeof useViewport>;

export const TargetCard = ({
  target,
  landscape,
  highlight,
  dim,
  reveal,
  hideGrid,
  landed,
  gridRef,
  children,
}: {
  target: GridType;
  landscape: boolean;
  highlight?: "coach" | "solved" | "flash";
  dim?: boolean;
  reveal?: boolean;
  /** Kept in place but unseen, while the tutorial's big copy of it flies in. */
  hideGrid?: boolean;
  /** Just received the tutorial's big target: plays a one-time bump. */
  landed?: boolean;
  gridRef?: RefObject<HTMLDivElement>;
  children?: ReactNode;
}) => (
  <div
    className={cn(
      "gp-card relative p-2.5 transition-shadow",
      landscape ? "w-full" : "w-[34%] max-w-[132px] shrink-0",
      highlight === "coach" && "ring-4 ring-[#7C5CFF]/40",
      highlight === "solved" && "ring-4 ring-[#45D486]",
      highlight === "flash" && "gp-target-flash",
      landed && "gp-target-land"
    )}
  >
    <div className="gp-label mb-1.5">Target</div>
    <div ref={gridRef} className={cn("w-full transition-opacity", landscape && "mx-auto max-w-[196px]", dim && "opacity-40", hideGrid && "invisible")}>
      <TargetGrid grid={target} reveal={reveal} className="w-full" />
    </div>
    {children}
  </div>
);

const QUEUE_STEPS = [
  { width: "88%", opacity: 0.9 },
  { width: "76%", opacity: 0.65 },
  { width: "64%", opacity: 0.45 },
];

// The next piece on its own little board, ringed white like the piece in play; the three after it
// below, smaller and fainter.
export const NextColumn = ({ queue, landscape, highlight }: { queue: (Tetromino | null)[]; landscape: boolean; highlight?: boolean }) => (
  <div
    className={cn(
      "gp-card flex shrink-0 flex-col items-center gap-2 transition-shadow",
      landscape ? "w-[100px] p-2 pb-3" : "w-[72px] p-1.5 pb-2.5",
      highlight && "ring-4 ring-[#7C5CFF]/40"
    )}
  >
    <div className={cn("gp-label pt-0.5", highlight && "text-[#7C5CFF]")}>Next</div>
    <div className={cn("w-full rounded-[14px] transition-colors", queue[0] ? "bg-[color:var(--gp-board)]" : "bg-transparent", landscape ? "px-[12%] py-[14%]" : "px-[9%] py-[11%]", highlight && "ring-[3px] ring-[#7C5CFF] ring-offset-2")}>
      <PieceDisplay piece={queue[0] ?? null} frame="wide" ring />
    </div>
    {QUEUE_STEPS.map((step, i) => (
      <div key={i} className="mt-1" style={{ width: step.width, opacity: step.opacity }}>
        <PieceDisplay piece={queue[i + 1] ?? null} frame="wide" />
      </div>
    ))}
  </div>
);

const KeyChip = ({ children }: { children: ReactNode }) => (
  <span className="font-display inline-grid h-7 min-w-[28px] place-items-center rounded-[7px] border-2 border-[#1F1633] bg-white px-1.5 text-[13px] font-bold text-[color:var(--gp-ink)] shadow-[0_2px_0_#1F1633]">{children}</span>
);

export type HintKeys = { left: string; up: string; down: string; right: string; rotateBack: string; rotate: string; place: string; hold?: string };

const DEFAULT_HINT_KEYS: HintKeys = { left: "ArrowLeft", up: "ArrowUp", down: "ArrowDown", right: "ArrowRight", rotateBack: "a", rotate: "d", place: " " };


/** The keyboard controls, for under the board on wide screens. */
export const KeyHints = ({ keys = DEFAULT_HINT_KEYS }: { keys?: HintKeys }) => (
  <div className={cn("flex items-center justify-center text-xs font-extrabold text-[color:var(--gp-muted)]", keys.hold ? "gap-3.5" : "gap-5")} style={{ height: HINTS_HEIGHT }}>
    <span className="flex items-center gap-1.5">
      {[keys.left, keys.up, keys.down, keys.right].map((key, i) => (
        <KeyChip key={i}>{keyLabel(key)}</KeyChip>
      ))}
      Move
    </span>
    <span className="flex items-center gap-1.5">
      <KeyChip>{keyLabel(keys.rotateBack)}</KeyChip>
      <KeyChip>{keyLabel(keys.rotate)}</KeyChip>
      Rotate
    </span>
    <span className="flex items-center gap-1.5">
      <KeyChip>{keyLabel(keys.place)}</KeyChip>
      Place
    </span>
    {keys.hold && (
      <span className="flex items-center gap-1.5">
        <KeyChip>{keyLabel(keys.hold)}</KeyChip>
        Hold
      </span>
    )}
  </div>
);

const HINTS_HEIGHT = 48;

/** Touch controls for players who'd rather not tap the board: turn either way, and place. */
export const TouchButtons = ({ onRotate, onPlace, highlight }: { onRotate: (direction: "clockwise" | "counterclockwise") => void; onPlace: () => void; highlight?: "rotate" | "place" }) => (
  <div className="flex shrink-0 gap-2">
    <button className={cn("gp-icon-btn !h-[52px] !w-[60px]", highlight === "rotate" && "gp-corner-btn-hinted")} onClick={() => onRotate("counterclockwise")} aria-label="Rotate left">
      <RotateCcw size={24} strokeWidth={2.75} />
    </button>
    <button className={cn("gp-icon-btn !h-[52px] !w-[60px]", highlight === "rotate" && "gp-corner-btn-hinted")} onClick={() => onRotate("clockwise")} aria-label="Rotate right">
      <RotateCw size={24} strokeWidth={2.75} />
    </button>
    <button className={cn("gp-btn gp-btn-primary !min-h-[52px] flex-1 text-base", highlight === "place" && "gp-corner-btn-hinted")} onClick={onPlace}>
      Place
    </button>
  </div>
);

type Slots = { top: ReactNode; side: ReactNode; target: ReactNode; board: ReactNode; next: ReactNode; bottom: ReactNode; hints?: ReactNode; hintsHeight?: number };

/** The game screen's frame. The game and the how-to-play both fill it, so they look the same at every size. */
export const GameLayout = ({ viewport, top, side, target, board, next, bottom, hints, hintsHeight = HINTS_HEIGHT }: Slots & { viewport: Viewport }) => {
  if (!viewport.landscape) return <PortraitLayout {...{ top, side, target, board, next, bottom }} />;
  const stageHeight = STAGE.height + (hints ? hintsHeight : 0);
  return (
    <div className="relative h-full">
      {/* Centred from its midpoint, so a stage wider than the window still scales down in place. */}
      <div
        className="absolute left-1/2 top-1/2 flex items-start gap-4"
        style={{ width: STAGE.width, height: stageHeight, transform: `translate(-50%, -50%) scale(${stageScale(viewport, stageHeight)})` }}
      >
        <div className="shrink-0" style={{ width: BOARD }}>
          {board}
          {hints}
        </div>
        {next}
        <aside className="flex min-w-0 flex-1 flex-col justify-between gap-2.5" style={{ height: STAGE.height }}>
          <Logo className="mx-auto text-[28px]" />
          {top}
          {side}
          {target}
          {bottom}
        </aside>
      </div>
    </div>
  );
};

const PortraitLayout = ({ top, side, target, board, next, bottom }: Omit<Slots, "hints" | "hintsHeight">) => (
    <div className="mx-auto flex h-full max-w-[480px] flex-col gap-2.5 p-3">
      {/* Short phones keep the space for the board. */}
      <Logo className="mx-auto text-[26px] [@media(max-height:620px)]:hidden" />
      {top}
      <div className="flex gap-2.5">
        {target}
        {side}
      </div>
      {/* The board stays square, sized to the space's width (less the Next column) or its height, whichever is smaller. */}
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
        <div className="flex items-start gap-2.5">
          <div style={{ width: "min(calc(100cqw - 82px), 100cqh)" }}>{board}</div>
          {next}
        </div>
      </div>
      {bottom}
    </div>
  );
