import { GridType } from "@/types/game";
import { TILES } from "@/utils/gameCellVisuals";
import { cn } from "@/lib/utils";

/**
 * A small, flat drawing of a board: the daily puzzle's target. `shimmer` runs a wave over the
 * sockets while it loads; `reveal` pops the tiles in when they first appear.
 */
const TargetGrid = ({ grid, className, shimmer, reveal }: { grid: GridType; className?: string; shimmer?: boolean; reveal?: boolean }) => (
  <div className={cn("gp-target-wrap", shimmer && "gp-target-shimmer", reveal && "gp-target-reveal", className)} aria-label="Target board">
    <div className="gp-target" style={{ gridTemplateColumns: `repeat(${grid.length}, 1fr)` }}>
      {grid.flatMap((row, y) =>
        row.map((value, x) => (
          <span
            key={`${x}-${y}`}
            className={cn("gp-target-cell", value > 0 && "gp-target-tile")}
            style={{ ["--x" as string]: x, ["--y" as string]: y, ...(value > 0 && { background: TILES[value].face, color: TILES[value].text }) }}
          >
            {value > 0 ? TILES[value].label : ""}
          </span>
        ))
      )}
    </div>
  </div>
);

export default TargetGrid;
