import { localize } from "@/i18n/localize";
import type { CatalogStatus } from "@/lib/db/schema";
import type { CatalogKind } from "@/lib/packs/catalog";
import { catalogOfKind, type GameCatalog } from "./game-catalog";

/** A catalog entry as the client-side forms need it: serialisable and already localised. */
export interface CatalogOption {
  key: string;
  label: string;
  status: CatalogStatus;
  todo: boolean;
  color?: string;
  role?: string;
  /** Classes: factions that may play them (empty = all). */
  factions: string[];
  /** Races: their faction. */
  faction?: string;
  /** Races: classes they may be (empty = all). */
  allowedClasses: string[];
  /** Professions: primary, secondary or gathering. */
  professionKind?: string;
}

export interface CharacterFormOptions {
  capabilities: GameCatalog["game"]["meta"]["capabilities"];
  characterLabel: string;
  serverLabel: string;
  factions: CatalogOption[];
  races: CatalogOption[];
  classes: CatalogOption[];
  professions: CatalogOption[];
  servers: CatalogOption[];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * Active entries are offered; a deprecated or removed entry only shows up when it is the
 * current value, so editing does not silently drop it (SPEC 6.5 B).
 */
export function optionsOfKind(
  catalog: GameCatalog,
  kind: CatalogKind,
  selectedIds: readonly number[] = [],
): CatalogOption[] {
  return catalogOfKind(catalog, kind)
    .filter(
      (entry) => entry.status === "active" || selectedIds.includes(entry.id),
    )
    .map((entry) => {
      const data = entry.data;
      return {
        key: entry.key,
        label: localize(entry.name),
        status: entry.status,
        todo: entry.todo,
        color: typeof data.color === "string" ? data.color : undefined,
        role: typeof data.role === "string" ? data.role : undefined,
        factions: stringList(data.factions),
        faction: typeof data.faction === "string" ? data.faction : undefined,
        allowedClasses: stringList(data.allowed_classes),
        professionKind: typeof data.kind === "string" ? data.kind : undefined,
      };
    });
}

export function characterFormOptions(
  catalog: GameCatalog,
  selectedIds: readonly number[] = [],
): CharacterFormOptions {
  const meta = catalog.game.meta;
  return {
    capabilities: meta.capabilities,
    characterLabel: localize(meta.characterLabel),
    serverLabel: localize(meta.serverLabel),
    factions: optionsOfKind(catalog, "faction", selectedIds),
    races: optionsOfKind(catalog, "race", selectedIds),
    classes: optionsOfKind(catalog, "class", selectedIds),
    professions: optionsOfKind(catalog, "profession", selectedIds),
    servers: optionsOfKind(catalog, "server"),
  };
}

export function keyOfEntry(
  catalog: GameCatalog,
  entryId: number | null,
): string {
  if (entryId === null) {
    return "";
  }
  return catalog.entries.find((entry) => entry.id === entryId)?.key ?? "";
}
