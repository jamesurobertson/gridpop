import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import KeyConfigPanel from "./KeyConfigPanel";
import { KeyConfig } from "@/types/game";
import { Grid3x3, Timer, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  muted: boolean;
  onToggleMute: () => void;
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
  muted,
  onToggleMute,
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
      <DialogContent className="max-h-[90dvh] max-w-[92vw] gap-0 overflow-y-auto rounded-[28px] border-0 bg-white p-0 sm:max-w-md [&>button:last-child]:hidden">
        <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between space-y-0 border-b border-[color:var(--gp-line)] bg-white/95 px-6 py-4 backdrop-blur">
          <DialogTitle className="font-display text-2xl font-bold">Options</DialogTitle>
          <button onClick={handleClose} className="gp-icon-btn !min-h-[40px] !w-[40px]" aria-label="Close">
            <X size={18} strokeWidth={3} />
          </button>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <section>
            <div className="gp-label mb-2">Grid size</div>
            <div className="grid grid-cols-2 gap-2.5">
              {([4, 5] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onChangeGridSize(size)}
                  className={cn("gp-btn", currentGridSize === size && "gp-btn-primary")}
                >
                  <Grid3x3 size={18} strokeWidth={2.5} /> {size}×{size}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-[color:var(--gp-muted)]">Changing it starts a new game.</p>
          </section>

          <section className="space-y-3">
            <label htmlFor="timed-mode" className="flex items-center justify-between rounded-2xl bg-[#F6EEE2] px-4 py-3">
              <span className="flex items-center gap-2 font-extrabold">
                <Timer size={18} strokeWidth={2.5} /> Timed mode
              </span>
              <Switch id="timed-mode" checked={isTimed} onCheckedChange={onToggleTimed} />
            </label>
            <label htmlFor="sound" className="flex items-center justify-between rounded-2xl bg-[#F6EEE2] px-4 py-3">
              <span className="flex items-center gap-2 font-extrabold">
                <Volume2 size={18} strokeWidth={2.5} /> Sound
              </span>
              <Switch id="sound" checked={!muted} onCheckedChange={onToggleMute} />
            </label>
          </section>

          <section>
            <div className="gp-label mb-2">Controls</div>
            {isMobile ? (
              <ul className="space-y-1.5 text-sm font-semibold text-[color:var(--gp-ink)]">
                <li><b>Drag</b> to move the piece</li>
                <li><b>Tap</b> to place it</li>
                <li><b>Double-tap</b> to rotate</li>
                <li><b>Tap Hold</b> to swap it out</li>
              </ul>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold text-[color:var(--gp-muted)]">Click a key, then press the key you want.</p>
                <KeyConfigPanel
                  currentConfig={keyConfig}
                  onUpdateConfig={onUpdateKeyConfig}
                  standalone={false}
                  emptyKeys={emptyKeys}
                  attemptedClose={attemptedClose}
                />
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsMenu;
