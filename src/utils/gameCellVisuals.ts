
/**
 * Game Cell Visuals from Design Spec
 * Exports a function to get color, effects, and text for a cell value.
 */

type CellVisual = {
  backgroundColor: string;
  text: string;
  textColor: string;
  effects: string[];
};

const cellVisuals: { [key: number]: CellVisual } = {
  0: { backgroundColor: "#f1f1f1", text: "", textColor: "#000000", effects: [] },
  1: { backgroundColor: "#FFF3B0", text: "1", textColor: "#D1B347", effects: [] },
  2: { backgroundColor: "#B6E0FE", text: "2", textColor: "#5BA3D9", effects: [] },
  3: { backgroundColor: "#C3F5D0", text: "3", textColor: "#6BBF9E", effects: [] },
  4: { backgroundColor: "#D9CEFF", text: "4", textColor: "#8E7DCC", effects: [] },
  5: { backgroundColor: "#FAD4C0", text: "5", textColor: "#D48F82", effects: ["glow"] },
  6: { backgroundColor: "#F8A0A0", text: "6", textColor: "#C25C5C", effects: ["glow"] },
  7: { backgroundColor: "#FF7070", text: "7", textColor: "#B91C1C", effects: ["flash", "gameOverAlert"] }
};

const defaultVisual: CellVisual = { backgroundColor: "#f1f1f1", text: "", textColor: "#000000", effects: [] };

/**
 * Returns color/effects/text for cell value.
 */
export function getCellVisual(value: number): CellVisual {
  return cellVisuals.hasOwnProperty(value) ? cellVisuals[value] : defaultVisual;
}
