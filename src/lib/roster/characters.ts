import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { NotFoundError } from "@/lib/errors";
import {
  builds,
  characterProfessions,
  characters,
  type BuildStatus,
} from "@/lib/db/schema";
import { deleteCharacterProgress } from "@/lib/tasks/progress";
import { isHttpUrl } from "@/lib/url";
import { detectBuildSource } from "./build-source";
import {
  resolveCharacter,
  type CharacterInput,
  type FieldErrors,
  type PreviousSelection,
} from "./character-rules";
import {
  catalogOfKind,
  isGameEnabled,
  loadGameCatalog,
  type GameCatalog,
} from "./game-catalog";

export type CharacterRow = typeof characters.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;

export type ProfessionRow = typeof characterProfessions.$inferSelect;

export interface CharacterDetails extends CharacterRow {
  professionEntryIds: number[];
  professions: ProfessionRow[];
  builds: BuildRow[];
}

export type SaveResult =
  { ok: true; characterId: number } | { ok: false; errors: FieldErrors };

export function getCharacter(
  db: AppDatabase,
  characterId: number,
): CharacterDetails | undefined {
  const character = db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();
  if (!character) {
    return undefined;
  }
  const professions = db
    .select()
    .from(characterProfessions)
    .where(eq(characterProfessions.characterId, characterId))
    .all();
  return {
    ...character,
    professionEntryIds: professions.map((row) => row.professionEntryId),
    professions,
    builds: db
      .select()
      .from(builds)
      .where(eq(builds.characterId, characterId))
      .orderBy(asc(builds.status), asc(builds.id))
      .all(),
  };
}

export function listCharactersOfUser(
  db: AppDatabase,
  userId: string,
): CharacterRow[] {
  return db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(asc(characters.gameId), asc(characters.name))
    .all();
}

/** Free-text servers already used in this game, offered as suggestions (SPEC 4.6). */
export function listKnownServers(db: AppDatabase, gameId: string): string[] {
  const names = db
    .selectDistinct({ serverName: characters.serverName })
    .from(characters)
    .where(eq(characters.gameId, gameId))
    .all()
    .map((row) => row.serverName)
    .filter((name): name is string => name !== null);
  return names.sort((a, b) => a.localeCompare(b));
}

export function selectionOf(character: CharacterDetails): PreviousSelection {
  return {
    factionEntryId: character.factionEntryId,
    raceEntryId: character.raceEntryId,
    classEntryId: character.classEntryId,
    serverKey: character.serverKey,
    professionEntryIds: character.professionEntryIds,
  };
}

function ownedCharacter(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
): CharacterDetails {
  const character = getCharacter(db, characterId);
  if (!character) {
    throw new NotFoundError("Charakter");
  }
  assertAllowed(permissions.editOwnData(actor, character.userId));
  return character;
}

function requireCatalog(db: AppDatabase, gameId: string): GameCatalog {
  const catalog = loadGameCatalog(db, gameId);
  if (!catalog) {
    throw new NotFoundError("Spiel");
  }
  return catalog;
}

/** Creates a character, or updates it when `characterId` is given. */
export function saveCharacter(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  input: CharacterInput,
  characterId?: number,
): SaveResult {
  const existing =
    characterId === undefined
      ? undefined
      : ownedCharacter(db, actor, characterId);
  if (!existing) {
    assertAllowed(permissions.editOwnData(actor, actor.userId));
    if (!isGameEnabled(db, actor.guildId, gameId)) {
      throw new NotFoundError("Spiel");
    }
  }

  const catalog = requireCatalog(db, existing?.gameId ?? gameId);
  const resolved = resolveCharacter(
    catalog,
    input,
    existing ? selectionOf(existing) : undefined,
  );
  if (!resolved.ok) {
    return resolved;
  }

  const { professionEntryIds, ...values } = resolved.value;
  values.serverName = establishedServerName(db, catalog.game.id, values);

  const savedId = db.transaction((tx) => {
    const id = existing
      ? tx
          .update(characters)
          .set(values)
          .where(eq(characters.id, existing.id))
          .returning({ id: characters.id })
          .get().id
      : tx
          .insert(characters)
          .values({ ...values, userId: actor.userId, gameId: catalog.game.id })
          .returning({ id: characters.id })
          .get().id;

    if (values.isMain) {
      tx.update(characters)
        .set({ isMain: false })
        .where(
          and(
            eq(characters.userId, actor.userId),
            eq(characters.gameId, catalog.game.id),
            ne(characters.id, id),
          ),
        )
        .run();
    }

    // Retained professions keep their details; only additions and removals change.
    const current = existing?.professionEntryIds ?? [];
    const removed = current.filter(
      (entryId) => !professionEntryIds.includes(entryId),
    );
    if (removed.length > 0) {
      tx.delete(characterProfessions)
        .where(
          and(
            eq(characterProfessions.characterId, id),
            inArray(characterProfessions.professionEntryId, removed),
          ),
        )
        .run();
    }
    for (const entryId of professionEntryIds.filter(
      (e) => !current.includes(e),
    )) {
      tx.insert(characterProfessions)
        .values({ characterId: id, professionEntryId: entryId })
        .run();
    }
    return id;
  });

  return { ok: true, characterId: savedId };
}

/**
 * Free-text servers show the spelling of whoever entered the server first in this game,
 * so "Thunderstrike" and "thunderstrike " end up as one server with one name (SPEC 4.6).
 */
function establishedServerName(
  db: AppDatabase,
  gameId: string,
  values: { serverKey: string | null; serverName: string | null },
): string | null {
  if (values.serverKey === null || values.serverName === null) {
    return values.serverName;
  }
  const first = db
    .select({ serverName: characters.serverName })
    .from(characters)
    .where(
      and(
        eq(characters.gameId, gameId),
        eq(characters.serverKey, values.serverKey),
      ),
    )
    .orderBy(asc(characters.id))
    .get();
  return first?.serverName ?? values.serverName;
}

export function deleteCharacter(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
): void {
  ownedCharacter(db, actor, characterId);
  db.transaction((tx) => {
    deleteCharacterProgress(tx, [characterId]);
    tx.delete(characters).where(eq(characters.id, characterId)).run();
  });
}

export interface BuildInput {
  title: string;
  url: string;
  status: BuildStatus;
  targetClassKey: string;
  notes: string;
}

export type BuildErrors = Partial<Record<keyof BuildInput, string>>;

export type BuildSaveResult = { ok: true } | { ok: false; errors: BuildErrors };

/** Adds a build link, or updates it when `buildId` is given. */
export function saveBuild(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  input: BuildInput,
  buildId?: number,
): BuildSaveResult {
  const character = ownedCharacter(db, actor, characterId);
  const existing = buildId
    ? character.builds.find((build) => build.id === buildId)
    : undefined;
  if (buildId && !existing) {
    throw new NotFoundError("Build");
  }

  const catalog = requireCatalog(db, character.gameId);
  const errors: BuildErrors = {};
  const url = input.url.trim();
  if (url && !isHttpUrl(url)) {
    errors.url = "Bitte einen vollständigen Link (https://…) angeben.";
  }
  const source = url
    ? detectBuildSource(url, catalog.game.meta.buildSources)
    : undefined;
  const title = input.title.trim() || source || "";
  if (!title) {
    errors.title = "Titel oder Link angeben.";
  }

  let targetClassEntryId: number | null = null;
  if (input.status === "planned" && input.targetClassKey) {
    const entry = catalogOfKind(catalog, "class").find(
      (e) => e.key === input.targetClassKey,
    );
    if (
      !entry ||
      (entry.status !== "active" && entry.id !== existing?.targetClassEntryId)
    ) {
      errors.targetClassKey = "Klasse nicht auswählbar.";
    } else {
      targetClassEntryId = entry.id;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const values = {
    title,
    url: url || null,
    source: source ?? null,
    status: input.status,
    targetClassEntryId,
    notes: input.notes.trim() || null,
  };
  if (existing) {
    db.update(builds).set(values).where(eq(builds.id, existing.id)).run();
  } else {
    db.insert(builds)
      .values({ ...values, characterId })
      .run();
  }
  return { ok: true };
}

export function deleteBuild(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  buildId: number,
): void {
  const character = ownedCharacter(db, actor, characterId);
  if (!character.builds.some((build) => build.id === buildId)) {
    throw new NotFoundError("Build");
  }
  db.delete(builds).where(eq(builds.id, buildId)).run();
}

export interface ProfessionDetailsInput {
  skillLevel: number | null;
  specialization: string;
  notes: string;
}

export type ProfessionDetailsErrors = Partial<
  Record<keyof ProfessionDetailsInput, string>
>;

const SKILL_LEVEL_MAX = 10000;
const PROFESSION_TEXT_MAX_LENGTH = 200;

/** Skill, specialisation and notes of a profession the character already has. */
export function saveProfessionDetails(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  professionEntryId: number,
  input: ProfessionDetailsInput,
): { ok: true } | { ok: false; errors: ProfessionDetailsErrors } {
  const character = ownedCharacter(db, actor, characterId);
  if (!character.professionEntryIds.includes(professionEntryId)) {
    throw new NotFoundError("Beruf");
  }

  const errors: ProfessionDetailsErrors = {};
  const { skillLevel } = input;
  if (
    skillLevel !== null &&
    (!Number.isInteger(skillLevel) ||
      skillLevel < 0 ||
      skillLevel > SKILL_LEVEL_MAX)
  ) {
    errors.skillLevel = `Wert zwischen 0 und ${SKILL_LEVEL_MAX}.`;
  }
  const specialization = input.specialization.trim();
  const notes = input.notes.trim();
  if (specialization.length > PROFESSION_TEXT_MAX_LENGTH) {
    errors.specialization = `Höchstens ${PROFESSION_TEXT_MAX_LENGTH} Zeichen.`;
  }
  if (notes.length > PROFESSION_TEXT_MAX_LENGTH) {
    errors.notes = `Höchstens ${PROFESSION_TEXT_MAX_LENGTH} Zeichen.`;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  db.update(characterProfessions)
    .set({
      skillLevel,
      specialization: specialization || null,
      notes: notes || null,
    })
    .where(
      and(
        eq(characterProfessions.characterId, characterId),
        eq(characterProfessions.professionEntryId, professionEntryId),
      ),
    )
    .run();
  return { ok: true };
}
