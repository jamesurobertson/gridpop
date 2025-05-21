import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HighScore } from "@/types/game";
import { formatHighScores } from "@/utils/gameLogic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HighScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  highScores: HighScore[];
  gridSize: 4 | 5;
  isTimed: boolean;
}

const HighScoresModal: React.FC<HighScoresModalProps> = ({ isOpen, onClose, highScores, gridSize, isTimed }) => {
  const categorizedScores = formatHighScores(highScores);
  const defaultCategory = `${gridSize}x${gridSize} ${isTimed ? "Timed" : "Untimed"}`;
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  useEffect(() => {
    // Update selected category when modal opens or game mode changes
    setSelectedCategory(defaultCategory);
  }, [isOpen, gridSize, isTimed]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">High Scores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
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
            {categorizedScores[selectedCategory]?.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white font-bold border-b border-gray-200">
                  <span className="w-24 text-center">Score</span>
                  <span className="w-16 text-center">Lines</span>
                  <span className="w-28 text-center">Date</span>
                </div>
                {categorizedScores[selectedCategory].map((score, index) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-white">
                    <div className="flex items-center gap-3 w-24 justify-center">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full ${
                          index === 0
                            ? "bg-yellow-400"
                            : index === 1
                            ? "bg-gray-300"
                            : index === 2
                            ? "bg-amber-600"
                            : "bg-gray-100"
                        }`}
                      >
                        <span className="text-sm font-medium text-white">{index + 1}</span>
                      </span>
                      <span className="font-medium text-center">{score.score.toLocaleString()}</span>
                    </div>
                    <span className="w-16 text-center text-sm font-medium text-blue-700">{score.linesCleared ?? 0}</span>
                    <span className="w-28 text-center text-sm text-gray-500">{formatDate(score.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No scores yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighScoresModal;
