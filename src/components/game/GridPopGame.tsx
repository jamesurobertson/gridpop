import React, { useEffect, useReducer, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameBoard from "./GameBoard";
import PieceDisplay from "./PieceDisplay";
import GameOverModal from "./GameOverModal";
import OptionsMenu from "./OptionsMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  createEmptyGrid,
  getNextTetromino,
  isValidPosition,
  placeTetromino,
  clearRowsAndCols,
  calculateLineClearScore,
  checkGameOver,
  generateRandomValidPosition,
  tryWallKick,
  getTimerForLevel,
  INITIAL_TIMER,
  TURNS_PER_LEVEL,
  updateHighScores,
  getBestScore,
  checkLinesToClear,
  checkGridCleared,
  saveGameSettings,
  loadGameSettings,
  DEFAULT_GRID_SIZE,
  createTetromino,
} from "@/utils/gameLogic";
import { CellValue, Position, GameState, GameAction, KeyConfig, HighScore, Tetromino, PlayMode } from "@/types/game";
import { TETROMINO_SHAPES } from "@/utils/tetrominoShapes";
import {
  dailySetup,
  dailyStats,
  formatClock,
  gridsMatch,
  isToday,
  utcDateKey,
  loadDailyProgress,
  loadDailyResults,
  saveDailyProgress,
  saveDailyResult,
  loadDailyLevel,
  saveDailyLevel,
  DAILY_LEVELS,
  DailyLevel,
  DailyResult,
  DailySetup,
} from "@/utils/daily";
import DailyResultModal from "./DailyResultModal";
import { Logo } from "./Logo";
import TargetGrid from "./TargetGrid";
import { Trophy, Timer, Settings2, Volume2, VolumeX, RotateCcw, CalendarDays, Infinity as InfinityIcon, Flame } from "lucide-react";
import HighScoresModal from "./HighScoresModal";
import { loadHighScores } from "@/utils/highScores";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";

const DEFAULT_KEY_CONFIG: KeyConfig = {
  rotate: "d",
  drop: " ",
  hold: "s",
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  moveUp: "ArrowUp",
  moveDown: "ArrowDown",
  rotateCounter: "a",
};

const initialState: GameState = {
  grid: createEmptyGrid(),
  currentPiece: null,
  nextPiece: null,
  heldPiece: null,
  canHold: true,
  score: 0,
  level: 1,
  gameOver: false,
  turnsPlayed: 0,
  timeRemaining: INITIAL_TIMER,
  showTutorial: false,
  highScores: loadHighScores(),
  bestScore: getBestScore(loadHighScores(), DEFAULT_GRID_SIZE, true),
  scoreAnimations: [],
  gameMode: "standard",
  keyConfig: loadKeyConfig(),
  showBoard: false,
  // The daily puzzle is what opens first, and it's always 4×4 and untimed.
  gridSize: 4,
  isTimed: false,
  hasStarted: false,
  showOptionsMenu: false,
  nextQueue: [],
  linesCleared: 0,
  pendingClear: false,
  daily: dailySetup(utcDateKey(), loadDailyLevel()),
  dailyOutcome: null,
};

let animationCounter = 0;

function loadKeyConfig(): KeyConfig {
  const savedConfig = localStorage.getItem("keyConfig");
  if (savedConfig) {
    try {
      return JSON.parse(savedConfig);
    } catch (e) {
      console.error("Failed to parse saved key config:", e);
    }
  }
  return DEFAULT_KEY_CONFIG;
}

/** The queue after the front piece is taken; the daily queue is fixed, so it just runs down. */
function advanceQueue(state: GameState): Tetromino[] {
  const rest = state.nextQueue.slice(1);
  return state.daily ? rest : [...rest, getNextTetromino(state.gridSize)];
}

/** Save a finished game to the high scores (zero scores aren't kept) and return the updated list and best. */
function recordScore(state: GameState, score: number, linesCleared: number) {
  const highScores = updateHighScores(loadHighScores(), score, state.gridSize, state.isTimed, linesCleared);
  try {
    localStorage.setItem("gridpop-high-scores", JSON.stringify(highScores));
  } catch {
    // Storage blocked (private mode): the score still shows for this session.
  }
  return { highScores, bestScore: getBestScore(highScores, state.gridSize, state.isTimed) };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      if (state.daily) {
        const pieces = state.daily.pieces.map((type) => createTetromino(TETROMINO_SHAPES[type], 4));
        const fresh: GameState = {
          ...state,
          grid: createEmptyGrid(4),
          currentPiece: pieces[0],
          nextPiece: pieces[1],
          nextQueue: pieces.slice(1),
          heldPiece: null,
          canHold: true,
          timeRemaining: Infinity,
          hasStarted: true,
          gameOver: false,
          score: 0,
          level: 1,
          turnsPlayed: 0,
          scoreAnimations: [],
          linesCleared: 0,
          pendingClear: false,
          dailyOutcome: null,
        };
        if (!state.daily.showSolved) return fresh;
        return { ...fresh, grid: state.daily.target.map((row) => [...row]), currentPiece: null, nextQueue: [], gameOver: true, dailyOutcome: "solved" };
      }
      const currentPiece = getNextTetromino(state.gridSize);
      const nextPiece = getNextTetromino(state.gridSize);
      const startHighScores = loadHighScores();
      const startBestScore = getBestScore(startHighScores, state.gridSize, state.isTimed);

      return {
        ...state,
        grid: createEmptyGrid(state.gridSize),
        currentPiece,
        nextPiece,
        showTutorial: false,
        highScores: startHighScores,
        bestScore: startBestScore,
        keyConfig: state.keyConfig,
        gameMode: "standard",
        gridSize: state.gridSize,
        isTimed: state.isTimed,
        timeRemaining: state.isTimed ? getTimerForLevel(1) : Infinity,
        hasStarted: true,
        gameOver: false,
        score: 0,
        level: 1,
        turnsPlayed: 0,
        canHold: true,
        heldPiece: null,
        scoreAnimations: [],
        nextQueue: [
          nextPiece,
          getNextTetromino(state.gridSize),
          getNextTetromino(state.gridSize),
          getNextTetromino(state.gridSize),
        ],
        linesCleared: 0,
      };
    }

    case "START_GAME_WITH_MODE": {
      return gameReducer({ ...state }, { type: "START_GAME" });
    }

    case "PLACE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;
      // Only place the piece and set pendingClear
      const placedGrid = placeTetromino(state.grid, state.currentPiece);
      return {
        ...state,
        grid: placedGrid,
        pendingClear: true,
      };
    }

    case "CLEAR_LINES": {
      // This is the old PLACE_PIECE logic after placing the piece
      // Use the grid from state (already has the piece placed)
      const { rows, cols, clearValue } = checkLinesToClear(state.grid);
      let clearedGrid = state.grid;
      let effectType = null;
      let linesCleared = 0;
      let scoreGain = 0;
      let scoreAnimations = [...state.scoreAnimations];
      let hasFullGridClear = false;
      if ((rows.length > 0 || cols.length > 0) && clearValue > 0) {
        linesCleared = rows.length + cols.length;
        if (clearValue === 7) {
          effectType = "super";
        }
        // Calculate the base score for each line clear
        const baseScore = clearValue * clearValue * 100;
        // Calculate line bonus based on clear value
        const getLineBonus = (lines: number, value: CellValue) => {
          const baseBonus = value * value * 100;
          switch (lines) {
            case 2:
              return baseBonus * 2; // 2x the base value
            case 3:
              return baseBonus * 4; // 4x the base value
            case 4:
              return baseBonus * 8; // 8x the base value
            default:
              return 0;
          }
        };
        // Calculate total score for this clear
        const totalScore = Math.floor(baseScore * linesCleared + getLineBonus(linesCleared, clearValue));
        // Show the total score animation
        scoreAnimations.push({
          value: totalScore,
          position: { x: state.gridSize / 2, y: state.gridSize / 2 },
          id: animationCounter++,
          clearValue: clearValue,
          lines: linesCleared,
        });
        clearedGrid = clearRowsAndCols(state.grid, rows, cols);
        // Check if the entire grid was cleared
        hasFullGridClear = checkGridCleared(clearedGrid);
        if (hasFullGridClear) {
          // Add a special animation for the full grid clear bonus
          scoreAnimations.push({
            value: 5000,
            position: { x: state.gridSize / 2, y: state.gridSize / 2 },
            id: animationCounter++,
            clearValue: 7,
            bonus: true,
          });
        }
      }
      if (clearValue > 0) {
        scoreGain = Math.floor(calculateLineClearScore(clearValue, linesCleared, hasFullGridClear, state.level));
      }
      const newScore = state.score + scoreGain;
      const isGameOver = checkGameOver(clearedGrid);
      const turnsPlayed = state.turnsPlayed + 1;
      if (state.daily) {
        const nextPiece = state.nextQueue[0] ?? null;
        const dailyOutcome = gridsMatch(clearedGrid, state.daily.target) ? "solved" : isGameOver ? "seven" : nextPiece ? null : "empty";
        return {
          ...state,
          grid: clearedGrid,
          currentPiece: dailyOutcome ? null : nextPiece,
          nextQueue: advanceQueue(state),
          canHold: true,
          score: newScore,
          turnsPlayed,
          gameOver: dailyOutcome !== null,
          dailyOutcome,
          scoreAnimations,
          linesCleared: state.linesCleared + linesCleared,
          pendingClear: false,
        };
      }
      const level = Math.floor(turnsPlayed / TURNS_PER_LEVEL) + 1;
      let updatedHighScores = state.highScores;
      let updatedBestScore = state.bestScore;
      if (isGameOver) {
        // Count the lines this last move cleared, too.
        const saved = recordScore(state, newScore, state.linesCleared + linesCleared);
        updatedHighScores = saved.highScores;
        updatedBestScore = saved.bestScore;
      }
      const newTimeRemaining = getTimerForLevel(level);
      return {
        ...state,
        grid: clearedGrid,
        currentPiece: state.nextQueue[0],
        nextQueue: advanceQueue(state),
        canHold: true,
        score: newScore,
        bestScore: updatedBestScore,
        level,
        turnsPlayed,
        timeRemaining: newTimeRemaining,
        gameOver: isGameOver,
        highScores: updatedHighScores,
        scoreAnimations,
        linesCleared: state.linesCleared + linesCleared,
        pendingClear: false,
      };
    }

    case "ROTATE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;

      const currentRotation = state.currentPiece.rotation;
      const direction = action.direction === "clockwise" ? 1 : -1;
      const maxRotations = state.currentPiece.shape.rotations.length;
      let newRotation = (currentRotation + direction + maxRotations) % maxRotations;

      const kickPosition = tryWallKick(state.grid, { ...state.currentPiece, rotation: newRotation }, newRotation);

      if (kickPosition) {
        return {
          ...state,
          currentPiece: {
            ...state.currentPiece,
            rotation: newRotation,
            position: kickPosition,
          },
        };
      }

      return state;
    }

    case "MOVE_PIECE": {
      if (state.gameOver || !state.currentPiece || !action.position || !state.hasStarted) return state;

      const updatedPiece = {
        ...state.currentPiece,
        position: action.position,
      };

      if (isValidPosition(state.grid, updatedPiece)) {
        return {
          ...state,
          currentPiece: updatedPiece,
        };
      }

      return state;
    }

    case "HOLD_PIECE": {
      if (!state.canHold || state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu)
        return state;

      if (!state.heldPiece) {
        if (!state.nextQueue[0]) return state;
        return {
          ...state,
          currentPiece: state.nextQueue[0],
          heldPiece: state.currentPiece,
          nextQueue: advanceQueue(state),
          canHold: false,
        };
      }

      return {
        ...state,
        currentPiece: state.heldPiece,
        heldPiece: state.currentPiece,
        canHold: false,
      };
    }

    case "TICK_TIMER": {
      if (state.gameOver || !state.hasStarted) return state;

      const updatedTimeRemaining = Math.max(0, state.timeRemaining - 16);
      return {
        ...state,
        timeRemaining: updatedTimeRemaining,
      };
    }

    case "AUTO_PLACE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted) return state;

      let positionToUse = null;

      if (isValidPosition(state.grid, state.currentPiece)) {
        positionToUse = state.currentPiece.position;
      } else {
        positionToUse = generateRandomValidPosition(state.grid, state.currentPiece);
      }

      if (positionToUse) {
        const autoPlacedPiece = {
          ...state.currentPiece,
          position: positionToUse,
        };

        return gameReducer({ ...state, currentPiece: autoPlacedPiece }, { type: "PLACE_PIECE" });
      }

      // The clock ran out and the piece fits nowhere: the game ends here, and still counts.
      const saved = recordScore(state, state.score, state.linesCleared);
      return {
        ...state,
        gameOver: true,
        highScores: saved.highScores,
        bestScore: saved.bestScore,
      };
    }

    case "CLOSE_TUTORIAL": {
      return {
        ...state,
        showTutorial: false,
      };
    }

    case "RESET_GAME": {
      return {
        ...initialState,
        keyConfig: state.keyConfig,
        gridSize: state.gridSize,
        isTimed: state.isTimed,
        hasStarted: false,
        highScores: state.highScores,
        bestScore: state.bestScore,
        daily: state.daily,
      };
    }

    case "SET_PLAY_MODE": {
      const isTimed = action.mode === "timed";
      const gridSize = action.daily ? 4 : action.gridSize;
      const highScores = loadHighScores();
      return {
        ...initialState,
        keyConfig: state.keyConfig,
        gridSize,
        isTimed,
        daily: action.daily,
        hasStarted: false,
        highScores,
        bestScore: getBestScore(highScores, gridSize, isTimed),
      };
    }

    case "TOGGLE_SHOW_BOARD": {
      return {
        ...state,
        showBoard: !state.showBoard,
      };
    }

    case "UPDATE_KEY_CONFIG": {
      const newKeyConfig = {
        ...state.keyConfig,
        ...action.config,
      };

      saveGameSettings(newKeyConfig, state.gridSize);
      localStorage.setItem("isTimed", state.isTimed.toString());
      return {
        ...state,
        keyConfig: newKeyConfig,
      };
    }

    case "REMOVE_SCORE_ANIMATION": {
      return {
        ...state,
        scoreAnimations: state.scoreAnimations.filter((anim) => anim.id !== action.id),
      };
    }

    case "CHANGE_GRID_SIZE": {
      if (action.size === state.gridSize) return state;
      saveGameSettings(state.keyConfig, action.size);
      localStorage.setItem("isTimed", state.isTimed.toString());
      const highScores = loadHighScores();
      const bestScore = getBestScore(highScores, action.size, state.isTimed);
      return {
        ...state,
        gridSize: action.size,
        grid: createEmptyGrid(action.size),
        timeRemaining: state.isTimed ? getTimerForLevel(1) : Infinity,
        currentPiece: null,
        nextPiece: null,
        heldPiece: null,
        hasStarted: false,
        nextQueue: [],
        highScores,
        bestScore,
      };
    }

    case "UPDATE_HIGH_SCORES": {
      return {
        ...state,
        highScores: action.highScores,
        bestScore: getBestScore(action.highScores, state.gridSize, state.isTimed),
      };
    }

    case "SET_OPTIONS_MENU": {
      return {
        ...state,
        showOptionsMenu: action.isOpen,
      };
    }

    default:
      return state;
  }
}

/** Counts smoothly up to a number instead of jumping. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (target < shown) {
      // New game: snap straight back to zero.
      from.current = target;
      setShown(target);
      return;
    }
    from.current = shown;
    const start = performance.now();
    const dur = Math.min(700, 250 + (target - shown) / 20);
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(from.current + (target - from.current) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return shown;
}

const TimerBar: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
  const low = remaining < 3000;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="gp-label flex items-center gap-1">
          <Timer size={13} strokeWidth={3} /> Time
        </span>
        <span className={cn("gp-value text-base", low && "text-[#FF5A6E]")}>{Math.ceil(remaining / 1000)}s</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#F1E7DA]">
        <div
          className={cn("h-full rounded-full transition-[background-color]", low ? "bg-[#FF5A6E]" : "bg-[#7C5CFF]")}
          style={{ width: `${Math.max(0, Math.min(100, (remaining / total) * 100))}%` }}
        />
      </div>
    </div>
  );
};

const PLAY_MODES: { mode: PlayMode; label: string; icon: React.ReactNode }[] = [
  { mode: "daily", label: "Daily", icon: <CalendarDays size={16} strokeWidth={2.75} /> },
  { mode: "unlimited", label: "Unlimited", icon: <InfinityIcon size={17} strokeWidth={2.75} /> },
  { mode: "timed", label: "Timed", icon: <Timer size={16} strokeWidth={2.75} /> },
];

const ModeTabs: React.FC<{ mode: PlayMode; onChange: (mode: PlayMode) => void; className?: string }> = ({ mode, onChange, className }) => (
  <div role="tablist" aria-label="Game mode" className={cn("gp-tabs", className)}>
    {PLAY_MODES.map((option) => (
      <button key={option.mode} role="tab" aria-selected={option.mode === mode} className={cn("gp-tab", option.mode === mode && "gp-tab-on")} onClick={() => onChange(option.mode)}>
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

const LevelTabs: React.FC<{ level: DailyLevel; onChange: (level: DailyLevel) => void; className?: string }> = ({ level, onChange, className }) => (
  <div role="tablist" aria-label="Daily difficulty" className={cn("gp-tabs gp-tabs-sm", className)}>
    {DAILY_LEVELS.map((option) => (
      <button key={option.level} role="tab" aria-selected={option.level === level} className={cn("gp-tab", option.level === level && "gp-tab-on")} onClick={() => onChange(option.level)}>
        {option.label}
      </button>
    ))}
  </div>
);

const GridPopGame: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showHighScores, setShowHighScores] = useState(false);
  const [muted, setMuted] = useState(sfx.muted);
  const [bumpKey, setBumpKey] = useState(0);
  const [levelToast, setLevelToast] = useState<number | null>(null);
  // Phones: show the gestures over the board until the first piece is placed (once ever).
  const [gestureHintDone, setGestureHintDone] = useState(() => {
    try {
      return localStorage.getItem("gridpop-gestures-seen") === "1";
    } catch {
      return true;
    }
  });
  const isMobile = useIsMobile();
  const score = useCountUp(state.score);
  // The best score when this game began, to tell a new record at game over.
  const bestAtStart = useRef(state.bestScore);
  if (state.turnsPlayed === 0) bestAtStart.current = state.bestScore;

  // ---------- daily puzzle ----------

  const daily = state.daily;
  const playMode: PlayMode = daily ? "daily" : state.isTimed ? "timed" : "unlimited";
  const [dailyResults, setDailyResults] = useState(loadDailyResults);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [lastDailyRun, setLastDailyRun] = useState<DailyResult | null>(null);
  const [dailyClockMs, setDailyClockMs] = useState(() => (daily && !dailyResults[daily.level][daily.date] ? loadDailyProgress(daily).elapsedMs : 0));
  const [dailyAttempts, setDailyAttempts] = useState(() => (daily && !dailyResults[daily.level][daily.date] ? loadDailyProgress(daily).attempts : 0));
  const [dailyClockArmed, setDailyClockArmed] = useState(false);
  const savedDailyResult = daily ? dailyResults[daily.level][daily.date] : undefined;
  // False once the puzzle is done, or if the page was left open into the next day.
  const dailyCounts = !!daily && isToday(daily.date) && !savedDailyResult;
  const stats = dailyStats(dailyResults[daily?.level ?? "normal"]);

  useEffect(() => {
    if (!daily || !dailyClockArmed || state.dailyOutcome) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // Capped so time in a background tab (where timers stall) doesn't land all at once.
      const delta = document.hidden ? 0 : Math.min(now - last, 1000);
      last = now;
      setDailyClockMs((ms) => ms + delta);
    }, 250);
    return () => clearInterval(id);
  }, [daily, dailyClockArmed, state.dailyOutcome]);

  useEffect(() => {
    if (dailyCounts && dailyClockMs > 0) saveDailyProgress(daily, { elapsedMs: dailyClockMs, attempts: dailyAttempts });
  }, [dailyCounts, dailyClockMs, dailyAttempts, daily]);

  useEffect(() => {
    if (!daily || !state.dailyOutcome) return;
    if (state.dailyOutcome === "solved" && !daily.showSolved) {
      const run = { moves: state.turnsPlayed, restarts: Math.max(0, dailyAttempts - 1), par: daily.par, timeMs: dailyClockMs };
      setLastDailyRun(run);
      if (dailyCounts) setDailyResults(saveDailyResult(daily.level, daily.date, run));
    }
    setShowDailyModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dailyOutcome]);

  const armDailyClock = () => {
    if (daily && !dailyClockArmed) setDailyClockArmed(true);
  };

  const startMode = (mode: PlayMode, setup: DailySetup | null) => {
    sfx.play("click");
    dispatch({ type: "SET_PLAY_MODE", mode, daily: setup, gridSize: loadGameSettings().gridSize });
    setShowDailyModal(false);
    setLastDailyRun(null);
    setDailyClockArmed(false);
    if (setup) {
      const progress = dailyResults[setup.level][setup.date] ? { elapsedMs: 0, attempts: 0 } : loadDailyProgress(setup);
      setDailyClockMs(progress.elapsedMs);
      setDailyAttempts(progress.attempts);
    }
  };

  const switchMode = (mode: PlayMode) => {
    if (mode !== playMode) startMode(mode, mode === "daily" ? dailySetup(utcDateKey(), loadDailyLevel()) : null);
  };

  // A page left open past midnight UTC moves on to the new puzzle, unless a run is under way.
  const checkForNewDay = useRef<() => void>();
  checkForNewDay.current = () => {
    if (daily && daily.date !== utcDateKey() && (state.turnsPlayed === 0 || state.dailyOutcome)) startMode("daily", dailySetup(utcDateKey(), daily.level));
  };
  useEffect(() => {
    const id = setInterval(() => checkForNewDay.current?.(), 30_000);
    return () => clearInterval(id);
  }, []);

  const switchLevel = (level: DailyLevel) => {
    if (!daily || level === daily.level) return;
    saveDailyLevel(level);
    startMode("daily", dailySetup(daily.date, level));
  };

  useEffect(() => {
    const { keyConfig, gridSize } = loadGameSettings();
    if (keyConfig) dispatch({ type: "UPDATE_KEY_CONFIG", config: keyConfig });
    if (!state.daily && gridSize && gridSize !== state.gridSize) dispatch({ type: "CHANGE_GRID_SIZE", size: gridSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start straight away (and again after a reset).
  useEffect(() => {
    if (!state.hasStarted) dispatch({ type: "START_GAME" });
  }, [state.hasStarted]);

  useEffect(() => {
    const timers = state.scoreAnimations.map((anim) => setTimeout(() => dispatch({ type: "REMOVE_SCORE_ANIMATION", id: anim.id }), 1500));
    return () => timers.forEach(clearTimeout);
  }, [state.scoreAnimations]);

  useEffect(() => {
    if (!state.hasStarted || state.gameOver || !state.isTimed) return;
    const timerInterval = setInterval(() => dispatch({ type: "TICK_TIMER" }), 16);
    return () => clearInterval(timerInterval);
  }, [state.hasStarted, state.gameOver, state.isTimed]);

  useEffect(() => {
    if (!state.hasStarted || state.timeRemaining > 0 || state.gameOver || !state.isTimed) return;
    dispatch({ type: "AUTO_PLACE" });
  }, [state.timeRemaining, state.gameOver, state.isTimed, state.hasStarted]);

  // Completed lines flash for a beat, then clear.
  useEffect(() => {
    if (!state.pendingClear) return;
    const timeout = setTimeout(() => dispatch({ type: "CLEAR_LINES" }), checkLinesToClear(state.grid).clearValue > 0 ? 260 : 60);
    return () => clearTimeout(timeout);
  }, [state.pendingClear, state.grid]);

  // ---------- sound: one place that listens to the game and plays what just happened ----------

  const prev = useRef(state);
  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!state.hasStarted || !p.hasStarted) return;

    if (state.gameOver && !p.gameOver && state.daily) {
      sfx.play(state.dailyOutcome === "solved" ? "best" : "gameover", { delay: 0.25 });
      return;
    }
    if (state.gameOver && !p.gameOver) {
      const best = state.score > 0 && state.score > bestAtStart.current;
      sfx.play(best ? "best" : "gameover", { delay: 0.25 });
      return;
    }
    if (state.pendingClear && !p.pendingClear) {
      sfx.play("place", { jitter: 0.06 });
      if (!gestureHintDone) {
        setGestureHintDone(true);
        try {
          localStorage.setItem("gridpop-gestures-seen", "1");
        } catch {
          // Private mode: the hint just shows again next visit.
        }
      }
    }

    const seen = new Set(p.scoreAnimations.map((a) => a.id));
    for (const a of state.scoreAnimations) {
      if (seen.has(a.id)) continue;
      if (a.bonus) {
        sfx.play("boardclear", { delay: 0.15 });
        continue;
      }
      // Higher numbers ring higher; more lines at once add a flourish.
      sfx.play("clear", { rate: 0.8 + a.clearValue * 0.09 });
      // A small buzz on phones that support it (bigger for bigger clears).
      navigator.vibrate?.((a.lines ?? 1) >= 2 ? [12, 40, 18] : 12);
      if ((a.lines ?? 1) >= 2) sfx.play("combo", { delay: 0.09, rate: 0.95 + (a.lines ?? 2) * 0.05 });
    }

    if (state.level > p.level && !state.gameOver) {
      sfx.play("levelup", { delay: 0.3 });
      setLevelToast(state.level);
    }

    const sixes = (g: typeof state.grid) => g.reduce((n, row) => n + row.filter((v) => v === 6).length, 0);
    if (sixes(state.grid) > sixes(p.grid) && !state.pendingClear) sfx.play("danger", { delay: 0.12 });

    const samePiece = p.currentPiece && state.currentPiece && p.turnsPlayed === state.turnsPlayed && p.canHold === state.canHold;
    if (p.canHold && !state.canHold) sfx.play("hold");
    else if (samePiece && p.currentPiece!.rotation !== state.currentPiece!.rotation) sfx.play("rotate");
    else if (samePiece && (p.currentPiece!.position.x !== state.currentPiece!.position.x || p.currentPiece!.position.y !== state.currentPiece!.position.y))
      sfx.play("move", { jitter: 0.04 });
  }, [state]);

  useEffect(() => {
    if (levelToast === null) return;
    const t = setTimeout(() => setLevelToast(null), 1400);
    return () => clearTimeout(t);
  }, [levelToast]);

  // ---------- controls ----------

  const canAct = () => !state.showOptionsMenu && !!state.currentPiece && !state.gameOver && state.hasStarted && !state.pendingClear;

  const bump = () => {
    sfx.play("bump");
    setBumpKey((k) => k + 1);
  };

  const handleDirectionalMove = (direction: "left" | "right" | "up" | "down", dragged = false) => {
    if (!canAct() || !state.currentPiece) return;
    armDailyClock();
    const { x, y } = state.currentPiece.position;
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    const position: Position = { x: x + delta[0], y: y + delta[1] };
    if (!isValidPosition(state.grid, { ...state.currentPiece, position })) return dragged ? undefined : bump();
    dispatch({ type: "MOVE_PIECE", position });
  };

  const handlePieceRotate = (direction: "clockwise" | "counterclockwise") => {
    if (!canAct() || !state.currentPiece) return;
    armDailyClock();
    const piece = state.currentPiece;
    const max = piece.shape.rotations.length;
    const next = (piece.rotation + (direction === "clockwise" ? 1 : -1) + max) % max;
    // tryWallKick tries the new rotation on a copy, nudging it if it doesn't fit.
    if (!tryWallKick(state.grid, { ...piece, rotation: next }, next)) return bump();
    dispatch({ type: "ROTATE_PIECE", direction });
  };

  const handlePlace = () => {
    if (!canAct()) return;
    armDailyClock();
    if (daily && state.turnsPlayed === 0) setDailyAttempts((attempts) => attempts + 1);
    dispatch({ type: "PLACE_PIECE" });
  };

  const handleHold = () => {
    if (!canAct()) return;
    armDailyClock();
    if (!state.canHold) return bump();
    dispatch({ type: "HOLD_PIECE" });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (state.showOptionsMenu || !state.hasStarted || state.gameOver || e.repeat && e.key === state.keyConfig.drop) return;
      const key = e.key.toLowerCase();
      const { rotate, drop, hold, moveLeft, moveRight, moveUp, moveDown, rotateCounter } = state.keyConfig;
      const is = (k?: string) => !!k && key === k.toLowerCase();
      if (is(rotate)) handlePieceRotate("clockwise");
      else if (is(rotateCounter)) handlePieceRotate("counterclockwise");
      else if (is(drop)) handlePlace();
      else if (is(hold)) handleHold();
      else if (is(moveLeft)) handleDirectionalMove("left");
      else if (is(moveRight)) handleDirectionalMove("right");
      else if (is(moveUp)) handleDirectionalMove("up");
      else if (is(moveDown)) handleDirectionalMove("down");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleNewGame = () => {
    sfx.play("click");
    setShowDailyModal(false);
    dispatch({ type: "RESET_GAME" });
    dispatch({ type: "START_GAME" });
  };

  const openOptions = () => {
    sfx.play("open");
    dispatch({ type: "SET_OPTIONS_MENU", isOpen: true });
  };

  const openHighScores = () => {
    sfx.play("open");
    setShowHighScores(true);
  };

  const toggleMute = () => {
    sfx.setMuted(!muted);
    setMuted(!muted);
    if (muted) sfx.play("click");
  };

  // ---------- layout ----------

  const showGestureHint = isMobile && !gestureHintDone && state.hasStarted && !state.gameOver;
  const pieceKey = `${state.turnsPlayed}-${state.canHold ? 0 : 1}-${state.currentPiece?.shape.type}`;
  const mode = `${state.gridSize}×${state.gridSize} · ${state.isTimed ? "Timed" : "Untimed"}`;
  const dailyMoves = daily?.showSolved ? savedDailyResult?.moves ?? 0 : state.turnsPlayed;
  const dailyRestarts = daily?.showSolved ? savedDailyResult?.restarts ?? 0 : Math.max(0, dailyAttempts - (state.turnsPlayed > 0 ? 1 : 0));
  const dailyClock = formatClock(daily?.showSolved ? savedDailyResult?.timeMs ?? 0 : dailyClockMs);
  const restartLabel = daily ? "Restart" : "New Game";
  const canRestart = state.dailyOutcome !== "solved";

  const board = (
    <div className="relative">
      <GameBoard
        className="gp-board-wrap aspect-square w-full"
        grid={state.grid}
        currentPiece={state.hasStarted ? state.currentPiece : null}
        pieceKey={pieceKey}
        pendingClear={state.pendingClear}
        bumpKey={bumpKey}
        scoreAnimations={state.scoreAnimations}
        onPieceMove={handleDirectionalMove}
        onPiecePlace={handlePlace}
        onPieceRotate={handlePieceRotate}
        gameOver={state.gameOver && state.dailyOutcome !== "solved"}
        showPoints={!daily}
      />
      <AnimatePresence>
        {levelToast !== null && (
          <motion.div
            key={levelToast}
            className="pointer-events-none absolute inset-x-0 -top-5 z-30 flex justify-center"
            initial={{ y: 12, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            <span className="gp-pop-label !m-0 !rotate-0 bg-[#45D486]">Level {levelToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const holdWell = (
    <div className={cn("gp-well", state.canHold && "gp-well-tap")} onClick={handleHold} title="Hold (S)">
      <PieceDisplay piece={state.heldPiece} dim={!state.canHold} />
    </div>
  );

  const scoresButton = (className?: string, withMode = false) =>
    daily ? (
      <button className={cn("gp-btn", className)} onClick={() => setShowDailyModal(true)} aria-label="Daily stats">
        <Flame size={18} strokeWidth={2.5} className="text-[#FF7A3D]" />
        <span className="gp-value text-lg">{stats.streak}</span>
      </button>
    ) : (
      <button className={cn("gp-btn", className)} onClick={openHighScores}>
        <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" />
        <span className="gp-value text-lg">{state.bestScore.toLocaleString()}</span>
        {withMode && <span className="text-sm font-bold text-[color:var(--gp-muted)]">{mode}</span>}
      </button>
    );

  const dailyCard = (compact: boolean) =>
    daily && (
      <div className={cn("gp-card", compact ? "flex flex-1 items-center gap-2.5 px-3 py-2.5" : "flex flex-col gap-3.5 p-4")}>
        {!compact && <div className="gp-label -mb-1.5">Target</div>}
        <TargetGrid grid={daily.target} className={compact ? "w-[56px] shrink-0" : "w-full"} />
        <div className={cn("grid", compact ? "flex-1 grid-cols-[auto_auto] justify-between gap-x-2 gap-y-1.5" : "grid-cols-2 gap-y-3.5")}>
          <div>
            <div className="gp-label">Moves</div>
            <div className={cn("gp-value", compact ? "text-xl" : "text-2xl")}>{dailyMoves}</div>
          </div>
          <div className={cn(!compact && "text-right")}>
            <div className="gp-label">Goal</div>
            <div className={cn("gp-value", compact ? "text-xl" : "text-2xl")}>{daily.par}</div>
          </div>
          <div>
            <div className="gp-label">Restarts</div>
            <div className={cn("gp-value", compact ? "text-xl" : "text-2xl")}>{dailyRestarts}</div>
          </div>
          <div className={cn(!compact && "text-right")}>
            <div className="gp-label">Time</div>
            <div className={cn("gp-value", compact ? "text-xl" : "text-2xl")}>{dailyClock}</div>
          </div>
        </div>
      </div>
    );

  const muteIcon = muted ? <VolumeX size={20} strokeWidth={2.5} /> : <Volume2 size={20} strokeWidth={2.5} />;

  return (
    <div className="mx-auto w-full">
      {isMobile ? (
        <div className="mx-auto flex min-h-[calc(100dvh-60px-env(safe-area-inset-bottom))] w-full max-w-[440px] flex-col gap-3 px-4 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
          <header className="flex items-center justify-between">
            <Logo className="text-[30px]" />
            <div className="flex gap-2">
              <button className="gp-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muteIcon}
              </button>
              <button className="gp-icon-btn" onClick={openOptions} aria-label="Options">
                <Settings2 size={20} strokeWidth={2.5} />
              </button>
            </div>
          </header>

          <ModeTabs mode={playMode} onChange={switchMode} className="w-full" />
          {daily && <LevelTabs level={daily.level} onChange={switchLevel} className="-mt-1 w-full" />}

          {/* Everything under the header sits in the middle of the screen on tall phones. */}
          <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="flex items-stretch gap-2.5">
            {daily ? dailyCard(true) : (
            <div className="gp-card flex flex-1 items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="gp-label">Score</div>
                <div className="gp-value truncate text-[28px]">{score.toLocaleString()}</div>
              </div>
              <div className="flex gap-3 text-right">
                <div>
                  <div className="gp-label">Lvl</div>
                  <div className="gp-value text-xl">{state.level}</div>
                </div>
                <div>
                  <div className="gp-label">Lines</div>
                  <div className="gp-value text-xl">{state.linesCleared}</div>
                </div>
              </div>
            </div>
            )}
            <div className="flex w-[68px] flex-col items-center">
              <div className="gp-label mb-1">Hold</div>
              <div className="w-full">{holdWell}</div>
            </div>
            <div className="flex w-[68px] flex-col items-center">
              <div className="gp-label mb-1">Next</div>
              <div className="gp-well w-full">
                <PieceDisplay piece={state.nextQueue[0] ?? null} />
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full" style={{ maxWidth: `min(100%, calc(100dvh - ${daily ? 484 : 380}px))`, minWidth: 260 }}>
            {board}
            <AnimatePresence>
              {showGestureHint && (
                <motion.div
                  className="pointer-events-none absolute inset-x-2 bottom-3 z-30 flex justify-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="whitespace-nowrap rounded-full border-[2.5px] border-[#1F1633] bg-white px-3 py-1.5 text-[12px] font-extrabold leading-none">
                    Drag to move · Tap to place · Double-tap to rotate
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {daily && (
            // With the Next box, the same four upcoming pieces the desktop layout shows.
            <div className="flex justify-end gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="gp-well w-[52px] !p-1.5 opacity-80">
                  <PieceDisplay piece={state.nextQueue[i] ?? null} />
                </div>
              ))}
            </div>
          )}

          {state.isTimed && (
            <div className="gp-card px-4 py-3">
              <TimerBar remaining={state.timeRemaining} total={getTimerForLevel(state.level)} />
            </div>
          )}

          <div className="flex gap-2.5">
            {scoresButton("flex-1")}
            {canRestart && (
              <button className="gp-btn gp-btn-primary flex-[1.4]" onClick={handleNewGame}>
                <RotateCcw size={18} strokeWidth={3} /> {restartLabel}
              </button>
            )}
          </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[920px] px-6 pb-10 pt-7">
          <header className={cn("flex items-center justify-between", daily ? "mb-4" : "mb-7")}>
            <Logo className="text-[44px]" />
            <ModeTabs mode={playMode} onChange={switchMode} />
            <div className="flex gap-2.5">
              {scoresButton(undefined, true)}
              <button className="gp-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
                {muteIcon}
              </button>
            </div>
          </header>
          {daily && (
            <div className="mb-6 flex justify-center">
              <LevelTabs level={daily.level} onChange={switchLevel} className="w-[300px]" />
            </div>
          )}

          <div className="grid grid-cols-[164px_minmax(0,1fr)_164px] items-start gap-7">
            <aside className="flex flex-col gap-4">
              <div className="gp-card p-4">
                <div className="gp-label mb-2 flex justify-between">
                  Hold <kbd className="font-sans text-[10px] opacity-70">{(state.keyConfig.hold || "").toUpperCase()}</kbd>
                </div>
                {holdWell}
              </div>
              {daily ? dailyCard(false) : (
              <div className="gp-card flex flex-col gap-3.5 p-4">
                <div>
                  <div className="gp-label">Score</div>
                  <div className="gp-value text-[34px]">{score.toLocaleString()}</div>
                </div>
                <div className="flex justify-between">
                  <div>
                    <div className="gp-label">Level</div>
                    <div className="gp-value text-2xl">{state.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="gp-label">Lines</div>
                    <div className="gp-value text-2xl">{state.linesCleared}</div>
                  </div>
                </div>
                {state.isTimed && <TimerBar remaining={state.timeRemaining} total={getTimerForLevel(state.level)} />}
              </div>
              )}
              {canRestart && (
                <button className="gp-btn gp-btn-primary w-full" onClick={handleNewGame}>
                  <RotateCcw size={18} strokeWidth={3} /> {restartLabel}
                </button>
              )}
              <button className="gp-btn w-full" onClick={openOptions}>
                <Settings2 size={18} strokeWidth={2.5} /> Options
              </button>
            </aside>

            {board}

            <aside className="gp-card p-4">
              <div className="gp-label mb-2">Next</div>
              <div className="flex flex-col gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("gp-well", i > 0 && "mx-3 opacity-80")}>
                    <PieceDisplay piece={state.nextQueue[i] ?? null} />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}

      {daily && (
        <DailyResultModal
          isOpen={showDailyModal}
          onClose={() => setShowDailyModal(false)}
          setup={daily}
          outcome={state.dailyOutcome}
          run={daily.showSolved ? savedDailyResult ?? null : lastDailyRun}
          stats={stats}
          onRestart={handleNewGame}
        />
      )}

      {state.gameOver && !daily && (
        <GameOverModal
          score={state.score}
          level={state.level}
          linesCleared={state.linesCleared}
          isNewBest={state.score > 0 && state.score > bestAtStart.current}
          onRestart={handleNewGame}
          onClose={() => {}}
        />
      )}

      <OptionsMenu
        isOpen={state.showOptionsMenu}
        onClose={() => dispatch({ type: "SET_OPTIONS_MENU", isOpen: false })}
        onUpdateKeyConfig={(config: Partial<KeyConfig>) => dispatch({ type: "UPDATE_KEY_CONFIG", config })}
        keyConfig={state.keyConfig}
        defaultKeyConfig={DEFAULT_KEY_CONFIG}
        currentGridSize={state.gridSize}
        showBoardSize={!daily}
        onApplyBoardSize={(size: 4 | 5) => {
          sfx.play("click");
          dispatch({ type: "CHANGE_GRID_SIZE", size });
        }}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <HighScoresModal
        isOpen={showHighScores}
        onClose={() => setShowHighScores(false)}
        highScores={loadHighScores()}
        gridSize={state.gridSize}
        isTimed={state.isTimed}
      />
    </div>
  );
};

export default GridPopGame;
