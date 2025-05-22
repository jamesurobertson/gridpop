import React, { useEffect, useReducer, useState, useCallback } from "react";
import GameBoard from "./GameBoard";
import PieceDisplay from "./PieceDisplay";
import GameOverModal from "./GameOverModal";
import Tutorial from "./Tutorial";
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
import { Trophy, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import HighScoresModal from "./HighScoresModal";
import { loadHighScores, saveHighScore } from "@/utils/highScores";

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
  return savedIsTimed === null ? true : savedIsTimed === "true";
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

      try {
      } catch (e) {}

      const placedGrid = placeTetromino(state.grid, state.currentPiece);
      const { rows, cols, clearValue } = checkLinesToClear(placedGrid);

      let clearedGrid = placedGrid;
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
        });

        clearedGrid = clearRowsAndCols(placedGrid, rows, cols);

        // Check if the entire grid was cleared
        hasFullGridClear = checkGridCleared(clearedGrid);
        if (hasFullGridClear) {
          // Add a special animation for the full grid clear bonus
          scoreAnimations.push({
            value: 5000,
            position: { x: state.gridSize / 2, y: state.gridSize / 2 },
            id: animationCounter++,
            clearValue: 7, // Use 7 for the special full grid clear animation
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
          nextQueue: [...state.nextQueue.slice(1), state.nextQueue[0]],
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

      const updatedTimeRemaining = Math.max(0, state.timeRemaining - 0.1);
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
      console.log(state);
      return {
        ...state,
        isTimed: action.isTimed,
        timeRemaining: action.isTimed ? getTimerForLevel(1) : Infinity,
        currentPiece: null,
        nextQueue: [],

        nextPiece: null,
        heldPiece: null,
        hasStarted: false,
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

const GridPopGame: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const { keyConfig, gridSize } = loadGameSettings();

    if (keyConfig) {
      dispatch({ type: "UPDATE_KEY_CONFIG", config: keyConfig });
    }

    if (gridSize && gridSize !== state.gridSize) {
      dispatch({ type: "CHANGE_GRID_SIZE", size: gridSize });
    }
  }, []);

  useEffect(() => {
    if (state.scoreAnimations.length > 0) {
      state.scoreAnimations.forEach((anim) => {
        setTimeout(() => {
          dispatch({ type: "REMOVE_SCORE_ANIMATION", id: anim.id });
        }, 1500);
      });
    }
  }, [state.scoreAnimations]);

  useEffect(() => {
    if (!state.hasStarted || state.gameOver || !state.isTimed) return;

    const timerInterval = setInterval(() => {
      dispatch({ type: "TICK_TIMER" });
    }, 100);

    return () => clearInterval(timerInterval);
  }, [state.hasStarted, state.gameOver, state.isTimed]);

  useEffect(() => {
    if (!state.hasStarted || state.timeRemaining > 0 || state.gameOver || !state.isTimed) return;
    dispatch({ type: "AUTO_PLACE" });
  }, [state.timeRemaining, state.gameOver, state.isTimed, state.hasStarted]);

  const handleDirectionalMove = (direction: "left" | "right" | "up" | "down") => {
    if (state.showOptionsMenu || !state.currentPiece || state.gameOver || !state.hasStarted) return;

    const { x, y } = state.currentPiece.position;
    let newPosition: Position;

    switch (direction) {
      case "left":
        newPosition = { x: x - 1, y };
        break;
      case "right":
        newPosition = { x: x + 1, y };
        break;
      case "up":
        newPosition = { x, y: y - 1 };
        break;
      case "down":
        newPosition = { x, y: y + 1 };
        break;
    }

    dispatch({ type: "MOVE_PIECE", position: newPosition });
  };

  const handlePieceRotate = (direction: "clockwise" | "counterclockwise") => {
    if (state.showOptionsMenu || !state.hasStarted) return;
    dispatch({ type: "ROTATE_PIECE", direction });

    // After rotation, check if the piece is in a valid position
    // If not, try to adjust it
    if (state.currentPiece) {
      const currentPiece = state.currentPiece;
      const currentRotation = currentPiece.rotation;
      const maxRotations = currentPiece.shape.rotations.length;
      const newRotation = (currentRotation + (direction === "clockwise" ? 1 : -1) + maxRotations) % maxRotations;

      // Check if we need to adjust position after rotation
      const newShape = currentPiece.shape.rotations[newRotation];
      const pieceWidth = newShape[0].length;
      const pieceHeight = newShape.length;

      // Make sure piece isn't going out of bounds after rotation
      let newX = currentPiece.position.x;
      let newY = currentPiece.position.y;

      if (newX + pieceWidth > state.gridSize) {
        newX = state.gridSize - pieceWidth;
      }

      if (newY + pieceHeight > state.gridSize) {
        newY = state.gridSize - pieceHeight;
      }

      if (newX !== currentPiece.position.x || newY !== currentPiece.position.y) {
        dispatch({
          type: "MOVE_PIECE",
          position: { x: newX, y: newY },
        });
      }
    }
  };

  const handlePieceMove = (
    e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent,
    boardRef: React.RefObject<HTMLDivElement>
  ) => {
    if (state.showOptionsMenu || !state.currentPiece || state.gameOver || !state.hasStarted) return;

    if ("key" in e) {
      return;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for arrow keys and spacebar to stop page scrolling
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (state.showOptionsMenu || !state.hasStarted || state.gameOver) return;

      const key = e.key.toLowerCase();
      const { rotate, drop, hold, moveLeft, moveRight, moveUp, moveDown, rotateCounter } = state.keyConfig;

      // Skip empty key bindings
      if (key === rotate?.toLowerCase() && rotate) {
        handlePieceRotate("clockwise");
      } else if (key === rotateCounter?.toLowerCase() && rotateCounter) {
        handlePieceRotate("counterclockwise");
      } else if (key === drop?.toLowerCase() && drop) {
        dispatch({ type: "PLACE_PIECE" });
      } else if (key === hold?.toLowerCase() && hold) {
        dispatch({ type: "HOLD_PIECE" });
      } else if (key === moveLeft?.toLowerCase() && moveLeft) {
        handleDirectionalMove("left");
      } else if (key === moveRight?.toLowerCase() && moveRight) {
        handleDirectionalMove("right");
      } else if (key === moveUp?.toLowerCase() && moveUp) {
        handleDirectionalMove("up");
      } else if (key === moveDown?.toLowerCase() && moveDown) {
        handleDirectionalMove("down");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    state.hasStarted,
    state.gameOver,
    state.keyConfig,
    state.showOptionsMenu,
    handlePieceRotate,
    handleDirectionalMove,
    dispatch,
  ]);

  const handleNewGame = (e) => {
    e.target.blur();
    dispatch({ type: "RESET_GAME" });
    dispatch({ type: "START_GAME" });
  };

  const handleUpdateKeyConfig = (config: Partial<KeyConfig>) => {
    dispatch({ type: "UPDATE_KEY_CONFIG", config });
  };

  const handleChangeGridSize = (size: 4 | 5) => {
    dispatch({ type: "CHANGE_GRID_SIZE", size });
  };

  const handleToggleTimed = (isTimed: boolean) => {
    dispatch({ type: "TOGGLE_TIMED_MODE", isTimed });
  };

  const handleGameOver = useCallback(() => {
    if (state.score > 0) {
      const updatedHighScores = saveHighScore(state.score, state.gridSize, state.isTimed, state.linesCleared);
      dispatch({ type: "UPDATE_HIGH_SCORES", highScores: updatedHighScores });
    }
    dispatch({ type: "RESET_GAME" });
  }, [state.score, state.gridSize, state.isTimed, state.linesCleared]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      {isMobile ? (
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Mobile Version Coming Soon!</h2>
          <p className="text-gray-600 mb-6">
            We're working on making GridPop perfect for mobile devices. For now, please enjoy the game on desktop.
          </p>
          <div className="text-sm text-gray-500">
            <p>Check back soon for:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Touch controls</li>
              <li>Mobile-optimized layout</li>
              <li>Better performance</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <Button
              variant="outline"
              onClick={() => setShowHighScores(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50"
            >
              <Trophy size={16} className="text-yellow-400" />
              <span className="font-bold">{state.bestScore}</span>
              <span className="text-sm text-gray-500">
                ({state.gridSize}x{state.gridSize} {state.isTimed ? "Timed" : "Untimed"})
              </span>
            </Button>
          </div>

          <div className="flex flex-row justify-center items-center w-full relative" style={{ minHeight: "500px" }}>
            {/* Hold box (top left) */}
            <div className="flex flex-col items-center mr-8" style={{ width: "100px" }}>
              <span className="text-gray-500 text-base font-bold mb-2">Hold</span>
              <div className="w-[100px] h-[100px] bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center mb-2">
                <div className="w-full h-full p-2">
                  <PieceDisplay piece={state.heldPiece} label="" size="large" />
                </div>
              </div>
              {/* Score/Lines panel at bottom left, aligned with board */}
              <div className="flex-col items-center h-[400px] w-full">
                <div className="w-full bg-white bg-opacity-90 rounded-xl shadow p-2 mt-auto flex flex-col text-xs font-bold text-gray-700">
                  <div className="mb-2">
                    Score
                    <br />
                    <span className="text-lg text-black">{state.score}</span>
                  </div>
                  <div className="mb-2">
                    Level
                    <br />
                    <span className="text-lg text-black">{state.level}</span>
                  </div>
                  <div className="mb-2">
                    Lines
                    <br />
                    <span className="text-lg text-black">{state.linesCleared}</span>
                  </div>
                  {state.isTimed && (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Timer size={16} className="mr-1" />
                          <span>Time</span>
                        </div>
                        <span>{Math.ceil(state.timeRemaining)}s</span>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div
                          style={{ width: `${(state.timeRemaining / getTimerForLevel(state.level)) * 100}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            state.timeRemaining < 3 ? "bg-red-500" : "bg-blue-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => dispatch({ type: "SET_OPTIONS_MENU", isOpen: true })}
                    className="flex-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                  >
                    Options
                  </Button>
                  <Button onClick={handleNewGame} className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                    New Game
                  </Button>
                </div>
              </div>
            </div>
            {/* Board center */}
            <div className="relative">
              <GameBoard
                grid={state.grid}
                currentPiece={state.hasStarted ? state.currentPiece : null}
                scoreAnimations={state.scoreAnimations}
                onPieceMove={handlePieceMove}
                onPiecePlace={() => state.hasStarted && dispatch({ type: "PLACE_PIECE" })}
                onPieceRotate={handlePieceRotate}
                onPieceHold={() => state.hasStarted && dispatch({ type: "HOLD_PIECE" })}
                gameOver={state.gameOver && state.showBoard}
                hasStarted={state.hasStarted}
                showOptionsMenu={state.showOptionsMenu}
              />
            </div>
            {/* Next queue (top right) */}
            <div className="flex flex-col self-start ml-8" style={{ width: "100px" }}>
              <span className="text-gray-500 text-base font-bold mb-2">Next</span>
              <div className="w-[100px] h-[400px] bg-white border-2 border-gray-200 rounded-xl flex flex-col items-center justify-between py-2">
                {state.nextQueue.length === 0 &&
                  [1, 2, 3, 4].map((piece, i) => {
                    return (
                      <div key={i} className="mb-2 last:mb-0 flex justify-center w-full px-2">
                        <PieceDisplay piece={null} label="" size="large" />
                      </div>
                    );
                  })}
                {state.nextQueue.map((piece, i) => (
                  <div key={i} className="mb-2 last:mb-0 flex justify-center w-full px-2">
                    <PieceDisplay piece={piece} label="" size="large" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {state.gameOver && (
            <GameOverModal
              score={state.score}
              level={state.level}
              highScores={state.highScores}
              onRestart={handleNewGame}
              onViewBoard={() => dispatch({ type: "TOGGLE_SHOW_BOARD" })}
              showBoard={state.showBoard}
              gridSize={state.gridSize}
              isTimed={state.isTimed}
              onClose={() => {}}
              linesCleared={state.linesCleared}
            />
          )}

          {state.showTutorial && <Tutorial onClose={() => dispatch({ type: "CLOSE_TUTORIAL" })} />}

          <OptionsMenu
            isOpen={state.showOptionsMenu}
            onClose={() => dispatch({ type: "SET_OPTIONS_MENU", isOpen: false })}
            onUpdateKeyConfig={handleUpdateKeyConfig}
            keyConfig={state.keyConfig}
            onChangeGridSize={handleChangeGridSize}
            currentGridSize={state.gridSize}
            isTimed={state.isTimed}
            onToggleTimed={handleToggleTimed}
          />

          <HighScoresModal
            isOpen={showHighScores}
            onClose={() => setShowHighScores(false)}
            highScores={loadHighScores()}
            gridSize={state.gridSize}
            isTimed={state.isTimed}
          />
        </>
      )}
    </div>
  );
};

export default GridPopGame;
