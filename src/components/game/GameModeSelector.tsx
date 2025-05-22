import React from "react";
import { GameMode } from "@/types/game";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onSelectMode, open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Select Game Mode</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          <div
            className="border border-purple-500 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
            onClick={() => onSelectMode("standard")}
          >
            <h3 className="font-bold text-lg text-purple-400">Standard Mode</h3>
            <p className="text-sm text-gray-300 mt-1">
              Classic gameplay with gradually increasing difficulty. Clear matching rows and columns to score points.
            </p>
          </div>

          <div
            className="border border-yellow-500 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
            onClick={() => onSelectMode("challenge")}
          >
            <h3 className="font-bold text-lg text-yellow-400">Challenge Mode</h3>
            <p className="text-sm text-gray-300 mt-1">
              Faster timer, higher score multipliers, and special pieces. For experienced players looking for a
              challenge!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameModeSelector;
