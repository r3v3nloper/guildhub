import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { DomainError, NotFoundError } from "@/lib/errors";
import { builds, characterProfessions, characters } from "@/lib/db/schema";
import { deleteCharacterProgress } from "@/lib/tasks/progress";
import { deleteRecipes, formatRecipeLines, listRecipes } from "./recipes";
import {
  LEVEL_MAX,
  resolveCharacter,
  type CharacterInput,
  type FieldErrors,
  type PreviousSelection,
} from "./character-rules";
import { keyOfEntry } from "./form-options";
import {
  isGameEnabled,
  loadGameCatalog,
  type GameCatalog,
} from "./game-catalog";

export type CharacterRow = typeof characters.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;

export interface ProfessionRow extends Omit<
  typeof characterProfessions.$inferSelect,
  "characterId"
> {
  /** Recipes as edited: one per line, "Name – Notiz". */
  recipes: string;
}

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
  const recipes = listRecipes(db, characterId);
  const professions = db
    .select()
    .from(characterProfessions)
    .where(eq(characterProfessions.characterId, characterId))
    .all()
    .map((profession) => ({
      ...profession,
      recipes: formatRecipeLines(
        recipes.filter(
          (recipe) => recipe.professionEntryId === profession.professionEntryId,
        ),
      ),
    }));
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
    specEntryId: character.specEntryId,
    offSpecEntryId: character.offSpecEntryId,
    serverKey: character.serverKey,
    professionEntryIds: character.professionEntryIds,
  };
}

/** The character, if the actor may change it; shared with builds and professions. */
export function ownedCharacter(
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

export function requireCatalog(
  db: AppDatabase,
  gameId: string,
  options: { withRecipes?: boolean } = {},
): GameCatalog {
  const catalog = loadGameCatalog(db, gameId, options);
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
      deleteRecipes(tx, id, removed);
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
 * Sets which professions the character has, keeping everything else as it is; details
 * of retained professions stay. The same rules apply as for the whole form.
 */
export function setCharacterProfessions(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  professionKeys: string[],
): SaveResult {
  const character = ownedCharacter(db, actor, characterId);
  const catalog = requireCatalog(db, character.gameId);
  const key = (entryId: number | null) => keyOfEntry(catalog, entryId);
  return saveCharacter(
    db,
    actor,
    character.gameId,
    {
      name: character.name,
      server: character.serverName ?? character.serverKey ?? "",
      factionKey: key(character.factionEntryId),
      raceKey: key(character.raceEntryId),
      classKey: key(character.classEntryId),
      specKey: key(character.specEntryId),
      offSpecKey: key(character.offSpecEntryId),
      spec: character.spec ?? "",
      level: character.level,
      isMain: character.isMain,
      notes: character.notes ?? "",
      professionKeys,
    },
    character.id,
  );
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

/**
 * Quick level change from the overview: the same bounds as the editor, without
 * touching anything else of the character.
 */
export function setCharacterLevel(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  level: number,
): void {
  ownedCharacter(db, actor, characterId);
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_MAX) {
    throw new DomainError(`Stufe zwischen 1 und ${LEVEL_MAX}.`);
  }
  db.update(characters)
    .set({ level })
    .where(eq(characters.id, characterId))
    .run();
}
