import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { recordAudit } from "@/lib/audit/audit";
import { assertAllowed, permissions, type Actor } from "@/lib/auth/guards";
import type { AppDatabase } from "@/lib/db/client";
import {
  characterProfessions,
  characters,
  craftRequests,
  gameCatalogEntries,
  guildMembers,
  users,
  type CraftRequestStatus,
} from "@/lib/db/schema";
import { DomainError, NotFoundError } from "@/lib/errors";
import type { LocalizedString } from "@/lib/packs/schema";
import {
  isGameEnabled,
  loadGameCatalog,
  selectableOfKind,
  type CatalogEntry,
  type GameCatalog,
} from "@/lib/roster/game-catalog";
import { recipeChoices } from "@/lib/roster/form-options";
import { reagentsOf, type Reagent } from "@/lib/roster/recipe-reagents";
import { requestRecipesOf } from "@/lib/roster/request-recipes";
import { de } from "@/i18n/de";
import { localize } from "@/i18n/localize";

export type CraftRequestRow = typeof craftRequests.$inferSelect;

/** A member's character that can craft something, with the skill entered for it. */
export interface CrafterView {
  userId: string;
  userName: string;
  characterName: string;
  skill: number | null;
}

export interface CraftRequestView extends CraftRequestRow {
  professionName: LocalizedString;
  requesterName: string | null;
  crafterName: string | null;
  /** Materials for the whole request (recipe reagents times quantity). */
  reagents: Reagent[];
  /** Skill the recipe needs; null for free text or when the pack does not know it. */
  requiredSkill: number | null;
  recipeLink: string | null;
  /** Other members who can craft it: the profession and, as far as known, the skill. */
  crafters: CrafterView[];
  /** Somebody besides the requester holds the profession, skilled enough or not. */
  professionHeld: boolean;
  /** The actor has the profession, but every known skill is below the recipe's. */
  ownSkillTooLow: { have: number; need: number } | null;
  /** Open, not the actor's own, and the actor has profession and skill. */
  canAccept: boolean;
  /** Mark done or hand back: the member who accepted it. */
  canProgress: boolean;
  canDelete: boolean;
}

export interface CraftRequestInput {
  gameId: string;
  professionKey: string;
  /** Free text, or the recipe key where the profession only takes pack recipes. */
  item: string;
  quantity: number | null;
  notes: string;
}

export type CraftRequestErrors = Partial<
  Record<keyof CraftRequestInput, string>
>;

const MAX_QUANTITY = 1000;
/** Finished requests stay visible for a while, then drop off the page. */
const DONE_SHOWN = 20;

/**
 * Crafting requests (SPEC 10, Phase 3): any member asks for an item, only someone with
 * the profession accepts it. open → accepted → done; the crafter may hand it back.
 */
export function listCraftRequests(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): CraftRequestView[] {
  if (gameIds.length === 0) {
    return [];
  }
  const inGames = inArray(craftRequests.gameId, [...gameIds]);
  const pending = selectRequests(db)
    .where(and(inGames, ne(craftRequests.status, "done")))
    .orderBy(desc(craftRequests.createdAt))
    .all();
  // Finished requests pile up over time; only the latest ones are worth a look.
  const done = selectRequests(db)
    .where(and(inGames, eq(craftRequests.status, "done")))
    .orderBy(desc(craftRequests.doneAt))
    .limit(DONE_SHOWN)
    .all();
  const rows = [...pending, ...done];
  const recipes = loadRecipeInfo(
    db,
    rows.map((row) => row.request.recipeEntryId),
  );
  const holders = professionHolders(
    db,
    actor.guildId,
    rows.map((row) => row.request.professionEntryId),
  );

  return rows.map(({ request, professionName, requesterName, crafterName }) => {
    const recipe =
      request.recipeEntryId === null
        ? undefined
        : recipes.get(request.recipeEntryId);
    const requiredSkill = recipe?.skill ?? null;
    const own = holders.filter(
      (holder) =>
        holder.userId === actor.userId &&
        holder.professionEntryId === request.professionEntryId,
    );
    const ownAble = own.some((holder) =>
      hasSkillFor(holder.skill, requiredSkill),
    );
    const ownSkills = own
      .map((holder) => holder.skill)
      .filter((skill): skill is number => skill !== null);
    return {
      ...request,
      professionName,
      requesterName,
      crafterName,
      reagents: recipe
        ? recipe.reagents.map((reagent) => ({
            ...reagent,
            count: reagent.count * request.quantity,
          }))
        : [],
      requiredSkill,
      recipeLink: recipe?.link ?? null,
      crafters: ableCrafters(
        holders,
        request.professionEntryId,
        requiredSkill,
        request.requesterId,
      ),
      professionHeld: holders.some(
        (holder) =>
          holder.professionEntryId === request.professionEntryId &&
          holder.userId !== request.requesterId,
      ),
      ownSkillTooLow:
        own.length > 0 && !ownAble && requiredSkill !== null
          ? { have: Math.max(...ownSkills), need: requiredSkill }
          : null,
      canAccept:
        request.status === "open" &&
        request.requesterId !== actor.userId &&
        ownAble,
      canProgress:
        request.status === "accepted" && request.crafterId === actor.userId,
      canDelete: permissions.editSharedEntry(actor, ownership(request)).allowed,
    };
  });
}

/**
 * What the user can craft right now, for the overview (start page): requests they accepted
 * and still have to finish, then open requests for a profession one of their characters
 * holds. Their own requests are left out; nobody crafts for themselves.
 */
export function listCraftRequestsForCrafter(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): CraftRequestView[] {
  const requests = listCraftRequests(db, actor, gameIds);
  return [
    ...requests.filter((request) => request.canProgress),
    ...requests.filter((request) => request.canAccept),
  ];
}

/** Enough skill for a recipe, as far as known: a missing number never blocks. */
export function hasSkillFor(
  skill: number | null,
  required: number | null,
): boolean {
  return required === null || skill === null || skill >= required;
}

interface ProfessionHolder extends CrafterView {
  professionEntryId: number;
}

/** Characters of active guild members holding one of the professions. */
function professionHolders(
  db: AppDatabase,
  guildId: number,
  professionEntryIds: readonly number[],
): ProfessionHolder[] {
  const ids = [...new Set(professionEntryIds)];
  if (ids.length === 0) {
    return [];
  }
  return db
    .select({
      professionEntryId: characterProfessions.professionEntryId,
      userId: characters.userId,
      userName: users.name,
      characterName: characters.name,
      skill: characterProfessions.skillLevel,
    })
    .from(characterProfessions)
    .innerJoin(characters, eq(characters.id, characterProfessions.characterId))
    .innerJoin(users, eq(users.id, characters.userId))
    .innerJoin(
      guildMembers,
      and(
        eq(guildMembers.userId, characters.userId),
        eq(guildMembers.guildId, guildId),
        eq(guildMembers.status, "active"),
      ),
    )
    .where(inArray(characterProfessions.professionEntryId, ids))
    .all()
    .map((row) => ({ ...row, userName: row.userName ?? "?" }));
}

/** The most skilled able character per member, best first; `exceptUserId` left out. */
function ableCrafters(
  holders: readonly ProfessionHolder[],
  professionEntryId: number,
  required: number | null,
  exceptUserId?: string,
): CrafterView[] {
  const best = new Map<string, ProfessionHolder>();
  for (const holder of holders) {
    if (
      holder.professionEntryId !== professionEntryId ||
      holder.userId === exceptUserId ||
      !hasSkillFor(holder.skill, required)
    ) {
      continue;
    }
    const current = best.get(holder.userId);
    if (!current || (holder.skill ?? -1) > (current.skill ?? -1)) {
      best.set(holder.userId, holder);
    }
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        (b.skill ?? -1) - (a.skill ?? -1) ||
        a.userName.localeCompare(b.userName),
    )
    .map((holder) => ({
      userId: holder.userId,
      userName: holder.userName,
      characterName: holder.characterName,
      skill: holder.skill,
    }));
}

interface RecipeInfo {
  skill: number | null;
  link: string | null;
  reagents: Reagent[];
}

function recipeInfo(entry: CatalogEntry): RecipeInfo {
  const { skill, link } = entry.data as { skill?: unknown; link?: unknown };
  return {
    skill: typeof skill === "number" ? skill : null,
    link: typeof link === "string" ? link : null,
    reagents: reagentsOf(entry.data),
  };
}

function loadRecipeInfo(
  db: AppDatabase,
  recipeEntryIds: ReadonlyArray<number | null>,
): Map<number, RecipeInfo> {
  const ids = [
    ...new Set(recipeEntryIds.filter((id): id is number => id !== null)),
  ];
  if (ids.length === 0) {
    return new Map();
  }
  return new Map(
    db
      .select()
      .from(gameCatalogEntries)
      .where(inArray(gameCatalogEntries.id, ids))
      .all()
      .map((entry) => [entry.id, recipeInfo(entry)]),
  );
}

/**
 * Who in the guild can craft for each profession of the games, as "Name (Charakter, 210)",
 * for the request form; keyed by game, then profession key.
 */
export function professionCrafters(
  db: AppDatabase,
  actor: Actor,
  gameIds: readonly string[],
): Record<string, Record<string, string[]>> {
  const result: Record<string, Record<string, string[]>> = {};
  if (gameIds.length === 0) {
    return result;
  }
  const professions = db
    .select({
      id: gameCatalogEntries.id,
      gameId: gameCatalogEntries.gameId,
      key: gameCatalogEntries.key,
    })
    .from(gameCatalogEntries)
    .where(
      and(
        inArray(gameCatalogEntries.gameId, [...gameIds]),
        eq(gameCatalogEntries.kind, "profession"),
      ),
    )
    .all();
  const holders = professionHolders(
    db,
    actor.guildId,
    professions.map((profession) => profession.id),
  );
  for (const profession of professions) {
    const names = ableCrafters(holders, profession.id, null, actor.userId).map(
      crafterLabel,
    );
    (result[profession.gameId] ??= {})[profession.key] = names;
  }
  return result;
}

/** "Erik (Brakka, 210)": member, character and skill where known. */
export function crafterLabel(crafter: CrafterView): string {
  const skill = crafter.skill === null ? "" : `, ${crafter.skill}`;
  return `${crafter.userName} (${crafter.characterName}${skill})`;
}

/** Requests with profession, requester and crafter names. */
function selectRequests(db: AppDatabase) {
  const requester = alias(users, "requester");
  const crafter = alias(users, "crafter");
  return db
    .select({
      request: craftRequests,
      professionName: gameCatalogEntries.name,
      requesterName: requester.name,
      crafterName: crafter.name,
    })
    .from(craftRequests)
    .innerJoin(
      gameCatalogEntries,
      eq(gameCatalogEntries.id, craftRequests.professionEntryId),
    )
    .innerJoin(requester, eq(requester.id, craftRequests.requesterId))
    .leftJoin(crafter, eq(crafter.id, craftRequests.crafterId))
    .$dynamic();
}

/** Requests are guild-visible entries of their requester; officers may tidy them up. */
function ownership(request: CraftRequestRow) {
  return { ownerId: request.requesterId, visibility: "guild" as const };
}

export function createCraftRequest(
  db: AppDatabase,
  actor: Actor,
  input: CraftRequestInput,
): { ok: true } | { ok: false; errors: CraftRequestErrors } {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  const errors: CraftRequestErrors = {};
  const catalog = loadGameCatalog(db, input.gameId, { withRecipes: true });
  if (!catalog || !isGameEnabled(db, actor.guildId, input.gameId)) {
    errors.gameId = "Bitte ein Spiel wählen.";
  }
  const profession = catalog
    ? selectableOfKind(catalog, "profession").find(
        (entry) => entry.key === input.professionKey,
      )
    : undefined;
  if (!profession) {
    errors.professionKey = "Bitte einen Beruf wählen.";
  }
  const {
    item,
    recipeEntryId,
    error: itemError,
  } = resolveItem(catalog, profession, input.item.trim());
  if (itemError) {
    errors.item = itemError;
  }
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    errors.quantity = `Anzahl von 1 bis ${MAX_QUANTITY}.`;
  }
  const notes = input.notes.trim();
  if (notes.length > 300) {
    errors.notes = "Höchstens 300 Zeichen.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  db.insert(craftRequests)
    .values({
      gameId: input.gameId,
      professionEntryId: profession!.id,
      recipeEntryId,
      item,
      quantity,
      notes: notes || null,
      requesterId: actor.userId,
    })
    .run();
  return { ok: true };
}

/**
 * What the request asks for. Crafting professions with pack recipes only take one of
 * them, so nobody asks for items that do not exist; materials stay free text.
 */
function resolveItem(
  catalog: GameCatalog | undefined,
  profession: CatalogEntry | undefined,
  input: string,
): { item: string; recipeEntryId: number | null; error?: string } {
  const recipes =
    catalog && profession ? requestRecipesOf(catalog, profession) : null;
  if (recipes) {
    const recipe = recipes.find((entry) => entry.key === input);
    return recipe
      ? { item: localize(recipe.name), recipeEntryId: recipe.id }
      : {
          item: "",
          recipeEntryId: null,
          error: "Bitte ein Rezept aus der Liste wählen.",
        };
  }
  if (!input) {
    return {
      item: "",
      recipeEntryId: null,
      error: "Bitte eintragen, was gebraucht wird.",
    };
  }
  if (input.length > 100) {
    return { item: "", recipeEntryId: null, error: "Höchstens 100 Zeichen." };
  }
  return { item: input, recipeEntryId: null };
}

function loadRequest(
  db: AppDatabase,
  actor: Actor,
  requestId: number,
): CraftRequestRow {
  assertAllowed(permissions.editOwnData(actor, actor.userId));
  const request = db
    .select()
    .from(craftRequests)
    .where(eq(craftRequests.id, requestId))
    .get();
  if (!request) {
    throw new NotFoundError("Antrag");
  }
  return request;
}

function requireStatus(
  request: CraftRequestRow,
  status: CraftRequestStatus,
): void {
  if (request.status !== status) {
    throw new DomainError("Der Antrag hat sich inzwischen geändert.");
  }
}

export function acceptCraftRequest(
  db: AppDatabase,
  actor: Actor,
  requestId: number,
  now: Date = new Date(),
): void {
  const request = loadRequest(db, actor, requestId);
  requireStatus(request, "open");
  const own = professionHolders(db, actor.guildId, [
    request.professionEntryId,
  ]).filter((holder) => holder.userId === actor.userId);
  if (own.length === 0) {
    throw new DomainError("Annehmen kann nur, wer den Beruf hat.");
  }
  const required =
    request.recipeEntryId === null
      ? null
      : (loadRecipeInfo(db, [request.recipeEntryId]).get(request.recipeEntryId)
          ?.skill ?? null);
  if (!own.some((holder) => hasSkillFor(holder.skill, required))) {
    throw new DomainError(
      `Dafür reicht die Fertigkeit deiner Charaktere noch nicht (benötigt ${required}).`,
    );
  }
  db.update(craftRequests)
    .set({ status: "accepted", crafterId: actor.userId, acceptedAt: now })
    .where(
      and(eq(craftRequests.id, request.id), eq(craftRequests.status, "open")),
    )
    .run();
}

function requireCrafter(actor: Actor, request: CraftRequestRow): void {
  requireStatus(request, "accepted");
  if (request.crafterId !== actor.userId) {
    throw new DomainError("Nur wer den Antrag angenommen hat, kann das.");
  }
}

export function finishCraftRequest(
  db: AppDatabase,
  actor: Actor,
  requestId: number,
  now: Date = new Date(),
): void {
  const request = loadRequest(db, actor, requestId);
  requireCrafter(actor, request);
  db.update(craftRequests)
    .set({ status: "done", doneAt: now })
    .where(eq(craftRequests.id, request.id))
    .run();
}

/** The crafter hands the request back; it is open for others again. */
export function returnCraftRequest(
  db: AppDatabase,
  actor: Actor,
  requestId: number,
): void {
  const request = loadRequest(db, actor, requestId);
  requireCrafter(actor, request);
  db.update(craftRequests)
    .set({ status: "open", crafterId: null, acceptedAt: null })
    .where(eq(craftRequests.id, request.id))
    .run();
}

export function deleteCraftRequest(
  db: AppDatabase,
  actor: Actor,
  requestId: number,
): void {
  const request = loadRequest(db, actor, requestId);
  assertAllowed(permissions.editSharedEntry(actor, ownership(request)));
  db.delete(craftRequests).where(eq(craftRequests.id, request.id)).run();
  // Requesters tidy up their own requests; only an officer removing someone else's is logged.
  if (request.requesterId !== actor.userId) {
    recordAudit(db, actor.userId, "craftRequest.delete", request.item, {
      requesterId: request.requesterId,
    });
  }
}

export interface RequestRecipeChoice {
  value: string;
  label: string;
  /** Reagents for one craft. */
  reagents: Reagent[];
  /** Other members skilled enough for it, as "Name (Charakter, Fertigkeit)". */
  crafters: string[];
}

/**
 * What a request for this profession may name: its recipes, or null for free text. Asked
 * for once a profession is chosen, so the page does not ship every recipe up front.
 */
export function requestRecipeChoices(
  db: AppDatabase,
  actor: Actor,
  gameId: string,
  professionKey: string,
): RequestRecipeChoice[] | null {
  assertAllowed(permissions.viewGuild(actor));
  const catalog = isGameEnabled(db, actor.guildId, gameId)
    ? loadGameCatalog(db, gameId, { withRecipes: true })
    : undefined;
  const profession = catalog
    ? selectableOfKind(catalog, "profession").find(
        (entry) => entry.key === professionKey,
      )
    : undefined;
  if (!catalog || !profession) {
    throw new NotFoundError("Beruf");
  }
  const recipes = requestRecipesOf(catalog, profession);
  if (!recipes) {
    return null;
  }
  const entries = new Map(recipes.map((entry) => [entry.key, entry]));
  const holders = professionHolders(db, actor.guildId, [profession.id]);
  return recipeChoices(recipes, de.characters.recipeFromSkill).map(
    ({ key, label, skill }) => ({
      value: key,
      label,
      reagents: reagentsOf(entries.get(key)!.data),
      crafters: ableCrafters(holders, profession.id, skill, actor.userId).map(
        crafterLabel,
      ),
    }),
  );
}
