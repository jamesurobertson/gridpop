import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import KeyConfigPanel from "./KeyConfigPanel";
import { KeyConfig } from "@/types/game";
import { Check, ChevronDown, Infinity as InfinityIcon, Timer, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateKeyConfig: (config: Partial<KeyConfig>) => void;
  keyConfig: KeyConfig;
  defaultKeyConfig: KeyConfig;
  currentGridSize: 4 | 5;
  isTimed: boolean;
  /** Start a new game with these settings. */
  onApplyMode: (size: 4 | 5, timed: boolean) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const KEY_FIELDS: (keyof KeyConfig)[] = ["moveUp", "moveDown", "moveLeft", "moveRight", "rotate", "rotateCounter", "drop", "hold"];

const keyName = (key: string) => {
  if (!key) return "—";
  if (key === " ") return "Space";
  const arrows: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };
  return arrows[key] ?? (key.length === 1 ? key.toUpperCase() : key);
};

const Kbd = ({ k }: { k: string }) => (
  <kbd className={cn("inline-grid min-w-[28px] place-items-center rounded-lg border-2 border-[#1F1633] bg-white px-1.5 py-0.5 font-sans text-xs font-extrabold", !k && "border-[#FF5A6E] text-[#FF5A6E]")}>{keyName(k)}</kbd>
);

/** The badge every choice wears: an ink-outlined square holding a simple drawing. */
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[2.5px] border-[#1F1633] bg-[#FFF6EA] text-[#1F1633]" aria-hidden>
    {children}
  </span>
);

/** A small n×n grid, drawn in ink. */
const GridGlyph = ({ n }: { n: number }) => (
  <span className="grid h-[22px] w-[22px] gap-[2px]" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
    {Array.from({ length: n * n }, (_, i) => (
      <i key={i} className="rounded-[1.5px] bg-[#1F1633]" />
    ))}
  </span>
);

/** One choice in a group of two: a big tappable card with a title and a one-line explanation. */
const Choice = ({ selected, onSelect, title, desc, icon }: { selected: boolean; onSelect: () => void; title: string; desc: string; icon: React.ReactNode }) => (
  <button
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={cn(
      "relative flex items-center gap-3 rounded-2xl border-[2.5px] p-3 pr-9 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFF]",
      selected ? "border-[#1F1633] bg-[#EFEAFF]" : "border-[color:var(--gp-line)] bg-white hover:border-[#BCAEDB]"
    )}
  >
    {selected && (
      <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border-2 border-[#1F1633] bg-[#7C5CFF] text-white" aria-hidden>
        <Check size={12} strokeWidth={4} />
      </span>
    )}
    {icon}
    <span className="min-w-0">
      <span className="font-display block text-[17px] font-semibold leading-tight">{title}</span>
      <span className="block text-[13px] font-semibold leading-snug text-[color:var(--gp-muted)]">{desc}</span>
    </span>
  </button>
);

const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  onClose,
  onUpdateKeyConfig,
  keyConfig,
  defaultKeyConfig,
  currentGridSize,
  isTimed,
  onApplyMode,
  muted,
  onToggleMute,
}) => {
  const isMobile = useIsMobile();
  const [size, setSize] = useState(currentGridSize);
  const [timed, setTimed] = useState(isTimed);
  const [editingKeys, setEditingKeys] = useState(false);
  const [attemptedClose, setAttemptedClose] = useState(false);

  // Each time the menu opens, start from the game's real settings.
  useEffect(() => {
    if (!isOpen) return;
    setSize(currentGridSize);
    setTimed(isTimed);
    setEditingKeys(false);
    setAttemptedClose(false);
  }, [isOpen, currentGridSize, isTimed]);

  const emptyKeys = KEY_FIELDS.filter((k) => !keyConfig[k]);
  const modeChanged = size !== currentGridSize || timed !== isTimed;

  const handleClose = () => {
    if (!isMobile && emptyKeys.length > 0) {
      setAttemptedClose(true);
      setEditingKeys(true);
      return;
    }
    onClose();
  };

  const keysAreDefault = KEY_FIELDS.every((k) => keyConfig[k] === defaultKeyConfig[k]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-[92vw] flex-col gap-0 overflow-hidden rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 sm:max-w-md [&>button:last-child]:hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-[color:var(--gp-line)] px-6 py-4">
          <div>
            <DialogTitle className="font-display text-2xl font-bold">Options</DialogTitle>
            <DialogDescription className="sr-only">Board size, pace, sound and controls</DialogDescription>
          </div>
          <button onClick={handleClose} className="gp-icon-btn !min-h-[40px] !w-[40px]" aria-label="Close options">
            <X size={18} strokeWidth={3} />
          </button>
        </DialogHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {/* ---------- the game you play ---------- */}
          <section className="space-y-4">
            <div>
              <h3 className="gp-label mb-2">Board size</h3>
              <div role="radiogroup" aria-label="Board size" className="grid gap-2">
                <Choice selected={size === 4} onSelect={() => setSize(4)} title="4 × 4" desc="The classic. Tight and tense." icon={<Badge><GridGlyph n={4} /></Badge>} />
                <Choice selected={size === 5} onSelect={() => setSize(5)} title="5 × 5" desc="More room, plus the long piece." icon={<Badge><GridGlyph n={5} /></Badge>} />
              </div>
            </div>
            <div>
              <h3 className="gp-label mb-2">Pace</h3>
              <div role="radiogroup" aria-label="Pace" className="grid gap-2">
                <Choice
                  selected={!timed}
                  onSelect={() => setTimed(false)}
                  title="Relaxed"
                  desc="No clock. Think as long as you like."
                  icon={<Badge><InfinityIcon size={22} strokeWidth={2.75} /></Badge>}
                />
                <Choice
                  selected={timed}
                  onSelect={() => setTimed(true)}
                  title="Timed"
                  desc="Beat the clock on every piece. It speeds up each level."
                  icon={<Badge><Timer size={21} strokeWidth={2.75} /></Badge>}
                />
              </div>
            </div>
            {modeChanged && (
              <p className="rounded-2xl bg-[#FFF3D6] px-4 py-3 text-[13px] font-bold text-[#6E4300]">
                These apply when you start a new game. Your current game will end.
              </p>
            )}
          </section>

          {/* ---------- sound ---------- */}
          <section>
            <h3 className="gp-label mb-2">Sound</h3>
            <label htmlFor="opt-sound" className="flex cursor-pointer items-center justify-between rounded-2xl bg-[#F6EEE2] px-4 py-3">
              <span className="flex items-center gap-2.5 font-extrabold">
                <Volume2 size={18} strokeWidth={2.5} /> Sound effects
              </span>
              <Switch id="opt-sound" checked={!muted} onCheckedChange={onToggleMute} />
            </label>
          </section>

          {/* ---------- controls ---------- */}
          <section>
            <h3 className="gp-label mb-2">Controls</h3>
            {isMobile ? (
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 rounded-2xl bg-[#FBF6EE] px-4 py-3 text-sm font-bold">
                {[
                  ["Move", "Drag the piece"],
                  ["Place", "Tap the board"],
                  ["Rotate", "Double-tap the board"],
                  ["Hold", "Tap the Hold box"],
                ].map(([action, gesture]) => (
                  <React.Fragment key={action}>
                    <dt>{action}</dt>
                    <dd className="text-[color:var(--gp-muted)]">{gesture}</dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : (
              <div className="space-y-3">
                <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-2xl bg-[#FBF6EE] px-4 py-3 text-sm font-bold">
                  <dt>Move</dt>
                  <dd className="flex gap-1">
                    <Kbd k={keyConfig.moveLeft} /> <Kbd k={keyConfig.moveRight} /> <Kbd k={keyConfig.moveUp} /> <Kbd k={keyConfig.moveDown} />
                  </dd>
                  <dt>Rotate</dt>
                  <dd className="flex gap-1">
                    <Kbd k={keyConfig.rotateCounter} /> <Kbd k={keyConfig.rotate} />
                  </dd>
                  <dt>Place</dt>
                  <dd>
                    <Kbd k={keyConfig.drop} />
                  </dd>
                  <dt>Hold</dt>
                  <dd>
                    <Kbd k={keyConfig.hold} />
                  </dd>
                </dl>
                {attemptedClose && emptyKeys.length > 0 && (
                  <p className="rounded-2xl bg-[#FFE4E0] px-4 py-2.5 text-[13px] font-bold text-[#A11D33]">
                    Some actions have no key. Give each one a key before closing.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button className="gp-btn !min-h-[40px] text-sm" onClick={() => setEditingKeys((v) => !v)} aria-expanded={editingKeys}>
                    Change keys <ChevronDown size={16} strokeWidth={3} className={cn("transition-transform", editingKeys && "rotate-180")} />
                  </button>
                  {!keysAreDefault && (
                    <button className="gp-btn !min-h-[40px] text-sm" onClick={() => onUpdateKeyConfig(defaultKeyConfig)}>
                      Reset to defaults
                    </button>
                  )}
                </div>
                {editingKeys && (
                  <div className="pt-1">
                    <p className="mb-2 text-xs font-semibold text-[color:var(--gp-muted)]">Click an action, then press the key you want for it.</p>
                    <KeyConfigPanel
                      currentConfig={keyConfig}
                      onUpdateConfig={onUpdateKeyConfig}
                      standalone={false}
                      emptyKeys={emptyKeys}
                      attemptedClose={attemptedClose}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="flex gap-2.5 border-t border-[color:var(--gp-line)] px-6 py-4">
          {modeChanged ? (
            <>
              <button
                className="gp-btn flex-1"
                onClick={() => {
                  setSize(currentGridSize);
                  setTimed(isTimed);
                }}
              >
                Keep playing
              </button>
              <button
                className="gp-btn gp-btn-primary flex-[1.4]"
                onClick={() => {
                  onApplyMode(size, timed);
                  onClose();
                }}
              >
                Start new game
              </button>
            </>
          ) : (
            <button className="gp-btn gp-btn-primary flex-1" onClick={handleClose}>
              Done
            </button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsMenu;
