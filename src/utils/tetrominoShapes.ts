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
    color: '#5BA3D9', // Sky Blue
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
    color: '#D48F82', // Coral
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
export const getRandomTetromino = (): TetrominoShape => {
  const shapes = Object.values(TETROMINO_SHAPES);
  return shapes[Math.floor(Math.random() * shapes.length)];
};
