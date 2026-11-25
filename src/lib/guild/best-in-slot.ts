import { and, eq, inArray } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { gameCatalogEntries, games } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { BisMode, PackBestInSlot } from "@/lib/packs/schema";
import {
  isGameEnabled,
  type CatalogEntry,
  type GameInfo,
} from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";

// The best gear per spec from the pack (ForeverDB), read per spec as a whole like the
// class abilities: the lists are too large to come along with the game catalog.

type PackList = PackBestInSlot["lists"][number];
type PackSlot = PackList["slots"][number];
type PackItem = NonNullable<PackSlot["best"]>;
type PackEnhancement = PackSlot["enhancements"][number];

export interface BisItem {
  itemId: number;
  name: string;
  quality: number;
  itemLevel: number | null;
  fromLevel: number | null;
  /** 0 for the slot's pick. */
  percentBelowBest: number;
  /** The data source's rating ("easy", "hard" …); null when it gives none. */
  ease: string | null;
  seenInForever: boolean;
  link: string | null;
}

export interface BisEnhancement {
  rank: number;
  name: string;
  kind: string;
  effect: string | null;
  percentBelowBest: number;
  hardToGet: string[];
  /** Localized name of the profession that makes it. */
  profession: string | null;
  skill: number | null;
  materials: Array<{ name: string; count: number }>;
}

export interface BisSlot {
  slot: string;
  best: BisItem | null;
  alternatives: BisItem[];
  enhancements: BisEnhancement[];
}

export interface BisList {
  mode: BisMode;
  level: number;
  weapons: string | null;
  link: string | null;
  slots: BisSlot[];
}

export const BIS_SLOT_GROUPS = [
  "armor",
  "jewelry",
  "weapons",
  "other",
] as const;
export type BisSlotGroup = (typeof BIS_SLOT_GROUPS)[number];

/** Where each slot of the data source belongs; slots it adds later land in "other". */
const GROUP_OF_SLOT: Record<string, BisSlotGroup> = {
  head: "armor",
  shoulder: "armor",
  back: "armor",
  chest: "armor",
  wrist: "armor",
  hands: "armor",
  waist: "armor",
  legs: "armor",
  feet: "armor",
  neck: "jewelry",
  finger1: "jewelry",
  finger2: "jewelry",
  trinket1: "jewelry",
  trinket2: "jewelry",
  main: "weapons",
  off: "weapons",
  ranged: "weapons",
};

/**
 * The slots in groups (armor, jewelry, weapons), so related slots stand together; within
 * a group the list's order is kept. Groups without slots are left out.
 */
export function slotsByGroup(
  slots: readonly BisSlot[],
): Array<{ group: BisSlotGroup; slots: BisSlot[] }> {
  return BIS_SLOT_GROUPS.map((group) => ({
    group,
    slots: slots.filter(
      (slot) => (GROUP_OF_SLOT[slot.slot] ?? "other") === group,
    ),
  })).filter((entry) => entry.slots.length > 0);
}

/** A spec with its class and best in slot lists, for the spec's page. */
export interface SpecBestInSlot {
  game: GameInfo;
  spec: CatalogEntry;
  classEntry: CatalogEntry | undefined;
  lists: BisList[];
}

function itemOf(item: PackItem): BisItem {
  return {
    itemId: item.item,
    name: localize(item.name),
    quality: item.quality,
    itemLevel: item.item_level ?? null,
    fromLevel: item.from_level ?? null,
    percentBelowBest: item.percent_below_best,
    ease: item.ease ?? null,
    seenInForever: item.seen_in_forever,
    link: item.link ?? null,
  };
}

function enhancementOf(
  enhancement: PackEnhancement,
  professionNames: ReadonlyMap<string, string>,
): BisEnhancement {
  return {
    rank: enhancement.rank,
    name: localize(enhancement.name),
    kind: enhancement.kind,
    effect: enhancement.effect ?? null,
    percentBelowBest: enhancement.percent_below_best,
    hardToGet: enhancement.hard_to_get,
    profession: enhancement.profession
      ? (professionNames.get(enhancement.profession) ?? enhancement.profession)
      : null,
    skill: enhancement.skill ?? null,
    materials: enhancement.materials.map((material) => ({
      name: localize(material.name),
      count: material.count,
    })),
  };
}

/** The pack's lists as the page shows them: localized, enchantments by rank, PvE first. */
export function bisListsOf(
  lists: readonly PackList[],
  professionNames: ReadonlyMap<string, string> = new Map(),
): BisList[] {
  const order: BisMode[] = ["pve", "pvp"];
  return [...lists]
    .sort((a, b) => order.indexOf(a.mode) - order.indexOf(b.mode))
    .map((list) => ({
      mode: list.mode,
      level: list.level,
      weapons: list.weapons ?? null,
      link: list.link ?? null,
      slots: list.slots.map((slot) => ({
        slot: slot.slot,
        best: slot.best ? itemOf(slot.best) : null,
        alternatives: slot.alternatives.map(itemOf),
        enhancements: slot.enhancements
          .map((enhancement) => enhancementOf(enhancement, professionNames))
          .sort((a, b) => a.rank - b.rank),
      })),
    }));
}

function activeOfKind(gameIds: readonly string[], kind: CatalogEntry["kind"]) {
  return and(
    inArray(gameCatalogEntries.gameId, [...gameIds]),
    eq(gameCatalogEntries.kind, kind),
    eq(gameCatalogEntries.status, "active"),
  );
}

function activeEntry(
  db: AppDatabase,
  gameId: string,
  kind: CatalogEntry["kind"],
  key: string,
): CatalogEntry | undefined {
  return db
    .select()
    .from(gameCatalogEntries)
    .where(and(activeOfKind([gameId], kind), eq(gameCatalogEntries.key, key)))
    .get();
}

function activeEntries(
  db: AppDatabase,
  gameId: string,
  kind: CatalogEntry["kind"],
): CatalogEntry[] {
  return db
    .select()
    .from(gameCatalogEntries)
    .where(activeOfKind([gameId], kind))
    .all();
}

/** Which specs have a best in slot list, as `gameId:specKey`, without loading the lists. */
export function specsWithBestInSlot(
  db: AppDatabase,
  gameIds: readonly string[],
): Set<string> {
  if (gameIds.length === 0) {
    return new Set();
  }
  const rows = db
    .select({
      gameId: gameCatalogEntries.gameId,
      key: gameCatalogEntries.key,
    })
    .from(gameCatalogEntries)
    .where(activeOfKind(gameIds, "best_in_slot"))
    .all();
  return new Set(rows.map((row) => bestInSlotKey(row.gameId, row.key)));
}

export function bestInSlotKey(gameId: string, specKey: string): string {
  return `${gameId}:${specKey}`;
}

/**
 * A spec's best in slot lists, for members of a guild that plays its game. An unknown spec
 * or one of a game the guild has not enabled is not found; a spec without lists has none.
 */
export function getSpecBestInSlot(
  db: AppDatabase,
  actor: Actor,
  specEntryId: number,
): SpecBestInSlot {
  const spec = db
    .select()
    .from(gameCatalogEntries)
    .where(
      and(
        eq(gameCatalogEntries.id, specEntryId),
        eq(gameCatalogEntries.kind, "spec"),
      ),
    )
    .get();
  if (!spec || !isGameEnabled(db, actor.guildId, spec.gameId)) {
    throw new NotFoundError("Spezialisierung");
  }
  const game = db.select().from(games).where(eq(games.id, spec.gameId)).get();
  if (!game) {
    throw new NotFoundError("Spezialisierung");
  }
  const classEntry = activeEntry(
    db,
    spec.gameId,
    "class",
    String(spec.data.class ?? ""),
  );
  const entry = activeEntry(db, spec.gameId, "best_in_slot", spec.key);
  if (!entry) {
    return { game, spec, classEntry, lists: [] };
  }
  const professionNames = new Map(
    activeEntries(db, spec.gameId, "profession").map((profession) => [
      profession.key,
      localize(profession.name),
    ]),
  );
  const { lists = [] } = entry.data as Pick<PackBestInSlot, "lists">;
  return {
    game,
    spec,
    classEntry,
    lists: bisListsOf(lists, professionNames),
  };
}
