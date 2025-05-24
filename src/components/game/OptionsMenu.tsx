import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import KeyConfigPanel from "./KeyConfigPanel";
import { KeyConfig } from "@/types/game";
import { Grid3x3, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

  // List of all keybinding fields
  const keyFields = ["moveUp", "moveDown", "moveLeft", "moveRight", "rotate", "rotateCounter", "drop", "hold"];
  const emptyKeys = keyFields.filter((k) => !keyConfig[k]);

  // Custom close handler
  const handleClose = () => {
    if (emptyKeys.length > 0) {
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
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Game Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Controls</h3>
            <p className="text-sm text-gray-500 mb-2">Click on a key field and press any key to configure</p>
            <KeyConfigPanel
              currentConfig={keyConfig}
              onUpdateConfig={onUpdateKeyConfig}
              standalone={false}
              emptyKeys={emptyKeys}
              attemptedClose={attemptedClose}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Grid Size</h3>
            <p className="text-sm text-gray-500 mb-2">
              Choose the size of the game grid. Note: Changing will reset your current game.
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

        <div className="flex justify-end mt-4">
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsMenu;
