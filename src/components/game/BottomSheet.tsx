import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  children: React.ReactNode;
  label: string;
}

/** Height of the bar that stays visible when the sheet is closed. */
const PEEK = 58;
const SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 } as const;

/**
 * A drawer that peeks up from the bottom of the screen. Drag the bar (or tap it) to open; flick,
 * drag down, tap the backdrop or press Escape to close. Only the bar starts a drag, so the
 * content can scroll normally.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ children, label }) => {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(0);
  /** iPhone home-indicator strip: the closed bar sits above it. */
  const [safeBottom, setSafeBottom] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const closedY = Math.max(0, height - PEEK - safeBottom);
  const y = useMotionValue(10000);
  // The backdrop darkens as the sheet comes up.
  const backdrop = useTransform(y, [closedY, 0], [0, 1]);
  const dragged = useRef(false);

  // Track the sheet's real height (fonts, rotation and content changes all move it).
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const measure = () => {
      setHeight(el.offsetHeight);
      setSafeBottom(probe.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      probe.remove();
    };
  }, []);

  // Glide to wherever the sheet should be.
  useEffect(() => {
    if (!height) return;
    const target = open ? 0 : closedY;
    // The very first placement is instant, so the bar doesn't fly up on load.
    if (y.get() > height) y.set(target);
    else void animate(y, target, SPRING);
  }, [open, closedY, height, y]);

  // While open: Escape closes, the page behind stays put, and the content starts at the top.
  useEffect(() => {
    if (!open) {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // A flick decides by direction; a slow drag by how far it got.
    const flick = Math.abs(info.velocity.y) > 400;
    const next = flick ? info.velocity.y < 0 : y.get() < closedY / 2;
    if (next === open) void animate(y, next ? 0 : closedY, SPRING);
    setOpen(next);
  };

  return (
    <>
      <motion.div
        className={cn("fixed inset-0 z-30 bg-[#2E2346]/45", !open && "pointer-events-none")}
        style={{ opacity: backdrop }}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal={open}
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[78dvh] w-full max-w-md flex-col rounded-t-[26px] border-[2.5px] border-b-0 border-[#1F1633] bg-white"
        style={{ y, visibility: height ? "visible" : "hidden" }}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: closedY }}
        dragElastic={{ top: 0.04, bottom: 0.2 }}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
      >
        <button
          className="flex w-full shrink-0 touch-none select-none flex-col items-center rounded-t-[24px] px-5 pb-3 pt-2 outline-none focus-visible:bg-[#F6EEE2]"
          style={{ height: PEEK }}
          aria-expanded={open}
          onPointerDown={(e) => {
            dragged.current = false;
            controls.start(e);
          }}
          onClick={() => {
            // A drag also ends in a click; only a real tap toggles.
            if (!dragged.current) setOpen((o) => !o);
          }}
        >
          <span className="mb-2 h-1.5 w-10 rounded-full bg-[#D9CBB8]" />
          <span className="font-display flex items-center gap-1.5 text-[17px] font-bold">
            {label}
            <ChevronUp size={18} strokeWidth={3} className={cn("transition-transform duration-300", open && "rotate-180")} />
          </span>
        </button>
        <div
          ref={contentRef}
          className={cn("min-h-0 flex-1 overscroll-contain border-t border-[color:var(--gp-line)] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4", open ? "overflow-y-auto" : "overflow-hidden")}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
};

export default BottomSheet;
