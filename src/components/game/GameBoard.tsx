import React, { useRef, useState, useEffect, useCallback } from "react";
import { GridType, Tetromino, ScoreAnimation } from "@/types/game";
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
  const [isDragging, setIsDragging] = useState(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const pendingTapRef = useRef<number | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle delayed single tap
  const handlePendingTap = useCallback(() => {
    if (pendingTapRef.current) {
      onPiecePlace();
      pendingTapRef.current = null;
    }
  }, [onPiecePlace]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchStartTime(Date.now());
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!touchStart || !touchStartTime || !currentPiece) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (!isDragging && (absDeltaX > 10 || absDeltaY > 10)) {
        setIsDragging(true);
        setLastTapTime(0);
        pendingTapRef.current = null;
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
      }

      if (isDragging) {
        const boardRect = boardRef.current?.getBoundingClientRect();
        if (!boardRect) return;

        const cellSize = boardRect.width / grid.length;
        const cellsMovedX = Math.round(deltaX / cellSize);
        const cellsMovedY = Math.round(deltaY / cellSize);

        if (cellsMovedX !== 0 || cellsMovedY !== 0) {
          if (cellsMovedX !== 0) {
            onPieceMove(cellsMovedX > 0 ? "right" : "left");
          }
          if (cellsMovedY !== 0) {
            onPieceMove(cellsMovedY > 0 ? "down" : "up");
          }
          setTouchStart({ x: touch.clientX, y: touch.clientY });
        }
      }
    },
    [touchStart, touchStartTime, isDragging, currentPiece, grid.length, onPieceMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!touchStart || !touchStartTime) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (!isDragging && absDeltaX < 10 && absDeltaY < 10) {
        const now = Date.now();

        if (lastTapTime && now - lastTapTime < 250) {
          onPieceRotate("clockwise");
          setLastTapTime(0);
          pendingTapRef.current = null;
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }
          return;
        }

        pendingTapRef.current = now;
        setLastTapTime(now);

        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        tapTimeoutRef.current = setTimeout(handlePendingTap, 250);
      }

      setTouchStart(null);
      setTouchStartTime(null);
      setIsDragging(false);
    },
    [touchStart, touchStartTime, isDragging, lastTapTime, onPieceRotate, handlePendingTap]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // Prevent scroll on mobile
  useEffect(() => {
    if (!isMobile || !boardRef.current) return;
    const el = boardRef.current;
    const preventScroll = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventScroll);
  }, [isMobile]);

  return (
    <div
      className={cn(
        "relative mx-auto select-none focus:outline-none",
        isMobile ? "w-[85vw] h-[85vw] max-w-[340px] max-h-[340px]" : "w-[500px] h-[500px]"
      )}
    >
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

            return (
              <div
                key={`${x}-${y}`}
                className="aspect-square rounded-lg transition-all duration-150 relative flex items-center justify-center"
                style={{
                  backgroundColor,
                  boxShadow: cell > 0 ? "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(255,255,255,0.1)" : undefined,
                  transition: "background-color 0.4s ease",
                }}
              >
                {cell !== 0 && (
                  <span
                    className={cn("text-2xl font-bold transition-colors", cell >= 5 ? "drop-shadow-sm" : "")}
                    style={{ color: textColor }}
                  >
                    {text}
                  </span>
                )}
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
