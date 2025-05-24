import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HighScore } from "@/types/game";
import { formatHighScores } from "@/utils/gameLogic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GameOverModalProps {
  score: number;
  level: number;
  highScores: HighScore[];
  onRestart: () => void;
  onViewBoard: () => void;
  showBoard: boolean;
  gridSize: 4 | 5;
  isTimed: boolean;
  onClose: () => void;
  linesCleared: number;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  level,
  highScores,
  onRestart,
  onViewBoard,
  showBoard,
  gridSize,
  isTimed,
  onClose,
  linesCleared,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const categorizedScores = formatHighScores(highScores);
  const defaultCategory = `${gridSize}x${gridSize} ${isTimed ? "Timed" : "Untimed"}`;
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-md" aria-describedby="game-over-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Game Over!</DialogTitle>
        </DialogHeader>

        <div id="game-over-description" className="text-center mb-6">
          <p className="text-xl mb-2">Final Score: {score}</p>
          <p className="text-gray-600">Level Reached: {level}</p>
          <p className="text-blue-700 font-bold">Lines Cleared: {linesCleared}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">High Scores</h3>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(categorizedScores).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {categorizedScores[selectedCategory].length > 0 ? (
              <div>
                {/* Header Row */}
                <div className="grid grid-cols-12 px-2 pb-2 text-xs text-gray-500 font-semibold border-b border-gray-200">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-4">Score</div>
                  <div className="col-span-3 text-center">Lines</div>
                  <div className="col-span-3 text-right">Date</div>
                </div>
                {categorizedScores[selectedCategory].map((score, index, arr) => (
                  <div
                    key={index}
                    className={`grid grid-cols-12 items-center px-2 py-2 text-sm ${
                      index < arr.length - 1 ? "border-b border-gray-200" : ""
                    }`}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                        ${
                          index === 0
                            ? "bg-yellow-400"
                            : index === 1
                            ? "bg-gray-300"
                            : index === 2
                            ? "bg-amber-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span className={index > 2 ? "text-gray-700" : "text-white"}>{index + 1}</span>
                      </span>
                    </div>
                    <div className="col-span-4 font-medium">{score.score.toLocaleString()}</div>
                    <div className="col-span-3 text-center text-xs text-blue-700 font-semibold">
                      {score.linesCleared ?? "-"}
                    </div>
                    <div className="col-span-3 text-right text-xs text-gray-500">{formatDate(score.date)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No scores yet</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={onRestart} className="bg-blue-600 hover:bg-blue-700">
            Play Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameOverModal;
