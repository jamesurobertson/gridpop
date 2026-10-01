import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { animate as animateValue, motion, useAnimate, useMotionValue, useTransform } from "framer-motion";
import { GridType, Tetromino, ScoreAnimation } from "@/types/game";
import { TILES, pieceColor } from "@/utils/gameCellVisuals";
import { checkLinesToClear, getCurrentShape, placeTetromino, MAX_CELL_VALUE } from "@/utils/gameLogic";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameBoardProps {
  grid: GridType;
  currentPiece: Tetromino | null;
  /** Changes whenever a new piece comes into play (so it pops in instead of sliding over). */
  pieceKey: string;
  /** The piece has just been placed and completed lines are about to clear. */
  pendingClear: boolean;
  /** Bumped each time a move is blocked: the piece wobbles. */
  bumpKey: number;
  scoreAnimations: ScoreAnimation[];
  onPieceMove: (direction: "left" | "right" | "up" | "down") => void;
  onPiecePlace: () => void;
  onPieceRotate: (direction: "clockwise" | "counterclockwise") => void;
  gameOver: boolean;
  className?: string;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  color: string;
}

const COMBO_LABEL: Record<number, string> = { 2: "Double!", 3: "Triple!", 4: "Quad!", 5: "Mega!", 6: "Ultra!" };
let burstId = 0;

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  currentPiece,
  pieceKey,
  pendingClear,
  bumpKey,
  scoreAnimations,
  onPieceMove,
  onPiecePlace,
  onPieceRotate,
  gameOver,
  className,
}) => {
  const n = grid.length;
  const boardRef = useRef<HTMLDivElement>(null);
  const [scope, animate] = useAnimate();
  const isMobile = useIsMobile();

  // ---------- what the piece would do if placed here ----------

  const preview = useMemo(() => {
    if (!currentPiece || gameOver || pendingClear) return null;
    const shape = getCurrentShape(currentPiece);
    const cells: { x: number; y: number; next: number }[] = [];
    shape.forEach((row, dy) =>
      row.forEach((on, dx) => {
        if (!on) return;
        const x = currentPiece.position.x + dx;
        const y = currentPiece.position.y + dy;
        if (x >= 0 && y >= 0 && x < n && y < n) cells.push({ x, y, next: Math.min(grid[y][x] + 1, MAX_CELL_VALUE) });
      })
    );
    const after = checkLinesToClear(placeTetromino(grid, currentPiece));
    const willClear = new Set<string>();
    if (after.clearValue > 0) {
      for (const r of after.rows) for (let x = 0; x < n; x++) willClear.add(`${x},${r}`);
      for (const c of after.cols) for (let y = 0; y < n; y++) willClear.add(`${c},${y}`);
    }
    return { cells, willClear, color: pieceColor(currentPiece.shape.type) };
  }, [currentPiece, grid, gameOver, pendingClear, n]);

  // Lines that are complete and about to pop (the short beat between placing and clearing).
  const clearing = useMemo(() => {
    const set = new Set<string>();
    if (!pendingClear) return set;
    const { rows, cols, clearValue } = checkLinesToClear(grid);
    if (clearValue === 0) return set;
    for (const r of rows) for (let x = 0; x < n; x++) set.add(`${x},${r}`);
    for (const c of cols) for (let y = 0; y < n; y++) set.add(`${c},${y}`);
    return set;
  }, [grid, pendingClear, n]);

  // ---------- turning: the piece spins about the centre of its rotation square ----------

  // The shapes are stored as quarter-turns of one another inside a fixed square, so drawing the
  // first orientation and rotating the square shows exactly the right shape at every step.
  const angle = useMotionValue(0);
  const counter = useTransform(angle, (a) => -a);
  const lastPieceKey = useRef("");
  const rotation = currentPiece?.rotation ?? 0;
  useEffect(() => {
    const target = rotation * 90;
    if (lastPieceKey.current !== pieceKey) {
      // A new piece (or one swapped from Hold) appears already facing the right way.
      lastPieceKey.current = pieceKey;
      angle.set(target);
      return;
    }
    // Take the short way round, so 270° → 0° is one more clockwise quarter-turn, not three back.
    const now = angle.get();
    const nearest = target + 360 * Math.round((now - target) / 360);
    void animateValue(angle, nearest, { type: "spring", stiffness: 520, damping: 26 });
  }, [rotation, pieceKey, angle]);

  // ---------- clear effects: bursts where tiles vanished ----------

  const [bursts, setBursts] = useState<Burst[]>([]);
  const prevGrid = useRef(grid);
  useEffect(() => {
    const prev = prevGrid.current;
    prevGrid.current = grid;
    if (prev.length !== grid.length) return;
    const fresh: Burst[] = [];
    grid.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v === 0 && prev[y][x] > 0) fresh.push({ id: burstId++, x, y, color: TILES[prev[y][x]]?.face ?? "#fff" });
      })
    );
    if (!fresh.length) return;
    setBursts((b) => [...b, ...fresh]);
    const ids = new Set(fresh.map((b) => b.id));
    setTimeout(() => setBursts((b) => b.filter((x) => !ids.has(x.id))), 900);
  }, [grid]);

  // Big clears shake the board.
  const seenAnims = useRef(new Set<number>());
  useEffect(() => {
    for (const a of scoreAnimations) {
      if (seenAnims.current.has(a.id)) continue;
      seenAnims.current.add(a.id);
      const big = a.bonus || (a.lines ?? 1) >= 2;
      if (big && scope.current) {
        const k = a.bonus ? 12 : 6;
        void animate(scope.current, { x: [0, -k, k, -k * 0.6, k * 0.4, 0], rotate: [0, -0.6, 0.6, -0.3, 0] }, { duration: 0.45 });
      }
    }
  }, [scoreAnimations, animate, scope]);

  // ---------- touch: drag to move, tap to place, double-tap to rotate ----------

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragging.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || !currentPiece) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (!dragging.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        dragging.current = true;
        lastTap.current = 0;
        if (tapTimer.current) clearTimeout(tapTimer.current);
      }
      if (!dragging.current) return;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cell = rect.width / n;
      const mx = Math.round(dx / cell);
      const my = Math.round(dy / cell);
      if (mx !== 0) onPieceMove(mx > 0 ? "right" : "left");
      if (my !== 0) onPieceMove(my > 0 ? "down" : "up");
      if (mx !== 0 || my !== 0) touchStart.current = { x: t.clientX, y: t.clientY };
    },
    [currentPiece, n, onPieceMove]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current) return;
    if (!dragging.current) {
      const now = Date.now();
      if (lastTap.current && now - lastTap.current < 250) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        lastTap.current = 0;
        onPieceRotate("clockwise");
      } else {
        lastTap.current = now;
        tapTimer.current = setTimeout(() => {
          lastTap.current = 0;
          onPiecePlace();
        }, 250);
      }
    }
    touchStart.current = null;
    dragging.current = false;
  }, [onPiecePlace, onPieceRotate]);

  useEffect(() => () => void (tapTimer.current && clearTimeout(tapTimer.current)), []);

  // ---------- render ----------

  const cellArea = (x: number, y: number) => ({ gridColumn: x + 1, gridRow: y + 1 });

  return (
    <div className={cn("relative select-none", className)}>
      <motion.div ref={scope} className="relative h-full w-full">
        <div
          ref={boardRef}
          tabIndex={0}
          className="gp-board grid h-full w-full touch-none outline-none"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)`, ["--n" as string]: n }}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
        >
          {/* Empty sockets */}
          {grid.map((row, y) => row.map((_, x) => <div key={`s${x}-${y}`} className="gp-socket" style={cellArea(x, y)} />))}

          {/* Tiles */}
          {grid.map((row, y) =>
            row.map((v, x) => {
              if (v === 0) return null;
              const t = TILES[v];
              const key = `${x},${y}`;
              const isClearing = clearing.has(key);
              return (
                <div key={`t${key}`} className="relative" style={{ ...cellArea(x, y), zIndex: 1 }}>
                  <motion.div
                    // A new value remounts the face, which plays the pop.
                    key={v}
                    className={cn("gp-tile", v === 6 && "gp-danger", v === 7 && "gp-skull", gameOver && "gp-dead")}
                    style={{ ["--face" as string]: t.face, ["--edge" as string]: t.edge, color: t.text, ["--delay" as string]: `${(x + y) * 40}ms` }}
                    initial={{ scale: 0.55, y: -6 }}
                    animate={isClearing ? { scale: [1, 1.14, 1.08], y: 0 } : { scale: 1, y: 0 }}
                    transition={isClearing ? { duration: 0.22 } : { type: "spring", stiffness: 520, damping: 17 }}
                  >
                    <span className="gp-num">{t.label}</span>
                    {isClearing && <span className="gp-flash" />}
                  </motion.div>
                </div>
              );
            })
          )}

          {/* Lines this placement would clear */}
          {preview &&
            [...preview.willClear].map((key) => {
              const [x, y] = key.split(",").map(Number);
              return <div key={`w${key}`} className="gp-will-clear" style={{ ...cellArea(x, y), zIndex: 2 }} />;
            })}

          {/* The piece you're moving. It sits in its rotation square, glides when it moves and spins about
              the square's centre when it rotates. Every block shows the tile it would become. */}
          {preview && currentPiece && (() => {
            const base = currentPiece.shape.rotations[0];
            const size = base.length;
            // Board geometry in container units (matches .gp-board: 3cqw padding, 2.2cqw gaps, 0.9cqw border).
            const cell = (92.2 - (n - 1) * 2.2) / n;
            const step = cell + 2.2;
            const next = new Map(preview.cells.map((c) => [`${c.x},${c.y}`, c.next]));
            const k = ((rotation % 4) + 4) % 4;
            const blocks: { r: number; c: number; v: number }[] = [];
            base.forEach((row, r) =>
              row.forEach((on, c) => {
                if (!on) return;
                // Where this block lands after k clockwise quarter-turns: (r, c) -> (c, size-1-r) each turn.
                let rr = r;
                let cc = c;
                for (let i = 0; i < k; i++) [rr, cc] = [cc, size - 1 - rr];
                const v = next.get(`${currentPiece.position.x + cc},${currentPiece.position.y + rr}`);
                if (v !== undefined) blocks.push({ r, c, v });
              })
            );
            return (
              <motion.div
                key={pieceKey}
                className="gp-piece-box pointer-events-none"
                style={{
                  left: `${3 + currentPiece.position.x * step}cqw`,
                  top: `${3 + currentPiece.position.y * step}cqw`,
                  width: `${size * cell + (size - 1) * 2.2}cqw`,
                  height: `${size * cell + (size - 1) * 2.2}cqw`,
                }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              >
                <motion.div
                  key={bumpKey}
                  className="h-full w-full"
                  initial={bumpKey ? { x: 0 } : false}
                  animate={bumpKey ? { x: [0, -5, 5, -3, 0] } : undefined}
                  transition={{ duration: 0.22 }}
                >
                  <motion.div
                    className="grid h-full w-full"
                    style={{ rotate: angle, gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)`, gap: "var(--gp-gap)" }}
                  >
                    {blocks.map(({ r, c, v }) => {
                      const deadly = v >= MAX_CELL_VALUE;
                      // Coloured as the tile it would become, so colour patterns (and clears) read at a glance.
                      const look = TILES[v];
                      return (
                        <div key={`${r},${c}`} className="relative" style={{ gridColumn: c + 1, gridRow: r + 1 }}>
                          {/* The tile turns with the piece; its number and shine turn back so they end upright. */}
                          <div className={cn("gp-piece", deadly && "gp-piece-deadly")} style={{ ["--face" as string]: look.face, color: look.text }}>
                            <motion.div className="gp-piece-face" style={{ rotate: counter }}>
                              <span className="gp-piece-shine" />
                              <span className="gp-num gp-piece-num">{deadly ? "💀" : v}</span>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              </motion.div>
            );
          })()}

          {/* Bursts where tiles were cleared */}
          {bursts.map((b) => (
            <div key={b.id} className="pointer-events-none relative" style={{ ...cellArea(b.x, b.y), zIndex: 4 }}>
              <span className="gp-ring" style={{ ["--c" as string]: b.color }} />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
                const d = 40 + Math.random() * 40;
                return (
                  <motion.span
                    key={i}
                    className="gp-spark"
                    style={{ background: i % 3 === 0 ? "#fff" : b.color }}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 20, scale: 0.2, opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.2, 0.8, 0.4, 1] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Score pops */}
      {scoreAnimations.map((a) => {
        const label = a.bonus ? "Board Clear!" : COMBO_LABEL[a.lines ?? 1];
        const t = TILES[a.clearValue] ?? TILES[1];
        return (
          <motion.div
            key={a.id}
            className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center"
            style={{ top: a.bonus ? "28%" : "38%" }}
            initial={{ scale: 0.3, opacity: 0, y: 10 }}
            animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1, 0], y: [10, 0, -10, -46] }}
            transition={{
              scale: { duration: 0.35, times: [0, 0.6, 1] },
              opacity: { duration: 1.4, times: [0, 0.15, 0.7, 1] },
              y: { duration: 1.4, times: [0, 0.15, 0.7, 1] },
            }}
          >
            {label && <span className={cn("gp-pop-label", a.bonus && "gp-pop-bonus")}>{label}</span>}
            <span className="gp-pop" style={{ ["--c" as string]: a.bonus ? "#FFD45E" : t.face }}>
              +{a.value.toLocaleString()}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

export default GameBoard;
