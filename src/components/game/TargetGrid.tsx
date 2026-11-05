import { GridType } from "@/types/game";
import { TILES } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";

/** A small, flat drawing of a board: the daily puzzle's target. */
const TargetGrid = ({ grid, className }: { grid: GridType; className?: string }) => (
  <div className={cn("gp-target-wrap", className)} aria-label="Target board">
    <div className="gp-target" style={{ gridTemplateColumns: `repeat(${grid.length}, 1fr)` }}>
      {grid.flatMap((row, y) =>
        row.map((value, x) => (
          <span
            key={`${x}-${y}`}
            className={cn("gp-target-cell", value > 0 && "gp-target-tile")}
            style={value > 0 ? { background: TILES[value].face, color: TILES[value].text } : undefined}
          >
            {value > 0 ? TILES[value].label : ""}
          </span>
        ))
      )}
    </div>
  </div>
);

export default TargetGrid;
