"use client";

import { useState } from "react";
import type { ZoneLink } from "@/lib/lists/gathering-guide";
import type { GatheringOffer } from "@/lib/lists/gathering-offers";
import { de } from "@/i18n/de";
import { SectionLabel } from "./bits";
import { OfferList } from "./OfferList";

/**
 * "Jetzt hin": the recommended zones to pick from (the first is preselected), and what
 * the picked one offers. The map at the data source opens from its own icon beside
 * the name, so picking a zone never leaves the page.
 */
export function ZonePicker({
  zones,
  offers,
}: {
  zones: ZoneLink[];
  offers: Record<string, GatheringOffer[]>;
}) {
  const [picked, setPicked] = useState(zones[0].name);
  const shown = offers[picked] ?? [];
  return (
    <>
      <div className="flex flex-col gap-2">
        <SectionLabel>{de.farmSpots.goNow}</SectionLabel>
        <ul className="flex flex-wrap gap-1.5">
          {zones.map((zone) => (
            <li key={zone.name}>
              <ZonePill
                zone={zone}
                active={zone.name === picked}
                onPick={() => setPicked(zone.name)}
              />
            </li>
          ))}
        </ul>
      </div>
      {shown.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>{de.farmSpots.offersIn(picked)}</SectionLabel>
          <OfferList key={picked} offers={shown} />
        </div>
      )}
    </>
  );
}

function ZonePill({
  zone,
  active,
  onPick,
}: {
  zone: ZoneLink;
  active: boolean;
  onPick: () => void;
}) {
  const tone = active
    ? "border-[#6e58c8] bg-accent-soft text-white"
    : "border-[#2c2645] bg-raised text-foreground hover:border-[#3a3358]";
  return (
    <span className={`flex min-h-10 items-stretch rounded-xl border ${tone}`}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onPick}
        className={`flex items-center rounded-xl px-3.5 text-sm ${
          active ? "font-bold" : "font-semibold"
        } ${zone.link ? "pr-2" : ""}`}
      >
        {zone.name}
      </button>
      {zone.link && (
        <a
          href={zone.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={de.farmSpots.mapOf(zone.name)}
          title={de.farmSpots.opensExternally}
          className="flex w-9 items-center justify-center rounded-r-xl border-l border-[#2c2645] text-muted hover:bg-chip hover:text-white"
        >
          <i className="pi pi-external-link text-[11px]" aria-hidden />
        </a>
      )}
    </span>
  );
}
