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
} from "@/utils/gameLogic";
import { CellValue, Position, GameState, GameAction, KeyConfig, HighScore } from "@/types/game";
import { Trophy, Timer, Settings2, Volume2, VolumeX, RotateCcw } from "lucide-react";
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
  gridSize: loadGridSize(),
  isTimed: loadIsTimed(),
  hasStarted: false,
  showOptionsMenu: false,
  nextQueue: [],
  linesCleared: 0,
  pendingClear: false,
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

function loadGridSize(): 4 | 5 {
  const savedSize = localStorage.getItem("gridSize");
  return savedSize === "5" ? 5 : 4;
}

function loadIsTimed(): boolean {
  const savedIsTimed = localStorage.getItem("isTimed");
  return savedIsTimed === null ? false : savedIsTimed === "true";
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
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
      const level = Math.floor(turnsPlayed / TURNS_PER_LEVEL) + 1;
      let updatedHighScores = state.highScores;
      let updatedBestScore = state.bestScore;
      if (isGameOver) {
        const newHighScore: HighScore = {
          score: newScore,
          date: new Date().toISOString(),
          gridSize: state.gridSize,
          isTimed: state.isTimed,
          linesCleared: state.linesCleared,
        };
        const currentHighScores: HighScore[] = Array.isArray(state.highScores)
          ? state.highScores.map((score) =>
              typeof score === "number"
                ? { score, date: new Date().toISOString(), gridSize: DEFAULT_GRID_SIZE, isTimed: true, linesCleared: 0 }
                : (score as HighScore)
            )
          : [];
        updatedHighScores = updateHighScores(
          currentHighScores,
          newHighScore.score,
          state.gridSize,
          state.isTimed,
          state.linesCleared
        );
        updatedBestScore = getBestScore(updatedHighScores, state.gridSize, state.isTimed);
        localStorage.setItem("gridpop-high-scores", JSON.stringify(updatedHighScores));
      }
      const newTimeRemaining = getTimerForLevel(level);
      return {
        ...state,
        grid: clearedGrid,
        currentPiece: state.nextQueue[0],
        nextQueue: [...state.nextQueue.slice(1), getNextTetromino(state.gridSize)],
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
        return {
          ...state,
          currentPiece: state.nextQueue[0],
          heldPiece: state.currentPiece,
          nextQueue: [...state.nextQueue.slice(1), getNextTetromino(state.gridSize)],
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

      return {
        ...state,
        gameOver: true,
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

    case "TOGGLE_TIMED_MODE": {
      saveGameSettings(state.keyConfig, state.gridSize);
      localStorage.setItem("isTimed", action.isTimed.toString());
      const highScores = loadHighScores();
      const bestScore = getBestScore(highScores, state.gridSize, action.isTimed);
      return {
        ...state,
        isTimed: action.isTimed,
        timeRemaining: action.isTimed ? getTimerForLevel(1) : Infinity,
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

/** The GridPop wordmark: a little tile grid, "Grid", and POP spelled in game tiles that hop now and then. */
const Logo: React.FC<{ className?: string }> = ({ className }) => {
  // letter, face, edge, text colour, tilt
  const tiles: [string, string, string, string, number][] = [
    ["P", "#FFD45E", "#D9A12A", "#6E4300", -7],
    ["O", "#7CCBFF", "#3A93D2", "#08436B", 4],
    ["P", "#FF5A6E", "#C92841", "#FFFFFF", -3],
  ];
  const mark = ["#FFD45E", "#7CCBFF", "#7BDEA3", "#FF5A6E"];
  return (
    <h1 className={cn("gp-logo", className)} aria-label="GridPop">
      <motion.span
        className="gp-logo-mark"
        aria-hidden
        initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
      >
        {mark.map((c, i) => (
          <i key={i} style={{ background: c }} className={i === 3 ? "gp-logo-mark-pop" : undefined} />
        ))}
      </motion.span>
      <span className="gp-logo-word">Grid</span>
      <span className="gp-logo-pop" aria-hidden>
        {tiles.map(([ch, f, e, t, r], i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ y: -18, scale: 0.5, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 13, delay: 0.15 + i * 0.09 }}
          >
            <span
              className="gp-logo-tile"
              style={{ ["--f" as string]: f, ["--e" as string]: e, ["--t" as string]: t, ["--r" as string]: `${r}deg`, ["--d" as string]: `${1.2 + i * 0.12}s` }}
            >
              {ch}
            </span>
          </motion.span>
        ))}
      </span>
    </h1>
  );
};

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

const GridPopGame: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showHighScores, setShowHighScores] = useState(false);
  const [muted, setMuted] = useState(sfx.muted);
  const [bumpKey, setBumpKey] = useState(0);
  const [spin, setSpin] = useState<{ key: number; dir: 1 | -1 }>({ key: 0, dir: 1 });
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

  useEffect(() => {
    const { keyConfig, gridSize } = loadGameSettings();
    if (keyConfig) dispatch({ type: "UPDATE_KEY_CONFIG", config: keyConfig });
    if (gridSize && gridSize !== state.gridSize) dispatch({ type: "CHANGE_GRID_SIZE", size: gridSize });
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

  const handleDirectionalMove = (direction: "left" | "right" | "up" | "down") => {
    if (!canAct() || !state.currentPiece) return;
    const { x, y } = state.currentPiece.position;
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    const position: Position = { x: x + delta[0], y: y + delta[1] };
    if (!isValidPosition(state.grid, { ...state.currentPiece, position })) return bump();
    dispatch({ type: "MOVE_PIECE", position });
  };

  const handlePieceRotate = (direction: "clockwise" | "counterclockwise") => {
    if (!canAct() || !state.currentPiece) return;
    const piece = state.currentPiece;
    const max = piece.shape.rotations.length;
    const next = (piece.rotation + (direction === "clockwise" ? 1 : -1) + max) % max;
    // tryWallKick tries the new rotation on a copy, nudging it if it doesn't fit.
    if (!tryWallKick(state.grid, { ...piece, rotation: next }, next)) return bump();
    dispatch({ type: "ROTATE_PIECE", direction });
    setSpin((s) => ({ key: s.key + 1, dir: direction === "clockwise" ? 1 : -1 }));
  };

  const handlePlace = () => {
    if (canAct()) dispatch({ type: "PLACE_PIECE" });
  };

  const handleHold = () => {
    if (!canAct()) return;
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

  const board = (
    <div className="relative">
      <GameBoard
        className="gp-board-wrap aspect-square w-full"
        grid={state.grid}
        currentPiece={state.hasStarted ? state.currentPiece : null}
        pieceKey={pieceKey}
        pendingClear={state.pendingClear}
        bumpKey={bumpKey}
        spin={spin}
        scoreAnimations={state.scoreAnimations}
        onPieceMove={handleDirectionalMove}
        onPiecePlace={handlePlace}
        onPieceRotate={handlePieceRotate}
        gameOver={state.gameOver}
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

          {/* Everything under the header sits in the middle of the screen on tall phones. */}
          <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="flex items-stretch gap-2.5">
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

          <div className="relative mx-auto w-full" style={{ maxWidth: "min(100%, calc(100dvh - 330px))", minWidth: 260 }}>
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

          {state.isTimed && (
            <div className="gp-card px-4 py-3">
              <TimerBar remaining={state.timeRemaining} total={getTimerForLevel(state.level)} />
            </div>
          )}

          <div className="flex gap-2.5">
            <button className="gp-btn flex-1" onClick={openHighScores}>
              <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" />
              <span className="gp-value text-lg">{state.bestScore.toLocaleString()}</span>
            </button>
            <button className="gp-btn gp-btn-primary flex-[1.4]" onClick={handleNewGame}>
              <RotateCcw size={18} strokeWidth={3} /> New Game
            </button>
          </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[920px] px-6 pb-10 pt-7">
          <header className="mb-7 flex items-center justify-between">
            <Logo className="text-[44px]" />
            <div className="flex gap-2.5">
              <button className="gp-btn" onClick={openHighScores}>
                <Trophy size={18} strokeWidth={2.5} className="text-[#F0A92B]" />
                <span className="gp-value text-lg">{state.bestScore.toLocaleString()}</span>
                <span className="text-sm font-bold text-[color:var(--gp-muted)]">{mode}</span>
              </button>
              <button className="gp-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>
                {muteIcon}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-[164px_minmax(0,1fr)_164px] items-start gap-7">
            <aside className="flex flex-col gap-4">
              <div className="gp-card p-4">
                <div className="gp-label mb-2 flex justify-between">
                  Hold <kbd className="font-sans text-[10px] opacity-70">{(state.keyConfig.hold || "").toUpperCase()}</kbd>
                </div>
                {holdWell}
              </div>
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
              <button className="gp-btn gp-btn-primary w-full" onClick={handleNewGame}>
                <RotateCcw size={18} strokeWidth={3} /> New Game
              </button>
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

      {state.gameOver && (
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
        isTimed={state.isTimed}
        onApplyMode={(size: 4 | 5, timed: boolean) => {
          // Both reset the board; the game then starts fresh with the new settings.
          sfx.play("click");
          if (size !== state.gridSize) dispatch({ type: "CHANGE_GRID_SIZE", size });
          if (timed !== state.isTimed) dispatch({ type: "TOGGLE_TIMED_MODE", isTimed: timed });
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
