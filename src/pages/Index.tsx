import GridPopGame from "@/components/game/GridPopGame";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomSheet from "@/components/game/BottomSheet";
import { TILES } from "@/utils/gameCellVisuals";

/** A little game tile for the rules. */
const Chip = ({ v }: { v: number }) => {
  const t = TILES[v];
  return (
    <span
      className="font-display inline-grid h-7 w-7 place-items-center rounded-[9px] text-sm font-bold align-middle"
      style={{ background: t.face, color: t.text, boxShadow: `0 2px 0 ${t.edge}` }}
    >
      {t.label}
    </span>
  );
};

const Rule = ({ chips, children }: { chips: number[]; children: React.ReactNode }) => (
  <li className="flex items-center gap-3">
    <span className="flex shrink-0 gap-1">
      {chips.map((v, i) => (
        <Chip key={i} v={v} />
      ))}
    </span>
    <span>{children}</span>
  </li>
);

const HowToPlayContent = ({ isMobile }: { isMobile: boolean }) => (
  <div className="grid gap-6 text-[15px] font-semibold md:grid-cols-[1.3fr_1fr]">
    <section>
      <h3 className="gp-label mb-3">Rules</h3>
      <ul className="space-y-3">
        <Rule chips={[1, 2]}>Every tile a piece covers goes up by one.</Rule>
        <Rule chips={[3, 3, 3]}>A row or column of the same number pops. Bigger numbers score more.</Rule>
        <Rule chips={[6, 7]}>Let any tile reach 7 and it's game over.</Rule>
      </ul>
      <p className="mt-4 text-sm text-[color:var(--gp-muted)]">Pop several lines at once for a combo, and clear the whole board for a big bonus.</p>
    </section>
    <section>
      <h3 className="gp-label mb-3">Controls</h3>
      {isMobile ? (
        <ul className="space-y-1.5">
          <li><b>Drag</b> to move the piece</li>
          <li><b>Tap</b> to place it</li>
          <li><b>Double-tap</b> to rotate</li>
          <li><b>Tap Hold</b> to swap it out</li>
        </ul>
      ) : (
        <ul className="space-y-1.5">
          <li><Key>←</Key><Key>→</Key><Key>↑</Key><Key>↓</Key> move</li>
          <li><Key>A</Key><Key>D</Key> rotate</li>
          <li><Key>Space</Key> place</li>
          <li><Key>S</Key> hold</li>
          <li className="pt-1 text-sm text-[color:var(--gp-muted)]">Change keys in Options.</li>
        </ul>
      )}
    </section>
  </div>
);

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="mr-1 inline-grid min-w-[26px] place-items-center rounded-lg bg-[#F6EEE2] px-1.5 py-0.5 font-sans text-xs font-extrabold shadow-[0_2px_0_var(--gp-line)]">
    {children}
  </kbd>
);

const Index = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <main className="flex flex-1 flex-col">
        <GridPopGame />
      </main>
      {isMobile ? (
        <BottomSheet label="How to play">
          <HowToPlayContent isMobile />
        </BottomSheet>
      ) : (
        <>
          <section className="gp-card mx-auto mb-8 w-full max-w-[872px] px-8 py-7">
            <h2 className="font-display mb-5 text-2xl font-bold">How to play</h2>
            <HowToPlayContent isMobile={false} />
          </section>
          <footer className="pb-8 text-center text-sm font-bold text-[color:var(--gp-muted)]">A puzzle game where strategy meets speed.</footer>
        </>
      )}
    </div>
  );
};

export default Index;
