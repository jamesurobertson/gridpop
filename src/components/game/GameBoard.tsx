import React, { useRef, useState } from "react";
import { GridType, Tetromino, ScoreAnimation, Position } from "@/types/game";
import { getCellVisual } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDrag } from "@use-gesture/react";

interface GameBoardProps {
  grid: GridType;
  currentPiece: Tetromino | null;
  scoreAnimations: ScoreAnimation[];
  onPieceMove: (direction: "left" | "right" | "up" | "down") => void;
  onPiecePlace: () => void;
  onPieceRotate: (direction: "clockwise" | "counterclockwise") => void;
  onPieceHold: () => void;
  gameOver: boolean;
  hasStarted: boolean;
  showOptionsMenu: boolean;
  animatingLines: { rows: number[], cols: number[] };
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
  animatingLines,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const hasSwipedRef = useRef(false)
  const lastGridPosRef = useRef({ x: 0, y: 0 }) // Track last grid position

  const bind = useDrag(
    ({
      movement: [mx, my],
      swipe: [swipeX, swipeY],
      down,
      tap,
      first,
      last,
    }) => {
      if (!currentPiece || !hasStarted || gameOver || showOptionsMenu) return

      // 1️⃣ Handle Tap (Rotate)
      if (tap) {
        onPieceRotate('clockwise')
        return
      }

      // 2️⃣ Handle Swipe
      if (!down && (swipeX || swipeY)) {
        hasSwipedRef.current = true
        if (swipeY > 0) {
          onPiecePlace()
        } else if (swipeY < 0) {
          onPieceHold()
        }
        return
      }

      // 3️⃣ Handle Drag (with grid snapping)
      if (down && !hasSwipedRef.current) {
        const boardRect = boardRef.current?.getBoundingClientRect()
        if (!boardRect) return
        const cellSize = boardRect.width / grid.length

        // Calculate how many grid cells we've moved
        const gridX = Math.floor(mx / cellSize)
        const gridY = Math.floor(my / cellSize)

        // Compare to last grid position to avoid repeat calls
        const lastX = lastGridPosRef.current.x
        const lastY = lastGridPosRef.current.y

        if (gridX !== lastX || gridY !== lastY) {
          // Determine dominant axis
          if (Math.abs(mx) > Math.abs(my)) {
            if (gridX > lastX) onPieceMove('right')
            else if (gridX < lastX) onPieceMove('left')
          } else {
            if (gridY > lastY) onPieceMove('down')
            else if (gridY < lastY) onPieceMove('up')
          }
          // Update last position
          lastGridPosRef.current = { x: gridX, y: gridY }
        }
      }

      // 4️⃣ Reset swipe and grid position when gesture ends
      if (!down) {
        hasSwipedRef.current = false
        lastGridPosRef.current = { x: 0, y: 0 } // Reset grid position
      }
    },
    {
      filterTaps: true,
      threshold: 10, // Lower for quicker detection
      swipe: {
        distance: [40, 40],
        velocity: 0.4,
        duration: 300,
      },
      pointer: { touch: true },
    }
  )

  return (
    <div
      className={
        isMobile
          ? "relative w-[85vw] h-[85vw] max-w-[340px] max-h-[340px] mx-auto select-none focus:outline-none"
          : "relative w-[500px] h-[500px] mx-auto select-none focus:outline-none"
      }
    >
      {/* Score animations */}
      {scoreAnimations.map((anim) => {
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
      {/* {isMobile && !gameOver && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-1 rounded z-10">
          Swipe to move • Tap to place • Double-tap to hold
        </div>
      )} */}

      <div
        tabIndex={0}
        ref={boardRef}
        className="grid gap-3 h-full p-4 bg-white rounded-xl shadow-md outline-none border border-red-500" 
        style={{
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
          touchAction: "none",
        }}
        {...bind()}
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
                  const pieceType = currentPiece.shape.type;
                  const textColorMap: Record<string, string> = {
                    I: "#5BA3D9",
                    O: "#D1B347",
                    T: "#8E7DCC",
                    S: "#6BBF9E",
                    Z: "#C25C5C",
                    L: "#D48F82",
                    J: "#5BA3D9",
                  };
                  pieceColor = textColorMap[pieceType] || currentPiece.shape.color;
                }
              }
            }
            const { backgroundColor, text, textColor } = getCellVisual(cell);

            const isAnimatingRow = animatingLines.rows.includes(y);
            const isAnimatingCol = animatingLines.cols.includes(x);
            const isAnimating = isAnimatingRow || isAnimatingCol;

            const cellContent =
              cell === 0 ? null : (
                <span
                  className={cn(
                    "text-2xl font-bold transition-colors",
                    cell >= 5 ? "drop-shadow-sm" : "",
                    isAnimating ? "animate-line-pop" : ""
                  )}
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
                  isAnimating ? "animate-line-pop" : ""
                )}
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
