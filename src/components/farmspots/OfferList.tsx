"use client";

import { useState } from "react";
import type { GatheringOffer } from "@/lib/lists/gathering-offers";
import { de } from "@/i18n/de";
import { OfferChip } from "./bits";

/** Beyond this many a zone (skinning: dozens of beasts) folds the rest away. */
const SHOWN = 12;

/** The offers of a zone as chips; long lists show the first ones and a toggle. */
export function OfferList({ offers }: { offers: GatheringOffer[] }) {
  const [open, setOpen] = useState(false);
  // Keep the locked look-ahead visible: fold only ready offers away.
  const ready = offers.filter((offer) => offer.ready);
  const locked = offers.filter((offer) => !offer.ready);
  const hidden = open ? 0 : Math.max(0, ready.length - SHOWN);
  const shown = [...ready.slice(0, ready.length - hidden), ...locked];
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {shown.map((offer) => (
        <li key={offer.name}>
          <OfferChip offer={offer} />
        </li>
      ))}
      {(hidden > 0 || (open && ready.length > SHOWN)) && (
        <li>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="min-h-8 rounded-full px-2.5 text-[12.5px] font-bold text-accent-strong hover:bg-raised hover:text-white"
          >
            {open ? de.farmSpots.fewerOffers : de.farmSpots.moreOffers(hidden)}
          </button>
        </li>
      )}
    </ul>
  );
}
