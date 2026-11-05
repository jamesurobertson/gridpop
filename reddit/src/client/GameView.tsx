import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { showLoginPrompt, showShareSheet, showToast } from "@devvit/web/client";
import { CircleHelp, Flame, Lightbulb, RotateCcw, Trophy, Undo2, Volume2, VolumeX } from "lucide-react";
import GameBoard from "@/components/game/GameBoard";
import DailyResultModal from "@/components/game/DailyResultModal";
import { getCurrentShape, isValidPosition, tryWallKick } from "@/utils/gameLogic";
import type { Placement } from "@/utils/dailyRun";
import type { Tetromino } from "@/types/game";
import { DAILY_LEVELS, DailyLevel, DailyResult, formatClock, parseTarget } from "@/utils/dailyCore";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import type { LeaderboardResponse, LevelStats, PuzzleResponse, SavedResult } from "../shared/api";
import { fetchLeaderboard, fetchPuzzle, loadClock, loadLevel, recordAttempt, requestHint, saveClock, saveLevel, submitRun } from "./api";
import { HowToPlay, firstVisit, markSeen } from "./HowToPlay";
import { Hand, pieceCenter, usesTouch } from "./Coach";
import { Leaderboard } from "./Leaderboard";
import { CommentBox } from "./CommentBox";
import { GameLayout, KeyHints, NextColumn, TargetCard, useViewport } from "./GameLayout";
import { useDailyRun } from "./useDailyRun";

const NO_STATS: LevelStats = { played: 0, streak: 0, bestStreak: 0, overPar: [0, 0, 0, 0] };

const KEYS = { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", rotate: "d", rotateBack: "a", place: " ", undo: "z", hint: "h" };
const HINT_COOLDOWN_MS = 10_000;

/** The cells a piece would cover at a hint's spot. */
const cellsAt = (piece: Tetromino, { rotation, x, y }: Placement) =>
  getCurrentShape({ ...piece, rotation, position: { x, y } }).flatMap((row, dy) => row.flatMap((on, dx) => (on ? [{ x: x + dx, y: y + dy }] : [])));

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
  const [showRules, setShowRules] = useState(firstVisit);
  // The very first game gets pointers: what to match, and how to put a piece down.
  const [coaching, setCoaching] = useState(() => {
    try {
      return localStorage.getItem("gridpop-coached") !== "1";
    } catch {
      return false;
    }
  });
  const [touch] = useState(usesTouch);
  // A hint is the suggested spot for the piece in play; it goes once that piece is placed.
  const [hint, setHint] = useState<{ placement: Placement; moves: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintReadyAt, setHintReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  // The run whose first placement was counted as an attempt, so undoing back to empty doesn't count again.
  const countedRun = useRef(-1);

  const levelPuzzle = puzzle?.levels[level];
  const target = levelPuzzle ? parseTarget(levelPuzzle.target) : null;

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
      if (data.username) void fetchLeaderboard(next).then(setBoard).catch(() => undefined);
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
    if (!run.pendingClear || !target) return;
    const timeout = setTimeout(() => dispatch({ type: "clear", target }), 200);
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

  const playable = !!run.current && !run.outcome && !run.pendingClear && !showResult && !showRules;

  const bump = () => {
    sfx.play("bump");
    setBumpKey((k) => k + 1);
  };

  const startClock = () => {
    if (!clockRunning) setClockRunning(true);
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

  const canUndo = run.history.length > 0 && !run.pendingClear && run.outcome !== "solved" && !showRules;

  const undo = () => {
    if (!canUndo) return bump();
    sfx.play("hold");
    setShowResult(false);
    dispatch({ type: "undo" });
  };

  const hintCoolingMs = Math.max(0, hintReadyAt - now);

  const askHint = () => {
    if (!puzzle || !run.current || run.outcome || run.pendingClear || showRules || hintCoolingMs > 0) return bump();
    startClock();
    const askedAt = run.moves;
    setHintReadyAt(Date.now() + HINT_COOLDOWN_MS);
    setNow(Date.now());
    requestHint(puzzle.date, level, run.actions)
      .then((response) => {
        if (!response.ok) {
          if (response.waitMs) setHintReadyAt(Date.now() + response.waitMs);
          return;
        }
        // The server counts hints for the leaderboard; logged out or replaying, they're counted here.
        setHintsUsed((n) => (response.hints > 0 ? response.hints : n + 1));
        if (response.placement) setHint({ placement: response.placement, moves: askedAt });
        else showToast("Can't reach the target from here");
      })
      .catch(() => setHintReadyAt(0));
  };

  // The hint is for the piece it was asked about; it goes once that piece is down (or undone).
  useEffect(() => {
    if (hint && hint.moves !== run.moves) setHint(null);
  }, [hint, run.moves]);

  useEffect(() => {
    if (hintReadyAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hintReadyAt]);

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

  // Reddit asks for silence once the post is out of sight.
  useEffect(() => {
    const onVisibility = () => sfx.setMuted(document.hidden || muted);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [muted]);

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
  };

  // ---------- layout ----------

  if (loadFailed) return <p className="p-8 text-center font-bold text-[color:var(--gp-muted)]">Couldn't load today's puzzle.</p>;
  if (!puzzle || !levelPuzzle || !target) return <div className="h-[100dvh]" />;

  const solved = run.outcome === "solved";
  const setup = { date: puzzle.date, level, number: puzzle.number, pieces: levelPuzzle.pieces, target, par: levelPuzzle.par, showSolved: !!result };
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

  const statsCard = (
    <div className={cn("gp-card grid grid-cols-2 content-center px-2 py-2.5", !landscape && "flex-1")}>
      {stat("Moves", result && !practice ? result.moves : run.moves)}
      {stat("Time", formatClock(clockMs))}
    </div>
  );

  const showCoach = coaching && !result && run.moves === 0 && !!run.current && !showRules && !showResult;

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
      <button className="gp-icon-btn shrink-0" onClick={() => setShowRules(true)} aria-label="How to play">
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

  const gameBoard = (
    <div className="relative">
      <GameBoard
        className="gp-board-wrap aspect-square w-full"
        grid={run.grid}
        currentPiece={run.current}
        pieceKey={`${runNumber}-${run.moves}-${run.current?.shape.type}`}
        pendingClear={run.pendingClear}
        bumpKey={bumpKey}
        scoreAnimations={run.scoreAnimations}
        onPieceMove={move}
        onPiecePlace={place}
        onPieceRotate={rotate}
        gameOver={!!run.outcome && !solved}
        showPoints={false}
        hintCells={hint && run.current ? cellsAt(run.current, hint.placement) : undefined}
      />
      {!solved && (
        <>
          <button className="gp-corner-btn -left-1.5 -top-1.5" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Z)">
            <Undo2 size={18} strokeWidth={2.75} />
          </button>
          <button className="gp-corner-btn -right-1.5 -top-1.5" onClick={askHint} disabled={!run.current || !!run.outcome || hintCoolingMs > 0} aria-label="Hint" title="Hint (H)">
            {hintCoolingMs > 0 ? <span className="gp-value text-sm">{Math.ceil(hintCoolingMs / 1000)}</span> : <Lightbulb size={18} strokeWidth={2.75} className="text-[#E0A21B]" />}
          </button>
        </>
      )}
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
  const resultExtra = puzzle.username ? (
    <>
      <Leaderboard board={board} username={puzzle.username} />
      {result && <CommentBox />}
    </>
  ) : (
    <button className="gp-btn mt-4 w-full" onClick={() => showLoginPrompt()}>
      Log in to save
    </button>
  );

  const closeRules = () => {
    markSeen();
    setShowRules(false);
  };

  return (
    <div className="h-[100dvh] overflow-hidden">
      {showRules ? (
        <HowToPlay viewport={viewport} onClose={closeRules} />
      ) : (
        <GameLayout
          viewport={viewport}
          top={tabs}
          side={statsCard}
          target={
            <TargetCard target={target} landscape={landscape} highlight={showCoach ? "coach" : undefined}>
              {showCoach && coachPill("Match this", "-bottom-3.5 left-1/2 -translate-x-1/2")}
            </TargetCard>
          }
          board={gameBoard}
          next={<NextColumn queue={run.queue} landscape={landscape} />}
          bottom={buttons}
          hints={touch ? undefined : <KeyHints />}
        />
      )}

      <DailyResultModal
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
    </div>
  );
};
