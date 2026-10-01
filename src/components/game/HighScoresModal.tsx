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
      <DialogContent className="max-w-[92vw] rounded-[28px] border-[2.5px] border-[#1F1633] bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-center text-2xl font-bold">High Scores</DialogTitle>
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

          <div className="rounded-2xl bg-[#FBF6EE] p-4">
            {categorizedScores[selectedCategory]?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 px-2 pb-2 gp-label border-b border-[#EADFCE]">
                  <div className="col-span-2">#</div>
                  <div className="col-span-5">Score</div>
                  <div className="col-span-2 text-center">Lines</div>
                  <div className="col-span-3 text-right">Date</div>
                </div>
                {categorizedScores[selectedCategory].map((score, index) => (
                  <div key={index} className="grid grid-cols-12 items-center px-2 py-2 text-sm border-b border-[#EADFCE] last:border-0">
                    <div className="col-span-2 flex items-center gap-1">
                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold
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
                    <div className="gp-value col-span-5 text-lg">{score.score.toLocaleString()}</div>
                    <div className="col-span-2 text-center text-sm font-extrabold text-[#5A3ED6]">
                      {score.linesCleared ?? "-"}
                    </div>
                    <div className="col-span-3 text-right text-xs font-semibold text-[color:var(--gp-muted)]">{formatDate(score.date)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center font-semibold text-[color:var(--gp-muted)]">No scores yet. Go set one!</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighScoresModal;
