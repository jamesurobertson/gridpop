import { useCallback, useState } from "react";

export type KeyAction = "moveLeft" | "moveUp" | "moveDown" | "moveRight" | "rotateCounter" | "rotate" | "drop" | "hold" | "undo" | "hint";
export type Keys = Record<KeyAction, string>;

/** What a tap on the board does; a double-tap does the other. "buttons" puts both under the board instead. */
export type TouchScheme = "tap-place" | "tap-rotate" | "buttons";
export type RotateDirection = "clockwise" | "counterclockwise";

export type Controls = { keys: Keys; touch: TouchScheme; tapRotate: RotateDirection };

export const ACTION_LABELS: Record<KeyAction, string> = {
  moveLeft: "Left",
  moveUp: "Up",
  moveDown: "Down",
  moveRight: "Right",
  rotateCounter: "Rotate left",
  rotate: "Rotate right",
  drop: "Place",
  hold: "Hold",
  undo: "Undo",
  hint: "Hint",
};

export const MOVE_ACTIONS: KeyAction[] = ["moveLeft", "moveUp", "moveDown", "moveRight"];
export const DAILY_ACTIONS: KeyAction[] = [...MOVE_ACTIONS, "rotateCounter", "rotate", "drop", "undo", "hint"];
export const ENDLESS_ACTIONS: KeyAction[] = [...MOVE_ACTIONS, "rotateCounter", "rotate", "drop", "hold"];

export const KEY_PRESETS: { name: string; keys: Keys }[] = [
  {
    name: "Arrows",
    keys: { moveLeft: "ArrowLeft", moveUp: "ArrowUp", moveDown: "ArrowDown", moveRight: "ArrowRight", rotateCounter: "a", rotate: "d", drop: " ", hold: "s", undo: "z", hint: "h" },
  },
  {
    name: "WASD",
    keys: { moveLeft: "a", moveUp: "w", moveDown: "s", moveRight: "d", rotateCounter: "q", rotate: "e", drop: " ", hold: "Shift", undo: "z", hint: "h" },
  },
];

export const DEFAULT_CONTROLS: Controls = { keys: KEY_PRESETS[0].keys, touch: "tap-place", tapRotate: "clockwise" };

/** Keys that can't be bound: Escape cancels a rebind, and the rest are for the browser. */
export const RESERVED_KEYS = new Set(["Escape", "Tab", "Meta", "Control", "Alt", "CapsLock", "Dead", "Unidentified"]);

/** Letters are stored lowercase, so Shift or Caps Lock doesn't change which action they press. */
export const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

const KEY_LABELS: Record<string, string> = { ArrowLeft: "←", ArrowUp: "↑", ArrowDown: "↓", ArrowRight: "→", " ": "Space", Backspace: "⌫" };
export const keyLabel = (key: string) => (key ? KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key) : "—");

export const sameKeys = (a: Keys, b: Keys) => (Object.keys(a) as KeyAction[]).every((action) => a[action] === b[action]);

/** Binds `key` to `action`. Every key does one thing, so an action that had it takes this one's old key. */
export function bindKey(keys: Keys, action: KeyAction, key: string): Keys {
  const next = { ...keys, [action]: normalizeKey(key) };
  const holder = (Object.keys(keys) as KeyAction[]).find((other) => other !== action && keys[other] === normalizeKey(key));
  if (holder) next[holder] = keys[action];
  return next;
}

/** The action a key press triggers, among the ones this game has. */
export const actionFor = (keys: Keys, key: string, actions: KeyAction[]) => actions.find((action) => keys[action] === normalizeKey(key));

const STORAGE_KEY = "gridpop-controls";

const validKeys = (keys: unknown): keys is Keys => {
  if (!keys || typeof keys !== "object") return false;
  const values = (Object.keys(DEFAULT_CONTROLS.keys) as KeyAction[]).map((action) => (keys as Keys)[action]);
  return values.every((value) => typeof value === "string" && value !== "") && new Set(values).size === values.length;
};

export function loadControls(): Controls {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && validKeys(saved.keys)) {
      return {
        keys: saved.keys,
        touch: ["tap-place", "tap-rotate", "buttons"].includes(saved.touch) ? saved.touch : DEFAULT_CONTROLS.touch,
        tapRotate: saved.tapRotate === "counterclockwise" ? "counterclockwise" : "clockwise",
      };
    }
    // Keys chosen in the old Options menu carry over.
    const old = JSON.parse(localStorage.getItem("gridpop-settings") ?? "null")?.keyConfig;
    if (old) {
      let keys = DEFAULT_CONTROLS.keys;
      for (const action of ENDLESS_ACTIONS) if (typeof old[action] === "string" && old[action] && !RESERVED_KEYS.has(old[action])) keys = bindKey(keys, action, old[action]);
      return { ...DEFAULT_CONTROLS, keys };
    }
  } catch {
    // Unreadable or blocked storage: the defaults.
  }
  return DEFAULT_CONTROLS;
}

export function useControls() {
  const [controls, setControls] = useState(loadControls);
  const update = useCallback((next: Controls) => {
    setControls(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the choice lasts until the page closes.
    }
  }, []);
  return [controls, update] as const;
}

// ---------- the words for each control, for tips and pointers ----------

const isArrows = (keys: Keys) => keys.moveLeft === "ArrowLeft" && keys.moveUp === "ArrowUp" && keys.moveDown === "ArrowDown" && keys.moveRight === "ArrowRight";

export function controlText(controls: Controls, touch: boolean) {
  const { keys } = controls;
  if (!touch) {
    return {
      move: isArrows(keys) ? "Arrow keys to move" : `${[keys.moveUp, keys.moveLeft, keys.moveDown, keys.moveRight].map(keyLabel).join("")} to move`,
      place: `${keyLabel(keys.drop)} to place`,
      rotate: `${keyLabel(keys.rotateCounter)} or ${keyLabel(keys.rotate)} to rotate`,
    };
  }
  const tapPlaces = controls.touch === "tap-place";
  return {
    move: "Drag to move",
    place: controls.touch === "buttons" ? "Tap Place" : tapPlaces ? "Tap to place" : "Double-tap to place",
    rotate: controls.touch === "buttons" ? "Tap a turn button" : tapPlaces ? "Double-tap to rotate" : "Tap to rotate",
  };
}

/** The touch gestures, as label and value, for the settings list. */
export function gestureList(controls: Controls, hold: boolean): [string, string][] {
  const list: [string, string][] = [["Move", "Drag"]];
  if (controls.touch === "buttons") list.push(["Place", "Place button"], ["Rotate", "Turn buttons"]);
  else {
    const tapPlaces = controls.touch === "tap-place";
    list.push(["Place", tapPlaces ? "Tap" : "Double-tap"], ["Rotate", tapPlaces ? "Double-tap" : "Tap"]);
  }
  if (hold) list.push(["Hold", "Tap Hold"]);
  return list;
}
