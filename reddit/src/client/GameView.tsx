import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { showLoginPrompt, showShareSheet, showToast } from "@devvit/web/client";
import { CircleHelp, Flame, Lightbulb, RotateCcw, Trophy, Undo2, Volume2, VolumeX } from "lucide-react";
import GameBoard from "@/components/game/GameBoard";
import DailyResultModal from "@/components/game/DailyResultModal";
import { createEmptyGrid, getCurrentShape, isValidPosition, tryWallKick } from "@/utils/gameLogic";
import type { Placement, RunAction } from "@/utils/dailyRun";
import type { Tetromino } from "@/types/game";
import { DAILY_LEVELS, DailyLevel, DailyResult, dailyScore, formatClock, msUntilEasternMidnight, parseTarget } from "@/utils/dailyCore";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import type { LeaderboardResponse, LevelStats, PuzzleResponse, SavedResult } from "../shared/api";
import { fetchLeaderboard, fetchPuzzle, loadClock, loadLevel, recordAttempt, requestHint, saveClock, saveLevel, submitRun } from "./api";
import { STEP_TEXT, TUTORIAL_PIECES, TUTORIAL_TARGET, TutorialDone, TutorialIntro, firstVisit, markSeen, onSpot, tutorialStep } from "./Tutorial";
import { DragHand, Hand, PieceTip, TapHand, pieceCenter, usesTouch } from "./Coach";
import { DemoBoard, usePatientLoading } from "./Loader";
import { Leaderboard, LeaderboardSkeleton } from "./Leaderboard";
import { CommentBox } from "./CommentBox";
import { GameLayout, KeyHints, NextColumn, TargetCard, useViewport } from "./GameLayout";
import { useDailyRun } from "./useDailyRun";

const NO_STATS: LevelStats = { played: 0, streak: 0, bestStreak: 0, overPar: [0, 0, 0, 0] };

const KEYS = { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", rotate: "d", rotateBack: "a", place: " ", undo: "z", hint: "h" };
const HINT_COOLDOWN_MS = 10_000;
const EMPTY_TARGET = createEmptyGrid(4);
const FOLDED_ROWS_GUESS = 3;

/** The cells a piece would cover at a hint's spot. */
const cellsAt = (piece: Tetromino, { rotation, x, y }: Placement) =>
  getCurrentShape({ ...piece, rotation, position: { x, y } }).flatMap((row, dy) => row.flatMap((on, dx) => (on ? [{ x: x + dx, y: y + dy }] : [])));

const sameCells = (a: { x: number; y: number }[], b: { x: number; y: number }[]) =>
  a.length === b.length && a.every((cell) => b.some((other) => other.x === cell.x && other.y === cell.y));

/** How many actions undoing `placements` placements takes off the end (holds go with their placement). */
function placementsUndone(actions: RunAction[], placements: number) {
  let seen = 0;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (actions[i].type === "place" && ++seen === placements) return actions.length - i;
  }
  return placements === 0 ? 0 : actions.length;
}

/** The middle of a set of cells, in % of the board. */
const spotCenter = (cells: { x: number; y: number }[]) => ({
  x: ((cells.reduce((sum, c) => sum + c.x, 0) / Math.max(1, cells.length) + 0.5) / 4) * 100,
  y: ((cells.reduce((sum, c) => sum + c.y, 0) / Math.max(1, cells.length) + 0.5) / 4) * 100,
});

export const Game = () => {
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [level, setLevel] = useState<DailyLevel>(loadLevel);
  const [run, dispatch] = useDailyRun();
  const [result, setResult] = useState<DailyResult | null>(null);
  const [stats, setStats] = useState<LevelStats>(NO_STATS);
  const [attempts, setAttempts] = useState(0);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [clockMs, setClockMs] = useState(0);
  const [clockRunning, setClockRunning] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [runNumber, setRunNumber] = useState(0);
  const [muted, setMuted] = useState(sfx.muted);
  const viewport = useViewport();
  const { landscape } = viewport;
  // Runs after the recorded solve: played the same way, but never sent to the server.
  const [practice, setPractice] = useState(false);
  const [practiceAttempts, setPracticeAttempts] = useState(0);
  const [practiceResult, setPracticeResult] = useState<DailyResult | null>(null);
  // The tutorial level plays on the real board; first-time players start there.
  const [tutorial, setTutorial] = useState(firstVisit);
  const [tutorialDoneOpen, setTutorialDoneOpen] = useState(false);
  const [tutorialGoalSeen, setTutorialGoalSeen] = useState(false);
  const [goalDocking, setGoalDocking] = useState(false);
  const targetSlot = useRef<HTMLDivElement>(null);
  // "+1" over each tile a tutorial piece lands on: the game's one rule, shown where it happens.
  const [plusOnes, setPlusOnes] = useState<{ id: number; cells: { x: number; y: number }[] }[]>([]);
  const plusOneId = useRef(0);
  const [boardLoading, setBoardLoading] = useState(false);
  // The very first game gets pointers: what to match, and how to put a piece down.
  const [coaching, setCoaching] = useState(() => {
    try {
      return localStorage.getItem("gridpop-coached") !== "1";
    } catch {
      return false;
    }
  });
  const [touch] = useState(usesTouch);
  // A hint is a spot for the piece in play once the run is back to its first `base` actions (after
  // undoing, if it was a dead end). `prefix` is those actions, so any other change drops the hint.
  const [hint, setHint] = useState<{ placement: Placement; base: number; prefix: string; reached: boolean } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintReadyAt, setHintReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  // The run whose first placement was counted as an attempt, so undoing back to empty doesn't count again.
  const countedRun = useRef(-1);

  const levelPuzzle = puzzle?.levels[level];
  const target = levelPuzzle ? parseTarget(levelPuzzle.target) : null;
  const { showLoader, ready } = usePatientLoading(!puzzle);
  const leaderboardWait = usePatientLoading(boardLoading && !board);

  /** Keeps the loaded puzzle in step, so switching levels and back shows what happened there. */
  const remember = (forLevel: DailyLevel, change: { result?: SavedResult; stats?: LevelStats; attempts?: number }) =>
    setPuzzle((current) =>
      current && {
        ...current,
        results: change.result ? { ...current.results, [forLevel]: change.result } : current.results,
        stats: change.stats ? { ...current.stats, [forLevel]: change.stats } : current.stats,
        attempts: change.attempts !== undefined ? { ...current.attempts, [forLevel]: change.attempts } : current.attempts,
      }
    );

  // ---------- loading a level ----------

  const openLevel = (data: PuzzleResponse, next: DailyLevel) => {
    const saved = data.results[next];
    setLevel(next);
    saveLevel(next);
    setResult(saved);
    setStats(data.stats[next]);
    setAttempts(data.attempts[next]);
    setClockMs(saved ? saved.timeMs : loadClock(data.date, next));
    setClockRunning(false);
    setBoard(null);
    setRunNumber((n) => n + 1);
    setPractice(false);
    setPracticeResult(null);
    setHint(null);
    setHintsUsed(0);
    if (saved) {
      dispatch({ type: "showSolved", target: parseTarget(data.levels[next].target) });
      setShowResult(true);
      if (data.username) {
        setBoardLoading(true);
        void fetchLeaderboard(next)
          .then(setBoard)
          .catch(() => undefined)
          .finally(() => setBoardLoading(false));
      }
    } else {
      dispatch({ type: "start", pieces: data.levels[next].pieces });
      setShowResult(false);
    }
  };

  useEffect(() => {
    fetchPuzzle()
      .then((data) => {
        setPuzzle(data);
        openLevel(data, level);
        if (firstVisit()) startTutorial();
      })
      .catch(() => setLoadFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLevel = (next: DailyLevel) => {
    if (!puzzle || next === level) return;
    sfx.play("click");
    // Leaving mid-run keeps the clock; coming back starts a fresh run, which counts as a restart.
    if (!result) saveClock(puzzle.date, level, clockMs);
    openLevel(puzzle, next);
  };

  // ---------- the clock ----------

  useEffect(() => {
    if (!clockRunning || run.outcome) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // Capped so time in a background tab (where timers stall) doesn't land all at once.
      const delta = document.hidden ? 0 : Math.min(now - last, 1000);
      last = now;
      setClockMs((ms) => ms + delta);
    }, 250);
    return () => clearInterval(id);
  }, [clockRunning, run.outcome]);

  useEffect(() => {
    if (puzzle && !result && clockMs > 0) saveClock(puzzle.date, level, clockMs);
  }, [puzzle, result, level, clockMs]);

  // ---------- turn flow ----------

  useEffect(() => {
    const clearTarget = tutorial ? TUTORIAL_TARGET : target;
    if (!run.pendingClear || !clearTarget) return;
    const timeout = setTimeout(() => dispatch({ type: "clear", target: clearTarget }), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.pendingClear]);

  const seenAnimations = useRef(new Set<number>());
  useEffect(() => {
    for (const a of run.scoreAnimations) {
      if (seenAnimations.current.has(a.id)) continue;
      seenAnimations.current.add(a.id);
      if (a.bonus) sfx.play("boardclear", { delay: 0.15 });
      else {
        sfx.play("clear", { rate: 0.8 + a.clearValue * 0.09 });
        if ((a.lines ?? 1) >= 2) sfx.play("combo", { delay: 0.09 });
      }
      setTimeout(() => dispatch({ type: "removeAnimation", id: a.id }), 1500);
    }
  }, [run.scoreAnimations, dispatch]);

  useEffect(() => {
    if (!puzzle || !levelPuzzle || !run.outcome) return;
    if (tutorial) {
      if (run.outcome === "solved") {
        sfx.play("best", { delay: 0.25 });
        // A beat to see the board match the target, then the wrap-up card.
        setTimeout(() => setTutorialDoneOpen(true), 900);
      }
      return;
    }
    if (practice) {
      if (run.outcome === "solved") {
        sfx.play("best", { delay: 0.25 });
        setPracticeResult({ moves: run.moves, restarts: Math.max(0, practiceAttempts - 1), hints: hintsUsed, par: levelPuzzle.par, timeMs: clockMs });
      } else sfx.play("gameover", { delay: 0.25 });
      setShowResult(true);
      return;
    }
    if (result) return;
    if (run.outcome !== "solved") {
      sfx.play("gameover", { delay: 0.25 });
      setShowResult(true);
      return;
    }
    sfx.play("best", { delay: 0.25 });
    const local: DailyResult = { moves: run.moves, restarts: Math.max(0, attempts - 1), hints: hintsUsed, par: levelPuzzle.par, timeMs: clockMs };
    const keepLocal = () => {
      setResult(local);
      remember(level, { result: { ...local, restarts: local.restarts ?? 0, hints: hintsUsed, rank: 0, total: 0 } });
    };
    if (!puzzle.username) {
      keepLocal();
      setShowResult(true);
      return;
    }
    submitRun(puzzle.date, level, run.actions, clockMs)
      .then((response) => {
        if (response.ok) {
          setResult(response.result);
          setStats(response.stats);
          setBoard(response.leaderboard);
          remember(level, { result: response.result, stats: response.stats });
        } else {
          console.error(`Result not saved: ${response.reason}`);
          keepLocal();
        }
      })
      .catch(keepLocal)
      .finally(() => setShowResult(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.outcome]);

  // ---------- controls ----------

  const playable = ready && !!run.current && !run.outcome && !run.pendingClear && !showResult && !tutorialDoneOpen && !(tutorial && !tutorialGoalSeen);

  const bump = () => {
    sfx.play("bump");
    setBumpKey((k) => k + 1);
  };

  const startClock = () => {
    if (!clockRunning && !tutorial) setClockRunning(true);
  };

  const move = (direction: "left" | "right" | "up" | "down") => {
    if (!playable) return;
    startClock();
    const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    const position = { x: run.current!.position.x + dx, y: run.current!.position.y + dy };
    if (!isValidPosition(run.grid, { ...run.current!, position })) return bump();
    sfx.play("move", { jitter: 0.04 });
    dispatch({ type: "move", position });
  };

  const rotate = (direction: "clockwise" | "counterclockwise") => {
    if (!playable) return;
    startClock();
    const piece = run.current!;
    const count = piece.shape.rotations.length;
    const rotation = (piece.rotation + (direction === "clockwise" ? 1 : -1) + count) % count;
    if (!tryWallKick(run.grid, { ...piece, rotation }, rotation)) return bump();
    sfx.play("rotate");
    dispatch({ type: "rotate", direction });
  };

  const place = () => {
    if (!playable || !puzzle) return;
    if (tutorial) {
      if (!onSpot(run)) return bump();
      sfx.play("place", { jitter: 0.06 });
      const piece = run.current!;
      const cells = getCurrentShape(piece).flatMap((row, dy) => row.flatMap((on, dx) => (on ? [{ x: piece.position.x + dx, y: piece.position.y + dy }] : [])));
      const id = ++plusOneId.current;
      setPlusOnes((current) => [...current, { id, cells }]);
      setTimeout(() => setPlusOnes((current) => current.filter((pop) => pop.id !== id)), 1000);
      dispatch({ type: "place" });
      return;
    }
    startClock();
    const firstPlacement = countedRun.current !== runNumber;
    countedRun.current = runNumber;
    if (firstPlacement && practice) setPracticeAttempts((n) => n + 1);
    else if (firstPlacement) {
      // Every run that gets a piece down counts; all but the solving one are restarts.
      const counted = attempts + 1;
      setAttempts(counted);
      remember(level, { attempts: counted });
      if (puzzle.username)
        void recordAttempt(puzzle.date, level)
          .then(({ attempts: fromServer }) => {
            if (!fromServer) return;
            setAttempts(fromServer);
            remember(level, { attempts: fromServer });
          })
          .catch(() => undefined);
    }
    sfx.play("place", { jitter: 0.06 });
    if (coaching) {
      setCoaching(false);
      try {
        localStorage.setItem("gridpop-coached", "1");
      } catch {
        // Storage blocked: the pointers show again next time, which is harmless.
      }
    }
    dispatch({ type: "place" });
  };

  const canUndo = run.history.length > 0 && !run.pendingClear && run.outcome !== "solved";

  const undo = () => {
    if (!canUndo) return bump();
    sfx.play("hold");
    setShowResult(false);
    dispatch({ type: "undo" });
  };

  const hintCoolingMs = Math.max(0, hintReadyAt - now);

  const askHint = () => {
    if (!puzzle || !run.current || run.outcome || run.pendingClear || tutorial || hintCoolingMs > 0) return bump();
    startClock();
    const askedActions = run.actions;
    setHintReadyAt(Date.now() + HINT_COOLDOWN_MS);
    setNow(Date.now());
    requestHint(puzzle.date, level, run.actions)
      .then((response) => {
        if (!response.ok) {
          if (response.waitMs) setHintReadyAt(Date.now() + response.waitMs);
          return;
        }
        // The server counts hints for the leaderboard; logged out or replaying, they're counted here.
        if (response.hint) setHintsUsed((n) => (response.hints > 0 ? response.hints : n + 1));
        if (!response.hint) {
          // The search ran out of time; nothing was given, so nothing is counted or cooled down.
          setHintReadyAt(0);
          showToast("No hint right now");
          return;
        }
        const base = askedActions.length - placementsUndone(askedActions, response.hint.undo);
        setHint({ placement: response.hint.placement, base, prefix: JSON.stringify(askedActions.slice(0, base)), reached: response.hint.undo === 0 });
      })
      .catch(() => setHintReadyAt(0));
  };

  // A dead-end hint only says how many to undo; once the player is back at `base` it's done, and
  // the spot takes another hint. A spot hint goes once that piece is down, or the run leaves the line.
  useEffect(() => {
    if (!hint) return;
    const length = run.actions.length;
    if (length < hint.base || JSON.stringify(run.actions.slice(0, hint.base)) !== hint.prefix) return setHint(null);
    if (length === hint.base ? !hint.reached : hint.reached) setHint(null);
  }, [hint, run.actions]);
  const undosForHint = hint && !hint.reached ? run.actions.length - hint.base : 0;

  useEffect(() => {
    if (hintReadyAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hintReadyAt]);

  const startTutorial = () => {
    setTutorial(true);
    setTutorialGoalSeen(false);
    setGoalDocking(false);
    setTutorialDoneOpen(false);
    setShowResult(false);
    setHint(null);
    setClockRunning(false);
    setRunNumber((n) => n + 1);
    dispatch({ type: "start", pieces: TUTORIAL_PIECES });
  };

  const finishTutorial = () => {
    markSeen();
    setCoaching(false);
    try {
      localStorage.setItem("gridpop-coached", "1");
    } catch {
      // Storage blocked: the first-game pointers show once more, which is harmless.
    }
    setTutorial(false);
    setTutorialDoneOpen(false);
    if (puzzle) openLevel(puzzle, level);
  };

  const restart = () => {
    if (!levelPuzzle) return;
    sfx.play("click");
    setShowResult(false);
    setRunNumber((n) => n + 1);
    if (result) {
      // Once it's solved, every new run is practice, with its own clock.
      if (!practice) setPracticeAttempts(0);
      setPractice(true);
      setPracticeResult(null);
      if (!practice) setHintsUsed(0);
      setClockMs(0);
      setClockRunning(false);
    }
    dispatch({ type: "start", pieces: levelPuzzle.pieces });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Typing in the comment box (or any field) isn't a game move.
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      if (tutorial && !tutorialGoalSeen) {
        if (key === KEYS.place || key === "enter") {
          e.preventDefault();
          setGoalDocking(true);
        }
        return;
      }
      if (Object.values(KEYS).includes(key)) e.preventDefault();
      if (e.repeat && key === KEYS.place) return;
      if (key === KEYS.left) move("left");
      else if (key === KEYS.right) move("right");
      else if (key === KEYS.up) move("up");
      else if (key === KEYS.down) move("down");
      else if (key === KEYS.rotate) rotate("clockwise");
      else if (key === KEYS.rotateBack) rotate("counterclockwise");
      else if (key === KEYS.place) place();
      else if (key === KEYS.undo) undo();
      else if (key === KEYS.hint) askHint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };

  // ---------- layout ----------

  if (loadFailed) return <p className="p-8 text-center font-bold text-[color:var(--gp-muted)]">Couldn't load today's puzzle.</p>;
  const loaded = ready && !!puzzle && !!levelPuzzle && !!target;

  const solved = run.outcome === "solved";
  const lesson = tutorialStep(run, tutorialGoalSeen);
  const setup = puzzle && levelPuzzle && target ? { date: puzzle.date, level, number: puzzle.number, pieces: levelPuzzle.pieces, target, par: levelPuzzle.par, showSolved: !!result } : null;
  const stat = (label: string, value: ReactNode) => (
    <div className="text-center">
      <div className="gp-label">{label}</div>
      <div className="gp-value mt-1 text-xl">{value}</div>
    </div>
  );

  const tabs = (
    <div role="tablist" aria-label="Difficulty" className="gp-tabs gp-tabs-sm w-full">
      {DAILY_LEVELS.map((option) => (
        <button key={option.level} role="tab" aria-selected={option.level === level} className={cn("gp-tab", option.level === level && "gp-tab-on")} onClick={() => switchLevel(option.level)}>
          {option.label}
        </button>
      ))}
    </div>
  );

  const moves = result && !practice && !tutorial ? result.moves : run.moves;
  const shownClockMs = tutorial ? 0 : clockMs;
  // Wide screens have room for a full card; phones get one slim strip so the board keeps the space.
  const statsCard = landscape ? (
    <div className="gp-card grid grid-cols-2 content-center px-2 py-2.5">
      {stat("Moves", moves)}
      {stat("Time", formatClock(shownClockMs))}
    </div>
  ) : (
    <div className="gp-card flex items-center justify-around px-3 py-2">
      <span className="flex items-baseline gap-1.5">
        <span className="gp-label">Moves</span>
        <span className="gp-value text-lg">{moves}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="gp-label">Time</span>
        <span className="gp-value text-lg">{formatClock(shownClockMs)}</span>
      </span>
    </div>
  );

  const showCoach = coaching && !tutorial && !result && run.moves === 0 && !!run.current && !showResult;

  const coachPill = (text: string, className?: string) => (
    <motion.span
      className={cn("pointer-events-none absolute z-40 whitespace-nowrap rounded-full border-2 border-[#1F1633] bg-[#7C5CFF] px-3 py-1 text-[13px] font-extrabold text-white", className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: [0, -4, 0] }}
      transition={{ opacity: { duration: 0.3 }, y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } }}
    >
      {text}
    </motion.span>
  );

  const buttons = (
    <div className="flex gap-2">
      {result ? (
        <button className="gp-btn flex-1 whitespace-nowrap !px-3" onClick={() => setShowResult(true)}>
          <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" /> Leaderboard
        </button>
      ) : (
        <button className="gp-btn flex-1 !px-3" onClick={() => setShowResult(true)} aria-label="Stats">
          <Flame size={18} strokeWidth={2.5} className="text-[#FF7A3D]" />
          <span className="gp-value text-lg">{stats.streak}</span>
        </button>
      )}
      <button className="gp-icon-btn shrink-0" onClick={startTutorial} aria-label="How to play">
        <CircleHelp size={20} strokeWidth={2.5} />
      </button>
      <button className="gp-icon-btn shrink-0" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
        {muted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />}
      </button>
      {result ? (
        // Once solved, Leaderboard takes the label; replaying or restarting is the icon beside it.
        <button className="gp-icon-btn gp-btn-primary shrink-0" onClick={restart} aria-label="Play again" title="Play again">
          <RotateCcw size={18} strokeWidth={3} />
        </button>
      ) : (
        <button className="gp-btn gp-btn-primary flex-[1.6] whitespace-nowrap" onClick={restart}>
          <RotateCcw size={18} strokeWidth={3} /> Restart
        </button>
      )}
    </div>
  );

  const hintSpot = !tutorial && hint?.reached && run.current ? cellsAt(run.current, hint.placement) : undefined;
  const onHintSpot = !!hintSpot && !!run.current && sameCells(hintSpot, cellsAt(run.current, { rotation: run.current.rotation, ...run.current.position }));

  const gameBoard = (
    <div className="relative">
      <GameBoard
        className="gp-board-wrap aspect-square w-full"
        grid={run.grid}
        currentPiece={tutorial && !tutorialGoalSeen ? null : run.current}
        pieceKey={`${runNumber}-${run.moves}-${run.current?.shape.type}`}
        pendingClear={run.pendingClear}
        bumpKey={bumpKey}
        scoreAnimations={run.scoreAnimations}
        onPieceMove={move}
        onPiecePlace={place}
        onPieceRotate={rotate}
        gameOver={!!run.outcome && !solved}
        showPoints={false}
        hintCells={tutorial ? lesson.spot : hintSpot}
        hintReady={tutorial ? onSpot(run) : onHintSpot}
      />
      {tutorial && run.current && lesson.step !== "done" && lesson.step !== "goal" && <PieceTip piece={run.current} text={STEP_TEXT[lesson.turn ? "rotate" : lesson.step].title[touch ? 0 : 1]} />}
      {tutorial && touch && run.current && lesson.step !== "done" && lesson.step !== "goal" && (
        (lesson.step === "move" || lesson.step === "move2") && !lesson.turn ? (
          <DragHand from={pieceCenter(run.current)} to={spotCenter(lesson.spot)} />
        ) : (
          <TapHand at={pieceCenter(run.current)} taps={lesson.step === "rotate" || lesson.turn ? 2 : 1} />
        )
      )}
      {tutorial &&
        plusOnes.flatMap((pop) =>
          pop.cells.map(({ x, y }) => (
            <div key={`${pop.id}-${x}-${y}`} className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2" style={{ left: `${((x + 0.5) / 4) * 100}%`, top: `${((y + 0.5) / 4) * 100}%` }}>
              <motion.span
                className="block rounded-full border-2 border-[#1F1633] bg-white px-2 py-0.5 text-sm font-extrabold text-[#1F1633]"
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], y: -38, scale: 1 }}
                transition={{ duration: 0.95, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
              >
                +1
              </motion.span>
            </div>
          ))
        )}
      {!solved && (
        <>
          {!tutorial && (
            <button className="gp-corner-btn -left-2 -top-2" onClick={askHint} disabled={!run.current || !!run.outcome || hintCoolingMs > 0} aria-label="Hint" title="Hint (H)">
              {hintCoolingMs > 0 ? <span className="gp-value text-xl">{Math.ceil(hintCoolingMs / 1000)}</span> : <Lightbulb size={26} strokeWidth={2.75} className="text-[#E0A21B]" />}
            </button>
          )}
          <button
            className={cn("gp-corner-btn -right-2 -top-2", undosForHint > 0 && "gp-corner-btn-hinted")}
            onClick={undo}
            disabled={!canUndo}
            aria-label={undosForHint > 0 ? `Undo ${undosForHint}` : "Undo"}
            title="Undo (Z)"
          >
            <Undo2 size={26} strokeWidth={2.75} />
            {undosForHint > 0 && <span className="gp-corner-badge">{undosForHint}</span>}
          </button>
        </>
      )}
      {onHintSpot && !showCoach && coachPill(touch ? "Tap to place" : "Space to place", "bottom-3 left-1/2 -translate-x-1/2")}
      {showCoach && (
        <>
          <Hand at={pieceCenter(run.current)} press={0} />
          {coachPill(touch ? "Tap to place" : "Space to place", "bottom-3 left-1/2 -translate-x-1/2")}
        </>
      )}
    </div>
  );

  const shownRun = practice ? practiceResult : result;
  // The day's leaderboard and comments belong with every result, practice runs included.
  const resultExtra = puzzle?.username ? (
    <>
      {!leaderboardWait.ready ? (
        <LeaderboardSkeleton rank={puzzle.results[level]?.rank ?? 1} total={puzzle.results[level]?.total ?? FOLDED_ROWS_GUESS} pulse={leaderboardWait.showLoader} />
      ) : (
        <Leaderboard board={board} username={puzzle.username} />
      )}
      {result && setup && <CommentBox score={`GridPop #${setup.number} ${DAILY_LEVELS.find((option) => option.level === level)?.label} · Score ${dailyScore(result)} · ${formatClock(result.timeMs)}`} />}
    </>
  ) : (
    <button className="gp-btn mt-4 w-full" onClick={() => showLoginPrompt()}>
      Log in to save
    </button>
  );

  // On phones the buttons sit beside the target, under the slim stats, freeing the bottom for the board.
  const phoneSide = (
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
      {statsCard}
      <div className="flex gap-2">
        <button className="gp-btn min-w-0 flex-1 !px-2" onClick={() => setShowResult(true)} aria-label="Stats">
          <Flame size={18} strokeWidth={2.5} className="text-[#FF7A3D]" />
          <span className="gp-value text-lg">{stats.streak}</span>
        </button>
        <button className="gp-icon-btn shrink-0" onClick={startTutorial} aria-label="How to play">
          <CircleHelp size={20} strokeWidth={2.5} />
        </button>
        <button className="gp-icon-btn shrink-0" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />}
        </button>
      </div>
      {result ? (
        <div className="flex gap-2">
          <button className="gp-btn min-w-0 flex-1 whitespace-nowrap !px-2" onClick={() => setShowResult(true)}>
            <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" /> Leaderboard
          </button>
          <button className="gp-icon-btn gp-btn-primary shrink-0" onClick={restart} aria-label="Play again">
            <RotateCcw size={18} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <button className="gp-btn gp-btn-primary w-full whitespace-nowrap" onClick={restart}>
          <RotateCcw size={18} strokeWidth={3} /> Restart
        </button>
      )}
    </div>
  );

  const lessonSteps = Object.keys(STEP_TEXT);
  const lessonIndex = lesson.step === "done" ? lessonSteps.length : lessonSteps.indexOf(lesson.step);
  // Progress dots so the heading reads as where you are, not as a button to a tutorial.
  const tutorialHeader = (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[24px] font-bold leading-none">Tutorial</h1>
        <div className="flex items-center gap-1.5" role="img" aria-label={`Step ${Math.min(lessonIndex + 1, lessonSteps.length)} of ${lessonSteps.length}`}>
          {lessonSteps.map((step, i) => (
            <span
              key={step}
              className={cn(
                "h-2.5 rounded-full border-2 border-[#1F1633] transition-all duration-300",
                i === lessonIndex ? "w-6 bg-[color:var(--gp-accent)]" : "w-2.5",
                i < lessonIndex ? "bg-[color:var(--gp-accent)]" : i > lessonIndex && "bg-white",
              )}
            />
          ))}
        </div>
      </div>
      <button className="text-sm font-extrabold text-[color:var(--gp-muted)] hover:text-[color:var(--gp-ink)]" onClick={finishTutorial}>
        Skip
      </button>
    </div>
  );
  // The tutorial plays in the game's own frame; its panel is shown but inert, with Moves counting.
  const inertSide = <div className="pointer-events-none contents">{landscape ? statsCard : phoneSide}</div>;
  const inertButtons = landscape ? <div className="pointer-events-none contents">{buttons}</div> : null;

  // While the puzzle loads: the real layout, empty and inert, with the board playing itself if it's slow.
  const loadingLayout = (
    <GameLayout
      viewport={viewport}
      top={<div className="pointer-events-none contents">{tutorial ? tutorialHeader : tabs}</div>}
      side={inertSide}
      target={<TargetCard target={EMPTY_TARGET} landscape={landscape} />}
      board={<DemoBoard active={showLoader} className="gp-board-wrap aspect-square w-full" />}
      next={<NextColumn queue={[]} landscape={landscape} />}
      bottom={inertButtons}
      hints={touch ? undefined : <KeyHints />}
    />
  );

  return (
    <div className="h-[100dvh] overflow-hidden" aria-busy={!loaded}>
      {!loaded || !target ? (
        loadingLayout
      ) : tutorial ? (
        <GameLayout
          viewport={viewport}
          top={tutorialHeader}
          side={inertSide}
          target={<TargetCard target={TUTORIAL_TARGET} landscape={landscape} gridRef={targetSlot} hideGrid={!tutorialGoalSeen} landed={lesson.step === "move"} highlight={lesson.step === "done" ? "solved" : lesson.step === "goal" || lesson.step === "place2" ? "flash" : undefined} />}
          board={gameBoard}
          next={<NextColumn queue={run.queue} landscape={landscape} />}
          bottom={inertButtons}
          hints={touch ? undefined : <KeyHints />}
        />
      ) : (
        <GameLayout
          viewport={viewport}
          top={tabs}
          side={landscape ? statsCard : phoneSide}
          target={
            <TargetCard key={level} target={target} landscape={landscape} highlight={showCoach ? "coach" : undefined} reveal>
              {showCoach && coachPill("Match this", "-bottom-3.5 left-1/2 -translate-x-1/2")}
            </TargetCard>
          }
          board={gameBoard}
          next={<NextColumn queue={run.queue} landscape={landscape} />}
          bottom={landscape ? buttons : null}
          hints={touch ? undefined : <KeyHints />}
        />
      )}

      {tutorial && loaded && !tutorialGoalSeen && (
        <TutorialIntro
          docking={goalDocking}
          slot={targetSlot}
          onNext={() => setGoalDocking(true)}
          onDocked={() => {
            setTutorialGoalSeen(true);
            setGoalDocking(false);
          }}
        />
      )}
      <TutorialDone isOpen={tutorial && tutorialDoneOpen} onPlay={finishTutorial} />

      {setup && (
        <DailyResultModal
          msUntilNext={msUntilEasternMidnight}
          isOpen={showResult}
          onClose={() => setShowResult(false)}
          setup={setup}
          outcome={run.outcome}
          run={shownRun}
          stats={stats}
          onRestart={restart}
          onShare={(text) => void showShareSheet({ title: "GridPop", text }).catch(() => undefined)}
          hideGoal
          practice={practice}
          onReplay={result ? restart : undefined}
          onUndo={run.outcome && run.outcome !== "solved" && run.history.length > 0 ? undo : undefined}
          extra={resultExtra}
        />
      )}
    </div>
  );
};
