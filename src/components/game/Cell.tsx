import React from 'react';
import { CellValue } from '@/types/game';

interface CellProps {
  value: CellValue;
  isCurrentPiece: boolean;
}

export const Cell: React.FC<CellProps> = ({ value, isCurrentPiece }) => {
  const getCellColor = () => {
    if (isCurrentPiece) return 'bg-blue-500';
    switch (value) {
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-green-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-yellow-500';
      case 5:
        return 'bg-purple-500';
      case 6:
        return 'bg-pink-500';
      case 7:
        return 'bg-orange-500';
      default:
        return 'bg-gray-700';
    }
  };

  return (
    <div
      className={`w-12 h-12 rounded ${getCellColor()} transition-colors duration-150`}
    />
  );
}; 
