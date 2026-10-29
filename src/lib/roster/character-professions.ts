import { and, eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import { characterProfessions } from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import { ownedCharacter, requireCatalog } from "./characters";
import { keyOfEntry } from "./form-options";
import {
  knownRecipesOf,
  linkedRecipeIds,
  parseRecipeLines,
  replaceRecipes,
} from "./recipes";

export interface ProfessionDetailsInput {
  skillLevel: number | null;
  specialization: string;
  notes: string;
  recipes: string;
}

export type ProfessionDetailsErrors = Partial<
  Record<keyof ProfessionDetailsInput, string>
>;

export const SKILL_LEVEL_MAX = 10000;
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
  const catalog = requireCatalog(db, character.gameId, { withRecipes: true });
  const recipes = parseRecipeLines(
    input.recipes,
    knownRecipesOf(
      catalog,
      keyOfEntry(catalog, professionEntryId),
      linkedRecipeIds(db, characterId),
    ),
  );
  if (!recipes.ok) {
    errors.recipes = recipes.error;
  }
  if (!recipes.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  db.transaction((tx) => {
    replaceRecipes(tx, characterId, professionEntryId, recipes.recipes);
    tx.update(characterProfessions)
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
  });
  return { ok: true };
}

/** Quick skill change from the overview, for a profession the character has. */
export function setProfessionSkill(
  db: AppDatabase,
  actor: Actor,
  characterId: number,
  professionEntryId: number,
  skillLevel: number,
): void {
  const character = ownedCharacter(db, actor, characterId);
  if (!character.professionEntryIds.includes(professionEntryId)) {
    throw new NotFoundError("Beruf");
  }
  if (
    !Number.isInteger(skillLevel) ||
    skillLevel < 0 ||
    skillLevel > SKILL_LEVEL_MAX
  ) {
    throw new DomainError(`Fertigkeit zwischen 0 und ${SKILL_LEVEL_MAX}.`);
  }
  db.update(characterProfessions)
    .set({ skillLevel })
    .where(
      and(
        eq(characterProfessions.characterId, characterId),
        eq(characterProfessions.professionEntryId, professionEntryId),
      ),
    )
    .run();
}
