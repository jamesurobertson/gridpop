
import React from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface TutorialProps {
  onClose: () => void;
}

const Tutorial = ({ onClose }: TutorialProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-20 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 my-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">How to Play GridPop: Overload</h2>
        
        <div className="space-y-4 text-gray-700 mb-6">
          <div>
            <h3 className="font-bold">Goal:</h3>
            <p>Place tetromino pieces on the grid to clear rows and score points!</p>
          </div>
          
          <div>
            <h3 className="font-bold">Grid Rules:</h3>
            <ul className="list-disc pl-5">
              <li>Cells start at value 0</li>
              <li>Each piece placement increases cell values by +1</li>
              <li>When any cell reaches value 7, game over!</li>
              <li>When all cells in a row or column have the same value (1-6), the row or column clears</li>
              <li>Clearing multiple rows/columns at once gives a bonus!</li>
              <li>Clearing the entire grid gives a huge 5000 point bonus!</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold">Controls:</h3>
            <ul className="list-disc pl-5">
              <li><span className="font-semibold">Arrow keys</span> - Move piece around the grid</li>
              <li><span className="font-semibold">D key</span> - Rotate clockwise</li>
              <li><span className="font-semibold">A key</span> - Rotate counterclockwise</li>
              <li><span className="font-semibold">Space</span> - Place the piece</li>
              <li><span className="font-semibold">S key</span> - Hold a piece for later use (once per turn)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold">Timer:</h3>
            <p>You have limited time to place each piece</p>
            <p>If time runs out, the piece is placed randomly</p>
            <p>The timer gets shorter as you level up!</p>
          </div>
        </div>
        
        <Button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Start Playing!
        </Button>
      </div>
    </div>
  );
};

export default Tutorial;
