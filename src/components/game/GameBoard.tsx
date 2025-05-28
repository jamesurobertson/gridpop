import React, { useRef, useState, useEffect } from "react";
import { GridType, Tetromino, ScoreAnimation, Position } from "@/types/game";
import { getCellVisual } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [actionTaken, setActionTaken] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMovePosition, setLastMovePosition] = useState<{ x: number; y: number } | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [pendingTap, setPendingTap] = useState<number | null>(null);

  // Add useEffect to handle delayed single tap
  useEffect(() => {
    if (!pendingTap) return;

    const timer = setTimeout(() => {
      // If we still have a pending tap after the double tap window, it was a single tap
      if (pendingTap) {
        onPiecePlace();
        setPendingTap(null);
      }
    }, 250); // Same as double tap window

    return () => clearTimeout(timer);
  }, [pendingTap, onPiecePlace]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchStartTime(Date.now());
    setActionTaken(false);
    setIsDragging(false);
    setLastMovePosition(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart || !touchStartTime || !currentPiece) return;

    const touch = e.touches[0];
    const now = Date.now();
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Handle dragging
    if (!isDragging && (absDeltaX > 10 || absDeltaY > 10)) {
      setIsDragging(true);
      // If we start dragging, reset tap tracking
      setLastTapTime(0);
      setPendingTap(null);
    }

    if (isDragging) {
      // Calculate grid cell size
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;
      
      const cellSize = boardRect.width / grid.length;
      const moveThreshold = cellSize * 0.3; // 30% of cell size

      // Only move if we've moved enough distance
      if (lastMovePosition) {
        const moveDeltaX = touch.clientX - lastMovePosition.x;
        const moveDeltaY = touch.clientY - lastMovePosition.y;

        if (Math.abs(moveDeltaX) > moveThreshold || Math.abs(moveDeltaY) > moveThreshold) {
          // Determine primary direction
          if (Math.abs(moveDeltaX) > Math.abs(moveDeltaY)) {
            onPieceMove(moveDeltaX > 0 ? "right" : "left");
          } else {
            onPieceMove(moveDeltaY > 0 ? "down" : "up");
          }
          setLastMovePosition({ x: touch.clientX, y: touch.clientY });
          setLastMoveTime(now);
        }
      } else {
        setLastMovePosition({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart || !touchStartTime) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const duration = Date.now() - touchStartTime;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Handle tap for placing piece
    if (!isDragging && absDeltaX < 10 && absDeltaY < 10) {
      const now = Date.now();
      
      // Check if this is a double tap
      if (lastTapTime) {
        const timeSinceLastTap = now - lastTapTime;
        
        // Double tap detected if taps are close in time
        if (timeSinceLastTap < 250) {
          onPieceRotate("clockwise");
          // Reset tap tracking after double tap
          setLastTapTime(0);
          setPendingTap(null);
          return;
        }
      }
      
      // Set pending tap for potential single tap
      setPendingTap(now);
      // Update tap tracking for potential double tap
      setLastTapTime(now);
    }

    // Reset all states
    setTouchStart(null);
    setTouchStartTime(null);
    setActionTaken(false);
    setIsDragging(false);
    setLastMovePosition(null);
  };

  useEffect(() => {
    if (!isMobile || !boardRef.current) return;
    const el = boardRef.current;
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      el.removeEventListener("touchmove", preventScroll);
    };
  }, [isMobile]);

  console.log(gameOver)

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
      {/* {isMobile && !gameOver && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-1 rounded z-10">
          Swipe to move • Tap to place • Double-tap to hold
        </div>
      )} */}

      <div
        tabIndex={0}
        ref={boardRef}
        className="grid gap-3 h-full p-4 bg-white rounded-xl shadow-md outline-none"
        style={{
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            let isPieceCell = false;
            let pieceColor = "";
            if (currentPiece && !gameOver) {
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
