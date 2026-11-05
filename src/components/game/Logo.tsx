import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** The GridPop wordmark: a little tile grid, "Grid", and POP spelled in game tiles that hop now and then. */
export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  // letter, face, edge, text colour, tilt
  const tiles: [string, string, string, string, number][] = [
    ["P", "#FFD45E", "#D9A12A", "#6E4300", -7],
    ["O", "#7CCBFF", "#3A93D2", "#08436B", 4],
    ["P", "#FF5A6E", "#C92841", "#FFFFFF", -3],
  ];
  const mark = ["#FFD45E", "#7CCBFF", "#7BDEA3", "#FF5A6E"];
  return (
    <h1 className={cn("gp-logo", className)} aria-label="GridPop">
      <motion.span
        className="gp-logo-mark"
        aria-hidden
        initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
      >
        {mark.map((c, i) => (
          <i key={i} style={{ background: c }} className={i === 3 ? "gp-logo-mark-pop" : undefined} />
        ))}
      </motion.span>
      <span className="gp-logo-word">Grid</span>
      <span className="gp-logo-pop" aria-hidden>
        {tiles.map(([ch, f, e, t, r], i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ y: -18, scale: 0.5, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 13, delay: 0.15 + i * 0.09 }}
          >
            <span
              className="gp-logo-tile"
              style={{ ["--f" as string]: f, ["--e" as string]: e, ["--t" as string]: t, ["--r" as string]: `${r}deg`, ["--d" as string]: `${1.2 + i * 0.12}s` }}
            >
              {ch}
            </span>
          </motion.span>
        ))}
      </span>
    </h1>
  );
};
