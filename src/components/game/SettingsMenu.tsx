import { useEffect, useState, type ReactNode } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ACTION_LABELS,
  KEY_PRESETS,
  MOVE_ACTIONS,
  RESERVED_KEYS,
  bindKey,
  keyLabel,
  sameKeys,
  type Controls,
  type KeyAction,
  type TouchScheme,
} from "@/utils/controls";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  controls: Controls;
  onChangeControls: (controls: Controls) => void;
  /** The keys this game uses. */
  actions: KeyAction[];
  /** Touch screens get the gesture settings; keyboards get the keys. */
  touch: boolean;
  muted: boolean;
  onToggleMute: () => void;
  /** Unlimited and Timed: a new board size starts a new game. */
  boardSize?: { current: 4 | 5; onApply: (size: 4 | 5) => void };
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h3 className="gp-label mb-2">{title}</h3>
    {children}
  </section>
);

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T | null; options: { value: T; label: ReactNode }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="gp-tabs gp-tabs-sm flex w-full">
      {options.map((option) => (
        <button key={option.value} role="radio" aria-checked={option.value === value} className={cn("gp-tab", option.value === value && "gp-tab-on")} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A small n×n grid, drawn in ink. */
const GridGlyph = ({ n }: { n: number }) => (
  <span className="grid h-[14px] w-[14px] gap-[1.5px]" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-hidden>
    {Array.from({ length: n * n }, (_, i) => (
      <i key={i} className="rounded-[1px] bg-current" />
    ))}
  </span>
);

const TOUCH_OPTIONS: { value: TouchScheme; label: string; detail: string }[] = [
  { value: "tap-rotate", label: "Tap to rotate", detail: "Double-tap to place" },
  { value: "tap-place", label: "Tap to place", detail: "Double-tap to rotate" },
  { value: "buttons", label: "Buttons", detail: "Rotate and Place buttons" },
];

const KEY_ROWS: { label: string; actions: KeyAction[] }[] = [
  { label: "Move", actions: MOVE_ACTIONS },
  { label: "Rotate", actions: ["rotateCounter", "rotate"] },
  { label: "Place", actions: ["drop"] },
  { label: "Hold", actions: ["hold"] },
  { label: "Undo", actions: ["undo"] },
  { label: "Hint", actions: ["hint"] },
];

export const SettingsMenu = ({ isOpen, onClose, controls, onChangeControls, actions, touch, muted, onToggleMute, boardSize }: Props) => {
  const currentSize = boardSize?.current ?? 4;
  const [size, setSize] = useState<4 | 5>(currentSize);
  const [editing, setEditing] = useState<KeyAction | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSize(currentSize);
    setEditing(null);
  }, [isOpen, currentSize]);

  // The next key pressed is the new binding. Caught on the window's capture phase, so neither the
  // game nor the dialog's Escape-to-close sees it.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") return setEditing(null);
      if (RESERVED_KEYS.has(e.key)) return;
      onChangeControls({ ...controls, keys: bindKey(controls.keys, editing, e.key) });
      setEditing(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [editing, controls, onChangeControls]);

  const sizeChanged = !!boardSize && size !== boardSize.current;
  const preset = KEY_PRESETS.find((option) => sameKeys(option.keys, controls.keys))?.name ?? null;

  const keyButton = (action: KeyAction) => (
    <button
      key={action}
      className={cn(
        "font-display inline-grid h-9 min-w-[40px] place-items-center rounded-[9px] border-2 border-[#1F1633] bg-white px-2 text-sm font-bold shadow-[0_2px_0_#1F1633] transition-colors hover:bg-[#FFF3E2] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFF]",
        editing === action && "border-[#7C5CFF] bg-[#EFEAFF] text-[#5A3ED6] shadow-[0_2px_0_#7C5CFF]"
      )}
      onClick={() => setEditing(editing === action ? null : action)}
      aria-label={`${ACTION_LABELS[action]}: ${keyLabel(controls.keys[action])}`}
      aria-pressed={editing === action}
    >
      {editing === action ? "…" : keyLabel(controls.keys[action])}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-[92vw] flex-col gap-0 overflow-hidden rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-0 sm:max-w-md [&>button:last-child]:hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-[color:var(--gp-line)] px-6 py-4">
          <DialogTitle className="font-display text-2xl font-bold">Settings</DialogTitle>
          <DialogDescription className="sr-only">Sound and controls</DialogDescription>
          <button onClick={onClose} className="gp-icon-btn !min-h-[40px] !w-[40px]" aria-label="Close settings">
            <X size={18} strokeWidth={3} />
          </button>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {boardSize && (
            <Section title="Board size">
              <Segmented<4 | 5>
                label="Board size"
                value={size}
                onChange={setSize}
                options={[4, 5].map((n) => ({
                  value: n as 4 | 5,
                  label: (
                    <>
                      <GridGlyph n={n} /> {n} × {n}
                    </>
                  ),
                }))}
              />
            </Section>
          )}

          <Section title="Sound">
            <button role="switch" aria-checked={!muted} onClick={onToggleMute} className="flex w-full items-center justify-between rounded-2xl bg-[#F6EEE2] px-4 py-3 font-extrabold">
              <span className="flex items-center gap-2.5">
                {muted ? <VolumeX size={18} strokeWidth={2.5} /> : <Volume2 size={18} strokeWidth={2.5} />} Sound effects
              </span>
              <span className={cn("relative h-7 w-12 rounded-full border-2 border-[#1F1633] transition-colors", muted ? "bg-white" : "bg-[#7C5CFF]")} aria-hidden>
                <span className={cn("absolute top-[2px] h-[20px] w-[20px] rounded-full border-2 border-[#1F1633] bg-white transition-[left]", muted ? "left-[2px]" : "left-[22px]")} />
              </span>
            </button>
          </Section>

          {touch ? (
            <Section title="Touch controls">
              <div role="radiogroup" aria-label="Touch controls" className="grid gap-2">
                {TOUCH_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    role="radio"
                    aria-checked={controls.touch === option.value}
                    className={cn(
                      "rounded-2xl border-[2.5px] px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFF]",
                      controls.touch === option.value ? "border-[#1F1633] bg-[#EFEAFF]" : "border-[color:var(--gp-line)] bg-white hover:border-[#BCAEDB]"
                    )}
                    onClick={() => onChangeControls({ ...controls, touch: option.value })}
                  >
                    <span className="font-display block text-[17px] font-semibold leading-tight">{option.label}</span>
                    <span className="block text-[13px] font-bold text-[color:var(--gp-muted)]">{option.detail}</span>
                  </button>
                ))}
              </div>
            </Section>
          ) : (
            <Section title="Keys">
              <div className="space-y-2.5">
                <Segmented
                  label="Key layout"
                  value={preset}
                  options={KEY_PRESETS.map((option) => ({ value: option.name, label: option.name }))}
                  onChange={(name) => onChangeControls({ ...controls, keys: KEY_PRESETS.find((option) => option.name === name)!.keys })}
                />
                <div className="divide-y divide-[color:var(--gp-line)] rounded-2xl bg-[#FBF6EE] px-4">
                  {KEY_ROWS.filter((row) => row.actions.every((action) => actions.includes(action))).map((row) => (
                    <div key={row.label} className="flex min-h-[52px] items-center justify-between gap-3 py-2">
                      <span className="text-sm font-extrabold">{row.label}</span>
                      <span className="flex gap-1.5">{row.actions.map(keyButton)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs font-bold text-[color:var(--gp-muted)]" aria-live="polite">
                  {editing ? `Press a key for ${ACTION_LABELS[editing]}` : "Click a key to change it"}
                </p>
              </div>
            </Section>
          )}
        </div>

        <footer className="flex gap-2.5 border-t border-[color:var(--gp-line)] px-6 py-4">
          {sizeChanged ? (
            <>
              <button className="gp-btn flex-1" onClick={() => setSize(boardSize.current)}>
                Keep playing
              </button>
              <button
                className="gp-btn gp-btn-primary flex-[1.4]"
                onClick={() => {
                  boardSize.onApply(size);
                  onClose();
                }}
              >
                Start new game
              </button>
            </>
          ) : (
            <button className="gp-btn gp-btn-primary flex-1" onClick={onClose}>
              Done
            </button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
};
