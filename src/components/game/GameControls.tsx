import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { KeyConfig } from "@/types/game";

interface GameControlsProps {
  onRotate: (direction: "clockwise" | "counterclockwise") => void;
  onHold: () => void;
  onPlace: () => void;
  onNewGame: () => void;
  onMove: (direction: "left" | "right" | "up" | "down") => void;
  canHold: boolean;
  keyConfig: KeyConfig;
  onOpenOptions: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  onRotate,
  onHold,
  onPlace,
  onNewGame,
  onMove,
  canHold,
  keyConfig,
  onOpenOptions,
}) => {
  const isMobile = useIsMobile();

  // Add keyboard controls for desktop
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;

      if (key === keyConfig.rotate) {
        onRotate("clockwise");
        event.preventDefault();
      } else if (key === keyConfig.rotateCounter) {
        onRotate("counterclockwise");
        event.preventDefault();
      } else if (key === keyConfig.drop) {
        onPlace();
        event.preventDefault();
      } else if (key === keyConfig.hold) {
        onHold();
        event.preventDefault();
      } else if (key === "p") {
        onNewGame();
        event.preventDefault();
      } else if (key === keyConfig.moveLeft && onMove) {
        onMove("left");
        event.preventDefault();
      } else if (key === keyConfig.moveRight && onMove) {
        onMove("right");
        event.preventDefault();
      } else if (key === keyConfig.moveUp && onMove) {
        onMove("up");
        event.preventDefault();
      } else if (key === keyConfig.moveDown && onMove) {
        onMove("down");
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onRotate, onHold, onPlace, onNewGame, onMove, keyConfig]);

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
              <span className="font-bold">Rotate:</span> {getKeyDisplayName(keyConfig.rotate)},{" "}
              {getKeyDisplayName(keyConfig.rotateCounter)}
            </p>
            <p>
              <span className="font-bold">Hold:</span> {getKeyDisplayName(keyConfig.hold)}
            </p>
          </div>
          <div>
            <p>
              <span className="font-bold">Move:</span> {getKeyDisplayName(keyConfig.moveUp)}/
              {getKeyDisplayName(keyConfig.moveDown)}/{getKeyDisplayName(keyConfig.moveLeft)}/
              {getKeyDisplayName(keyConfig.moveRight)}
            </p>
            <p>
              <span className="font-bold">Drop:</span> {getKeyDisplayName(keyConfig.drop)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
