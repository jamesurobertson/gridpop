import React from "react";
import { Tetromino } from "@/types/game";
import { getCurrentShape } from "@/utils/gameLogic";
import { cn } from "@/lib/utils";

interface PieceDisplayProps {
  piece: Tetromino | null;
  label: string;
  size: string;
}

const PieceDisplay = ({ piece, label, size }: PieceDisplayProps) => {
  // Calculate size based on piece shape
  const sizeNum = piece ? Math.max(getCurrentShape(piece).length, getCurrentShape(piece)[0].length) : 2;

  return (
    <div className="flex flex-col items-center w-full">
      {label && <h3 className="text-gray-500 text-sm font-medium mb-2">{label}</h3>}
      <div
        className="grid gap-1 w-full aspect-square"
        style={{
          gridTemplateRows: `repeat(${sizeNum}, 1fr)`,
          gridTemplateColumns: `repeat(${sizeNum}, 1fr)`,
        }}
      >
        {piece
          ? // Render piece preview with darker color matching the text colors
            [...Array(sizeNum)].map((_, y) =>
              [...Array(sizeNum)].map((_, x) => {
                const shape = getCurrentShape(piece);
                const isFilled = y < shape.length && x < shape[0].length && shape[y][x];

                const pieceType = piece.shape.type;
                const colorMap: Record<string, string> = {
                  I: "#5BA3D9", // Sky Blue text
                  O: "#D1B347", // Pale Lemon text
                  T: "#8E7DCC", // Lavender text
                  S: "#6BBF9E", // Mint text
                  Z: "#C25C5C", // Red text
                  L: "#D48F82", // Coral text
                  J: "#5BA3D9", // Sky Blue text
                  I3: "#5e7ca8	", // Sky Blue text
                  LJ2: "#E18FB8", // pastel pink
                };

                return (
                  <div
                    key={`${y}-${x}`}
                    className={cn("w-full aspect-square rounded-sm", isFilled ? "" : "bg-neutral-100")}
                    style={isFilled ? { backgroundColor: colorMap[pieceType] || piece.shape.color } : {}}
                  />
                );
              })
            )
          : // Empty placeholder
            [...Array(sizeNum * sizeNum)].map((_, i) => (
              <div key={i} className="w-full aspect-square bg-neutral-100 rounded-sm" />
            ))}
      </div>
    </div>
  );
};

export default PieceDisplay;
