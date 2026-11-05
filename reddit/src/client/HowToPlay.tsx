import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TILES } from "@/utils/gameCellVisuals";

const SEEN_KEY = "gridpop-how-to-play-seen";

/** True until the rules have been shown once in this browser. */
export function firstVisit() {
  try {
    return localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the rules open again next time, which is harmless.
  }
}

const Chip = ({ value }: { value: number }) => (
  <span
    className="font-display inline-grid h-6 w-6 place-items-center rounded-[8px] text-[13px] font-bold"
    style={{ background: TILES[value].face, color: TILES[value].text, border: "2px solid #1F1633" }}
  >
    {TILES[value].label}
  </span>
);

const Rule = ({ chips, children }: { chips: number[]; children: React.ReactNode }) => (
  <li className="flex items-center gap-3">
    <span className="flex w-[78px] shrink-0 gap-1">
      {chips.map((value, i) => (
        <Chip key={i} value={value} />
      ))}
    </span>
    <span>{children}</span>
  </li>
);

export const HowToPlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      className="max-h-[calc(100dvh-24px)] max-w-[min(92vw,384px)] gap-0 overflow-y-auto rounded-[28px] border-[2.5px] border-[#1F1633] bg-white p-5"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogTitle className="font-display text-2xl font-bold">How to play</DialogTitle>
      <DialogDescription className="mt-1 text-sm font-bold text-[color:var(--gp-muted)]">
        Build the target board in as few pieces as you can.
      </DialogDescription>

      <ul className="mt-3 space-y-2.5 text-[14px] font-semibold">
        <Rule chips={[1, 2]}>Every tile a piece covers goes up by one.</Rule>
        <Rule chips={[3, 3, 3]}>A full row or column of one number pops back to empty.</Rule>
        <Rule chips={[6, 7]}>A tile that reaches 7 ends the run.</Rule>
      </ul>

      <div className="mt-3 rounded-2xl bg-[#FBF6EE] px-4 py-2.5 text-[14px] font-semibold">
        <div className="gp-label mb-1.5">Score</div>
        Moves plus restarts. Match the goal for a perfect score; time breaks ties.
      </div>

      <div className="mt-2.5 rounded-2xl bg-[#FBF6EE] px-4 py-2.5 text-[14px] font-semibold">
        <div className="gp-label mb-1.5">Controls</div>
        <div>Drag to move · Tap to place · Double-tap to rotate</div>
        <div className="mt-1 text-[color:var(--gp-muted)]">Keys: arrows move · A / D rotate · Space places</div>
      </div>

      <button className="gp-btn gp-btn-primary mt-3 w-full" onClick={onClose}>
        Play
      </button>
    </DialogContent>
  </Dialog>
);
