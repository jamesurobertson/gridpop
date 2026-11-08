import { useState } from "react";
import { CalendarDays, Infinity as InfinityIcon, Timer } from "lucide-react";
import EndlessGame from "@/components/game/EndlessGame";
import type { PlayMode } from "@/types/game";
import { sfx } from "@/audio/sfx";
import { cn } from "@/lib/utils";
import { Game } from "../../reddit/src/client/GameView";

const MODE_KEY = "gridpop-mode";

const PLAY_MODES: { mode: PlayMode; label: string; icon: JSX.Element }[] = [
  { mode: "daily", label: "Daily", icon: <CalendarDays size={16} strokeWidth={2.75} /> },
  { mode: "unlimited", label: "Unlimited", icon: <InfinityIcon size={17} strokeWidth={2.75} /> },
  { mode: "timed", label: "Timed", icon: <Timer size={16} strokeWidth={2.75} /> },
];

function loadMode(): PlayMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return PLAY_MODES.some((option) => option.mode === saved) ? (saved as PlayMode) : "daily";
  } catch {
    return "daily";
  }
}

/** The website: the Reddit app's daily puzzle, plus the endless modes, behind one switch. */
export const WebApp = () => {
  const [mode, setMode] = useState(loadMode);

  const switchMode = (next: PlayMode) => {
    if (next === mode) return;
    sfx.play("click");
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Storage blocked: the site opens on Daily next time.
    }
  };

  const modeTabs = (
    <div role="tablist" aria-label="Game mode" className="gp-tabs gp-tabs-sm w-full">
      {PLAY_MODES.map((option) => (
        <button key={option.mode} role="tab" aria-selected={option.mode === mode} className={cn("gp-tab", option.mode === mode && "gp-tab-on")} onClick={() => switchMode(option.mode)}>
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );

  return mode === "daily" ? <Game modeTabs={modeTabs} /> : <EndlessGame key={mode} timed={mode === "timed"} modeTabs={modeTabs} />;
};
