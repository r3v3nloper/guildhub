import type { BisSlot, BisSlotGroup as Group } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { BisSlotRow } from "./BisSlotRow";

/** A panel of related slots (armor, jewelry, weapons), one row each. */
export function BisSlotGroup({
  group,
  slots,
}: {
  group: Group;
  slots: BisSlot[];
}) {
  const titleId = `bis-group-${group}`;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface px-4 pt-3.5 pb-1.5"
    >
      <h3
        id={titleId}
        className="text-xs font-bold tracking-[0.1em] text-muted uppercase"
      >
        {de.bestInSlot.groups[group] ?? group}
      </h3>
      <ul className="flex flex-col divide-y divide-border border-t border-border">
        {slots.map((slot) => (
          <BisSlotRow key={slot.slot} slot={slot} />
        ))}
      </ul>
    </section>
  );
}
