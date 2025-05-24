import React, { useRef } from "react";
import { GridType, Tetromino, ScoreAnimation, Position } from "@/types/game";
import { getCellVisual } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameBoardProps {
  grid: GridType;
  currentPiece: Tetromino | null;
  scoreAnimations: ScoreAnimation[];
  onPieceMove: (
    e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent,
    boardRef: React.RefObject<HTMLDivElement>
  ) => void;
  onPiecePlace: () => void;
  onPieceRotate: (direction: "clockwise" | "counterclockwise") => void;
  onPieceHold: () => void;
  gameOver: boolean;
  hasStarted: boolean;
  showOptionsMenu: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ grid, currentPiece, scoreAnimations, gameOver }: GameBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  return (
    <div className="relative w-[500px] h-[500px] mx-auto select-none focus:outline-none">
      {/* Score animations */}
      {scoreAnimations.map((anim) => {
        // Get the cell visual based on the clear value
        const { textColor } = getCellVisual(anim.clearValue);

        return (
          <div
            key={anim.id}
            className="absolute z-20 font-bold text-4xl animate-score-float pointer-events-none"
            style={{
              left: `${((anim.position.x + 0.5) / grid.length) * 100}%`,
              bottom: "0",
              transform: "translateX(-50%)",
              color: textColor,
              textShadow: "0 0 4px rgba(255,255,255,0.7), 0 0 2px rgba(255,255,255,1)",
            }}
          >
            +{anim.value}
          </div>
        );
      })}

      {/* Mobile gesture instructions tooltip */}
      {isMobile && !gameOver && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-1 rounded z-10">
          Swipe to rotate • Tap to place • Double-tap to hold
        </div>
      )}

      <div
        tabIndex={0}
        ref={boardRef}
        className="grid gap-3 x h-full p-4 bg-white rounded-xl shadow-md outline-none"
        style={{
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            let isPieceCell = false;
            let pieceColor = "";
            if (currentPiece) {
              const shape = currentPiece.shape.rotations[currentPiece.rotation];
              const pieceY = y - currentPiece.position.y;
              const pieceX = x - currentPiece.position.x;
              if (pieceY >= 0 && pieceY < shape.length && pieceX >= 0 && pieceX < shape[pieceY].length) {
                isPieceCell = shape[pieceY][pieceX];
                if (isPieceCell) {
                  // Use the text color instead of the background color for the ghost outline
                  const pieceType = currentPiece.shape.type;
                  const textColorMap: Record<string, string> = {
                    I: "#5BA3D9", // Sky Blue text
                    O: "#D1B347", // Pale Lemon text
                    T: "#8E7DCC", // Lavender text
                    S: "#6BBF9E", // Mint text
                    Z: "#C25C5C", // Red text
                    L: "#D48F82", // Coral text
                    J: "#5BA3D9", // Sky Blue text
                  };
                  pieceColor = textColorMap[pieceType] || currentPiece.shape.color;
                }
              }
            }
            const { backgroundColor, text, textColor } = getCellVisual(cell);

            // Content styling based on the mockup
            const cellContent =
              cell === 0 ? null : (
                <span
                  className={cn("text-2xl font-bold transition-colors", cell >= 5 ? "drop-shadow-sm" : "")}
                  style={{ color: textColor }}
                >
                  {text}
                </span>
              );

            return (
              <div
                key={`${x}-${y}`}
                className={
                  "aspect-square rounded-lg transition-all duration-150 relative flex items-center justify-center"
                }
                style={{
                  backgroundColor: backgroundColor,
                  boxShadow: cell > 0 ? "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(255,255,255,0.1)" : undefined,
                  transition: "background-color 0.4s ease",
                }}
              >
                {cellContent}

                {isPieceCell && (
                  <div
                    className="absolute rounded-lg pointer-events-none"
                    style={{
                      top: "-4px",
                      right: "-4px",
                      bottom: "-4px",
                      left: "-4px",
                      border: "3px solid",
                      borderColor: "neutral-700",
                      backgroundColor: "transparent",
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameBoard;
