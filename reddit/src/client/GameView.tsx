import { useEffect, useRef, useState, type ReactNode } from "react";
import { showLoginPrompt, showShareSheet } from "@devvit/web/client";
import { CircleHelp, Flame, RotateCcw, Volume2, VolumeX } from "lucide-react";
import GameBoard from "@/components/game/GameBoard";
import PieceDisplay from "@/components/game/PieceDisplay";
import TargetGrid from "@/components/game/TargetGrid";
import DailyResultModal from "@/components/game/DailyResultModal";
import { isValidPosition, tryWallKick } from "@/utils/gameLogic";
import { DAILY_LEVELS, DailyLevel, DailyResult, formatClock, parseTarget } from "@/utils/dailyCore";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import type { LeaderboardResponse, LevelStats, PuzzleResponse, SavedResult } from "../shared/api";
import { fetchLeaderboard, fetchPuzzle, loadClock, loadLevel, recordAttempt, saveClock, saveLevel, submitRun } from "./api";
import { HowToPlay, firstVisit, markSeen } from "./HowToPlay";
import { Leaderboard } from "./Leaderboard";
import { useDailyRun } from "./useDailyRun";

const NO_STATS: LevelStats = { played: 0, streak: 0, bestStreak: 0, overPar: [0, 0, 0, 0] };

/** Wide, short views (desktop and fullscreen) put the board beside everything else. */
function useLandscape() {
  const read = () => window.innerWidth >= 600 && window.innerWidth > window.innerHeight * 1.15;
  const [landscape, setLandscape] = useState(read);
  useEffect(() => {
    const onResize = () => setLandscape(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return landscape;
}

const KEYS = { left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", rotate: "d", rotateBack: "a", place: " " };

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
  const landscape = useLandscape();
  const [showRules, setShowRules] = useState(firstVisit);

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
    if (!puzzle || !levelPuzzle || !run.outcome || result) return;
    if (run.outcome !== "solved") {
      sfx.play("gameover", { delay: 0.25 });
      setShowResult(true);
      return;
    }
    sfx.play("best", { delay: 0.25 });
    const local: DailyResult = { moves: run.moves, restarts: Math.max(0, attempts - 1), par: levelPuzzle.par, timeMs: clockMs };
    const keepLocal = () => {
      setResult(local);
      remember(level, { result: { ...local, restarts: local.restarts ?? 0, rank: 0, total: 0 } });
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
    if (run.moves === 0) {
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
    dispatch({ type: "place" });
  };

  const restart = () => {
    if (!levelPuzzle) return;
    sfx.play("click");
    setShowResult(false);
    setRunNumber((n) => n + 1);
    dispatch({ type: "start", pieces: levelPuzzle.pieces });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  const restarts = result ? result.restarts ?? 0 : Math.max(0, attempts - (run.moves > 0 ? 1 : 0));
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
    <div className={cn("gp-card grid flex-1 content-center gap-y-2.5 px-2 py-2.5", landscape ? "grid-cols-4" : "grid-cols-2")}>
      {stat("Moves", result ? result.moves : run.moves)}
      {stat("Goal", <span className="text-[#7C5CFF]">{levelPuzzle.par}</span>)}
      {stat("Restarts", restarts)}
      {stat("Time", formatClock(clockMs))}
    </div>
  );

  const targetCard = (
    <div className={cn("gp-card p-2.5", landscape ? "w-full" : "w-[38%] max-w-[150px] shrink-0")}>
      <div className="gp-label mb-1.5">Target</div>
      <TargetGrid grid={target} className="w-full" />
    </div>
  );

  // Tetris-style: the next piece on top and ringed, the three after it below, smaller and fading.
  const nextColumn = (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-2">
      <div className="gp-label">Next</div>
      <div className="gp-well w-full !p-2 ring-[2.5px] ring-inset ring-[#7C5CFF]">
        <PieceDisplay piece={run.queue[0] ?? null} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="gp-well w-[52px] !p-1.5" style={{ opacity: 1 - i * 0.18 }}>
          <PieceDisplay piece={run.queue[i] ?? null} />
        </div>
      ))}
    </div>
  );

  const buttons = (
    <div className={cn("flex gap-2", landscape && "flex-wrap")}>
      <button className="gp-btn flex-1 !px-3" onClick={() => setShowResult(true)} aria-label="Stats">
        <Flame size={18} strokeWidth={2.5} className="text-[#FF7A3D]" />
        <span className="gp-value text-lg">{stats.streak}</span>
      </button>
      <button className="gp-icon-btn shrink-0" onClick={() => setShowRules(true)} aria-label="How to play">
        <CircleHelp size={20} strokeWidth={2.5} />
      </button>
      <button className="gp-icon-btn shrink-0" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
        {muted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />}
      </button>
      {!solved && (
        <button className={cn("gp-btn gp-btn-primary", landscape ? "w-full" : "flex-[1.6]")} onClick={restart}>
          <RotateCcw size={18} strokeWidth={3} /> Restart
        </button>
      )}
    </div>
  );

  // The board and its Next column share whatever room is left; the board stays square, sized to
  // the space's width (less the column) or its height, whichever is smaller.
  const playArea = (
    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
      <div className="flex items-start gap-2.5">
        <div style={{ width: "min(calc(100cqw - 78px), 100cqh)" }}>
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
          />
        </div>
        {nextColumn}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden">
      {landscape ? (
        <div className="mx-auto flex h-full max-w-[1040px] flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="w-[260px] shrink-0">{tabs}</div>
            {statsCard}
          </div>
          <div className="flex min-h-0 flex-1 gap-4">
            {playArea}
            <aside className="flex w-[180px] shrink-0 flex-col justify-center gap-2.5">
              {targetCard}
              {buttons}
            </aside>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex h-full max-w-[480px] flex-col gap-2.5 p-3">
          {tabs}
          <div className="flex gap-2.5">
            {targetCard}
            {statsCard}
          </div>
          {playArea}
          {buttons}
        </div>
      )}

      <HowToPlay
        isOpen={showRules}
        onClose={() => {
          markSeen();
          setShowRules(false);
        }}
      />

      <DailyResultModal
        isOpen={showResult}
        onClose={() => setShowResult(false)}
        setup={setup}
        outcome={run.outcome}
        run={result}
        stats={stats}
        onRestart={restart}
        onShare={(text) => void showShareSheet({ title: "GridPop", text }).catch(() => undefined)}
        extra={
          puzzle.username ? (
            <Leaderboard board={board} username={puzzle.username} />
          ) : (
            <button className="gp-btn mt-4 w-full" onClick={() => showLoginPrompt()}>
              Log in to save
            </button>
          )
        }
      />
    </div>
  );
};
