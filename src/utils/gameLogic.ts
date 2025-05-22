import { CellValue, GridType, Position, Tetromino, TetrominoShape, KeyConfig, HighScore } from "@/types/game";
import { getRandomTetromino } from "./tetrominoShapes";

// Constants
export const DEFAULT_GRID_SIZE = 4;
export const MAX_CELL_VALUE = 7;
export const INITIAL_TIMER = 10;
export const MIN_TIMER = 0.5;
export const TIMER_DECREASE_PER_LEVEL = 0.5;
export const TURNS_PER_LEVEL = 10;

// Create an empty grid
export const createEmptyGrid = (size: number = DEFAULT_GRID_SIZE): GridType => {
  return Array(size).fill(0).map(() =>
    Array(size).fill(0) as CellValue[]
  );
};

// Create a new tetromino
export const createTetromino = (shape: TetrominoShape, gridSize: number = DEFAULT_GRID_SIZE): Tetromino => {
  // Calculate starting position based on shape size
  const startX = Math.floor((gridSize - shape.rotations[0][0].length) / 2);

  return {
    shape,
    position: { x: startX, y: 0 },
    rotation: 0
  };
};

// Get current tetromino shape matrix
export const getCurrentShape = (tetromino: Tetromino): boolean[][] => {
  return tetromino.shape.rotations[tetromino.rotation];
};

// Check if position is valid for tetromino placement
export const isValidPosition = (
  grid: GridType,
  tetromino: Tetromino,
  position = tetromino.position
): boolean => {
  const shape = getCurrentShape(tetromino);
  const gridSize = grid.length;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = position.x + x;
        const newY = position.y + y;

        // Check boundaries
        if (
          newX < 0 ||
          newX >= gridSize ||
          newY < 0 ||
          newY >= gridSize
        ) {
          return false;
        }

        // Check if adding to this cell would exceed MAX_CELL_VALUE
        if (grid[newY][newX] === MAX_CELL_VALUE) {
          return false;
        }
      }
    }
  }

  return true;
};

// Try to move piece with wall kick - enhanced with more options
export const tryWallKick = (
  grid: GridType,
  tetromino: Tetromino,
  newRotation: number
): Position | null => {
  const originalRotation = tetromino.rotation;
  tetromino.rotation = newRotation;

  // Try original position
  if (isValidPosition(grid, tetromino)) {
    return tetromino.position;
  }

  // Enhanced wall kicks with more options including diagonal kicks
  const kicks = [
    // Cardinal directions - close
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },

    // Cardinal directions - further
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -2 },
    { x: 0, y: 2 },

    // Diagonal kicks - close
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },

    // Diagonal kicks - further
    { x: -2, y: -1 },
    { x: 2, y: -1 },
    { x: -1, y: -2 },
    { x: 1, y: -2 },
    { x: -2, y: 1 },
    { x: 2, y: 1 },
    { x: -1, y: 2 },
    { x: 1, y: 2 },
  ];

  // Try each kick position
  for (const kick of kicks) {
    const kickPosition = {
      x: tetromino.position.x + kick.x,
      y: tetromino.position.y + kick.y
    };

    if (isValidPosition(grid, tetromino, kickPosition)) {
      return kickPosition;
    }
  }

  // If no valid position found, revert rotation
  tetromino.rotation = originalRotation;
  return null;
};

// Place tetromino on the grid
export const placeTetromino = (
  grid: GridType,
  tetromino: Tetromino
): GridType => {
  const newGrid = grid.map(row => [...row]);
  const shape = getCurrentShape(tetromino);
  const gridSize = newGrid.length;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const gridY = tetromino.position.y + y;
        const gridX = tetromino.position.x + x;

        if (
          gridY >= 0 &&
          gridY < gridSize &&
          gridX >= 0 &&
          gridX < gridSize
        ) {
          // Increase cell value by 1
          newGrid[gridY][gridX] = Math.min(
            (newGrid[gridY][gridX] + 1),
            MAX_CELL_VALUE
          ) as CellValue;
        }
      }
    }
  }

  return newGrid;
};

// Check if a 4x4 section was cleared
export const checkGridCleared = (grid: GridType): boolean => {
  // Check if all cells in the grid are cleared (value 0)
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== 0) {
        return false;
      }
    }
  }

  return true;
};

// Utility to check for complete identical nonzero rows/columns
export const checkLinesToClear = (grid: GridType): { rows: number[], cols: number[], clearValue: CellValue } => {
  const rows: number[] = [];
  const cols: number[] = [];
  let clearedValue: CellValue = 0;
  const gridSize = grid.length;

  // Check rows
  for (let y = 0; y < gridSize; y++) {
    const row = grid[y];
    const first = row[0];
    if (first > 0 && row.every(cell => cell === first)) {
      rows.push(y);
      clearedValue = first;
    }
  }

  // Check columns
  for (let x = 0; x < gridSize; x++) {
    const first = grid[0][x];
    let allSame = first > 0;
    for (let y = 0; y < gridSize; y++) {
      if (grid[y][x] !== first) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      cols.push(x);
      clearedValue = first;
    }
  }

  return { rows, cols, clearValue: clearedValue };
};

// Clear rows and columns, resetting to zero
export const clearRowsAndCols = (grid: GridType, rows: number[], cols: number[]): GridType => {
  const newGrid = grid.map(row => [...row]);
  for (const y of rows) {
    for (let x = 0; x < newGrid[y].length; x++) {
      newGrid[y][x] = 0;
    }
  }
  for (const x of cols) {
    for (let y = 0; y < newGrid.length; y++) {
      newGrid[y][x] = 0;
    }
  }
  return newGrid;
};

// Calculate score based on clear value and bonus, with grid section bonus
export const calculateLineClearScore = (
  clearValue: CellValue,
  totalLines: number,
  hasFullGridClear: boolean = false,
  level: number = 1
): number => {
  // Quadratic scoring: n² × 100 for each cell value
  const valueScores = { 1: 100, 2: 400, 3: 900, 4: 1600, 5: 2500, 6: 3600, 7: 4900 };

  // Line bonuses are now based on the clear value
  const getLineBonus = (lines: number, value: CellValue) => {
    const baseBonus = value * value * 100; // Use the same quadratic scaling as the base score
    switch (lines) {
      case 2: return baseBonus * 2;  // 2x the base value
      case 3: return baseBonus * 4;  // 4x the base value
      case 4: return baseBonus * 8;  // 8x the base value
      default: return 0;
    }
  };

  // Calculate base score with quadratic values
  let score = valueScores[clearValue] ? valueScores[clearValue] * totalLines : 0;
  const lineBonus = getLineBonus(totalLines, clearValue);
  const fullGridBonus = hasFullGridClear ? 5000 : 0;

  // Log the scoring breakdown
  console.log(`\n=== Score Calculation ===`);
  console.log(`Cleared ${totalLines} lines of value ${clearValue}`);
  console.log(`Base Score: ${valueScores[clearValue]} × ${totalLines} = ${score}`);
  console.log(`Line Bonus: ${clearValue}² × 100 × ${totalLines === 2 ? '2' : totalLines === 3 ? '4' : totalLines === 4 ? '8' : '0'} = ${lineBonus}`);
  if (hasFullGridClear) console.log(`Full Grid Bonus: +5000`);
  console.log(`Total Score: ${score + lineBonus + fullGridBonus}`);
  console.log(`======================\n`);

  // Add line bonus based on clear value
  score += lineBonus;

  // Add huge bonus for clearing the full grid
  if (hasFullGridClear) {
    score += fullGridBonus;
  }

  return score;
};

// Check for rows that can be cleared (all cells >= 4)
export const checkRowsToClear = (grid: GridType): number[] => {
  return grid.map((row, index) =>
    row.every(cell => cell >= 4) ? index : -1
  ).filter(index => index !== -1);
};

// Clear rows and return new grid
export const clearRows = (grid: GridType, rowsToClear: number[]): GridType => {
  const newGrid = grid.map(row => [...row]);

  for (const rowIndex of rowsToClear) {
    // Reset row to 0
    newGrid[rowIndex] = Array(grid.length).fill(0) as CellValue[];
  }

  return newGrid;
};

// Calculate score based on cleared rows
export const calculateScore = (rowsCleared: number): number => {
  switch (rowsCleared) {
    case 1: return 100;
    case 2: return 250;
    case 3: return 500;
    case 4: return 1000;
    default: return 0;
  }
};

// Check if game is over (any cell reaches MAX_CELL_VALUE)
export const checkGameOver = (grid: GridType): boolean => {
  return grid.some(row => row.some(cell => cell === MAX_CELL_VALUE));
};

// Generate random valid position for auto-placement
export const generateRandomValidPosition = (
  grid: GridType,
  tetromino: Tetromino
): Position | null => {
  const shape = getCurrentShape(tetromino);
  const gridSize = grid.length;
  const maxX = gridSize - shape[0].length;
  const maxY = gridSize - shape.length;

  // Try random positions
  for (let attempts = 0; attempts < 50; attempts++) {
    const randomX = Math.floor(Math.random() * (maxX + 1));
    const randomY = Math.floor(Math.random() * (maxY + 1));

    const position = { x: randomX, y: randomY };
    if (isValidPosition(grid, tetromino, position)) {
      return position;
    }
  }

  // If no random position works, try systematically
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const position = { x, y };
      if (isValidPosition(grid, tetromino, position)) {
        return position;
      }
    }
  }

  return null; // No valid position found
};

// Get adjusted timer based on level - Updated to match new requirements
export const getTimerForLevel = (level: number): number => {
  return Math.max(INITIAL_TIMER - (level * TIMER_DECREASE_PER_LEVEL), MIN_TIMER);
};

// Get cell color based on value
export const getCellColor = (value: CellValue): string => {
  return `gridpop-cell${value}`;
};

// Update high scores
export function updateHighScores(highScores: HighScore[], newScore: number, gridSize: 4 | 5, isTimed: boolean, linesCleared: number): HighScore[] {
  // Don't save zero scores
  if (newScore === 0) return highScores;

  const newHighScore: HighScore = {
    score: newScore,
    date: new Date().toISOString(),
    gridSize,
    isTimed,
    linesCleared,
  };

  // Filter scores for the current game mode
  const otherModeScores = highScores.filter(
    s => s.gridSize !== gridSize || s.isTimed !== isTimed
  );

  // Get scores for current game mode
  const currentModeScores = highScores.filter(
    s => s.gridSize === gridSize && s.isTimed === isTimed
  );

  // Add new score and sort
  const updatedModeScores = [...currentModeScores, newHighScore]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Keep only top 5

  // Combine with other mode scores
  return [...otherModeScores, ...updatedModeScores];
}

export function getBestScore(highScores: HighScore[], gridSize: 4 | 5, isTimed: boolean): number {
  const relevantScores = highScores.filter(
    score => score.gridSize === gridSize && score.isTimed === isTimed
  );

  if (relevantScores.length === 0) return 0;
  return Math.max(...relevantScores.map(score => score.score));
}

export function formatHighScores(highScores: HighScore[]): { [key: string]: HighScore[] } {
  const categories = {
    '4x4 Timed': highScores.filter(score => score.gridSize === 4 && score.isTimed),
    '4x4 Untimed': highScores.filter(score => score.gridSize === 4 && !score.isTimed),
    '5x5 Timed': highScores.filter(score => score.gridSize === 5 && score.isTimed),
    '5x5 Untimed': highScores.filter(score => score.gridSize === 5 && !score.isTimed),
  };

  // Sort each category by score
  Object.keys(categories).forEach(key => {
    categories[key].sort((a, b) => b.score - a.score);
  });

  return categories;
}

// Function to get next tetromino for the game
export const getNextTetromino = (gridSize: number = DEFAULT_GRID_SIZE): Tetromino => {
  const shape = getRandomTetromino(gridSize);
  return createTetromino(shape, gridSize);
};

// Save game settings to local storage
export const saveGameSettings = (keyConfig: KeyConfig, gridSize: 4 | 5): void => {
  try {
    localStorage.setItem('gridpop-settings', JSON.stringify({ keyConfig, gridSize }));
  } catch (error) {
    console.error('Error saving game settings:', error);
  }
};

// Load game settings from local storage
export const loadGameSettings = (): { keyConfig: KeyConfig | null, gridSize: 4 | 5 } => {
  try {
    const savedSettings = localStorage.getItem('gridpop-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return {
        keyConfig: settings.keyConfig || null,
        gridSize: settings.gridSize || DEFAULT_GRID_SIZE
      };
    }
  } catch (error) {
    console.error('Error loading game settings:', error);
  }

  return {
    keyConfig: null,
    gridSize: DEFAULT_GRID_SIZE
  };
};
