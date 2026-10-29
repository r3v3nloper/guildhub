import { eq, inArray } from "drizzle-orm";
import type { AppDatabase, DbExecutor } from "@/lib/db/client";
import { checklistBosses, gameCatalogEntries } from "@/lib/db/schema";
import type { LocalizedString } from "@/lib/packs/schema";
import {
  loadGameCatalog,
  selectableOfKind,
  type CatalogEntry,
} from "@/lib/roster/game-catalog";
import { localize } from "@/i18n/localize";

/** A pack dungeon or raid as a template for a new dungeon page. */
export interface InstanceTemplate {
  entryId: number;
  key: string;
  name: string;
  kind: "dungeon" | "raid";
  players: number | null;
  levelMin: number | null;
  levelMax: number | null;
  bosses: string[];
}

export interface NotableLoot {
  name: string;
  reason: string | null;
  /** Item page with stats and more, at the data source. */
  link: string | null;
}

interface InstanceData {
  kind?: "dungeon" | "raid";
  players?: number;
  level_min?: number;
  level_max?: number;
  bosses?: string[];
  loot?: Array<{ name: LocalizedString; reason?: string; link?: string }>;
}

function toTemplate(entry: CatalogEntry): InstanceTemplate {
  const data = entry.data as InstanceData;
  return {
    entryId: entry.id,
    key: entry.key,
    name: localize(entry.name),
    kind: data.kind ?? "dungeon",
    players: data.players ?? null,
    levelMin: data.level_min ?? null,
    levelMax: data.level_max ?? null,
    bosses: data.bosses ?? [],
  };
}

/** The game's dungeons and raids that new pages can start from, in pack order. */
export function instanceTemplates(
  db: AppDatabase,
  gameId: string,
): InstanceTemplate[] {
  const catalog = loadGameCatalog(db, gameId);
  return catalog ? selectableOfKind(catalog, "instance").map(toTemplate) : [];
}

export function instanceOf(
  db: AppDatabase,
  gameId: string,
  key: string,
): InstanceTemplate | undefined {
  return instanceTemplates(db, gameId).find((instance) => instance.key === key);
}

/** The template's bosses as the page's first bosses, ready for mechanics and loot. */
export function addInstanceBosses(
  db: DbExecutor,
  checklistId: number,
  bosses: readonly string[],
): void {
  if (bosses.length === 0) {
    return;
  }
  db.insert(checklistBosses)
    .values(bosses.map((name, sortOrder) => ({ checklistId, name, sortOrder })))
    .run();
}

/** The notable loot the pack lists for the instance a page started from. */
export function notableLootOf(
  db: DbExecutor,
  instanceEntryId: number | null,
): NotableLoot[] {
  if (instanceEntryId === null) {
    return [];
  }
  const entry = db
    .select()
    .from(gameCatalogEntries)
    .where(eq(gameCatalogEntries.id, instanceEntryId))
    .get();
  const loot = (entry?.data as InstanceData | undefined)?.loot ?? [];
  return loot.map((item) => ({
    name: localize(item.name),
    reason: item.reason ?? null,
    link: item.link ?? null,
  }));
}

/** Kind, size and level of the instances pages started from, e.g. for the list cards. */
export function instancesById(
  db: DbExecutor,
  entryIds: ReadonlyArray<number | null>,
): Map<number, InstanceTemplate> {
  const ids = [...new Set(entryIds.filter((id): id is number => id !== null))];
  if (ids.length === 0) {
    return new Map();
  }
  return new Map(
    db
      .select()
      .from(gameCatalogEntries)
      .where(inArray(gameCatalogEntries.id, ids))
      .all()
      .map((entry) => [entry.id, toTemplate(entry)]),
  );
}
