import { useState, useCallback } from "react";

interface TouchControls {
  onPieceMove: (direction: "left" | "right" | "up" | "down") => void;
  onPiecePlace: () => void;
  onPieceRotate: (direction: "clockwise" | "counterclockwise") => void;
}

export const useTouchControls = ({ onPieceMove, onPiecePlace, onPieceRotate }: TouchControls) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [pendingTap, setPendingTap] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchStartTime(Date.now());
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, boardRef: React.RefObject<HTMLDivElement>, gridSize: number) => {
      e.preventDefault();
      if (!touchStart || !touchStartTime) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (!isDragging && (absDeltaX > 10 || absDeltaY > 10)) {
        setIsDragging(true);
        setLastTapTime(0);
        setPendingTap(null);
      }

      if (isDragging) {
        const boardRect = boardRef.current?.getBoundingClientRect();
        if (!boardRect) return;

        const cellSize = boardRect.width / gridSize;
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
    [touchStart, touchStartTime, isDragging, onPieceMove]
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
          setPendingTap(null);
          return;
        }

        setPendingTap(now);
        setLastTapTime(now);
      }

      setTouchStart(null);
      setTouchStartTime(null);
      setIsDragging(false);
    },
    [touchStart, touchStartTime, isDragging, lastTapTime, onPieceRotate]
  );

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    pendingTap,
    setPendingTap,
  };
};
