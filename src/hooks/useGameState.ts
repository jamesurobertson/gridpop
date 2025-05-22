import { useReducer, useCallback } from 'react';
import { GameState, GameAction, KeyConfig, GameMode, HighScore } from '@/types/game';
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
} from '@/utils/gameLogic';
import { loadHighScores, saveHighScore } from '@/utils/highScores';

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
        nextQueue: [nextPiece, getNextTetromino(state.gridSize), getNextTetromino(state.gridSize), getNextTetromino(state.gridSize)],
        linesCleared: 0,
      };
    }

    case "PLACE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;


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


        const baseScore = clearValue * clearValue * 100;

        const getLineBonus = (lines: number, value: number) => {
          const baseBonus = value * value * 100;
          switch (lines) {
            case 2: return baseBonus * 2;
            case 3: return baseBonus * 4;
            case 4: return baseBonus * 8;
            default: return 0;
          }
        };

        const totalScore = Math.floor(baseScore * linesCleared + getLineBonus(linesCleared, clearValue));

        scoreAnimations.push({
          value: totalScore,
          position: { x: state.gridSize / 2, y: state.gridSize / 2 },
          id: animationCounter++,
          clearValue: clearValue
        });

        clearedGrid = clearRowsAndCols(placedGrid, rows, cols);

        hasFullGridClear = checkGridCleared(clearedGrid);
        if (hasFullGridClear) {
          scoreAnimations.push({
            value: 5000,
            position: { x: state.gridSize / 2, y: state.gridSize / 2 },
            id: animationCounter++,
            clearValue: 7
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
        updatedHighScores = updateHighScores(state.highScores, newHighScore);
        saveHighScore(newHighScore);
        updatedBestScore = getBestScore(updatedHighScores, state.gridSize, state.isTimed);
      }

      return {
        ...state,
        grid: clearedGrid,
        currentPiece: state.nextPiece,
        nextPiece: getNextTetromino(state.gridSize),
        score: newScore,
        level,
        turnsPlayed,
        gameOver: isGameOver,
        scoreAnimations,
        highScores: updatedHighScores,
        bestScore: updatedBestScore,
        nextQueue: [...state.nextQueue.slice(1), getNextTetromino(state.gridSize)],
        linesCleared: state.linesCleared + linesCleared,
      };
    }

    case "MOVE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;

      const { direction } = action;
      const newPosition = { ...state.currentPiece.position };

      switch (direction) {
        case "left":
          newPosition.x -= 1;
          break;
        case "right":
          newPosition.x += 1;
          break;
        case "down":
          newPosition.y += 1;
          break;
        case "up":
          newPosition.y -= 1;
          break;
      }

      if (isValidPosition(state.grid, { ...state.currentPiece, position: newPosition })) {
        return {
          ...state,
          currentPiece: { ...state.currentPiece, position: newPosition },
        };
      }

      return state;
    }

    case "ROTATE_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || state.showOptionsMenu) return state;

      const { direction } = action;
      const rotatedPiece = { ...state.currentPiece };
      const currentRotation = rotatedPiece.rotation;
      const newRotation = direction === "clockwise"
        ? (currentRotation + 1) % 4
        : (currentRotation + 3) % 4;

      rotatedPiece.rotation = newRotation;

      if (isValidPosition(state.grid, rotatedPiece)) {
        return {
          ...state,
          currentPiece: rotatedPiece,
        };
      }

      // Try wall kick
      const kickedPosition = tryWallKick(state.grid, rotatedPiece);
      if (kickedPosition) {
        return {
          ...state,
          currentPiece: { ...rotatedPiece, position: kickedPosition },
        };
      }

      return state;
    }

    case "HOLD_PIECE": {
      if (state.gameOver || !state.currentPiece || !state.hasStarted || !state.canHold || state.showOptionsMenu) return state;

      const newHeldPiece = state.currentPiece;
      const newCurrentPiece = state.heldPiece || state.nextPiece;
      const newNextPiece = state.heldPiece ? state.nextPiece : getNextTetromino(state.gridSize);

      return {
        ...state,
        heldPiece: newHeldPiece,
        currentPiece: newCurrentPiece,
        nextPiece: newNextPiece,
        canHold: false,
        nextQueue: state.heldPiece
          ? state.nextQueue
          : [...state.nextQueue.slice(1), getNextTetromino(state.gridSize)],
      };
    }

    case "UPDATE_TIMER": {
      if (!state.hasStarted || state.gameOver || !state.isTimed) return state;

      const newTimeRemaining = state.timeRemaining - 1;
      if (newTimeRemaining <= 0) {
        return {
          ...state,
          gameOver: true,
          timeRemaining: 0,
        };
      }

      return {
        ...state,
        timeRemaining: newTimeRemaining,
      };
    }

    case "TOGGLE_TUTORIAL": {
      return {
        ...state,
        showTutorial: !state.showTutorial,
      };
    }

    case "UPDATE_KEY_CONFIG": {
      const newConfig = { ...state.keyConfig, ...action.config };
      localStorage.setItem("keyConfig", JSON.stringify(newConfig));
      return {
        ...state,
        keyConfig: newConfig,
      };
    }

    case "CHANGE_GRID_SIZE": {
      const newSize = action.size;
      localStorage.setItem("gridSize", newSize.toString());
      return {
        ...state,
        gridSize: newSize,
        grid: createEmptyGrid(newSize),
      };
    }

    case "TOGGLE_TIMED": {
      localStorage.setItem("isTimed", action.isTimed.toString());
      return {
        ...state,
        isTimed: action.isTimed,
        timeRemaining: action.isTimed ? getTimerForLevel(state.level) : Infinity,
      };
    }

    case "TOGGLE_OPTIONS_MENU": {
      return {
        ...state,
        showOptionsMenu: !state.showOptionsMenu,
      };
    }

    case "CLEAR_SCORE_ANIMATION": {
      return {
        ...state,
        scoreAnimations: state.scoreAnimations.filter(anim => anim.id !== action.id),
      };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startGame = useCallback(() => {
    dispatch({ type: "START_GAME" });
  }, []);

  const placePiece = useCallback(() => {
    dispatch({ type: "PLACE_PIECE" });
  }, []);

  const movePiece = useCallback((direction: "left" | "right" | "up" | "down") => {
    dispatch({ type: "MOVE_PIECE", direction });
  }, []);

  const rotatePiece = useCallback((direction: "clockwise" | "counterclockwise") => {
    dispatch({ type: "ROTATE_PIECE", direction });
  }, []);

  const holdPiece = useCallback(() => {
    dispatch({ type: "HOLD_PIECE" });
  }, []);

  const updateTimer = useCallback(() => {
    dispatch({ type: "UPDATE_TIMER" });
  }, []);

  const toggleTutorial = useCallback(() => {
    dispatch({ type: "TOGGLE_TUTORIAL" });
  }, []);

  const updateKeyConfig = useCallback((config: Partial<KeyConfig>) => {
    dispatch({ type: "UPDATE_KEY_CONFIG", config });
  }, []);

  const changeGridSize = useCallback((size: 4 | 5) => {
    dispatch({ type: "CHANGE_GRID_SIZE", size });
  }, []);

  const toggleTimed = useCallback((isTimed: boolean) => {
    dispatch({ type: "TOGGLE_TIMED", isTimed });
  }, []);

  const toggleOptionsMenu = useCallback(() => {
    dispatch({ type: "TOGGLE_OPTIONS_MENU" });
  }, []);

  const clearScoreAnimation = useCallback((id: number) => {
    dispatch({ type: "CLEAR_SCORE_ANIMATION", id });
  }, []);

  return {
    state,
    startGame,
    placePiece,
    movePiece,
    rotatePiece,
    holdPiece,
    updateTimer,
    toggleTutorial,
    updateKeyConfig,
    changeGridSize,
    toggleTimed,
    toggleOptionsMenu,
    clearScoreAnimation,
  };
} 
