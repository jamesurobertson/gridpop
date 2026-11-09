/**
 * Text whose digits each sit in an equal-width slot, so a ticking clock doesn't jiggle. The display
 * font has no tabular figures, so `tabular-nums` alone does nothing.
 */
export const SteadyDigits = ({ text }: { text: string }) => (
  <span aria-label={text} className="whitespace-nowrap">
    {[...text].map((char, i) =>
      /\d/.test(char) ? (
        <span key={i} aria-hidden className="inline-block w-[0.56em] text-center">
          {char}
        </span>
      ) : (
        <span key={i} aria-hidden>
          {char}
        </span>
      )
    )}
  </span>
);
