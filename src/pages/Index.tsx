import React from "react";

import GridPopGame from "@/components/game/GridPopGame";
const Index = () => {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <main className="flex-1 flex flex-col overflow-x-auto">
        <GridPopGame />
      </main>

      <div className="max-w-3xl mx-auto px-4 py-6 bg-white rounded-lg shadow-sm border border-gray-200 my-6">
        <h2 className="text-xl font-bold text-center mb-4">How to Play</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Basic Rules</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Place tetromino pieces on the grid to clear rows and score points.</li>
              <li>Cells start at value 0 and increase by 1 when a piece is placed.</li>
              <li>When any cell reaches value 7, game over!</li>
              <li>When all cells in a row or column have the same value (1-6), the row or column clears.</li>
              <li>Clear multiple rows/columns at once for bonus points!</li>
              <li>Clearing the entire grid gives a huge 5000 point bonus.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Controls</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Use arrow keys to move the piece.</li>
              <li>Press D to rotate clockwise, A to rotate counter-clockwise.</li>
              <li>Press S to hold a piece for later (once per turn).</li>
              <li>Press Space to place the piece.</li>
            </ul>
            <p className="text-gray-700">You can customize controls in the Options menu.</p>
          </div>
        </div>
        <p className="text-center text-gray-500 mt-4 italic">
          Tip: Look for opportunities to clear multiple rows and columns at once for higher scores!
        </p>
      </div>

      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>A puzzle game where strategy meets speed.</p>
      </footer>
    </div>
  );
};

export default Index;
