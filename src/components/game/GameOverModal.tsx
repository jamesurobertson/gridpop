import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Eye, EyeOff, ChevronDown } from "lucide-react";
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
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const categorizedScores = formatHighScores(highScores);
  const defaultCategory = `${gridSize}x${gridSize} ${isTimed ? "Timed" : "Untimed"}`;
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  useEffect(() => {
    setSelectedCategory(defaultCategory);
  }, [gridSize, isTimed]);

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
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Game Over!</DialogTitle>
        </DialogHeader>

        <div className="text-center mb-6">
          <p className="text-xl mb-2">Final Score: {score}</p>
          <p className="text-gray-600">Level Reached: {level}</p>
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
              <div className="space-y-2">
                {categorizedScores[selectedCategory].map((score, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-lg transition-colors
                      ${score.score === score.score ? "bg-blue-50 border border-blue-100" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full
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
                        <span className={`text-sm font-medium ${index > 2 ? "text-gray-700" : "text-white"}`}>
                          {index + 1}
                        </span>
                      </span>
                      <span className="font-medium">{score.score.toLocaleString()}</span>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(score.date)}</span>
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
