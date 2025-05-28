import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  label: string;
  children: React.ReactNode;
  initialOpen?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ label, children, initialOpen = false }) => {
  const [open, setOpen] = useState(initialOpen);
  const startY = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);

  // Handle swipe up/down
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    lastY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    lastY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = () => {
    if (startY.current !== null && lastY.current !== null) {
      const delta = startY.current - lastY.current;
      if (!open && delta > 40) setOpen(true); // swipe up to open
      if (open && delta < -40) setOpen(false); // swipe down to close
    }
    startY.current = null;
    lastY.current = null;
  };

  return (
    <>
      {/* Overlay when open */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-20 transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed left-0 right-0 z-40 flex flex-col items-center transition-all duration-300",
          open ? "bottom-0" : "bottom-0"
        )}
        style={{ pointerEvents: "auto" }}
      >
        <div
          className={cn(
            "w-full bg-white rounded-t-2xl flex flex-col items-center transition-all duration-300 shadow-[0_-2px_12px_0_rgba(0,0,0,0.10)]",
            open ? "h-[70vh]" : "h-15"
          )}
          onClick={() => setOpen((v) => !v)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "pan-y", maxWidth: "100vw" }}
        >
          <div className="w-full flex flex-col items-center pt-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
            <div className="font-bold text-lg select-none cursor-pointer pb-2 border-b w-full text-center">{label}</div>
          </div>
          {open && <div className="overflow-y-auto w-full px-4 pt-4 pb-6 flex-1">{children}</div>}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
