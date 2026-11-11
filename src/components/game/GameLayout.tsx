import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
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

// Each piece after the one on the panel is a little fainter than the one before.
const QUEUE_OPACITY = [0.9, 0.65, 0.45, 0.38, 0.32];

// Pieces glide between slots; a touch of stagger down the column makes the queue move as one line.
const SLIDE = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;
const FADE = { duration: 0.25, ease: "easeOut" } as const;

// Unlimited deals new pieces onto the end, so its pieces are told apart by identity.
const pieceIds = new WeakMap<Tetromino, number>();
let lastPieceId = 0;
function pieceId(piece: Tetromino) {
  let id = pieceIds.get(piece);
  if (id === undefined) {
    id = ++lastPieceId;
    pieceIds.set(piece, id);
  }
  return id;
}

type SlotBox = { top: number; left: number; width: number; bottom: number };

/** Position inside `ancestor` from layout offsets, which (unlike screen rects) ignore the desktop stage's scale. */
function offsetWithin(element: HTMLElement, ancestor: HTMLElement) {
  let top = 0;
  let left = 0;
  for (let node: HTMLElement | null = element; node && node !== ancestor; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
    left += node.offsetLeft;
  }
  return { top, left };
}

// The next piece on its own little board, ringed white like the piece in play; the ones after it
// below, the same size and fainter. Unlimited shows three after it. A daily passes `pieces`, its
// whole run, and shows every one (up to a Hard day's seven) with a count where the line ends, so
// the space below doesn't look like more to come. It's sized for the whole run so the card doesn't
// shrink as pieces are used, and packed tighter past three.
// The slots are fixed, empty frames; the pieces float over them, so placing one pops it off the
// panel and slides the rest up, and an undo plays it backwards.
export const NextColumn = ({ queue, landscape, highlight, pieces }: { queue: (Tetromino | null)[]; landscape: boolean; highlight?: boolean; pieces?: number }) => {
  const showAll = pieces !== undefined;
  // The piece in play and the one in the panel aren't in these slots.
  const slots = showAll ? Math.min(QUEUE_OPACITY.length, Math.max(3, pieces - 2)) : 3;
  const packed = slots > 3;
  const remaining = queue.filter(Boolean).length;

  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tailRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ slots: SlotBox[]; tail: { left: number; width: number } | null } | null>(null);

  const measure = () => {
    const card = cardRef.current;
    const panel = panelRef.current;
    const frames = frameRefs.current.slice(0, slots + 1);
    if (!card || !panel || frames.some((frame) => !frame)) return;
    const next = {
      slots: frames.map((frame, i) => {
        const at = offsetWithin(frame!, card);
        // The panel's piece sits inside its padding; the line ends below the panel itself.
        const bottom = i === 0 ? offsetWithin(panel, card).top + panel.offsetHeight : at.top + frame!.offsetHeight;
        return { top: at.top, left: at.left, width: frame!.offsetWidth, bottom };
      }),
      tail: tailRef.current ? { left: offsetWithin(tailRef.current, card).left, width: tailRef.current.offsetWidth } : null,
    };
    setMeasured((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useLayoutEffect(measure);
  useEffect(() => {
    const observer = new ResizeObserver(() => measureRef.current());
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Measured for another slot count (the column was just switched): wait for this layout's.
  const boxes = measured && measured.slots.length === slots + 1 ? measured : null;
  const shownPieces = queue.slice(0, slots + 1).flatMap((piece, slot) =>
    piece ? [{ piece, slot, key: showAll ? pieces - queue.length + slot : pieceId(piece) }] : []
  );
  // Once the last piece goes, the count stays under the panel showing its last number and fades out.
  const lastSlot = Math.max(0, Math.min(slots, remaining - 1));
  const tailTop = boxes ? boxes.slots[lastSlot].bottom + (boxes.slots[1].top - boxes.slots[0].bottom) : 0;
  const lastCount = useRef(remaining);
  if (remaining > 0) lastCount.current = remaining;
  const frameClass = cn("aspect-[2/1] shrink-0", packed ? "mt-0.5" : "mt-1", landscape ? "w-[76%]" : "w-[82%]");

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={cardRef}
        className={cn(
          "gp-card relative flex shrink-0 flex-col items-center transition-shadow",
          packed ? "gap-1.5" : "gap-2",
          landscape ? "w-[100px] p-2 pb-3" : "w-[72px] p-1.5 pb-2.5",
          highlight && "ring-4 ring-[#7C5CFF]/40"
        )}
      >
        <div className={cn("gp-label pt-0.5", highlight && "text-[#7C5CFF]")}>Next</div>
        <div
          ref={panelRef}
          data-next-panel
          className={cn(
            "w-full rounded-[14px] transition-colors duration-300",
            queue[0] ? "bg-[color:var(--gp-board)]" : "bg-transparent",
            landscape ? "px-[12%] py-[14%]" : "px-[9%] py-[11%]",
            highlight && "ring-[3px] ring-[#7C5CFF] ring-offset-2"
          )}
        >
          <div ref={(element) => (frameRefs.current[0] = element)} className="aspect-[2/1] w-full" />
        </div>
        {showAll && !queue[0] && (
          // Waits for the last piece's pop to clear the panel.
          <motion.div
            className="-mt-[40%] text-center text-[11px] font-extrabold leading-tight text-[color:var(--gp-muted)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...FADE, delay: 0.15 }}
          >
            No more pieces
          </motion.div>
        )}
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} ref={(element) => (frameRefs.current[i + 1] = element)} className={frameClass} />
        ))}
        {/* Holds the count's room at the foot of the card; the count itself rides below the last piece. */}
        {showAll && <TailCount ref={tailRef} remaining={remaining} className={cn("invisible", packed ? "mt-0.5" : "mt-1")} />}

        {boxes && (
          <>
            <AnimatePresence initial={false}>
              {shownPieces.map(({ piece, slot, key }) => {
                const box = boxes.slots[slot];
                return (
                  <motion.div
                    key={key}
                    className="pointer-events-none absolute left-0 top-0"
                    style={{ left: box.left, width: box.width }}
                    initial={{ y: box.top, scale: 0.6, opacity: 0 }}
                    animate={{ y: box.top, scale: 1, opacity: slot === 0 ? 1 : QUEUE_OPACITY[slot - 1] }}
                    exit={{ scale: 1.25, opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }}
                    transition={{ y: { ...SLIDE, delay: slot * 0.025 }, scale: SLIDE, opacity: FADE }}
                  >
                    <PieceDisplay piece={piece} frame="wide" ring={slot === 0} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {showAll && boxes.tail && (
              <motion.div
                className="pointer-events-none absolute left-0 top-0"
                style={{ left: boxes.tail.left, width: boxes.tail.width }}
                initial={false}
                animate={{ y: tailTop, opacity: remaining > 0 ? 1 : 0 }}
                transition={{ y: { ...SLIDE, delay: (lastSlot + 1) * 0.025 }, opacity: { duration: 0.15, ease: "easeOut" } }}
              >
                <TailCount remaining={lastCount.current} />
              </motion.div>
            )}
          </>
        )}
      </div>
    </MotionConfig>
  );
};

const TailCount = forwardRef<HTMLDivElement, { remaining: number; className?: string }>(({ remaining, className }, ref) => (
  <div ref={ref} className={cn("flex w-full flex-col items-center gap-1", className)}>
    <div className="w-[60%] border-t-2 border-dashed border-[color:var(--gp-line)]" />
    <div className="gp-label !text-[color:var(--gp-ink)]">{remaining} left</div>
  </div>
));
TailCount.displayName = "TailCount";

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
