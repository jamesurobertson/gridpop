/**
 * The look of every tile value and piece. Tiles warm up from friendly colours (1-4) to danger
 * (5 orange, 6 red) because a tile that reaches 7 ends the game.
 */

export type TileStyle = {
  /** Top face of the tile. */
  face: string;
  /** The darker edge under it (gives tiles their chunky, pressable look). */
  edge: string;
  text: string;
  label: string;
};

export const TILES: Record<number, TileStyle> = {
  1: { face: "#FFD45E", edge: "#D9A12A", text: "#6E4300", label: "1" },
  2: { face: "#7CCBFF", edge: "#3A93D2", text: "#08436B", label: "2" },
  3: { face: "#7BDEA3", edge: "#3BA86A", text: "#0C4D2C", label: "3" },
  4: { face: "#B8A3FF", edge: "#8063E6", text: "#33198A", label: "4" },
  5: { face: "#FF9D5C", edge: "#D86A22", text: "#6E2600", label: "5" },
  6: { face: "#FF5A6E", edge: "#C92841", text: "#FFFFFF", label: "6" },
  7: { face: "#2B2236", edge: "#100B16", text: "#FFFFFF", label: "💀" },
};

/** Colour of each piece shape (the piece you're moving, and the Hold / Next previews). */
export const PIECE_COLORS: Record<string, string> = {
  I: "#4FC3FF",
  O: "#FFC83A",
  T: "#A97CFF",
  S: "#45D486",
  Z: "#FF6B7A",
  L: "#FF9A4D",
  J: "#5B8CFF",
  I3: "#3FD0C9",
  LJ2: "#FF7BC1",
};

export const pieceColor = (type: string) => PIECE_COLORS[type] ?? "#FFFFFF";

/** Background / text / label for a cell value. */
export function getCellVisual(value: number) {
  const t = TILES[value];
  return t ? { backgroundColor: t.face, text: t.label, textColor: t.text } : { backgroundColor: "transparent", text: "", textColor: "#000" };
}
