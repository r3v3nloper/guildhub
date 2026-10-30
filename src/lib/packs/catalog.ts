import type { Capabilities, Pack } from "./schema";

export const CATALOG_KINDS = [
  "faction",
  "race",
  "class",
  "spec",
  "profession",
  "recipe",
  "instance",
  "gathering",
  "boss",
  "server",
  "reset_rule",
] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

interface CatalogDefinition {
  packKey: keyof Pick<
    Pack,
    | "factions"
    | "races"
    | "classes"
    | "specs"
    | "professions"
    | "recipes"
    | "instances"
    | "gathering"
    | "bosses"
    | "servers"
    | "reset_rules"
  >;
  /** The capability a catalog belongs to; catalogs without one are always allowed. */
  capability?: keyof Capabilities;
}

export const CATALOG_DEFINITIONS: Record<CatalogKind, CatalogDefinition> = {
  faction: { packKey: "factions", capability: "factions" },
  race: { packKey: "races", capability: "races" },
  class: { packKey: "classes" },
  spec: { packKey: "specs", capability: "classes" },
  profession: { packKey: "professions", capability: "professions" },
  recipe: { packKey: "recipes", capability: "professions" },
  instance: { packKey: "instances" },
  gathering: { packKey: "gathering", capability: "professions" },
  boss: { packKey: "bosses", capability: "lockouts" },
  server: { packKey: "servers", capability: "servers" },
  reset_rule: { packKey: "reset_rules" },
};

export interface PackCatalogEntry {
  key: string;
  name: unknown;
  deprecated: boolean;
  replaces: string[];
  todo: boolean;
  /** Everything kind-specific (role, color, faction, allowed_classes, rule fields …). */
  data: Record<string, unknown>;
}

const LIFECYCLE_KEYS = new Set([
  "id",
  "name",
  "deprecated",
  "replaces",
  "todo",
]);

export function catalogEntriesOf(
  pack: Pack,
  kind: CatalogKind,
): PackCatalogEntry[] {
  const entries = pack[CATALOG_DEFINITIONS[kind].packKey] as Array<
    Record<string, unknown> & {
      id: string;
      deprecated: boolean;
      replaces: string[];
      todo: boolean;
    }
  >;

  return entries.map((entry) => ({
    key: entry.id,
    // Reset rules have no display name; their id is what admins recognise.
    name: entry.name ?? entry.id,
    deprecated: entry.deprecated,
    replaces: entry.replaces,
    todo: entry.todo,
    data: Object.fromEntries(
      Object.entries(entry).filter(([key]) => !LIFECYCLE_KEYS.has(key)),
    ),
  }));
}
