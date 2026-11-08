import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { showLoginPrompt, showShareSheet, showToast } from "@devvit/web/client";
import { CircleHelp, Flame, Lightbulb, Settings2, Trophy, Undo2 } from "lucide-react";
import GameBoard from "@/components/game/GameBoard";
import DailyResultModal from "@/components/game/DailyResultModal";
import { checkLinesToClear, createEmptyGrid, getCurrentShape, isValidPosition, placeTetromino, tryWallKick } from "@/utils/gameLogic";
import type { Placement, RunAction } from "@/utils/dailyRun";
import type { Tetromino } from "@/types/game";
import { DAILY_LEVELS, DailyLevel, DailyResult, dailyScore, formatClock, msUntilEasternMidnight, parseTarget } from "@/utils/dailyCore";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import type { LeaderboardResponse, LevelStats, PuzzleResponse, SavedResult } from "../shared/api";
import { fetchLeaderboard, fetchPuzzle, recordAttempt, requestHint, submitRun } from "./api";
import { loadClock, loadLevel, saveClock, saveLevel } from "./storage";
import { NextIntro, TUTORIAL_PIECES, TUTORIAL_STEPS, TUTORIAL_TARGET, TutorialDone, TutorialIntro, firstVisit, markSeen, onSpot, stepTitle, tutorialStep } from "./Tutorial";
import { DragHand, Hand, PieceTip, TapHand, pieceCenter, usesTouch } from "./Coach";
import { DemoBoard, usePatientLoading } from "./Loader";
import { Leaderboard, LeaderboardSkeleton } from "./Leaderboard";
import { SOLVED_BANNER_MS, SolvedBanner } from "./SolvedBanner";
import { CommentBox } from "./CommentBox";
import { GameLayout, KeyHints, NextColumn, TargetCard, TouchButtons, useViewport } from "@/components/game/GameLayout";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { DAILY_ACTIONS, actionFor, controlText, keyLabel, useControls } from "@/utils/controls";
import { useDailyRun } from "./useDailyRun";

const NO_STATS: LevelStats = { played: 0, streak: 0, bestStreak: 0, overPar: [0, 0, 0, 0] };

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

export const Game = ({ modeTabs }: { modeTabs?: ReactNode }) => {
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [level, setLevel] = useState<DailyLevel>(loadLevel);
  const [run, dispatch] = useDailyRun();
  const [result, setResult] = useState<DailyResult | null>(null);
  const [stats, setStats] = useState<LevelStats>(NO_STATS);
  const [attempts, setAttempts] = useState(0);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  // A solve gets the SOLVED banner first; the results card waits for it to finish.
  const [solvedBanner, setSolvedBanner] = useState(false);
  const bannerEndsAt = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout>>();
  const [clockMs, setClockMs] = useState(0);
  const [clockRunning, setClockRunning] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [runNumber, setRunNumber] = useState(0);
  // A daily run set aside while the tutorial plays, so coming back isn't a new run (or a restart).
  const setAside = useRef<{ level: DailyLevel; run: typeof run; runNumber: number; hintsUsed: number; practice: boolean; clockMs: number } | null>(null);
  const [muted, setMuted] = useState(sfx.muted);
  const [controls, setControls] = useControls();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [tutorialNextSeen, setTutorialNextSeen] = useState(false);
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
      if (data.username && !data.local) {
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
        // Storage is per device, so an account that has played before skips it on a new device too.
        const returning = DAILY_LEVELS.some((option) => data.stats[option.level].played > 0 || data.attempts[option.level] > 0);
        if (returning) {
          markSeen();
          setTutorial(false);
          setCoaching(false);
        } else if (firstVisit()) startTutorial();
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

  const celebrate = () => {
    bannerEndsAt.current = Date.now() + SOLVED_BANNER_MS;
    setSolvedBanner(true);
  };
  const openResultAfterBanner = () => {
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      setSolvedBanner(false);
      setShowResult(true);
    }, Math.max(0, bannerEndsAt.current - Date.now()));
  };
  useEffect(() => {
    if (run.outcome) return;
    clearTimeout(revealTimer.current);
    setSolvedBanner(false);
  }, [run.outcome]);

  useEffect(() => {
    if (!puzzle || !levelPuzzle || !run.outcome) return;
    if (tutorial) {
      if (run.outcome === "solved") {
        sfx.play("best", { delay: 0.25 });
        // The same SOLVED moment as a real puzzle, then the wrap-up card.
        celebrate();
        clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(() => {
          setSolvedBanner(false);
          setTutorialDoneOpen(true);
        }, SOLVED_BANNER_MS);
      }
      return;
    }
    if (practice) {
      if (run.outcome === "solved") {
        sfx.play("best", { delay: 0.25 });
        setPracticeResult({ moves: run.moves, restarts: Math.max(0, practiceAttempts - 1), hints: hintsUsed, par: levelPuzzle.par, timeMs: clockMs });
        celebrate();
        openResultAfterBanner();
      } else {
        sfx.play("gameover", { delay: 0.25 });
        setShowResult(true);
      }
      return;
    }
    if (result) return;
    if (run.outcome !== "solved") {
      sfx.play("gameover", { delay: 0.25 });
      setShowResult(true);
      return;
    }
    sfx.play("best", { delay: 0.25 });
    celebrate();
    const local: DailyResult = { moves: run.moves, restarts: Math.max(0, attempts - 1), hints: hintsUsed, par: levelPuzzle.par, timeMs: clockMs };
    const keepLocal = () => {
      setResult(local);
      remember(level, { result: { ...local, restarts: local.restarts ?? 0, hints: hintsUsed, rank: 0, total: 0 } });
    };
    if (!puzzle.username && !puzzle.local) {
      keepLocal();
      openResultAfterBanner();
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
      .finally(openResultAfterBanner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.outcome]);

  // ---------- controls ----------

  // The tutorial's pause on the Next column, after the first piece.
  const nextBeat = tutorial && tutorialGoalSeen && !tutorialNextSeen && run.moves === 1 && !run.pendingClear && !run.outcome;
  const playable = !nextBeat && ready && !!run.current && !run.outcome && !run.pendingClear && !showResult && !settingsOpen && !tutorialDoneOpen && !(tutorial && !tutorialGoalSeen);

  // The clock runs from the moment the board is ready, so planning counts. The very first game
  // waits for its first move, while the "Match this" pointers are up.
  const firstGamePointers = coaching && !result && run.moves === 0;
  useEffect(() => {
    if (playable && !tutorial && !firstGamePointers && !clockRunning) setClockRunning(true);
  }, [playable, tutorial, firstGamePointers, clockRunning]);

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
      if (puzzle.username || puzzle.local)
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
    if (settingsOpen) return;
    if (!canUndo) return bump();
    sfx.play("hold");
    setShowResult(false);
    dispatch({ type: "undo" });
  };

  const hintCoolingMs = Math.max(0, hintReadyAt - now);

  const askHint = () => {
    if (settingsOpen) return;
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
    // Seen once it starts: leaving halfway shouldn't bring it back. The ? button replays it.
    markSeen();
    if (!tutorial && run.actions.length > 0 && !run.outcome) setAside.current = { level, run, runNumber, hintsUsed, practice, clockMs };
    setTutorial(true);
    setTutorialGoalSeen(false);
    setTutorialNextSeen(false);
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
    if (!puzzle) return;
    openLevel(puzzle, level);
    const aside = setAside.current;
    setAside.current = null;
    // A practice run only makes sense on a solved level, and a daily run only on an unsolved one.
    if (aside && aside.level === level && !!puzzle.results[level] === aside.practice) {
      dispatch({ type: "restore", run: aside.run });
      setRunNumber(aside.runNumber);
      setHintsUsed(aside.hintsUsed);
      setPractice(aside.practice);
      setClockMs(aside.clockMs);
      setShowResult(false);
    }
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
      if (settingsOpen) return;
      const action = actionFor(controls.keys, e.key, DAILY_ACTIONS);
      if (tutorial && !tutorialGoalSeen) {
        if (action === "drop" || e.key === "Enter") {
          e.preventDefault();
          setGoalDocking(true);
        }
        return;
      }
      if (nextBeat) {
        if (action === "drop" || e.key === "Enter") {
          e.preventDefault();
          setTutorialNextSeen(true);
        }
        return;
      }
      if (!action) return;
      e.preventDefault();
      if (e.repeat && action === "drop") return;
      if (action === "moveLeft") move("left");
      else if (action === "moveRight") move("right");
      else if (action === "moveUp") move("up");
      else if (action === "moveDown") move("down");
      else if (action === "rotate") rotate("clockwise");
      else if (action === "rotateCounter") rotate("counterclockwise");
      else if (action === "drop") place();
      else if (action === "undo") undo();
      else if (action === "hint") askHint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
    if (muted) sfx.play("click");
  };

  const openSettings = () => {
    sfx.play("click");
    setSettingsOpen(true);
  };

  // ---------- layout ----------

  if (loadFailed) return <p className="p-8 text-center font-bold text-[color:var(--gp-muted)]">Couldn't load today's puzzle.</p>;
  const loaded = ready && !!puzzle && !!levelPuzzle && !!target;

  const solved = run.outcome === "solved";
  const lesson = tutorialStep(run, tutorialGoalSeen, tutorialNextSeen);
  const words = controlText(controls, touch);
  const touchButtons = touch && controls.touch === "buttons";
  const lessonRotating = lesson.step === "rotate" || !!lesson.turn;
  const lessonAction = lesson.step === "place" || lesson.step === "place2" ? "place" : lessonRotating ? "rotate" : undefined;
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

  // The website puts its Daily / Unlimited / Timed switch above the difficulty.
  const top = (
    <>
      {modeTabs}
      {tabs}
    </>
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

  // One button opens the results card: the streak before solving, the leaderboard after. Restart
  // is gone: Undo is free and goes all the way back, and the end-of-run card offers Try again.
  const buttons = (
    <div className="flex gap-2">
      {result && !puzzle?.local ? (
        <button className="gp-btn min-w-0 flex-1 whitespace-nowrap !px-2" onClick={() => setShowResult(true)}>
          <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" /> Leaderboard
        </button>
      ) : (
        <button className="gp-btn min-w-0 flex-1 !px-2" onClick={() => setShowResult(true)} aria-label="Stats">
          <Flame size={18} strokeWidth={2.5} className="text-[#FF7A3D]" />
          <span className="gp-value text-lg">{stats.streak}</span>
        </button>
      )}
      <button className="gp-icon-btn shrink-0" onClick={startTutorial} aria-label="How to play">
        <CircleHelp size={20} strokeWidth={2.5} />
      </button>
      <button className="gp-icon-btn shrink-0" onClick={openSettings} aria-label="Settings" title="Settings">
        <Settings2 size={20} strokeWidth={2.5} />
      </button>
    </div>
  );

  const hintSpot = !tutorial && hint?.reached && run.current ? cellsAt(run.current, hint.placement) : undefined;
  const onHintSpot = !!hintSpot && !!run.current && sameCells(hintSpot, cellsAt(run.current, { rotation: run.current.rotation, ...run.current.position }));

  const gameBoard = (
    <div className="relative">
      <GameBoard
        className="gp-board-wrap aspect-square w-full"
        grid={run.grid}
        currentPiece={(tutorial && !tutorialGoalSeen) || nextBeat ? null : run.current}
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
        tapAction={touchButtons ? "none" : controls.touch === "tap-rotate" ? "rotate" : "place"}
      />
      {nextBeat && <NextIntro onDone={() => setTutorialNextSeen(true)} />}
      {tutorial && run.current && lesson.step !== "done" && lesson.step !== "goal" && lesson.step !== "next" && <PieceTip piece={run.current} text={stepTitle(lesson.turn ? "rotate" : lesson.step, words)} />}
      {tutorial && touch && run.current && lesson.step !== "done" && lesson.step !== "goal" && lesson.step !== "next" && (
        (lesson.step === "move" || lesson.step === "move2") && !lesson.turn ? (
          <DragHand from={pieceCenter(run.current)} to={spotCenter(lesson.spot)} />
        ) : (
          // With on-screen buttons, the button to press glows instead.
          !touchButtons && <TapHand at={pieceCenter(run.current)} taps={lessonRotating === (controls.touch === "tap-place") ? 2 : 1} />
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
      {!tutorial && onHintSpot && run.current && !run.pendingClear && (() => {
        // On a hinted spot that completes lines, those lines pulse, so the hint shows why it works.
        const { rows, cols } = checkLinesToClear(placeTetromino(run.grid, run.current));
        return [...rows.map((row) => ({ key: `r${row}`, style: { left: "1.5%", right: "1.5%", top: `${row * 24.25 + 1.5}%`, height: "24%" } })), ...cols.map((col) => ({ key: `c${col}`, style: { top: "1.5%", bottom: "1.5%", left: `${col * 24.25 + 1.5}%`, width: "24%" } }))].map(({ key, style }) => (
          <motion.div
            key={key}
            className="pointer-events-none absolute z-30 rounded-[18px] border-[3px] border-white"
            style={{ ...style, boxShadow: "0 0 18px 4px rgba(255,255,255,0.55)" }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        ));
      })()}
      {!solved && !nextBeat && (
        <>
          {!tutorial && (
            <button className="gp-corner-btn -left-2 -top-2" onClick={askHint} disabled={!run.current || !!run.outcome || hintCoolingMs > 0} aria-label="Hint" title={touch ? "Hint" : `Hint (${keyLabel(controls.keys.hint)})`}>
              {hintCoolingMs > 0 ? <span className="gp-value text-xl">{Math.ceil(hintCoolingMs / 1000)}</span> : <Lightbulb size={26} strokeWidth={2.75} className="text-[#E0A21B]" />}
            </button>
          )}
          <button
            className={cn("gp-corner-btn -right-2 -top-2", undosForHint > 0 && "gp-corner-btn-hinted")}
            onClick={undo}
            disabled={!canUndo}
            aria-label={undosForHint > 0 ? `Undo ${undosForHint}` : "Undo"}
            title={touch ? "Undo" : `Undo (${keyLabel(controls.keys.undo)})`}
          >
            <Undo2 size={26} strokeWidth={2.75} />
            {undosForHint > 0 && <span className="gp-corner-badge">{undosForHint}</span>}
          </button>
        </>
      )}
      {onHintSpot && !showCoach && coachPill(words.place, "bottom-3 left-1/2 -translate-x-1/2")}
      {showCoach && (
        <>
          {!touchButtons && <Hand at={pieceCenter(run.current)} press={0} />}
          {coachPill(words.place, "bottom-3 left-1/2 -translate-x-1/2")}
        </>
      )}
    </div>
  );

  const shownRun = practice ? practiceResult : result;
  // The day's leaderboard and comments belong with every result, practice runs included.
  const resultExtra = puzzle?.local ? null : puzzle?.username ? (
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
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="gp-card grid flex-1 grid-cols-2 content-center px-2 py-2">
        {stat("Moves", moves)}
        {stat("Time", formatClock(shownClockMs))}
      </div>
      {buttons}
    </div>
  );

  const lessonSteps: string[] = TUTORIAL_STEPS;
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

  // Keyboards get the key chips under the board; touch screens with buttons get those there instead.
  const keyHints = <KeyHints keys={{ left: controls.keys.moveLeft, up: controls.keys.moveUp, down: controls.keys.moveDown, right: controls.keys.moveRight, rotateBack: controls.keys.rotateCounter, rotate: controls.keys.rotate, place: controls.keys.drop }} />;
  const pad = (highlight?: "rotate" | "place") => <TouchButtons onRotate={rotate} onPlace={place} highlight={highlight} />;
  const underBoard = (live: ReactNode) => (touch ? (touchButtons && landscape ? live : undefined) : keyHints);
  const belowBoard = (live: ReactNode, landscapeBottom: ReactNode) => (landscape ? landscapeBottom : touchButtons ? live : null);
  const padHeight = touchButtons ? 68 : undefined;

  // While the puzzle loads: the real layout, empty and inert, with the board playing itself if it's slow.
  const loadingLayout = (
    <GameLayout
      viewport={viewport}
      top={<div className="pointer-events-none contents">{tutorial ? tutorialHeader : top}</div>}
      side={inertSide}
      target={<TargetCard target={EMPTY_TARGET} landscape={landscape} />}
      board={<DemoBoard active={showLoader} className="gp-board-wrap aspect-square w-full" />}
      next={<NextColumn queue={[]} landscape={landscape} />}
      bottom={belowBoard(<div className="pointer-events-none contents">{pad()}</div>, inertButtons)}
      hints={underBoard(<div className="pointer-events-none pt-4">{pad()}</div>)}
      hintsHeight={padHeight}
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
          // In the pause, the piece about to come into play still sits at the front of Next.
          next={<NextColumn queue={nextBeat && run.current ? [run.current, ...run.queue] : run.queue} landscape={landscape} highlight={nextBeat} />}
          bottom={belowBoard(pad(lessonAction), inertButtons)}
          hints={underBoard(<div className="pt-4">{pad(lessonAction)}</div>)}
          hintsHeight={padHeight}
        />
      ) : (
        <GameLayout
          viewport={viewport}
          top={top}
          side={landscape ? statsCard : phoneSide}
          target={
            <TargetCard key={level} target={target} landscape={landscape} highlight={showCoach ? "coach" : undefined} reveal>
              {showCoach && coachPill("Match this", "-bottom-3.5 left-1/2 -translate-x-1/2")}
            </TargetCard>
          }
          board={gameBoard}
          next={<NextColumn queue={run.queue} landscape={landscape} />}
          bottom={belowBoard(pad(), buttons)}
          hints={underBoard(<div className="pt-4">{pad()}</div>)}
          hintsHeight={padHeight}
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
      <SolvedBanner show={solvedBanner} />
      <SettingsMenu
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        controls={controls}
        onChangeControls={setControls}
        actions={DAILY_ACTIONS}
        touch={touch}
        muted={muted}
        onToggleMute={toggleMute}
      />

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
          onShare={puzzle?.local ? undefined : (text) => void showShareSheet({ title: "GridPop", text }).catch(() => undefined)}
          // On the website there's no leaderboard, so the goal is what a score is measured against.
          hideGoal={!puzzle?.local}
          practice={practice}
          onReplay={result ? restart : undefined}
          onUndo={run.outcome && run.outcome !== "solved" && run.history.length > 0 ? undo : undefined}
          extra={resultExtra}
        />
      )}
    </div>
  );
};
