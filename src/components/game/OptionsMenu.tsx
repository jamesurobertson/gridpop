import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import KeyConfigPanel from "./KeyConfigPanel";
import { KeyConfig } from "@/types/game";
import { Grid3x3, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateKeyConfig: (config: Partial<KeyConfig>) => void;
  keyConfig: KeyConfig;
  onChangeGridSize: (size: 4 | 5) => void;
  currentGridSize: 4 | 5;
  isTimed: boolean;
  onToggleTimed: (isTimed: boolean) => void;
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  onClose,
  onUpdateKeyConfig,
  keyConfig,
  onChangeGridSize,
  currentGridSize,
  isTimed,
  onToggleTimed,
}) => {
  const [attemptedClose, setAttemptedClose] = useState(false);
  const isMobile = useIsMobile();

  // List of all keybinding fields
  const keyFields = ["moveUp", "moveDown", "moveLeft", "moveRight", "rotate", "rotateCounter", "drop", "hold"];
  const emptyKeys = keyFields.filter((k) => !keyConfig[k]);

  // Custom close handler
  const handleClose = () => {
    if (!isMobile && emptyKeys.length > 0) {
      setAttemptedClose(true);
      return;
    }
    setAttemptedClose(false);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="bg-white sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-white z-10 px-6 py-4 border-b shadow-sm">
          <DialogTitle className="text-center">Game Options</DialogTitle>
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6 px-6 py-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Controls</h3>
            {isMobile ? (
              <ul className="list-disc pl-5 space-y-2 text-gray-700 text-sm">
                <li><b>Drag</b>: Move piece</li>
                <li><b>Tap</b>: Rotate piece</li>
                <li><b>Swipe down</b>: Place piece</li>
                <li><b>Swipe up</b>: Hold piece</li>
              </ul>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-2">Click on a key field and press any key to configure</p>
                <KeyConfigPanel
                  currentConfig={keyConfig}
                  onUpdateConfig={onUpdateKeyConfig}
                  standalone={false}
                  emptyKeys={emptyKeys}
                  attemptedClose={attemptedClose}
                />
              </>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Grid Size</h3>
            <p className="text-sm text-gray-500 mb-2">
              Choose the size of the game grid.
            </p>
            <div className="flex gap-3 mt-3">
              <Button
                variant={currentGridSize === 4 ? "default" : "outline"}
                onClick={() => onChangeGridSize(4)}
                className="flex-1"
              >
                <Grid3x3 size={18} className="mr-2" />
                4x4
              </Button>
              <Button
                variant={currentGridSize === 5 ? "default" : "outline"}
                onClick={() => onChangeGridSize(5)}
                className="flex-1"
              >
                <Grid3x3 size={18} className="mr-2" />
                5x5
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Game Timer</h3>
            <p className="text-sm text-gray-500 mb-2">Toggle between timed and untimed gameplay modes.</p>
            <div className="flex items-center space-x-2 mt-3">
              <Switch id="timed-mode" checked={isTimed} onCheckedChange={onToggleTimed} />
              <Label htmlFor="timed-mode" className="flex items-center">
                <Timer size={18} className="mr-2" />
                Timed Mode
              </Label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t shadow-sm px-6 py-4">
          <div className="flex justify-end">
            <Button onClick={handleClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsMenu;
