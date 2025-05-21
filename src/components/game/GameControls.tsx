import React, { useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { KeyConfig } from "@/types/game";
import { useGameState } from "@/hooks/useGameState";

interface GameControlsProps {
  onPieceMove?: (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => void;
  onNewGame: () => void;
  onOpenOptions: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onPieceMove,
  onNewGame,
  onOpenOptions,
}) => {
  const {
    state,
    movePiece,
    rotatePiece,
    holdPiece,
    placePiece,
  } = useGameState();

  const isMobile = useIsMobile();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state.gameOver || !state.hasStarted || state.showOptionsMenu) return;

    const key = e.key.toLowerCase();
    const keyConfig = state.keyConfig;

    switch (key) {
      case keyConfig.moveLeft:
        movePiece("left");
        break;
      case keyConfig.moveRight:
        movePiece("right");
        break;
      case keyConfig.moveDown:
        movePiece("down");
        break;
      case keyConfig.moveUp:
        movePiece("up");
        break;
      case keyConfig.rotate:
        rotatePiece("clockwise");
        break;
      case keyConfig.rotateCounter:
        rotatePiece("counterclockwise");
        break;
      case keyConfig.hold:
        holdPiece();
        break;
      case keyConfig.drop:
        placePiece();
        break;
    }
  }, [state.gameOver, state.hasStarted, state.showOptionsMenu, state.keyConfig, movePiece, rotatePiece, holdPiece, placePiece]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getKeyDisplayName = (key: string): string => {
    if (key === " ") return "Space";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    return key.toUpperCase();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">
        <Button
          variant="outline"
          onClick={onOpenOptions}
          className="flex-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
        >
          Options
        </Button>

        <Button onClick={onNewGame} className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white">
          New Game
        </Button>
      </div>

      <div className="text-center text-sm bg-white p-3 rounded-xl border border-gray-200">
        <p className="font-medium mb-1">Current Controls:</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            <p>
              <span className="font-bold">Rotate:</span> {getKeyDisplayName(state.keyConfig.rotate)},{" "}
              {getKeyDisplayName(state.keyConfig.rotateCounter)}
            </p>
            <p>
              <span className="font-bold">Hold:</span> {getKeyDisplayName(state.keyConfig.hold)}
            </p>
          </div>
          <div>
            <p>
              <span className="font-bold">Move:</span> {getKeyDisplayName(state.keyConfig.moveUp)}/
              {getKeyDisplayName(state.keyConfig.moveDown)}/{getKeyDisplayName(state.keyConfig.moveLeft)}/
              {getKeyDisplayName(state.keyConfig.moveRight)}
            </p>
            <p>
              <span className="font-bold">Drop:</span> {getKeyDisplayName(state.keyConfig.drop)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
