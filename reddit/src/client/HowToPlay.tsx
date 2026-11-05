import { useEffect, useRef, useState } from "react";
import GameBoard from "@/components/game/GameBoard";
import { createEmptyGrid } from "@/utils/gameLogic";
import { parseTarget } from "@/utils/dailyCore";
import type { GridType, TetrominoType } from "@/types/game";
import { cn } from "@/lib/utils";
import { useDailyRun } from "./useDailyRun";
import { Hand, Keycap, pieceCenter, usesTouch } from "./Coach";
import { GameLayout, NextColumn, TargetCard, type Viewport } from "./GameLayout";

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

type Input = "place" | "rotate" | "left" | "right" | "up" | "down";

type Step = {
  /** [touch screens, keyboards] */
  title: [string, string];
  line?: string;
  pieces: TetrominoType[];
  board?: string;
  /** Where the first piece starts, if not where pieces spawn. */
  at?: { x: number; y: number };
  target?: string;
  script: { input: Input; wait: number }[];
  /** How long the end state stays up before the step plays again. */
  hold: number;
  /** Point out the Next column (the step that explains where pieces come from). */
  showNext?: boolean;
};

// Each step plays a few real moves on the real board, then repeats.
const STEPS: Step[] = [
  {
    title: ["Drag to move", "Arrow keys to move"],
    pieces: ["O"],
    script: [
      { input: "down", wait: 800 },
      { input: "left", wait: 650 },
      { input: "down", wait: 650 },
      { input: "right", wait: 650 },
      { input: "right", wait: 650 },
      { input: "up", wait: 650 },
      { input: "up", wait: 650 },
      { input: "left", wait: 650 },
    ],
    hold: 400,
  },
  {
    title: ["Double-tap to rotate", "A or D to rotate"],
    pieces: ["L"],
    script: [
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
      { input: "rotate", wait: 900 },
    ],
    hold: 400,
  },
  {
    title: ["Tap to place", "Space to place"],
    line: "The next piece comes from Next.",
    pieces: ["T", "O", "L", "I3", "S"],
    script: [{ input: "place", wait: 1200 }],
    hold: 2200,
    showNext: true,
  },
  {
    title: ["Tiles stack up", "Tiles stack up"],
    line: "Fill a line with one number to pop it.",
    pieces: ["I3"],
    board: "0000/0000/1112/0000",
    script: [
      { input: "down", wait: 1000 },
      { input: "place", wait: 1100 },
    ],
    hold: 2000,
  },
  {
    title: ["Match the target", "Match the target"],
    line: "Fewest pieces wins.",
    pieces: ["I3", "I3"],
    target: "1000/2110/1000/0000",
    script: [
      { input: "place", wait: 1000 },
      { input: "rotate", wait: 900 },
      { input: "left", wait: 800 },
      { input: "place", wait: 800 },
    ],
    hold: 2200,
  },
  {
    title: ["Don't reach 7", "Don't reach 7"],
    pieces: ["O"],
    board: "6300/3300/0000/0000",
    at: { x: 2, y: 2 },
    script: [
      { input: "up", wait: 900 },
      { input: "left", wait: 650 },
      { input: "up", wait: 650 },
      { input: "left", wait: 650 },
      { input: "place", wait: 1000 },
    ],
    hold: 2000,
  },
];

const KEY_LABEL: Record<Input, string> = { place: "Space", rotate: "D", left: "←", right: "→", up: "↑", down: "↓" };
const STEP_DELTA: Partial<Record<Input, [number, number]>> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
// Never matched, so only the first step ever "solves".
const NO_TARGET: GridType = parseTarget("5555/5555/5555/5555");
const BLANK_TARGET: GridType = createEmptyGrid(4);
// The hand or key goes down first; the board reacts a beat later, as if pressed.
const PRESS_DELAY = 320;
const WIDE_CAPTION_HEIGHT = 112;

/** Plays a step's script on a real run, over and over. */
function useStepDemo(step: Step) {
  const [run, dispatch] = useDailyRun();
  const [input, setInput] = useState<Input | null>(null);
  const [press, setPress] = useState(0);
  const [loop, setLoop] = useState(0);
  const runRef = useRef(run);
  runRef.current = run;
  const clearTarget = step.target ? parseTarget(step.target) : NO_TARGET;

  useEffect(() => {
    dispatch({ type: "start", pieces: step.pieces, grid: step.board ? parseTarget(step.board) : undefined, at: step.at });
    setInput(null);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    for (const { input: next, wait } of step.script) {
      at += wait;
      timers.push(
        setTimeout(() => {
          setInput(next);
          setPress((n) => n + 1);
        }, at)
      );
      timers.push(
        setTimeout(() => {
          const piece = runRef.current.current;
          const delta = STEP_DELTA[next];
          if (next === "place") dispatch({ type: "place" });
          else if (next === "rotate") dispatch({ type: "rotate", direction: "clockwise" });
          else if (piece && delta) dispatch({ type: "move", position: { x: piece.position.x + delta[0], y: piece.position.y + delta[1] } });
        }, at + PRESS_DELAY)
      );
    }
    timers.push(setTimeout(() => setLoop((n) => n + 1), at + PRESS_DELAY + step.hold));
    return () => timers.forEach(clearTimeout);
  }, [loop, step, dispatch]);

  useEffect(() => {
    if (!run.pendingClear) return;
    const id = setTimeout(() => dispatch({ type: "clear", target: clearTarget }), 200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.pendingClear]);

  return { run, input, press, loop };
}

/** The rules, played out on the game's own screen. */
export const HowToPlay = ({ viewport, onClose }: { viewport: Viewport; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const [touch] = useState(usesTouch);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const { run, input, press, loop } = useStepDemo(step);
  const { landscape } = viewport;
  const solved = run.outcome === "solved";

  return (
    <GameLayout
      viewport={viewport}
      top={
        <div className="gp-tabs gp-tabs-sm w-full items-center justify-between !px-3" style={{ minHeight: 40 }}>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-2 rounded-full transition-all", i === index ? "w-5 bg-[#7C5CFF]" : "w-2 bg-[#D9CCE9]")} />
            ))}
          </div>
          <button className="text-sm font-extrabold text-[color:var(--gp-muted)] hover:text-[color:var(--gp-ink)]" onClick={onClose}>
            Skip
          </button>
        </div>
      }
      side={
        landscape ? null : (
          <div className="gp-card flex flex-1 flex-col items-center justify-center gap-1.5 px-3 py-3 text-center">
            <h2 className="font-display text-[20px] font-bold leading-tight">{step.title[touch ? 0 : 1]}</h2>
            {step.line && <p className="text-sm font-bold leading-snug text-[color:var(--gp-muted)]">{step.line}</p>}
          </div>
        )
      }
      // Wide screens get the step in big type under the board, with the key being pressed.
      hints={
        landscape ? (
          <div className="flex items-center justify-between gap-4 pt-4" style={{ height: WIDE_CAPTION_HEIGHT }}>
            <div className="min-w-0">
              <h2 className="font-display text-[34px] font-bold leading-tight">{step.title[touch ? 0 : 1]}</h2>
              {step.line && <p className="mt-1 text-lg font-bold leading-snug text-[color:var(--gp-muted)]">{step.line}</p>}
            </div>
            {!touch && <div className="flex h-12 shrink-0 items-center">{input && <Keycap label={KEY_LABEL[input]} press={press} />}</div>}
          </div>
        ) : undefined
      }
      hintsHeight={WIDE_CAPTION_HEIGHT}
      target={<TargetCard target={step.target ? parseTarget(step.target) : BLANK_TARGET} landscape={landscape} dim={!step.target} highlight={solved ? "solved" : undefined} />}
      board={
        <div className="pointer-events-none relative">
          <GameBoard
            className="gp-board-wrap aspect-square w-full"
            grid={run.grid}
            currentPiece={run.current}
            pieceKey={`${index}-${loop}-${run.moves}`}
            pendingClear={run.pendingClear}
            bumpKey={0}
            scoreAnimations={[]}
            onPieceMove={() => undefined}
            onPiecePlace={() => undefined}
            onPieceRotate={() => undefined}
            gameOver={false}
            showPoints={false}
          />
          {touch && run.current && <Hand at={pieceCenter(run.current)} press={press} taps={input === "rotate" ? 2 : 1} />}
        </div>
      }
      next={<NextColumn queue={run.queue} landscape={landscape} highlight={step.showNext} />}
      bottom={
        <div className="flex gap-2">
          {index > 0 && (
            <button className="gp-btn flex-1" onClick={() => setIndex(index - 1)}>
              Back
            </button>
          )}
          <button className="gp-btn gp-btn-primary flex-[1.6]" onClick={() => (last ? onClose() : setIndex(index + 1))}>
            {last ? "Play" : "Next"}
          </button>
        </div>
      }
    />
  );
};
