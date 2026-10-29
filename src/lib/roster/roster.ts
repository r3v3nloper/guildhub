import { and, eq, inArray } from "drizzle-orm";
import { localize } from "@/i18n/localize";
import { listMembers, type MemberView } from "@/lib/auth/membership";
import type { AppDatabase } from "@/lib/db/client";
import {
  builds,
  characterProfessions,
  characters,
  gameCatalogEntries,
  type CatalogStatus,
} from "@/lib/db/schema";
import type { LocalizedString } from "@/lib/packs/schema";
import { listEnabledGames } from "./game-catalog";

export interface RosterEntryRef {
  key: string;
  name: LocalizedString;
  status: CatalogStatus;
  color?: string;
  role?: string;
}

export interface RosterProfession extends RosterEntryRef {
  skillLevel: number | null;
  specialization: string | null;
}

export interface RosterCharacter {
  id: number;
  gameId: string;
  name: string;
  level: number | null;
  spec: string | null;
  isMain: boolean;
  server: string | null;
  faction: RosterEntryRef | null;
  race: RosterEntryRef | null;
  characterClass: RosterEntryRef | null;
  mainSpec: RosterEntryRef | null;
  offSpec: RosterEntryRef | null;
  /** From the main spec where the game has specs, otherwise from the class. */
  role: string | null;
  professions: RosterProfession[];
  currentBuild: {
    title: string;
    url: string | null;
    source: string | null;
  } | null;
  plannedClass: RosterEntryRef | null;
}

/** A character of a game with specs that has not picked one yet. */
export const UNKNOWN_ROLE = "unknown";

export interface RosterMember {
  userId: string;
  name: string | null;
  image: string | null;
  role: MemberView["role"];
  status: MemberView["status"];
  characters: RosterCharacter[];
}

export interface RosterFilters {
  gameId?: string;
  classKey?: string;
  role?: string;
  professionKey?: string;
  factionKey?: string;
  showFormer?: boolean;
}

export interface Distribution {
  key: string;
  label: LocalizedString;
  color?: string;
  count: number;
}

export interface Roster {
  members: RosterMember[];
  classes: Distribution[];
  roles: Distribution[];
}

/**
 * Every guild member with all characters in enabled games; filtering happens in memory.
 * `onlyUserId` limits both members and the character query to one person.
 */
export function loadRosterMembers(
  db: AppDatabase,
  guildId: number,
  onlyUserId?: string,
): RosterMember[] {
  const enabledGameIds = listEnabledGames(db, guildId).map((game) => game.id);
  const members = listMembers(db, guildId).filter(
    (member) => !onlyUserId || member.userId === onlyUserId,
  );
  if (members.length === 0 || enabledGameIds.length === 0) {
    return members.map((member) => ({
      ...memberFields(member),
      characters: [],
    }));
  }

  const characterRows = db
    .select()
    .from(characters)
    .where(
      and(
        inArray(characters.gameId, enabledGameIds),
        onlyUserId ? eq(characters.userId, onlyUserId) : undefined,
      ),
    )
    .all();
  const characterIds = characterRows.map((row) => row.id);
  const entries = new Map(
    db
      .select()
      .from(gameCatalogEntries)
      .where(inArray(gameCatalogEntries.gameId, enabledGameIds))
      .all()
      .map((entry) => [entry.id, entry]),
  );
  const professionRows = characterIds.length
    ? db
        .select()
        .from(characterProfessions)
        .where(inArray(characterProfessions.characterId, characterIds))
        .all()
    : [];
  const buildRows = characterIds.length
    ? db
        .select()
        .from(builds)
        .where(inArray(builds.characterId, characterIds))
        .all()
    : [];

  const gamesWithSpecs = new Set(
    [...entries.values()]
      .filter((entry) => entry.kind === "spec")
      .map((entry) => entry.gameId),
  );

  const ref = (entryId: number | null): RosterEntryRef | null => {
    const entry = entryId === null ? undefined : entries.get(entryId);
    if (!entry) {
      return null;
    }
    const { color, role } = entry.data as { color?: string; role?: string };
    return {
      key: entry.key,
      name: entry.name,
      status: entry.status,
      color,
      role,
    };
  };

  const toRosterCharacter = (
    row: (typeof characterRows)[number],
  ): RosterCharacter => {
    const characterBuilds = buildRows.filter(
      (build) => build.characterId === row.id,
    );
    const current = characterBuilds.find((build) => build.status === "current");
    const planned = characterBuilds.find(
      (build) =>
        build.status === "planned" && build.targetClassEntryId !== null,
    );
    const characterClass = ref(row.classEntryId);
    const mainSpec = ref(row.specEntryId);
    return {
      id: row.id,
      gameId: row.gameId,
      name: row.name,
      level: row.level,
      spec: row.spec,
      isMain: row.isMain,
      server:
        row.serverName ??
        serverNameFromCatalog(entries, row.gameId, row.serverKey),
      faction: ref(row.factionEntryId),
      race: ref(row.raceEntryId),
      characterClass,
      mainSpec,
      offSpec: ref(row.offSpecEntryId),
      role: gamesWithSpecs.has(row.gameId)
        ? (mainSpec?.role ?? UNKNOWN_ROLE)
        : (characterClass?.role ?? null),
      professions: professionRows
        .filter((profession) => profession.characterId === row.id)
        .flatMap((profession) => {
          const entry = ref(profession.professionEntryId);
          return entry
            ? [
                {
                  ...entry,
                  skillLevel: profession.skillLevel,
                  specialization: profession.specialization,
                },
              ]
            : [];
        }),
      currentBuild: current
        ? { title: current.title, url: current.url, source: current.source }
        : null,
      plannedClass: ref(planned?.targetClassEntryId ?? null),
    };
  };

  return members.map((member) => ({
    ...memberFields(member),
    characters: characterRows
      .filter((row) => row.userId === member.userId)
      .sort(
        (a, b) =>
          Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name),
      )
      .map(toRosterCharacter),
  }));
}

function memberFields(member: MemberView): Omit<RosterMember, "characters"> {
  return {
    userId: member.userId,
    name: member.name,
    image: member.image,
    role: member.role,
    status: member.status,
  };
}

function serverNameFromCatalog(
  entries: Map<number, typeof gameCatalogEntries.$inferSelect>,
  gameId: string,
  serverKey: string | null,
): string | null {
  if (serverKey === null) {
    return null;
  }
  for (const entry of entries.values()) {
    if (
      entry.gameId === gameId &&
      entry.kind === "server" &&
      entry.key === serverKey
    ) {
      return localize(entry.name);
    }
  }
  return serverKey;
}

/** Removed catalog entries are grouped under one "Veraltet" filter value (SPEC 6.5 B). */
export const OUTDATED_FILTER_KEY = "__veraltet";

function matchesRef(
  ref: RosterEntryRef | null,
  key: string | undefined,
): boolean {
  if (!key) {
    return true;
  }
  if (key === OUTDATED_FILTER_KEY) {
    return ref?.status === "removed";
  }
  return ref?.key === key;
}

export function filterRoster(
  members: RosterMember[],
  filters: RosterFilters,
): Roster {
  const characterFilterActive = Boolean(
    filters.classKey ||
    filters.role ||
    filters.professionKey ||
    filters.factionKey,
  );

  const filtered = members
    .filter((member) => filters.showFormer || member.status === "active")
    .map((member) => ({
      ...member,
      characters: member.characters.filter(
        (character) =>
          (!filters.gameId || character.gameId === filters.gameId) &&
          matchesRef(character.characterClass, filters.classKey) &&
          matchesRef(character.faction, filters.factionKey) &&
          (!filters.role || character.role === filters.role) &&
          (!filters.professionKey ||
            character.professions.some((profession) =>
              matchesRef(profession, filters.professionKey),
            )),
      ),
    }))
    .filter((member) => !characterFilterActive || member.characters.length > 0);

  const allCharacters = filtered.flatMap((member) => member.characters);
  return {
    members: filtered,
    classes: countBy(allCharacters, (character) =>
      character.characterClass
        ? {
            key: `${character.gameId}:${character.characterClass.key}`,
            label: character.characterClass.name,
            color: character.characterClass.color,
          }
        : undefined,
    ),
    roles: countBy(allCharacters, (character) =>
      character.role
        ? { key: character.role, label: character.role }
        : undefined,
    ),
  };
}

function countBy(
  items: RosterCharacter[],
  keyOf: (item: RosterCharacter) => Omit<Distribution, "count"> | undefined,
): Distribution[] {
  const counts = new Map<string, Distribution>();
  for (const item of items) {
    const group = keyOf(item);
    if (!group) {
      continue;
    }
    const existing = counts.get(group.key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(group.key, { ...group, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
