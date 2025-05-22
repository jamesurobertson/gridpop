import React, { useState, useRef, useEffect } from "react";
import { KeyConfig } from "@/types/game";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";

const DEFAULT_CONFIG: KeyConfig = {
  rotate: "d",
  drop: " ",
  hold: "s",
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  moveUp: "ArrowUp",
  moveDown: "ArrowDown",
  rotateCounter: "a",
};

interface KeyConfigPanelProps {
  currentConfig: KeyConfig;
  onUpdateConfig: (config: Partial<KeyConfig>) => void;
  standalone?: boolean;
}

const KeyConfigPanel: React.FC<KeyConfigPanelProps> = ({ currentConfig, onUpdateConfig, standalone = true }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<keyof KeyConfig | null>(null);

  const form = useForm<KeyConfig>({
    defaultValues: currentConfig,
  });

  const handleKeyCapture = (event: React.KeyboardEvent, keyName: keyof KeyConfig) => {
    event.preventDefault();
    const newKey = event.key;

    // Create a new config object
    const newConfig: Partial<KeyConfig> = { [keyName]: newKey };

    // Find any other actions that use this key and clear them
    Object.entries(currentConfig).forEach(([action, key]) => {
      if (key === newKey && action !== keyName) {
        newConfig[action as keyof KeyConfig] = "";
      }
    });

    // Update the form and the config
    form.setValue(keyName, newKey);
    onUpdateConfig(newConfig);
    setEditingKey(null);
  };

  const getKeyDisplayName = (key: string): string => {
    if (key === " ") return "Space";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    return key.toUpperCase();
  };

  const renderKeyConfigContent = () => {
    return (
      <>
        <div className="text-sm mb-3">
          <p className="text-gray-600">Click on a key field and press any key to configure</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1.5">Move</p>
            <div className="grid grid-cols-3 gap-1.5">
              <div></div>
              <div
                className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                  editingKey === "moveUp" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                }`}
                onClick={() => setEditingKey("moveUp")}
                onKeyDown={(e) => editingKey === "moveUp" && handleKeyCapture(e, "moveUp")}
                tabIndex={0}
              >
                {getKeyDisplayName(currentConfig.moveUp)}
              </div>
              <div></div>
              <div
                className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                  editingKey === "moveLeft" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                }`}
                onClick={() => setEditingKey("moveLeft")}
                onKeyDown={(e) => editingKey === "moveLeft" && handleKeyCapture(e, "moveLeft")}
                tabIndex={0}
              >
                {getKeyDisplayName(currentConfig.moveLeft)}
              </div>
              <div
                className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                  editingKey === "moveDown" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                }`}
                onClick={() => setEditingKey("moveDown")}
                onKeyDown={(e) => editingKey === "moveDown" && handleKeyCapture(e, "moveDown")}
                tabIndex={0}
              >
                {getKeyDisplayName(currentConfig.moveDown)}
              </div>
              <div
                className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                  editingKey === "moveRight" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                }`}
                onClick={() => setEditingKey("moveRight")}
                onKeyDown={(e) => editingKey === "moveRight" && handleKeyCapture(e, "moveRight")}
                tabIndex={0}
              >
                {getKeyDisplayName(currentConfig.moveRight)}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-1.5">Rotate</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                    editingKey === "rotateCounter" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                  }`}
                  onClick={() => setEditingKey("rotateCounter")}
                  onKeyDown={(e) => editingKey === "rotateCounter" && handleKeyCapture(e, "rotateCounter")}
                  tabIndex={0}
                >
                  {getKeyDisplayName(currentConfig.rotateCounter)}
                </div>
                <div
                  className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                    editingKey === "rotate" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                  }`}
                  onClick={() => setEditingKey("rotate")}
                  onKeyDown={(e) => editingKey === "rotate" && handleKeyCapture(e, "rotate")}
                  tabIndex={0}
                >
                  {getKeyDisplayName(currentConfig.rotate)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2 rounded border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-1.5">Drop</p>
                <div
                  className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                    editingKey === "drop" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                  }`}
                  onClick={() => setEditingKey("drop")}
                  onKeyDown={(e) => editingKey === "drop" && handleKeyCapture(e, "drop")}
                  tabIndex={0}
                >
                  {getKeyDisplayName(currentConfig.drop)}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-1.5">Hold</p>
                <div
                  className={`bg-gray-200 p-1.5 text-center rounded cursor-pointer h-8 flex items-center justify-center transition-colors ${
                    editingKey === "hold" ? "bg-blue-100 border border-blue-400" : "hover:bg-gray-300"
                  }`}
                  onClick={() => setEditingKey("hold")}
                  onKeyDown={(e) => editingKey === "hold" && handleKeyCapture(e, "hold")}
                  tabIndex={0}
                >
                  {getKeyDisplayName(currentConfig.hold)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (!standalone) {
    return renderKeyConfigContent();
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Game Controls</DialogTitle>
          </DialogHeader>

          {renderKeyConfigContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KeyConfigPanel;
