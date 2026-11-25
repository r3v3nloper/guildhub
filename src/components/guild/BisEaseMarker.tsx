import { de } from "@/i18n/de";

const texts = de.bestInSlot;
const DOTS = [1, 2, 3] as const;

/**
 * How hard an item is to get, as up to three filled dots in one muted tone, so it does
 * not compete with the item colours. The words stay available to screen readers.
 */
export function BisEaseMarker({ ease }: { ease: string | null }) {
  if (!ease) {
    return null;
  }
  const known = texts.ease[ease];
  const label = known?.label ?? texts.easeUnknown;
  return (
    <span
      title={label}
      className="inline-flex w-6 shrink-0 items-center justify-end gap-0.5"
    >
      {known ? (
        DOTS.map((dot) => (
          <span
            key={dot}
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${dot <= known.dots ? "bg-soft" : "bg-muted/35"}`}
          />
        ))
      ) : (
        <span aria-hidden className="text-[11px] font-bold text-muted">
          ?
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
