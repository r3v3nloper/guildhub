import { de } from "@/i18n/de";

const texts = de.bestInSlot;

/** How far behind the pick, right-aligned so numbers form a column. */
export function BisBelowBest({ percent }: { percent: number }) {
  return (
    <span
      className="shrink-0 text-right text-xs text-muted tabular-nums"
      title={texts.belowBestLabel(percent)}
    >
      {texts.belowBest(percent)}
      <span className="sr-only"> ({texts.belowBestLabel(percent)})</span>
    </span>
  );
}
