import { cn } from "@/lib/utils";

/** The game in miniature while something loads: three 1s drop onto a row, then it pops. */
export const Loader = ({ size, className }: { size?: number; className?: string }) => (
  <div className={cn("gp-loader", className)} style={size ? { ["--s" as string]: `${size}px` } : undefined} role="status" aria-label="Loading">
    {[0, 1, 2].map((slot) => (
      <span key={slot}>
        <i>1</i>
      </span>
    ))}
  </div>
);
