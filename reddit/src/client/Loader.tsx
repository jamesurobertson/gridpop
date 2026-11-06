import { useEffect, useState } from "react";
import GameBoard from "@/components/game/GameBoard";
import type { GridType, Tetromino, TetrominoType } from "@/types/game";
import { checkLinesToClear, clearRowsAndCols, createEmptyGrid, createTetromino, getCurrentShape, isValidPosition, placeTetromino, tryWallKick } from "@/utils/gameLogic";
import { TETROMINO_SHAPES } from "@/utils/tetrominoShapes";

/**
 * Shows nothing for the first `delayMs`, so fast loads never see a loader; once shown, it stays
 * at least `minMs`, so it never just flickers. `ready` is when the content may replace it.
 */
export function usePatientLoading(loading: boolean, delayMs = 300, minMs = 600) {
  const [shownAt, setShownAt] = useState<number | null>(null);
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => setShownAt(Date.now()), delayMs);
      return () => clearTimeout(timeout);
    }
    if (shownAt === null) return;
    const timeout = setTimeout(() => setShownAt(null), Math.max(0, shownAt + minMs - Date.now()));
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  return { showLoader: shownAt !== null, ready: !loading && shownAt === null };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Four I3s, ending on an empty board: three placements pop a line, so the loop teaches the rule.
const DEMO: { type: TetrominoType; cells: [number, number][] }[] = [
  { type: "I3", cells: [[0, 3], [1, 3], [2, 3]] },
  { type: "I3", cells: [[3, 1], [3, 2], [3, 3]] },
  { type: "I3", cells: [[0, 1], [1, 1], [2, 1]] },
  { type: "I3", cells: [[0, 2], [1, 2], [2, 2]] },
];

const covers = (piece: Tetromino) =>
  getCurrentShape(piece)
    .flatMap((row, dy) => row.flatMap((on, dx) => (on ? [`${piece.position.x + dx},${piece.position.y + dy}`] : [])))
    .sort()
    .join(" ");

/** The moves from the spawn spot to the piece covering `cells`: turn first, then across, then down. */
function demoPath(grid: GridType, type: TetrominoType, cells: [number, number][]): Tetromino[] {
  const want = cells.map(([x, y]) => `${x},${y}`).sort().join(" ");
  const shape = TETROMINO_SHAPES[type];
  for (let rotation = 0; rotation < shape.rotations.length; rotation++) {
    for (let y = -3; y < 4; y++)
      for (let x = -3; x < 4; x++) {
        const goal: Tetromino = { shape, rotation, position: { x, y } };
        if (covers(goal) !== want) continue;
        let piece = createTetromino(shape, 4);
        const path = [piece];
        for (let turn = 0; turn < rotation; turn++) {
          const next = (piece.rotation + 1) % shape.rotations.length;
          const position = tryWallKick(grid, { ...piece, rotation: next }, next) ?? piece.position;
          piece = { ...piece, rotation: next, position: { ...position } };
          path.push(piece);
        }
        for (const [axis, to] of [["x", x], ["y", y]] as const)
          while (piece.position[axis] !== to) {
            const position = { ...piece.position, [axis]: piece.position[axis] + Math.sign(to - piece.position[axis]) };
            if (!isValidPosition(grid, { ...piece, position })) break;
            piece = { ...piece, position };
            path.push(piece);
          }
        return path;
      }
  }
  return [];
}

/** The game board playing itself, with the real pieces and rules, while the puzzle loads. */
export const DemoBoard = ({ active, className }: { active: boolean; className?: string }) => {
  const [grid, setGrid] = useState<GridType>(() => createEmptyGrid(4));
  const [piece, setPiece] = useState<Tetromino | null>(null);
  const [pieceKey, setPieceKey] = useState(0);
  const [pendingClear, setPendingClear] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    void (async () => {
      let board = createEmptyGrid(4);
      while (alive) {
        for (const step of DEMO) {
          const path = demoPath(board, step.type, step.cells);
          setPieceKey((key) => key + 1);
          for (const frame of path) {
            if (!alive) return;
            setPiece(frame);
            await sleep(frame === path[0] ? 320 : 150);
          }
          await sleep(160);
          board = placeTetromino(board, path[path.length - 1]);
          setPiece(null);
          setGrid(board);
          setPendingClear(true);
          await sleep(220);
          const { rows, cols, clearValue } = checkLinesToClear(board);
          if (clearValue > 0) board = clearRowsAndCols(board, rows, cols);
          setGrid(board);
          setPendingClear(false);
          await sleep(320);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const noop = () => undefined;
  return (
    <GameBoard
      className={className}
      grid={active ? grid : createEmptyGrid(4)}
      currentPiece={active ? piece : null}
      pieceKey={`demo-${pieceKey}`}
      pendingClear={active && pendingClear}
      bumpKey={0}
      scoreAnimations={[]}
      onPieceMove={noop}
      onPiecePlace={noop}
      onPieceRotate={noop}
      gameOver={false}
      showPoints={false}
    />
  );
};
