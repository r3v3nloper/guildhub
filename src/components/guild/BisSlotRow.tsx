import type { BisSlot } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { BisEaseMarker } from "./BisEaseMarker";
import { BisItemName } from "./BisItemName";
import { BisSlotDetails } from "./BisSlotDetails";

const texts = de.bestInSlot;

/**
 * One slot as a row: its label and the pick, with item level and effort on the right.
 * Opening the row shows the alternatives and enchantments; an empty slot is a muted line.
 */
export function BisSlotRow({ slot }: { slot: BisSlot }) {
  const label = texts.slots[slot.slot] ?? slot.slot;
  const { best } = slot;

  if (!best) {
    return (
      <li className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
        <SlotLabel label={label} />
        <span className="text-sm text-muted">
          {texts.emptySlot} · {texts.emptySlotHint}
        </span>
      </li>
    );
  }

  return (
    <li>
      <details className="group">
        <summary className="-mx-2 flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-2 hover:bg-raised [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <SlotLabel label={label} />
            <BisItemName item={best} primary />
          </span>
          {best.itemLevel !== null && (
            <span
              className="shrink-0 text-xs text-muted tabular-nums"
              title={texts.itemLevel(best.itemLevel)}
            >
              {texts.itemLevelShort(best.itemLevel)}
            </span>
          )}
          <BisEaseMarker ease={best.ease} />
          <i
            className="pi pi-chevron-down shrink-0 text-[10px] text-muted transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        {/* Indented by the label width (w-28) and the gap, so details line up under the name. */}
        <div className="pb-3 sm:pl-[calc(7rem+0.75rem)]">
          <BisSlotDetails slot={slot} best={best} />
        </div>
      </details>
    </li>
  );
}

function SlotLabel({ label }: { label: string }) {
  return (
    <span className="shrink-0 text-xs font-semibold text-muted sm:w-28">
      {label}
    </span>
  );
}
