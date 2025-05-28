import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GameOverModalProps {
  score: number;
  level: number;
  onRestart: () => void;
  onClose: () => void;
  linesCleared: number;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  level,
  onRestart,
  onClose,
  linesCleared,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };


  function handleShare() {
    const shareText = `I scored ${score.toLocaleString()} points in GridPop! Can you beat my score? Play now at https://gridpop.io`;

    const shareData = {
      title: 'GridPop.io',
      text: `I scored ${score.toLocaleString()} points in GridPop! See if you can beat it!`,
      url: 'https://gridpop.io'
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Shared successfully!'))
        .catch((error) => console.warn('Share failed:', error));
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      // Clipboard fallback
      navigator.clipboard.writeText(shareText)
        .then(() => {
          setShowCopiedMessage(true);
          setTimeout(() => setShowCopiedMessage(false), 2000);
        })
        .catch((err) => console.error('Failed to copy text: ', err));
    } else {
      // Final fallback if clipboard API isn't available
      console.warn('Web Share and Clipboard APIs not supported.');
      alert('Please copy the following link manually:\n\n' + shareText);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-[85vw] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            GAME OVER
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-6 py-4">
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {score.toLocaleString()} points
            </p>
            <p className="text-gray-600 mt-1">
              Level {level} • {linesCleared} lines cleared
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleShare}
              className="bg-green-600 hover:bg-green-700 text-lg py-6"
            >
              Challenge Your Friends!
            </Button>

            {showCopiedMessage && (
              <p className="text-sm text-gray-600 text-center">
                Link Copied! Share it with your friends!
              </p>
            )}

            <Button
              onClick={onRestart}
              className="bg-blue-600 hover:bg-blue-700 text-lg py-6"
            >
              Play Again
            </Button>


          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameOverModal;
