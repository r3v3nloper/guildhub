import { de } from "@/i18n/de";

const texts = de.bestInSlot;

/**
 * What the eye and the dots mean, once above the list: touch screens cannot show the
 * tooltips the markers carry.
 */
export function BisLegend() {
  return (
    <p
      aria-label={texts.legendLabel}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"
    >
      <span className="inline-flex items-center gap-1.5">
        <i className="pi pi-eye text-[11px]" aria-hidden />
        {texts.seenInForever}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex gap-0.5" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-soft" />
          <span className="h-1.5 w-1.5 rounded-full bg-soft" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted/35" />
        </span>
        {texts.legendEase}
      </span>
      <span>{texts.sourceNote}</span>
    </p>
  );
}
