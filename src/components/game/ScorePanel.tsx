import React from "react";
import { Timer } from "lucide-react";

interface ScorePanelProps {
  score: number;
  level: number;
  linesCleared: number;
  timeRemaining: number;
  maxTime: number;
  onTimeUp: () => void;
  isTimed: boolean;
}

const ScorePanel: React.FC<ScorePanelProps> = ({ score, level, linesCleared, timeRemaining, maxTime, onTimeUp, isTimed }) => {
  return (
    <div className="bg-white rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">{score}</div>
        <div className="text-sm text-gray-500">Level {level}</div>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">Lines Cleared</div>
        <div className="text-lg font-bold text-blue-700">{linesCleared}</div>
      </div>

      {isTimed && (
        <div className="relative pt-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <Timer size={16} className="mr-1" />
              <span className="text-sm font-medium">Time</span>
            </div>
            <span className="text-sm font-medium">{Math.ceil(timeRemaining)}s</span>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${(timeRemaining / maxTime) * 100}%` }}
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                timeRemaining < 3 ? "bg-red-500" : "bg-blue-500"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ScorePanel;
