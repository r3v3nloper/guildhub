import { slotsByGroup, type BisList } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { BisLegend } from "./BisLegend";
import { BisSlotGroup } from "./BisSlotGroup";

const texts = de.bestInSlot;

/**
 * A whole best in slot list: what it assumes, the legend, then the slots in groups. On
 * wide screens armor stands on the left, jewelry and weapons on the right; a fixed split
 * keeps groups in place when a row opens.
 */
export function BestInSlotList({ list }: { list: BisList }) {
  const assumptions = [
    texts.level(list.level),
    list.weapons && (texts.weapons[list.weapons] ?? list.weapons),
  ].filter(Boolean);
  const [first, ...rest] = slotsByGroup(list.slots);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>{assumptions.join(" · ")}</span>
          {list.link && (
            <a
              href={list.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-accent-strong hover:text-white"
            >
              {texts.sourcePage}
              <i className="pi pi-external-link text-[10px]" aria-hidden />
            </a>
          )}
        </p>
        <BisLegend />
      </div>
      {first && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <BisSlotGroup group={first.group} slots={first.slots} />
          <div className="flex flex-col gap-4">
            {rest.map((entry) => (
              <BisSlotGroup
                key={entry.group}
                group={entry.group}
                slots={entry.slots}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
