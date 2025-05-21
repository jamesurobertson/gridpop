import { KeyConfig, GameMode, Position } from './game';

export type GameAction =
  | { type: "START_GAME" }
  | { type: "START_GAME_WITH_MODE"; mode: GameMode }
  | { type: "PLACE_PIECE" }
  | { type: "ROTATE_PIECE"; direction: "clockwise" | "counterclockwise" }
  | { type: "MOVE_PIECE"; direction: "left" | "right" | "up" | "down" }
  | { type: "HOLD_PIECE" }
  | { type: "TICK_TIMER" }
  | { type: "AUTO_PLACE" }
  | { type: "CLOSE_TUTORIAL" }
  | { type: "RESET_GAME" }
  | { type: "TOGGLE_SHOW_BOARD" }
  | { type: "UPDATE_KEY_CONFIG"; config: Partial<KeyConfig> }
  | { type: "CHANGE_GRID_SIZE"; size: 4 | 5 }
  | { type: "TOGGLE_TIMED"; isTimed: boolean }
  | { type: "SET_OPTIONS_MENU"; show: boolean }
  | { type: "UPDATE_SCORE"; score: number }
  | { type: "UPDATE_LEVEL"; level: number }
  | { type: "SET_GAME_OVER" }
  | { type: "UPDATE_HIGH_SCORES" }
  | { type: "UPDATE_BEST_SCORE" }
  | { type: "CLEAR_SCORE_ANIMATIONS" }
  | { type: "ADD_SCORE_ANIMATION"; animation: { value: number; position: Position; id: number; clearValue: number } }; 
