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
import { requestRecipesOf } from "@/lib/roster/request-recipes";
import { de } from "@/i18n/de";
import { localize } from "@/i18n/localize";

export type CraftRequestRow = typeof craftRequests.$inferSelect;

export interface CraftRequestView extends CraftRequestRow {
  professionName: LocalizedString;
  requesterName: string | null;
  crafterName: string | null;
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
  const ownProfessions = professionsOf(db, actor.userId);

  return [...pending, ...done].map(
    ({ request, professionName, requesterName, crafterName }) => ({
      ...request,
      professionName,
      requesterName,
      crafterName,
      canAccept:
        request.status === "open" &&
        ownProfessions.has(request.professionEntryId),
      canProgress:
        request.status === "accepted" && request.crafterId === actor.userId,
      canDelete: permissions.editSharedEntry(actor, ownership(request)).allowed,
    }),
  );
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
    ...requests.filter(
      (request) => request.canAccept && request.requesterId !== actor.userId,
    ),
  ];
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

/** Profession entries the user holds on any of their characters. */
function professionsOf(db: AppDatabase, userId: string): Set<number> {
  return new Set(
    db
      .select({ id: characterProfessions.professionEntryId })
      .from(characterProfessions)
      .innerJoin(
        characters,
        eq(characters.id, characterProfessions.characterId),
      )
      .where(eq(characters.userId, userId))
      .all()
      .map((row) => row.id),
  );
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
  if (!professionsOf(db, actor.userId).has(request.professionEntryId)) {
    throw new DomainError("Annehmen kann nur, wer den Beruf hat.");
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
  reagents: string | null;
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
  return recipes
    ? recipeChoices(recipes, de.characters.recipeFromSkill).map(
        ({ key, label, reagents }) => ({ value: key, label, reagents }),
      )
    : null;
}
