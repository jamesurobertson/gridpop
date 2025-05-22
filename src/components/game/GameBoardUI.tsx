import React from "react";
import { Cell } from "./Cell";
import PieceDisplay from "./PieceDisplay";
import ScorePanel from "./ScorePanel";
import GameControls from "./GameControls";
import Timer from "./Timer";
import { getTimerForLevel } from "@/utils/gameLogic";
import { useGameState } from "@/hooks/useGameState";

interface GameBoardUIProps {
  onPieceMove?: (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => void;
  onPieceRotate: (direction: "clockwise" | "counterclockwise") => void;
  onPieceDrop: () => void;
  onPieceHold: () => void;
  onNewGame: () => void;
  onOpenOptions: () => void;
  boardRef: React.RefObject<HTMLDivElement>;
}

export const GameBoardUI: React.FC<GameBoardUIProps> = ({ onPieceMove, onNewGame, onOpenOptions, boardRef }) => {
  const { state } = useGameState();
  const {
    grid,
    currentPiece,
    nextPiece,
    heldPiece,
    score,
    level,
    timeRemaining,
    gridSize,
    scoreAnimations,
    linesCleared,
    isTimed,
  } = state;

  const renderCell = (x: number, y: number) => {
    let value = grid[y][x];
    let isCurrentPiece = false;

    if (currentPiece) {
      const { shape, position, rotation } = currentPiece;
      const rotatedShape = shape[rotation];
      const pieceX = position.x;
      const pieceY = position.y;

      if (x >= pieceX && x < pieceX + rotatedShape[0].length && y >= pieceY && y < pieceY + rotatedShape.length) {
        const shapeValue = rotatedShape[y - pieceY][x - pieceX];
        if (shapeValue > 0) {
          value = shapeValue;
          isCurrentPiece = true;
        }
      }
    }

    return <Cell key={`${x}-${y}`} value={value} isCurrentPiece={isCurrentPiece} />;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (onPieceMove) {
      onPieceMove(e);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-8">
        <div className="flex flex-col gap-4">
          <PieceDisplay piece={heldPiece} label="Hold" size="w-24" />
          <ScorePanel
            score={score}
            level={level}
            linesCleared={linesCleared}
            timeRemaining={timeRemaining}
            maxTime={state.isTimed ? getTimerForLevel(level) : 0}
            onTimeUp={() => {}}
            isTimed={isTimed}
          />
          {state.isTimed && (
            <Timer
              timeRemaining={timeRemaining}
              maxTime={getTimerForLevel(level)}
              onTimeUp={() => {}}
              isPaused={!state.hasStarted}
            />
          )}
        </div>

        <div
          ref={boardRef}
          className="relative grid gap-1 bg-gray-800 p-2 rounded-lg"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
          onTouchMove={handleTouchMove}
        >
          {Array.from({ length: gridSize }, (_, y) => Array.from({ length: gridSize }, (_, x) => renderCell(x, y)))}
          {scoreAnimations.map((animation) => (
            <div
              key={animation.id}
              className="absolute text-yellow-400 font-bold animate-float"
              style={{
                left: `${(animation.position.x / gridSize) * 100}%`,
                top: `${(animation.position.y / gridSize) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              +{animation.value}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <PieceDisplay piece={nextPiece} label="Next" size="w-24" />
          <GameControls onNewGame={onNewGame} onOpenOptions={onOpenOptions} />
        </div>
      </div>
    </div>
  );
};
