import { TetrominoShape } from "@/types/game";

// Define all tetromino shapes with their rotations
export const TETROMINO_SHAPES: { [key: string]: TetrominoShape } = {
  I: {
    type: 'I',
    color: '#00f0f0', // Cyan
    rotations: [
      [
        [false, false, false, false],
        [true, true, true, true],
        [false, false, false, false],
        [false, false, false, false]
      ],
      [
        [false, false, true, false],
        [false, false, true, false],
        [false, false, true, false],
        [false, false, true, false]
      ],
      [
        [false, false, false, false],
        [false, false, false, false],
        [true, true, true, true],
        [false, false, false, false]
      ],
      [
        [false, true, false, false],
        [false, true, false, false],
        [false, true, false, false],
        [false, true, false, false]
      ]
    ]
  },
  O: {
    type: 'O',
    color: '#f0f000', // Yellow
    rotations: [
      [
        [true, true],
        [true, true]
      ],
      [
        [true, true],
        [true, true]
      ],
      [
        [true, true],
        [true, true]
      ],
      [
        [true, true],
        [true, true]
      ]
    ]
  },
  T: {
    type: 'T',
    color: '#a000f0', // Purple
    rotations: [
      [
        [false, true, false],
        [true, true, true],
        [false, false, false]
      ],
      [
        [false, true, false],
        [false, true, true],
        [false, true, false]
      ],
      [
        [false, false, false],
        [true, true, true],
        [false, true, false]
      ],
      [
        [false, true, false],
        [true, true, false],
        [false, true, false]
      ]
    ]
  },
  S: {
    type: 'S',
    color: '#00f000', // Green
    rotations: [
      [
        [false, true, true],
        [true, true, false],
        [false, false, false]
      ],
      [
        [false, true, false],
        [false, true, true],
        [false, false, true]
      ],
      [
        [false, false, false],
        [false, true, true],
        [true, true, false]
      ],
      [
        [true, false, false],
        [true, true, false],
        [false, true, false]
      ]
    ]
  },
  Z: {
    type: 'Z',
    color: '#f00000', // Red
    rotations: [
      [
        [true, true, false],
        [false, true, true],
        [false, false, false]
      ],
      [
        [false, false, true],
        [false, true, true],
        [false, true, false]
      ],
      [
        [false, false, false],
        [true, true, false],
        [false, true, true]
      ],
      [
        [false, true, false],
        [true, true, false],
        [true, false, false]
      ]
    ]
  },
  L: {
    type: 'L',
    color: '#f0a000', // Orange
    rotations: [
      [
        [false, false, true],
        [true, true, true],
        [false, false, false]
      ],
      [
        [false, true, false],
        [false, true, false],
        [false, true, true]
      ],
      [
        [false, false, false],
        [true, true, true],
        [true, false, false]
      ],
      [
        [true, true, false],
        [false, true, false],
        [false, true, false]
      ]
    ]
  },
  J: {
    type: 'J',
    color: '#0000f0', // Blue
    rotations: [
      [
        [true, false, false],
        [true, true, true],
        [false, false, false]
      ],
      [
        [false, true, true],
        [false, true, false],
        [false, true, false]
      ],
      [
        [false, false, false],
        [true, true, true],
        [false, false, true]
      ],
      [
        [false, true, false],
        [false, true, false],
        [true, true, false]
      ]
    ]
  },
  I3: {
    type: 'I3',
    color: '#4A4A4A', // Sky Blue
    rotations: [
      [
        [false, false, false],
        [true, true, true],
        [false, false, false]
      ],
      [
        [false, true, false],
        [false, true, false],
        [false, true, false]
      ],
      [
        [false, false, false],
        [true, true, true],
        [false, false, false]
      ],
      [
        [false, true, false],
        [false, true, false],
        [false, true, false]
      ]
    ]
  },
  LJ2: {
    type: 'LJ2',
    color: '#E18FB8', // pastel pink
    rotations: [
      [
        [true, true],
        [true, false]
      ],
      [
        [true, true],
        [false, true]
      ],
      [
        [false, true],
        [true, true]
      ],
      [
        [true, false],
        [true, true]
      ]
    ]
  }
};

// Helper function to get a random tetromino shape
export const getRandomTetromino = (gridSize: number = 5): TetrominoShape => {
  const shapes = Object.values(TETROMINO_SHAPES);
  // Filter out the I piece for 4x4 grid
  const availableShapes = gridSize === 4
    ? shapes.filter(shape => shape.type !== 'I')
    : shapes;
  return availableShapes[Math.floor(Math.random() * availableShapes.length)];
};
