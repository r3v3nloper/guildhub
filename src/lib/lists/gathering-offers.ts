import type { GuideZone } from "./gathering-guide";

// Apart from gathering-guide, which reads the database: the skill explorer runs this
// in the browser.

/** Something a zone offers, and whether the skill already allows it. */
export interface GatheringOffer {
  name: string;
  skill: number | null;
  ready: boolean;
  /** Fishing: how likely the catch is, in percent. */
  chance: number | null;
}

/** Locked offers shown after the ready ones, as a look ahead. */
const LOCKED_PREVIEW = 3;

/**
 * What a zone offers at a skill. Nodes (or beasts): all the skill allows, the best
 * (highest skill) first, then the next few still locked; fishing: the likeliest
 * catches, ready once the water allows it.
 */
export function zoneOffers(
  zone: GuideZone,
  skill: number,
  lockedPreview = LOCKED_PREVIEW,
): GatheringOffer[] {
  if (zone.nodes.length > 0) {
    const offers = zone.nodes.map((node) => ({
      name: node.name,
      skill: node.skill,
      ready: node.skill === null || node.skill <= skill,
      chance: null,
    }));
    return [
      ...offers.filter((offer) => offer.ready).reverse(),
      ...offers.filter((offer) => !offer.ready).slice(0, lockedPreview),
    ];
  }
  const ready = (zone.skill ?? 0) <= skill;
  return zone.catches.map((item) => ({
    name: item.name,
    skill: zone.skill,
    ready,
    chance: item.chance,
  }));
}
