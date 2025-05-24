import React, { useState, useRef, useEffect } from "react";
import { KeyConfig } from "@/types/game";
import { RotateCw, RotateCcw } from "lucide-react";

const ARROW_KEYS = {
  moveUp: "ArrowUp",
  moveDown: "ArrowDown",
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
};
const WASD_KEYS = {
  moveUp: "w",
  moveDown: "s",
  moveLeft: "a",
  moveRight: "d",
};

const MOVEMENT_PRESETS = [
  { label: "Arrow Keys", value: "arrows", keys: ARROW_KEYS },
  { label: "WASD", value: "wasd", keys: WASD_KEYS },
];

interface KeyConfigPanelProps {
  currentConfig: KeyConfig;
  onUpdateConfig: (config: Partial<KeyConfig>) => void;
  standalone?: boolean;
}

const KeyConfigPanel: React.FC<KeyConfigPanelProps> = ({ currentConfig, onUpdateConfig }) => {
  const [editingKey, setEditingKey] = useState<keyof KeyConfig | null>(null);
  const [movementPreset, setMovementPreset] = useState<"arrows" | "wasd" | null>(null);
  const editingRef = useRef<HTMLDivElement>(null);

  // Helper to remove keys from other actions
  const removeKeysFromOtherActions = (keys: string[], except: (keyof KeyConfig)[]) => {
    const newConfig: Partial<KeyConfig> = {};
    Object.entries(currentConfig).forEach(([action, key]) => {
      if (!except.includes(action as keyof KeyConfig) && keys.includes(key)) {
        newConfig[action as keyof KeyConfig] = "";
      }
    });
    return newConfig;
  };

  // Helper to check if current movement keys match a preset
  function getMovementPreset(config: KeyConfig): "arrows" | "wasd" | null {
    const movementKeys = ["moveUp", "moveDown", "moveLeft", "moveRight"] as const;
    const isArrows = movementKeys.every((k) => config[k] === ARROW_KEYS[k]);
    if (isArrows) return "arrows";
    const isWasd = movementKeys.every((k) => config[k] === WASD_KEYS[k]);
    if (isWasd) return "wasd";
    return null;
  }

  // Update movementPreset whenever currentConfig changes
  useEffect(() => {
    setMovementPreset(getMovementPreset(currentConfig));
  }, [currentConfig]);

  // When preset is selected, set movement keys and remove those keys from other actions
  const handleMovementPreset = (preset: "arrows" | "wasd") => {
    setMovementPreset(preset);
    const presetKeys = MOVEMENT_PRESETS.find((p) => p.value === preset)!.keys;
    const keysToSet = Object.values(presetKeys);
    const movementActions = ["moveUp", "moveDown", "moveLeft", "moveRight"] as (keyof KeyConfig)[];
    const cleared = removeKeysFromOtherActions(keysToSet, movementActions);
    onUpdateConfig({ ...presetKeys, ...cleared });
  };

  // Cancel editing on click outside or Escape
  useEffect(() => {
    if (!editingKey) return;
    function handleClick(e: MouseEvent) {
      // If click is on a keybinding button, do nothing
      let el = e.target as HTMLElement | null;
      while (el) {
        if (el.getAttribute && el.getAttribute("data-keybinding-btn") !== null) return;
        el = el.parentElement;
      }
      setEditingKey(null);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setEditingKey(null);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editingKey]);

  const handleKeyCapture = (event: React.KeyboardEvent, keyName: keyof KeyConfig) => {
    event.preventDefault();
    const newKey = event.key;
    const newConfig: Partial<KeyConfig> = { [keyName]: newKey };
    // Remove duplicate keybindings
    Object.entries(currentConfig).forEach(([action, key]) => {
      if (key === newKey && action !== keyName) {
        newConfig[action as keyof KeyConfig] = "";
      }
    });
    onUpdateConfig(newConfig);
    setEditingKey(null);
  };

  const getKeyDisplayName = (key: string): string => {
    if (key === " ") return "Space";
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    if (key === "Shift") return "Shift";
    return key.length === 1 ? key.toUpperCase() : key;
  };

  // Button style for consistent height
  const keyBtnClass = (isEditing: boolean) =>
    `min-w-[48px] min-h-[44px] flex items-center justify-center px-2 py-1 rounded-lg text-center font-semibold border transition-all outline-none focus:ring-2 focus:ring-blue-400
    shadow-[0_1.5px_6px_0_rgba(0,0,0,0.07)] hover:shadow-md active:shadow-inner
    ` +
    (isEditing
      ? "bg-blue-100 border-blue-500 text-blue-700"
      : "bg-white border-gray-300 hover:bg-gray-100 text-gray-800");

  return (
    <div className="space-y-4" ref={editingRef}>
      {/* Movement Toggle */}
      <div>
        <div className="text-sm font-semibold mb-1">Movement</div>
        <div className="flex gap-2 mb-2">
          {MOVEMENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={`px-3 py-1 rounded font-medium border text-xs transition-all ${
                movementPreset === preset.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
              onClick={() => handleMovementPreset(preset.value as "arrows" | "wasd")}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* Movement Key Grid */}
        <div className="flex flex-col items-center mb-2">
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5 w-48">
            <div></div>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "moveUp")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "moveUp" ? null : "moveUp")}
              onKeyDown={(e) => editingKey === "moveUp" && handleKeyCapture(e, "moveUp")}
            >
              {editingKey === "moveUp" ? (
                "..."
              ) : currentConfig.moveUp ? (
                getKeyDisplayName(currentConfig.moveUp)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
            <div></div>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "moveLeft")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "moveLeft" ? null : "moveLeft")}
              onKeyDown={(e) => editingKey === "moveLeft" && handleKeyCapture(e, "moveLeft")}
            >
              {editingKey === "moveLeft" ? (
                "..."
              ) : currentConfig.moveLeft ? (
                getKeyDisplayName(currentConfig.moveLeft)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "moveDown")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "moveDown" ? null : "moveDown")}
              onKeyDown={(e) => editingKey === "moveDown" && handleKeyCapture(e, "moveDown")}
            >
              {editingKey === "moveDown" ? (
                "..."
              ) : currentConfig.moveDown ? (
                getKeyDisplayName(currentConfig.moveDown)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "moveRight")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "moveRight" ? null : "moveRight")}
              onKeyDown={(e) => editingKey === "moveRight" && handleKeyCapture(e, "moveRight")}
            >
              {editingKey === "moveRight" ? (
                "..."
              ) : currentConfig.moveRight ? (
                getKeyDisplayName(currentConfig.moveRight)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Block Actions */}
      <div>
        <div className="text-sm font-semibold mb-1">Block Actions</div>
        <div className="rounded border border-gray-200 divide-y bg-gray-50">
          {/* Rotate */}
          <div className="flex items-center px-2 py-2">
            <span className="flex-1 font-medium text-gray-700 flex items-center">Rotate</span>
            <div className="flex gap-2">
              <button
                data-keybinding-btn
                className={keyBtnClass(editingKey === "rotateCounter")}
                tabIndex={0}
                onClick={() => setEditingKey(editingKey === "rotateCounter" ? null : "rotateCounter")}
                onKeyDown={(e) => editingKey === "rotateCounter" && handleKeyCapture(e, "rotateCounter")}
              >
                <RotateCcw size={16} className="inline-block mr-1 text-gray-500" />
                {editingKey === "rotateCounter" ? (
                  "..."
                ) : currentConfig.rotateCounter ? (
                  getKeyDisplayName(currentConfig.rotateCounter)
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </button>
              <button
                data-keybinding-btn
                className={keyBtnClass(editingKey === "rotate")}
                tabIndex={0}
                onClick={() => setEditingKey(editingKey === "rotate" ? null : "rotate")}
                onKeyDown={(e) => editingKey === "rotate" && handleKeyCapture(e, "rotate")}
              >
                <RotateCw size={16} className="inline-block mr-1 text-gray-500" />
                {editingKey === "rotate" ? (
                  "..."
                ) : currentConfig.rotate ? (
                  getKeyDisplayName(currentConfig.rotate)
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </button>
            </div>
          </div>
          {/* Drop */}
          <div className="flex items-center px-2 py-2">
            <span className="flex-1 font-medium text-gray-700">Drop</span>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "drop")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "drop" ? null : "drop")}
              onKeyDown={(e) => editingKey === "drop" && handleKeyCapture(e, "drop")}
            >
              {editingKey === "drop" ? (
                "..."
              ) : currentConfig.drop ? (
                getKeyDisplayName(currentConfig.drop)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
          </div>
          {/* Hold */}
          <div className="flex items-center px-2 py-2">
            <span className="flex-1 font-medium text-gray-700">Hold</span>
            <button
              data-keybinding-btn
              className={keyBtnClass(editingKey === "hold")}
              tabIndex={0}
              onClick={() => setEditingKey(editingKey === "hold" ? null : "hold")}
              onKeyDown={(e) => editingKey === "hold" && handleKeyCapture(e, "hold")}
            >
              {editingKey === "hold" ? (
                "..."
              ) : currentConfig.hold ? (
                getKeyDisplayName(currentConfig.hold)
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyConfigPanel;
