// Game Types
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type GridType = CellValue[][];

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J' | 'I3' | 'LJ2';

export interface TetrominoShape {
  type: TetrominoType;
  color: string;
  rotations: boolean[][][];
}

export interface Position {
  x: number;
  y: number;
}

export interface Tetromino {
  shape: TetrominoShape;
  position: Position;
  rotation: number;
}

export type GameMode = 'standard' | 'challenge';

export interface KeyConfig {
  rotate: string;
  drop: string;
  hold: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  moveDown: string;
  rotateCounter: string;
}

export interface ScoreAnimation {
  value: number;
  position: Position;
  id: number;
  clearValue: CellValue;
}

export interface HighScore {
  score: number;
  date: string;
  gridSize: 4 | 5;
  isTimed: boolean;
}

export interface GameSettings {
  keyConfig: KeyConfig;
  gridSize: 4 | 5;
}

export interface GameState {
  grid: GridType;
  currentPiece: Tetromino | null;
  nextPiece: Tetromino | null;
  heldPiece: Tetromino | null;
  canHold: boolean;
  score: number;
  level: number;
  gameOver: boolean;
  turnsPlayed: number;
  timeRemaining: number;
  showTutorial: boolean;
  highScores: HighScore[];
  bestScore: number;
  scoreAnimations: ScoreAnimation[];
  gameMode: GameMode;
  keyConfig: KeyConfig;
  showBoard: boolean;
  gridSize: 4 | 5;
  isTimed: boolean;
  hasStarted: boolean;
  showOptionsMenu: boolean;
}

export type GameAction =
  | { type: "START_GAME"; highScores?: HighScore[] }
  | { type: "START_GAME_WITH_MODE"; mode: GameMode }
  | { type: "PLACE_PIECE" }
  | { type: "ROTATE_PIECE"; direction: "clockwise" | "counterclockwise" }
  | { type: "MOVE_PIECE"; position: Position }
  | { type: "HOLD_PIECE" }
  | { type: "TICK_TIMER" }
  | { type: "AUTO_PLACE" }
  | { type: "CLOSE_TUTORIAL" }
  | { type: "RESET_GAME" }
  | { type: "TOGGLE_SHOW_BOARD" }
  | { type: "UPDATE_KEY_CONFIG"; config: Partial<KeyConfig> }
  | { type: "REMOVE_SCORE_ANIMATION"; id: number }
  | { type: "CHANGE_GRID_SIZE"; size: 4 | 5 }
  | { type: "TOGGLE_TIMED_MODE"; isTimed: boolean }
  | { type: "UPDATE_HIGH_SCORES"; highScores: HighScore[] }
  | { type: "SET_OPTIONS_MENU"; isOpen: boolean };
