import { AnimatePresence, motion } from "framer-motion";
import { TILES } from "@/utils/gameCellVisuals";

/** How long the banner holds the screen before the results card may open. */
export const SOLVED_BANNER_MS = 1600;

const LETTERS = ["S", "O", "L", "V", "E", "D"];
const TILTS = [-7, 4, -3, 6, -5, 3];

/** "SOLVED" spelled in game tiles, the way the logo spells POP, dropped in one by one over the board. */
export const SolvedBanner = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key="solved"
        className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-[#FFF6EA]/50 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.22, ease: "easeIn" } }}
        aria-live="polite"
      >
        <div className="gp-logo gp-logo-pop text-[min(10.5vw,76px)]" aria-label="Solved">
          {LETTERS.map((letter, i) => {
            const tile = TILES[i + 1];
            return (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ y: "-0.9em", scale: 0.4, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", visualDuration: 0.38, bounce: 0.5, delay: 0.08 + i * 0.07 }}
              >
                <span
                  className="gp-logo-tile"
                  aria-hidden
                  style={{ ["--f" as string]: tile.face, ["--e" as string]: tile.edge, ["--t" as string]: tile.text, ["--r" as string]: `${TILTS[i]}deg`, ["--d" as string]: `${0.9 + i * 0.1}s` }}
                >
                  {letter}
                </span>
              </motion.span>
            );
          })}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
