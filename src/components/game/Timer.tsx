
import React, { useEffect } from "react";

interface TimerProps {
  timeRemaining: number;
  maxTime: number;
  onTimeUp: () => void;
  isPaused: boolean;
}

const Timer = ({ timeRemaining, maxTime, onTimeUp, isPaused }: TimerProps) => {
  useEffect(() => {
    if (isPaused) return;
    
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }
    
    const timer = setTimeout(() => {
      onTimeUp();
    }, timeRemaining * 1000);
    
    return () => clearTimeout(timer);
  }, [timeRemaining, onTimeUp, isPaused]);
  
  // Calculate percentage of time remaining
  const percentLeft = (timeRemaining / maxTime) * 100;
  
  // Always use green color for the timer as requested
  const timerColor = "bg-emerald-600";
  
  return (
    <div className="mt-2">
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full">
        <div 
          className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
      <div className="flex justify-end">
        <span className="mt-1 text-xs text-gray-500 font-mono">
          {timeRemaining.toFixed(1)}s
        </span>
      </div>
    </div>
  );
};

export default Timer;
