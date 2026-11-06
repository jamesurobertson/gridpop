import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDate, utcDateKey } from "@/utils/dailyCore";
import { previewDay } from "@/utils/daily";

const dayLink = (date: string) => (date === utcDateKey() ? location.pathname : `${location.pathname}?day=${date}`);

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Shown only with ?day=…: which day is being played early, and links to step through days. */
export const DailyPreviewBar = () => {
  const day = previewDay();
  if (!day) return null;
  return (
    <nav className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-[#1F1633] bg-[#FFD45E] px-1.5 py-1 text-sm font-extrabold text-[#1F1633] shadow-[0_3px_0_#1F1633]">
      <a className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/60" href={dayLink(shiftDate(day, -1))} aria-label="Previous day">
        <ChevronLeft size={18} strokeWidth={3} />
      </a>
      <span className="px-1">Preview · {dayLabel(day)}</span>
      <a className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/60" href={dayLink(shiftDate(day, 1))} aria-label="Next day">
        <ChevronRight size={18} strokeWidth={3} />
      </a>
      <a className="rounded-full px-2 py-0.5 hover:bg-white/60" href={location.pathname}>
        Today
      </a>
    </nav>
  );
};
