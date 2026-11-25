import { and, eq, inArray, ne } from "drizzle-orm";
import { localize } from "@/i18n/localize";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import {
  characterProfessions,
  characters,
  recipeEntries,
} from "@/lib/db/schema";
import { DomainError } from "@/lib/errors";
import type { CharacterInput } from "@/lib/roster/character-rules";
import {
  getCharacter,
  saveCharacter,
  type CharacterDetails,
} from "@/lib/roster/characters";
import { keyOfEntry } from "@/lib/roster/form-options";
import type { GameCatalog } from "@/lib/roster/game-catalog";
import { linkedRecipeIds } from "@/lib/roster/recipes";
import { requireAddonCatalog } from "./addon-catalog";
import { decodeAddonString } from "./addon-string";
import {
  parseCharacterExport,
  type ExportedCharacter,
  type ExportedRequestAction,
} from "./export-payload";
import {
  applyRequestActions,
  previewRequestActions,
  type RequestActionOutcome,
} from "./request-actions";
import {
  previewCharacterImport,
  type CharacterPreview,
  type ForeignCharacter,
  type OwnCharacterState,
} from "./import-preview";
import { assignRelayedAccounts, type SkipReason } from "./relayed-accounts";
import { characterNameKey } from "./character-name";

// Reading a character export into GuildHub (SPEC 7.3): the preview first, then applying
// it. Applying never trusts a preview sent back by the browser; it works the export out
// again against the current state and writes only what the member ticked.

/** A character of the preview, with the member it is imported for when not the actor. */
export type ImportCharacter = CharacterPreview & { memberName: string | null };

export type ImportRequestAction = RequestActionOutcome & {
  memberName: string | null;
};

/** A block passed on in the game that the import leaves out (SPEC 7.3.3). */
export interface SkippedAccount {
  characterNames: string[];
  reason: SkipReason;
}

export type CharacterImportPreview =
  | {
      ok: true;
      characters: ImportCharacter[];
      requestActions: ImportRequestAction[];
      skippedAccounts: SkippedAccount[];
    }
  | { ok: false; error: string };

export interface ImportChoices {
  /** Keys (previewKey) of new characters to create. */
  create: string[];
  /** Per character key, professions the game no longer has that are to be dropped. */
  dropProfessions: Record<string, number[]>;
}

export interface ImportOutcome {
  key: string;
  name: string;
  result: "saved" | "skipped" | "failed";
  error?: string;
}

/** Identifies a character of an export across preview and apply. */
export function previewKey(preview: { realm: string; name: string }): string {
  return `${preview.realm.toLowerCase()}|${characterNameKey(preview.name)}`;
}

/** The part of an export imported with one member's rights. */
interface ImportGroup {
  actor: Actor;
  /** Null for the actor's own data. */
  memberName: string | null;
  characters: CharacterPreview[];
  requestActions: ExportedRequestAction[];
}

function readExport(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  text: string,
) {
  const catalog = requireAddonCatalog(db, gameId);
  const decoded = decodeAddonString(text, { gameId, kind: "export" });
  if (!decoded.ok) {
    return decoded;
  }
  const parsed = parseCharacterExport(decoded.value.payload);
  if (!parsed.ok) {
    return parsed;
  }
  const preview = (
    member: Actor,
    exported: ExportedCharacter[],
    offerProfessionDrop: boolean,
  ) =>
    previewCharacterImport({
      catalog,
      data: { characters: exported },
      own: ownCharacters(db, member, gameId),
      foreign: foreignCharacters(db, member, gameId),
      offerProfessionDrop,
    });

  const assignments = assignRelayedAccounts(
    db,
    actor,
    catalog,
    parsed.value.relayed,
  );
  const groups: ImportGroup[] = [
    {
      actor,
      memberName: null,
      characters: preview(actor, parsed.value.characters, true),
      requestActions: parsed.value.requestActions,
    },
    ...assignments.flatMap((assignment) =>
      "member" in assignment
        ? [
            {
              actor: assignment.member.actor,
              memberName:
                assignment.member.actor.userId === actor.userId
                  ? null
                  : assignment.member.name,
              characters: preview(
                assignment.member.actor,
                assignment.account.characters,
                false,
              ),
              requestActions: assignment.account.requestActions,
            },
          ]
        : [],
    ),
  ];
  const skippedAccounts = assignments.flatMap((assignment) =>
    "skipped" in assignment
      ? [
          {
            characterNames: assignment.account.characters.map((c) => c.name),
            reason: assignment.skipped,
          },
        ]
      : [],
  );
  return {
    ok: true as const,
    catalog,
    groups: withoutRepeatedCharacters(groups),
    skippedAccounts,
  };
}

/** A character two blocks both carry (a stale copy) is taken from the first only. */
function withoutRepeatedCharacters(groups: ImportGroup[]): ImportGroup[] {
  const seen = new Set<string>();
  return groups.map((group) => ({
    ...group,
    characters: group.characters.filter((character) => {
      const key = previewKey(character);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  }));
}

export function previewImport(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  text: string,
): CharacterImportPreview {
  const read = readExport(db, actor, gameId, text);
  if (!read.ok) {
    return read;
  }
  return {
    ok: true,
    characters: read.groups.flatMap(({ characters, memberName }) =>
      characters.map((character) => ({ ...character, memberName })),
    ),
    // Against the current state; a profession the same import adds is not counted yet.
    requestActions: read.groups.flatMap((group) =>
      previewRequestActions(db, group.actor, gameId, group.requestActions).map(
        (outcome) => ({ ...outcome, memberName: group.memberName }),
      ),
    ),
    skippedAccounts: read.skippedAccounts,
  };
}

export function applyImport(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  text: string,
  choices: ImportChoices,
):
  | {
      ok: true;
      outcomes: ImportOutcome[];
      requestActions: ImportRequestAction[];
    }
  | { ok: false; error: string } {
  const read = readExport(db, actor, gameId, text);
  if (!read.ok) {
    return read;
  }
  const importedAt = new Date();
  const outcomes = read.groups.flatMap((group) =>
    group.characters.map((character) =>
      applyChoice(db, group, read.catalog, character, choices, importedAt),
    ),
  );
  // After the characters, so a profession the export adds already counts for accepting.
  const requestActions = read.groups.flatMap((group) =>
    applyRequestActions(db, group.actor, gameId, group.requestActions).map(
      (outcome) => ({ ...outcome, memberName: group.memberName }),
    ),
  );
  return { ok: true, outcomes, requestActions };
}

function applyChoice(
  db: AppDatabase,
  group: ImportGroup,
  catalog: GameCatalog,
  character: CharacterPreview,
  choices: ImportChoices,
  importedAt: Date,
): ImportOutcome {
  const key = previewKey(character);
  const outcome = { key, name: character.name };
  const wanted =
    character.status === "changed" ||
    character.status === "unchanged" ||
    (character.status === "new" && choices.create.includes(key));
  if (!wanted) {
    return { ...outcome, result: "skipped" };
  }
  // Only the actor's own professions may be dropped, and only those the preview offered.
  const dropProfessionIds = (choices.dropProfessions[key] ?? []).filter((id) =>
    character.missingProfessionEntryIds.includes(id),
  );
  try {
    db.transaction(() =>
      applyCharacter(
        db,
        group.actor,
        catalog,
        character,
        dropProfessionIds,
        importedAt,
      ),
    );
    return { ...outcome, result: "saved" };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ...outcome, result: "failed", error: error.message };
    }
    throw error;
  }
}

/** Runs inside the caller's transaction, so a failing step undoes the whole character. */
function applyCharacter(
  db: AppDatabase,
  actor: Actor,
  catalog: GameCatalog,
  preview: CharacterPreview,
  dropProfessionIds: readonly number[],
  importedAt: Date,
): void {
  const existing =
    preview.characterId === null
      ? undefined
      : getCharacter(db, preview.characterId);
  const professionIds = [
    ...(existing?.professionEntryIds ?? []).filter(
      (id) => !dropProfessionIds.includes(id),
    ),
    ...preview.professions
      .filter((profession) => profession.previousSkillLevel === undefined)
      .map((profession) => profession.entryId),
  ];
  const characterId = saveBaseValues(
    db,
    actor,
    catalog,
    preview,
    existing,
    professionIds,
  );
  setSkills(db, characterId, preview);
  addRecipes(db, characterId, preview, professionIds);
  db.update(characters)
    .set({
      addonDeathCount: preview.addonDeathCount,
      gameImportedAt: importedAt,
    })
    .where(eq(characters.id, characterId))
    .run();
}

/** Through the editor's own save, so the same rules and rights apply. */
function saveBaseValues(
  db: AppDatabase,
  actor: Actor,
  catalog: GameCatalog,
  preview: CharacterPreview,
  existing: CharacterDetails | undefined,
  professionIds: readonly number[],
): number {
  const key = (entryId: number | null) => keyOfEntry(catalog, entryId);
  const classChanged = preview.changedFields.includes("class");
  const input: CharacterInput = {
    name:
      preview.renamesFrom === null
        ? (existing?.name ?? preview.name)
        : preview.name,
    // Without a realm from the game the character keeps the server it has.
    server: preview.realm || existing?.serverName || existing?.serverKey || "",
    factionKey: key(
      preview.values.factionEntryId ?? existing?.factionEntryId ?? null,
    ),
    raceKey: key(preview.values.raceEntryId ?? existing?.raceEntryId ?? null),
    classKey: key(
      preview.values.classEntryId ?? existing?.classEntryId ?? null,
    ),
    // A spec of the old class would no longer fit; the member picks a new one.
    specKey: classChanged ? "" : key(existing?.specEntryId ?? null),
    offSpecKey: classChanged ? "" : key(existing?.offSpecEntryId ?? null),
    spec: existing?.spec ?? "",
    level: preview.values.level ?? existing?.level ?? null,
    deathCount: (existing?.deathCount ?? 0) + preview.deathsToAdd,
    isMain: existing?.isMain ?? false,
    notes: existing?.notes ?? "",
    professionKeys: professionIds.map((id) => key(id)),
  };
  const saved = saveCharacter(db, actor, catalog.game.id, input, existing?.id);
  if (!saved.ok) {
    throw new DomainError(Object.values(saved.errors).join(" "));
  }
  return saved.characterId;
}

function setSkills(
  db: AppDatabase,
  characterId: number,
  preview: CharacterPreview,
): void {
  for (const profession of preview.professions) {
    if (profession.skillLevel === null) {
      continue;
    }
    db.update(characterProfessions)
      .set({ skillLevel: profession.skillLevel })
      .where(
        and(
          eq(characterProfessions.characterId, characterId),
          eq(characterProfessions.professionEntryId, profession.entryId),
        ),
      )
      .run();
  }
}

/** Only added, never removed: GuildHub may know recipes the addon has not read yet. */
function addRecipes(
  db: AppDatabase,
  characterId: number,
  preview: CharacterPreview,
  professionIds: readonly number[],
): void {
  const linked = new Set(linkedRecipeIds(db, characterId));
  const recipes = preview.newRecipes.filter(
    (recipe) =>
      !linked.has(recipe.recipeEntryId) &&
      professionIds.includes(recipe.professionEntryId),
  );
  if (recipes.length === 0) {
    return;
  }
  db.insert(recipeEntries)
    .values(
      recipes.map((recipe) => ({
        characterId,
        professionEntryId: recipe.professionEntryId,
        recipeEntryId: recipe.recipeEntryId,
        name: localize(recipe.name),
      })),
    )
    .run();
}

function ownCharacters(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
): OwnCharacterState[] {
  const rows = db
    .select()
    .from(characters)
    .where(
      and(eq(characters.userId, actor.userId), eq(characters.gameId, gameId)),
    )
    .all();
  const professions = rows.length
    ? db
        .select()
        .from(characterProfessions)
        .where(
          inArray(
            characterProfessions.characterId,
            rows.map((row) => row.id),
          ),
        )
        .all()
    : [];
  const linkedRecipes = rows.length
    ? db
        .select({
          characterId: recipeEntries.characterId,
          recipeEntryId: recipeEntries.recipeEntryId,
        })
        .from(recipeEntries)
        .where(
          inArray(
            recipeEntries.characterId,
            rows.map((row) => row.id),
          ),
        )
        .all()
    : [];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    serverKey: row.serverKey,
    factionEntryId: row.factionEntryId,
    raceEntryId: row.raceEntryId,
    classEntryId: row.classEntryId,
    level: row.level,
    deathCount: row.deathCount,
    addonDeathCount: row.addonDeathCount,
    professions: professions
      .filter((profession) => profession.characterId === row.id)
      .map((profession) => ({
        entryId: profession.professionEntryId,
        skillLevel: profession.skillLevel,
      })),
    linkedRecipeIds: linkedRecipes
      .filter((recipe) => recipe.characterId === row.id)
      .map((recipe) => recipe.recipeEntryId)
      .filter((id): id is number => id !== null),
  }));
}

function foreignCharacters(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
): ForeignCharacter[] {
  return db
    .select({ name: characters.name, serverKey: characters.serverKey })
    .from(characters)
    .where(
      and(eq(characters.gameId, gameId), ne(characters.userId, actor.userId)),
    )
    .all();
}
