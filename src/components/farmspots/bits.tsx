import type { ReactNode } from "react";
import type { ZoneLink } from "@/lib/lists/gathering-guide";
import type { GatheringOffer } from "@/lib/lists/gathering-offers";
import { de } from "@/i18n/de";

/** Small caps heading inside a card ("Jetzt hin"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
      {children}
    </span>
  );
}

/** Green when the skill allows it, grey with the skill it needs otherwise. */
export function OfferChip({ offer }: { offer: GatheringOffer }) {
  const detail =
    offer.chance !== null
      ? de.farmSpots.chance(offer.chance)
      : offer.ready
        ? null
        : offer.skill;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${
        offer.ready ? "bg-success-soft text-success" : "bg-chip text-[#8f88aa]"
      }`}
    >
      {!offer.ready && <i className="pi pi-lock text-[10px]" aria-hidden />}
      {offer.name}
      {detail !== null && (
        <span className="font-medium tabular-nums opacity-80">{detail}</span>
      )}
    </span>
  );
}

/** The zone name, linking to its map at the data source where known. */
export function ZoneName({
  zone,
  className = "",
}: {
  zone: ZoneLink;
  className?: string;
}) {
  if (!zone.link) {
    return <span className={className}>{zone.name}</span>;
  }
  return (
    <a
      href={zone.link}
      target="_blank"
      rel="noopener noreferrer"
      title={de.farmSpots.opensExternally}
      className={`inline-flex items-center gap-1.5 text-accent-strong hover:text-white ${className}`}
    >
      {zone.name}
      <i className="pi pi-external-link text-[10px]" aria-hidden />
    </a>
  );
}
