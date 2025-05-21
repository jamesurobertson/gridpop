import React, { useEffect, useRef, useState } from "react";
import { CellValue, GridType, Tetromino, ScoreAnimation, Position, TetrominoShape } from "@/types/game";
import { getCellVisual } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";
import { DEFAULT_GRID_SIZE, isValidPosition } from "@/utils/gameLogic";
import { useIsMobile } from "@/hooks/use-mobile";

const CELL_SIZE = 50;

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

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  currentPiece,
  scoreAnimations,
  onPieceMove,
  onPiecePlace,
  onPieceRotate,
  onPieceHold,
  gameOver,
  hasStarted,
  showOptionsMenu,
}: GameBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);

  // Handle right-click for rotating on desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPieceRotate && !gameOver && !showOptionsMenu) {
      onPieceRotate("clockwise");
    }
  };

  // Handle touch start event
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to stop page pull-down
    e.preventDefault();

    if (gameOver || showOptionsMenu) return;

    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setTouchStartTime(Date.now());
  };

  // Handle touch move for dragging the piece
  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to stop page pull-down
    e.preventDefault();

    if (gameOver || !onPieceMove || showOptionsMenu) return;
    onPieceMove(e, boardRef);
  };

  // Handle touch end for gestures
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent default to stop page pull-down
    e.preventDefault();

    if (gameOver || showOptionsMenu) return;

    const touchEndTime = Date.now();
    const touchEndX = e.changedTouches[0].clientX;

    // Check for swipe gesture (for rotation)
    if (touchStartX !== null && touchStartTime !== null) {
      const touchDuration = touchEndTime - touchStartTime;
      const touchDistance = touchEndX - touchStartX;

      // If it's a quick swipe (less than 300ms) and has significant horizontal movement
      if (touchDuration < 300 && Math.abs(touchDistance) > 30) {
        if (onPieceRotate) {
          // Swipe left = counterclockwise, Swipe right = clockwise
          onPieceRotate(touchDistance < 0 ? "counterclockwise" : "clockwise");

          // Reset touch tracking
          setTouchStartX(null);
          setTouchStartY(null);
          setTouchStartTime(null);
          return;
        }
      }
    }

    // Check for tap vs double-tap
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;

    if (timeSinceLastTap < 300) {
      // This is a double-tap, use for hold
      if (onPieceHold) {
        onPieceHold();
      }
      setLastTapTime(0); // Reset the tap timer
    } else {
      // This is a single tap (for now)
      setLastTapTime(currentTime);

      // Use a small timeout to differentiate between single tap and potential double tap
      setTimeout(() => {
        const timePassed = Date.now() - currentTime;
        if (timePassed > 250 && timePassed < 350 && lastTapTime === currentTime) {
          // This was a single tap, so place the piece
          if (onPiecePlace) {
            onPiecePlace();
          }
        }
      }, 300);
    }

    // Reset touch tracking
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchStartTime(null);
  };

  const getGhostPosition = (): Position | null => {
    if (!currentPiece) return null;

    let ghostY = currentPiece.position.y;
    while (isValidPosition(grid, { ...currentPiece, position: { x: currentPiece.position.x, y: ghostY + 1 } })) {
      ghostY++;
    }

    return { x: currentPiece.position.x, y: ghostY };
  };

  const renderGhostPiece = () => {
    if (!currentPiece || gameOver || !hasStarted) return null;

    const ghostPosition = getGhostPosition();
    if (!ghostPosition) return null;

    return (
      <div
        className="absolute pointer-events-none opacity-50"
        style={{
          left: `${ghostPosition.x * CELL_SIZE}px`,
          top: `${ghostPosition.y * CELL_SIZE}px`,
        }}
      >
        {currentPiece.shape.rotations[currentPiece.rotation].map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <div
                key={`ghost-${y}-${x}`}
                className="absolute border-2 border-white"
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  left: `${x * CELL_SIZE}px`,
                  top: `${y * CELL_SIZE}px`,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
            ) : null
          )
        )}
      </div>
    );
  };

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
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
            const { backgroundColor, text, textColor, effects } = getCellVisual(cell);
            const effectClasses = [
              effects.includes("pulse") && "animate-pulse",
              effects.includes("glow") && "ring-1 ring-opacity-50 shadow-sm",
              effects.includes("shake") && "animate-[game-over_0.3s_ease-in-out]",
              effects.includes("flash") && "animate-super-clear",
            ]
              .filter(Boolean)
              .join(" ");

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
                className={cn(
                  "aspect-square rounded-lg transition-all duration-150 relative flex items-center justify-center",
                  effectClasses
                )}
                style={{
                  backgroundColor: backgroundColor,
                  boxShadow: cell > 0 ? "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(255,255,255,0.1)" : undefined,
                  transition: "background-color 0.4s ease",
                }}
              >
                {cellContent}

                {/* Ghost piece outline with -4px inset from edge (changed from 2px) */}
                {isPieceCell && (
                  <div
                    className="absolute rounded-lg pointer-events-none"
                    style={{
                      top: "-4px",
                      right: "-4px",
                      bottom: "-4px",
                      left: "-4px",
                      border: "2px solid",
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
