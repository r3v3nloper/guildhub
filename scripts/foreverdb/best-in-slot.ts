import {
  BIS_MODES,
  type BisMode,
  type PackBestInSlot,
} from "../../src/lib/packs/schema";
import { API, fetchJson, localized, type ApiName } from "./api";
import { compact } from "./pack-json";

// The best gear per spec from ForeverDB's /bis: which specs it covers, then one request per
// spec and mode. Effect texts and the reasons why something is hard to get are ForeverDB's
// own English words; the API has them in no other language.

export interface ApiBisSpec {
  id: string;
  /** English class name ("Warrior"). */
  class: string;
  /** English spec name ("Arms"). */
  spec: string;
}

interface ApiBisItem extends ApiName {
  itemId: number;
  quality: number;
  itemLevel?: number | null;
  fromLevel?: number | null;
  percentBelowBest?: number | null;
  ease?: string | null;
  seenInForever?: boolean;
  url?: string | null;
}

interface ApiBisMaterial extends ApiName {
  itemId?: number | null;
  count: number;
}

interface ApiBisEnhancement extends ApiName {
  rank: number;
  kind: string;
  effect?: string | null;
  percentBelowBest?: number | null;
  hardToGet?: string[];
  /** English profession name ("Enchanting"). */
  profession?: string | null;
  skill?: number | null;
  spellId?: number | null;
  itemId?: number | null;
  materials?: ApiBisMaterial[];
}

interface ApiBisSlot {
  slot: string;
  best: ApiBisItem | null;
  alternatives?: ApiBisItem[];
  enhancements?: ApiBisEnhancement[];
}

export interface ApiBisList {
  mode: string;
  level: number;
  weapons?: string | null;
  url?: string | null;
  slots: ApiBisSlot[];
}

type BisList = PackBestInSlot["lists"][number];
type BisSlot = BisList["slots"][number];
type BisItem = NonNullable<BisSlot["best"]>;
type BisEnhancement = BisSlot["enhancements"][number];

interface PackSpecRef {
  id: string;
  name: unknown;
  class: string;
}

interface PackNamed {
  id: string;
  name: unknown;
}

/**
 * ForeverDB spec names the pack splits up, by the English names of the pack's specs.
 * ForeverDB has one Feral list; the pack keeps cat and bear apart, so both show it.
 */
const SPEC_ALIASES: Record<string, string[]> = {
  "Feral Combat": ["Feral (Cat)", "Feral (Bear)"],
};

function englishName(name: unknown): string | undefined {
  if (typeof name === "string") {
    return name;
  }
  if (name && typeof name === "object" && "en" in name) {
    return String(name.en);
  }
  return undefined;
}

export interface SpecMatch {
  /** ForeverDB's spec ID, e.g. "hunter-beast-mastery". */
  apiId: string;
  spec: PackSpecRef;
}

/**
 * Pairs the pack's specs with ForeverDB's by the English class and spec names. What has no
 * partner on either side is returned too, so the import can say what it left out.
 */
export function matchSpecs(
  apiSpecs: readonly ApiBisSpec[],
  specs: readonly PackSpecRef[],
  classes: readonly PackNamed[],
): { matches: SpecMatch[]; unmatchedApi: string[]; unmatchedPack: string[] } {
  const classIdByName = new Map(
    classes.map((entry) => [englishName(entry.name), entry.id]),
  );
  const matches: SpecMatch[] = [];
  const unmatchedApi: string[] = [];
  for (const apiSpec of apiSpecs) {
    const classId = classIdByName.get(apiSpec.class);
    const names = SPEC_ALIASES[apiSpec.spec] ?? [apiSpec.spec];
    const found = specs.filter(
      (spec) =>
        spec.class === classId && names.includes(englishName(spec.name) ?? ""),
    );
    if (found.length === 0) {
      unmatchedApi.push(apiSpec.id);
    }
    matches.push(...found.map((spec) => ({ apiId: apiSpec.id, spec })));
  }
  const matched = new Set(matches.map((match) => match.spec.id));
  return {
    matches,
    unmatchedApi,
    unmatchedPack: specs
      .filter((spec) => !matched.has(spec.id))
      .map((spec) => spec.id),
  };
}

/** Null and undefined become absent, as the pack leaves out what it does not know. */
function present<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

function itemOf(item: ApiBisItem): BisItem {
  return {
    item: item.itemId,
    name: localized(item),
    quality: item.quality,
    item_level: present(item.itemLevel),
    from_level: present(item.fromLevel),
    percent_below_best: item.percentBelowBest ?? 0,
    ease: present(item.ease),
    seen_in_forever: item.seenInForever ?? false,
    link: present(item.url),
  };
}

function enhancementOf(
  enhancement: ApiBisEnhancement,
  professionIds: ReadonlyMap<string, string>,
): BisEnhancement {
  return {
    rank: enhancement.rank,
    name: localized(enhancement),
    kind: enhancement.kind,
    effect: present(enhancement.effect),
    percent_below_best: enhancement.percentBelowBest ?? 0,
    hard_to_get: enhancement.hardToGet ?? [],
    profession: enhancement.profession
      ? professionIds.get(enhancement.profession)
      : undefined,
    skill: present(enhancement.skill),
    spell: present(enhancement.spellId),
    item: present(enhancement.itemId),
    materials: (enhancement.materials ?? []).map((material) => ({
      name: localized(material),
      count: material.count,
      item: present(material.itemId),
    })),
  };
}

/**
 * One list as the pack stores it. Professions are matched by their English name; one the
 * pack does not have is left out rather than breaking validation.
 */
export function bisListOf(
  list: ApiBisList,
  mode: BisMode,
  professionIds: ReadonlyMap<string, string>,
): BisList {
  return {
    mode,
    level: list.level,
    weapons: present(list.weapons),
    link: present(list.url),
    slots: list.slots.map((slot) => ({
      slot: slot.slot,
      best: slot.best ? itemOf(slot.best) : null,
      alternatives: (slot.alternatives ?? []).map(itemOf),
      enhancements: (slot.enhancements ?? []).map((enhancement) =>
        enhancementOf(enhancement, professionIds),
      ),
    })),
  };
}

/** An entry without the empty lists the schema fills in anyway, at every level. */
export function compactBestInSlot(
  entry: PackBestInSlot,
): Record<string, unknown> {
  return compact({
    ...entry,
    lists: entry.lists.map((list) =>
      compact({
        ...list,
        slots: list.slots.map((slot) =>
          compact({
            ...slot,
            best: slot.best && compact({ ...slot.best }),
            alternatives: slot.alternatives.map((item) => compact({ ...item })),
            enhancements: slot.enhancements.map((enhancement) =>
              compact({
                ...enhancement,
                materials: enhancement.materials.map((material) =>
                  compact({ ...material }),
                ),
              }),
            ),
          }),
        ),
      }),
    ),
  });
}

/** English profession name → the pack's profession ID. */
export function professionIdsByName(
  professions: readonly PackNamed[],
): Map<string, string> {
  return new Map(
    professions.flatMap((profession) => {
      const name = englishName(profession.name);
      return name ? [[name, profession.id] as const] : [];
    }),
  );
}

/** One entry per pack spec ForeverDB covers, in the pack's spec order, PvE then PvP. */
export async function bestInSlotOf(
  key: string,
  specs: readonly PackSpecRef[],
  classes: readonly PackNamed[],
  professions: readonly PackNamed[],
): Promise<{ entries: PackBestInSlot[]; unmatched: string[] }> {
  const { data: apiSpecs } = await fetchJson<{ data: ApiBisSpec[] }>(
    key,
    `${API}/bis`,
  );
  const { matches, unmatchedApi, unmatchedPack } = matchSpecs(
    apiSpecs,
    specs,
    classes,
  );
  const professionIds = professionIdsByName(professions);
  // Two pack specs can share one ForeverDB list (Feral); it is fetched once.
  const fetched = new Map<string, BisList[]>();
  const entries: PackBestInSlot[] = [];
  for (const spec of specs) {
    const match = matches.find((candidate) => candidate.spec.id === spec.id);
    if (!match) {
      continue;
    }
    let lists = fetched.get(match.apiId);
    if (!lists) {
      lists = [];
      for (const mode of BIS_MODES) {
        const { data } = await fetchJson<{ data: ApiBisList }>(
          key,
          `${API}/bis/${match.apiId}?lang=de&mode=${mode}`,
        );
        lists.push(bisListOf(data, mode, professionIds));
      }
      fetched.set(match.apiId, lists);
    }
    entries.push({
      id: spec.id,
      name: spec.name as PackBestInSlot["name"],
      spec: spec.id,
      lists,
      deprecated: false,
      replaces: [],
      todo: false,
    });
  }
  return {
    entries,
    unmatched: [
      ...unmatchedApi.map((id) => `ForeverDB ${id}`),
      ...unmatchedPack.map((id) => `Pack ${id}`),
    ],
  };
}
