import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<string>("controls");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Game Options</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="gameplay">Gameplay</TabsTrigger>
          </TabsList>

          <div className="relative h-[225px]">
            <TabsContent value="controls" className="absolute inset-0 space-y-4">
              <KeyConfigPanel currentConfig={keyConfig} onUpdateConfig={onUpdateKeyConfig} standalone={false} />
            </TabsContent>

            <TabsContent value="gameplay" className="absolute inset-0 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Grid Size</h3>
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
                <h3 className="text-sm font-medium mb-2">Game Timer</h3>
                <p className="text-sm text-gray-500 mb-2">Toggle between timed and untimed gameplay modes.</p>
                <div className="flex items-center space-x-2 mt-3">
                  <Switch id="timed-mode" checked={isTimed} onCheckedChange={onToggleTimed} />
                  <Label htmlFor="timed-mode" className="flex items-center">
                    <Timer size={18} className="mr-2" />
                    Timed Mode
                  </Label>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsMenu;
