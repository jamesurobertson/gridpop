import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  children: React.ReactNode;
  label: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ children, label }) => {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState<number>(0);
  const touchStartY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (sheetRef.current) {
      setSheetHeight(sheetRef.current.offsetHeight);
    }
    // Enable transitions after initial mount
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [children]);

  // Calculate the closed position: fully hidden except for header (~60px)
  const closedY = sheetHeight - 60; // adjust if header height differs

  // Reset scroll position when sheet is closed
  useEffect(() => {
    if (!open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open]);

  // Prevent body scroll when bottom sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    currentY.current = open ? 0 : closedY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    const newY = Math.max(0, Math.min(closedY, currentY.current + deltaY));

    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${newY}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchY = e.changedTouches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    const threshold = 50; // Minimum distance to trigger open/close

    if (Math.abs(deltaY) > threshold) {
      setOpen(deltaY < 0); // Open if swiped up, close if swiped down
    } else {
      setOpen(open); // Return to previous state if threshold not met
    }
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      {/* top is bottom of screen - 60px */}
      <div
        ref={sheetRef}
        className={cn(`fixed left-0 bottom-0 right-0 z-40 flex justify-center pointer-events-auto transition-transform duration-500 ease-in-out`,
          open ? 'translate-y-0' : 'translate-y-[calc(100%-59px)]'
        )}
        style={{
          touchAction: "none",
          // top: `${window.innerHeight - 60}px`,
        }}
      >
        <div
          className="w-full max-w-md bg-white rounded-t-2xl shadow-[0_-2px_12px_0_rgba(0,0,0,0.10)] flex flex-col items-center max-h-[70vh]"
          style={{ maxWidth: "100vw" }}
        >
          {/* Header */}
          <div
            className="w-full flex flex-col items-center pt-2 cursor-pointer"
            onClick={() => setOpen(!open)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
            <div className="font-bold text-lg select-none pb-2 border-b w-full text-center">
              {label}
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="overflow-y-auto w-full px-4 pt-4 pb-6 flex-1 overscroll-contain"
            onTouchMove={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div >
    </>
  );
};

export default BottomSheet;
