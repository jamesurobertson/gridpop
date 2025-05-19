import React, { useEffect, useReducer, useState, useCallback } from "react";
import GameBoard from "./GameBoard";
import ScorePanel from "./ScorePanel";
import PieceDisplay from "./PieceDisplay";
import GameControls from "./GameControls";
import GameOverModal from "./GameOverModal";
import Tutorial from "./Tutorial";
import KeyConfigPanel from "./KeyConfigPanel";
import GameModeSelector from "./GameModeSelector";
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
import {
  CellValue,
  GridType,
  Position,
  Tetromino,
  GameState,
  GameAction,
  KeyConfig,
  GameMode,
  HighScore,
} from "@/types/game";
import { Trophy, Eye, EyeOff } from "lucide-react";
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
      };
    }

    case "START_GAME_WITH_MODE": {
      return gameReducer({ ...state }, { type: "START_GAME" });
    }

    case "PLACE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;

      try {
        import("@/utils/soundEffects").then((sounds) => sounds.playSound("place")).catch(() => {});
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

        try {
          import("@/utils/soundEffects").then((sounds) => {
            if (effectType === "super") sounds.playSound("superClear");
            else sounds.playSound("clear");
          });
        } catch {}

        // Calculate the base score for each line clear
        const baseScore = clearValue * clearValue * 100;
        
        // Calculate line bonus based on clear value
        const getLineBonus = (lines: number, value: CellValue) => {
          const baseBonus = value * value * 100;
          switch (lines) {
            case 2: return baseBonus * 2;  // 2x the base value
            case 3: return baseBonus * 4;  // 4x the base value
            case 4: return baseBonus * 8;  // 8x the base value
            default: return 0;
          }
        };
        
        // Calculate total score for this clear
        const totalScore = Math.floor(baseScore * linesCleared + getLineBonus(linesCleared, clearValue));

        // Show the total score animation
        scoreAnimations.push({
          value: totalScore,
          position: { x: state.gridSize / 2, y: state.gridSize / 2 },
          id: animationCounter++,
          clearValue: clearValue
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
            clearValue: 7 // Use 7 for the special full grid clear animation
          });

          try {
            import("@/utils/soundEffects").then((sounds) => {
              sounds.playSound("superClear");
            });
          } catch {}
        }
      }

      if (clearValue > 0) {
        scoreGain = Math.floor(calculateLineClearScore(clearValue, linesCleared, hasFullGridClear, state.level));
      }

      const newScore = state.score + scoreGain;
      const isGameOver = checkGameOver(clearedGrid);

      if (isGameOver) {
        try {
          import("@/utils/soundEffects").then((sounds) => sounds.playSound("gameOver")).catch(() => {});
        } catch {}
      }

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
        };
        const currentHighScores: HighScore[] = Array.isArray(state.highScores)
          ? state.highScores.map((score) =>
              typeof score === "number"
                ? { score, date: new Date().toISOString(), gridSize: DEFAULT_GRID_SIZE, isTimed: true }
                : (score as HighScore)
            )
          : [];
        updatedHighScores = updateHighScores(currentHighScores, newHighScore.score, state.gridSize, state.isTimed);
        updatedBestScore = getBestScore(updatedHighScores, state.gridSize, state.isTimed);
        localStorage.setItem("gridpop-high-scores", JSON.stringify(updatedHighScores));
      }

      const newTimeRemaining = getTimerForLevel(level);

      return {
        ...state,
        grid: clearedGrid,
        currentPiece: state.nextPiece,
        nextPiece: getNextTetromino(state.gridSize),
        canHold: true,
        score: newScore,
        bestScore: updatedBestScore,
        level,
        turnsPlayed,
        timeRemaining: newTimeRemaining,
        gameOver: isGameOver,
        highScores: updatedHighScores,
        scoreAnimations,
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
          currentPiece: state.nextPiece,
          heldPiece: state.currentPiece,
          nextPiece: getNextTetromino(state.gridSize),
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
        currentPiece: null,
        nextPiece: null,
        heldPiece: null,
        hasStarted: false,
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
        timeRemaining: action.isTimed ? getTimerForLevel(state.level) : Infinity,
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

  const handleNewGame = () => {
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
    dispatch({ type: "RESET_GAME" });
  };

  const handleGameOver = useCallback(() => {
    if (state.score > 0) {
      const updatedHighScores = saveHighScore(state.score, state.gridSize, state.isTimed);
      dispatch({ type: "UPDATE_HIGH_SCORES", highScores: updatedHighScores });
    }
    dispatch({ type: "RESET_GAME" });
  }, [state.score, state.gridSize, state.isTimed]);

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

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-shrink-0 flex justify-center">
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

            <div className="w-full lg:w-64 space-y-4">
              <ScorePanel
                score={state.score}
                level={state.level}
                timeRemaining={state.timeRemaining}
                maxTime={getTimerForLevel(state.level)}
                onTimeUp={() => dispatch({ type: "AUTO_PLACE" })}
                isTimed={state.isTimed}
              />

              <div className="grid grid-cols-2 gap-4">
                <PieceDisplay piece={state.nextPiece} label="Next" />
                <PieceDisplay piece={state.heldPiece} label="Hold" />
              </div>

              <GameControls
                onRotate={(direction) => dispatch({ type: "ROTATE_PIECE", direction })}
                onHold={() => dispatch({ type: "HOLD_PIECE" })}
                onPlace={() => dispatch({ type: "PLACE_PIECE" })}
                onNewGame={handleNewGame}
                onMove={handleDirectionalMove}
                canHold={state.canHold}
                keyConfig={state.keyConfig}
                onOpenOptions={() => dispatch({ type: "SET_OPTIONS_MENU", isOpen: true })}
              />
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
