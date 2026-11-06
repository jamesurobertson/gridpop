import { cn } from "@/lib/utils";

const TILE_COLORS = ["#FFD45E", "#7CCBFF", "#7BDEA3", "#FF5A6E"];

/** The logo's four tiles popping in turn, while something loads. */
export const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("gp-spinner", className)} role="status" aria-label="Loading">
    {TILE_COLORS.map((color) => (
      <i key={color} style={{ background: color }} />
    ))}
  </div>
);
