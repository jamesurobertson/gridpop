import React, { useEffect, useReducer, useState, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Settings2, Timer, Trophy } from "lucide-react";
import GameBoard from "./GameBoard";
import PieceDisplay from "./PieceDisplay";
import GameOverModal from "./GameOverModal";
import { SettingsMenu } from "./SettingsMenu";
import HighScoresModal from "./HighScoresModal";
import { GameLayout, KeyHints, NextColumn, TouchButtons, useViewport } from "./GameLayout";
import { ENDLESS_ACTIONS, actionFor, controlText, keyLabel, useControls } from "@/utils/controls";
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
import { CellValue, Position, GameState, GameAction, PlayMode, Tetromino } from "@/types/game";
import { loadHighScores } from "@/utils/highScores";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";

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
  showBoard: false,
  gridSize: DEFAULT_GRID_SIZE,
  isTimed: false,
  hasStarted: false,
  showOptionsMenu: false,
  nextQueue: [],
  linesCleared: 0,
  pendingClear: false,
};

let animationCounter = 0;

/** The queue after the front piece is taken, topped up with a new one. */
const advanceQueue = (state: GameState): Tetromino[] => [...state.nextQueue.slice(1), getNextTetromino(state.gridSize)];

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
        gridSize: state.gridSize,
        isTimed: state.isTimed,
        hasStarted: false,
        highScores: state.highScores,
        bestScore: state.bestScore,
      };
    }

    case "SET_PLAY_MODE": {
      const isTimed = action.mode === "timed";
      const { gridSize } = action;
      const highScores = loadHighScores();
      return {
        ...initialState,
        gridSize,
        isTimed,
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

    case "REMOVE_SCORE_ANIMATION": {
      return {
        ...state,
        scoreAnimations: state.scoreAnimations.filter((anim) => anim.id !== action.id),
      };
    }

    case "CHANGE_GRID_SIZE": {
      if (action.size === state.gridSize) return state;
      saveGameSettings(action.size);
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


const usesTouch = () => window.matchMedia?.("(pointer: coarse)").matches ?? false;

/** Unlimited and Timed: endless play for a high score, in the same frame as the daily puzzle. */
const EndlessGame = ({ timed, modeTabs }: { timed: boolean; modeTabs: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    gameReducer(initialState, { type: "SET_PLAY_MODE", mode: timed ? "timed" : "unlimited", gridSize: loadGameSettings().gridSize })
  );
  const [showHighScores, setShowHighScores] = useState(false);
  const [muted, setMuted] = useState(sfx.muted);
  const [controls, setControls] = useControls();
  const [bumpKey, setBumpKey] = useState(0);
  const [levelToast, setLevelToast] = useState<number | null>(null);
  const viewport = useViewport();
  const { landscape } = viewport;
  const [touch] = useState(usesTouch);
  // Touch screens: show the gestures over the board until the first piece is placed (once ever).
  const [gestureHintDone, setGestureHintDone] = useState(() => {
    try {
      return localStorage.getItem("gridpop-gestures-seen") === "1";
    } catch {
      return true;
    }
  });
  const score = useCountUp(state.score);
  // The best score when this game began, to tell a new record at game over.
  const bestAtStart = useRef(state.bestScore);
  if (state.turnsPlayed === 0) bestAtStart.current = state.bestScore;

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

  const handleDirectionalMove = (direction: "left" | "right" | "up" | "down", dragged = false) => {
    if (!canAct() || !state.currentPiece) return;
    const { x, y } = state.currentPiece.position;
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    const position: Position = { x: x + delta[0], y: y + delta[1] };
    if (!isValidPosition(state.grid, { ...state.currentPiece, position })) return dragged ? undefined : bump();
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
  };

  const handlePlace = () => {
    if (!canAct()) return;
    dispatch({ type: "PLACE_PIECE" });
  };

  const handleHold = () => {
    if (!canAct()) return;
    if (!state.canHold) return bump();
    dispatch({ type: "HOLD_PIECE" });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.showOptionsMenu || !state.hasStarted || state.gameOver) return;
      const action = actionFor(controls.keys, e.key, ENDLESS_ACTIONS);
      if (!action) return;
      e.preventDefault();
      if (e.repeat && action === "drop") return;
      if (action === "rotate") handlePieceRotate("clockwise");
      else if (action === "rotateCounter") handlePieceRotate("counterclockwise");
      else if (action === "drop") handlePlace();
      else if (action === "hold") handleHold();
      else if (action === "moveLeft") handleDirectionalMove("left");
      else if (action === "moveRight") handleDirectionalMove("right");
      else if (action === "moveUp") handleDirectionalMove("up");
      else if (action === "moveDown") handleDirectionalMove("down");
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

  const showGestureHint = touch && !gestureHintDone && state.hasStarted && !state.gameOver;
  const pieceKey = `${state.turnsPlayed}-${state.canHold ? 0 : 1}-${state.currentPiece?.shape.type}`;
  const { keys } = controls;
  const touchButtons = touch && controls.touch === "buttons";
  const words = controlText(controls, true);
  const pad = <TouchButtons onRotate={handlePieceRotate} onPlace={handlePlace} />;

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
        gameOver={state.gameOver}
        showPoints
        tapAction={touchButtons ? "none" : controls.touch === "tap-rotate" ? "rotate" : "place"}
        tapRotate={controls.tapRotate}
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
        {showGestureHint && (
          <motion.div
            className="pointer-events-none absolute inset-x-2 bottom-3 z-30 flex justify-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.6 }}
          >
            <span className="whitespace-nowrap rounded-full border-2 border-[#1F1633] bg-[#7C5CFF] px-3 py-1 text-[12px] font-extrabold text-white">
              {touchButtons ? words.move : [words.move, words.place, words.rotate].join(" · ")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Hold takes the target's place: the one extra piece of the endless modes.
  const holdCard = (
    <div className={cn("gp-card p-2.5", landscape ? "w-full" : "w-[34%] max-w-[132px] shrink-0")}>
      <div className="gp-label mb-1.5">Hold</div>
      <div className={cn("gp-well", state.canHold && "gp-well-tap", landscape && "mx-auto max-w-[150px]")} onClick={handleHold} title={touch ? "Hold" : `Hold (${keyLabel(keys.hold)})`}>
        <PieceDisplay piece={state.heldPiece} dim={!state.canHold} />
      </div>
    </div>
  );

  const stat = (label: string, value: ReactNode) => (
    <div className="text-center">
      <div className="gp-label">{label}</div>
      <div className="gp-value mt-1 text-xl">{value}</div>
    </div>
  );

  const scoreCard = (
    <div className={cn("gp-card flex flex-col justify-center gap-2 px-3", landscape ? "py-2.5" : "flex-1 py-2")}>
      <div className="grid grid-cols-3">
        {stat("Score", score.toLocaleString())}
        {stat("Level", state.level)}
        {stat("Lines", state.linesCleared)}
      </div>
      {state.isTimed && <TimerBar remaining={state.timeRemaining} total={getTimerForLevel(state.level)} />}
    </div>
  );

  const buttons = (
    <div className="flex gap-2">
      <button className="gp-btn min-w-0 flex-1 !px-2" onClick={openHighScores} aria-label="High scores">
        <Trophy size={18} strokeWidth={2.5} className="shrink-0 text-[#F0A92B]" />
        <span className="gp-value truncate text-lg">{state.bestScore.toLocaleString()}</span>
      </button>
      <button className="gp-icon-btn shrink-0" onClick={handleNewGame} aria-label="New game" title="New game">
        <RotateCcw size={20} strokeWidth={2.75} />
      </button>
      <button className="gp-icon-btn shrink-0" onClick={openOptions} aria-label="Settings" title="Settings">
        <Settings2 size={20} strokeWidth={2.5} />
      </button>
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden">
      <GameLayout
        viewport={viewport}
        top={modeTabs}
        side={
          landscape ? (
            scoreCard
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {scoreCard}
              {buttons}
            </div>
          )
        }
        target={holdCard}
        board={board}
        next={<NextColumn queue={state.nextQueue} landscape={landscape} />}
        bottom={landscape ? buttons : touchButtons ? pad : null}
        hints={
          touch ? (
            touchButtons && landscape ? <div className="pt-4">{pad}</div> : undefined
          ) : (
            <KeyHints
              keys={{
                left: keys.moveLeft,
                up: keys.moveUp,
                down: keys.moveDown,
                right: keys.moveRight,
                rotateBack: keys.rotateCounter,
                rotate: keys.rotate,
                place: keys.drop,
                hold: keys.hold,
              }}
            />
          )
        }
        hintsHeight={touchButtons ? 68 : undefined}
      />

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

      <SettingsMenu
        isOpen={state.showOptionsMenu}
        onClose={() => dispatch({ type: "SET_OPTIONS_MENU", isOpen: false })}
        controls={controls}
        onChangeControls={setControls}
        actions={ENDLESS_ACTIONS}
        touch={touch}
        muted={muted}
        onToggleMute={toggleMute}
        boardSize={{
          current: state.gridSize,
          onApply: (size) => {
            sfx.play("click");
            dispatch({ type: "CHANGE_GRID_SIZE", size });
          },
        }}
      />

      <HighScoresModal isOpen={showHighScores} onClose={() => setShowHighScores(false)} highScores={loadHighScores()} gridSize={state.gridSize} isTimed={state.isTimed} />
    </div>
  );
};

export default EndlessGame;
