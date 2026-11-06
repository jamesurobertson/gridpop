import { useEffect, useState, type ReactNode } from "react";
import PieceDisplay from "@/components/game/PieceDisplay";
import TargetGrid from "@/components/game/TargetGrid";
import type { GridType, Tetromino } from "@/types/game";
import { cn } from "@/lib/utils";

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

export const TargetCard = ({ target, landscape, highlight, dim, children }: { target: GridType; landscape: boolean; highlight?: "coach" | "solved" | "flash"; dim?: boolean; children?: ReactNode }) => (
  <div
    className={cn(
      "gp-card relative p-2.5 transition-shadow",
      landscape ? "w-full" : "w-[34%] max-w-[132px] shrink-0",
      highlight === "coach" && "ring-4 ring-[#7C5CFF]/40",
      highlight === "solved" && "ring-4 ring-[#45D486]",
      highlight === "flash" && "gp-target-flash"
    )}
  >
    <div className="gp-label mb-1.5">Target</div>
    <TargetGrid grid={target} className={cn("w-full transition-opacity", landscape && "mx-auto max-w-[236px]", dim && "opacity-40")} />
    {children}
  </div>
);

// Tetris-style: the next piece on top, the three after it below, smaller and fading.
export const NextColumn = ({ queue, landscape, highlight }: { queue: (Tetromino | null)[]; landscape: boolean; highlight?: boolean }) => (
  <div className={cn("flex shrink-0 flex-col items-center gap-2 rounded-2xl transition-shadow", landscape ? "w-[92px]" : "w-[68px]", highlight && "ring-4 ring-[#7C5CFF]/50 ring-offset-4 ring-offset-[#FFF6EA]")}>
    <div className={cn("gp-label", highlight && "text-[#7C5CFF]")}>Next</div>
    <div className={cn("gp-well w-full !p-2", highlight && "ring-[2.5px] ring-inset ring-[#7C5CFF]")}>
      <PieceDisplay piece={queue[0] ?? null} asTiles />
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i} className={cn("gp-well !p-1.5", landscape ? "w-[72px]" : "w-[52px]")} style={{ opacity: 1 - i * 0.18 }}>
        <PieceDisplay piece={queue[i] ?? null} asTiles />
      </div>
    ))}
  </div>
);

const KeyChip = ({ children }: { children: ReactNode }) => (
  <span className="font-display inline-grid h-7 min-w-[28px] place-items-center rounded-[7px] border-2 border-[#1F1633] bg-white px-1.5 text-[13px] font-bold text-[color:var(--gp-ink)] shadow-[0_2px_0_#1F1633]">{children}</span>
);

/** The keyboard controls, for under the board on wide screens. */
export const KeyHints = () => (
  <div className="flex items-center justify-center gap-5 text-xs font-extrabold text-[color:var(--gp-muted)]" style={{ height: HINTS_HEIGHT }}>
    <span className="flex items-center gap-1.5">
      <KeyChip>←</KeyChip>
      <KeyChip>↑</KeyChip>
      <KeyChip>↓</KeyChip>
      <KeyChip>→</KeyChip>
      Move
    </span>
    <span className="flex items-center gap-1.5">
      <KeyChip>A</KeyChip>
      <KeyChip>D</KeyChip>
      Rotate
    </span>
    <span className="flex items-center gap-1.5">
      <KeyChip>Space</KeyChip>
      Place
    </span>
  </div>
);

const HINTS_HEIGHT = 48;

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
      {top}
      <div className="flex gap-2.5">
        {target}
        {side}
      </div>
      {/* The board stays square, sized to the space's width (less the Next column) or its height, whichever is smaller. */}
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
        <div className="flex items-start gap-2.5">
          <div style={{ width: "min(calc(100cqw - 78px), 100cqh)" }}>{board}</div>
          {next}
        </div>
      </div>
      {bottom}
    </div>
  );
