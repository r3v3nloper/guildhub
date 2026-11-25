import type { BisItem } from "@/lib/guild/best-in-slot";
import { de } from "@/i18n/de";
import { qualityColor } from "./item-quality";

const texts = de.bestInSlot;

/**
 * An item's name in its quality colour, the "seen in Forever" eye beside it. Only the
 * slot's pick is set in bold; linked names open the item at the data source.
 */
export function BisItemName({
  item,
  primary = false,
  linked = false,
}: {
  item: BisItem;
  primary?: boolean;
  linked?: boolean;
}) {
  const className = `${primary ? "font-semibold" : "font-normal"} text-sm`;
  const style = { color: qualityColor(item.quality) };
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      {linked && item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} hover:underline`}
          style={style}
        >
          {item.name}
        </a>
      ) : (
        <span className={className} style={style}>
          {item.name}
        </span>
      )}
      {item.seenInForever && (
        <i
          className="pi pi-eye shrink-0 text-[11px] text-muted"
          title={texts.seenInForever}
          aria-label={texts.seenInForever}
        />
      )}
    </span>
  );
}
